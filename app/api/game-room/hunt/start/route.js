import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { getAvailableMissions, ALL_HUNT_MISSIONS } from '@/lib/hunt-missions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const anthropic = new Anthropic()

export async function POST(request) {
  try {
    const { userId, coupleId, sessionId, together, timeTag, dateId } = await request.json()

    if (!userId || !coupleId || !sessionId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
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
      .select('user_id, display_name, love_language, attachment_style')
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

    // Fetch date context if launched from Date Night
    let dateContext = ''
    if (dateId) {
      const { data: date } = await supabase
        .from('dates')
        .select('name, location, notes')
        .eq('id', dateId)
        .maybeSingle()
      if (date) {
        dateContext = `They have a date planned: ${date.name}${date.location ? ` at ${date.location}` : ''}${date.notes ? `. Notes: ${date.notes}` : ''}.`
      }
    }

    // Fetch visited places to power dynamic discovery missions
    const { data: visitedDates } = await supabase
      .from('dates')
      .select('location')
      .eq('couple_id', coupleId)
      .not('location', 'is', null)
    const visitedPlaces = (visitedDates || []).map(d => d.location).filter(Boolean)

    const partnerNames = profiles
      ? profiles.map(p => p.display_name).join(' and ')
      : 'this couple'

    // Use Nora to pick the best mission from the pool
    const systemPrompt = `You are Nora, the AI relationship coach for ABF. You are selecting a Hunt mission for a couple. Pick the mission that will be most interesting, surprising, and well-suited to this specific couple. Return only valid JSON.`

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

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    let selectedKey
    try {
      const raw = response.content[0].text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(raw)
      selectedKey = parsed.selected_key
    } catch {
      selectedKey = pool[Math.floor(Math.random() * pool.length)].key
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
