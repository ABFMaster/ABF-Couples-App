export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

// Switched from per-user OAuth to Client Credentials — Aug 11 2026.
//
// This route used to look up a per-user access/refresh token pair from
// user_spotify_connections and refresh it via grant_type=refresh_token
// whenever it neared expiry. Matt forwarded a Spotify for Developers email:
// starting July 20 2026, refresh tokens issued on a user's behalf expire
// after six months, and apps must discard the token and send the user back
// through sign-in rather than retry the refresh. The old code here did
// neither — a failed refresh threw, the outer catch turned that into a
// generic 500, and Flirt's own search UI swallows fetch failures in a bare
// catch{}, so an expired token would have meant song search silently
// stopped working with zero explanation, indistinguishable from every other
// silent-failure class this app has had fixed this session.
//
// Rather than patch in discard-and-reauth handling, this route doesn't need
// a per-user token at all: the OAuth connection only ever requested
// user-read-email/user-read-private, neither of which search uses, and
// Spotify's search endpoint works fine on catalog-level Client Credentials
// (client_id + client_secret, no user login, token isn't tied to any
// person). The Spotify email explicitly exempts Client Credentials from
// the refresh-token expiry change — this removes the failure mode instead
// of just handling it. Also fixes a separate, pre-existing gap: this route
// never actually required the caller to have gone through Spotify connect
// in the first place (see app/shared/add/page.js's now-removed
// spotifyConnected gate) — with Client Credentials there's no connect step
// needed for anyone.
//
// user_spotify_connections and the /api/spotify/auth, /callback, /disconnect
// routes are now orphaned — nothing else in the app uses a real per-user
// Spotify token. Left in place rather than deleted in this pass; flagged in
// Sessions/PRODUCT_BACKLOG.md for a follow-up cleanup.

let cachedToken = null
let cachedTokenExpiresAt = 0

async function getAppAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) {
    return cachedToken
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  })

  if (!response.ok) {
    throw new Error('Failed to get Spotify app token')
  }

  const data = await response.json()
  cachedToken = data.access_token
  // Refresh a couple minutes early rather than cutting it exactly at expiry.
  cachedTokenExpiresAt = Date.now() + (data.expires_in - 120) * 1000
  return cachedToken
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ tracks: [] })
    }

    // Still require a logged-in ABF user — this is about removing the
    // Spotify-specific per-user token, not about opening search up
    // unauthenticated.
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const accessToken = await getAppAccessToken()

    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!searchResponse.ok) {
      // Cached app token might have been invalidated early — clear it and
      // retry once with a fresh one before giving up.
      if (searchResponse.status === 401) {
        cachedToken = null
        try {
          const freshToken = await getAppAccessToken()
          const retryResponse = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
            { headers: { 'Authorization': `Bearer ${freshToken}` } }
          )
          if (retryResponse.ok) {
            const retryData = await retryResponse.json()
            return NextResponse.json({ tracks: formatTracks(retryData.tracks?.items || []) })
          }
        } catch (e) {
          console.error('[spotify/search] retry after 401 failed:', e)
        }
        return NextResponse.json({ error: 'Spotify authentication failed' }, { status: 401 })
      }

      console.error('Spotify search error:', await searchResponse.text())
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    const data = await searchResponse.json()

    return NextResponse.json({
      tracks: formatTracks(data.tracks?.items || []),
    })
  } catch (error) {
    console.error('Spotify search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function formatTracks(tracks) {
  return tracks.map(track => ({
    id: track.id,
    name: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    album: track.album.name,
    albumArt: track.album.images[0]?.url || null,
    albumArtSmall: track.album.images[2]?.url || track.album.images[0]?.url || null,
    previewUrl: track.preview_url,
    spotifyUrl: track.external_urls.spotify,
    durationMs: track.duration_ms,
  }))
}
