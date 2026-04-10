import { createClient } from '@supabase/supabase-js'
import { noraReact } from '@/lib/nora'
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

    const systemPrompt = `You are running a couples investigation game called Rabbit Hole. Send one short, well-timed nudge that pulls the couple one level deeper without interrupting their flow. Never send multiple messages. One breadcrumb only.`

    const response = await noraReact(`Topic: ${session?.hole_topic || 'unknown'}
Entry point: ${session?.hole_entry || 'unknown'}
Current thread: ${currentThread || 'not provided'}
What they've found so far:
${findsText}

Give them one provocation to go deeper.`, {
      route: 'game-room/nora-nudge',
      system: systemPrompt,
      context: 'game_room',
      maxTokens: 120,
    })

    const nudge = response
    return Response.json({ nudge })

  } catch (err) {
    return Response.json({ error: 'Failed to generate nudge' }, { status: 500 })
  }
}
