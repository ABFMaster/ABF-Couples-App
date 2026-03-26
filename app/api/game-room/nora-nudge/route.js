import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic()
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { sessionId, coupleId, roundNumber, currentThread, finds } = await request.json()
    if (!sessionId || !coupleId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: session } = await supabase
      .from('game_sessions')
      .select('hole_topic, hole_entry')
      .eq('id', sessionId)
      .single()

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('couple_id', coupleId)

    const names = profiles?.map(p => p.display_name).join(' and ') || 'you two'

    const findsText = finds?.length
      ? finds.map(f => `• ${f.find_text}`).join('\n')
      : 'Nothing logged yet.'

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 120,
      system: `You are Nora — a warm, direct relationship coach running a couples investigation game called Rabbit Hole.
The couple has been exploring a topic together and their timer just expired. They can keep going if they want.
Your job: give them one short, electric provocation that makes them want to go one more round.
Not a summary. Not encouragement. A question or observation that opens something they haven't touched yet.
1-2 sentences maximum. Direct. Specific to what they've found. Make it irresistible.`,
      messages: [{
        role: 'user',
        content: `Topic: ${session?.hole_topic || 'unknown'}
Entry point: ${session?.hole_entry || 'unknown'}
Current thread: ${currentThread || 'not provided'}
What they've found so far:
${findsText}

Give them one provocation to go deeper.`
      }]
    })

    const nudge = response.content[0].text.trim()
    return Response.json({ nudge })

  } catch (err) {
    return Response.json({ error: 'Failed to generate nudge' }, { status: 500 })
  }
}
