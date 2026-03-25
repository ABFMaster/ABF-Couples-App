import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'

export async function POST(request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sparkId, responseText } = await request.json()

    // Step 3: Fetch sparks row
    const { data: sparkRow } = await supabase
      .from('sparks')
      .select('id, couple_id, question, question_tone')
      .eq('id', sparkId)
      .maybeSingle()

    const coupleId = sparkRow?.couple_id

    // Step 4: Upsert current user's response
    await supabase
      .from('spark_responses')
      .upsert({
        spark_id: sparkId,
        user_id: user.id,
        couple_id: coupleId,
        response_text: responseText,
        responded_at: new Date().toISOString(),
      }, { onConflict: 'spark_id,user_id' })

    // Step 5: Derive partnerId from couple
    const { data: coupleRow } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .maybeSingle()

    const partnerId = coupleRow?.user1_id === user.id ? coupleRow?.user2_id : coupleRow?.user1_id

    // Step 6: Fetch partner's spark response
    const { data: partnerResponse } = await supabase
      .from('spark_responses')
      .select('*')
      .eq('spark_id', sparkId)
      .eq('user_id', partnerId)
      .maybeSingle()

    // Steps 7 & 8: Fetch both user names
    const [{ data: myProfile }, { data: partnerProfile }] = await Promise.all([
      supabase.from('user_profiles').select('name').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_profiles').select('name').eq('user_id', partnerId).maybeSingle(),
    ])

    const currentUserName = myProfile?.name || 'Your partner'
    const partnerName = partnerProfile?.name || 'Your partner'

    // Step 9: Push notification to partner
    const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://abf-couples-app.vercel.app'
    await fetch(`${appBase}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: partnerId,
        title: 'The Spark',
        body: `${currentUserName} just answered The Spark.`,
        url: '/today',
      }),
    }).catch(() => {})

    const bothAnswered = !!(partnerResponse?.responded_at)

    // Step 10: Generate Nora reaction if both have answered
    if (bothAnswered) {
      // Step 10a: Fetch couple profile context
      const [{ data: myFullProfile }, { data: partnerFullProfile }, { data: noraMemory }] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('love_language_primary, attachment_style, conflict_style')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_profiles')
          .select('love_language_primary, attachment_style, conflict_style')
          .eq('user_id', partnerId)
          .maybeSingle(),
        supabase
          .from('nora_memory')
          .select('memory_summary')
          .eq('couple_id', coupleId)
          .maybeSingle(),
      ])

      // Step 10c: Build prompt and call Anthropic
      const myContext = [myFullProfile?.love_language_primary, myFullProfile?.attachment_style].filter(Boolean).join(', ')
      const partnerContext = [partnerFullProfile?.love_language_primary, partnerFullProfile?.attachment_style].filter(Boolean).join(', ')

      const memoryLine = noraMemory?.memory_summary
        ? `\nWhat Nora knows about them: ${noraMemory.memory_summary}`
        : ''

      const userPrompt = `The Spark question was: ${sparkRow.question}

${currentUserName} answered: ${responseText}
${partnerName} answered: ${partnerResponse.response_text}

Their profiles: ${currentUserName} is ${myContext}. ${partnerName} is ${partnerContext}.${memoryLine}

You are speaking directly to ${currentUserName}. React to both answers but speak TO ${currentUserName} — not about them. Be specific to what they actually said.`

      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

      const completion = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 150,
        system: 'You are Nora, an AI relationship coach embedded in a couples app. You are warm, direct, and perceptive. You are speaking directly to the user who is reading this — always use \'you\' for them and their partner\'s actual name for the partner. Never use \'they\', \'them\', \'their\', or any third-person language — there is no third party, you are talking directly to one of the two people. Never restate the question. Never start with an affirmation. React to what was actually said — be specific, not conceptual. Notice alignment, surprise, tenderness, or humor in the two answers. Keep your reaction to 1-2 sentences maximum.',
        messages: [{ role: 'user', content: userPrompt }],
      })

      const noraReaction = completion.content[0]?.text || ''

      // Steps 10e & 10f: Write nora_reaction to both users' spark_responses
      await Promise.all([
        supabase
          .from('spark_responses')
          .update({ nora_reaction: noraReaction })
          .eq('spark_id', sparkId)
          .eq('user_id', user.id),
        supabase
          .from('spark_responses')
          .update({ nora_reaction: noraReaction })
          .eq('spark_id', sparkId)
          .eq('user_id', partnerId),
      ])

      updateNoraMemory({
        coupleId,
        signalType: SIGNAL_TYPES.SPARK_REVEAL,
        inputData: {
          question: sparkRow.question,
          responses: [
            { name: currentUserName, answer: responseText },
            { name: partnerName, answer: partnerResponse?.response_text || null },
          ],
        },
      }).catch(() => {})

      // Update Nora memory with what was learned from this Spark
      const newMemoryEntry = `Spark question: "${sparkRow.question}". ${currentUserName} answered: "${responseText}". ${partnerName} answered: "${partnerResponse.response_text}". Nora's observation: "${noraReaction}".`

      const { data: existingMemory } = await supabase
        .from('nora_memory')
        .select('memory_summary')
        .eq('couple_id', coupleId)
        .maybeSingle()

      const updatedSummary = existingMemory?.memory_summary
        ? `${existingMemory.memory_summary}\n${newMemoryEntry}`
        : newMemoryEntry

      await supabase
        .from('nora_memory')
        .upsert({ couple_id: coupleId, memory_summary: updatedSummary }, { onConflict: 'couple_id' })
    }

    return NextResponse.json({ success: true, bothAnswered, partnerName })
  } catch (err) {
    console.error('[spark/respond] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
