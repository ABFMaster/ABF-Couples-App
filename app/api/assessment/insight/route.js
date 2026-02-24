import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
})

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

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    return NextResponse.json({ insight: message.content[0].text })
  } catch (error) {
    console.error('Assessment insight error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
