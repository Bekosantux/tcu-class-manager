// Global state
let currentView = 'timetable';
let userSettings = null;
let currentQuarter = 'Q1';
let timetableData = [];

// Department mapping
const departments = {
  '理工学部': [
    '機械工学科',
    '機械システム工学科',
    '電気電子通信工学科',
    '医用工学科',
    '応用化学科',
    '原子力安全工学科',
    '自然科学科',
    'エネルギー化学科'
  ],
  '建築都市デザイン学部': [
    '建築学科',
    '都市工学科'
  ],
  '情報工学部': [
    '情報工学科',
    '知能情報工学科'
  ],
  '環境学部': [
    '環境創生学科',
    '環境経営システム学科',
    '環境マネジメント学科'
  ],
  'メディア情報学部': [
    '社会メディア学科',
    '情報システム学科'
  ],
  'デザイン・データ科学部': [
    'デザイン・データ科学科'
  ],
  '都市生活学部': [
    '都市生活学科'
  ],
  '人間科学部': [
    '人間科学科'
  ]
};

// Day mapping
const dayMap = {
  'monday': 0,
  'tuesday': 1,
  'wednesday': 2,
  'thursday': 3,
  'friday': 4,
  'saturday': 5
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  // Check if user has settings
  await loadSettings();
  
  if (!userSettings || !userSettings.faculty) {
    // Show settings for first-time users
    showSettings();
    showFirstTimeMessage();
  } else {
    // Show timetable for returning users
    showTimetable();
    updateUserInfo();
  }
});

// Toggle sidebar
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('-translate-x-full');
}

// Load user settings
async function loadSettings() {
  try {
    const response = await fetch('/api/settings');
    const data = await response.json();
    
    if (!data.exists) {
      userSettings = data;
      
      // Parse JSON fields if they exist
      if (data.grade_requirements) {
        data.grade_requirements = typeof data.grade_requirements === 'string' 
          ? JSON.parse(data.grade_requirements) 
          : data.grade_requirements;
      }
      if (data.graduation_requirements) {
        data.graduation_requirements = typeof data.graduation_requirements === 'string'
          ? JSON.parse(data.graduation_requirements)
          : data.graduation_requirements;
      }
      
      // Update form if on settings page
      if (currentView === 'settings' && data.faculty) {
        document.getElementById('facultySelect').value = data.faculty;
        updateDepartments();
        setTimeout(() => {
          document.getElementById('departmentSelect').value = data.department;
          document.getElementById('admissionYear').value = data.admission_year;
          document.getElementById('gradeFormat').value = data.grade_display_format || 'japanese';
        }, 100);
      }
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Save settings
async function saveSettings() {
  const faculty = document.getElementById('facultySelect').value;
  const department = document.getElementById('departmentSelect').value;
  const admissionYear = document.getElementById('admissionYear').value;
  const gradeFormat = document.getElementById('gradeFormat').value;
  
  if (!faculty || !department) {
    alert('学部と学科を選択してください。');
    return;
  }
  
  const settings = {
    faculty,
    department,
    admission_year: parseInt(admissionYear),
    grade_display_format: gradeFormat,
    grade_requirements: {
      'Q1-Q2': 24,
      'Q3-Q4': 24
    },
    graduation_requirements: {
      total: 124,
      required: 80,
      elective: 44
    }
  };
  
  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });
    
    if (response.ok) {
      userSettings = settings;
      updateUserInfo();
      showTimetable();
      alert('設定を保存しました。');
    } else {
      alert('設定の保存に失敗しました。');
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    alert('設定の保存中にエラーが発生しました。');
  }
}

// Skip settings
function skipSettings() {
  showTimetable();
}

// Update departments dropdown
function updateDepartments() {
  const faculty = document.getElementById('facultySelect').value;
  const departmentSelect = document.getElementById('departmentSelect');
  
  departmentSelect.innerHTML = '<option value="">選択してください</option>';
  
  if (faculty && departments[faculty]) {
    departments[faculty].forEach(dept => {
      const option = document.createElement('option');
      option.value = dept;
      option.textContent = dept;
      departmentSelect.appendChild(option);
    });
  }
}

// Update user info display
function updateUserInfo() {
  const userInfo = document.getElementById('userInfo');
  if (userSettings && userSettings.faculty) {
    const currentYear = new Date().getFullYear();
    const grade = Math.min(4, currentYear - userSettings.admission_year + 1);
    userInfo.textContent = `${userSettings.department} ${grade}年生`;
  }
}

// Show first time message
function showFirstTimeMessage() {
  const settingsView = document.getElementById('settingsView');
  const message = document.createElement('div');
  message.className = 'bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4';
  message.innerHTML = `
    <p class="font-bold">ようこそ！</p>
    <p>初めてのご利用ありがとうございます。まずは基本設定を行ってください。</p>
  `;
  settingsView.insertBefore(message, settingsView.firstChild);
}

// Change quarter
function changeQuarter() {
  currentQuarter = document.getElementById('quarterSelect').value;
  if (currentView === 'timetable') {
    loadTimetable();
  }
}

// Navigation functions
function showTimetable() {
  hideAllViews();
  document.getElementById('timetableView').classList.remove('hidden');
  currentView = 'timetable';
  loadTimetable();
}

function showSettings() {
  hideAllViews();
  document.getElementById('settingsView').classList.remove('hidden');
  currentView = 'settings';
  loadSettings();
}

function showCourseRegistration() {
  hideAllViews();
  document.getElementById('courseRegistrationView').classList.remove('hidden');
  currentView = 'courseRegistration';
}

function showGrades() {
  hideAllViews();
  document.getElementById('gradesView').classList.remove('hidden');
  currentView = 'grades';
  showRegisteredCourses(); // Default to registered courses tab
}

function hideAllViews() {
  document.getElementById('timetableView').classList.add('hidden');
  document.getElementById('settingsView').classList.add('hidden');
  document.getElementById('courseRegistrationView').classList.add('hidden');
  document.getElementById('gradesView').classList.add('hidden');
}

// Load timetable
async function loadTimetable() {
  try {
    const response = await fetch(`/api/timetable?quarter=${currentQuarter}`);
    timetableData = await response.json();
    renderTimetable();
  } catch (error) {
    console.error('Error loading timetable:', error);
  }
}

// Render timetable
function renderTimetable() {
  const tbody = document.getElementById('timetableBody');
  const intensiveList = document.getElementById('intensiveList');
  
  // Clear existing content
  tbody.innerHTML = '';
  intensiveList.innerHTML = '';
  
  // Create timetable grid
  const timetable = {};
  const intensiveCourses = [];
  
  // Initialize grid (5 periods x 6 days)
  for (let period = 1; period <= 5; period++) {
    timetable[period] = {
      monday: null,
      tuesday: null,
      wednesday: null,
      thursday: null,
      friday: null,
      saturday: null
    };
  }
  
  // Populate timetable
  timetableData.forEach(course => {
    if (course.day_of_week === 'intensive') {
      intensiveCourses.push(course);
    } else if (timetable[course.period]) {
      timetable[course.period][course.day_of_week] = course;
    }
  });
  
  // Render regular timetable
  for (let period = 1; period <= 5; period++) {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    
    // Period column
    const periodCell = document.createElement('td');
    periodCell.className = 'border p-2 text-center font-semibold bg-gray-50';
    periodCell.textContent = `${period}限`;
    row.appendChild(periodCell);
    
    // Day columns
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].forEach(day => {
      const cell = document.createElement('td');
      cell.className = 'border p-2 h-20 relative';
      
      const course = timetable[period][day];
      if (course) {
        const courseDiv = document.createElement('div');
        courseDiv.className = course.status === 'registered' 
          ? 'bg-blue-100 p-2 rounded cursor-pointer hover:bg-blue-200 h-full'
          : 'bg-gray-100 p-2 rounded cursor-pointer hover:bg-gray-200 h-full';
        
        courseDiv.innerHTML = `
          <div class="text-sm font-semibold">${course.course_name}</div>
          <div class="text-xs text-gray-600">${course.classroom || ''}</div>
          <div class="text-xs text-gray-500">${course.instructor || ''}</div>
        `;
        
        courseDiv.onclick = () => showCourseDetails(course);
        cell.appendChild(courseDiv);
      }
      
      row.appendChild(cell);
    });
    
    tbody.appendChild(row);
  }
  
  // Render intensive courses
  if (intensiveCourses.length > 0) {
    intensiveCourses.forEach(course => {
      const courseCard = document.createElement('div');
      courseCard.className = 'bg-white border rounded p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow';
      courseCard.innerHTML = `
        <div class="font-semibold">${course.course_name}</div>
        <div class="text-sm text-gray-600">
          ${course.instructor || ''} | ${course.credits || 1}単位 | ${course.remarks || ''}
        </div>
      `;
      courseCard.onclick = () => showCourseDetails(course);
      intensiveList.appendChild(courseCard);
    });
  } else {
    intensiveList.innerHTML = '<p class="text-gray-500">集中講義はありません</p>';
  }
}

// Show course details (placeholder)
function showCourseDetails(course) {
  alert(`講義詳細:\n${course.course_name}\n担当: ${course.instructor || '未定'}\n教室: ${course.classroom || '未定'}\n単位: ${course.credits || 1}`);
}

// Grades View Functions

let registeredCourses = [];
let currentEditingCourse = null;

// Load registered courses
async function loadRegisteredCourses() {
  try {
    const response = await fetch('/api/registrations');
    registeredCourses = await response.json();
    renderRegisteredCourses();
  } catch (error) {
    console.error('Error loading registered courses:', error);
  }
}

// Render registered courses
function renderRegisteredCourses(filterStatus = '') {
  const tbody = document.getElementById('registeredCoursesList');
  tbody.innerHTML = '';
  
  const filtered = filterStatus 
    ? registeredCourses.filter(c => c.status === filterStatus)
    : registeredCourses;
  
  filtered.forEach(course => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    
    // Status color
    let statusColor = '';
    let statusText = '';
    switch(course.status) {
      case 'completed':
        statusColor = 'bg-green-100 text-green-800';
        statusText = '取得済';
        break;
      case 'registered':
        statusColor = 'bg-yellow-100 text-yellow-800';
        statusText = '履修中';
        break;
      case 'planned':
        statusColor = 'bg-blue-100 text-blue-800';
        statusText = '履修予定';
        break;
      case 'failed':
        statusColor = 'bg-red-100 text-red-800';
        statusText = '不合格';
        break;
      case 'dropped':
        statusColor = 'bg-gray-100 text-gray-800';
        statusText = '履修取消';
        break;
      default:
        statusColor = 'bg-gray-100 text-gray-600';
        statusText = '未設定';
    }
    
    // Category text
    let categoryText = '';
    switch(course.category || course.course_type) {
      case 'general':
        categoryText = '教養';
        break;
      case 'specialized_required':
      case 'required':
        categoryText = '専門必修';
        break;
      case 'specialized_elective':
      case 'elective':
        categoryText = '専門選択';
        break;
      case 'foreign_language':
        categoryText = '外国語';
        break;
      case 'free':
        categoryText = '自由';
        break;
      default:
        categoryText = '一般';
    }
    
    row.innerHTML = `
      <td class="px-4 py-2 border-b">${course.course_code || ''}</td>
      <td class="px-4 py-2 border-b font-medium">${course.course_name || ''}</td>
      <td class="px-4 py-2 border-b">${course.instructor || ''}</td>
      <td class="px-4 py-2 border-b text-center">${course.credits || 1}</td>
      <td class="px-4 py-2 border-b">${categoryText}</td>
      <td class="px-4 py-2 border-b">
        <span class="px-2 py-1 rounded text-xs font-medium ${statusColor}">
          ${statusText}
        </span>
      </td>
      <td class="px-4 py-2 border-b">
        <button onclick="editCourse(${course.course_id})" class="text-blue-600 hover:text-blue-800">
          <i class="fas fa-edit"></i>
        </button>
      </td>
    `;
    
    tbody.appendChild(row);
  });
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">登録済みの講義はありません</td></tr>';
  }
}

// Show registered courses tab
function showRegisteredCourses() {
  document.getElementById('registeredCoursesView').classList.remove('hidden');
  document.getElementById('gradeEvaluationView').classList.add('hidden');
  document.getElementById('creditSummaryView').classList.add('hidden');
  
  // Update tab styles
  document.getElementById('registeredTab').className = 'px-4 py-2 font-medium text-blue-600 border-b-2 border-blue-600';
  document.getElementById('gradeTab').className = 'px-4 py-2 font-medium text-gray-600 hover:text-gray-800';
  document.getElementById('creditTab').className = 'px-4 py-2 font-medium text-gray-600 hover:text-gray-800';
  
  loadRegisteredCourses();
}

// Show grade evaluation tab
function showGradeEvaluation() {
  document.getElementById('registeredCoursesView').classList.add('hidden');
  document.getElementById('gradeEvaluationView').classList.remove('hidden');
  document.getElementById('creditSummaryView').classList.add('hidden');
  
  // Update tab styles
  document.getElementById('registeredTab').className = 'px-4 py-2 font-medium text-gray-600 hover:text-gray-800';
  document.getElementById('gradeTab').className = 'px-4 py-2 font-medium text-blue-600 border-b-2 border-blue-600';
  document.getElementById('creditTab').className = 'px-4 py-2 font-medium text-gray-600 hover:text-gray-800';
  
  renderGradeEvaluation();
}

// Render grade evaluation
function renderGradeEvaluation() {
  const container = document.getElementById('gradeCategoryGroups');
  container.innerHTML = '';
  
  // Group courses by category
  const grouped = {};
  registeredCourses.forEach(course => {
    const category = course.category || course.course_type || 'general';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    if (course.status === 'completed' || course.grade) {
      grouped[category].push(course);
    }
  });
  
  // Render each category
  Object.entries(grouped).forEach(([category, courses]) => {
    if (courses.length === 0) return;
    
    let categoryName = '';
    switch(category) {
      case 'general': categoryName = '■教養科目・選択■'; break;
      case 'specialized_required':
      case 'required': categoryName = '■教養科目・選択必修■'; break;
      case 'specialized_elective':
      case 'elective': categoryName = '■専門・必修■'; break;
      case 'foreign_language': categoryName = '■外国語科目・必修■'; break;
      case 'free': categoryName = '■体育科目・選択必修■'; break;
      default: categoryName = '■その他■';
    }
    
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'bg-white rounded-lg shadow mb-4';
    
    let tableHtml = `
      <div class="p-4 bg-pink-50 border-b">
        <h4 class="font-semibold">${categoryName}</h4>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-gray-50 text-left text-sm">
              <th class="px-4 py-2 border-b">分野系列名／科目名</th>
              <th class="px-4 py-2 border-b text-center">単位</th>
              <th class="px-4 py-2 border-b text-center">評価</th>
              <th class="px-4 py-2 border-b text-center">年度</th>
              <th class="px-4 py-2 border-b text-center">期間</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    courses.forEach(course => {
      const gradeDisplay = userSettings?.grade_display_format === 'alphabet' 
        ? convertGrade(course.grade, 'alphabet')
        : course.grade || '-';
      
      const gradeColor = course.grade === '不可' || course.grade === 'E' 
        ? 'text-red-600' 
        : '';
      
      tableHtml += `
        <tr class="hover:bg-gray-50">
          <td class="px-4 py-2 border-b">${course.course_name}</td>
          <td class="px-4 py-2 border-b text-center">${course.credits || 1}</td>
          <td class="px-4 py-2 border-b text-center ${gradeColor}">${gradeDisplay}</td>
          <td class="px-4 py-2 border-b text-center">${course.year || new Date().getFullYear()}</td>
          <td class="px-4 py-2 border-b text-center">${course.quarter || '通年'}</td>
        </tr>
      `;
    });
    
    tableHtml += `
          </tbody>
        </table>
      </div>
    `;
    
    categoryDiv.innerHTML = tableHtml;
    container.appendChild(categoryDiv);
  });
  
  if (container.innerHTML === '') {
    container.innerHTML = '<div class="bg-white rounded-lg shadow p-6 text-center text-gray-500">評価済みの講義はありません</div>';
  }
}

// Convert grade format
function convertGrade(grade, format) {
  const gradeMap = {
    '秀': 'A',
    '優': 'B',
    '良': 'C',
    '可': 'D',
    '不可': 'E',
    'A': '秀',
    'B': '優',
    'C': '良',
    'D': '可',
    'E': '不可'
  };
  
  if (format === 'alphabet') {
    return gradeMap[grade] || grade || '-';
  } else {
    return gradeMap[grade] || grade || '-';
  }
}

// Show credit summary tab
async function showCreditSummary() {
  document.getElementById('registeredCoursesView').classList.add('hidden');
  document.getElementById('gradeEvaluationView').classList.add('hidden');
  document.getElementById('creditSummaryView').classList.remove('hidden');
  
  // Update tab styles
  document.getElementById('registeredTab').className = 'px-4 py-2 font-medium text-gray-600 hover:text-gray-800';
  document.getElementById('gradeTab').className = 'px-4 py-2 font-medium text-gray-600 hover:text-gray-800';
  document.getElementById('creditTab').className = 'px-4 py-2 font-medium text-blue-600 border-b-2 border-blue-600';
  
  // Load and render credit summary
  try {
    const response = await fetch('/api/credit-summary');
    const data = await response.json();
    
    renderCreditSummary(data);
  } catch (error) {
    console.error('Error loading credit summary:', error);
  }
}

// Render credit summary
function renderCreditSummary(data) {
  // Credit summary
  const summaryContent = document.getElementById('creditSummaryContent');
  let summaryHtml = '<table class="w-full">';
  summaryHtml += '<thead><tr class="border-b"><th class="text-left py-2">区分</th><th class="text-right py-2">取得済</th><th class="text-right py-2">履修中</th></tr></thead><tbody>';
  
  const categoryNames = {
    'general': '教養科目',
    'specialized_required': '専門必修',
    'specialized_elective': '専門選択',
    'foreign_language': '外国語',
    'free': '自由'
  };
  
  let totalEarned = 0;
  let totalRegistered = 0;
  
  data.earned.forEach(item => {
    summaryHtml += `
      <tr class="border-b">
        <td class="py-2">${categoryNames[item.category] || item.category}</td>
        <td class="text-right py-2">${item.earned_credits || 0}</td>
        <td class="text-right py-2">${item.registered_credits || 0}</td>
      </tr>
    `;
    totalEarned += item.earned_credits || 0;
    totalRegistered += item.registered_credits || 0;
  });
  
  summaryHtml += `
    <tr class="font-bold">
      <td class="py-2">合計</td>
      <td class="text-right py-2">${totalEarned}</td>
      <td class="text-right py-2">${totalRegistered}</td>
    </tr>
  `;
  summaryHtml += '</tbody></table>';
  summaryContent.innerHTML = summaryHtml;
  
  // Graduation requirements
  const requirementsContent = document.getElementById('graduationRequirements');
  let reqHtml = '<table class="w-full">';
  reqHtml += '<thead><tr class="border-b"><th class="text-left py-2">要件</th><th class="text-right py-2">必要単位</th><th class="text-right py-2">不足単位</th></tr></thead><tbody>';
  
  data.requirements.forEach(req => {
    const earned = data.earned.find(e => e.category === req.category);
    const earnedCredits = earned ? earned.earned_credits : 0;
    const remaining = Math.max(0, req.required_credits - earnedCredits);
    
    let categoryName = '';
    if (req.category === 'total') {
      categoryName = '卒業要件合計';
    } else {
      categoryName = categoryNames[req.category] || req.category;
    }
    
    reqHtml += `
      <tr class="border-b ${req.category === 'total' ? 'font-bold' : ''}">
        <td class="py-2">${categoryName}</td>
        <td class="text-right py-2">${req.required_credits}</td>
        <td class="text-right py-2 ${remaining > 0 ? 'text-red-600' : 'text-green-600'}">${remaining}</td>
      </tr>
    `;
  });
  
  reqHtml += '</tbody></table>';
  requirementsContent.innerHTML = reqHtml;
  
  // GPA
  const gpaDisplay = document.getElementById('gpaDisplay');
  const gpa = data.gpa ? data.gpa.toFixed(2) : '0.00';
  gpaDisplay.innerHTML = `GPA: ${gpa} / 4.00`;
}

// Filter courses
function filterCourses() {
  const filterValue = document.getElementById('statusFilter').value;
  renderRegisteredCourses(filterValue);
}

// Edit course
function editCourse(courseId) {
  const course = registeredCourses.find(c => c.course_id === courseId);
  if (!course) return;
  
  currentEditingCourse = course;
  
  // Populate form
  document.getElementById('editCourseId').value = course.course_id;
  document.getElementById('editCourseCode').value = course.course_code || '';
  document.getElementById('editCourseName').value = course.course_name || '';
  document.getElementById('editInstructor').value = course.instructor || '';
  document.getElementById('editClassroom').value = course.classroom || '';
  document.getElementById('editCredits').value = course.credits || 1;
  document.getElementById('editCategory').value = course.category || course.course_type || 'general';
  document.getElementById('editStatus').value = course.status || 'registered';
  document.getElementById('editGrade').value = course.grade || '';
  document.getElementById('editRemarks').value = course.remarks || '';
  
  // Update grade options based on user settings
  const gradeSelect = document.getElementById('editGrade');
  if (userSettings?.grade_display_format === 'alphabet') {
    gradeSelect.innerHTML = `
      <option value="">未評価</option>
      <option value="A">A</option>
      <option value="B">B</option>
      <option value="C">C</option>
      <option value="D">D</option>
      <option value="E">E</option>
    `;
    gradeSelect.value = convertGrade(course.grade, 'alphabet');
  }
  
  // Show modal
  document.getElementById('courseEditModal').classList.remove('hidden');
}

// Close edit modal
function closeEditModal() {
  document.getElementById('courseEditModal').classList.add('hidden');
  currentEditingCourse = null;
}

// Save course edit
async function saveCourseEdit() {
  const courseId = document.getElementById('editCourseId').value;
  
  const courseData = {
    course_name: document.getElementById('editCourseName').value,
    instructor: document.getElementById('editInstructor').value,
    classroom: document.getElementById('editClassroom').value,
    credits: parseFloat(document.getElementById('editCredits').value),
    category: document.getElementById('editCategory').value,
    course_type: document.getElementById('editCategory').value,
    remarks: document.getElementById('editRemarks').value
  };
  
  const registrationData = {
    status: document.getElementById('editStatus').value,
    grade: document.getElementById('editGrade').value,
    grade_format: userSettings?.grade_display_format || 'japanese'
  };
  
  try {
    // Update course information
    await fetch(`/api/courses/${courseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courseData)
    });
    
    // Update registration information
    await fetch(`/api/registrations/${courseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationData)
    });
    
    alert('講義情報を更新しました');
    closeEditModal();
    
    // Reload data based on current view
    if (!document.getElementById('registeredCoursesView').classList.contains('hidden')) {
      loadRegisteredCourses();
    } else if (!document.getElementById('gradeEvaluationView').classList.contains('hidden')) {
      loadRegisteredCourses().then(() => renderGradeEvaluation());
    } else if (!document.getElementById('creditSummaryView').classList.contains('hidden')) {
      showCreditSummary();
    }
  } catch (error) {
    console.error('Error saving course edit:', error);
    alert('更新に失敗しました');
  }
}