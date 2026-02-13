-- ============================================
-- Relationship Assessments Table
-- ============================================
-- Stores the 5-module relationship assessment data for each user.
-- Each user in a couple completes their own assessment independently.
--
-- Assessment flow:
-- 1. User starts assessment -> row created with answers = {}
-- 2. User progresses through questions -> answers updated via saveProgress()
-- 3. User completes assessment -> completed_at set, module_results calculated
--
-- After both partners complete, they can compare results.
-- ============================================

CREATE TABLE IF NOT EXISTS relationship_assessments (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,

  -- Assessment data (JSONB for flexibility)
  -- Format: { "kp_1": 4, "kp_2": 3, "le_1": { "words": 1, "time": 3, ... }, ... }
  answers JSONB DEFAULT '{}',

  -- Computed results after completion
  -- Format: {
  --   "modules": [{ moduleId, title, score, percentage, strengthLevel, insights }],
  --   "overallPercentage": 72,
  --   "completedAt": "2024-01-15T10:30:00Z"
  -- }
  module_results JSONB DEFAULT '{}',

  -- Timestamps
  completed_at TIMESTAMP WITH TIME ZONE,  -- NULL until assessment is finished
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes for common queries
-- ============================================

-- Find user's assessments quickly
CREATE INDEX IF NOT EXISTS idx_assessments_user
  ON relationship_assessments(user_id);

-- Find all assessments for a couple (for comparison view)
CREATE INDEX IF NOT EXISTS idx_assessments_couple
  ON relationship_assessments(couple_id);

-- Find completed assessments efficiently
CREATE INDEX IF NOT EXISTS idx_assessments_completed
  ON relationship_assessments(completed_at)
  WHERE completed_at IS NOT NULL;

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE relationship_assessments ENABLE ROW LEVEL SECURITY;

-- Users can view their own assessments
CREATE POLICY "Users can view own assessments"
  ON relationship_assessments FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view partner's COMPLETED assessments (for comparison)
CREATE POLICY "Users can view partner completed assessments"
  ON relationship_assessments FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
    AND completed_at IS NOT NULL
  );

-- Users can insert their own assessments
CREATE POLICY "Users can insert own assessments"
  ON relationship_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own assessments (for saving progress)
CREATE POLICY "Users can update own assessments"
  ON relationship_assessments FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- Trigger to auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_assessment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_assessment_timestamp
  BEFORE UPDATE ON relationship_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_timestamp();

-- ============================================
-- Example Queries
-- ============================================

-- Get user's latest incomplete assessment (for resume)
-- SELECT * FROM relationship_assessments
-- WHERE user_id = $1 AND couple_id = $2 AND completed_at IS NULL
-- ORDER BY created_at DESC LIMIT 1;

-- Get user's latest completed assessment (for results)
-- SELECT * FROM relationship_assessments
-- WHERE user_id = $1 AND couple_id = $2 AND completed_at IS NOT NULL
-- ORDER BY completed_at DESC LIMIT 1;

-- Get both partners' assessments for comparison
-- SELECT ra.*, p.first_name
-- FROM relationship_assessments ra
-- JOIN profiles p ON ra.user_id = p.id
-- WHERE ra.couple_id = $1 AND ra.completed_at IS NOT NULL
-- ORDER BY ra.completed_at DESC;

-- ============================================
-- Migration Notes
-- ============================================
--
-- This table replaces the older onboarding_responses table.
-- The new schema supports:
-- - 5 assessment modules with 6 questions each (30 total)
-- - Multiple question types: scale, choice, ranking
-- - Per-module insights with strength levels
-- - Partner comparison when both complete
--
-- To migrate:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Deploy updated app/assessment/page.js
-- 3. Old onboarding_responses data can be archived (not deleted)
-- ============================================
