import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'
import { seedAssessmentMemory } from '@/lib/assessment-memory'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { coupleId, answers, results } = await request.json()
    const userId = user.id

    if (!answers) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Only trust the client-supplied coupleId if this user actually belongs
    // to it — otherwise a caller could pollute another couple's memory.
    // NOTE: if there's no couple yet (solo onboarding — the client sends
    // coupleId: null by design in that case), this resolves to null and
    // seedAssessmentMemory's updateNoraMemory call safely no-ops for the
    // Nora-memory half only (nora_memory needs a real couple row to write
    // into). The user_profiles score write below still always happens.
    // The dropped Nora signal gets caught later, once a couple exists —
    // see the backfill in app/api/couples/join/route.js.
    const isMember = coupleId ? await verifyCoupleMembership(supabase, userId, coupleId) : false
    const resolvedCoupleId = isMember ? coupleId : null

    await seedAssessmentMemory({ supabase, userId, coupleId: resolvedCoupleId, answers, results })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[seed-memory] error:', error)
    return NextResponse.json({ error: 'Failed to seed memory' }, { status: 500 })
  }
}
