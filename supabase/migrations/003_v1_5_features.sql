-- ============================================
-- V1.5 Migration: Energy, Dependencies, Focus Timer, Brain Dump
-- ============================================

-- 1. Energy Level
CREATE TYPE energy_level AS ENUM ('low', 'medium', 'high');
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS energy_level energy_level;

-- 2. Task Dependencies
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES tasks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_blocked_by ON tasks(blocked_by) WHERE blocked_by IS NOT NULL;

-- 3. Focus Sessions Table
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

-- Focus Sessions RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own focus sessions') THEN
    CREATE POLICY "Users can view own focus sessions"
      ON focus_sessions FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own focus sessions') THEN
    CREATE POLICY "Users can insert own focus sessions"
      ON focus_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own focus sessions') THEN
    CREATE POLICY "Users can update own focus sessions"
      ON focus_sessions FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_task ON focus_sessions(task_id);

-- 4. Brain Dump Sessions Table (for Smart Parser history)
CREATE TABLE IF NOT EXISTS brain_dump_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  default_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  raw_input TEXT NOT NULL,
  parsed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE brain_dump_sessions ENABLE ROW LEVEL SECURITY;

-- Brain Dump RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own brain dumps') THEN
    CREATE POLICY "Users can view own brain dumps"
      ON brain_dump_sessions FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own brain dumps') THEN
    CREATE POLICY "Users can insert own brain dumps"
      ON brain_dump_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Link tasks to brain dump source (optional tracking)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS brain_dump_id UUID REFERENCES brain_dump_sessions(id) ON DELETE SET NULL;
