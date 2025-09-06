-- 講義テーブルに開講年度を追加
ALTER TABLE courses ADD COLUMN course_year INTEGER DEFAULT 2024;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_courses_year ON courses(course_year);