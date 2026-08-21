export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { noraChat } from '@/lib/nora'
import { requireUser } from '@/lib/api-auth'

// No coupleId/resource to scope by here — this is a pure LLM passthrough, not
// classic BOLA. The gap closed by requireUser is unauthenticated cost/abuse:
// without it, anyone could hit this route and spend the app's LLM budget.
export async function POST(request) {
  try {
    const { error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

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

    return NextResponse.json({ content: response })
  } catch (err) {
    console.error('[NoraConversation] Error:', err)
    // Aug 21 2026 — root cause of the "turn 2 always failed" bug (fixed
    // separately in NoraConversation.js) was the client sending an
    // assistant-first message array, which Anthropic rejects. Temporarily
    // added a client-visible _debug field here to confirm that live, since
    // this route has no Vercel log or nora_calls DB access from this
    // session — removed again now that it's confirmed. Remaining 500s here
    // are genuine transient failures (network blips, occasional upstream
    // errors), already surfaced gracefully client-side via the isError
    // retry flow in NoraConversation.js.
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
  }
}
