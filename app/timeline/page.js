'use client'

// DEPRECATED / RETIRED PAGE — confirmed dead during the Aug 5 2026 audit,
// retirement approved by Matt the same day.
//
// This was the original "Been"/timeline implementation, superseded by
// /us + /us/add. Its one remaining entry point (dashboard's empty-state
// "Add a memory" button) was repointed to /us/add earlier in this same
// audit sprint — since then this page has had zero live links anywhere
// in the app (verified via a repo-wide grep for '/timeline' as a route
// string before retiring).
//
// Feature-parity check before retiring: /us's foundation-slot cards cover
// first_date/first_kiss/anniversary/milestone (the old AddEventModal's
// structured types), and /us/add's "memory" path covers everything else
// (trip/date_night/achievement/custom all collapsed into a generic
// memory entry) — with better photo support (multi-photo, partner-can-
// add-photos) and Nora observations the old page never had. Nothing here
// does anything /us can't already do.
//
// Depended on components/AddEventModal.js and components/EventDetailModal.js,
// both retired alongside this file for the same reason.
//
// Left as a redirect (rather than a comment-only stub) since this is a
// Next.js page.js route file — an empty/no-export file would break
// `next build`. A redirect is also the right behavior for anyone hitting
// a stale bookmark/deep link to /timeline.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DeprecatedTimelinePage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/us?section=been')
  }, [router])
  return null
}
