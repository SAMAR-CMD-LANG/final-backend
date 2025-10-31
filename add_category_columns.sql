-- Add missing columns to existing habits table (safe, non-destructive)
ALTER TABLE habits ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE habits ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Add indexes for the new columns (safe, non-destructive)
CREATE INDEX IF NOT EXISTS idx_habits_category ON habits(category);
CREATE INDEX IF NOT EXISTS idx_habits_archived ON habits(is_archived);