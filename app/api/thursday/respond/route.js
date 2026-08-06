export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTodayString } from '@/lib/dates'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'
import { noraChat } from '@/lib/nora'
import { generateFollowThrough } from '@/lib/follow-through'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { coupleId, response } = await request.json()
    if (!coupleId || !response?.trim()) return NextResponse.json({ error: 'coupleId and response required' }, { status: 400 })

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const todayStr = getTodayString('America/Los_Angeles')

    // Fetch today's entry
    const { data: entry } = await supabase
      .from('thursday_entries')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('date', todayStr)
      .maybeSingle()

    if (!entry) return NextResponse.json({ error: 'No Thursday entry for today' }, { status: 404 })

    const isUser1 = entry.user1_id === user.id
    const updateField = isUser1
      ? { user1_response: response.trim(), user1_responded_at: new Date().toISOString() }
      : { user2_response: response.trim(), user2_responded_at: new Date().toISOString() }

    await supabase
      .from('thursday_entries')
      .update(updateField)
      .eq('id', entry.id)

    // ROOT CAUSE FIX — Aug 6 2026. Same bug shape Matt hit on Wednesday
    // Notice, found while reviewing Thursday for parity: the only place
    // Thursday's synthesis + Follow-Through ever got generated was
    // processThursdayReveal, a single cron pass around 6-7pm Pacific.
    // Thursday has no explicit deadline shown anywhere in the UI (unlike
    // Wednesday's 7pm/10pm), and thursday/respond never checked entry
    // status before writing — so a response submitted after that one cron
    // window (which is a completely normal, expected thing for this
    // feature, not an edge case) got captured in the DB but the entry was
    // usually already status='revealed' from the cron partially firing
    // earlier, and nothing was ever coming back to re-synthesize or
    // generate Follow-Through. Unlike Wednesday, there's no natural fixed
    // cutoff hour to hang a second catch-all cron off of here.
    //
    // Fix: mirror how Bet/Spark already work (see bet/respond's
    // `if (allFilled && !mine?.nora_reaction)` block) — trigger the
    // synthesis + Follow-Through generation immediately, at write-time,
    // the moment this response completes the pair, instead of waiting on
    // any cron window at all. This closes the bug for every hour of the
    // day, not just before/after one specific cutoff. Idempotency guard
    // (`entry.status === 'pending'`) prevents a double-fire if both
    // responses somehow land in the same instant. processThursdayReveal
    // remains as-is — it's now purely the "reveal whatever we have, even
    // if incomplete, by evening" fallback for the partial/nobody-responded
    // case, since a still-'pending' entry by the time it runs now
    // definitively means this block hasn't fired.
    const bothNowPresent = isUser1
      ? !!entry.user2_response
      : !!entry.user1_response
    if (bothNowPresent && entry.status === 'pending') {
      try {
        const user1Response = isUser1 ? response.trim() : entry.user1_response
        const user2Response = isUser1 ? entry.user2_response : response.trim()

        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, display_name')
          .in('user_id', [entry.user1_id, entry.user2_id])
        const user1Name = profiles?.find(p => p.user_id === entry.user1_id)?.display_name || 'Partner 1'
        const user2Name = profiles?.find(p => p.user_id === entry.user2_id)?.display_name || 'Partner 2'

        const synthesisPrompt = [
          `You are Nora. Two people privately reflected on your observations today. Now bring their responses together.`,
          `${user1Name}'s observation: "${entry.user1_observation} ${entry.user1_question}"`,
          `${user1Name}'s response: "${user1Response}"`,
          `${user2Name}'s observation: "${entry.user2_observation} ${entry.user2_question}"`,
          `${user2Name}'s response: "${user2Response}"`,
          `Write a 2-3 sentence synthesis that connects what you see across both responses. End with one calibrated "what" or "how" question that creates a conversation between them tonight. Never summarize. Find the thread.`
        ].join('\n\n')

        const systemPrompt = `You are Nora — warm, direct, specific. You find the thread between what two people said privately and name it. Never generic. Never therapeutic jargon. End with one question that makes them want to talk to each other tonight.`

        const synthesis = await noraChat(
          [{ role: 'user', content: synthesisPrompt }],
          { route: 'thursday/respond-reveal', system: systemPrompt, maxTokens: 200 }
        ) || ''

        await supabase
          .from('thursday_entries')
          .update({ nora_synthesis: synthesis.trim(), status: 'revealed' })
          .eq('id', entry.id)
          .eq('status', 'pending') // second idempotency layer against a concurrent double-write

        const { data: couple } = await supabase
          .from('couples')
          .select('*')
          .eq('id', coupleId)
          .maybeSingle()

        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CRON_SECRET}` },
          body: JSON.stringify({ userId: entry.user1_id, title: 'Nora', body: 'Something to see together tonight.', url: '/dashboard', route: 'thursday/respond-reveal' }),
        }).catch(() => {})
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CRON_SECRET}` },
          body: JSON.stringify({ userId: entry.user2_id, title: 'Nora', body: 'Something to see together tonight.', url: '/dashboard', route: 'thursday/respond-reveal' }),
        }).catch(() => {})

        if (couple) {
          try {
            await generateFollowThrough({
              supabase,
              coupleId,
              sourceType: 'thursday',
              sourceId: entry.id,
              sourceLabel: 'Thursday',
              myQuestion: `${entry.user1_observation || ''} ${entry.user1_question || ''}`.trim(),
              theirQuestion: `${entry.user2_observation || ''} ${entry.user2_question || ''}`.trim(),
              couple,
              userId: entry.user1_id,
              myName: user1Name,
              partnerName: user2Name,
              myAnswer: user1Response,
              theirAnswer: user2Response,
            })
          } catch (ftErr) {
            console.error('[thursday/respond] Follow-Through generation error:', ftErr)
          }
        }
      } catch (revealErr) {
        // Never let the reveal/synthesis side-path fail the actual response
        // write above, which has already succeeded by this point.
        console.error('[thursday/respond] reveal generation error:', revealErr)
      }
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[thursday/respond] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
