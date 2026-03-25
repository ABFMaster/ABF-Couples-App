import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getWeekStart } from '@/lib/dates'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'

export async function POST(request) {
  try {
    const { userId, coupleId } = await request.json()

    if (!userId || !coupleId) {
      return NextResponse.json({ error: 'userId and coupleId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

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
        .select('*, sparks(prompt)')
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
        .select('display_name, hobbies, date_preferences, stress_response, preferred_checkin_time')
        .eq('couple_id', coupleId),
    ])

    // STEP 4 — Build context string
    const profile1 = userProfiles?.[0]
    const profile2 = userProfiles?.[1]

    const sparkLines = (sparkResponses || [])
      .map(r => `- Spark: "${r.sparks?.prompt || 'unknown'}" → Response: "${r.response}"`)
      .join('\n')

    const betLines = (betData || [])
      .map(b => {
        const responses = (b.bet_responses || []).map(r => `"${r.prediction}"`).join(', ')
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

    const memoryContext = noraMemory?.summary || ''

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

    const contextString = `
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
${ritualLines || 'None.'}
`.trim()

    // STEP 5 — Generate reflection using Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const systemPrompt = `You are Nora, a warm and perceptive relationship coach embedded in ABF, a couples app. You write weekly reflections for couples based on their shared activities throughout the week.

Your voice is:
- Warm and direct, like a trusted friend who pays close attention
- Specific — you reference actual things they did, not vague generalities
- Encouraging without being saccharine
- Occasionally gently challenging — you notice patterns and name them
- Never preachy or clinical

You return ONLY valid JSON in this exact format:
{
  "opening": "A 2-3 sentence personal greeting that acknowledges the week and sets a warm tone. Reference something specific from their week if possible.",
  "moments": [
    {
      "observation": "A specific observation about something they did or shared this week (1-2 sentences)",
      "prompt": "A reflective question or gentle nudge related to that observation"
    }
  ],
  "pattern": "1-2 sentences about a pattern or theme you noticed across the week — something connecting their sparks, bets, or rituals",
  "week_ahead": "A brief, warm closing that looks forward to the coming week (1-2 sentences). Can include a soft suggestion or encouragement."
}

The moments array should have 2-3 items. Do not include more than 3. If there is not much data, make fewer and more thoughtful observations.

Return only the JSON object. No markdown, no explanation, no wrapper text.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Here is the data for this couple's week:\n\n${contextString}\n\nGenerate their weekly reflection.`,
        },
      ],
    })

    // STEP 6 — Parse response
    const rawText = message.content[0]?.text || ''
    let parsed
    try {
      parsed = JSON.parse(rawText)
    } catch {
      console.error('[reflection/generate] Failed to parse Claude response:', rawText)
      return NextResponse.json({ error: 'Failed to parse reflection' }, { status: 500 })
    }

    const { opening, moments, pattern, week_ahead } = parsed

    if (!opening || !moments || !pattern || !week_ahead) {
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
      return NextResponse.json({ error: 'Failed to save reflection' }, { status: 500 })
    }

    updateNoraMemory({
      coupleId,
      signalType: SIGNAL_TYPES.WEEKLY_REFLECTION,
      inputData: {
        opening,
        moments,
        pattern,
        week_ahead,
      },
    }).catch(() => {})

    // STEP 8 — Fire-and-forget nora_memory update
    const memoryUpdate = `Week of ${weekStart}: ${pattern}`
    supabase
      .from('nora_memory')
      .upsert(
        {
          couple_id: coupleId,
          summary: noraMemory?.summary
            ? `${noraMemory.summary}\n${memoryUpdate}`
            : memoryUpdate,
          updated_at: now,
        },
        { onConflict: 'couple_id' }
      )
      .then(() => {})
      .catch(() => {})

    // Notify both users that this week's reflection is ready
    const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://abf-couples-app.vercel.app'
    try {
      const { data: couple } = await supabase
        .from('couples')
        .select('user1_id, user2_id')
        .eq('id', coupleId)
        .maybeSingle()
      if (couple) {
        await Promise.all([
          fetch(`${appBase}/api/push/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: couple.user1_id,
              title: 'Weekly Reflection',
              body: "Your week together is ready to reflect on.",
              url: '/today',
            }),
          }).catch(() => {}),
          fetch(`${appBase}/api/push/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: couple.user2_id,
              title: 'Weekly Reflection',
              body: "Your week together is ready to reflect on.",
              url: '/today',
            }),
          }).catch(() => {}),
        ])
      }
    } catch { /* non-blocking */ }

    return NextResponse.json({ reflection: savedReflection, alreadyExists: false })
  } catch (err) {
    console.error('[reflection/generate] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
