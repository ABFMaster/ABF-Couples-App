export const dynamic = 'force-dynamic'
// ROOT CAUSE FIX Aug 12 2026 — Matt reported Weekly Reflection stuck on the
// week of 7/20 with nothing generated since, across multiple Sundays. This
// route runs 5 parallel queries, 2 more sequential ones, and 2
// getFullNoraContext() calls (each of which does its own further reads)
// before ever calling the LLM — the same shape of sequential-heavy, no-
// duration-budget route already diagnosed and fixed twice elsewhere
// (game-room/challenge/generate, dashboard/hero). Had no maxDuration,
// riding on Vercel's implicit platform default. Compounding this: its only
// caller, processWeeklyReflection() in cron/scheduled-tasks/route.js, threw
// away the fetch response entirely — never checked status, never read the
// body — so a 500 here produced literally zero trace anywhere, not even a
// console.error, every single week. Can't fully confirm this was THE cause
// without production log access (sandbox has none), but it's a real,
// definite bug matching Matt's standing rule that any signal silently not
// reaching Nora is high priority. Fixed both sides — see matching comment
// in cron/scheduled-tasks/route.js.
export const maxDuration = 45

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getWeekStart } from '@/lib/dates'
import { noraReact, parseNoraJSON } from '@/lib/nora'
import { updateNoraMemory, SIGNAL_TYPES, getFullNoraContext } from '@/lib/nora-memory'
import { verifyCoupleMembership } from '@/lib/api-auth'

// Idempotent — claims notified_at first (only proceeds if it can flip it
// from null), so two near-simultaneous callers (e.g. two Sunday cron
// windows both landing close together) can't double-push. Worst case on a
// race is zero sends instead of two, same safer-failure-direction pattern
// used elsewhere in this app (notifyIfMemoryJustUnlocked).
async function notifyReflectionReady(supabase, coupleId, reflectionId) {
  const { data: claimed } = await supabase
    .from('weekly_reflections')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', reflectionId)
    .is('notified_at', null)
    .select('id')
    .maybeSingle()

  if (!claimed) return // another concurrent call already claimed it

  const { data: couple } = await supabase
    .from('couples')
    .select('user1_id, user2_id')
    .eq('id', coupleId)
    .maybeSingle()
  if (!couple) return

  const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://abf-couples-app.vercel.app'
  const sendOne = (userId) =>
    fetch(`${appBase}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
      body: JSON.stringify({
        userId,
        title: 'Weekly Reflection',
        body: 'Your week together is ready to reflect on.',
        url: '/dashboard',
        route: 'reflection/generate',
      }),
    }).catch(() => {})

  // Solo — no partner to notify yet.
  await Promise.all(couple.user2_id ? [sendOne(couple.user1_id), sendOne(couple.user2_id)] : [sendOne(couple.user1_id)])
}

// Diagnostic log, Aug 17 2026 — see docs/database/reflection-generation-log.sql.
// This route has been silently failing every Sunday for months with zero
// trace anywhere Matt can see (1hr Vercel log retention on his plan). Logs
// every single call — cron or on-demand, success or the specific reason it
// didn't — so the next real Sunday run is diagnosable with one query.
// Non-blocking, never throws, matches the pattern already proven by
// cron_runs and nora_calls' own logging.
function logAttempt(supabase, { coupleId, weekStart, caller, outcome, detail }) {
  try {
    supabase
      .from('reflection_generation_log')
      .insert({
        couple_id: coupleId || null,
        week_start: weekStart || null,
        caller: caller || 'unknown',
        outcome,
        detail: detail ? String(detail).slice(0, 500) : null,
      })
      .then(() => {})
      .catch(() => {})
  } catch {
    // never throw
  }
}

export async function POST(request) {
  // Body is parsed up front, before auth branching, purely so coupleId is
  // available to logAttempt() even when the request fails auth — otherwise
  // a misconfigured caller (wrong secret, stale token) logs as an
  // unattributable row, which is exactly the ambiguity this exists to kill.
  let coupleId, userId
  // Hoisted out of the try block below (not `const` inside it) so the
  // top-level catch can still log an exception against a real client
  // instead of throwing a second, masking ReferenceError trying to reach a
  // block-scoped variable that's already out of scope by the time it fails.
  let supabase
  try {
    const body = await request.json()
    userId = body.userId
    coupleId = body.coupleId
  } catch {
    // malformed body — fall through, the checks below will 400/401 as before
  }

  try {
    const authHeader = request.headers.get('authorization') || ''
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    let callingUserId = null
    let caller = 'unknown'
    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
      // cron caller — trusted, no couple-membership check applies (there's
      // no "acting user" for a scheduled job iterating every couple).
      caller = 'cron'
    } else if (authHeader.startsWith('Bearer ')) {
      caller = 'user'
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !user) {
        logAttempt(supabase, { coupleId, caller, outcome: 'unauthorized', detail: authError?.message || 'invalid user token' })
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      callingUserId = user.id
    } else {
      logAttempt(supabase, { coupleId, caller: 'unknown', outcome: 'unauthorized', detail: 'no matching auth header' })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!userId || !coupleId) {
      logAttempt(supabase, { coupleId, caller, outcome: 'bad_request', detail: 'missing userId or coupleId' })
      return NextResponse.json({ error: 'userId and coupleId required' }, { status: 400 })
    }

    // Only enforced for real user-token calls — this is what previously let
    // any authenticated caller generate/read another couple's reflection by
    // supplying a guessed coupleId.
    if (callingUserId) {
      const isMember = await verifyCoupleMembership(supabase, callingUserId, coupleId)
      if (!isMember) {
        logAttempt(supabase, { coupleId, caller, outcome: 'forbidden', detail: 'caller not a member of coupleId' })
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // STEP 1 — Compute Monday of current week in Pacific time
    const weekStart = getWeekStart()

    // STEP 2 — Check for existing reflection this week
    const { data: existing } = await supabase
      .from('weekly_reflections')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('week_start', weekStart)
      .maybeSingle()

    if (existing) {
      // Push-reliability fix, Aug 11 2026 — this used to return immediately
      // here with no push, meaning the ONLY notification path was the
      // hour===3-gated block in processDailyContent (cron/scheduled-tasks).
      // If that one window was ever missed, the reflection could exist with
      // nobody ever told. Ensures the push still goes out exactly once, from
      // whichever caller (any of the 3 Sunday-touching cron windows, or the
      // client-side on-demand fallback in weekly-reflection/page.js) happens
      // to be the first to notice notified_at is still null.
      if (!existing.notified_at) {
        await notifyReflectionReady(supabase, coupleId, existing.id)
      }
      logAttempt(supabase, { coupleId, weekStart, caller, outcome: 'already_existed' })
      return NextResponse.json({ reflection: existing, alreadyExists: true })
    }

    // STEP 3 — Fetch week data
    const weekEnd = new Date(weekStart + 'T12:00:00')
    weekEnd.setDate(weekEnd.getDate() + 7)
    const weekEndStr = weekEnd.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })

    const [
      { data: sparkResponses },
      { data: betData },
      { data: rituals },
      { data: noraMemory },
      { data: userProfiles },
    ] = await Promise.all([
      supabase
        .from('spark_responses')
        .select('*, sparks(question)')
        .eq('couple_id', coupleId)
        .gte('created_at', weekStart)
        .lt('created_at', weekEndStr),
      supabase
        .from('bets')
        .select('*, bet_responses(*)')
        .eq('couple_id', coupleId)
        .gte('created_at', weekStart)
        .lt('created_at', weekEndStr),
      supabase
        .from('rituals')
        .select('*, ritual_completions(*)')
        .eq('couple_id', coupleId)
        .neq('status', 'retired'),
      supabase
        .from('nora_memory')
        .select('*')
        .eq('couple_id', coupleId)
        .maybeSingle(),
      supabase
        .from('user_profiles')
        .select('user_id, display_name, hobbies, date_preferences, stress_response, preferred_checkin_time')
        .eq('couple_id', coupleId),
    ])
    const { data: coupleRowForContext } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()
    const { data: weekDates } = await supabase
      .from('custom_dates')
      .select('title, status, date_time, created_at')
      .eq('couple_id', coupleId)
      .gte('created_at', weekStart)
      .neq('status', 'pending_delete')
      .order('created_at', { ascending: true })

    // STEP 4 — Build context string
    // ROOT CAUSE FIX Aug 17 2026 — Matt: Nora attributing a comment/action to
    // the wrong partner "will quickly kill all credibility." Traced the same
    // failure shape here: userProfiles was never keyed by user_id (the query
    // didn't even select it), so profile1/profile2 were just array position
    // [0]/[1] with no guarantee that matched user1_id/user2_id. Worse,
    // sparkLines below quoted every Spark response with ZERO name attached at
    // all, and betLines joined every partner's prediction into one
    // undifferentiated string — so the reflection prompt's own instruction to
    // tag each "moment" with the correct subject (user1/user2) had no real
    // data to ground that decision in; it was guessing from tone alone.
    // Fixed by resolving every partner-authored line through an explicit
    // user_id -> display_name map instead of position or vibes.
    const profilesByUserId = Object.fromEntries((userProfiles || []).map(p => [p.user_id, p]))
    const profile1 = coupleRowForContext ? profilesByUserId[coupleRowForContext.user1_id] : userProfiles?.[0]
    const profile2 = coupleRowForContext ? profilesByUserId[coupleRowForContext.user2_id] : userProfiles?.[1]
    const nameForUserId = (uid) => profilesByUserId[uid]?.display_name || 'Partner'
    // Solo — no user2 to build a context block for. Calling
    // getFullNoraContext with a null actingUserId wouldn't crash (couple.
    // user1_id never equals null, so it'd just fall into the "user2" branch
    // and compute a context for a signal count that's always 0), but it's
    // wasted work for a person who doesn't exist. Skip outright instead.
    const isSolo = !coupleRowForContext?.user2_id
    const [user1FullContext, user2FullContext] = coupleRowForContext
      ? await Promise.all([
          getFullNoraContext(coupleId, coupleRowForContext.user1_id, profile1?.display_name || 'Partner 1', profile2?.display_name || 'Partner 2'),
          isSolo ? Promise.resolve({ fullContextBlock: '' }) : getFullNoraContext(coupleId, coupleRowForContext.user2_id, profile2?.display_name || 'Partner 2', profile1?.display_name || 'Partner 1'),
        ])
      : [{ fullContextBlock: '' }, { fullContextBlock: '' }]

    const sparkLines = (sparkResponses || [])
      .map(r => `- Spark: "${r.sparks?.question || 'unknown'}" → ${nameForUserId(r.user_id)}: "${r.response}"`)
      .join('\n')

    const betLines = (betData || [])
      .map(b => {
        const responses = (b.bet_responses || [])
          .map(r => `${nameForUserId(r.user_id)}: "${r.prediction}"`)
          .join(', ')
        return `- Bet: "${b.question}" → Predictions: ${responses || 'none'}`
      })
      .join('\n')

    const ritualLines = (rituals || [])
      .filter(r => r.status === 'discovering' || r.status === 'active')
      .map(r => {
        const completionsThisWeek = (r.ritual_completions || []).filter(
          c => c.week_start === weekStart
        )
        return `- Ritual: "${r.title}" (streak: ${r.streak || 0}, completed this week: ${completionsThisWeek.length > 0 ? 'yes' : 'no'})`
      })
      .join('\n')

    const memoryContext = [noraMemory?.memory_summary, user1FullContext.fullContextBlock, user2FullContext.fullContextBlock]
      .filter(Boolean)
      .join('\n\n')

    const profileContext = [profile1, profile2]
      .filter(Boolean)
      .map(p => {
        const parts = []
        if (p.display_name) parts.push(`Name: ${p.display_name}`)
        if (p.hobbies?.length) parts.push(`Hobbies: ${p.hobbies.join(', ')}`)
        if (p.date_preferences?.length) parts.push(`Date preferences: ${p.date_preferences.join(', ')}`)
        if (p.stress_response) parts.push(`Stress response: ${p.stress_response}`)
        return parts.join(', ')
      })
      .join('\n')

    const dateLines = (weekDates || []).map(d =>
      `- Date "${d.title}" — status: ${d.status}${d.date_time ? ', scheduled: ' + new Date(d.date_time).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : ''}`
    )

    const contextString = (`
WEEK: ${weekStart}

COUPLE PROFILES:
${profileContext || 'No profile data available.'}

NORA MEMORY:
${memoryContext || 'No memory yet.'}

SPARKS THIS WEEK:
${sparkLines || 'None.'}

BETS THIS WEEK:
${betLines || 'None.'}

ACTIVE RITUALS:
${ritualLines || 'None.'}` + (dateLines.length > 0 ? `\n\nDATE ACTIVITY THIS WEEK:\n${dateLines.join('\n')}` : '')).trim()

    // STEP 5 — Generate reflection using Claude
    // Solo — a genuinely different framing, not the couple prompt with a
    // blank left in for user2. "Which partner" and "pattern across their
    // sparks/bets/rituals together" both presuppose two people; asking
    // Nora to pick a subject between a real person and a placeholder
    // 'Partner 2' produces confused, half-empty output instead of just
    // not asking the question.
    const systemPrompt = isSolo
      ? `You've been paying attention to this person all week — no partner yet, just them navigating the app and their days on their own. The reflection moments you surface should be specific to what actually happened — not generic prompts dressed up with their name. Each observation should make them feel caught in the best possible way: "Nora noticed that." Never preachy. Never therapeutic framing. The prompt that follows each observation opens something they haven't said yet — not something they've already answered. Never write as if a partner is present or reference "you two" — this is about them alone this week.

You return ONLY valid JSON in this exact format:
{
  "opening": "A 2-3 sentence personal greeting that acknowledges their week and sets a warm tone. Reference something specific if possible.",
  "moments": [
    {
      "subject": "user1",
      "observation": "A specific observation about something they did or shared this week (1-2 sentences)",
      "prompt": "A reflective question or gentle nudge related to that observation"
    }
  ],
  "pattern": "1-2 sentences about a pattern or theme you noticed across the week — something connecting their sparks, bets, or rituals",
  "week_ahead": "A brief, warm closing that looks forward to the coming week (1-2 sentences). Can include a soft suggestion or encouragement."
}

The moments array should have 2-3 items. Do not include more than 3. If there is not much data, make fewer and more thoughtful observations.

Return only the JSON object. No markdown, no explanation, no wrapper text.`
      : `You've been paying attention to this couple all week. The reflection moments you surface should be specific to what actually happened — not generic prompts dressed up with their names. Each observation should make them feel caught in the best possible way: "Nora noticed that." Never preachy. Never therapeutic framing. The prompt that follows each observation opens something they haven't said yet — not something they've already answered.

You return ONLY valid JSON in this exact format:
{
  "opening": "A 2-3 sentence personal greeting that acknowledges the week and sets a warm tone. Reference something specific from their week if possible.",
  "moments": [
    {
      "subject": "user1 or user2 — which partner this moment is primarily about",
      "observation": "A specific observation about something they did or shared this week (1-2 sentences)",
      "prompt": "A reflective question or gentle nudge related to that observation"
    }
  ],
  "pattern": "1-2 sentences about a pattern or theme you noticed across the week — something connecting their sparks, bets, or rituals",
  "week_ahead": "A brief, warm closing that looks forward to the coming week (1-2 sentences). Can include a soft suggestion or encouragement."
}

The moments array should have 2-3 items. Do not include more than 3. If there is not much data, make fewer and more thoughtful observations.

Return only the JSON object. No markdown, no explanation, no wrapper text.`

    const user1Name = profile1?.display_name || 'Partner 1'
    const user2Name = profile2?.display_name || 'Partner 2'
    const message = await noraReact(
      isSolo
        ? `Here is the data for this person's week:\n\n${contextString}\n\nGenerate their weekly reflection. Every moment's "subject" is "user1" — there's no partner to attribute anything to yet.`
        : `Here is the data for this couple's week:\n\n${contextString}\n\nGenerate their weekly reflection.\n\nIMPORTANT: In the moments array, set "subject" to "user1" when the moment is primarily about ${user1Name}, and "user2" when it is primarily about ${user2Name}. Every Spark and Bet line above is already labeled with the exact name of who said it — use that label, never guess from tone or phrasing, and never swap which partner an answer or action belongs to. If a moment is about both equally, assign it to whichever partner's action or statement it centers on.`,
      {
        route: 'reflection/generate',
        system: systemPrompt,
        context: 'daily',
        maxTokens: 1200,
      }
    )

    // STEP 6 — Parse response. Was a bare JSON.parse with no fence-stripping
    // or preamble-extraction at all — the highest-risk shape in the whole
    // sweep, on a 4-field response with a nested moments array. See
    // parseNoraJSON in lib/nora.js.
    const rawText = message || ''
    let parsed
    try {
      parsed = parseNoraJSON(rawText)
    } catch (parseErr) {
      console.error('[reflection/generate] Failed to parse Claude response:', rawText)
      logAttempt(supabase, { coupleId, weekStart, caller, outcome: 'parse_failed', detail: `${parseErr?.message || 'parse error'} | raw: ${rawText.slice(0, 200)}` })
      return NextResponse.json({ error: 'Failed to parse reflection' }, { status: 500 })
    }

    const { opening, moments, pattern, week_ahead } = parsed

    if (!opening || !moments || !pattern || !week_ahead) {
      const missing = ['opening', 'moments', 'pattern', 'week_ahead'].filter(k => !parsed[k])
      logAttempt(supabase, { coupleId, weekStart, caller, outcome: 'incomplete', detail: `missing: ${missing.join(', ')}` })
      return NextResponse.json({ error: 'Incomplete reflection from Claude' }, { status: 500 })
    }

    // STEP 7 — Save to weekly_reflections
    const now = new Date().toISOString()
    const { data: savedReflection, error: insertError } = await supabase
      .from('weekly_reflections')
      .insert({
        couple_id: coupleId,
        week_start: weekStart,
        opening,
        moments,
        pattern,
        week_ahead,
        generated_at: now,
      })
      .select('*')
      .maybeSingle()

    if (insertError) {
      console.error('[reflection/generate] Insert error:', insertError)
      logAttempt(supabase, { coupleId, weekStart, caller, outcome: 'insert_failed', detail: insertError.message })
      return NextResponse.json({ error: 'Failed to save reflection' }, { status: 500 })
    }

    updateNoraMemory({
      coupleId,
      userId,
      signalType: SIGNAL_TYPES.WEEKLY_REFLECTION,
      inputData: {
        opening,
        moments,
        pattern,
        week_ahead,
      },
    }).catch(() => {})

    // STEP 8 — Fire-and-forget nora_memory update
    // Fixed: was writing to non-existent 'summary'/'updated_at' columns.
    // Real columns are 'memory_summary' and 'last_updated'.
    const memoryUpdate = `Week of ${weekStart}: ${pattern}`
    supabase
      .from('nora_memory')
      .upsert(
        {
          couple_id: coupleId,
          memory_summary: noraMemory?.memory_summary
            ? `${noraMemory.memory_summary}\n${memoryUpdate}`
            : memoryUpdate,
          last_updated: now,
        },
        { onConflict: 'couple_id' }
      )
      .then(() => {})
      .catch(() => {})

    // Notify both users that this week's reflection is ready — same
    // idempotent helper as the `existing` early-return path above, so
    // there's exactly one notify code path instead of two.
    try {
      await notifyReflectionReady(supabase, coupleId, savedReflection.id)
    } catch (notifyErr) {
      console.error('[reflection/generate] notify error:', notifyErr)
    }

    logAttempt(supabase, { coupleId, weekStart, caller, outcome: 'success' })
    return NextResponse.json({ reflection: savedReflection, alreadyExists: false })
  } catch (err) {
    console.error('[reflection/generate] Error:', err)
    if (supabase) {
      logAttempt(supabase, { coupleId, caller: 'unknown', outcome: 'exception', detail: err?.message || String(err) })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
