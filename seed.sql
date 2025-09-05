-- テスト用講義データを挿入
INSERT OR IGNORE INTO courses (course_code, course_name, year, faculty, department, classroom, instructor, class_group, target_students, starts_at_nine, credits, course_type, remarks) VALUES
  ('CS101-Q1', 'プログラミング基礎', 1, '情報工学部', '情報工学科', '12A', '山田太郎', 'A', '1年生', FALSE, 2, 'required', NULL),
  ('CS102-Q1', 'コンピュータサイエンス入門', 1, '情報工学部', '情報工学科', '21B', '佐藤花子', 'A', '1年生', FALSE, 2, 'required', NULL),
  ('MATH101-Q1', '微積分学I', 1, '共通', NULL, '31C', '鈴木一郎', 'A', '全学科1年生', TRUE, 2, 'required', '9時開始'),
  ('ENG101-Q1', '英語I', 1, '共通', NULL, '11A', 'Smith John', 'A', '全学科1年生', FALSE, 1, 'required', NULL),
  ('CS201-Q2', 'データ構造とアルゴリズム', 2, '情報工学部', '情報工学科', '12B', '田中次郎', 'A', '2年生', FALSE, 2, 'required', NULL),
  ('CS301-Q3', 'オペレーティングシステム', 3, '情報工学部', '情報工学科', '21C', '高橋三郎', 'A', '3年生', FALSE, 2, 'elective', NULL),
  ('CS302-Q3', 'データベース', 3, '情報工学部', '情報工学科', '22A', '伊藤四郎', 'A', '3年生', FALSE, 2, 'elective', NULL),
  ('CS401-INT', '卒業研究', 4, '情報工学部', '情報工学科', '研究室', '各教員', NULL, '4年生', FALSE, 8, 'required', '集中講義');

-- 講義スケジュールデータを挿入
INSERT OR IGNORE INTO course_schedules (course_id, day_of_week, period, quarter) VALUES
  (1, 'monday', 1, 'Q1'),
  (1, 'wednesday', 2, 'Q1'),
  (2, 'tuesday', 2, 'Q1'),
  (2, 'thursday', 2, 'Q1'),
  (3, 'monday', 1, 'Q1'),
  (3, 'wednesday', 1, 'Q1'),
  (4, 'friday', 3, 'Q1'),
  (5, 'monday', 2, 'Q2'),
  (5, 'wednesday', 2, 'Q2'),
  (6, 'tuesday', 3, 'Q3'),
  (7, 'thursday', 3, 'Q3'),
  (8, 'intensive', 0, 'full_year');

-- デフォルトユーザー設定を挿入
INSERT OR IGNORE INTO user_settings (
  id, 
  faculty, 
  department, 
  admission_year, 
  grade_requirements,
  graduation_requirements,
  grade_display_format
) VALUES (
  1,
  '情報工学部',
  '情報工学科',
  2024,
  '{"Q1-Q2": 24, "Q3-Q4": 24}',
  '{"total": 124, "required": 80, "elective": 44}',
  'japanese'
);