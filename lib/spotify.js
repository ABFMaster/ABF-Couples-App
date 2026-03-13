const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

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
    throw new Error('Failed to refresh Spotify token')
  }

  return response.json()
}

export async function getValidSpotifyToken(supabase, userId) {
  const { data: connection, error } = await supabase
    .from('user_spotify_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !connection) return null

  const now = new Date()
  const expiresAt = new Date(connection.expires_at)

  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const tokens = await refreshAccessToken(connection.refresh_token)
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000)

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

export async function searchSpotifyTracks(supabase, userId, query, limit = 10) {
  try {
    const accessToken = await getValidSpotifyToken(supabase, userId)
    if (!accessToken) return []

    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )

    if (!res.ok) return []

    const data = await res.json()
    return (data.tracks?.items || []).map(track => ({
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
  } catch (err) {
    console.error('[Spotify] searchSpotifyTracks error:', err)
    return []
  }
}
