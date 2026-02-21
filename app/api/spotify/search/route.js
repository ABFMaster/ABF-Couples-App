import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

// Refresh Spotify access token
async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh token')
  }

  return response.json()
}

// Get valid access token, refreshing if needed
async function getValidAccessToken(supabase, userId, connection) {
  const now = new Date()
  const expiresAt = new Date(connection.expires_at)

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('Refreshing Spotify token...')
    const tokens = await refreshAccessToken(connection.refresh_token)

    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Update tokens in database
    await supabase
      .from('user_spotify_connections')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || connection.refresh_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    return tokens.access_token
  }

  return connection.access_token
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ tracks: [] })
    }

    // Verify user is authenticated
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

    // Get user's Spotify connection
    const { data: connection, error: connectionError } = await supabase
      .from('user_spotify_connections')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'Spotify not connected' }, { status: 400 })
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase, user.id, connection)

    // Search Spotify
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!searchResponse.ok) {
      if (searchResponse.status === 401) {
        // Token might be invalid, try to refresh once more
        try {
          const tokens = await refreshAccessToken(connection.refresh_token)
          const retryResponse = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
            {
              headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
              },
            }
          )

          if (retryResponse.ok) {
            const retryData = await retryResponse.json()
            return NextResponse.json({
              tracks: formatTracks(retryData.tracks?.items || []),
            })
          }
        } catch (e) {
          console.error('Token refresh failed:', e)
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
