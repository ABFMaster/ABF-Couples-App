'use client'

import { useRouter } from 'next/navigation'

// Shared "Talk to Nora" CTA — task #261 (Sessions/PRODUCT_BACKLOG.md).
// Dropped in right after the existing Nora-reaction block on every daily
// activity reveal (Spark, Bet, Ritual, Wednesday, Thursday, Game Room
// verdict) so the same small affordance appears everywhere, not six
// different bolt-ons.
//
// Seeding mechanism reuses the existing, already-proven `nora_opener`
// sessionStorage pattern (see components/CoachInsightCard.js) rather than
// introducing a second competing one — the AI Coach page already knows how
// to read it and open a new conversation pre-seeded with that text.
//
// No sourceId/sourceType is passed to the AI Coach route. It doesn't need
// to be: daily_checkins (which Spark/Bet/Ritual already write on every
// response) already feeds into buildCoachContext's recentActivity, so the
// conversation is already grounded in what was just answered without any
// new server-side plumbing — and without adding a new ownership-check
// surface for no real benefit (stress-tested, see task #261 build log).
//
// isSolo changes emphasis, not mechanism: for a solo user, Nora reacting to
// them IS the payoff (no partner comparison to fall back on), so her actual
// follow-up question becomes the featured, italic line. For a coupled user
// this is secondary to whatever else is on the card, so it renders smaller
// and quieter.
export default function TalkToNoraCTA({
  seedText,        // exact reaction/insight/verdict text already shown — becomes Nora's opening line in the chat
  followUpPrompt,  // optional short Nora-generated follow-up question (lib/nora-followup.js) — used as the CTA's own label when present
  isSolo = false,
  accent = '#8B7355',
  style = {},
}) {
  const router = useRouter()

  if (!seedText) return null

  const handleClick = () => {
    try {
      sessionStorage.setItem('nora_opener', seedText)
    } catch {}
    router.push('/ai-coach?new=true')
  }

  const label = isSolo
    ? (followUpPrompt || 'Want to talk about this with Nora?')
    : (followUpPrompt || 'Go deeper with Nora')

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'block',
        background: 'none',
        border: 'none',
        padding: 0,
        marginTop: isSolo ? '14px' : '10px',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: isSolo ? "'Fraunces', Georgia, serif" : 'inherit',
        fontSize: isSolo ? '14px' : '12.5px',
        fontStyle: isSolo ? 'italic' : 'normal',
        fontWeight: isSolo ? 400 : 600,
        color: accent,
        opacity: isSolo ? 0.95 : 0.75,
        lineHeight: 1.4,
        ...style,
      }}
    >
      {label} →
    </button>
  )
}
