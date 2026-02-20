/**
 * AI Coach Context Builder
 *
 * Verified data sources only. Every fetch isolated in its own try/catch.
 * Single source of truth for assessment data: relationship_assessments table.
 */

import { createClient } from '@supabase/supabase-js';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const LOVE_LANGUAGE_MAP = {
  touch:   'Physical Touch',
  time:    'Quality Time',
  words:   'Words of Affirmation',
  acts:    'Acts of Service',
  service: 'Acts of Service',
  gifts:   'Receiving Gifts',
};

const MOOD_VALUES = {
  amazing:   5,
  great:     5,
  good:      4,
  okay:      3,
  down:      2,
  stressed:  1,
  struggling: 1,
};

const MOOD_LABELS = {
  5: 'great',
  4: 'good',
  3: 'okay',
  2: 'down',
  1: 'stressed',
};

// Relationship assessment module IDs + labels (for score analysis)
const REL_MODULE_LABELS = {
  know_your_partner:   'Know Your Partner',
  love_expressions:    'Love Expressions',
  communication:       'Communication',
  attachment_security: 'Attachment & Security',
  shared_vision:       'Shared Vision',
};

// ── HELPERS ───────────────────────────────────────────────────────────────────

/**
 * Parse love language ranking from answers.le_1 or answers.ln_1.
 * DESCENDING sort — higher number = more preferred (5 = primary).
 * Returns array of human-readable labels, primary first.
 */
function parseLoveLanguages(rankObj) {
  if (!rankObj || typeof rankObj !== 'object') return [];
  return Object.entries(rankObj)
    .filter(([, v]) => typeof v === 'number')
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => LOVE_LANGUAGE_MAP[key] || key);
}

/**
 * Parse results.modules array into a keyed object.
 * { moduleId: { headline, description, strengths, tips, percentage, strengthLevel } }
 */
function parseModules(modules) {
  if (!Array.isArray(modules)) return {};
  const out = {};
  for (const m of modules) {
    if (!m.moduleId) continue;
    out[m.moduleId] = {
      headline:      m.insights?.headline     || null,
      description:   m.insights?.description  || null,
      strengths:     m.insights?.strengths    || [],
      tips:          m.insights?.tips         || [],
      percentage:    m.percentage             ?? null,
      strengthLevel: m.strengthLevel          || null,
    };
  }
  return out;
}

/**
 * Create a Supabase admin client (service role) for auth.users lookups.
 * Returns null if env vars are missing.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────

/**
 * Build complete relationship context for the AI coach.
 * @param {string} userId   - Auth user ID of the person being coached
 * @param {string} coupleId - Couple record ID
 * @param {object} supabase - Supabase client (RLS-scoped, from API route)
 * @returns {Promise<object>}
 */
export async function buildCoachContext(userId, coupleId, supabase) {
  const context = {
    user:         { id: userId },
    partner:      {},
    relationship: { coupleId },
    checkins:     null,
    dates:        null,
    flirts:       null,
    timeline:     null,
    assessment:   null,
  };

  const admin = getAdminClient();

  // ── 1. USER NAME — auth.users raw_user_meta_data ──────────────────
  try {
    if (admin) {
      const { data: { user } } = await admin.auth.admin.getUserById(userId);
      context.user.name = user?.user_metadata?.first_name || null;
    }
    console.log('[Coach] User name from auth:', context.user.name);
  } catch (e) {
    console.error('[Coach] Failed to fetch user auth metadata:', e.message);
  }

  // ── 2. USER PREFERENCES — user_profiles ──────────────────────────
  // NOTE: Some users may have no row here. maybeSingle() prevents crash.
  try {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('display_name, preferred_checkin_time, hobbies, date_preferences, stress_response, love_language_primary')
      .eq('user_id', userId)
      .maybeSingle();

    if (userProfile) {
      if (!context.user.name) context.user.name = userProfile.display_name || null;
      context.user.preferredCheckinTime = userProfile.preferred_checkin_time || null;
      context.user.hobbies              = userProfile.hobbies               || null;
      context.user.datePreferences      = userProfile.date_preferences      || null;
      context.user.stressResponse       = userProfile.stress_response       || null;
      // Fallback love language string if assessment ranking isn't available
      context.user.loveLanguageFallback = userProfile.love_language_primary || null;
    }
    console.log('[Coach] User prefs loaded:', !!userProfile);
  } catch (e) {
    console.error('[Coach] Failed to fetch user preferences:', e.message);
  }

  // ── 3. COUPLE — resolve partner ID ───────────────────────────────
  let partnerId = null;
  try {
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle();

    if (couple) {
      partnerId = couple.user1_id === userId ? couple.user2_id : couple.user1_id;
    }
    console.log('[Coach] Partner ID:', partnerId);
  } catch (e) {
    console.error('[Coach] Failed to fetch couple:', e.message);
  }

  // ── 4. PARTNER NAME — auth.users, then user_profiles fallback ────
  if (partnerId) {
    try {
      if (admin) {
        const { data: { user: partnerUser } } = await admin.auth.admin.getUserById(partnerId);
        context.partner.name = partnerUser?.user_metadata?.first_name || null;
      }
      console.log('[Coach] Partner name from auth:', context.partner.name);
    } catch (e) {
      console.error('[Coach] Failed to fetch partner auth metadata:', e.message);
    }

    if (!context.partner.name) {
      try {
        const { data: partnerProfile } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('user_id', partnerId)
          .maybeSingle();
        if (partnerProfile?.display_name) {
          context.partner.name = partnerProfile.display_name;
        }
      } catch (e) { /* silent fallback */ }
    }
  }

  // ── 5. RELATIONSHIP HEALTH SCORE ─────────────────────────────────
  try {
    const { data: health } = await supabase
      .from('relationship_health')
      .select('score, overall_score')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (health) {
      context.relationship.healthScore = health.overall_score ?? health.score ?? null;
    }
    console.log('[Coach] Health score:', context.relationship.healthScore);
  } catch (e) {
    console.error('[Coach] Failed to fetch health score:', e.message);
  }

  // ── 6. ASSESSMENT DATA — relationship_assessments (single source) ─
  // answers.le_1 (primary key) or answers.ln_1 (fallback)
  // Higher number = more preferred (5 = primary love language)
  // results.modules = array of personality + relationship score modules
  try {
    const fetchAssessment = (uid) => supabase
      .from('relationship_assessments')
      .select('answers, results, completed_at')
      .eq('user_id', uid)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => data);

    const [userAssessment, partnerAssessment] = await Promise.all([
      fetchAssessment(userId).catch(() => null),
      partnerId ? fetchAssessment(partnerId).catch(() => null) : Promise.resolve(null),
    ]);

    console.log('[Coach] ASSESSMENT RAW:', JSON.stringify(userAssessment, null, 2));

    // User love languages
    const userLlRaw = userAssessment?.answers?.le_1 || userAssessment?.answers?.ln_1;
    console.log('[Coach] LN1 DATA:', userLlRaw);
    const userLoveLangs = parseLoveLanguages(userLlRaw);
    console.log('[Coach] PARSED LOVE LANGUAGE:', userLoveLangs);
    if (userLoveLangs.length > 0) {
      context.user.loveLanguages       = userLoveLangs;
      context.user.loveLanguagePrimary  = userLoveLangs[0];
      context.user.loveLanguageSecondary = userLoveLangs[1] || null;
    }

    // Partner love languages
    const partnerLlRaw = partnerAssessment?.answers?.le_1 || partnerAssessment?.answers?.ln_1;
    const partnerLoveLangs = parseLoveLanguages(partnerLlRaw);
    if (partnerLoveLangs.length > 0) {
      context.partner.loveLanguages        = partnerLoveLangs;
      context.partner.loveLanguagePrimary  = partnerLoveLangs[0];
      context.partner.loveLanguageSecondary = partnerLoveLangs[1] || null;
    }

    // Parse all modules from results.modules (keyed by moduleId)
    const userModules    = parseModules(userAssessment?.results?.modules);
    const partnerModules = parseModules(partnerAssessment?.results?.modules);

    // Relationship score modules subset (for weak/strong coaching insights)
    const toRelModules = (allMods) =>
      Object.keys(REL_MODULE_LABELS)
        .filter(id => allMods[id])
        .map(id => ({ ...allMods[id], id, label: REL_MODULE_LABELS[id] }));

    const userRelMods    = toRelModules(userModules);
    const partnerRelMods = toRelModules(partnerModules);

    context.assessment = {
      user: {
        modules:            userModules,
        overallPercentage:  userAssessment?.results?.overallPercentage ?? null,
        weakModules:        userRelMods.filter(m => m.percentage != null && m.percentage < 70).sort((a, b) => a.percentage - b.percentage),
        strongModules:      userRelMods.filter(m => m.percentage != null && m.percentage >= 80),
      },
      partner: {
        modules:            partnerModules,
        overallPercentage:  partnerAssessment?.results?.overallPercentage ?? null,
        weakModules:        partnerRelMods.filter(m => m.percentage != null && m.percentage < 70).sort((a, b) => a.percentage - b.percentage),
        strongModules:      partnerRelMods.filter(m => m.percentage != null && m.percentage >= 80),
      },
    };
  } catch (e) {
    console.error('[Coach] Failed to fetch assessment data:', e.message);
  }

  // ── 7. LAST 10 CHECK-INS ─────────────────────────────────────────
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
      try {
        const { data: pc } = await supabase
          .from('daily_checkins')
          .select('check_date, mood, connection_score, question_text, question_response')
          .eq('user_id', partnerId)
          .eq('couple_id', coupleId)
          .order('check_date', { ascending: false })
          .limit(10);
        partnerCheckins = pc || [];
      } catch (e) {
        console.error('[Coach] Failed to fetch partner check-ins:', e.message);
      }
    }

    if (userCheckins?.length > 0) {
      const moodVals = userCheckins.map(c => MOOD_VALUES[c.mood] || 3);
      const connVals = userCheckins.map(c => c.connection_score || 3);
      const avgMood  = Math.round((moodVals.reduce((a, b) => a + b, 0) / moodVals.length) * 10) / 10;
      const avgConn  = Math.round((connVals.reduce((a, b) => a + b, 0) / connVals.length) * 10) / 10;

      const today  = new Date().toISOString().split('T')[0];
      const sorted = [...userCheckins].sort((a, b) => new Date(b.check_date) - new Date(a.check_date));

      let streak = 0;
      if (sorted[0]?.check_date === today) {
        streak = 1;
        const expected = new Date(today);
        for (let i = 1; i < sorted.length; i++) {
          expected.setDate(expected.getDate() - 1);
          if (sorted[i].check_date === expected.toISOString().split('T')[0]) streak++;
          else break;
        }
      }

      const concerns = [];
      let consecutiveStress = 0;
      for (const c of sorted) {
        if (MOOD_VALUES[c.mood] <= 2) consecutiveStress++;
        else break;
      }
      if (consecutiveStress >= 3) {
        concerns.push({ type: 'consecutive_stress', description: `Stressed or down for ${consecutiveStress} consecutive days` });
      }
      const lowConnDays = userCheckins.filter(c => (c.connection_score || 3) < 3).length;
      if (lowConnDays >= 3) {
        concerns.push({ type: 'low_connection', description: `Connection below 3 for ${lowConnDays} of last ${userCheckins.length} days` });
      }

      context.checkins = {
        user: {
          totalDays:       userCheckins.length,
          avgMood,
          avgMoodLabel:    MOOD_LABELS[Math.round(avgMood)] || 'okay',
          avgConnection:   avgConn,
          streak,
          lastCheckinDate: sorted[0]?.check_date || null,
          concerns,
          recent: userCheckins.slice(0, 5).map(c => ({
            date:       c.check_date,
            mood:       c.mood,
            connection: c.connection_score,
            question:   c.question_text,
            answer:     c.question_response,
          })),
        },
        partner: partnerCheckins.length > 0 ? {
          totalDays:     partnerCheckins.length,
          avgMood:       Math.round((partnerCheckins.map(c => MOOD_VALUES[c.mood] || 3).reduce((a, b) => a + b, 0) / partnerCheckins.length) * 10) / 10,
          avgConnection: Math.round((partnerCheckins.map(c => c.connection_score || 3).reduce((a, b) => a + b, 0) / partnerCheckins.length) * 10) / 10,
          recent: partnerCheckins.slice(0, 3).map(c => ({
            date: c.check_date, mood: c.mood, connection: c.connection_score, answer: c.question_response,
          })),
        } : null,
      };
    }
  } catch (e) {
    console.error('[Coach] Failed to fetch check-ins:', e.message);
  }

  // ── 8. DATES (completed + upcoming) ──────────────────────────────
  try {
    const now = new Date().toISOString();

    const [plannedRes, customRes, nextPlannedRes, nextCustomRes] = await Promise.allSettled([
      supabase.from('date_plans').select('title, date_time, notes').eq('couple_id', coupleId).in('status', ['planned', 'accepted']).lt('date_time', now).order('date_time', { ascending: false }).limit(3),
      supabase.from('custom_dates').select('title, date_time, rating, review').eq('couple_id', coupleId).lt('date_time', now).order('date_time', { ascending: false }).limit(3),
      supabase.from('date_plans').select('title, date_time').eq('couple_id', coupleId).in('status', ['planned', 'accepted']).gte('date_time', now).order('date_time', { ascending: true }).limit(1),
      supabase.from('custom_dates').select('title, date_time').eq('couple_id', coupleId).gte('date_time', now).order('date_time', { ascending: true }).limit(1),
    ]);

    const plannedDates    = plannedRes.status     === 'fulfilled' ? plannedRes.value.data     || [] : [];
    const customDates     = customRes.status      === 'fulfilled' ? customRes.value.data      || [] : [];
    const nextPlannedDates = nextPlannedRes.status === 'fulfilled' ? nextPlannedRes.value.data || [] : [];
    const nextCustomDates  = nextCustomRes.status  === 'fulfilled' ? nextCustomRes.value.data  || [] : [];

    const completed = [
      ...plannedDates.map(d => ({ title: d.title, date: d.date_time, notes: d.notes })),
      ...customDates.map(d => ({ title: d.title, date: d.date_time, rating: d.rating, review: d.review })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);

    const nextRaw = [...nextPlannedDates, ...nextCustomDates]
      .sort((a, b) => new Date(a.date_time) - new Date(b.date_time))[0] || null;

    context.dates = {
      completed,
      upcoming: nextRaw ? { title: nextRaw.title, date: nextRaw.date_time } : null,
    };
  } catch (e) {
    console.error('[Coach] Failed to fetch dates:', e.message);
  }

  // ── 9. LAST 5 FLIRTS ─────────────────────────────────────────────
  try {
    const { data: flirts } = await supabase
      .from('flirts')
      .select('sender_id, receiver_id, type, message, created_at')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (flirts?.length > 0) {
      context.flirts = {
        recent: flirts.map(f => ({
          direction: f.sender_id === userId ? 'sent' : 'received',
          type:      f.type,
          message:   f.message ? f.message.slice(0, 80) : null,
          date:      f.created_at,
        })),
        lastSentDate:     flirts.find(f => f.sender_id   === userId)?.created_at || null,
        lastReceivedDate: flirts.find(f => f.receiver_id === userId)?.created_at || null,
      };
    }
  } catch (e) {
    console.error('[Coach] Failed to fetch flirts:', e.message);
  }

  // ── 10. TIMELINE COUNT ────────────────────────────────────────────
  try {
    const { count } = await supabase
      .from('timeline_events')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', coupleId);
    context.timeline = { memoryCount: count || 0 };
    console.log('[Coach] Timeline count:', count);
  } catch (e) {
    console.error('[Coach] Failed to fetch timeline count:', e.message);
  }

  return context;
}

// ── FORMAT FOR PROMPT ─────────────────────────────────────────────────────────

/**
 * Format context into a readable persona-style string for the system prompt.
 * @param {object} context
 * @returns {string}
 */
export function formatContextForPrompt(context) {
  const parts = [];

  const userName    = context.user?.name    || 'the user';
  const partnerName = context.partner?.name || 'their partner';

  // Coaching header
  parts.push(`You are coaching: ${userName.toUpperCase()}`);
  if (context.user?.name) {
    parts.push(`Always use their first name "${context.user.name}" in conversation — never "the user".`);
  }

  // ── USER PERSONA ─────────────────────────────────────────────────
  parts.push(`\n${userName.toUpperCase()}:`);

  const userLL = context.user?.loveLanguages;
  if (userLL?.length >= 2) {
    parts.push(`- Love Languages: ${userLL[0]} (primary), ${userLL[1]} (secondary)`);
  } else if (userLL?.length === 1) {
    parts.push(`- Love Languages: ${userLL[0]} (primary)`);
  } else if (context.user?.loveLanguageFallback) {
    parts.push(`- Love Language: ${context.user.loveLanguageFallback}`);
  }

  const um = context.assessment?.user?.modules;
  if (um) {
    if (um.processing_style?.headline)  parts.push(`- Personality: ${um.processing_style.headline}`);
    if (um.emotional_patterns?.headline) parts.push(`- Emotional Style: ${um.emotional_patterns.headline}`);
    if (um.connection_style?.headline)  parts.push(`- Connection: ${um.connection_style.headline}`);
    if (um.love_needs?.headline)        parts.push(`- Love needs: ${um.love_needs.headline}`);
    if (um.core_values?.headline) {
      const vals = um.core_values.strengths?.length > 0
        ? um.core_values.strengths.slice(0, 3).join(', ')
        : um.core_values.headline;
      parts.push(`- Core values: ${vals}`);
    }
  }

  if (context.user?.stressResponse) {
    parts.push(`- Stress response: ${context.user.stressResponse}`);
  }
  if (context.user?.hobbies) {
    const h = Array.isArray(context.user.hobbies) ? context.user.hobbies.join(', ') : context.user.hobbies;
    parts.push(`- Interests: ${h}`);
  }

  // ── PARTNER PERSONA ───────────────────────────────────────────────
  parts.push(`\n${partnerName.toUpperCase()}:`);

  const partnerLL = context.partner?.loveLanguages;
  if (partnerLL?.length >= 2) {
    parts.push(`- Love Languages: ${partnerLL[0]} (primary), ${partnerLL[1]} (secondary)`);
  } else if (partnerLL?.length === 1) {
    parts.push(`- Love Languages: ${partnerLL[0]} (primary)`);
  } else {
    parts.push(`- (${partnerName} hasn't completed their assessment yet)`);
  }

  const pm = context.assessment?.partner?.modules;
  if (pm) {
    if (pm.processing_style?.headline)  parts.push(`- Personality: ${pm.processing_style.headline}`);
    if (pm.emotional_patterns?.headline) parts.push(`- Emotional Style: ${pm.emotional_patterns.headline}`);
    if (pm.connection_style?.headline)  parts.push(`- Connection: ${pm.connection_style.headline}`);
    if (pm.love_needs?.headline)        parts.push(`- Love needs: ${pm.love_needs.headline}`);
    if (pm.core_values?.headline) {
      const vals = pm.core_values.strengths?.length > 0
        ? pm.core_values.strengths.slice(0, 3).join(', ')
        : pm.core_values.headline;
      parts.push(`- Core values: ${vals}`);
    }
  }

  // ── RELATIONSHIP HEALTH ───────────────────────────────────────────
  if (context.relationship?.healthScore != null) {
    parts.push(`\nRelationship health: ${context.relationship.healthScore}/100`);
  }

  // ── ASSESSMENT SCORES ─────────────────────────────────────────────
  const ua = context.assessment?.user;
  if (ua?.overallPercentage != null) {
    parts.push(`\nRelationship assessment (${userName}): ${ua.overallPercentage}% overall`);
  }
  if (ua?.strongModules?.length > 0) {
    parts.push(`  Strengths: ${ua.strongModules.map(m => `${m.label} (${m.percentage}%${m.headline ? ` — "${m.headline}"` : ''})`).join('; ')}`);
  }
  if (ua?.weakModules?.length > 0) {
    parts.push(`  Growth areas: ${ua.weakModules.map(m => `${m.label} (${m.percentage}%${m.headline ? ` — "${m.headline}"` : ''})`).join('; ')}`);
  }
  if (context.assessment?.partner?.weakModules?.length > 0) {
    parts.push(`  ${partnerName}'s growth areas: ${context.assessment.partner.weakModules.map(m => m.label).join(', ')}`);
  }

  // ── CHECK-INS ────────────────────────────────────────────────────
  if (context.checkins?.user) {
    const uc = context.checkins.user;
    parts.push(`\nRecent check-ins (last ${uc.totalDays}):`);
    parts.push(`  ${userName}: avg mood ${uc.avgMood}/5 (${uc.avgMoodLabel}), avg connection ${uc.avgConnection}/5, streak ${uc.streak} day${uc.streak !== 1 ? 's' : ''}`);
    if (uc.lastCheckinDate) parts.push(`  Last check-in: ${uc.lastCheckinDate}`);
    if (uc.concerns?.length > 0) {
      parts.push(`  Concerns: ${uc.concerns.map(c => c.description).join('; ')}`);
    }
    if (uc.recent?.length > 0) {
      parts.push(`  Recent responses:`);
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
  if (context.dates?.upcoming) {
    const ud = context.dates.upcoming;
    parts.push(`\nUpcoming date: "${ud.title}" on ${new Date(ud.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`);
  }
  if (context.dates?.completed?.length > 0) {
    parts.push(`Recent dates:`);
    context.dates.completed.forEach(d => {
      let line = `  - "${d.title}" (${new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
      if (d.rating) line += ` — rated ${d.rating}/5`;
      if (d.review) line += ` — "${d.review.slice(0, 100)}"`;
      parts.push(line);
    });
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
    parts.push(`\nTimeline memories: ${context.timeline.memoryCount}`);
  }

  const formattedContext = parts.join('\n');
  console.log('[Coach] FINAL CONTEXT:', formattedContext);
  return formattedContext;
}

// ── RECENT ACTIVITY ───────────────────────────────────────────────────────────

/**
 * Returns the single most notable recent activity for the coach opener + dashboard card.
 * Priority: low health → missed check-ins → completed date → flirt sent
 * @param {object} context
 * @returns {{ type: string, description: string, suggestion: string } | null}
 */
export function getRecentActivity(context) {
  // 1. Low health score
  if (context.relationship?.healthScore != null && context.relationship.healthScore < 50) {
    return {
      type:        'low_health',
      description: `Relationship health score is ${context.relationship.healthScore}/100`,
      suggestion:  "It might be a good time to check in with your coach and explore what's been going on.",
    };
  }

  // 2. Missed check-ins
  if (context.checkins?.user?.lastCheckinDate) {
    const daysSince = Math.floor((Date.now() - new Date(context.checkins.user.lastCheckinDate).getTime()) / 86400000);
    if (daysSince >= 3) {
      return {
        type:        'missed_checkins',
        description: `Last check-in was ${daysSince} days ago`,
        suggestion:  "Getting back into daily check-ins can make a big difference — even a quick one.",
      };
    }
  }

  // 3. Most recent completed date
  if (context.dates?.completed?.length > 0) {
    const recent  = context.dates.completed[0];
    const dateStr = new Date(recent.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    return {
      type:        'completed_date',
      description: `You two went on "${recent.title}" on ${dateStr}`,
      suggestion:  "I'd love to hear how it went if you want to share.",
    };
  }

  // 4. Flirt sent recently
  if (context.flirts?.lastSentDate) {
    const daysSince = Math.floor((Date.now() - new Date(context.flirts.lastSentDate).getTime()) / 86400000);
    if (daysSince <= 2) {
      return {
        type:        'flirt_sent',
        description: `You sent a flirt ${daysSince === 0 ? 'today' : `${daysSince} day${daysSince > 1 ? 's' : ''} ago`}`,
        suggestion:  "Keeping those little sparks going is so good for your relationship.",
      };
    }
  }

  return null;
}

// ── CONVERSATION HISTORY ──────────────────────────────────────────────────────

/**
 * Get conversation history for context window.
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
    console.error('[Coach] Error fetching conversation history:', error);
    return [];
  }

  return messages || [];
}
