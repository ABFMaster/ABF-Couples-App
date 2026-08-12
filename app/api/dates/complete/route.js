export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'
import { noraChat } from '@/lib/nora'
import { REACTION_LABELS } from '@/lib/date-night'
import { requireUser } from '@/lib/api-auth'
import { checkSensitiveContent, resolveSafetyAction } from '@/lib/safety'

async function sendPush(userId, title, body, url, route) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
      body: JSON.stringify({ userId, title, body, url, route }),
    })
  } catch {}
}

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { dateId, reaction, review } = await request.json()
    const userId = user.id
    if (!dateId || !reaction || !REACTION_LABELS[reaction]) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch the custom_date
    const { data: date, error: dateError } = await supabase
      .from('custom_dates')
      .select('id, title, date_time, stops, couple_id, user1_completed_at, user2_completed_at, user1_reaction, user2_reaction, user1_review, user2_review')
      .eq('id', dateId)
      .single()
    if (dateError || !date) {
      return NextResponse.json({ error: 'Date not found' }, { status: 404 })
    }

    // Fetch couple to determine user1 vs user2
    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', date.couple_id)
      .single()
    if (coupleError || !couple) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
    }

    if (couple.user1_id !== userId && couple.user2_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const isUser1 = couple.user1_id === userId
    const partnerId = isUser1 ? couple.user2_id : couple.user1_id
    // Guard — prevent double completion
    const alreadyCompleted = isUser1 ? !!date.user1_completed_at : !!date.user2_completed_at
    if (alreadyCompleted) {
      return NextResponse.json({ success: true, alreadyCompleted: true })
    }
    const updateData = isUser1
      ? { user1_reaction: reaction, user1_review: review?.trim() || null, user1_completed_at: new Date().toISOString() }
      : { user2_reaction: reaction, user2_review: review?.trim() || null, user2_completed_at: new Date().toISOString() }

    const { error: updateError } = await supabase
      .from('custom_dates')
      .update(updateData)
      .eq('id', dateId)
    if (updateError) {
      return NextResponse.json({ error: 'Failed to save completion' }, { status: 500 })
    }

    // ── SENSITIVE-CONTENT SAFETY GATE ────────────────────────────────
    // Checked once, on this request's own review text — the reaction/
    // review save above already happened regardless, same "your own data
    // still saves" contract as the other free-text routes. This route is
    // different from those in one way: below, when bothDone, it doesn't
    // just write to Nora's memory — it calls noraChat directly to
    // generate a "Nora observation" from both reviews and pushes it to
    // both partners. That generation step is gated on this too, by direct
    // analogy to AI Coach/Couples Session (skip generation when flagged),
    // not a separate decision. Task #193, Aug 12 2026.
    const safety = await checkSensitiveContent(review?.trim() || '')
    const safetyAction = resolveSafetyAction(safety)
    if (safetyAction !== 'GENERATE_AND_REMEMBER') {
      console.warn('[safety] date review skipped Nora observation + memory write', { route: 'dates/complete', action: safetyAction, category: safety.category })
    }

    // Check if both partners have now completed
    const partnerAlreadyDone = isUser1 ? !!date.user2_completed_at : !!date.user1_completed_at
    const bothDone = partnerAlreadyDone
    let noraObservation = null

    if (bothDone) {
      await supabase
        .from('custom_dates')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', dateId)

      // Generate a Nora observation now that both partners have reflected —
      // skipped entirely if this request's review was flagged or couldn't
      // be classified (see safety gate above). The "Nora noticed
      // something" push below is gated the same way — there's nothing to
      // notify about if generation never ran.
      if (safetyAction === 'GENERATE_AND_REMEMBER') {
        try {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('user_id, display_name')
            .in('user_id', [couple.user1_id, couple.user2_id])
          const nameFor = (uid) => profiles?.find(p => p.user_id === uid)?.display_name || 'One partner'
          const user1Name = nameFor(couple.user1_id)
          const user2Name = nameFor(couple.user2_id)

          const myReaction = reaction
          const myReview = review?.trim() || null
          const partnerReaction = isUser1 ? date.user2_reaction : date.user1_reaction
          const partnerReview = isUser1 ? date.user2_review : date.user1_review
          const finalUser1 = isUser1 ? { reaction: myReaction, review: myReview } : { reaction: partnerReaction, review: partnerReview }
          const finalUser2 = isUser1 ? { reaction: partnerReaction, review: partnerReview } : { reaction: myReaction, review: myReview }

          const prompt = [
            `${user1Name} and ${user2Name} just went on a date night called "${date.title}".`,
            `${user1Name} said: ${REACTION_LABELS[finalUser1.reaction] || finalUser1.reaction}${finalUser1.review ? ` — "${finalUser1.review}"` : ''}`,
            `${user2Name} said: ${REACTION_LABELS[finalUser2.reaction] || finalUser2.reaction}${finalUser2.review ? ` — "${finalUser2.review}"` : ''}`,
            `Write one warm, specific observation about how this date landed for them as a couple — 1-2 sentences max. No question. Never generic.`,
          ].join('\n')

          const observation = await noraChat(
            [{ role: 'user', content: prompt }],
            { route: 'dates/reflection', system: 'You are Nora — warm, specific, brief. Observe how a shared date landed for a couple. Never generic.', maxTokens: 80 }
          )
          if (observation) {
            noraObservation = observation.trim()
            await supabase.from('custom_dates').update({
              nora_observation: noraObservation,
              nora_observation_at: new Date().toISOString(),
            }).eq('id', dateId)
          }
        } catch (err) {
          console.error('[dates/complete] Nora observation error:', err)
        }

        sendPush(couple.user1_id, 'Nora', `Nora noticed something about your date "${date.title}".`, `/dates/${dateId}`, 'dates/reflection').catch(() => {})
        sendPush(couple.user2_id, 'Nora', `Nora noticed something about your date "${date.title}".`, `/dates/${dateId}`, 'dates/reflection').catch(() => {})
      }
    } else {
      // Only one partner has reflected so far — nudge the other
      sendPush(partnerId, 'Date Night', `Your date "${date.title}" is marked done. Add your side of it.`, `/dates/${dateId}?reflect=1`, 'dates/complete').catch(() => {})
    }

    if (safetyAction === 'GENERATE_AND_REMEMBER') {
      updateNoraMemory({
        coupleId: date.couple_id,
        userId,
        signalType: SIGNAL_TYPES.DATE_COMPLETED,
        inputData: { dateId, title: date.title, dateTime: date.date_time, stops: date.stops, reaction, review, bothDone },
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, bothDone, noraObservation })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
