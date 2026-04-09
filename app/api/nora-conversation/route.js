import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { NORA_VOICE } from '@/lib/nora-knowledge'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { messages, systemPrompt } = await request.json()

    if (!messages || !systemPrompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: `${NORA_VOICE}\n\n---\n\n${systemPrompt}`,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })

    return NextResponse.json({ content: response.content[0].text.trim() })
  } catch (err) {
    console.error('[NoraConversation] Error:', err)
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
  }
}
