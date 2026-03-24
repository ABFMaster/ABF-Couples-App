import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { CHALLENGE_PROMPTS } from '@/lib/challenge-prompts'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const anthropic = new Anthropic()

export async function POST(request) {
  try {
    const { userId, coupleId, challengeSessionId, challengeType, roundNumber } = await request.json()

    if (!userId || !coupleId || !challengeSessionId || !challengeType || !roundNumber) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Idempotency — return existing round if already generated
    const { data: existingRound } = await supabase
      .from('challenge_rounds')
      .select('*')
      .eq('session_id', challengeSessionId)
      .eq('round_number', roundNumber)
      .single()

    if (existingRound) {
      return Response.json({ round: existingRound })
    }

    // Get prompts already used this session so we don't repeat
    const { data: usedRounds } = await supabase
      .from('challenge_rounds')
      .select('prompt_key')
      .eq('session_id', challengeSessionId)

    const usedKeys = (usedRounds || []).map(r => r.prompt_key).filter(Boolean)

    const pool = CHALLENGE_PROMPTS[challengeType] || CHALLENGE_PROMPTS.story
    const available = pool.filter(p => !usedKeys.includes(p.key))
    const source = available.length > 0 ? available : pool

    const basePrompt = source[Math.floor(Math.random() * source.length)]

    // Fetch couple context for Nora personalisation
    const { data: coupleData } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .single()

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name, love_language, attachment_style')
      .in('id', [coupleData.user1_id, coupleData.user2_id])

    const { data: noraMemory } = await supabase
      .from('nora_memory')
      .select('memory_summary')
      .eq('couple_id', coupleId)
      .single()

    const profileSummary = profiles
      ? profiles.map(p => p.display_name).join(' and ')
      : 'this couple'

    // For memory type, fetch relevant timeline/spark data
    let memoryContext = ''
    if (challengeType === 'memory') {
      const { data: timelineEvents } = await supabase
        .from('timeline_events')
        .select('title, event_date, event_type')
        .eq('couple_id', coupleId)
        .order('event_date', { ascending: true })
        .limit(20)

      if (timelineEvents && timelineEvents.length > 0) {
        memoryContext = `Their timeline events: ${timelineEvents.map(e => `${e.title} (${e.event_date})`).join(', ')}`
      }
    }

    const systemPrompt = `You are Nora, an AI relationship coach running a couples game called The Challenge. Your job is to take a base challenge prompt and personalise it for a specific couple. Keep it warm, specific, and playful. Never be generic.`

    let userPrompt
    if (challengeType === 'rank') {
      userPrompt = `Personalise this ranking challenge for ${profileSummary}.

Base prompt: "${basePrompt.prompt}"
Items to rank: ${basePrompt.items.join(', ')}

Couple context:
- Memory: ${noraMemory?.memory_summary || 'none yet'}

Write a short personalised intro (1-2 sentences max) that makes this feel specific to them. Then return the items exactly as given.

Respond in this exact JSON format with no other text:
{
  "intro": "your personalised intro here",
  "prompt": "${basePrompt.prompt}",
  "items": ${JSON.stringify(basePrompt.items)}
}`
    } else {
      userPrompt = `Personalise this challenge prompt for ${profileSummary}.

Base prompt: "${basePrompt.prompt}"
Challenge type: ${challengeType}
Round: ${roundNumber}
${memoryContext ? `Context: ${memoryContext}` : ''}
Couple memory: ${noraMemory?.memory_summary || 'none yet'}

Rewrite the prompt so it feels personal and specific to this couple. Keep the core challenge intact. 1-3 sentences max. Warm and direct — Nora is the game master who picked this on purpose.

Respond in this exact JSON format with no other text:
{
  "prompt": "your personalised prompt here"
}`
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    let parsed
    try {
      const raw = response.content[0].text.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(raw)
    } catch {
      parsed = { prompt: basePrompt.prompt }
    }

    const finalPrompt = challengeType === 'rank'
      ? JSON.stringify({ intro: parsed.intro, prompt: parsed.prompt, items: parsed.items || basePrompt.items })
      : parsed.prompt

    // Save round
    const { data: round, error } = await supabase
      .from('challenge_rounds')
      .insert({
        session_id: challengeSessionId,
        couple_id: coupleId,
        round_number: roundNumber,
        prompt: finalPrompt,
        prompt_key: basePrompt.key,
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: 'Failed to save round' }, { status: 500 })
    }

    return Response.json({ round })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
