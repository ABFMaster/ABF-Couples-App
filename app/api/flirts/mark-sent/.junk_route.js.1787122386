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
      .update({ sent_at: new Date().toISOString() })
      .eq('id', flirtId)
      .eq('sender_id', userId)

    if (error) {
      console.error('[mark-sent] Supabase error:', error)
      return NextResponse.json({ error: 'Failed to mark flirt as sent' }, { status: 500 })
    }

    // Increment couples.flirts_sent
    const { data: flirtRow } = await supabase
      .from('flirts')
      .select('couple_id')
      .eq('id', flirtId)
      .maybeSingle()

    if (flirtRow?.couple_id) {
      await supabase.rpc('increment_flirts_sent', { couple_id_input: flirtRow.couple_id })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[mark-sent] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
