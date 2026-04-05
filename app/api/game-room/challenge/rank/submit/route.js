import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { roundId, userId, coupleId, ranking, rankRound } = await request.json()
    if (!roundId || !userId || !ranking || !rankRound) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    const isUser1 = couple.user1_id === userId
    const myColumn = rankRound === 1
      ? (isUser1 ? 'rank_user1_r1' : 'rank_user2_r1')
      : (isUser1 ? 'rank_user1_r2' : 'rank_user2_r2')

    await supabase
      .from('challenge_rounds')
      .update({ [myColumn]: ranking })
      .eq('id', roundId)

    const { data: round } = await supabase
      .from('challenge_rounds')
      .select('*')
      .eq('id', roundId)
      .maybeSingle()

    const r1Complete = !!(round.rank_user1_r1 && round.rank_user2_r1)
    const r2Complete = !!(round.rank_user1_r2 && round.rank_user2_r2)

    // After round 1 — compute partial reveal and fire Nora interjection
    if (rankRound === 1 && r1Complete && !round.rank_nora_interjection) {
      const u1 = round.rank_user1_r1
      const u2 = round.rank_user2_r1

      const agreements = []
      const disagreements = []
      u1.forEach((item, i) => {
        if (u2[i] === item) agreements.push({ position: i + 1, item })
        else disagreements.push({ position: i + 1, user1Item: item, user2Item: u2[i] })
      })

      // Generate Nora interjection on most interesting disagreement
      let noraInterjection = null
      if (disagreements.length > 0) {
        const mostInteresting = disagreements[0]
        const [{ data: u1Profile }, { data: u2Profile }] = await Promise.all([
          supabase.from('user_profiles').select('display_name').eq('user_id', couple.user1_id).maybeSingle(),
          supabase.from('user_profiles').select('display_name').eq('user_id', couple.user2_id).maybeSingle(),
        ])
        const u1Name = u1Profile?.display_name || 'Partner 1'
        const u2Name = u2Profile?.display_name || 'Partner 2'

        const res = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 60,
          messages: [{
            role: 'user',
            content: `You are Nora — sharp, dry game show host. A couple just ranked something and disagreed at position ${mostInteresting.position}. One put "${mostInteresting.user1Item}" here, the other put "${mostInteresting.user2Item}". Fire one line that pokes at the tension or absurdity of this disagreement. Max 12 words. No therapy-speak.`
          }]
        })
        noraInterjection = res.content[0].text.trim()

        await supabase
          .from('challenge_rounds')
          .update({ rank_nora_interjection: noraInterjection, rank_round: 2 })
          .eq('id', roundId)
      } else {
        // Perfect match — skip to verdict
        await supabase
          .from('challenge_rounds')
          .update({ rank_final: u1, no_agreements: [], rank_round: 3 })
          .eq('id', roundId)
      }

      return NextResponse.json({ round: { ...round, rank_nora_interjection: noraInterjection }, r1Complete, r2Complete: false, agreements, disagreements, perfectMatch: disagreements.length === 0 })
    }

    // After round 2 — compute final agreements and no-agreements
    if (rankRound === 2 && r2Complete) {
      const u1 = round.rank_user1_r2
      const u2 = round.rank_user2_r2

      const rankFinal = []
      const noAgreements = []
      u1.forEach((item, i) => {
        if (u2[i] === item) rankFinal.push({ position: i + 1, item })
        else noAgreements.push({ position: i + 1, user1Item: item, user2Item: u2[i] })
      })

      await supabase
        .from('challenge_rounds')
        .update({ rank_final: rankFinal, no_agreements: noAgreements, rank_round: 3 })
        .eq('id', roundId)

      const updatedRound = await supabase
        .from('challenge_rounds')
        .select('*')
        .eq('id', roundId)
        .maybeSingle()

      return NextResponse.json({ round: updatedRound.data, r1Complete, r2Complete, rankFinal, noAgreements })
    }

    return NextResponse.json({ round, r1Complete, r2Complete })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
