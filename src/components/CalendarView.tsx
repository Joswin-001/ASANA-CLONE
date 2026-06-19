import React, { useState } from 'react';
import { useAsana } from '../context/AsanaContext';
import * as Icons from 'lucide-react';

export const CalendarView: React.FC = () => {
  const {
    activeProjectId,
    tasks,
    searchQuery,
    addTask,
    sections,
    setSelectedTaskId
  } = useAsana();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalDate, setModalDate] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [modalSectionId, setModalSectionId] = useState('');

  const projectSections = sections.filter(s => s.projectId === activeProjectId);

  // Filters tasks
  const projectTasks = tasks.filter(t => {
    if (t.projectId !== activeProjectId) return false;
    if (!t.dueDate) return false;
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(query) ||
           t.description.toLowerCase().includes(query) ||
           t.tags.some(tag => tag.toLowerCase().includes(query));
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get calendar date variables
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0-6 (Sun-Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const clickedDateStr = `${year}-${formattedMonth}-${formattedDay}`;
    
    setModalDate(clickedDateStr);
    if (projectSections.length > 0) {
      setModalSectionId(projectSections[0].id);
      setShowAddModal(true);
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !modalSectionId) return;

    addTask(activeProjectId, modalSectionId, {
      title: newTaskTitle.trim(),
      dueDate: modalDate,
      priority: 'medium'
    });

    setNewTaskTitle('');
    setShowAddModal(false);
  };

  // Compile full grid array
  const calendarCells = [];

  // 1. Previous month offset days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarCells.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      dateString: `${year}-${String(month).padStart(2, '0')}-${String(prevMonthDays - i).padStart(2, '0')}`
    });
  }

  // 2. Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(d).padStart(2, '0');
    calendarCells.push({
      day: d,
      isCurrentMonth: true,
      dateString: `${year}-${formattedMonth}-${formattedDay}`
    });
  }

  // 3. Next month offset days
  const remainingCells = 42 - calendarCells.length; // standard 6-row calendar grid
  for (let n = 1; n <= remainingCells; n++) {
    calendarCells.push({
      day: n,
      isCurrentMonth: false,
      dateString: `${year}-${String(month + 2).padStart(2, '0')}-${String(n).padStart(2, '0')}`
    });
  }

  // Helper to determine if date is today
  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  return (
    <div className="calendar-view-container animate-fade-in">
      {/* Calendar Header */}
      <div className="calendar-navigator">
        <div className="calendar-nav-title">
          <h3>{monthNames[month]} {year}</h3>
        </div>
        <div className="nav-buttons">
          <button onClick={handlePrevMonth} className="nav-arrow-btn">
            <Icons.ChevronLeft size={16} />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="secondary-btn btn-sm"
          >
            Today
          </button>
          <button onClick={handleNextMonth} className="nav-arrow-btn">
            <Icons.ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {/* Days of Week headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="grid-week-header">
            {day}
          </div>
        ))}

        {/* Days cells */}
        {calendarCells.map((cell, idx) => {
          // Find tasks due on this date
          const dateTasks = projectTasks.filter(t => t.dueDate === cell.dateString);

          return (
            <div 
              key={idx} 
              className={`calendar-day-cell ${cell.isCurrentMonth ? '' : 'outside'} ${isToday(cell.dateString) ? 'today' : ''}`}
              onClick={() => cell.isCurrentMonth && handleDayClick(cell.day)}
            >
              <span className="day-number">{cell.day}</span>

              {/* Tasks due on this day */}
              <div className="day-tasks-container">
                {dateTasks.map(t => (
                  <div
                    key={t.id}
                    className={`calendar-task-tag priority-${t.priority} ${t.completed ? 'completed' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent modal from opening
                      setSelectedTaskId(t.id);
                    }}
                    title={t.title}
                  >
                    {t.completed && <Icons.Check size={8} className="cal-check" />}
                    <span className="cal-title">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal overlay */}
      {showAddModal && (
        <div className="calendar-modal-overlay animate-fade-in">
          <div className="calendar-modal animate-scale-up">
            <div className="modal-header">
              <h3>Add Task for {modalDate}</h3>
              <button onClick={() => setShowAddModal(false)}>
                <Icons.X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Task Title</label>
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label>Section / Stage</label>
                <select
                  value={modalSectionId}
                  onChange={(e) => setModalSectionId(e.target.value)}
                  className="section-selector-dropdown"
                >
                  {projectSections.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="secondary-btn"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .calendar-view-container {
          padding: 24px 32px;
          height: calc(100vh - var(--header-height));
          background-color: var(--bg-primary);
          display: flex;
          flex-direction: column;
        }

        .calendar-navigator {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .calendar-nav-title h3 {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .nav-buttons {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nav-arrow-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
          background-color: var(--bg-primary);
          transition: background-color var(--transition-fast);
        }

        .nav-arrow-btn:hover {
          background-color: var(--bg-hover);
        }

        /* Grid */
        .calendar-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          grid-template-rows: auto repeat(6, 1fr);
          border-top: 1px solid var(--border-color);
          border-left: 1px solid var(--border-color);
          overflow-y: auto;
          background-color: var(--bg-primary);
        }

        .grid-week-header {
          padding: 8px 0;
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          border-right: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
          background-color: var(--bg-secondary);
        }

        .calendar-day-cell {
          border-right: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
          padding: 6px;
          display: flex;
          flex-direction: column;
          min-height: 80px;
          transition: background-color var(--transition-fast);
          cursor: pointer;
          overflow: hidden;
        }

        .calendar-day-cell:hover {
          background-color: var(--bg-hover);
        }

        .calendar-day-cell.outside {
          background-color: var(--bg-secondary);
          color: var(--text-muted);
          cursor: not-allowed;
          opacity: 0.5;
        }

        .calendar-day-cell.today {
          background-color: rgba(var(--primary-rgb), 0.03);
        }

        .calendar-day-cell.today .day-number {
          background-color: var(--primary);
          color: white;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        .day-number {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 4px;
          align-self: flex-start;
        }

        .day-tasks-container {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
          overflow-y: auto;
        }

        /* Calendar Task Block Tags */
        .calendar-task-tag {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .calendar-task-tag.completed {
          text-decoration: line-through;
          opacity: 0.6;
        }

        .calendar-task-tag.priority-low { background-color: var(--badge-low-bg); color: var(--badge-low-text); }
        .calendar-task-tag.priority-medium { background-color: var(--badge-medium-bg); color: var(--badge-medium-text); }
        .calendar-task-tag.priority-high { background-color: var(--badge-high-bg); color: var(--badge-high-text); }

        .cal-check {
          flex-shrink: 0;
        }

        .cal-title {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Modal specific */
        .calendar-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          backdrop-filter: blur(4px);
        }

        .calendar-modal {
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          width: 400px;
          padding: 24px;
          box-shadow: var(--shadow-xl);
        }

        .section-selector-dropdown {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          font-size: 13px;
          background-color: var(--bg-secondary);
        }
      `}</style>
    </div>
  );
};
