import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { getTodayString } from '@/lib/dates'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId      = searchParams.get('userId')
    const coupleId    = searchParams.get('coupleId')
    const userName    = searchParams.get('userName') || null
    const partnerName = searchParams.get('partnerName') || 'your partner'
    const lat         = searchParams.get('lat')
    const lon         = searchParams.get('lon')

    if (!userId || !coupleId) {
      return NextResponse.json({ error: 'userId and coupleId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const todayStr  = getTodayString('America/Los_Angeles')
    const dayOfWeek = new Date(todayStr + 'T12:00:00').getDay() // 0=Sun, 1=Mon, ..., 6=Sat

    // ── Fetch partner id ──────────────────────────────────────────────────────
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    const partnerId = couple
      ? (couple.user1_id === userId ? couple.user2_id : couple.user1_id)
      : null

    // ── Feature status ────────────────────────────────────────────────────────
    let feature = null // { type, label, mine, theirs }

    if (dayOfWeek === 3) {
      // Wednesday — Bet
      const { data: bet } = await supabase
        .from('bets')
        .select('id, question')
        .eq('couple_id', coupleId)
        .eq('bet_date', todayStr)
        .maybeSingle()

      if (bet) {
        const [{ data: mine }, { data: theirs }] = await Promise.all([
          supabase.from('bet_responses').select('prediction, nora_reaction').eq('bet_id', bet.id).eq('user_id', userId).maybeSingle(),
          partnerId ? supabase.from('bet_responses').select('prediction').eq('bet_id', bet.id).eq('user_id', partnerId).maybeSingle() : Promise.resolve({ data: null }),
        ])
        feature = { type: 'bet', label: 'Bet', question: bet.question, mine: mine || null, theirs: theirs || null }
      }
    } else if (dayOfWeek >= 1 && dayOfWeek <= 4) {
      // Mon / Tue / Thu — Spark
      const { data: spark } = await supabase
        .from('sparks')
        .select('id, prompt')
        .eq('couple_id', coupleId)
        .eq('spark_date', todayStr)
        .maybeSingle()

      if (spark) {
        const [{ data: mine }, { data: theirs }] = await Promise.all([
          supabase.from('spark_responses').select('responded_at, reaction_icon').eq('spark_id', spark.id).eq('user_id', userId).maybeSingle(),
          partnerId ? supabase.from('spark_responses').select('responded_at').eq('spark_id', spark.id).eq('user_id', partnerId).maybeSingle() : Promise.resolve({ data: null }),
        ])
        feature = { type: 'spark', label: 'Spark', prompt: spark.prompt, mine: mine || null, theirs: theirs || null }
      }
    } else if (dayOfWeek === 5) {
      // Friday — Ritual
      const { data: ritual } = await supabase
        .from('rituals')
        .select('id, title, status')
        .eq('couple_id', coupleId)
        .in('status', ['discovering', 'adopted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (ritual) {
        feature = { type: 'ritual', label: 'Ritual', title: ritual.title, status: ritual.status, mine: null, theirs: null }
      }
    }

    // ── Next upcoming date plan ───────────────────────────────────────────────
    const { data: nextDate } = await supabase
      .from('date_plans')
      .select('id, title, date_time')
      .eq('couple_id', coupleId)
      .eq('status', 'planned')
      .gte('date_time', new Date().toISOString())
      .order('date_time', { ascending: true })
      .limit(1)
      .maybeSingle()

    const daysUntilDate = nextDate
      ? Math.round((new Date(nextDate.date_time) - new Date()) / 86400000)
      : null

    // ── Pills: next two feature days + upcoming date ─────────────────────────
    const DAY_ABBR      = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    const FEATURE_LABEL = { 0: 'Reflection', 1: 'The Spark', 2: 'The Spark', 3: 'The Bet', 4: 'The Spark', 5: 'Ritual' }

    const pills = []
    let scan = (dayOfWeek + 1) % 7
    let scanned = 0
    while (pills.length < 2 && scanned < 7) {
      const label = FEATURE_LABEL[scan]
      if (label) pills.push(`${DAY_ABBR[scan]} · ${label}`)
      scan = (scan + 1) % 7
      scanned++
    }

    if (nextDate && daysUntilDate !== null && daysUntilDate <= 7) {
      const dateDay = new Date(nextDate.date_time).getDay()
      pills.push(`${DAY_ABBR[dateDay]} · ${nextDate.title}`)
    }

    // ── Weather (optional) ────────────────────────────────────────────────────
    let weather = null
    if (lat && lon) {
      try {
        const wRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&temperature_unit=fahrenheit`
        )
        if (wRes.ok) {
          const wData = await wRes.json()
          const temp = wData.current?.temperature_2m
          const code = wData.current?.weathercode
          // WMO codes: 51-67 = rain/drizzle, 71-77 = snow, 80-82 = showers, 95-99 = thunderstorm
          const isRain  = code >= 51 && code <= 67
          const isSnow  = code >= 71 && code <= 77
          const isStorm = code >= 95
          const isHot   = temp >= 95
          const isCold  = temp <= 25
          if (isRain || isSnow || isStorm || isHot || isCold) {
            weather = { temp: Math.round(temp), code, isRain, isSnow, isStorm, isHot, isCold }
          }
        }
      } catch { /* non-blocking */ }
    }

    // ── Determine priority and CTA ────────────────────────────────────────────
    let priority = 5
    let cta_label = 'Talk to Nora'
    let cta_href  = '/ai-coach'

    if (feature && feature.type !== 'ritual') {
      const mineActed   = feature.type === 'bet' ? !!feature.mine?.prediction : !!feature.mine?.responded_at
      const theirsActed = feature.type === 'bet' ? !!feature.theirs?.prediction : !!feature.theirs?.responded_at

      if (!mineActed && !theirsActed) {
        priority  = 1
        cta_label = 'Go to Today'
        cta_href  = '/today'
      } else if (theirsActed && !mineActed) {
        priority  = 2
        cta_label = 'Go to Today'
        cta_href  = '/today'
      } else if (mineActed && theirsActed) {
        priority  = 3
        cta_label = 'Talk to Nora'
        cta_href  = '/ai-coach'
      }
    } else if (feature?.type === 'ritual') {
      priority  = 1
      cta_label = 'Go to Today'
      cta_href  = '/today'
    }

    if (priority === 5 && nextDate && daysUntilDate <= 3) {
      priority  = 4
      cta_label = 'View the plan'
      cta_href  = '/date-night'
    }

    // ── Build Claude prompt ───────────────────────────────────────────────────
    const name = userName || 'there'

    const featureContext = feature
      ? (() => {
          if (feature.type === 'bet') {
            const mineActed   = !!feature.mine?.prediction
            const theirsActed = !!feature.theirs?.prediction
            if (priority === 1) return `Today is Bet day. Neither you nor ${partnerName} has submitted a prediction yet. Question: "${feature.question}"`
            if (priority === 2) return `Today is Bet day. ${partnerName} already submitted their prediction. You haven't yet. Question: "${feature.question}"`
            if (priority === 3) return `Both you and ${partnerName} answered today's Bet. Question: "${feature.question}"`
          }
          if (feature.type === 'spark') {
            const mineActed   = !!feature.mine?.responded_at
            const theirsActed = !!feature.theirs?.responded_at
            if (priority === 1) return `Today has a Spark prompt. Neither of you has responded. Prompt: "${feature.prompt}"`
            if (priority === 2) return `Today has a Spark prompt. ${partnerName} already responded. You haven't yet. Prompt: "${feature.prompt}"`
            if (priority === 3) return `Both of you responded to today's Spark. Prompt: "${feature.prompt}"`
          }
          if (feature.type === 'ritual') {
            return `It's Friday. You two have a ${feature.status === 'adopted' ? 'running ritual' : 'ritual you\'re trying out'}: "${feature.title}"`
          }
          return null
        })()
      : null

    const dateContext = nextDate && daysUntilDate <= 3
      ? `Upcoming date: "${nextDate.title}" in ${daysUntilDate === 0 ? 'tonight' : daysUntilDate === 1 ? '1 day' : `${daysUntilDate} days`}.`
      : null

    const weatherContext = weather
      ? weather.isSnow  ? `It's snowing outside (${weather.temp}°F).`
      : weather.isStorm ? `There's a thunderstorm outside (${weather.temp}°F).`
      : weather.isRain  ? `It's raining outside (${weather.temp}°F).`
      : weather.isHot   ? `It's ${weather.temp}°F outside — really hot.`
      : weather.isCold  ? `It's ${weather.temp}°F outside — really cold.`
      : null
      : null

    const systemPrompt = `You are Nora, a warm and perceptive relationship coach. Write a single short message (1-2 sentences, max 20 words) for the dashboard hero card. Be direct and human — no fluff, no filler. Do not start with "Hey" or "Hi". Use the user's name if provided. Reference specific context if available. Tone: warm, grounded, occasionally a little playful. When referencing a feature, always use its full name — "The Bet", "The Spark", "The Ritual", or "Weekly Reflection". Never substitute with "it", "this", or "today's activity".`

    const userPrompt = [
      `User's name: ${name}`,
      `Partner's name: ${partnerName}`,
      featureContext  ? `Feature context: ${featureContext}` : null,
      dateContext     ? `Date context: ${dateContext}` : null,
      weatherContext  ? `Weather: ${weatherContext}` : null,
      `Priority level: ${priority} (1=feature urgent, 2=partner acted, 3=both done, 4=date soon, 5=quiet day)`,
      `Write the message now.`,
    ].filter(Boolean).join('\n')

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const aiRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    const message = aiRes.content?.[0]?.text?.trim() || `Good to see you, ${name}.`

    return NextResponse.json({ message, cta_label, cta_href, pills })
  } catch (err) {
    console.error('[dashboard/hero] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
