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

    // Get session
    const { data: session } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    // Already has a hole generated
    if (session.hole_entry) {
      return NextResponse.json({
        topic: session.hole_topic,
        entry: session.hole_entry,
        thread1: session.user1_thread,
        thread2: session.user2_thread,
        convergence: session.convergence,
      })
    }

    // Get couple
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()
    if (!couple) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

    // Get both partners' interests and names
    const [{ data: user1Profile }, { data: user2Profile }] = await Promise.all([
      supabase.from('user_profiles').select('display_name, game_interests').eq('user_id', couple.user1_id).maybeSingle(),
      supabase.from('user_profiles').select('display_name, game_interests').eq('user_id', couple.user2_id).maybeSingle(),
    ])

    const user1Name = user1Profile?.display_name || 'Partner 1'
    const user2Name = user2Profile?.display_name || 'Partner 2'
    const user1Interests = user1Profile?.game_interests
    const user2Interests = user2Profile?.game_interests

    const interestsContext = `
${user1Name}'s interests:
${user1Interests ? JSON.stringify(user1Interests, null, 2) : 'No interests on file yet — use general curiosity topics.'}

${user2Name}'s interests:
${user2Interests ? JSON.stringify(user2Interests, null, 2) : 'No interests on file yet — use general curiosity topics.'}
`.trim()

    const prompt = `You are Nora — a warm, witty, mischievous relationship coach who is also an invisible game master. You are generating a personalized Rabbit Hole experience for a couple.

Here are what you know about them:
${interestsContext}

Your job is to create a rabbit hole that:
1. Starts with a single irresistible entry point — one specific sentence that makes both people go "wait, tell me more"
2. Gives ${user1Name} a specific thread to follow (Thread A)
3. Gives ${user2Name} a different thread to follow (Thread B) — same topic, different angle
4. Has a convergence — a surprising human truth that connects both threads and neither person saw coming

Rules:
- The entry point must be SPECIFIC — not "explore music history" but "In 1971, a 26-year-old nobody submitted a song to a tiny radio station in Ohio. It became the most-played song in American radio history. Go find out why it works."
- Each thread must be a specific TASK — "Find out X" or "Discover what happened when Y" — not open-ended exploration
- The convergence must be a HUMAN TRUTH — something true about people, not just a fact connection
- Draw from their actual interests when possible — history, true crime, sports, tech, humor
- The hole should work for their ${session.timer_minutes || 60}-minute timer
- Be specific, be irresistible, be Nora

Respond ONLY with a JSON object in this exact format, no markdown, no explanation:
{
  "topic": "2-4 word topic name",
  "entry": "The single irresistible entry point sentence Nora delivers to both of them",
  "thread_user1": "The specific task for ${user1Name} — 'Find out...' or 'Discover...'",
  "thread_user2": "The specific task for ${user2Name} — 'Find out...' or 'Discover...'",
  "convergence": "The surprising human truth that connects both threads — 1-2 sentences",
  "nora_send_off": "A short punchy Nora line (1 sentence, her voice) to send them off — witty, warm, a little mischievous"
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].text.trim()
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    let hole
    try {
      hole = JSON.parse(cleaned)
    } catch (err) {
      console.error('[generate-hole] Parse error:', err, raw)
      return NextResponse.json({ error: 'Failed to parse hole' }, { status: 500 })
    }

    // Save to session
    await supabase
      .from('game_sessions')
      .update({
        hole_topic: hole.topic,
        hole_entry: hole.entry,
        user1_thread: hole.thread_user1,
        user2_thread: hole.thread_user2,
        convergence: hole.convergence,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    return NextResponse.json({
      topic: hole.topic,
      entry: hole.entry,
      thread_user1: hole.thread_user1,
      thread_user2: hole.thread_user2,
      convergence: hole.convergence,
      nora_send_off: hole.nora_send_off,
      user1Name,
      user2Name,
    })

  } catch (err) {
    console.error('[generate-hole] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
