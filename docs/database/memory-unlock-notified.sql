-- Memory Test unlock notification tracking — Aug 5 2026
--
-- Wires up the previously-drafted-but-never-sent MEMORY_UNLOCK_COPY push
-- (lib/challenge-prompts.js). checkMemoryUnlocked() (lib/memory-unlock.js)
-- already enforces the gate server-side; this column just lets
-- notifyIfMemoryJustUnlocked() know whether the couple has already been
-- told, so a couple who keeps adding timeline events / Spark / Bet
-- responses after unlocking doesn't get the same push again on every
-- subsequent write.

ALTER TABLE couples
  ADD COLUMN IF NOT EXISTS memory_unlock_notified_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN couples.memory_unlock_notified_at IS
  'Set once, the first time this couple crosses the Memory Test unlock threshold and the unlock push has been sent. NULL means not yet unlocked/notified.';
