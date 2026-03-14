import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data, error } = await supabase
      .from('flirts')
      .select('*')
      .eq('receiver_id', userId)
      .not('sent_at', 'is', null)
      .is('viewed_at', null)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[flirts/unread] Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch unread flirt' }, { status: 500 })
    }

    return NextResponse.json({ flirt: data })
  } catch (err) {
    console.error('[flirts/unread] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
