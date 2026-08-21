export const dynamic = 'force-dynamic'

import { getAvailableMissions, ALL_HUNT_MISSIONS } from '@/lib/hunt-missions'
import { noraGenerate, parseNoraJSON } from '@/lib/nora'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return Response.json(authError.body, { status: authError.status })

    const { coupleId, sessionId, together, timeTag, dateId } = await request.json()

    if (!coupleId || !sessionId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

    // verifyCoupleMembership above only proves the CALLER belongs to
    // coupleId — it says nothing about whether the client-supplied
    // sessionId actually belongs to that couple. Without this check, a
    // member of couple A could supply couple B's sessionId and either
    // read back couple B's already-picked mission, or (if none exists
    // yet) insert a second hunt_sessions row for that session_id tagged
    // with couple A's id, corrupting couple B's session.
    const { data: gameSession } = await supabase
      .from('game_sessions')
      .select('couple_id')
      .eq('id', sessionId)
      .maybeSingle()
    if (!gameSession || gameSession.couple_id !== coupleId) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    // Idempotency — return existing hunt session if already started
    const { data: existing } = await supabase
      .from('hunt_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (existing) {
      return Response.json({ huntSession: existing })
    }

    // Fetch couple context
    const { data: coupleData } = await supabase
      .from('couples')
      .select('user1_id, user2_id, created_at')
      .eq('id', coupleId)
      .single()

    const { data: profiles } = await supabase
      .from('user_profiles')
      // ROOT CAUSE FIX Aug 21 2026 — found via full schema-drift audit:
      // user_profiles has no `love_language` column, only
      // `love_language_primary`. Harmless in practice (love_language was
      // fetched but never actually read anywhere below), fixed for
      // correctness anyway.
      .select('user_id, display_name, love_language_primary, attachment_style')
      .in('user_id', [coupleData.user1_id, coupleData.user2_id])

    const { data: noraMemory } = await supabase
      .from('nora_memory')
      .select('memory_summary')
      .eq('couple_id', coupleId)
      .maybeSingle()

    // Determine couple stage from relationship length
    const relationshipWeeks = coupleData.created_at
      ? (Date.now() - new Date(coupleData.created_at).getTime()) / (1000 * 60 * 60 * 24 * 7)
      : 0
    const stage = relationshipWeeks < 52 ? 'new' : relationshipWeeks < 156 ? 'established' : 'rooted'

    // Get missions already used by this couple
    const { data: usedSessions } = await supabase
      .from('hunt_sessions')
      .select('mission_key')
      .eq('couple_id', coupleId)
    const usedKeys = (usedSessions || []).map(s => s.mission_key)

    // Filter available missions
    const available = getAvailableMissions({
      together: together !== false,
      stage,
      timeTag: timeTag || 'any',
      excludeKeys: usedKeys,
    })

    // Fall back to full pool if all used
    const pool = available.length > 0 ? available : ALL_HUNT_MISSIONS.filter(m => {
      if (!together && m.together_required) return false
      return true
    })

    // ROOT CAUSE FIX Aug 21 2026 — found via full schema-drift audit: there
    // is no `dates` table in the live DB at all (never existed under that
    // name — the real table is `custom_dates`, and it has no scalar
    // `location`/`name`/`notes` columns; per-stop location lives inside the
    // `stops` jsonb array as `stop.address`/`stop.name`, see
    // app/dates/custom/page.js). Both queries below were silently failing
    // on every Hunt start — the dateId-specific "date planned" context
    // never populated (though nothing in the app currently passes a
    // dateId into /game-room/hunt/start, so that branch was unreachable in
    // practice) and "visited places" personalization for dynamic missions
    // was always empty.

    // Fetch date context if launched from Date Night
    let dateContext = ''
    if (dateId) {
      const { data: date } = await supabase
        .from('custom_dates')
        .select('title, stops')
        .eq('id', dateId)
        .maybeSingle()
      if (date) {
        const firstStop = Array.isArray(date.stops) ? date.stops[0] : null
        const stopLocation = firstStop?.address || firstStop?.name || null
        dateContext = `They have a date planned: ${date.title}${stopLocation ? ` at ${stopLocation}` : ''}.`
      }
    }

    // Fetch visited places to power dynamic discovery missions
    const { data: visitedDates } = await supabase
      .from('custom_dates')
      .select('stops')
      .eq('couple_id', coupleId)
      .eq('status', 'completed')
    const visitedPlaces = (visitedDates || [])
      .flatMap(d => Array.isArray(d.stops) ? d.stops : [])
      .map(s => s?.address || s?.name)
      .filter(Boolean)

    const partnerNames = profiles
      ? profiles.map(p => p.display_name).join(' and ')
      : 'this couple'

    // Use Nora to pick the best mission from the pool
    const systemPrompt = `You are selecting a Hunt mission for a couple. Pick the mission that will be most interesting, surprising, and well-suited to this specific couple. Return only valid JSON.`

    const missionChoices = pool.slice(0, 8).map(m => ({ key: m.key, title: m.title, category: m.category, mission_text: m.mission_text }))

    const userPrompt = `Pick the best Hunt mission for ${partnerNames}.

Couple context:
- Relationship stage: ${stage}
- Together right now: ${together !== false ? 'yes' : 'no'}
- Time available: ${timeTag || 'flexible'}
- Nora memory: ${noraMemory?.memory_summary || 'none yet'}
${dateContext ? `- ${dateContext}` : ''}
${visitedPlaces.length > 0 ? `- Places they have been together: ${visitedPlaces.slice(0, 10).join(', ')}` : ''}

Mission options:
${JSON.stringify(missionChoices, null, 2)}

Pick the one mission that will be most resonant for this couple right now. Consider their stage, whether they are together, and any context from Nora's memory.

Respond in this exact JSON format with no other text:
{
  "selected_key": "hunt_xx"
}`

    const response = await noraGenerate(userPrompt, { route: 'game-room/hunt/start', system: systemPrompt, maxTokens: 100 })

    let selectedKey
    try {
      const parsed = parseNoraJSON(response)
      selectedKey = parsed.selected_key
    } catch (e) {
      console.error('[game-room/hunt/start] JSON parse failed:', raw)
      return Response.json({ error: 'Failed to parse Nora response' }, { status: 500 })
    }

    const mission = pool.find(m => m.key === selectedKey) || pool[0]

    // Save hunt session
    const { data: huntSession, error } = await supabase
      .from('hunt_sessions')
      .insert({
        session_id: sessionId,
        couple_id: coupleId,
        mission_key: mission.key,
        mission_category: mission.category,
        mission_title: mission.title,
        mission_text: mission.mission_text,
        nora_intro: mission.nora_intro,
        hint: mission.hint || null,
        dynamic: mission.dynamic || false,
        together: together !== false,
        time_tag: timeTag || 'any',
        status: 'briefing',
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: 'Failed to create hunt session' }, { status: 500 })
    }

    return Response.json({ huntSession })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
