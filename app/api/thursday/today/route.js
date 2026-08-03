export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTodayString } from '@/lib/dates'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function GET(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { searchParams } = new URL(request.url)
    const coupleId = searchParams.get('coupleId')
    if (!coupleId) return NextResponse.json({ error: 'coupleId required' }, { status: 400 })

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const todayStr = getTodayString('America/Los_Angeles')

    const { data: entry } = await supabase
      .from('thursday_entries')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('date', todayStr)
      .maybeSingle()

    if (!entry) return NextResponse.json({ entry: null })

    // Determine which user this is and return their view
    const isUser1 = entry.user1_id === user.id
    const myObservation = isUser1 ? entry.user1_observation : entry.user2_observation
    const myQuestion = isUser1 ? entry.user1_question : entry.user2_question
    const myResponse = isUser1 ? entry.user1_response : entry.user2_response
    const myRespondedAt = isUser1 ? entry.user1_responded_at : entry.user2_responded_at
    const partnerResponse = isUser1 ? entry.user2_response : entry.user1_response
    const partnerObservation = isUser1 ? entry.user2_observation : entry.user1_observation
    const partnerQuestion = isUser1 ? entry.user2_question : entry.user1_question
    const partnerRespondedAt = isUser1 ? entry.user2_responded_at : entry.user1_responded_at

    return NextResponse.json({
      entry: {
        id: entry.id,
        date: entry.date,
        status: entry.status,
        myObservation,
        myQuestion,
        myResponse,
        myRespondedAt,
        partnerObservation,
        partnerQuestion,
        partnerResponse,
        partnerRespondedAt,
        nora_synthesis: entry.nora_synthesis
      }
    })

  } catch (err) {
    console.error('[thursday/today] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
