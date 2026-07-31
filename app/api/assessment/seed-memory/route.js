import { NextResponse } from 'next/server'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'
import { scoreAttachmentStyle, scoreConflictStyle, generateModuleInsights } from '@/lib/relationship-questions'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

const filterAnswers = (answers, keys) =>
  Object.fromEntries(Object.entries(answers || {}).filter(([k]) => keys.includes(k)))

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { coupleId, answers, results } = await request.json()
    const userId = user.id

    if (!answers) {
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

    // Only trust the client-supplied coupleId if this user actually belongs
    // to it — otherwise a caller could pollute another couple's memory.
    const isMember = coupleId ? await verifyCoupleMembership(supabase, userId, coupleId) : false
    const resolvedCoupleId = isMember ? coupleId : null

    await updateNoraMemory({
      userId,
      coupleId: resolvedCoupleId,
      signalType: SIGNAL_TYPES.ASSESSMENT_COMPLETE,
      inputData
    })

    // Parse scores and write back to user_profiles
    const attachmentResult = scoreAttachmentStyle(answers)
    const conflictResult = scoreConflictStyle(answers)
    const loveResult = generateModuleInsights('love_expression', filterAnswers(answers, ['le_1', 'le_2', 'le_3']))

    await supabase.from('user_profiles').upsert({
      user_id: userId,
      attachment_style: attachmentResult.primary,
      attachment_anxiety_score: attachmentResult.anxietyScore,
      attachment_avoidance_score: attachmentResult.avoidanceScore,
      conflict_style: conflictResult.primary,
      love_language_primary: loveResult.primary,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    await supabase
      .from('hero_cache')
      .delete()
      .eq('user_id', userId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[seed-memory] error:', error)
    return NextResponse.json({ error: 'Failed to seed memory' }, { status: 500 })
  }
}
