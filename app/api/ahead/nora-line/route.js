export const dynamic = 'force-dynamic'

import { getNoraMemory } from '@/lib/nora-memory'
import { noraSignal } from '@/lib/nora.js'
import { requireUser, verifyCoupleMembership } from '@/lib/api-auth'

export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return Response.json(authError.body, { status: authError.status })

    const { itemId, itemTitle, itemType, completionNote } = await request.json()
    if (!itemId || !itemTitle) return Response.json({ error: 'Missing required fields' }, { status: 400 })

    // Check if line already generated — idempotency guard. couple_id comes
    // from the item itself, never trusted from the client.
    const { data: item } = await supabase
      .from('shared_items')
      .select('completion_nora_line, couple_id')
      .eq('id', itemId)
      .single()
    if (!item) return Response.json({ error: 'Item not found' }, { status: 404 })

    const isMember = await verifyCoupleMembership(supabase, user.id, item.couple_id)
    if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

    if (item.completion_nora_line) {
      return Response.json({ line: item.completion_nora_line })
    }

    const coupleId = item.couple_id

    // Get couple context
    const memory = await getNoraMemory(coupleId)
    const coupleContext = memory?.memory_summary || ''

    const typeLabel = itemType === 'movie' ? 'film' : itemType === 'show' ? 'show' : itemType === 'song' ? 'album' : itemType === 'place' ? 'place' : 'thing'

    const prompt = `You are Nora, a relationship guide who knows this couple well.

They just completed something from their shared wishlist: "${itemTitle}" (${typeLabel}).
${completionNote ? `They noted: "${completionNote}"` : ''}
${coupleContext ? `What you know about them: ${coupleContext}` : ''}

Write exactly one sentence acknowledging this moment. Rules:
- Specific to this title and type — never generic
- No exclamation points
- No congratulations or affirmations
- No "you did it" energy
- Sound like you noticed something, not like you're celebrating
- Fewer than 18 words
- Do not start with "You"

Examples of the right tone:
"A place you'd been meaning to go since before you can remember."
"Kissa Tanto is now part of your story."
"Finally. The Brutalist has been waiting long enough."

Write only the sentence. Nothing else.`

    const line = await noraSignal(prompt, { route: 'ahead/nora-line', maxTokens: 60 })

    // Write to shared_items
    await supabase
      .from('shared_items')
      .update({ completion_nora_line: line })
      .eq('id', itemId)

    return Response.json({ line })
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
