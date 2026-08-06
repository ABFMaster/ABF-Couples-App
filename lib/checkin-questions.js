// DEPRECATED / DEAD FILE — confirmed unused during the Aug 5 2026 full code
// audit (zero importers anywhere in the app, including internally within
// this file itself). This was already flagged as dead in an earlier sprint
// (see Sessions/PRE_LAUNCH_SPRINT_PLAN.md) but never actually removed.
//
// The live daily check-in question logic is elsewhere — this file's
// MOOD_OPTIONS/CORE_QUESTIONS/ROTATING_QUESTIONS and its
// selectQuestion/selectRotatingQuestion/selectReflectionQuestion/
// getDailyCheckinQuestions helpers are superseded by whatever currently
// powers /api daily-checkin generation (the scored/emoji check-in UI this
// was built for was retired — see lib/checkin-patterns.js's rewrite notes).
//
// Could not delete this file from the sandbox this session (unlink/rm is
// blocked on this mount — same "Operation not permitted" seen throughout
// this engagement). Matt: safe to run `rm lib/checkin-questions.js` locally.
