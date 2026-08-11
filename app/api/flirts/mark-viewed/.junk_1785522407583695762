export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { flirtId } = await request.json()
    const userId = user.id

    if (!flirtId) {
      return NextResponse.json({ error: 'flirtId is required' }, { status: 400 })
    }

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
