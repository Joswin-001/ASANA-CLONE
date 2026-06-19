import React, { useState } from 'react';
import { useAsana } from '../context/AsanaContext';
import { VoiceRecorder } from './VoiceRecorder';
import * as Icons from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    activeUser,
    broadcasts,
    tasks,
    outlets,
    users,
    addTask,
    toggleTaskCompletion,
    setSelectedTaskId
  } = useAsana();

  const [scratchpad, setScratchpad] = useState(() => {
    return localStorage.getItem('asana_scratchpad') || 'Direct notes or guidelines reminder:\n- Shift change timing is strictly 9:30 AM.\n- Inspect gold display case illumination daily.\n- Check store safety alarms before locking up.';
  });

  // Delegation state for Zonal/Store managers
  const [delTitle, setDelTitle] = useState('');
  const [delAssignedId, setDelAssignedId] = useState('');
  const [delDueDate, setDelDueDate] = useState('');
  const [delPriority, setDelPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const saveScratchpad = (text: string) => {
    setScratchpad(text);
    localStorage.setItem('asana_scratchpad', text);
  };

  if (!activeUser) return null;

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Compile calculations
  const myTasks = tasks.filter(t => t.assignedToId === activeUser.id);

  const getAssigneeName = (assignedId?: string | null) => {
    return users.find(u => u.id === assignedId)?.name || 'Unassigned';
  };

  const handleDelegateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delTitle.trim() || !delAssignedId) return;

    // Delegate task in the same workspace mapping default project
    addTask('p1', 's1', {
      title: delTitle.trim(),
      assignedToId: delAssignedId,
      dueDate: delDueDate || undefined,
      priority: delPriority
    });

    setDelTitle('');
    setDelAssignedId('');
    setDelDueDate('');
    alert('Task successfully delegated!');
  };

  // Render CEO Dashboard View
  const renderCEODashboard = () => {
    return (
      <div className="dashboard-grid-layout ceo-layout">
        {/* Left: Voice broadcast recorder */}
        <div className="dashboard-col">
          <VoiceRecorder />
        </div>

        {/* Right: Outlet stats & broadcasts history */}
        <div className="dashboard-col gap-20">
          {/* Outlets Completion Stats */}
          <div className="dashboard-card-pj">
            <div className="pj-card-header">
              <Icons.TrendingUp size={16} />
              <h4>Outlets Task Completion Rates</h4>
            </div>
            <div className="outlets-stats-list">
              {outlets.map(o => {
                const outletTasks = tasks.filter(t => t.outletId === o.id);
                const outletCompleted = outletTasks.filter(t => t.completed).length;
                const percent = outletTasks.length > 0 
                  ? Math.round((outletCompleted / outletTasks.length) * 100) 
                  : 100;

                return (
                  <div key={o.id} className="outlet-stat-row">
                    <div className="outlet-stat-info">
                      <span className="out-name">{o.name}</span>
                      <span className="out-ratio">{outletCompleted}/{outletTasks.length} Done</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div 
                        className="progress-bar-fill" 
                        style={{ width: `${percent}%`, backgroundColor: percent === 100 ? 'var(--color-success)' : 'var(--accent)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CEO Recent Broadcast history logs */}
          <div className="dashboard-card-pj broadcasts-log-card">
            <div className="pj-card-header">
              <Icons.Volume2 size={16} />
              <h4>Broadcasts History</h4>
            </div>
            <div className="broadcasts-history-list">
              {broadcasts.length === 0 ? (
                <p className="no-broadcasts">No broadcasts submitted yet.</p>
              ) : (
                broadcasts.map(b => (
                  <div key={b.id} className="broadcast-history-item">
                    <div className="broadcast-meta-row">
                      <span className="b-time">{new Date(b.createdAt).toLocaleString()}</span>
                      <span className="b-targets">
                        Targets: {b.targets.roles.join(', ')}
                      </span>
                    </div>
                    <p className="b-text">"{b.transcription}"</p>
                    {b.audioBase64 && (
                      <audio src={b.audioBase64} controls className="b-audio-player" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Manager (Zonal/Store) Dashboard View
  const renderManagerDashboard = () => {
    // Zonal manager targets store managers, store manager targets employees
    const delegatableUsers = users.filter(u => {
      if (activeUser.role === 'zonal_manager') {
        return u.role === 'store_manager' && u.zoneId === activeUser.zoneId;
      }
      return u.role === 'employee' && u.outletId === activeUser.outletId;
    });

    const activeOutletTasks = tasks.filter(t => {
      if (activeUser.role === 'zonal_manager') return t.zoneId === activeUser.zoneId;
      return t.outletId === activeUser.outletId;
    });

    return (
      <div className="dashboard-grid-layout manager-layout">
        {/* Left Column: Voice Recorder & Instructions Inbox */}
        <div className="dashboard-col gap-20">
          <VoiceRecorder />

          <div className="dashboard-card-pj voice-inbox-card">
            <div className="pj-card-header">
              <Icons.Volume2 size={18} />
              <h4>CEO Voice Instructions Inbox</h4>
            </div>
            <div className="broadcasts-inbox-list">
              {broadcasts.length === 0 ? (
                <div className="empty-inbox-state">
                  <Icons.CheckCircle size={32} />
                  <p>Inbox is clear. No direct CEO voice instructions.</p>
                </div>
              ) : (
                broadcasts.map(b => (
                  <div key={b.id} className="broadcast-inbox-item animate-scale-up">
                    <div className="b-inbox-header">
                      <div className="sender-avatar">CEO</div>
                      <div className="sender-info">
                        <h5>{b.senderName}</h5>
                        <span>{new Date(b.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="b-inbox-text">"{b.transcription}"</p>
                    {b.audioBase64 && (
                      <audio src={b.audioBase64} controls className="b-audio-player" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Delegation and Outlet Status */}
        <div className="dashboard-col gap-20">
          {/* Delegate Task form */}
          <div className="dashboard-card-pj">
            <div className="pj-card-header">
              <Icons.UserPlus size={16} />
              <h4>Delegate Task / Instructions</h4>
            </div>
            <form onSubmit={handleDelegateTask} className="delegation-form-block">
              <div className="form-group-pj">
                <input
                  type="text"
                  placeholder="Task summary/objective..."
                  value={delTitle}
                  onChange={(e) => setDelTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-pj">
                <select
                  value={delAssignedId}
                  onChange={(e) => setDelAssignedId(e.target.value)}
                  required
                >
                  <option value="">Assign to Associate...</option>
                  {delegatableUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
                  ))}
                </select>
              </div>

              <div className="pj-form-row">
                <input
                  type="date"
                  value={delDueDate}
                  onChange={(e) => setDelDueDate(e.target.value)}
                />
                <select
                  value={delPriority}
                  onChange={(e) => setDelPriority(e.target.value as any)}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              <button type="submit" className="primary-btn delegate-submit-btn">
                <Icons.Send size={14} />
                Delegate Task
              </button>
            </form>
          </div>

          {/* Active store tasks list */}
          <div className="dashboard-card-pj active-store-tasks-panel">
            <div className="pj-card-header">
              <Icons.ListTodo size={16} />
              <h4>Outlet Activity tracker</h4>
            </div>
            <div className="store-tasks-tracker-list">
              {activeOutletTasks.length === 0 ? (
                <p className="no-tasks">No active tasks in your outlet.</p>
              ) : (
                activeOutletTasks.map(t => (
                  <div key={t.id} className="store-task-row" onClick={() => setSelectedTaskId(t.id)}>
                    <div 
                      className={`task-indicator-dot ${t.completed ? 'completed' : 'pending'}`} 
                    />
                    <div className="task-row-details">
                      <span className="t-row-title">{t.title}</span>
                      <span className="t-row-assignee">Assigned: {getAssigneeName(t.assignedToId)}</span>
                    </div>
                    <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Employee Dashboard View
  const renderEmployeeDashboard = () => {
    return (
      <div className="dashboard-grid-layout employee-layout">
        {/* Left Column: Direct Voice Inbox */}
        <div className="dashboard-col">
          <div className="dashboard-card-pj voice-inbox-card">
            <div className="pj-card-header">
              <Icons.Volume2 size={18} />
              <h4>My Voice Instructions Inbox</h4>
            </div>
            <div className="broadcasts-inbox-list">
              {broadcasts.length === 0 ? (
                <div className="empty-inbox-state">
                  <Icons.CheckCircle size={32} />
                  <p>All clean. No direct voice instructions from the CEO.</p>
                </div>
              ) : (
                broadcasts.map(b => (
                  <div key={b.id} className="broadcast-inbox-item animate-scale-up">
                    <div className="b-inbox-header">
                      <div className="sender-avatar">CEO</div>
                      <div className="sender-info">
                        <h5>{b.senderName}</h5>
                        <span>{new Date(b.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="b-inbox-text">"{b.transcription}"</p>
                    {b.audioBase64 && (
                      <audio src={b.audioBase64} controls className="b-audio-player" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Focused tasks checklist and Scratchpad */}
        <div className="dashboard-col gap-20">
          {/* Active Tasks Checklist */}
          <div className="dashboard-card-pj employee-tasks-panel">
            <div className="pj-card-header">
              <Icons.CheckSquare size={16} />
              <h4>My Task Checklist</h4>
            </div>
            <div className="employee-task-checkbox-list">
              {myTasks.length === 0 ? (
                <div className="empty-checklist-state">
                  <Icons.Sparkles size={28} />
                  <p>No tasks assigned directly to you. Keep up the good work!</p>
                </div>
              ) : (
                myTasks.map(task => (
                  <div key={task.id} className={`employee-task-item ${task.completed ? 'completed' : ''}`}>
                    <button 
                      className={`task-checkbox-circle ${task.completed ? 'checked' : ''}`}
                      onClick={() => toggleTaskCompletion(task.id)}
                    >
                      {task.completed && <Icons.Check size={10} />}
                    </button>
                    <div 
                      className="task-item-content-info"
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <span>{task.title}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Scratchpad */}
          <div className="dashboard-card-pj">
            <div className="pj-card-header">
              <Icons.Edit3 size={16} />
              <h4>My Scratchpad</h4>
            </div>
            <textarea
              className="scratchpad-textarea-pj"
              value={scratchpad}
              onChange={(e) => saveScratchpad(e.target.value)}
              placeholder="Jot down quick reminders..."
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pj-dashboard-container animate-fade-in">
      {/* Greetings banner */}
      <div className="pj-welcome-header">
        <p className="welcome-date">{formattedDate}</p>
        <h2>{getGreeting()}, {activeUser.name}!</h2>
        <div className="welcome-info-strip">
          <span>Role: <strong>{activeUser.role.replace('_', ' ').toUpperCase()}</strong></span>
          {activeUser.role !== 'ceo' && activeUser.role !== 'admin' && (
            <span> | Outlet: <strong>{outlets.find(o => o.id === activeUser.outletId)?.name || 'General'}</strong></span>
          )}
        </div>
      </div>

      {/* Render role-specific cockpit views */}
      {activeUser.role === 'ceo' && renderCEODashboard()}
      {(activeUser.role === 'zonal_manager' || activeUser.role === 'store_manager') && renderManagerDashboard()}
      {activeUser.role === 'employee' && renderEmployeeDashboard()}
      {activeUser.role === 'admin' && (
        <div className="admin-dashboard-placeholder">
          <Icons.ShieldAlert size={48} className="royal-icon" />
          <h3>System Settings Console</h3>
          <p>Please open the Admin Console in the sidebar to add outlets and manage employees.</p>
        </div>
      )}

      {/* Embedded dashboard-specific styles */}
      <style>{`
        .pj-dashboard-container {
          padding: 24px 32px;
          height: calc(100vh - var(--header-height));
          overflow-y: auto;
          background-color: var(--bg-secondary);
        }

        .pj-welcome-header {
          margin-bottom: 24px;
        }

        .welcome-date {
          font-size: 13px;
          color: var(--text-muted);
          font-weight: 500;
          margin-bottom: 4px;
        }

        .pj-welcome-header h2 {
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .welcome-info-strip {
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        /* Dashboard PJ Card Layout */
        .dashboard-grid-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: flex-start;
        }

        @media (max-width: 900px) {
          .dashboard-grid-layout {
            grid-template-columns: 1fr;
          }
        }

        .dashboard-col {
          display: flex;
          flex-direction: column;
        }

        .gap-20 {
          gap: 20px;
        }

        .dashboard-card-pj {
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 20px;
          box-shadow: var(--shadow-sm);
        }

        .pj-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          color: var(--primary);
          border-bottom: 1.5px solid var(--border-color);
          padding-bottom: 8px;
        }

        .pj-card-header h4 {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .royal-icon {
          color: var(--accent);
        }

        /* CEO Outlets stats */
        .outlets-stats-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .outlet-stat-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .outlet-stat-info {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 500;
        }

        .out-name {
          color: var(--text-primary);
        }

        .out-ratio {
          color: var(--text-muted);
          font-size: 11px;
        }

        .progress-bar-bg {
          height: 6px;
          background-color: var(--bg-tertiary);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width var(--transition-normal);
        }

        /* Broadcast logs CEO */
        .broadcasts-log-card {
          max-height: 280px;
          display: flex;
          flex-direction: column;
        }

        .broadcasts-history-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .broadcast-history-item {
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 10px;
        }

        .broadcast-meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .b-text {
          font-size: 12.5px;
          color: var(--text-secondary);
          line-height: 1.4;
          font-style: italic;
        }

        .b-audio-player {
          width: 100%;
          height: 28px;
          margin-top: 8px;
        }

        /* Voice Inbox Card (Manager/Employee) */
        .voice-inbox-card {
          height: 480px;
          display: flex;
          flex-direction: column;
        }

        .broadcasts-inbox-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .empty-inbox-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-muted);
          gap: 12px;
        }

        .broadcast-inbox-item {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 16px;
        }

        .b-inbox-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .sender-avatar {
          background-color: var(--accent);
          color: var(--text-inverse);
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 11px;
        }

        .sender-info h5 {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .sender-info span {
          font-size: 10px;
          color: var(--text-muted);
        }

        .b-inbox-text {
          font-size: 13px;
          color: var(--text-secondary);
          font-style: italic;
          line-height: 1.45;
        }

        /* Delegation forms */
        .delegation-form-block {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .form-group-pj input,
        .form-group-pj select,
        .pj-form-row input,
        .pj-form-row select {
          width: 100%;
          padding: 8px 12px;
          font-size: 13px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background-color: var(--bg-secondary);
        }

        .form-group-pj input:focus,
        .form-group-pj select:focus {
          outline: none;
          border-color: var(--primary);
        }

        .pj-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .delegate-submit-btn {
          width: 100%;
          justify-content: center;
          padding: 10px;
          font-size: 13px;
        }

        /* Active store tasks manager tracker list */
        .active-store-tasks-panel {
          height: 200px;
          display: flex;
          flex-direction: column;
        }

        .store-tasks-tracker-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .store-task-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          background-color: var(--bg-secondary);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }

        .store-task-row:hover {
          background-color: var(--bg-tertiary);
        }

        .task-indicator-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .task-indicator-dot.completed { background-color: var(--color-success); }
        .task-indicator-dot.pending { background-color: var(--color-warning); }

        .task-row-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .t-row-title {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .t-row-assignee {
          font-size: 10px;
          color: var(--text-muted);
        }

        /* Employee checklist panel */
        .employee-tasks-panel {
          height: 240px;
          display: flex;
          flex-direction: column;
        }

        .employee-task-checkbox-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .employee-task-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-color);
        }

        .employee-task-item.completed {
          opacity: 0.6;
        }

        .employee-task-item.completed span {
          text-decoration: line-through;
          color: var(--text-muted);
        }

        .task-item-content-info {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        .task-item-content-info:hover {
          color: var(--primary);
        }

        .empty-checklist-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-muted);
          gap: 10px;
          font-size: 12px;
        }

        /* Scratchpad Employee */
        .scratchpad-textarea-pj {
          width: 100%;
          height: 140px;
          border: none;
          resize: none;
          background-color: var(--bg-secondary);
          border-radius: var(--radius-sm);
          padding: 12px;
          font-size: 13px;
          line-height: 1.5;
        }

        .scratchpad-textarea-pj:focus {
          outline: none;
          box-shadow: inset 0 0 0 1px var(--accent);
        }

        .admin-dashboard-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          gap: 14px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
};
