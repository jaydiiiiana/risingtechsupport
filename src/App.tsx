import React, { useState, useCallback } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Mail, 
  Settings, 
  HelpCircle, 
  CheckCircle,
  Clock,
  MonitorOff,
  WifiOff,
  AppWindow,
  Zap,
  AlertCircle,
  User,
  Lock,
  LogOut,
  Sparkles,
  Bot,
  Loader2,
  PenLine,
  MapPin,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { reports, type TroubleshootingReport } from './data/reports';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface SentHistoryItem {
  id: string;
  timestamp: string;
  recipient: string;
  complainantName: string;
  problem: string;
  status: 'success' | 'error';
  error?: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('sender');
  const [dynamicReports, setDynamicReports] = useState<TroubleshootingReport[]>(reports);
  const [selectedReportId, setSelectedReportId] = useState(reports[0].id);
  const [complainantName, setComplainantName] = useState('');
  const [complainantEmail, setComplainantEmail] = useState('ajohndarcy@gmail.com');
  const [subject, setSubject] = useState('Technical Troubleshooting Report - Rising Tech');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [sentHistory, setSentHistory] = useState<SentHistoryItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('rising_tech_auth') === 'true');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [clientComplaints, setClientComplaints] = useState<any[]>([]);
  const [clientForm, setClientForm] = useState({ name: '', email: '', address: '', problem: '' });
  const [complaintSubmitted, setComplaintSubmitted] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newReport, setNewReport] = useState({
    problem: '',
    description: '',
    possibleError: '',
    suggestedSolution: '',
    frequency: '90%',
    estimatedCost: 'Free / Internal IT',
    sendImmediately: false,
    targetEmail: '',
    targetName: ''
  });

  // AI Assist State
  const [aiAssistEnabled, setAiAssistEnabled] = useState(true);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAiGenerate = useCallback(async () => {
    if (!newReport.problem.trim()) return;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      setAiError('Gemini API key not configured. Add your key in the .env file.');
      setTimeout(() => setAiError(null), 5000);
      return;
    }

    setIsAiGenerating(true);
    setAiError(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      
      const prompt = `You are a professional IT support technician at a tech company called "Rising Tech Innovations". 
Given this computer/tech problem: "${newReport.problem.trim()}"

Generate a professional troubleshooting report in STRICT JSON format with these fields:
{
  "description": "A 1-2 sentence professional description of the problem",
  "possibleError": "A comma-separated list of 3-4 possible root causes",
  "suggestedSolution": "A clear, step-by-step solution (2-4 steps) written as a single paragraph",
  "frequency": "An estimated resolution success rate as a percentage like '85% (High)' or '92% (Very High)' or '78% (Moderate)'",
  "estimatedCost": "An estimated range of repair out-of-pocket costs such as '$50 - $100' or 'Free / Covered by warranty'"
}

Respond ONLY with the JSON object, no markdown, no code blocks, no explanation.`;

      const fallbackModels = [
        'gemini-3.1-flash-lite',
        'gemini-3-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.5-flash',
        'gemini-1.5-flash'
      ];
      
      let text = '';
      let lastError: any = null;

      for (const modelName of fallbackModels) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          text = result.response.text().trim();
          break; // Success! Break out of the loop
        } catch (err: any) {
          console.warn(`Model ${modelName} failed:`, err.message || err);
          lastError = err;
          
          // If the error is an invalid API key, no model will work, so break immediately
          if (err.message && err.message.includes('API_KEY')) {
            break;
          }
          // Otherwise (like 429 quota exceeded), it will continue to the next model in the fallback array
        }
      }

      if (!text) {
        throw lastError || new Error('All fallback models failed to generate content.');
      }
      
      // Clean potential markdown code block wrapping
      const cleanJson = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      const parsed = JSON.parse(cleanJson);

      setNewReport(prev => ({
        ...prev,
        description: parsed.description || prev.description,
        possibleError: parsed.possibleError || prev.possibleError,
        suggestedSolution: parsed.suggestedSolution || prev.suggestedSolution,
        frequency: parsed.frequency || prev.frequency,
        estimatedCost: parsed.estimatedCost || prev.estimatedCost,
      }));
    } catch (err: any) {
      console.error('AI Generation failed:', err);
      let errorMessage = 'AI generation failed. You can fill the fields manually.';
      
      if (err.message?.includes('API_KEY')) {
        errorMessage = 'Invalid API key. Please check your Gemini API key.';
      } else if (err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('Quota')) {
        errorMessage = 'API Quota Exceeded limit. Please wait a moment before trying again.';
      }
      
      setAiError(errorMessage);
      setTimeout(() => setAiError(null), 8000);
    } finally {
      setIsAiGenerating(false);
    }
  }, [newReport.problem]);

  const selectedReport = dynamicReports.find(r => r.id === selectedReportId) || dynamicReports[0];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'risingtech' && loginForm.password === 'rising@tech@innovations') {
      setIsLoggedIn(true);
      localStorage.setItem('rising_tech_auth', 'true');
      setAuthError(null);
    } else {
      setAuthError('Access Denied. Invalid credentials.');
      setTimeout(() => setAuthError(null), 3000);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('rising_tech_auth');
    setActiveTab('sender');
  };

  const handleSendEmail = async (targetEmail: string, customReport?: TroubleshootingReport) => {
    setIsSending(true);
    setErrorStatus(null);
    
    const reportToUse = customReport || selectedReport;
    const emailData = {
      service_id: import.meta.env.VITE_EMAILJS_SERVICE_ID,
      template_id: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      user_id: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
      template_params: {
        subject: subject.trim(),
        complainant_name: complainantName.trim(),
        complainant_email: targetEmail.trim(),
        to_email: targetEmail.trim(),
        problem: reportToUse.problem,
        description: reportToUse.description || 'No additional description provided.',
        possible_error: reportToUse.possibleError,
        suggested_solution: reportToUse.suggestedSolution,
        frequency: reportToUse.frequency,
        estimated_cost: reportToUse.estimatedCost || 'N/A',
      }
    };

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = `Server Error (${response.status})`;
        try {
          const errorJson = JSON.parse(responseText);
          errorMessage = errorJson.text || errorJson.message || errorMessage;
        } catch (e) {
          errorMessage = responseText.substring(0, 100) || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const historyItem: SentHistoryItem = {
        id: `send-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        recipient: targetEmail,
        complainantName: complainantName,
        problem: reportToUse.problem,
        status: 'success'
      };
      setSentHistory(prev => [historyItem, ...prev]);

      setIsSending(false);
      setIsSent(true);
      setTimeout(() => setIsSent(false), 3000);
    } catch (error: any) {
      console.error('Dispatch Error:', error);
      
      const historyItem: SentHistoryItem = {
        id: `send-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        recipient: targetEmail,
        complainantName: complainantName,
        problem: reportToUse.problem,
        status: 'error',
        error: error.message
      };
      setSentHistory(prev => [historyItem, ...prev]);

      setIsSending(false);
      setErrorStatus(error.message || 'Failed to send report. Please check your keys.');
      setTimeout(() => setErrorStatus(null), 10000);
    }
  };

  const handleAddReport = () => {
    const id = `custom-${Date.now()}`;
    const report: TroubleshootingReport = {
      id,
      problem: newReport.problem,
      description: newReport.description,
      possibleError: newReport.possibleError,
      suggestedSolution: newReport.suggestedSolution,
      frequency: newReport.frequency,
      estimatedCost: newReport.estimatedCost,
      icon: 'Zap'
    };
    
    setDynamicReports(prev => [...prev, report]);
    setSelectedReportId(id);

    if (newReport.sendImmediately && newReport.targetEmail) {
      setComplainantName(newReport.targetName || 'Valued Client');
      setComplainantEmail(newReport.targetEmail);
      handleSendEmail(newReport.targetEmail, report);
    }

    setIsModalOpen(false);
    setNewReport({
      problem: '',
      description: '',
      possibleError: '',
      suggestedSolution: '',
      frequency: '90%',
      estimatedCost: 'Free / Internal IT',
      sendImmediately: false,
      targetEmail: '',
      targetName: ''
    });
  };

  const IconMap: Record<string, any> = { MonitorOff, WifiOff, AppWindow, Zap };

  const renderDashboard = () => (
    <div className="animate-fade-in">
      <div className="content-header" style={{ marginBottom: '2rem' }}>
        <div className="title-group">
          <h1>System Performance Dashboard</h1>
          <p>Real-time analytics for Rising Tech communications.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-label">Total Reports Dispatched</div>
          <div className="stat-value">{sentHistory.length}</div>
        </div>
        <div className="card stat-card" style={{ borderLeftColor: '#10b981' }}>
          <div className="stat-label">Success Rate</div>
          <div className="stat-value">
            {sentHistory.length > 0 
              ? Math.round((sentHistory.filter(h => h.status === 'success').length / sentHistory.length) * 100) 
              : 0}%
          </div>
        </div>
        <div className="card stat-card" style={{ borderLeftColor: 'var(--accent-secondary)' }}>
          <div className="stat-label">Active Templates</div>
          <div className="stat-value">{dynamicReports.length}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h3>Recent Activity Overview</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Your last 5 transmissions are tracked here.</p>
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Complainant</th>
                <th>Problem</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sentHistory.slice(0, 5).map(item => (
                <tr key={item.id}>
                  <td>{item.complainantName}</td>
                  <td>{item.problem}</td>
                  <td>
                    <span className={`status-badge ${item.status === 'success' ? 'status-success' : 'status-error'}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
              {sentHistory.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No recent activity to display.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h3>Client Complaints Pipeline</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Direct submissions from public users awaiting processing.</p>
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Client Details</th>
                <th>Problem Description</th>
              </tr>
            </thead>
            <tbody>
              {clientComplaints.length > 0 ? clientComplaints.map(complaint => (
                <tr key={complaint.id}>
                  <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{complaint.timestamp}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{complaint.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>{complaint.email}</div>
                    {complaint.address && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loc: {complaint.address}</div>}
                  </td>
                  <td>{complaint.problem}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No pending client complaints.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="animate-fade-in">
      <div className="content-header" style={{ marginBottom: '2rem' }}>
        <div className="title-group">
          <h1>Reports History Log</h1>
          <p>Audit trail of all dispatched troubleshooting reports.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {sentHistory.length > 0 ? (
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Complainant</th>
                  <th>Email</th>
                  <th>Problem Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sentHistory.map((item) => (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{item.timestamp}</td>
                    <td style={{ fontWeight: '600' }}>{item.complainantName}</td>
                    <td>{item.recipient}</td>
                    <td>{item.problem}</td>
                    <td>
                      <span className={`status-badge ${item.status === 'success' ? 'status-success' : 'status-error'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <FileText size={48} className="empty-state-icon" />
            <h3>No reports sent yet</h3>
            <p>Go to the Email Sender tab to start helping clients.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="animate-fade-in">
      <div className="content-header" style={{ marginBottom: '2rem' }}>
        <div className="title-group">
          <h1>Configuration & Profile</h1>
          <p>Manage your connection and account credentials.</p>
        </div>
      </div>

      <div className="card">
        <h3>System Connectivity</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Connection status for EmailJS Service.</p>
        
        <div style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '40px', height: '40px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
            <CheckCircle size={22} style={{ color: '#10b981' }} />
          </div>
          <div>
            <div style={{ color: '#10b981', fontWeight: '600', fontSize: '1.1rem' }}>Active & Encrypted</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>All API credentials are securely managed in the environment configuration and hidden from the UI.</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSender = () => (
    <div className="animate-fade-in">
      <div className="content-header">
        <div className="title-group">
          <h1>Troubleshooting Hub</h1>
          <p>Generate and send professional technical reports in seconds.</p>
        </div>
        <div className="stats-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}><Clock size={16} /><span>Response: ~2m</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}><CheckCircle size={16} /><span>Status: Online</span></div>
        </div>
      </div>

      <section className="report-selector" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem' }}>Select Problem Type</h2>
          <button className="btn-primary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }} onClick={() => setIsModalOpen(true)}><Zap size={16} /> Add Custom Report</button>
        </div>
        <div className="report-grid">
          {dynamicReports.map((report) => {
            const IconComp = IconMap[report.icon] || Zap;
            return (
              <motion.div key={report.id} whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }} className={`report-option ${selectedReportId === report.id ? 'selected' : ''}`} onClick={() => setSelectedReportId(report.id)}>
                <div className="report-icon-box"><IconComp size={24} /></div>
                <div><h3 style={{ marginBottom: '0.25rem' }}>{report.problem}</h3><p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{report.frequency} resolution rate</p></div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <div className="editor-layout" style={{ marginTop: '2rem' }}>
        <div className="card animate-fade-in">
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Mail size={20} className="text-accent" /> Compose Email</h2>
          <div className="input-group">
            <label>Complainant Name <span style={{ color: '#f87171' }}>*</span></label>
            <input type="text" className="terminal-input" value={complainantName} onChange={(e) => setComplainantName(e.target.value)} placeholder="Enter full name" />
          </div>
          <div className="input-group">
            <label>Recipient Email Address</label>
            <input type="email" className="terminal-input" value={complainantEmail} onChange={(e) => setComplainantEmail(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Email Subject</label>
            <input type="text" className="terminal-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <button className="btn-primary" style={{ width: '100%', marginTop: '0.5rem', opacity: !complainantName ? 0.6 : 1 }} onClick={() => handleSendEmail(complainantEmail)} disabled={isSending || !complainantName}>
            {!complainantName ? 'Please Enter Name' : (isSending ? 'Sending...' : (isSent ? 'Sent Successfully!' : 'Send Troubleshooting Report'))}
          </button>
          {errorStatus && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#f87171', fontSize: '0.85rem', display: 'flex', gap: '10px', lineHeight: '1.4' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} /><span>{errorStatus}</span>
            </motion.div>
          )}
        </div>

        <div className="card animate-fade-in" style={{ padding: '0' }}>
          <div className="preview-pane">
            <div className="preview-header">
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Live Preview</span>
              <div style={{ fontSize: '0.85rem', color: '#1e293b', marginTop: '4px' }}><strong>To:</strong> {complainantEmail}</div>
            </div>
            <div className="preview-body">
              <p style={{ color: '#334155', marginBottom: '1.2rem' }}><strong>Technical Troubleshooting Report</strong><br/><span style={{ fontSize: '0.85rem', color: '#64748b' }}>Issued for: {complainantName || '...'}</span></p>
              <div className="report-box">
                <div className="report-field"><div className="field-label">Problem Status</div><div className="field-value" style={{ fontWeight: '600' }}>{selectedReport.problem}</div><div style={{ color: '#64748b', fontSize: '0.8rem' }}>{selectedReport.description}</div></div>
                <div className="report-field"><div className="field-label">Possible Error Mapping</div><div className="field-value">{selectedReport.possibleError}</div></div>
                <div className="report-field"><div className="field-label">Suggested Solution</div><div className="field-value" style={{ background: '#f1f5f9', padding: '10px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>{selectedReport.suggestedSolution}</div></div>
                <div className="report-field"><div className="field-label">Estimated Cost</div><div className="field-value" style={{ fontWeight: '600', color: '#10b981' }}>{selectedReport.estimatedCost || 'N/A'}</div></div>
                <div className="report-field" style={{ marginBottom: '0' }}><div className="field-label">Success Rate</div><div className="frequency-badge">{selectedReport.frequency}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'reports': return renderHistory();
      case 'settings': return renderSettings();
      default: return renderSender();
    }
  };

  const renderLandingPage = () => (
    <div className="landing-page">
      <div className="landing-nav">
        <div className="logo-section" onClick={() => setShowLogin(true)} style={{ marginBottom: 0, cursor: 'default' }}>
          <div className="logo-box">
            <Zap size={24} fill="currentColor" />
          </div>
          <div className="logo-text" style={{ color: 'white' }}>RISING TECH</div>
        </div>
        <button className="btn-primary" onClick={() => setShowLogin(true)} style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', display: 'none' }}>
          <Lock size={16} /> Support Portal Access
        </button>
      </div>

      <div className="hero-section">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="hero-content">
          <div className="badge-pill">
            <Sparkles size={16} /> Powered by Next-Gen AI
          </div>
          <h1>Rising Tech Innovation</h1>
          <h2>Automated Technical Support Solutions</h2>
          <p>
            Experience lightning-fast complaint resolution. Our AI-driven system instantly diagnoses technical faults, predicts estimated costs, and generates professional troubleshooting reports to fix your problems effortlessly.
          </p>
          <div className="hero-actions">
            <button className="btn-primary hero-btn" onClick={() => setShowLogin(true)} style={{ display: 'none' }}>
              Initialize Diagnostics <Zap size={18} />
            </button>
            <button className="nav-item hero-btn-secondary" style={{ padding: '1.2rem 2.5rem', background: 'rgba(255,255,255,0.05)', color: 'white', borderRadius: '14px', border: '1px solid var(--glass-border)' }} onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth'})}>
              Learn More
            </button>
          </div>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }} className="hero-visual">
          <div className="glass-card">
            <div className="mock-header">
               <div className="dot red"></div><div className="dot yellow"></div><div className="dot green"></div>
            </div>
            <div className="mock-body">
               <div className="mock-line" style={{ width: '60%' }}></div>
               <div className="mock-line"></div>
               <div className="mock-line" style={{ width: '80%' }}></div>
               <div className="mock-box">
                  <div className="ai-scanning">
                    <Bot size={32} className="text-accent" />
                    <span>AI Troubleshooting Sequence Initiated...</span>
                  </div>
               </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div id="features" className="features-section" style={{ padding: '6rem 4rem', background: 'linear-gradient(to bottom, transparent, rgba(59, 130, 246, 0.05))' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Intelligent Support Matrix</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>Rising Tech Innovations leverages cloud AI to reduce technical downtime from days to seconds.</p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="feature-card glass-card" style={{ padding: '2.5rem', transform: 'none' }}>
            <div className="report-icon-box" style={{ marginBottom: '1.5rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}><Bot size={28} /></div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>AI Root-Cause Diagnosis</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '0.95rem' }}>Simply input the complainant's symptoms, and our system maps it to the precise technical error, skipping hours of manual troubleshooting.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="feature-card glass-card" style={{ padding: '2.5rem', transform: 'none' }}>
            <div className="report-icon-box" style={{ marginBottom: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><CheckCircle size={28} /></div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Automated Cost Estimation</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '0.95rem' }}>Eliminate budget surprises. The model analyzes required parts and labor to provide instant out-of-pocket repair estimates before work even begins.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="feature-card glass-card" style={{ padding: '2.5rem', transform: 'none' }}>
            <div className="report-icon-box" style={{ marginBottom: '1.5rem', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}><Mail size={28} /></div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>1-Click Report Dispatch</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '0.95rem' }}>Generate a professional PDF-style email blueprint seamlessly connecting the user to exactly how to resolve the problem autonomously.</p>
          </motion.div>
        </div>
      </div>

      {/* Footer / Client Portal */}
      <footer id="complaint-form" style={{ padding: '6rem 4rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--glass-border)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem' }}>
          
          <div>
            <div className="logo-section" style={{ marginBottom: '1.5rem' }}>
              <div className="logo-box">
                <Zap size={24} fill="currentColor" />
              </div>
              <div className="logo-text" style={{ color: 'white' }}>RISING TECH</div>
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Client Support Portal</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '2rem' }}>
              Experiencing a technical issue? Submit your complaint below. Our Next-Gen AI system will immediately process your ticket, diagnose the root cause, and dispatch a professional troubleshooting report to your inbox.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <MapPin size={20} style={{ flexShrink: 0, marginTop: '2px' }} /> 
                <span style={{ fontSize: '0.95rem', lineHeight: '1.4' }}>Rising Tech Innovations HQ<br/>123 Silicon Boulevard, Tech District<br/>San Francisco, CA 94107</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Phone size={20} /> <span style={{ fontSize: '0.95rem' }}>+1 (800) 555-TECH</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Mail size={20} /> <span style={{ fontSize: '0.95rem' }}>support@risingtech.innovation</span>
              </div>
            </div>
          </div>

          <div className="card glass-card" style={{ padding: '2.5rem', transform: 'none' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>File a Technical Complaint</h3>
            {complaintSubmitted ? (
               <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                 <CheckCircle size={40} style={{ color: '#10b981', margin: '0 auto 1rem' }} />
                 <h4 style={{ color: '#10b981', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Complaint Received!</h4>
                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                   Our AI is analyzing your issue. You will receive an automated diagnostic report shortly.<br/>
                   <span style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '8px', display: 'block' }}>
                     (If you don't see it in your inbox, please check your spam folder)
                   </span>
                 </p>
               </div>
            ) : (
               <form onSubmit={(e) => {
                 e.preventDefault();
                 const newComplaint = {
                   id: `comp-${Date.now()}`,
                   timestamp: new Date().toLocaleString(),
                   ...clientForm
                 };
                 setClientComplaints(prev => [newComplaint, ...prev]);
                 setComplaintSubmitted(true);
                 setTimeout(() => setComplaintSubmitted(false), 6000);
                 setClientForm({ name: '', email: '', address: '', problem: '' });
               }}>
                 <div className="input-group">
                   <label>Full Name *</label>
                   <input type="text" className="terminal-input" required value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} placeholder="John Doe" />
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                   <div className="input-group">
                     <label>Email Address *</label>
                     <input type="email" className="terminal-input" required value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} placeholder="john@company.com" />
                   </div>
                   <div className="input-group">
                     <label>Address</label>
                     <input type="text" className="terminal-input" value={clientForm.address} onChange={e => setClientForm({...clientForm, address: e.target.value})} placeholder="Office / Dept" />
                   </div>
                 </div>
                 <div className="input-group">
                   <label>Problem Description *</label>
                   <textarea className="terminal-input" required value={clientForm.problem} onChange={e => setClientForm({...clientForm, problem: e.target.value})} placeholder="Describe exactly what is going wrong..." style={{ height: '100px' }}></textarea>
                 </div>
                 <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                   Submit Complaint
                 </button>
               </form>
            )}
          </div>

        </div>
      </footer>

      {showLogin && renderLogin()}
    </div>
  );

  const renderLogin = () => (
    <div className="modal-backdrop" style={{ background: 'rgba(5, 7, 10, 0.85)' }} onClick={(e) => { if (e.target === e.currentTarget) setShowLogin(false); }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '3rem', position: 'relative' }}>
        <button onClick={() => setShowLogin(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', padding: '5px' }}>✕</button>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div className="logo-box" style={{ margin: '0 auto 1.5rem', width: '60px', height: '60px' }}>
            <Zap size={32} fill="currentColor" />
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Terminal Access</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Rising Tech Innovation Hub</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={14} /> Username
            </label>
            <input 
              type="text" 
              className="terminal-input" 
              placeholder="operator id"
              value={loginForm.username}
              onChange={e => setLoginForm({...loginForm, username: e.target.value})}
              required
            />
          </div>
          <div className="input-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={14} /> Password
            </label>
            <input 
              type="password" 
              className="terminal-input" 
              placeholder="security key"
              value={loginForm.password}
              onChange={e => setLoginForm({...loginForm, password: e.target.value})}
              required
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
            Authenticate Access
          </button>

          <AnimatePresence>
            {authError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ 
                  marginTop: '1.5rem', 
                  padding: '1rem', 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  borderRadius: '12px',
                  color: '#f87171',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <AlertCircle size={16} />
                {authError}
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          SECURE PROTOCOL CLASSIFIED
        </p>
      </div>
    </div>
  );

  if (!isLoggedIn) {
    return renderLandingPage();
  }

  return (
    <div className="dashboard-container">
      {/* Modal Backdrop */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="modal-content card" style={{ maxWidth: '560px', width: '95%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Create Custom Report</h2>
                {/* AI Assist Toggle */}
                <div 
                  className="ai-mode-toggle"
                  onClick={() => setAiAssistEnabled(!aiAssistEnabled)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 14px', borderRadius: '20px', cursor: 'pointer',
                    background: aiAssistEnabled ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${aiAssistEnabled ? 'rgba(139, 92, 246, 0.4)' : 'var(--glass-border)'}`,
                    transition: 'all 0.3s ease',
                  }}
                >
                  {aiAssistEnabled ? <Bot size={16} style={{ color: '#a78bfa' }} /> : <PenLine size={16} style={{ color: 'var(--text-secondary)' }} />}
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: aiAssistEnabled ? '#a78bfa' : 'var(--text-secondary)' }}>
                    {aiAssistEnabled ? 'AI Assist' : 'Manual'}
                  </span>
                  <div style={{
                    width: '32px', height: '18px', borderRadius: '9px', padding: '2px',
                    background: aiAssistEnabled ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : 'rgba(255,255,255,0.1)',
                    transition: 'all 0.3s ease', position: 'relative'
                  }}>
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: '#fff', transition: 'all 0.3s ease',
                      transform: aiAssistEnabled ? 'translateX(14px)' : 'translateX(0)',
                    }} />
                  </div>
                </div>
              </div>

              {/* Problem Title - always visible */}
              <div className="input-group">
                <label>Problem Title <span style={{ color: '#f87171' }}>*</span></label>
                <input 
                  type="text" 
                  className="terminal-input" 
                  placeholder="e.g., Laptop overheating when gaming"
                  value={newReport.problem} 
                  onChange={e => setNewReport({...newReport, problem: e.target.value})} 
                />
              </div>

              {/* AI Generate Button - only when AI mode is on */}
              {aiAssistEnabled && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '1.5rem' }}>
                  <button
                    onClick={handleAiGenerate}
                    disabled={!newReport.problem.trim() || isAiGenerating}
                    style={{
                      width: '100%', padding: '12px 20px', borderRadius: '12px',
                      border: '1px dashed rgba(139, 92, 246, 0.4)',
                      background: isAiGenerating 
                        ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.15))'
                        : 'rgba(139, 92, 246, 0.05)',
                      color: !newReport.problem.trim() ? 'var(--text-muted)' : '#a78bfa',
                      cursor: !newReport.problem.trim() || isAiGenerating ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      fontWeight: 600, fontSize: '0.95rem', fontFamily: 'inherit',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={e => { if (newReport.problem.trim() && !isAiGenerating) { (e.target as HTMLElement).style.background = 'rgba(139, 92, 246, 0.12)'; (e.target as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.6)'; } }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(139, 92, 246, 0.05)'; (e.target as HTMLElement).style.borderColor = 'rgba(139, 92, 246, 0.4)'; }}
                  >
                    {isAiGenerating ? (
                      <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing problem...</>
                    ) : (
                      <><Sparkles size={18} /> Generate with AI</>
                    )}
                  </button>

                  {/* AI Error Message */}
                  <AnimatePresence>
                    {aiError && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{
                          marginTop: '10px', padding: '10px 14px', borderRadius: '10px',
                          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                          color: '#f87171', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                      >
                        <AlertCircle size={14} /> {aiError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!newReport.problem.trim() && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                      Type a problem title above, then click Generate
                    </p>
                  )}
                </motion.div>
              )}

              {/* Description */}
              <div className="input-group">
                <label>Problem Description {aiAssistEnabled && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(auto-filled by AI)</span>}</label>
                <textarea 
                  className="terminal-input" 
                  placeholder={aiAssistEnabled ? 'Will be generated by AI...' : 'Describe the problem in detail'}
                  value={newReport.description} 
                  onChange={e => setNewReport({...newReport, description: e.target.value})} 
                  style={isAiGenerating ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                />
              </div>

              {/* Possible Error */}
              <div className="input-group">
                <label>Possible Error {aiAssistEnabled && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(AI)</span>}</label>
                <input 
                  type="text" 
                  className="terminal-input" 
                  placeholder={aiAssistEnabled ? 'AI generated...' : 'e.g., Faulty RAM'}
                  value={newReport.possibleError} 
                  onChange={e => setNewReport({...newReport, possibleError: e.target.value})} 
                  style={isAiGenerating ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                />
              </div>

              {/* Frequency & Estimated Cost */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="input-group">
                  <label>Frequency</label>
                  <input 
                    type="text" 
                    className="terminal-input" 
                    value={newReport.frequency} 
                    onChange={e => setNewReport({...newReport, frequency: e.target.value})} 
                    style={isAiGenerating ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                  />
                </div>
                <div className="input-group">
                  <label>Estimated Cost {aiAssistEnabled && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(AI)</span>}</label>
                  <input 
                    type="text" 
                    className="terminal-input" 
                    placeholder={aiAssistEnabled ? 'AI generated...' : 'e.g., Free / $50'}
                    value={newReport.estimatedCost} 
                    onChange={e => setNewReport({...newReport, estimatedCost: e.target.value})} 
                    style={isAiGenerating ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                  />
                </div>
              </div>

              {/* Suggested Solution */}
              <div className="input-group">
                <label>Suggested Solution {aiAssistEnabled && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(AI)</span>}</label>
                <textarea 
                  className="terminal-input" 
                  placeholder={aiAssistEnabled ? 'Will be generated by AI...' : 'Provide step-by-step solution'}
                  value={newReport.suggestedSolution} 
                  onChange={e => setNewReport({...newReport, suggestedSolution: e.target.value})} 
                  style={isAiGenerating ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                />
              </div>

              {/* Send Immediately Checkbox */}
              <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', padding: '12px', borderRadius: '12px' }}>
                <input type="checkbox" id="sendImmediately" style={{ width: '18px', height: '18px' }} checked={newReport.sendImmediately} onChange={e => setNewReport({...newReport, sendImmediately: e.target.checked})} />
                <label htmlFor="sendImmediately" style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '0.95rem', cursor: 'pointer', fontWeight: '600' }}>Send report immediately to complainant</label>
              </div>
              {newReport.sendImmediately && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <div className="input-group"><label>Recipient Name</label><input type="text" className="terminal-input" value={newReport.targetName} onChange={e => setNewReport({...newReport, targetName: e.target.value})} /></div>
                  <div className="input-group"><label>Recipient Email</label><input type="email" className="terminal-input" value={newReport.targetEmail} onChange={e => setNewReport({...newReport, targetEmail: e.target.value})} /></div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={handleAddReport} disabled={!newReport.problem || (newReport.sendImmediately && !newReport.targetEmail)}>{newReport.sendImmediately ? 'Save & Send Email' : 'Save Report Template'}</button>
                <button className="nav-item" style={{ background: 'rgba(255,255,255,0.05)', border: 'none' }} onClick={() => { setIsModalOpen(false); setAiError(null); }}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <aside className="sidebar">
        <div className="logo-section"><div className="logo-box"><Zap size={24} fill="currentColor" /></div><div className="logo-text">RISING TECH</div></div>
        <nav className="nav-links">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><LayoutDashboard size={20} /> Dashboard</div>
          <div className={`nav-item ${activeTab === 'sender' ? 'active' : ''}`} onClick={() => setActiveTab('sender')}><Mail size={20} /> Email Sender</div>
          <div className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}><FileText size={20} /> Reports History</div>
          <div className="nav-item" onClick={() => setActiveTab('settings')}><Settings size={20} /> Settings</div>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <div className="nav-item" onClick={handleLogout} style={{ color: '#f87171' }}>
            <LogOut size={20} /> Logout
          </div>
          <div className="nav-item"><HelpCircle size={20} /> Support</div>
        </div>
      </aside>

      <main className="main-content">
        {renderContent()}
      </main>

      <AnimatePresence>{isSent && (<motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} style={{ position: 'fixed', bottom: '30px', right: '30px', background: '#10b981', color: 'white', padding: '1rem 2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 2000 }}><CheckCircle size={20} />Transmission complete!</motion.div>)}</AnimatePresence>
    </div>
  );
};

export default App;
