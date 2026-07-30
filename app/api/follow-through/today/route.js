export const dynamic = 'force-dynamic'

// DB migration: see Sessions/FOLLOW_THROUGH_GENERATION_SPEC.md — follow_throughs table.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// GET /api/follow-through/today?userId=...&coupleId=...
// Returns the couple's current (non-superseded) Follow-Through row, shaped per-
// user with the blind-until-both-report rule applied. Matches the unauthenticated
// pattern already used by /api/bet/respond, /api/bet/react, /api/bet/reveal —
// this feature attaches directly to Bet and follows the same convention.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const coupleId = searchParams.get('coupleId')

    if (!userId || !coupleId) {
      return NextResponse.json({ error: 'userId and coupleId required' }, { status: 400 })
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

    const myPrefixEarly = isUser1 ? 'user1' : 'user2'
    const myStatusEarly = row[`${myPrefixEarly}_status`]
    const myMovedOnAt = row[`${myPrefixEarly}_moved_on_at`]
    const myRowResolved = ['done', 'declined', 'expired'].includes(myStatusEarly)

    // Per-user active flag — distinct from the row's own superseded_at, same
    // fix shape as Bet's reveal_seen_at bug. The row can stay un-superseded for
    // a long time under a weekly cadence; what actually matters is whether THIS
    // user has already tapped through past it. Once moved_on_at is set, this
    // row is done for this user regardless of the row's broader lifecycle.
    if (myRowResolved && myMovedOnAt) {
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

    const myPrefix = isUser1 ? 'user1' : 'user2'
    const theirPrefix = isUser1 ? 'user2' : 'user1'

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
