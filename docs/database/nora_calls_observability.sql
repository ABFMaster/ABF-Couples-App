-- Nora call reliability sweep, Aug 13 2026.
-- nora_calls already tracks route/context/model/tokens (+ cache tokens as of
-- Aug 12). This adds what's needed to actually see a failure or a truncated
-- response without digging through Vercel logs after the fact: latency,
-- success/error status, Anthropic's own stop_reason (max_tokens here is
-- exactly what caused the Memory Test JSON-truncation bug, commit ba01ad9 —
-- this would have shown up here immediately instead of needing a live repro
-- to find), and a classified error type + truncated message on failure.
ALTER TABLE nora_calls
  ADD COLUMN IF NOT EXISTS latency_ms INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS stop_reason TEXT,
  ADD COLUMN IF NOT EXISTS error_type TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT;
