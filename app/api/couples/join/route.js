export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { seedAssessmentMemory, computeAssessmentResults } from '@/lib/assessment-memory'

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

    // Backfill Nora memory for any assessment completed during solo
    // onboarding, before either partner had a couple to attach it to.
    // app/assessment/page.js's onboarding path explicitly saves with
    // couple_id: null by design ("assessment row exists before partner is
    // invited"). But updateNoraMemory requires a resolvable couple_id to do
    // anything at all — nora_memory is one row per couple, so with no
    // couple yet there was nothing to write into. That means the original
    // seed-memory call at completion time silently no-op'd for the Nora
    // half (logged nothing to nora_signals, incremented no counts,
    // synthesized no notes), with nothing to catch it later — found this
    // Aug 5 2026 while backfilling Matt & Cass's own assessments: their
    // nora_signals had zero assessment_complete rows despite both having
    // real completed assessments in relationship_assessments.
    // This is the catch: the moment a real couple_id first exists for both
    // partners is right here, at pairing. Runs for both partners, since
    // either one (not just the joiner) may have completed their assessment
    // solo before this moment. Non-blocking — pairing must succeed
    // regardless of what happens here.
    try {
      for (const uid of [couple.user1_id, user.id]) {
        const { data: pending } = await supabase
          .from('relationship_assessments')
          .select('id, answers')
          .eq('user_id', uid)
          .is('couple_id', null)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!pending?.answers) continue

        await supabase
          .from('relationship_assessments')
          .update({ couple_id: updated.id })
          .eq('id', pending.id)

        const results = computeAssessmentResults(pending.answers)
        await seedAssessmentMemory({ supabase, userId: uid, coupleId: updated.id, answers: pending.answers, results })
      }
    } catch (err) {
      console.error('[couples/join] assessment memory backfill failed:', err)
    }

    return NextResponse.json({ success: true, coupleId: updated.id })
  } catch (err) {
    console.error('[couples/join] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
