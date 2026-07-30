export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { coupleId, suggestionId, title, description, frequency, tier, source } = await request.json()

    if (!coupleId || !title) {
      return NextResponse.json({ error: 'coupleId and title required' }, { status: 400 })
    }

    const userId = user.id

    const isMember = await verifyCoupleMembership(supabase, userId, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
        partner_confirmed: source === 'existing' ? true : false,
        partner_confirmed_at: source === 'existing' ? now : null,
        status: source === 'existing' ? 'adopted' : 'pending',
        source: source || 'custom',
        adopted_at: source === 'existing' ? now : null,
        streak: 0,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('[ritual/start] insert error:', error)
      return NextResponse.json({ error: 'Failed to create ritual' }, { status: 500 })
    }

    // Notify partner that a ritual has been proposed
    const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://abf-couples-app.vercel.app'
    try {
      const { data: couple } = await supabase
        .from('couples')
        .select('user1_id, user2_id')
        .eq('id', coupleId)
        .maybeSingle()
      if (couple) {
        const partnerId = couple.user1_id === userId ? couple.user2_id : couple.user1_id
        fetch(`${appBase}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
          body: JSON.stringify({
            userId: partnerId,
            title: 'The Ritual',
            body: source === 'existing'
              ? `Your partner added a ritual you already do: "${title}"`
              : `Your partner proposed a new ritual: "${title}"`,
            url: '/ritual',
            route: 'ritual/start',
          }),
        }).catch(() => {})
      }
    } catch { /* non-blocking */ }

    return NextResponse.json({ ritual })
  } catch (err) {
    console.error('[ritual/start] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
