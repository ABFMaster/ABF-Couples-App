import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { noraVerdict } from '@/lib/nora'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { userName, partnerName, sessionId, userId } = await request.json()

    if (!userName || !partnerName || !sessionId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Idempotency — return existing insight if already generated
    const { data: existingSession } = await supabase
      .from('hot_take_sessions')
      .select('nora_insight, questions')
      .eq('session_id', sessionId)
      .maybeSingle()
    if (existingSession?.nora_insight) {
      return NextResponse.json({ insight: existingSession.nora_insight })
    }

    // Fetch all answers from DB
    const { data: dbAnswers } = await supabase
      .from('hot_take_answers')
      .select('question_id, user1_answer, user2_answer, agreed')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (!dbAnswers?.length) {
      return NextResponse.json({ error: 'No answers found' }, { status: 400 })
    }

    // Determine which user is user1
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .maybeSingle()
    const isUser1 = couple?.user1_id === userId

    // Build questions map from session
    const questions = existingSession?.questions || []
    const questionMap = {}
    questions.forEach(q => { questionMap[q.id] = q })

    // Build answer summary
    const allAnswers = dbAnswers.map(a => ({
      questionText: questionMap[a.question_id]?.text || 'Unknown question',
      myAnswer: isUser1 ? a.user1_answer : a.user2_answer,
      partnerAnswer: isUser1 ? a.user2_answer : a.user1_answer,
      agreed: a.agreed,
    }))

    // Find most surprising disagreement server-side
    const disagreements = allAnswers.filter(a => !a.agreed)
    const surprisingOne = disagreements[0] || allAnswers[allAnswers.length - 1]

    if (!surprisingOne) {
      return NextResponse.json({ error: 'No surprising answer found' }, { status: 400 })
    }

    const answerSummary = allAnswers
      .map(a => `"${a.questionText}" — ${userName}: ${a.myAnswer ? 'Agree' : 'Disagree'}, ${partnerName}: ${a.partnerAnswer ? 'Agree' : 'Disagree'}`)
      .join('\n')

    const prompt = `You are Nora — warm, perceptive, occasionally snarky game host for a couples game called Hot Take. A couple just finished 15 agree/disagree questions. Here are all their answers:

${answerSummary}

The one that surprised you most was this disagreement:
Question: "${surprisingOne.questionText}"
${userName}: ${surprisingOne.myAnswer ? 'Agree' : 'Disagree'}
${partnerName}: ${surprisingOne.partnerAnswer ? 'Agree' : 'Disagree'}

Write a 3-4 sentence response that does exactly three things:
1. Explain why this disagreement stood out from the rest of the session — reference the pattern you saw across their answers
2. Say something specific about what each person's answer reveals about them as an individual — not a couple label, something specific to ${userName} and something specific to ${partnerName}
3. End with a nudge — a specific observation or question that makes them want to talk about it right now. Can have a light touch of humor if it fits naturally.

Rules:
- Speak directly to ${userName} who is reading this
- Use ${partnerName}'s name for the partner, never "your partner"
- Never start with an affirmation
- Never be clinical or therapist-y
- Be specific to what they actually answered — no generic relationship advice
- Humor is welcome if it's earned, not forced`

    const response = await noraVerdict(prompt, { route: 'game-room/hot-take/summary-insight', maxTokens: 400, system: 'You watched two people rapid-fire opinions at each other. The disagreements are more interesting than the agreements — find what the pattern reveals about each person individually, not the couple as a label. Never restate the answers. The closing question should feel like something they\'d actually say to each other tonight — not therapy homework.' })
    const insight = response

    await supabase
      .from('hot_take_sessions')
      .update({ nora_insight: insight })
      .eq('session_id', sessionId)

    return NextResponse.json({ insight })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 })
  }
}
