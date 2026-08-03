export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function GET(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { searchParams } = new URL(request.url)
    const coupleId = searchParams.get('coupleId')

    if (!coupleId) {
      return NextResponse.json({ error: 'coupleId required' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: reflection } = await supabase
      .from('weekly_reflections')
      .select('*')
      .eq('couple_id', coupleId)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!reflection) {
      return NextResponse.json({ hasReflection: false, reflection: null })
    }

    return NextResponse.json({ hasReflection: true, reflection })
  } catch (err) {
    console.error('[reflection/status] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
