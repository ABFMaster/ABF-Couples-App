import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { CHALLENGE_PROMPTS, MEMORY_UNLOCK } from '@/lib/challenge-prompts'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const anthropic = new Anthropic()

export async function POST(request) {
  try {
    const { userId, coupleId, sessionId, totalRounds } = await request.json()

    if (!userId || !coupleId || !sessionId || !totalRounds) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (![1, 3, 5].includes(totalRounds)) {
      return Response.json({ error: 'totalRounds must be 1, 3, or 5' }, { status: 400 })
    }

    // Check memory unlock eligibility
    const { count: timelineCount } = await supabase
      .from('timeline_events')
      .select('*', { count: 'exact', head: true })
      .eq('couple_id', coupleId)

    const { count: sparkBetCount } = await supabase
      .from('spark_responses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const { count: betCount } = await supabase
      .from('bet_responses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('created_at')
      .eq('id', userId)
      .single()

    const accountAgeWeeks = userProfile
      ? (Date.now() - new Date(userProfile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 7)
      : 0

    const memoryUnlocked =
      (timelineCount || 0) >= MEMORY_UNLOCK.minTimelineEvents &&
      (sparkBetCount || 0) + (betCount || 0) >= MEMORY_UNLOCK.minSparkBetResponses &&
      accountAgeWeeks >= MEMORY_UNLOCK.minAccountAgeWeeks

    // Fetch couple context for Nora recommendation
    const { data: coupleData } = await supabase
      .from('couples')
      .select('user1_id, user2_id, created_at')
      .eq('id', coupleId)
      .single()

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name, love_language, attachment_style')
      .in('user_id', [coupleData.user1_id, coupleData.user2_id])

    const { data: noraMemory } = await supabase
      .from('nora_memory')
      .select('memory_summary')
      .eq('couple_id', coupleId)
      .single()

    const coupleAgeWeeks = coupleData
      ? (Date.now() - new Date(coupleData.created_at).getTime()) / (1000 * 60 * 60 * 24 * 7)
      : 0

    const availableTypes = ['story', 'pitch', 'rank', 'plan']
    if (memoryUnlocked) availableTypes.push('memory')

    const profileSummary = profiles
      ? profiles.map(p => `${p.display_name}: love language ${p.love_language || 'unknown'}, attachment ${p.attachment_style || 'unknown'}`).join('; ')
      : 'couple profiles unavailable'

    const systemPrompt = `You are Nora, an AI relationship coach. You recommend one challenge type for a couple based on their context. Be brief and warm. Your recommendation should feel personal, not generic.`

    const userPrompt = `Recommend one challenge type for this couple and give a single sentence reason why it suits them right now.

Couple context:
- Together in ABF for ${Math.round(coupleAgeWeeks)} weeks
- Profiles: ${profileSummary}
- Memory: ${noraMemory?.memory_summary || 'none yet'}

Available types: ${availableTypes.join(', ')}

Respond in this exact JSON format with no other text:
{
  "recommendedType": "story|pitch|rank|memory|plan",
  "reason": "one sentence, warm and specific to this couple"
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    let recommendation
    try {
      const raw = response.content[0].text.replace(/```json|```/g, '').trim()
      recommendation = JSON.parse(raw)
    } catch {
      recommendation = { recommendedType: 'story', reason: 'A good place to start.' }
    }

    if (!availableTypes.includes(recommendation.recommendedType)) {
      recommendation.recommendedType = 'story'
    }

    // Create challenge session
    const { data: challengeSession, error } = await supabase
      .from('challenge_sessions')
      .insert({
        session_id: sessionId,
        couple_id: coupleId,
        challenge_type: recommendation.recommendedType,
        total_rounds: totalRounds,
        current_round: 1,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: 'Failed to create challenge session' }, { status: 500 })
    }

    return Response.json({
      challengeSession,
      recommendedType: recommendation.recommendedType,
      reason: recommendation.reason,
      availableTypes,
      memoryUnlocked,
    })
  } catch (err) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
