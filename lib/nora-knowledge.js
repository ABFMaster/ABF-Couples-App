// ── NORA KNOWLEDGE LIBRARY ────────────────────────────────────────────────
// The research, frameworks, and pairing logic that make Nora brilliant.
// This is her intellectual foundation — distilled into language she can use.

// ── SECTION 1: FRAMEWORKS ─────────────────────────────────────────────────

const FRAMEWORKS = {
  gottman: `
GOTTMAN FUNDAMENTALS (use these to inform your observations, never cite them clinically):
- The Four Horsemen that erode relationships: Criticism (attacking character, not behavior), Contempt (superiority, eye-rolling, sarcasm — the most destructive), Defensiveness (counter-attacking instead of listening), Stonewalling (shutting down, going silent). Their antidotes: gentle startup, building fondness, taking responsibility, self-soothing.
- Bids for connection: Every small reach — a comment, a touch, a question — is a bid. Partners either turn toward, turn away, or turn against. Couples who thrive turn toward each other's bids 86% of the time. Couples who divorce: 33%.
- The 5:1 ratio: Stable relationships have at least 5 positive interactions for every negative one. During conflict, 20:1. This is not about avoiding hard conversations — it is about the emotional bank account those conversations draw from.
- Repair attempts: The ability to de-escalate during conflict is the single strongest predictor of relationship health. A repair attempt can be clumsy — a touch, a joke, I need a break — but if the other person accepts it, the relationship is resilient.
`,

  attachment: `
ATTACHMENT IN DAILY LIFE (behavioral, not clinical):
- Secure: Comfortable with intimacy and independence. Communicates needs directly. Does not catastrophize distance. Recovers from conflict without prolonged anxiety. Assumes the relationship is fundamentally okay even when things are hard.
- Anxious: Highly attuned to partner's emotional state. Reads distance as rejection. Needs reassurance — not as weakness, but as how they regulate. Can escalate to re-establish connection. Deeply loving but can overwhelm partners who need space.
- Avoidant: Values autonomy. Processes emotions internally before externally. Can appear distant when actually just regulating. Closeness can feel threatening when stressed. Deeply caring but shows it through actions more than words.
- Disorganized: Wants closeness but fears it. Often from early experiences where caregivers were both safe and frightening. Relationship behavior can seem contradictory — pursuing and withdrawing. Needs consistency and patience above all.
`,

  loveLanguages: `
LOVE LANGUAGE INTERACTION PATTERNS:
- Words of Affirmation: Needs to hear it. Silence reads as indifference. Criticism lands harder than for other types. Thrives on specific appreciation — not just I love you but I noticed what you did and it meant something.
- Physical Touch: Needs presence and contact to feel connected. Not necessarily sexual — a hand on the shoulder, sitting close. Distance feels like emotional distance. Touch is how they regulate and reconnect.
- Quality Time: Needs undivided attention. Phone out during dinner is a real wound. Values presence over presents. Feels most loved when chosen deliberately — not fit in between other things.
- Acts of Service: Watches what you do, not what you say. Help without being asked is deeply loving. Neglected tasks feel like neglect of the relationship. Let me handle that is I love you.
- Receiving Gifts: Not about materialism — about thoughtfulness. A small thing picked up because you thought of them. Forgetting an anniversary or milestone lands as forgetting them.
`,

  conflictStyles: `
CONFLICT STYLE DYNAMICS:
- Talk immediately: Needs to resolve now. Sitting with unresolved tension is physically uncomfortable. Can push for conversation before partner is ready, which escalates rather than resolves.
- Need space: Has to process internally before they can talk productively. Forcing conversation when flooded produces defensiveness or shutdown. I need an hour is not avoidance — it is preparation.
- Write it out: Processes through expression. Writing clarifies their own feelings. May need to send a message before they can have a conversation. This is a legitimate processing style, not a cop-out.
- Avoid: Conflict feels threatening to the relationship itself. Will smooth over rather than address. Needs to learn that healthy conflict strengthens rather than damages. Partner may need to create safety explicitly before they will engage.
`
}

// ── SECTION 2: PAIRING MATRIX ─────────────────────────────────────────────

const PAIRINGS = {

  attachment: {
    'secure_secure': `
Both secure: The most naturally stable foundation. Neither is reading neutral behavior as rejection or distance as abandonment. Conflict is more likely to be resolved because both can self-regulate and communicate needs directly. The risk is complacency — secure couples sometimes mistake stability for not needing to tend the relationship actively. Growth edge: keep choosing each other intentionally, not just reliably.
`,
    'secure_anxious': `
Secure + Anxious: The secure partner's steadiness is genuinely regulating for the anxious partner — but only if the secure partner understands that reassurance is not weakness, it is medicine. The anxious partner's attunement and emotional depth can help the secure partner access more of their own emotional life. Friction: secure partner may read bids for reassurance as neediness; anxious partner may read secure partner's independence as indifference. Higher-functioning version: secure partner gives reassurance proactively, before it is needed. Anxious partner learns that distance is not abandonment.
`,
    'secure_avoidant': `
Secure + Avoidant: Secure partner has enough groundedness to not take avoidant withdrawal personally — most of the time. Avoidant partner is drawn to the security because it does not feel suffocating. Friction: when avoidant partner shuts down during stress, secure partner may push for connection at exactly the wrong moment. Higher-functioning version: secure partner learns to give space without interpreting it as rejection; avoidant partner learns to say I need an hour instead of just going silent.
`,
    'anxious_avoidant': `
Anxious + Avoidant: The most activating pairing. Anxious pursuit triggers avoidant withdrawal; avoidant withdrawal triggers more anxious pursuit. Each person's coping mechanism makes the other's worse. This pairing produces the most intense chemistry and the most exhausting conflict cycles. Higher-functioning version requires both people to understand the cycle explicitly — the anxious partner learning to self-soothe before pursuing, the avoidant partner learning to offer reassurance before withdrawing. When it works, it is because both have done real work on their patterns.
`,
  },

  conflict: {
    'need_space_need_space': `
Both need space before talking: Natural alignment — neither will push the other when flooded. Risk is that space becomes permanent avoidance. Issues can go unaddressed for too long because neither person is forcing the conversation. Higher-functioning version: agree on a return time when taking space. I need an hour, let's talk at 8 is healthy. Indefinite space is not.
`,
    'talk_immediately_need_space': `
Talk immediately + Need space: Classic mismatch in pacing. The talk-immediately partner experiences space as abandonment or stonewalling. The need-space partner experiences immediate conversation as an ambush. Neither is wrong — they are just dysregulated on opposite timelines. Solution is a bridge: I am not ready right now but I will be in an hour from the space-needer, and genuine patience from the talk-immediately partner. When both honor the agreement, this pairing resolves conflict well.
`,
    'talk_immediately_avoid': `
Talk immediately + Avoid: High friction. One person is moving toward conflict to resolve it; the other is moving away to protect the relationship from it. The avoider reads pursuit as aggression; the pursuer reads avoidance as not caring. Higher-functioning version requires the avoider to understand that engaging is an act of love, not a threat — and the pursuer to create enough safety that engaging feels survivable.
`,
  },

  loveLanguage: {
    'words_of_affirmation_physical_touch': `
Words of Affirmation + Physical Touch: Beautifully complementary when both are fluent in each other's language. The words partner needs to hear appreciation; the touch partner needs to feel presence. A moment of physical closeness paired with genuine verbal appreciation hits both simultaneously. Friction: touch partner may feel words are cheap without physical follow-through; words partner may feel touch without accompanying affirmation is hollow. Higher-functioning version: they learn to deliver both together — the touch that comes with the words, the words that come with the touch.
`,
    'words_of_affirmation_words_of_affirmation': `
Both Words of Affirmation: Natural resonance — they both know how to make each other feel loved and both feel loved the same way. Risk is that silence becomes amplified. If appreciation stops being verbalized — during stress, busy seasons, routine — both feel it acutely. They need to keep the words coming even when life gets loud.
`,
    'words_of_affirmation_quality_time': `
Words + Quality Time: Different primary needs but compatible. The words partner feels loved through what is said; the quality time partner feels loved through undivided presence. They can absolutely meet each other's needs — but need to be intentional. Presence without words leaves the words partner wondering; words without presence leave the quality time partner feeling like a checkbox.
`,
    'physical_touch_quality_time': `
Physical Touch + Quality Time: Both need presence — just expressed differently. Touch needs physical closeness; quality time needs full attention. They are naturally compatible because being truly present usually satisfies both. Risk: distracted togetherness — physically close but mentally elsewhere — satisfies neither.
`,
    'acts_of_service_words_of_affirmation': `
Acts of Service + Words of Affirmation: One shows love by doing; the other shows love by saying. Each can feel unseen by the other — the acts partner doing everything and feeling unappreciated because it goes unacknowledged; the words partner saying everything and feeling unloved because nothing gets done. Higher-functioning version: acts partner learns to verbalize their love alongside their actions; words partner learns to notice and name what the acts partner does.
`,
  }
}

// ── SECTION 3: INJECTION FUNCTION ─────────────────────────────────────────

export function getNoraBriefing(userProfile, partnerProfile) {
  if (!userProfile || !partnerProfile) return ''

  const userName = userProfile.display_name || 'them'
  const partnerName = partnerProfile.display_name || 'their partner'

  const userAttachment = userProfile.attachment_style || 'secure'
  const partnerAttachment = partnerProfile.attachment_style || 'secure'
  const userConflict = userProfile.conflict_style || 'need_space'
  const partnerConflict = partnerProfile.conflict_style || 'need_space'
  const userLove = userProfile.love_language_primary || 'words_of_affirmation'
  const partnerLove = partnerProfile.love_language_primary || 'physical_touch'

  const attachmentPairing =
    PAIRINGS.attachment[`${userAttachment}_${partnerAttachment}`] ||
    PAIRINGS.attachment[`${partnerAttachment}_${userAttachment}`] ||
    PAIRINGS.attachment['secure_secure']

  const conflictPairing =
    PAIRINGS.conflict[`${userConflict}_${partnerConflict}`] ||
    PAIRINGS.conflict[`${partnerConflict}_${userConflict}`] ||
    ''

  const lovePairing =
    PAIRINGS.loveLanguage[`${userLove}_${partnerLove}`] ||
    PAIRINGS.loveLanguage[`${partnerLove}_${userLove}`] ||
    ''

  return `
NORA'S BRIEFING ON ${userName.toUpperCase()} + ${partnerName.toUpperCase()}:

THEIR COMBINATION:
- ${userName}: ${userAttachment} attachment · ${userConflict} conflict style · ${userLove} love language
- ${partnerName}: ${partnerAttachment} attachment · ${partnerConflict} conflict style · ${partnerLove} love language

ATTACHMENT DYNAMIC:
${attachmentPairing}

CONFLICT DYNAMIC:
${conflictPairing || `Both have ${userConflict} conflict style — see conflict styles framework for detail.`}

LOVE LANGUAGE DYNAMIC:
${lovePairing || `${userName} needs ${userLove}; ${partnerName} needs ${partnerLove}. Be specific about how each can show up for the other.`}

RESEARCH FOUNDATIONS NORA DRAWS FROM:
${FRAMEWORKS.gottman}
${FRAMEWORKS.attachment}
${FRAMEWORKS.loveLanguages}
${FRAMEWORKS.conflictStyles}
`.trim()
}
