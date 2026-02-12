-- Relationship Health Database Setup for ABF
-- Run this in Supabase SQL Editor

-- =============================================
-- TABLE: relationship_health
-- Stores calculated health scores for each couple
-- =============================================
CREATE TABLE IF NOT EXISTS public.relationship_health (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  communication_score INTEGER NOT NULL DEFAULT 0 CHECK (communication_score >= 0 AND communication_score <= 100),
  conflict_score INTEGER NOT NULL DEFAULT 0 CHECK (conflict_score >= 0 AND conflict_score <= 100),
  intimacy_score INTEGER NOT NULL DEFAULT 0 CHECK (intimacy_score >= 0 AND intimacy_score <= 100),
  values_score INTEGER NOT NULL DEFAULT 0 CHECK (values_score >= 0 AND values_score <= 100),
  affection_score INTEGER NOT NULL DEFAULT 0 CHECK (affection_score >= 0 AND affection_score <= 100),
  support_score INTEGER NOT NULL DEFAULT 0 CHECK (support_score >= 0 AND support_score <= 100),
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(couple_id)
);

-- Enable RLS
ALTER TABLE public.relationship_health ENABLE ROW LEVEL SECURITY;

-- Users can only see their own couple's health scores
CREATE POLICY "Users can view own couple health" ON public.relationship_health
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM public.couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Users can insert for their own couple
CREATE POLICY "Users can insert own couple health" ON public.relationship_health
  FOR INSERT WITH CHECK (
    couple_id IN (
      SELECT id FROM public.couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Users can update their own couple's health scores
CREATE POLICY "Users can update own couple health" ON public.relationship_health
  FOR UPDATE USING (
    couple_id IN (
      SELECT id FROM public.couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_relationship_health_couple ON public.relationship_health(couple_id);

-- =============================================
-- FUNCTION: calculate_relationship_health
-- Calculates health scores based on multiple factors:
-- - Onboarding completion & compatibility (30%)
-- - Daily check-in engagement (40%)
-- - Weekly reflections (15%)
-- - Streak bonus (15%)
-- =============================================
CREATE OR REPLACE FUNCTION calculate_relationship_health(p_couple_id UUID)
RETURNS TABLE (
  overall_score INTEGER,
  communication_score INTEGER,
  conflict_score INTEGER,
  intimacy_score INTEGER,
  values_score INTEGER,
  affection_score INTEGER,
  support_score INTEGER
) AS $$
DECLARE
  v_onboarding_score INTEGER := 0;
  v_checkin_score INTEGER := 0;
  v_reflection_score INTEGER := 0;
  v_streak_bonus INTEGER := 0;
  v_overall INTEGER := 0;
  v_communication INTEGER := 0;
  v_conflict INTEGER := 0;
  v_intimacy INTEGER := 0;
  v_values INTEGER := 0;
  v_affection INTEGER := 0;
  v_support INTEGER := 0;
  v_user1_completed BOOLEAN;
  v_user2_completed BOOLEAN;
  v_total_checkins INTEGER;
  v_completed_checkins INTEGER;
  v_weekly_reflections INTEGER;
  v_current_streak INTEGER;
  v_category_checkins RECORD;
BEGIN
  -- =============================================
  -- 1. ONBOARDING SCORE (30% weight)
  -- Both partners completing = full points
  -- =============================================
  SELECT
    EXISTS(SELECT 1 FROM public.onboarding_responses WHERE couple_id = p_couple_id AND user_id = (SELECT user1_id FROM public.couples WHERE id = p_couple_id)),
    EXISTS(SELECT 1 FROM public.onboarding_responses WHERE couple_id = p_couple_id AND user_id = (SELECT user2_id FROM public.couples WHERE id = p_couple_id))
  INTO v_user1_completed, v_user2_completed;

  IF v_user1_completed AND v_user2_completed THEN
    v_onboarding_score := 100;
  ELSIF v_user1_completed OR v_user2_completed THEN
    v_onboarding_score := 50;
  END IF;

  -- =============================================
  -- 2. DAILY CHECK-IN SCORE (40% weight)
  -- Based on completion rate over last 30 days
  -- =============================================
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE user1_answer IS NOT NULL AND user2_answer IS NOT NULL)
  INTO v_total_checkins, v_completed_checkins
  FROM public.daily_checkins
  WHERE couple_id = p_couple_id
    AND date > CURRENT_DATE - INTERVAL '30 days';

  IF v_total_checkins > 0 THEN
    v_checkin_score := LEAST(100, (v_completed_checkins::FLOAT / GREATEST(v_total_checkins, 7) * 100)::INTEGER);
  END IF;

  -- =============================================
  -- 3. WEEKLY REFLECTION SCORE (15% weight)
  -- Based on reflections completed in last 8 weeks
  -- =============================================
  SELECT COUNT(*) INTO v_weekly_reflections
  FROM public.weekly_reflections
  WHERE couple_id = p_couple_id
    AND week_start > CURRENT_DATE - INTERVAL '8 weeks'
    AND user1_completed_at IS NOT NULL
    AND user2_completed_at IS NOT NULL;

  v_reflection_score := LEAST(100, (v_weekly_reflections::FLOAT / 8 * 100)::INTEGER);

  -- =============================================
  -- 4. STREAK BONUS (15% weight)
  -- Current consecutive days streak
  -- =============================================
  SELECT get_checkin_streak(p_couple_id) INTO v_current_streak;

  -- Scale: 7+ days = 100%, scales down from there
  v_streak_bonus := LEAST(100, (v_current_streak::FLOAT / 7 * 100)::INTEGER);

  -- =============================================
  -- 5. CALCULATE OVERALL SCORE
  -- Weighted average of all factors
  -- =============================================
  v_overall := (
    (v_onboarding_score * 0.30) +
    (v_checkin_score * 0.40) +
    (v_reflection_score * 0.15) +
    (v_streak_bonus * 0.15)
  )::INTEGER;

  -- =============================================
  -- 6. CALCULATE CATEGORY SCORES
  -- Based on check-in engagement by category
  -- =============================================
  FOR v_category_checkins IN
    SELECT
      cq.category,
      COUNT(*) FILTER (WHERE dc.user1_answer IS NOT NULL AND dc.user2_answer IS NOT NULL) as completed,
      COUNT(*) as total
    FROM public.daily_checkins dc
    JOIN public.checkin_questions cq ON dc.question_id = cq.id
    WHERE dc.couple_id = p_couple_id
      AND dc.date > CURRENT_DATE - INTERVAL '60 days'
    GROUP BY cq.category
  LOOP
    CASE v_category_checkins.category
      WHEN 'communication' THEN
        v_communication := GREATEST(v_communication, LEAST(100, (v_category_checkins.completed::FLOAT / GREATEST(v_category_checkins.total, 1) * 100 + v_onboarding_score * 0.3)::INTEGER));
      WHEN 'conflict' THEN
        v_conflict := GREATEST(v_conflict, LEAST(100, (v_category_checkins.completed::FLOAT / GREATEST(v_category_checkins.total, 1) * 100 + v_onboarding_score * 0.3)::INTEGER));
      WHEN 'intimacy' THEN
        v_intimacy := GREATEST(v_intimacy, LEAST(100, (v_category_checkins.completed::FLOAT / GREATEST(v_category_checkins.total, 1) * 100 + v_onboarding_score * 0.3)::INTEGER));
      WHEN 'values' THEN
        v_values := GREATEST(v_values, LEAST(100, (v_category_checkins.completed::FLOAT / GREATEST(v_category_checkins.total, 1) * 100 + v_onboarding_score * 0.3)::INTEGER));
      WHEN 'affection' THEN
        v_affection := GREATEST(v_affection, LEAST(100, (v_category_checkins.completed::FLOAT / GREATEST(v_category_checkins.total, 1) * 100 + v_onboarding_score * 0.3)::INTEGER));
      WHEN 'support' THEN
        v_support := GREATEST(v_support, LEAST(100, (v_category_checkins.completed::FLOAT / GREATEST(v_category_checkins.total, 1) * 100 + v_onboarding_score * 0.3)::INTEGER));
    END CASE;
  END LOOP;

  -- Apply base score from onboarding if no check-ins yet
  IF v_onboarding_score > 0 THEN
    v_communication := GREATEST(v_communication, (v_onboarding_score * 0.3)::INTEGER);
    v_conflict := GREATEST(v_conflict, (v_onboarding_score * 0.3)::INTEGER);
    v_intimacy := GREATEST(v_intimacy, (v_onboarding_score * 0.3)::INTEGER);
    v_values := GREATEST(v_values, (v_onboarding_score * 0.3)::INTEGER);
    v_affection := GREATEST(v_affection, (v_onboarding_score * 0.3)::INTEGER);
    v_support := GREATEST(v_support, (v_onboarding_score * 0.3)::INTEGER);
  END IF;

  -- =============================================
  -- 7. UPSERT RESULTS TO TABLE
  -- =============================================
  INSERT INTO public.relationship_health (
    couple_id, overall_score, communication_score, conflict_score,
    intimacy_score, values_score, affection_score, support_score,
    last_calculated_at, updated_at
  ) VALUES (
    p_couple_id, v_overall, v_communication, v_conflict,
    v_intimacy, v_values, v_affection, v_support,
    NOW(), NOW()
  )
  ON CONFLICT (couple_id) DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    communication_score = EXCLUDED.communication_score,
    conflict_score = EXCLUDED.conflict_score,
    intimacy_score = EXCLUDED.intimacy_score,
    values_score = EXCLUDED.values_score,
    affection_score = EXCLUDED.affection_score,
    support_score = EXCLUDED.support_score,
    last_calculated_at = NOW(),
    updated_at = NOW();

  -- Return the calculated scores
  RETURN QUERY SELECT v_overall, v_communication, v_conflict, v_intimacy, v_values, v_affection, v_support;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_relationship_health(UUID) TO authenticated;

-- =============================================
-- TRIGGER: Auto-update health on check-in changes
-- =============================================
CREATE OR REPLACE FUNCTION trigger_update_health_on_checkin()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate health when a check-in is completed
  IF NEW.user1_answer IS NOT NULL AND NEW.user2_answer IS NOT NULL THEN
    PERFORM calculate_relationship_health(NEW.couple_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_health_on_checkin ON public.daily_checkins;
CREATE TRIGGER update_health_on_checkin
  AFTER INSERT OR UPDATE ON public.daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_health_on_checkin();

-- =============================================
-- TRIGGER: Auto-update health on reflection completion
-- =============================================
CREATE OR REPLACE FUNCTION trigger_update_health_on_reflection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user1_completed_at IS NOT NULL AND NEW.user2_completed_at IS NOT NULL THEN
    PERFORM calculate_relationship_health(NEW.couple_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_health_on_reflection ON public.weekly_reflections;
CREATE TRIGGER update_health_on_reflection
  AFTER INSERT OR UPDATE ON public.weekly_reflections
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_health_on_reflection();
