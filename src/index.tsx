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
      (id, faculty, department, admission_year, grade_requirements, graduation_requirements, grade_display_format)
      VALUES (1, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.faculty,
      body.department,
      body.admission_year,
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
  
  try {
    const result = await DB.prepare(`
      SELECT 
        c.*,
        cs.day_of_week,
        cs.period,
        cs.quarter,
        r.status,
        r.grade
      FROM courses c
      INNER JOIN course_schedules cs ON c.id = cs.course_id
      LEFT JOIN registrations r ON c.id = r.course_id
      WHERE cs.quarter = ? OR cs.quarter = 'full_year' OR cs.quarter LIKE '%' || ? || '%'
      ORDER BY cs.day_of_week, cs.period
    `).bind(quarter, quarter).all();
    
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
    await DB.prepare(`
      UPDATE courses 
      SET course_name = ?, instructor = ?, classroom = ?, credits = ?, 
          category = ?, course_type = ?, remarks = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      body.course_name,
      body.instructor,
      body.classroom,
      body.credits,
      body.category,
      body.course_type,
      body.remarks,
      courseId
    ).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating course:', error);
    return c.json({ error: 'Failed to update course' }, 500);
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
                                <a href="#" onclick="showSettings(); toggleSidebar();" class="block px-4 py-2 rounded hover:bg-gray-700 transition-colors">
                                    <i class="fas fa-cog mr-2"></i>個人設定
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
                        </ul>
                    </nav>
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
                                    <th class="border p-2 w-20">時限</th>
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

                <!-- Grades View -->
                <div id="gradesView" class="hidden">
                    <h2 class="text-xl font-bold mb-4">成績照会</h2>
                    
                    <!-- Tab Navigation -->
                    <div class="flex border-b mb-4">
                        <button id="registeredTab" onclick="showRegisteredCourses()" class="px-4 py-2 font-medium text-blue-600 border-b-2 border-blue-600">
                            登録済み講義一覧
                        </button>
                        <button id="gradeTab" onclick="showGradeEvaluation()" class="px-4 py-2 font-medium text-gray-600 hover:text-gray-800">
                            成績評価
                        </button>
                        <button id="creditTab" onclick="showCreditSummary()" class="px-4 py-2 font-medium text-gray-600 hover:text-gray-800">
                            単位集計・卒業要件
                        </button>
                    </div>
                    
                    <!-- Registered Courses List -->
                    <div id="registeredCoursesView" class="bg-white rounded-lg shadow">
                        <div class="p-4 border-b">
                            <div class="flex justify-between items-center">
                                <h3 class="text-lg font-semibold">登録済み講義一覧</h3>
                                <div class="space-x-2">
                                    <select id="statusFilter" onchange="filterCourses()" class="border rounded px-2 py-1">
                                        <option value="">全て表示</option>
                                        <option value="completed">取得済</option>
                                        <option value="registered">履修中</option>
                                        <option value="planned">履修予定</option>
                                        <option value="failed">不合格</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr class="bg-gray-50 text-left">
                                        <th class="px-4 py-2 border-b">講義コード</th>
                                        <th class="px-4 py-2 border-b">講義名</th>
                                        <th class="px-4 py-2 border-b">担当者</th>
                                        <th class="px-4 py-2 border-b">単位</th>
                                        <th class="px-4 py-2 border-b">区分</th>
                                        <th class="px-4 py-2 border-b">ステータス</th>
                                        <th class="px-4 py-2 border-b">操作</th>
                                    </tr>
                                </thead>
                                <tbody id="registeredCoursesList">
                                    <!-- Dynamically generated -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Grade Evaluation View -->
                    <div id="gradeEvaluationView" class="hidden">
                        <div id="gradeCategoryGroups">
                            <!-- Dynamically generated category groups -->
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
                                    <input type="number" id="editCredits" class="w-full border rounded px-3 py-2" min="0.5" max="8" step="0.5">
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
                                    <label class="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                                    <select id="editStatus" class="w-full border rounded px-3 py-2">
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