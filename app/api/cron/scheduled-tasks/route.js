export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { getSparkQuestion } from '@/lib/spark-questions'
import { getBetQuestion } from '@/lib/bet-questions'
import { getTodayString, getDayOfWeek, getHourInTimezone, daysUntilNextOccurrence } from '@/lib/dates'
import { noraGenerate, noraChat, parseNoraJSON } from '@/lib/nora'
import { getNoraMemory, getMemoryBriefing, getSurfaceableClaims, updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'
import { getNoraTierContext } from '@/lib/nora-knowledge'
import { generateFollowThrough } from '@/lib/follow-through'
import { computeCouplePatterns } from '@/lib/checkin-patterns'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SPARK_DAYS = [1] // Mon
const BET_DAYS = [2] // Tue

async function sendPush(userId, title, body, url, route) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
      body: JSON.stringify({ userId, title, body, url, route }),
    })
    if (!res.ok) {
      console.error('[sendPush] non-ok response:', route, userId, res.status)
    }
  } catch (err) {
    // Previously a bare catch{} -- a failed push here (network error, bad
    // response) vanished with zero trace anywhere. /api/push/send logs its
    // own attempts to push_log, but only if this fetch actually reaches it.
    console.error('[sendPush] failed:', route, userId, err)
  }
}

function getDayInTimezone(timezone) {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
    })
    const day = formatter.format(now)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days.indexOf(day)
  } catch {
    return -1
  }
}

function getTodayInTimezone(timezone) {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(now)
  } catch {
    return null
  }
}

async function processDailyContent(couple, user1, user2) {
  // Solo couples (no user2 yet) — Spark/Bet/Ritual generation and the
  // solo-side push still fire below (all three were separately confirmed
  // solo-compatible in the single-user arc design pass). Game Room's
  // Saturday nudge and Sunday reengagement are skipped entirely for solo:
  // both are written around an existing partner ("X is waiting",
  // "reconnect with X") and don't degrade gracefully to one person.
  const isSolo = !couple.user2_id
  const timezone = user1.timezone || user2.timezone || 'America/Los_Angeles'
  const hour = getHourInTimezone(timezone)
  const day = getDayInTimezone(timezone)
  const todayStr = getTodayInTimezone(timezone)

  if (hour !== 3) return
  if (!todayStr) return

  const user1Name = user1.display_name || 'them'
  const user2Name = user2.display_name || 'them'

  const { data: noraMemory } = await supabase
    .from('nora_memory')
    .select('couple_notes, conversation_count')
    .eq('couple_id', couple.id)
    .maybeSingle()

  const coupleAgeDays = couple.created_at
    ? Math.floor((Date.now() - new Date(couple.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  if (SPARK_DAYS.includes(day)) {
    const { data: existing } = await supabase
      .from('sparks')
      .select('id')
      .eq('couple_id', couple.id)
      .eq('spark_date', todayStr)
      .maybeSingle()

    if (existing) return

    const { data: usedSparks } = await supabase
      .from('sparks')
      .select('question_id')
      .eq('couple_id', couple.id)

    const usedIds = (usedSparks || []).map(s => s.question_id).filter(Boolean)
    const q = getSparkQuestion({ coupleAgeDays, skipCount: 0, usedIds })
    if (!q) return

    await supabase.from('sparks').insert({
      couple_id: couple.id,
      question: q.question,
      question_id: q.id,
      question_level: q.level,
      question_tone: q.tone,
      spark_date: todayStr,
    })

    await sendPush(user1.user_id, 'The Spark', 'The Spark is ready.', '/dashboard', 'cron/spark')
    if (!isSolo) await sendPush(user2.user_id, 'The Spark', 'The Spark is ready.', '/dashboard', 'cron/spark')
  }

  if (BET_DAYS.includes(day)) {
    const { data: existing } = await supabase
      .from('bets')
      .select('id')
      .eq('couple_id', couple.id)
      .eq('bet_date', todayStr)
      .maybeSingle()

    if (existing) return

    const { data: usedBets } = await supabase
      .from('bets')
      .select('question_id, question_category')
      .eq('couple_id', couple.id)
      .order('bet_date', { ascending: true })

    const usedIds = (usedBets || []).map(b => b.question_id).filter(Boolean)
    // Oldest-first, so slicing the last few inside getBetQuestion gets the
    // couple's most recent categories, not an arbitrary sample.
    const recentCategories = (usedBets || []).map(b => b.question_category).filter(Boolean)
    const q = getBetQuestion({ coupleAgeDays, usedIds, recentCategories, soloOnly: isSolo })
    if (!q) return

    await supabase.from('bets').insert({
      couple_id: couple.id,
      question: q.question,
      question_id: q.id,
      question_level: q.level,
      question_category: q.category || null,
      bet_date: todayStr,
    })

    const betPushBody = isSolo ? 'The Bet is ready.' : 'The Bet is ready. Do you know them?'
    await sendPush(user1.user_id, 'The Bet', betPushBody, '/dashboard', 'cron/bet')
    if (!isSolo) await sendPush(user2.user_id, 'The Bet', betPushBody, '/dashboard', 'cron/bet')
  }

  if (day === 5) {
    const { data: ritual } = await supabase
      .from('rituals')
      .select('id, title')
      .eq('couple_id', couple.id)
      .in('status', ['discovering', 'adopted'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (ritual) {
      const ritualBody = isSolo ? `${ritual.title} — check in today.` : `${ritual.title} — check in together today.`
      await sendPush(user1.user_id, 'The Ritual', ritualBody, '/dashboard', 'cron/ritual')
      if (!isSolo) await sendPush(user2.user_id, 'The Ritual', ritualBody, '/dashboard', 'cron/ritual')
    }
  }

  // Game Room's Saturday nudge assumes an existing partner ("X is waiting")
  // — skipped entirely for solo rather than reworded, since Game Room is
  // deliberately opt-in/choice-driven for solo, not a pushed activity.
  if (day === 6 && !isSolo) {
    const { data: lastSession } = await supabase
      .from('game_sessions')
      .select('created_at')
      .eq('couple_id', couple.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const daysSince = lastSession
      ? (Date.now() - new Date(lastSession.created_at).getTime()) / (1000 * 60 * 60 * 24)
      : 999

    if (daysSince >= 3) {
      await sendPush(user1.user_id, 'Game Room', `Saturday night. ${user2Name} is waiting.`, '/game-room', 'cron/game-night')
      await sendPush(user2.user_id, 'Game Room', `Saturday night. ${user1Name} is waiting.`, '/game-room', 'cron/game-night')
    }
  }

  // Weekly Reflection push removed from here Aug 11 2026 — this fired
  // unconditionally on the single hour===3 && day===0 tick regardless of
  // whether generation had actually succeeded yet (processWeeklyReflection
  // runs later in the main loop below, so this could even fire BEFORE
  // content existed). Push-sending now lives inside reflection/generate's
  // idempotent notifyReflectionReady(), triggered by processWeeklyReflection
  // — which itself already runs unconditionally on every Sunday-touching
  // cron tick (10 UTC daily, 13 UTC Sunday, 17 UTC daily), so real
  // redundancy replaces this single fragile window instead of duplicating
  // it. See docs/database/weekly_reflections_notified_at.sql.

  // Reengagement push is specifically about reconnecting with an existing
  // partner after time apart — meaningless without one, so skipped entirely
  // for solo rather than adapted.
  if (day === 0 && !isSolo) {
    await sendReengagementPush(couple, user1, user2, noraMemory)
  }
}

async function sendReengagementPush(couple, user1, user2, noraMemory) {
  const { data: lastSession } = await supabase
    .from('game_sessions')
    .select('created_at, mode')
    .eq('couple_id', couple.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastSession) {
    const daysSince = (Date.now() - new Date(lastSession.created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < 7) return
  }

  const user1Name = user1.display_name || 'them'
  const user2Name = user2.display_name || 'them'
  const trajectory = noraMemory?.couple_notes?.structured_facts?.trajectory || 'unknown'
  const unsaidThing = noraMemory?.couple_notes?.structured_facts?.unsaid_thing || null

  const prompt1 = `You are sending a push notification to ${user1Name} to reconnect with ${user2Name} in the ABF Game Room. They haven't played together in 7+ days. ${unsaidThing ? `What Nora is watching: ${unsaidThing}` : ''} Trajectory: ${trajectory}. Write ONE push notification (max 12 words, no quotes) addressed to ${user1Name} that feels personal and creates genuine curiosity. Never say "feel like playing" or use the word "game".`

  const prompt2 = `You are sending a push notification to ${user2Name} to reconnect with ${user1Name} in the ABF Game Room. They haven't played together in 7+ days. ${unsaidThing ? `What Nora is watching: ${unsaidThing}` : ''} Trajectory: ${trajectory}. Write ONE push notification (max 12 words, no quotes) addressed to ${user2Name} that feels personal and creates genuine curiosity. Never say "feel like playing" or use the word "game".`

  try {
    const [body1, body2] = await Promise.all([
      noraGenerate(prompt1, { route: 'cron/reengagement-user1', maxTokens: 60 }),
      noraGenerate(prompt2, { route: 'cron/reengagement-user2', maxTokens: 60 }),
    ])
    await sendPush(user1.user_id, 'ABF', body1.trim(), '/game-room', 'cron/reengagement')
    await sendPush(user2.user_id, 'ABF', body2.trim(), '/game-room', 'cron/reengagement')
  } catch {
  }
}

// Morning-after nudge: for any custom date whose date_time has passed and
// hasn't been prompted yet, push whichever partner(s) haven't marked it done,
// deep-linking straight into the reflection modal. One prompt per date —
// morning_after_prompt_sent_at guards against resending.
async function processMorningAfterDates(couple, user1, user2) {
  const timezone = user1.timezone || user2.timezone || 'America/Los_Angeles'
  const hour = getHourInTimezone(timezone)
  if (hour !== 10) return

  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data: dates } = await supabase
    .from('custom_dates')
    .select('id, title, date_time, user1_completed_at, user2_completed_at')
    .eq('couple_id', couple.id)
    .neq('status', 'completed')
    .is('morning_after_prompt_sent_at', null)
    .lt('date_time', now.toISOString())
    .gt('date_time', threeDaysAgo)

  if (!dates?.length) return

  for (const d of dates) {
    try {
      if (!d.user1_completed_at) {
        await sendPush(couple.user1_id, 'Date Night', `How was "${d.title}"? Add a photo or a note.`, `/dates/${d.id}?reflect=1`, 'dates/morning-after')
      }
      if (!d.user2_completed_at) {
        await sendPush(couple.user2_id, 'Date Night', `How was "${d.title}"? Add a photo or a note.`, `/dates/${d.id}?reflect=1`, 'dates/morning-after')
      }
      await supabase.from('custom_dates').update({ morning_after_prompt_sent_at: now.toISOString() }).eq('id', d.id)
    } catch (err) {
      console.error('[dates/morning-after] date:', d.id, err)
    }
  }
}

// Birthday / anniversary lead-time reminders — confirmed with Matt Aug 10
// 2026: these were previously entirely passive (fed into AI Coach's system
// prompt only, useful only if a conversation happened to touch on it — see
// Sessions/PRODUCT_BACKLOG.md). Matt's explicit note: day-of surfacing gives
// no lead time to actually plan/buy/book anything, so this fires twice —
// 7 days out (time to plan) and 2 days out (closer reminder) — using
// daysUntilNextOccurrence (lib/dates.js) so the exact-day match only trips
// once per year per event, no dedupe column needed (same pattern as the
// existing nextDate/daysUntilDate check in dashboard/hero). Gated on the
// same once-daily 3am local hour as processDailyContent so it doesn't fire
// on every cron tick.
//
// A birthday is only pushed to the PARTNER (they're the one planning/
// buying), never to the person whose birthday it is. An anniversary is
// mutual, so both partners get it. See app/api/dashboard/hero/route.js's
// PART 0c for this reminder's dashboard-side companion (0-2 day window,
// shown on open rather than pushed).
async function processBirthdayAnniversaryReminders(couple, user1, user2) {
  const timezone = user1.timezone || user2.timezone || 'America/Los_Angeles'
  const hour = getHourInTimezone(timezone)
  // Self-caught bug, Aug 11 2026 — this originally gated on hour===9, but
  // vercel.json's cron entries land at UTC 10/13(Sun)/1-2/5(Thu)/17 — none
  // of which is 16:00 UTC (9am America/Los_Angeles). That gate could never
  // once evaluate true, so this whole feature has never actually fired
  // since it shipped. Reusing hour===3, the same proven-firing daily 10 UTC
  // window processDailyContent already uses, instead of adding a new
  // vercel.json cron entry for one more specific hour.
  if (hour !== 3) return

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, birthday, anniversary')
    .in('user_id', [couple.user1_id, couple.user2_id])

  const p1 = profiles?.find(p => p.user_id === couple.user1_id)
  const p2 = profiles?.find(p => p.user_id === couple.user2_id)
  const user1Name = user1.display_name || 'your partner'
  const user2Name = user2.display_name || 'your partner'

  // User1's birthday → surfaced to user2 only.
  if (p1?.birthday) {
    const daysUntil = daysUntilNextOccurrence(p1.birthday, timezone)
    if (daysUntil === 7) {
      await sendPush(couple.user2_id, 'Nora', `${user1Name}'s birthday is in a week — plenty of time to plan something good.`, '/dates', 'birthday/7day')
    } else if (daysUntil === 2) {
      await sendPush(couple.user2_id, 'Nora', `${user1Name}'s birthday is in 2 days.`, '/dates', 'birthday/2day')
    }
  }

  // User2's birthday → surfaced to user1 only.
  if (p2?.birthday) {
    const daysUntil = daysUntilNextOccurrence(p2.birthday, timezone)
    if (daysUntil === 7) {
      await sendPush(couple.user1_id, 'Nora', `${user2Name}'s birthday is in a week — plenty of time to plan something good.`, '/dates', 'birthday/7day')
    } else if (daysUntil === 2) {
      await sendPush(couple.user1_id, 'Nora', `${user2Name}'s birthday is in 2 days.`, '/dates', 'birthday/2day')
    }
  }

  // Anniversary → mutual, both partners. Stored per-user (user_profiles),
  // not couple-level, so prefer whichever partner actually has it set.
  const anniversaryDate = p1?.anniversary || p2?.anniversary || null
  if (anniversaryDate) {
    const daysUntil = daysUntilNextOccurrence(anniversaryDate, timezone)
    if (daysUntil === 7) {
      await sendPush(couple.user1_id, 'Nora', `Your anniversary is in a week — want to plan something together?`, '/dates', 'anniversary/7day')
      await sendPush(couple.user2_id, 'Nora', `Your anniversary is in a week — want to plan something together?`, '/dates', 'anniversary/7day')
    } else if (daysUntil === 2) {
      await sendPush(couple.user1_id, 'Nora', `Your anniversary is in 2 days.`, '/dates', 'anniversary/2day')
      await sendPush(couple.user2_id, 'Nora', `Your anniversary is in 2 days.`, '/dates', 'anniversary/2day')
    }
  }
}

async function processWeeklyReflection(couple) {
  try {
    // ROOT CAUSE FIX Aug 12 2026 — this used to await the fetch and stop,
    // never inspecting the response at all. fetch() only rejects on network
    // failure, never on an HTTP error status, so a 500 from reflection/
    // generate (see maxDuration comment added there) produced zero trace —
    // not in this try/catch, not anywhere — every week it happened. Matt
    // reported Weekly Reflection stuck for multiple weeks with no error
    // visible anywhere; this is why. Now logs the real status + error body
    // on failure.
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/reflection/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      },
      body: JSON.stringify({
        userId: couple.user1_id,
        coupleId: couple.id
      })
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error('[reflection/generate] non-ok response, couple:', couple.id, res.status, body.error)
    }
  } catch (err) { console.error('[reflection/generate] couple:', couple.id, err) }
}

// Weekly, alongside Weekly Reflection (same "look back at the week"
// cadence) — checks whether check-in presence has been persistently
// imbalanced between partners and, if so, feeds it into Nora's couple_notes
// as a quiet observation. Never surfaced to users directly from here; see
// lib/nora-memory.js's SIGNAL_TYPES.ENGAGEMENT_PATTERN lens for how Nora is
// instructed to hold this (as weak, reversible evidence — never a stated
// diagnosis) and lib/checkin-patterns.js's DRIFT_THRESHOLDS for why this
// requires 2 consecutive weeks of the same imbalance before firing at all.
//
// Fetches with this route's own service-role supabase client rather than
// calling analyzeCouplePatterns() directly — that function's module-level
// client is anon-key/RLS-scoped for its browser caller (ai-coach page) and
// would silently return zero rows here with no user session. See
// computeCouplePatterns()'s comment in lib/checkin-patterns.js.
async function processEngagementPatternCheck(couple) {
  try {
    const daysBack = 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    const { data: checkins, error } = await supabase
      .from('daily_checkins')
      .select('check_date, user_id')
      .eq('couple_id', couple.id)
      .gte('check_date', startDate.toISOString().split('T')[0])
      .order('check_date', { ascending: true })

    if (error) {
      console.error('[engagementPattern] fetch error, couple:', couple.id, error)
      return
    }

    const { driftAlert } = computeCouplePatterns(checkins || [], daysBack)
    if (!driftAlert) return

    // No single "acting user" for this signal — couple-level observation,
    // not something either partner did. See SIGNAL_TYPES.ENGAGEMENT_PATTERN's
    // comment for why this is intentionally excluded from both signal-count
    // weight dicts (fire-and-forget update, no userId).
    updateNoraMemory({
      coupleId: couple.id,
      userId: null,
      signalType: SIGNAL_TYPES.ENGAGEMENT_PATTERN,
      inputData: driftAlert,
    }).catch(err => console.error('[engagementPattern] updateNoraMemory failed, couple:', couple.id, err))
  } catch (err) {
    console.error('[engagementPattern] couple:', couple.id, err)
  }
}

async function processThursdayGeneration(couple, user1, user2) {
  try {
    const todayStr = getTodayString('America/Los_Angeles')

    // Check if already generated today
    const { data: existing } = await supabase
      .from('thursday_entries')
      .select('id')
      .eq('couple_id', couple.id)
      .eq('date', todayStr)
      .maybeSingle()

    if (existing) return

    const user1Name = user1.display_name || 'Partner 1'
    const user2Name = user2.display_name || 'Partner 2'

    // Fetch recent activity context — all signals feed Thursday
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [{ data: recentSparks }, noraMemory, { data: recentNotices }, { data: recentGames }, { data: recentDates }] = await Promise.all([
      supabase
        .from('sparks')
        .select('prompt, spark_date, spark_responses(user_id, response_text)')
        .eq('couple_id', couple.id)
        .order('spark_date', { ascending: false })
        .limit(4),
      getNoraMemory(couple.id),
      supabase
        .from('wednesday_notices')
        .select('user1_notice, user2_notice, user1_id, user2_id, date')
        .eq('couple_id', couple.id)
        .gte('date', weekAgo.split('T')[0])
        .order('date', { ascending: false })
        .limit(1),
      supabase
        .from('game_sessions')
        .select('mode, hole_topic, created_at')
        .eq('couple_id', couple.id)
        .gte('created_at', weekAgo)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('custom_dates')
        .select('title, completed_at')
        .eq('couple_id', couple.id)
        .eq('status', 'completed')
        .gte('completed_at', weekAgo)
        .order('completed_at', { ascending: false })
        .limit(2),
    ])

    const coupleContext = noraMemory?.couple_notes?.notes
      ? `What Nora knows about this couple:\n${noraMemory.couple_notes.notes}`
      : null

    const user1IndividualSignals = noraMemory?.user1_individual_signal_count || 0
    const user2IndividualSignals = noraMemory?.user2_individual_signal_count || 0
    const coupleSignals = noraMemory?.couple_signal_count || 0
    const user1TierContext = getNoraTierContext(user1IndividualSignals, coupleSignals, user1Name, user2Name)
    const user2TierContext = getNoraTierContext(user2IndividualSignals, coupleSignals, user2Name, user1Name)
    const [user1ClaimsResult, user2ClaimsResult] = await Promise.all([
      getSurfaceableClaims(couple.id, couple.user1_id, couple.user2_id, user1Name, user2Name, user1IndividualSignals, user2IndividualSignals),
      getSurfaceableClaims(couple.id, couple.user2_id, couple.user1_id, user2Name, user1Name, user2IndividualSignals, user1IndividualSignals),
    ])
    const user1ClaimsBlock = user1ClaimsResult.promptBlock || null
    const user2ClaimsBlock = user2ClaimsResult.promptBlock || null

    // Wednesday notices — what each partner observed about the other this week
    const notice = recentNotices?.[0]
    const noticeContext = notice
      ? (() => {
          const u1IsUser1 = notice.user1_id === couple.user1_id
          const u1Notice = u1IsUser1 ? notice.user1_notice : notice.user2_notice
          const u2Notice = u1IsUser1 ? notice.user2_notice : notice.user1_notice
          const parts = []
          if (u1Notice) parts.push(`${user1Name} noticed about ${user2Name}: "${u1Notice}"`)
          if (u2Notice) parts.push(`${user2Name} noticed about ${user1Name}: "${u2Notice}"`)
          return parts.length > 0 ? `What they noticed about each other this week:\n${parts.join('\n')}` : null
        })()
      : null

    // Recent Game Room activity
    const gameContext = recentGames?.length > 0
      ? `Game Room this week:\n${recentGames.map(g => `- ${g.mode}${g.hole_topic ? `: ${g.hole_topic}` : ''}`).join('\n')}`
      : null

    // Recent completed dates
    const dateContext = recentDates?.length > 0
      ? `Dates completed this week:\n${recentDates.map(d => `- ${d.title}`).join('\n')}`
      : null

    const recentContext = recentSparks?.map(s => {
      const responses = s.spark_responses?.map(r => {
        const name = r.user_id === couple.user1_id ? user1Name : user2Name
        return `${name}: "${r.response_text}"`
      }).join(' | ')
      return `"${s.prompt}": ${responses}`
    }).join('\n') || 'No recent Spark answers.'

    const systemPrompt = `You are Nora — you have been watching this couple all week. Generate a unique, personal Thursday observation and calibrated question for one specific partner.

RULES:
- Speak directly to this person using "you" — never "you two" or "both of you"
- The observation must be specific to THIS person, angled from what you know about them individually
- Draw from recent Spark answers and memory patterns — name specific things you noticed
- End with ONE calibrated question beginning with "what" or "how" — never "why"
- The question opens new territory, it does not summarize the observation
- 2-3 sentences for the observation, 1 sentence for the question
- Never sound like a Spark question — this is Nora speaking first from her own observation
- Tone: warm, direct, slightly surprising`

    // Generate for user1
    const user1Prompt = [
      `You are speaking to ${user1Name}.`,
      coupleContext,
      `Recent Spark answers this week:\n${recentContext}`,
      noticeContext,
      gameContext,
      dateContext,
      user1TierContext,
      user1ClaimsBlock,
      `Generate a Thursday observation and calibrated question specifically for ${user1Name} — angle it toward what you notice about them individually, not just the couple.`
    ].filter(Boolean).join('\n\n')

    // Generate for user2
    const user2Prompt = [
      `You are speaking to ${user2Name}.`,
      coupleContext,
      `Recent Spark answers this week:\n${recentContext}`,
      noticeContext,
      gameContext,
      dateContext,
      user2TierContext,
      user2ClaimsBlock,
      `Generate a Thursday observation and calibrated question specifically for ${user2Name} — angle it toward what you notice about them individually, not just the couple.`
    ].filter(Boolean).join('\n\n')

    const [user1Result, user2Result] = await Promise.all([
      noraChat([{ role: 'user', content: user1Prompt }], { route: 'thursday/generate-user1', system: systemPrompt, maxTokens: 200 }),
      noraChat([{ role: 'user', content: user2Prompt }], { route: 'thursday/generate-user2', system: systemPrompt, maxTokens: 200 })
    ])

    // Parse observation and question from each result
    // Nora returns 2-3 sentences observation + 1 question sentence
    // Store full text — split on display
    const user1Text = user1Result?.trim() || ''
    const user2Text = user2Result?.trim() || ''

    if (!user1Text || !user2Text) return

    // Extract observation (all but last sentence) and question (last sentence)
    const splitObsQuestion = (text) => {
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
      const question = sentences[sentences.length - 1].trim()
      const observation = sentences.slice(0, -1).join(' ').trim()
      return { observation: observation || text, question: question || '' }
    }

    const user1Parsed = splitObsQuestion(user1Text)
    const user2Parsed = splitObsQuestion(user2Text)

    // Insert thursday_entries row
    await supabase.from('thursday_entries').insert({
      couple_id: couple.id,
      date: todayStr,
      user1_id: couple.user1_id,
      user2_id: couple.user2_id,
      user1_observation: user1Parsed.observation,
      user1_question: user1Parsed.question,
      user2_observation: user2Parsed.observation,
      user2_question: user2Parsed.question,
    })

    // Send pushes
    await sendPush(user1.user_id, 'Nora', 'Something worth looking at today.', '/dashboard', 'thursday/generate')
    await sendPush(user2.user_id, 'Nora', 'Something worth looking at today.', '/dashboard', 'thursday/generate')

  } catch (err) {
    console.error('[thursday/generate] couple:', couple.id, err)
  }
}

async function processThursdayReveal(couple, user1, user2) {
  try {
    const todayStr = getTodayString('America/Los_Angeles')

    const { data: entry } = await supabase
      .from('thursday_entries')
      .select('*')
      .eq('couple_id', couple.id)
      .eq('date', todayStr)
      .eq('status', 'pending')
      .maybeSingle()

    if (!entry) return

    const user1Name = user1.display_name || 'Partner 1'
    const user2Name = user2.display_name || 'Partner 2'

    // Generate synthesis
    const hasUser1 = !!entry.user1_response
    const hasUser2 = !!entry.user2_response

    let synthesis = ''

    if (hasUser1 || hasUser2) {
      const synthesisPrompt = [
        `You are Nora. Two people privately reflected on your observations today. Now bring their responses together.`,
        hasUser1 ? `${user1Name}'s observation: "${entry.user1_observation} ${entry.user1_question}"` : null,
        hasUser1 ? `${user1Name}'s response: "${entry.user1_response}"` : null,
        hasUser2 ? `${user2Name}'s observation: "${entry.user2_observation} ${entry.user2_question}"` : null,
        hasUser2 ? `${user2Name}'s response: "${entry.user2_response}"` : null,
        !hasUser1 ? `${user1Name} did not respond today.` : null,
        !hasUser2 ? `${user2Name} did not respond today.` : null,
        `Write a 2-3 sentence synthesis that connects what you see across both responses — or speaks directly to the one who did respond if only one answered. End with one calibrated "what" or "how" question that creates a conversation between them tonight. Never summarize. Find the thread.`
      ].filter(Boolean).join('\n\n')

      const systemPrompt = `You are Nora — warm, direct, specific. You find the thread between what two people said privately and name it. Never generic. Never therapeutic jargon. End with one question that makes them want to talk to each other tonight.`

      synthesis = await noraChat(
        [{ role: 'user', content: synthesisPrompt }],
        { route: 'thursday/reveal', system: systemPrompt, maxTokens: 200 }
      ) || ''
    }

    // Update entry to revealed
    await supabase
      .from('thursday_entries')
      .update({ nora_synthesis: synthesis.trim(), status: 'revealed' })
      .eq('id', entry.id)

    // Send reveal pushes
    await sendPush(user1.user_id, 'Nora', 'Something to see together tonight.', '/dashboard', 'thursday/reveal')
    await sendPush(user2.user_id, 'Nora', 'Something to see together tonight.', '/dashboard', 'thursday/reveal')

    // Follow-Through hook — cron-triggered like Wednesday/Notice, but unlike
    // Wednesday/Bet/Spark this fires as soon as EITHER partner responded, not
    // only when both did. Root cause of the old both-required gate: it was
    // copied from Bet/Spark's rule without re-checking whether it actually
    // applied here. Bet/Spark's Follow-Through content is built by comparing
    // both answers against each other, so it genuinely needs both. Thursday
    // was already built to give each partner a DIFFERENT, individualized
    // observation+question (not a shared one) — there's no structural reason
    // the partner who did respond should be blocked from getting their own
    // Follow-Through just because the other didn't answer. Matt, Aug 14 2026:
    // "why would I not want to follow through even if my partner did not
    // answer." generateFollowThrough (lib/follow-through.js) now generates
    // single-sided when one answer is missing rather than fabricating one.
    if (hasUser1 || hasUser2) {
      try {
        await generateFollowThrough({
          supabase,
          coupleId: couple.id,
          sourceType: 'thursday',
          sourceId: entry.id,
          sourceLabel: 'Thursday',
          myQuestion: `${entry.user1_observation || ''} ${entry.user1_question || ''}`.trim(),
          theirQuestion: `${entry.user2_observation || ''} ${entry.user2_question || ''}`.trim(),
          couple,
          userId: couple.user1_id,
          myName: user1Name,
          partnerName: user2Name,
          myAnswer: entry.user1_response,
          theirAnswer: entry.user2_response,
        })
      } catch (ftErr) {
        console.error('[thursday] Follow-Through generation error:', ftErr)
      }
    }
  } catch (err) {
    console.error('[thursday/reveal] couple:', couple.id, err)
  }
}

async function processWednesdayNotice(couple, user1, user2) {
  try {
    const todayStr = getTodayString('America/Los_Angeles')

    const { data: existing } = await supabase
      .from('wednesday_notices')
      .select('id')
      .eq('couple_id', couple.id)
      .eq('date', todayStr)
      .maybeSingle()

    if (existing) return

    const user1Name = user1.display_name || 'Partner 1'
    const user2Name = user2.display_name || 'Partner 2'

    // Insert the row — no generation needed, users write their own notices
    await supabase.from('wednesday_notices').insert({
      couple_id: couple.id,
      date: todayStr,
      user1_id: couple.user1_id,
      user2_id: couple.user2_id
    })

    // Send morning pushes
    await sendPush(user1.user_id, 'The Notice', `The Notice is ready. What have you noticed about ${user2Name} this week? Open to send.`, '/dashboard', 'wednesday/morning')
    await sendPush(user2.user_id, 'The Notice', `The Notice is ready. What have you noticed about ${user1Name} this week? Open to send.`, '/dashboard', 'wednesday/morning')

  } catch (err) {
    console.error('[wednesday/notice] couple:', couple.id, err)
  }
}

async function processWednesdayEveningReminder(couple, user1, user2) {
  try {
    const todayStr = getTodayString('America/Los_Angeles')
    const { data: entry } = await supabase
      .from('wednesday_notices')
      .select('*')
      .eq('couple_id', couple.id)
      .eq('date', todayStr)
      .eq('status', 'pending')
      .maybeSingle()
    if (!entry) return
    const user1Name = user1.display_name || 'Partner 1'
    const user2Name = user2.display_name || 'Partner 2'
    // Only push to users who haven't submitted yet
    if (!entry.user1_notice) {
      await sendPush(user1.user_id, 'The Notice', `Last chance — send your Notice to ${user2Name} before 10pm tonight.`, '/dashboard', 'wednesday/evening')
    }
    if (!entry.user2_notice) {
      await sendPush(user2.user_id, 'The Notice', `Last chance — send your Notice to ${user1Name} before 10pm tonight.`, '/dashboard', 'wednesday/evening')
    }
  } catch (err) {
    console.error('[wednesday/evening] couple:', couple.id, err)
  }
}

// Follow-Through hook for Wednesday/Notice — called from both the 7pm reveal
// and the 10pm cutoff fallback, whichever one actually flips this entry to
// 'revealed'. Unlike Bet/Spark, this fires from a cron function, not a user
// respond route — nothing here is triggered by either partner's own action.
// Skipped entirely unless both sides actually sent a notice, matching the
// same no-partial-content rule Bet/Spark follow, even though Wednesday's own
// reveal happily reveals with zero or one side answered.
async function maybeGenerateWednesdayFollowThrough(couple, entry, user1Name, user2Name, hasUser1, hasUser2) {
  if (!hasUser1 || !hasUser2) return
  try {
    await generateFollowThrough({
      supabase,
      coupleId: couple.id,
      sourceType: 'wednesday',
      sourceId: entry.id,
      sourceLabel: 'Notice',
      sourceQuestion: 'What did you notice about each other this week?',
      couple,
      userId: couple.user1_id,
      myName: user1Name,
      partnerName: user2Name,
      myAnswer: entry.user1_notice,
      theirAnswer: entry.user2_notice,
    })
  } catch (ftErr) {
    console.error('[wednesday] Follow-Through generation error:', ftErr)
  }
}

async function processWednesdayCutoff(couple, user1, user2) {
  try {
    const todayStr = getTodayString('America/Los_Angeles')
    const { data: entry } = await supabase
      .from('wednesday_notices')
      .select('*')
      .eq('couple_id', couple.id)
      .eq('date', todayStr)
      .eq('status', 'pending')
      .maybeSingle()
    if (!entry) return
    const user1Name = user1.display_name || 'Partner 1'
    const user2Name = user2.display_name || 'Partner 2'
    const hasUser1 = !!entry.user1_notice
    const hasUser2 = !!entry.user2_notice
    let synthesis = ''
    if (hasUser1 || hasUser2) {
      const synthesisPrompt = [
        `You are Nora. Two partners were asked to notice something about each other this week.`,
        hasUser1 ? `${user1Name} sent to ${user2Name}: "${entry.user1_notice}"` : `${user1Name} did not send a notice today.`,
        hasUser2 ? `${user2Name} sent to ${user1Name}: "${entry.user2_notice}"` : `${user2Name} did not send a notice today.`,
        `Write 2 sentences maximum. Find what the notice(s) reveal about how this couple sees each other. If only one person sent a notice, honor what they shared without making the other feel bad for missing it. End with one warm observation, not a question.`
      ].filter(Boolean).join('\n\n')
      const systemPrompt = `You are Nora — warm, specific, brief. Honor what was shared. Never generic.`
      synthesis = await noraChat(
        [{ role: 'user', content: synthesisPrompt }],
        { route: 'wednesday/cutoff', system: systemPrompt, maxTokens: 150 }
      ) || ''
    }
    await supabase
      .from('wednesday_notices')
      .update({ nora_synthesis: synthesis.trim() || null, status: 'revealed' })
      .eq('id', entry.id)
    // Only push if at least one person submitted
    if (hasUser1 || hasUser2) {
      await sendPush(user1.user_id, 'The Notice', 'See what was noticed this week.', '/dashboard', 'wednesday/cutoff')
      await sendPush(user2.user_id, 'The Notice', 'See what was noticed this week.', '/dashboard', 'wednesday/cutoff')
    }
    await maybeGenerateWednesdayFollowThrough(couple, entry, user1Name, user2Name, hasUser1, hasUser2)
  } catch (err) {
    console.error('[wednesday/cutoff] couple:', couple.id, err)
  }
}

async function processWednesdayReveal(couple, user1, user2) {
  try {
    const todayStr = getTodayString('America/Los_Angeles')

    const { data: entry } = await supabase
      .from('wednesday_notices')
      .select('*')
      .eq('couple_id', couple.id)
      .eq('date', todayStr)
      .eq('status', 'pending')
      .maybeSingle()

    if (!entry) return

    const user1Name = user1.display_name || 'Partner 1'
    const user2Name = user2.display_name || 'Partner 2'

    const hasUser1 = !!entry.user1_notice
    const hasUser2 = !!entry.user2_notice

    // ROOT CAUSE FIX — Aug 6 2026. Matt's live repro: both partners submitted
    // after 7pm (past this reveal cron's window) but before the 10pm cutoff.
    // Both submissions were captured, but no Nora commentary and no
    // Follow-Through ever appeared. Cause: this function used to run the
    // block below UNCONDITIONALLY — even with zero or one submission in
    // hand, it still stamped the entry `status: 'revealed'` (with partial or
    // empty synthesis, and Follow-Through skipped since that needs both).
    // That status flip is what processWednesdayCutoff (the 10pm catch-all,
    // below) gates on via `.eq('status', 'pending')` — once this function
    // burned that status at 7pm, the entry was permanently invisible to the
    // cutoff cron for the rest of the night, even after the remaining
    // partner(s) went on to submit for real before 10pm. wednesday/send
    // itself never blocked those late writes (it only rejects on 'revealed'
    // status when it's also past Wednesday/10pm), so the data was captured —
    // it just had nowhere left to be revealed from, and no chance left to
    // generate Follow-Through.
    //
    // Fix: this 7pm cron's real job is an EARLY reveal for couples who
    // finished on time — not a final pass. Only proceed if BOTH partners
    // have already submitted by now; otherwise leave the entry 'pending'
    // and let processWednesdayCutoff's already-correct partial/empty/full
    // handling do the one and only real reveal at 10pm instead.
    if (!hasUser1 || !hasUser2) return

    // Both hasUser1 and hasUser2 are guaranteed true past the early return
    // above, so this is always the full two-sided prompt now — no partial-
    // submission branch needed here anymore (that case is processWednesdayCutoff's
    // job at 10pm instead).
    const synthesisPrompt = [
      `You are Nora. Two partners sent each other a specific appreciation today — something they noticed but hadn't said out loud. Read what they sent and find the thread.`,
      `${user1Name} sent to ${user2Name}: "${entry.user1_notice}"`,
      `${user2Name} sent to ${user1Name}: "${entry.user2_notice}"`,
      `Write 2 sentences maximum. Find what the two notices reveal about how this couple sees each other — not a summary, a connection. End with one warm observation, not a question. This is a moment of appreciation — honor it without over-analyzing it.`
    ].join('\n\n')

    const systemPrompt = `You are Nora — warm, specific, brief. Two people just said something kind and true about each other. Your job is to hold that moment and name what it reveals. Never generic. Never therapeutic. Just what you actually see.`

    const synthesis = await noraChat(
      [{ role: 'user', content: synthesisPrompt }],
      { route: 'wednesday/reveal', system: systemPrompt, maxTokens: 150 }
    ) || ''

    await supabase
      .from('wednesday_notices')
      .update({ nora_synthesis: synthesis.trim(), status: 'revealed' })
      .eq('id', entry.id)

    // Send evening reveal pushes.
    await sendPush(user1.user_id, 'The Notice', 'Nora noticed something in what you both sent today.', '/dashboard', 'wednesday/reveal')
    await sendPush(user2.user_id, 'The Notice', 'Nora noticed something in what you both sent today.', '/dashboard', 'wednesday/reveal')

    await maybeGenerateWednesdayFollowThrough(couple, entry, user1Name, user2Name, hasUser1, hasUser2)
  } catch (err) {
    console.error('[wednesday/reveal] couple:', couple.id, err)
  }
}

async function processNoraSynthesis(couples, profileMap) {
  const timezone = 'America/Los_Angeles'
  const day = getDayInTimezone(timezone)
  const hour = getHourInTimezone(timezone)

  if (day !== 0 || hour !== 6) return

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: activeEntries } = await supabase
    .from('notebook_entries')
    .select('user_id')
    .gte('created_at', sevenDaysAgo)
    .is('deleted_at', null)

  if (!activeEntries?.length) return

  const userIds = [...new Set(activeEntries.map(e => e.user_id))]
  let count = 0

  for (const userId of userIds) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/me/synthesis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ userId }),
      })
      count++
    } catch (err) {
      console.error(`[cron] me-synthesis error for user ${userId}:`, err)
    }
  }

  console.error('[cron] me-synthesis processed:', count)
}

async function processRabbitHoleConvergence() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: sessions } = await supabase
    .from('game_sessions')
    .select('id, couple_id, hole_topic, hole_entry, nora_send_off')
    .eq('mode', 'rabbit-hole')
    .eq('status', 'active')
    .lt('updated_at', twentyFourHoursAgo)
    .is('convergence', null)

  if (!sessions?.length) return

  for (const session of sessions) {
    try {
      const { data: rounds } = await supabase
        .from('game_rounds')
        .select('user1_thread, user2_thread, round_number')
        .eq('session_id', session.id)
        .order('round_number', { ascending: true })

      const { data: finds } = await supabase
        .from('game_finds')
        .select('find_text, user_id, round_number')
        .eq('session_id', session.id)
        .order('round_number', { ascending: true })

      const { data: coupleData } = await supabase
        .from('couples')
        .select('user1_id, user2_id')
        .eq('id', session.couple_id)
        .single()

      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, display_name')
        .in('id', [coupleData.user1_id, coupleData.user2_id])

      const user1Name = profiles?.find(p => p.id === coupleData.user1_id)?.display_name || 'Partner 1'
      const user2Name = profiles?.find(p => p.id === coupleData.user2_id)?.display_name || 'Partner 2'

      const findsContext = finds?.length
        ? finds.map(f => {
            const name = f.user_id === coupleData.user1_id ? user1Name : user2Name
            return `${name} (round ${f.round_number}): ${f.find_text}`
          }).join('\n')
        : 'No finds recorded.'

      const prompt = `Topic: ${session.hole_topic}
Entry point: ${session.hole_entry || 'not recorded'}

What they found across all rounds:
${findsContext}

Write a two-part convergence:
1. FACTUAL_CLOSE: 2-3 sentences on what actually happened with this topic (the facts)
2. HUMAN_TRUTH: 2-3 sentences on what their investigation reveals about them as a couple — what neither of them said out loud

Respond in this exact JSON format:
{
  "factual_close": "...",
  "human_truth": "..."
}`
      const response = await noraGenerate(prompt, { route: 'cron/scheduled-tasks', system: 'You are closing out a Rabbit Hole investigation that a couple started but never finished. Be the game master who brings it home — find what neither of them said explicitly.', maxTokens: 1000 })

      let parsed
      try {
        parsed = parseNoraJSON(response)
      } catch {
        console.error('[cron] Rabbit Hole convergence JSON parse failed:', response)
        return Response.json({ error: 'Failed to parse Nora response' }, { status: 500 })
      }

      await supabase
        .from('game_sessions')
        .update({
          convergence: parsed.human_truth,
          factual_close: parsed.factual_close,
          status: 'complete',
        })
        .eq('id', session.id)

      await sendPush(coupleData.user1_id, 'Nora closed the loop', 'Nora found something. Your Rabbit Hole has an ending.', `/game-room/rabbit-hole/debrief?sessionId=${session.id}`)
      await sendPush(coupleData.user2_id, 'Nora closed the loop', 'Nora found something. Your Rabbit Hole has an ending.', `/game-room/rabbit-hole/debrief?sessionId=${session.id}`)

    } catch {}
  }
}

// Added Aug 13 2026 — Matt: "we just don't do a good enough job of making
// the approval clear... I do think we need to auto clear the approval once
// the actual date of the event passes." The pre-date approval gate on
// shared custom_dates (State 2 in dates/[id]/page.js) was never designed to
// resolve itself — if either partner forgot to tap Approve, the invite sat
// open indefinitely even after the date was actually lived, which is
// exactly what fed a permanently-stuck Us-tab red dot (found investigating
// Matt's report). Once a date's own date_time is in the past, asking
// whether to approve it is moot — it happened or it didn't; there's nothing
// left to confirm. This sweeps once per cron tick and silently resolves
// both sides. Deliberately sets status to 'approved', not 'completed' —
// completion is a separate, per-user flow (user1_completed_at/
// user2_completed_at, ratings, the post-date reflection) that this must not
// fake or interfere with. approved_at's exact timestamp isn't surfaced
// anywhere in the UI (only its null-ness gates the approve button/badge), so
// overwriting both sides with "now" is safe even if one side had already
// genuinely approved.
async function autoClearPastDueDateApprovals() {
  try {
    const nowIso = new Date().toISOString()
    const { data: cleared, error } = await supabase
      .from('custom_dates')
      .update({ user1_approved_at: nowIso, user2_approved_at: nowIso, status: 'approved' })
      .not('shared_with', 'is', null)
      .eq('status', 'planned')
      .lt('date_time', nowIso)
      .or('user1_approved_at.is.null,user2_approved_at.is.null')
      .select('id')
    if (error) throw error
    return cleared?.length || 0
  } catch (err) {
    console.error('[cron] autoClearPastDueDateApprovals error:', err)
    return 0
  }
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: couples } = await supabase
      .from('couples')
      .select('id, created_at, user1_id, user2_id')
      .not('user2_id', 'is', null)

    // Solo couples — no partner yet. Deliberately queried and processed
    // separately from the block above rather than folded into one relaxed
    // filter: the loop below calls 8 functions total, and only
    // processDailyContent (Spark/Bet/Ritual generation) has actually been
    // audited for a missing user2. Relaxing the shared filter would have
    // silently turned all 8 on for solo couples at once. Widen this list
    // only as each function gets individually checked. See
    // Sessions/PRODUCT_BACKLOG.md — single-user arc, Aug 2026.
    const { data: soloCouples } = await supabase
      .from('couples')
      .select('id, created_at, user1_id, user2_id')
      .is('user2_id', null)

    if (!couples?.length && !soloCouples?.length) {
      return Response.json({ ok: true, processed: 0 })
    }

    const userIds = [
      ...(couples || []).flatMap(c => [c.user1_id, c.user2_id]),
      ...(soloCouples || []).map(c => c.user1_id),
    ]
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, timezone, display_name')
      .in('user_id', userIds)

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]))

    // TEMPORARY DIAGNOSTIC — added Aug 2026 to answer "is this cron actually
    // firing" without a paid Vercel plan's log retention. Matt asked for a
    // real catalog of cron health after the Weekly Reflection miss
    // investigation. Remove this block (and the cron_runs table/migration)
    // once cron health is confirmed over a few weeks — see
    // Sessions/PRODUCT_BACKLOG.md for the removal note.
    const blocksFired = new Set()
    let errored = 0

    let processed = 0
    for (const couple of couples) {
      try {
        const user1 = profileMap[couple.user1_id] || {}
        const user2 = profileMap[couple.user2_id] || {}
        await processDailyContent(couple, user1, user2)
        blocksFired.add('dailyContent')
        await processMorningAfterDates(couple, user1, user2)
        await processBirthdayAnniversaryReminders(couple, user1, user2)
        blocksFired.add('birthdayAnniversaryReminders')
        const day = getDayInTimezone(user1.timezone || user2.timezone || 'America/Los_Angeles')
        if (day === 0) { await processWeeklyReflection(couple); blocksFired.add('weeklyReflection') }
        if (day === 0) { await processEngagementPatternCheck(couple); blocksFired.add('engagementPatternCheck') }
        if (day === 4) { await processThursdayGeneration(couple, user1, user2); blocksFired.add('thursdayGeneration') }
        if (new Date().getUTCDay() === 5 && new Date().getUTCHours() === 2) { await processThursdayReveal(couple, user1, user2); blocksFired.add('thursdayReveal') }
        if (day === 3) { await processWednesdayNotice(couple, user1, user2); blocksFired.add('wednesdayNotice') }
        if (new Date().getUTCDay() === 4 && new Date().getUTCHours() === 2) { await processWednesdayReveal(couple, user1, user2); blocksFired.add('wednesdayReveal') }
        if (new Date().getUTCDay() === 4 && new Date().getUTCHours() === 1) { await processWednesdayEveningReminder(couple, user1, user2); blocksFired.add('wednesdayEveningReminder') }
        if (new Date().getUTCDay() === 4 && new Date().getUTCHours() === 5) { await processWednesdayCutoff(couple, user1, user2); blocksFired.add('wednesdayCutoff') }
        processed++
      } catch (err) {
        errored++
        console.error('[cron] couple processing error:', couple.id, err)
      }
    }

    // Solo couples — only the audited, null-guarded path. See the query
    // comment above for why this stays deliberately narrow.
    for (const couple of soloCouples || []) {
      try {
        const user1 = profileMap[couple.user1_id] || {}
        await processDailyContent(couple, user1, {})
        blocksFired.add('dailyContent')
        processed++
      } catch (err) {
        errored++
        console.error('[cron] solo couple processing error:', couple.id, err)
      }
    }

    processNoraSynthesis(couples, profileMap)
    await processRabbitHoleConvergence()
    const dateApprovalsCleared = await autoClearPastDueDateApprovals()
    if (dateApprovalsCleared > 0) blocksFired.add('autoClearPastDueDateApprovals')

    // Non-blocking — a logging failure must never affect the actual cron
    // work above, which has already completed by this point.
    try {
      const now = new Date()
      await supabase.from('cron_runs').insert({
        utc_day: now.getUTCDay(),
        utc_hour: now.getUTCHours(),
        blocks_fired: [...blocksFired],
        couples_processed: processed,
        couples_errored: errored,
      })
    } catch (logErr) {
      console.error('[cron] cron_runs logging error:', logErr)
    }

    return Response.json({ ok: true, processed })
  } catch (err) {
    console.error('[cron] Top-level error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
