import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { noraVerdict } from '@/lib/nora'

export async function POST(request) {
  try {
    const { roundId, coupleId, challengeSessionId, prompt } = await request.json()
    if (!roundId || !coupleId || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: round } = await supabase
      .from('challenge_rounds')
      .select('*')
      .eq('id', roundId)
      .maybeSingle()

    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    const [{ data: u1Profile }, { data: u2Profile }, { data: noraMemory }] = await Promise.all([
      supabase.from('user_profiles').select('display_name').eq('user_id', couple.user1_id).maybeSingle(),
      supabase.from('user_profiles').select('display_name').eq('user_id', couple.user2_id).maybeSingle(),
      supabase.from('nora_memory').select('memory_summary').eq('couple_id', coupleId).maybeSingle(),
    ])

    const u1Name = u1Profile?.display_name || 'Partner 1'
    const u2Name = u2Profile?.display_name || 'Partner 2'

    const rankFinal = round.rank_final || []
    const noAgreements = round.no_agreements || []

    let rankData
    try { rankData = JSON.parse(prompt) }
    catch { rankData = { prompt, items: [] } }

    const verdictPrompt = `You are Nora — sharp, warm, occasionally snarky game show host. ${u1Name} and ${u2Name} just completed a two-round ranking challenge.

The challenge: "${rankData.prompt}"

What they agreed on: ${rankFinal.length > 0 ? rankFinal.map(r => `Position ${r.position}: ${r.item}`).join(', ') : 'nothing'}
What they couldn't agree on: ${noAgreements.length > 0 ? noAgreements.map(r => `Position ${r.position}: ${u1Name} had "${r.user1Item}", ${u2Name} had "${r.user2Item}"`).join('. ') : 'nothing — perfect match'}
Couple memory: ${noraMemory?.memory_summary || 'none yet'}

Give a verdict that:
- References what they refused to budge on — that's the most revealing data
- Notes if they moved toward each other in round 2 or held firm
- Finds what the disagreements reveal about them as individuals or as a couple
- Is 2-3 sentences max, warm but sharp

If they agreed on everything: react to the fact that they're perfectly aligned — that's its own kind of interesting.`

    const response = await noraVerdict(verdictPrompt, {
      route: 'challenge/rank/finalize',
      maxTokens: 400,
    })

    const noraVerdict = response.content[0].text.trim()

    await supabase
      .from('challenge_rounds')
      .update({ nora_verdict: noraVerdict, completed_at: new Date().toISOString() })
      .eq('id', roundId)

    return NextResponse.json({ noraVerdict, rankFinal, noAgreements })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
