-- ユーザー設定の初期データ
INSERT OR REPLACE INTO user_settings (
  id,
  faculty,
  department,
  admission_year,
  grade_requirements,
  graduation_requirements,
  grade_display_format
) VALUES (
  1,
  '理工学部',
  '情報科学科',
  2022,
  '{"秀": 90, "優": 80, "良": 70, "可": 60}',
  '{"総単位": 124, "必修": 60, "選択": 40, "一般教養": 24}',
  'japanese'
);

-- 講義情報のダミーデータ
-- Q1の講義
INSERT OR REPLACE INTO courses (course_code, course_name, year, faculty, department, classroom, instructor, class_group, target_students, enrollment_target, starts_at_nine, credits, course_type, remarks) VALUES
('CS101', 'プログラミング基礎', 2024, '理工学部', '情報科学科', '22C教室', '山田太郎', 'A', '1年', '{"受講対象":[{"最大入学年度":24,"最小入学年度":22,"対象学部":["理工学部"]}]}', false, 2, 'required', '必修科目'),
('CS102', 'データ構造とアルゴリズム', 2024, '理工学部', '情報科学科', '21B教室', '鈴木一郎', 'B', '2年', '{"受講対象":[{"最大入学年度":23,"最小入学年度":21,"対象学部":["理工学部"]}]}', false, 2, 'required', '必修科目'),
('MATH101', '線形代数学I', 2024, '理工学部', '共通', '11A教室', '田中花子', '', '1年', '{"受講対象":[{"最大入学年度":24,"最小入学年度":20,"対象学部":["理工学部","建築都市デザイン学部"]}]}', false, 2, 'required', '必修科目'),
('ENG101', '技術英語I', 2024, '共通', '共通', '31C教室', 'Smith John', 'A', '1-2年', '{"受講対象":[{"最大入学年度":24,"最小入学年度":20,"対象学部":["理工学部","情報学部","建築都市デザイン学部"]}]}', false, 1, 'general', '一般教養'),
('PHY101', '物理学I', 2024, '理工学部', '共通', '12A教室', '佐藤次郎', '', '1年', '{"受講対象":[{"最大入学年度":24,"最小入学年度":22,"対象学部":["理工学部"]}]}', true, 2, 'required', '9時開始');

-- Q2の講義
INSERT OR REPLACE INTO courses (course_code, course_name, year, faculty, department, classroom, instructor, class_group, target_students, enrollment_target, starts_at_nine, credits, course_type, remarks) VALUES
('CS103', 'オブジェクト指向プログラミング', 2024, '理工学部', '情報科学科', '22C教室', '山田太郎', 'A', '2年', '{"受講対象":[{"最大入学年度":23,"最小入学年度":21,"対象学部":["理工学部"]}]}', false, 2, 'required', '必修科目'),
('CS201', 'データベース論', 2024, '理工学部', '情報科学科', '23A教室', '高橋三郎', '', '2年', '{"受講対象":[{"最大入学年度":23,"最小入学年度":20,"対象学部":["理工学部"]},{"最大入学年度":22,"最小入学年度":20,"対象学部":["情報学部"]}]}', false, 2, 'elective', '選択科目'),
('MATH102', '線形代数学II', 2024, '理工学部', '共通', '11A教室', '田中花子', '', '1年', '{"受講対象":[{"最大入学年度":24,"最小入学年度":20,"対象学部":["理工学部","建築都市デザイン学部"]}]}', false, 2, 'required', '必修科目'),
('ENG102', '技術英語II', 2024, '共通', '共通', '31C教室', 'Smith John', 'A', '1-2年', '{"受講対象":[{"最大入学年度":24,"最小入学年度":20,"対象学部":["理工学部","情報学部","建築都市デザイン学部"]}]}', false, 1, 'general', '一般教養'),
('CS104', 'Web技術基礎', 2024, '理工学部', '情報科学科', '22D教室', '伊藤四郎', '', '2年', '{"受講対象":[{"最大入学年度":23,"最小入学年度":21,"対象学部":["理工学部","情報学部"]}]}', false, 2, 'elective', '選択科目');

-- Q3の講義
INSERT OR REPLACE INTO courses (course_code, course_name, year, faculty, department, classroom, instructor, class_group, target_students, enrollment_target, starts_at_nine, credits, course_type, remarks) VALUES
('CS301', '人工知能基礎', 2024, '理工学部', '情報科学科', '24A教室', '渡辺五郎', '', '3年', '{"受講対象":[{"最大入学年度":22,"最小入学年度":20,"対象学部":["理工学部"]}]}', false, 2, 'elective', '選択科目'),
('CS302', 'ネットワーク論', 2024, '理工学部', '情報科学科', '24B教室', '加藤六郎', '', '3年', '{"受講対象":[{"最大入学年度":22,"最小入学年度":19,"対象学部":["理工学部"]},{"最大入学年度":21,"最小入学年度":19,"対象学部":["情報学部"]}]}', false, 2, 'elective', '選択科目'),
('MATH201', '確率統計学', 2024, '理工学部', '共通', '13A教室', '小林七郎', '', '2年', '{"受講対象":[{"最大入学年度":23,"最小入学年度":20,"対象学部":["理工学部","建築都市デザイン学部"]}]}', false, 2, 'required', '必修科目'),
('CS303', 'ソフトウェア工学', 2024, '理工学部', '情報科学科', '25A教室', '松本八郎', '', '3年', '{"受講対象":[{"最大入学年度":22,"最小入学年度":20,"対象学部":["理工学部"]}]}', false, 2, 'required', '必修科目'),
('PHY201', '物理学II', 2024, '理工学部', '共通', '12B教室', '佐藤次郎', '', '2年', '{"受講対象":[{"最大入学年度":23,"最小入学年度":21,"対象学部":["理工学部"]}]}', false, 2, 'elective', '選択科目');

-- Q4の講義
INSERT OR REPLACE INTO courses (course_code, course_name, year, faculty, department, classroom, instructor, class_group, target_students, enrollment_target, starts_at_nine, credits, course_type, remarks) VALUES
('CS401', '機械学習', 2024, '理工学部', '情報科学科', '26A教室', '中村九郎', '', '3-4年', '{"受講対象":[{"最大入学年度":22,"最小入学年度":19,"対象学部":["理工学部"]},{"最大入学年度":21,"最小入学年度":19,"対象学部":["情報学部"]}]}', false, 2, 'elective', '選択科目'),
('CS402', 'コンピュータグラフィックス', 2024, '理工学部', '情報科学科', '26B教室', '木村十郎', '', '3-4年', '{"受講対象":[{"最大入学年度":22,"最小入学年度":19,"対象学部":["理工学部"]}]}', false, 2, 'elective', '選択科目'),
('CS403', 'セキュリティ論', 2024, '理工学部', '情報科学科', '27A教室', '斎藤十一', '', '3-4年', '{"受講対象":[{"最大入学年度":22,"最小入学年度":19,"対象学部":["理工学部","情報学部"]}]}', false, 2, 'elective', '選択科目'),
('CS404', '卒業研究', 2024, '理工学部', '情報科学科', '研究室', '各教員', '', '4年', '{"受講対象":[{"最大入学年度":21,"最小入学年度":19,"対象学部":["理工学部"]}]}', false, 4, 'required', '必修科目'),
('ENG201', 'ビジネス英語', 2024, '共通', '共通', '32A教室', 'Brown Mary', '', '3-4年', '{"受講対象":[{"最大入学年度":22,"最小入学年度":19,"対象学部":["理工学部","情報学部","建築都市デザイン学部"]}]}', false, 1, 'general', '一般教養');

-- 通年講義
INSERT OR REPLACE INTO courses (course_code, course_name, year, faculty, department, classroom, instructor, class_group, target_students, enrollment_target, starts_at_nine, credits, course_type, remarks) VALUES
('CS501', 'プロジェクト実習', 2024, '理工学部', '情報科学科', '実習室', '複数教員', '', '3年', '{"受講対象":[{"最大入学年度":22,"最小入学年度":20,"対象学部":["理工学部"]}]}', false, 4, 'required', '通年・必修科目'),
('CS502', 'インターンシップ', 2024, '理工学部', '情報科学科', '各企業', '担当教員', '', '3年', '{"受講対象":[{"最大入学年度":22,"最小入学年度":20,"対象学部":["理工学部","情報学部"]}]}', false, 2, 'elective', '通年・選択科目');

-- 講義スケジュールデータ
-- Q1の講義スケジュール
INSERT OR REPLACE INTO course_schedules (course_id, day_of_week, period, quarter) VALUES
(1, 'monday', 1, 'Q1'),
(1, 'wednesday', 1, 'Q1'),
(2, 'tuesday', 2, 'Q1'),
(2, 'thursday', 2, 'Q1'),
(3, 'monday', 3, 'Q1'),
(3, 'wednesday', 3, 'Q1'),
(4, 'friday', 4, 'Q1'),
(5, 'tuesday', 1, 'Q1'),
(5, 'thursday', 1, 'Q1');

-- Q2の講義スケジュール
INSERT OR REPLACE INTO course_schedules (course_id, day_of_week, period, quarter) VALUES
(6, 'monday', 2, 'Q2'),
(6, 'wednesday', 2, 'Q2'),
(7, 'tuesday', 3, 'Q2'),
(7, 'thursday', 3, 'Q2'),
(8, 'monday', 3, 'Q2'),
(8, 'wednesday', 3, 'Q2'),
(9, 'friday', 4, 'Q2'),
(10, 'monday', 4, 'Q2'),
(10, 'wednesday', 4, 'Q2');

-- Q3の講義スケジュール
INSERT OR REPLACE INTO course_schedules (course_id, day_of_week, period, quarter) VALUES
(11, 'monday', 2, 'Q3'),
(11, 'wednesday', 2, 'Q3'),
(12, 'tuesday', 3, 'Q3'),
(12, 'thursday', 3, 'Q3'),
(13, 'tuesday', 4, 'Q3'),
(13, 'thursday', 4, 'Q3'),
(14, 'monday', 1, 'Q3'),
(14, 'wednesday', 1, 'Q3'),
(15, 'friday', 2, 'Q3');

-- Q4の講義スケジュール
INSERT OR REPLACE INTO course_schedules (course_id, day_of_week, period, quarter) VALUES
(16, 'monday', 2, 'Q4'),
(16, 'wednesday', 2, 'Q4'),
(17, 'tuesday', 3, 'Q4'),
(17, 'thursday', 3, 'Q4'),
(18, 'monday', 4, 'Q4'),
(18, 'wednesday', 4, 'Q4'),
(19, 'tuesday', 5, 'Q4'),
(19, 'thursday', 5, 'Q4'),
(20, 'friday', 3, 'Q4');

-- 通年講義のスケジュール
INSERT OR REPLACE INTO course_schedules (course_id, day_of_week, period, quarter) VALUES
(21, 'friday', 5, 'full_year'),
(22, 'wednesday', 5, 'full_year');

-- 履修登録のサンプルデータ
INSERT OR REPLACE INTO registrations (user_id, course_id, year, quarter, status, grade) VALUES
(1, 1, 2024, 'Q1', 'completed', '優'),
(1, 3, 2024, 'Q1', 'completed', '秀'),
(1, 4, 2024, 'Q1', 'completed', '良'),
(1, 6, 2024, 'Q2', 'completed', '優'),
(1, 8, 2024, 'Q2', 'completed', '秀'),
(1, 11, 2024, 'Q3', 'registered', NULL),
(1, 13, 2024, 'Q3', 'registered', NULL),
(1, 14, 2024, 'Q3', 'registered', NULL),
(1, 16, 2024, 'Q4', 'registered', NULL),
(1, 18, 2024, 'Q4', 'registered', NULL),
(1, 21, 2024, 'full_year', 'registered', NULL);