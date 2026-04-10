import { createContext, useContext, useState, useEffect } from 'react';
import { getUserInfo } from './api/userAuth';

const apiBase = import.meta.env.PROD
  ? `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1`
  : '/api/v1';

const casEnabled = import.meta.env.VITE_CAS_ENABLED !== 'false';

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
          // token 无效，CAS 开启时自动跳转登录
          if (casEnabled && !isCasCallback && !isAdminPage) casLogin();
          else setLoading(false);
        })
        .finally(() => setLoading(false));
    } else if (casEnabled && !isCasCallback && !isAdminPage) {
      // CAS 开启：无 token 自动跳转登录
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
    if (!casEnabled) return;
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
