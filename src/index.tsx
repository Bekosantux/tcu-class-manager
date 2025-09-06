import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// API Routes

// Get user settings
app.get('/api/settings', async (c) => {
  const { DB } = c.env;
  
  try {
    const result = await DB.prepare(`
      SELECT * FROM user_settings WHERE id = 1
    `).first();
    
    if (result) {
      return c.json(result);
    } else {
      return c.json({ exists: false });
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    return c.json({ error: 'Failed to fetch settings' }, 500);
  }
});

// Save user settings
app.post('/api/settings', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  
  try {
    await DB.prepare(`
      INSERT OR REPLACE INTO user_settings 
      (id, faculty, department, admission_year, current_grade, grade_requirements, graduation_requirements, grade_display_format)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.faculty,
      body.department,
      body.admission_year,
      body.current_grade || 1,
      JSON.stringify(body.grade_requirements || {}),
      JSON.stringify(body.graduation_requirements || {}),
      body.grade_display_format || 'japanese'
    ).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    return c.json({ error: 'Failed to save settings' }, 500);
  }
});

// Get timetable data
app.get('/api/timetable', async (c) => {
  const { DB } = c.env;
  const quarter = c.req.query('quarter') || 'Q1';
  const year = c.req.query('year') || new Date().getFullYear().toString();
  
  try {
    const result = await DB.prepare(`
      SELECT 
        c.*,
        cs.day_of_week,
        cs.period,
        cs.quarter,
        r.status,
        r.grade,
        r.year as registration_year
      FROM courses c
      INNER JOIN course_schedules cs ON c.id = cs.course_id
      LEFT JOIN registrations r ON c.id = r.course_id AND r.year = ?
      WHERE (cs.quarter = ? OR cs.quarter = 'full_year' OR cs.quarter LIKE '%' || ? || '%')
        AND (c.course_year = ? OR c.course_year IS NULL)
      ORDER BY cs.day_of_week, cs.period
    `).bind(parseInt(year), quarter, quarter, parseInt(year)).all();
    
    return c.json(result.results || []);
  } catch (error) {
    console.error('Error fetching timetable:', error);
    return c.json({ error: 'Failed to fetch timetable' }, 500);
  }
});

// Get courses
app.get('/api/courses', async (c) => {
  const { DB } = c.env;
  const department = c.req.query('department');
  const year = c.req.query('year');
  
  try {
    let query = 'SELECT * FROM courses WHERE 1=1';
    const params = [];
    
    if (department) {
      query += ' AND (department = ? OR department IS NULL)';
      params.push(department);
    }
    
    if (year) {
      query += ' AND year = ?';
      params.push(year);
    }
    
    query += ' ORDER BY year, course_code';
    
    const result = await DB.prepare(query).bind(...params).all();
    
    return c.json(result.results || []);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return c.json({ error: 'Failed to fetch courses' }, 500);
  }
});

// Register course
app.post('/api/registrations', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  
  try {
    await DB.prepare(`
      INSERT INTO registrations (user_id, course_id, year, quarter, status)
      VALUES (1, ?, ?, ?, 'registered')
    `).bind(body.course_id, body.year, body.quarter).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error registering course:', error);
    return c.json({ error: 'Failed to register course' }, 500);
  }
});

// Delete registration
app.delete('/api/registrations/:id', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  
  try {
    await DB.prepare(`
      DELETE FROM registrations WHERE course_id = ? AND user_id = 1
    `).bind(id).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting registration:', error);
    return c.json({ error: 'Failed to delete registration' }, 500);
  }
});

// Get all registrations with course details
app.get('/api/registrations', async (c) => {
  const { DB } = c.env;
  
  try {
    const result = await DB.prepare(`
      SELECT 
        r.*,
        c.course_code,
        c.course_name,
        c.instructor,
        c.credits,
        c.course_type,
        c.category,
        c.year as course_year,
        c.target_students,
        c.target_year,
        c.enrollment_target,
        c.department,
        c.remarks
      FROM registrations r
      INNER JOIN courses c ON r.course_id = c.id
      WHERE r.user_id = 1
      ORDER BY r.year DESC, r.quarter, c.course_code
    `).all();
    
    return c.json(result.results || []);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return c.json({ error: 'Failed to fetch registrations' }, 500);
  }
});

// Update registration (grade, status)
app.put('/api/registrations/:id', async (c) => {
  const { DB } = c.env;
  const courseId = c.req.param('id');
  const body = await c.req.json();
  
  try {
    let gradePoint = null;
    if (body.grade) {
      // Get grade point based on grade
      const gradeResult = await DB.prepare(`
        SELECT grade_point FROM grade_scales 
        WHERE format = ? AND grade = ?
      `).bind(body.grade_format || 'japanese', body.grade).first();
      
      if (gradeResult) {
        gradePoint = gradeResult.grade_point;
      }
    }
    
    await DB.prepare(`
      UPDATE registrations 
      SET status = ?, grade = ?, grade_point = ?, updated_at = CURRENT_TIMESTAMP
      WHERE course_id = ? AND user_id = 1
    `).bind(
      body.status,
      body.grade,
      gradePoint,
      courseId
    ).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating registration:', error);
    return c.json({ error: 'Failed to update registration' }, 500);
  }
});

// Get credit summary
app.get('/api/credit-summary', async (c) => {
  const { DB } = c.env;
  
  try {
    // Get user's department
    const userSettings = await DB.prepare(`
      SELECT department FROM user_settings WHERE id = 1
    `).first();
    
    if (!userSettings) {
      return c.json({ error: 'User settings not found' }, 404);
    }
    
    // Get graduation requirements
    const requirements = await DB.prepare(`
      SELECT * FROM graduation_requirements 
      WHERE department = ?
    `).bind(userSettings.department).all();
    
    // Get earned credits by category
    const earnedCredits = await DB.prepare(`
      SELECT 
        c.category,
        SUM(CASE WHEN r.status = 'completed' AND r.grade != '不可' AND r.grade != 'E' THEN c.credits ELSE 0 END) as earned_credits,
        SUM(CASE WHEN r.status = 'registered' THEN c.credits ELSE 0 END) as registered_credits
      FROM registrations r
      INNER JOIN courses c ON r.course_id = c.id
      WHERE r.user_id = 1
      GROUP BY c.category
    `).all();
    
    // Get GPA
    const gpaResult = await DB.prepare(`
      SELECT 
        AVG(r.grade_point) as gpa,
        COUNT(*) as total_courses,
        SUM(CASE WHEN r.grade_point >= 1 THEN c.credits ELSE 0 END) as total_earned_credits
      FROM registrations r
      INNER JOIN courses c ON r.course_id = c.id
      WHERE r.user_id = 1 AND r.status = 'completed' AND r.grade_point IS NOT NULL
    `).first();
    
    return c.json({
      requirements: requirements.results || [],
      earned: earnedCredits.results || [],
      gpa: gpaResult?.gpa || 0,
      total_earned: gpaResult?.total_earned_credits || 0
    });
  } catch (error) {
    console.error('Error fetching credit summary:', error);
    return c.json({ error: 'Failed to fetch credit summary' }, 500);
  }
});

// Update course information
app.put('/api/courses/:id', async (c) => {
  const { DB } = c.env;
  const courseId = c.req.param('id');
  const body = await c.req.json();
  
  try {
    // Update course basic information
    await DB.prepare(`
      UPDATE courses 
      SET course_name = ?, instructor = ?, classroom = ?, credits = ?, 
          category = ?, course_type = ?, year = ?, target_students = ?, 
          target_year = ?, enrollment_target = ?, remarks = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      body.course_name,
      body.instructor,
      body.classroom,
      body.credits,
      body.category,
      body.course_type,
      body.year,
      body.target_students,
      body.target_year,
      body.enrollment_target,
      body.remarks,
      courseId
    ).run();
    
    // Update schedules if provided
    if (body.schedules && Array.isArray(body.schedules)) {
      // Delete existing schedules
      await DB.prepare(`
        DELETE FROM course_schedules WHERE course_id = ?
      `).bind(courseId).run();
      
      // Insert new schedules
      for (const schedule of body.schedules) {
        if (schedule.day_of_week && schedule.period && schedule.quarter) {
          await DB.prepare(`
            INSERT INTO course_schedules (course_id, day_of_week, period, quarter)
            VALUES (?, ?, ?, ?)
          `).bind(courseId, schedule.day_of_week, schedule.period, schedule.quarter).run();
        }
      }
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating course:', error);
    return c.json({ error: 'Failed to update course', details: error.message }, 500);
  }
});

// Get course schedules
app.get('/api/courses/:id/schedules', async (c) => {
  const { DB } = c.env;
  const courseId = c.req.param('id');
  
  try {
    const result = await DB.prepare(`
      SELECT * FROM course_schedules WHERE course_id = ?
    `).bind(courseId).all();
    
    return c.json(result.results || []);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return c.json({ error: 'Failed to fetch schedules' }, 500);
  }
});

// Debug API: Reset all data with dummy data
app.post('/api/debug/reset-all', async (c) => {
  const { DB } = c.env;
  
  try {
    // Delete in correct order to respect foreign key constraints
    await DB.prepare('DELETE FROM registrations').run();
    await DB.prepare('DELETE FROM course_schedules').run(); 
    await DB.prepare('DELETE FROM courses').run();
    await DB.prepare('DELETE FROM user_settings').run();
    
    // Insert user settings
    await DB.prepare(`
      INSERT INTO user_settings (
        id, faculty, department, admission_year, current_grade,
        grade_requirements, graduation_requirements, grade_display_format
      ) VALUES (
        1, '理工学部', '情報科学科', 2022, 3,
        '{"秀": 90, "優": 80, "良": 70, "可": 60}',
        '{"総単位": 124, "必修": 60, "選択": 40, "一般教養": 24}',
        'japanese'
      )
    `).run();
    
    // Insert sample courses
    const courses = [
      ['CS101', 'プログラミング基礎', 2024, '理工学部', '情報科学科', '22C教室', '山田太郎', 'A', '1年', 1, '{"受講対象":[{"最大入学年度":24,"最小入学年度":22,"対象学部":["理工学部"]}]}', false, 2, 'required', '必修科目'],
      ['CS102', 'データ構造とアルゴリズム', 2024, '理工学部', '情報科学科', '21B教室', '鈴木一郎', 'B', '2年', 2, '{"受講対象":[{"最大入学年度":23,"最小入学年度":21,"対象学部":["理工学部"]}]}', false, 2, 'required', '必修科目'],
      ['MATH101', '線形代数学I', 2024, '理工学部', '共通', '11A教室', '田中花子', '', '1年', 1, '{"受講対象":[{"最大入学年度":24,"最小入学年度":20,"対象学部":["理工学部","建築都市デザイン学部"]}]}', false, 2, 'required', '必修科目'],
      ['CS301', '人工知能基礎', 2024, '理工学部', '情報科学科', '24A教室', '渡辺五郎', '', '3年', 3, '{"受講対象":[{"最大入学年度":22,"最小入学年度":20,"対象学部":["理工学部"]}]}', false, 2, 'elective', '選択科目'],
      ['CS501', 'プロジェクト実習', 2024, '理工学部', '情報科学科', '実習室', '複数教員', '', '3年', 3, '{"受講対象":[{"最大入学年度":22,"最小入学年度":20,"対象学部":["理工学部"]}]}', false, 4, 'required', '通年・必修科目']
    ];
    
    for (const course of courses) {
      await DB.prepare(`
        INSERT INTO courses (
          course_code, course_name, year, faculty, department, classroom,
          instructor, class_group, target_students, target_year, enrollment_target,
          starts_at_nine, credits, course_type, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(...course).run();
    }
    
    // Insert sample schedules
    const schedules = [
      [1, 'monday', 1, 'Q1'],
      [1, 'wednesday', 1, 'Q1'],
      [2, 'tuesday', 2, 'Q1'],
      [2, 'thursday', 2, 'Q1'],
      [3, 'monday', 3, 'Q1'],
      [3, 'wednesday', 3, 'Q1'],
      [4, 'monday', 2, 'Q3'],
      [4, 'wednesday', 2, 'Q3'],
      [5, 'friday', 5, 'full_year']
    ];
    
    for (const schedule of schedules) {
      await DB.prepare(`
        INSERT INTO course_schedules (course_id, day_of_week, period, quarter)
        VALUES (?, ?, ?, ?)
      `).bind(...schedule).run();
    }
    
    // Insert sample registrations
    const registrations = [
      [1, 1, 2024, 'Q1', 'completed', '優'],
      [1, 3, 2024, 'Q1', 'completed', '秀'],
      [1, 4, 2024, 'Q3', 'registered', null],
      [1, 5, 2024, 'full_year', 'registered', null]
    ];
    
    for (const reg of registrations) {
      await DB.prepare(`
        INSERT INTO registrations (user_id, course_id, year, quarter, status, grade)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(...reg).run();
    }
    
    return c.json({ success: true, message: 'All data reset with dummy data' });
  } catch (error) {
    console.error('Error resetting data:', error);
    return c.json({ error: 'Failed to reset data', details: error.message }, 500);
  }
});

// Debug API: Clear all data
app.post('/api/debug/clear-all', async (c) => {
  const { DB } = c.env;
  
  try {
    // Delete in correct order to respect foreign key constraints
    await DB.prepare('DELETE FROM registrations').run();
    await DB.prepare('DELETE FROM course_schedules').run();
    await DB.prepare('DELETE FROM courses').run();
    await DB.prepare('DELETE FROM user_settings').run();
    
    return c.json({ success: true, message: 'All data cleared' });
  } catch (error) {
    console.error('Error clearing data:', error);
    return c.json({ error: 'Failed to clear data', details: error.message }, 500);
  }
});

// Debug API: Clear user settings only
app.post('/api/debug/clear-user-settings', async (c) => {
  const { DB } = c.env;
  
  try {
    await DB.prepare('DELETE FROM user_settings').run();
    
    return c.json({ success: true, message: 'User settings cleared' });
  } catch (error) {
    console.error('Error clearing user settings:', error);
    return c.json({ error: 'Failed to clear user settings', details: error.message }, 500);
  }
});

// Debug API: Add dummy data (keep existing data)
app.post('/api/debug/add-dummy-data', async (c) => {
  const { DB } = c.env;
  
  try {
    // Check if user settings exist, if not add them
    const userExists = await DB.prepare('SELECT id FROM user_settings WHERE id = 1').first();
    if (!userExists) {
      await DB.prepare(`
        INSERT INTO user_settings (
          id, faculty, department, admission_year, current_grade,
          grade_requirements, graduation_requirements, grade_display_format
        ) VALUES (
          1, '理工学部', '情報科学科', 2022, 3,
          '{"秀": 90, "優": 80, "良": 70, "可": 60}',
          '{"総単位": 124, "必修": 60, "選択": 40, "一般教養": 24}',
          'japanese'
        )
      `).run();
    }
    
    // Add some additional courses (with unique codes to avoid conflicts)
    const timestamp = Date.now();
    const additionalCourses = [
      [`TEST${timestamp}1`, 'テスト講義1', 2024, '理工学部', '情報科学科', 'T1教室', 'テスト講師1', '', '2年', 2, '{"受講対象":[{"最大入学年度":24,"最小入学年度":20,"対象学部":["理工学部"]}]}', false, 2, 'elective', 'テスト科目'],
      [`TEST${timestamp}2`, 'テスト講義2', 2024, '理工学部', '情報科学科', 'T2教室', 'テスト講師2', '', '3年', 3, '{"受講対象":[{"最大入学年度":23,"最小入学年度":19,"対象学部":["理工学部"]}]}', false, 2, 'elective', 'テスト科目']
    ];
    
    for (const course of additionalCourses) {
      await DB.prepare(`
        INSERT INTO courses (
          course_code, course_name, year, faculty, department, classroom,
          instructor, class_group, target_students, target_year, enrollment_target,
          starts_at_nine, credits, course_type, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(...course).run();
    }
    
    // Get the IDs of the newly added courses
    const newCourses = await DB.prepare(`
      SELECT id FROM courses WHERE course_code LIKE 'TEST${timestamp}%'
    `).all();
    
    // Add schedules for new courses
    if (newCourses.results && newCourses.results.length > 0) {
      for (let i = 0; i < newCourses.results.length; i++) {
        const courseId = newCourses.results[i].id;
        await DB.prepare(`
          INSERT INTO course_schedules (course_id, day_of_week, period, quarter)
          VALUES (?, ?, ?, ?)
        `).bind(courseId, 'friday', i + 1, 'Q2').run();
      }
    }
    
    return c.json({ success: true, message: 'Dummy data added successfully' });
  } catch (error) {
    console.error('Error adding dummy data:', error);
    return c.json({ error: 'Failed to add dummy data', details: error.message }, 500);
  }
});

// Debug API: Get database info
app.get('/api/debug/info', async (c) => {
  const { DB } = c.env;
  
  try {
    const tables = ['user_settings', 'courses', 'course_schedules', 'registrations'];
    const info = {};
    
    for (const table of tables) {
      const result = await DB.prepare(`SELECT COUNT(*) as count FROM ${table}`).first();
      info[table] = result.count;
    }
    
    return c.json(info);
  } catch (error) {
    console.error('Error getting database info:', error);
    return c.json({ error: 'Failed to get database info', details: error.message }, 500);
  }
});

// Initialize database tables
app.post('/api/init-db', async (c) => {
  const { DB } = c.env;
  
  try {
    // This would typically be done via migrations, but for development...
    const migration = await fetch('/migrations/0001_initial_schema.sql').then(r => r.text()).catch(() => '');
    
    if (migration) {
      const statements = migration.split(';').filter(s => s.trim());
      for (const stmt of statements) {
        if (stmt.trim()) {
          await DB.prepare(stmt).run();
        }
      }
    }
    
    return c.json({ success: true, message: 'Database initialized' });
  } catch (error) {
    console.error('Error initializing database:', error);
    return c.json({ error: 'Failed to initialize database', details: error.message }, 500);
  }
});

// Main HTML page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>履修管理システム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div id="app">
            <!-- Navigation -->
            <div id="sidebar" class="fixed left-0 top-0 h-full w-64 bg-gray-800 text-white transform -translate-x-full transition-transform duration-300 z-50">
                <div class="p-4">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold">メニュー</h2>
                        <button onclick="toggleSidebar()" class="text-gray-400 hover:text-white">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <nav>
                        <ul class="space-y-2">
                            <li>
                                <a href="#" onclick="showTimetable(); toggleSidebar();" class="block px-4 py-2 rounded hover:bg-gray-700 transition-colors">
                                    <i class="fas fa-calendar-alt mr-2"></i>時間割表示
                                </a>
                            </li>
                            <li>
                                <a href="#" onclick="showRegisteredCoursesList(); toggleSidebar();" class="block px-4 py-2 rounded hover:bg-gray-700 transition-colors">
                                    <i class="fas fa-list mr-2"></i>登録済み講義一覧
                                </a>
                            </li>
                            <li>
                                <a href="#" onclick="showCourseRegistration(); toggleSidebar();" class="block px-4 py-2 rounded hover:bg-gray-700 transition-colors">
                                    <i class="fas fa-edit mr-2"></i>履修登録
                                </a>
                            </li>
                            <li>
                                <a href="#" onclick="showGrades(); toggleSidebar();" class="block px-4 py-2 rounded hover:bg-gray-700 transition-colors">
                                    <i class="fas fa-chart-line mr-2"></i>成績照会
                                </a>
                            </li>
                            <li>
                                <a href="#" onclick="showDebugMenu(); toggleSidebar();" class="block px-4 py-2 rounded hover:bg-gray-700 transition-colors">
                                    <i class="fas fa-bug mr-2"></i>デバッグメニュー
                                </a>
                            </li>
                        </ul>
                    </nav>
                    
                    <!-- 個人設定と講義時間表を最下部に配置 -->
                    <div class="absolute bottom-4 left-0 right-0 px-4">
                        <!-- 講義時間表 -->
                        <div class="mb-4 p-3 bg-gray-700 rounded">
                            <h3 class="text-sm font-semibold mb-2 text-gray-300">講義時間</h3>
                            <table class="w-full text-xs text-gray-300">
                                <tbody>
                                    <tr><td class="py-1">1時限</td><td class="text-right">9:20~11:00</td></tr>
                                    <tr><td class="py-1">2時限</td><td class="text-right">11:10~12:50</td></tr>
                                    <tr><td class="py-1">3時限</td><td class="text-right">13:40~15:20</td></tr>
                                    <tr><td class="py-1">4時限</td><td class="text-right">15:30~17:10</td></tr>
                                    <tr><td class="py-1">5時限</td><td class="text-right">17:20~19:00</td></tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- 個人設定 -->
                        <a href="#" onclick="showSettings(); toggleSidebar();" class="block px-4 py-2 rounded hover:bg-gray-700 transition-colors text-gray-300">
                            <i class="fas fa-cog mr-2"></i>個人設定
                        </a>
                    </div>
                </div>
            </div>

            <!-- Header -->
            <header class="bg-white shadow-md">
                <div class="px-4 py-3 flex items-center justify-between">
                    <div class="flex items-center">
                        <button onclick="toggleSidebar()" class="text-gray-600 hover:text-gray-900 mr-4">
                            <i class="fas fa-bars text-xl"></i>
                        </button>
                        <h1 class="text-2xl font-bold text-gray-800">履修管理システム</h1>
                    </div>
                    <div class="flex items-center space-x-4">
                        <select id="yearSelect" class="border rounded px-3 py-1" onchange="changeYear()">
                            <option value="2024">2024年度</option>
                            <option value="2025">2025年度</option>
                            <option value="2026">2026年度</option>
                        </select>
                        <select id="quarterSelect" class="border rounded px-3 py-1" onchange="changeQuarter()">
                            <option value="Q1">第1クォーター</option>
                            <option value="Q2">第2クォーター</option>
                            <option value="Q3">第3クォーター</option>
                            <option value="Q4">第4クォーター</option>
                        </select>
                        <span id="userInfo" class="text-gray-600"></span>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="p-4">
                <!-- Timetable View -->
                <div id="timetableView" class="hidden">
                    <h2 class="text-xl font-bold mb-4">時間割表</h2>
                    <div class="bg-white rounded-lg shadow overflow-x-auto">
                        <table class="w-full min-w-[800px]">
                            <thead>
                                <tr class="bg-gray-100">
                                    <th class="border p-2 w-16">時限</th>
                                    <th class="border p-2">月</th>
                                    <th class="border p-2">火</th>
                                    <th class="border p-2">水</th>
                                    <th class="border p-2">木</th>
                                    <th class="border p-2">金</th>
                                    <th class="border p-2">土</th>
                                </tr>
                            </thead>
                            <tbody id="timetableBody">
                                <!-- Dynamically generated -->
                            </tbody>
                        </table>
                    </div>
                    <div id="intensiveCourses" class="mt-6">
                        <h3 class="text-lg font-bold mb-2">集中講義</h3>
                        <div id="intensiveList" class="bg-white rounded-lg shadow p-4">
                            <!-- Dynamically generated -->
                        </div>
                    </div>
                </div>

                <!-- Settings View -->
                <div id="settingsView" class="hidden">
                    <h2 class="text-xl font-bold mb-4">個人設定</h2>
                    <div class="bg-white rounded-lg shadow p-6 max-w-2xl">
                        <form id="settingsForm" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">学部</label>
                                <select id="facultySelect" class="w-full border rounded px-3 py-2" onchange="updateDepartments()">
                                    <option value="">選択してください</option>
                                    <option value="理工学部">理工学部</option>
                                    <option value="建築都市デザイン学部">建築都市デザイン学部</option>
                                    <option value="情報工学部">情報工学部</option>
                                    <option value="環境学部">環境学部</option>
                                    <option value="メディア情報学部">メディア情報学部</option>
                                    <option value="デザイン・データ科学部">デザイン・データ科学部</option>
                                    <option value="都市生活学部">都市生活学部</option>
                                    <option value="人間科学部">人間科学部</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">学科</label>
                                <select id="departmentSelect" class="w-full border rounded px-3 py-2">
                                    <option value="">先に学部を選択してください</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">入学年度</label>
                                <input type="number" id="admissionYear" class="w-full border rounded px-3 py-2" min="2020" max="2030" value="2024">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">現在の学年</label>
                                <select id="currentGrade" class="w-full border rounded px-3 py-2">
                                    <option value="1">1年</option>
                                    <option value="2">2年</option>
                                    <option value="3">3年</option>
                                    <option value="4">4年</option>
                                    <option value="5">5年以上</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">成績表示形式</label>
                                <select id="gradeFormat" class="w-full border rounded px-3 py-2">
                                    <option value="japanese">秀・優・良・可・不可</option>
                                    <option value="alphabet">A・B・C・D・E</option>
                                </select>
                            </div>
                            <div class="pt-4">
                                <button type="button" onclick="saveSettings()" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors">
                                    保存
                                </button>
                                <button type="button" onclick="skipSettings()" class="ml-2 bg-gray-400 text-white px-6 py-2 rounded hover:bg-gray-500 transition-colors">
                                    スキップ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Course Registration View (placeholder) -->
                <div id="courseRegistrationView" class="hidden">
                    <h2 class="text-xl font-bold mb-4">履修登録</h2>
                    <div class="bg-white rounded-lg shadow p-6">
                        <p class="text-gray-600">履修登録機能は現在開発中です。</p>
                    </div>
                </div>

                <!-- Registered Courses List (Independent View) -->
                <div id="registeredCoursesListView" class="hidden">
                    <h2 class="text-xl font-bold mb-4">登録済み講義一覧</h2>
                    <div class="bg-white rounded-lg shadow">
                        <div class="p-4 border-b">
                            <div class="flex flex-wrap gap-2">
                                <select id="statusFilter" onchange="filterCourses()" class="border rounded px-2 py-1">
                                    <option value="">状況: 全て</option>
                                    <option value="none">状況なし</option>
                                    <option value="completed">取得済</option>
                                    <option value="registered">履修中</option>
                                    <option value="planned">履修予定</option>
                                    <option value="failed">不合格</option>
                                </select>
                                <select id="yearFilter" onchange="filterCourses()" class="border rounded px-2 py-1">
                                    <option value="">開講年度: 全て</option>
                                    <option value="2024">2024年度</option>
                                    <option value="2025">2025年度</option>
                                    <option value="2026">2026年度</option>
                                </select>
                                <select id="categoryFilter" onchange="filterCourses()" class="border rounded px-2 py-1">
                                    <option value="">区分: 全て</option>
                                    <option value="general">教養</option>
                                    <option value="specialized_required">専門必修</option>
                                    <option value="specialized_elective">専門選択</option>
                                    <option value="foreign_language">外国語</option>
                                    <option value="free">自由</option>
                                </select>
                                <select id="creditsFilter" onchange="filterCourses()" class="border rounded px-2 py-1">
                                    <option value="">単位数: 全て</option>
                                    <option value="0">0単位</option>
                                    <option value="0.5">0.5単位</option>
                                    <option value="1">1単位</option>
                                    <option value="2">2単位</option>
                                    <option value="3">3単位以上</option>
                                </select>
                                <select id="targetYearFilter" onchange="filterCourses()" class="border rounded px-2 py-1">
                                    <option value="">対象学年: 全て</option>
                                    <option value="1">1年</option>
                                    <option value="2">2年</option>
                                    <option value="3">3年</option>
                                    <option value="4">4年</option>
                                </select>
                                <select id="departmentFilter" onchange="filterCourses()" class="border rounded px-2 py-1">
                                    <option value="">対象学科: 全て</option>
                                    <option value="情報科学科">情報科学科</option>
                                    <option value="共通">共通</option>
                                </select>
                                <select id="eligibilityFilter" onchange="filterCourses()" class="border rounded px-2 py-1">
                                    <option value="">受講対象: 全て</option>
                                    <option value="eligible">受講可能</option>
                                    <option value="not_eligible">受講不可</option>
                                </select>
                                <button id="deleteToggleBtn" onclick="toggleDeleteMode()" class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 ml-auto">
                                    <i class="fas fa-trash mr-1"></i>削除モード
                                </button>
                            </div>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr class="bg-gray-50 text-left">
                                        <th class="px-2 py-2 border-b hidden" id="deleteHeader">
                                            <input type="checkbox" id="selectAllDelete" onchange="toggleSelectAll()">
                                        </th>
                                        <th class="px-4 py-2 border-b">講義コード</th>
                                        <th class="px-4 py-2 border-b">講義名</th>
                                        <th class="px-4 py-2 border-b">担当者</th>
                                        <th class="px-4 py-2 border-b">単位</th>
                                        <th class="px-4 py-2 border-b">区分</th>
                                        <th class="px-4 py-2 border-b">状況</th>
                                        <th class="px-4 py-2 border-b">操作</th>
                                    </tr>
                                </thead>
                                <tbody id="registeredCoursesList">
                                    <!-- Dynamically generated -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="mt-4 hidden" id="deleteButtonContainer">
                        <button onclick="deleteSelectedCourses()" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                            選択した講義を削除
                        </button>
                    </div>
                </div>
                
                <!-- Grades View -->
                <div id="gradesView" class="hidden">
                    <h2 class="text-xl font-bold mb-4">成績照会</h2>
                    
                    <!-- Tab Navigation -->
                    <div class="flex border-b mb-4">
                        <button id="gradeTab" onclick="showGradeEvaluation()" class="px-4 py-2 font-medium text-blue-600 border-b-2 border-blue-600">
                            成績評価
                        </button>
                        <button id="creditTab" onclick="showCreditSummary()" class="px-4 py-2 font-medium text-gray-600 hover:text-gray-800">
                            単位集計・卒業要件
                        </button>
                    </div>
                    
                    <!-- Grade Evaluation View -->
                    <div id="gradeEvaluationView" class="bg-white rounded-lg shadow">
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr class="bg-pink-50 text-left">
                                        <th class="px-4 py-3 border-b font-medium">分野系列名／科目名</th>
                                        <th class="px-4 py-3 border-b text-center font-medium">単位</th>
                                        <th class="px-4 py-3 border-b text-center font-medium">評価</th>
                                        <th class="px-4 py-3 border-b text-center font-medium">年度</th>
                                        <th class="px-4 py-3 border-b text-center font-medium">期間</th>
                                    </tr>
                                </thead>
                                <tbody id="gradeTableBody">
                                    <!-- Dynamically generated -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Credit Summary View -->
                    <div id="creditSummaryView" class="hidden">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="bg-white rounded-lg shadow p-6">
                                <h3 class="text-lg font-semibold mb-4">単位集計</h3>
                                <div id="creditSummaryContent">
                                    <!-- Dynamically generated -->
                                </div>
                            </div>
                            <div class="bg-white rounded-lg shadow p-6">
                                <h3 class="text-lg font-semibold mb-4">卒業要件</h3>
                                <div id="graduationRequirements">
                                    <!-- Dynamically generated -->
                                </div>
                            </div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-6 mt-4">
                            <h3 class="text-lg font-semibold mb-4">GPA</h3>
                            <div id="gpaDisplay" class="text-2xl font-bold text-blue-600">
                                <!-- Dynamically generated -->
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Debug Menu View -->
                <div id="debugMenuView" class="hidden">
                    <h2 class="text-xl font-bold mb-4">デバッグメニュー</h2>
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="space-y-4">
                            <div class="border border-red-500 rounded p-4 bg-red-50">
                                <h3 class="text-lg font-semibold text-red-700 mb-2">⚠️ 危険な操作</h3>
                                <p class="text-gray-700 mb-4">以下の操作は全てのデータを削除します。元に戻すことはできません。</p>
                                
                                <div class="space-y-3">
                                    <button onclick="resetAllData()" class="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors">
                                        <i class="fas fa-trash-alt mr-2"></i>全データを削除してダミーデータを投入
                                    </button>
                                    
                                    <button onclick="clearAllData()" class="w-full bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition-colors">
                                        <i class="fas fa-broom mr-2"></i>全データを削除（ダミーデータなし）
                                    </button>
                                    
                                    <button onclick="clearUserSettingsOnly()" class="w-full bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors">
                                        <i class="fas fa-user-times mr-2"></i>ユーザー設定のみ削除（初回訪問状態にする）
                                    </button>
                                </div>
                            </div>
                            
                            <div class="border border-blue-500 rounded p-4 bg-blue-50">
                                <h3 class="text-lg font-semibold text-blue-700 mb-2">🔧 デバッグ操作</h3>
                                
                                <div class="space-y-3">
                                    <button onclick="addDummyData()" class="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                                        <i class="fas fa-database mr-2"></i>ダミーデータを追加（既存データは保持）
                                    </button>
                                    
                                    <button onclick="showDatabaseInfo()" class="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors">
                                        <i class="fas fa-info-circle mr-2"></i>データベース情報を表示
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Course Edit Modal -->
                <div id="courseEditModal" class="hidden fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold">講義情報編集</h3>
                            <button onclick="closeEditModal()" class="text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <form id="courseEditForm" class="space-y-4">
                            <input type="hidden" id="editCourseId">
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">講義コード</label>
                                    <input type="text" id="editCourseCode" class="w-full border rounded px-3 py-2" readonly>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">講義名</label>
                                    <input type="text" id="editCourseName" class="w-full border rounded px-3 py-2">
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">開講年度</label>
                                    <input type="number" id="editCourseYear" class="w-full border rounded px-3 py-2" min="2020" max="2030">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">対象学年</label>
                                    <select id="editTargetYear" class="w-full border rounded px-3 py-2">
                                        <option value="1">1年</option>
                                        <option value="2">2年</option>
                                        <option value="3">3年</option>
                                        <option value="4">4年</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">担当者</label>
                                    <input type="text" id="editInstructor" class="w-full border rounded px-3 py-2">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">教室</label>
                                    <input type="text" id="editClassroom" class="w-full border rounded px-3 py-2">
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">単位数</label>
                                    <input type="number" id="editCredits" class="w-full border rounded px-3 py-2" min="0" max="8" step="0.5">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">区分</label>
                                    <select id="editCategory" class="w-full border rounded px-3 py-2">
                                        <option value="general">教養</option>
                                        <option value="specialized_required">専門必修</option>
                                        <option value="specialized_elective">専門選択</option>
                                        <option value="foreign_language">外国語</option>
                                        <option value="free">自由</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">状況</label>
                                    <select id="editStatus" class="w-full border rounded px-3 py-2">
                                        <option value="">なし</option>
                                        <option value="registered">履修中</option>
                                        <option value="completed">取得済</option>
                                        <option value="planned">履修予定</option>
                                        <option value="failed">不合格</option>
                                        <option value="dropped">履修取消</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">成績</label>
                                    <select id="editGrade" class="w-full border rounded px-3 py-2">
                                        <option value="">未評価</option>
                                        <option value="秀">秀</option>
                                        <option value="優">優</option>
                                        <option value="良">良</option>
                                        <option value="可">可</option>
                                        <option value="不可">不可</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">受講対象</label>
                                <div id="enrollmentTargetEditor" class="space-y-2">
                                    <!-- Dynamically generated enrollment target inputs -->
                                </div>
                                <button type="button" onclick="addEnrollmentTargetRow()" class="mt-2 text-sm text-blue-600 hover:text-blue-800">
                                    <i class="fas fa-plus"></i> 受講対象を追加
                                </button>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">開講時間</label>
                                <div id="scheduleEditor" class="space-y-2">
                                    <!-- Dynamically generated schedule inputs -->
                                </div>
                                <button type="button" onclick="addScheduleRow()" class="mt-2 text-sm text-blue-600 hover:text-blue-800">
                                    <i class="fas fa-plus"></i> 時間を追加
                                </button>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">備考</label>
                                <textarea id="editRemarks" class="w-full border rounded px-3 py-2" rows="3"></textarea>
                            </div>
                            
                            <div class="flex justify-end space-x-2 pt-4">
                                <button type="button" onclick="closeEditModal()" class="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">
                                    キャンセル
                                </button>
                                <button type="button" onclick="saveCourseEdit()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                    保存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>

        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app