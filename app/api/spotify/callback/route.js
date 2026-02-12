import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/spotify/callback`

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle user denying access
    if (error) {
      console.error('Spotify auth denied:', error)
      return NextResponse.redirect(new URL('/flirts?spotify=error&reason=denied', process.env.NEXT_PUBLIC_APP_URL))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/flirts?spotify=error&reason=missing_params', process.env.NEXT_PUBLIC_APP_URL))
    }

    // Decode state to get user ID
    let stateData
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    } catch (e) {
      console.error('Invalid state parameter:', e)
      return NextResponse.redirect(new URL('/flirts?spotify=error&reason=invalid_state', process.env.NEXT_PUBLIC_APP_URL))
    }

    const { userId } = stateData

    // Exchange code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Spotify token error:', errorData)
      return NextResponse.redirect(new URL('/flirts?spotify=error&reason=token_exchange', process.env.NEXT_PUBLIC_APP_URL))
    }

    const tokens = await tokenResponse.json()

    // Get Spotify user profile
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    })

    if (!profileResponse.ok) {
      console.error('Spotify profile error:', await profileResponse.text())
      return NextResponse.redirect(new URL('/flirts?spotify=error&reason=profile', process.env.NEXT_PUBLIC_APP_URL))
    }

    const profile = await profileResponse.json()

    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Save to database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Upsert the connection (update if exists, insert if not)
    const { error: upsertError } = await supabase
      .from('user_spotify_connections')
      .upsert({
        user_id: userId,
        spotify_user_id: profile.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (upsertError) {
      console.error('Database error:', upsertError)
      return NextResponse.redirect(new URL('/flirts?spotify=error&reason=database', process.env.NEXT_PUBLIC_APP_URL))
    }

    // Success! Redirect back to flirts page
    return NextResponse.redirect(new URL('/flirts?spotify=connected', process.env.NEXT_PUBLIC_APP_URL))
  } catch (error) {
    console.error('Spotify callback error:', error)
    return NextResponse.redirect(new URL('/flirts?spotify=error&reason=unknown', process.env.NEXT_PUBLIC_APP_URL))
  }
}
