export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { coupleId, receiverId, type, content, metadata } = await request.json()

    if (!coupleId || !receiverId || !type || !content?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

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

    const { data: flirt, error: insertError } = await supabase
      .from('flirts')
      .insert({
        couple_id: coupleId,
        sender_id: user.id,
        receiver_id: receiverId,
        type,
        content: content.trim(),
        metadata: resolvedMetadata
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
