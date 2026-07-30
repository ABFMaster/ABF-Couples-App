export const dynamic = 'force-dynamic'

// DB migration: see Sessions/FOLLOW_THROUGH_GENERATION_SPEC.md — follow_throughs table.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { noraReact } from '@/lib/nora'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'

// POST /api/follow-through/report
// Two actions, both unauthenticated like the rest of the Bet-adjacent routes:
//  - { action: 'pick', followThroughId, userId, coupleId, candidateIndex }
//    Partner-authored wildcard: the OTHER partner picks which candidate becomes
//    the target user's action.
//  - { action: 'report', followThroughId, userId, coupleId, status, note }
//    Did it / Didn't get to it, with the two-tier reveal.
export async function POST(request) {
  try {
    const body = await request.json()
    const { action, followThroughId, userId, coupleId } = body

    if (!followThroughId || !userId || !coupleId) {
      return NextResponse.json({ error: 'followThroughId, userId, and coupleId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    if (!couple) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
    }

    const { data: row } = await supabase
      .from('follow_throughs')
      .select('*')
      .eq('id', followThroughId)
      .maybeSingle()

    if (!row) {
      return NextResponse.json({ error: 'Follow-Through not found' }, { status: 404 })
    }

    const isUser1 = userId === couple.user1_id
    const myPrefix = isUser1 ? 'user1' : 'user2'
    const theirPrefix = isUser1 ? 'user2' : 'user1'

    // ── MOVED ON ──────────────────────────────────────────────────────────
    // Fired when the user taps "See today's Bet →" and the card flips. Marks
    // this row done for THIS user specifically — see the matching comment in
    // /api/follow-through/today about why this can't just be the row's
    // superseded_at.
    if (action === 'moved_on') {
      await supabase
        .from('follow_throughs')
        .update({ [`${myPrefix}_moved_on_at`]: new Date().toISOString() })
        .eq('id', followThroughId)
      return NextResponse.json({ success: true })
    }

    // ── PICK ──────────────────────────────────────────────────────────────
    if (action === 'pick') {
      const { candidateIndex } = body
      const candidates = row.candidate_actions?.options
      if (!candidates || candidates[candidateIndex] == null) {
        return NextResponse.json({ error: 'No candidates to pick from' }, { status: 400 })
      }
      // candidate_actions.for is whoever the candidates were generated FOR —
      // the picker is always the other partner, already implied by who's calling
      const targetPrefix = row.candidate_actions.for
      const chosen = candidates[candidateIndex]
      await supabase
        .from('follow_throughs')
        .update({
          [`${targetPrefix}_action_text`]: chosen.action_text,
          [`${targetPrefix}_directed`]: chosen.directed === 'self' ? 'self' : 'other',
          [`${targetPrefix}_status`]: 'pending',
          candidate_actions: null,
        })
        .eq('id', followThroughId)
      return NextResponse.json({ success: true })
    }

    // ── REPORT ────────────────────────────────────────────────────────────
    const { status, note } = body
    if (!['done', 'declined'].includes(status)) {
      return NextResponse.json({ error: 'status must be done or declined' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const myActionText = row[`${myPrefix}_action_text`]
    const myDirected = row[`${myPrefix}_directed`]

    // Tier 1 — private, immediate, on my own report only
    let soloReaction = null
    try {
      const prompt = status === 'done'
        ? `The real-world action was: "${myActionText}"\n\nThe person reports: "done"${note ? `, and added: "${note}"` : ''}.\n\nYou are Nora. React privately, warmly, specifically to what they did. One sentence, max 18 words. Never generic, never restate the action back to them.`
        : `The real-world action was: "${myActionText}"\n\nThe person didn't get to it${note ? `, and added: "${note}"` : ''}.\n\nYou are Nora. Respond briefly and warmly — no guilt, no disappointment, this is genuinely fine. One short sentence, max 14 words.`
      soloReaction = await noraReact(prompt, { route: 'follow-through/solo-reaction', context: 'daily', maxTokens: 60 })
    } catch {}

    const updatePayload = {
      [`${myPrefix}_status`]: status,
      [`${myPrefix}_note`]: note || null,
      [`${myPrefix}_reported_at`]: now,
      [`${myPrefix}_solo_reaction`]: soloReaction,
    }
    await supabase.from('follow_throughs').update(updatePayload).eq('id', followThroughId)

    updateNoraMemory({
      coupleId,
      userId,
      signalType: SIGNAL_TYPES.FOLLOW_THROUGH_REPORTED,
      inputData: { action_text: myActionText, directed: myDirected, status, note: note || null },
    }).catch(() => {})

    // Tier 2 — mutual, once both sides have reported
    const theirStatus = row[`${theirPrefix}_status`]
    const partnerAlreadyReported = ['done', 'declined'].includes(theirStatus)
    let mutualSynthesis = row.mutual_synthesis || null

    if (partnerAlreadyReported && !row.mutual_synthesis) {
      const theirActionText = row[`${theirPrefix}_action_text`]
      const theirDirected = row[`${theirPrefix}_directed`]
      const theirNote = row[`${theirPrefix}_note`]

      try {
        const synthesisPrompt = `Two follow-through actions from the same night's Bet:

Partner A's action: "${myActionText}" (${myDirected}-directed, status: ${status})
Partner B's action: "${theirActionText}" (${theirDirected}-directed, status: ${theirStatus})

You are Nora. Write one line noticing the pattern across both of them tonight — not restating what either did (they already know that), but what it reveals about how they're showing up for each other right now. If either action was self-directed, do not reveal its content — you may only speak to the pattern, not the specifics of a self-directed action. Max 22 words.`
        mutualSynthesis = await noraReact(synthesisPrompt, { route: 'follow-through/mutual-synthesis', context: 'daily', maxTokens: 70 })
        await supabase.from('follow_throughs').update({ mutual_synthesis: mutualSynthesis }).eq('id', followThroughId)
      } catch {}

      updateNoraMemory({
        coupleId,
        userId: null,
        signalType: SIGNAL_TYPES.FOLLOW_THROUGH_COMPLETED,
        inputData: {
          user1: { action_text: row.user1_action_text, directed: row.user1_directed, status: isUser1 ? status : theirStatus },
          user2: { action_text: row.user2_action_text, directed: row.user2_directed, status: isUser1 ? theirStatus : status },
        },
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, soloReaction, bothReported: partnerAlreadyReported, mutualSynthesis })
  } catch (err) {
    console.error('[follow-through/report] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
