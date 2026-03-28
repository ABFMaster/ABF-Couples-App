import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { sessionId, coupleId, userId, questionId, answer } = await request.json()
    if (!sessionId || !coupleId || !userId || !questionId || answer === undefined) {
      return NextResponse.json({ error: 'sessionId, coupleId, userId, questionId, answer required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get couple
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()
    if (!couple) return NextResponse.json({ error: 'Couple not found' }, { status: 404 })

    const isUser1 = couple.user1_id === userId
    const answerField = isUser1 ? 'user1_answer' : 'user2_answer'
    const partnerId = isUser1 ? couple.user2_id : couple.user1_id

    // Upsert answer
    const { data: answerRow, error: upsertError } = await supabase
      .from('hot_take_answers')
      .upsert(
        {
          session_id: sessionId,
          couple_id: coupleId,
          question_id: questionId,
          [answerField]: answer,
        },
        { onConflict: 'session_id,question_id', ignoreDuplicates: false }
      )
      .select('*')
      .maybeSingle()

    if (upsertError || !answerRow) {
      console.error('[hot-take/answer] Upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 })
    }

    const bothAnswered = answerRow?.user1_answer !== null && answerRow?.user1_answer !== undefined &&
                         answerRow?.user2_answer !== null && answerRow?.user2_answer !== undefined

    let noraComment = null

    if (bothAnswered) {
      const agreed = answerRow.user1_answer === answerRow.user2_answer

      // Get question text
      const { data: htSession } = await supabase
        .from('hot_take_sessions')
        .select('questions')
        .eq('session_id', sessionId)
        .maybeSingle()

      const questionObj = htSession?.questions?.find(q => q.id === questionId)
      const questionText = questionObj?.text || ''

      // Generate Nora one-liner via Haiku
      try {
        const prompt = agreed
          ? `A couple both ${answer ? 'agreed' : 'disagreed'} with this hot take: "${questionText}". Write a single witty Nora one-liner (5-8 words max) that provokes them to actually talk about WHY they agree. Be mischievous. No punctuation at end. Examples: "Of course you do. Explain yourselves", "Bold stance. Back it up", "Suspiciously unanimous. Fight about it"`
          : `A couple split on this hot take: "${questionText}". One agreed, one disagreed. Write a single witty Nora one-liner (5-8 words max) that stirs the pot. Be mischievous. No punctuation at end. Examples: "There it is. Talk about it", "Interesting. One of you is wrong", "Now we are getting somewhere"`

        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 40,
          messages: [{ role: 'user', content: prompt }],
        })
        noraComment = response.content[0].text.trim().replace(/['"]/g, '')
      } catch { noraComment = agreed ? 'Bold. Both of you explain.' : 'There it is. Talk about it.' }

      // Save Nora comment
      await supabase
        .from('hot_take_answers')
        .update({ nora_comment: noraComment, agreed })
        .eq('id', answerRow.id)

      // Notify partner if remote
      const { data: sess } = await supabase
        .from('game_sessions')
        .select('together')
        .eq('id', sessionId)
        .maybeSingle()

      if (!sess?.together) {
        const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://abf-couples-app.vercel.app'
        await fetch(`${appBase}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: partnerId,
            title: 'Hot Take',
            body: 'Your partner locked in their answer.',
            url: '/game-room/hot-take',
          }),
        }).catch(() => {})
      }
    }

    return NextResponse.json({
      answerRow,
      bothAnswered,
      agreed: bothAnswered ? answerRow.user1_answer === answerRow.user2_answer : null,
      noraComment,
      myAnswer: answer,
      partnerAnswer: bothAnswered ? (isUser1 ? answerRow.user2_answer : answerRow.user1_answer) : null,
    })

  } catch (err) {
    console.error('[hot-take/answer] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
