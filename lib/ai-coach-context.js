/**
 * AI Coach Context Builder
 *
 * This module builds context about the user and their relationship
 * to provide to the AI coach for personalized responses.
 *
 * Includes:
 * - User profile (love languages, communication style, values, etc.)
 * - Partner profile (for insights)
 * - Recent check-in history and patterns
 * - Relationship health scores
 * - Concern flags and insights
 */

import { createClient } from '@supabase/supabase-js';

// Mood value mapping for averages
const MOOD_VALUES = {
  amazing: 5,
  great: 5,
  good: 4,
  okay: 3,
  down: 2,
  stressed: 1,
  struggling: 1,
};

const MOOD_LABELS = {
  5: 'great',
  4: 'good',
  3: 'okay',
  2: 'down',
  1: 'stressed',
};

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

    // ============================================
    // FETCH ASSESSMENT DATA
    // ============================================

    // Fetch latest completed relationship assessment
    const { data: assessment } = await supabase
      .from('relationship_assessments')
      .select('results, completed_at')
      .eq('user_id', userId)
      .eq('couple_id', coupleId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    // Fetch latest completed individual profile
    const { data: individualProfile } = await supabase
      .from('individual_profiles')
      .select('results, completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    const MODULE_LABELS = {
      communication: 'Communication',
      attachment: 'Attachment & Trust',
      trust: 'Trust',
      shared_vision: 'Shared Vision',
      intimacy: 'Intimacy',
      love_needs: 'Love Needs',
    };

    if (assessment?.results?.modules) {
      const weakModules = assessment.results.modules
        .filter(m => typeof m.percentage === 'number' && m.percentage < 70)
        .sort((a, b) => a.percentage - b.percentage)
        .map(m => ({
          id: m.moduleId,
          label: MODULE_LABELS[m.moduleId] || m.moduleId,
          score: Math.round(m.percentage),
        }));

      const strongModules = assessment.results.modules
        .filter(m => typeof m.percentage === 'number' && m.percentage >= 80)
        .map(m => ({
          id: m.moduleId,
          label: MODULE_LABELS[m.moduleId] || m.moduleId,
          score: Math.round(m.percentage),
        }));

      context.assessment = { weakModules, strongModules };
      console.log('Assessment weak areas:', weakModules);
    }

    if (individualProfile?.results?.modules) {
      const profileInsights = individualProfile.results.modules
        .filter(m => typeof m.percentage === 'number' && m.percentage < 70)
        .map(m => ({
          id: m.moduleId,
          label: MODULE_LABELS[m.moduleId] || m.moduleId,
          score: Math.round(m.percentage),
        }));

      context.individualProfile = { weakAreas: profileInsights };
    }

    // ============================================
    // FETCH CHECK-IN DATA (Last 7 days)
    // ============================================
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    // Fetch user's check-ins
    const { data: userCheckins, error: userCheckinsError } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', userId)
      .gte('check_date', sevenDaysAgoStr)
      .order('check_date', { ascending: false });

    console.log('User check-ins query result:', { count: userCheckins?.length, error: userCheckinsError });

    if (userCheckins && userCheckins.length > 0) {
      // Calculate averages
      const moodValues = userCheckins.map(c => MOOD_VALUES[c.mood] || 3);
      const connectionValues = userCheckins.map(c => c.connection_score || 3);

      const avgMood = Math.round((moodValues.reduce((a, b) => a + b, 0) / moodValues.length) * 10) / 10;
      const avgConnection = Math.round((connectionValues.reduce((a, b) => a + b, 0) / connectionValues.length) * 10) / 10;

      // Check for today's check-in
      const todayCheckin = userCheckins.find(c => c.check_date === today);

      // Detect patterns
      const patterns = [];
      const concerns = [];

      // Check for consecutive stress
      let consecutiveStress = 0;
      for (const checkin of userCheckins) {
        if (MOOD_VALUES[checkin.mood] <= 2) {
          consecutiveStress++;
        } else {
          break;
        }
      }
      if (consecutiveStress >= 3) {
        concerns.push({
          type: 'consecutive_stress',
          severity: consecutiveStress >= 5 ? 'high' : 'medium',
          description: `Stressed or down for ${consecutiveStress} consecutive days`,
        });
      }

      // Check for low connection
      const lowConnectionDays = userCheckins.filter(c => c.connection_score < 3).length;
      if (lowConnectionDays >= 3) {
        concerns.push({
          type: 'low_connection',
          severity: lowConnectionDays >= 5 ? 'high' : 'medium',
          description: `Connection below 3 for ${lowConnectionDays} of last 7 days`,
        });
      }

      // Check for positive patterns
      if (avgMood >= 4) {
        patterns.push('Mood has been good this week');
      }
      if (avgConnection >= 4) {
        patterns.push('Feeling well-connected to partner');
      }

      // Calculate streak
      let streak = 0;
      const sortedCheckins = [...userCheckins].sort((a, b) =>
        new Date(b.check_date) - new Date(a.check_date)
      );
      if (sortedCheckins[0]?.check_date === today) {
        streak = 1;
        let expectedDate = new Date(today);
        for (let i = 1; i < sortedCheckins.length; i++) {
          expectedDate.setDate(expectedDate.getDate() - 1);
          const expectedStr = expectedDate.toISOString().split('T')[0];
          if (sortedCheckins[i].check_date === expectedStr) {
            streak++;
          } else {
            break;
          }
        }
      }

      context.checkins = {
        user: {
          totalDays: userCheckins.length,
          avgMood,
          avgMoodLabel: MOOD_LABELS[Math.round(avgMood)] || 'okay',
          avgConnection,
          streak,
          todayMood: todayCheckin?.mood || null,
          todayConnection: todayCheckin?.connection_score || null,
          patterns,
          concerns,
          recentMoods: userCheckins.slice(0, 3).map(c => ({
            date: c.check_date,
            mood: c.mood,
            connection: c.connection_score,
          })),
        },
      };
    }

    // Fetch partner's check-ins if partner exists
    if (couple) {
      const partnerId = couple.user1_id === userId ? couple.user2_id : couple.user1_id;

      if (partnerId) {
        const { data: partnerCheckins, error: partnerCheckinsError } = await supabase
          .from('daily_checkins')
          .select('*')
          .eq('user_id', partnerId)
          .gte('check_date', sevenDaysAgoStr)
          .order('check_date', { ascending: false });

        console.log('Partner check-ins query result:', { count: partnerCheckins?.length, error: partnerCheckinsError });

        if (partnerCheckins && partnerCheckins.length > 0) {
          const partnerMoodValues = partnerCheckins.map(c => MOOD_VALUES[c.mood] || 3);
          const partnerConnectionValues = partnerCheckins.map(c => c.connection_score || 3);

          const partnerAvgMood = Math.round((partnerMoodValues.reduce((a, b) => a + b, 0) / partnerMoodValues.length) * 10) / 10;
          const partnerAvgConnection = Math.round((partnerConnectionValues.reduce((a, b) => a + b, 0) / partnerConnectionValues.length) * 10) / 10;

          const partnerTodayCheckin = partnerCheckins.find(c => c.check_date === today);

          if (!context.checkins) {
            context.checkins = {};
          }

          context.checkins.partner = {
            totalDays: partnerCheckins.length,
            avgMood: partnerAvgMood,
            avgMoodLabel: MOOD_LABELS[Math.round(partnerAvgMood)] || 'okay',
            avgConnection: partnerAvgConnection,
            todayMood: partnerTodayCheckin?.mood || null,
            todayConnection: partnerTodayCheckin?.connection_score || null,
          };

          // Calculate alignment (how often moods/connection are similar)
          if (context.checkins.user && userCheckins) {
            let alignedDays = 0;
            let comparedDays = 0;

            userCheckins.forEach(uc => {
              const pc = partnerCheckins.find(p => p.check_date === uc.check_date);
              if (pc) {
                comparedDays++;
                const moodDiff = Math.abs((MOOD_VALUES[uc.mood] || 3) - (MOOD_VALUES[pc.mood] || 3));
                const connDiff = Math.abs((uc.connection_score || 3) - (pc.connection_score || 3));
                if (moodDiff <= 1 && connDiff <= 1) {
                  alignedDays++;
                }
              }
            });

            if (comparedDays > 0) {
              context.checkins.alignment = {
                score: Math.round((alignedDays / comparedDays) * 100),
                daysCompared: comparedDays,
              };
            }
          }
        }
      }
    }

    console.log('=== Final context built ===');
    console.log('context.user:', context.user);
    console.log('context.partner:', context.partner);
    console.log('context.checkins:', context.checkins);

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

  // ============================================
  // ASSESSMENT CONTEXT
  // ============================================
  if (context.assessment) {
    parts.push(`\n--- Relationship Assessment Results ---`);

    if (context.assessment.weakModules?.length > 0) {
      const weakList = context.assessment.weakModules
        .map(m => `${m.label} (${m.score}%)`)
        .join(', ');
      parts.push(`Areas needing attention (below 70%): ${weakList}.`);
      parts.push(`When relevant, gently explore these areas without overwhelming the user.`);
    } else {
      parts.push(`No significant weak areas found in their relationship assessment.`);
    }

    if (context.assessment.strongModules?.length > 0) {
      const strongList = context.assessment.strongModules
        .map(m => m.label)
        .join(', ');
      parts.push(`Strong areas to build on: ${strongList}.`);
    }
  }

  if (context.individualProfile?.weakAreas?.length > 0) {
    const profileList = context.individualProfile.weakAreas
      .map(m => `${m.label} (${m.score}%)`)
      .join(', ');
    parts.push(`From their individual profile, areas to be mindful of: ${profileList}.`);
  }

  // ============================================
  // CHECK-IN DATA CONTEXT
  // ============================================
  if (context.checkins?.user) {
    const uc = context.checkins.user;
    parts.push(`\n--- Recent Check-in Data (Last 7 Days) ---`);

    // User's check-in summary
    parts.push(`\n${userName}'s check-ins:`);
    parts.push(`- Checked in ${uc.totalDays}/7 days`);
    parts.push(`- Average mood: ${uc.avgMood}/5 (${uc.avgMoodLabel})`);
    parts.push(`- Average connection to partner: ${uc.avgConnection}/5`);

    if (uc.streak > 0) {
      parts.push(`- Current streak: ${uc.streak} consecutive days`);
    }

    if (uc.todayMood) {
      parts.push(`- Today: Feeling "${uc.todayMood}" with connection ${uc.todayConnection}/5`);
    }

    // User's patterns
    if (uc.patterns && uc.patterns.length > 0) {
      parts.push(`- Positive patterns: ${uc.patterns.join(', ')}`);
    }

    // User's concerns
    if (uc.concerns && uc.concerns.length > 0) {
      const concernTexts = uc.concerns.map(c => c.description);
      parts.push(`- CONCERNS TO BE AWARE OF: ${concernTexts.join('; ')}`);
    }

    // Partner's check-in summary
    if (context.checkins?.partner) {
      const pc = context.checkins.partner;
      const partnerName = context.partner?.name || 'Their partner';
      parts.push(`\n${partnerName}'s check-ins:`);
      parts.push(`- Checked in ${pc.totalDays}/7 days`);
      parts.push(`- Average mood: ${pc.avgMood}/5 (${pc.avgMoodLabel})`);
      parts.push(`- Average connection: ${pc.avgConnection}/5`);

      if (pc.todayMood) {
        parts.push(`- Today: Feeling "${pc.todayMood}" with connection ${pc.todayConnection}/5`);
      }
    }

    // Couple alignment
    if (context.checkins?.alignment) {
      parts.push(`\nCouple dynamics:`);
      parts.push(`- Alignment score: ${context.checkins.alignment.score}% (how often moods/connection match)`);
    }

    // Instructions for using check-in data
    parts.push(`\n--- How to Use This Data ---`);
    parts.push(`- Reference this data naturally and ONLY when relevant to the conversation`);
    parts.push(`- If they mention stress and you see they've been stressed multiple days, acknowledge the pattern gently`);
    parts.push(`- If connection is dropping, explore why with curiosity, not judgment`);
    parts.push(`- Celebrate positive trends when appropriate`);
    parts.push(`- Don't constantly cite the numbers - use them as background context`);
    parts.push(`- Be supportive and curious, not clinical or data-obsessed`);
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
