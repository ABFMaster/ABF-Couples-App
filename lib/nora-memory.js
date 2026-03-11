import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MEMORY_UPDATE_THRESHOLD = 6; // minimum messages before updating memory

export async function maybeUpdateNoraMemory(conversationId, coupleId, supabase) {
  if (!coupleId) return;

  try {
    // Fetch conversation messages
    const { data: messages } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!messages || messages.length < MEMORY_UPDATE_THRESHOLD) return;

    // Fetch existing memory
    const { data: existing } = await supabase
      .from('nora_memory')
      .select('memory_summary, conversation_count')
      .eq('couple_id', coupleId)
      .maybeSingle();

    const existingMemory = existing?.memory_summary || null;
    const conversationCount = existing?.conversation_count || 0;

    // Format conversation for summarization
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Nora'}: ${m.content}`)
      .join('\n\n');

    // Ask Claude to evaluate substance and summarize
    const prompt = existingMemory
      ? `You are maintaining a private memory file for Nora, a relationship coach AI.

Here is Nora's existing memory about this couple:
${existingMemory}

Here is a new conversation that just occurred:
${conversationText}

Does this conversation contain anything meaningful worth adding to Nora's memory?
Look for: emotional disclosures, named patterns, specific struggles, commitments made,
breakthroughs, recurring themes, things the user said about themselves or their partner.

If there is nothing meaningful, respond with exactly: NULL

If there is something meaningful, respond with an updated memory summary that merges
the existing memory with new insights from this conversation. Write it as Nora's
private notes — specific, behavioral, warm, never clinical.
Maximum 400 words. No headers. Just flowing notes as if written by a thoughtful
friend who has known this couple for a while.`
      : `You are building a private memory file for Nora, a relationship coach AI meeting a couple for the first time.

Here is their first meaningful conversation:
${conversationText}

Does this conversation contain anything worth remembering about this couple?
Look for: emotional disclosures, named patterns, specific struggles, commitments made,
breakthroughs, recurring themes, things the user said about themselves or their partner.

If there is nothing meaningful, respond with exactly: NULL

If there is something meaningful, write Nora's initial memory notes about this couple —
specific, behavioral, warm, never clinical.
Maximum 400 words. No headers. Just flowing notes as if written by a thoughtful
friend who has just had a real conversation with this couple.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    });

    const summary = response.content[0].text.trim();
    if (summary === 'NULL' || !summary) return;

    // Upsert memory
    await supabase
      .from('nora_memory')
      .upsert({
        couple_id: coupleId,
        memory_summary: summary,
        conversation_count: conversationCount + 1,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'couple_id' });

  } catch (err) {
    console.error('[NoraMemory] Error updating memory:', err);
  }
}

export async function getNoraMemory(coupleId, supabase) {
  if (!coupleId) return null;
  try {
    const { data } = await supabase
      .from('nora_memory')
      .select('memory_summary, conversation_count, last_updated')
      .eq('couple_id', coupleId)
      .maybeSingle();
    return data?.memory_summary || null;
  } catch {
    return null;
  }
}
