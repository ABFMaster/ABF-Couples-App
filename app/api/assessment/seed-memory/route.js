import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { updateNoraMemory } from '@/lib/nora-memory'
import { scoreAttachmentStyle, scoreConflictStyle, generateModuleInsights } from '@/lib/relationship-questions'

export const dynamic = 'force-dynamic'

const filterAnswers = (answers, keys) =>
  Object.fromEntries(Object.entries(answers || {}).filter(([k]) => keys.includes(k)))

export async function POST(request) {
  try {
    const { userId, coupleId, answers, results } = await request.json()

    if (!userId || !answers) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Build a human-readable summary of assessment results for Nora
    const moduleResults = results?.modules || []
    const summaryParts = moduleResults.map(m => {
      if (m.moduleId === 'attachment_profile') return `Attachment: ${m.headline} — ${m.description}`
      if (m.moduleId === 'conflict_profile') return `Conflict style: ${m.headline} — ${m.description}`
      if (m.moduleId === 'love_expression') return `Love expression: ${m.headline} — ${m.description}`
      return `${m.title}: ${m.headline}`
    }).filter(Boolean)

    const inputData = {
      type: 'assessment_complete',
      summary: summaryParts.join('\n'),
      answers
    }

    await updateNoraMemory({
      userId,
      coupleId,
      signalType: 'PROFILE_UPDATE',
      inputData
    })

    // Parse scores and write back to user_profiles
    const attachmentResult = scoreAttachmentStyle(answers)
    const conflictResult = scoreConflictStyle(answers)
    const loveResult = generateModuleInsights('love_expression', filterAnswers(answers, ['le_1', 'le_2', 'le_3']))

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    await supabase.from('user_profiles').upsert({
      user_id: userId,
      attachment_style: attachmentResult.primary,
      attachment_anxiety_score: attachmentResult.anxietyScore,
      attachment_avoidance_score: attachmentResult.avoidanceScore,
      conflict_style: conflictResult.primary,
      love_language_primary: loveResult.primary,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[seed-memory] error:', error)
    return NextResponse.json({ error: 'Failed to seed memory' }, { status: 500 })
  }
}
