import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { noraChat } from '@/lib/nora'

const WANDER_SYSTEM_PROMPT = `RESPONSE RULES:
- Always warm, personal, specific — never generic travel brochure copy
- Reference the couple's vibe and destination naturally
- Use "you two" not "you" — this is always about both people
- Keep responses conversational, not listy
- When generating a narrative: cinematic, present tense, sensory details
- When generating a day-by-day: each day gets a title and 2-3 sentences of evocative narration
- Maximum response length: 300 words unless generating full itinerary
- Never use markdown headers or bullet points in narrative responses
- Sign off day-by-day itineraries with a single Wander sign-off line`

export async function POST(request) {
  try {
    const { action, tripId, coupleId, destination, vibe, freeform, conversation, stage } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch couple context
    const { data: coupleData } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    const userIds = [coupleData?.user1_id, coupleData?.user2_id].filter(Boolean)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('display_name, hobbies, date_preferences')
      .in('user_id', userIds)

    const names = (profiles || []).map(p => p.display_name).filter(Boolean).join(' and ')
    const hobbies = (profiles || []).flatMap(p => p.hobbies || []).slice(0, 4).join(', ')

    let userMessage = ''

    if (action === 'opening') {
      // First encounter — Wander's opening question
      userMessage = `A couple (${names || 'two people'}) just opened a new Dream Trip${destination ? ` for ${destination}` : ''}${vibe ? ` with a ${vibe} vibe` : ''}. Their interests include: ${hobbies || 'not specified yet'}.

Give them Wander's opening message. Ask them one evocative question that gets them dreaming. If they gave a destination, riff on it. If they chose a vibe, lean into it. If they chose "Surprise Me", ask them something that will help you pick somewhere unexpected for them. Keep it under 80 words. End with the question.`

    } else if (action === 'narrative') {
      // Generate the cinematic opening paragraph
      const conversationContext = conversation?.length
        ? `\n\nConversation context:\n${conversation.map(m => `${m.role}: ${m.content}`).join('\n')}`
        : ''
      userMessage = `Generate a cinematic opening narrative for ${names || 'a couple'}'s dream trip to ${destination || 'an unknown destination'}. Vibe: ${vibe || 'not specified'}. Their interests: ${hobbies || 'not specified'}.${conversationContext}

IMPORTANT: Stay true to the exact destination discussed. Do not switch destinations.
Write 3 sentences maximum. Present tense. Sensory and specific. Make them feel like they're already there. This is the first thing they'll read about their dream trip — make it land.`

    } else if (action === 'itinerary') {
      // Generate full day-by-day dream itinerary
      const conversationContext = conversation?.length
        ? `\n\nConversation so far:\n${conversation.slice(0, 4).map(m => `${m.role}: ${m.content}`).join('\n')}`
        : ''

      const days = 4

      userMessage = `Generate a dreamy day-by-day itinerary for ${names || 'a couple'}'s trip to ${destination}. Vibe: ${vibe || 'mixed'}. Duration: ${days} days. Their interests: ${hobbies || 'not specified'}.${conversationContext}

IMPORTANT: Stay true to the exact destination discussed in the conversation.

Return ONLY valid JSON, no markdown, no explanation:
{
  "title": "An evocative trip title",
  "days": [
    {
      "day": 1,
      "title": "Short evocative day title",
      "narrative": "2-3 sentences of present-tense cinematic narration for this day"
    }
  ],
  "wanderNote": "Wander's personal sign-off — one sentence, warm and specific"
}`

    } else if (action === 'chat') {
      // Ongoing conversation
      userMessage = freeform || 'Tell me more about this destination.'
    } else if (action === 'extract_destination') {
      userMessage = `Extract the destination city/place from this text. Return ONLY the place name, maximum 4 words, nothing else. No explanation, no punctuation. If no specific place is mentioned, return exactly the word: unknown\n\nText: ${freeform}`

    } else if (action === 'surprise') {
      // Wander picks the destination
      userMessage = `A couple (${names || 'two people'}) wants to be surprised. Their interests: ${hobbies || 'not specified'}. Their vibe choice: ${vibe || 'surprise'}.

Pick one specific unexpected destination for them — not Paris, not Bali, not the obvious choices. Tell them where you're sending them and why in 2-3 sentences. Be specific and confident. This is Wander at their best.`
    }

    // Build messages array for chat continuity
    const messages = action === 'chat' && conversation?.length
      ? [
          ...conversation.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage }
        ]
      : [{ role: 'user', content: userMessage }]

    const response = await noraChat(messages, {
      route: 'trips/wander',
      system: WANDER_SYSTEM_PROMPT,
      context: 'conversation',
      maxTokens: 800,
    })

    const text = response

    // For itinerary, parse JSON
    if (action === 'itinerary') {
      try {
        const parsed = JSON.parse(text)
        return NextResponse.json({ itinerary: parsed })
      } catch {
        return NextResponse.json({ error: 'Failed to parse itinerary' }, { status: 500 })
      }
    }

    return NextResponse.json({ text })
  } catch (error) {
    console.error('Wander API error:', error)
    return NextResponse.json({ error: 'Wander is temporarily unavailable' }, { status: 500 })
  }
}
