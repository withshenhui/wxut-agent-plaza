import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, getUserInfo } from '../api/auth';

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      getUserInfo()
        .then((info) => setUser(info))
        .catch(() => localStorage.removeItem('admin_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await apiLogin(username, password);
    localStorage.setItem('admin_token', res.token);
    setUser(res.userInfo);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setUser(null);
    window.location.hash = '#/admin/login';
  };

  return (
    <AdminContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
