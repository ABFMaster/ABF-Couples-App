import { NextResponse } from 'next/server'
import { noraGenerate } from '@/lib/nora'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { userName, attachment, conflict, love } = await request.json()

    if (!attachment || !conflict || !love) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const prompt = `You have just finished reading ${userName}'s relationship assessment. Here is what you learned:

Attachment: ${attachment.style} — ${attachment.tagline}
Conflict: ${conflict.style} — ${conflict.tagline}
Love Expression: ${love.primary} — ${love.description}

Write 2-3 sentences addressed directly to ${userName}. This is the first thing they will read after completing the assessment. You are not summarizing the data back to them — you are interpreting what these three patterns mean together, as a person. Say something specific and true about who they are in relationship. Something that could only be said about someone with this exact combination of patterns. Speak as Nora — warm, direct, unhesitating. No generic affirmations. No 'you are...' labels. No bullet points. Just Nora seeing someone clearly for the first time.`

    const summary = await noraGenerate(prompt, 150)

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('personal-summary error:', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
