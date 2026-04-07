import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const {
      sessionId,
      roundNumber,
      answerType,
      currentAnswer,
      originalAnswer,
      dimensionKey,
      userId,
      coupleId,
    } = await request.json()

    if (!sessionId || !roundNumber || !answerType || !currentAnswer || !userId || !coupleId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Determine source and delta
    let source
    let deltaFlagged = false

    if (answerType === 'type_b') {
      source = 'memory_type_b'
    } else if (answerType === 'type_a_confirmed') {
      source = 'memory_type_a_confirmed'
    } else if (answerType === 'type_a_updated') {
      source = 'memory_type_a_updated'
      deltaFlagged = true
    } else {
      return Response.json({ error: 'Invalid answerType' }, { status: 400 })
    }

    // Write to love_map_updates for all types except confirmed-unchanged
    // Confirmed still gets written so Nora knows the map was validated
    await supabase
      .from('love_map_updates')
      .insert({
        couple_id: coupleId,
        user_id: userId,
        dimension_key: dimensionKey || 'unknown',
        original_answer: originalAnswer || null,
        current_answer: currentAnswer,
        source,
        delta_flagged: deltaFlagged,
      })

    // Update challenge_rounds — write answer and mark ready
    const { error } = await supabase
      .from('challenge_rounds')
      .update({
        memory_answer: currentAnswer,
        answer_holder_ready: true,
      })
      .eq('session_id', sessionId)
      .eq('round_number', roundNumber)

    if (error) {
      return Response.json({ error: 'Failed to mark ready' }, { status: 500 })
    }

    return Response.json({ ok: true, deltaFlagged })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
