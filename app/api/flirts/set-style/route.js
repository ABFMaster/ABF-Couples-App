export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'

// New Aug 18 2026 — replaces the old full Nora-interview onboarding
// (/flirts/onboarding -> save-profile) for the one field Flirt actually
// needs that Game Room's game_interests doesn't already cover. A single
// tap-choice write, not a conversation.
const VALID_STYLES = ['playful', 'romantic', 'bold', 'subtle']

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { style } = await request.json()
    if (!VALID_STYLES.includes(style)) {
      return NextResponse.json({ error: 'Invalid style' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: user.id, flirt_style: style }, { onConflict: 'user_id' })

    if (error) {
      console.error('[flirts/set-style] Supabase error:', error)
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[flirts/set-style] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
