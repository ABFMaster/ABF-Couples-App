-- User Profiles Database Setup for ABF
-- Run this in Supabase SQL Editor

-- =============================================
-- TABLE: user_profiles
-- Individual user profile with preferences
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Love Languages
  love_language_primary TEXT CHECK (love_language_primary IN ('words', 'time', 'acts', 'gifts', 'touch')),
  love_language_secondary TEXT CHECK (love_language_secondary IN ('words', 'time', 'acts', 'gifts', 'touch')),

  -- Communication & Conflict
  communication_style TEXT[] DEFAULT '{}',
  conflict_style TEXT CHECK (conflict_style IN ('talk_immediately', 'need_space', 'write_it_out', 'avoid')),

  -- Values & Interests
  top_values TEXT[] DEFAULT '{}',
  hobbies TEXT[] DEFAULT '{}',
  date_preferences TEXT[] DEFAULT '{}',

  -- Preferences
  preferred_checkin_time TEXT CHECK (preferred_checkin_time IN ('morning', 'afternoon', 'evening', 'night')),
  stress_response TEXT,

  -- Metadata
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY "Users can read own profile" ON public.user_profiles
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Partners can read each other's profiles (for insights)
CREATE POLICY "Partners can read each other profiles" ON public.user_profiles
  FOR SELECT USING (
    user_id IN (
      SELECT user1_id FROM public.couples WHERE user2_id = auth.uid()
      UNION
      SELECT user2_id FROM public.couples WHERE user1_id = auth.uid()
    )
  );

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_completed ON public.user_profiles(user_id) WHERE completed_at IS NOT NULL;

-- =============================================
-- FUNCTION: Check if user has completed profile
-- =============================================
CREATE OR REPLACE FUNCTION has_completed_profile(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.user_profiles
    WHERE user_id = p_user_id
    AND completed_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION has_completed_profile(UUID) TO authenticated;

-- =============================================
-- FUNCTION: Get partner's profile for insights
-- =============================================
CREATE OR REPLACE FUNCTION get_partner_profile(p_user_id UUID)
RETURNS TABLE (
  love_language_primary TEXT,
  love_language_secondary TEXT,
  communication_style TEXT[],
  conflict_style TEXT,
  top_values TEXT[],
  hobbies TEXT[],
  date_preferences TEXT[],
  preferred_checkin_time TEXT,
  stress_response TEXT
) AS $$
DECLARE
  v_partner_id UUID;
BEGIN
  -- Find partner ID
  SELECT
    CASE
      WHEN user1_id = p_user_id THEN user2_id
      ELSE user1_id
    END INTO v_partner_id
  FROM public.couples
  WHERE user1_id = p_user_id OR user2_id = p_user_id;

  IF v_partner_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    up.love_language_primary,
    up.love_language_secondary,
    up.communication_style,
    up.conflict_style,
    up.top_values,
    up.hobbies,
    up.date_preferences,
    up.preferred_checkin_time,
    up.stress_response
  FROM public.user_profiles up
  WHERE up.user_id = v_partner_id
  AND up.completed_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_partner_profile(UUID) TO authenticated;
