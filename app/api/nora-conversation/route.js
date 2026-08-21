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
    // TEMP DIAGNOSTIC Aug 21 2026 — live turn-2-and-on failure in Game Room
    // onboarding, reproduces deterministically on fresh conversations with
    // varied content, so not content- or history-specific. No Vercel log
    // access from this session and nora_calls isn't queryable here either,
    // so this is the only way to see the real underlying error instead of
    // the generic message. Revert once root cause is confirmed.
    return NextResponse.json({ error: 'Failed to get response', _debug: { message: err?.message, status: err?.status, name: err?.name } }, { status: 500 })
  }
}
