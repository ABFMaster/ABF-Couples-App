export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { noraReact, noraSignal } from '@/lib/nora'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { conversationId, coupleId } = await request.json()
    if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 })

    // Fetch all messages from the closing session
    const { data: messages } = await supabase
      .from('ai_messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (!messages || messages.length < 2) {
      // Not enough content to title — skip synthesis, just mark with placeholder
      await supabase
        .from('ai_conversations')
        .update({ title: 'A short conversation', updated_at: new Date().toISOString() })
        .eq('id', conversationId)
      return NextResponse.json({ ok: true, title: 'A short conversation' })
    }

    // Build transcript for synthesis
    const transcript = messages
      .map(m => `${m.role === 'assistant' ? 'Nora' : 'You'}: ${m.content}`)
      .join('\n\n')

    // Generate title — evocative and personally legible, never a literal summary of sensitive content
    const titlePrompt = `This is a conversation transcript. Generate a short, specific title for it.

RULES:
- 2-5 words maximum
- Evocative and personally meaningful — the person who had this conversation should immediately recognize it
- Never a literal summary of sensitive content ("Why I'm scared" not "Discussion about fear of abandonment")
- Opaque to an outsider glancing at a list, but instantly legible to the person who lived it
- No quotes, no punctuation at the end
- Examples of good titles: "The dog moment", "After the argument", "What I didn't say", "The timing question"

TRANSCRIPT:
${transcript.slice(0, 3000)}

Return only the title, nothing else.`

    const title = await noraSignal(titlePrompt, {
      route: 'ai-coach/close-session/title',
      maxTokens: 20,
    })

    const cleanTitle = title?.trim().replace(/^["']|["']$/g, '') || 'A conversation'

    // Update the conversation with the generated title
    await supabase
      .from('ai_conversations')
      .update({ title: cleanTitle, updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    // Fire memory synthesis for the full session
    if (coupleId) {
      updateNoraMemory({
        coupleId,
        userId: user.id,
        signalType: SIGNAL_TYPES.NORA_CONVERSATION,
        inputData: { messages, sessionClose: true },
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true, title: cleanTitle })
  } catch (err) {
    console.error('[close-session] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
