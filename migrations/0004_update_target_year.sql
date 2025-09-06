-- Add target_year column as INTEGER
ALTER TABLE courses ADD COLUMN target_year INTEGER;

-- Add current_grade column to user_settings
ALTER TABLE user_settings ADD COLUMN current_grade INTEGER;