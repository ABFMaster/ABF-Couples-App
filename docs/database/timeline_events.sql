-- Timeline Events Table
-- Stores relationship milestones, dates, trips, and custom events for couples

CREATE TABLE timeline_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN ('milestone', 'first_date', 'first_kiss', 'anniversary', 'trip', 'date_night', 'achievement', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,

  -- Photos (array of Supabase Storage URLs)
  photo_urls TEXT[] DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_timeline_events_couple_id ON timeline_events(couple_id);
CREATE INDEX idx_timeline_events_event_date ON timeline_events(event_date);
CREATE INDEX idx_timeline_events_couple_date ON timeline_events(couple_id, event_date);

-- Enable RLS
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Couples can only see/manage their own timeline events

-- SELECT: Users can view events for couples they belong to
CREATE POLICY "Users can view their couple's timeline events"
  ON timeline_events
  FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- INSERT: Users can create events for couples they belong to
CREATE POLICY "Users can create timeline events for their couple"
  ON timeline_events
  FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- UPDATE: Users can update events for couples they belong to
CREATE POLICY "Users can update their couple's timeline events"
  ON timeline_events
  FOR UPDATE
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- DELETE: Users can delete events for couples they belong to
CREATE POLICY "Users can delete their couple's timeline events"
  ON timeline_events
  FOR DELETE
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timeline_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_timeline_events_updated_at
  BEFORE UPDATE ON timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION update_timeline_events_updated_at();

-- Optional: Create storage bucket for timeline photos
-- Run this in Supabase Dashboard > Storage > New Bucket
-- Bucket name: timeline-photos
-- Public: false (use signed URLs for privacy)

-- Storage policies (run in Supabase Dashboard > Storage > Policies)
/*
-- Allow authenticated users to upload photos
CREATE POLICY "Users can upload timeline photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'timeline-photos'
    AND auth.role() = 'authenticated'
  );

-- Allow users to view their couple's photos
CREATE POLICY "Users can view their couple's timeline photos"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'timeline-photos'
    AND auth.role() = 'authenticated'
  );

-- Allow users to delete their uploaded photos
CREATE POLICY "Users can delete their timeline photos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'timeline-photos'
    AND auth.role() = 'authenticated'
  );
*/
