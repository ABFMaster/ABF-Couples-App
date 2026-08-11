export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { coupleId, receiverId, type, content, metadata } = await request.json()

    if (!coupleId || !receiverId || !type || !content?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const isMember = await verifyCoupleMembership(supabase, user.id, coupleId)
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const validTypes = ['song', 'photo', 'word', 'found', 'memory', 'gif']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    // For 'found' type, fetch Open Graph metadata server-side
    let resolvedMetadata = metadata || null
    if (type === 'found' && !metadata) {
      try {
        const ogRes = await fetch(content, {
          headers: { 'User-Agent': 'ABFBot/1.0' }
        })
        const html = await ogRes.text()
        const getTag = (property) => {
          const match = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
            || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i'))
          return match?.[1] || null
        }
        resolvedMetadata = {
          title: getTag('og:title') || getTag('twitter:title'),
          description: getTag('og:description'),
          image: getTag('og:image'),
          domain: new URL(content).hostname.replace('www.', '')
        }
      } catch {
        resolvedMetadata = { domain: new URL(content).hostname.replace('www.', '') }
      }
    }

    // Song sends also get mirrored into the flat spotify_* columns, not
    // just `metadata` — Mixtape (app/mixtape/page.js) reads from those flat
    // columns (a leftover from an earlier version of this send flow, see
    // docs/database/song_flirts.sql) and was never updated when this route
    // moved to storing everything in `metadata` JSONB instead. That left
    // Mixtape unable to see any song sent since that refactor, even though
    // it displays fine inside Flirt itself — root-caused and fixed Aug 11
    // 2026, see docs/database/mixtape_data_flow_fix.sql for the matching
    // backfill of historical rows.
    const spotifyColumns = (type === 'song' && resolvedMetadata) ? {
      spotify_track_id: resolvedMetadata.track_id || null,
      spotify_track_name: resolvedMetadata.track_name || null,
      spotify_artist: resolvedMetadata.artist || null,
      spotify_album_art: resolvedMetadata.album_art || null,
      spotify_preview_url: resolvedMetadata.preview_url || null,
      spotify_track_url: resolvedMetadata.track_url || null,
    } : {}

    const { data: flirt, error: insertError } = await supabase
      .from('flirts')
      .insert({
        couple_id: coupleId,
        sender_id: user.id,
        receiver_id: receiverId,
        type,
        content: content.trim(),
        metadata: resolvedMetadata,
        ...spotifyColumns
      })
      .select()
      .single()

    if (insertError) {
      console.error('[flirts/send] insert error:', insertError)
      return NextResponse.json({ error: 'Failed to send flirt' }, { status: 500 })
    }

    // Update nora memory with flirt signal
    try {
      const { updateNoraMemory, SIGNAL_TYPES } = await import('@/lib/nora-memory')
      await updateNoraMemory({
        coupleId,
        userId: user.id,
        signalType: SIGNAL_TYPES.FLIRT_SENT,
        inputData: { type, content: content.trim(), metadata: resolvedMetadata }
      })
    } catch {}

    return NextResponse.json({ success: true, flirt })

  } catch (err) {
    console.error('[flirts/send] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
