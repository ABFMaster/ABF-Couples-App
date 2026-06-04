import { NextResponse } from 'next/server'
import { updateNoraMemory } from '@/lib/nora-memory'

export const dynamic = 'force-dynamic'

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

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[seed-memory] error:', error)
    return NextResponse.json({ error: 'Failed to seed memory' }, { status: 500 })
  }
}
