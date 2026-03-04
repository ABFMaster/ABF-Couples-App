/**
 * Nora Trigger System
 *
 * Generates contextual opening messages for Nora (ABF's relationship coach)
 * based on real-time user data. Used by the dashboard card and coach cold open.
 */

import { supabase } from '@/lib/supabase';

const MOOD_VALUES = {
  amazing: 5, great: 5, good: 4, okay: 3, down: 2, stressed: 1, struggling: 1,
};

function getTimeOfDayGreeting(name) {
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${greeting}, ${name}.` : `${greeting}.`;
}

/**
 * Generate a contextual Nora opening trigger.
 *
 * Checks user data in priority order and returns the most relevant opener.
 * Priority 1: attachment or conflict assessment completed in last 24h
 * Priority 1: low check-in mood (≤2) or connection score (≤2) in last check-in
 * Priority 2: no check-in in 3+ days
 * Priority 3: dream trip added in last 3 days
 * Priority 5: default time-of-day greeting
 *
 * @param {string} userId
 * @param {string} coupleId
 * @param {string} userName  - Display name, or null
 * @param {string} partnerName - Partner display name, or null
 * @returns {Promise<{ trigger: string, message: string, priority: number }>}
 */
export async function generateNoraTrigger(userId, coupleId, userName, partnerName) {
  const name = userName || null;
  const partner = partnerName || 'your partner';
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // ── Priority 1: Attachment assessment completed in last 24h ──────────────
  try {
    const { data: attData } = await supabase
      .from('attachment_assessments')
      .select('completed_at, primary_style')
      .eq('user_id', userId)
      .gte('completed_at', yesterday)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (attData) {
      const style = attData.primary_style
        ? `Your results show a ${attData.primary_style} attachment style.`
        : 'Your attachment results are in.';
      return {
        trigger: 'attachment_completed',
        priority: 1,
        message: name
          ? `${style} I'd love to talk through what this means for you and ${partner}, ${name} — it can be really eye-opening.`
          : `${style} I'd love to talk through what this means for your relationship — it can be really eye-opening.`,
      };
    }
  } catch { /* silent */ }

  // ── Priority 1: Conflict assessment completed in last 24h ────────────────
  try {
    const { data: confData } = await supabase
      .from('conflict_assessments')
      .select('completed_at, primary_style')
      .eq('user_id', userId)
      .gte('completed_at', yesterday)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (confData) {
      const style = confData.primary_style
        ? `Your conflict style quiz shows you lean ${confData.primary_style}.`
        : 'Your conflict style results are fresh.';
      return {
        trigger: 'conflict_completed',
        priority: 1,
        message: name
          ? `${style} Want to dig into what that means in practice${partner !== 'your partner' ? ` with ${partner}` : ''}? I've got some thoughts.`
          : `${style} Want to dig into what that means in practice? I've got some thoughts.`,
      };
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
        const intro = getTimeOfDayGreeting(name);
        return {
          trigger: 'low_checkin',
          priority: 1,
          message: `${intro} Your last check-in sounded like a tough one. I'm here if you want to talk about what's been going on — no pressure at all.`,
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
            ? `Hey ${name} — it's been a few days since your last check-in. How have things been with ${partner} lately?`
            : `It's been a few days since your last check-in. How have things been lately?`,
        };
      }
    } else {
      // No check-ins at all yet
      return {
        trigger: 'missed_checkins',
        priority: 2,
        message: name
          ? `Hey ${name} — looks like you haven't done a check-in yet. Want to start? It takes less than a minute and gives me so much to work with.`
          : `Looks like you haven't done a check-in yet. Want to start? It takes less than a minute.`,
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
      const dest = trip.destination || 'that destination'
      return {
        trigger: 'dream_trip',
        priority: 3,
        message: name
          ? `I saw you added ${dest} to your dream trips, ${name}! Planning something to look forward to together is actually great for connection. Want to talk through how to make it happen?`
          : `I saw a new dream trip was added — ${dest}! Planning something to look forward to is great for connection. Want to talk through how to make it happen?`,
      };
    }
  } catch { /* silent */ }

  // ── Priority 5: Default time-of-day greeting ─────────────────────────────
  const intro = getTimeOfDayGreeting(name);
  return {
    trigger: 'default',
    priority: 5,
    message: name
      ? `${intro} What's on your mind today?`
      : `${intro} What's on your mind today?`,
  };
}
