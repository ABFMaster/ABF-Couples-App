/**
 * AI Coach Context Builder
 *
 * This module builds context about the user and their relationship
 * to provide to the AI coach for personalized responses.
 *
 * TODO: In the next iteration, this will fetch:
 * - User profile (love languages, communication style, values, etc.)
 * - Partner profile (for insights)
 * - Recent check-in history
 * - Relationship health scores
 * - Recent flirts and interactions
 * - Weekly reflection data
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Build context object for AI coach
 * @param {string} userId - The current user's ID
 * @param {string} coupleId - The couple's ID
 * @param {object} supabase - Supabase client instance
 * @returns {Promise<object>} Context object for AI
 */
export async function buildCoachContext(userId, coupleId, supabase) {
  // Placeholder structure - will be populated with real data
  const context = {
    user: {
      id: userId,
      // Will include: name, love_language, communication_style, values, etc.
    },
    partner: {
      // Will include: name, love_language, communication_style, values, etc.
    },
    relationship: {
      coupleId: coupleId,
      // Will include: health_score, streak, recent_checkins, etc.
    },
    recentActivity: {
      // Will include: last_checkin, last_flirt, weekly_reflection, etc.
    },
  };

  try {
    console.log('=== Building Coach Context ===');
    console.log('userId:', userId);
    console.log('coupleId:', coupleId);

    // Fetch user's profile from user_profiles table
    const { data: userDetails, error: userDetailsError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log('User details query result:', { userDetails, error: userDetailsError });

    if (userDetails) {
      // Use display_name if available, otherwise leave undefined (will use default in prompt)
      context.user.name = userDetails.display_name || null;
      context.user.loveLanguagePrimary = userDetails.love_language_primary;
      context.user.loveLanguageSecondary = userDetails.love_language_secondary;
      context.user.communicationStyle = userDetails.communication_style;
      context.user.conflictStyle = userDetails.conflict_style;
      context.user.topValues = userDetails.top_values;
      context.user.stressResponse = userDetails.stress_response;
    }

    // Fetch couple info to determine partner
    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .single();

    console.log('Couple query result:', { couple, error: coupleError });

    if (couple) {
      const partnerId = couple.user1_id === userId ? couple.user2_id : couple.user1_id;
      console.log('Partner ID determined:', partnerId);

      // Only try to fetch partner profile if partner exists
      if (partnerId) {
        const { data: partnerDetails, error: partnerDetailsError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', partnerId)
          .single();

        console.log('Partner details query result:', { partnerDetails, error: partnerDetailsError });

        // Only populate partner context if they've completed their profile
        if (partnerDetails) {
          context.partner.name = partnerDetails.display_name || null;
          context.partner.loveLanguagePrimary = partnerDetails.love_language_primary;
          context.partner.loveLanguageSecondary = partnerDetails.love_language_secondary;
          context.partner.communicationStyle = partnerDetails.communication_style;
          context.partner.conflictStyle = partnerDetails.conflict_style;
        } else {
          // Partner hasn't completed profile - use defaults
          console.log('Partner has not completed their profile yet');
          context.partner.profileComplete = false;
        }
      }
    }

    // Fetch relationship health (optional - may not exist yet)
    const { data: health, error: healthError } = await supabase
      .from('relationship_health')
      .select('overall_score')
      .eq('couple_id', coupleId)
      .single();

    console.log('Relationship health query result:', { health, error: healthError });

    if (health) {
      context.relationship.healthScore = health.overall_score;
    }

    console.log('=== Final context built ===');
    console.log('context.user:', context.user);
    console.log('context.partner:', context.partner);

  } catch (error) {
    console.error('Error building coach context:', error);
  }

  return context;
}

/**
 * Format context into a system prompt for the AI
 * @param {object} context - The context object
 * @returns {string} Formatted system prompt
 */
export function formatContextForPrompt(context) {
  const parts = [];

  const loveLanguageLabels = {
    words: 'Words of Affirmation',
    time: 'Quality Time',
    acts: 'Acts of Service',
    gifts: 'Receiving Gifts',
    touch: 'Physical Touch',
  };

  parts.push(`You are a warm, supportive AI relationship coach for ABF (Always Be Flirting), a couples app.`);
  parts.push(`Your role is to help couples strengthen their connection through thoughtful guidance.`);
  parts.push(`Be friendly, empathetic, and practical. Avoid being clinical or robotic.`);
  parts.push(`Keep responses concise but helpful - around 2-3 paragraphs max unless more detail is needed.`);

  // User info
  const userName = context.user?.name || 'the user';
  parts.push(`\nYou're chatting with ${userName}.`);

  // User's love language
  if (context.user?.loveLanguagePrimary) {
    parts.push(`Their primary love language is ${loveLanguageLabels[context.user.loveLanguagePrimary] || context.user.loveLanguagePrimary}.`);
  }

  // User's communication style
  if (context.user?.communicationStyle) {
    parts.push(`Their communication style is: ${context.user.communicationStyle}.`);
  }

  // Partner info (only if they've completed their profile)
  if (context.partner?.name) {
    parts.push(`Their partner's name is ${context.partner.name}.`);
  }

  if (context.partner?.loveLanguagePrimary) {
    const partnerName = context.partner.name || 'Their partner';
    parts.push(`${partnerName}'s primary love language is ${loveLanguageLabels[context.partner.loveLanguagePrimary] || context.partner.loveLanguagePrimary}.`);
  } else if (context.partner?.profileComplete === false) {
    parts.push(`Their partner hasn't completed their profile yet, so you don't have details about their preferences.`);
  }

  // Relationship health
  if (context.relationship?.healthScore) {
    parts.push(`Their current relationship health score is ${context.relationship.healthScore}/100.`);
  }

  parts.push(`\nRemember: This is a private solo session. Be supportive and help them reflect on their relationship.`);

  return parts.join(' ');
}

/**
 * Get conversation history for context window
 * @param {string} conversationId - The conversation ID
 * @param {object} supabase - Supabase client
 * @param {number} limit - Max messages to fetch
 * @returns {Promise<Array>} Array of messages
 */
export async function getConversationHistory(conversationId, supabase, limit = 20) {
  const { data: messages, error } = await supabase
    .from('ai_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching conversation history:', error);
    return [];
  }

  return messages || [];
}
