export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'

// Built Aug 4 2026 to close a critical account-takeover vulnerability
// found during the Game Room/Memory/auth audit. The previous flow did the
// entire join — including the "is this code already used" and "is this
// your own code" checks — client-side in app/connect/page.js, then issued
// a raw Supabase UPDATE straight from the browser. That depended entirely
// on the couples table's RLS policy to enforce correctness, and the live
// policy didn't: its UPDATE USING clause was
//   (auth.uid() = user1_id) OR ((user2_id IS NULL) AND (connect_code IS NOT NULL))
// — which only checks that a couple row is "unpaired and has some code",
// never that the caller actually supplied the matching code. Combined
// with the SELECT policy exposing every couple row to any authenticated
// user (its `connect_code IS NOT NULL` branch has no bound to a specific
// value either), any authenticated user could enumerate every unpaired
// couple and pair themselves in directly — full account/relationship
// takeover, no code-guessing required.
//
// This route re-derives every check server-side using the exact
// connectCode the caller supplied, via the service-role client (bypasses
// RLS, so the fix here is real code, not policy wording). The
// docs/database/couples-rls-fix.sql migration additionally locks the raw
// client UPDATE policy down to self-only, so this route becomes the only
// way to join a couple even if a future RLS policy regresses.
export async function POST(request) {
  try {
    const { user, supabase, error: authError } = await requireUser(request)
    if (authError) return NextResponse.json(authError.body, { status: authError.status })

    const { connectCode } = await request.json()
    if (!connectCode || typeof connectCode !== 'string' || connectCode.trim().length !== 6) {
      return NextResponse.json({ error: 'Code must be 6 characters' }, { status: 400 })
    }
    const code = connectCode.trim().toUpperCase()

    const { data: couple, error: findError } = await supabase
      .from('couples')
      .select('id, user1_id, user2_id')
      .eq('connect_code', code)
      .maybeSingle()

    if (findError || !couple) {
      return NextResponse.json({ error: 'Invalid connect code' }, { status: 404 })
    }
    if (couple.user2_id) {
      return NextResponse.json({ error: 'This code has already been used' }, { status: 409 })
    }
    if (couple.user1_id === user.id) {
      return NextResponse.json({ error: 'You cannot connect to your own code' }, { status: 400 })
    }

    // Re-check user2_id IS NULL in the update itself as a narrow guard
    // against two people racing to claim the same code at the same
    // instant — whichever UPDATE lands first wins, the second finds
    // user2_id already set and no row matches.
    const { data: updated, error: updateError } = await supabase
      .from('couples')
      .update({ user2_id: user.id, connected_at: new Date().toISOString() })
      .eq('id', couple.id)
      .is('user2_id', null)
      .select('id')
      .maybeSingle()

    if (updateError) {
      return NextResponse.json({ error: 'Failed to connect' }, { status: 500 })
    }
    if (!updated) {
      return NextResponse.json({ error: 'This code has already been used' }, { status: 409 })
    }

    // Keep user_profiles.couple_id in sync for both partners — see the
    // matching comment in app/api/couples/create-code/route.js. user1's
    // may already be set from creation, but upsert covers the case where
    // it wasn't (e.g. a couple row created before this sync existed).
    try {
      await supabase
        .from('user_profiles')
        .upsert([
          { user_id: user.id, couple_id: updated.id, updated_at: new Date().toISOString() },
          { user_id: couple.user1_id, couple_id: updated.id, updated_at: new Date().toISOString() },
        ], { onConflict: 'user_id' })
    } catch {}

    return NextResponse.json({ success: true, coupleId: updated.id })
  } catch (err) {
    console.error('[couples/join] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
