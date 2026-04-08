import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdmin } from './AdminContext';

export default function AdminGuard({ children }) {
  const { user, loading } = useAdmin();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>加载中...</div>;
  if (!user) return <Navigate to="/admin/login" replace />;

  return children;
}
