-- Nora hero-slot promotion rotation (task #158)
-- Adds anti-repeat / frequency-cap tracking to hero_cache so the priority-5
-- "quiet slot" (weekends, Friday w/ no ritual, no date within 3 days) can
-- rotate discovery nudges toward underused features (Couples Session, AI
-- Coach, Memory Test, Date Night) without repeating the same one too often.
-- NULL = no promo shown that day (normal Nora observation only).

ALTER TABLE public.hero_cache
  ADD COLUMN IF NOT EXISTS promo_type TEXT DEFAULT NULL;
