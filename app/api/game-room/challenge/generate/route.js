export const dynamic = 'force-dynamic'
// ROOT CAUSE FIX Aug 11 2026 — see the Promise.all comments below for the
// full story. This route was running ~9 sequential DB round-trips before
// even calling the LLM (more than any other challenge type, since Memory
// alone pulls Spark/Bet/Timeline/Dates/Flirts context), on top of no
// explicit function-duration budget, so it was relying entirely on
// whatever Vercel's platform default happened to be. Setting this
// explicitly gives the slowest path (memory, with its larger maxTokens
// completion) real headroom instead of an implicit, unverifiable ceiling.
export const maxDuration = 30

import { CHALLENGE_PROMPTS } from '@/lib/challenge-prompts'
import { noraGenerate } from '@/lib/nora'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'
import { REACTION_LABELS } from '@/lib/date-night'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return Response.json(authError.body, { status: authError.status })

    const { challengeSessionId, challengeType, roundNumber } = await request.json()

    if (!challengeSessionId || !challengeType || !roundNumber) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Derive couple_id from the challenge_sessions row itself rather than
    // trusting a client-supplied coupleId — same resource-derived pattern
    // already used correctly in challenge/next. The old check only
    // confirmed the caller belonged to WHATEVER coupleId they sent, never
    // that challengeSessionId actually belonged to that couple. Without
    // this, a member of couple A could supply couple B's challengeSessionId
    // and both read couple B's private Spark/Bet/Timeline/date/Flirt data
    // (fed into the Nora memory-question prompt below) AND write a
    // challenge_rounds row into couple B's session.
    const { data: challengeSessionForAuth } = await supabase
      .from('challenge_sessions')
      .select('couple_id')
      .eq('id', challengeSessionId)
      .maybeSingle()
    if (!challengeSessionForAuth) return Response.json({ error: 'Session not found' }, { status: 404 })
    const coupleId = challengeSessionForAuth.couple_id

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

    const userId = user.id

    // Idempotency — return existing round if already generated. .maybeSingle()
    // here, not .single() — zero matching rows is the normal first-launch
    // case, not an error condition.
    const { data: existingRound } = await supabase
      .from('challenge_rounds')
      .select('*')
      .eq('session_id', challengeSessionId)
      .eq('round_number', roundNumber)
      .maybeSingle()

    if (existingRound) {
      return Response.json({ round: existingRound })
    }

    // Get prompts already used this session so we don't repeat
    const { data: usedRounds } = await supabase
      .from('challenge_rounds')
      .select('prompt_key')
      .eq('session_id', challengeSessionId)

    const usedKeys = (usedRounds || []).map(r => r.prompt_key).filter(Boolean)

    // For recyclable questions, check when they were last used — re-enter pool after 90 days
    let recentMemoryRounds = []
    if (challengeType === 'memory') {
      const { data: memoryHistory } = await supabase
        .from('challenge_rounds')
        .select('prompt_key, created_at')
        .eq('couple_id', coupleId)
        .not('prompt_key', 'is', null)
      recentMemoryRounds = memoryHistory || []
    }

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

    const pool = CHALLENGE_PROMPTS[challengeType] || CHALLENGE_PROMPTS.story

    // ROOT CAUSE FIX Aug 12 2026 — Game Room audit: Memory Test's 3 rounds
    // picked randomly from the ENTIRE pool every time, with zero
    // sequencing — round 1 could land on "favorite ice cream flavor" and
    // round 3 (meant to be the finale) could land on the exact same
    // shallow tier. The Call ramps intensity by round via its tier system;
    // Memory had the ingredients for the same thing (each prompt already
    // carries a category in lib/challenge-prompts.js — small_things,
    // inner_world, present_day, shared_history) but nothing used it. This
    // sequences light-to-deep: round 1 small_things, round 2
    // inner_world/present_day, round 3 shared_history/inner_world. Other
    // challenge types (story/pitch/rank/plan) are single-round and
    // untouched by this.
    const MEMORY_ROUND_CATEGORIES = {
      1: ['small_things'],
      2: ['inner_world', 'present_day'],
      3: ['shared_history', 'inner_world'],
    }
    const categoryFilteredPool = (challengeType === 'memory' && MEMORY_ROUND_CATEGORIES[roundNumber])
      ? pool.filter(p => MEMORY_ROUND_CATEGORIES[roundNumber].includes(p.category))
      : pool

    const available = categoryFilteredPool.filter(p => {
      if (!usedKeys.includes(p.key)) return true
      if (!p.recyclable) return false
      const lastUsed = recentMemoryRounds.find(r => r.prompt_key === p.key)
      return lastUsed && lastUsed.created_at < ninetyDaysAgo
    })
    // Fallback order: unused-in-category -> anything in-category (rare —
    // would need a couple to have exhausted 9+ shared_history prompts
    // without any going recyclable) -> the full pool, same safety valve
    // this already had before category sequencing existed.
    const source = available.length > 0 ? available : (categoryFilteredPool.length > 0 ? categoryFilteredPool : pool)

    const basePrompt = source[Math.floor(Math.random() * source.length)]

    // Fetch couple context for Nora personalisation
    // noraMemory only needs coupleId (already known) — no reason to wait on
    // coupleData first. Independent reads, run together.
    const [{ data: coupleData }, { data: noraMemory }] = await Promise.all([
      supabase.from('couples').select('user1_id, user2_id').eq('id', coupleId).single(),
      supabase.from('nora_memory').select('memory_summary').eq('couple_id', coupleId).single(),
    ])

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, user_id, display_name')
      .in('user_id', [coupleData.user1_id, coupleData.user2_id])

    const profileSummary = profiles
      ? profiles.map(p => p.display_name).join(' and ')
      : 'this couple'

    const systemPrompt = `You are running a couples game called The Challenge. Your job is to take a base challenge prompt and personalise it for a specific couple. Keep it warm, specific, and playful. Never be generic.`

    let guesserUserId = coupleData.user1_id
    let personalizedPrompt = ''
    let userPrompt
    // ROOT CAUSE FIX Aug 14 2026 — Matt's recurring "Something went wrong"
    // on every single Memory Test round, since day one, misdiagnosed as a
    // JSON-parsing problem across 5-6 prior fix attempts (token budget,
    // query sequencing, embedded-relation lookups). Real cause, confirmed
    // from a live Vercel log Matt pulled: the raw Nora response was
    // completely well-formed JSON — the catch block below was actually
    // catching a ReferenceError ("guesserName is not defined"), not a
    // SyntaxError, but both get the same generic "Failed to parse Nora
    // response" message, making them indistinguishable without the raw log.
    // guesserName/answerHolderName were declared with const INSIDE the
    // `else if (challengeType === 'memory')` block below (block-scoped),
    // then referenced again in the validation step inside the try/catch
    // AFTER that block closes — out of scope on every single call, 100% of
    // the time, for every memory round. Hoisted here so both scopes share
    // the same variables.
    let guesserName = ''
    let answerHolderName = ''
    if (challengeType === 'rank') {
      userPrompt = `Personalise this ranking challenge for ${profileSummary}.

Base prompt: "${basePrompt.prompt}"
Items to rank: ${basePrompt.items.join(', ')}

Couple context:
- Memory: ${noraMemory?.memory_summary || 'none yet'}

Write a short personalised intro (1-2 sentences max) that makes this feel specific to them. Then return the items exactly as given.

Respond in this exact JSON format with no other text:
{
  "intro": "your personalised intro here",
  "prompt": "${basePrompt.prompt}",
  "items": ${JSON.stringify(basePrompt.items)}
}`
    } else if (challengeType === 'story') {
      userPrompt = `You are personalising a story prompt for ${profileSummary}.

Base prompt: "${basePrompt.prompt}"
Couple memory: ${noraMemory?.memory_summary || 'none yet'}

CRITICAL: Return the base prompt VERBATIM. Do not add to it, do not rephrase it, do not append observations. The only exception: if you know a highly specific fact about this couple from memory that directly relates to the prompt topic, you may add it as a short parenthetical of 5 words or fewer.

Respond in this exact JSON format with no other text:
{
  "prompt": "base prompt returned exactly as written"
}`
    } else if (challengeType === 'pitch') {
      userPrompt = `You are Nora personalising a pitch challenge prompt for ${profileSummary}.

Base prompt: "${basePrompt.prompt}"
Couple memory: ${noraMemory?.memory_summary || 'none yet'}

The pitch is always directed at Nora as the investor — never at the partner. Keep that framing intact.

CRITICAL: Return the base prompt VERBATIM unless you have a highly specific couple fact that makes it more personal. If you personalise, keep the investor framing — Nora is always the one being pitched. Max one sentence of addition.

Respond in this exact JSON format with no other text:
{
  "prompt": "base prompt returned exactly as written or with one specific personal addition"
}`
    } else if (challengeType === 'memory') {
      // Fetch rich couple data for memory question generation.
      // NOTE: this used to read from today_responses and bets.user1_answer/
      // user2_answer — both dead, nothing in the live app writes to them
      // (the app moved to the spark_responses/bet_responses per-user-row
      // model). Fixed July 31 2026 to read from the tables Bet/Spark
      // actually write to. See Sessions/PRODUCT_BACKLOG.md.
      // ROOT CAUSE FIX Aug 11 2026 — Matt's "Memory Test still failing to
      // launch" report was the SAME client-side message as the Aug 6 JSON-
      // parse bug, but that fix (maxTokens 600->1100, regex JSON extraction)
      // was confirmed still intact and working. These 5 queries are all
      // independent (each just filtered by coupleId) but were being awaited
      // one at a time — 5 extra sequential round-trips, unique to Memory,
      // stacked on top of the couple/profile/history queries above and
      // landing right before the (now larger, slower) LLM call. With no
      // maxDuration set on this route, that full chain was riding on
      // whatever Vercel's platform default happened to be; if it ever ran
      // long, the function gets killed mid-flight with no log on either
      // side — the client's fetch just fails, and generateRound's catch
      // shows the same generic "Something went wrong loading the
      // challenge" text regardless of cause, making a timeout and a parse
      // failure indistinguishable to Matt even though they're different
      // bugs. Parallelising these (see also maxDuration above) removes the
      // extra latency without changing what's fetched.
      // ROOT CAUSE FIX Aug 12 2026 — Matt: consistent "Something went wrong
      // loading the challenge" on Memory Test's very first round, every
      // time, since this data-fetch was introduced July 31 2026 (the same
      // shape of error as before the Aug 6/11 fixes, but those fixed
      // different things — JSON truncation and query sequencing — and
      // never actually resolved this). PostgREST embedded-relation syntax
      // (`bets(question)` inside a bet_responses select) only resolves if
      // an ACTUAL foreign-key constraint exists in Postgres — an app-level
      // convention like "bet_responses.bet_id points at bets.id" is not
      // enough on its own. If that FK constraint was never formally added
      // when bet_id was, this embed fails immediately and deterministically
      // on every single call with "Could not find a relationship... in the
      // schema cache" — exactly matching a same-error-since-day-one report.
      // Can't confirm this against the live schema from here (sandbox has
      // no Supabase network access) — flagging as the leading hypothesis,
      // not a confirmed diagnosis. Fixed defensively either way: replaced
      // both embedded-relation selects with explicit two-step lookups
      // (fetch the FK ids, then batch-fetch the question text separately),
      // which can't fail on relationship-cache resolution at all. Costs one
      // extra small `.in()` round-trip, comfortably inside maxDuration.
      const [
        { data: sparkAnswers },
        { data: betAnswers },
        { data: timelineEvents },
        { data: completedDates },
        { data: sentFlirts },
      ] = await Promise.all([
        supabase
          .from('spark_responses')
          .select('response_text, user_id, responded_at, spark_id')
          .eq('couple_id', coupleId)
          .not('response_text', 'is', null)
          .order('responded_at', { ascending: false })
          .limit(20),
        supabase
          .from('bet_responses')
          .select('actual_answer, user_id, responded_at, bet_id')
          .eq('couple_id', coupleId)
          .not('actual_answer', 'is', null)
          .order('responded_at', { ascending: false })
          .limit(20),
        supabase
          .from('timeline_events')
          .select('title, event_date, event_type, description')
          .eq('couple_id', coupleId)
          .order('event_date', { ascending: true })
          .limit(30),
        // Completed dates — real reactions/reviews from actual dates, same
        // specific-and-quotable quality as Spark/Bet answers.
        supabase
          .from('custom_dates')
          .select('title, date_time, user1_reaction, user1_review, user2_reaction, user2_review')
          .eq('couple_id', coupleId)
          .eq('status', 'completed')
          .order('date_time', { ascending: false })
          .limit(15),
        // Sent Flirts — mode/type and column names differ between
        // Nora-generated flirts (mode + suggestion) and freeform ones sent
        // via FlirtCard (type + content); normalise both below.
        supabase
          .from('flirts')
          .select('sender_id, receiver_id, mode, type, suggestion, content, reaction, created_at')
          .eq('couple_id', coupleId)
          .not('sent_at', 'is', null)
          .order('created_at', { ascending: false })
          .limit(15),
      ])

      // Second-step lookup for the question text — see ROOT CAUSE FIX above.
      const sparkIds = [...new Set((sparkAnswers || []).map(s => s.spark_id).filter(Boolean))]
      const betIds = [...new Set((betAnswers || []).map(b => b.bet_id).filter(Boolean))]
      const [{ data: sparkQuestionRows }, { data: betQuestionRows }] = await Promise.all([
        sparkIds.length ? supabase.from('sparks').select('id, question').in('id', sparkIds) : Promise.resolve({ data: [] }),
        betIds.length ? supabase.from('bets').select('id, question').in('id', betIds) : Promise.resolve({ data: [] }),
      ])
      const sparkQuestionMap = Object.fromEntries((sparkQuestionRows || []).map(s => [s.id, s.question]))
      const betQuestionMap = Object.fromEntries((betQuestionRows || []).map(b => [b.id, b.question]))

      // Determine guesser vs answer-holder for this round
      // Odd rounds (1, 3): host guesses, partner holds answer
      // Even rounds (2): partner guesses, host holds answer
      const isOddRound = roundNumber % 2 !== 0
      const partnerId = userId === coupleData.user1_id ? coupleData.user2_id : coupleData.user1_id
      guesserUserId = isOddRound ? userId : partnerId
      const answerHolderUserId = isOddRound ? partnerId : userId
      const guesserProfile = profiles?.find(p => p.user_id === guesserUserId || p.id === guesserUserId)
      const answerHolderProfile = profiles?.find(p => p.user_id === answerHolderUserId || p.id === answerHolderUserId)
      guesserName = guesserProfile?.display_name || 'Partner 1'
      answerHolderName = answerHolderProfile?.display_name || 'Partner 2'
      personalizedPrompt = basePrompt.prompt.replace(/\{answerHolder\}/g, answerHolderName)

      // Fetch previously used questions for this session to prevent repeats
      const { data: usedRounds } = await supabase
        .from('challenge_rounds')
        .select('memory_question')
        .eq('session_id', challengeSessionId)
        .not('memory_question', 'is', null)
      const usedQuestions = (usedRounds || []).map(r => r.memory_question).filter(Boolean)

      // Build context strings — resolve each response's user_id to a name
      // via the profiles already fetched above, and its question text via
      // the id-based maps built above (see ROOT CAUSE FIX) instead of an
      // embedded-relation lookup.
      const nameFor = (uid) => profiles?.find(p => p.user_id === uid)?.display_name || 'Someone'

      const sparkContext = sparkAnswers && sparkAnswers.length > 0
        ? sparkAnswers
            .map(s => { const q = sparkQuestionMap[s.spark_id]; return q ? `Q: ${q} — ${nameFor(s.user_id)}: ${s.response_text}` : null })
            .filter(Boolean)
            .join('\n')
        : 'No Spark answers yet'

      const betContext = betAnswers && betAnswers.length > 0
        ? betAnswers
            .map(b => { const q = betQuestionMap[b.bet_id]; return q ? `Q: ${q} — ${nameFor(b.user_id)}: ${b.actual_answer}` : null })
            .filter(Boolean)
            .join('\n')
        : 'No Bet answers yet'

      const timelineContext = timelineEvents && timelineEvents.length > 0
        ? timelineEvents.map(e => `${e.title} (${e.event_date})${e.description ? ': ' + e.description : ''}`).join('\n')
        : 'No timeline events yet'

      const dateContext = completedDates && completedDates.length > 0
        ? completedDates
            .map(d => {
              const u1 = d.user1_reaction ? `${nameFor(coupleData.user1_id)}: ${REACTION_LABELS[d.user1_reaction] || d.user1_reaction}${d.user1_review ? ` — "${d.user1_review}"` : ''}` : null
              const u2 = d.user2_reaction ? `${nameFor(coupleData.user2_id)}: ${REACTION_LABELS[d.user2_reaction] || d.user2_reaction}${d.user2_review ? ` — "${d.user2_review}"` : ''}` : null
              const reactions = [u1, u2].filter(Boolean).join(' | ')
              return reactions ? `Date "${d.title}": ${reactions}` : null
            })
            .filter(Boolean)
            .join('\n')
        : 'No completed dates yet'

      const flirtContext = sentFlirts && sentFlirts.length > 0
        ? sentFlirts
            .map(f => {
              const text = f.content || f.suggestion
              if (!text) return null
              const senderName = nameFor(f.sender_id)
              const receiverName = nameFor(f.receiver_id)
              const reactionNote = f.reaction ? ` (reaction: ${f.reaction})` : ''
              return `${senderName} sent ${receiverName}: "${text}"${reactionNote}`
            })
            .filter(Boolean)
            .join('\n')
        : 'No Flirts sent yet'

      userPrompt = `You are Nora running a Love Map memory game for ${guesserName} and ${answerHolderName}.

THE GAME: ${guesserName} is the GUESSER. ${answerHolderName} is the ANSWER HOLDER — the question is about ${answerHolderName}, and ${answerHolderName} knows the correct answer about themselves.

BASE QUESTION TERRITORY (pick from or be inspired by):
"${personalizedPrompt}"

COUPLE DATA — use this to make the question specific and answerable:
Nora memory: ${noraMemory?.memory_summary || 'none yet'}

Recent Spark answers:
${sparkContext}

Recent Bet answers:
${betContext}

Timeline events:
${timelineContext}

Completed dates:
${dateContext}

Recent Flirts sent:
${flirtContext}

YOUR JOB:
1. Write one specific question about ${answerHolderName} — and ONLY about ${answerHolderName}, never about ${guesserName}. ${guesserName} is the one guessing; the question must be about ${answerHolderName}'s life, memories, preferences, or inner world. The question must have a real, specific answer that ${answerHolderName} will recognise as true about themselves.${usedQuestions.length > 0 ? ` Do NOT ask any of these questions which have already been used this session: ${usedQuestions.map(q => `"${q}"`).join(', ')}.` : ''}
2. Look for the answer across ALL the couple data above, not just an exact word-for-word match to the question — a couple's real history rarely restates a question verbatim. Reasonable, grounded synthesis is fine: if a completed-date review says "loved the tasting menu at Nori," that legitimately answers "favorite meal." If a Spark answer, Bet response, Timeline event, date reaction/review, or Flirt gives you enough to construct a real, specific answer, write it as ${answerHolderName}'s answer. The one hard rule: every part of the answer must trace back to something actually said or done in the data above — never invent a detail, name, place, or preference that isn't grounded in it. If, after really looking, nothing in the data gets you to a real answer, return memory_answer as an empty string and answerType as "unknown" — that's a legitimate outcome, not a failure, just don't reach for it before genuinely checking.
3. Write 3 progressive hints for ${guesserName} that narrow toward the specific answer — not toward ${answerHolderName}'s personality or character. Hints should be about the answer itself. Hint 1: a clue about the category or territory of the answer (e.g. for a food question — "it's something you'd order at the end of a meal in Italy"). Hint 2: narrows significantly, removes most wrong answers (e.g. "it's citrus-based and often served as a drink or dessert"). Hint 3: basically gives it away (e.g. "it starts with L and ends in a vowel"). The guesser should be able to work toward the answer with each hint, not just learn about their partner's taste.

PHILOSOPHY: This is not a gotcha quiz. The goal is to surface what ${guesserName} knows about ${answerHolderName}'s inner world — and to teach them something new if they don't know it. A miss with good hints is still a win.

NORA'S VOICE: Warm game master energy. Specific. Never generic. The question should feel like it was written for this couple, not pulled from a list. IMPORTANT: Address the couple directly — use "you" and "your" not "they" or "their". The question is read by both partners so it must feel personal, not like a third-party observation.

Respond in this exact JSON format with no other text:
{
  "memory_question": "the specific question about ${answerHolderName}",
  "memory_answer": "your best guess at ${answerHolderName}'s answer based on couple data",
  "hint_1": "evocative, indirect hint",
  "hint_2": "narrows territory significantly",
  "hint_3": "basically gives it away",
  "answerType": "known or unknown",
  "guesser_user_id": "${guesserUserId}"
}`
    } else {
      userPrompt = `Personalise this challenge prompt for ${profileSummary}.

Base prompt: "${basePrompt.prompt}"
Challenge type: ${challengeType}
Round: ${roundNumber}
Couple memory: ${noraMemory?.memory_summary || 'none yet'}

Rewrite the prompt so it feels personal and specific to this couple. Keep the core challenge intact. 1-3 sentences max. Warm and direct — Nora is the game master who picked this on purpose.

Respond in this exact JSON format with no other text:
{
  "prompt": "your personalised prompt here"
}`
    }

    // ROOT CAUSE FIX — Aug 6 2026. Matt's recurring "Something went wrong
    // loading the challenge" report is specific to Memory Test and never
    // the other challenge types. Memory is the only branch whose expected
    // JSON has 5 separate free-text fields (memory_question, memory_answer,
    // hint_1, hint_2, hint_3) instead of 1-2 — at the shared maxTokens: 600
    // budget every other type uses comfortably, Memory has far less margin
    // before a verbose response gets cut off mid-JSON by the token limit,
    // which JSON.parse below then throws on. Give memory more headroom.
    const response = await noraGenerate(userPrompt, {
      route: 'game-room/challenge/generate',
      system: systemPrompt,
      maxTokens: challengeType === 'memory' ? 1100 : 600,
    })

    let parsed
    const raw = response.replace(/```json|```/g, '').trim()
    try {
      // Nora is instructed to respond with JSON only, but on longer/more
      // complex prompts (memory especially) she can still preface the JSON
      // with a stray sentence despite that instruction. Extract the first
      // {...} block rather than assuming the whole trimmed string parses on
      // its own — makes parsing robust to stray preamble without needing to
      // guess at exact wording to suppress it.
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
      // Validate: question must be about answerHolderName, not guesserName
      // If Nora wrote about the wrong person, fall back to the library prompt
      if (parsed?.memory_question && challengeType === 'memory') {
        const q = parsed.memory_question.toLowerCase()
        const gNameLower = guesserName.toLowerCase()
        const aNameLower = answerHolderName.toLowerCase()
        if (q.includes(gNameLower) && !q.includes(aNameLower)) {
          parsed.memory_question = basePrompt.prompt
          parsed.memory_answer = ''
          parsed.hint_1 = ''
          parsed.hint_2 = ''
          parsed.hint_3 = ''
        }
      }
    } catch (e) {
      // Log e.message (V8 includes the char position of the bad token) and
      // JSON.stringify(raw) (escapes control/hidden characters so they're
      // actually visible in the log, unlike printing raw directly) so a
      // real failure is diagnosable without relying on copy/paste of raw text.
      console.error('[game-room/challenge/generate] JSON parse failed:', e.message)
      console.error('[game-room/challenge/generate] raw length:', raw.length)
      console.error('[game-room/challenge/generate] raw (escaped):', JSON.stringify(raw))
      return Response.json({ error: 'Failed to parse Nora response' }, { status: 500 })
    }

    const finalPrompt = challengeType === 'rank'
      ? JSON.stringify({ intro: parsed.intro, prompt: parsed.prompt, items: parsed.items || basePrompt.items })
      : challengeType === 'memory'
        ? parsed.memory_question
        : parsed.prompt

    // Build upsert payload — memory writes extra fields
    const upsertPayload = {
      session_id: challengeSessionId,
      couple_id: coupleId,
      round_number: roundNumber,
      prompt: finalPrompt,
      prompt_key: basePrompt.key,
      current_turn_user_id: challengeType === 'story' ? userId : null,
      ...(challengeType === 'memory' && {
        memory_question: parsed.memory_question,
        memory_answer: parsed.memory_answer || '',
        hint_1: parsed.hint_1,
        hint_2: parsed.hint_2,
        hint_3: parsed.hint_3,
        guesser_user_id: guesserUserId,
      }),
    }

    // Save round — upsert prevents race condition when both users call generate
    // simultaneously. Was using .single() here, which is the wrong tool for
    // this job: with ignoreDuplicates:true, the losing request's upsert
    // matches zero rows (ON CONFLICT DO NOTHING), and .single() on a
    // zero-row result returns a PostgREST error object instead of null —
    // an error this code never checked. .maybeSingle() returns null
    // cleanly on zero rows instead, which is what the `upserted || fallback`
    // line below actually needs to work as intended.
    const { data: upserted, error: upsertError } = await supabase
      .from('challenge_rounds')
      .upsert(upsertPayload, { onConflict: 'session_id,round_number', ignoreDuplicates: true })
      .select()
      .maybeSingle()

    if (upsertError) {
      console.error('[game-room/challenge/generate] Upsert error:', upsertError)
    }

    // If upsert no-oped (second user hit simultaneously), fetch existing row
    let round = upserted
    if (!round) {
      const { data: fallbackRound, error: fallbackError } = await supabase
        .from('challenge_rounds')
        .select('*')
        .eq('session_id', challengeSessionId)
        .eq('round_number', roundNumber)
        .maybeSingle()
      if (fallbackError) {
        console.error('[game-room/challenge/generate] Fallback fetch error:', fallbackError)
      }
      round = fallbackRound
    }

    if (!round) {
      return Response.json({ error: 'Failed to save round' }, { status: 500 })
    }

    return Response.json({ round })
  } catch (err) {
    console.error('[game-room/challenge/generate] Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
