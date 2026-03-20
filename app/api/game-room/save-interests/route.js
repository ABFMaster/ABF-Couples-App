import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EXTRACTION_PROMPT = `Read this conversation and extract the following as a JSON object with no other text:
{
  "topics": array of strings (subjects they geek out on or know a lot about),
  "humor": string (what kind of humor lands for them, 1-2 sentences),
  "obsessions": array of strings (specific podcasts, shows, books, YouTube channels, rabbit holes mentioned),
  "places": array of strings (places they've been or want to go that stuck with them),
  "shared_with_partner": string (one thing they and their partner both love or argue about, 1-2 sentences)
}`

export async function POST(request) {
  try {
    const { messages, userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Nora'}: ${m.content}`)
      .join('\n\n')

    let interests
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{ role: 'user', content: `${EXTRACTION_PROMPT}\n\n${conversationText}` }],
      })
      const raw = response.content[0].text.trim()
      const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      interests = JSON.parse(cleaned)
    } catch (err) {
      console.error('[GameRoomSaveInterests] Extraction failed:', err)
      return NextResponse.json({ success: false, error: 'extraction failed' })
    }

    await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        game_interests: interests,
        game_interests_completed: true,
      }, { onConflict: 'user_id' })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[GameRoomSaveInterests] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
