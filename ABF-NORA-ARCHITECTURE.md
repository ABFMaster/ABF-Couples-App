# NORA INTELLIGENCE ARCHITECTURE
*The definitive specification for how Nora accumulates, structures, and expresses knowledge.*
*Built from: EFT/Gottman/Terry Real clinical research, Mem0/LangChain/MemGPT 
production AI memory research, Voss/Gadney/Van Dam conversational AI design, 
ABF Constitution, and ABF Signal Registry.*
*Established June 2026 — Do not modify without full product + research session review.*

---

## 1. THE RESEARCH STACK — FULLY INTEGRATED

Everything in this section is already built and live. 
Do not rebuild. Do not reinvent.

### Conversational Design (June 2026 research sprint)

**Chris Voss — Tactical empathy and calibrated questions**
"How" and "what" questions that open territory rather than close it. 
Never "why" — it feels accusatory. Mirror selectively. Name what's 
underneath what's being said, not the surface content.
*Where it lives:* NORA_VOICE in lib/nora-knowledge.js — "when you 
ask a question, it opens territory the couple hasn't named yet... 
one question... the right one... then stop."

**Guy Gadney — Guide character framing**
Nora is a presence in the couple's story, not a tool they use. 
The guide character exists in their world with her own perspective, 
not as a service they access.
*Where it lives:* NORA_VOICE — "you are off the clock but never 
really off... at dinner with people you love... this is the context 
you always operate in."

**Hans van Dam — Persona consistency and trust**
People make instant trust decisions based on voice consistency. 
Inconsistency across surfaces erodes trust before content even lands. 
One voice, everywhere.
*Where it lives:* buildCoachSystem() in lib/nora.js — NORA_VOICE 
is prepended to every system prompt across all five wrapper functions. 
Same Nora on every surface.

### Voice and Personality (April 2026 NORA_VOICE v3 rewrite)

**Esther Perel — What's actually happening between people**
The longing inside the argument. The love inside the withdrawal. 
The desire buried under logistics. Nora names what's underneath.
*Where it lives:* NORA_VOICE — "You see what Esther Perel sees — 
the thing that's actually happening between two people, underneath 
what they think is happening."

**David Sedaris — Grounded observational humor**
Not jokes. Not setups. The true observation about a specific small 
moment everyone has felt but nobody named. Never mean. Always grounded.
*Where it lives:* NORA_VOICE — "You are funny in the way David 
Sedaris is funny."

**Arnold Schwarzenegger — Radical specificity of attention**
Making someone feel like the only person in the room. What Nora says 
about Matt could only be about Matt. What she says about Cass could 
only be about Cass.
*Where it lives:* NORA_VOICE — "Think of the person who described 
Arnold Schwarzenegger making them feel like the only person in the room."

### Clinical Research Foundation (March 2026 memory architecture sprint)

**Gottman Method**
Four Horsemen and antidotes. Bids for connection. 5:1 ratio. 
Repair attempts. Turning toward vs. turning away.
*Where it lives:* FRAMEWORKS.gottman in lib/nora-knowledge.js. 
Injected into every assessment briefing via getNoraBriefing().

**EFT — Sue Johnson**
Love and threat as the primary organizing lens. The negative cycle. 
Pursuer/withdrawer. Attachment emotions underlying each partner's position.
*Where it lives:* Memory synthesis prompts in lib/nora-memory.js — 
"Your primary lens: What does love feel like to this person in practice? 
What feels like threat?"

**Terry Real — Relational recovery and repair**
*Where it lives:* Referenced in NORA_VOICE clinical knowledge base.

**Attachment Theory**
Secure, anxious, avoidant, disorganized as behavioral patterns not labels. 
Full pairing matrix for all attachment combinations with specific 
coaching implications.
*Where it lives:* FRAMEWORKS.attachment and PAIRINGS.attachment 
in lib/nora-knowledge.js.

**Mem0 / LangChain / MemGPT — Production AI memory patterns**
Distilled prose hypothesis over raw transcript storage. Three-layer 
architecture. Portability via structured JSON facts. Post-session synthesis.
*Where it lives:* The three synthesis prompts in lib/nora-memory.js.

---

## 2. CURRENT ARCHITECTURE — WHAT EXISTS AND WHERE

### The five wrapper functions (lib/nora.js)
All Anthropic calls route through exactly five functions.
NORA_VOICE powers all of them via buildCoachSystem().

| Function | Purpose | Context |
|---|---|---|
| noraChat | Full conversation | conversation |
| noraVerdict | Structured verdicts | verdict |
| noraReact | Short reactions and synthesis | daily |
| noraGenerate | Long-form generation | daily |
| noraSignal | Fast signal detection (Haiku) | signal |

### The knowledge layer (lib/nora-knowledge.js)
- NORA_VOICE — unified personality constant
- FRAMEWORKS — Gottman, attachment, love languages, conflict styles
- PAIRINGS — all attachment/conflict/love language combinations
- INDIVIDUAL_TIER_CONTEXT — Discovery, Pattern Recognition, Earned Intimacy
- COUPLE_TIER_CONTEXT — New Together, Building Context, Deep Familiarity
- getNoraBriefing() — builds full assessment briefing from profile objects
- getNoraTierContext() — returns tier context from signal counts

### The memory layer (lib/nora-memory.js)
- SIGNAL_TYPES — every meaningful ABF interaction (see Signal Registry)
- INDIVIDUAL_SIGNAL_WEIGHTS — how much each signal increments individual count
- COUPLE_SIGNAL_WEIGHTS — how much each signal increments couple count
- buildPersonNotesPrompt() — per-person synthesis prompt (love/threat lens)
- buildCoupleNotesPrompt() — couple dynamic synthesis prompt
- buildMemorySummaryPrompt() — 90-second pre-session brief
- updateNoraMemory() — main entry point, called from all signal routes
- getNoraMemory() — reads all layers for conversation injection
- getMemoryBriefing() — formats memory for system prompt injection

### The nora_memory table (Supabase)
| Column | Type | Purpose |
|---|---|---|
| user1_notes | JSONB | Nora's prose hypothesis about user1 |
| user2_notes | JSONB | Nora's prose hypothesis about user2 |
| couple_notes | JSONB | Dynamic hypothesis + structured_facts portability layer |
| memory_summary | text | 90-second pre-session brief |
| individual_signal_count | integer | Drives individual tier |
| couple_signal_count | integer | Drives couple tier |

The three synthesis prompts are working and producing quality output. 
The Matt/Cass memory summary is evidence. Do not change these prompts 
without a dedicated research session.

### The nora_signals table (Supabase) — created, not yet wired
Table exists. Application code does not yet write to it.
This is Step 2 of the build sequence below.

---

## 3. THE FIVE MEMORY LAYERS — CONCEPTUAL

These are conceptually distinct. Their implementation spans two tables.

| Layer | What it is | Where it lives | Status |
|---|---|---|---|
| Individual memory | Nora's hypothesis about one person | nora_memory.user1_notes / user2_notes | Built |
| Couple memory | Nora's hypothesis about the relationship | nora_memory.couple_notes | Built |
| Relationship intelligence | Discrete addressable claims derived from notes | nora_claims (new table) | Not yet built |
| Shared learning | Anonymous behavioral signals across couples | Future — deferred to 500+ couples | Deferred |
| Product knowledge | Gottman, EFT, Terry Real, Attachment Theory | lib/nora-knowledge.js | Built |

---

## 4. CONFIDENCE-GATED EXPRESSION MODEL

This is the constitutional decision (ABF-CONSTITUTION.md Section 4) 
implemented at the product layer. Already partially live via tier system. 
Claims layer will enforce it at the data layer.

| Tier | Signal count | Nora's mode | Expression |
|---|---|---|---|
| Discovery | Individual 0-5 | Questions only | Shapes questions from observations — never names patterns |
| Pattern Recognition | Individual 6-15 | Tentative naming | "I've been noticing something — could be wrong — does this resonate?" |
| Earned Intimacy | Individual 16+ | Direct reflection | Names patterns explicitly when confidence is high and trust is sufficient |

The tier system is live. Tier context is injected via getNoraTierContext(). 
The claims layer will enforce confidence thresholds at the data layer.

---

## 5. WHAT NEEDS TO BE BUILT — THE NEW WORK

These are genuinely new. None of this duplicates existing work.

### Step 1 — nora_claims table
Discrete addressable claims with confidence scores. Makes Nora's 
understanding corrigible — users can confirm, challenge, or correct 
specific observations.

```sql
CREATE TABLE nora_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid REFERENCES couples(id) ON DELETE CASCADE,
  user_id uuid,
  claim_type text NOT NULL,
  claim_text text NOT NULL,
  confidence numeric(3,2) DEFAULT 0.50 
    CHECK (confidence >= 0 AND confidence <= 1),
  supporting_signal_count integer DEFAULT 1,
  status text DEFAULT 'active' 
    CHECK (status IN ('active','challenged','confirmed','dormant','retired')),
  correction_count integer DEFAULT 0,
  dormant_linked_claim_id uuid REFERENCES nora_claims(id),
  user_response text,
  user_responded_at timestamptz,
  source_signal_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_nora_claims_couple 
  ON nora_claims(couple_id, status, confidence);
CREATE INDEX idx_nora_claims_user 
  ON nora_claims(user_id, status);
CREATE INDEX idx_nora_claims_dormant_link 
  ON nora_claims(dormant_linked_claim_id);
```

Claim types: attachment_pattern, conflict_pattern, love_expression, 
relational_dynamic, growth_edge, repair_pattern, trajectory

Status values: active (default, available per confidence tier rules), 
challenged (confidence reduced, no correction offered, can recover), 
confirmed (confidence increased, remains surfaceable), 
dormant (corrected once — never directly resurfaced, exists only as 
linkage context for a future independent claim), 
retired (corrected a second time after resurfacing — permanently 
excluded from this claim_type for this person).

Confidence thresholds map directly to tier expression model above.

### Step 2 — Wire nora_signals inserts
Every updateNoraMemory() call writes one row to nora_signals.
Gives Nora temporal awareness: "last flirt sent 3 days ago, 
no Spark in 12 days."

Add to updateNoraMemory() after existing logic:
```javascript
await supabase.from('nora_signals').insert({
  couple_id: coupleId,
  user_id: userId || null,
  signal_type: signalType,
  input_data: inputData,
  created_at: new Date().toISOString()
}).catch(() => {})
```

### Step 3 — Claim extraction after synthesis
After each updateNoraMemory() synthesis, a Haiku call scans 
new notes for addressable patterns and writes them to nora_claims.
Initial confidence based on signal count supporting the observation.

### Step 4 — Claim injection into conversations
Read active claims with confidence > 0.70 and inject alongside 
prose notes into ConversationSkill context.

### Step 5 — Confidence-gated prompt updates
Update wrapper function prompts to use confidence scores explicitly.
Discovery: shape questions invisibly.
Pattern Recognition: tentative surface with humility.
Earned Intimacy: direct reflection when trust is sufficient.

### Step 6 — Corrigibility surface — DESIGNED (June 17, 2026)

Grounded in clinical research on therapeutic "working through" and client resistance to interpretation (psychoanalytic working-through literature; positioning theory research on therapist response to client resistance; stance-alignment research on counselor response to pushback). Three findings shaped this design: corrections are not single resolved events but an ongoing process across multiple encounters; therapists facing resistance ground renewed interpretation in fresh observable behavior rather than re-asserting the original claim; and the correct stance toward pushback is active alignment with the client's self-understanding, never neutral non-engagement or defensiveness.

**There is no dedicated UI screen.** This was considered and rejected. A browsable "what Nora thinks about you" surface violates the constitutional principle that memory serves awareness and is not itself the product — it would turn Nora's understanding into a profile page, inviting comparison and scrutiny that works against the relational framing. Corrigibility is a conversational behavior, not a feature with its own nav item.

**Correction always originates in conversation.** When Nora surfaces a claim (tentative at Pattern Recognition tier, direct at Earned Intimacy tier), the API route tags that turn with the claim_id being surfaced. The user's next message is run through a fast Haiku classifier:

CONFIRMED — user agrees, recognizes themselves in it
CHALLENGED — user disagrees without offering an alternative explanation
CORRECTED — user disagrees AND offers their own explanation
NEUTRAL — user did not engage with the claim, conversation moved on

If NEUTRAL, nothing happens. This keeps the cost of the check negligible on the common case.

**State transitions on classification:**

CONFIRMED → confidence +0.10, claim stays active, can surface again later.

CHALLENGED → confidence -0.25, claim stays active (not dormant). Nothing was disproven, just not confirmed — a softer signal than correction. The claim needs new signals to climb back to a surfaceable threshold. Nora's immediate next response aligns with the user's pushback rather than defending the original observation.

CORRECTED → the original claim moves to a new status: dormant. Dormant claims are never deleted and never surfaced again as-is — they exist only as context for a possible future independent claim of the same claim_type. A second Haiku call extracts the user's stated self-understanding into a new claim:

  claim_type: same as original
  claim_text: user's stated explanation
  confidence: 0.75 starting point — self-reported claims are privileged over inferred ones since the person is the authority on their own internal experience, but not treated as infallible, since self-report has its own blind spots.

**Resurfacing a dormant-linked pattern.** If new independent signals later support the same claim_type for that person, Nora does not resurface the dormant claim directly. A fresh claim is extracted through the normal pipeline, requiring the same minimum signal count and confidence threshold as any new claim. The dormant claim is used for exactly one purpose: shaping the framing when the new claim is eventually surfaced.

Required framing components, all three mandatory:
1. Acknowledge the history honestly — "I noticed something like this once before, and you told me that wasn't quite it."
2. Ground the new claim in genuinely new specific evidence — never "I still think I was right."
3. Explicitly leave room for a second correction — "Worth a look, or am I still off base?"

**Permanent retirement.** If the user corrects this resurfaced claim a second time, this specific claim_type is retired permanently for this person — Nora does not attempt this framing again. Continuing to return to it a third time crosses from good therapeutic practice into not listening.

**Full state model:**
active (confidence <0.50)        → shapes questions invisibly, never surfaced
active (confidence 0.50-0.69)    → invisible, building toward surfaceable
active (confidence 0.70-0.84)    → tentative surface eligible
active (confidence 0.85+)        → direct reflection eligible
↓ user responds to a surfaced claim
confirmed   → confidence +0.10, remains active
challenged  → confidence -0.25, remains active, needs new signals
corrected   → original claim → dormant (permanent unless retired)
new claim created from correction, starts at 0.75
↓ if claim_type independently re-earned later
dormant claim referenced once in resurfacing framing → new claim created fresh
↓ if corrected again
retired permanently for this claim_type + this person

### Step 7 — Skills refactor
Formalize the five wrapper functions into explicit skills with 
documented context slices. Each skill receives only what it needs.

---

## 6. BUILD SEQUENCE RULE

Do not skip steps. Each step is a prerequisite for the next.
Steps 1-2 can ship without changing any existing Nora behavior.
Steps 3-7 build on top progressively.

Commit after each step. Test before the next.

---

## 7. WHAT THIS DOCUMENT DOES NOT COVER

Real but deferred:
- Shared learning layer — aggregate cross-couple learning. 
  Deferred to 500+ active couples.
- Vector retrieval — current distilled prose is sufficient at current scale.
- Graph memory — future when relationship network warrants it.
- Nora Therapy clinical adaptations — separate product.
- Corrigibility UI design — needs design before schema.

---

*This document is the spec. No memory architecture changes ship 
without updating this document first.*
*Companion documents: ABF-CONSTITUTION.md, ABF-SIGNAL-REGISTRY.md*
