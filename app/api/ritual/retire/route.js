export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requestOrConfirmRetire } from '@/lib/ritual-retire'

export async function POST(request) {
  try {
    const { userId, coupleId, ritualId } = await request.json()

    if (!userId || !coupleId || !ritualId) {
      return NextResponse.json({ error: 'userId, coupleId, and ritualId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const result = await requestOrConfirmRetire({ supabase, userId, coupleId, ritualId })

    if (result.error === 'not_found') return NextResponse.json({ error: 'Ritual not found' }, { status: 404 })
    if (result.error === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (result.error) return NextResponse.json({ error: 'Failed to update ritual' }, { status: 500 })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[ritual/retire] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
