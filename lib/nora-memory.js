import { createClient } from '@supabase/supabase-js'
import { noraSignal, noraGenerate, noraReact } from './nora'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL TYPES — every meaningful ABF interaction maps to one of these
// New features: add a row here, call updateNoraMemory() from the API route
// ─────────────────────────────────────────────────────────────────────────────
export const SIGNAL_TYPES = {
  NORA_CONVERSATION: 'nora_conversation',
  SPARK_REVEAL: 'spark_reveal',
  BET_REVEAL: 'bet_reveal',
  WEEKLY_REFLECTION: 'weekly_reflection',
  GAME_ROOM_DEBRIEF: 'game_room_debrief',
  RITUAL_CHECKIN: 'ritual_checkin',
  FLIRT_SENT: 'flirt_sent',
  DATE_COMPLETED: 'date_completed',
  TIMELINE_EVENT: 'timeline_event',
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL CHECK — fast Haiku call, fires mid-session
// Returns true if something meaningful just happened worth updating memory
// ─────────────────────────────────────────────────────────────────────────────
export async function shouldUpdateMemory(lastTwoMessages) {
  try {
    const response = await noraSignal(lastTwoMessages.map(m => m.content).join('\n'), { route: 'nora-memory/signal-check', maxTokens: 10 })
    return response.toUpperCase() === 'YES'
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFLICT RESOLUTION RULES
// Applied when new observation contradicts existing notes
// ─────────────────────────────────────────────────────────────────────────────
const CONFLICT_RESOLUTION_RULES = `
CONFLICT RESOLUTION — when new observation contradicts existing notes:
1. Pattern beats incident — one moment does not overturn a pattern. Three consistent observations do.
2. Behavior beats self-report — what they do matters more than what they say about themselves.
3. Recent beats old — if the contradiction represents genuine change, the new observation wins.
   Note the shift explicitly: "Previously X, now showing Y — something has moved here."
4. Never stack contradictions — if you cannot resolve with confidence, write the uncertainty:
   "This is unclear — watching to see which pattern holds."
`

// ─────────────────────────────────────────────────────────────────────────────
// WHAT GOOD NOTES LOOK LIKE — few-shot example injected into prompts
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// PER-PERSON NOTES PROMPT
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// COUPLE NOTES PROMPT
// ─────────────────────────────────────────────────────────────────────────────
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
// MEMORY SUMMARY PROMPT — the 90-second pre-session brief
// ─────────────────────────────────────────────────────────────────────────────
function buildMemorySummaryPrompt(user1Name, user2Name, user1Notes, user2Notes, coupleNotes) {
  return `You are Nora. You are about to begin a session with ${user1Name} and ${user2Name}.

Write the pre-session brief you would read in 90 seconds to remind yourself of everything that matters about this couple right now.

${user1Name.toUpperCase()} NOTES:
${user1Notes || 'No notes yet.'}

${user2Name.toUpperCase()} NOTES:
${user2Notes || 'No notes yet.'}

COUPLE NOTES:
${coupleNotes || 'No notes yet.'}

Write the brief. Answer:
- Who is each person in this relationship right now?
- What is the current state of the relationship?
- What is Nora watching for this session?

RULES:
- Flowing prose. Not bullet points.
- Maximum 150 words.
- A colleague could walk in cold, read this, and coach this couple.
- Name what matters. Skip everything else.
- Write as if you care about these people. Because you do.`
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURED FACTS EXTRACTION — portability layer
// Model-agnostic JSON. Ships anywhere. Queryable by future features.
// ─────────────────────────────────────────────────────────────────────────────
async function extractStructuredFacts(user1Name, user2Name, user1Notes, user2Notes, coupleNotes) {
  try {
    const content = `Extract structured facts from these therapy notes.

${user1Name} notes: ${user1Notes}
${user2Name} notes: ${user2Notes}
Couple notes: ${coupleNotes}

Return this exact JSON structure:
{
  "negative_cycle_type": "pursue-withdraw OR attack-attack OR withdraw-withdraw OR unknown",
  "pursuer": "${user1Name} OR ${user2Name} OR unknown",
  "withdrawer": "${user1Name} OR ${user2Name} OR unknown",
  "trajectory": "toward OR away OR stable OR unknown",
  "love_signals": {
    "${user1Name}": ["specific observed signal 1", "specific observed signal 2"],
    "${user2Name}": ["specific observed signal 1", "specific observed signal 2"]
  },
  "threat_signals": {
    "${user1Name}": ["specific observed trigger 1"],
    "${user2Name}": ["specific observed trigger 1"]
  },
  "unsaid_thing": "one sentence on what Nora is watching for"
}`
    const response = await noraGenerate(content, {
      route: 'nora-memory/extract-facts',
      system: 'You extract structured facts from therapy notes. Return only valid JSON, no other text.',
      maxTokens: 400,
    })
    const raw = response.replace(/```json|```/g, '').trim()
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET NORA MEMORY — read all layers for injection into conversations
// ─────────────────────────────────────────────────────────────────────────────
export async function getNoraMemory(coupleId) {
  try {
    const { data } = await supabase
      .from('nora_memory')
      .select('memory_summary, user1_notes, user2_notes, couple_notes, conversation_count')
      .eq('couple_id', coupleId)
      .single()
    return data || null
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE NORA MEMORY — main entry point
// Called from any API route after a meaningful interaction
// signalType: one of SIGNAL_TYPES
// inputData: the raw signal data (conversation, spark answers, etc.)
// coupleId: the couple's ID
// userId: the ID of the user whose perspective this signal comes from (if applicable)
// ─────────────────────────────────────────────────────────────────────────────
export async function updateNoraMemory({ coupleId, userId, signalType, inputData }) {
  try {
    // Get couple members
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .single()
    if (!couple) return

    // Get names
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, display_name')
      .in('user_id', [couple.user1_id, couple.user2_id])

    const user1Profile = profiles?.find(p => p.user_id === couple.user1_id)
    const user2Profile = profiles?.find(p => p.user_id === couple.user2_id)
    const user1Name = user1Profile?.display_name || 'Partner 1'
    const user2Name = user2Profile?.display_name || 'Partner 2'

    // Get existing memory
    const existing = await getNoraMemory(coupleId)
    const existingUser1Notes = existing?.user1_notes?.notes || null
    const existingUser2Notes = existing?.user2_notes?.notes || null
    const existingCoupleNotes = existing?.couple_notes?.notes || null

    // Get recent signals from other interactions for couple context
    const { data: recentSparks } = await supabase
      .from('sparks')
      .select('question, spark_date, spark_responses(user_id, response_text)')
      .eq('couple_id', coupleId)
      .order('spark_date', { ascending: false })
      .limit(3)

    const recentSignalsSummary = recentSparks?.length
      ? recentSparks.map(s => {
          const responses = s.spark_responses?.map(r => {
            const name = r.user_id === couple.user1_id ? user1Name : user2Name
            return `${name}: "${r.response_text}"`
          }).join(' | ')
          return `Spark "${s.question}": ${responses}`
        }).join('\n')
      : null

    // Determine which layers to update based on signal type
    const updateUser1 = [
      SIGNAL_TYPES.NORA_CONVERSATION,
      SIGNAL_TYPES.SPARK_REVEAL,
      SIGNAL_TYPES.BET_REVEAL,
      SIGNAL_TYPES.WEEKLY_REFLECTION,
      SIGNAL_TYPES.GAME_ROOM_DEBRIEF,
      SIGNAL_TYPES.FLIRT_SENT,
      SIGNAL_TYPES.DATE_COMPLETED,
      SIGNAL_TYPES.TIMELINE_EVENT,
    ].includes(signalType)

    const updateUser2 = updateUser1

    const updateCouple = true // all signals update couple notes

    // Run updates in parallel
    const [newUser1Notes, newUser2Notes, newCoupleNotes] = await Promise.all([
      updateUser1 ? noraReact(buildPersonNotesPrompt(user1Name, signalType, inputData, existingUser1Notes), { route: 'nora-memory/update-notes', context: 'conversation', maxTokens: 400 }).then(r => r) : Promise.resolve(existingUser1Notes),

      updateUser2 ? noraReact(buildPersonNotesPrompt(user2Name, signalType, inputData, existingUser2Notes), { route: 'nora-memory/update-notes', context: 'conversation', maxTokens: 400 }).then(r => r) : Promise.resolve(existingUser2Notes),

      updateCouple ? noraReact(buildCoupleNotesPrompt(user1Name, user2Name, signalType, inputData, existingCoupleNotes, recentSignalsSummary), { route: 'nora-memory/update-notes', context: 'conversation', maxTokens: 400 }).then(r => r) : Promise.resolve(existingCoupleNotes),
    ])

    // Generate new summary and structured facts in parallel
    const [newSummary, structuredFacts] = await Promise.all([
      noraReact(buildMemorySummaryPrompt(user1Name, user2Name, newUser1Notes, newUser2Notes, newCoupleNotes), {
        route: 'nora-memory/summary',
        context: 'conversation',
        maxTokens: 300,
      }).then(r => r),

      extractStructuredFacts(user1Name, user2Name, newUser1Notes, newUser2Notes, newCoupleNotes),
    ])

    // Upsert all layers
    await supabase
      .from('nora_memory')
      .upsert({
        couple_id: coupleId,
        memory_summary: newSummary,
        user1_notes: { notes: newUser1Notes, updated_at: new Date().toISOString() },
        user2_notes: { notes: newUser2Notes, updated_at: new Date().toISOString() },
        couple_notes: {
          notes: newCoupleNotes,
          structured_facts: structuredFacts,
          updated_at: new Date().toISOString()
        },
        conversation_count: (existing?.conversation_count || 0) + 1,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'couple_id' })

  } catch (err) {
    // Memory updates are non-blocking — never let this crash the main flow
    console.error('updateNoraMemory error:', err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAYBE UPDATE — legacy wrapper, now routes to updateNoraMemory
// Kept for backwards compatibility with existing ai-coach route calls
// ─────────────────────────────────────────────────────────────────────────────
export async function maybeUpdateNoraMemory(coupleId, messages) {
  if (!messages || messages.length < 6) return
  await updateNoraMemory({
    coupleId,
    signalType: SIGNAL_TYPES.NORA_CONVERSATION,
    inputData: { messages },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// GET NORA BRIEFING — formats all memory layers for injection into system prompt
// ─────────────────────────────────────────────────────────────────────────────
export function getNoraBriefing(memory, user1Name, user2Name) {
  if (!memory) return ''

  const parts = []

  if (memory.memory_summary) {
    parts.push(`NORA'S PRE-SESSION BRIEF:\n${memory.memory_summary}`)
  }

  if (memory.user1_notes?.notes) {
    parts.push(`NORA'S PRIVATE NOTES — ${(user1Name || 'Partner 1').toUpperCase()}:\n${memory.user1_notes.notes}`)
  }

  if (memory.user2_notes?.notes) {
    parts.push(`NORA'S PRIVATE NOTES — ${(user2Name || 'Partner 2').toUpperCase()}:\n${memory.user2_notes.notes}`)
  }

  if (memory.couple_notes?.notes) {
    parts.push(`NORA'S PRIVATE NOTES — THE COUPLE:\n${memory.couple_notes.notes}`)
  }

  if (memory.couple_notes?.structured_facts) {
    const f = memory.couple_notes.structured_facts
    if (f.trajectory && f.trajectory !== 'unknown') {
      parts.push(`CURRENT TRAJECTORY: ${f.trajectory}`)
    }
    if (f.unsaid_thing) {
      parts.push(`WHAT NORA IS WATCHING FOR: ${f.unsaid_thing}`)
    }
  }

  return parts.join('\n\n')
}
