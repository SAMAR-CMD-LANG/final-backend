-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255), -- Will be null for Google SSO users
    google_id VARCHAR(255) UNIQUE, -- For Google SSO
    display_name VARCHAR(255), -- For Google SSO profile display
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habits table for daily habit tracking
CREATE TABLE IF NOT EXISTS habits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- Category/tag for filtering
    is_archived BOOLEAN DEFAULT false, -- For active/archived filtering
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habit completions table for tracking daily completions
CREATE TABLE IF NOT EXISTS habit_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completion_date DATE NOT NULL,
    completed BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(habit_id, completion_date) -- Ensure one completion per habit per day
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_category ON habits(category);
CREATE INDEX IF NOT EXISTS idx_habits_archived ON habits(is_archived);
CREATE INDEX IF NOT EXISTS idx_habits_created_at ON habits(created_at);
CREATE INDEX IF NOT EXISTS idx_habits_current_streak ON habits(current_streak);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id ON habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_id ON habit_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(completion_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_habits_updated_at ON habits;
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON habits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();