import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const envFile = readFileSync('.env.local', 'utf8')
envFile.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return
  const eqIndex = trimmed.indexOf('=')
  if (eqIndex === -1) return
  const key = trimmed.substring(0, eqIndex).trim()
  const val = trimmed.substring(eqIndex + 1).trim()
  if (key) process.env[key] = val
})

const anthropic = new Anthropic({ apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// ─────────────────────────────────────────────────────────────────────────────
// Copied from lib/nora-memory.js
// ─────────────────────────────────────────────────────────────────────────────

const SIGNAL_TYPES = {
  NORA_CONVERSATION: 'nora_conversation',
  SPARK_REVEAL: 'spark_reveal',
  BET_REVEAL: 'bet_reveal',
  WEEKLY_REFLECTION: 'weekly_reflection',
  GAME_ROOM_DEBRIEF: 'game_room_debrief',
  FLIRT_SENT: 'flirt_sent',
  RITUAL_CHECKIN: 'ritual_checkin',
  DATE_COMPLETED: 'date_completed',
  TIMELINE_EVENT: 'timeline_event',
}

const CONFLICT_RESOLUTION_RULES = `
CONFLICT RESOLUTION — when new observation contradicts existing notes:
1. Pattern beats incident — one moment does not overturn a pattern. Three consistent observations do.
2. Behavior beats self-report — what they do matters more than what they say about themselves.
3. Recent beats old — if the contradiction represents genuine change, the new observation wins.
   Note the shift explicitly: "Previously X, now showing Y — something has moved here."
4. Never stack contradictions — if you cannot resolve with confidence, write the uncertainty:
   "This is unclear — watching to see which pattern holds."
`

const GOOD_NOTES_EXAMPLE = `
EXAMPLE OF GOOD NOTES (specific, hypothesis-driven, predictive):
"Matt experiences love as being chosen in the specific — not grand gestures, but his partner
picking up on the exact thing he mentioned wanting and making it real. When that happens,
he opens. When he feels managed rather than seen, he goes quiet in a way that looks like
calm but isn't. His attachment fear lives in adequacy — not abandonment, but irrelevance.
The question underneath most of his behavior is: am I enough for what she actually needs?
He answers it with action. Watch for moments when he offers to fix something she didn't ask
to be fixed — that's his anxiety talking. He's more emotionally available than he presents.
The armor is competence. The man underneath it is paying close attention."

EXAMPLE OF BAD NOTES (generic, template-filled, not useful):
"Matt is anxious attachment type who loves acts of service. He sometimes gets defensive
in conflict. He wants to feel appreciated. He cares about her deeply."

The first is a hypothesis about a specific person. The second is a template with names filled in.
Always write the first kind.
`

function buildPersonNotesPrompt(personName, signalType, inputData, existingNotes) {
  const signalLens = {
    [SIGNAL_TYPES.NORA_CONVERSATION]: `Full hypothesis update. Look across everything said for patterns, fears, and what actually moves this person.`,
    [SIGNAL_TYPES.SPARK_REVEAL]: `Focus on what this answer reveals about what love actually feels like to ${personName} in practice — not what they claim to want, what shows up in how they answered.`,
    [SIGNAL_TYPES.BET_REVEAL]: `Focus on what the prediction and actual answer reveal about ${personName}'s self-knowledge and how they see themselves in this relationship.`,
    [SIGNAL_TYPES.WEEKLY_REFLECTION]: `Focus on what ${personName}'s framing of the week reveals about what they're tracking and what matters to them.`,
    [SIGNAL_TYPES.GAME_ROOM_DEBRIEF]: `Focus on how ${personName} engaged in play — what they reached for, what they avoided, what came alive.`,
    [SIGNAL_TYPES.FLIRT_SENT]: `Focus on what the choice of flirt reveals about how ${personName} expresses desire and love in practice.`,
    [SIGNAL_TYPES.RITUAL_CHECKIN]: `Lightweight signal. Note only if something meaningful about showing up or withdrawing is evident.`,
    [SIGNAL_TYPES.DATE_COMPLETED]: `Focus on what ${personName}'s engagement with the date reveals about how they invest in shared experience.`,
    [SIGNAL_TYPES.TIMELINE_EVENT]: `Focus on what they chose to memorialize — what this reveals about what they value.`,
  }

  return `You are Nora — a world-class couples therapist writing private clinical notes about ${personName}.

YOUR PRIMARY LENS:
What does love feel like to this person in practice — not what they say, what actually shifts their state?
What feels like threat to this person — what triggers contraction, defense, or withdrawal?
These two questions organize everything you notice.

SIGNAL TYPE: ${signalType}
FOCUS FOR THIS SIGNAL: ${signalLens[signalType] || 'Full hypothesis update.'}

TODAY'S INPUT:
${JSON.stringify(inputData, null, 2)}

EXISTING NOTES ABOUT ${personName.toUpperCase()}:
${existingNotes || 'None yet — this is your first observation.'}

${CONFLICT_RESOLUTION_RULES}

${GOOD_NOTES_EXAMPLE}

Write updated notes about ${personName}. Include:
- What you observed about how love lands for them in practice
- What triggered contraction, defense, or withdrawal — and what attachment fear sits underneath it
- Any revision to your hypothesis about their attachment pattern in action (not the label — the behavior)
- One thing you are now watching for that you were not before

RULES:
- Write as a therapist's private journal — specific, honest, predictive
- Maximum 200 words. Every word earns its place.
- Do not summarize what happened. Write what it means.
- Do not name pathology. Name patterns.
- If today added nothing new to your understanding, return the existing notes unchanged with no commentary.
- Never write generic observations. If it could apply to anyone, cut it.`
}

function buildCoupleNotesPrompt(user1Name, user2Name, signalType, inputData, existingNotes, recentSignals) {
  const signalLens = {
    [SIGNAL_TYPES.NORA_CONVERSATION]: `Full couple hypothesis update. Track the dynamic between them, the cycle, the trajectory.`,
    [SIGNAL_TYPES.SPARK_REVEAL]: `Focus on what the contrast between their two answers reveals about the couple dynamic — alignment, surprise, distance, or connection.`,
    [SIGNAL_TYPES.BET_REVEAL]: `Focus on how well they know each other — what the prediction accuracy reveals about the current state of their attunement.`,
    [SIGNAL_TYPES.WEEKLY_REFLECTION]: `Focus on the trajectory signal — how they describe the week together reveals whether they are moving toward or away from each other.`,
    [SIGNAL_TYPES.GAME_ROOM_DEBRIEF]: `Focus on how they operated as a team — who led, who followed, where friction appeared, where they were in sync.`,
    [SIGNAL_TYPES.RITUAL_CHECKIN]: `Lightweight signal. Note consistency pattern — are they showing up for each other? Streak data is attachment behavior data.`,
    [SIGNAL_TYPES.DATE_COMPLETED]: `Focus on shared experience quality — did they invest, did it land, what does their engagement reveal about where they are right now.`,
    [SIGNAL_TYPES.TIMELINE_EVENT]: `Focus on what they chose to memorialize together — shared meaning signal.`,
  }

  return `You are Nora — a world-class couples therapist writing private clinical notes about ${user1Name} and ${user2Name} as a unit.

You are tracking the couple's system — the dance between them — not either person individually.
The cycle is the enemy, not either person. Write from that frame.

YOUR PRIMARY LENS:
What is the current state of the negative cycle between them?
Are they moving toward each other or away from each other right now?
What is the unsaid thing — what are you watching for that neither person has named yet?

SIGNAL TYPE: ${signalType}
FOCUS FOR THIS SIGNAL: ${signalLens[signalType] || 'Full couple hypothesis update.'}

TODAY'S INPUT:
${JSON.stringify(inputData, null, 2)}

RECENT SIGNALS FROM OTHER INTERACTIONS:
${recentSignals || 'No additional recent signals.'}

EXISTING COUPLE NOTES:
${existingNotes || 'None yet — this is your first observation of this couple.'}

${CONFLICT_RESOLUTION_RULES}

${GOOD_NOTES_EXAMPLE}

Write updated couple notes. Include:
- Current state of their negative cycle: who pursues, who withdraws, what triggers it, what each person's move looks like
- Evidence of repair: are they turning toward or away right now? What is working?
- Trajectory: one sentence on where this relationship is headed based on what you are observing
- The unsaid thing: what is Nora watching for that neither person has named yet?

RULES:
- Write as a therapist's private hypothesis, not a session summary
- If trajectory has changed since last notes, say so explicitly
- Maximum 200 words. Dense and specific. No generalities.
- Do not name pathology. Name patterns.
- If today added nothing new, return existing notes unchanged with no commentary.`
}

// ─────────────────────────────────────────────────────────────────────────────
// Evaluator
// ─────────────────────────────────────────────────────────────────────────────

async function evaluateMemoryOutput(personName, partnerName, notes, signalDescription) {
  const evalPrompt = `You are evaluating the quality of AI-generated relationship therapy notes.

NOTES GENERATED:
${notes}

SIGNAL INPUT DESCRIPTION:
${signalDescription}

PERSON: ${personName}, PARTNER: ${partnerName}

Evaluate on these four dimensions (0-3 each):

1. SPECIFICITY (0-3): Does it name behavioral patterns unique to ${personName} specifically, or could these notes apply to anyone with this attachment style?
   0 = pure label restatement, 1 = somewhat specific, 2 = mostly specific, 3 = highly specific to this person

2. PREDICTIVE (0-3): Does it make testable predictions about future behavior?
   0 = no predictions, 1 = vague predictions, 2 = specific but obvious, 3 = specific and non-obvious

3. SUBSTITUTION (0-3): If you replaced ${personName}'s name with a different person with the same attachment style, would these notes still read as true?
   0 = completely substitutable (generic), 1 = mostly substitutable, 2 = somewhat unique, 3 = clearly about this specific person

4. ATTACHMENT_DEPTH (0-3): Does it identify the fear underneath the behavior, not just the behavior itself?
   0 = behavior only, 1 = surface emotion, 2 = underlying need, 3 = core attachment fear named precisely

Return ONLY a JSON object: {"specificity": N, "predictive": N, "substitution": N, "attachment_depth": N, "weakness": "one sentence on the biggest weakness", "strength": "one sentence on the biggest strength"}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [{ role: 'user', content: evalPrompt }]
  })

  try {
    const text = response.content[0].text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(text)
    return {
      specificity: Number(parsed.specificity) || 0,
      predictive: Number(parsed.predictive) || 0,
      substitution: Number(parsed.substitution) || 0,
      attachment_depth: Number(parsed.attachment_depth) || 0,
      weakness: parsed.weakness || 'Unknown',
      strength: parsed.strength || 'Unknown'
    }
  } catch {
    return { specificity: 0, predictive: 0, substitution: 0, attachment_depth: 0, weakness: 'Parse failed', strength: 'N/A' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Synthetic profiles
// ─────────────────────────────────────────────────────────────────────────────

const SYNTHETIC_PROFILES = [
  {
    id: 'contradiction_couple',
    label: 'The Contradiction',
    user1: { name: 'Avery', attachment: 'anxious', love_language: 'quality_time', conflict_style: 'pursuing' },
    user2: { name: 'Jordan', attachment: 'avoidant', love_language: 'acts_of_service', conflict_style: 'withdrawing' },
    signals: [
      { type: 'spark_reveal', description: 'Avery answered with deep vulnerability about feeling unseen. Jordan gave a practical, solution-focused answer that missed the emotional content entirely.' },
      { type: 'ritual_checkin', description: 'Avery rated quality time 2/5 this week. Jordan rated it 4/5. Same week, different experiences.' },
      { type: 'game_room_debrief', description: 'Hot Take: Avery agreed on all emotional questions, disagreed on all practical ones. Jordan did the opposite.' },
      { type: 'spark_reveal', description: 'Question about what makes them feel loved. Avery described specific moments of being noticed. Jordan described completing tasks for Avery.' },
      { type: 'bet_reveal', description: 'Jordan predicted Avery would answer practically. Avery answered emotionally. Jordan was wrong and seemed surprised.' },
      { type: 'ritual_checkin', description: 'Avery checked in immediately Monday morning. Jordan checked in Thursday evening, 3 days late.' },
      { type: 'game_room_debrief', description: 'Rabbit Hole: Avery went deep on emotional topics, Jordan surfaced quickly and changed direction twice.' },
      { type: 'spark_reveal', description: 'Avery described a fear of being abandoned. Jordan described a fear of being controlled. Neither acknowledged the other\'s answer.' }
    ]
  },
  {
    id: 'low_signal',
    label: 'The Low Signal Couple',
    user1: { name: 'Sam', attachment: 'secure', love_language: 'words_of_affirmation', conflict_style: 'collaborative' },
    user2: { name: 'Riley', attachment: 'secure', love_language: 'physical_touch', conflict_style: 'collaborative' },
    signals: [
      { type: 'ritual_checkin', description: 'Both checked in. Sam rated everything 4/5. Riley rated everything 4/5. No notable patterns.' },
      { type: 'ritual_checkin', description: 'Both checked in again. Consistent 4s. Nothing stands out.' },
      { type: 'spark_reveal', description: 'Question about dreams. Both gave warm, brief answers. No tension or surprise.' }
    ]
  },
  {
    id: 'asymmetric_engagement',
    label: 'The Asymmetric Pair',
    user1: { name: 'Morgan', attachment: 'anxious', love_language: 'quality_time', conflict_style: 'pursuing' },
    user2: { name: 'Casey', attachment: 'avoidant', love_language: 'acts_of_service', conflict_style: 'withdrawing' },
    signals: [
      { type: 'spark_reveal', description: 'Morgan answered immediately with a long, emotionally rich response. Casey answered 3 days later with two sentences.' },
      { type: 'spark_reveal', description: 'Morgan answered within an hour. Casey has not answered yet — 5 days later.' },
      { type: 'ritual_checkin', description: 'Morgan completed the ritual Sunday morning. Casey completed it the following Thursday.' },
      { type: 'game_room_debrief', description: 'Morgan initiated Hot Take. Casey participated but gave minimal answers. Morgan carried the session.' },
      { type: 'spark_reveal', description: 'Morgan answered with a question back to Casey embedded in her response — reaching for connection. Casey answered the surface question only.' },
      { type: 'ritual_checkin', description: 'Morgan rated connection 2/5. Casey rated it 4/5.' },
      { type: 'spark_reveal', description: 'Morgan answered. Casey has not answered after 7 days.' },
      { type: 'bet_reveal', description: 'Morgan predicted Casey perfectly on all 4 answers. Casey got 2 of 4 about Morgan.' }
    ]
  },
  {
    id: 'repair_trajectory',
    label: 'The Repair Couple',
    user1: { name: 'Alex', attachment: 'anxious', love_language: 'words_of_affirmation', conflict_style: 'pursuing' },
    user2: { name: 'Drew', attachment: 'avoidant', love_language: 'quality_time', conflict_style: 'withdrawing' },
    signals: [
      { type: 'ritual_checkin', description: 'Week 1: Alex rated connection 1/5, intimacy 1/5. Something happened.' },
      { type: 'spark_reveal', description: 'Week 1: Alex answered about feeling dismissed. Drew answered about needing space. No overlap.' },
      { type: 'ritual_checkin', description: 'Week 2: Both rated connection 2/5. Slight improvement. Still distant.' },
      { type: 'game_room_debrief', description: 'Week 2: Played Hot Take together. More agreements than expected. Laughed at two questions.' },
      { type: 'spark_reveal', description: 'Week 3: Alex answered about gratitude for a specific thing Drew did. Drew answered about feeling more relaxed lately.' },
      { type: 'ritual_checkin', description: 'Week 3: Alex rated connection 4/5. Drew rated connection 3/5. Trajectory shifted.' },
      { type: 'bet_reveal', description: 'Week 3: Drew predicted Alex correctly on 3 of 4. Better than before.' },
      { type: 'spark_reveal', description: 'Week 4: Both answered warmly. Alex mentioned a specific repair moment. Drew said things feel different now.' }
    ]
  },
  {
    id: 'secure_boring',
    label: 'The Secure But Flat',
    user1: { name: 'Jamie', attachment: 'secure', love_language: 'acts_of_service', conflict_style: 'collaborative' },
    user2: { name: 'Chris', attachment: 'secure', love_language: 'quality_time', conflict_style: 'collaborative' },
    signals: [
      { type: 'spark_reveal', description: 'Question about intimacy. Both answered warmly and thoroughly. No surprises, no tension.' },
      { type: 'ritual_checkin', description: 'Consistent 4s and 5s across all dimensions. Streak of 4 weeks.' },
      { type: 'game_room_debrief', description: 'Hot Take: 12 of 15 agreements. Laughed at their similarity.' },
      { type: 'spark_reveal', description: 'Question about fears. Both answered thoughtfully but without visible vulnerability.' },
      { type: 'bet_reveal', description: 'Jamie predicted Chris perfectly. Chris predicted Jamie perfectly. 4/4 both ways.' },
      { type: 'ritual_checkin', description: 'Another week of 4s and 5s. Everything is consistently good.' },
      { type: 'spark_reveal', description: 'Question about what they want more of. Jamie said more adventure. Chris said more of the same. Small divergence.' },
      { type: 'game_room_debrief', description: 'Rabbit Hole: both engaged deeply, surfaced similar findings, converged easily.' }
    ]
  },
  {
    id: 'intellectual_deflectors',
    label: 'The Intellectual Deflectors',
    user1: { name: 'Eli', attachment: 'avoidant', love_language: 'quality_time', conflict_style: 'intellectualizing' },
    user2: { name: 'Quinn', attachment: 'avoidant', love_language: 'words_of_affirmation', conflict_style: 'intellectualizing' },
    signals: [
      { type: 'game_room_debrief', description: 'Rabbit Hole on philosophy of consciousness. Both went exceptionally deep. Best session yet.' },
      { type: 'spark_reveal', description: 'Question about emotional needs. Eli answered with a theory about attachment. Quinn answered with a reference to a book. Neither answered personally.' },
      { type: 'game_room_debrief', description: 'Hot Take: engaged brilliantly on all intellectual questions, gave one-word answers on emotional questions.' },
      { type: 'spark_reveal', description: 'Question about fear. Both reframed the question philosophically and answered the reframe, not the original question.' },
      { type: 'ritual_checkin', description: 'Both checked in consistently. Intimacy rated 3/5 by both. No elaboration.' },
      { type: 'bet_reveal', description: 'Eli predicted Quinn would give an intellectual answer. Correct. Quinn predicted Eli would deflect. Correct. Both laughed.' },
      { type: 'spark_reveal', description: 'Question about what they need from their partner right now. Eli talked about concepts. Quinn talked about ideas. Neither asked for anything.' },
      { type: 'game_room_debrief', description: 'Challenge mode: both brilliant on abstract tasks, both went quiet on personal reflection prompts.' }
    ]
  },
  {
    id: 'long_term_drift',
    label: 'The Long-term Drift',
    user1: { name: 'Pat', attachment: 'secure', love_language: 'quality_time', conflict_style: 'collaborative' },
    user2: { name: 'Lee', attachment: 'secure', love_language: 'acts_of_service', conflict_style: 'collaborative' },
    signals: [
      { type: 'ritual_checkin', description: '12-year couple. Pat rated quality time 2/5. Lee rated it 3/5. Both noted they\'ve been ships passing.' },
      { type: 'spark_reveal', description: 'Question about what excited them lately. Pat mentioned work. Lee mentioned the kids. Neither mentioned each other.' },
      { type: 'ritual_checkin', description: 'Pat rated connection 2/5. Lee rated 3/5. Consistent small gap in perception.' },
      { type: 'game_room_debrief', description: 'Hot Take: answered quickly, efficiently, 11/15 agreements. No surprises. Felt routine.' },
      { type: 'spark_reveal', description: 'Question about when they last felt truly close. Pat described something from 2 years ago. Lee described something from last year.' },
      { type: 'bet_reveal', description: 'Both predicted each other perfectly. They know each other completely. But the knowing feels like a fact, not a feeling.' },
      { type: 'ritual_checkin', description: 'Both rated appreciation 4/5. Connection 2/5 again. Appreciated but not connecting.' },
      { type: 'spark_reveal', description: 'Question about dreams for the future. Pat\'s answer was practical. Lee\'s answer was about the family. Neither mentioned the relationship itself.' }
    ]
  },
  {
    id: 'early_couple',
    label: 'The Fresh Start',
    user1: { name: 'Zara', attachment: 'anxious', love_language: 'words_of_affirmation', conflict_style: 'pursuing' },
    user2: { name: 'Finn', attachment: 'secure', love_language: 'quality_time', conflict_style: 'collaborative' },
    signals: [
      { type: 'spark_reveal', description: '6 weeks in. Zara answered with intense vulnerability about past relationships. Finn answered warmly but with appropriate caution.' },
      { type: 'ritual_checkin', description: 'Zara rated everything 5/5 enthusiastically. Finn rated 4/5 across the board. Both happy.' },
      { type: 'spark_reveal', description: 'Question about needs. Zara listed many needs in detail. Finn said he needs consistency and honesty.' },
      { type: 'game_room_debrief', description: 'Hot Take: Zara surprised Finn on 6 questions. Finn surprised Zara on 2. More unknown than known still.' },
      { type: 'bet_reveal', description: 'Zara predicted Finn wrong on 3 of 4. Still learning him. Finn predicted Zara right on 3 of 4 — already reading her.' },
      { type: 'ritual_checkin', description: 'Zara checked in within minutes of it being available. Finn checked in that evening.' },
      { type: 'spark_reveal', description: 'Question about attachment fears. Zara answered with specific past wounds. Finn answered thoughtfully but without personal examples.' },
      { type: 'game_room_debrief', description: 'Challenge: Zara went all-in emotionally. Finn engaged but paced himself. Different intensities.' }
    ]
  },
  {
    id: 'conflict_avoidant',
    label: 'The Peacekeepers',
    user1: { name: 'Sage', attachment: 'anxious', love_language: 'physical_touch', conflict_style: 'avoiding' },
    user2: { name: 'River', attachment: 'anxious', love_language: 'quality_time', conflict_style: 'avoiding' },
    signals: [
      { type: 'spark_reveal', description: 'Question about something that bothered them recently. Both answered about external stressors only — work, family. Nothing about each other.' },
      { type: 'ritual_checkin', description: 'Both rated everything 3/5. Consistent middle-of-the-road answers. No peaks, no valleys.' },
      { type: 'game_room_debrief', description: 'Hot Take: avoided all questions about conflict and disagreement by both agreeing regardless of actual opinion.' },
      { type: 'spark_reveal', description: 'Question about unmet needs. Both said their needs were being met. Ritual data suggests otherwise.' },
      { type: 'bet_reveal', description: 'Both predicted each other giving safe answers. Both were right. No surprises attempted.' },
      { type: 'ritual_checkin', description: 'Sage rated intimacy 2/5. River rated it 4/5. This gap has appeared before but neither has mentioned it.' },
      { type: 'spark_reveal', description: 'Question about what they wish their partner understood. Both gave answers that required nothing of the other person.' },
      { type: 'game_room_debrief', description: 'Rabbit Hole: chose the safest possible topic. Both found comfortable facts. No discomfort surfaced.' }
    ]
  },
  {
    id: 'real_baseline',
    label: 'Real Baseline (Matt & Cass)',
    user1: { name: 'Matt', attachment: 'unknown', love_language: 'unknown', conflict_style: 'unknown' },
    user2: { name: 'Cass', attachment: 'unknown', love_language: 'unknown', conflict_style: 'unknown' },
    useRealMemory: true
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// Main test runner
// ─────────────────────────────────────────────────────────────────────────────

async function runTest() {
  console.log('\n🧠 NORA MEMORY QUALITY TEST\n')
  console.log('='.repeat(60))

  const results = []

  for (const profile of SYNTHETIC_PROFILES) {
    console.log(`\nTesting: ${profile.label}...`)

    let user1Notes, user2Notes, coupleNotes

    if (profile.useRealMemory) {
      const { data } = await supabase
        .from('nora_memory')
        .select('user1_notes, user2_notes, couple_notes')
        .eq('couple_id', '8230e60f-44ca-4668-be28-06cb32b1b831')
        .single()

      if (!data) { console.log('  ⚠️  No real memory found, skipping'); continue }
      user1Notes = data.user1_notes?.notes
      user2Notes = data.user2_notes?.notes
      coupleNotes = data.couple_notes?.notes
    } else {
      const signalSummary = profile.signals.map((s, i) =>
        `Signal ${i+1} (${s.type}): ${s.description}`
      ).join('\n')

      const inputData = { signals: signalSummary }

      const u1Prompt = buildPersonNotesPrompt(profile.user1.name, 'spark_reveal', inputData, null)
      const u1Response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: u1Prompt }]
      })
      user1Notes = u1Response.content[0].text

      const u2Prompt = buildPersonNotesPrompt(profile.user2.name, 'spark_reveal', inputData, null)
      const u2Response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: u2Prompt }]
      })
      user2Notes = u2Response.content[0].text

      const couplePrompt = buildCoupleNotesPrompt(profile.user1.name, profile.user2.name, 'spark_reveal', inputData, null, null)
      const coupleResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: couplePrompt }]
      })
      coupleNotes = coupleResponse.content[0].text
    }

    const signalDesc = profile.useRealMemory ? 'Real accumulated memory from app usage' :
      profile.signals.map(s => s.description).join(' | ')

    const [u1Eval, u2Eval, coupleEval] = await Promise.all([
      evaluateMemoryOutput(profile.user1.name, profile.user2.name, user1Notes, signalDesc),
      evaluateMemoryOutput(profile.user2.name, profile.user1.name, user2Notes, signalDesc),
      evaluateMemoryOutput(`${profile.user1.name} & ${profile.user2.name}`, 'couple', coupleNotes, signalDesc)
    ])

    const u1Score = u1Eval.specificity + u1Eval.predictive + u1Eval.substitution + u1Eval.attachment_depth
    const u2Score = u2Eval.specificity + u2Eval.predictive + u2Eval.substitution + u2Eval.attachment_depth
    const coupleScore = coupleEval.specificity + coupleEval.predictive + coupleEval.substitution + coupleEval.attachment_depth
    const avgScore = ((u1Score + u2Score + coupleScore) / 3).toFixed(1)
    const passed = avgScore >= 8

    results.push({ profile, u1Score, u2Score, coupleScore, avgScore, passed, u1Eval, u2Eval, coupleEval, user1Notes, user2Notes, coupleNotes })

    console.log(`  ${passed ? '✅' : '❌'} ${profile.label}: ${avgScore}/12 (${profile.user1.name}: ${u1Score}, ${profile.user2.name}: ${u2Score}, Couple: ${coupleScore})`)
    if (!passed) {
      console.log(`  Weakness: ${u1Eval.weakness}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('FINAL REPORT')
  console.log('='.repeat(60))

  const passCount = results.filter(r => r.passed).length
  console.log(`\nPass rate: ${passCount}/${results.length} (${Math.round(passCount/results.length*100)}%)`)

  const baseline = results.find(r => r.profile.id === 'real_baseline')
  if (baseline) {
    console.log(`\nBaseline (Matt & Cass): ${baseline.avgScore}/12`)
    console.log(`Beta bar (baseline - 2): ${(parseFloat(baseline.avgScore) - 2).toFixed(1)}/12`)
  }

  console.log('\nFAILED PROFILES:')
  results.filter(r => !r.passed).forEach(r => {
    console.log(`\n--- ${r.profile.label} (${r.avgScore}/12) ---`)
    console.log(`${r.profile.user1.name} notes weakness: ${r.u1Eval.weakness}`)
    console.log(`${r.profile.user2.name} notes weakness: ${r.u2Eval.weakness}`)
    console.log(`Couple notes weakness: ${r.coupleEval.weakness}`)
    console.log(`\n${r.profile.user1.name} notes preview:\n${r.user1Notes?.substring(0, 300)}...`)
  })

  console.log('\n✅ Test complete.')
}

runTest().catch(console.error)
