-- Fix: custom_dates INSERT policy doesn't verify couple membership.
--
-- Found during the Aug 3 Date Night audit. The current policy ("Users can
-- insert their own custom dates") only checks `auth.uid() = user_id` — it
-- never verifies that `couple_id` is actually a couple the caller belongs
-- to. The SELECT and UPDATE policies on this table both correctly do this
-- check (via an EXISTS against `couples`); INSERT was the one gap.
--
-- Impact: an authenticated user could insert a custom_dates row with their
-- own user_id but an arbitrary couple_id belonging to a different couple.
-- Because SELECT/UPDATE are couple-scoped, that planted row becomes
-- visible (and even editable) to the real members of the victim couple —
-- but not deletable by them, since the delete flow (app/api/dates/delete/*)
-- authorizes against the row's own user_id/shared_with fields, which point
-- to the attacker, not the victim couple.
--
-- Fix: require the same couple-membership check INSERT that SELECT/UPDATE
-- already have. couple_id IS NULL is still allowed (matches current app
-- behavior for a user without a couple row yet — dates/custom/page.js sets
-- couple_id to null in that case) — this only closes the case where a
-- couple_id IS supplied and doesn't actually belong to the caller.
--
-- Run this once in the Supabase SQL Editor.

ALTER POLICY "Users can insert their own custom dates" ON public.custom_dates
WITH CHECK (
  auth.uid() = user_id
  AND (
    couple_id IS NULL
    OR EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = custom_dates.couple_id
        AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
    )
  )
);

-- Verify after running:
-- select policyname, cmd, qual, with_check from pg_policies where tablename = 'custom_dates';
-- The INSERT row's with_check should now include the EXISTS clause above.
