import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { flirtId, userId } = await request.json()

    if (!flirtId || !userId) {
      return NextResponse.json({ error: 'flirtId and userId are required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { error } = await supabase
      .from('flirts')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', flirtId)
      .eq('receiver_id', userId)

    if (error) {
      console.error('[mark-viewed] Supabase error:', error)
      return NextResponse.json({ error: 'Failed to mark flirt as viewed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[mark-viewed] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
