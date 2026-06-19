import React, { useState } from 'react';
import { useAsana } from '../context/AsanaContext';
import * as Icons from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeView,
    setActiveView,
    searchQuery,
    setSearchQuery,
    theme,
    toggleTheme,
    activeUser,
    addTask,
    outlets,
    zones
  } = useAsana();

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');

  if (!activeUser) return null;

  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    // Call context addTask
    addTask('p1', 's1', {
      title: quickTitle.trim(),
      priority: 'medium'
    });

    setQuickTitle('');
    setShowQuickAdd(false);
  };

  const getHeaderTitle = () => {
    switch (activeView) {
      case 'dashboard': return 'Dashboard';
      case 'list': return 'Task Grid';
      case 'board': return 'Kanban Columns';
      case 'calendar': return 'Monthly Schedule';
      case 'admin': return 'Admin Settings Console';
      default: return 'Parakkat Portal';
    }
  };

  const getUserContextLabel = () => {
    if (activeUser.role === 'ceo') return 'All Kerala Outlets';
    if (activeUser.role === 'zonal_manager') {
      const zone = zones.find(z => z.id === activeUser.zoneId);
      return zone ? `${zone.name} Control` : 'Zone Management';
    }
    if (activeUser.role === 'store_manager' || activeUser.role === 'employee') {
      const outlet = outlets.find(o => o.id === activeUser.outletId);
      return outlet ? outlet.name : 'Outlet Operations';
    }
    return 'Global System';
  };

  return (
    <header className="header-container glass">
      {/* Title section and Subtitle Context */}
      <div className="header-left">
        <div className="title-section-block">
          <h1 className="header-title">{getHeaderTitle()}</h1>
          <span className="header-context-label">{getUserContextLabel()}</span>
        </div>

        {activeView !== 'admin' && activeView !== 'dashboard' && (
          <div className="header-tabs">
            <button
              className={`tab-btn ${activeView === 'list' ? 'active' : ''}`}
              onClick={() => setActiveView('list')}
              title="Display task spreadsheet rows"
            >
              <Icons.ListTodo size={14} />
              <span>List</span>
            </button>
            <button
              className={`tab-btn ${activeView === 'board' ? 'active' : ''}`}
              onClick={() => setActiveView('board')}
              title="Display Kanban columns board"
            >
              <Icons.Columns size={14} />
              <span>Board</span>
            </button>
            <button
              className={`tab-btn ${activeView === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveView('calendar')}
              title="Display monthly grids calendar"
            >
              <Icons.Calendar size={14} />
              <span>Calendar</span>
            </button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="header-search">
        <Icons.Search className="search-icon" size={16} />
        <input
          type="text"
          placeholder="Search guidelines, tags, or summaries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="clear-search" onClick={() => setSearchQuery('')}>
            <Icons.X size={14} />
          </button>
        )}
      </div>

      {/* Actions (Create Task, Toggle Theme, Profile) */}
      <div className="header-actions">
        {/* Only CEO, Admin and Managers can create manual tasks */}
        {activeUser.role !== 'employee' && activeView !== 'dashboard' && activeView !== 'admin' && (
          <div className="quick-add-wrapper">
            <button 
              className="primary-btn quick-create-btn"
              onClick={() => setShowQuickAdd(!showQuickAdd)}
            >
              <Icons.Plus size={16} />
              <span>Add task</span>
            </button>
            
            {showQuickAdd && (
              <div className="quick-add-dropdown animate-scale-up">
                <form onSubmit={handleQuickAddTask}>
                  <input
                    type="text"
                    placeholder="Task summary/action item..."
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    autoFocus
                    required
                  />
                  <div className="dropdown-actions">
                    <button 
                      type="button" 
                      className="secondary-btn btn-sm"
                      onClick={() => setShowQuickAdd(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="primary-btn btn-sm">
                      Create
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        <button 
          className="icon-action-btn theme-toggle" 
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Icons.Moon size={18} /> : <Icons.Sun size={18} />}
        </button>

        <div className="avatar-wrapper">
          <div 
            className="avatar header-avatar" 
            style={{ backgroundColor: activeUser.color || '#7c1a22' }}
            title={`Logged in as ${activeUser.name} (${activeUser.email})`}
          >
            {activeUser.avatar}
          </div>
        </div>
      </div>

      {/* Component Styles */}
      <style>{`
        .header-container {
          grid-area: header;
          height: var(--header-height);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 5;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .title-section-block {
          display: flex;
          flex-direction: column;
        }

        .header-title {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .header-context-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .header-tabs {
          display: flex;
          gap: 4px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 500;
          border-radius: var(--radius-sm);
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }

        .tab-btn:hover {
          background-color: var(--bg-hover);
          color: var(--text-primary);
        }

        .tab-btn.active {
          background-color: var(--bg-active);
          color: var(--primary);
        }

        .header-search {
          position: relative;
          width: 320px;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .header-search input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          font-size: 13px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-color);
          background-color: var(--bg-secondary);
          transition: border-color var(--transition-fast), background-color var(--transition-fast);
        }

        .header-search input:focus {
          outline: none;
          background-color: var(--bg-primary);
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
        }

        .clear-search {
          position: absolute;
          right: 12px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .quick-add-wrapper {
          position: relative;
        }

        .quick-create-btn {
          padding: 6px 12px;
          font-size: 13px;
        }

        .quick-add-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 16px;
          box-shadow: var(--shadow-lg);
          width: 260px;
          z-index: 100;
        }

        .quick-add-dropdown input {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          font-size: 13px;
          margin-bottom: 12px;
          background-color: var(--bg-secondary);
        }

        .quick-add-dropdown input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .dropdown-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .btn-sm {
          padding: 4px 10px;
          font-size: 11px;
        }

        .icon-action-btn {
          color: var(--text-secondary);
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color var(--transition-fast);
        }

        .icon-action-btn:hover {
          background-color: var(--bg-hover);
          color: var(--text-primary);
        }

        .avatar-wrapper {
          display: flex;
          align-items: center;
        }

        .header-avatar {
          width: 32px;
          height: 32px;
          font-size: 12px;
        }
      `}</style>
    </header>
  );
};
