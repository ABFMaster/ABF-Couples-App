-- Daily Check-ins Database Setup for ABF
-- Run this in Supabase SQL Editor

-- =============================================
-- TABLE: checkin_questions
-- Stores all possible daily check-in questions
-- =============================================
CREATE TABLE IF NOT EXISTS public.checkin_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('communication', 'conflict', 'intimacy', 'values', 'affection', 'support')),
  question TEXT NOT NULL,
  tone TEXT NOT NULL CHECK (tone IN ('gratitude', 'fun', 'meaningful', 'deep')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.checkin_questions ENABLE ROW LEVEL SECURITY;

-- Everyone can read questions (they're not sensitive)
CREATE POLICY "Anyone can read questions" ON public.checkin_questions
  FOR SELECT USING (true);

-- =============================================
-- TABLE: daily_checkins
-- Stores daily check-in responses for each couple
-- =============================================
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.checkin_questions(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  user1_answer TEXT,
  user1_answered_at TIMESTAMP WITH TIME ZONE,
  user1_hearted BOOLEAN DEFAULT FALSE,
  user1_comment TEXT,
  user2_answer TEXT,
  user2_answered_at TIMESTAMP WITH TIME ZONE,
  user2_hearted BOOLEAN DEFAULT FALSE,
  user2_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(couple_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

-- Users can only see their own couple's check-ins
CREATE POLICY "Users can view own couple check-ins" ON public.daily_checkins
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM public.couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Users can insert for their own couple
CREATE POLICY "Users can insert own couple check-ins" ON public.daily_checkins
  FOR INSERT WITH CHECK (
    couple_id IN (
      SELECT id FROM public.couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Users can update their own couple's check-ins
CREATE POLICY "Users can update own couple check-ins" ON public.daily_checkins
  FOR UPDATE USING (
    couple_id IN (
      SELECT id FROM public.couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- =============================================
-- TABLE: weekly_reflections
-- Stores weekly reflection picks for each couple
-- =============================================
CREATE TABLE IF NOT EXISTS public.weekly_reflections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  user1_favorite_checkin_id UUID REFERENCES public.daily_checkins(id),
  user1_reason TEXT,
  user1_completed_at TIMESTAMP WITH TIME ZONE,
  user2_favorite_checkin_id UUID REFERENCES public.daily_checkins(id),
  user2_reason TEXT,
  user2_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(couple_id, week_start)
);

-- Enable RLS
ALTER TABLE public.weekly_reflections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own couple's reflections
CREATE POLICY "Users can view own couple reflections" ON public.weekly_reflections
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM public.couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Users can insert for their own couple
CREATE POLICY "Users can insert own couple reflections" ON public.weekly_reflections
  FOR INSERT WITH CHECK (
    couple_id IN (
      SELECT id FROM public.couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Users can update their own couple's reflections
CREATE POLICY "Users can update own couple reflections" ON public.weekly_reflections
  FOR UPDATE USING (
    couple_id IN (
      SELECT id FROM public.couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- =============================================
-- TABLE: relationship_points
-- Tracks engagement points for gamification
-- =============================================
CREATE TABLE IF NOT EXISTS public.relationship_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  action TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.relationship_points ENABLE ROW LEVEL SECURITY;

-- Users can view their own couple's points
CREATE POLICY "Users can view own couple points" ON public.relationship_points
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM public.couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Users can insert points for their own couple
CREATE POLICY "Users can insert own couple points" ON public.relationship_points
  FOR INSERT WITH CHECK (
    couple_id IN (
      SELECT id FROM public.couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_daily_checkins_couple_date ON public.daily_checkins(couple_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_date ON public.daily_checkins(date);
CREATE INDEX IF NOT EXISTS idx_weekly_reflections_couple_week ON public.weekly_reflections(couple_id, week_start);
CREATE INDEX IF NOT EXISTS idx_relationship_points_couple ON public.relationship_points(couple_id);
CREATE INDEX IF NOT EXISTS idx_relationship_points_user ON public.relationship_points(user_id);

-- =============================================
-- SEED DATA: 30 Starter Questions
-- Mix of categories and tones
-- =============================================

-- GRATITUDE TONE (12 questions)
-- Communication + Gratitude
INSERT INTO public.checkin_questions (category, question, tone) VALUES
('communication', 'What made you smile about your partner today?', 'gratitude'),
('communication', 'What''s one thing your partner said recently that meant a lot to you?', 'gratitude');

-- Conflict + Gratitude
INSERT INTO public.checkin_questions (category, question, tone) VALUES
('conflict', 'What''s one time your partner handled a disagreement in a way you appreciated?', 'gratitude'),
('conflict', 'How has your partner shown patience with you lately?', 'gratitude');

-- Intimacy + Gratitude
INSERT INTO public.checkin_questions (category, question, tone) VALUES
('intimacy', 'What quality of your partner are you most thankful for right now?', 'gratitude'),
('intimacy', 'What''s a small moment of connection with your partner you''re grateful for?', 'gratitude');

-- Values + Gratitude
INSERT INTO public.checkin_questions (category, question, tone) VALUES
('values', 'What''s one way your partner''s values have positively influenced you?', 'gratitude'),
('values', 'What goal of your partner''s are you most proud of them for pursuing?', 'gratitude');

-- Affection + Gratitude
INSERT INTO public.checkin_questions (category, question, tone) VALUES
('affection', 'What''s one thing your partner did this week that you''re grateful for?', 'gratitude'),
('affection', 'How did your partner make you feel loved recently?', 'gratitude');

-- Support + Gratitude
INSERT INTO public.checkin_questions (category, question, tone) VALUES
('support', 'When did your partner show up for you in a way that mattered?', 'gratitude'),
('support', 'What''s something your partner does that makes your life easier?', 'gratitude');

-- FUN TONE (8 questions)
-- Communication + Fun
INSERT INTO public.checkin_questions (category, question, tone) VALUES
('communication', 'What''s the funniest thing your partner said recently?', 'fun'),
('communication', 'If your partner was a TV character, who would they be?', 'fun');

-- Affection + Fun
INSERT INTO public.checkin_questions (category, question, tone) VALUES
('affection', 'If your partner was a food, what would they be and why?', 'fun'),
('affection', 'What superpower would your partner have?', 'fun');

-- Support + Fun
INSERT INTO public.checkin_questions (category, question, tone) VALUES
('support', 'What''s your partner''s most endearing quirk?', 'fun'),
('support', 'What would your partner''s theme song be?', 'fun');

-- Values + Fun
INSERT INTO public.checkin_questions (category, question, tone) VALUES
('values', 'If you and your partner had a couples superhero name, what would it be?', 'fun'),
('values', 'What''s the best adventure you''ve had with your partner?', 'fun');

-- MEANINGFUL TONE (8 questions)
-- Communication + Meaningful
INSERT INTO public.checkin_questions (category, question, tone) VALUES
('communication', 'What''s one way your partner has helped you grow?', 'meaningful'),
('communication', 'What''s something your partner taught you about yourself?', 'meaningful');

-- Conflict + Meaningful
INSERT INTO public.checkin_questions (category, question, tone) VALUES
('conflict', 'What do you appreciate about how your partner handles challenges?', 'meaningful'),
('conflict', 'How has working through a disagreement made your relationship stronger?', 'meaningful');

-- Intimacy + Meaningful
INSERT INTO public.checkin_questions (category, question, tone) VALUES
('intimacy', 'What makes you feel most connected to your partner?', 'meaningful'),
('intimacy', 'What''s a memory with your partner that you treasure?', 'meaningful');

-- Support + Meaningful
INSERT INTO public.checkin_questions (category, question, tone) VALUES
('support', 'How has your partner supported your dreams?', 'meaningful'),
('support', 'What strength does your partner bring to your relationship?', 'meaningful');

-- DEEP TONE (2 questions)
-- Intimacy + Deep
INSERT INTO public.checkin_questions (category, question, tone) VALUES
('intimacy', 'What''s something you''ve been wanting to share with your partner?', 'deep');

-- Values + Deep
INSERT INTO public.checkin_questions (category, question, tone) VALUES
('values', 'How has your partner changed your perspective on something important?', 'deep');

-- =============================================
-- HELPER FUNCTION: Get question for today
-- Considers category weights and recent history
-- =============================================
CREATE OR REPLACE FUNCTION get_daily_question(p_couple_id UUID)
RETURNS UUID AS $$
DECLARE
  v_question_id UUID;
  v_recent_questions UUID[];
BEGIN
  -- Get questions used in last 30 days
  SELECT ARRAY_AGG(question_id) INTO v_recent_questions
  FROM public.daily_checkins
  WHERE couple_id = p_couple_id
    AND date > CURRENT_DATE - INTERVAL '30 days';

  -- Select random question not used recently
  -- Weighted towards gratitude/fun (will be enhanced with compatibility scores)
  SELECT id INTO v_question_id
  FROM public.checkin_questions
  WHERE id != ALL(COALESCE(v_recent_questions, ARRAY[]::UUID[]))
  ORDER BY
    CASE tone
      WHEN 'gratitude' THEN 1
      WHEN 'fun' THEN 1
      WHEN 'meaningful' THEN 2
      WHEN 'deep' THEN 3
    END,
    RANDOM()
  LIMIT 1;

  -- Fallback to any question if all used recently
  IF v_question_id IS NULL THEN
    SELECT id INTO v_question_id
    FROM public.checkin_questions
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;

  RETURN v_question_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER FUNCTION: Calculate streak
-- Returns current consecutive days streak
-- =============================================
CREATE OR REPLACE FUNCTION get_checkin_streak(p_couple_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_streak INTEGER := 0;
  v_check_date DATE := CURRENT_DATE;
  v_has_checkin BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.daily_checkins
      WHERE couple_id = p_couple_id
        AND date = v_check_date
        AND user1_answer IS NOT NULL
        AND user2_answer IS NOT NULL
    ) INTO v_has_checkin;

    IF v_has_checkin THEN
      v_streak := v_streak + 1;
      v_check_date := v_check_date - INTERVAL '1 day';
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN v_streak;
END;
$$ LANGUAGE plpgsql;
