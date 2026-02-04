-- Add timezone column to profiles table
-- Default to America/Los_Angeles (PT) since existing data was entered in that timezone

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles';

-- Add comment for documentation
COMMENT ON COLUMN profiles.timezone IS 'IANA timezone identifier (e.g., America/Los_Angeles)';
