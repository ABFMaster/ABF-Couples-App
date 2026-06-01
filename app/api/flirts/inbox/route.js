export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const coupleId = searchParams.get('coupleId')
    if (!coupleId) return NextResponse.json({ error: 'coupleId required' }, { status: 400 })

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
