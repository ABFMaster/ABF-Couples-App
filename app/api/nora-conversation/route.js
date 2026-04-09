import { NextResponse } from 'next/server'
import { noraChat } from '@/lib/nora'

export async function POST(request) {
  try {
    const { messages, systemPrompt } = await request.json()

    if (!messages || !systemPrompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const response = await noraChat(messages.map(m => ({ role: m.role, content: m.content })), {
      route: 'nora-conversation',
      system: systemPrompt,
      context: 'conversation',
      maxTokens: 1000,
    })

    return NextResponse.json({ content: response.content[0].text.trim() })
  } catch (err) {
    console.error('[NoraConversation] Error:', err)
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
  }
}
