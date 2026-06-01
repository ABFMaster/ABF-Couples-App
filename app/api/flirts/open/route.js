export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
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

    const { flirtId } = await request.json()
    if (!flirtId) return NextResponse.json({ error: 'flirtId required' }, { status: 400 })

    await supabase
      .from('flirts')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', flirtId)
      .eq('receiver_id', user.id)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[flirts/open] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
