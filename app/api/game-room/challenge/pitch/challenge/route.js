import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { noraSignal } from '@/lib/nora'

export async function POST(request) {
  try {
    const { roundId, coupleId, pitch, prompt } = await request.json()
    if (!roundId || !coupleId || !pitch) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Idempotency — return existing challenge if already generated
    const { data: existing } = await supabase
      .from('challenge_rounds')
      .select('nora_challenge, couple_response')
      .eq('id', roundId)
      .maybeSingle()

    if (existing?.nora_challenge) {
      return NextResponse.json({ noraChallenge: existing.nora_challenge })
    }

    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    const [{ data: u1Profile }, { data: u2Profile }] = await Promise.all([
      supabase.from('user_profiles').select('display_name').eq('user_id', couple.user1_id).maybeSingle(),
      supabase.from('user_profiles').select('display_name').eq('user_id', couple.user2_id).maybeSingle(),
    ])

    const names = `${u1Profile?.display_name || 'Partner 1'} and ${u2Profile?.display_name || 'Partner 2'}`

    const response = await noraSignal(`You are Nora — a hostile, sharp, witty investor who has heard every pitch in the world. ${names} just pitched you this:

Pitch challenge: "${prompt}"
Their pitch: "${pitch}"

Fire ONE hostile follow-up question that challenges the weakest part of their pitch. Be specific to what they actually said. Max 15 words. No softening. You are not impressed yet.`, { route: 'game-room/challenge/pitch/challenge', maxTokens: 80 })

    const noraChallenge = response

    await supabase
      .from('challenge_rounds')
      .update({ nora_challenge: noraChallenge, couple_response: pitch })
      .eq('id', roundId)

    return NextResponse.json({ noraChallenge })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
