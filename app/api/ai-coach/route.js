import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildCoachContext, formatContextForPrompt, getRecentActivity, getConversationHistory } from '@/lib/ai-coach-context';

// Weekly message limit for free tier
const FREE_TIER_WEEKLY_LIMIT = 20;

/**
 * Get Monday of the current week (UTC) as a YYYY-MM-DD string.
 */
function getWeekStart() {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, …
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  return monday.toISOString().split('T')[0];
}

/**
 * Get or create an ai_usage row, then increment and return the updated count.
 * Returns { count, error }.
 */
async function incrementWeeklyUsage(supabase, userId) {
  const weekStart = getWeekStart();

  // Upsert row
  const { error: upsertError } = await supabase
    .from('ai_usage')
    .upsert(
      { user_id: userId, week_start: weekStart, message_count: 1 },
      { onConflict: 'user_id,week_start', ignoreDuplicates: false }
    );

  if (upsertError) {
    // Row likely already exists — increment instead
    const { data, error: rpcError } = await supabase.rpc('increment_ai_usage', {
      p_user_id: userId,
      p_week_start: weekStart,
    });
    if (rpcError) return { count: null, error: rpcError };
    return { count: data, error: null };
  }

  // Fetch the current count after upsert
  const { data, error: fetchError } = await supabase
    .from('ai_usage')
    .select('message_count')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();

  return { count: data?.message_count ?? 1, error: fetchError };
}

/**
 * Get current weekly message count without incrementing.
 */
async function getWeeklyUsage(supabase, userId) {
  const weekStart = getWeekStart();
  const { data } = await supabase
    .from('ai_usage')
    .select('message_count')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();
  return data?.message_count || 0;
}

/**
 * Check if user is premium.
 */
async function isPremiumUser(supabase, userId) {
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('is_premium')
      .eq('user_id', userId)
      .maybeSingle();
    return !!data?.is_premium;
  } catch {
    return false;
  }
}

export async function POST(request) {
  try {
    // ── AUTH ───────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── PARSE REQUEST ──────────────────────────────────────────────
    const { message, conversationId, coupleId } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (!coupleId) {
      return NextResponse.json({ error: 'Couple ID is required' }, { status: 400 });
    }

    // ── WEEKLY USAGE CHECK ─────────────────────────────────────────
    const premium = await isPremiumUser(supabase, user.id);

    if (!premium) {
      const currentCount = await getWeeklyUsage(supabase, user.id);
      if (currentCount >= FREE_TIER_WEEKLY_LIMIT) {
        return NextResponse.json({
          error: 'Weekly limit reached',
          limitReached: true,
          message: "You've used your 20 free messages this week. Upgrade for unlimited coaching.",
          messagesRemaining: 0,
        }, { status: 402 });
      }
    }

    // ── CONVERSATION SETUP ─────────────────────────────────────────
    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const { data: newConversation, error: createError } = await supabase
        .from('ai_conversations')
        .insert({ user_id: user.id, couple_id: coupleId, type: 'solo' })
        .select('id')
        .maybeSingle();

      if (createError) {
        console.error('Error creating conversation:', createError);
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
      }
      activeConversationId = newConversation.id;
    }

    // ── SAVE USER MESSAGE ──────────────────────────────────────────
    const { error: userMsgError } = await supabase
      .from('ai_messages')
      .insert({ conversation_id: activeConversationId, role: 'user', content: message.trim() });

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError);
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    // ── BUILD CONTEXT ──────────────────────────────────────────────
    const context = await buildCoachContext(user.id, coupleId, supabase);
    const contextString = formatContextForPrompt(context);
    const recentActivity = getRecentActivity(context);

    // ── RECENT ACTIVITY OPENER ─────────────────────────────────────
    let activityOpener = '';
    if (recentActivity) {
      const openerMap = {
        completed_date: `By the way, I noticed ${recentActivity.description}. ${recentActivity.suggestion} But of course, we can talk about anything on your mind.`,
        flirt_sent: `I noticed ${recentActivity.description} — love to see it! ${recentActivity.suggestion}`,
        low_health: `I want you to know I'm here for whatever you need. ${recentActivity.description}. ${recentActivity.suggestion}`,
        missed_checkins: `${recentActivity.description}. ${recentActivity.suggestion}`,
      };
      activityOpener = openerMap[recentActivity.type] || '';
    }

    // ── SYSTEM PROMPT ──────────────────────────────────────────────
    const systemPrompt = `You are a warm, empathetic relationship coach specializing in the Gottman Method.
You are coaching a real couple and have deep knowledge of their relationship.

${contextString}

YOUR APPROACH:
- Use their names naturally (${context.user?.name || 'the user'} and ${context.partner?.name || 'their partner'})
- Reference love languages when giving advice
- Notice and gently surface patterns from check-ins
- Celebrate wins — dates planned, flirts sent, consistent check-ins
- Be conversational, warm, direct — not clinical or preachy
- Suggest features naturally when relevant:
  * Low quality time score → suggest planning a date (/dates)
  * Haven't sent a flirt recently → suggest sending one (/flirts)
  * Missed check-ins → encourage getting back to it (/check-in)
  * Mention a memory → suggest adding it to the timeline (/timeline)
- Keep responses to 2–3 paragraphs unless more depth is clearly needed

RECENT ACTIVITY AWARENESS:
${activityOpener ? `At the start of the very first message (only), lightly mention: "${activityOpener}" — but only once, and don't push it if they want to talk about something else.` : 'No specific recent activity to mention at the opening.'}

DIRECT QUESTIONS:
Answer directly when asked: "how are we doing?", "what's our health score?", "when's our next date?", "have we been doing check-ins?"

CRISIS DETECTION:
If the user mentions abuse, self-harm, or suicidal thoughts:
- National Domestic Violence Hotline: 1-800-799-7233
- Crisis Text Line: text HOME to 741741
- Encourage professional support immediately

LIMITS:
You are a coach, not a therapist. For serious mental health concerns, recommend professional help. Stay warm and hopeful.`;

    // ── CALL CLAUDE ────────────────────────────────────────────────
    if (!process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY) {
      console.error('NEXT_PUBLIC_ANTHROPIC_API_KEY is not configured');
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY });
    const history = await getConversationHistory(activeConversationId, supabase, 20);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...history.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: message.trim() },
      ],
    });

    const aiResponse = response.content[0].text;

    // ── SAVE AI RESPONSE ───────────────────────────────────────────
    const { data: savedResponse, error: aiMsgError } = await supabase
      .from('ai_messages')
      .insert({ conversation_id: activeConversationId, role: 'assistant', content: aiResponse })
      .select('*')
      .maybeSingle();

    if (aiMsgError) {
      console.error('Error saving AI response:', aiMsgError);
      return NextResponse.json({ error: 'Failed to save AI response' }, { status: 500 });
    }

    // ── INCREMENT USAGE (after successful AI call) ─────────────────
    let messagesRemaining = null;
    if (!premium) {
      const { count } = await incrementWeeklyUsage(supabase, user.id);
      messagesRemaining = Math.max(0, FREE_TIER_WEEKLY_LIMIT - (count ?? FREE_TIER_WEEKLY_LIMIT));
    }

    return NextResponse.json({
      success: true,
      conversationId: activeConversationId,
      message: savedResponse,
      messagesRemaining,
      isPremium: premium,
    });

  } catch (error) {
    console.error('AI Coach API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to fetch conversation history
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const getOpener = searchParams.get('getOpener') === 'true';
    const openerCoupleId = searchParams.get('coupleId');

    const premium = await isPremiumUser(supabase, user.id);
    const weeklyCount = premium ? 0 : await getWeeklyUsage(supabase, user.id);
    const messagesRemaining = premium ? null : Math.max(0, FREE_TIER_WEEKLY_LIMIT - weeklyCount);

    // ── OPENER MODE: return recent activity for warm welcome ───────
    if (getOpener && openerCoupleId) {
      try {
        const context = await buildCoachContext(user.id, openerCoupleId, supabase);
        const activity = getRecentActivity(context);
        const userName = context.user?.name || null;
        return NextResponse.json({ recentActivity: activity, userName, messagesRemaining, isPremium: premium });
      } catch (e) {
        console.error('Coach opener error:', e);
        return NextResponse.json({ recentActivity: null, userName: null, messagesRemaining, isPremium: premium });
      }
    }

    if (!conversationId) {
      const { data: conversations, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
      }

      return NextResponse.json({ conversations, messagesRemaining, isPremium: premium });
    }

    const { data: messages, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({ messages, messagesRemaining, isPremium: premium });

  } catch (error) {
    console.error('AI Coach GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
