import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request) {
  try {
    const { betId, userId, coupleId, responseType, responseText } = await request.json()

    if (!betId || !userId || !responseType || !responseText) {
      return NextResponse.json({ error: 'betId, userId, responseType, and responseText required' }, { status: 400 })
    }

    if (responseType !== 'prediction' && responseType !== 'actual') {
      return NextResponse.json({ error: 'responseType must be "prediction" or "actual"' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch the bet row for question and couple context
    const { data: betRow } = await supabase
      .from('bets')
      .select('id, couple_id, question')
      .eq('id', betId)
      .maybeSingle()

    if (!betRow) {
      return NextResponse.json({ error: 'Bet not found' }, { status: 404 })
    }

    const resolvedCoupleId = coupleId || betRow.couple_id

    // Derive partnerId from couples table
    const { data: coupleRow } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', resolvedCoupleId)
      .maybeSingle()

    const partnerId = coupleRow?.user1_id === userId ? coupleRow?.user2_id : coupleRow?.user1_id

    // Fetch existing response row for this user
    const { data: existingRow } = await supabase
      .from('bet_responses')
      .select('*')
      .eq('bet_id', betId)
      .eq('user_id', userId)
      .maybeSingle()

    // Build update payload
    const now = new Date().toISOString()
    let updatePayload = {}

    if (responseType === 'prediction') {
      updatePayload = {
        prediction: responseText,
        responded_at: now,
      }
    } else {
      updatePayload = {
        actual_answer: responseText,
        // Only set responded_at if not already set
        ...(existingRow?.responded_at ? {} : { responded_at: now }),
      }
    }

    // Upsert the response row
    await supabase
      .from('bet_responses')
      .upsert({
        bet_id: betId,
        user_id: userId,
        couple_id: resolvedCoupleId,
        ...updatePayload,
      }, { onConflict: 'bet_id,user_id' })

    // Fetch both response rows after save
    const [{ data: mine }, { data: theirs }] = await Promise.all([
      supabase
        .from('bet_responses')
        .select('*')
        .eq('bet_id', betId)
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('bet_responses')
        .select('*')
        .eq('bet_id', betId)
        .eq('user_id', partnerId)
        .maybeSingle(),
    ])

    // Fetch both names for notifications and Nora prompt
    const [{ data: myProfile }, { data: partnerProfile }] = await Promise.all([
      supabase.from('user_profiles').select('display_name').eq('user_id', userId).maybeSingle(),
      supabase.from('user_profiles').select('display_name').eq('user_id', partnerId).maybeSingle(),
    ])

    const myName = myProfile?.display_name || 'Your partner'
    const partnerName = partnerProfile?.display_name || 'Your partner'

    // Push notification to partner
    const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://abf-couples-app.vercel.app'
    const pushBody = responseType === 'prediction'
      ? `${myName} made their prediction. Your turn.`
      : `${myName} revealed their actual answer.`

    await fetch(`${appBase}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: partnerId,
        title: 'The Bet',
        body: pushBody,
        url: '/today',
      }),
    }).catch(() => {})

    // Check if all four fields are filled
    const allFilled = !!(
      mine?.prediction &&
      mine?.actual_answer &&
      theirs?.prediction &&
      theirs?.actual_answer
    )

    let noraReaction = mine?.nora_reaction || null

    // Generate Nora reaction if all filled and not already generated
    if (allFilled && !mine?.nora_reaction) {
      try {
        const userPrompt = `The Bet question was: "${betRow.question}"

${myName}'s prediction (what they thought ${partnerName} would say): "${mine.prediction}"
${partnerName}'s prediction (what they thought ${myName} would say): "${theirs.prediction}"

${myName}'s actual answer: "${mine.actual_answer}"
${partnerName}'s actual answer: "${theirs.actual_answer}"

React to what the predictions and actual answers reveal about how well these two know each other.`

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

        const completion = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 200,
          system: 'You are Nora, an AI relationship coach embedded in a couples app. You are speaking directly to the user who is reading this — always use \'you\' for them and their partner\'s actual name for the partner. Never use \'they\', \'them\', \'their\', or any third-person language. Never restate the question. Never start with an affirmation. React to what the predictions and actual answers reveal about how well these two know each other — be specific, warm, and occasionally playful. Keep your reaction to 1-2 sentences maximum.',
          messages: [{ role: 'user', content: userPrompt }],
        })

        noraReaction = completion.content[0]?.text || ''

        // Save nora_reaction to both response rows
        await Promise.all([
          supabase
            .from('bet_responses')
            .update({ nora_reaction: noraReaction })
            .eq('bet_id', betId)
            .eq('user_id', userId),
          supabase
            .from('bet_responses')
            .update({ nora_reaction: noraReaction })
            .eq('bet_id', betId)
            .eq('user_id', partnerId),
        ])
      } catch (noraErr) {
        console.error('[bet/respond] Nora reaction error:', noraErr)
      }
    }

    const bothAnswered = !!(mine?.responded_at && theirs?.responded_at)

    return NextResponse.json({ success: true, mine, theirs, bothAnswered, noraReaction })
  } catch (err) {
    console.error('[bet/respond] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
