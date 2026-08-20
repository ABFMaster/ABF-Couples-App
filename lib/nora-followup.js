// ── TALK-TO-NORA FOLLOW-UP PROMPT GENERATOR ──────────────────────────────
// Built for task #261 (Sessions/PRODUCT_BACKLOG.md) — the per-activity
// "Talk to Nora" CTA shown after Spark/Bet/Ritual/Wednesday/Thursday/Game
// Room reveals.
//
// DELIBERATELY a separate, standalone call — never folded into the existing
// nora_reaction/nora_solo_insight/checkinReaction/nora_synthesis/nora_verdict
// generation calls it runs alongside. Those all return plain text today,
// zero JSON parsing anywhere in that code. Converting them to JSON-with-a-
// follow-up-field to save one API call would risk the exact fragility class
// that caused Memory Test's repeated "Something went wrong" bugs earlier
// this engagement (stress-tested and rejected — see task #261's build log).
// This costs one extra small call per activity completion instead; that's
// the real, named tradeoff.
//
// Never throws. A failure here must never block or degrade the reveal it's
// attached to — callers get back an empty string and should fall back to
// static CTA copy client-side, exactly like a missing/null DB field.

import { noraReact } from './nora'

export async function generateFollowUpPrompt({ activityLabel, question, answer, reactionText, route }) {
  if (!reactionText && !answer) return ''

  const prompt = `Nora just reacted to something in ${activityLabel || 'a daily activity'}: "${reactionText || ''}"

The question was: "${question || ''}"
Their answer was: "${answer || ''}"

Write one short, genuinely curious follow-up question Nora would ask next if this were a real conversation continuing — something that invites them to say more, not a restatement of what they already said. Maximum 12 words. No greeting, no "I'm curious" preamble, no quotation marks — just the question itself.`

  try {
    const result = await noraReact(prompt, {
      route: route || 'nora-followup',
      context: 'daily',
      maxTokens: 40,
    })
    return (result || '').trim().replace(/^["']|["']$/g, '')
  } catch (err) {
    console.error('[nora-followup] generation failed:', err)
    return ''
  }
}
