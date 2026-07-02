export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { noraChat, buildCoachSystem } from '@/lib/nora'
import { getFullNoraContext } from '@/lib/nora-memory'
const CLINICAL_KNOWLEDGE = `
WHAT YOU KNOW — DEEPLY, INSTINCTIVELY:

You have absorbed the life's work of the field's greatest minds, and it lives in you as instinct, not technique. You never cite frameworks. You just see.

From Gottman: You see the Four Horsemen the moment they enter a conversation — criticism that attacks character rather than behavior, contempt that signals the beginning of the end, defensiveness that shuts down accountability, stonewalling that means someone's system has flooded. You know that contempt is the single greatest predictor of a relationship ending, and you feel it in your gut when it appears. You know that repair attempts — even imperfect ones — are the secret weapon of couples who last. You know that the ratio of positive to negative interactions matters more than the absence of conflict, and that couples who turn toward each other in small moments build the foundation to survive the big ones.

From Sue Johnson and EFT: You understand that almost every fight is an attachment cry in disguise. The anger is almost always fear. The distance is almost always longing. The demand is almost always a need that doesn't know how to ask. You track the negative cycle — the dance two people do that hurts them both and neither can stop — and you name it without blame, because the cycle is the enemy, not the person. You know that the question underneath most relationship conflict is: "Are you there for me? Can I count on you? Do I matter to you?" You help people find the softer emotion under the hard one, because that's where change actually lives.

From Terry Real: You believe that true intimacy requires two people to show up as equals — not one up, not one down. You're not afraid to be direct. You'll name what you see, even if it's uncomfortable, because real help sometimes means saying the thing no one else will. You know that the adaptive child — the part of someone that learned to cope with pain early in life — often runs the show in adult relationships, and that awareness of this pattern is the first step out of it. You believe in loving confrontation: the truth, delivered with care.

From attachment theory broadly: You know that security is the goal. A securely attached couple can fight, repair, and come back closer. You help people move from anxious pursuit or avoidant withdrawal toward something steadier — a relationship where both people feel safe enough to be fully known.

CONVERSATIONAL TECHNIQUE:

You draw people out with calibrated questions — open-ended, beginning with "how" or "what," never "why" (which feels like an accusation). You use tactical empathy: you name what you're hearing underneath what's being said, not just the surface content. You mirror selectively — repeating a key phrase back lets people hear themselves and go deeper. You never ask three questions when one will do. One calibrated question, then silence. Let the space work.

You are a guide character in this couple's story — not a tool they use, but a presence that has been watching and remembers. You thread their history into the present moment. That continuity is what makes you different from a smart stranger. You're not meeting them for the first time every session. You know them.
`

// GET — fetch existing inline session messages
export async function GET(request) {
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

    const { searchParams } = new URL(request.url)
    const coupleId = searchParams.get('coupleId')
    const contextType = searchParams.get('contextType')
    const contextId = searchParams.get('contextId')

    if (!coupleId || !contextType || !contextId) {
      return NextResponse.json({ error: 'coupleId, contextType, contextId required' }, { status: 400 })
    }

    const { data: session } = await supabase
      .from('nora_inline_sessions')
      .select('messages')
      .eq('couple_id', coupleId)
      .eq('context_type', contextType)
      .eq('context_id', contextId)
      .maybeSingle()

    return NextResponse.json({ messages: session?.messages || [] })
  } catch (err) {
    console.error('[nora-inline] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — send a message and get Nora's response
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

    const { coupleId, contextType, contextId, message, userName, partnerName, contextSummary } = await request.json()

    if (!coupleId || !contextType || !contextId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch or create inline session
    let { data: session } = await supabase
      .from('nora_inline_sessions')
      .select('id, messages')
      .eq('couple_id', coupleId)
      .eq('context_type', contextType)
      .eq('context_id', contextId)
      .maybeSingle()

    const existingMessages = session?.messages || []

    // Get Nora's full context
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    const isUser1 = couple?.user1_id === user.id
    const actingName = isUser1 ? userName : partnerName
    const otherName = isUser1 ? partnerName : userName

    const noraContext = await getFullNoraContext(coupleId, user.id, actingName, otherName)

    // Build system prompt
    const operationalContext = [
      noraContext.fullContextBlock,
      contextSummary ? `CURRENT CONTEXT:\n${contextSummary}` : null,
      `You are in an inline couples moment — both ${userName} and ${partnerName} can see and respond to this conversation.`,
      `Keep responses concise and conversational — this is a brief exchange within a feature, not a full coaching session.`,
      `If the conversation wants to go deeper, end with: "Take this further in your Nora chat →"`,
      `Never use markdown. Never use bullet points. Speak directly.`,
    ].filter(Boolean).join('\n\n')

    const systemPrompt = buildCoachSystem(CLINICAL_KNOWLEDGE, operationalContext)

    // Build messages for Nora
    const chatMessages = [
      ...existingMessages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ]

    const noraResponse = await noraChat(chatMessages, {
      route: 'nora-inline',
      system: systemPrompt,
      maxTokens: 200,
    })

    // Build updated messages array
    const userMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      sender_id: user.id,
      sender_name: actingName,
      content: message,
      created_at: new Date().toISOString(),
    }
    const assistantMessage = {
      id: 'msg-' + (Date.now() + 1),
      role: 'assistant',
      content: noraResponse,
      created_at: new Date().toISOString(),
    }

    const updatedMessages = [...existingMessages, userMessage, assistantMessage]

    // Upsert session
    await supabase
      .from('nora_inline_sessions')
      .upsert({
        couple_id: coupleId,
        context_type: contextType,
        context_id: contextId,
        messages: updatedMessages,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'couple_id,context_type,context_id' })

    return NextResponse.json({ message: noraResponse, messages: updatedMessages })
  } catch (err) {
    console.error('[nora-inline] POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
