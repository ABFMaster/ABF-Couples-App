-- ==============================================
-- ABF Song Flirts & Spotify Integration
-- ==============================================
-- Run in Supabase SQL Editor

-- ============================================
-- TABLE: user_spotify_connections
-- Stores Spotify OAuth tokens for each user
-- ============================================
CREATE TABLE user_spotify_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  spotify_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_spotify_user_id ON user_spotify_connections(user_id);

-- Enable RLS
ALTER TABLE user_spotify_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Spotify connection"
  ON user_spotify_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Spotify connection"
  ON user_spotify_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Spotify connection"
  ON user_spotify_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Spotify connection"
  ON user_spotify_connections FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- UPDATE: flirts table for song support
-- Add song metadata columns
-- ============================================
ALTER TABLE flirts ADD COLUMN IF NOT EXISTS spotify_track_id TEXT;
ALTER TABLE flirts ADD COLUMN IF NOT EXISTS spotify_track_name TEXT;
ALTER TABLE flirts ADD COLUMN IF NOT EXISTS spotify_artist TEXT;
ALTER TABLE flirts ADD COLUMN IF NOT EXISTS spotify_album_art TEXT;
ALTER TABLE flirts ADD COLUMN IF NOT EXISTS spotify_preview_url TEXT;
ALTER TABLE flirts ADD COLUMN IF NOT EXISTS spotify_track_url TEXT;

-- Create index for querying song flirts
CREATE INDEX idx_flirts_spotify_track ON flirts(couple_id, spotify_track_id)
  WHERE spotify_track_id IS NOT NULL;

-- Update flirts type check constraint to include 'song'
-- First drop existing constraint if it exists
ALTER TABLE flirts DROP CONSTRAINT IF EXISTS flirts_type_check;

-- Add updated constraint with 'song' type
ALTER TABLE flirts ADD CONSTRAINT flirts_type_check
  CHECK (type IN ('text', 'gif', 'photo', 'song'));

-- ============================================
-- TRIGGER: Update timestamp on modification
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_spotify_connections_updated_at'
  ) THEN
    CREATE TRIGGER update_user_spotify_connections_updated_at
      BEFORE UPDATE ON user_spotify_connections
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
