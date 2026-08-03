export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getTodayString } from '@/lib/dates'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

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

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[thursday/respond] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
