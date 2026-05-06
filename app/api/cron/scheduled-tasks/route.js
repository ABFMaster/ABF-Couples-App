export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { getSparkQuestion } from '@/lib/spark-questions'
import { getBetQuestion } from '@/lib/bet-questions'
import { getTodayString, getDayOfWeek } from '@/lib/dates'
import { noraGenerate } from '@/lib/nora'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SPARK_DAYS = [1, 2, 4] // Mon, Tue, Thu
const BET_DAYS = [3] // Wed

async function sendPush(userId, title, body, url) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
      body: JSON.stringify({ userId, title, body, url }),
    })
    const result = await res.json()
    console.log('[sendPush] result:', JSON.stringify(result))
  } catch (err) {
    console.error('[sendPush] error:', err)
  }
}

function getHourInTimezone(timezone) {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    return parseInt(formatter.format(now), 10)
  } catch {
    return -1
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
  const timezone = user1.timezone || user2.timezone || 'America/Los_Angeles'
  const hour = getHourInTimezone(timezone)
  const day = getDayInTimezone(timezone)
  const todayStr = getTodayInTimezone(timezone)

  if (hour !== 3) return
  console.log('[cron] processing couple, hour:', hour, 'day:', day, 'timezone:', timezone)
  if (!todayStr) return

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

    console.log('[cron] sending spark push to:', user1.user_id, user2.user_id)
    await sendPush(user1.user_id, 'The Spark', 'The Spark is ready.', '/dashboard')
    await sendPush(user2.user_id, 'The Spark', 'The Spark is ready.', '/dashboard')
    console.log('[cron] push sent')
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
      .select('question_id')
      .eq('couple_id', couple.id)

    const usedIds = (usedBets || []).map(b => b.question_id).filter(Boolean)
    const q = getBetQuestion({ coupleAgeDays, usedIds })
    if (!q) return

    await supabase.from('bets').insert({
      couple_id: couple.id,
      question: q.question,
      question_id: q.id,
      question_level: q.level,
      question_category: q.category || null,
      bet_date: todayStr,
    })

    console.log('[cron] sending bet push to:', user1.user_id, user2.user_id)
    await sendPush(user1.user_id, 'The Bet', "Today's Bet is ready. Make your prediction.", '/dashboard')
    await sendPush(user2.user_id, 'The Bet', "Today's Bet is ready. Make your prediction.", '/dashboard')
    console.log('[cron] push sent')
  }

  // Re-engagement push — only on days with no other push (Fri, Sat, Sun)
  if (![1, 2, 3, 4].includes(day)) {
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

  const prompt = `You are sending a push notification to ${user1Name} to invite them to play a Game Room activity with ${user2Name}. They haven't played together in 7+ days. ${unsaidThing ? `What Nora is watching for: ${unsaidThing}` : ''} Trajectory: ${trajectory}. Write ONE push notification (max 12 words, no quotes) that feels personal and creates genuine curiosity — not generic. Reference something specific about this couple if possible. Never say "feel like playing" or use the word "game".`

  try {
    const body = await noraGenerate(prompt, { route: 'cron/scheduled-tasks', maxTokens: 60 })
    await sendPush(user1.user_id, 'ABF', body.trim(), '/game-room')
    await sendPush(user2.user_id, 'ABF', body.trim(), '/game-room')
  } catch (err) {
    console.error('[cron] sendReengagementPush error:', err)
  }
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
      const raw = response.replace(/```json|```/g, '').trim()
      try {
        parsed = JSON.parse(raw)
      } catch (e) {
        console.error('[cron/scheduled-tasks] JSON parse failed:', raw)
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

      await sendPush(coupleData.user1_id, 'Nora closed the loop', 'Your Rabbit Hole has a ending. Come see what she found.', `/game-room/rabbit-hole/debrief?sessionId=${session.id}`)
      await sendPush(coupleData.user2_id, 'Nora closed the loop', 'Your Rabbit Hole has a ending. Come see what she found.', `/game-room/rabbit-hole/debrief?sessionId=${session.id}`)

    } catch {}
  }
}

export async function GET(request) {
  console.log('[cron] handler started', new Date().toISOString())
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: couples } = await supabase
      .from('couples')
      .select('id, created_at, user1_id, user2_id')
      .not('user2_id', 'is', null)
    console.log('[cron] couples found:', couples?.length)

    if (!couples?.length) {
      return Response.json({ ok: true, processed: 0 })
    }

    const userIds = couples.flatMap(c => [c.user1_id, c.user2_id])
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, timezone, display_name')
      .in('user_id', userIds)

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]))

    let processed = 0
    for (const couple of couples) {
      const user1 = profileMap[couple.user1_id] || {}
      const user2 = profileMap[couple.user2_id] || {}
      await processDailyContent(couple, user1, user2)
      processed++
    }

    await processRabbitHoleConvergence()

    return Response.json({ ok: true, processed })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
