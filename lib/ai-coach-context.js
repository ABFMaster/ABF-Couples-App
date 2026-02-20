/**
 * AI Coach Context Builder
 *
 * Builds rich relationship context for the AI coach system prompt.
 * Single source of truth for assessment data: relationship_assessments table.
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

// All module IDs and their display labels (relationship + personality)
const MODULE_LABELS = {
  // Relationship assessment modules
  know_your_partner: 'Know Your Partner',
  love_expressions: 'Love Expressions',
  communication: 'Communication',
  attachment_security: 'Attachment & Security',
  shared_vision: 'Shared Vision',
  // Individual personality modules
  processing_style: 'Processing Style',
  emotional_patterns: 'Emotional Patterns',
  connection_style: 'Connection Style',
  core_values: 'Core Values',
  love_needs: 'Love Needs',
};

const RELATIONSHIP_MODULE_IDS = [
  'know_your_partner', 'love_expressions', 'communication', 'attachment_security', 'shared_vision',
];

/**
 * Parse love language ranking from an `ln_1` answer object.
 * DESCENDING sort: higher number = stronger preference (5 = primary).
 * Returns array of language keys sorted primary → least preferred.
 */
function parseLoveLanguageRanking(rankObj) {
  console.log('LN1 DATA:', rankObj);
  if (!rankObj || typeof rankObj !== 'object') return [];
  const parsed = Object.entries(rankObj)
    .filter(([, v]) => typeof v === 'number')
    .sort((a, b) => b[1] - a[1])  // DESCENDING: 5 = primary
    .map(([key]) => key === 'service' ? 'acts' : key);
  console.log('PARSED LOVE LANGUAGE:', parsed);
  return parsed;
}

/**
 * Parse all modules from results.modules into a keyed object.
 * Works for both relationship modules and personality modules.
 */
function parseModules(modules) {
  if (!Array.isArray(modules)) return {};
  const out = {};
  for (const m of modules) {
    if (!m.moduleId) continue;
    out[m.moduleId] = {
      label: MODULE_LABELS[m.moduleId] || m.moduleId,
      headline: m.insights?.headline || null,
      description: m.insights?.description || null,
      strengths: m.insights?.strengths || [],
      tips: m.insights?.tips || [],
      percentage: m.percentage ?? null,
      strengthLevel: m.strengthLevel || null,
    };
  }
  return out;
}

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
    // ── 1. USER NAME (from profiles table, keyed by auth user id) ────
    try {
      const { data: userBasicProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (userBasicProfile) {
        context.user.name =
          userBasicProfile.first_name ||
          userBasicProfile.firstName ||
          userBasicProfile.display_name ||
          userBasicProfile.name ||
          null;
      }
    } catch (e) {
      console.error('Coach context: failed to fetch user basic profile', e);
    }

    // ── 2. USER PREFERENCES (user_profiles — lightweight prefs only) ──
    // NOTE: Love language + personality data come exclusively from relationship_assessments.
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('display_name, preferred_checkin_time, hobbies, date_preferences, stress_response')
        .eq('user_id', userId)
        .single();

      if (userProfile) {
        // Name fallback if profiles table didn't have it
        if (!context.user.name && userProfile.display_name) {
          context.user.name = userProfile.display_name;
        }
        context.user.preferredCheckinTime = userProfile.preferred_checkin_time || null;
        context.user.hobbies = userProfile.hobbies || null;
        context.user.datePreferences = userProfile.date_preferences || null;
        context.user.stressResponse = userProfile.stress_response || null;
      }
    } catch (e) {
      console.error('Coach context: failed to fetch user preferences', e);
    }

    // ── 3. COUPLE + PARTNER PROFILE ──────────────────────────────────
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
      // Partner name from profiles table
      try {
        const { data: partnerBasicProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', partnerId)
          .single();

        if (partnerBasicProfile) {
          context.partner.name =
            partnerBasicProfile.first_name ||
            partnerBasicProfile.firstName ||
            partnerBasicProfile.display_name ||
            partnerBasicProfile.name ||
            null;
        }
      } catch (e) {
        console.error('Coach context: failed to fetch partner basic profile', e);
      }

      // Partner display_name fallback from user_profiles
      if (!context.partner.name) {
        try {
          const { data: partnerUserProfile } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', partnerId)
            .single();
          if (partnerUserProfile?.display_name) {
            context.partner.name = partnerUserProfile.display_name;
          }
        } catch (e) { /* ignore */ }
      }
    }

    // ── 4. RELATIONSHIP HEALTH SCORE ─────────────────────────────────
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

    // ── 5. LAST 10 CHECK-INS (user + partner) ────────────────────────
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

    // ── 6. LAST 3 COMPLETED DATES ────────────────────────────────────
    try {
      const now = new Date().toISOString();

      const { data: plannedDates } = await supabase
        .from('date_plans')
        .select('title, date_time, status, notes')
        .eq('couple_id', coupleId)
        .in('status', ['planned', 'accepted'])
        .lt('date_time', now)
        .order('date_time', { ascending: false })
        .limit(3);

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

    // ── 7. LAST 5 FLIRTS ─────────────────────────────────────────────
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

    // ── 8. TIMELINE MEMORY COUNT ─────────────────────────────────────
    try {
      const { count } = await supabase
        .from('timeline_entries')
        .select('id', { count: 'exact', head: true })
        .eq('couple_id', coupleId);

      context.timeline = { memoryCount: count || 0 };
    } catch (e) {
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

    // ── 9. ASSESSMENT DATA (single source of truth) ───────────────────
    // relationship_assessments.answers.ln_1 = love language ranking (DESCENDING, 5=primary)
    // relationship_assessments.results.modules = relationship + personality module insights
    try {
      const assessmentQuery = (uid) => supabase
        .from('relationship_assessments')
        .select('answers, results, completed_at')
        .eq('user_id', uid)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      const [userAssessmentResult, partnerAssessmentResult] = await Promise.all([
        assessmentQuery(userId).catch(() => ({ data: null })),
        partnerId ? assessmentQuery(partnerId).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
      ]);

      const userAssessment = userAssessmentResult?.data;
      const partnerAssessment = partnerAssessmentResult?.data;

      console.log('ASSESSMENT RAW:', JSON.stringify(userAssessment, null, 2));

      // User: love languages from ln_1 (descending sort — 5 = primary)
      if (userAssessment?.answers?.ln_1) {
        const ranked = parseLoveLanguageRanking(userAssessment.answers.ln_1);
        context.user.loveLanguageRanked = ranked;
        context.user.loveLanguagePrimary = ranked[0] || null;
        context.user.loveLanguageSecondary = ranked[1] || null;
      }

      // Partner: love languages from ln_1
      if (partnerAssessment?.answers?.ln_1) {
        const ranked = parseLoveLanguageRanking(partnerAssessment.answers.ln_1);
        context.partner.loveLanguageRanked = ranked;
        context.partner.loveLanguagePrimary = ranked[0] || null;
        context.partner.loveLanguageSecondary = ranked[1] || null;
      }

      // Parse all modules (relationship + personality) into keyed objects
      const userModules = parseModules(userAssessment?.results?.modules);
      const partnerModules = parseModules(partnerAssessment?.results?.modules);

      // Relationship modules subset (for scores / weak/strong analysis)
      const userRelModules = RELATIONSHIP_MODULE_IDS
        .filter(id => userModules[id])
        .map(id => userModules[id]);
      const partnerRelModules = RELATIONSHIP_MODULE_IDS
        .filter(id => partnerModules[id])
        .map(id => partnerModules[id]);

      context.assessment = {
        user: {
          allModules: userModules,
          relationshipModules: userRelModules,
          overallPercentage: userAssessment?.results?.overallPercentage ?? null,
          weakModules: userRelModules
            .filter(m => m.percentage != null && m.percentage < 70)
            .sort((a, b) => a.percentage - b.percentage),
          strongModules: userRelModules
            .filter(m => m.percentage != null && m.percentage >= 80),
        },
        partner: {
          allModules: partnerModules,
          relationshipModules: partnerRelModules,
          overallPercentage: partnerAssessment?.results?.overallPercentage ?? null,
          weakModules: partnerRelModules
            .filter(m => m.percentage != null && m.percentage < 70)
            .sort((a, b) => a.percentage - b.percentage),
          strongModules: partnerRelModules
            .filter(m => m.percentage != null && m.percentage >= 80),
        },
      };
    } catch (e) {
      console.error('Coach context: failed to fetch assessment data', e);
    }

    // ── 10. FIRST NAME FALLBACK — onboarding_responses ───────────────
    if (!context.user.name) {
      try {
        const { data: onboarding } = await supabase
          .from('onboarding_responses')
          .select('first_name, name')
          .eq('user_id', userId)
          .single();
        if (onboarding) {
          context.user.name = onboarding.first_name || onboarding.name || null;
        }
      } catch (e) { /* table may not exist */ }
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

  // ── COUPLE OVERVIEW ───────────────────────────────────────────────
  parts.push(`ABOUT THIS COUPLE:`);
  parts.push(`User you're coaching: ${userName}`);
  if (context.user?.name) {
    parts.push(`IMPORTANT: Always address this person by their first name "${context.user.name}" — never as "the user".`);
  }
  parts.push(`Partner: ${partnerName}`);

  // ── USER PERSONA ─────────────────────────────────────────────────
  parts.push(`\n${userName}'s profile:`);

  if (context.user?.loveLanguageRanked?.length > 0) {
    const ranked = context.user.loveLanguageRanked;
    parts.push(`  Love languages: ${ranked.map((k, i) => `${i + 1}. ${LOVE_LANGUAGE_LABELS[k] || k}`).join(', ')}`);
  } else if (context.user?.loveLanguagePrimary) {
    parts.push(`  Primary love language: ${LOVE_LANGUAGE_LABELS[context.user.loveLanguagePrimary] || context.user.loveLanguagePrimary}`);
  }

  // Personality modules from assessment (connection_style, emotional_patterns, etc.)
  const uam = context.assessment?.user?.allModules;
  if (uam) {
    if (uam.connection_style?.headline) {
      parts.push(`  Connection style: ${uam.connection_style.headline}${uam.connection_style.description ? ` — ${uam.connection_style.description}` : ''}`);
    }
    if (uam.emotional_patterns?.headline) {
      parts.push(`  Emotional pattern: ${uam.emotional_patterns.headline}${uam.emotional_patterns.description ? ` — ${uam.emotional_patterns.description}` : ''}`);
    }
    if (uam.processing_style?.headline) {
      parts.push(`  Processing style: ${uam.processing_style.headline}`);
    }
    if (uam.core_values?.headline) {
      const vals = uam.core_values.strengths?.length > 0
        ? uam.core_values.strengths.slice(0, 3).join(', ')
        : uam.core_values.headline;
      parts.push(`  Core values: ${vals}`);
    }
    if (uam.love_needs?.headline) {
      parts.push(`  Love needs: ${uam.love_needs.headline}`);
    }
  }

  if (context.user?.hobbies) {
    parts.push(`  Interests: ${Array.isArray(context.user.hobbies) ? context.user.hobbies.join(', ') : context.user.hobbies}`);
  }
  if (context.user?.stressResponse) {
    parts.push(`  Stress response: ${context.user.stressResponse}`);
  }

  // ── PARTNER PERSONA ───────────────────────────────────────────────
  parts.push(`\n${partnerName}'s profile:`);

  if (context.partner?.loveLanguageRanked?.length > 0) {
    const ranked = context.partner.loveLanguageRanked;
    parts.push(`  Love languages: ${ranked.map((k, i) => `${i + 1}. ${LOVE_LANGUAGE_LABELS[k] || k}`).join(', ')}`);
  } else if (context.partner?.loveLanguagePrimary) {
    parts.push(`  Primary love language: ${LOVE_LANGUAGE_LABELS[context.partner.loveLanguagePrimary] || context.partner.loveLanguagePrimary}`);
  } else {
    parts.push(`  (${partnerName} hasn't completed their assessment yet)`);
  }

  const pam = context.assessment?.partner?.allModules;
  if (pam) {
    if (pam.connection_style?.headline) {
      parts.push(`  Connection style: ${pam.connection_style.headline}${pam.connection_style.description ? ` — ${pam.connection_style.description}` : ''}`);
    }
    if (pam.emotional_patterns?.headline) {
      parts.push(`  Emotional pattern: ${pam.emotional_patterns.headline}`);
    }
    if (pam.core_values?.headline) {
      const vals = pam.core_values.strengths?.length > 0
        ? pam.core_values.strengths.slice(0, 3).join(', ')
        : pam.core_values.headline;
      parts.push(`  Core values: ${vals}`);
    }
  }

  // ── HEALTH SCORE ─────────────────────────────────────────────────
  if (context.relationship?.healthScore != null) {
    parts.push(`\nRelationship health score: ${context.relationship.healthScore}/100`);
  }

  // ── RELATIONSHIP ASSESSMENT SCORES ───────────────────────────────
  if (context.assessment?.user) {
    const ua = context.assessment.user;
    if (ua.overallPercentage != null) {
      parts.push(`\nRelationship assessment (${userName}): ${ua.overallPercentage}% overall`);
    }
    if (ua.strongModules?.length > 0) {
      parts.push(`  Strengths: ${ua.strongModules.map(m => `${m.label} (${m.percentage}%${m.headline ? ` — "${m.headline}"` : ''})`).join('; ')}`);
    }
    if (ua.weakModules?.length > 0) {
      parts.push(`  Growth areas: ${ua.weakModules.map(m => `${m.label} (${m.percentage}%${m.headline ? ` — "${m.headline}"` : ''})`).join('; ')}`);
    }
    if (context.assessment.partner?.weakModules?.length > 0) {
      parts.push(`  ${partnerName}'s growth areas: ${context.assessment.partner.weakModules.map(m => m.label).join(', ')}`);
    }
  }

  // ── CHECK-INS ────────────────────────────────────────────────────
  if (context.checkins?.user) {
    const uc = context.checkins.user;
    parts.push(`\nRecent check-ins (last ${uc.totalDays} entries):`);
    parts.push(`  ${userName}: avg mood ${uc.avgMood}/5 (${uc.avgMoodLabel}), avg connection ${uc.avgConnection}/5, streak ${uc.streak} day${uc.streak !== 1 ? 's' : ''}`);
    if (uc.lastCheckinDate) parts.push(`  Last check-in: ${uc.lastCheckinDate}`);
    if (uc.concerns?.length > 0) {
      parts.push(`  Concerns: ${uc.concerns.map(c => c.description).join('; ')}`);
    }
    if (uc.recent?.length > 0) {
      parts.push(`  Recent responses from ${userName}:`);
      uc.recent.slice(0, 3).forEach(c => {
        let line = `    ${c.date}: mood=${c.mood}, connection=${c.connection}/5`;
        if (c.question && c.answer) line += ` — Q: "${c.question}" A: "${c.answer}"`;
        parts.push(line);
      });
    }
    if (context.checkins.partner) {
      const pc = context.checkins.partner;
      parts.push(`  ${partnerName}: avg mood ${pc.avgMood}/5, avg connection ${pc.avgConnection}/5 (${pc.totalDays} entries)`);
    }
  }

  // ── DATES ────────────────────────────────────────────────────────
  if (context.dates) {
    if (context.dates.upcoming) {
      const ud = context.dates.upcoming;
      parts.push(`\nUpcoming date: "${ud.title}" on ${new Date(ud.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`);
    }
    if (context.dates.completed?.length > 0) {
      parts.push(`Recent dates:`);
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

  const formattedContext = parts.join('\n');
  console.log('FINAL CONTEXT:', formattedContext);
  return formattedContext;
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
