export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'
import { getWeekStart } from '@/lib/dates'

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

    // ROOT CAUSE FIX Aug 12 2026 — this used to treat ANY existing reflection
    // as current, by design (commit c1a079d): serving the most recent one
    // instead of a strict current-week-only match, so a mid-week visit
    // (before Sunday's generation) still shows last week's rather than
    // nothing. That's the right call for one week of staleness — but it has
    // no ceiling. Matt reported being stuck on the week of 7/20 for
    // multiple weeks straight with weekly_reflections silently never
    // getting a new row (see the ROOT CAUSE FIX comments in
    // reflection/generate/route.js and cron/scheduled-tasks/route.js for
    // why generation was failing with zero trace). Because this route
    // always found SOME reflection to serve, the client's "hasReflection ?
    // show it : generate one" branch (app/weekly-reflection/page.js) never
    // even attempted to regenerate — the staleness was fully invisible.
    // Now: a reflection is only "current" if it's for this week or last
    // week (the legitimate mid-week-still-showing-last-week's case).
    // Anything older than that is stale — report hasReflection: false so
    // the client actually retries generation for the current week, while
    // still allowing a same- or one-week-old reflection to display normally.
    const currentWeekStart = getWeekStart()
    const lastWeekStart = (() => {
      const d = new Date(currentWeekStart + 'T12:00:00')
      d.setDate(d.getDate() - 7)
      return d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
    })()
    const isCurrentOrLastWeek = reflection.week_start === currentWeekStart || reflection.week_start === lastWeekStart

    if (!isCurrentOrLastWeek) {
      console.warn('[reflection/status] stale reflection found, reporting as missing so client regenerates', { coupleId, staleWeekStart: reflection.week_start, currentWeekStart })
      return NextResponse.json({ hasReflection: false, reflection: null })
    }

    return NextResponse.json({ hasReflection: true, reflection })
  } catch (err) {
    console.error('[reflection/status] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
