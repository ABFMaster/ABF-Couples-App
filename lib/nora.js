// ── NORA CALL INFRASTRUCTURE ──────────────────────────────────────────────
// Unified layer for all Anthropic calls that go through Nora.
// Routes should use noraChat / noraReact / noraVerdict / noraGenerate
// instead of instantiating Anthropic directly.
// noraSignal is for internal routing calls — no voice, haiku only.

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NORA_VOICE } from './nora-knowledge'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Context-specific register notes appended after NORA_VOICE.
// These adjust tone without changing identity.
const CONTEXT_NOTES = {
  game_room: 'You are in game master mode. You are running a game — warm, sharp, present. Keep it moving. Every word earns its place.',
  daily: 'You are in daily companion mode. Calm, grounded, attentive. This is the quiet part of the relationship, not the highlight reel.',
  conversation: 'You are in conversation mode. You are holding space. Listen hard. Respond to what is actually being said, not the surface version.',
  verdict: 'You are delivering a verdict. Be specific. Be final. No hedging. Land it.',
  signal: null, // internal only — no voice appended
}

// Build the system prompt for a given context.
// routeInstructions is the per-route system string (may be null).
function buildSystem(routeInstructions, context = 'conversation') {
  const note = CONTEXT_NOTES[context]

  // signal context: no NORA_VOICE, no register note
  if (context === 'signal') {
    return routeInstructions || ''
  }

  const parts = [NORA_VOICE]
  if (note) parts.push(note)
  if (routeInstructions) parts.push(routeInstructions)

  return parts.join('\n\n---\n\n')
}

// Fire-and-forget usage logging. Never blocks the response.
function logCall({ route, context, model, usage }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    supabase
      .from('nora_calls')
      .insert({
        route,
        context,
        model,
        input_tokens: usage?.input_tokens ?? null,
        output_tokens: usage?.output_tokens ?? null,
        created_at: new Date().toISOString(),
      })
      .then(() => {})
      .catch(() => {})
  } catch {
    // never throw
  }
}

// Core call. All public functions delegate here.
async function noraCall({
  route,
  messages,
  system,
  context = 'conversation',
  model = 'claude-sonnet-4-6',
  maxTokens = 400,
}) {
  const builtSystem = buildSystem(system, context)

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: builtSystem,
    messages,
  })

  const text = response.content[0].text.trim()

  logCall({ route, context, model, usage: response.usage })

  return text
}

// ── PUBLIC API ─────────────────────────────────────────────────────────────

// Multi-turn conversation. Pass full messages array.
export async function noraChat(messages, opts = {}) {
  return noraCall({
    route: opts.route || 'noraChat',
    messages,
    system: opts.system || null,
    context: opts.context || 'conversation',
    model: opts.model || 'claude-sonnet-4-6',
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
    model: opts.model || 'claude-sonnet-4-6',
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
    model: opts.model || 'claude-sonnet-4-6',
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
    model: opts.model || 'claude-sonnet-4-6',
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
