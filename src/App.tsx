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
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { reports, type TroubleshootingReport } from './data/reports';

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
      // PRO-TIP: We use the EmailJS REST API directly to bypass all proxy/404 issues.
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

      setIsSending(false);
      setIsSent(true);
      setTimeout(() => setIsSent(false), 3000);
    } catch (error: any) {
      console.error('Dispatch Error:', error);
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
          <div className="nav-item"><Settings size={20} /> Settings</div>
        </nav>
        <div style={{ marginTop: 'auto' }} className="nav-item"><HelpCircle size={20} /> Support</div>
      </aside>

      <main className="main-content">
        <div className="content-header">
          <div className="title-group"><h1>Troubleshooting Hub</h1><p>Generate and send professional technical reports in seconds.</p></div>
          <div className="stats-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}><Clock size={16} /><span>Response: ~2m</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}><CheckCircle size={16} /><span>Status: Online</span></div>
          </div>
        </div>

        <section className="report-selector">
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

        <div className="editor-layout">
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
      </main>

      <AnimatePresence>{isSent && (<motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} style={{ position: 'fixed', bottom: '30px', right: '30px', background: '#10b981', color: 'white', padding: '1rem 2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 2000 }}><CheckCircle size={20} />Transmission complete!</motion.div>)}</AnimatePresence>
    </div>
  );
};

export default App;
