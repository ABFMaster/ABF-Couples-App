import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const anthropic = new Anthropic()

export async function POST(request) {
  try {
    const { userId, coupleId, challengeSessionId, roundId, challengeType, prompt, coupleResponse } = await request.json()

    if (!userId || !coupleId || !challengeSessionId || !roundId || !challengeType || !prompt || !coupleResponse) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch couple names for Nora
    const { data: coupleData } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .single()

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .in('user_id', [coupleData.user1_id, coupleData.user2_id])

    const names = profiles ? profiles.map(p => p.display_name).join(' and ') : 'this couple'

    let storyText = coupleResponse || ''
    if (challengeType === 'story') {
      const { data: roundData } = await supabase
        .from('challenge_rounds')
        .select('sentences')
        .eq('id', roundId)
        .maybeSingle()
      if (roundData?.sentences?.length > 0) {
        storyText = roundData.sentences.map((s, i) => `${i + 1}. ${s.text}`).join('\n')
      }
    }

    const { data: noraMemory } = await supabase
      .from('nora_memory')
      .select('memory_summary')
      .eq('couple_id', coupleId)
      .single()

    // Build Nora verdict prompt based on challenge type
    let verdictPrompt
    if (challengeType === 'rank') {
      let rankData
      try {
        rankData = JSON.parse(prompt)
      } catch {
        rankData = { prompt, items: [] }
      }
      verdictPrompt = `You are Nora, an AI relationship coach. ${names} just completed a ranking challenge together — this is ONE shared ranking they produced as a couple, not two separate rankings.

The challenge: "${rankData.prompt}"
Their joint ranking (1 = top, last = bottom): ${coupleResponse}
Couple memory: ${noraMemory?.memory_summary || 'none yet'}

Give a verdict that:
- Treats this as a single joint decision they made together
- Calls out their most interesting or revealing ranking choice — why did that one land where it did?
- Finds what their ranking says about them as a couple that they probably didn't realise
- Is warm, specific, and a little mischievous
- Is 2-4 sentences max

Do not restate the full ranking. Do not compare two separate rankings — there is only one. Get straight to the insight.`

    } else if (challengeType === 'story') {
      verdictPrompt = `You are Nora — sharp, warm, occasionally snarky game show host. ${names} just wrote a story together, alternating sentences.

The prompt they were given: "${prompt}"
Their story:
${storyText}
Couple memory: ${noraMemory?.memory_summary || 'none yet'}

Give a verdict that:
- Leads with what was funny, surprising, or absurd in the story — react to what actually happened
- If there's something genuinely revealing about their dynamic underneath the absurdity, land it in one sharp sentence at the end
- Reads like a game show host who also happens to be perceptive — not a therapist who happens to be amused
- Is 2-3 sentences max

Do not summarise the story. Do not be reverent about it. React to it like you were in the room watching them write it.`

    } else if (challengeType === 'pitch') {
      const { data: pitchRound } = await supabase
        .from('challenge_rounds')
        .select('nora_challenge, couple_response')
        .eq('id', roundId)
        .maybeSingle()

      verdictPrompt = `You are Nora — a hostile, sharp, witty investor. ${names} pitched you something, you challenged them, and they defended it.

The pitch challenge: "${prompt}"
Their original pitch: "${pitchRound?.couple_response || coupleResponse}"
Your challenge question: "${pitchRound?.nora_challenge || 'N/A'}"
Their defense: "${coupleResponse}"
Couple memory: ${noraMemory?.memory_summary || 'none yet'}

Give a final verdict:
- Rule on whether you invest — yes, no, or conditionally. Be decisive.
- Reference something specific from their defense — did they convince you or not?
- Find what the pitch AND the defense together reveal about their dynamic as a couple
- End with one sharp line that makes them feel the weight of the decision
- 2-4 sentences max. Be opinionated. Nora is not a pushover.`

    } else if (challengeType === 'memory') {
      verdictPrompt = `You are Nora, an AI relationship coach. ${names} just completed a memory challenge.

The question: "${prompt}"
Their answer: "${coupleResponse}"
Couple memory: ${noraMemory?.memory_summary || 'none yet'}

Give a verdict that:
- Responds to what they remembered (or forgot)
- Finds something warm or revealing in how they answered
- Gently notes any gaps or surprises without being cruel
- Is tender and specific, 2-4 sentences max`

    } else if (challengeType === 'plan') {
      verdictPrompt = `You are Nora, an AI relationship coach. ${names} just planned something together.

The planning challenge: "${prompt}"
Their plan: "${coupleResponse}"
Couple memory: ${noraMemory?.memory_summary || 'none yet'}

Give a verdict that:
- Responds to the specific plan they made
- Finds what their choices reveal about what they value as a couple
- Ends with one sentence that makes them want to actually do it
- Is warm, grounded, and 2-4 sentences max`
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: 'You are Nora, a warm, witty, and perceptive AI relationship coach. You find what neither person said out loud. You never restate what was just told to you. You get straight to the insight.',
      messages: [{ role: 'user', content: verdictPrompt }],
    })

    const noraVerdict = response.content[0].text.trim()

    // Save response and verdict to round
    const { data: round, error } = await supabase
      .from('challenge_rounds')
      .update({
        couple_response: coupleResponse,
        nora_verdict: noraVerdict,
        completed_at: new Date().toISOString(),
      })
      .eq('id', roundId)
      .select()
      .single()

    if (error) {
      return Response.json({ error: 'Failed to save round' }, { status: 500 })
    }

    return Response.json({ round, noraVerdict })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
