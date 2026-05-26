export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { getSparkQuestion } from '@/lib/spark-questions'
import { getBetQuestion } from '@/lib/bet-questions'
import { getTodayString, getDayOfWeek } from '@/lib/dates'
import { noraGenerate, noraChat } from '@/lib/nora'
import { getNoraMemory, getMemoryBriefing } from '@/lib/nora-memory'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SPARK_DAYS = [1] // Mon
const BET_DAYS = [2] // Tue

async function sendPush(userId, title, body, url, route) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
      body: JSON.stringify({ userId, title, body, url, route }),
    })
  } catch {
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
    await sendPush(user2.user_id, 'The Spark', 'The Spark is ready.', '/dashboard', 'cron/spark')
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

    await sendPush(user1.user_id, 'The Bet', "The Bet is ready. Do you know them?", '/dashboard', 'cron/bet')
    await sendPush(user2.user_id, 'The Bet', "The Bet is ready. Do you know them?", '/dashboard', 'cron/bet')
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
      await sendPush(user1.user_id, 'The Ritual', `${ritual.title} — check in together today.`, '/dashboard', 'cron/ritual')
      await sendPush(user2.user_id, 'The Ritual', `${ritual.title} — check in together today.`, '/dashboard', 'cron/ritual')
    }
  }

  if (day === 6) {
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

  if (day === 0) {
    await sendPush(user1.user_id, 'Weekly Reflection', `Your week with ${user2Name} — Nora is ready when you are.`, '/dashboard', 'cron/reflection')
    await sendPush(user2.user_id, 'Weekly Reflection', `Your week with ${user1Name} — Nora is ready when you are.`, '/dashboard', 'cron/reflection')
  }

  if (day === 0) {
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

async function processWeeklyReflection(couple) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/reflection/generate`, {
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
  } catch (err) { console.error('[reflection/generate] couple:', couple.id, err) }
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

    // Fetch recent activity context
    const [{ data: recentSparks }, noraMemory] = await Promise.all([
      supabase
        .from('sparks')
        .select('prompt, spark_date, spark_responses(user_id, response_text)')
        .eq('couple_id', couple.id)
        .order('spark_date', { ascending: false })
        .limit(4),
      getNoraMemory(couple.id)
    ])

    const memoryBriefing = noraMemory ? getMemoryBriefing(noraMemory, user1Name, user2Name) : null

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
      memoryBriefing ? `What you know about this couple:\n${memoryBriefing}` : null,
      `Recent Spark answers this week:\n${recentContext}`,
      `Generate a Thursday observation and calibrated question specifically for ${user1Name} — angle it toward what you notice about them individually, not just the couple.`
    ].filter(Boolean).join('\n\n')

    // Generate for user2
    const user2Prompt = [
      `You are speaking to ${user2Name}.`,
      memoryBriefing ? `What you know about this couple:\n${memoryBriefing}` : null,
      `Recent Spark answers this week:\n${recentContext}`,
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

  } catch (err) {
    console.error('[thursday/reveal] couple:', couple.id, err)
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
      const raw = response.replace(/```json|```/g, '').trim()
      try {
        parsed = JSON.parse(raw)
      } catch {
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
      const day = getDayInTimezone(user1.timezone || user2.timezone || 'America/Los_Angeles')
      if (day === 0) await processWeeklyReflection(couple)
      if (day === 4) await processThursdayGeneration(couple, user1, user2)
      if (new Date().getUTCDay() === 5 && new Date().getUTCHours() === 2) await processThursdayReveal(couple, user1, user2)
      processed++
    }

    processNoraSynthesis(couples, profileMap)
    await processRabbitHoleConvergence()

    return Response.json({ ok: true, processed })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
