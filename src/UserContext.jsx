import { createContext, useContext, useState, useEffect } from 'react';
import { getUserInfo } from './api/userAuth';

const apiBase = import.meta.env.PROD
  ? `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1`
  : '/api/v1';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('user_token');
    const hash = window.location.hash || '';
    const isCasCallback = hash.includes('cas-callback');
    const isAdminPage = hash.includes('/admin');

    if (token) {
      getUserInfo()
        .then((info) => setUser(info))
        .catch(() => {
          localStorage.removeItem('user_token');
          // token 无效，自动跳转 CAS 登录
          if (!isCasCallback && !isAdminPage) casLogin();
          else setLoading(false);
        })
        .finally(() => setLoading(false));
    } else if (!isCasCallback && !isAdminPage) {
      // 无 token 且不在回调页/管理后台，自动跳转 CAS 登录
      casLogin();
    } else {
      setLoading(false);
    }
  }, []);

  const casLogin = async () => {
    try {
      const res = await fetch(`${apiBase}/auth/cas-login-url`);
      const json = await res.json();
      if (json.code === 200 && json.data) {
        const a = document.createElement('a');
        a.href = json.data;
        a.rel = 'noreferrer';
        a.click();
        return;
      }
    } catch {}
    // fallback: 直接跳后端让 CAS 过滤器处理重定向
    window.location.href = `${apiBase}/auth/cas-login`;
  };

  const logout = async () => {
    localStorage.removeItem('user_token');
    setUser(null);
    try {
      const res = await fetch(`${apiBase}/auth/cas-logout-url`);
      const json = await res.json();
      if (json.code === 200 && json.data) {
        const serviceUrl = encodeURIComponent(window.location.origin + window.location.pathname);
        window.location.href = `${json.data}?service=${serviceUrl}`;
        return;
      }
    } catch {}
    // fallback: 刷新页面
    window.location.href = `${window.location.origin}${window.location.pathname}`;
  };

  return (
    <UserContext.Provider value={{ user, setUser, casLogin, logout, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
