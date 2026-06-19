import React from 'react';
import { AsanaProvider, useAsana } from './context/AsanaContext';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ListView } from './components/ListView';
import { BoardView } from './components/BoardView';
import { CalendarView } from './components/CalendarView';
import { AdminView } from './components/AdminView';
import { HRView } from './components/HRView';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';
import { Celebration } from './components/Celebration';

const AppContent: React.FC = () => {
  const { activeView, sidebarCollapsed, setSidebarCollapsed, activeUser } = useAsana();

  if (!activeUser) {
    return <Login />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'list':
        return <ListView />;
      case 'board':
        return <BoardView />;
      case 'calendar':
        return <CalendarView />;
      case 'admin':
        return <AdminView />;
      case 'hr':
        return <HRView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className={`app-container ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar overlay backdrop on mobile */}
      {!sidebarCollapsed && (
        <div className="sidebar-backdrop" onClick={() => setSidebarCollapsed(true)}></div>
      )}
      {/* Shell Layout: Left Sidebar */}
      <Sidebar />

      {/* Shell Layout: Top Header */}
      <Header />

      {/* Shell Layout: Main View Space */}
      <main className="main-content-viewport">
        {renderView()}
      </main>

      {/* Slide-out Task Editor drawer */}
      <TaskDetailDrawer />

      {/* Complete task celebration (flying unicorn & sparkles) */}
      <Celebration />

      <style>{`
        .main-content-viewport {
          grid-area: main;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
};

export default function App() {
  return (
    <AsanaProvider>
      <AppContent />
    </AsanaProvider>
  );
}
