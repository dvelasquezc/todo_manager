-- Add focus indicator to projects
ALTER TABLE projects ADD COLUMN is_focused BOOLEAN DEFAULT FALSE;
