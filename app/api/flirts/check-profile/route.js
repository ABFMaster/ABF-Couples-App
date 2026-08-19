export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'

export async function GET(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    // ROOT CAUSE FIX Aug 18 2026 — was gating on flirt_profile_completed,
    // which only the orphaned /flirts/onboarding -> save-profile path ever
    // set (zero live entry points, confirmed via grep). Flirt generation now
    // reads humor/topics/obsessions from game_interests (Game Room's already-
    // live onboarding), so the only genuinely new field Flirt still needs is
    // flirt_style. Gate on that instead — see /flirts/style.
    const { data } = await supabase
      .from('user_profiles')
      .select('flirt_style')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({ flirt_style_completed: !!data?.flirt_style })
  } catch (err) {
    console.error('[check-profile] Unexpected error:', err)
    return NextResponse.json({ flirt_style_completed: true })
  }
}
