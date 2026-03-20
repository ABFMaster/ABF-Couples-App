import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { sessionId, coupleId } = await request.json()
    if (!sessionId || !coupleId) {
      return NextResponse.json({ error: 'sessionId and coupleId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get session with hole data
    const { data: session } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    // Return existing debrief if already generated
    if (session.debrief_generated) {
      return NextResponse.json({ alreadyGenerated: true })
    }

    // Get both finds
    const { data: finds } = await supabase
      .from('game_finds')
      .select('*, user_id')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    // Get couple + partner names
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    const [{ data: user1Profile }, { data: user2Profile }] = await Promise.all([
      supabase.from('user_profiles').select('display_name').eq('user_id', couple.user1_id).maybeSingle(),
      supabase.from('user_profiles').select('display_name').eq('user_id', couple.user2_id).maybeSingle(),
    ])

    const user1Name = user1Profile?.display_name || 'Partner 1'
    const user2Name = user2Profile?.display_name || 'Partner 2'

    const find1 = finds?.find(f => f.user_id === couple.user1_id)
    const find2 = finds?.find(f => f.user_id === couple.user2_id)

    const prompt = `You are Nora — warm, witty, perceptive. A couple just came back from a Rabbit Hole experience. Here's what happened:

TOPIC: ${session.hole_topic}
ENTRY POINT: ${session.hole_entry}

${user1Name}'s thread: ${session.user1_thread}
${user1Name} found: ${find1?.find_text || 'Nothing dropped yet'}

${user2Name}'s thread: ${session.user2_thread}
${user2Name} found: ${find2?.find_text || 'Nothing dropped yet'}

THE CONVERGENCE (what you planned): ${session.convergence}

Your job:
1. Write a brief convergence reveal (2-3 sentences) — the surprising human truth that connects what they both found. Reference what they actually found, not just the planned convergence. Be specific and genuinely illuminating.
2. Write 3 real debrief questions — not survey questions, real Nora questions that open something new. Base them on what they actually found and how it might connect to who they are.

Rules:
- Be Nora — warm, witty, occasionally mischievous
- Reference their actual finds specifically
- Questions should feel like the best part of the dinner party conversation
- Don't be clinical or therapist-y

Respond ONLY with JSON, no markdown:
{
  "convergence_reveal": "The surprising connection Nora reveals — 2-3 sentences",
  "questions": [
    "First real question",
    "Second real question",
    "Third real question"
  ],
  "timeline_title": "A short evocative title for this memory (5 words max)"
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].text.trim()
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    let debrief
    try {
      debrief = JSON.parse(cleaned)
    } catch (err) {
      console.error('[generate-debrief] Parse error:', err)
      return NextResponse.json({ error: 'Failed to parse debrief' }, { status: 500 })
    }

    // Save timeline event
    await supabase
      .from('timeline_events')
      .insert({
        couple_id: coupleId,
        event_type: 'custom',
        title: debrief.timeline_title || `The Rabbit Hole: ${session.hole_topic}`,
        description: `${session.hole_entry}\n\n${user1Name} found: ${find1?.find_text || ''}\n${user2Name} found: ${find2?.find_text || ''}`,
        event_date: new Date().toISOString().split('T')[0],
        created_by: couple.user1_id,
      })

    // Mark session as debriefed
    await supabase
      .from('game_sessions')
      .update({ status: 'completed', debrief_generated: true, updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    return NextResponse.json({
      convergence_reveal: debrief.convergence_reveal,
      questions: debrief.questions,
      timeline_title: debrief.timeline_title,
      topic: session.hole_topic,
    })

  } catch (err) {
    console.error('[generate-debrief] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
