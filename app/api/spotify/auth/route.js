import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const APP_URL = process.env.NEXT_PUBLIC_APP_URL

// Spotify scopes needed for our features
const SCOPES = [
  'user-read-email',
  'user-read-private',
].join(' ')

export async function GET(request) {
  try {
    // Validate environment variables
    if (!SPOTIFY_CLIENT_ID) {
      console.error('Missing SPOTIFY_CLIENT_ID environment variable')
      return NextResponse.json({ error: 'Spotify not configured' }, { status: 500 })
    }

    if (!APP_URL) {
      console.error('Missing NEXT_PUBLIC_APP_URL environment variable')
      return NextResponse.json({ error: 'App URL not configured' }, { status: 500 })
    }

    const REDIRECT_URI = `${APP_URL}/api/spotify/callback`

    // Verify user is authenticated
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify Supabase environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Verify token with Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Generate state parameter for CSRF protection
    // Include user ID so we can link the connection after callback
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
    })).toString('base64')

    // Build Spotify authorization URL
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      state: state,
      show_dialog: 'true', // Always show dialog so user can switch accounts
    })

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`

    return NextResponse.json({ url: authUrl })
  } catch (error) {
    console.error('Spotify auth error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
