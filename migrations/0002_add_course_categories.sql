-- 講義区分を追加
ALTER TABLE courses ADD COLUMN category TEXT DEFAULT 'general';

-- registrationsテーブルにgrade_pointを追加
ALTER TABLE registrations ADD COLUMN grade_point REAL;

-- 成績評価マスターテーブル
CREATE TABLE IF NOT EXISTS grade_scales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  format TEXT NOT NULL, -- 'japanese' or 'alphabet'
  grade TEXT NOT NULL,
  grade_point REAL NOT NULL,
  min_score INTEGER,
  max_score INTEGER
);

-- 成績評価データを挿入
INSERT OR IGNORE INTO grade_scales (format, grade, grade_point, min_score, max_score) VALUES
  ('japanese', '秀', 4.0, 90, 100),
  ('japanese', '優', 3.0, 80, 89),
  ('japanese', '良', 2.0, 70, 79),
  ('japanese', '可', 1.0, 60, 69),
  ('japanese', '不可', 0.0, 0, 59),
  ('alphabet', 'A', 4.0, 90, 100),
  ('alphabet', 'B', 3.0, 80, 89),
  ('alphabet', 'C', 2.0, 70, 79),
  ('alphabet', 'D', 1.0, 60, 69),
  ('alphabet', 'E', 0.0, 0, 59);

-- 卒業要件テーブル
CREATE TABLE IF NOT EXISTS graduation_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department TEXT NOT NULL,
  category TEXT NOT NULL,
  required_credits INTEGER NOT NULL,
  UNIQUE(department, category)
);

-- テストデータ: 情報工学科の卒業要件
INSERT OR IGNORE INTO graduation_requirements (department, category, required_credits) VALUES
  ('情報工学科', 'total', 124),
  ('情報工学科', 'general', 20),
  ('情報工学科', 'foreign_language', 8),
  ('情報工学科', 'specialized_required', 42),
  ('情報工学科', 'specialized_elective', 26),
  ('情報工学科', 'free', 28);