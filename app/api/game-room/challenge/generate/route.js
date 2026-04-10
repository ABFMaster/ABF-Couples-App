import { createClient } from '@supabase/supabase-js'
import { CHALLENGE_PROMPTS } from '@/lib/challenge-prompts'
import { noraGenerate } from '@/lib/nora'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { userId, coupleId, challengeSessionId, challengeType, roundNumber } = await request.json()

    if (!userId || !coupleId || !challengeSessionId || !challengeType || !roundNumber) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Idempotency — return existing round if already generated
    const { data: existingRound } = await supabase
      .from('challenge_rounds')
      .select('*')
      .eq('session_id', challengeSessionId)
      .eq('round_number', roundNumber)
      .single()

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
    const available = pool.filter(p => {
      if (!usedKeys.includes(p.key)) return true
      if (!p.recyclable) return false
      const lastUsed = recentMemoryRounds.find(r => r.prompt_key === p.key)
      return lastUsed && lastUsed.created_at < ninetyDaysAgo
    })
    const source = available.length > 0 ? available : pool

    const basePrompt = source[Math.floor(Math.random() * source.length)]

    // Fetch couple context for Nora personalisation
    const { data: coupleData } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .single()

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name, love_language, attachment_style')
      .in('user_id', [coupleData.user1_id, coupleData.user2_id])

    const { data: noraMemory } = await supabase
      .from('nora_memory')
      .select('memory_summary')
      .eq('couple_id', coupleId)
      .single()

    const profileSummary = profiles
      ? profiles.map(p => p.display_name).join(' and ')
      : 'this couple'

    const systemPrompt = `You are running a couples game called The Challenge. Your job is to take a base challenge prompt and personalise it for a specific couple. Keep it warm, specific, and playful. Never be generic.`

    let userPrompt
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
      // Fetch rich couple data for memory question generation
      const { data: sparkAnswers } = await supabase
        .from('today_responses')
        .select('spark_question, spark_answer, user_id')
        .eq('couple_id', coupleId)
        .not('spark_answer', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20)

      const { data: betAnswers } = await supabase
        .from('bets')
        .select('question, user1_answer, user2_answer, user1_locked, user2_locked')
        .eq('couple_id', coupleId)
        .not('user1_answer', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10)

      const { data: timelineEvents } = await supabase
        .from('timeline_events')
        .select('title, event_date, event_type, description')
        .eq('couple_id', coupleId)
        .order('event_date', { ascending: true })
        .limit(30)

      // Determine guesser vs answer-holder for this round
      // Odd rounds (1, 3): host guesses, partner holds answer
      // Even rounds (2): partner guesses, host holds answer
      const isOddRound = roundNumber % 2 !== 0
      const guesserUserId = isOddRound ? coupleData.user1_id : coupleData.user2_id
      const answerHolderUserId = isOddRound ? coupleData.user2_id : coupleData.user1_id

      const guesserProfile = profiles?.find(p => p.user_id === guesserUserId || p.id === guesserUserId)
      const answerHolderProfile = profiles?.find(p => p.user_id === answerHolderUserId || p.id === answerHolderUserId)
      const guesserName = guesserProfile?.display_name || 'Partner 1'
      const answerHolderName = answerHolderProfile?.display_name || 'Partner 2'

      // Build context strings
      const sparkContext = sparkAnswers && sparkAnswers.length > 0
        ? sparkAnswers.map(s => `Q: ${s.spark_question} — A: ${s.spark_answer}`).join('\n')
        : 'No Spark answers yet'

      const betContext = betAnswers && betAnswers.length > 0
        ? betAnswers.map(b => `Q: ${b.question} | ${guesserName}: ${b.user1_answer || '?'} | ${answerHolderName}: ${b.user2_answer || '?'}`).join('\n')
        : 'No Bet answers yet'

      const timelineContext = timelineEvents && timelineEvents.length > 0
        ? timelineEvents.map(e => `${e.title} (${e.event_date})${e.description ? ': ' + e.description : ''}`).join('\n')
        : 'No timeline events yet'

      userPrompt = `You are Nora running a Love Map memory game for ${guesserName} and ${answerHolderName}.

THE GAME: ${guesserName} is the GUESSER. ${answerHolderName} is the ANSWER HOLDER — the question is about ${answerHolderName}, and ${answerHolderName} knows the correct answer about themselves.

BASE QUESTION TERRITORY (pick from or be inspired by):
"${basePrompt.prompt}"

COUPLE DATA — use this to make the question specific and answerable:
Nora memory: ${noraMemory?.memory_summary || 'none yet'}

Recent Spark answers:
${sparkContext}

Recent Bet answers:
${betContext}

Timeline events:
${timelineContext}

YOUR JOB:
1. Write one specific question about ${answerHolderName} that ${guesserName} should be able to answer if they know their partner well — but might surprise them if they don't. The question must have a real, specific answer that ${answerHolderName} will recognise as true about themselves.
2. Only if you can find a SPECIFIC real data point in the couple's app history above that directly answers this question, write it as ${answerHolderName}'s answer. This means an actual Spark answer, Bet response, or Timeline event that contains a concrete answer to the question — not an inference, not a synthesis, not a guess. If no specific data point exists, return memory_answer as an empty string and answerType as "unknown". Do not fabricate or synthesize an answer.
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

    const response = await noraGenerate(userPrompt, { route: 'game-room/challenge/generate', system: systemPrompt, maxTokens: 600 })

    let parsed
    try {
      const raw = response.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(raw)
    } catch {
      parsed = challengeType === 'memory'
        ? { memory_question: basePrompt.prompt, memory_answer: '', hint_1: '', hint_2: '', hint_3: '', guesser_user_id: coupleData.user1_id }
        : { prompt: basePrompt.prompt }
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
        guesser_user_id: parsed.guesser_user_id,
      }),
    }

    // Save round — upsert prevents race condition when both users call generate simultaneously
    const { data: upserted, error } = await supabase
      .from('challenge_rounds')
      .upsert(upsertPayload, { onConflict: 'session_id,round_number', ignoreDuplicates: true })
      .select()
      .single()

    // If upsert no-oped (second user hit simultaneously), fetch existing row
    const round = upserted || await supabase
      .from('challenge_rounds')
      .select('*')
      .eq('session_id', challengeSessionId)
      .eq('round_number', roundNumber)
      .single()
      .then(r => r.data)

    if (!round) {
      return Response.json({ error: 'Failed to save round' }, { status: 500 })
    }

    return Response.json({ round })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
