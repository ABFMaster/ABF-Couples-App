-- Claim confirmation-rate query (task #188) — Aug 12 2026
--
-- WHAT THIS IS: a saved query you run by hand in the Supabase SQL editor
-- when you want to check in on how the nora_claims belief system is
-- behaving. Not a view, not a dashboard, not a scheduled job — per
-- instruction, this stays a query file until it proves it needs to be
-- more than that.
--
-- WHAT THIS IS NOT — READ BEFORE INTERPRETING RESULTS:
-- This is a relative behavioral/regression signal, NOT a measure of
-- factual accuracy. Nothing here tells you whether a claim was actually
-- TRUE about the couple — only how the belief-lifecycle machinery in
-- lib/nora-memory.js has been behaving: how often claims get confirmed
-- vs. challenged vs. corrected vs. self-reinforced, sliced by claim_type
-- and confidence. Never report a number from this file as "Nora is X%
-- accurate." If a claim_type shows a high correction rate, that means
-- Nora's *pattern-noticing* for that claim_type has been off more often —
-- it says nothing about ground truth.
--
-- THE REINFORCE DISTINCTION (this is the reason this query exists):
-- extractAndUpdateClaims() has two ways a claim's confidence goes up:
--   1. Explicit CONFIRMED — the user directly responded to a claim Nora
--      surfaced and agreed with it. classifyClaimResponse() sets
--      user_response + user_responded_at every time this happens.
--   2. REINFORCE — Nora's own notes-synthesis notices the same pattern
--      again across an unrelated signal and bumps confidence +0.10 with
--      supporting_signal_count+1, entirely without user involvement.
--      This path never touches user_response or user_responded_at.
-- Both paths currently move confidence by the identical +0.10. This query
-- exists specifically to make that difference visible and trackable,
-- because the architecture spec's stated invariant — "a belief earns
-- DIRECT-tier expression only through demonstrated confirmation" — is
-- less true than it reads once REINFORCE is accounted for. See
-- Sessions/NORA_IMPLEMENTATION_AUDIT_2026_08_11.md Part 7 for the full
-- writeup. REINFORCE was NOT modified as part of this work — this query
-- only makes its footprint queryable.
--
-- created_at CONFIRMED TO EXIST (checked against the live schema Aug 12
-- 2026) — it's a Supabase/Postgres default column, never set explicitly by
-- any insert in lib/nora-memory.js and never selected anywhere in the app
-- either, which is why earlier code-only inspection couldn't confirm it.
-- Query 1 below uses created_at as the true "when did this claim first
-- appear" cohort, and updated_at separately as "when was it last touched"
-- — the two answer different questions and are both kept.
--
-- A REAL LIMITATION, STATED PLAINLY:
-- nora_claims stores current cumulative state, not a per-event log. There
-- is no row saying "on this date, this specific response happened." That
-- means CONFIRMED and CHALLENGED cannot be cleanly told apart after the
-- fact purely from current columns — both set user_response/
-- user_responded_at identically; only the confidence *delta* differs
-- (+0.10 vs -0.25), and only the final cumulative confidence survives.
-- Query 1 below approximates this with likely_response_direction, a
-- confidence-band heuristic, not a certain classification. Do not treat
-- it as exact. This is the "smallest reliable way to distinguish them
-- from the existing data" without redesigning the claims table.


-- ── QUERY 1: Overview by claim_type, confidence band, and outcome ──────────
-- One row per claim, bucketed. Run this first for the general shape of
-- how claims are behaving across the couple base.
SELECT
  claim_type,

  -- Confidence band at time of last write.
  CASE
    WHEN confidence >= 0.85 THEN '0.85+ (DIRECT-eligible)'
    WHEN confidence >= 0.70 THEN '0.70-0.84 (surfaceable)'
    WHEN confidence >= 0.40 THEN '0.40-0.69'
    ELSE '< 0.40'
  END AS confidence_band,

  -- Terminal / lifecycle outcome — this part IS cleanly queryable from status.
  CASE
    WHEN status = 'retired' THEN 'RETIRED (2nd correction)'
    WHEN status = 'dormant' THEN 'CORRECTED_ONCE (superseded)'
    WHEN status = 'active' AND user_responded_at IS NOT NULL THEN 'ACTIVE_WITH_EXPLICIT_RESPONSE'
    WHEN status = 'active' AND user_responded_at IS NULL AND supporting_signal_count > 1 THEN 'ACTIVE_REINFORCED_ONLY (no user ever responded)'
    WHEN status = 'active' THEN 'ACTIVE_UNENGAGED (fresh candidate)'
    ELSE status
  END AS outcome,

  -- Best-effort approximation ONLY for the ACTIVE_WITH_EXPLICIT_RESPONSE
  -- bucket above — see the limitation note in the header. A claim that was
  -- net-CONFIRMED tends to sit meaningfully above its 0.2-0.4 starting
  -- range; a claim that was net-CHALLENGED (-0.25 per event, starting from
  -- 0.2-0.4) tends to sit at or near the 0 floor. Do not treat as exact.
  CASE
    WHEN user_responded_at IS NULL THEN NULL
    WHEN confidence >= 0.5 THEN 'likely net CONFIRMED'
    WHEN confidence <= 0.15 THEN 'likely net CHALLENGED'
    ELSE 'ambiguous'
  END AS likely_response_direction,

  -- Explicit confirmation vs self-reinforcement, the core ask of this
  -- query. TRUE only for claims that reached their current confidence
  -- with zero user involvement.
  (user_responded_at IS NULL AND supporting_signal_count > 1) AS reinforced_without_user_response,

  count(*) AS claim_count,
  round(avg(confidence)::numeric, 3) AS avg_confidence,
  round(avg(supporting_signal_count)::numeric, 2) AS avg_supporting_signals,
  min(created_at) AS earliest_created,
  max(created_at) AS latest_created,
  max(updated_at) AS most_recent_write

FROM nora_claims
GROUP BY 1, 2, 3, 4, 5
ORDER BY claim_type, confidence_band DESC, outcome;


-- ── QUERY 2: Claims repeatedly reinforced but later corrected/retired ──────
-- The specific early-warning signal called out for this metric: a claim
-- that Nora's own notes-synthesis kept reinforcing (supporting_signal_count
-- > 1, meaning it "noticed the pattern again" more than once) but that a
-- real person later corrected or fully retired anyway. A high count here,
-- especially concentrated in one claim_type, suggests REINFORCE may be too
-- permissive for that pattern type — i.e. Nora talked herself into
-- confidence a person didn't actually validate.
SELECT
  id,
  couple_id,
  user_id,
  claim_type,
  claim_text,
  confidence AS confidence_at_correction,
  supporting_signal_count,
  status,
  correction_count,
  dormant_linked_claim_id,
  user_response AS correcting_user_response,
  updated_at AS last_write_at
FROM nora_claims
WHERE status IN ('dormant', 'retired')
  AND supporting_signal_count > 1
ORDER BY supporting_signal_count DESC, updated_at DESC;


-- ── QUERY 3: Self-reinforcement ratio by claim_type ─────────────────────────
-- Of all claims that ever left the fresh/unengaged state for a given
-- claim_type, what fraction got there via REINFORCE-only (never an
-- explicit user response) vs. an explicit user response at some point?
-- A claim_type sitting persistently high here is the concrete version of
-- "Nora's beliefs are only as trustworthy as their confirmation history,
-- and REINFORCE is confirmation history Nora partially gave itself" —
-- see NORA_IMPLEMENTATION_AUDIT_2026_08_11.md Part 7.
SELECT
  claim_type,
  count(*) FILTER (WHERE user_responded_at IS NULL AND supporting_signal_count > 1) AS reinforced_only_count,
  count(*) FILTER (WHERE user_responded_at IS NOT NULL) AS explicit_response_count,
  count(*) AS total_engaged_claims,
  round(
    100.0 * count(*) FILTER (WHERE user_responded_at IS NULL AND supporting_signal_count > 1)
    / NULLIF(count(*), 0),
    1
  ) AS reinforced_only_pct
FROM nora_claims
WHERE status <> 'active' OR supporting_signal_count > 1 OR user_responded_at IS NOT NULL
GROUP BY claim_type
ORDER BY reinforced_only_pct DESC NULLS LAST;


-- ── QUERY 4: Weekly trend, by claim creation date ───────────────────────────
-- Now that created_at is confirmed to exist, this is the real "over time"
-- view: for each week of claims created, how many were later retired vs.
-- corrected-once vs. still active, and what fraction of that week's claims
-- were ever explicitly confirmed by a person at all. A rising retired/
-- corrected share in recent weeks (with enough claims to be meaningful —
-- watch total_claims, don't read into small-sample weeks) is the clearest
-- "is this getting better or worse" signal this file can produce.
SELECT
  date_trunc('week', created_at) AS week_created,
  count(*) AS total_claims,
  count(*) FILTER (WHERE status = 'retired') AS retired,
  count(*) FILTER (WHERE status = 'dormant') AS corrected_once,
  count(*) FILTER (WHERE status = 'active') AS still_active,
  count(*) FILTER (WHERE user_responded_at IS NOT NULL) AS ever_explicitly_responded_to,
  round(
    100.0 * count(*) FILTER (WHERE user_responded_at IS NOT NULL) / NULLIF(count(*), 0),
    1
  ) AS explicit_response_pct
FROM nora_claims
GROUP BY 1
ORDER BY 1 DESC;
