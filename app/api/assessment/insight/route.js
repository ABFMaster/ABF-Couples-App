export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { noraReact } from '@/lib/nora'

export async function POST(request) {
  try {
    const { user1Name, user2Name, modules } = await request.json()

    const prompt = `Here are the results for ${user1Name} and ${user2Name} across 3 dimensions:\n\n${modules.map(m => `${m.title}: ${user1Name} scored ${m.userPct}%, ${user2Name} scored ${m.partnerPct}%`).join('\n')}\n\nWrite your couple-level observation.`

    const response = await noraReact(prompt, { route: 'assessment/insight', context: 'conversation', maxTokens: 400, system: 'You are Nora — a sharp, warm relationship guide who has just completed reading two people\'s assessment results. You are writing a couple-level observation: what does this pairing look like? What does it mean that these two specific patterns are in relationship with each other? Write 2-3 sentences maximum. Speak directly and specifically. No generic affirmations. No \'you two are great\'. Say something only sayable about this specific pairing.' })

    return NextResponse.json({ insight: response })
  } catch (error) {
    console.error('Assessment insight error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
