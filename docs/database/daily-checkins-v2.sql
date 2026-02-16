-- ============================================================================
-- Daily Check-ins Schema v2
-- ============================================================================
-- Purpose: Track daily emotional check-ins between partners
--
-- Features:
-- - Mood tracking (5-point scale from great to stressed)
-- - Connection score (1-5 rating of how connected they feel to partner)
-- - Rotating questions that change based on assessment results and patterns
-- - One check-in per user per day (enforced by unique constraint)
-- - Streak tracking via helper function
--
-- Related files:
-- - lib/checkin-questions.js: Question bank and smart selection logic
-- - app/dashboard/page.js: Check-in UI component
-- ============================================================================

-- Main check-ins table
-- Stores one record per user per day with their mood, connection score,
-- and response to that day's rotating question
CREATE TABLE daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User who submitted the check-in
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Couple association for partner visibility
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,

  -- Core responses (always collected)
  -- Mood options: 'great', 'good', 'okay', 'down', 'stressed'
  mood TEXT NOT NULL,

  -- How connected do you feel to your partner today? (1-5)
  connection_score INTEGER NOT NULL CHECK (connection_score BETWEEN 1 AND 5),

  -- Rotating question (changes daily based on assessment scores and patterns)
  -- question_id: References question ID from lib/checkin-questions.js
  -- question_text: Stored for historical record (questions may change over time)
  -- question_response: User's free-text or structured response
  question_id TEXT,
  question_text TEXT,
  question_response TEXT,

  -- Metadata
  -- check_date: The calendar date (not timestamp) to enforce one per day
  check_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Ensure only one check-in per user per day
  UNIQUE(user_id, check_date)
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Fast lookup for user's recent check-ins (dashboard, streaks)
CREATE INDEX idx_checkins_user_date ON daily_checkins(user_id, check_date DESC);

-- Fast lookup for couple's check-ins (partner comparison view)
CREATE INDEX idx_checkins_couple_date ON daily_checkins(couple_id, check_date DESC);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
-- Ensures users can only access appropriate data:
-- - Read: Own check-ins + partner's check-ins (for comparison features)
-- - Write: Only own check-ins

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Users can view their own check-ins AND their partner's
-- This enables the "compare moods" feature on the dashboard
CREATE POLICY "Users can view own and partner's check-ins"
  ON daily_checkins FOR SELECT
  USING (
    -- Can always see own check-ins
    auth.uid() = user_id
    -- Can see partner's check-ins if in same couple
    OR EXISTS (
      SELECT 1 FROM couples
      WHERE id = couple_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- INSERT policy: Users can only create their own check-ins
CREATE POLICY "Users can insert own check-ins"
  ON daily_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy: Users can only modify their own check-ins
-- (e.g., if they want to change their response same day)
CREATE POLICY "Users can update own check-ins"
  ON daily_checkins FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Calculate consecutive day streak for a user
-- Used to display "X day streak" badges and gamification elements
--
-- Logic: Starting from today, count backwards how many consecutive days
-- have a check-in record. Breaks when a gap is found.
--
-- Example: If user checked in today, yesterday, and 2 days ago -> returns 3
-- Example: If user checked in today but not yesterday -> returns 1
-- Example: If user hasn't checked in today -> returns 0
CREATE OR REPLACE FUNCTION get_checkin_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER := 0;
  current_check_date DATE := CURRENT_DATE;
BEGIN
  LOOP
    -- Check if there's a check-in for this date
    IF EXISTS (
      SELECT 1 FROM daily_checkins
      WHERE user_id = p_user_id
      AND check_date = current_check_date
    ) THEN
      -- Found a check-in, increment streak and go back one day
      streak := streak + 1;
      current_check_date := current_check_date - INTERVAL '1 day';
    ELSE
      -- No check-in found, streak is broken
      EXIT;
    END IF;
  END LOOP;
  RETURN streak;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Usage Examples
-- ============================================================================

-- Insert a new check-in:
-- INSERT INTO daily_checkins (user_id, couple_id, mood, connection_score, question_id, question_text, question_response)
-- VALUES ('user-uuid', 'couple-uuid', 'good', 4, 'gratitude_1', 'What are you grateful for about your partner today?', 'Their patience with me');

-- Get today's check-in for a user:
-- SELECT * FROM daily_checkins WHERE user_id = 'user-uuid' AND check_date = CURRENT_DATE;

-- Get both partners' check-ins for today:
-- SELECT * FROM daily_checkins WHERE couple_id = 'couple-uuid' AND check_date = CURRENT_DATE;

-- Get user's streak:
-- SELECT get_checkin_streak('user-uuid');

-- Get last 7 days of check-ins for trend analysis:
-- SELECT * FROM daily_checkins
-- WHERE user_id = 'user-uuid'
-- AND check_date >= CURRENT_DATE - INTERVAL '7 days'
-- ORDER BY check_date DESC;
