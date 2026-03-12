import { createClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { cookies } from 'next/headers'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EXTRACTION_PROMPT = `Read this conversation and extract the following as a JSON object with no other text:
{
  humor_style: string (how this person's partner makes them laugh, 1-2 sentences),
  flirt_style: string (playful / romantic / bold / subtle — pick the best fit based on context),
  media_touchstones: array of strings (movies, shows, music, places mentioned),
  inside_joke: string (one specific memory or inside joke mentioned, or null if none)
}`

export async function POST(request) {
  try {
    const { messages } = await request.json()

    const cookieStore = cookies()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Format conversation for extraction
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Nora'}: ${m.content}`)
      .join('\n\n')

    let profile
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        messages: [{ role: 'user', content: `${EXTRACTION_PROMPT}\n\n${conversationText}` }],
      })

      const raw = response.content[0].text.trim()
      // Strip markdown code fences if present
      const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      profile = JSON.parse(cleaned)
    } catch (err) {
      console.error('[FlirtSaveProfile] Extraction failed:', err)
      return NextResponse.json({ success: false, error: 'extraction failed' })
    }

    await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        humor_style: profile.humor_style ?? null,
        flirt_style: profile.flirt_style ?? null,
        media_touchstones: profile.media_touchstones ?? [],
        inside_joke: profile.inside_joke ?? null,
        flirt_profile_completed: true,
      }, { onConflict: 'user_id' })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[FlirtSaveProfile] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
