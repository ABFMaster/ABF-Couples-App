-- ==============================================
-- ABF Trip Planning Feature - Database Schema
-- ==============================================
-- Run this in Supabase SQL Editor to set up the trips feature

-- ============================================
-- TABLE: trips
-- Core trip information for couples
-- ============================================
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  trip_type TEXT CHECK (trip_type IN ('adventure', 'relaxation', 'cultural', 'romantic', 'mixed')),
  budget_level INTEGER CHECK (budget_level BETWEEN 1 AND 4),
  description TEXT,
  cover_photo_url TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'upcoming', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: trip_itinerary
-- Day-by-day activities for each trip
-- ============================================
CREATE TABLE trip_itinerary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  day_number INTEGER NOT NULL,
  activity_type TEXT CHECK (activity_type IN ('flight', 'hotel', 'restaurant', 'activity', 'transport', 'other')),
  title TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  confirmation_number TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: trip_packing
-- Shared packing list for trips
-- ============================================
CREATE TABLE trip_packing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  item TEXT NOT NULL,
  category TEXT CHECK (category IN ('clothes', 'toiletries', 'documents', 'electronics', 'medicine', 'other')),
  is_packed BOOLEAN DEFAULT FALSE,
  packed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: trip_photos
-- Photos uploaded after/during trip
-- ============================================
CREATE TABLE trip_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id),
  photo_url TEXT NOT NULL,
  caption TEXT,
  taken_on DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_itinerary ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_packing ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_photos ENABLE ROW LEVEL SECURITY;

-- TRIPS Policies
CREATE POLICY "Users can view their couple's trips"
  ON trips FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert trips for their couple"
  ON trips FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their couple's trips"
  ON trips FOR UPDATE
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their couple's trips"
  ON trips FOR DELETE
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- TRIP_ITINERARY Policies
CREATE POLICY "Users can view their couple's itinerary"
  ON trip_itinerary FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips
      WHERE couple_id IN (
        SELECT id FROM couples
        WHERE user1_id = auth.uid() OR user2_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert itinerary items"
  ON trip_itinerary FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips
      WHERE couple_id IN (
        SELECT id FROM couples
        WHERE user1_id = auth.uid() OR user2_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update itinerary items"
  ON trip_itinerary FOR UPDATE
  USING (
    trip_id IN (
      SELECT id FROM trips
      WHERE couple_id IN (
        SELECT id FROM couples
        WHERE user1_id = auth.uid() OR user2_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete itinerary items"
  ON trip_itinerary FOR DELETE
  USING (
    trip_id IN (
      SELECT id FROM trips
      WHERE couple_id IN (
        SELECT id FROM couples
        WHERE user1_id = auth.uid() OR user2_id = auth.uid()
      )
    )
  );

-- TRIP_PACKING Policies
CREATE POLICY "Users can view their couple's packing list"
  ON trip_packing FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips
      WHERE couple_id IN (
        SELECT id FROM couples
        WHERE user1_id = auth.uid() OR user2_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert packing items"
  ON trip_packing FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips
      WHERE couple_id IN (
        SELECT id FROM couples
        WHERE user1_id = auth.uid() OR user2_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update packing items"
  ON trip_packing FOR UPDATE
  USING (
    trip_id IN (
      SELECT id FROM trips
      WHERE couple_id IN (
        SELECT id FROM couples
        WHERE user1_id = auth.uid() OR user2_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete packing items"
  ON trip_packing FOR DELETE
  USING (
    trip_id IN (
      SELECT id FROM trips
      WHERE couple_id IN (
        SELECT id FROM couples
        WHERE user1_id = auth.uid() OR user2_id = auth.uid()
      )
    )
  );

-- TRIP_PHOTOS Policies
CREATE POLICY "Users can view their couple's trip photos"
  ON trip_photos FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips
      WHERE couple_id IN (
        SELECT id FROM couples
        WHERE user1_id = auth.uid() OR user2_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert trip photos"
  ON trip_photos FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips
      WHERE couple_id IN (
        SELECT id FROM couples
        WHERE user1_id = auth.uid() OR user2_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete trip photos"
  ON trip_photos FOR DELETE
  USING (
    trip_id IN (
      SELECT id FROM trips
      WHERE couple_id IN (
        SELECT id FROM couples
        WHERE user1_id = auth.uid() OR user2_id = auth.uid()
      )
    )
  );

-- ============================================
-- INDEXES for better query performance
-- ============================================
CREATE INDEX idx_trips_couple_id ON trips(couple_id);
CREATE INDEX idx_trips_start_date ON trips(start_date);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trip_itinerary_trip_id ON trip_itinerary(trip_id);
CREATE INDEX idx_trip_itinerary_day_number ON trip_itinerary(day_number);
CREATE INDEX idx_trip_packing_trip_id ON trip_packing(trip_id);
CREATE INDEX idx_trip_photos_trip_id ON trip_photos(trip_id);

-- ============================================
-- TRIGGER: Update trips.updated_at on modification
-- ============================================
CREATE OR REPLACE FUNCTION update_trips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_trips_updated_at();
