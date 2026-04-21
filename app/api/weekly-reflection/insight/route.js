import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { noraReact } from '@/lib/nora'

export async function POST(request) {
  try {
    const {
      reflectionId,
      coupleId,
      user1Name,
      user2Name,
      user1Pick,
      user2Pick,
      user1Reason,
      user2Reason,
    } = await request.json()

    const prompt = `Analyze a couple's weekly reflection.

${user1Name} picked this moment from ${user2Name}'s check-ins this week:
"${user1Pick}"
Why they picked it: "${user1Reason || 'No reason given'}"

${user2Name} picked this moment from ${user1Name}'s check-ins this week:
"${user2Pick}"
Why they picked it: "${user2Reason || 'No reason given'}"

Write a 2-3 sentence observation about what these choices reveal about their relationship.
Be warm, specific, and insightful. Notice patterns, emotional themes, or what they value
in each other. Do not be generic. Do not use their names more than once each.
Do not start with "I" or "It seems". Be direct and meaningful.`

    const message = await noraReact(prompt, {
      route: 'weekly-reflection/insight',
      context: 'daily',
      maxTokens: 200,
      system: 'You\'ve been watching this couple all week — their answers, their patterns, what they chose to engage with and what they let slide. This is your one moment to say the thing you\'ve been noticing. Not a summary of their week. The one observation that would make them look at each other differently tonight. Specific to them. Never generic. Two sentences maximum.',
    })

    const insight = message

    // Save insight to reflection record
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    await supabase
      .from('weekly_reflections')
      .update({ ai_insight: insight })
      .eq('id', reflectionId)

    return NextResponse.json({ insight })
  } catch (error) {
    console.error('Insight error:', error)
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 })
  }
}
