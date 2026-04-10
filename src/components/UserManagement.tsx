import React, { useState, useEffect } from 'react';
import { User, Shield, Trash2, UserPlus, RefreshCw, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface AppUser {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  role: 'admin' | 'user';
  category: string;
  is_active: boolean;
  created_at: string;
}

interface UserManagementProps {
  currentUserId: string;
  onChat?: (userId: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUserId, onChat }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role: 'user' as 'admin' | 'user',
    category: 'Staff'
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      setError('Failed to fetch users');
    } else {
      setUsers(data as AppUser[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newUser.username || !newUser.password || !newUser.full_name) {
      setError('Please fill all required fields');
      return;
    }

    const { error: insertError } = await supabase
      .from('app_users')
      .insert([{
        username: newUser.username,
        password: newUser.password,
        full_name: newUser.full_name,
        email: newUser.email || null,
        role: newUser.role,
        category: newUser.category
      }]);

    if (insertError) {
      setError(insertError.message.includes('unique') ? 'Username already exists' : 'Failed to create user');
    } else {
      setSuccess('User created successfully');
      setNewUser({ username: '', password: '', full_name: '', email: '', role: 'user', category: 'Staff' });
      setIsAdding(false);
      fetchUsers();
    }
  };

  const deleteUser = async (id: string, username: string) => {
    if (id === currentUserId) {
      setError('Cannot delete your own account while logged in');
      return;
    }

    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;

    const { error: deleteError } = await supabase
      .from('app_users')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError('Failed to delete user');
    } else {
      setSuccess('User deleted');
      fetchUsers();
    }
  };

  return (
    <div className="animate-fade-in user-management">
      <div className="content-header">
        <div className="title-group">
          <h1>User Management</h1>
          <p>Admin only: Manage staff access and roles.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsAdding(true)}>
          <UserPlus size={16} /> Add New User
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card"
            style={{ marginBottom: '1.5rem', overflow: 'hidden' }}
          >
            <h3 style={{ marginBottom: '1rem' }}>Create New Account</h3>
            <form onSubmit={handleAddUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label>Username *</label>
                <input 
                  type="text" 
                  className="terminal-input" 
                  value={newUser.username}
                  onChange={e => setNewUser({...newUser, username: e.target.value})}
                  placeholder="e.g. staff_01"
                  required
                />
              </div>
              <div className="input-group">
                <label>Password *</label>
                <input 
                  type="password" 
                  className="terminal-input" 
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  placeholder="Secret key"
                  required
                />
              </div>
              <div className="input-group">
                <label>Full Name *</label>
                <input 
                  type="text" 
                  className="terminal-input" 
                  value={newUser.full_name}
                  onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="input-group">
                <label>Email (Optional)</label>
                <input 
                  type="email" 
                  className="terminal-input" 
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  placeholder="john@risingtech.com"
                />
              </div>
              <div className="input-group">
                <label>System Role</label>
                <select 
                  className="terminal-input"
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                >
                  <option value="user">Standard User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div className="input-group">
                <label>Category (Visibility Group)</label>
                <select 
                  className="terminal-input"
                  value={newUser.category}
                  onChange={e => setNewUser({...newUser, category: e.target.value})}
                >
                  <option value="Staff">Staff (Internal)</option>
                  <option value="Client">Client (External)</option>
                  <option value="Guest">Guest</option>
                  <option value="Private">Private (Hidden)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', paddingBottom: '1.25rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Save User</button>
                <button type="button" className="nav-item" onClick={() => setIsAdding(false)}>Cancel</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {(error || success) && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          style={{ 
            marginBottom: '1rem', 
            padding: '1rem', 
            borderRadius: '12px',
            background: error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            border: `1px solid ${error ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
            color: error ? '#f87171' : '#10b981',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem'
          }}
        >
          {error ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {error || success}
          <div style={{ flex: 1 }} />
          <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => { setError(null); setSuccess(null); }}>✕</button>
        </motion.div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            <p>Loading database...</p>
          </div>
        ) : users.length > 0 ? (
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role / Group</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: user.role === 'admin' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                          display: 'grid',
                          placeItems: 'center',
                          color: user.role === 'admin' ? '#a78bfa' : '#60a5fa'
                        }}>
                          {user.role === 'admin' ? <Shield size={16} /> : <User size={16} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{user.full_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className={`status-badge ${user.role === 'admin' ? 'status-success' : 'status-pending'}`} style={{ 
                          background: user.role === 'admin' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                          color: user.role === 'admin' ? '#a78bfa' : '#60a5fa',
                          borderColor: user.role === 'admin' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                          fontSize: '0.65rem'
                        }}>
                          {user.role.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{user.category}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          className="action-btn" 
                          onClick={() => onChat?.(user.id)}
                          style={{ color: 'var(--accent-primary)', opacity: 0.8 }}
                          title="Chat with user"
                        >
                          <MessageSquare size={16} />
                        </button>
                        <button 
                          className="action-btn delete" 
                          disabled={user.id === currentUserId}
                          onClick={() => deleteUser(user.id, user.username)}
                          style={{ opacity: user.id === currentUserId ? 0.2 : 0.5 }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <User size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
            <p>No managed users found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
