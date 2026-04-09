import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { NORA_VOICE } from '@/lib/nora-knowledge'

const anthropic = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
})

export async function POST(request) {
  try {
    const { question, myAnswer, partnerAnswer, userName, partnerName } = await request.json()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 60,
      system: NORA_VOICE,
      messages: [{
        role: 'user',
        content: `You are Nora, a warm relationship coach. Two partners just answered the same question independently and are seeing each other's answers for the first time. Write ONE sentence — warm, specific, a little playful — reacting to what you notice about their answers. You are speaking directly to ${userName}. Not a summary. A reaction. Speak TO ${userName} — not about them. Under 20 words. Do not start with "I".

Question: ${question}
${userName || 'Partner 1'} said: ${myAnswer}
${partnerName || 'Partner 2'} said: ${partnerAnswer}`
      }]
    })

    return NextResponse.json({ reaction: response.content[0].text.trim() })
  } catch (err) {
    console.error('[SparkReaction] Error:', err)
    return NextResponse.json({ reaction: '' }, { status: 500 })
  }
}
