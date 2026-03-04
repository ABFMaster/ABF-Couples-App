/**
 * Nora Trigger System
 *
 * Generates contextual opening messages for Nora (ABF's relationship coach)
 * based on real-time user data. Used by the dashboard hero card and coach cold open.
 */

import { supabase } from '@/lib/supabase';

const MOOD_VALUES = {
  amazing: 5, great: 5, good: 4, okay: 3, down: 2, stressed: 1, struggling: 1,
};

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

/**
 * Generate a contextual Nora opening trigger.
 *
 * Checks in priority order:
 *   P1 — attachment or conflict assessment completed in last 24h (most recent wins)
 *   P1 — low check-in mood (≤2) or connection score (≤2) in last check-in
 *   P2 — no check-in in 3+ days
 *   P3 — dream trip added in last 3 days
 *   P5 — default time-of-day greeting
 *
 * @param {string} userId
 * @param {string} coupleId
 * @param {string|null} userName     - Display name
 * @param {string|null} partnerName  - Partner display name
 * @returns {Promise<{ trigger: string, message: string, priority: number }>}
 */
export async function generateNoraTrigger(userId, coupleId, userName, partnerName) {
  const name    = userName    || null;
  const partner = partnerName || 'your partner';
  const t       = getTimeGreeting();
  const now     = new Date();
  const yesterday    = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // ── Priority 1: Assessment completed in last 24h ─────────────────────────
  // Fetch both in parallel and pick whichever completed more recently.
  try {
    const [attData, confData] = await Promise.all([
      supabase
        .from('attachment_assessments')
        .select('completed_at, primary_style')
        .eq('user_id', userId)
        .gte('completed_at', yesterday)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => data)
        .catch(() => null),

      supabase
        .from('conflict_assessments')
        .select('completed_at, primary_style')
        .eq('user_id', userId)
        .gte('completed_at', yesterday)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => data)
        .catch(() => null),
    ]);

    if (attData || confData) {
      // Pick the one with the more recent completed_at
      const useAtt = !confData || (attData && new Date(attData.completed_at) >= new Date(confData.completed_at));
      const record = useAtt ? attData : confData;
      const style  = record?.primary_style || null;

      if (useAtt && attData) {
        const styleLabel = style ? `you're ${style}` : 'your results are in';
        return {
          trigger: 'attachment_completed',
          priority: 1,
          message: name
            ? `Good ${t}, ${name}. You just found out ${styleLabel} — that's worth a conversation. Want to dig into what it means for you and ${partner}?`
            : `Good ${t}. Your attachment results just came in${style ? ` — ${style}` : ''}. Want to dig into what it means for your relationship?`,
        };
      } else if (confData) {
        const styleLabel = style ? `came back as ${style}` : 'is in';
        return {
          trigger: 'conflict_completed',
          priority: 1,
          message: name
            ? `Good ${t}, ${name}. Your conflict style ${styleLabel}. There's a lot to unpack there.`
            : `Good ${t}. Your conflict style ${styleLabel}. There's a lot to unpack there.`,
        };
      }
    }
  } catch { /* silent */ }

  // ── Priority 1: Low check-in score (mood ≤ 2 or connection ≤ 2) ──────────
  try {
    const { data: checkins } = await supabase
      .from('daily_checkins')
      .select('check_date, mood, connection_score')
      .eq('user_id', userId)
      .eq('couple_id', coupleId)
      .not('question_response', 'is', null)
      .order('check_date', { ascending: false })
      .limit(1);

    const latest = checkins?.[0];
    if (latest) {
      const moodVal = MOOD_VALUES[latest.mood] ?? 3;
      const connVal = latest.connection_score ?? 3;
      if (moodVal <= 2 || connVal <= 2) {
        return {
          trigger: 'low_checkin',
          priority: 1,
          message: name
            ? `Good ${t}, ${name}. Your last check-in was pretty low — what was going on?`
            : `Good ${t}. Your last check-in was pretty low — what was going on?`,
        };
      }
    }
  } catch { /* silent */ }

  // ── Priority 2: No check-in in 3+ days ──────────────────────────────────
  try {
    const { data: checkins } = await supabase
      .from('daily_checkins')
      .select('check_date')
      .eq('user_id', userId)
      .eq('couple_id', coupleId)
      .not('question_response', 'is', null)
      .order('check_date', { ascending: false })
      .limit(1);

    const lastCheckin = checkins?.[0];
    if (lastCheckin) {
      const daysSince = Math.floor(
        (now.getTime() - new Date(lastCheckin.check_date).getTime()) / 86400000
      );
      if (daysSince >= 3) {
        return {
          trigger: 'missed_checkins',
          priority: 2,
          message: name
            ? `Good ${t}, ${name}. It's been ${daysSince} days since your last check-in. How are you two doing?`
            : `Good ${t}. It's been ${daysSince} days since your last check-in. How are things going?`,
        };
      }
    } else {
      // No check-ins at all
      return {
        trigger: 'missed_checkins',
        priority: 2,
        message: name
          ? `Good ${t}, ${name}. You haven't done a check-in yet — it takes under a minute and gives me a lot to work with.`
          : `Good ${t}. You haven't done a check-in yet — it takes under a minute and gives me a lot to work with.`,
      };
    }
  } catch { /* silent */ }

  // ── Priority 3: Dream trip added in last 3 days ──────────────────────────
  try {
    const { data: trips } = await supabase
      .from('trips')
      .select('destination, trip_type, created_at')
      .eq('couple_id', coupleId)
      .eq('is_dream', true)
      .gte('created_at', threeDaysAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    const trip = trips?.[0];
    if (trip) {
      const dest = trip.destination || 'that destination';
      return {
        trigger: 'dream_trip',
        priority: 3,
        message: name
          ? `Good ${t}, ${name}. You two added ${dest} as a dream trip. What would it actually take to make that happen?`
          : `Good ${t}. You two added ${dest} as a dream trip. What would it actually take to make that happen?`,
      };
    }
  } catch { /* silent */ }

  // ── Priority 5: Default time-of-day greeting ─────────────────────────────
  return {
    trigger: 'default',
    priority: 5,
    message: name
      ? `Good ${t}, ${name}. What's going on with you and ${partner} this week?`
      : `Good ${t}. What's on your mind today?`,
  };
}
