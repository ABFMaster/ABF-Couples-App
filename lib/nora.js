// ── NORA CALL INFRASTRUCTURE ──────────────────────────────────────────────
// Unified layer for all Anthropic calls that go through Nora.
// Routes should use noraChat / noraReact / noraVerdict / noraGenerate
// instead of instantiating Anthropic directly.
// noraSignal is for internal routing calls — no voice, haiku only.

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NORA_VOICE } from './nora-knowledge.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

// Context-specific register notes appended after NORA_VOICE.
// These adjust tone without changing identity.
// Aug 13 2026 — grounding addition to 'daily' and 'conversation'. Root
// cause: Matt caught Nora stating an inferred detail (who planned a
// birthday-weekend event) as settled fact when it was never actually told
// to her — reconstructed from adjacent signals, not reported. Anthropic's
// own hallucination-reduction guidance (docs.claude.com/.../reduce-hallucinations)
// names this exact fix: give the model explicit permission to not assert
// what it isn't sure of, rather than adding more instructions elsewhere.
// Deliberately NOT a spoken disclaimer ("I don't know who planned this") —
// that would read as hedging and undercut the confident voice that's the
// point of her. The instruction is upstream of the sentence: don't
// manufacture the specific claim to begin with; work from what's actually
// confirmed. Scoped to 'daily' and 'conversation' only — these are the two
// registers where Nora synthesizes across remembered signals to narrate
// something as true. 'verdict' (game round results) and 'game_room' (live
// banter) aren't memory-synthesis surfaces in the same way and keep their
// existing notes unchanged, per the "don't layer on every register"
// principle. Note: the Thursday/Wednesday reveal calls in
// app/api/cron/scheduled-tasks/route.js pass no context param, so they
// default to 'conversation' (see noraChat's default below) — that's how
// this line actually reaches the specific commentary Matt flagged, even
// though those calls read like one-shot narration rather than a live
// back-and-forth. Whether those calls should be explicitly retagged
// 'daily' is a separate, not-yet-made decision — flagged, not fixed, here.
const CONTEXT_NOTES = {
  game_room: 'You are in game master mode. You are running a game — warm, sharp, present. Keep it moving. Every word earns its place.',
  daily: 'You are in daily companion mode. Calm, grounded, attentive. This is the quiet part of the relationship, not the highlight reel. Say only what you actually know — if a detail wasn\'t told to you or directly observed, don\'t invent it to fill a gap. Work with what\'s real instead; it\'s usually more interesting anyway.',
  conversation: 'You are in conversation mode. You are holding space. Listen hard. Respond to what is actually being said, not the surface version. Say only what you actually know — if a detail wasn\'t told to you or directly observed, don\'t invent it to fill a gap. Work with what\'s real instead; it\'s usually more interesting anyway.',
  verdict: 'You are delivering a verdict. Be specific. Be final. No hedging. Land it.',
  signal: null, // internal only — no voice appended
}

// Prompt caching — Aug 12 2026. NORA_VOICE (~1,600 tokens) is byte-identical
// on every single call that reaches it, across every route in the app. This
// marks it as a cache breakpoint so repeat calls within Anthropic's cache
// window bill that block at ~10% of normal input cost instead of full price
// — the model receives the exact same text either way, this changes nothing
// about what Nora says, only what a repeat of it costs. Matt: "Nora IS the
// product... needs to have her present as incredible" — this is what makes
// giving her full voice everywhere (including surfaces that were routed
// around it for cost reasons, see noraSignal below) not a real cost
// tradeoff. See docs/database/nora_calls_cache_tokens.sql for the paired
// logging migration so cost analysis against nora_calls stays accurate
// post-caching (cache reads/writes are separate usage fields, not folded
// into input_tokens).
function cachedVoiceBlock() {
  return { type: 'text', text: NORA_VOICE, cache_control: { type: 'ephemeral' } }
}

// Build the system prompt for a given context.
// routeInstructions is the per-route system string (may be null).
// Returns a content-block array (required for cache_control) rather than a
// plain string for every context except 'signal' — the Anthropic SDK
// accepts either form for the `system` param, so this is transparent to
// noraCall/anthropic.messages.create below.
function buildSystem(routeInstructions, context = 'conversation') {
  const note = CONTEXT_NOTES[context]

  // signal context: no NORA_VOICE, no register note, no caching — this
  // path is Haiku-only and low-value to cache on its own.
  if (context === 'signal') {
    return routeInstructions || ''
  }

  const rest = [note, routeInstructions].filter(Boolean).join('\n\n---\n\n')

  return [
    cachedVoiceBlock(),
    ...(rest ? [{ type: 'text', text: rest }] : []),
  ]
}

export function buildCoachSystem(clinicalKnowledge, operationalRules) {
  const rest = [clinicalKnowledge, operationalRules].filter(Boolean).join('\n\n---\n\n')
  return [
    cachedVoiceBlock(),
    ...(rest ? [{ type: 'text', text: rest }] : []),
  ]
}

// Fire-and-forget usage logging. Never blocks the response.
// Aug 12 2026 — added cache_creation_input_tokens/cache_read_input_tokens.
// Now that system prompts use cache_control, Anthropic's usage object
// reports cache reads/writes as separate fields, NOT folded into
// input_tokens. Without capturing these, cost analysis run against this
// table (like the one that informed the caching decision itself) would
// silently under-report real spend post-caching. Requires the migration in
// docs/database/nora_calls_cache_tokens.sql — until Matt runs it, Supabase
// will reject the extra columns and this insert fails, same as any other
// insert error here: caught below, logged nowhere, never thrown. Logging
// gap until the migration runs; the actual Nora call to the user is
// unaffected either way.
//
// Aug 13 2026 — added latency_ms/status/stop_reason/error_type/error_message.
// Reliability sweep, prompted by wanting to catch the next Memory Test-shape
// bug (commit ba01ad9 — verbose JSON output truncated by too-low maxTokens,
// which surfaced only as a generic "something went wrong" with nothing in
// any log pinning the actual cause) from a query instead of a live repro.
// stop_reason === 'max_tokens' on a successful call is exactly that signature
// — a call that "succeeded" at the API level but likely returned truncated
// content. Requires docs/database/nora_calls_observability.sql — same
// migration-pending fallback as the cache-tokens columns above: until Matt
// runs it, this insert fails and is silently caught, no behavior change to
// the actual Nora call either way.
function logCall({ route, context, model, usage, latencyMs, status = 'success', stopReason, errorType, errorMessage }) {
  try {
    supabase
      .from('nora_calls')
      .insert({
        route,
        context,
        model,
        input_tokens: usage?.input_tokens ?? null,
        output_tokens: usage?.output_tokens ?? null,
        cache_creation_input_tokens: usage?.cache_creation_input_tokens ?? null,
        cache_read_input_tokens: usage?.cache_read_input_tokens ?? null,
        latency_ms: latencyMs ?? null,
        status,
        stop_reason: stopReason ?? null,
        error_type: errorType ?? null,
        error_message: errorMessage ?? null,
        created_at: new Date().toISOString(),
      })
      .then(() => {})
      .catch(() => {})
  } catch {
    // never throw
  }
}

// Classifies an Anthropic SDK error into a short, queryable bucket without
// leaking full stack traces/prompt content into a table other routes read
// for cost analysis. Anthropic's SDK sets `status` for real API error
// responses (401/403/404/413/429/5xx); anything without one is a
// network-level failure (timeout, DNS, connection reset) which the SDK
// surfaces as a plain Error/TypeError instead.
function classifyError(err) {
  const status = err?.status
  if (status === 429) return 'rate_limit'
  if (status === 401 || status === 403) return 'auth'
  if (status === 400 || status === 413) return 'invalid_request'
  if (typeof status === 'number' && status >= 500) return 'anthropic_server_error'
  if (err?.name === 'APIConnectionTimeoutError' || /timeout/i.test(err?.message || '')) return 'timeout'
  if (typeof status === 'number') return `http_${status}`
  return 'network_or_unknown'
}

// Core call. All public functions delegate here.
async function noraCall({
  route,
  messages,
  system,
  context = 'conversation',
  model = 'claude-sonnet-5',
  maxTokens = 400,
}) {
  const builtSystem = buildSystem(system, context)
  const startedAt = Date.now()

  let response
  try {
    response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: builtSystem,
      messages,
    })
  } catch (err) {
    // Logged, then rethrown unchanged — every existing caller's own
    // try/catch (there are many, all different shapes: silent fallback,
    // user-facing error, etc.) keeps working exactly as before. This only
    // adds visibility into WHY a call failed; it never changes what happens
    // as a result of the failure.
    logCall({
      route, context, model,
      latencyMs: Date.now() - startedAt,
      status: 'error',
      errorType: classifyError(err),
      errorMessage: (err?.message || String(err)).slice(0, 500),
    })
    throw err
  }

  const text = response.content[0].text.trim()

  logCall({
    route, context, model, usage: response.usage,
    latencyMs: Date.now() - startedAt,
    status: 'success',
    stopReason: response.stop_reason,
  })

  return text
}

// Shared JSON-response parser for noraGenerate() callers. Added Aug 13 2026
// during the Nora call reliability sweep — a grep across every route that
// calls JSON.parse on a Nora response found ~10 routes with markdown-fence
// stripping but no {...} extraction, and a few (reflection/generate,
// trips/wander, dates/conversation-starters) with no defensive parsing at
// all. Nora is always instructed to return JSON only, but on longer/more
// complex prompts she can still preface it with a stray sentence despite
// that instruction — exactly what caused the Memory Test JSON-truncation
// bug class (commit ba01ad9), where extracting the first {...} block instead
// of assuming the whole cleaned string parses cleanly was the actual fix,
// not the fence-stripping (which was already present there too). Centralized
// here instead of copy-pasted per-route so the next route to need this gets
// it by default. Throws on failure, same as a raw JSON.parse — every
// existing call site's try/catch keeps working unchanged, only the
// extraction step gets more robust.
export function parseNoraJSON(raw) {
  const cleaned = String(raw || '').replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  const match = cleaned.match(/[\{\[][\s\S]*[\}\]]/)
  return JSON.parse(match ? match[0] : cleaned)
}

// ── PUBLIC API ─────────────────────────────────────────────────────────────

// Multi-turn conversation. Pass full messages array.
export async function noraChat(messages, opts = {}) {
  return noraCall({
    route: opts.route || 'noraChat',
    messages,
    system: opts.system || null,
    context: opts.context || 'conversation',
    model: opts.model || 'claude-sonnet-5',
    maxTokens: opts.maxTokens || 600,
  })
}

// Single-shot reaction to a prompt. Returns a short response.
export async function noraReact(prompt, opts = {}) {
  return noraCall({
    route: opts.route || 'noraReact',
    messages: [{ role: 'user', content: prompt }],
    system: opts.system || null,
    context: opts.context || 'conversation',
    model: opts.model || 'claude-sonnet-5',
    maxTokens: opts.maxTokens || 200,
  })
}

// Game verdict. Longer, more deliberate. context defaults to 'verdict'.
export async function noraVerdict(prompt, opts = {}) {
  return noraCall({
    route: opts.route || 'noraVerdict',
    messages: [{ role: 'user', content: prompt }],
    system: opts.system || null,
    context: opts.context || 'verdict',
    model: opts.model || 'claude-sonnet-5',
    maxTokens: opts.maxTokens || 400,
  })
}

// Structured generation (JSON output expected). context defaults to 'game_room'.
export async function noraGenerate(prompt, opts = {}) {
  return noraCall({
    route: opts.route || 'noraGenerate',
    messages: [{ role: 'user', content: prompt }],
    system: opts.system || null,
    context: opts.context || 'game_room',
    model: opts.model || 'claude-sonnet-5',
    maxTokens: opts.maxTokens || 600,
  })
}

// Internal signal call. No NORA_VOICE. Uses Haiku. Never user-facing.
export async function noraSignal(prompt, opts = {}) {
  return noraCall({
    route: opts.route || 'noraSignal',
    messages: [{ role: 'user', content: prompt }],
    system: opts.system || null,
    context: 'signal',
    model: opts.model || 'claude-haiku-4-5-20251001',
    maxTokens: opts.maxTokens || 200,
  })
}

// Vision captioning — one-time, at upload, never re-run per-generation.
// See docs/database/photo-descriptions.sql. Haiku, not Sonnet: this is
// factual scene description, not creative writing, same cost logic as
// noraSignal above. No NORA_VOICE/register note (context: 'signal') — this
// text is never shown to a user directly, it's raw material other Nora
// surfaces (Memory Test, eventually Weekly Reflection) synthesize from
// later, using their own voice at that point.
// Scene-only by explicit instruction — never identity/appearance analysis
// of the people in the photo, regardless of who's asking or why.
export async function noraDescribePhoto(imageUrl, opts = {}) {
  return noraCall({
    route: opts.route || 'noraDescribePhoto',
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'url', url: imageUrl } },
        { type: 'text', text: 'Describe what is actually visible in this photo in 1-2 factual sentences — the setting, activity, and any notable objects or details. Plain and observational, not poetic. Do not describe or analyze the identity or appearance of any people in it — describe the scene, not the people.' },
      ],
    }],
    system: null,
    context: 'signal',
    model: opts.model || 'claude-haiku-4-5-20251001',
    maxTokens: opts.maxTokens || 150,
  })
}
