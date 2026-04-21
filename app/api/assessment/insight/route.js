import { NextResponse } from 'next/server'
import { noraReact } from '@/lib/nora'

export async function POST(request) {
  try {
    const { user1Name, user2Name, modules } = await request.json()

    const modulesSummary = modules.map(m =>
      `${m.title}: ${user1Name} ${m.userPct}%, ${user2Name} ${m.partnerPct}%`
    ).join('\n')

    const prompt = `You are a warm relationship coach analyzing a couple's assessment results.

${user1Name} and ${user2Name} completed a relationship assessment across 5 dimensions:
${modulesSummary}

Write 3 sentences maximum:
1. One sentence about their strongest shared dimension
2. One sentence about where they differ most and why that's an opportunity
3. One warm closing sentence about what their results suggest about their relationship

Be specific, warm, and use their names once each. Do not be generic.
Do not start with "I" or "Based on".`

    const response = await noraReact(prompt, { route: 'assessment/insight', context: 'conversation', maxTokens: 400, system: 'You\'ve just read everything this person chose to share about themselves and their relationship at the very beginning. This is your first impression — say the one thing you noticed that they probably didn\'t expect you to notice. Warm but not soft. Specific to what they actually said. Never generic onboarding copy. This is the moment they decide if they trust you.' })

    return NextResponse.json({ insight: response })
  } catch (error) {
    console.error('Assessment insight error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
