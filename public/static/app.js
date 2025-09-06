// Global state
let currentView = 'timetable';
let userSettings = null;
let currentQuarter = 'Q1';
let currentYear = new Date().getFullYear();
let timetableData = [];
let deleteMode = false;
let selectedForDeletion = new Set();

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
          document.getElementById('currentGrade').value = data.current_grade || 1;
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
  const currentGrade = document.getElementById('currentGrade').value;
  const gradeFormat = document.getElementById('gradeFormat').value;
  
  if (!faculty || !department) {
    alert('学部と学科を選択してください。');
    return;
  }
  
  const settings = {
    faculty,
    department,
    admission_year: parseInt(admissionYear),
    current_grade: parseInt(currentGrade),
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
    userInfo.textContent = `${userSettings.faculty} ${userSettings.department} ${grade}年生`;
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

// Change year
function changeYear() {
  currentYear = document.getElementById('yearSelect').value;
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

function showRegisteredCoursesList() {
  hideAllViews();
  document.getElementById('registeredCoursesListView').classList.remove('hidden');
  currentView = 'registeredCoursesList';
  loadRegisteredCourses();
}

function showGrades() {
  hideAllViews();
  document.getElementById('gradesView').classList.remove('hidden');
  currentView = 'grades';
  showGradeEvaluation(); // Default to grade evaluation tab
}

function showDebugMenu() {
  hideAllViews();
  document.getElementById('debugMenuView').classList.remove('hidden');
  currentView = 'debug';
}

function hideAllViews() {
  document.getElementById('timetableView').classList.add('hidden');
  document.getElementById('settingsView').classList.add('hidden');
  document.getElementById('courseRegistrationView').classList.add('hidden');
  document.getElementById('registeredCoursesListView').classList.add('hidden');
  document.getElementById('gradesView').classList.add('hidden');
  document.getElementById('debugMenuView')?.classList.add('hidden');
}

// Load timetable
async function loadTimetable() {
  try {
    const response = await fetch(`/api/timetable?quarter=${currentQuarter}&year=${currentYear}`);
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
  const daysWithCourses = new Set();
  
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
  
  // Populate timetable and track which days have courses
  timetableData.forEach(course => {
    if (course.day_of_week === 'intensive') {
      intensiveCourses.push(course);
    } else if (timetable[course.period]) {
      timetable[course.period][course.day_of_week] = course;
      daysWithCourses.add(course.day_of_week);
    }
  });
  
  // Always show Monday-Saturday
  const daysToShow = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayNames = {
    monday: '月',
    tuesday: '火',
    wednesday: '水',
    thursday: '木',
    friday: '金',
    saturday: '土'
  };
  
  // Update table header with fixed width for period column
  const table = tbody.closest('table');
  const thead = table.querySelector('thead');
  thead.innerHTML = `
    <tr class="bg-gray-100">
      <th class="border p-2" style="width: 80px; min-width: 80px; max-width: 80px;">時限</th>
      ${daysToShow.map(day => `<th class="border p-2" style="width: calc((100% - 80px) / ${daysToShow.length});">${dayNames[day]}</th>`).join('')}
    </tr>
  `;
  
  // Render regular timetable
  for (let period = 1; period <= 5; period++) {
    const row = document.createElement('tr');
    // Add striped background for even rows
    row.className = period % 2 === 0 ? 'bg-gray-50 hover:bg-gray-100' : 'hover:bg-gray-50';
    
    // Period column with fixed width
    const periodCell = document.createElement('td');
    periodCell.className = 'border p-2 text-center font-semibold bg-gray-100';
    periodCell.style.width = '80px';
    periodCell.style.minWidth = '80px';
    periodCell.style.maxWidth = '80px';
    periodCell.textContent = `${period}限`;
    row.appendChild(periodCell);
    
    // Day columns with equal width
    daysToShow.forEach(day => {
      const cell = document.createElement('td');
      cell.className = 'border p-2 h-20 relative';
      cell.style.width = `calc((100% - 80px) / ${daysToShow.length})`;
      
      const course = timetable[period][day];
      if (course) {
        const courseDiv = document.createElement('div');
        courseDiv.className = 'bg-gray-100 p-2 rounded cursor-pointer hover:bg-gray-200 h-full overflow-hidden';
        
        // Dynamic text truncation based on available space
        const courseName = course.course_name;
        const instructor = course.instructor || '';
        
        courseDiv.innerHTML = `
          <div class="text-sm font-semibold overflow-hidden text-ellipsis whitespace-nowrap" title="${course.course_name}">${courseName}</div>
          <div class="text-xs text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap">${course.classroom || ''}</div>
          <div class="text-xs text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap" title="${course.instructor || ''}">${instructor}</div>
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
  alert(`講義詳細:\n${course.course_name}\n担当: ${course.instructor || '未定'}\n教室: ${course.classroom || '未定'}\n単位: ${course.credits || 0}`);
}

// Toggle delete mode
function toggleDeleteMode() {
  deleteMode = !deleteMode;
  selectedForDeletion.clear();
  
  const deleteBtn = document.getElementById('deleteToggleBtn');
  const deleteHeader = document.getElementById('deleteHeader');
  const deleteContainer = document.getElementById('deleteButtonContainer');
  
  if (deleteMode) {
    deleteBtn.classList.add('bg-gray-600');
    deleteBtn.classList.remove('bg-red-500');
    deleteBtn.innerHTML = '<i class="fas fa-times mr-1"></i>キャンセル';
    deleteHeader.classList.remove('hidden');
    deleteContainer.classList.remove('hidden');
  } else {
    deleteBtn.classList.remove('bg-gray-600');
    deleteBtn.classList.add('bg-red-500');
    deleteBtn.innerHTML = '<i class="fas fa-trash mr-1"></i>削除モード';
    deleteHeader.classList.add('hidden');
    deleteContainer.classList.add('hidden');
  }
  
  renderRegisteredCourses(document.getElementById('statusFilter').value);
}

// Toggle course selection for deletion
function toggleCourseSelection(courseId) {
  if (selectedForDeletion.has(courseId)) {
    selectedForDeletion.delete(courseId);
  } else {
    selectedForDeletion.add(courseId);
  }
}

// Toggle select all for deletion
function toggleSelectAll() {
  const selectAll = document.getElementById('selectAllDelete');
  const checkboxes = document.querySelectorAll('.delete-checkbox');
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAll.checked;
    const courseId = parseInt(checkbox.dataset.courseId);
    if (selectAll.checked) {
      selectedForDeletion.add(courseId);
    } else {
      selectedForDeletion.delete(courseId);
    }
  });
}

// Delete selected courses
async function deleteSelectedCourses() {
  if (selectedForDeletion.size === 0) {
    alert('削除する講義を選択してください。');
    return;
  }
  
  if (!confirm(`${selectedForDeletion.size}件の講義を削除しますか？`)) {
    return;
  }
  
  try {
    for (const courseId of selectedForDeletion) {
      await fetch(`/api/registrations/${courseId}`, {
        method: 'DELETE'
      });
    }
    
    alert('選択した講義を削除しました。');
    toggleDeleteMode();
    loadRegisteredCourses();
  } catch (error) {
    console.error('Error deleting courses:', error);
    alert('削除に失敗しました。');
  }
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
function renderRegisteredCourses(filters = {}) {
  const tbody = document.getElementById('registeredCoursesList');
  tbody.innerHTML = '';
  
  // Apply filters
  let filtered = registeredCourses;
  
  if (filters.status !== undefined && filters.status !== '') {
    if (filters.status === 'none') {
      filtered = filtered.filter(c => !c.status || c.status === '');
    } else {
      filtered = filtered.filter(c => c.status === filters.status);
    }
  }
  
  if (filters.year !== undefined && filters.year !== '') {
    filtered = filtered.filter(c => c.course_year == filters.year);
  }
  
  if (filters.category !== undefined && filters.category !== '') {
    filtered = filtered.filter(c => (c.category || c.course_type) === filters.category);
  }
  
  if (filters.credits !== undefined && filters.credits !== '') {
    const creditsValue = parseFloat(filters.credits);
    if (creditsValue >= 3) {
      filtered = filtered.filter(c => (c.credits || 0) >= 3);
    } else {
      filtered = filtered.filter(c => (c.credits || 0) == creditsValue);
    }
  }
  
  if (filters.targetYear !== undefined && filters.targetYear !== '') {
    filtered = filtered.filter(c => c.target_year == filters.targetYear);
  }
  
  if (filters.department !== undefined && filters.department !== '') {
    filtered = filtered.filter(c => c.department === filters.department || c.department === '共通');
  }
  
  if (filters.eligibility !== undefined && filters.eligibility !== '') {
    // Check eligibility based on user settings and enrollment_target
    if (userSettings && userSettings.admission_year && userSettings.faculty) {
      const currentYear = new Date().getFullYear();
      const admissionYear = userSettings.admission_year % 100; // Get last 2 digits
      
      filtered = filtered.filter(c => {
        if (!c.enrollment_target) return filters.eligibility === 'eligible';
        
        try {
          const target = JSON.parse(c.enrollment_target);
          if (!target['受講対象'] || !Array.isArray(target['受講対象'])) {
            return filters.eligibility === 'eligible';
          }
          
          let isEligible = false;
          for (const condition of target['受講対象']) {
            const maxYear = condition['最大入学年度'];
            const minYear = condition['最小入学年度'];
            const faculties = condition['対象学部'] || [];
            
            if (admissionYear >= minYear && admissionYear <= maxYear) {
              if (faculties.length === 0 || faculties.includes(userSettings.faculty)) {
                isEligible = true;
                break;
              }
            }
          }
          
          return filters.eligibility === 'eligible' ? isEligible : !isEligible;
        } catch (e) {
          return filters.eligibility === 'eligible';
        }
      });
    }
  }
  
  filtered.forEach((course, index) => {
    const row = document.createElement('tr');
    // Add striped background
    row.className = index % 2 === 0 ? 'hover:bg-gray-100' : 'bg-gray-50 hover:bg-gray-100';
    
    // Status color
    let statusColor = '';
    let statusText = '';
    if (!course.status || course.status === '') {
      statusColor = '';
      statusText = '';
    } else {
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
          statusColor = '';
          statusText = '';
      }
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
    
    // Add checkbox column for delete mode
    let checkboxCell = deleteMode ? `<td class="px-2 py-2 border-b">
        <input type="checkbox" class="delete-checkbox" data-course-id="${course.course_id}" onchange="toggleCourseSelection(${course.course_id})">
      </td>` : '';
    
    row.innerHTML = `
      ${checkboxCell}
      <td class="px-4 py-2 border-b">${course.course_code || ''}</td>
      <td class="px-4 py-2 border-b font-medium">${course.course_name || ''}</td>
      <td class="px-4 py-2 border-b">${course.instructor || ''}</td>
      <td class="px-4 py-2 border-b text-left">${course.credits || 0}</td>
      <td class="px-4 py-2 border-b">${categoryText}</td>
      <td class="px-4 py-2 border-b">
        ${statusText ? `<span class="px-2 py-1 rounded text-xs font-medium ${statusColor}">${statusText}</span>` : ''}
      </td>
      <td class="px-4 py-2 border-b text-center">
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



// Show grade evaluation tab
async function showGradeEvaluation() {
  document.getElementById('gradeEvaluationView').classList.remove('hidden');
  document.getElementById('creditSummaryView').classList.add('hidden');
  
  // Update tab styles
  document.getElementById('gradeTab').className = 'px-4 py-2 font-medium text-blue-600 border-b-2 border-blue-600';
  document.getElementById('creditTab').className = 'px-4 py-2 font-medium text-gray-600 hover:text-gray-800';
  
  // Load registered courses if not loaded
  if (registeredCourses.length === 0) {
    await loadRegisteredCourses();
  }
  renderGradeEvaluation();
}

// Render grade evaluation
function renderGradeEvaluation() {
  const tbody = document.getElementById('gradeTableBody');
  tbody.innerHTML = '';
  
  // Filter and sort courses with grades
  const gradedCourses = registeredCourses
    .filter(course => course.status === 'completed' || course.grade)
    .sort((a, b) => {
      // Sort by category first, then by course name
      const categoryOrder = ['general', 'foreign_language', 'specialized_required', 'specialized_elective', 'free'];
      const catA = categoryOrder.indexOf(a.category || a.course_type || 'general');
      const catB = categoryOrder.indexOf(b.category || b.course_type || 'general');
      if (catA !== catB) return catA - catB;
      return (a.course_name || '').localeCompare(b.course_name || '');
    });
  
  let lastCategory = '';
  gradedCourses.forEach(course => {
    const category = course.category || course.course_type || 'general';
    
    // Add category header row if category changed
    if (category !== lastCategory) {
      let categoryName = '';
      switch(category) {
        case 'general': categoryName = '■教養科目■'; break;
        case 'specialized_required':
        case 'required': categoryName = '■専門必修■'; break;
        case 'specialized_elective':
        case 'elective': categoryName = '■専門選択■'; break;
        case 'foreign_language': categoryName = '■外国語科目■'; break;
        case 'free': categoryName = '■自由科目■'; break;
        default: categoryName = '■その他■';
      }
      
      const headerRow = document.createElement('tr');
      headerRow.className = 'bg-pink-100';
      headerRow.innerHTML = `
        <td colspan="5" class="px-4 py-2 font-semibold">${categoryName}</td>
      `;
      tbody.appendChild(headerRow);
      lastCategory = category;
    }
    
    // Add course row
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    
    const gradeDisplay = userSettings?.grade_display_format === 'alphabet' 
      ? convertGrade(course.grade, 'alphabet')
      : course.grade || '-';
    
    const gradeColor = course.grade === '不可' || course.grade === 'E' 
      ? 'text-red-600' 
      : '';
    
    row.innerHTML = `
      <td class="px-4 py-2 border-b">${course.course_name}</td>
      <td class="px-4 py-2 border-b text-center">${course.credits || 0}</td>
      <td class="px-4 py-2 border-b text-center ${gradeColor}">${gradeDisplay}</td>
      <td class="px-4 py-2 border-b text-center">${course.year || new Date().getFullYear()}</td>
      <td class="px-4 py-2 border-b text-center">${course.quarter || '通年'}</td>
    `;
    
    tbody.appendChild(row);
  });
  
  if (gradedCourses.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">評価済みの講義はありません</td></tr>';
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
  document.getElementById('gradeEvaluationView').classList.add('hidden');
  document.getElementById('creditSummaryView').classList.remove('hidden');
  
  // Update tab styles
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
  const filters = {
    status: document.getElementById('statusFilter').value,
    year: document.getElementById('yearFilter')?.value,
    category: document.getElementById('categoryFilter')?.value,
    credits: document.getElementById('creditsFilter')?.value,
    targetYear: document.getElementById('targetYearFilter')?.value,
    department: document.getElementById('departmentFilter')?.value,
    eligibility: document.getElementById('eligibilityFilter')?.value
  };
  renderRegisteredCourses(filters);
}

// Edit course
async function editCourse(courseId) {
  const course = registeredCourses.find(c => c.course_id === courseId);
  if (!course) return;
  
  currentEditingCourse = course;
  
  // Populate form
  document.getElementById('editCourseId').value = course.course_id;
  document.getElementById('editCourseCode').value = course.course_code || '';
  document.getElementById('editCourseName').value = course.course_name || '';
  document.getElementById('editCourseYear').value = course.year || course.course_year || new Date().getFullYear();
  document.getElementById('editTargetYear').value = course.target_year || 1;
  document.getElementById('editInstructor').value = course.instructor || '';
  document.getElementById('editClassroom').value = course.classroom || '';
  document.getElementById('editCredits').value = course.credits || 0;
  document.getElementById('editCategory').value = course.category || course.course_type || 'general';
  document.getElementById('editStatus').value = course.status || '';
  document.getElementById('editGrade').value = course.grade || '';
  document.getElementById('editRemarks').value = course.remarks || '';
  
  // Parse and display enrollment targets
  renderEnrollmentTargetEditor(course.enrollment_target);
  
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
  
  // Load and display schedules
  try {
    const response = await fetch(`/api/courses/${courseId}/schedules`);
    const schedules = await response.json();
    renderScheduleEditor(schedules);
  } catch (error) {
    console.error('Error loading schedules:', error);
    renderScheduleEditor([]);
  }
  
  // Show modal
  document.getElementById('courseEditModal').classList.remove('hidden');
}

// Render schedule editor
function renderScheduleEditor(schedules) {
  const container = document.getElementById('scheduleEditor');
  container.innerHTML = '';
  
  if (schedules.length === 0) {
    schedules = [{ day_of_week: '', period: '', quarter: '' }];
  }
  
  schedules.forEach((schedule, index) => {
    const row = document.createElement('div');
    row.className = 'flex gap-2 items-center';
    row.innerHTML = `
      <select class="schedule-day flex-1 border rounded px-2 py-1">
        <option value="">曜日</option>
        <option value="monday" ${schedule.day_of_week === 'monday' ? 'selected' : ''}>月</option>
        <option value="tuesday" ${schedule.day_of_week === 'tuesday' ? 'selected' : ''}>火</option>
        <option value="wednesday" ${schedule.day_of_week === 'wednesday' ? 'selected' : ''}>水</option>
        <option value="thursday" ${schedule.day_of_week === 'thursday' ? 'selected' : ''}>木</option>
        <option value="friday" ${schedule.day_of_week === 'friday' ? 'selected' : ''}>金</option>
        <option value="saturday" ${schedule.day_of_week === 'saturday' ? 'selected' : ''}>土</option>
        <option value="intensive" ${schedule.day_of_week === 'intensive' ? 'selected' : ''}>集中</option>
      </select>
      <select class="schedule-period flex-1 border rounded px-2 py-1">
        <option value="">時限</option>
        <option value="1" ${schedule.period == 1 ? 'selected' : ''}>1限</option>
        <option value="2" ${schedule.period == 2 ? 'selected' : ''}>2限</option>
        <option value="3" ${schedule.period == 3 ? 'selected' : ''}>3限</option>
        <option value="4" ${schedule.period == 4 ? 'selected' : ''}>4限</option>
        <option value="5" ${schedule.period == 5 ? 'selected' : ''}>5限</option>
        <option value="0" ${schedule.period == 0 ? 'selected' : ''}>その他</option>
      </select>
      <select class="schedule-quarter flex-1 border rounded px-2 py-1">
        <option value="">期間</option>
        <option value="Q1" ${schedule.quarter === 'Q1' ? 'selected' : ''}>Q1</option>
        <option value="Q2" ${schedule.quarter === 'Q2' ? 'selected' : ''}>Q2</option>
        <option value="Q3" ${schedule.quarter === 'Q3' ? 'selected' : ''}>Q3</option>
        <option value="Q4" ${schedule.quarter === 'Q4' ? 'selected' : ''}>Q4</option>
        <option value="Q1-Q2" ${schedule.quarter === 'Q1-Q2' ? 'selected' : ''}>前期</option>
        <option value="Q3-Q4" ${schedule.quarter === 'Q3-Q4' ? 'selected' : ''}>後期</option>
        <option value="full_year" ${schedule.quarter === 'full_year' ? 'selected' : ''}>通年</option>
      </select>
      <button onclick="removeScheduleRow(this)" class="text-red-600 hover:text-red-800">
        <i class="fas fa-times"></i>
      </button>
    `;
    container.appendChild(row);
  });
}

// Add schedule row
function addScheduleRow() {
  const container = document.getElementById('scheduleEditor');
  const row = document.createElement('div');
  row.className = 'flex gap-2 items-center';
  row.innerHTML = `
    <select class="schedule-day flex-1 border rounded px-2 py-1">
      <option value="">曜日</option>
      <option value="monday">月</option>
      <option value="tuesday">火</option>
      <option value="wednesday">水</option>
      <option value="thursday">木</option>
      <option value="friday">金</option>
      <option value="saturday">土</option>
      <option value="intensive">集中</option>
    </select>
    <select class="schedule-period flex-1 border rounded px-2 py-1">
      <option value="">時限</option>
      <option value="1">1限</option>
      <option value="2">2限</option>
      <option value="3">3限</option>
      <option value="4">4限</option>
      <option value="5">5限</option>
      <option value="0">その他</option>
    </select>
    <select class="schedule-quarter flex-1 border rounded px-2 py-1">
      <option value="">期間</option>
      <option value="Q1">Q1</option>
      <option value="Q2">Q2</option>
      <option value="Q3">Q3</option>
      <option value="Q4">Q4</option>
      <option value="Q1-Q2">前期</option>
      <option value="Q3-Q4">後期</option>
      <option value="full_year">通年</option>
    </select>
    <button onclick="removeScheduleRow(this)" class="text-red-600 hover:text-red-800">
      <i class="fas fa-times"></i>
    </button>
  `;
  container.appendChild(row);
}

// Remove schedule row
function removeScheduleRow(button) {
  const row = button.parentElement;
  const container = document.getElementById('scheduleEditor');
  if (container.children.length > 1) {
    row.remove();
  }
}

// Render enrollment target editor
function renderEnrollmentTargetEditor(enrollmentTargetJson) {
  const container = document.getElementById('enrollmentTargetEditor');
  container.innerHTML = '';
  
  let targets = [];
  if (enrollmentTargetJson) {
    try {
      const parsed = JSON.parse(enrollmentTargetJson);
      targets = parsed['受講対象'] || [];
    } catch (e) {
      targets = [];
    }
  }
  
  if (targets.length === 0) {
    targets = [{ '最小入学年度': 20, '最大入学年度': 24, '対象学部': [] }];
  }
  
  targets.forEach(target => {
    addEnrollmentTargetRow(target);
  });
}

// Add enrollment target row
function addEnrollmentTargetRow(data = null) {
  const container = document.getElementById('enrollmentTargetEditor');
  const row = document.createElement('div');
  row.className = 'border rounded p-3 space-y-2';
  
  const minYear = data ? data['最小入学年度'] : 20;
  const maxYear = data ? data['最大入学年度'] : 24;
  const selectedFaculties = data ? data['対象学部'] || [] : [];
  
  const faculties = [
    '理工学部',
    '建築都市デザイン学部',
    '情報工学部',
    '環境学部',
    'メディア情報学部',
    'デザイン・データ科学部',
    '都市生活学部',
    '人間科学部'
  ];
  
  row.innerHTML = `
    <div class="flex gap-2 items-center">
      <label class="text-sm">入学年度:</label>
      <input type="number" class="enrollment-min-year border rounded px-2 py-1 w-20" min="15" max="30" value="${minYear}">
      <span>〜</span>
      <input type="number" class="enrollment-max-year border rounded px-2 py-1 w-20" min="15" max="30" value="${maxYear}">
      <button onclick="removeEnrollmentTargetRow(this)" class="text-red-600 hover:text-red-800 ml-auto">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="space-y-1">
      <label class="text-sm">対象学部（選択しない場合は全学部）:</label>
      <div class="grid grid-cols-2 gap-2">
        ${faculties.map(faculty => `
          <label class="flex items-center text-sm">
            <input type="checkbox" class="enrollment-faculty mr-1" value="${faculty}" 
              ${selectedFaculties.includes(faculty) ? 'checked' : ''}>
            ${faculty}
          </label>
        `).join('')}
      </div>
    </div>
  `;
  
  container.appendChild(row);
}

// Remove enrollment target row
function removeEnrollmentTargetRow(button) {
  const row = button.closest('.border');
  const container = document.getElementById('enrollmentTargetEditor');
  if (container.children.length > 1) {
    row.remove();
  }
}

// Close edit modal
function closeEditModal() {
  document.getElementById('courseEditModal').classList.add('hidden');
  currentEditingCourse = null;
}

// Debug Menu Functions
async function resetAllData() {
  if (!confirm('本当に全てのデータを削除してダミーデータを投入しますか？\nこの操作は取り消せません。')) {
    return;
  }
  
  try {
    const response = await fetch('/api/debug/reset-all', { method: 'POST' });
    const result = await response.json();
    
    if (response.ok) {
      alert('データをリセットしました。ページを再読み込みします。');
      location.reload();
    } else {
      alert('エラー: ' + result.error);
    }
  } catch (error) {
    console.error('Error resetting data:', error);
    alert('データのリセットに失敗しました。');
  }
}

async function clearAllData() {
  if (!confirm('本当に全てのデータを削除しますか？\nこの操作は取り消せません。')) {
    return;
  }
  
  try {
    const response = await fetch('/api/debug/clear-all', { method: 'POST' });
    const result = await response.json();
    
    if (response.ok) {
      alert('全てのデータを削除しました。ページを再読み込みします。');
      location.reload();
    } else {
      alert('エラー: ' + result.error);
    }
  } catch (error) {
    console.error('Error clearing data:', error);
    alert('データの削除に失敗しました。');
  }
}

async function clearUserSettingsOnly() {
  if (!confirm('ユーザー設定を削除して初回訪問状態にしますか？')) {
    return;
  }
  
  try {
    const response = await fetch('/api/debug/clear-user-settings', { method: 'POST' });
    const result = await response.json();
    
    if (response.ok) {
      alert('ユーザー設定を削除しました。ページを再読み込みします。');
      location.reload();
    } else {
      alert('エラー: ' + result.error);
    }
  } catch (error) {
    console.error('Error clearing user settings:', error);
    alert('ユーザー設定の削除に失敗しました。');
  }
}

async function addDummyData() {
  if (!confirm('ダミーデータを追加しますか？')) {
    return;
  }
  
  try {
    const response = await fetch('/api/debug/reset-all', { method: 'POST' });
    const result = await response.json();
    
    if (response.ok) {
      alert('ダミーデータを追加しました。');
      location.reload();
    } else {
      alert('エラー: ' + result.error);
    }
  } catch (error) {
    console.error('Error adding dummy data:', error);
    alert('ダミーデータの追加に失敗しました。');
  }
}

async function showDatabaseInfo() {
  try {
    const response = await fetch('/api/debug/info');
    const info = await response.json();
    
    if (response.ok) {
      let message = 'データベース情報:\n\n';
      for (const [table, count] of Object.entries(info)) {
        message += `${table}: ${count}件\n`;
      }
      alert(message);
    } else {
      alert('エラー: ' + info.error);
    }
  } catch (error) {
    console.error('Error getting database info:', error);
    alert('データベース情報の取得に失敗しました。');
  }
}

// Save course edit
async function saveCourseEdit() {
  const courseId = document.getElementById('editCourseId').value;
  
  // Collect schedule data
  const schedules = [];
  const scheduleRows = document.getElementById('scheduleEditor').children;
  for (const row of scheduleRows) {
    const day = row.querySelector('.schedule-day').value;
    const period = row.querySelector('.schedule-period').value;
    const quarter = row.querySelector('.schedule-quarter').value;
    if (day && period && quarter) {
      schedules.push({ day_of_week: day, period: parseInt(period), quarter });
    }
  }
  
  // Collect enrollment target data
  const enrollmentTargets = [];
  const targetRows = document.getElementById('enrollmentTargetEditor').children;
  for (const row of targetRows) {
    const minYear = row.querySelector('.enrollment-min-year').value;
    const maxYear = row.querySelector('.enrollment-max-year').value;
    const facultySelects = row.querySelectorAll('.enrollment-faculty:checked');
    const faculties = Array.from(facultySelects).map(cb => cb.value);
    
    if (minYear && maxYear) {
      enrollmentTargets.push({
        '最小入学年度': parseInt(minYear),
        '最大入学年度': parseInt(maxYear),
        '対象学部': faculties
      });
    }
  }
  
  const courseData = {
    course_name: document.getElementById('editCourseName').value,
    year: parseInt(document.getElementById('editCourseYear').value) || new Date().getFullYear(),
    target_year: parseInt(document.getElementById('editTargetYear').value) || 1,
    target_students: document.getElementById('editTargetYear').value + '年',
    enrollment_target: JSON.stringify({ '受講対象': enrollmentTargets }),
    instructor: document.getElementById('editInstructor').value,
    classroom: document.getElementById('editClassroom').value,
    credits: parseFloat(document.getElementById('editCredits').value) || 0,
    category: document.getElementById('editCategory').value,
    course_type: document.getElementById('editCategory').value,
    remarks: document.getElementById('editRemarks').value,
    schedules: schedules
  };
  
  const registrationData = {
    status: document.getElementById('editStatus').value || null,
    grade: document.getElementById('editGrade').value || null,
    grade_format: userSettings?.grade_display_format || 'japanese'
  };
  
  try {
    // Update course information
    const courseResponse = await fetch(`/api/courses/${courseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courseData)
    });
    
    if (!courseResponse.ok) {
      const error = await courseResponse.json();
      throw new Error(error.error || 'Failed to update course');
    }
    
    // Update registration information
    const regResponse = await fetch(`/api/registrations/${courseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationData)
    });
    
    if (!regResponse.ok) {
      const error = await regResponse.json();
      throw new Error(error.error || 'Failed to update registration');
    }
    
    alert('講義情報を更新しました');
    closeEditModal();
    
    // Reload data based on current view
    if (currentView === 'registeredCoursesList') {
      loadRegisteredCourses();
    } else if (currentView === 'grades') {
      if (!document.getElementById('gradeEvaluationView').classList.contains('hidden')) {
        await loadRegisteredCourses();
        renderGradeEvaluation();
      } else if (!document.getElementById('creditSummaryView').classList.contains('hidden')) {
        showCreditSummary();
      }
    }
  } catch (error) {
    console.error('Error saving course edit:', error);
    alert('更新に失敗しました: ' + error.message);
  }
}