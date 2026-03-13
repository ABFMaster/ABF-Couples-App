import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { searchGifs } from '@/lib/giphy'
import { searchMovies, searchShows } from '@/lib/omdb'
import { searchSpotifyTracks } from '@/lib/spotify'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FLIRT_MODES = ['song', 'gif', 'place', 'memory', 'prompt', 'movie', 'show']

export async function POST(request) {
  try {
    const { partnerId, userId, mode: requestedMode } = await request.json()

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

    const mode = requestedMode || FLIRT_MODES[Math.floor(Math.random() * FLIRT_MODES.length)]

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
  nora_note: string (Nora's 1-2 sentence explanation of why this will work — written directly to the sender using 'you' and 'her', never referring to the couple in third person (never use their names))
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

    let enriched = {}

    if (flirtData.mode === 'gif') {
      try {
        const gifs = await searchGifs(flirtData.suggestion, 5)
        if (gifs?.length > 0) {
          enriched.gif_url = gifs[0].url
          enriched.gif_id = gifs[0].id
        }
      } catch (err) {
        console.error('[FlirtGenerate] Giphy error:', err)
      }
    }

    if (flirtData.mode === 'song') {
      try {
        const tracks = await searchSpotifyTracks(supabase, userId, flirtData.suggestion)
        if (tracks?.[0]) {
          const track = tracks[0]
          enriched.spotify_track_id = track.id
          enriched.spotify_track_name = track.name
          enriched.spotify_artist = track.artist
          enriched.spotify_album_art = track.albumArt
          enriched.spotify_track_url = track.spotifyUrl
        }
      } catch (err) {
        console.error('[FlirtGenerate] Spotify error:', err)
      }
    }

    if (flirtData.mode === 'movie' || flirtData.mode === 'show') {
      try {
        const results = flirtData.mode === 'movie'
          ? await searchMovies(flirtData.suggestion)
          : await searchShows(flirtData.suggestion)
        if (results?.[0]) {
          enriched.media_title = results[0].Title
          enriched.media_year = results[0].Year
          enriched.media_poster = results[0].Poster
        }
      } catch (err) {
        console.error('[FlirtGenerate] OMDB error:', err)
      }
    }

    const { data: saved, error: saveError } = await supabase
      .from('flirts')
      .insert({
        couple_id: couple?.id,
        sender_id: userId,
        receiver_id: partnerId,
        mode: flirtData.mode,
        suggestion: flirtData.suggestion,
        nora_note: flirtData.nora_note,
        nora_generated: true,
        ...enriched,
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
