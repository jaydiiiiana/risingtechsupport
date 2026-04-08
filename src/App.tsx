import React, { useState, useCallback, useEffect } from 'react';
import {
  LayoutDashboard, FileText, Mail, Settings,
  CheckCircle, Clock, MonitorOff, WifiOff,
  AppWindow, Zap, AlertCircle, User, Lock, LogOut,
  Sparkles, Bot, Loader2, PenLine, MapPin, Phone,
  Columns2, Plus, MoreVertical, Trash2, Calendar, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type TroubleshootingReport } from './data/reports';
import { supabase } from './lib/supabase';
import MacWindow from './components/MacWindow';
import UserManagement from './components/UserManagement';


interface SentHistoryItem {
  id: string; timestamp: string; recipient: string;
  complainantName: string; problem: string;
  status: 'success' | 'error'; error?: string;
}

interface OpenWindow {
  id: string; type: string; minimized: boolean; fullscreen: boolean;
}

interface KanbanTask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done' | 'archived';
  priority: 'low' | 'medium' | 'high';
  assignedTo: string | null;
  createdBy: string | null;
  dueAt: string | null;
  createdAt: string;
}

interface AppUser {
  id: string;
  username: string;
  full_name: string;
  role: 'admin' | 'user';
}

const DOCK_APPS = [
  { type: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, cssClass: 'dashboard' },
  { type: 'kanban', label: 'Kanban Board', icon: Columns2, cssClass: 'kanban' },
  { type: 'sender', label: 'Email Sender', icon: Mail, cssClass: 'email' },
  { type: 'reports', label: 'Reports History', icon: FileText, cssClass: 'email' },
  { type: 'users', label: 'User Management', icon: ShieldCheck, cssClass: 'users', adminOnly: true },
  { type: 'settings', label: 'Settings', icon: Settings, cssClass: 'settings' },
];

const WINDOW_DEFAULTS: Record<string, { x: number; y: number; w: number; h: number }> = {
  dashboard: { x: 80, y: 32, w: 900, h: 580 },
  kanban: { x: 110, y: 32, w: 940, h: 620 },
  sender: { x: 140, y: 32, w: 860, h: 580 },
  reports: { x: 170, y: 32, w: 880, h: 560 },
  users: { x: 200, y: 32, w: 800, h: 540 },
  settings: { x: 230, y: 32, w: 720, h: 520 },
};

const App: React.FC = () => {
  // Window Manager
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>(() => {
    const saved = localStorage.getItem('rising_tech_windows');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [focusedWindow, setFocusedWindow] = useState<string | null>(localStorage.getItem('rising_tech_focused_window'));
  const [bouncingDock, setBouncingDock] = useState<string | null>(null);

  // Data state
  const [dynamicReports, setDynamicReports] = useState<TroubleshootingReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [complainantName, setComplainantName] = useState('');
  const [complainantEmail, setComplainantEmail] = useState('ajohndarcy@gmail.com');
  const [subject, setSubject] = useState('Technical Troubleshooting Report - Rising Tech');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [sentHistory, setSentHistory] = useState<SentHistoryItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('rising_tech_user');
    return saved ? JSON.parse(saved) : null;
  });
  const isLoggedIn = !!currentUser;
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const isAdmin = currentUser?.role === 'admin';
  const [clientComplaints, setClientComplaints] = useState<any[]>([]);
  const [clientForm, setClientForm] = useState({ name: '', email: '', address: '', problem: '', type: 'complaint', category: 'company' });
  const [complaintSubmitted, setComplaintSubmitted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newReport, setNewReport] = useState({ problem: '', description: '', possibleError: '', suggestedSolution: '', frequency: '90%', estimatedCost: 'Free / Internal IT', sendImmediately: false, targetEmail: '', targetName: '' });
  const [aiAssistEnabled, setAiAssistEnabled] = useState(true);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTaskSubmitting, setIsTaskSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  
  // Appearance State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('rt_theme') as any) || 'dark');
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem('rt_wallpaper') || 'linear-gradient(160deg, #0a0d14 0%, #0d1117 30%, #0f1520 60%, #0a0d14 100%)');
  const [clockColor, setClockColor] = useState(() => localStorage.getItem('rt_clock_color') || '#ffffff');

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-mode' : '';
    localStorage.setItem('rt_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('rt_wallpaper', wallpaper);
  }, [wallpaper]);

  useEffect(() => {
    localStorage.setItem('rt_clock_color', clockColor);
  }, [clockColor]);
  
  // Kanban State
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>(() => {
    const saved = localStorage.getItem('rising_tech_kanban');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Implement AI Diagnosis', description: 'Integrate Gemini API for technical troubleshooting.', status: 'in-progress', priority: 'high', createdAt: new Date().toISOString() },
      { id: '2', title: 'Add Kanban Board', description: 'Create a visual project management tool.', status: 'todo', priority: 'medium', createdAt: new Date().toISOString() },
      { id: '3', title: 'System Deployment', description: 'Prepare for production release.', status: 'todo', priority: 'high', createdAt: new Date().toISOString() },
      { id: '4', title: 'UI Refinement', description: 'Polish macOS styles and transitions.', status: 'done', priority: 'low', createdAt: new Date().toISOString() },
    ];
  });
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' as const, status: 'todo' as const, dueAt: '', assignedTo: '' });
  const [kanbanAiGenerating, setKanbanAiGenerating] = useState(false);
  const [kanbanView, setKanbanView] = useState<'board' | 'archive'>('board');
  const [toolsHeight, setToolsHeight] = useState(240);
  const [isResizingTools, setIsResizingTools] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isResizingTools) return;
    const handleMouseMove = (e: MouseEvent) => {
      setToolsHeight(prev => Math.max(120, Math.min(600, e.movementY + prev)));
    };
    const handleMouseUp = () => setIsResizingTools(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingTools]);

  // --- DOCK ACTIONS ---
  const openApp = (type: string) => {
    const existing = openWindows.find(w => w.type === type);
    if (existing) {
      if (existing.minimized) {
        setOpenWindows(ws => ws.map(w => w.id === existing.id ? { ...w, minimized: false } : w));
      }
      setFocusedWindow(existing.id);
      return;
    }
    setBouncingDock(type);
    setTimeout(() => setBouncingDock(null), 700);
    const id = `${type}-${Date.now()}`;
    setOpenWindows(ws => [...ws, { id, type, minimized: false, fullscreen: false }]);
    setFocusedWindow(id);
  };

  const closeWindow = (id: string) => setOpenWindows(ws => ws.filter(w => w.id !== id));
  const minimizeWindow = (id: string) => setOpenWindows(ws => ws.map(w => w.id === id ? { ...w, minimized: true } : w));
  const toggleFullscreen = (id: string) => setOpenWindows(ws => ws.map(w => w.id === id ? { ...w, fullscreen: !w.fullscreen } : w));

  // --- DATA FETCH ---
  const fetchSupabaseData = useCallback(async () => {
    try {
      const { data: complaints } = await supabase.from('client_complaints').select('*').order('created_at', { ascending: false });
      if (complaints) setClientComplaints(complaints.map(c => ({ id: c.id, timestamp: new Date(c.created_at).toLocaleString(), name: c.name, email: c.email, address: c.address, problem: c.problem, type: c.type || 'complaint', category: c.category || 'company' })));
      const { data: logs } = await supabase.from('email_logs').select('*').order('created_at', { ascending: false });
      if (logs) setSentHistory(logs.map(l => ({ id: l.id, timestamp: new Date(l.created_at).toLocaleString(), recipient: l.recipient_email, complainantName: l.complainant_name, problem: l.problem, status: l.status as 'success' | 'error' })));
      const { data: customReports } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
      if (customReports) {
        const mapped = customReports.map(r => ({ id: r.id, problem: r.problem, description: r.description, possibleError: r.possible_error, suggestedSolution: r.suggested_solution, frequency: r.frequency, estimatedCost: r.estimated_cost, icon: r.icon, isCustom: true }));
        setDynamicReports(mapped);
        if (mapped.length > 0 && !selectedReportId) setSelectedReportId(mapped[0].id);
      }
      const { data: tasks } = await supabase.from('kanban_tasks').select('*').order('created_at', { ascending: true });
      if (tasks) {
        const mappedTasks = tasks.map(t => ({ 
          id: t.id, 
          title: t.title, 
          description: t.description, 
          status: t.status as any, 
          priority: t.priority as any, 
          assignedTo: t.assigned_to, 
          createdBy: t.created_by, 
          dueAt: t.due_at, 
          createdAt: t.created_at,
          updatedAt: t.updated_at
        }));
        
        // Auto-archive check
        const now = new Date();
        const updatedTasks = await Promise.all(mappedTasks.map(async t => {
          if (t.status === 'done' && t.updatedAt) {
            const doneDate = new Date(t.updatedAt);
            if (now.getTime() - doneDate.getTime() > 24 * 60 * 60 * 1000) {
              await supabase.from('kanban_tasks').update({ status: 'archived' }).eq('id', t.id);
              return { ...t, status: 'archived' as const };
            }
          }
          return t;
        }));
        
        setKanbanTasks(updatedTasks);
      }
      
      if (currentUser?.role === 'admin') {
        const { data: users } = await supabase.from('app_users').select('id, username, full_name, role');
        if (users) setAllUsers(users);
      }
    } catch (err) { console.error('Fetch Error:', err); }
  }, [selectedReportId, currentUser]);

  useEffect(() => {
    if (isLoggedIn) fetchSupabaseData();
  }, [isLoggedIn, fetchSupabaseData]);

  // Real-time updates for client complaints
  useEffect(() => {
    if (!isLoggedIn) return;
    const channel = supabase
      .channel('public:client_complaints')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'client_complaints' }, (payload) => {
        const c = payload.new;
        const newComplaint = {
          id: c.id,
          timestamp: new Date(c.created_at).toLocaleString(),
          name: c.name,
          email: c.email,
          address: c.address,
          problem: c.problem,
          type: c.type || 'complaint',
          category: c.category || 'company'
        };
        setClientComplaints(prev => [newComplaint, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isLoggedIn]);

  // Real-time updates for kanban tasks
  useEffect(() => {
    if (!isLoggedIn) return;
    const channel = supabase
      .channel('public:kanban_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const t = payload.new;
          setKanbanTasks(prev => {
            if (prev.some(task => task.id === t.id)) return prev;
            return [...prev, { id: t.id, title: t.title, description: t.description, status: t.status, priority: t.priority, assignedTo: t.assigned_to, createdBy: t.created_by, dueAt: t.due_at, createdAt: t.created_at }];
          });
        } else if (payload.eventType === 'UPDATE') {
          const t = payload.new;
          setKanbanTasks(prev => prev.map(old => old.id === t.id ? { id: t.id, title: t.title, description: t.description, status: t.status, priority: t.priority, assignedTo: t.assigned_to, createdBy: t.created_by, dueAt: t.due_at, createdAt: t.created_at } : old));
        } else if (payload.eventType === 'DELETE') {
          setKanbanTasks(prev => prev.filter(old => old.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isLoggedIn]);

  // Real-time updates for email logs (History)
  useEffect(() => {
    if (!isLoggedIn) return;
    const channel = supabase
      .channel('public:email_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'email_logs' }, (payload) => {
        const l = payload.new;
        const newLog = { id: l.id, timestamp: new Date(l.created_at).toLocaleString(), recipient: l.recipient_email, complainantName: l.complainant_name, problem: l.problem, status: l.status as any };
        setSentHistory(prev => [newLog, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isLoggedIn]);

  // Real-time updates for reports (Templates)
  useEffect(() => {
    if (!isLoggedIn) return;
    const channel = supabase
      .channel('public:reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const r = payload.new;
          const rep = { id: r.id, problem: r.problem, description: r.description, possibleError: r.possible_error, suggestedSolution: r.suggested_solution, frequency: r.frequency, estimatedCost: r.estimated_cost, icon: r.icon, isCustom: true };
          setDynamicReports(prev => [rep, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setDynamicReports(prev => prev.filter(r => r.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isLoggedIn]);

  // Persistent Windows
  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem('rising_tech_windows', JSON.stringify(openWindows));
    }
  }, [openWindows, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && focusedWindow) {
      localStorage.setItem('rising_tech_focused_window', focusedWindow);
    } else if (isLoggedIn) {
      localStorage.removeItem('rising_tech_focused_window');
    }
  }, [focusedWindow, isLoggedIn]);

  // --- AI GENERATE ---
  const handleAiGenerate = useCallback(async () => {
    if (!newReport.problem.trim()) return;
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') { setAiError('Gemini API key not configured.'); setTimeout(() => setAiError(null), 5000); return; }
    setIsAiGenerating(true); setAiError(null);
    try {
      const prompt = `You are an expert IT Solution Architect at "Rising Tech Innovations". Analyze: "${newReport.problem.trim()}" and provide a JSON response with description, possibleError, suggestedSolution, estimatedCost (PHP), and frequency. Respond ONLY with valid JSON.`;
      const models = ['gemini-1.5-flash', 'gemini-1.5-pro'];
      let text = '', lastErr = '';
      for (const m of models) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/${m}:generateContent?key=${apiKey}`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
              contents: [{ role: 'user', parts: [{ text: prompt }] }]
            }) 
          });
          const result = await res.json();
          if (!res.ok) { 
            lastErr = result.error?.message || `HTTP ${res.status}`;
            console.error(`Gemini Error (${m}):`, result.error || result);
            continue; 
          }
          text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) break;
        } catch (e: any) { lastErr = e.message; }
      }
      if (!text) throw new Error(lastErr || 'AI generation failed.');
      const parsed = JSON.parse(text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, ''));
      setNewReport(p => ({ ...p, description: parsed.description || p.description, possibleError: parsed.possibleError || p.possibleError, suggestedSolution: parsed.suggestedSolution || p.suggestedSolution, frequency: parsed.frequency || p.frequency, estimatedCost: parsed.estimatedCost || p.estimatedCost }));
    } catch (err: any) {
      setAiError(err.message?.includes('429') ? 'API Quota Exceeded.' : 'AI generation failed.');
      setTimeout(() => setAiError(null), 8000);
    } finally { setIsAiGenerating(false); }
  }, [newReport.problem]);

  const selectedReport = dynamicReports.find(r => r.id === selectedReportId) || (dynamicReports.length > 0 ? dynamicReports[0] : { id: 'empty', problem: 'Select or Create a Template', description: 'No templates available yet.', possibleError: 'N/A', suggestedSolution: 'Create a new template.', frequency: '0%', icon: 'Zap', estimatedCost: '₱0' });
  const IconMap: Record<string, any> = { MonitorOff, WifiOff, AppWindow, Zap };

  // --- AUTH ---
  const handleLogin = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    setAuthError(null);
    
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .ilike('username', loginForm.username)
        .eq('password', loginForm.password) 
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          setAuthError('Invalid username or password.');
        } else if (error.message.includes('relation "public.app_users" does not exist')) {
          setAuthError('Database Table Error: Please run the SQL schema in your Supabase dashboard.');
        } else {
          setAuthError(`Database Error: ${error.message}`);
        }
        console.error('Login Error:', error);
        setTimeout(() => setAuthError(null), 5000);
        return;
      }

      if (!data) {
        setAuthError('Access Denied. Invalid credentials.');
        setTimeout(() => setAuthError(null), 3000);
        return;
      }

      const userInfo = {
        id: data.id,
        username: data.username,
        full_name: data.full_name,
        role: data.role
      };

      setCurrentUser(userInfo);
      localStorage.setItem('rising_tech_user', JSON.stringify(userInfo));
      
      // Seed update
      await supabase
        .from('app_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id);

    } catch (err) {
      setAuthError('Connection error.');
    }
  };

  const handleLogout = () => { 
    setCurrentUser(null); 
    localStorage.removeItem('rising_tech_user'); 
    localStorage.removeItem('rising_tech_windows');
    localStorage.removeItem('rising_tech_focused_window');
    setOpenWindows([]); 
  };

  // --- SEND EMAIL ---
  const handleLandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...clientForm };
    
    try {
      // 1. Store in Database
      await supabase.from('client_complaints').insert([{ 
        name: data.name, 
        email: data.email, 
        address: data.address, 
        problem: data.problem, 
        type: data.type, 
        category: data.category 
      }]);

      // 2. Send Email Notification
      const isWeb = data.type === 'website';
      await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: import.meta.env.VITE_EMAILJS_SERVICE_ID,
          template_id: isWeb ? (import.meta.env.VITE_EMAILJS_WEBSITE_TEMPLATE_ID || import.meta.env.VITE_EMAILJS_TEMPLATE_ID) : import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
          user_id: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
          template_params: {
            subject: isWeb ? 'New Website Proposal Request' : 'New Technical Support Request',
            complainant_name: data.name,
            complainant_email: data.email,
            to_email: data.email, // Notifying the user too if the template is set up that way, or just uses these params for the owner
            problem: data.problem,
            description: `Category: ${data.category} | Type: ${data.type}`,
            status: 'PENDING'
          }
        })
      });

      // 3. UI Updates
      setComplaintSubmitted(true);
      setTimeout(() => setComplaintSubmitted(false), 6000);
      setClientForm({ name: '', email: '', address: '', problem: '', type: 'complaint', category: 'company' });
    } catch (err) {
      console.error('Submission Error:', err);
    }
  };

  const handleSendEmail = async (targetEmail: string, customReport?: TroubleshootingReport) => {
    setIsSending(true); setErrorStatus(null);
    const r = customReport || selectedReport;
    const isWeb = r.problem.toLowerCase().includes('website') || r.problem.toLowerCase().includes('development');
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service_id: import.meta.env.VITE_EMAILJS_SERVICE_ID, template_id: isWeb ? (import.meta.env.VITE_EMAILJS_WEBSITE_TEMPLATE_ID || import.meta.env.VITE_EMAILJS_TEMPLATE_ID) : import.meta.env.VITE_EMAILJS_TEMPLATE_ID, user_id: import.meta.env.VITE_EMAILJS_PUBLIC_KEY, template_params: { subject: subject.trim(), complainant_name: complainantName.trim(), complainant_email: targetEmail.trim(), to_email: targetEmail.trim(), problem: r.problem, description: r.description || '', possible_error: r.possibleError, suggested_solution: r.suggestedSolution, frequency: r.frequency, estimated_cost: r.estimatedCost || 'N/A' } }) });
      if (!res.ok) { const t = await res.text(); throw new Error(t.substring(0, 100)); }
      const h: SentHistoryItem = { id: `send-${Date.now()}`, timestamp: new Date().toLocaleString(), recipient: targetEmail, complainantName, problem: r.problem, status: 'success' };
      setSentHistory(p => [h, ...p]);
      supabase.from('email_logs').insert([{ recipient_email: targetEmail, complainant_name: complainantName, problem: r.problem, status: 'success' }]);
      setIsSending(false); setIsSent(true); setTimeout(() => setIsSent(false), 3000);
    } catch (e: any) {
      setSentHistory(p => [{ id: `send-${Date.now()}`, timestamp: new Date().toLocaleString(), recipient: targetEmail, complainantName, problem: r.problem, status: 'error', error: e.message }, ...p]);
      setIsSending(false); setErrorStatus(e.message || 'Failed.'); setTimeout(() => setErrorStatus(null), 10000);
    }
  };

  const handleAddReport = () => {
    const id = `custom-${Date.now()}`;
    const report: TroubleshootingReport = { id, problem: newReport.problem, description: newReport.description, possibleError: newReport.possibleError, suggestedSolution: newReport.suggestedSolution, frequency: newReport.frequency, estimatedCost: newReport.estimatedCost, icon: 'Zap' };
    setDynamicReports(p => [...p, report]); setSelectedReportId(id);
    supabase.from('reports').insert([{ problem: report.problem, description: report.description, possible_error: report.possibleError, suggested_solution: report.suggestedSolution, frequency: report.frequency, estimated_cost: report.estimatedCost, icon: report.icon, is_custom: true }]);
    if (newReport.sendImmediately && newReport.targetEmail) { setComplainantName(newReport.targetName || 'Valued Client'); setComplainantEmail(newReport.targetEmail); handleSendEmail(newReport.targetEmail, report); }
    setIsModalOpen(false);
    setNewReport({ problem: '', description: '', possibleError: '', suggestedSolution: '', frequency: '90%', estimatedCost: 'Free / Internal IT', sendImmediately: false, targetEmail: '', targetName: '' });
  };

  const createDesktopShortcut = () => {
    const url = window.location.href;
    const shortcutContent = `[InternetShortcut]\nURL=${url}\nIconIndex=0`;
    const blob = new Blob([shortcutContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'RisingTech_Portal.url';
    link.click();
    URL.revokeObjectURL(link.href);
    
    setIsSent(true); // Reuse transmission toast for feedback
    alert("Shortcut file downloaded. Move it to your Desktop or Tablet storage!");
  };

  // ===================== RENDERERS =====================

  // --- KANBAN ACTIONS ---
  const handleKanbanAiSuggest = async () => {
    if (!newTask.title.trim()) return;
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return;
    setKanbanAiGenerating(true);
    try {
      const prompt = `Based on the task title "${newTask.title}", write a 1-sentence professional description. Response should be plain text.`;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        }) 
      });
      const data = await res.json();
      if (res.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) setNewTask(prev => ({ ...prev, description: text.trim() }));
      } else {
        console.error('Kanban AI Error Details:', data.error || data);
      }
    } catch (err) { console.error('Kanban AI Error:', err); }
    finally { setKanbanAiGenerating(false); }
  };

  const addTask = async () => {
    if (!newTask.title.trim() || isTaskSubmitting) return;
    setIsTaskSubmitting(true);
    try {
      const { data, error } = await supabase.from('kanban_tasks').insert([{
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        priority: newTask.priority,
        assigned_to: newTask.assignedTo || currentUser?.id,
        created_by: currentUser?.id,
        due_at: newTask.dueAt || null
      }]).select();

      if (error) throw error;

      // If data is returned (immediate feedback)
      if (data && data[0]) {
        const t = data[0];
        const newTaskObj: KanbanTask = { 
          id: t.id, 
          title: t.title, 
          description: t.description, 
          status: t.status, 
          priority: t.priority, 
          assignedTo: t.assigned_to,
          createdBy: t.created_by,
          dueAt: t.due_at,
          createdAt: t.created_at 
        };
        
        // Only update if not already handled by real-time to avoid duplicates
        setKanbanTasks(prev => {
          if (prev.some(it => it.id === t.id)) return prev;
          return [...prev, newTaskObj];
        });
      }

      setIsTaskModalOpen(false);
      setNewTask({ title: '', description: '', priority: 'medium', status: 'todo', dueAt: '', assignedTo: '' });
    } catch (err) { 
      console.error('Add Task Error:', err);
      alert('Failed to add task. Please ensure you have run the SQL schema in your Supabase dashboard.');
    } finally {
      setIsTaskSubmitting(false);
    }
  };

  const moveTask = async (id: string, newStatus: 'todo' | 'in-progress' | 'review' | 'done' | 'archived') => {
    const task = kanbanTasks.find(t => t.id === id);
    if (!task) return;

    // Permissions check:
    // 1. Task given by admin (createdBy is admin) -> only admin can manage (move/edit/delete)
    // 2. User's own task (createdBy == assignedTo == user) -> admin cannot manage
    
    const taskCreator = allUsers.find(u => u.id === task.createdBy);
    const isTaskFromAdmin = taskCreator?.role === 'admin';
    const isOtherUserTask = task.createdBy === task.assignedTo && task.assignedTo !== currentUser?.id;

    if (isAdmin) {
      // Admins can manage everything except other users' own personal tasks
      if (isOtherUserTask) {
        alert("You cannot manage this user's personal task.");
        return;
      }
    } else {
      // Non-admin logic:
      const isAssignedToMe = task.assignedTo === currentUser?.id;
      const isMyOwnTask = task.createdBy === currentUser?.id;

      if (!isAssignedToMe && !isMyOwnTask) {
        alert("You do not have permission to manage this task.");
        return;
      }

      if (isTaskFromAdmin) {
        // If task was given by admin, user can move it (Working -> Review) but not final Done/Archive
        if (newStatus === 'done' || newStatus === 'archived') {
           alert("Only Admin can complete or archive this task."); 
           return;
        }
      }
    }

    try {
      // Optimistic Update
      setKanbanTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
      
      const { error } = await supabase.from('kanban_tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    } catch (err) { console.error('Move Task Error:', err); }
  };

  // --- DRAG & DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
    // Add a class for styling
    (e.target as HTMLElement).classList.add('dragging-task');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove('dragging-task');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: 'todo' | 'in-progress' | 'review' | 'done') => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      moveTask(taskId, status);
    }
  };

  const deleteTask = async (id: string) => {
    const task = kanbanTasks.find(t => t.id === id);
    if (!task) return;

    if (isAdmin) {
      if (task.createdBy === task.assignedTo && task.assignedTo !== currentUser?.id) {
        alert("You cannot delete this user's personal task.");
        return;
      }
    } else {
      // If not admin:
      const taskCreator = allUsers.find(u => u.id === task.createdBy);
      if (taskCreator?.role === 'admin') {
        alert("Only admins can delete tasks they assigned.");
        return;
      }
      if (task.createdBy !== currentUser?.id) {
        alert("You can only delete tasks you created.");
        return;
      }
    }

    try {
      await supabase.from('kanban_tasks').delete().eq('id', id);
    } catch (err) { console.error('Delete Task Error:', err); }
  };

  const renderArchive = (tasksInArchive?: KanbanTask[]) => {
    const archivedTasks = (tasksInArchive || kanbanTasks).filter(t => t.status === 'archived');

    return (
      <div className="animate-fade-in kanban-container">
        <div className="content-header">
          <div className="title-group">
            <h1>Activity Archive</h1>
            <p>Historical record of completed and verified tasks.</p>
          </div>
          <div className="segmented-control">
            <button className={kanbanView === 'board' ? 'active' : ''} onClick={() => setKanbanView('board')}>Board</button>
            <button className={kanbanView === 'archive' ? 'active' : ''} onClick={() => setKanbanView('archive')}>Archive</button>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {archivedTasks.length > 0 ? (
            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Task Name</th>
                    <th>Assignee</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedTasks.map(task => {
                    const assignee = allUsers.find(u => u.id === task.assignedTo);
                    const isOverdue = task.dueAt && new Date(task.dueAt) < new Date();
                    return (
                      <tr key={task.id}>
                        <td style={{ fontWeight: 600 }}>{task.title}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="task-assignee-mini">{assignee?.full_name.split(' ').map(n => n[0]).join('')}</div>
                            <span>{assignee?.full_name || 'Unassigned'}</span>
                          </div>
                        </td>
                        <td style={{ color: isOverdue ? '#f87171' : 'inherit', fontWeight: isOverdue ? 600 : 400 }}>
                          {task.dueAt ? new Date(task.dueAt).toLocaleString() : 'No Due Date'}
                          {isOverdue && <span style={{ marginLeft: '8px', fontSize: '0.7rem' }}>(OVERDUE)</span>}
                        </td>
                        <td><span className="status-badge status-success">ARCHIVED</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Clock size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
              <p>No archived tasks yet.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderKanban = () => {
    const columns: { id: 'todo' | 'in-progress' | 'review' | 'done', label: string, icon: any, color: string }[] = [
      { id: 'todo', label: 'To Do', icon: Clock, color: 'var(--text-muted)' },
      { id: 'in-progress', label: 'Working', icon: Loader2, color: 'var(--accent-primary)' },
      { id: 'review', label: 'Review', icon: ShieldCheck, color: 'var(--accent-secondary)' },
      { id: 'done', label: 'Done', icon: CheckCircle, color: '#10b981' }
    ];

    // Visibility Calculation:
    const visibleTasks = kanbanTasks.filter(task => {
      const isPersonalTask = task.createdBy === task.assignedTo && task.createdBy !== currentUser?.id;
      if (isAdmin) {
        // Admins see everything except users' private personal tasks
        return !isPersonalTask;
      } else {
        // Users see tasks assigned to them OR tasks they created
        return task.assignedTo === currentUser?.id || task.createdBy === currentUser?.id;
      }
    });

    const isBoard = kanbanView === 'board';
    const isArchive = kanbanView === 'archive';

    if (isArchive) return renderArchive(visibleTasks);

    return (
      <div className="animate-fade-in kanban-container">
        <div className="content-header">
          <div className="title-group">
            <h1>Project Kanban</h1>
            <p>Manage and verify team progress.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div className="segmented-control">
              <button className={isBoard ? 'active' : ''} onClick={() => setKanbanView('board')}>Board</button>
              <button className={isArchive ? 'active' : ''} onClick={() => setKanbanView('archive')}>Archive</button>
            </div>
            <button className="btn-primary" onClick={() => setIsTaskModalOpen(true)}>
              <Plus size={16} /> New Task
            </button>
          </div>
        </div>

        <div className="kanban-board">
          {columns.map(col => (
            <div 
              key={col.id} 
              className="kanban-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="kanban-column-header">
                <div className="col-title">
                  <col.icon size={16} style={{ color: col.color }} />
                  <span>{col.label}</span>
                  <span className="count">{visibleTasks.filter(t => t.status === col.id).length}</span>
                </div>
                <MoreVertical size={14} className="text-muted" />
              </div>

              <div className="kanban-task-list">
                {visibleTasks.filter(t => t.status === col.id).map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    className="kanban-card-wrapper"
                  >
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`kanban-card${task.status === 'done' ? ' task-completed' : ''}`}
                    >
                      <div className="card-top">
                          {task.status === 'done' ? (
                            <span className="priority-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>Verified</span>
                          ) : (
                            <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
                          )}
                        <div className="card-actions">
                          {task.assignedTo && (
                            <div className="task-assignee-mini" title={allUsers.find(u => u.id === task.assignedTo)?.full_name}>
                              {allUsers.find(u => u.id === task.assignedTo)?.full_name.split(' ').map(n => n[0]).join('')}
                            </div>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="action-btn delete"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      <h4 className="task-title" style={task.status === 'done' ? { textDecoration: 'line-through', opacity: 0.6 } : {}}>{task.title}</h4>
                      <p className="task-desc" style={task.status === 'done' ? { opacity: 0.5 } : {}}>{task.description}</p>
                      
                      <div className="card-footer">
                        <div className="task-meta">
                          {task.status === 'done' ? (
                            <CheckCircle size={12} style={{ color: '#10b981' }} />
                          ) : (
                            <Calendar size={12} />
                          )}
                          <span style={task.status !== 'done' && task.dueAt && new Date(task.dueAt) < new Date() ? { color: '#f87171', fontWeight: 600 } : {}}>
                            {task.status === 'done' 
                              ? `Finished on ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                              : task.dueAt 
                                ? `Due: ${new Date(task.dueAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                : `Created: ${new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                          </span>
                        </div>
                      </div>

                      {task.status === 'review' && isAdmin && (
                        <div className="review-actions">
                          <button className="review-btn accept" onClick={() => moveTask(task.id, 'done')}>Accept</button>
                          <button className="review-btn reject" onClick={() => moveTask(task.id, 'in-progress')}>Reject</button>
                        </div>
                      )}
                    </motion.div>
                  </div>
                ))}
                {kanbanTasks.filter(t => t.status === col.id).length === 0 && (
                  <div className="kanban-empty">No tasks here</div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    );
  };

  const renderDashboard = () => (
    <div className="animate-fade-in">
      <div className="content-header"><div className="title-group"><h1>System Dashboard</h1><p>Real-time analytics overview.</p></div></div>
      <div className="stats-grid">
        <div className="card stat-card"><div className="stat-label">Reports Dispatched</div><div className="stat-value">{sentHistory.length}</div></div>
        <div className="card stat-card" style={{ borderLeftColor: '#10b981' }}><div className="stat-label">Success Rate</div><div className="stat-value">{sentHistory.length > 0 ? Math.round((sentHistory.filter(h => h.status === 'success').length / sentHistory.length) * 100) : 0}%</div></div>
        <div className="card stat-card" style={{ borderLeftColor: 'var(--accent-secondary)' }}><div className="stat-label">Active Templates</div><div className="stat-value">{dynamicReports.length}</div></div>
      </div>
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Recent Activity</h3>
        <div className="history-table-container" style={{ marginTop: '1rem' }}>
          <table className="history-table"><thead><tr><th>Complainant</th><th>Problem</th><th>Status</th></tr></thead>
            <tbody>{sentHistory.slice(0, 5).map(i => (<tr key={i.id}><td>{i.complainantName}</td><td>{i.problem}</td><td><span className={`status-badge ${i.status === 'success' ? 'status-success' : 'status-error'}`}>{i.status}</span></td></tr>))}
              {sentHistory.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No recent activity.</td></tr>}
            </tbody></table>
        </div>
      </div>
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Client Complaints Pipeline</h3>
        <div className="history-table-container" style={{ marginTop: '1rem' }}>
          <table className="history-table"><thead><tr><th>Date</th><th>Client</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>{clientComplaints.length > 0 ? clientComplaints.map(c => (<tr key={c.id}><td style={{ fontSize: '0.85rem' }}>{c.timestamp}</td><td><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>{c.email}</div></td><td><span className={`status-badge ${c.type === 'website' ? 'status-success' : 'status-pending'}`}>{c.type === 'website' ? 'Website' : 'Support'}</span></td><td>{c.problem}</td></tr>)) :
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No pending complaints.</td></tr>}
            </tbody></table>
        </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="animate-fade-in">
      <div className="content-header"><div className="title-group"><h1>Reports History</h1><p>Audit trail of dispatched reports.</p></div></div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {sentHistory.length > 0 ? (
          <div className="history-table-container"><table className="history-table"><thead><tr><th>Date</th><th>Complainant</th><th>Email</th><th>Problem</th><th>Status</th></tr></thead>
            <tbody>{sentHistory.map(i => (<tr key={i.id}><td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{i.timestamp}</td><td style={{ fontWeight: 600 }}>{i.complainantName}</td><td>{i.recipient}</td><td>{i.problem}</td><td><span className={`status-badge ${i.status === 'success' ? 'status-success' : 'status-error'}`}>{i.status}</span></td></tr>))}</tbody></table></div>
        ) : (<div className="empty-state"><FileText size={48} className="empty-state-icon" /><h3>No reports sent yet</h3><p>Use the Email Sender to get started.</p></div>)}
      </div>
    </div>
  );


  const WALLPAPERS = [
    { id: 'default', value: 'linear-gradient(160deg, #0a0d14 0%, #0d1117 30%, #0f1520 60%, #0a0d14 100%)', label: 'Space' },
    { id: 'sunset', value: 'linear-gradient(135deg, #fceabb 0%, #f8b500 100%)', label: 'Sunset' },
    { id: 'ocean', value: 'linear-gradient(135deg, #2bc0e4 0%, #eaecc6 100%)', label: 'Ocean' },
    { id: 'nordic', value: 'linear-gradient(135deg, #2c3e50 0%, #000000 100%)', label: 'Nordic' },
    { id: 'macos-light', value: 'url(https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop)', label: 'Abstract' },
    { id: 'macos-dark', value: 'url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop)', label: 'Dynamic' },
    { id: 'premium', value: 'linear-gradient(to right, #243b55, #141e30)', label: 'Premium' },
  ];

  const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setWallpaper(`url(${event.target.result})`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const renderSettings = () => (
    <div className="animate-fade-in">
      <div className="content-header"><div className="title-group"><h1>Configuration</h1><p>Manage connection and appearance.</p></div></div>
      
      <div className="card">
        <h3>Desktop & Tablet Integration</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Download a shortcut file to access this portal directly from your real computer desktop or tablet.
        </p>
        <button className="btn-primary" onClick={createDesktopShortcut} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={16} /> Download Desktop Shortcut
        </button>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Appearance</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>Configure system-wide visual styles.</p>
        
        <div className="appearance-grid">
          <div className={`theme-card ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>
            <div className="theme-preview">
              <div className="preview-win">
                <div className="preview-bar" />
                <div style={{ flex: 1, padding: '4px' }}><div style={{ width: '40%', height: '4px', background: '#e2e8f0', borderRadius: '2px' }} /></div>
              </div>
            </div>
            <span className="theme-label">Light</span>
          </div>

          <div className={`theme-card dark-mode-preview ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>
            <div className="theme-preview">
              <div className="preview-win">
                <div className="preview-bar" style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
                <div style={{ flex: 1, padding: '4px' }}><div style={{ width: '40%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }} /></div>
              </div>
            </div>
            <span className="theme-label">Dark</span>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Desktop Clock Color</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '0.75rem' }}>
            {['#ffffff', '#000000', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#d946ef'].map(color => (
              <div 
                key={color} 
                onClick={() => setClockColor(color)}
                style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  background: color, 
                  cursor: 'pointer',
                  border: clockColor === color ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  boxShadow: clockColor === color ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none',
                  transition: 'all 0.2s'
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Desktop Wallpaper</label>
          <div className="wallpaper-grid">
            <div className="wallpaper-thumb photo-btn" onClick={() => document.getElementById('wallpaper-input')?.click()}>
              <Plus size={20} />
              <input type="file" id="wallpaper-input" hidden accept="image/*" onChange={handleWallpaperUpload} />
            </div>
            
            {/* Show custom uploaded wallpaper if active and not a preset */}
            {wallpaper.startsWith('url(data:') && (
              <div 
                className="wallpaper-thumb active"
                style={{ background: wallpaper }}
                title="Custom Photo"
              />
            )}

            {WALLPAPERS.map(wp => (
              <div 
                key={wp.id} 
                className={`wallpaper-thumb ${wallpaper === wp.value ? 'active' : ''}`}
                style={{ background: wp.value }}
                onClick={() => setWallpaper(wp.value)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>System Connectivity</h3>
        <div style={{ padding: '1.25rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '1rem' }}>
          <div style={{ width: '36px', height: '36px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'grid', placeItems: 'center' }}><CheckCircle size={20} style={{ color: '#10b981' }} /></div>
          <div><div style={{ color: '#10b981', fontWeight: 600 }}>Active & Encrypted</div><div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>API credentials managed securely.</div></div>
        </div>
      </div>
      
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>System Shortcuts</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1rem' }}>Create a direct shortcut on your desktop for quick access.</p>
        <button className="btn-primary" onClick={createDesktopShortcut} style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', boxShadow: 'none' }}>
          <AppWindow size={16} /> Create desktop shortcut
        </button>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Account</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Logged in as {currentUser?.full_name} ({currentUser?.role})</p>
        <button className="btn-primary" style={{ marginTop: '1rem', background: 'rgba(239,68,68,0.15)', boxShadow: 'none', color: '#f87171' }} onClick={handleLogout}><LogOut size={16} /> Logout</button>
      </div>
    </div>
  );

  const renderSender = () => (
    <div className="animate-fade-in">
      <div className="content-header">
        <div className="title-group"><h1>Troubleshooting Hub</h1><p>Generate and send professional reports.</p></div>
        <div className="stats-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}><Clock size={16} /><span>~2m</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}><CheckCircle size={16} /><span>Online</span></div>
        </div>
      </div>
      <section style={{ height: `${toolsHeight}px`, overflowY: 'auto', marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem' }}>Problem Type</h2>
          <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setIsModalOpen(true)}><Zap size={14} /> Add Report</button>
        </div>
        <div className="report-grid">
          {dynamicReports.map(report => { const IC = IconMap[report.icon] || Zap; return (
            <motion.div key={report.id} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} className={`report-option ${selectedReportId === report.id ? 'selected' : ''}`} onClick={() => setSelectedReportId(report.id)}>
              <div className="report-icon-box"><IC size={20} /></div>
              <div><h3 style={{ marginBottom: '0.2rem', fontSize: '0.95rem' }}>{report.problem}</h3><p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{report.frequency}</p></div>
            </motion.div>); })}
        </div>
      </section>

      <div 
        className="section-divider-h" 
        onMouseDown={() => setIsResizingTools(true)}
      />

      <div className="editor-layout" style={{ marginTop: '0.5rem' }}>
        <div className="card">
          <h2 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}><Mail size={18} className="text-accent" /> Compose</h2>
          <div className="input-group"><label>Complainant Name <span style={{ color: '#f87171' }}>*</span></label><input type="text" className="terminal-input" value={complainantName} onChange={e => setComplainantName(e.target.value)} placeholder="Enter full name" /></div>
          <div className="input-group"><label>Recipient Email</label><input type="email" className="terminal-input" value={complainantEmail} onChange={e => setComplainantEmail(e.target.value)} /></div>
          <div className="input-group"><label>Subject</label><input type="text" className="terminal-input" value={subject} onChange={e => setSubject(e.target.value)} /></div>
          <button className="btn-primary" style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center', opacity: !complainantName ? 0.6 : 1 }} onClick={() => handleSendEmail(complainantEmail)} disabled={isSending || !complainantName}>
            {!complainantName ? 'Enter Name' : isSending ? 'Sending...' : isSent ? 'Sent!' : 'Send Report'}
          </button>
          {errorStatus && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '1rem', padding: '0.8rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#f87171', fontSize: '0.82rem', display: 'flex', gap: '8px' }}><AlertCircle size={16} /><span>{errorStatus}</span></motion.div>}
        </div>
        <div className="card" style={{ padding: 0 }}>
          <div className="preview-pane">
            <div className="preview-header"><span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Live Preview</span><div style={{ fontSize: '0.8rem', color: '#1e293b', marginTop: '3px' }}><strong>To:</strong> {complainantEmail}</div></div>
            <div className="preview-body">
              <p style={{ color: '#334155', marginBottom: '1rem' }}><strong>Technical Report</strong><br /><span style={{ fontSize: '0.8rem', color: '#64748b' }}>For: {complainantName || '...'}</span></p>
              <div className="report-box">
                <div className="report-field"><div className="field-label">Problem</div><div className="field-value" style={{ fontWeight: 600 }}>{selectedReport.problem}</div><div style={{ color: '#64748b', fontSize: '0.75rem' }}>{selectedReport.description}</div></div>
                <div className="report-field"><div className="field-label">Possible Error</div><div className="field-value">{selectedReport.possibleError}</div></div>
                <div className="report-field"><div className="field-label">Solution</div><div className="field-value" style={{ background: '#f1f5f9', padding: '8px', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>{selectedReport.suggestedSolution}</div></div>
                <div className="report-field"><div className="field-label">Cost</div><div className="field-value" style={{ fontWeight: 600, color: '#10b981' }}>{selectedReport.estimatedCost || 'N/A'}</div></div>
                <div className="report-field" style={{ marginBottom: 0 }}><div className="field-label">Rate</div><div className="frequency-badge">{selectedReport.frequency}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const getWindowContent = (type: string) => {
    switch (type) {
      case 'dashboard': return renderDashboard();
      case 'kanban': return renderKanban();
      case 'reports': return renderHistory();
      case 'users': return isAdmin ? <UserManagement currentUserId={currentUser?.id} /> : <div className="card">Unauthorized Access</div>;
      case 'settings': return renderSettings();
      default: return renderSender();
    }
  };

  const getWindowTitle = (type: string) => {
    const app = DOCK_APPS.find(a => a.type === type);
    return app?.label || 'Window';
  };

  // ===================== LANDING PAGE =====================
  const renderLandingPage = () => (
    <div className="landing-page">
      <div className="landing-nav">
        <div className="logo-section" onClick={() => setShowLogin(true)} style={{ marginBottom: 0, cursor: 'pointer' }}><img src="/logo.png" alt="Rising Tech Logo" style={{ height: '45px', width: 'auto' }} /></div>
      </div>
      <div className="hero-section">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="hero-content">
          <div className="badge-pill"><Sparkles size={16} /> Powered by Next-Gen AI</div>
          <h1>Rising Tech IT Solutions</h1>
          <h2>Next-Gen Web & Support Ecosystems</h2>
          <p>From custom websites to AI-driven troubleshooters, we build the digital infrastructure your business needs.</p>
          <div className="hero-actions">
            <button className="nav-item hero-btn-secondary" style={{ padding: '1.2rem 2.5rem', background: 'rgba(255,255,255,0.05)', color: 'white', borderRadius: '14px', border: '1px solid var(--glass-border)' }} onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Learn More</button>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }} className="hero-visual">
          <div className="glass-card">
            <div className="mock-header"><div className="dot red"></div><div className="dot yellow"></div><div className="dot green"></div></div>
            <div className="mock-body"><div className="mock-line" style={{ width: '60%' }}></div><div className="mock-line"></div><div className="mock-line" style={{ width: '80%' }}></div><div className="mock-box"><div className="ai-scanning"><Bot size={32} className="text-accent" /><span>AI Troubleshooting Initiated...</span></div></div></div>
          </div>
        </motion.div>
      </div>

      <div id="features" style={{ padding: '6rem 4rem', background: 'linear-gradient(to bottom, transparent, rgba(59,130,246,0.05))' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}><h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Intelligent Support Matrix</h2><p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>Leveraging cloud AI to reduce technical downtime.</p></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
          {[{ icon: Bot, color: '#3b82f6', title: 'AI Root-Cause Diagnosis', desc: 'Input symptoms, get precise error mapping instantly.' },
            { icon: CheckCircle, color: '#10b981', title: 'Automated Cost Estimation', desc: 'Instant repair cost estimates before work begins.' },
            { icon: Sparkles, color: '#8b5cf6', title: 'Premium Web Development', desc: 'High-conversion websites and custom internal tools.' }
          ].map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="feature-card glass-card" style={{ padding: '2.5rem', transform: 'none' }}>
              <div className="report-icon-box" style={{ marginBottom: '1.5rem', background: `${f.color}15`, color: f.color }}><f.icon size={28} /></div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '0.95rem' }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <footer id="complaint-form" style={{ padding: '6rem 4rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--glass-border)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem' }}>
          <div>
            <div className="logo-section" style={{ marginBottom: '1.5rem' }}><img src="/logo.png" alt="Logo" style={{ height: '50px' }} /></div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Client Support Portal</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2rem' }}>Submit your complaint below. Our AI will process and dispatch a report to your inbox.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}><MapPin size={18} style={{ flexShrink: 0, marginTop: '2px' }} /><span style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>Rising Tech HQ<br />Valenzuela City</span></div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}><Phone size={18} /><span style={{ fontSize: '0.9rem' }}>+63 994 301 8284</span></div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}><Mail size={18} /><span style={{ fontSize: '0.9rem' }}>support@risingtech.innovation</span></div>
            </div>
          </div>
          <div className="card glass-card" style={{ padding: '2.5rem', transform: 'none' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>Submit a Request</h3>
            {complaintSubmitted ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>
                <CheckCircle size={40} style={{ color: '#10b981', margin: '0 auto 1rem' }} />
                <h4 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Request Sent!</h4>
              </div>
            ) : (
              <form onSubmit={handleLandingSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group"><label>Full Name *</label><input type="text" className="terminal-input" required value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} placeholder="John Doe" /></div>
                  <div className="input-group"><label>Category</label><select className="terminal-input" value={clientForm.category} onChange={e => setClientForm({ ...clientForm, category: e.target.value })} style={{ height: '42px' }}><option value="student" className="select-option">🎓 Student</option><option value="organization" className="select-option">🏛️ Organization</option><option value="company" className="select-option">🏢 Company</option></select></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group"><label>Email *</label><input type="email" className="terminal-input" required value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} placeholder="john@company.com" /></div>
                  <div className="input-group"><label>Type</label><select className="terminal-input" value={clientForm.type} onChange={e => setClientForm({ ...clientForm, type: e.target.value })} style={{ height: '42px' }}><option value="complaint" className="select-option">🔧 Tech Support</option><option value="website" className="select-option">🌐 Website</option></select></div>
                </div>
                <div className="input-group"><label>{clientForm.type === 'website' ? 'Requirements' : 'Problem'} *</label><textarea className="terminal-input" required value={clientForm.problem} onChange={e => setClientForm({ ...clientForm, problem: e.target.value })} placeholder={clientForm.type === 'website' ? 'Describe your project...' : 'Describe the issue...'} style={{ height: '90px' }} /></div>
                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>{clientForm.type === 'website' ? 'Get Proposal' : 'Submit Request'}</button>
              </form>
            )}
          </div>
        </div>
      </footer>
      {showLogin && renderLogin()}
    </div>
  );

  const renderLogin = () => (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowLogin(false); }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '3rem', position: 'relative' }}>
        <button onClick={() => setShowLogin(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}><img src="/logo.png" alt="Logo" style={{ height: '80px', margin: '0 auto 1.5rem' }} /><h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Terminal Access</h2><p style={{ color: 'var(--text-secondary)' }}>Rising Tech Innovation Hub</p></div>
        <form onSubmit={handleLogin}>
          <div className="input-group"><label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={14} /> Username</label><input type="text" className="terminal-input" placeholder="operator id" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} required /></div>
          <div className="input-group"><label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Lock size={14} /> Password</label><input type="password" className="terminal-input" placeholder="security key" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required /></div>
          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>Authenticate</button>
          <AnimatePresence>{authError && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', color: '#f87171', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px' }}><AlertCircle size={16} />{authError}</motion.div>}</AnimatePresence>
        </form>
      </div>
    </div>
  );

  // ===================== MAIN RENDER =====================

  if (!isLoggedIn) return renderLandingPage();

  const timeStr = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="macos-desktop">
      {/* Menu Bar */}
      <div className="macos-menubar">
        <div className="menubar-left">
          <span className="apple-logo">🍎</span>
          <span>Rising Tech</span>
        </div>
        <div className="menubar-right">
          <span>{dateStr}</span>
          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{timeStr}</span>
        </div>
      </div>

      {/* Desktop Area */}
      <div className="desktop-area">
        <div className="macos-desktop" style={{ background: wallpaper, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="desktop-clock" style={{ color: clockColor }}>
          <div className="time">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
          <div className="date">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>

        {/* Windows */}
        {openWindows.map(w => {
          const def = WINDOW_DEFAULTS[w.type] || WINDOW_DEFAULTS.dashboard;
          const app = DOCK_APPS.find(a => a.type === w.type);
          return (
            <MacWindow
              key={w.id} id={w.id}
              title={getWindowTitle(w.type)}
              icon={app ? <app.icon size={14} style={{ color: 'var(--accent-primary)' }} /> : undefined}
              isMinimized={w.minimized}
              isFullscreen={w.fullscreen}
              isFocused={focusedWindow === w.id}
              initialX={def.x} initialY={def.y}
              initialWidth={def.w} initialHeight={def.h}
              onClose={() => closeWindow(w.id)}
              onMinimize={() => minimizeWindow(w.id)}
              onFullscreen={() => toggleFullscreen(w.id)}
              onFocus={() => setFocusedWindow(w.id)}
            >
              {getWindowContent(w.type)}
            </MacWindow>
          );
        })}
      </div>

      {/* Custom Report Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop" style={{ zIndex: 5000 }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="modal-content card" style={{ maxWidth: '520px', width: '95%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Custom Report</h2>
                <div onClick={() => setAiAssistEnabled(!aiAssistEnabled)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', background: aiAssistEnabled ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${aiAssistEnabled ? 'rgba(139,92,246,0.4)' : 'var(--glass-border)'}`, transition: 'all 0.3s' }}>
                  {aiAssistEnabled ? <Bot size={14} style={{ color: '#a78bfa' }} /> : <PenLine size={14} style={{ color: 'var(--text-secondary)' }} />}
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: aiAssistEnabled ? '#a78bfa' : 'var(--text-secondary)' }}>{aiAssistEnabled ? 'AI' : 'Manual'}</span>
                  <div style={{ width: '28px', height: '16px', borderRadius: '8px', padding: '2px', background: aiAssistEnabled ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s', position: 'relative' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#fff', transition: 'all 0.3s', transform: aiAssistEnabled ? 'translateX(12px)' : 'translateX(0)' }} /></div>
                </div>
              </div>
              <div className="input-group"><label>Problem Title *</label><input type="text" className="terminal-input" placeholder="e.g., Laptop overheating" value={newReport.problem} onChange={e => setNewReport({ ...newReport, problem: e.target.value })} /></div>
              {aiAssistEnabled && <div style={{ marginBottom: '1rem' }}><button onClick={handleAiGenerate} disabled={!newReport.problem.trim() || isAiGenerating} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px dashed rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.05)', color: !newReport.problem.trim() ? 'var(--text-muted)' : '#a78bfa', cursor: !newReport.problem.trim() || isAiGenerating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem', fontFamily: 'inherit' }}>{isAiGenerating ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</> : <><Sparkles size={16} /> Generate with AI</>}</button>
                <AnimatePresence>{aiError && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={12} /> {aiError}</motion.div>}</AnimatePresence>
              </div>}
              <div className="input-group"><label>Description</label><textarea className="terminal-input" value={newReport.description} onChange={e => setNewReport({ ...newReport, description: e.target.value })} style={isAiGenerating ? { opacity: 0.5 } : {}} /></div>
              <div className="input-group"><label>Possible Error</label><input type="text" className="terminal-input" value={newReport.possibleError} onChange={e => setNewReport({ ...newReport, possibleError: e.target.value })} style={isAiGenerating ? { opacity: 0.5 } : {}} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group"><label>Frequency</label><input type="text" className="terminal-input" value={newReport.frequency} onChange={e => setNewReport({ ...newReport, frequency: e.target.value })} /></div>
                <div className="input-group"><label>Estimated Cost</label><input type="text" className="terminal-input" value={newReport.estimatedCost} onChange={e => setNewReport({ ...newReport, estimatedCost: e.target.value })} /></div>
              </div>
              <div className="input-group"><label>Suggested Solution</label><textarea className="terminal-input" value={newReport.suggestedSolution} onChange={e => setNewReport({ ...newReport, suggestedSolution: e.target.value })} style={isAiGenerating ? { opacity: 0.5 } : {}} /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', background: 'rgba(59,130,246,0.05)', padding: '10px', borderRadius: '10px' }}><input type="checkbox" id="sendNow" style={{ width: '16px', height: '16px' }} checked={newReport.sendImmediately} onChange={e => setNewReport({ ...newReport, sendImmediately: e.target.checked })} /><label htmlFor="sendNow" style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>Send immediately</label></div>
              {newReport.sendImmediately && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="input-group"><label>Recipient Name</label><input type="text" className="terminal-input" value={newReport.targetName} onChange={e => setNewReport({ ...newReport, targetName: e.target.value })} /></div><div className="input-group"><label>Recipient Email</label><input type="email" className="terminal-input" value={newReport.targetEmail} onChange={e => setNewReport({ ...newReport, targetEmail: e.target.value })} /></div></motion.div>}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={handleAddReport} disabled={!newReport.problem || (newReport.sendImmediately && !newReport.targetEmail)}>{newReport.sendImmediately ? 'Save & Send' : 'Save Template'}</button>
                <button className="nav-item" style={{ background: 'rgba(255,255,255,0.05)', border: 'none' }} onClick={() => { setIsModalOpen(false); setAiError(null); }}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* Kanban Task Modal */}
      <AnimatePresence>
        {isTaskModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop" style={{ zIndex: 6000 }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="modal-content task-modal-content card">
              <form onSubmit={(e) => { e.preventDefault(); addTask(); }}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Create New Task</h2>
              <div className="input-group">
                <label>Task Title</label>
                <input 
                  type="text" 
                  className="terminal-input" 
                  placeholder="What needs to be done?" 
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  autoFocus
                  required
                />
              </div>
              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Description</label>
                  {newTask.title.trim() && (
                    <button 
                      type="button" 
                      onClick={handleKanbanAiSuggest} 
                      disabled={kanbanAiGenerating}
                      style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '2px 8px' }}
                    >
                      {kanbanAiGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      AI Suggest
                    </button>
                  )}
                </div>
                <textarea 
                  className="terminal-input" 
                  placeholder="Add more details..." 
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  style={{ height: '80px' }}
                />
              </div>
              <div className="task-modal-grid">
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Priority</label>
                  <select 
                    className="terminal-input"
                    value={newTask.priority}
                    onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Initial Status</label>
                  <select 
                    className="terminal-input"
                    value={newTask.status}
                    onChange={e => setNewTask({...newTask, status: e.target.value as any})}
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Needs Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              {isAdmin && (
                <div className="input-group">
                  <label>Assign To</label>
                  <select 
                    className="terminal-input"
                    value={newTask.assignedTo}
                    onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}
                  >
                    <option value="">Myself</option>
                    {allUsers.filter(u => u.id !== currentUser?.id).map(user => (
                      <option key={user.id} value={user.id}>{user.full_name} (@{user.username})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="input-group">
                <label>Due Date & Time (Required)</label>
                <input 
                  type="datetime-local" 
                  className="terminal-input" 
                  value={newTask.dueAt}
                  onChange={e => setNewTask({...newTask, dueAt: e.target.value})}
                  onClick={(e) => (e.target as any).showPicker?.()}
                  onFocus={(e) => (e.target as any).showPicker?.()}
                  min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" disabled={isTaskSubmitting} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {isTaskSubmitting ? 'Creating...' : 'Create Task'}
                </button>
                <button type="button" disabled={isTaskSubmitting} className="nav-item" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '0 1rem', cursor: 'pointer' }} onClick={() => setIsTaskModalOpen(false)}>Cancel</button>
              </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* macOS Dock */}
      <div className="macos-dock">
        {DOCK_APPS.filter(app => !(app as any).adminOnly || isAdmin).map((app, i) => {
          const isOpen = openWindows.some(w => w.type === app.type);
          return (
            <React.Fragment key={app.type}>
              {i === 2 && <div className="dock-separator" />}
              <div className={`dock-item${bouncingDock === app.type ? ' bouncing' : ''}`} onClick={() => openApp(app.type)}>
                <div className="dock-tooltip">{app.label}</div>
                <div className={`dock-icon ${app.cssClass}`}><app.icon size={26} /></div>
                {isOpen && <div className="dock-indicator" />}
              </div>
            </React.Fragment>
          );
        })}
        <div className="dock-separator" />
        <div className="dock-item" onClick={handleLogout}>
          <div className="dock-tooltip">Logout</div>
          <div className="dock-icon" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}><LogOut size={24} /></div>
        </div>
        {/* Minimized windows appear here like macOS */}
        {openWindows.filter(w => w.minimized).length > 0 && <div className="dock-separator" />}
        {openWindows.filter(w => w.minimized).map(w => {
          const app = DOCK_APPS.find(a => a.type === w.type);
          if (!app) return null;
          return (
            <div key={w.id} className="dock-item" onClick={() => { setOpenWindows(ws => ws.map(win => win.id === w.id ? { ...win, minimized: false } : win)); setFocusedWindow(w.id); }}>
              <div className="dock-tooltip">{app.label} (minimized)</div>
              <div className={`dock-icon ${app.cssClass}`} style={{ width: 44, height: 44, borderRadius: 10, opacity: 0.7 }}><app.icon size={20} /></div>
            </div>
          );
        })}
      </div>

      {/* Toast */}
      <AnimatePresence>{isSent && <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} style={{ position: 'fixed', bottom: '90px', right: '30px', background: '#10b981', color: 'white', padding: '0.8rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 9999, fontSize: '0.9rem' }}><CheckCircle size={18} />Transmission complete!</motion.div>}</AnimatePresence>
    </div>
  );
};

export default App;
