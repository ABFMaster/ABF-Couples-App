/**
 * AI Coach Context Builder
 *
 * Builds rich relationship context for the AI coach system prompt.
 * Fetches: partner profiles, health score, check-ins, dates, flirts, timeline.
 */

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

const LOVE_LANGUAGE_LABELS = {
  words: 'Words of Affirmation',
  time: 'Quality Time',
  acts: 'Acts of Service',
  gifts: 'Receiving Gifts',
  touch: 'Physical Touch',
};

/**
 * Build context object for AI coach
 * @param {string} userId
 * @param {string} coupleId
 * @param {object} supabase
 * @returns {Promise<object>}
 */
export async function buildCoachContext(userId, coupleId, supabase) {
  const context = {
    user: { id: userId },
    partner: {},
    relationship: { coupleId },
    recentActivity: {},
    checkins: null,
    dates: null,
    flirts: null,
    timeline: null,
  };

  try {
    // ── 1. USER PROFILE ──────────────────────────────────────────────
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('display_name, first_name, love_language_primary, love_language_secondary, communication_style, conflict_style, top_values, stress_response')
        .eq('user_id', userId)
        .single();

      if (userProfile) {
        context.user.name = userProfile.first_name || userProfile.display_name || null;
        context.user.loveLanguagePrimary = userProfile.love_language_primary;
        context.user.loveLanguageSecondary = userProfile.love_language_secondary;
        context.user.communicationStyle = userProfile.communication_style;
        context.user.conflictStyle = userProfile.conflict_style;
        context.user.topValues = userProfile.top_values;
        context.user.stressResponse = userProfile.stress_response;
      }
    } catch (e) {
      console.error('Coach context: failed to fetch user profile', e);
    }

    // ── 2. COUPLE + PARTNER PROFILE ──────────────────────────────────
    let partnerId = null;
    try {
      const { data: couple } = await supabase
        .from('couples')
        .select('user1_id, user2_id')
        .eq('id', coupleId)
        .single();

      if (couple) {
        partnerId = couple.user1_id === userId ? couple.user2_id : couple.user1_id;
      }
    } catch (e) {
      console.error('Coach context: failed to fetch couple', e);
    }

    if (partnerId) {
      try {
        const { data: partnerProfile } = await supabase
          .from('user_profiles')
          .select('display_name, first_name, love_language_primary, love_language_secondary, communication_style, conflict_style')
          .eq('user_id', partnerId)
          .single();

        if (partnerProfile) {
          context.partner.name = partnerProfile.first_name || partnerProfile.display_name || null;
          context.partner.loveLanguagePrimary = partnerProfile.love_language_primary;
          context.partner.loveLanguageSecondary = partnerProfile.love_language_secondary;
          context.partner.communicationStyle = partnerProfile.communication_style;
          context.partner.conflictStyle = partnerProfile.conflict_style;
        } else {
          context.partner.profileComplete = false;
        }
      } catch (e) {
        console.error('Coach context: failed to fetch partner profile', e);
        context.partner.profileComplete = false;
      }
    }

    // ── 3. RELATIONSHIP HEALTH SCORE ─────────────────────────────────
    try {
      const { data: health } = await supabase
        .from('relationship_health')
        .select('overall_score')
        .eq('couple_id', coupleId)
        .single();

      if (health) {
        context.relationship.healthScore = health.overall_score;
      }
    } catch (e) {
      console.error('Coach context: failed to fetch health score', e);
    }

    // ── 4. LAST 10 CHECK-INS (user + partner with question text) ─────
    try {
      const { data: userCheckins } = await supabase
        .from('daily_checkins')
        .select('check_date, mood, connection_score, question_text, question_response')
        .eq('user_id', userId)
        .eq('couple_id', coupleId)
        .order('check_date', { ascending: false })
        .limit(10);

      let partnerCheckins = [];
      if (partnerId) {
        const { data: pc } = await supabase
          .from('daily_checkins')
          .select('check_date, mood, connection_score, question_text, question_response')
          .eq('user_id', partnerId)
          .eq('couple_id', coupleId)
          .order('check_date', { ascending: false })
          .limit(10);
        partnerCheckins = pc || [];
      }

      if (userCheckins && userCheckins.length > 0) {
        const moodVals = userCheckins.map(c => MOOD_VALUES[c.mood] || 3);
        const connVals = userCheckins.map(c => c.connection_score || 3);
        const avgMood = Math.round((moodVals.reduce((a, b) => a + b, 0) / moodVals.length) * 10) / 10;
        const avgConn = Math.round((connVals.reduce((a, b) => a + b, 0) / connVals.length) * 10) / 10;

        // Streak calculation
        const today = new Date().toISOString().split('T')[0];
        let streak = 0;
        const sorted = [...userCheckins].sort((a, b) => new Date(b.check_date) - new Date(a.check_date));
        if (sorted[0]?.check_date === today) {
          streak = 1;
          let expected = new Date(today);
          for (let i = 1; i < sorted.length; i++) {
            expected.setDate(expected.getDate() - 1);
            if (sorted[i].check_date === expected.toISOString().split('T')[0]) {
              streak++;
            } else {
              break;
            }
          }
        }

        // Concern detection
        const concerns = [];
        let consecutiveStress = 0;
        for (const c of sorted) {
          if (MOOD_VALUES[c.mood] <= 2) consecutiveStress++;
          else break;
        }
        if (consecutiveStress >= 3) {
          concerns.push({
            type: 'consecutive_stress',
            severity: consecutiveStress >= 5 ? 'high' : 'medium',
            description: `Stressed or down for ${consecutiveStress} consecutive days`,
          });
        }
        const lowConnDays = userCheckins.filter(c => (c.connection_score || 3) < 3).length;
        if (lowConnDays >= 3) {
          concerns.push({
            type: 'low_connection',
            severity: lowConnDays >= 5 ? 'high' : 'medium',
            description: `Connection below 3 for ${lowConnDays} of last ${userCheckins.length} days`,
          });
        }

        context.checkins = {
          user: {
            totalDays: userCheckins.length,
            avgMood,
            avgMoodLabel: MOOD_LABELS[Math.round(avgMood)] || 'okay',
            avgConnection: avgConn,
            streak,
            lastCheckinDate: sorted[0]?.check_date || null,
            concerns,
            recent: userCheckins.slice(0, 5).map(c => ({
              date: c.check_date,
              mood: c.mood,
              connection: c.connection_score,
              question: c.question_text,
              answer: c.question_response,
            })),
          },
          partner: partnerCheckins.length > 0 ? {
            totalDays: partnerCheckins.length,
            avgMood: Math.round((partnerCheckins.map(c => MOOD_VALUES[c.mood] || 3).reduce((a, b) => a + b, 0) / partnerCheckins.length) * 10) / 10,
            avgConnection: Math.round((partnerCheckins.map(c => c.connection_score || 3).reduce((a, b) => a + b, 0) / partnerCheckins.length) * 10) / 10,
            recent: partnerCheckins.slice(0, 3).map(c => ({
              date: c.check_date,
              mood: c.mood,
              connection: c.connection_score,
              answer: c.question_response,
            })),
          } : null,
        };
      }
    } catch (e) {
      console.error('Coach context: failed to fetch check-ins', e);
    }

    // ── 5. LAST 3 COMPLETED DATES ────────────────────────────────────
    try {
      const now = new Date().toISOString();

      // From date_plans (suggested/planned dates with date_time in the past)
      const { data: plannedDates } = await supabase
        .from('date_plans')
        .select('title, date_time, status, notes')
        .eq('couple_id', coupleId)
        .in('status', ['planned', 'accepted'])
        .lt('date_time', now)
        .order('date_time', { ascending: false })
        .limit(3);

      // From custom_dates
      const { data: customDates } = await supabase
        .from('custom_dates')
        .select('title, date_time, rating, review')
        .eq('couple_id', coupleId)
        .lt('date_time', now)
        .order('date_time', { ascending: false })
        .limit(3);

      const merged = [
        ...(plannedDates || []).map(d => ({ title: d.title, date: d.date_time, source: 'planned', notes: d.notes })),
        ...(customDates || []).map(d => ({ title: d.title, date: d.date_time, source: 'custom', rating: d.rating, review: d.review })),
      ]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);

      // Next upcoming date
      const { data: nextDates } = await supabase
        .from('date_plans')
        .select('title, date_time, status')
        .eq('couple_id', coupleId)
        .in('status', ['planned', 'accepted'])
        .gte('date_time', now)
        .order('date_time', { ascending: true })
        .limit(1);

      const { data: nextCustom } = await supabase
        .from('custom_dates')
        .select('title, date_time')
        .eq('couple_id', coupleId)
        .gte('date_time', now)
        .order('date_time', { ascending: true })
        .limit(1);

      const nextCandidates = [
        ...(nextDates || []).map(d => ({ title: d.title, date: d.date_time })),
        ...(nextCustom || []).map(d => ({ title: d.title, date: d.date_time })),
      ].sort((a, b) => new Date(a.date) - new Date(b.date));

      context.dates = {
        completed: merged,
        upcoming: nextCandidates[0] || null,
      };
    } catch (e) {
      console.error('Coach context: failed to fetch dates', e);
    }

    // ── 6. LAST 5 FLIRTS ─────────────────────────────────────────────
    try {
      const { data: flirts } = await supabase
        .from('flirts')
        .select('sender_id, receiver_id, type, message, created_at, is_read')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (flirts && flirts.length > 0) {
        context.flirts = {
          recent: flirts.map(f => ({
            direction: f.sender_id === userId ? 'sent' : 'received',
            type: f.type,
            message: f.message ? f.message.slice(0, 80) : null,
            date: f.created_at,
          })),
          lastSentDate: flirts.find(f => f.sender_id === userId)?.created_at || null,
          lastReceivedDate: flirts.find(f => f.receiver_id === userId)?.created_at || null,
        };
      }
    } catch (e) {
      console.error('Coach context: failed to fetch flirts', e);
    }

    // ── 7. TIMELINE MEMORY COUNT ─────────────────────────────────────
    try {
      const { count } = await supabase
        .from('timeline_entries')
        .select('id', { count: 'exact', head: true })
        .eq('couple_id', coupleId);

      context.timeline = { memoryCount: count || 0 };
    } catch (e) {
      // Try alternate table name
      try {
        const { count } = await supabase
          .from('timeline_events')
          .select('id', { count: 'exact', head: true })
          .eq('couple_id', coupleId);

        context.timeline = { memoryCount: count || 0 };
      } catch (e2) {
        console.error('Coach context: failed to fetch timeline count', e2);
      }
    }

    // ── 8. ASSESSMENT DATA ───────────────────────────────────────────
    try {
      const { data: assessment } = await supabase
        .from('relationship_assessments')
        .select('results, completed_at')
        .eq('user_id', userId)
        .eq('couple_id', coupleId)
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
          .map(m => ({ id: m.moduleId, label: MODULE_LABELS[m.moduleId] || m.moduleId, score: Math.round(m.percentage) }));

        const strongModules = assessment.results.modules
          .filter(m => typeof m.percentage === 'number' && m.percentage >= 80)
          .map(m => ({ id: m.moduleId, label: MODULE_LABELS[m.moduleId] || m.moduleId, score: Math.round(m.percentage) }));

        context.assessment = { weakModules, strongModules };
      }
    } catch (e) {
      console.error('Coach context: failed to fetch assessment', e);
    }

  } catch (error) {
    console.error('Coach context: unexpected error in buildCoachContext', error);
  }

  return context;
}

/**
 * Format context into a readable string for the system prompt.
 * @param {object} context
 * @returns {string}
 */
export function formatContextForPrompt(context) {
  const parts = [];

  const userName = context.user?.name || 'the user';
  const partnerName = context.partner?.name || 'their partner';

  // ── COUPLE SECTION ───────────────────────────────────────────────
  parts.push(`ABOUT THIS COUPLE:`);
  parts.push(`User you're coaching: ${userName}`);

  if (context.user?.loveLanguagePrimary) {
    parts.push(`${userName}'s primary love language: ${LOVE_LANGUAGE_LABELS[context.user.loveLanguagePrimary] || context.user.loveLanguagePrimary}`);
  }
  if (context.user?.loveLanguageSecondary) {
    parts.push(`${userName}'s secondary love language: ${LOVE_LANGUAGE_LABELS[context.user.loveLanguageSecondary] || context.user.loveLanguageSecondary}`);
  }
  if (context.user?.communicationStyle) {
    parts.push(`${userName}'s communication style: ${context.user.communicationStyle}`);
  }
  if (context.user?.conflictStyle) {
    parts.push(`${userName}'s conflict style: ${context.user.conflictStyle}`);
  }

  parts.push(`\nPartner: ${partnerName}`);
  if (context.partner?.profileComplete === false) {
    parts.push(`(${partnerName} hasn't completed their profile yet — use "your partner" if name is unknown)`);
  }
  if (context.partner?.loveLanguagePrimary) {
    parts.push(`${partnerName}'s primary love language: ${LOVE_LANGUAGE_LABELS[context.partner.loveLanguagePrimary] || context.partner.loveLanguagePrimary}`);
  }
  if (context.partner?.loveLanguageSecondary) {
    parts.push(`${partnerName}'s secondary love language: ${LOVE_LANGUAGE_LABELS[context.partner.loveLanguageSecondary] || context.partner.loveLanguageSecondary}`);
  }
  if (context.partner?.communicationStyle) {
    parts.push(`${partnerName}'s communication style: ${context.partner.communicationStyle}`);
  }

  // ── HEALTH SCORE ─────────────────────────────────────────────────
  if (context.relationship?.healthScore != null) {
    parts.push(`\nRelationship health score: ${context.relationship.healthScore}/100`);
  }

  // ── CHECK-INS ────────────────────────────────────────────────────
  if (context.checkins?.user) {
    const uc = context.checkins.user;
    parts.push(`\nRecent check-ins (last ${uc.totalDays} entries):`);
    parts.push(`- ${userName}: avg mood ${uc.avgMood}/5 (${uc.avgMoodLabel}), avg connection ${uc.avgConnection}/5`);
    parts.push(`- Check-in streak: ${uc.streak} day${uc.streak !== 1 ? 's' : ''}`);
    if (uc.lastCheckinDate) {
      parts.push(`- Last checked in: ${uc.lastCheckinDate}`);
    }
    if (uc.concerns?.length > 0) {
      parts.push(`- Concerns: ${uc.concerns.map(c => c.description).join('; ')}`);
    }

    if (uc.recent?.length > 0) {
      parts.push(`Recent check-in responses from ${userName}:`);
      uc.recent.slice(0, 3).forEach(c => {
        let line = `  ${c.date}: mood=${c.mood}, connection=${c.connection}/5`;
        if (c.question && c.answer) line += ` — Q: "${c.question}" A: "${c.answer}"`;
        parts.push(line);
      });
    }

    if (context.checkins.partner) {
      const pc = context.checkins.partner;
      parts.push(`- ${partnerName}: avg mood ${pc.avgMood}/5, avg connection ${pc.avgConnection}/5 (${pc.totalDays} entries)`);
    }
  }

  // ── DATES ────────────────────────────────────────────────────────
  if (context.dates) {
    if (context.dates.upcoming) {
      const ud = context.dates.upcoming;
      parts.push(`\nUpcoming date: "${ud.title}" on ${new Date(ud.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`);
    }
    if (context.dates.completed?.length > 0) {
      parts.push(`Recent completed dates:`);
      context.dates.completed.forEach(d => {
        let line = `  - "${d.title}" (${new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
        if (d.rating) line += ` — rated ${d.rating}/5`;
        if (d.review) line += ` — "${d.review.slice(0, 100)}"`;
        parts.push(line);
      });
    }
  }

  // ── FLIRTS ───────────────────────────────────────────────────────
  if (context.flirts?.recent?.length > 0) {
    parts.push(`\nRecent flirts:`);
    context.flirts.recent.slice(0, 3).forEach(f => {
      let line = `  - ${f.direction} (${f.type}) on ${new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      if (f.message) line += `: "${f.message}"`;
      parts.push(line);
    });
  }

  // ── TIMELINE ─────────────────────────────────────────────────────
  if (context.timeline?.memoryCount > 0) {
    parts.push(`\nTimeline memories saved: ${context.timeline.memoryCount}`);
  }

  // ── ASSESSMENT ───────────────────────────────────────────────────
  if (context.assessment) {
    if (context.assessment.weakModules?.length > 0) {
      parts.push(`\nAssessment areas to work on: ${context.assessment.weakModules.map(m => `${m.label} (${m.score}%)`).join(', ')}`);
    }
    if (context.assessment.strongModules?.length > 0) {
      parts.push(`Strong areas: ${context.assessment.strongModules.map(m => m.label).join(', ')}`);
    }
  }

  return parts.join('\n');
}

/**
 * Returns the single most notable recent activity for the conversation opener and dashboard card.
 * Priority: low health → missed check-ins → completed date → flirt sent
 * @param {object} context
 * @returns {{ type: string, description: string, suggestion: string } | null}
 */
export function getRecentActivity(context) {
  // 1. Low health score
  if (context.relationship?.healthScore != null && context.relationship.healthScore < 50) {
    return {
      type: 'low_health',
      description: `Relationship health score is ${context.relationship.healthScore}/100`,
      suggestion: "It might be a good time to check in with your coach and explore what's been going on.",
    };
  }

  // 2. Missed check-ins (no check-in in last 3 days)
  if (context.checkins?.user?.lastCheckinDate) {
    const last = new Date(context.checkins.user.lastCheckinDate);
    const daysSince = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= 3) {
      return {
        type: 'missed_checkins',
        description: `Last check-in was ${daysSince} days ago`,
        suggestion: "Getting back into daily check-ins can make a big difference — even a quick one.",
      };
    }
  } else if (context.checkins?.user && context.checkins.user.totalDays === 0) {
    return {
      type: 'missed_checkins',
      description: "No recent check-ins found",
      suggestion: "Starting a daily check-in habit is one of the best things you can do for your relationship.",
    };
  }

  // 3. Most recent completed date
  if (context.dates?.completed?.length > 0) {
    const recent = context.dates.completed[0];
    const dateStr = new Date(recent.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    return {
      type: 'completed_date',
      description: `You two went on "${recent.title}" on ${dateStr}`,
      suggestion: "I'd love to hear how it went if you want to share.",
    };
  }

  // 4. Flirt sent recently
  if (context.flirts?.lastSentDate) {
    const flirtDate = new Date(context.flirts.lastSentDate);
    const daysSince = Math.floor((Date.now() - flirtDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 2) {
      return {
        type: 'flirt_sent',
        description: `You sent a flirt ${daysSince === 0 ? 'today' : `${daysSince} day${daysSince > 1 ? 's' : ''} ago`}`,
        suggestion: "Keeping those little sparks going is so good for your relationship.",
      };
    }
  }

  return null;
}

/**
 * Get conversation history for context window
 * @param {string} conversationId
 * @param {object} supabase
 * @param {number} limit
 * @returns {Promise<Array>}
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
