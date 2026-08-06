// DEPRECATED / DEAD ROUTE — confirmed unused during the Aug 5 2026 full
// code audit (zero callers anywhere in app/game-room or elsewhere; the only
// matches for "game-room/challenge/start" in the whole codebase are this
// file's own route label and error-log strings).
//
// This route was flagged back on July 31 as a decision needed: its
// Memory Test eligibility check duplicated logic that has since been
// rebuilt properly and centrally in lib/memory-unlock.js, enforced
// server-side in the actual live confirm-type route. This file's version
// was never wired into the current Game Room UI at all — Challenge mode's
// real entry point is elsewhere (see app/api/game-room/challenge/next,
// pitch, etc.).
//
// The route did already get a real auth fix earlier this engagement (see
// git history) since it was reachable and vulnerable even though unused by
// the UI — so it wasn't a live security hole by the time it was confirmed
// dead here, just genuinely orphaned functionality.
//
// Could not delete this file from the sandbox this session (unlink/rm is
// blocked on this mount). Matt: safe to run
// `rm -rf app/api/game-room/challenge/start` locally.
