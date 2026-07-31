export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'

export async function GET(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { data } = await supabase
      .from('user_profiles')
      .select('flirt_profile_completed')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({ flirt_profile_completed: data?.flirt_profile_completed ?? true })
  } catch (err) {
    console.error('[check-profile] Unexpected error:', err)
    return NextResponse.json({ flirt_profile_completed: true })
  }
}
