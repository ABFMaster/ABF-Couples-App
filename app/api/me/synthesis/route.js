export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { noraChat } from '@/lib/nora'
import { getTodayString } from '@/lib/dates'

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: row } = await supabase
      .from('hero_cache')
      .select('message, cta_label, cta_href, generated_at')
      .eq('user_id', user.id)
      .eq('type', 'synthesis')
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ synthesis: row || null })
  } catch (err) {
    console.error('[me/synthesis] GET Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token || token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const todayStr = getTodayString('America/Los_Angeles')
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { data: entries },
      { data: practices },
      { data: coupleRow },
    ] = await Promise.all([
      supabase
        .from('notebook_entries')
        .select('entry_type, content, created_at')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false }),
      supabase
        .from('user_practices')
        .select('title, status')
        .eq('user_id', userId)
        .eq('status', 'active'),
      supabase
        .from('couples')
        .select('id, user1_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .maybeSingle(),
    ])

    const userCoupleId = coupleRow?.id || null

    let userNotes = null
    if (userCoupleId) {
      const { data: memory } = await supabase
        .from('nora_memory')
        .select('user1_notes, user2_notes')
        .eq('couple_id', userCoupleId)
        .maybeSingle()

      if (memory) {
        const notes = coupleRow.user1_id === userId ? memory.user1_notes : memory.user2_notes
        userNotes = notes?.notes || null
      }
    }

    const entriesSummary = entries?.map(e =>
      `[${e.entry_type}] ${e.content}`
    ).join('\n') || 'No entries this week.'

    const practicesSummary = practices?.length
      ? practices.map(p => p.title).join(', ')
      : 'No active practices.'

    const userPrompt = [
      `Here is what this person wrote in their private notebook this week:\n${entriesSummary}`,
      `Their active practices: ${practicesSummary}`,
      userNotes ? `What I know about this person: ${userNotes.slice(0, 400)}` : null,
      `Write one specific observation (max 40 words) connecting dots across what they've been noticing and working on. Speak directly to them using "you". Reference specific content from their entries — not generic. This is your weekly synthesis of their interior work.`,
    ].filter(Boolean).join('\n\n')

    const systemPrompt = `You are Nora — a sharp, warm friend who has been reading someone's private notebook all week. Write one specific observation that connects patterns across what they wrote. Max 40 words. Never start with Hey or Hi. Never be generic. The best synthesis names something they haven't quite named themselves.`

    const synthesis = await noraChat(
      [{ role: 'user', content: userPrompt }],
      { route: 'me/synthesis', system: systemPrompt, maxTokens: 100 }
    )

    if (!synthesis) return NextResponse.json({ error: 'No synthesis generated' }, { status: 500 })

    await supabase.from('hero_cache').upsert(
      {
        user_id: userId,
        couple_id: userCoupleId,
        cache_date: todayStr,
        type: 'synthesis',
        message: synthesis,
        cta_label: 'Talk to Nora',
        cta_href: '/ai-coach',
      },
      { onConflict: 'user_id,cache_date,type' }
    )

    return NextResponse.json({ success: true, userId })
  } catch (err) {
    console.error('[me/synthesis] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
