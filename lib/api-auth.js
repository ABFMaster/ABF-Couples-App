// Shared auth helpers for API routes. See the July 30 security audit in
// Sessions/PRODUCT_BACKLOG.md — 65 of 116 routes were trusting a
// client-supplied userId/coupleId with no verification at all (classic
// Broken Object Level Authorization / OWASP API Security #1). This is the
// fix, extracted once so every route applies it the same way instead of
// each reinventing (or half-doing) it.
//
// Two different existing "good" patterns in this codebase inspired this:
// some routes (spark/today, notebook/entry/[id]) fully derive identity from
// the verified token and never trust a client-supplied id for anything —
// that's the real fix. Others (timeline/event) only check that *some*
// valid session exists, then still trust a client-supplied coupleId for the
// actual write — that only blocks anonymous callers, not one authenticated
// user acting on another's data. requireUser + verifyCoupleMembership
// together close both.
import { createClient } from '@supabase/supabase-js'

// Verifies the caller has a valid Supabase session. Returns the verified
// user and a service-role client, or an `error` shape ready to return
// directly. Every route should derive identity from `user.id` here — never
// from a client-supplied userId in the request body/query. That
// client-supplied value can still be accepted in the payload for backward
// compatibility (many call sites already send it for other reasons), it
// just must never be trusted for *who is making this request*.
export async function requireUser(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return { error: { status: 401, body: { error: 'Unauthorized' } } }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return { error: { status: 401, body: { error: 'Unauthorized' } } }
  }

  return { user, supabase }
}

// Confirms the verified user actually belongs to this couple before a route
// trusts a client-supplied coupleId for anything. "Is this a valid session"
// and "is this session allowed to touch this specific couple's data" are two
// different questions — this answers the second one.
export async function verifyCoupleMembership(supabase, userId, coupleId) {
  if (!userId || !coupleId) return false
  const { data: couple } = await supabase
    .from('couples')
    .select('user1_id, user2_id')
    .eq('id', coupleId)
    .maybeSingle()
  if (!couple) return false
  return couple.user1_id === userId || couple.user2_id === userId
}

// Convenience for the common case: derive the caller's own coupleId from
// their profile rather than trusting a client-supplied one at all. Preferred
// over verifyCoupleMembership when the route doesn't need to accept an
// arbitrary coupleId in the first place (most don't).
export async function getOwnCoupleId(supabase, userId) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('couple_id')
    .eq('user_id', userId)
    .maybeSingle()
  return profile?.couple_id || null
}
