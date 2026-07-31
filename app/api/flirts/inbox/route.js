export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
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

    // Fetch all flirts where user is receiver, ordered newest first
    const { data: flirts } = await supabase
      .from('flirts')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false })

    // Also fetch sent flirts to show sender state
    const { data: sent } = await supabase
      .from('flirts')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    const unopened = (flirts || []).filter(f => !f.opened_at)
    const opened = (flirts || []).filter(f => f.opened_at)

    return NextResponse.json({
      unopened,
      opened,
      sent: sent || []
    })

  } catch (err) {
    console.error('[flirts/inbox] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
