-- Migration: Add Google Places columns and post-date reflection fields to date_plans
-- Run this in Supabase SQL editor

ALTER TABLE date_plans
  -- Google Place reference
  ADD COLUMN IF NOT EXISTS place_id TEXT,           -- Google Places place_id
  ADD COLUMN IF NOT EXISTS location_name TEXT,       -- Venue name
  ADD COLUMN IF NOT EXISTS address TEXT,             -- Street address
  ADD COLUMN IF NOT EXISTS latitude DECIMAL,
  ADD COLUMN IF NOT EXISTS longitude DECIMAL,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,           -- Google Places photo URL
  ADD COLUMN IF NOT EXISTS maps_url TEXT,            -- google.com/maps link

  -- Post-date reflection (filled when marking complete)
  ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS reflection_notes TEXT;

-- Index for place_id lookups (deduplication)
CREATE INDEX IF NOT EXISTS idx_date_plans_place_id ON date_plans(place_id);
