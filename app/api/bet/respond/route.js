export const dynamic = 'force-dynamic'

// DB migration: ALTER TABLE bet_responses ADD COLUMN IF NOT EXISTS nora_intro text;

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { updateNoraMemory, SIGNAL_TYPES, getNoraMemory } from '@/lib/nora-memory'
import { noraReact, noraGenerate, noraSignal } from '@/lib/nora'
import { getHourInTimezone, hoursUntilNextLocalMorning } from '@/lib/dates'

export async function POST(request) {
  try {
    const { betId, userId, coupleId, prediction, actualAnswer } = await request.json()

    if (!betId || !userId) {
      return NextResponse.json({ error: 'betId and userId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch the bet row for question and couple context
    const { data: betRow } = await supabase
      .from('bets')
      .select('id, couple_id, question')
      .eq('id', betId)
      .maybeSingle()

    if (!betRow) {
      return NextResponse.json({ error: 'Bet not found' }, { status: 404 })
    }

    const resolvedCoupleId = coupleId || betRow.couple_id

    // Derive partnerId from couples table
    const { data: coupleRow } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', resolvedCoupleId)
      .maybeSingle()

    const partnerId = coupleRow?.user1_id === userId ? coupleRow?.user2_id : coupleRow?.user1_id

    // Fetch existing response row for this user
    const { data: existingRow } = await supabase
      .from('bet_responses')
      .select('*')
      .eq('bet_id', betId)
      .eq('user_id', userId)
      .maybeSingle()

    // Build update payload
    const now = new Date().toISOString()
    const updatePayload = {
      prediction,
      actual_answer: actualAnswer,
      responded_at: now,
    }

    // Insert or update the response row
    if (existingRow) {
      await supabase
        .from('bet_responses')
        .update(updatePayload)
        .eq('bet_id', betId)
        .eq('user_id', userId)
    } else {
      await supabase
        .from('bet_responses')
        .insert({ bet_id: betId, user_id: userId, couple_id: resolvedCoupleId, ...updatePayload })
    }

    supabase.from('hero_cache').delete().eq('couple_id', resolvedCoupleId).then(() => {}).catch(() => {})

    // Log activity to daily_checkins
    const { getTodayString } = await import('@/lib/dates')
    const todayStr = getTodayString()
    await supabase
      .from('daily_checkins')
      .upsert({
        user_id: userId,
        couple_id: resolvedCoupleId,
        check_date: todayStr,
        question_id: betRow?.id || null,
        question_text: betRow?.question || null,
        question_response: prediction || null,
      }, { onConflict: 'user_id,check_date' })

    // Fetch both response rows after save
    const [{ data: mine }, { data: theirs }] = await Promise.all([
      supabase
        .from('bet_responses')
        .select('*')
        .eq('bet_id', betId)
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('bet_responses')
        .select('*')
        .eq('bet_id', betId)
        .eq('user_id', partnerId)
        .maybeSingle(),
    ])

    // Fetch both names for notifications and Nora prompt
    const [{ data: myProfile }, { data: partnerProfile }] = await Promise.all([
      supabase.from('user_profiles').select('display_name').eq('user_id', userId).maybeSingle(),
      supabase.from('user_profiles').select('display_name').eq('user_id', partnerId).maybeSingle(),
    ])

    const myName = myProfile?.display_name || 'Your partner'
    const partnerName = partnerProfile?.display_name || 'Your partner'

    // Solo Nora insight — always generated, speaks only to this user about themselves
    const soloPrompt = `The Bet question was: "${betRow?.question}"

${myName} answered: "${actualAnswer}"

You are Nora — a world-class couples therapist. Read beneath this answer. What does the way ${myName} answered — not just what they said, but how they said it, what they avoided, what they reached for — reveal about what love feels like to them or what they fear?

Write exactly one sentence, maximum 18 words. Speak directly to ${myName} using "you". Be specific to this answer only. Never generic. Never start with "Your answer", "You said", or "That's". The best observations name something the person didn't quite say out loud.`

    const soloInsight = await noraReact(soloPrompt, {
      route: 'bet/solo-insight',
      context: 'daily',
      maxTokens: 60,
    })

    await supabase
      .from('bet_responses')
      .update({ nora_solo_insight: soloInsight })
      .eq('bet_id', betId)
      .eq('user_id', userId)

    // Push notification to partner
    const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://abf-couples-app.vercel.app'
    const pushBody = `${myName} submitted their bet response.`

    fetch(`${appBase}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
      body: JSON.stringify({
        userId: partnerId,
        title: 'The Bet',
        body: pushBody,
        url: '/dashboard',
        route: 'bet/respond',
      }),
    }).catch(() => {})

    // Check if all four fields are filled
    const allFilled = !!(
      mine?.prediction &&
      mine?.actual_answer &&
      theirs?.prediction &&
      theirs?.actual_answer
    )

    let noraReaction = mine?.nora_reaction || null
    let noraIntro = mine?.nora_intro || null

    // Generate Nora reaction and intro if all filled and not already generated
    if (allFilled && !mine?.nora_reaction) {
      try {
        const userPrompt = `The Bet question was: "${betRow.question}"

${myName}'s prediction (what they thought ${partnerName} would say): "${mine.prediction}"
${partnerName}'s prediction (what they thought ${myName} would say): "${theirs.prediction}"

${myName}'s actual answer: "${mine.actual_answer}"
${partnerName}'s actual answer: "${theirs.actual_answer}"

You are speaking directly to ${myName}. React to what the predictions and actual answers reveal but speak TO ${myName} — not about them. Be specific to what they actually said.`

        const partnerUserPrompt = `The Bet question was: "${betRow.question}"

${partnerName}'s prediction (what they thought ${myName} would say): "${theirs.prediction}"
${myName}'s prediction (what they thought ${partnerName} would say): "${mine.prediction}"

${partnerName}'s actual answer: "${theirs.actual_answer}"
${myName}'s actual answer: "${mine.actual_answer}"

You are speaking directly to ${partnerName}. React to what the predictions and actual answers reveal but speak TO ${partnerName} — not about them. Be specific to what they actually said.`

        const betReactionSettings = {
          route: 'bet/respond/reaction',
          system: 'You are speaking directly to the user who is reading this — always use \'you\' for them and their partner\'s actual name for the partner. Never use \'they\', \'them\', \'their\', or any third-person language. Never restate the question. Never start with an affirmation. React to what the predictions and actual answers reveal about how well these two know each other — be specific, warm, and occasionally playful. Keep your reaction to 1-2 sentences maximum. Exception: if an answer is very short (under 8 words), uses self-comparison, or reads as potentially self-deprecating humor — reflect what you noticed without stating what it means, and leave room for what it might actually be.',
          context: 'daily',
          maxTokens: 200,
        }

        const [completion, partnerCompletion] = await Promise.all([
          noraReact(userPrompt, betReactionSettings),
          noraReact(partnerUserPrompt, betReactionSettings),
        ])

        noraReaction = completion || ''
        const partnerReaction = partnerCompletion || ''

        // Generate Nora pre-reveal intro (short host line shown before cards flip)
        try {
          const introCompletion = await noraReact(`The question was: "${betRow.question}"`, {
            route: 'bet/respond/intro',
            system: 'Generate ONE short line (max 12 words) to say before revealing the answers. Reference the question topic if possible. Be playful, not therapeutic. Never use the word \'alright\'.',
            context: 'daily',
            maxTokens: 50,
          })
          noraIntro = introCompletion || ''
        } catch (introErr) {
          console.error('[bet/respond] Nora intro error:', introErr)
        }

        // Save nora_reaction and nora_intro to both response rows
        await Promise.all([
          supabase
            .from('bet_responses')
            .update({ nora_reaction: noraReaction, nora_intro: noraIntro })
            .eq('bet_id', betId)
            .eq('user_id', userId),
          supabase
            .from('bet_responses')
            .update({ nora_reaction: partnerReaction, nora_intro: noraIntro })
            .eq('bet_id', betId)
            .eq('user_id', partnerId),
        ])

        updateNoraMemory({
          coupleId: resolvedCoupleId,
          userId,
          signalType: SIGNAL_TYPES.BET_REVEAL,
          inputData: {
            question: betRow.question,
            responses: [
              { name: myName, prediction: mine.prediction, actual: mine.actual_answer },
              { name: partnerName, prediction: theirs.prediction, actual: theirs.actual_answer },
            ],
          },
        }).catch(() => {})

        // ── FOLLOW-THROUGH GENERATION ──────────────────────────────────────
        // Fires once, same moment nora_reaction/nora_intro above are generated.
        // See Sessions/FOLLOW_THROUGH_GENERATION_SPEC.md for the full design.
        try {
          await generateFollowThrough({
            supabase,
            coupleId: resolvedCoupleId,
            betId,
            betRow,
            couple: coupleRow,
            userId,
            partnerId,
            myName,
            partnerName,
            mine,
            theirs,
          })
        } catch (ftErr) {
          console.error('[bet/respond] Follow-Through generation error:', ftErr)
        }
      } catch (noraErr) {
        console.error('[bet/respond] Nora reaction error:', noraErr)
      }
    }

    const bothAnswered = !!(mine?.responded_at && theirs?.responded_at)

    return NextResponse.json({ success: true, mine, theirs, bothAnswered, noraReaction, noraIntro })
  } catch (err) {
    console.error('[bet/respond] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── FOLLOW-THROUGH GENERATION ────────────────────────────────────────────────
// See Sessions/FOLLOW_THROUGH_GENERATION_SPEC.md. Called once per Bet, right
// after both partners' answers and Nora's reaction/intro are in. Non-blocking —
// any failure here must never affect the Bet reveal itself (caller wraps this
// in its own try/catch already, but every step below is also defensive).
async function generateFollowThrough({ supabase, coupleId, betId, betRow, couple, userId, partnerId, myName, partnerName, mine, theirs }) {
  const memory = await getNoraMemory(coupleId)

  // Distress gate — layer 1: coarse, couple-level, already-computed signal.
  // Layer 2: cheap per-night check on tonight's actual content. Either one
  // tripping skips generation entirely — err toward silence, never toward
  // forcing an action into a bad night.
  const trajectory = memory?.couple_notes?.structured_facts?.trajectory
  let distressGateTripped = trajectory === 'away'

  if (!distressGateTripped) {
    try {
      const distressCheck = await noraSignal(
        `Tonight's Bet question: "${betRow.question}"\n${myName}: "${mine.actual_answer}"\n${partnerName}: "${theirs.actual_answer}"\n\nDoes either answer suggest active distress, conflict, or a rough patch tonight, as opposed to normal playful or reflective engagement? Answer exactly YES or NO.`,
        { route: 'follow-through/distress-check', maxTokens: 10 }
      )
      distressGateTripped = distressCheck.trim().toUpperCase().startsWith('YES')
    } catch {
      distressGateTripped = true // check itself failed — err toward not generating
    }
  }

  if (distressGateTripped) return

  const now = new Date()

  // Replacement, not collision — supersede anything still open for this couple
  await supabase
    .from('follow_throughs')
    .update({ superseded_at: now.toISOString() })
    .eq('couple_id', coupleId)
    .is('superseded_at', null)

  // Recent actions, so Nora doesn't repeat herself
  const { data: recentRows } = await supabase
    .from('follow_throughs')
    .select('user1_action_text, user2_action_text')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(5)
  const recentActionsList = (recentRows || [])
    .flatMap(r => [r.user1_action_text, r.user2_action_text])
    .filter(Boolean)
    .map(t => `- ${t}`)
    .join('\n') || 'None yet.'

  // Timing — single shared-timezone assumption, matches the existing cron pattern
  const timezone = 'America/Los_Angeles'
  const hour = getHourInTimezone(timezone)
  const pastCutoff = hour >= 18
  const expiryHours = hoursUntilNextLocalMorning(timezone) + (pastCutoff ? 24 : 0)
  const expiresAt = new Date(now.getTime() + expiryHours * 3600 * 1000).toISOString()
  const framingNote = pastCutoff
    ? 'It is currently evening. Frame the action as something for tomorrow, not tonight.'
    : 'Frame the action as something for today or tonight.'

  // Wildcard eligibility — both partners at Tier 2+ signal depth, no wildcard
  // for this couple in the last 14 days, distress gate already clean above.
  const bothTier2Plus = (memory?.user1_individual_signal_count || 0) > 5
    && (memory?.user2_individual_signal_count || 0) > 5
  const { count: recentWildcardCount } = await supabase
    .from('follow_throughs')
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', coupleId)
    .eq('wildcard', true)
    .gt('created_at', new Date(now.getTime() - 14 * 24 * 3600 * 1000).toISOString())
  const wildcardEligible = bothTier2Plus && !(recentWildcardCount > 0)
  const isWildcard = wildcardEligible && Math.random() < 0.10
  const wildcardFlavor = isWildcard ? (Math.random() < 0.5 ? 'bigger_scope' : 'partner_authored') : null
  // Only one side gets the partner-authored treatment on a wildcard night —
  // the other side still gets a normal action the same night.
  const partnerAuthoredTarget = wildcardFlavor === 'partner_authored'
    ? (Math.random() < 0.5 ? 'me' : 'partner')
    : null

  const buildBasePrompt = (forName, otherName, forAnswer, otherAnswer) => `The Bet question tonight was: "${betRow.question}"

${forName}'s answer: "${forAnswer}"
${otherName}'s answer: "${otherAnswer}"

${memory?.couple_notes?.notes ? `WHAT YOU KNOW ABOUT THIS COUPLE:\n${memory.couple_notes.notes}\n` : ''}
RECENT FOLLOW-THROUGH ACTIONS ALREADY GIVEN (do not repeat these or anything close to them):
${recentActionsList}

You are Nora. Based on tonight's Bet, give ${forName} ONE specific, real-world thing to do — not homework, an invitation. Something they'd want to do because they're curious what happens, not because they should. ${framingNote}

Two kinds of action exist. Pick whichever tonight's content actually earns:
- OTHER-DIRECTED: something ${forName} does TO or FOR ${otherName} — said, given, shown. ${otherName} will experience this directly and immediately in the real world.
- SELF-DIRECTED: something ${forName} does privately that ${otherName} has no way of knowing about unless ${forName} chooses to share it.

Bias toward OTHER-DIRECTED unless tonight's content specifically calls for private reflection.`

  const standardInstruction = (forName) => `\n\nReturn ONLY this JSON, no other text:\n{"action_text": "the invitation itself, max 20 words, speaks directly to ${forName} as 'you'", "directed": "other" or "self"}`
  const BIGGER_SCOPE_INSTRUCTION = `\n\nThis is a wildcard night — Nora occasionally gives something with more scope than usual. Give a bigger action: more time, more effort, more intention than a typical night. Explicitly state when this runs through (e.g. "sometime this weekend") inside the action_text itself, so the window is never ambiguous.\n\nReturn ONLY this JSON, no other text:\n{"action_text": "...", "directed": "other" or "self"}`
  const CANDIDATES_INSTRUCTION = `\n\nReturn ONLY this JSON, no other text:\n{"candidates": [{"action_text": "...", "directed": "other"}, {"action_text": "...", "directed": "other"}, {"action_text": "...", "directed": "self"}]}`

  async function generateFor(forName, otherName, forAnswer, otherAnswer, variant) {
    const base = buildBasePrompt(forName, otherName, forAnswer, otherAnswer)
    const instruction = variant === 'bigger_scope' ? BIGGER_SCOPE_INSTRUCTION
      : variant === 'candidates' ? CANDIDATES_INSTRUCTION
      : standardInstruction(forName)
    try {
      const raw = await noraGenerate(base + instruction, {
        route: 'follow-through/generate',
        system: 'You write real-world relationship invitations, never app-aware or meta. Return only the requested JSON.',
        maxTokens: 220,
      })
      const cleaned = raw.replace(/```json|```/g, '').trim()
      return JSON.parse(cleaned)
    } catch {
      return null
    }
  }

  const myVariant = partnerAuthoredTarget === 'me' ? 'candidates' : (wildcardFlavor === 'bigger_scope' ? 'bigger_scope' : 'standard')
  const partnerVariant = partnerAuthoredTarget === 'partner' ? 'candidates' : (wildcardFlavor === 'bigger_scope' ? 'bigger_scope' : 'standard')

  const [myResult, partnerResult] = await Promise.all([
    generateFor(myName, partnerName, mine.actual_answer, theirs.actual_answer, myVariant),
    generateFor(partnerName, myName, theirs.actual_answer, mine.actual_answer, partnerVariant),
  ])

  const isUser1 = userId === couple?.user1_id
  const row = {
    couple_id: coupleId,
    source_type: 'bet',
    source_id: betId,
    expires_at: expiresAt,
    wildcard: isWildcard,
    wildcard_flavor: wildcardFlavor,
  }

  const applyResult = (prefix, result, isCandidates) => {
    if (!result) return
    if (isCandidates && result.candidates) {
      row[`${prefix}_status`] = 'awaiting_partner_pick'
      row.candidate_actions = { for: prefix, options: result.candidates }
    } else if (result.action_text) {
      row[`${prefix}_action_text`] = result.action_text
      row[`${prefix}_directed`] = result.directed === 'self' ? 'self' : 'other'
    }
  }

  applyResult(isUser1 ? 'user1' : 'user2', myResult, myVariant === 'candidates')
  applyResult(isUser1 ? 'user2' : 'user1', partnerResult, partnerVariant === 'candidates')

  if (row.user1_action_text || row.user2_action_text || row.candidate_actions) {
    await supabase.from('follow_throughs').insert(row)
  }
}
