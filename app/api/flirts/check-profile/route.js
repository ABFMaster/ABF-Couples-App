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

    const { data } = await supabase
      .from('user_profiles')
      .select('flirt_profile_completed')
      .eq('user_id', userId)
      .maybeSingle()

    return NextResponse.json({ flirt_profile_completed: data?.flirt_profile_completed ?? true })
  } catch (err) {
    console.error('[check-profile] Unexpected error:', err)
    return NextResponse.json({ flirt_profile_completed: true })
  }
}
