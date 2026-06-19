import React from 'react';
import { useAsana } from '../context/AsanaContext';
import * as Icons from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    sidebarCollapsed,
    setSidebarCollapsed,
    activeUser,
    logoutUser
  } = useAsana();

  if (!activeUser) return null;

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ceo': return 'CEO Group';
      case 'zonal_manager': return 'Zonal Manager';
      case 'store_manager': return 'Store Manager';
      case 'employee': return 'Outlet Associate';
      case 'admin': return 'System Admin';
      default: return 'User';
    }
  };

  return (
    <aside className={`sidebar-container ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header / Logo */}
      <div className="sidebar-header">
        <div className="logo-area" onClick={() => setActiveView('dashboard')}>
          <div className="logo-badge">PJ</div>
          {!sidebarCollapsed && <span className="logo-text">parakkat</span>}
        </div>
        <button 
          className="sidebar-collapse-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {sidebarCollapsed ? <Icons.ChevronRight size={18} /> : <Icons.ChevronLeft size={18} />}
        </button>
      </div>

      {/* Profile Details Panel */}
      <div className="sidebar-profile-card">
        <div 
          className="avatar profile-avatar"
          style={{ backgroundColor: activeUser.color || '#7c1a22' }}
        >
          {activeUser.avatar}
        </div>
        {!sidebarCollapsed && (
          <div className="profile-info-block animate-fade-in">
            <h4 className="profile-name">{activeUser.name}</h4>
            <span className="profile-role">{getRoleLabel(activeUser.role)}</span>
          </div>
        )}
      </div>

      <div className="sidebar-divider"></div>

      {/* Main Navigation */}
      <div className="sidebar-menu">
        <button 
          className={`menu-item ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
          title="Dashboard / Broadcast Inbox"
        >
          <Icons.Home size={18} />
          {!sidebarCollapsed && <span>Dashboard</span>}
        </button>
        
        {/* CEO & Admin can see all views, Managers & Employees can access their task grid views */}
        <button 
          className={`menu-item ${activeView === 'list' ? 'active' : ''}`}
          onClick={() => setActiveView('list')}
          title="Task List Grid"
        >
          <Icons.ListTodo size={18} />
          {!sidebarCollapsed && <span>Task List</span>}
        </button>

        <button 
          className={`menu-item ${activeView === 'board' ? 'active' : ''}`}
          onClick={() => setActiveView('board')}
          title="Kanban Board View"
        >
          <Icons.Columns size={18} />
          {!sidebarCollapsed && <span>Kanban Board</span>}
        </button>

        <button 
          className={`menu-item ${activeView === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveView('calendar')}
          title="Calendar Monthly Schedule"
        >
          <Icons.Calendar size={18} />
          {!sidebarCollapsed && <span>Calendar</span>}
        </button>

        {(activeUser.role === 'ceo' || activeUser.role === 'admin' || activeUser.role === 'zonal_manager' || activeUser.role === 'store_manager') && (
          <button 
            className={`menu-item ${activeView === 'hr' ? 'active' : ''}`}
            onClick={() => setActiveView('hr')}
            title="HR Automation Platform"
          >
            <Icons.UserCheck size={18} />
            {!sidebarCollapsed && <span>HR Portal</span>}
          </button>
        )}

        {activeUser.role === 'admin' && (
          <button 
            className={`menu-item ${activeView === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveView('admin')}
            title="Outlets & Users Administrator"
          >
            <Icons.Settings size={18} />
            {!sidebarCollapsed && <span>Admin Console</span>}
          </button>
        )}
      </div>

      <div className="sidebar-spacer-fill"></div>

      <div className="sidebar-divider"></div>

      {/* Footer Log Out action */}
      <div className="sidebar-footer-menu">
        <button 
          className="menu-item logout-btn" 
          onClick={logoutUser}
          title="Sign Out Session"
        >
          <Icons.LogOut size={18} />
          {!sidebarCollapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Styles */}
      <style>{`
        .sidebar-container {
          grid-area: sidebar;
          background-color: var(--bg-primary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          height: 100vh;
          transition: width var(--transition-normal);
          width: var(--sidebar-width);
          z-index: 10;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          height: var(--header-height);
        }

        .logo-area {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .logo-badge {
          background: var(--primary-gradient);
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 13px;
          border: 1.5px solid var(--accent);
        }

        .logo-text {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 16px;
          color: var(--primary);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .sidebar-collapse-btn {
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: var(--radius-sm);
        }

        .sidebar-collapse-btn:hover {
          background-color: var(--bg-hover);
        }

        /* Profile card */
        .sidebar-profile-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background-color: var(--bg-tertiary);
          margin: 8px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }

        .profile-avatar {
          width: 32px;
          height: 32px;
          font-size: 11px;
          border: none;
        }

        .profile-info-block {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .profile-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 140px;
        }

        .profile-role {
          font-size: 10px;
          font-weight: 600;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .sidebar-menu {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 8px;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 14px;
          text-align: left;
          width: 100%;
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }

        .menu-item:hover {
          background-color: var(--bg-hover);
          color: var(--text-primary);
        }

        .menu-item.active {
          background-color: var(--bg-active);
          color: var(--primary);
          border-left: 3px solid var(--primary);
        }

        .sidebar-divider {
          height: 1px;
          background-color: var(--border-color);
          margin: 4px 8px;
        }

        .sidebar-spacer-fill {
          flex: 1;
        }

        .sidebar-footer-menu {
          padding: 8px;
        }

        .logout-btn:hover {
          color: var(--color-danger);
          background-color: var(--badge-high-bg);
        }
      `}</style>
    </aside>
  );
};
