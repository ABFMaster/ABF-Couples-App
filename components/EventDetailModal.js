// DEPRECATED / DEAD COMPONENT — confirmed unused during the Aug 5 2026
// audit, retirement approved by Matt the same day.
//
// Was the event detail/edit/delete modal for the retired app/timeline
// page. Its delete path (client-side, no created_by check) was already
// flagged as weaker than /us's server-enforced creator-only delete — one
// more reason this was a retirement candidate, not something worth
// hardening further. Superseded by /us's own event detail flow (edit/
// delete built directly into app/us/page.js via /api/timeline/event/update
// and /api/timeline/event/delete, both auth-checked server-side). Retired
// alongside app/timeline/page.js and components/AddEventModal.js — see
// app/timeline/page.js for the full retirement rationale.
//
// Not part of the Next.js routing tree (a plain component, not a
// page.js/route.js file), so a comment-only stub is safe here — nothing
// imports it anymore.
//
// Could not delete this file from the sandbox this session (unlink/rm is
// blocked on this mount). Matt: safe to run
// `rm -rf app/timeline components/AddEventModal.js components/EventDetailModal.js`
// locally.
