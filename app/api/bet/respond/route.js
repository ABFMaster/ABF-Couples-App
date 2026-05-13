// DB migration: ALTER TABLE bet_responses ADD COLUMN IF NOT EXISTS nora_intro text;

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'
import { noraReact } from '@/lib/nora'

export async function POST(request) {
  try {
    const { betId, userId, coupleId, prediction, actualAnswer } = await request.json()

    if (!betId || !userId) {
      return NextResponse.json({ error: 'betId and userId required' }, { status: 400 })
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
    const updatePayload = {
      prediction,
      actual_answer: actualAnswer,
      responded_at: now,
    }

    // Insert or update the response row
    if (existingRow) {
      await supabase
        .from('bet_responses')
        .update(updatePayload)
        .eq('bet_id', betId)
        .eq('user_id', userId)
    } else {
      await supabase
        .from('bet_responses')
        .insert({ bet_id: betId, user_id: userId, couple_id: resolvedCoupleId, ...updatePayload })
    }

    // Log activity to daily_checkins
    const { getTodayString } = await import('@/lib/dates')
    const todayStr = getTodayString()
    await supabase
      .from('daily_checkins')
      .upsert({
        user_id: userId,
        couple_id: resolvedCoupleId,
        check_date: todayStr,
        question_id: betRow?.id || null,
        question_text: betRow?.question || null,
        question_response: prediction || null,
      }, { onConflict: 'user_id,check_date' })

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

    // Solo Nora insight — always generated, speaks only to this user about themselves
    const soloPrompt = `The Bet question was: "${betRow?.question}"

${myName} answered: "${actualAnswer}"

You are Nora — a world-class couples therapist. Read beneath this answer. What does the way ${myName} answered — not just what they said, but how they said it, what they avoided, what they reached for — reveal about what love feels like to them or what they fear?

Write exactly one sentence, maximum 18 words. Speak directly to ${myName} using "you". Be specific to this answer only. Never generic. Never start with "Your answer", "You said", or "That's". The best observations name something the person didn't quite say out loud.`

    const soloInsight = await noraReact(soloPrompt, {
      route: 'bet/solo-insight',
      context: 'daily',
      maxTokens: 60,
    })

    await supabase
      .from('bet_responses')
      .update({ nora_solo_insight: soloInsight })
      .eq('bet_id', betId)
      .eq('user_id', userId)

    // Push notification to partner
    const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://abf-couples-app.vercel.app'
    const pushBody = `${myName} submitted their bet response.`

    fetch(`${appBase}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
      body: JSON.stringify({
        userId: partnerId,
        title: 'The Bet',
        body: pushBody,
        url: '/dashboard',
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
    let noraIntro = mine?.nora_intro || null

    // Generate Nora reaction and intro if all filled and not already generated
    if (allFilled && !mine?.nora_reaction) {
      try {
        const userPrompt = `The Bet question was: "${betRow.question}"

${myName}'s prediction (what they thought ${partnerName} would say): "${mine.prediction}"
${partnerName}'s prediction (what they thought ${myName} would say): "${theirs.prediction}"

${myName}'s actual answer: "${mine.actual_answer}"
${partnerName}'s actual answer: "${theirs.actual_answer}"

You are speaking directly to ${myName}. React to what the predictions and actual answers reveal but speak TO ${myName} — not about them. Be specific to what they actually said.`

        const partnerUserPrompt = `The Bet question was: "${betRow.question}"

${partnerName}'s prediction (what they thought ${myName} would say): "${theirs.prediction}"
${myName}'s prediction (what they thought ${partnerName} would say): "${mine.prediction}"

${partnerName}'s actual answer: "${theirs.actual_answer}"
${myName}'s actual answer: "${mine.actual_answer}"

You are speaking directly to ${partnerName}. React to what the predictions and actual answers reveal but speak TO ${partnerName} — not about them. Be specific to what they actually said.`

        const betReactionSettings = {
          route: 'bet/respond/reaction',
          system: 'You are speaking directly to the user who is reading this — always use \'you\' for them and their partner\'s actual name for the partner. Never use \'they\', \'them\', \'their\', or any third-person language. Never restate the question. Never start with an affirmation. React to what the predictions and actual answers reveal about how well these two know each other — be specific, warm, and occasionally playful. Keep your reaction to 1-2 sentences maximum.',
          context: 'daily',
          maxTokens: 200,
        }

        const [completion, partnerCompletion] = await Promise.all([
          noraReact(userPrompt, betReactionSettings),
          noraReact(partnerUserPrompt, betReactionSettings),
        ])

        noraReaction = completion || ''
        const partnerReaction = partnerCompletion || ''

        // Generate Nora pre-reveal intro (short host line shown before cards flip)
        try {
          const introCompletion = await noraReact(`The question was: "${betRow.question}"`, {
            route: 'bet/respond/intro',
            system: 'Generate ONE short line (max 12 words) to say before revealing the answers. Reference the question topic if possible. Be playful, not therapeutic. Never use the word \'alright\'.',
            context: 'daily',
            maxTokens: 50,
          })
          noraIntro = introCompletion || ''
        } catch (introErr) {
          console.error('[bet/respond] Nora intro error:', introErr)
        }

        // Save nora_reaction and nora_intro to both response rows
        await Promise.all([
          supabase
            .from('bet_responses')
            .update({ nora_reaction: noraReaction, nora_intro: noraIntro })
            .eq('bet_id', betId)
            .eq('user_id', userId),
          supabase
            .from('bet_responses')
            .update({ nora_reaction: partnerReaction, nora_intro: noraIntro })
            .eq('bet_id', betId)
            .eq('user_id', partnerId),
        ])

        updateNoraMemory({
          coupleId: resolvedCoupleId,
          signalType: SIGNAL_TYPES.BET_REVEAL,
          inputData: {
            question: betRow.question,
            responses: [
              { name: myName, prediction: mine.prediction, actual: mine.actual_answer },
              { name: partnerName, prediction: theirs.prediction, actual: theirs.actual_answer },
            ],
          },
        }).catch(() => {})
      } catch (noraErr) {
        console.error('[bet/respond] Nora reaction error:', noraErr)
      }
    }

    const bothAnswered = !!(mine?.responded_at && theirs?.responded_at)

    return NextResponse.json({ success: true, mine, theirs, bothAnswered, noraReaction, noraIntro })
  } catch (err) {
    console.error('[bet/respond] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
