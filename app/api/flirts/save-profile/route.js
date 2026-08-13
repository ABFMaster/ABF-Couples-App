export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { noraGenerate, parseNoraJSON } from '@/lib/nora'
import { updateNoraMemory, SIGNAL_TYPES } from '@/lib/nora-memory'
import { requireUser } from '@/lib/api-auth'

const EXTRACTION_PROMPT = `Read this conversation and extract the following as a JSON object with no other text:
{
  humor_style: string (how this person's partner makes them laugh, 1-2 sentences),
  flirt_style: string (playful / romantic / bold / subtle — pick the best fit based on context),
  media_touchstones: array of strings (movies, shows, music, places mentioned),
  inside_joke: string (one specific memory or inside joke mentioned, or null if none)
}`

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { messages } = await request.json()
    const userId = user.id

    // Format conversation for extraction
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Nora'}: ${m.content}`)
      .join('\n\n')

    let profile
    try {
      const prompt = `${EXTRACTION_PROMPT}\n\n${conversationText}`
      const response = await noraGenerate(prompt, { route: 'flirts/save-profile', maxTokens: 600 })

      const raw = response
      try {
        profile = parseNoraJSON(raw)
      } catch (e) {
        console.error('[flirts/save-profile] JSON parse failed:', raw)
        return NextResponse.json({ error: 'Failed to parse Nora response' }, { status: 500 })
      }
    } catch (err) {
      console.error('[FlirtSaveProfile] Extraction failed:', err, err.message)
      return NextResponse.json({ success: false, error: 'extraction failed' })
    }

    await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        humor_style: profile.humor_style ?? null,
        flirt_style: profile.flirt_style ?? null,
        media_touchstones: profile.media_touchstones ?? [],
        inside_joke: profile.inside_joke ?? null,
        flirt_profile_completed: true,
      }, { onConflict: 'user_id' })

    const { data: couple } = await supabase
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .maybeSingle()

    if (couple) {
      // Was SIGNAL_TYPES.FLIRT_SENT — structurally wrong signal type. This is
      // building a flirt-style profile via Q&A, not sending an actual flirt;
      // FLIRT_SENT's lens ("what the choice of flirt reveals about how they
      // express desire in practice") doesn't fit this content. Fixed Aug 5
      // 2026 by adding a dedicated FLIRT_PROFILE_BUILT signal type.
      updateNoraMemory({ coupleId: couple.id, userId, signalType: SIGNAL_TYPES.FLIRT_PROFILE_BUILT, inputData: { profile, conversation: messages } }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[FlirtSaveProfile] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
