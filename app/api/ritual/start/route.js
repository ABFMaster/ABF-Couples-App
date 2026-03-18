import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { userId, coupleId, suggestionId, title, description, frequency, tier } = await request.json()

    if (!userId || !coupleId || !title) {
      return NextResponse.json({ error: 'userId, coupleId, and title required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const now = new Date().toISOString()

    const { data: ritual, error } = await supabase
      .from('rituals')
      .insert({
        couple_id: coupleId,
        suggestion_id: suggestionId || null,
        title,
        description: description || null,
        frequency: frequency || null,
        tier: tier || null,
        proposed_by: userId,
        partner_confirmed: false,
        status: 'pending',
        streak: 0,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('[ritual/start] insert error — message:', error.message, '| code:', error.code, '| details:', error.details, '| hint:', error.hint)
      return NextResponse.json({ error: 'Failed to create ritual' }, { status: 500 })
    }

    return NextResponse.json({ ritual })
  } catch (err) {
    console.error('[ritual/start] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
