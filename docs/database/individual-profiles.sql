-- Individual Profiles Table Migration
-- Stores individual profile assessment results for each user
-- This is separate from relationship_assessments which require partner connection

-- Create the individual_profiles table
CREATE TABLE IF NOT EXISTS individual_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Assessment data
  answers JSONB DEFAULT '{}',           -- Raw answers keyed by question ID
  results JSONB DEFAULT '{}',           -- Computed module results and insights

  -- Timestamps
  completed_at TIMESTAMP WITH TIME ZONE,  -- NULL if incomplete
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_individual_profiles_user_id
  ON individual_profiles(user_id);

-- Index for finding completed profiles
CREATE INDEX IF NOT EXISTS idx_individual_profiles_completed
  ON individual_profiles(user_id, completed_at)
  WHERE completed_at IS NOT NULL;

-- Index for finding incomplete profiles (for resume functionality)
CREATE INDEX IF NOT EXISTS idx_individual_profiles_incomplete
  ON individual_profiles(user_id, created_at DESC)
  WHERE completed_at IS NULL;

-- Enable Row Level Security
ALTER TABLE individual_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profiles
CREATE POLICY "Users can view own profiles"
  ON individual_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own profiles
CREATE POLICY "Users can insert own profiles"
  ON individual_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profiles
CREATE POLICY "Users can update own profiles"
  ON individual_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own profiles
CREATE POLICY "Users can delete own profiles"
  ON individual_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_individual_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER individual_profiles_updated_at
  BEFORE UPDATE ON individual_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_individual_profiles_updated_at();

-- Add profile_completed column to profiles table for quick status check
-- (Run this separately if the profiles table already exists)
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Comments for documentation
COMMENT ON TABLE individual_profiles IS 'Stores individual profile assessment results - who I am as a person';
COMMENT ON COLUMN individual_profiles.answers IS 'JSONB object with question IDs as keys and answers as values';
COMMENT ON COLUMN individual_profiles.results IS 'JSONB object containing computed module results, insights, and overall scores';
COMMENT ON COLUMN individual_profiles.completed_at IS 'Timestamp when profile was completed. NULL indicates in-progress assessment';

/*
Expected JSONB structure for 'results':
{
  "modules": [
    {
      "moduleId": "processing_style",
      "title": "Processing Style",
      "percentage": 85,
      "traits": { "analytical": 6, "intuitive": 3 },
      "insights": {
        "headline": "The Thoughtful Analyst",
        "description": "You approach life with careful consideration...",
        "strengths": ["Thorough decision-making", "Attention to detail"],
        "tips": ["Notice when you default to analysis vs. intuition", ...]
      }
    },
    // ... other modules
  ],
  "overallPercentage": 78,
  "completedAt": "2024-01-15T10:30:00Z"
}
*/
