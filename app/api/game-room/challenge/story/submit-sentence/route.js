import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { roundId, userId, coupleId, sentence, challengeSessionId } = await request.json()
    if (!roundId || !userId || !sentence) {
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

    const partnerId = couple.user1_id === userId ? couple.user2_id : couple.user1_id

    const currentSentences = round.sentences || []
    const newSentence = { user_id: userId, text: sentence, turn: currentSentences.length + 1 }
    const updatedSentences = [...currentSentences, newSentence]
    const totalSentences = updatedSentences.length
    const storyComplete = totalSentences >= 6

    // Flip turn to partner unless story is complete
    const nextTurnUserId = storyComplete ? null : partnerId

    // Generate mid-story Nora nudge after sentence 3
    let noraNudge = null
    if (totalSentences === 3) {
      try {
        const storyText = updatedSentences.map(s => s.text).join(' ')
        const nudgeResponse = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 60,
          messages: [{
            role: 'user',
            content: `You are Nora — snarky game show host. A couple is writing a story together alternating sentences. Here are the first three sentences: "${storyText}". Drop one line — a provocation, a challenge, a twist instruction. Max 12 words. Don't summarize. Make the next three sentences more interesting.`
          }]
        })
        noraNudge = nudgeResponse.content[0].text.trim()
      } catch {}
    }

    const updateData = {
      sentences: updatedSentences,
      current_turn_user_id: nextTurnUserId,
      story_complete: storyComplete,
    }
    if (noraNudge) updateData.nora_nudge = noraNudge

    const { data: updatedRound } = await supabase
      .from('challenge_rounds')
      .update(updateData)
      .eq('id', roundId)
      .select('*')
      .maybeSingle()

    return NextResponse.json({ round: updatedRound, storyComplete, noraNudge })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
