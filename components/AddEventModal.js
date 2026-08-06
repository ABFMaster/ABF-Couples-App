// DEPRECATED / DEAD COMPONENT — confirmed unused during the Aug 5 2026
// audit, retirement approved by Matt the same day.
//
// Was the "add event" modal for the retired app/timeline page. Superseded
// by app/us/add/page.js, which covers everything this did (milestones via
// /us's foundation-slot cards, everything else via the "memory" path) with
// better photo support. Retired alongside app/timeline/page.js and
// components/EventDetailModal.js — see app/timeline/page.js for the full
// retirement rationale.
//
// Not part of the Next.js routing tree (a plain component, not a
// page.js/route.js file), so a comment-only stub is safe here — nothing
// imports it anymore.
//
// Could not delete this file from the sandbox this session (unlink/rm is
// blocked on this mount). Matt: safe to run
// `rm -rf app/timeline components/AddEventModal.js components/EventDetailModal.js`
// locally.
