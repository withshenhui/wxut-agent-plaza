import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './v2.css';
import V2App from './V2App.jsx';
import V2Admin from './V2Admin.jsx';
import V2Login from './V2Login.jsx';
import { ToastProvider } from './ui.jsx';
import { getUserInfo } from '../api/auth';
import { V2UserProvider } from './V2User.jsx';

/* CAS 回调：#/?token=xxx（与 V1 CasCallback 同协议，V2 风格呈现） */
function V2CasCallback() {
  const navigate = useNavigate();
  const [err, setErr] = useState(null);
  const { hash } = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const token = params.get('token');
    const error = params.get('error');
    if (error) { setErr(error); return; }
    if (token) {
      localStorage.setItem('user_token', token);
      getUserInfo().catch(() => localStorage.removeItem('user_token')).finally(() => navigate('/', { replace: true }));
    } else navigate('/', { replace: true });
  }, [hash, navigate]);
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F6FA' }}>
      {err ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#182234', marginTop: 12 }}>{err === 'user_disabled' ? '账号已禁用' : '认证失败'}</div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>{err === 'user_disabled' ? '您的账号已被管理员禁用，请联系管理员' : '统一身份认证未通过，请重试'}</div>
          <button className="v2-btn" style={{ marginTop: 20 }} onClick={() => { window.location.hash = '#/'; window.location.reload(); }}>返回首页</button>
        </div>
      ) : (
        <div style={{ color: '#94A3B8', fontSize: 13 }}>统一身份认证中…</div>
      )}
    </div>
  );
}

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
      <Route path="/*" element={user ? <V2App /> : <V2App />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <V2UserProvider>
        <ToastProvider>
          <V2Entry />
        </ToastProvider>
      </V2UserProvider>
    </HashRouter>
  </React.StrictMode>
);
