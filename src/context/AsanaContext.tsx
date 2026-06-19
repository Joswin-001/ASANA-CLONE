import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

const API_BASE = import.meta.env.VITE_API_URL || (window.location.port === '5173' ? `http://${window.location.hostname}:5000/api` : '/api');

// Types Definition
export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  userName: string;
  userAvatar: string;
  userColor: string;
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  broadcastId?: string | null;
  title: string;
  description: string;
  assignedToId?: string | null;
  assigneeId?: string | null; // Compat mapping
  projectId: string; // Compat mapping
  outletId?: string | null;
  zoneId?: string | null;
  sectionId: string; // Compat mapping
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  tags: string[]; // Compat mapping
  subtasks: SubTask[];
  comments: Comment[];
  activityLog?: string[];
  attachments?: { name: string; size: string; date: string }[];
  createdAt: string;
}

export interface Section {
  id: string;
  title: string;
  projectId: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
}

export interface User {
  id: string;
  name: string;
  role: 'ceo' | 'zonal_manager' | 'store_manager' | 'employee' | 'admin';
  email: string;
  avatar?: string;
  color?: string;
  outletId?: string | null;
  zoneId?: string | null;
}

export interface Outlet {
  id: string;
  name: string;
  zoneId: string;
}

export interface Zone {
  id: string;
  name: string;
}

export interface Broadcast {
  id: string;
  senderId: string;
  senderName: string;
  audioBase64: string;
  transcription: string;
  targets: {
    roles: string[];
    zones: string[];
    outlets: string[];
  };
  createdAt: string;
}

// HR Portal Types
export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  appliedRole: string;
  status: string;
  skills: string[];
  experience: string;
  education: string;
  cvSummary: string;
  score: number;
  interviewStatus: 'Pending' | 'Completed';
  transcript: { speaker: string; text: string }[];
  onboardingStatus: 'Applied' | 'Offer Sent' | 'Offer Accepted' | 'Joined';
  onboardingChecklist: {
    offerAccepted: boolean;
    aadhaarSubmitted: boolean;
    panSubmitted: boolean;
    bankDetailsSubmitted: boolean;
    certificatesSubmitted: boolean;
  };
}

export interface Punch {
  id: string;
  employeeId: string;
  employeeName: string;
  outletId: string;
  date: string;
  clockIn: string;
  clockOut: string;
  status: string;
  overtimeMinutes: number;
}

export interface PayGrade {
  id: string;
  roleName: string;
  basic: number;
  hra: number;
  da: number;
  special: number;
}

export type ViewType = 'dashboard' | 'list' | 'board' | 'calendar' | 'admin' | 'hr';

interface AsanaContextType {
  // Session
  activeUser: User | null;
  loginUser: (email: string) => Promise<boolean>;
  logoutUser: () => void;

  // Metadata
  outlets: Outlet[];
  zones: Zone[];
  users: User[];
  broadcasts: Broadcast[];
  tasks: Task[];
  projects: Project[]; // Mocked mapping to zones for compatibility
  sections: Section[]; // Mocked mapping to zones for compatibility
  
  // HR States
  candidates: Candidate[];
  punches: Punch[];
  grades: PayGrade[];

  // Navigation & States
  activeProjectId: string;
  activeView: ViewType;
  selectedTaskId: string | null;
  searchQuery: string;
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  celebrating: boolean;
  
  // Navigation Setters
  setActiveProjectId: (id: string) => void;
  setActiveView: (view: ViewType) => void;
  setSelectedTaskId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Data Mutators
  submitVoiceBroadcast: (audioBase64: string, transcription: string, targets: any) => Promise<void>;
  addTask: (projectId: string, sectionId: string, taskData: Partial<Task>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  moveTask: (taskId: string, targetSectionId: string) => void;
  toggleTaskCompletion: (taskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  addComment: (taskId: string, commentText: string) => void;
  deleteComment: (taskId: string, commentId: string) => void;

  // HR Actions
  addCandidate: (candData: Partial<Candidate>) => Promise<void>;
  triggerAICall: (candId: string, transcript?: any[], score?: number) => Promise<void>;
  updateCandidateOnboarding: (candId: string, status: string, checklist: any) => Promise<void>;
  updateCandidate: (candId: string, updates: Partial<Candidate>) => Promise<void>;
  uploadPunches: (punchList: Partial<Punch>[]) => Promise<void>;

  // Admin Actions
  addOutlet: (name: string, zoneId: string) => Promise<void>;
  addUser: (name: string, email: string, role: string, outletId: string, zoneId: string) => Promise<void>;
  addSection: (projectId: string, title: string) => Section;
  deleteSection: (sectionId: string) => void;
}

const AsanaContext = createContext<AsanaContextType | undefined>(undefined);

const defaultProjects: Project[] = [
  { id: 'p1', name: 'Website Operations', color: '#7c1a22', icon: 'Globe' }
];

const defaultSections: Section[] = [
  { id: 's1', title: 'Daily Tasks', projectId: 'p1' },
  { id: 's2', title: 'In Progress', projectId: 'p1' },
  { id: 's3', title: 'Completed', projectId: 'p1' }
];

export const AsanaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeUser, setActiveUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('parakkat_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // HR States
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [punches, setPunches] = useState<Punch[]>([]);
  const [grades, setGrades] = useState<PayGrade[]>([]);

  // Navigation states
  const [activeProjectId, setActiveProjectId] = useState<string>('p1');
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('asana_theme');
    return (saved as 'light' | 'dark') || 'light';
  });
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [celebrating, setCelebrating] = useState<boolean>(false);

  // Initial loads
  useEffect(() => {
    fetchMetadata();
  }, []);

  // Sync details when active user changes
  useEffect(() => {
    if (activeUser) {
      fetchUserData();
    } else {
      setBroadcasts([]);
      setTasks([]);
    }
  }, [activeUser]);

  useEffect(() => {
    localStorage.setItem('asana_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const fetchMetadata = async () => {
    try {
      const [outletsRes, zonesRes, usersRes, gradesRes] = await Promise.all([
        fetch(`${API_BASE}/outlets`),
        fetch(`${API_BASE}/zones`),
        fetch(`${API_BASE}/users`),
        fetch(`${API_BASE}/hr/grades`)
      ]);

      const [outletsData, zonesData, usersData, gradesData] = await Promise.all([
        outletsRes.json(),
        zonesRes.json(),
        usersRes.json(),
        gradesRes.json()
      ]);

      const mappedUsers = usersData.map((u: any) => ({
        ...u,
        avatar: u.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
        color: u.role === 'ceo' ? '#d4af37' : u.role === 'zonal_manager' ? '#7c1a22' : '#5c4e46'
      }));

      setOutlets(outletsData);
      setZones(zonesData);
      setUsers(mappedUsers);
      setGrades(gradesData);
    } catch (e) {
      console.error('Failed to fetch metadata from server', e);
    }
  };

  const fetchUserData = async () => {
    if (!activeUser) return;
    try {
      const [broadcastsRes, tasksRes, candidatesRes, punchesRes] = await Promise.all([
        fetch(`${API_BASE}/broadcasts?userId=${activeUser.id}`),
        fetch(`${API_BASE}/tasks?userId=${activeUser.id}`),
        fetch(`${API_BASE}/hr/candidates`),
        fetch(`${API_BASE}/hr/punches`)
      ]);

      const broadcastsData = await broadcastsRes.json();
      const tasksData = await tasksRes.json();
      const candidatesData = await candidatesRes.json();
      const punchesData = await punchesRes.json();

      const mappedTasks = tasksData.map((t: any) => ({
        ...t,
        assigneeId: t.assigneeId || t.assignedToId || null,
        projectId: t.projectId || 'p1',
        sectionId: t.sectionId || (t.completed ? 's3' : 's1'),
        tags: t.tags || []
      }));

      setBroadcasts(broadcastsData);
      setTasks(mappedTasks);
      setCandidates(candidatesData);
      setPunches(punchesData);
    } catch (e) {
      console.error('Failed to fetch user tasks/broadcasts', e);
    }
  };

  // Auth Operations
  const loginUser = async (email: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || 'Login failed');
        return false;
      }

      const { user } = await res.json();
      const mappedUser = {
        ...user,
        avatar: user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
        color: user.role === 'ceo' ? '#d4af37' : user.role === 'zonal_manager' ? '#7c1a22' : '#5c4e46'
      };

      setActiveUser(mappedUser);
      localStorage.setItem('parakkat_user', JSON.stringify(mappedUser));
      setActiveView('dashboard');
      return true;
    } catch (e) {
      console.error('Failed login API call', e);
      alert('Could not connect to the backend server. Please verify it is running on port 5000.');
      return false;
    }
  };

  const logoutUser = () => {
    setActiveUser(null);
    localStorage.removeItem('parakkat_user');
    setActiveView('dashboard');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Mutator Actions communicating with Express backend
  const submitVoiceBroadcast = async (audioBase64: string, transcription: string, targets: any) => {
    if (!activeUser) return;
    try {
      const res = await fetch(`${API_BASE}/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: activeUser.id,
          audioBase64,
          transcription,
          targets
        })
      });

      if (res.ok) {
        await fetchUserData(); // refresh tasks and broadcasts
      }
    } catch (e) {
      console.error('Failed to submit voice broadcast', e);
    }
  };

  const addTask = async (projectId: string, sectionId: string, taskData: Partial<Task>) => {
    if (!activeUser) return;
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskData.title,
          description: taskData.description || '',
          assignedToId: taskData.assignedToId || taskData.assigneeId || null,
          outletId: activeUser.outletId || null,
          zoneId: activeUser.zoneId || null,
          priority: taskData.priority || 'medium',
          dueDate: taskData.dueDate || null,
          broadcastId: taskData.broadcastId || null,
          projectId: projectId || 'p1',
          sectionId: sectionId || 's1',
          tags: taskData.tags || []
        })
      });

      if (res.ok) {
        await fetchUserData();
      }
    } catch (e) {
      console.error('Failed to create task on backend', e);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const apiUpdates = {
        ...updates,
        assignedToId: updates.assignedToId !== undefined ? updates.assignedToId : (updates.assigneeId !== undefined ? updates.assigneeId : undefined)
      };

      const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiUpdates)
      });

      if (res.ok) {
        setTasks(prev => prev.map(t => {
          if (t.id === taskId) {
            return {
              ...t,
              ...updates,
              assigneeId: updates.assigneeId !== undefined ? updates.assigneeId : (updates.assignedToId !== undefined ? updates.assignedToId : t.assigneeId)
            };
          }
          return t;
        }));
      }
    } catch (e) {
      console.error('Failed to update task on backend', e);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        if (selectedTaskId === taskId) {
          setSelectedTaskId(null);
        }
        setTasks(prev => prev.filter(t => t.id !== taskId));
      }
    } catch (e) {
      console.error('Failed to delete task', e);
    }
  };

  const moveTask = async (taskId: string, targetSectionId: string) => {
    const completed = targetSectionId === 's3';
    await updateTask(taskId, { completed, sectionId: targetSectionId });
  };

  const triggerCelebration = () => {
    setCelebrating(true);
    setTimeout(() => setCelebrating(false), 2500);

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.65 },
      colors: ['#7c1a22', '#d4af37', '#aa222a', '#b39228', '#f59e0b']
    });
  };

  const toggleTaskCompletion = async (taskId: string) => {
    const taskToToggle = tasks.find(t => t.id === taskId);
    if (!taskToToggle) return;

    const nextCompleted = !taskToToggle.completed;
    if (nextCompleted) {
      triggerCelebration();
    }

    const logMsg = `${activeUser?.name || 'User'} marked task as ${nextCompleted ? 'completed' : 'incomplete'} • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const updatedLog = [...(taskToToggle.activityLog || []), logMsg];

    await updateTask(taskId, { 
      completed: nextCompleted,
      sectionId: nextCompleted ? 's3' : 's1',
      activityLog: updatedLog
    });
  };

  const addSubtask = async (taskId: string, title: string) => {
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    const newSub = {
      id: `sub_${Date.now()}`,
      title,
      completed: false
    };

    const logMsg = `${activeUser?.name || 'User'} added subtask "${title}" • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const updatedLog = [...(taskToUpdate.activityLog || []), logMsg];

    const updatedSubtasks = [...taskToUpdate.subtasks, newSub];
    await updateTask(taskId, { 
      subtasks: updatedSubtasks,
      activityLog: updatedLog
    });
  };

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    let subtaskTitle = '';
    const updatedSubtasks = taskToUpdate.subtasks.map(s => {
      if (s.id === subtaskId) {
        subtaskTitle = s.title;
        return { ...s, completed: !s.completed };
      }
      return s;
    });

    const isDone = updatedSubtasks.find(s => s.id === subtaskId)?.completed;
    const logMsg = `${activeUser?.name || 'User'} marked subtask "${subtaskTitle}" as ${isDone ? 'completed' : 'incomplete'} • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const updatedLog = [...(taskToUpdate.activityLog || []), logMsg];

    await updateTask(taskId, { 
      subtasks: updatedSubtasks,
      activityLog: updatedLog
    });
  };

  const deleteSubtask = async (taskId: string, subtaskId: string) => {
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    const sub = taskToUpdate.subtasks.find(s => s.id === subtaskId);
    const logMsg = `${activeUser?.name || 'User'} deleted subtask "${sub?.title || 'subtask'}" • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const updatedLog = [...(taskToUpdate.activityLog || []), logMsg];

    const updatedSubtasks = taskToUpdate.subtasks.filter(s => s.id !== subtaskId);
    await updateTask(taskId, { 
      subtasks: updatedSubtasks,
      activityLog: updatedLog
    });
  };

  const addComment = async (taskId: string, commentText: string) => {
    if (!activeUser) return;
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    const newComment = {
      id: `c_${Date.now()}`,
      userName: activeUser.name,
      userAvatar: activeUser.avatar || 'JW',
      userColor: activeUser.color || '#7c1a22',
      text: commentText,
      createdAt: new Date().toLocaleString()
    };

    const logMsg = `${activeUser.name} added a comment • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const updatedLog = [...(taskToUpdate.activityLog || []), logMsg];

    const updatedComments = [...taskToUpdate.comments, newComment];
    await updateTask(taskId, { 
      comments: updatedComments,
      activityLog: updatedLog
    });
  };

  const deleteComment = async (taskId: string, commentId: string) => {
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    const logMsg = `${activeUser?.name || 'User'} deleted a comment • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const updatedLog = [...(taskToUpdate.activityLog || []), logMsg];

    const updatedComments = taskToUpdate.comments.filter(c => c.id !== commentId);
    await updateTask(taskId, { 
      comments: updatedComments,
      activityLog: updatedLog
    });
  };

  // HR Actions implementation
  const addCandidate = async (candData: Partial<Candidate>) => {
    try {
      const res = await fetch(`${API_BASE}/hr/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candData)
      });

      if (res.ok) {
        await fetchUserData();
      }
    } catch (e) {
      console.error('Failed to create candidate', e);
    }
  };

  const triggerAICall = async (candId: string, transcript?: any[], score?: number) => {
    try {
      const res = await fetch(`${API_BASE}/hr/candidates/${candId}/simulate-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, score })
      });

      if (res.ok) {
        await fetchUserData();
      }
    } catch (e) {
      console.error('Failed to simulate AI interview call', e);
    }
  };

  const updateCandidateOnboarding = async (candId: string, status: string, checklist: any) => {
    try {
      const res = await fetch(`${API_BASE}/hr/candidates/${candId}/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboardingStatus: status,
          onboardingChecklist: checklist
        })
      });

      if (res.ok) {
        await fetchUserData();
      }
    } catch (e) {
      console.error('Failed to update candidate onboarding checklist', e);
    }
  };

  const updateCandidate = async (candId: string, updates: Partial<Candidate>) => {
    try {
      const res = await fetch(`${API_BASE}/hr/candidates/${candId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        setCandidates(prev => prev.map(c => c.id === candId ? { ...c, ...updates } : c));
      }
    } catch (e) {
      console.error('Failed to update candidate', e);
    }
  };

  const uploadPunches = async (punchList: Partial<Punch>[]) => {
    try {
      const res = await fetch(`${API_BASE}/hr/punches/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ punchList })
      });

      if (res.ok) {
        await fetchUserData();
      }
    } catch (e) {
      console.error('Failed to upload biometric punches', e);
    }
  };

  // Admin Mutations
  const addOutlet = async (name: string, zoneId: string) => {
    try {
      const res = await fetch(`${API_BASE}/outlets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, zoneId })
      });

      if (res.ok) {
        await fetchMetadata();
      }
    } catch (e) {
      console.error('Failed to create outlet', e);
    }
  };

  const addUser = async (name: string, email: string, role: string, outletId: string, zoneId: string) => {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          role,
          outletId: outletId || null,
          zoneId: zoneId || null
        })
      });

      if (res.ok) {
        await fetchMetadata();
      }
    } catch (e) {
      console.error('Failed to create user', e);
    }
  };

  const addSection = (projectId: string, title: string): Section => {
    return { id: `s_${Date.now()}`, title, projectId };
  };

  const deleteSection = (_sectionId: string) => {
    // Compat mock
  };

  return (
    <AsanaContext.Provider value={{
      activeUser,
      loginUser,
      logoutUser,

      outlets,
      zones,
      users,
      broadcasts,
      tasks,
      projects: defaultProjects,
      sections: defaultSections,
      
      candidates,
      punches,
      grades,

      activeProjectId,
      activeView,
      selectedTaskId,
      searchQuery,
      theme,
      sidebarCollapsed,
      celebrating,
      
      setActiveProjectId,
      setActiveView,
      setSelectedTaskId,
      setSearchQuery,
      toggleTheme,
      setSidebarCollapsed,
      
      submitVoiceBroadcast,
      addTask,
      updateTask,
      deleteTask,
      moveTask,
      toggleTaskCompletion,
      addSubtask,
      toggleSubtask,
      deleteSubtask,
      addComment,
      deleteComment,

      addCandidate,
      triggerAICall,
      updateCandidateOnboarding,
      updateCandidate,
      uploadPunches,

      addOutlet,
      addUser,
      addSection,
      deleteSection
    }}>
      {children}
    </AsanaContext.Provider>
  );
};

export const useAsana = () => {
  const context = useContext(AsanaContext);
  if (!context) {
    throw new Error('useAsana must be used within an AsanaProvider');
  }
  return context;
};
