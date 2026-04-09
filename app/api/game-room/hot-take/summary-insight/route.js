import { NextResponse } from 'next/server'
import { noraVerdict } from '@/lib/nora'

export async function POST(request) {
  try {
    const { surprisingQuestion, myAnswer, partnerAnswer, userName, partnerName, allAnswers } = await request.json()

    if (!surprisingQuestion || !userName || !partnerName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const answerSummary = allAnswers?.length
      ? allAnswers.map(a => `"${a.question.text}" — ${userName}: ${a.myAnswer ? 'Agree' : 'Disagree'}, ${partnerName}: ${a.partnerAnswer ? 'Agree' : 'Disagree'}`).join('\n')
      : 'No answer history available.'

    const prompt = `You are Nora — warm, perceptive, occasionally snarky game host for a couples game called Hot Take. A couple just finished 15 agree/disagree questions. Here are all their answers:

${answerSummary}

The one that surprised you most was this disagreement:
Question: "${surprisingQuestion}"
${userName}: ${myAnswer ? 'Agree' : 'Disagree'}
${partnerName}: ${partnerAnswer ? 'Agree' : 'Disagree'}

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

    const response = await noraVerdict(prompt, { route: 'game-room/hot-take/summary-insight', maxTokens: 400 })

    const insight = response
    return NextResponse.json({ insight })

  } catch (err) {
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 })
  }
}
