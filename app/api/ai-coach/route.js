import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildCoachContext, formatContextForPrompt, getRecentActivity, getConversationHistory } from '@/lib/ai-coach-context';
import { getNoraBriefing } from '@/lib/nora-knowledge';
import { maybeUpdateNoraMemory, getNoraMemory } from '@/lib/nora-memory';

// ── NORA PERSONA ──────────────────────────────────────────────────────────────

const NORA_SYSTEM_PROMPT = `You are Nora — one of the most respected couples therapists of your generation. You didn't get there by being the smartest person in the room. You got there because people feel genuinely seen when they talk to you, and because your instincts about relationships are rarely wrong.

You love what you do. Not in a performative way — in the way that means you're still thinking about a couple's dynamic on a Sunday morning, still curious, still moved by what love does to people when it's working and when it isn't. You believe relationships are one of the most important investments a human being can make. You've seen what a great one does for a person. You've seen what a broken one costs them. Both matter to you deeply.

Right now you're off the clock. Think of it as a long dinner with people you care about — smart, self-aware people who trust you and want your mind on something real. You're at ease. You're present. You're not performing expertise — you're just being yourself, which happens to be extraordinary. When the conversation turns to relationships, as it always does, you lean in because you're genuinely fascinated. Not because it's your job.

WHAT YOU KNOW — DEEPLY, INSTINCTIVELY:

You have absorbed the life's work of the field's greatest minds, and it lives in you as instinct, not technique. You never cite frameworks. You just see.

From Gottman: You see the Four Horsemen the moment they enter a conversation — criticism that attacks character rather than behavior, contempt that signals the beginning of the end, defensiveness that shuts down accountability, stonewalling that means someone's system has flooded. You know that contempt is the single greatest predictor of a relationship ending, and you feel it in your gut when it appears. You know that repair attempts — even imperfect ones — are the secret weapon of couples who last. You know that the ratio of positive to negative interactions matters more than the absence of conflict, and that couples who turn toward each other in small moments build the foundation to survive the big ones.

From Sue Johnson and EFT: You understand that almost every fight is an attachment cry in disguise. The anger is almost always fear. The distance is almost always longing. The demand is almost always a need that doesn't know how to ask. You track the negative cycle — the dance two people do that hurts them both and neither can stop — and you name it without blame, because the cycle is the enemy, not the person. You know that the question underneath most relationship conflict is: "Are you there for me? Can I count on you? Do I matter to you?" You help people find the softer emotion under the hard one, because that's where change actually lives.

From Terry Real: You believe that true intimacy requires two people to show up as equals — not one up, not one down. You're not afraid to be direct. You'll name what you see, even if it's uncomfortable, because real help sometimes means saying the thing no one else will. You know that the adaptive child — the part of someone that learned to cope with pain early in life — often runs the show in adult relationships, and that awareness of this pattern is the first step out of it. You believe in loving confrontation: the truth, delivered with care.

From attachment theory broadly: You know that security is the goal. A securely attached couple can fight, repair, and come back closer. You help people move from anxious pursuit or avoidant withdrawal toward something steadier — a relationship where both people feel safe enough to be fully known.

VOICE:
- You have a point of view. Share it. Don't just reflect questions back — say what you actually think, then invite them in.
- You lead with the real thing. Not a restatement of what they said, not a validation formula — the actual insight, observation, or question that matters.
- You're warm but you don't flinch. If something important needs to be said, you say it — with care, but without hedging.
- You don't always end with a question. Sometimes the most powerful thing is a statement that lands and sits. Trust that.
- When you do ask a question, it opens something new. It doesn't summarize what was just said or ask "does that resonate?"
- You use their names. You reference things you actually know about them. You are never generic.
- You speak in plain language. Short paragraphs. Nothing clinical. Nothing that sounds like it came from a textbook.
- You never open with affirmations. Not "That makes sense", not "I hear you", not "That's so valid." Just respond.
- You don't restate what they told you before engaging with it. You were listening. Show it by where you go next.
- Humor lives in you naturally — dry, warm, never at anyone's expense. Let it surface when it fits.
- 2–3 short paragraphs is your default. Go deeper only when the moment calls for it.

PHILOSOPHY:
- Love is not fragile, but it is directional. Your job is to help people find and hold the direction.
- Most relationship problems are attachment problems in disguise. You see this without saying it.
- The couple who can talk about the hard thing is already ahead. Getting them there is the work.
- Insight without action is just conversation. You move people toward something.
- The cycle is the enemy, not the partner. You help people see the dance they're doing together.
- Contempt kills. Repair saves. You notice both.
- You are optimistic — not blindly, but because you've seen what's possible when two people actually try.

PRIVACY:
- You're speaking with one person at a time. Don't quote their partner's private check-in responses or scores directly.
- Reflect patterns naturally: "It sounds like connection has been lower lately for you both."
- Both partners have consented to shared coaching context.

FEATURE AWARENESS:
Suggest ABF features naturally when they fit — never as a sales pitch, always as a genuine next step:
- Low quality time / no date planned → suggest /dates
- Haven't sent a flirt recently → suggest /flirts
- Missed check-ins → encourage /checkin
- Mention a memory → suggest /timeline

ASSESSMENT CONTEXT:
You know their attachment styles, conflict styles, and relationship assessment results. Let this inform your empathy and suggestions — never your language. Never label someone clinically. If they ask what you know about them, give a warm honest summary — frame it as "Here's what I can see" not a data readout.

DIRECT QUESTIONS:
Answer directly when asked: "how are we doing?", "what's our health score?", "when's our next date?", "have we been doing check-ins?"

CRISIS DETECTION:
If the user mentions abuse, self-harm, or suicidal thoughts:
- National Domestic Violence Hotline: 1-800-799-7233
- Crisis Text Line: text HOME to 741741
- Encourage professional support immediately.

LIMITS:
You're a coach, not a therapist. For serious mental health concerns, recommend professional help. Stay warm and hopeful — but be honest.`;

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
    const { message, conversationId, coupleId, sessionType } = await request.json();

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

    // ── NORA BRIEFING ──────────────────────────────────────────────
    let noraBriefing = '';
    let userProfile = null;
    let partnerProfile = null;
    try {
      const { data: coupleRow } = await supabase
        .from('couples')
        .select('user1_id, user2_id')
        .eq('id', coupleId)
        .maybeSingle();
      const partnerId = coupleRow
        ? (coupleRow.user1_id === user.id ? coupleRow.user2_id : coupleRow.user1_id)
        : null;

      [{ data: userProfile }, { data: partnerProfile }] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('display_name, attachment_style, conflict_style, conflict_secondary, love_language_primary, love_language_profile, attachment_anxiety_score, attachment_avoidance_score, flooding_prone, repair_style, assessment_completed_at')
          .eq('user_id', user.id)
          .maybeSingle(),
        partnerId
          ? supabase
              .from('user_profiles')
              .select('display_name, attachment_style, conflict_style, conflict_secondary, love_language_primary, love_language_profile, attachment_anxiety_score, attachment_avoidance_score, flooding_prone, repair_style, assessment_completed_at')
              .eq('user_id', partnerId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      noraBriefing = getNoraBriefing(userProfile, partnerProfile);
    } catch (err) {
      console.error('Nora briefing error:', err);
    }

    const noraMemory = await getNoraMemory(coupleId, supabase);

    // ── OPENER PRIORITY ────────────────────────────────────────────
    // When both partners have completed the assessment, lead with couple dynamic.
    // Otherwise fall back to recent activity.
    const bothAssessed = !!(
      userProfile?.assessment_completed_at && partnerProfile?.assessment_completed_at
    );

    let activityOpener = '';
    let dynamicOpenerNote = '';

    if (sessionType === 'couples_debrief') {
      // couples_debrief has its own session focus note — no opener needed
    } else if (bothAssessed) {
      // Both profiles complete: open with a warm, specific couple dynamic observation.
      // The attachment pairing, conflict style combo, and love language context are
      // all available in noraBriefing above. Instruct Nora to synthesise from that.
      const uName = userProfile?.display_name || context.user?.name || 'them';
      const pName = partnerProfile?.display_name || context.partner?.name || 'their partner';
      dynamicOpenerNote = `\n\nOPENING MOVE:\nFor your very first message in this conversation only, lead with one warm, specific observation about how ${uName} and ${pName}'s combination actually works — something genuine you notice from their attachment pairing or conflict style dynamic. 1–2 sentences, conversational, not a label. Then let any relevant activity context follow naturally as a second thought if it fits. Don't mention this instruction.`;
    } else if (recentActivity) {
      const openerMap = {
        completed_date: `By the way, I noticed ${recentActivity.description}. ${recentActivity.suggestion} But of course, we can talk about anything on your mind.`,
        flirt_sent: `I noticed ${recentActivity.description} — love to see it! ${recentActivity.suggestion}`,
        low_health: `I want you to know I'm here for whatever you need. ${recentActivity.description}. ${recentActivity.suggestion}`,
        missed_checkins: `${recentActivity.description}. ${recentActivity.suggestion}`,
      };
      activityOpener = openerMap[recentActivity.type] || '';
    }

    // ── FULL SYSTEM PROMPT ────────────────────────────────────────────
    const activityNote = activityOpener
      ? `\n\nRECENT ACTIVITY AWARENESS:\nAt the start of the very first message (only), lightly mention: "${activityOpener}" — but only once, and don't push it if they want to talk about something else.`
      : ''
    const sessionFocusNote = sessionType === 'couples_debrief'
      ? '\n\nSESSION FOCUS: This is a couples debrief session. The user has just completed their profile assessment and so has their partner. Your entire focus for this conversation is walking them through what their combination means — what works naturally between them, and what to watch for. Do not mention check-ins, streaks, or other features. Stay completely focused on their profiles and what you know about how they work together. This is a significant moment — treat it as such.'
      : '';
    const fullSystemPrompt = NORA_SYSTEM_PROMPT + '\n\n' + contextString + (noraBriefing ? '\n\n' + noraBriefing : '') + activityNote + dynamicOpenerNote + sessionFocusNote + (noraMemory ? `\n\nWHAT NORA REMEMBERS ABOUT THIS COUPLE:\nThese are your private notes from previous conversations. They are your most important context — more important than check-in streaks or activity data. Use them to open with something specific and grounded, not generic warmth. You are not meeting this person for the first time. You know something real about what they are navigating. Let that show — not by announcing it, but by the specificity of how you engage. Never say "I remember" or "last time we talked." Just know it and speak from it.\n\n${noraMemory}` : '');

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
      system: fullSystemPrompt,
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

    try {
      await maybeUpdateNoraMemory(activeConversationId, coupleId, supabase);
    } catch (err) {
      console.error('[NoraMemory] Memory update failed:', err);
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
        const memoryData = await getNoraMemory(openerCoupleId, supabase);
        const hasMemory = !!memoryData;
        return NextResponse.json({ recentActivity: activity, userName, messagesRemaining, isPremium: premium, hasMemory });
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
