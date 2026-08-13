export const dynamic = 'force-dynamic'

import { noraReact } from '@/lib/nora'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return Response.json(authError.body, { status: authError.status })

    const { sessionId, coupleId, roundNumber, currentThread, finds } = await request.json()
    if (!sessionId || !coupleId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

    // verifyCoupleMembership above only proves the CALLER belongs to
    // coupleId — it says nothing about whether the client-supplied
    // sessionId actually belongs to that couple. Without this check, a
    // member of couple A could supply couple B's sessionId and have
    // couple B's private hole_topic/hole_entry read back to them inside
    // the generated nudge text.
    const { data: session } = await supabase
      .from('game_sessions')
      .select('hole_topic, hole_entry, couple_id')
      .eq('id', sessionId)
      .single()
    if (!session || session.couple_id !== coupleId) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    // ROOT CAUSE FIX Aug 12 2026 — Game Room audit: this always returned
    // zero rows and silently fell back to "you two" for every nudge.
    // user_profiles has no couple_id column (only user_id) — the correct
    // path is couples.user1_id/user2_id -> user_profiles.user_id, same
    // pattern used elsewhere (e.g. game-room/call/generate/route.js).
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    const { data: profiles } = couple
      ? await supabase
          .from('user_profiles')
          .select('display_name')
          .in('user_id', [couple.user1_id, couple.user2_id])
      : { data: null }

    const names = profiles?.map(p => p.display_name).filter(Boolean).join(' and ') || 'you two'

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
