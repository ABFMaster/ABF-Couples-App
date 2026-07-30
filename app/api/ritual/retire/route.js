export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requestOrConfirmRetire } from '@/lib/ritual-retire'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { coupleId, ritualId } = await request.json()

    if (!coupleId || !ritualId) {
      return NextResponse.json({ error: 'coupleId and ritualId required' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const result = await requestOrConfirmRetire({ supabase, userId: user.id, coupleId, ritualId })

    if (result.error === 'not_found') return NextResponse.json({ error: 'Ritual not found' }, { status: 404 })
    if (result.error === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (result.error) return NextResponse.json({ error: 'Failed to update ritual' }, { status: 500 })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[ritual/retire] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
