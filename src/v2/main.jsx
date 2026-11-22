import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './v2.css';
import V2App from './V2App.jsx';
import V2Admin from './V2Admin.jsx';
import V2Login from './V2Login.jsx';
import { ToastProvider } from './ui.jsx';
import { getUserInfo as getAdminInfo } from '../api/auth';
import { getUserInfo as getUserInfoForUser } from '../api/userAuth';
import { V2UserProvider, useV2User } from './V2User.jsx';

/* CAS 回调：#/cas-callback?token=xxx（与 V1 CasCallback 同协议，V2 风格呈现）
 * 注意：token 解析必须用 window.location.hash（V1 同款）——HashRouter 的
 * useLocation().hash 是二级锚点恒为空，query 在 search 里，用错会永远拿不到 token */
function V2CasCallback() {
  const navigate = useNavigate();
  const { refreshUser } = useV2User();
  const [err, setErr] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const token = params.get('token');
    const error = params.get('error');
    if (error) { setErr(error); return; }
    if (token) {
      localStorage.setItem('user_token', token);
      getUserInfoForUser()
        .catch(() => localStorage.removeItem('user_token'))
        .finally(() => { refreshUser(); navigate('/', { replace: true }); });
    } else navigate('/', { replace: true });
  }, [navigate, refreshUser]);
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
    getAdminInfo()
      .then((u) => setUser(u))
      .catch(() => { localStorage.removeItem('admin_token'); })
      .finally(() => setChecking(false));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    setUser(null);
    navigate('/admin/login');
  }, [navigate]);

  if (checking) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F5F6FA', color: '#94A3B8', fontSize: 13 }}>加载中…</div>;

  return (
    <Routes>
      <Route path="/admin/login" element={<V2Login onLoginOk={(u) => { setUser(u); navigate('/admin/dashboard'); }} />} />
      <Route path="/admin/*" element={user ? <V2Admin user={user} onLogout={logout} /> : <Navigate to="/admin/login" replace />} />
      <Route path="/cas-callback" element={<V2CasCallback />} />
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
