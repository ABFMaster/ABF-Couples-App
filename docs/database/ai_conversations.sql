-- AI Conversations Database Setup for ABF
-- Run this in Supabase SQL Editor

-- =============================================
-- TABLE: ai_conversations
-- Stores conversation sessions with AI coach
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'solo' CHECK (type IN ('solo', 'shared')),
  title TEXT,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLE: ai_messages
-- Stores individual messages in conversations
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES: ai_conversations
-- =============================================

-- Users can read their own solo conversations
CREATE POLICY "Users can read own solo conversations" ON public.ai_conversations
  FOR SELECT USING (
    user_id = auth.uid() AND type = 'solo'
  );

-- Users can read shared conversations for their couple
CREATE POLICY "Users can read shared conversations" ON public.ai_conversations
  FOR SELECT USING (
    type = 'shared' AND couple_id IN (
      SELECT id FROM public.couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Users can insert their own conversations
CREATE POLICY "Users can insert own conversations" ON public.ai_conversations
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own solo conversations
CREATE POLICY "Users can update own solo conversations" ON public.ai_conversations
  FOR UPDATE USING (user_id = auth.uid() AND type = 'solo');

-- Users can delete their own solo conversations
CREATE POLICY "Users can delete own solo conversations" ON public.ai_conversations
  FOR DELETE USING (user_id = auth.uid() AND type = 'solo');

-- =============================================
-- RLS POLICIES: ai_messages
-- =============================================

-- Users can read messages from their own solo conversations
CREATE POLICY "Users can read messages from own solo conversations" ON public.ai_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM public.ai_conversations
      WHERE user_id = auth.uid() AND type = 'solo'
    )
  );

-- Users can read messages from shared conversations
CREATE POLICY "Users can read messages from shared conversations" ON public.ai_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM public.ai_conversations
      WHERE type = 'shared' AND couple_id IN (
        SELECT id FROM public.couples
        WHERE user1_id = auth.uid() OR user2_id = auth.uid()
      )
    )
  );

-- Users can insert messages into their own conversations
CREATE POLICY "Users can insert messages into own conversations" ON public.ai_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.ai_conversations
      WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_couple ON public.ai_conversations(couple_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_type ON public.ai_conversations(type);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated ON public.ai_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON public.ai_messages(created_at ASC);

-- =============================================
-- FUNCTION: Update conversation timestamp and count
-- =============================================
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ai_conversations
  SET
    updated_at = NOW(),
    message_count = message_count + 1
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update conversation when message is added
DROP TRIGGER IF EXISTS on_ai_message_insert ON public.ai_messages;
CREATE TRIGGER on_ai_message_insert
  AFTER INSERT ON public.ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- =============================================
-- FUNCTION: Get user's message count today (for free tier limits)
-- =============================================
CREATE OR REPLACE FUNCTION get_ai_messages_today(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.ai_messages m
  JOIN public.ai_conversations c ON m.conversation_id = c.id
  WHERE c.user_id = p_user_id
    AND m.role = 'user'
    AND DATE(m.created_at) = CURRENT_DATE;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_ai_messages_today(UUID) TO authenticated;

-- =============================================
-- FUNCTION: Auto-generate conversation title from first message
-- =============================================
CREATE OR REPLACE FUNCTION generate_conversation_title()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update title if it's the first user message and title is null
  IF NEW.role = 'user' THEN
    UPDATE public.ai_conversations
    SET title = LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END
    WHERE id = NEW.conversation_id
      AND title IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate title
DROP TRIGGER IF EXISTS on_ai_message_title ON public.ai_messages;
CREATE TRIGGER on_ai_message_title
  AFTER INSERT ON public.ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION generate_conversation_title();
