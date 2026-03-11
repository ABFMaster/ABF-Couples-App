// ── NORA KNOWLEDGE LIBRARY ────────────────────────────────────────────────
// The research, frameworks, and pairing logic that make Nora brilliant.
// This is her intellectual foundation — distilled into language she can use.
// Schema: conflict_style = validating | volatile | avoiding
//         attachment_style = secure | anxious | avoidant | disorganized
//         love_language_primary = words_of_affirmation | quality_time | acts_of_service | gifts | physical_touch

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
GOTTMAN CONFLICT STYLES (three functional types — use these, never the old schema values):
- Validating: Calm, empathic, collaborative. Prioritizes understanding before resolution. Can stay in hard conversations without escalating. Strength: de-escalates naturally. Risk: over-accommodates — manages the other person's feelings so carefully that their own needs go unstated. Two validators can circle a problem without anyone naming what they actually need.
- Volatile: Passionate, expressive, direct. Debates openly, feels energized by honest confrontation, recovers quickly after conflict. Strength: nothing goes unsaid. Risk: flooding — escalates faster than the other person can track, especially with a validating or avoiding partner. Volatile + Avoiding is the highest-friction pairing.
- Avoiding: Minimizes conflict to protect the relationship. Believes most issues resolve on their own. Values harmony over resolution. Strength: does not escalate. Risk: issues accumulate unaddressed. The avoiding partner often needs the other person to create explicit safety before they will engage. Avoidance is not indifference — it is self-protection.
`
}

// ── SECTION 2: PAIRING MATRIX ─────────────────────────────────────────────

const PAIRINGS = {

  attachment: {
    'secure_secure': `
Both secure: The most naturally stable foundation. Neither reads neutral behavior as rejection or distance as abandonment. Conflict resolves more readily because both can self-regulate and communicate needs directly. The risk is complacency — secure couples sometimes mistake stability for not needing to tend the relationship actively. Growth edge: keep choosing each other intentionally, not just reliably.
`,
    'secure_anxious': `
Secure + Anxious: The secure partner's steadiness is genuinely regulating for the anxious partner — but only if the secure partner understands that reassurance is not weakness, it is medicine. The anxious partner's attunement and emotional depth can help the secure partner access more of their own emotional life. Friction: secure partner may read bids for reassurance as neediness; anxious partner may read secure partner's independence as indifference. Higher-functioning version: secure partner gives reassurance proactively, before it is needed. Anxious partner learns that distance is not abandonment.
`,
    'secure_avoidant': `
Secure + Avoidant: Secure partner has enough groundedness to not take avoidant withdrawal personally — most of the time. Avoidant partner is drawn to the security because it does not feel suffocating. Friction: when avoidant partner shuts down during stress, secure partner may push for connection at exactly the wrong moment. Higher-functioning version: secure partner learns to give space without interpreting it as rejection; avoidant partner learns to say I need an hour instead of just going silent.
`,
    'anxious_avoidant': `
Anxious + Avoidant: The most activating pairing. Anxious pursuit triggers avoidant withdrawal; avoidant withdrawal triggers more anxious pursuit. Each person's coping mechanism makes the other's worse. This pairing produces the most intense chemistry and the most exhausting conflict cycles. The anxious partner is not being needy — they are trying to restore connection. The avoidant partner is not being cold — they are trying to regulate. Neither is wrong. Both are scared. Higher-functioning version requires both people to understand the cycle explicitly: the anxious partner learning to self-soothe before pursuing, the avoidant partner learning to offer reassurance before withdrawing. When it works, it is because both have named the pattern and stopped blaming each other for it.
`,
    'anxious_anxious': `
Both Anxious: High emotional attunement in both directions — they feel each other deeply and are each highly motivated to maintain closeness. Risk is co-escalation: when one person's anxiety spikes, it activates the other's. Reassurance-seeking can become circular. Higher-functioning version: they develop explicit self-soothing practices so neither has to carry the other's anxiety as well as their own.
`,
    'avoidant_avoidant': `
Both Avoidant: Neither will push the other, which creates a comfortable surface stability. Risk is emotional distance becoming the default — both retreating independently until the relationship feels more like cohabitation than partnership. Higher-functioning version: they build explicit rituals of connection because neither will pursue naturally. Structure creates what instinct does not.
`,
    'disorganized_any': `
Disorganized attachment: Wants closeness but fears it. Behavior can seem contradictory — pursuing and withdrawing in the same moment. Needs consistency above all else. The partner's job is not to fix this but to be reliably present without becoming a source of threat. Patience and predictability are the most loving things on offer.
`,
  },

  conflict: {
    'validating_validating': `
Both Validating: The most stable conflict pairing. Both instinctively de-escalate, both prioritize understanding, neither will blow up or stonewall. Conflict gets resolved calmly and usually completely. The hidden risk: two validating people can be so focused on managing each other's experience that nobody says what they actually need. The relationship can feel smooth on the surface while real needs go unmet underneath. Growth edge: practice saying the uncomfortable thing, not just the diplomatic one.
`,
    'validating_volatile': `
Validating + Volatile: The volatile partner brings honesty and urgency; the validating partner brings calm and perspective. At their best, this pairing produces thorough conflict resolution — the volatile partner ensures nothing goes unsaid, the validating partner ensures it stays productive. Friction: the volatile partner can experience the validating partner's calm as not caring; the validating partner can experience the volatile partner's intensity as an attack. Key: volatile partner learns to signal care alongside passion; validating partner learns that urgency is not aggression.
`,
    'validating_avoiding': `
Validating + Avoiding: Moderate friction. The validating partner wants to work through things together; the avoiding partner wants the tension to pass on its own. The validating partner may feel like they are always the one initiating hard conversations; the avoiding partner may feel pursued. Higher-functioning version: validating partner creates explicit safety before raising issues — not as a tactic, but genuinely. Avoiding partner learns that engaging is an act of love, not a threat to the relationship.
`,
    'volatile_avoiding': `
Volatile + Avoiding: The highest-friction conflict pairing. The volatile partner moves toward conflict with full intensity; the avoiding partner moves away to protect themselves and the relationship. Volatile reads avoidance as not caring; avoiding reads volatile as unsafe. The more the volatile partner pushes, the more the avoiding partner retreats. The more the avoiding partner retreats, the more escalated the volatile partner becomes. This cycle is exhausting for both. Higher-functioning version requires the volatile partner to radically reduce intensity before the avoiding partner can engage at all — and the avoiding partner to name their limit explicitly rather than disappearing.
`,
    'volatile_volatile': `
Both Volatile: Passionate, honest, high-energy conflict. Nothing goes unsaid. Repairs happen quickly because both people are used to the intensity and neither catastrophizes it. Risk: flooding — both escalate simultaneously with no one able to de-escalate. Contempt can creep in when intensity becomes habitual. Higher-functioning version: they develop a shared signal for flooding — a word, a gesture — that both honor as a genuine pause, not a retreat.
`,
    'avoiding_avoiding': `
Both Avoiding: Neither will push the other, which produces a surface harmony. Risk is significant: issues accumulate unaddressed. Both people may feel vaguely unsatisfied without being able to name why. The relationship can feel peaceful and distant simultaneously. Higher-functioning version: they build a structured check-in — a time and format for raising things — because neither will do it organically.
`,
  },

  loveLanguage: {
    'words_of_affirmation_words_of_affirmation': `
Both Words of Affirmation: Natural resonance — they both know instinctively how to make each other feel loved, and both feel loved the same way. A sincere, specific compliment lands for both of them. Risk: silence becomes amplified for both. When appreciation stops being verbalized — during stress, busy seasons, the drift of routine — both feel it acutely and simultaneously. They need to keep the words coming even when life gets loud. Growth edge: stay specific. Generic affirmation fades; specific appreciation compounds.
`,
    'words_of_affirmation_acts_of_service': `
Words of Affirmation + Acts of Service: One shows love by saying it; the other shows love by doing it. Each can feel unseen — the acts partner doing everything and feeling unappreciated because it goes unacknowledged verbally; the words partner saying everything and feeling unloved because nothing tangible changes. Neither is withholding love — they are expressing it in a language the other is not fluent in. Higher-functioning version: acts partner learns to verbalize their love alongside their actions; words partner learns to notice and name what the acts partner does. When both become bilingual, this pairing is deeply complementary.
`,
    'words_of_affirmation_quality_time': `
Words + Quality Time: Different primary needs but compatible. The words partner feels loved through what is said; the quality time partner feels loved through undivided presence. They can absolutely meet each other's needs — but need to be intentional. Presence without words leaves the words partner wondering; words without presence leave the quality time partner feeling like a checkbox. Higher-functioning version: they create moments that are both — fully present and verbally warm simultaneously.
`,
    'words_of_affirmation_physical_touch': `
Words of Affirmation + Physical Touch: Complementary when both are fluent in each other's language. A moment of physical closeness paired with genuine verbal appreciation hits both simultaneously. Friction: touch partner may feel words are hollow without physical follow-through; words partner may feel touch without accompanying affirmation is incomplete. Higher-functioning version: they learn to deliver both together — the touch that comes with the words, the words that come with the touch.
`,
    'words_of_affirmation_gifts': `
Words of Affirmation + Gifts: The words partner feels loved through verbal appreciation; the gifts partner feels loved through tangible thoughtfulness. Both are about being seen — just expressed differently. Higher-functioning version: words partner learns to accompany appreciation with small tokens of noticing; gifts partner learns to verbalize the intention behind what they give.
`,
    'acts_of_service_quality_time': `
Acts of Service + Quality Time: Acts partner shows up by doing; quality time partner shows up by being present. Both are expressions of investment — one active, one attentive. Risk: acts partner stays busy doing things for the relationship while quality time partner just wants them to sit down. Higher-functioning version: acts partner builds in deliberate presence; quality time partner acknowledges the love embedded in what gets done.
`,
    'acts_of_service_physical_touch': `
Acts of Service + Physical Touch: One loves through action, the other through contact. Both are concrete, present-tense expressions of love. Naturally compatible — doing something for someone while physically close satisfies both. Risk: acts partner can become task-focused and physically distant; touch partner can feel the doing without feeling the connection. Higher-functioning version: bring the physical presence into the acts themselves.
`,
    'acts_of_service_acts_of_service': `
Both Acts of Service: They speak the same language and both feel loved through what gets done. Naturally compatible — both notice effort and both express love through it. Risk: the relationship can become functional and productive without being emotionally intimate. They do a lot for each other and may not say much. Growth edge: bring the words alongside the actions.
`,
    'quality_time_physical_touch': `
Quality Time + Physical Touch: Both need presence — just expressed differently. Touch needs physical closeness; quality time needs full attention. Naturally compatible because being truly present usually satisfies both simultaneously. Risk: distracted togetherness — physically close but mentally elsewhere — satisfies neither.
`,
    'quality_time_quality_time': `
Both Quality Time: They feel most loved when chosen deliberately, and both know how to give that. Undivided presence is the currency of this relationship. Risk: when life gets busy and quality time becomes scarce, both feel it acutely. They need to protect their time together with real intention — not just proximity, but presence.
`,
    'physical_touch_physical_touch': `
Both Physical Touch: Contact is connection for both. They regulate through each other's presence and both give and receive love physically. Naturally aligned. Risk: when touch decreases — stress, distance, disconnection — both feel it as a withdrawal of love. Maintaining physical affection during difficult periods is especially important for this pairing.
`,
    'gifts_quality_time': `
Gifts + Quality Time: Thoughtfulness and presence. Both want to feel chosen — one through tangible tokens, one through undivided attention. Higher-functioning version: they learn that a small gift given during quality time, or quality time devoted to finding the right gift, can speak both languages at once.
`,
  }
}

// ── SECTION 3: LAYER 1 vs LAYER 2 DISCREPANCY DETECTION ──────────────────
// When declared profile (assessment) diverges from observed behavior (app usage),
// Nora holds the tension as a curious observation — never a correction.

export function getDiscrepancyNotes(userProfile, behaviorSignals) {
  const notes = []

  if (!behaviorSignals) return ''

  // Avoidant declared but high engagement frequency
  if (userProfile.attachment_style === 'avoidant' && behaviorSignals.dailyEngagement === 'high') {
    notes.push(`${userProfile.display_name} self-reports as avoidant but engages with the app and their partner frequently. This may reflect earned security in this specific relationship, or the assessment capturing a general pattern that this relationship is shifting. Hold both — do not override the assessment, but weight observed behavior.`)
  }

  // Anxious declared but low response latency / high initiative
  if (userProfile.attachment_style === 'anxious' && behaviorSignals.initiativeRatio === 'low') {
    notes.push(`${userProfile.display_name} self-reports as anxious but shows low initiative in the app. May be suppressing anxious patterns, or the relationship context is providing enough security to reduce activation. Worth exploring gently.`)
  }

  // Avoiding conflict declared but high Nora routing (Tell Nora)
  if (userProfile.conflict_style === 'avoiding' && behaviorSignals.noraRoutingFrequency === 'high') {
    notes.push(`${userProfile.display_name} self-reports as conflict-avoiding but frequently routes to Nora — which is itself a form of processing and repair-seeking. This is a positive signal: they are finding a way to engage with difficulty even if not directly.`)
  }

  return notes.length > 0
    ? `\nBEHAVIORAL NOTES (Layer 1 vs Layer 2 discrepancies):\n${notes.join('\n')}`
    : ''
}

// ── SECTION 4: INJECTION FUNCTION ─────────────────────────────────────────

export function getNoraBriefing(userProfile, partnerProfile, behaviorSignals = null) {
  if (!userProfile || !partnerProfile) return ''

  const userName = userProfile.display_name || 'them'
  const partnerName = partnerProfile.display_name || 'their partner'

  const userAttachment = userProfile.attachment_style || 'secure'
  const partnerAttachment = partnerProfile.attachment_style || 'secure'
  const userConflict = userProfile.conflict_style || 'validating'
  const partnerConflict = partnerProfile.conflict_style || 'validating'
  const userLove = userProfile.love_language_primary || 'words_of_affirmation'
  const partnerLove = partnerProfile.love_language_primary || 'words_of_affirmation'

  const userAnxiety = userProfile.attachment_anxiety_score || 0
  const userAvoidance = userProfile.attachment_avoidance_score || 0
  const partnerAnxiety = partnerProfile.attachment_anxiety_score || 0
  const partnerAvoidance = partnerProfile.attachment_avoidance_score || 0

  // Mismatch detection: flag high-friction pairings that compound each other
  const attachmentMismatch =
    (userAnxiety > 3 && partnerAvoidance > 3) ||
    (partnerAnxiety > 3 && userAvoidance > 3)

  const conflictMismatch =
    (userConflict === 'volatile' && partnerConflict === 'avoiding') ||
    (userConflict === 'avoiding' && partnerConflict === 'volatile')

  const mismatchLevel = (attachmentMismatch && conflictMismatch) ? 'HIGH' : (attachmentMismatch || conflictMismatch) ? 'MODERATE' : null

  const avoidantPartner = userAvoidance > partnerAvoidance ? userName : partnerName
  const anxiousPartner = userAnxiety > partnerAnxiety ? userName : partnerName

  const mismatchNote = mismatchLevel === 'HIGH'
    ? `\nMISMATCH ALERT — HIGH FRICTION PAIRING:\n${anxiousPartner} is anxious-leaning and ${avoidantPartner} is avoidant-leaning AND their conflict styles compound this (volatile/avoiding). This is the most activating combination Nora works with. Anxious pursuit triggers avoidant withdrawal; volatile expression triggers conflict avoidance. Each person's coping mechanism makes the other's worse. Coaching priorities: (1) Name the cycle explicitly before attempting content-level resolution. (2) Help ${avoidantPartner} offer reassurance before withdrawing. (3) Help ${anxiousPartner} self-soothe before pursuing. (4) Reduce ${anxiousPartner === userName ? userName : partnerName}'s conflict intensity before ${avoidantPartner} can engage at all.`
    : mismatchLevel === 'MODERATE'
    ? `\nMISMATCH NOTE — MODERATE FRICTION:\n${attachmentMismatch ? `${anxiousPartner} trends anxious and ${avoidantPartner} trends avoidant — the classic pursuit/withdrawal cycle is a live risk. ` : ''}${conflictMismatch ? `Their conflict styles (volatile/avoiding) create a push-pull pattern under stress. ` : ''}Nora should name the dynamic before diving into content, and coach both people on their role in the cycle.`
    : ''

  const attachmentPairing =
    PAIRINGS.attachment[`${userAttachment}_${partnerAttachment}`] ||
    PAIRINGS.attachment[`${partnerAttachment}_${userAttachment}`] ||
    PAIRINGS.attachment['secure_secure']

  const conflictPairing =
    PAIRINGS.conflict[`${userConflict}_${partnerConflict}`] ||
    PAIRINGS.conflict[`${partnerConflict}_${userConflict}`] ||
    `Both ${userConflict} conflict style.`

  const lovePairing =
    PAIRINGS.loveLanguage[`${userLove}_${partnerLove}`] ||
    PAIRINGS.loveLanguage[`${partnerLove}_${userLove}`] ||
    `${userName} needs ${userLove}; ${partnerName} needs ${partnerLove}. Be specific about how each can show up for the other.`

  const discrepancyNotes = behaviorSignals
    ? getDiscrepancyNotes(userProfile, behaviorSignals)
    : ''

  const floodingNote = userProfile.flooding_prone
    ? `\nFLOODING NOTE: ${userName} has a flooding-prone profile. Set a container before difficult conversations — agree on a stop signal and a return time. Do not attempt deep conflict work without this structure in place first.`
    : ''

  const secondaryConflictNote = userProfile.conflict_secondary
    ? `\nSECONDARY CONFLICT NOTE: ${userName} shows a secondary ${userProfile.conflict_secondary} style — their conflict behavior may shift depending on the stakes and their stress level.`
    : ''

  return `
NORA'S BRIEFING ON ${userName.toUpperCase()} + ${partnerName.toUpperCase()}:

THEIR PROFILES:
- ${userName}: ${userAttachment} attachment (anxiety ${userAnxiety}, avoidance ${userAvoidance}) · ${userConflict} conflict style · ${userLove} love language
- ${partnerName}: ${partnerAttachment} attachment (anxiety ${partnerAnxiety}, avoidance ${partnerAvoidance}) · ${partnerConflict} conflict style · ${partnerLove} love language

ATTACHMENT DYNAMIC:
${attachmentPairing}

CONFLICT DYNAMIC:
${conflictPairing}
${floodingNote}
${secondaryConflictNote}

LOVE LANGUAGE DYNAMIC:
${lovePairing}
${discrepancyNotes}
${mismatchNote}

RESEARCH FOUNDATIONS NORA DRAWS FROM:
${FRAMEWORKS.gottman}
${FRAMEWORKS.attachment}
${FRAMEWORKS.loveLanguages}
${FRAMEWORKS.conflictStyles}
`.trim()
}
