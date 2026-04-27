import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getNoraMemory } from '@/lib/nora-memory'
import { noraSignal } from '@/lib/nora.js'

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { itemId, itemTitle, itemType, coupleId, completionNote } = await request.json()
    if (!itemId || !itemTitle || !coupleId) return Response.json({ error: 'Missing required fields' }, { status: 400 })

    // Check if line already generated — idempotency guard
    const { data: item } = await supabase
      .from('shared_items')
      .select('completion_nora_line')
      .eq('id', itemId)
      .single()
    if (item?.completion_nora_line) {
      return Response.json({ line: item.completion_nora_line })
    }

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
    console.error('ahead/nora-line error:', err)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
