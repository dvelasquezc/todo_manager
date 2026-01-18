-- ============================================
-- V2 Migration: Update Task Date Fields
-- ============================================
-- Replace due_date_best/due_date_worst with start_date/due_date

-- Remove old columns
ALTER TABLE tasks DROP COLUMN IF EXISTS due_date_best;
ALTER TABLE tasks DROP COLUMN IF EXISTS due_date_worst;

-- Add new columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;

-- Add index for calendar queries
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date) WHERE start_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
