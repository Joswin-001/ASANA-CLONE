import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db.json');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // support large base64 uploads
app.use(morgan('dev'));

// Helper functions for reading/writing db.json
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading DB, returning empty defaults', error);
    return { zones: [], outlets: [], users: [], broadcasts: [], tasks: [], candidates: [], punches: [], payGrades: [] };
  }
}

async function writeDB(data) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing to DB', error);
  }
}

// REST Endpoints

// 1. Auth Endpoint
app.post('/api/login', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const db = await readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Invalid email address. Please check and try again.' });
  }

  res.json({ user });
});

// 2. Broadcasts (Voice Instructions) Endpoints
app.post('/api/broadcasts', async (req, res) => {
  const { senderId, audioBase64, transcription, targets } = req.body;
  if (!senderId || (!audioBase64 && !transcription)) {
    return res.status(400).json({ error: 'Missing broadcast data' });
  }

  const db = await readDB();
  const sender = db.users.find(u => u.id === senderId);

  const newBroadcast = {
    id: `b_${Date.now()}`,
    senderId,
    senderName: sender ? `${sender.name} (${sender.role.toUpperCase()})` : 'CEO',
    audioBase64: audioBase64 || '',
    transcription: transcription || 'No text summary provided.',
    targets: targets || { roles: [], zones: [], outlets: [] },
    createdAt: new Date().toISOString()
  };

  db.broadcasts.push(newBroadcast);

  // Auto-generate task for targeted managers
  const targetedRoles = targets.roles || [];
  const targetedZones = targets.zones || [];
  const targetedOutlets = targets.outlets || [];

  const targetedUsers = db.users.filter(u => {
    if (u.role === 'ceo' || u.role === 'admin') return false;
    const roleMatch = targetedRoles.includes(u.role);
    if (!roleMatch) return false;
    const zoneMatch = targetedZones.length === 0 || targetedZones.includes(u.zoneId);
    const outletMatch = targetedOutlets.length === 0 || targetedOutlets.includes(u.outletId);
    return zoneMatch && outletMatch;
  });

  targetedUsers.forEach(user => {
    const newTask = {
      id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      broadcastId: newBroadcast.id,
      title: `Voice instruction action items: ${newBroadcast.transcription.substring(0, 40)}...`,
      description: `Task triggered by CEO voice instruction: \n"${newBroadcast.transcription}"`,
      assignedToId: user.id,
      outletId: user.outletId || null,
      zoneId: user.zoneId || null,
      completed: false,
      priority: 'high',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      subtasks: [],
      comments: [],
      createdAt: new Date().toISOString()
    };
    db.tasks.push(newTask);
  });

  await writeDB(db);
  res.status(201).json({ broadcast: newBroadcast, triggeredTasksCount: targetedUsers.length });
});

app.get('/api/broadcasts', async (req, res) => {
  const { userId } = req.query;
  const db = await readDB();

  if (!userId) {
    return res.json(db.broadcasts);
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.role === 'ceo' || user.role === 'admin') {
    return res.json(db.broadcasts);
  }

  const targetedBroadcasts = db.broadcasts.filter(b => {
    const targets = b.targets;
    const roleMatch = targets.roles.includes(user.role);
    const zoneMatch = targets.zones.length === 0 || targets.zones.includes(user.zoneId);
    const outletMatch = targets.outlets.length === 0 || targets.outlets.includes(user.outletId);
    
    return roleMatch && zoneMatch && outletMatch;
  });

  res.json(targetedBroadcasts);
});

// 3. Tasks REST API
app.get('/api/tasks', async (req, res) => {
  const { userId } = req.query;
  const db = await readDB();

  if (!userId) {
    return res.json(db.tasks);
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.role === 'ceo' || user.role === 'admin') {
    return res.json(db.tasks);
  }

  if (user.role === 'zonal_manager') {
    return res.json(db.tasks.filter(t => t.zoneId === user.zoneId));
  }

  if (user.role === 'store_manager') {
    return res.json(db.tasks.filter(t => t.outletId === user.outletId));
  }

  return res.json(db.tasks.filter(t => t.assignedToId === user.id));
});

app.post('/api/tasks', async (req, res) => {
  const { title, description, assignedToId, outletId, zoneId, priority, dueDate, broadcastId, projectId, sectionId, tags } = req.body;
  const db = await readDB();

  const newTask = {
    id: `t_${Date.now()}`,
    broadcastId: broadcastId || null,
    title: title || 'Untitled instruction',
    description: description || '',
    assignedToId: assignedToId || null,
    outletId: outletId || null,
    zoneId: zoneId || null,
    completed: false,
    priority: priority || 'medium',
    dueDate: dueDate || null,
    subtasks: [],
    comments: [],
    createdAt: new Date().toISOString(),
    // Compat properties
    projectId: projectId || 'p1',
    sectionId: sectionId || 's1',
    tags: tags || []
  };

  db.tasks.push(newTask);
  await writeDB(db);
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = await readDB();

  const taskIndex = db.tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const existingTask = db.tasks[taskIndex];
  const updatedTask = {
    ...existingTask,
    ...updates,
    subtasks: updates.subtasks !== undefined ? updates.subtasks : existingTask.subtasks,
    comments: updates.comments !== undefined ? updates.comments : existingTask.comments
  };

  db.tasks[taskIndex] = updatedTask;
  await writeDB(db);
  res.json(updatedTask);
});

app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const db = await readDB();

  db.tasks = db.tasks.filter(t => t.id !== id);
  await writeDB(db);
  res.sendStatus(204);
});

// 4. Outlets, Zones & Users Management
app.get('/api/outlets', async (req, res) => {
  const db = await readDB();
  res.json(db.outlets);
});

app.post('/api/outlets', async (req, res) => {
  const { name, zoneId } = req.body;
  if (!name || !zoneId) {
    return res.status(400).json({ error: 'Missing name or zoneId' });
  }
  const db = await readDB();
  const newOutlet = {
    id: `o_${Date.now()}`,
    name,
    zoneId
  };
  db.outlets.push(newOutlet);
  await writeDB(db);
  res.status(201).json(newOutlet);
});

app.get('/api/zones', async (req, res) => {
  const db = await readDB();
  res.json(db.zones);
});

app.get('/api/users', async (req, res) => {
  const db = await readDB();
  res.json(db.users);
});

app.post('/api/users', async (req, res) => {
  const { email, name, role, outletId, zoneId } = req.body;
  if (!email || !name || !role) {
    return res.status(400).json({ error: 'Missing user credentials' });
  }
  const db = await readDB();
  const newUser = {
    id: `u_${Date.now()}`,
    email,
    name,
    role,
    outletId: outletId || null,
    zoneId: zoneId || null
  };
  db.users.push(newUser);
  await writeDB(db);
  res.status(201).json(newUser);
});

// 5. HR Portal Endpoints

// 5a. Recruitment / Candidates APIs
app.get('/api/hr/candidates', async (req, res) => {
  const db = await readDB();
  res.json(db.candidates || []);
});

app.post('/api/hr/candidates', async (req, res) => {
  const { name, email, phone, appliedRole, skills, experience, education, cvSummary } = req.body;
  const db = await readDB();

  const newCandidate = {
    id: `cand_${Date.now()}`,
    name: name || 'Mock Applicant',
    email: email || 'applicant@gmail.com',
    phone: phone || '+91 9999999999',
    appliedRole: appliedRole || 'Sales Associate',
    status: 'Applied',
    skills: skills || ['Communication', 'MS Excel'],
    experience: experience || '1 Year',
    education: education || 'Graduate',
    cvSummary: cvSummary || 'Uploaded resume parsed details summary.',
    score: Math.floor(Math.random() * 25) + 70, // random baseline score
    interviewStatus: 'Pending',
    transcript: [],
    onboardingStatus: 'Applied',
    onboardingChecklist: {
      offerAccepted: false,
      aadhaarSubmitted: false,
      panSubmitted: false,
      bankDetailsSubmitted: false,
      certificatesSubmitted: false
    }
  };

  db.candidates = db.candidates || [];
  db.candidates.push(newCandidate);
  await writeDB(db);
  res.status(201).json(newCandidate);
});

// Simulates ElevenLabs outbound voice interview call or saves interactive voice session
app.post('/api/hr/candidates/:id/simulate-call', async (req, res) => {
  const { id } = req.params;
  const { transcript, score } = req.body;
  const db = await readDB();

  const candidateIndex = db.candidates.findIndex(c => c.id === id);
  if (candidateIndex === -1) {
    return res.status(404).json({ error: 'Candidate not found' });
  }

  const candidate = db.candidates[candidateIndex];

  // Populate mock conversational interview dialogues depending on role if not provided by client
  let finalTranscript = transcript;
  let finalScore = score;

  if (!finalTranscript) {
    if (candidate.appliedRole === 'Store Manager') {
      finalTranscript = [
        { speaker: 'AI Agent', text: 'Hello, I am the Parakkat Jewels automated interview assistant. Tell me about a time you managed outlet sales goals.' },
        { speaker: candidate.name, text: 'Hello. Yes, in my previous role, I monitored daily audit sheets, optimized staff rotas, and exceeded our monthly targets by 15%.' },
        { speaker: 'AI Agent', text: 'Excellent. How do you resolve conflicts between staff members under your charge?' },
        { speaker: candidate.name, text: 'I schedule individual discussions, align them with company policies, and set collaborative sales metrics to keep motivation healthy.' }
      ];
    } else {
      finalTranscript = [
        { speaker: 'AI Agent', text: 'Hello, thank you for taking our call. Why are you interested in joining Parakkat Jewels as a Sales Associate?' },
        { speaker: candidate.name, text: 'Parakkat Jewels is highly respected in Kerala. I love interacting with customers and have a background explaining ornament designs.' },
        { speaker: 'AI Agent', text: 'How do you handle peak rush hours during seasonal promotions?' },
        { speaker: candidate.name, text: 'I stay focused, coordinate with cache-desks immediately, and greet waiting customers so they feel attended to.' }
      ];
    }
    finalScore = Math.floor(Math.random() * 10) + 85;
  }

  const updatedCandidate = {
    ...candidate,
    interviewStatus: 'Completed',
    status: 'Shortlisted',
    score: finalScore,
    transcript: finalTranscript
  };

  db.candidates[candidateIndex] = updatedCandidate;
  await writeDB(db);
  res.json(updatedCandidate);
});

app.put('/api/hr/candidates/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = await readDB();

  const candidateIndex = db.candidates.findIndex(c => c.id === id);
  if (candidateIndex === -1) {
    return res.status(404).json({ error: 'Candidate not found' });
  }

  db.candidates[candidateIndex] = {
    ...db.candidates[candidateIndex],
    ...updates
  };

  await writeDB(db);
  res.json(db.candidates[candidateIndex]);
});

app.put('/api/hr/candidates/:id/onboarding', async (req, res) => {
  const { id } = req.params;
  const { onboardingStatus, onboardingChecklist } = req.body;
  const db = await readDB();

  const candidateIndex = db.candidates.findIndex(c => c.id === id);
  if (candidateIndex === -1) {
    return res.status(404).json({ error: 'Candidate not found' });
  }

  db.candidates[candidateIndex] = {
    ...db.candidates[candidateIndex],
    onboardingStatus: onboardingStatus || db.candidates[candidateIndex].onboardingStatus,
    onboardingChecklist: onboardingChecklist || db.candidates[candidateIndex].onboardingChecklist
  };

  await writeDB(db);
  res.json(db.candidates[candidateIndex]);
});

// 5b. Attendance / Punches APIs
app.get('/api/hr/punches', async (req, res) => {
  const db = await readDB();
  res.json(db.punches || []);
});

app.post('/api/hr/punches/upload', async (req, res) => {
  const { punchList } = req.body;
  if (!Array.isArray(punchList)) {
    return res.status(400).json({ error: 'punchList array is required' });
  }

  const db = await readDB();
  db.punches = db.punches || [];

  // Append punch records
  const formattedPunches = punchList.map((p, idx) => ({
    id: `pn_upload_${Date.now()}_${idx}`,
    employeeId: p.employeeId || 'u6',
    employeeName: p.employeeName || 'Staff Member',
    outletId: p.outletId || 'o1',
    date: p.date || new Date().toISOString().split('T')[0],
    clockIn: p.clockIn || '09:00',
    clockOut: p.clockOut || '18:00',
    status: p.status || 'On Time',
    overtimeMinutes: p.overtimeMinutes || 0
  }));

  db.punches = [...formattedPunches, ...db.punches];
  await writeDB(db);
  res.status(201).json({ message: 'Punches uploaded', count: formattedPunches.length });
});

// 5c. PayGrades APIs
app.get('/api/hr/grades', async (req, res) => {
  const db = await readDB();
  res.json(db.payGrades || []);
});

// Serve static assets from Vite's production build folder
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback to index.html for React SPA routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Parakkat Portal Backend server running on http://localhost:${PORT}`);
});

