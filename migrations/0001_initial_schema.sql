-- ユーザー設定テーブル
CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  faculty TEXT NOT NULL,
  department TEXT NOT NULL,
  admission_year INTEGER NOT NULL,
  grade_requirements TEXT, -- JSON形式で保存
  graduation_requirements TEXT, -- JSON形式で保存
  grade_display_format TEXT DEFAULT 'japanese', -- 'japanese' or 'alphabet'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 講義情報テーブル
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_code TEXT UNIQUE NOT NULL,
  course_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  faculty TEXT,
  department TEXT,
  classroom TEXT,
  instructor TEXT,
  class_group TEXT,
  target_students TEXT,
  starts_at_nine BOOLEAN DEFAULT FALSE,
  credits INTEGER DEFAULT 1,
  course_type TEXT, -- 'required', 'elective', 'general'
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 講義スケジュールテーブル（1つの講義が複数の時間帯を持つ可能性があるため）
CREATE TABLE IF NOT EXISTS course_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  day_of_week TEXT NOT NULL, -- 'monday', 'tuesday', etc.
  period INTEGER NOT NULL, -- 1, 2, 3, 4, 5, etc.
  quarter TEXT NOT NULL, -- 'Q1', 'Q2', 'Q3', 'Q4', 'full_year', 'Q1-Q2', 'Q3-Q4'
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 履修登録テーブル
CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT 1, -- 今回は単一ユーザーなので固定
  course_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  quarter TEXT NOT NULL,
  status TEXT DEFAULT 'registered', -- 'registered', 'completed', 'failed', 'dropped'
  grade TEXT, -- '秀', '優', '良', '可', '不可', 'A', 'B', 'C', 'D', 'E'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE(user_id, course_id, year, quarter)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);
CREATE INDEX IF NOT EXISTS idx_courses_department ON courses(department);
CREATE INDEX IF NOT EXISTS idx_course_schedules_course_id ON course_schedules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_schedules_quarter ON course_schedules(quarter);
CREATE INDEX IF NOT EXISTS idx_registrations_user_course ON registrations(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_registrations_year_quarter ON registrations(year, quarter);