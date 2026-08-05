export const dynamic = 'force-dynamic'

// DB migration: see Sessions/FOLLOW_THROUGH_GENERATION_SPEC.md — follow_throughs table.

import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

// Has this specific user personally been through their own reveal experience
// for the activity that spawned this Follow-Through row? Each source activity
// has its own reveal shape, so this isn't one generic check. Unknown/future
// source types default to true (fail open) rather than hiding Follow-Through
// forever for a type this function hasn't been taught about yet.
async function hasSeenSourceReveal(supabase, sourceType, sourceId, userId) {
  if (sourceType === 'bet') {
    const { data } = await supabase
      .from('bet_responses')
      .select('reveal_seen_at')
      .eq('bet_id', sourceId)
      .eq('user_id', userId)
      .maybeSingle()
    return !!data?.reveal_seen_at
  }
  if (sourceType === 'spark') {
    const { data } = await supabase
      .from('spark_responses')
      .select('reveal_seen_at')
      .eq('spark_id', sourceId)
      .eq('user_id', userId)
      .maybeSingle()
    return !!data?.reveal_seen_at
  }
  if (sourceType === 'wednesday' || sourceType === 'thursday') {
    // No gate needed here, unlike Bet/Spark. Those reveals are a tap-through
    // or an auto-playing animation the user might not have sat through yet.
    // Wednesday/Notice and Thursday's reveals are both just a shared status
    // flip (wednesday_notices / thursday_entries), cron-driven rather than
    // user-triggered — both partners see the identical revealed state the
    // instant they open the dashboard. There's no ceremony to protect.
    return true
  }
  return true
}

// GET /api/follow-through/today?coupleId=...
// Returns the couple's current (non-superseded) Follow-Through row, shaped per-
// user with the blind-until-both-report rule applied.
export async function GET(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { searchParams } = new URL(request.url)
    const coupleId = searchParams.get('coupleId')

    if (!coupleId) {
      return NextResponse.json({ error: 'coupleId required' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const userId = user.id

    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    if (!couple) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
    }

    const isUser1 = userId === couple.user1_id

    const { data: row } = await supabase
      .from('follow_throughs')
      .select('*')
      .eq('couple_id', coupleId)
      .is('superseded_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!row) {
      return NextResponse.json({ active: false })
    }

    // Gate: this user must have personally been through their own reveal
    // experience for the SOURCE activity before Follow-Through is allowed to
    // take over the card slot. Without this, generation firing the instant
    // both partners answer (which happens before either has tapped through
    // their own reveal) would yank the slot away from Bet/Spark's own reveal
    // moment — the exact thing this design explicitly called out as required
    // ("Per-user gating" section, NOW_DO_THIS_DESIGN.md) but was never wired
    // into this endpoint. Root-caused and fixed here, same bug shape as the
    // reveal_seen_at issue this whole per-user pattern originated from.
    const hasSeenOwnReveal = await hasSeenSourceReveal(supabase, row.source_type, row.source_id, userId)
    if (!hasSeenOwnReveal) {
      return NextResponse.json({ active: false })
    }

    const myPrefix = isUser1 ? 'user1' : 'user2'
    const theirPrefix = isUser1 ? 'user2' : 'user1'

    // Per-user active flag — distinct from the row's own superseded_at, same
    // fix shape as Bet's reveal_seen_at bug. The row can stay un-superseded for
    // a long time under a weekly cadence; what actually matters is whether THIS
    // user has already tapped through past it. Once moved_on_at is set, this
    // row is done for this user regardless of the row's broader lifecycle.
    const myRowResolved = ['done', 'declined', 'expired'].includes(row[`${myPrefix}_status`])
    if (myRowResolved && row[`${myPrefix}_moved_on_at`]) {
      return NextResponse.json({ active: false })
    }

    // Lazy expiry — only touches sides still actually open
    const now = new Date()
    if (new Date(row.expires_at) < now) {
      const expiryUpdate = {}
      if (['pending', 'awaiting_partner_pick'].includes(row.user1_status)) expiryUpdate.user1_status = 'expired'
      if (['pending', 'awaiting_partner_pick'].includes(row.user2_status)) expiryUpdate.user2_status = 'expired'
      if (Object.keys(expiryUpdate).length) {
        await supabase.from('follow_throughs').update(expiryUpdate).eq('id', row.id)
        Object.assign(row, expiryUpdate)
      }
    }

    const mine = {
      actionText: row[`${myPrefix}_action_text`] || null,
      directed: row[`${myPrefix}_directed`] || null,
      status: row[`${myPrefix}_status`],
      note: row[`${myPrefix}_note`] || null,
      reportedAt: row[`${myPrefix}_reported_at`] || null,
      soloReaction: row[`${myPrefix}_solo_reaction`] || null,
    }

    const myReported = ['done', 'declined'].includes(mine.status)
    const theirReported = ['done', 'declined'].includes(row[`${theirPrefix}_status`])
    const bothReported = myReported && theirReported

    // Blind until both report — partner side only exposes participation status
    // until the mutual gate opens, never content.
    const theirs = bothReported
      ? {
          actionText: row[`${theirPrefix}_action_text`] || null,
          directed: row[`${theirPrefix}_directed`] || null,
          status: row[`${theirPrefix}_status`],
          note: row[`${theirPrefix}_note`] || null,
        }
      : {
          status: row[`${theirPrefix}_status`] === 'pending' ? 'pending' : 'responded',
        }

    // Candidates awaiting my pick, if this is a partner-authored wildcard and
    // the candidates were generated for MY partner (meaning I do the picking)
    const candidatesForMeToPick = row.candidate_actions?.for === theirPrefix
      ? row.candidate_actions.options
      : null

    return NextResponse.json({
      active: true,
      id: row.id,
      sourceId: row.source_id,
      sourceType: row.source_type,
      wildcard: row.wildcard,
      wildcardFlavor: row.wildcard_flavor,
      expiresAt: row.expires_at,
      mine,
      theirs,
      bothReported,
      mutualSynthesis: bothReported ? (row.mutual_synthesis || null) : null,
      candidatesForMeToPick,
    })
  } catch (err) {
    console.error('[follow-through/today] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
