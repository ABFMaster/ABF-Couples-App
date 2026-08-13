export const dynamic = 'force-dynamic'

import { noraVerdict } from '@/lib/nora'
import { updateNoraMemory, SIGNAL_TYPES, getNoraMemory, getMemoryBriefing } from '@/lib/nora-memory'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

// Session-level Memory Test verdict — mirrors game-room/call/verdict/route.js.
// Added Aug 12 2026, Game Room audit's top finding: Memory Test ended on a
// generic static card with no recap of the 3 rounds, unlike The Call which
// aggregates all 5 rounds into one closing verdict. Each round already
// carries a hit/close/miss `result` (see memory/verdict/route.js, same
// sprint) — this route aggregates those into one session-level reflection
// plus a score, and app/game-room/challenge/play/page.js's complete screen
// (next commit) renders the full recap from it.
export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return Response.json(authError.body, { status: authError.status })

    const { challengeSessionId } = await request.json()
    if (!challengeSessionId) {
      return Response.json({ error: 'challengeSessionId required' }, { status: 400 })
    }

    // Idempotency — return existing verdict if already generated. couple_id
    // comes from the session row itself, never trusted from the client.
    const { data: session } = await supabase
      .from('challenge_sessions')
      .select('couple_id, nora_verdict, total_rounds, challenge_type')
      .eq('id', challengeSessionId)
      .maybeSingle()
    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })

    const isMember = await verifyCoupleMembership(supabase, user.id, session.couple_id)
    if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

    const coupleId = session.couple_id

    if (session.nora_verdict) {
      return Response.json({ verdict: session.nora_verdict })
    }

    const { data: rounds } = await supabase
      .from('challenge_rounds')
      .select('round_number, memory_question, memory_answer, guesser_answer, guesser_user_id, result, nora_verdict')
      .eq('session_id', challengeSessionId)
      .order('round_number', { ascending: true })

    if (!rounds?.length) {
      return Response.json({ error: 'No rounds found for this session' }, { status: 404 })
    }

    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, display_name')
      .in('user_id', [couple.user1_id, couple.user2_id])
    const nameOf = (userId) => profiles?.find(p => p.user_id === userId)?.display_name || 'them'

    const hits = rounds.filter(r => r.result === 'hit').length
    const closes = rounds.filter(r => r.result === 'close').length
    const misses = rounds.filter(r => r.result === 'miss').length
    const scored = hits + closes + misses

    const noraMemory = await getNoraMemory(coupleId)
    const noraBriefing = noraMemory ? getMemoryBriefing(noraMemory, nameOf(couple.user1_id), nameOf(couple.user2_id)) : null

    const roundsSummary = rounds.map(r => {
      const guesserName = nameOf(r.guesser_user_id)
      const label = r.result ? r.result.toUpperCase() : 'unscored'
      return `Round ${r.round_number}: "${r.memory_question}" — actual answer: "${r.memory_answer}" — ${guesserName} guessed: "${r.guesser_answer || '(no answer)'}" — ${label}`
    }).join('\n')

    const systemPrompt = `You are Nora — sharp, warm game master closing out a Love Map memory game. You just watched a couple test how well they actually know each other's inner worlds across ${scored || rounds.length} rounds. Write a closing reflection — 2-3 sentences. Reference what actually happened across the rounds, not a generic wrap-up. Find the most revealing thread across all of them — not just tallying hits and misses, but what the pattern of what landed and what didn't says about these two right now. Sharp, warm, a little mischievous. End on something that makes them look at each other. Never recap every round individually. Never say "in conclusion" or "overall." Land it and stop.`

    const userPrompt = `Score: ${hits} hit${hits === 1 ? '' : 's'}, ${closes} close, ${misses} miss${misses === 1 ? '' : 'es'} out of ${scored || rounds.length} rounds.

All rounds:
${roundsSummary}
${noraBriefing ? `\nWhat Nora knows about this couple:\n${noraBriefing}` : ''}`

    const response = await noraVerdict(userPrompt, {
      route: 'game-room/challenge/memory/session-verdict',
      system: systemPrompt,
      maxTokens: 400,
    })

    const verdict = response

    // Persist the session verdict. Needs the migration in
    // docs/database/memory_test_session_verdict.sql (challenge_sessions.
    // nora_verdict) — if it hasn't run yet, this update fails and the
    // verdict simply isn't cached for idempotency (every reload of the
    // complete screen would regenerate it), but the recap for THIS load
    // still works since the verdict text is returned either way.
    await supabase
      .from('challenge_sessions')
      .update({ nora_verdict: verdict })
      .eq('id', challengeSessionId)

    updateNoraMemory({ coupleId, userId: user.id, signalType: SIGNAL_TYPES.GAME_ROOM_DEBRIEF, inputData: { gameType: 'love_map_memory_session', hits, closes, misses, totalRounds: scored || rounds.length, verdict } }).catch(() => {})

    return Response.json({ verdict, hits, closes, misses, totalRounds: scored || rounds.length })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
