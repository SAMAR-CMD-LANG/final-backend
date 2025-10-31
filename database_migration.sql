-- Migration script to add filtering and sorting features to existing habits table
-- Run this if you already have the habits table created

-- Add new columns for filtering and sorting
ALTER TABLE habits 
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Add new indexes for better performance
CREATE INDEX IF NOT EXISTS idx_habits_category ON habits(category);
CREATE INDEX IF NOT EXISTS idx_habits_archived ON habits(is_archived);
CREATE INDEX IF NOT EXISTS idx_habits_created_at ON habits(created_at);
CREATE INDEX IF NOT EXISTS idx_habits_current_streak ON habits(current_streak);

-- Update existing habits to not be archived by default
UPDATE habits SET is_archived = false WHERE is_archived IS NULL;