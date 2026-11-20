import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './v2.css';
import V2App from './V2App.jsx';
import V2Admin from './V2Admin.jsx';
import V2Login from './V2Login.jsx';
import { ToastProvider } from './ui.jsx';
import { getUserInfo } from '../api/auth';

function V2Entry() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { setChecking(false); return; }
    getUserInfo()
      .then((u) => setUser(u))
      .catch(() => { localStorage.removeItem('admin_token'); })
      .finally(() => setChecking(false));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    setUser(null);
    navigate('/');
  }, [navigate]);

  if (checking) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F5F6FA', color: '#94A3B8', fontSize: 13 }}>加载中…</div>;

  return (
    <Routes>
      <Route path="/admin/login" element={<V2Login onLoginOk={(u) => { setUser(u); navigate('/admin/dashboard'); }} />} />
      <Route path="/admin/*" element={user ? <V2Admin user={user} onLogout={logout} /> : <Navigate to="/admin/login" replace />} />
      <Route path="/*" element={<V2App user={user} onLogin={() => navigate('/admin/login')} />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ToastProvider>
        <V2Entry />
      </ToastProvider>
    </HashRouter>
  </React.StrictMode>
);
