document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let tasks = JSON.parse(localStorage.getItem('nova_tasks')) || [
        { id: 1, title: 'Antigravity 웹 앱 디자인 검토', category: '디자인', completed: true },
        { id: 2, title: 'Vite & React 템플릿 테스트 실행', category: '개발', completed: true },
        { id: 3, title: '새로운 대시보드 위젯 컴포넌트 추가', category: '개발', completed: false },
        { id: 4, title: '사용자 가이드 및 설명 문서 작성', category: '기획', completed: false }
    ];

    let notes = JSON.parse(localStorage.getItem('nova_notes')) || [
        { id: 1, title: '아이디어 구상', content: '실시간 데이터 시각화 차트에 애니메이션 추가하기.', date: '2026-07-22' },
        { id: 2, title: '개발 체크리스트', content: '1. UI 테마 스위처 테스트\n2. LocalStorage 데이터 저장 테스트', date: '2026-07-21' }
    ];

    let currentNoteId = notes.length > 0 ? notes[0].id : null;
    let currentFilter = 'all';

    // Elements
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    const themeBtns = document.querySelectorAll('.theme-btn');
    const clockTime = document.getElementById('clock-time');
    const clockDate = document.getElementById('clock-date');

    // Live Clock
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        clockTime.textContent = `${hours}:${minutes}:${seconds}`;

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayName = days[now.getDay()];
        clockDate.textContent = `${year}.${month}.${day} (${dayName})`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Tab Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');
            navItems.forEach(n => n.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            item.classList.add('active');
            document.getElementById(`view-${targetTab}`).classList.add('active');
        });
    });

    document.getElementById('dash-see-all')?.addEventListener('click', () => {
        document.querySelector('[data-tab="tasks"]').click();
    });

    // Theme Switcher
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            document.body.className = theme;
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Tasks Management
    function saveTasks() {
        localStorage.setItem('nova_tasks', JSON.stringify(tasks));
        renderTasks();
    }

    function renderTasks() {
        const dashTaskList = document.getElementById('dash-task-list');
        const fullTaskList = document.getElementById('full-task-list');
        const dashCompletedCount = document.getElementById('dash-completed-count');

        const completedCount = tasks.filter(t => t.completed).length;
        if (dashCompletedCount) {
            dashCompletedCount.textContent = `${completedCount} / ${tasks.length}`;
        }

        // Dashboard Preview List
        if (dashTaskList) {
            dashTaskList.innerHTML = tasks.slice(0, 3).map(task => `
                <li class="task-item ${task.completed ? 'completed' : ''}">
                    <div class="task-left">
                        <span class="task-text">${task.title}</span>
                    </div>
                    <span class="task-cat">${task.category}</span>
                </li>
            `).join('');
        }

        // Full Task List with Filter
        if (fullTaskList) {
            const filteredTasks = tasks.filter(task => {
                if (currentFilter === 'active') return !task.completed;
                if (currentFilter === 'completed') return task.completed;
                return true;
            });

            fullTaskList.innerHTML = filteredTasks.map(task => `
                <li class="task-item ${task.completed ? 'completed' : ''}">
                    <div class="task-left">
                        <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.completed ? 'checked' : ''}>
                        <span class="task-text">${task.title}</span>
                    </div>
                    <div class="task-right">
                        <span class="task-cat">${task.category}</span>
                        <button class="btn-text btn-delete-task" data-id="${task.id}" style="color:#ef4444; margin-left: 10px;">삭제</button>
                    </div>
                </li>
            `).join('');

            // Attach Checkbox Events
            fullTaskList.querySelectorAll('.task-checkbox').forEach(chk => {
                chk.addEventListener('change', (e) => {
                    const id = Number(e.target.getAttribute('data-id'));
                    const task = tasks.find(t => t.id === id);
                    if (task) {
                        task.completed = e.target.checked;
                        saveTasks();
                    }
                });
            });

            // Attach Delete Events
            fullTaskList.querySelectorAll('.btn-delete-task').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = Number(e.target.getAttribute('data-id'));
                    tasks = tasks.filter(t => t.id !== id);
                    saveTasks();
                });
            });
        }
    }

    // Add Task Form
    const addTaskForm = document.getElementById('add-task-form');
    if (addTaskForm) {
        addTaskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const titleInput = document.getElementById('new-task-title');
            const catSelect = document.getElementById('new-task-category');

            if (titleInput.value.trim() !== '') {
                const newTask = {
                    id: Date.now(),
                    title: titleInput.value.trim(),
                    category: catSelect.value,
                    completed: false
                };
                tasks.unshift(newTask);
                titleInput.value = '';
                saveTasks();
            }
        });
    }

    // Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderTasks();
        });
    });

    // Quick Note (Dashboard)
    const quickNoteInput = document.getElementById('quick-note-input');
    const noteStatusMsg = document.getElementById('note-status-msg');
    const savedQuickNote = localStorage.getItem('nova_quick_note') || '';
    if (quickNoteInput) {
        quickNoteInput.value = savedQuickNote;
        quickNoteInput.addEventListener('input', () => {
            localStorage.setItem('nova_quick_note', quickNoteInput.value);
            if (noteStatusMsg) {
                noteStatusMsg.textContent = '저장됨 ✓';
                setTimeout(() => { noteStatusMsg.textContent = ''; }, 2000);
            }
        });
    }

    // Notes App Manager
    function saveNotes() {
        localStorage.setItem('nova_notes', JSON.stringify(notes));
        renderNotes();
    }

    function renderNotes() {
        const notesSidebarList = document.getElementById('notes-sidebar-list');
        const titleInput = document.getElementById('note-editor-title');
        const contentInput = document.getElementById('note-editor-content');

        if (notesSidebarList) {
            notesSidebarList.innerHTML = notes.map(note => `
                <div class="note-item ${note.id === currentNoteId ? 'active' : ''}" data-id="${note.id}">
                    <div class="note-item-title">${note.title || '제목 없음'}</div>
                    <div class="note-item-date">${note.date}</div>
                </div>
            `).join('');

            notesSidebarList.querySelectorAll('.note-item').forEach(item => {
                item.addEventListener('click', () => {
                    currentNoteId = Number(item.getAttribute('data-id'));
                    renderNotes();
                });
            });
        }

        const activeNote = notes.find(n => n.id === currentNoteId);
        if (activeNote && titleInput && contentInput) {
            titleInput.value = activeNote.title;
            contentInput.value = activeNote.content;
        } else if (titleInput && contentInput) {
            titleInput.value = '';
            contentInput.value = '';
        }
    }

    document.getElementById('btn-save-note')?.addEventListener('click', () => {
        const title = document.getElementById('note-editor-title').value;
        const content = document.getElementById('note-editor-content').value;
        const activeNote = notes.find(n => n.id === currentNoteId);

        if (activeNote) {
            activeNote.title = title;
            activeNote.content = content;
            saveNotes();
            alert('메모가 저장되었습니다.');
        }
    });

    document.getElementById('btn-new-note')?.addEventListener('click', () => {
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        const newNote = {
            id: Date.now(),
            title: '새 메모',
            content: '',
            date: dateStr
        };
        notes.unshift(newNote);
        currentNoteId = newNote.id;
        saveNotes();
    });

    document.getElementById('btn-delete-note')?.addEventListener('click', () => {
        if (currentNoteId && notes.length > 0) {
            notes = notes.filter(n => n.id !== currentNoteId);
            currentNoteId = notes.length > 0 ? notes[0].id : null;
            saveNotes();
        }
    });

    // Quick Action button in header
    document.getElementById('btn-quick-action')?.addEventListener('click', () => {
        document.querySelector('[data-tab="tasks"]').click();
        document.getElementById('new-task-title').focus();
    });

    // Initial Render
    renderTasks();
    renderNotes();
});
