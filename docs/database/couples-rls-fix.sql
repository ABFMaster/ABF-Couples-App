-- Fix: couples table RLS let any authenticated user pair into any
-- unpaired couple, and let any authenticated user read the entire table.
--
-- Found Aug 4 2026 during the Game Room/Memory/auth audit. Two problems,
-- confirmed by pulling the live policies via:
--   select policyname, cmd, qual, with_check from pg_policies where tablename = 'couples';
--
-- 1. SELECT policy:
--      (auth.uid() = user1_id) OR (auth.uid() = user2_id) OR (connect_code IS NOT NULL)
--    The third branch has no bound to a specific code value — it grants
--    read access to EVERY row that has a connect_code set (i.e. almost
--    every row, since one is assigned at creation), to ANY authenticated
--    user, with no WHERE-clause requirement. A bare `select('*')` with no
--    filter returns the whole table. This let any user enumerate every
--    couple, including which ones were still unpaired (user2_id IS NULL).
--
-- 2. UPDATE policy:
--      USING:      (auth.uid() = user1_id) OR ((user2_id IS NULL) AND (connect_code IS NOT NULL))
--      WITH CHECK: (auth.uid() = user1_id) OR (auth.uid() = user2_id)
--    The USING clause's second branch only checks that a row is
--    "unpaired and has some connect_code" — it never checks that the
--    caller supplied the MATCHING code. Combined with finding 1, any
--    authenticated user could enumerate unpaired couples and then run
--    `update couples set user2_id = auth.uid() where id = '<found id>'`
--    directly — WITH CHECK passes because auth.uid() now equals the new
--    user2_id. No code-guessing needed at all. This is a full account/
--    relationship takeover: the attacker becomes the "partner" on a real
--    user's account and gains couple-membership access to that couple's
--    entire nora_memory, timeline, assessments, and everything else
--    verifyCoupleMembership gates throughout the app.
--
-- Fix: the actual join mutation now happens server-side in
-- app/api/couples/join/route.js, using the service-role client to
-- independently re-verify the connect_code match, user2_id IS NULL, and
-- user1_id != caller — real code, not policy wording, enforces
-- correctness. app/api/couples/create-code/route.js does the same for
-- code creation. The browser no longer needs direct SELECT/UPDATE access
-- to arbitrary couples rows for either flow, so this migration removes
-- both permissive branches:
--   - SELECT: drop the `connect_code IS NOT NULL` branch entirely —
--     restrict to self-membership only.
--   - UPDATE: drop the "any unpaired row" branch — restrict to
--     self-only (auth.uid() = user1_id), since joining now happens
--     exclusively through the service-role route, which bypasses RLS.
-- INSERT policy is untouched — auth.uid() = user1_id was already correct
-- and self-only.
--
-- Run this once in the Supabase SQL Editor.

ALTER POLICY "Users can read couples by code or membership" ON public.couples
USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

ALTER POLICY "Users can update couple to join as partner" ON public.couples
USING (
  auth.uid() = user1_id
)
WITH CHECK (
  auth.uid() = user1_id
);

-- Verify after running:
-- select policyname, cmd, qual, with_check from pg_policies where tablename = 'couples';
-- SELECT's qual should no longer mention connect_code.
-- UPDATE's qual and with_check should both be just "auth.uid() = user1_id".
--
-- IMPORTANT — deploy the code before running this migration, not after.
-- Once this runs, the old client-side create/join flow in
-- app/connect/page.js (the raw insert/update calls) will stop working —
-- it must already be replaced with calls to /api/couples/create-code and
-- /api/couples/join first, or new/pending pairings will break.
