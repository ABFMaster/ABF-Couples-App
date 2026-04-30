import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { noraGenerate } from '@/lib/nora'
import { searchGifs } from '@/lib/giphy'
import { searchMovies, searchShows } from '@/lib/omdb'
import { searchSpotifyTracks } from '@/lib/spotify'

const FLIRT_MODES = ['song', 'gif', 'place', 'memory', 'prompt', 'movie', 'show']

export async function POST(request) {
  try {
    const { partnerId, userId, mode: requestedMode, previousSuggestion } = await request.json()

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

    const systemPrompt = `You are a creative director helping one partner send a personalized flirt to the other.

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

CRITICAL RULES:
- Never suggest the same thing twice — vary your suggestions every time
- Use the shared media/culture list directly when relevant — these are real things they love
- For song mode: draw from their actual taste, not generic love songs. Never suggest "Better Together" or other overused romantic clichés unless it genuinely fits their specific profile
- Speak directly to the sender using "you" and "your partner" — never use their names or refer to them in third person
- nora_note: string (one sentence, max 15 words, speaks directly to the person reading it using 'you' — never 'she', 'he', or third person)

Mode definitions:
- song: A specific real song and artist that fits their taste and the moment. Suggestion format: "Song Title by Artist"
- gif: A clean 2-4 word Giphy search term. No punctuation, no explanation, just the search term
- movie_show: A specific movie or TV show title only — no explanation, just the title
- prompt: A single question or line for the sender to say or text — not a script, just an opener that invites your partner in
- memory: A specific reference to something from their shared history or inside joke — brief, actionable
${previousSuggestion ? `\nIMPORTANT: Do not suggest '${previousSuggestion}' — find a completely different angle.` : ''}
Respond with a JSON object only, no other text:
{
  mode: string,
  suggestion: string,
  nora_note: string
}`

    let flirtData
    try {
      const prompt = 'Generate the flirt suggestion.'
      const response = await noraGenerate(prompt, { route: 'flirts/generate', system: systemPrompt, maxTokens: 400 })

      const raw = response
      const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      try {
        flirtData = JSON.parse(cleaned)
      } catch (e) {
        console.error('[flirts/generate] JSON parse failed:', raw)
        return NextResponse.json({ error: 'Failed to parse Nora response' }, { status: 500 })
      }
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

    if (flirtData.mode === 'movie_show') {
      try {
        const results = await searchMovies(flirtData.suggestion)
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
      .select('id, mode, suggestion, nora_note, gif_url, gif_id, spotify_track_id, spotify_track_name, spotify_artist, spotify_album_art, spotify_track_url, media_title, media_year, media_poster')
      .maybeSingle()

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
