import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ChatPage from './ChatPage';
import UnderConstruction from './UnderConstruction';
import DigitalCampusPlanning from './DigitalCampusPlanning';
import AboutUs from './AboutUs';
import ModelManagement from './ModelManagement';
import OpenClaw from './OpenClaw';
import AgentPlazaPage from './AgentPlazaPage';
import DashboardHome from './DashboardHome';
import { SiteConfigProvider } from './components/SiteConfigContext';
import { AdminProvider } from './admin/AdminContext';
import AdminGuard from './admin/AdminGuard';
import AdminSsoCallback from './admin/AdminSsoCallback';
import AdminLayout from './admin/AdminLayout';
import LoginPage from './admin/pages/LoginPage';
import DashboardPage from './admin/pages/DashboardPage';
import AgentManagePage from './admin/pages/AgentManagePage';
import CategoryManagePage from './admin/pages/CategoryManagePage';
import ModelManagePage from './admin/pages/ModelManagePage';
import UserManagePage from './admin/pages/UserManagePage';
import ConfigManagePage from './admin/pages/ConfigManagePage';
import LlmConfigManagePage from './admin/pages/LlmConfigManagePage';
import XixiManagePage from './admin/pages/XixiManagePage';
import FileManagePage from './admin/pages/FileManagePage';
import LogManagePage from './admin/pages/LogManagePage';
import CasCallback from './CasCallback';
import DifyChatPage from './DifyChatPage';
import SqlBotPage from './SqlBotPage';
import CollegeQueryPage from './CollegeQueryPage';
import FormAgentPage from './form-agent/FormAgentPage';
import GuidePage from './GuidePage';
import { UserProvider, useUser } from './UserContext';

function AdminLoginRoute() {
  return (
    <AdminProvider>
      <LoginPage />
    </AdminProvider>
  );
}

function AdminRoute() {
  return (
    <AdminProvider>
      <AdminGuard>
        <AdminLayout />
      </AdminGuard>
    </AdminProvider>
  );
}

/** 普通用户只能访问广场类页面；受限路由直接访问时跳回广场 */
function UserRoute({ children }) {
  const { user, loading } = useUser();
  if (loading) return null;
  if (user && user.role !== 'admin') return <Navigate to="/plaza" replace />;
  return children;
}

function App() {
  return (
    <SiteConfigProvider>
    <Router>
      <UserProvider>
      <Routes>
        {/* 前台页面 */}
        <Route path="/" element={<DashboardHome />} />
        <Route path="/plaza" element={<AgentPlazaPage />} />
        <Route path="/cas-callback" element={<CasCallback />} />
        <Route path="/chat/:id" element={<ChatPage />} />
        <Route path="/campus-planning" element={<DigitalCampusPlanning />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/model-management" element={<UserRoute><ModelManagement /></UserRoute>} />
        <Route path="/openclaw" element={<OpenClaw />} />
        <Route path="/guide" element={<UnderConstruction pageType="campus" />} />
        <Route path="/manual" element={<GuidePage />} />
        <Route path="/dify-chat" element={<DifyChatPage />} />
        <Route path="/sql-bot" element={<SqlBotPage />} />
        <Route path="/college-query/:id" element={<CollegeQueryPage />} />
        <Route path="/form-agent" element={<UserRoute><FormAgentPage /></UserRoute>} />

        {/* 管理后台 */}
        <Route path="/admin/login" element={<AdminLoginRoute />} />
        <Route path="/admin/sso-callback" element={<AdminSsoCallback />} />
        <Route path="/admin" element={<AdminRoute />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="agents" element={<AgentManagePage />} />
          <Route path="categories" element={<CategoryManagePage />} />
          <Route path="models" element={<ModelManagePage />} />
          <Route path="users" element={<UserManagePage />} />
          <Route path="configs" element={<ConfigManagePage />} />
          <Route path="llm-config" element={<LlmConfigManagePage />} />
          <Route path="xixi" element={<XixiManagePage />} />
          <Route path="files" element={<FileManagePage />} />
          <Route path="logs" element={<LogManagePage />} />
        </Route>
      </Routes>
      </UserProvider>
    </Router>
    </SiteConfigProvider>
  );
}

export default App;
