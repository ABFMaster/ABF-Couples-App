import { NextResponse } from 'next/server'
import { noraReact } from '@/lib/nora'

export async function POST(request) {
  try {
    const { question, myAnswer, partnerAnswer, userName, partnerName } = await request.json()

    const response = await noraReact(`You are Nora, a warm relationship coach. Two partners just answered the same question independently and are seeing each other's answers for the first time. Write ONE sentence — warm, specific, a little playful — reacting to what you notice about their answers. You are speaking directly to ${userName}. Not a summary. A reaction. Speak TO ${userName} — not about them. Under 20 words. Do not start with "I".

Question: ${question}
${userName || 'Partner 1'} said: ${myAnswer}
${partnerName || 'Partner 2'} said: ${partnerAnswer}`, { route: 'spark-reaction', context: 'daily', maxTokens: 300 })

    return NextResponse.json({ reaction: response.content[0].text.trim() })
  } catch (err) {
    console.error('[SparkReaction] Error:', err)
    return NextResponse.json({ reaction: '' }, { status: 500 })
  }
}
