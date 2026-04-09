import { createClient } from '@supabase/supabase-js'
import { noraVerdict } from '@/lib/nora'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { sessionId, userId, coupleId, debriefText } = await request.json()

    if (!sessionId || !userId || !coupleId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Determine user1 or user2
    const { data: coupleData } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .single()

    if (!coupleData) {
      return Response.json({ error: 'Couple not found' }, { status: 404 })
    }

    const isUser1 = coupleData.user1_id === userId
    const debriefField = isUser1 ? 'user1_debrief' : 'user2_debrief'

    // Write this partner's debrief
    if (debriefText) {
      await supabase
        .from('hunt_sessions')
        .update({ [debriefField]: debriefText })
        .eq('session_id', sessionId)
    }

    // Fetch current hunt session state
    const { data: huntSession } = await supabase
      .from('hunt_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (!huntSession) {
      return Response.json({ error: 'Hunt session not found' }, { status: 404 })
    }

    // Idempotency — return existing verdict if already generated
    if (huntSession.nora_verdict) {
      return Response.json({ ok: true, verdict: huntSession.nora_verdict })
    }

    // Only generate verdict when both debriefs are in
    const user1Debrief = isUser1 ? debriefText : huntSession.user1_debrief
    const user2Debrief = isUser1 ? huntSession.user2_debrief : debriefText

    if (!user1Debrief || !user2Debrief) {
      return Response.json({ ok: true, waiting: true })
    }

    // Fetch partner names
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, display_name')
      .in('user_id', [coupleData.user1_id, coupleData.user2_id])

    const user1Profile = profiles?.find(p => p.user_id === coupleData.user1_id)
    const user2Profile = profiles?.find(p => p.user_id === coupleData.user2_id)
    const name1 = user1Profile?.display_name || 'Partner 1'
    const name2 = user2Profile?.display_name || 'Partner 2'

    const systemPrompt = `You just sent a couple on a mission and they came back with a story. Your verdict is warm, specific, a little mischievous. You find what neither person said out loud. You stay in game master voice throughout — never therapist mode. You end with one directed question to one specific person that almost always becomes a real conversation.`

    const userPrompt = `${name1} and ${name2} just completed a Hunt mission.

THE MISSION: "${huntSession.mission_text}"

WHAT HAPPENED:
${name1} reported: "${user1Debrief}"
${name2} reported: "${user2Debrief}"

${huntSession.user1_drop || huntSession.user2_drop ? `THINGS THEY DROPPED DURING THE MISSION:
${huntSession.user1_drop ? `${name1}: "${huntSession.user1_drop}"` : ''}
${huntSession.user2_drop ? `${name2}: "${huntSession.user2_drop}"` : ''}` : ''}

Write Nora's verdict. 3-4 sentences max.

- Open with what actually happened — the real story, not a summary
- Find the thing neither of them named directly — the moment, the feeling, the signal underneath what they reported
- Land one observation that reframes what they did as something that reveals who they are together
- End with one directed question to either ${name1} or ${name2} specifically — not "discuss this together," a targeted poke that opens territory

PHILOSOPHY: The mission was the ignition. The conversation that follows is the point. Push them toward each other, not toward their phones.`

    const response = await noraVerdict(userPrompt, {
      route: 'game-room/hunt/debrief',
      system: systemPrompt,
      maxTokens: 400,
    })

    const verdict = response

    // Write verdict and mark complete
    await supabase
      .from('hunt_sessions')
      .update({
        nora_verdict: verdict,
        status: 'complete',
      })
      .eq('session_id', sessionId)

    return Response.json({ ok: true, verdict })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
