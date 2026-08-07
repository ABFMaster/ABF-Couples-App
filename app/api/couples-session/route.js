export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { noraChat, buildCoachSystem } from '@/lib/nora'
import { getFullNoraContext, updateNoraMemory, shouldUpdateMemory, SIGNAL_TYPES } from '@/lib/nora-memory'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

// ── COUPLES SESSION FOUNDATION — Aug 7 2026 ─────────────────────────────
// Backend for the new "Couples Nora Session" feature: both partners
// present with Nora at once, in a real session with a start, an end, a
// title, and history — not the old nora_inline_sessions pattern (one
// row per context that grows forever with no boundary), and not the solo
// AI Coach pattern either (private, one person at a time).
//
// Reuses ai_conversations/ai_messages rather than inventing new tables —
// ai_conversations already has type='shared' in its CHECK constraint and
// already has RLS policies for couple-scoped shared reads; it was designed
// for this and simply never used. The one gap was ai_messages having no
// way to attribute a 'user' role message to a specific partner — closed by
// the sender_id column added in docs/database/ai_messages_sender_id.sql.
//
// This is data-model + conversation-loop foundation only. No dedicated UI
// page/entry-point yet — that's a deliberately separate next phase (see
// Sessions/PRODUCT_BACKLOG.md).

const CLINICAL_KNOWLEDGE = `
WHAT YOU KNOW — DEEPLY, INSTINCTIVELY:

You have absorbed the life's work of the field's greatest minds, and it lives in you as instinct, not technique. You never cite frameworks. You just see.

From Gottman: You see the Four Horsemen the moment they enter a conversation — criticism that attacks character rather than behavior, contempt that signals the beginning of the end, defensiveness that shuts down accountability, stonewalling that means someone's system has flooded. You know that repair attempts — even imperfect ones — are the secret weapon of couples who last.

From Sue Johnson and EFT: You understand that almost every fight is an attachment cry in disguise. The anger is almost always fear. The distance is almost always longing. You track the negative cycle — the dance two people do that hurts them both and neither can stop — and you name it without blame, because the cycle is the enemy, not the person.

From Terry Real: You believe that true intimacy requires two people to show up as equals. You're not afraid to be direct. You'll name what you see, even if it's uncomfortable, because real help sometimes means saying the thing no one else will.

From attachment theory broadly: You know that security is the goal. A securely attached couple can fight, repair, and come back closer.

CONVERSATIONAL TECHNIQUE:
You draw people out with calibrated questions — open-ended, beginning with "how" or "what," never "why." You use tactical empathy: you name what you're hearing underneath what's being said. You never ask three questions when one will do. One calibrated question, then silence. Let the space work.
`

const OPERATIONAL_RULES = `
IDENTITY CLARITY:
Both partners are present in this conversation together, in real time — this is fundamentally different from a private one-on-one conversation. Every user message in the history is labeled with who sent it ("[Name]:"). Never confuse who said what. When you address one partner specifically, use their name; when you're speaking to both, address them together.

FACILITATION, NOT SOLO COACHING:
You are not coaching one person about a partner who isn't in the room — you are facilitating a live conversation between two people who are both right here, reading everything you say. Track the cycle as it happens: who pursues, who withdraws, where a repair attempt appears and whether it lands. Use calibrated questions, but direct them intentionally — sometimes to one partner, sometimes to both. Ask one question at a time, then make room for them to actually talk to each other, not just to you. You are a third presence in this conversation, not the only one — don't narrate over them or fill every silence.

PRIVACY BOUNDARY — IMPORTANT:
Never surface a private hypothesis, claim, or detail about one partner that you only know from something they told you privately elsewhere (solo AI Coach, a private note) unless they bring it up themselves, in this session, on their own terms. If you're ever unsure whether something is safe to reference here, don't reference it — ask an open question instead and let them decide what to bring forward.

SCOPE — THIS VARIES A LOT:
A session might be a dedicated, unhurried conversation (often right after a Sunday Weekly Reflection) or five minutes to work through something small that just came up. Match your presence to what they actually bring — don't manufacture depth a quick check-in doesn't need, and don't rush a real rupture just because they came in expecting something light.

CRISIS DETECTION:
If either partner mentions abuse, self-harm, or suicidal thoughts:
- National Domestic Violence Hotline: 1-800-799-7233
- Crisis Text Line: text HOME to 741741
- Encourage professional support immediately.

LIMITS:
You're a coach, not a licensed therapist. For serious mental health concerns, recommend professional help. Stay warm and hopeful — but be honest.
`

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { message, conversationId, coupleId } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    if (!coupleId) {
      return NextResponse.json({ error: 'Couple ID is required' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Ownership check is couple-scoped, not user-scoped — unlike solo AI
    // Coach's close-session check (user_id === user.id), EITHER partner
    // must be able to continue a shared session the other one started.
    if (conversationId) {
      const { data: convRow } = await supabase
        .from('ai_conversations')
        .select('couple_id, type')
        .eq('id', conversationId)
        .maybeSingle()
      if (!convRow || convRow.type !== 'shared' || convRow.couple_id !== coupleId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()
    if (!couple) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

    const [{ data: profile1 }, { data: profile2 }] = await Promise.all([
      supabase.from('user_profiles').select('user_id, display_name').eq('user_id', couple.user1_id).maybeSingle(),
      supabase.from('user_profiles').select('user_id, display_name').eq('user_id', couple.user2_id).maybeSingle(),
    ])
    const nameFor = (uid) => (uid === couple.user1_id ? profile1?.display_name : profile2?.display_name) || 'Partner'
    const actingName = nameFor(user.id)
    const otherUserId = user.id === couple.user1_id ? couple.user2_id : couple.user1_id
    const otherName = nameFor(otherUserId)

    // ── CONVERSATION SETUP ─────────────────────────────────────────
    let activeConversationId = conversationId

    if (!activeConversationId) {
      // Find the most recent untitled shared session for this couple to
      // close now that a new one is starting — mirrors the solo AI Coach
      // pattern in app/api/ai-coach/route.js, but scoped by couple_id +
      // type='shared' instead of user_id + type='solo', since either
      // partner starting a new session should close whichever shared
      // session either of them left open.
      const { data: prevConversations } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('couple_id', coupleId)
        .eq('type', 'shared')
        .is('title', null)
        .order('updated_at', { ascending: false })
        .limit(1)
      const prevConvId = prevConversations?.[0]?.id

      const { data: newConversation, error: createError } = await supabase
        .from('ai_conversations')
        .insert({ user_id: user.id, couple_id: coupleId, type: 'shared' })
        .select('id')
        .maybeSingle()
      if (createError) {
        console.error('[couples-session] Error creating conversation:', createError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }
      activeConversationId = newConversation.id

      if (prevConvId) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://abf-couples-app.vercel.app'
        fetch(`${appUrl}/api/couples-session/close-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': request.headers.get('authorization') || '',
          },
          body: JSON.stringify({ conversationId: prevConvId, coupleId }),
        }).catch(() => {})
      }
    }

    // ── SAVE USER MESSAGE ──────────────────────────────────────────
    const { error: userMsgError } = await supabase
      .from('ai_messages')
      .insert({ conversation_id: activeConversationId, role: 'user', content: message.trim(), sender_id: user.id })
    if (userMsgError) {
      console.error('[couples-session] Error saving user message:', userMsgError)
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
    }

    // ── BUILD CONTEXT ──────────────────────────────────────────────
    // getFullNoraContext returns a claimsBlock (individual hypotheses meant
    // to be gently surfaced 1:1 in solo AI Coach) — deliberately NOT used
    // here. Surfacing something inferred from one partner's private signals
    // in front of the other partner would be the exact privacy leak the
    // Aug 2026 AI-coach privacy fix (see Sessions/PRODUCT_BACKLOG.md) closed
    // for couple_notes/memory_summary; pulling claims into a session where
    // both partners are reading every word would reopen it from a new angle.
    const fullContext = await getFullNoraContext(coupleId, user.id, actingName, otherName)
    const noraBriefing = fullContext.noraBriefing || ''

    const systemPrompt = buildCoachSystem(
      CLINICAL_KNOWLEDGE,
      [
        noraBriefing,
        `You are in a live Couples Session with ${actingName} and ${otherName} — both are present and reading this conversation together.`,
        OPERATIONAL_RULES,
      ].filter(Boolean).join('\n\n')
    )

    // ── FETCH HISTORY, LABELED BY SPEAKER ───────────────────────────
    // Unlike nora-inline (which strips history to bare {role, content} and
    // relies only on the current turn's context to distinguish speakers),
    // sender_id now lets every past turn be correctly attributed — needed
    // for Nora to actually "track the dynamic between them" turn over turn,
    // not just react to whoever's talking right now.
    const { data: historyRows } = await supabase
      .from('ai_messages')
      .select('role, content, sender_id, created_at')
      .eq('conversation_id', activeConversationId)
      .order('created_at', { ascending: true })
      .limit(60)

    const history = (historyRows || []).map(m => ({
      role: m.role,
      content: m.role === 'user' ? `[${nameFor(m.sender_id)}]: ${m.content}` : m.content,
    }))

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[couples-session] ANTHROPIC_API_KEY is not configured')
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }

    const aiResponse = await noraChat(history, {
      route: 'couples-session',
      system: systemPrompt,
      context: 'conversation',
      maxTokens: 700,
    })

    const { data: savedResponse, error: aiMsgError } = await supabase
      .from('ai_messages')
      .insert({ conversation_id: activeConversationId, role: 'assistant', content: aiResponse })
      .select('*')
      .maybeSingle()
    if (aiMsgError) {
      console.error('[couples-session] Error saving AI response:', aiMsgError)
      return NextResponse.json({ error: 'Failed to save AI response' }, { status: 500 })
    }

    // ── MEMORY SIGNAL ───────────────────────────────────────────────
    // userId: null — this is a shared/witnessed signal (see
    // SIGNAL_TYPES.COUPLES_SESSION in lib/nora-memory.js), both partners'
    // individual notes AND couple_notes update, never nora_private_notes.
    const updatedMessages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'assistant', content: aiResponse },
    ]
    const lastTwo = updatedMessages.slice(-2)
    if (lastTwo.length >= 2) {
      shouldUpdateMemory(lastTwo).then(meaningful => {
        if (meaningful) {
          updateNoraMemory({
            coupleId,
            userId: null,
            signalType: SIGNAL_TYPES.COUPLES_SESSION,
            inputData: { messages: lastTwo, midSession: true },
          }).catch(() => {})
        }
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      conversationId: activeConversationId,
      message: savedResponse,
    })
  } catch (error) {
    console.error('[couples-session] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { searchParams } = new URL(request.url)
    const coupleId = searchParams.get('coupleId')
    const conversationId = searchParams.get('conversationId')

    if (!coupleId) return NextResponse.json({ error: 'coupleId required' }, { status: 400 })
    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (!conversationId) {
      // Session history list — titled past sessions, most recent first.
      const { data: conversations, error } = await supabase
        .from('ai_conversations')
        .select('id, title, updated_at, message_count, created_at')
        .eq('couple_id', coupleId)
        .eq('type', 'shared')
        .not('title', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(30)
      if (error) return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
      return NextResponse.json({ conversations })
    }

    // Couple-scoped ownership check — either partner can read.
    const { data: convRow } = await supabase
      .from('ai_conversations')
      .select('couple_id, type')
      .eq('id', conversationId)
      .maybeSingle()
    if (!convRow || convRow.type !== 'shared' || convRow.couple_id !== coupleId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: messages, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('[couples-session] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
