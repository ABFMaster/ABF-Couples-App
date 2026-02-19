import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildCoachContext, formatContextForPrompt, getConversationHistory } from '@/lib/ai-coach-context';

// Daily message limit for free tier
const FREE_TIER_DAILY_LIMIT = 5;

export async function POST(request) {
  try {
    console.log('=== AI Coach API Debug ===');

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    console.log('Has auth header:', !!authHeader);
    console.log('Has token:', !!token);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    // Create Supabase client with auth token for RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    console.log('User result:', { user: user ? { id: user.id, email: user.email } : null, error: authError });
    console.log('Has user:', !!user);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { message, conversationId, coupleId } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!coupleId) {
      return NextResponse.json({ error: 'Couple ID is required' }, { status: 400 });
    }

    // Check daily message limit (for free tier)
    const { data: todayCount } = await supabase.rpc('get_ai_messages_today', {
      p_user_id: user.id,
    });

    // TODO: Re-enable for production
    if (false && todayCount >= FREE_TIER_DAILY_LIMIT) {
      return NextResponse.json({
        error: 'Daily limit reached',
        limitReached: true,
        message: `You've used all ${FREE_TIER_DAILY_LIMIT} free messages today. Come back tomorrow or upgrade for unlimited access!`,
      }, { status: 429 });
    }

    let activeConversationId = conversationId;

    // Create new conversation if needed
    if (!activeConversationId) {
      console.log('Attempting to insert conversation with:', {
        couple_id: coupleId,
        user_id: user.id,
        type: 'solo',
        auth_uid: user.id
      });

      const { data: newConversation, error: createError } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          couple_id: coupleId,
          type: 'solo',
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        console.error('Full error details:', JSON.stringify(createError, null, 2));
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
      }

      activeConversationId = newConversation.id;
    }

    // Save user message
    const { error: userMsgError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: activeConversationId,
        role: 'user',
        content: message.trim(),
      });

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError);
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    // Build context for AI
    const context = await buildCoachContext(user.id, coupleId, supabase);

    console.log('=== Coach Context Debug ===');
    console.log('User name:', context.user?.name);
    console.log('Partner name:', context.partner?.name);
    console.log('Partner love language:', context.partner?.loveLanguagePrimary);
    console.log('Relationship health:', context.relationship?.healthScore);

    const systemPrompt = formatContextForPrompt(context);

    // Get conversation history for context
    const history = await getConversationHistory(activeConversationId, supabase);

    // Debug: Check if API key is loaded
    console.log('NEXT_PUBLIC_ANTHROPIC_API_KEY exists:', !!process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY);
    console.log('API key length:', process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY?.length);

    // Safety check: ensure API key is configured
    if (!process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY) {
      console.error('NEXT_PUBLIC_ANTHROPIC_API_KEY is not configured');
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
    });

    // Call Claude API with context
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...history.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: message.trim()
        }
      ],
    });

    const aiResponse = response.content[0].text;

    // Save AI response
    const { data: savedResponse, error: aiMsgError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: activeConversationId,
        role: 'assistant',
        content: aiResponse,
      })
      .select('*')
      .single();

    if (aiMsgError) {
      console.error('Error saving AI response:', aiMsgError);
      return NextResponse.json({ error: 'Failed to save AI response' }, { status: 500 });
    }

    // Return response
    return NextResponse.json({
      success: true,
      conversationId: activeConversationId,
      message: savedResponse,
      messagesRemaining: FREE_TIER_DAILY_LIMIT - (todayCount + 1),
    });

  } catch (error) {
    console.error('AI Coach API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to fetch conversation history
export async function GET(request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    // Create Supabase client with auth token for RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      // Return list of conversations
      const { data: conversations, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
      }

      return NextResponse.json({ conversations });
    }

    // Return messages for specific conversation
    const { data: messages, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Also get remaining messages count
    const { data: todayCount } = await supabase.rpc('get_ai_messages_today', {
      p_user_id: user.id,
    });

    return NextResponse.json({
      messages,
      messagesRemaining: FREE_TIER_DAILY_LIMIT - (todayCount || 0),
    });

  } catch (error) {
    console.error('AI Coach GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
