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