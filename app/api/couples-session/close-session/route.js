export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { noraSignal } from '@/lib/nora'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

// Mirrors app/api/ai-coach/close-session/route.js — titles the session now
// that it's definitively over, and fires the full-session memory synthesis.
// Two differences from the solo version:
//   1. Ownership check is couple-scoped (either partner can close a shared
//      session), not user_id-scoped like solo conversations.
//   2. Fires SIGNAL_TYPES.COUPLES_SESSION with userId: null instead of
//      NORA_CONVERSATION with a specific userId — see lib/nora-memory.js
//      for why: this content isn't private the way solo AI Coach content
//      is, so it must route to couple_notes/both partners' notes, not
//      nora_private_notes.
export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { conversationId, coupleId } = await request.json()
    if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 })

    const { data: convRow } = await supabase
      .from('ai_conversations')
      .select('couple_id, type')
      .eq('id', conversationId)
      .maybeSingle()
    if (!convRow || convRow.type !== 'shared') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const isMember = await verifyCoupleMembership(supabase, user.id, convRow.couple_id)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (coupleId && coupleId !== convRow.couple_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const effectiveCoupleId = convRow.couple_id

    const { data: messages } = await supabase
      .from('ai_messages')
      .select('role, content, sender_id, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (!messages || messages.length < 2) {
      await supabase
        .from('ai_conversations')
        .update({ title: 'A short conversation', updated_at: new Date().toISOString() })
        .eq('id', conversationId)
      return NextResponse.json({ ok: true, title: 'A short conversation' })
    }

    const transcript = messages
      .map(m => `${m.role === 'assistant' ? 'Nora' : 'Partner'}: ${m.content}`)
      .join('\n\n')

    const titlePrompt = `This is a transcript of a couples session — both partners present with Nora at once. Generate a short, specific title for it.

RULES:
- 2-5 words maximum
- Evocative and personally meaningful — the couple should immediately recognize it
- Never a literal summary of sensitive content ("Why I'm scared" not "Discussion about fear of abandonment")
- Opaque to an outsider glancing at a list, but instantly legible to the couple who had it
- No quotes, no punctuation at the end
- Examples of good titles: "The Sunday check-in", "Working through the trip thing", "After the argument", "The timing question"

TRANSCRIPT:
${transcript.slice(0, 3000)}

Return only the title, nothing else.`

    const title = await noraSignal(titlePrompt, {
      route: 'couples-session/close-session/title',
      maxTokens: 20,
    })
    const cleanTitle = title?.trim().replace(/^["']|["']$/g, '') || 'A conversation'

    await supabase
      .from('ai_conversations')
      .update({ title: cleanTitle, updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    updateNoraMemory({
      coupleId: effectiveCoupleId,
      userId: null,
      signalType: SIGNAL_TYPES.COUPLES_SESSION,
      inputData: { messages, sessionClose: true },
    }).catch(() => {})

    return NextResponse.json({ ok: true, title: cleanTitle })
  } catch (err) {
    console.error('[couples-session/close-session] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
