-- ============================================
-- V3 Migration: AI Assistant Feature
-- ============================================

-- 1. AI Model Enum
CREATE TYPE ai_model AS ENUM ('claude-opus-4-20250514', 'claude-sonnet-4-20250514');

-- 2. Message Role Enum
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');

-- 3. Proposed Action Status Enum
CREATE TYPE action_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- 4. Proposed Action Type Enum
CREATE TYPE action_type AS ENUM (
  'create_task',
  'update_task',
  'move_task',
  'complete_task',
  'delete_task',
  'create_project'
);

-- 5. Report Type Enum
CREATE TYPE report_type AS ENUM (
  'daily_briefing',
  'weekly_review',
  'long_term_trends',
  'friction_analysis',
  'estimate_calibration'
);

-- 6. Add AI columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_instructions TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_preferences JSONB DEFAULT '{
  "default_model": "claude-opus-4-20250514",
  "auto_save_conversations": false,
  "conversation_retention_days": 30
}'::jsonb;

-- 7. AI Conversations Table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  model ai_model NOT NULL DEFAULT 'claude-opus-4-20250514',
  is_saved BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  context_summary TEXT,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- AI Conversations RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own ai conversations') THEN
    CREATE POLICY "Users can view own ai conversations"
      ON ai_conversations FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own ai conversations') THEN
    CREATE POLICY "Users can insert own ai conversations"
      ON ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own ai conversations') THEN
    CREATE POLICY "Users can update own ai conversations"
      ON ai_conversations FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own ai conversations') THEN
    CREATE POLICY "Users can delete own ai conversations"
      ON ai_conversations FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated ON ai_conversations(updated_at DESC);

-- 8. AI Messages Table
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  model ai_model,
  tokens_used INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- AI Messages RLS Policies (via conversation ownership)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own ai messages') THEN
    CREATE POLICY "Users can view own ai messages"
      ON ai_messages FOR SELECT
      USING (
        conversation_id IN (
          SELECT id FROM ai_conversations WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own ai messages') THEN
    CREATE POLICY "Users can insert own ai messages"
      ON ai_messages FOR INSERT
      WITH CHECK (
        conversation_id IN (
          SELECT id FROM ai_conversations WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON ai_messages(created_at);

-- 9. AI Proposed Actions Table
CREATE TABLE IF NOT EXISTS ai_proposed_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES ai_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  action_type action_type NOT NULL,
  target_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  target_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  proposed_data JSONB NOT NULL,
  original_data JSONB,

  status action_status DEFAULT 'pending',
  applied_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_proposed_actions ENABLE ROW LEVEL SECURITY;

-- AI Proposed Actions RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own ai proposed actions') THEN
    CREATE POLICY "Users can view own ai proposed actions"
      ON ai_proposed_actions FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own ai proposed actions') THEN
    CREATE POLICY "Users can insert own ai proposed actions"
      ON ai_proposed_actions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own ai proposed actions') THEN
    CREATE POLICY "Users can update own ai proposed actions"
      ON ai_proposed_actions FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_proposed_actions_conversation ON ai_proposed_actions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_proposed_actions_status ON ai_proposed_actions(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_ai_proposed_actions_expires ON ai_proposed_actions(expires_at) WHERE status = 'pending';

-- 10. AI Reports Cache Table
CREATE TABLE IF NOT EXISTS ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type report_type NOT NULL,
  parameters JSONB,
  content TEXT NOT NULL,
  data_snapshot JSONB,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

-- AI Reports RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own ai reports') THEN
    CREATE POLICY "Users can view own ai reports"
      ON ai_reports FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own ai reports') THEN
    CREATE POLICY "Users can insert own ai reports"
      ON ai_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own ai reports') THEN
    CREATE POLICY "Users can delete own ai reports"
      ON ai_reports FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_reports_user_type ON ai_reports(user_id, report_type);

-- 11. Trigger to update conversation updated_at
CREATE OR REPLACE FUNCTION update_ai_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ai_conversations_updated_at ON ai_conversations;
CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_ai_conversation_updated_at();

-- 12. Trigger to auto-increment message count
CREATE OR REPLACE FUNCTION increment_ai_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_conversations
  SET message_count = message_count + 1, updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_ai_message_insert ON ai_messages;
CREATE TRIGGER on_ai_message_insert
  AFTER INSERT ON ai_messages
  FOR EACH ROW EXECUTE FUNCTION increment_ai_message_count();

-- 13. Function to expire pending actions (can be called via cron or scheduled)
CREATE OR REPLACE FUNCTION expire_pending_ai_actions()
RETURNS void AS $$
BEGIN
  UPDATE ai_proposed_actions
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
