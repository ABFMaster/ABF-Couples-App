-- Google Places Date Suggestions Schema
--
-- This table stores Google Places API results saved per couple.
-- It is SEPARATE from the global curated `date_suggestions` table in date_night.sql.
-- That table holds admin-seeded ideas; this one holds couple-specific saved places
-- discovered via the Google Places Nearby Search API.
--
-- Table name: couple_date_places

-- ============================================
-- COUPLE DATE PLACES TABLE
-- ============================================
CREATE TABLE couple_date_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,

  -- Google Places reference
  place_id TEXT NOT NULL,  -- Google Places ID for deduplication and re-fetching

  -- Suggestion details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,  -- 'romantic_dinner', 'adventure', 'culture', 'nightlife', etc.

  -- Location
  location_name TEXT,
  address TEXT,
  latitude DECIMAL,
  longitude DECIMAL,

  -- Details from Google Places
  price_level INTEGER,  -- 1-4 ($ to $$$$)
  rating DECIMAL,       -- Google rating (0.0 - 5.0)
  photo_url TEXT,
  website_url TEXT,
  maps_url TEXT,

  -- Metadata
  source TEXT NOT NULL DEFAULT 'google_places'
    CHECK (source IN ('google_places', 'manual', 'community')),
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate places per couple
  UNIQUE(couple_id, place_id)
);

-- Indexes
CREATE INDEX idx_couple_date_places_couple ON couple_date_places(couple_id);
CREATE INDEX idx_couple_date_places_category ON couple_date_places(couple_id, category);
CREATE INDEX idx_couple_date_places_favorites ON couple_date_places(couple_id, is_favorite);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE couple_date_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couples can view own saved places"
  ON couple_date_places FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "Couples can save places"
  ON couple_date_places FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "Couples can update own saved places"
  ON couple_date_places FOR UPDATE
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "Couples can delete own saved places"
  ON couple_date_places FOR DELETE
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );
