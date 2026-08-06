// DEPRECATED / DEAD FILE — found during the Aug 5 2026 AI Coach audit.
//
// generateNoraTrigger() has zero live callers anywhere in the app.
// PROMPTS/session-handoff.md already recorded it as removed in an earlier
// session ("Dead features removed this session: ... generateNoraTrigger,
// noraTrigger state"), but the cleanup was incomplete — this file and a
// stray `import { generateNoraTrigger } from '@/lib/nora-triggers'` in
// app/ai-coach/page.js were both left behind (the import has been removed
// as part of this pass; confirmed unused before removing it).
//
// Also worth knowing if this is ever revived: it queried
// attachment_assessments/conflict_assessments tables that don't exist in
// the live schema (same confirmed-dead tables removed from
// lib/ai-coach-context.js in this same audit pass), and its check-in
// fallback logic read daily_checkins.mood/connection_score, which are
// columns no live writer has populated since the scored/emoji check-in UI
// was retired (see lib/checkin-patterns.js's rewrite, Aug 2026).
//
// Could not actually delete this file from the sandbox this session — the
// mount blocks unlink on any file (same "Operation not permitted" seen on
// git's internal lock/object files all session, not specific to this
// file). Matt: safe to just `rm lib/nora-triggers.js` locally next time
// you're in a terminal. Left content-neutered here in the meantime so it's
// obviously inert if anyone stumbles on it before then.
