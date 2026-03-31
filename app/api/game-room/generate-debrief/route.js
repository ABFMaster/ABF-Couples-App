import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'

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
    if (session.debrief_generated && session.convergence) {
      return NextResponse.json({
        convergence_reveal: session.convergence,
        factual_close: session.factual_close,
        questions: session.debrief_questions || [],
      })
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

Your job is to write two distinct things:

1. FACTUAL CLOSE — What actually happened with this topic. Concrete, satisfying, specific. 2-3 sentences that answer "so what actually happened?" Reference the topic and entry point directly. This is about the subject matter, not about them.

2. HUMAN TRUTH — The surprising insight that connects what they both found to who they are as a couple. This is the holy moment. Reference their actual finds specifically. Warm, mischievous, illuminating. 2-3 sentences. This is about them, not the topic.

3. THREE DEBRIEF QUESTIONS — Real Nora questions that open something new based on what they found. Not survey questions — the best part of the dinner party conversation.

Rules:
- Factual close and human truth must be clearly different — one is about the topic, one is about them as a couple
- Never restate the question or entry point verbatim
- Be specific to what they actually found
- Never be clinical or therapist-y

Respond ONLY with valid JSON, no markdown fences:
{
  "factual_close": "What actually happened — concrete and specific to the topic",
  "convergence_reveal": "The human truth — what this reveals about them as a couple",
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

    // Mark session as debriefed and save debrief content
    await supabase
      .from('game_sessions')
      .update({
        factual_close: debrief.factual_close,
        convergence: debrief.convergence_reveal,
        debrief_questions: debrief.questions,
        debrief_generated: true,
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    updateNoraMemory({
      coupleId,
      signalType: SIGNAL_TYPES.GAME_ROOM_DEBRIEF,
      inputData: {
        topic: session.hole_topic,
        convergence_reveal: debrief.convergence_reveal,
        questions: debrief.questions,
      },
    }).catch(() => {})

    return NextResponse.json({
      convergence_reveal: debrief.convergence_reveal,
      factual_close: debrief.factual_close,
      questions: debrief.questions,
      timeline_title: debrief.timeline_title,
      topic: session.hole_topic,
    })

  } catch (err) {
    console.error('[generate-debrief] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
