-- Flirts Database Setup for ABF
-- Run this in Supabase SQL Editor

-- =============================================
-- TABLE: flirts
-- Stores multi-modal flirts between partners
-- =============================================
CREATE TABLE IF NOT EXISTS public.flirts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'gif', 'photo', 'combo')),
  message TEXT,
  gif_url TEXT,
  gif_id TEXT,
  photo_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  hearted BOOLEAN DEFAULT FALSE,
  reply TEXT,
  replied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.flirts ENABLE ROW LEVEL SECURITY;

-- Users can read their couple's flirts
CREATE POLICY "Users can read their couple flirts" ON public.flirts
  FOR SELECT USING (
    couple_id IN (
      SELECT id FROM public.couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Users can insert flirts (must be sender)
CREATE POLICY "Users can insert flirts" ON public.flirts
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Users can update received flirts (for marking read, hearting, replying)
CREATE POLICY "Users can update received flirts" ON public.flirts
  FOR UPDATE USING (receiver_id = auth.uid());

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_flirts_couple ON public.flirts(couple_id);
CREATE INDEX IF NOT EXISTS idx_flirts_sender ON public.flirts(sender_id);
CREATE INDEX IF NOT EXISTS idx_flirts_receiver ON public.flirts(receiver_id);
CREATE INDEX IF NOT EXISTS idx_flirts_created_at ON public.flirts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flirts_unread ON public.flirts(receiver_id, is_read) WHERE is_read = FALSE;

-- =============================================
-- FUNCTION: Get unread flirt count
-- =============================================
CREATE OR REPLACE FUNCTION get_unread_flirt_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.flirts
  WHERE receiver_id = p_user_id
    AND is_read = FALSE;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_unread_flirt_count(UUID) TO authenticated;

-- =============================================
-- FUNCTION: Check if both sent flirts today (bonus)
-- =============================================
CREATE OR REPLACE FUNCTION check_mutual_flirts_today(p_couple_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user1_sent BOOLEAN;
  v_user2_sent BOOLEAN;
  v_user1_id UUID;
  v_user2_id UUID;
BEGIN
  SELECT user1_id, user2_id INTO v_user1_id, v_user2_id
  FROM public.couples WHERE id = p_couple_id;

  SELECT EXISTS(
    SELECT 1 FROM public.flirts
    WHERE sender_id = v_user1_id
      AND couple_id = p_couple_id
      AND DATE(created_at) = CURRENT_DATE
  ) INTO v_user1_sent;

  SELECT EXISTS(
    SELECT 1 FROM public.flirts
    WHERE sender_id = v_user2_id
      AND couple_id = p_couple_id
      AND DATE(created_at) = CURRENT_DATE
  ) INTO v_user2_sent;

  RETURN v_user1_sent AND v_user2_sent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_mutual_flirts_today(UUID) TO authenticated;
