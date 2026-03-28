import React, { useState } from 'react';
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
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { reports, type TroubleshootingReport } from './data/reports';

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
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newReport, setNewReport] = useState({
    problem: '',
    description: '',
    possibleError: '',
    suggestedSolution: '',
    frequency: '90%',
    sendImmediately: false,
    targetEmail: '',
    targetName: ''
  });

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

  const renderLogin = () => (
    <div className="modal-backdrop" style={{ background: 'var(--bg-primary)', display: 'grid', placeItems: 'center' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '3rem' }}>
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
    return renderLogin();
  }

  return (
    <div className="dashboard-container">
      {/* Modal Backdrop */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="modal-content card" style={{ maxWidth: '500px', width: '95%' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Create Custom Troubleshooting Report</h2>
              <div className="input-group">
                <label>Problem Title</label>
                <input type="text" className="terminal-input" value={newReport.problem} onChange={e => setNewReport({...newReport, problem: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Problem Description</label>
                <textarea className="terminal-input" value={newReport.description} onChange={e => setNewReport({...newReport, description: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="input-group">
                  <label>Possible Error</label>
                  <input type="text" className="terminal-input" value={newReport.possibleError} onChange={e => setNewReport({...newReport, possibleError: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Frequency</label>
                  <input type="text" className="terminal-input" value={newReport.frequency} onChange={e => setNewReport({...newReport, frequency: e.target.value})} />
                </div>
              </div>
              <div className="input-group">
                <label>Suggested Solution</label>
                <textarea className="terminal-input" value={newReport.suggestedSolution} onChange={e => setNewReport({...newReport, suggestedSolution: e.target.value})} />
              </div>
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
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={handleAddReport} disabled={!newReport.problem || (newReport.sendImmediately && !newReport.targetEmail)}>{newReport.sendImmediately ? 'Save & Send Email' : 'Save Report Template'}</button>
                <button className="nav-item" style={{ background: 'rgba(255,255,255,0.05)', border: 'none' }} onClick={() => setIsModalOpen(false)}>Cancel</button>
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
