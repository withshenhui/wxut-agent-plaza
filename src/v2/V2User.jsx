import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUserInfo } from '../api/userAuth';
import { apiBase } from '../api/request';

const casEnabled = import.meta.env.VITE_CAS_ENABLED !== 'false';
const GUEST_KEY = 'v2_guest_mode';

/**
 * V2 用户上下文：与 V1 UserContext 同协议（user_token + CAS），
 * 差异两点：
 * 1. 游客模式——URL 带 ?guest 或 sessionStorage 标记时跳过强制 CAS，
 *    顶栏显示"游客"，可随时点击登录回到 CAS 流程；
 * 2. CAS 登录地址带 redirect=/v2 参数，登录后回跳用户实际输入的 /v2/ 前缀
 *    （后端 CasAuthController 已支持该参数透传）。
 */
const V2UserCtx = createContext(null);

export function V2UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    // URL ?guest 开启游客模式（本次会话有效）
    const hash = window.location.hash || '';
    const query = (hash.split('?')[1] || '') + '&' + (window.location.search ? window.location.search.slice(1) : '');
    if (new URLSearchParams(query).has('guest')) {
      try { sessionStorage.setItem(GUEST_KEY, '1'); } catch {}
    }
    let isGuest = false;
    try { isGuest = sessionStorage.getItem(GUEST_KEY) === '1'; } catch {}
    setGuest(isGuest);

    const isCasCallback = hash.includes('cas-callback');
    const isAdminPage = hash.includes('/admin');
    const token = localStorage.getItem('user_token');

    if (token) {
      getUserInfo()
        .then((info) => setUser(info))
        .catch(() => {
          localStorage.removeItem('user_token');
          if (casEnabled && !isCasCallback && !isAdminPage && !isGuest) casLogin();
          else setLoading(false);
        })
        .finally(() => setLoading(false));
    } else if (casEnabled && !isCasCallback && !isAdminPage && !isGuest) {
      casLogin();
    } else {
      setLoading(false);
    }
  }, []);

  const casLogin = async () => {
    try {
      // 带上当前入口路径（/v2），登录后原路返回
      const path = window.location.pathname.replace(/\/+$/, '');
      const redirectParam = path && path !== '/' ? `?redirect=${encodeURIComponent(path)}` : '';
      const res = await fetch(`${apiBase}/auth/cas-login-url${redirectParam}`);
      const json = await res.json();
      if (json.code === 200 && json.data) {
        const a = document.createElement('a');
        a.href = json.data;
        a.rel = 'noreferrer';
        a.click();
        return;
      }
    } catch {}
    window.location.href = `${apiBase}/auth/cas-login`;
  };

  const enterGuest = () => {
    try { sessionStorage.setItem(GUEST_KEY, '1'); } catch {}
    setGuest(true);
    setLoading(false);
  };

  const exitGuest = () => {
    try { sessionStorage.removeItem(GUEST_KEY); } catch {}
    setGuest(false);
    casLogin();
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
    window.location.href = `${window.location.origin}${window.location.pathname}`;
  };

  return (
    <V2UserCtx.Provider value={{ user, setUser, casLogin, logout, loading, guest, enterGuest, exitGuest }}>
      {children}
    </V2UserCtx.Provider>
  );
}

export function useV2User() {
  const ctx = useContext(V2UserCtx);
  if (!ctx) throw new Error('useV2User must be used within V2UserProvider');
  return ctx;
}
