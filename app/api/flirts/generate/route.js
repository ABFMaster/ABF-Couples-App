import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FLIRT_MODES = ['song', 'gif', 'place', 'memory', 'prompt']

export async function POST(request) {
  try {
    const { partnerId, userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch sender profile, partner profile, and couple in parallel
    const [
      { data: myProfile },
      { data: partnerProfile },
      { data: couple },
    ] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('humor_style, flirt_style, media_touchstones, inside_joke, love_language_primary')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('user_profiles')
        .select('display_name, love_language_primary')
        .eq('user_id', partnerId)
        .maybeSingle(),
      supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .maybeSingle(),
    ])

    // Fetch nora memory if we have a couple
    let noraMemory = null
    if (couple?.id) {
      const { data: memoryRow } = await supabase
        .from('nora_memory')
        .select('memory_summary')
        .eq('couple_id', couple.id)
        .maybeSingle()
      noraMemory = memoryRow?.memory_summary || null
    }

    const mode = FLIRT_MODES[Math.floor(Math.random() * FLIRT_MODES.length)]

    const systemPrompt = `You are Nora, a relationship therapist who knows this couple well. You are acting as a creative director helping one partner send a meaningful, personalized flirt to the other.

You know this about the sender:
- Humor style: ${myProfile?.humor_style || 'unknown'}
- Flirt style: ${myProfile?.flirt_style || 'unknown'}
- Shared media/culture: ${myProfile?.media_touchstones?.join(', ') || 'none mentioned'}
- Inside joke: ${myProfile?.inside_joke || 'none mentioned'}
- Their love language: ${myProfile?.love_language_primary || 'unknown'}

You know this about the receiver:
- Name: ${partnerProfile?.display_name || 'their partner'}
- Their love language: ${partnerProfile?.love_language_primary || 'unknown'}

Couple memory: ${noraMemory || 'none yet'}

Your job is to suggest one flirt in the mode: ${mode}

Mode definitions:
- song: Suggest a specific real song with artist. Explain in 1 sentence why it fits them.
- gif: Describe a specific gif to search for (search terms). Explain in 1 sentence why it will land.
- place: Suggest a specific type of place or actual place for a spontaneous moment. 1 sentence why.
- memory: Reference a specific shared memory or inside joke. Suggest how to bring it up as a flirt.
- prompt: Give the sender a single question or line to say/text that will draw out a flirty response.

Respond with a JSON object only, no other text:
{
  mode: string,
  suggestion: string (the actual song/gif terms/place/memory reference/prompt — actionable and specific),
  nora_note: string (Nora's 1-2 sentence explanation of why this will work for this specific couple)
}`

    let flirtData
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{ role: 'user', content: 'Generate the flirt suggestion.' }],
        system: systemPrompt,
      })

      const raw = response.content[0].text.trim()
      const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      flirtData = JSON.parse(cleaned)
    } catch (err) {
      console.error('[FlirtGenerate] Extraction failed:', err)
      return NextResponse.json({ error: 'generation failed' }, { status: 500 })
    }

    const { data: saved, error: saveError } = await supabase
      .from('flirts')
      .insert({
        sender_id: userId,
        partner_id: partnerId,
        mode: flirtData.mode,
        suggestion: flirtData.suggestion,
        nora_note: flirtData.nora_note,
        nora_generated: true,
      })
      .select('id, mode, suggestion, nora_note')
      .single()

    if (saveError) {
      console.error('[FlirtGenerate] Save error:', saveError)
      return NextResponse.json({ error: 'save failed' }, { status: 500 })
    }

    return NextResponse.json({ flirt: saved })
  } catch (err) {
    console.error('[FlirtGenerate] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
