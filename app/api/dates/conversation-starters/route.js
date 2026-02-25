import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
})

export async function POST(request) {
  try {
    const { coupleId, userId, dateTitle, stops } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch couple user IDs first, then profiles
    const coupleRes = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    const userIds = [coupleRes.data?.user1_id, coupleRes.data?.user2_id].filter(Boolean)

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('display_name, love_language_primary, hobbies, date_preferences')
      .in('user_id', userIds)

    // Fetch assessments
    const { data: assessments } = await supabase
      .from('relationship_assessments')
      .select('user_id, module_results, overall_percentage')
      .eq('couple_id', coupleId)

    // Fetch recent check-ins for themes
    const { data: checkins } = await supabase
      .from('daily_checkins')
      .select('question_text, question_response')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Fetch recent weekly reflection themes
    const { data: reflection } = await supabase
      .from('weekly_reflections')
      .select('ai_insight, user1_reason, user2_reason')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const stopNames = (stops || []).map(s => s.name).join(', ')
    const checkinThemes = (checkins || [])
      .map(c => c.question_response)
      .filter(Boolean)
      .slice(0, 5)
      .join('; ')
    const reflectionInsight = reflection?.ai_insight || ''
    const assessmentSummary = (assessments || [])
      .map(a => `${a.user_id}: ${a.overall_percentage}% overall`)
      .join(', ')

    const prompt = `You are a warm relationship coach generating conversation starters for a couple going on a date.

Date: "${dateTitle}"
Stops: ${stopNames || 'not specified'}
Recent check-in themes: ${checkinThemes || 'none available'}
Recent reflection insight: ${reflectionInsight || 'none available'}
Assessment summary: ${assessmentSummary || 'none available'}

Generate exactly 9 conversation starters in 3 categories.
Return ONLY valid JSON, no markdown, no explanation:

{
  "personalized": [
    "question 1",
    "question 2",
    "question 3"
  ],
  "fun": [
    "question 4",
    "question 5",
    "question 6"
  ],
  "growth": [
    "question 7",
    "question 8",
    "question 9"
  ]
}

Personalized: Draw from the check-in themes and reflection insight. Be specific to what this couple has shared, not generic.
Fun: Light, playful, curious questions perfect for a date night.
Growth: Warm questions that deepen understanding of each other.
Do not number the questions. Do not add labels inside the strings.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = message.content[0].text.trim()
    const starters = JSON.parse(raw)

    return NextResponse.json({ starters })
  } catch (error) {
    console.error('Conversation starters error:', error)
    return NextResponse.json({ error: 'Failed to generate' }, { status: 500 })
  }
}
