import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
})

export async function POST(request) {
  try {
    const { partnerName, partnerLoveLanguage, userName } = await request.json()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 60,
      system: 'You are Nora, a relationship coach. Generate a single warm, flirty message from one partner to another. It should feel personal, playful, and loving — never cheesy or generic. Under 20 words. No quotes around it. Just the message.',
      messages: [{
        role: 'user',
        content: `Write a flirt from ${userName} to ${partnerName}. Their love language is ${partnerLoveLanguage}. Make it feel tailored to that.`,
      }],
    })

    return NextResponse.json({ flirt: response.content[0].text.trim() })
  } catch (err) {
    console.error('[FlirtGenerate] Error:', err)
    return NextResponse.json({ flirt: '' }, { status: 500 })
  }
}
