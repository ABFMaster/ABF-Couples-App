export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { noraGenerate, parseNoraJSON } from '@/lib/nora'
import { searchGifs } from '@/lib/giphy'
import { searchMovies, searchShows } from '@/lib/omdb'
import { searchSpotifyTracks } from '@/lib/spotify'
import { requireUser } from '@/lib/api-auth'

const FLIRT_MODES = ['song', 'gif', 'movie_show', 'prompt']

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { mode: requestedMode, previousSuggestion } = await request.json()
    const userId = user.id

    // Fetch sender profile and couple first — the partner is derived from
    // the couple record, never trusted from the client, so a flirt can
    // never be generated/sent toward someone who isn't actually the caller's partner.
    const [
      { data: myProfile },
      { data: couple },
    ] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('game_interests, flirt_style, love_language_primary')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('couples')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .maybeSingle(),
    ])

    const partnerId = couple ? (couple.user1_id === userId ? couple.user2_id : couple.user1_id) : null
    const { data: partnerProfile } = partnerId
      ? await supabase
          .from('user_profiles')
          .select('display_name, love_language_primary')
          .eq('user_id', partnerId)
          .maybeSingle()
      : { data: null }

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
- What makes them laugh: ${myProfile?.game_interests?.humor || 'unknown'}
- Flirt style: ${myProfile?.flirt_style || 'unknown'}
- Topics/obsessions they're into: ${[...(myProfile?.game_interests?.topics || []), ...(myProfile?.game_interests?.obsessions || [])].join(', ') || 'none mentioned'}
- Something they and their partner share: ${myProfile?.game_interests?.shared_with_partner || 'none mentioned'}
- Their love language: ${myProfile?.love_language_primary || 'unknown'}

You know this about the receiver:
- Name: ${partnerProfile?.display_name || 'their partner'}
- Their love language: ${partnerProfile?.love_language_primary || 'unknown'}

Couple memory: ${noraMemory || 'none yet'}

Your job is to suggest one flirt in the mode: ${mode}

CRITICAL RULES:
- Never suggest the same thing twice — vary your suggestions every time
- Use the topics/obsessions list directly when relevant — these are real things they love
- For song mode: draw from their actual taste, not generic love songs. Never suggest "Better Together" or other overused romantic clichés unless it genuinely fits their specific profile
- Speak directly to the sender using "you" and "your partner" — never use their names or refer to them in third person
- nora_note: string (one sentence, max 15 words, speaks directly to the person reading it using 'you' — never 'she', 'he', or third person)

Mode definitions:
- song: A specific real song and artist that fits their taste and the moment. Suggestion format: "Song Title by Artist"
- gif: A clean 2-4 word Giphy search term. No punctuation, no explanation, just the search term
- movie_show: A specific movie or TV show title only — no explanation, just the title
- prompt: A single question or line for the sender to say or text — not a script, just an opener that invites your partner in
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
      // context defaulted to noraGenerate's own 'game_room' fallback before
      // this — meaning Nora was silently told "you are in game master mode,
      // running a game" while composing a flirt suggestion. 'conversation'
      // fits what this actually is, and its register note (don't invent
      // details not actually known) is a good fit for profile-grounded
      // suggestion generation specifically.
      const response = await noraGenerate(prompt, { route: 'flirts/generate', context: 'conversation', system: systemPrompt, maxTokens: 400 })

      const raw = response
      try {
        flirtData = parseNoraJSON(raw)
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
      // ROOT CAUSE FIX Aug 18 2026 (audit finding) — this only ever called
      // searchMovies (OMDB type=movie), even though the mode is explicitly
      // "movie or TV show" and searchShows (type=series) was imported for
      // exactly this case and then never used. Any real show suggestion
      // ("The Bear", "Fleabag") searched under the wrong OMDB type and
      // silently found nothing. Try movie first, fall back to show.
      try {
        let results = await searchMovies(flirtData.suggestion)
        if (!results?.[0]) {
          results = await searchShows(flirtData.suggestion)
        }
        if (results?.[0]) {
          enriched.media_title = results[0].Title
          enriched.media_year = results[0].Year
          enriched.media_poster = results[0].Poster
        }
      } catch (err) {
        console.error('[FlirtGenerate] OMDB error:', err)
      }
    }

    // ROOT CAUSE FIX Aug 18 2026 — this used to insert a draft row here,
    // then FlirtSheet's separate sendFlirt() flow (push + mark-sent) would
    // deliver it. That path never went through /api/flirts/send, so it
    // never fired the FLIRT_SENT nora-memory signal and never incremented
    // couples.flirts_sent — both real, silent gaps for any flirt sent that
    // way (moot in practice since FlirtSheet had zero live entry points).
    // Now that Ask Nora is integrated into FlirtCard's own compose flow,
    // this route is a pure propose-and-enrich step — no DB write. The
    // chosen suggestion gets persisted and delivered through the same
    // /api/flirts/send every other flirt type already uses, so it's
    // correctly signaled and counted like everything else.
    return NextResponse.json({
      flirt: {
        mode: flirtData.mode,
        suggestion: flirtData.suggestion,
        nora_note: flirtData.nora_note,
        ...enriched,
      },
    })
  } catch (err) {
    console.error('[FlirtGenerate] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
