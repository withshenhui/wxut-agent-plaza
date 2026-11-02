import { apiBase } from '../api/request';
import React from 'react';
import Sidebar from './Sidebar';
import { useSiteConfig } from './SiteConfigContext';
import { useUser } from '../UserContext';

function PageLayout({ children, title, onBack, isSidebarCollapsed, setIsSidebarCollapsed, activePath, footerText }) {
  const { siteFooter } = useSiteConfig();
  const { user, casLogin, logout } = useUser();

  return (
    <div className="el-layout">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        activePath={activePath}
      />
      <div className="el-main-container">
        <header className="el-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {onBack && (
              <button className="el-header-back" onClick={onBack}>
                ‹
              </button>
            )}
            <h1 className="el-header-title">{title}</h1>
          </div>
          <div className="el-header-right">
            <button
              className="el-header-dashboard-btn"
              onClick={() => window.open('./ai-dashboard-prototype.html', '_blank')}
              title="打开 AI 中台数据大屏（新窗口全屏展示）"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="13" rx="1.5" />
                <path d="M8 21h8M12 17v4" />
              </svg>
              数据大屏
            </button>
            {import.meta.env.VITE_CAS_ENABLED !== 'false' && (user ? (
              <div className="el-header-user">
                <div className="el-header-avatar">{user.nickname ? user.nickname[0] : '用'}</div>
                {user.role === 'admin' ? (
                  <a
                    href={`${apiBase}/sso/entry?app=plaza-admin`}
                    title="单点登录进入管理后台"
                    className="el-header-username"
                    style={{ color: '#1890ff', textDecoration: 'none' }}
                  >
                    {user.nickname || user.username}
                  </a>
                ) : (
                  <span className="el-header-username">{user.nickname || user.username}</span>
                )}
                <a href="#" onClick={(e) => { e.preventDefault(); logout(); }} style={{ marginLeft: 12, fontSize: 13, color: '#999' }}>退出</a>
              </div>
            ) : (
              <div className="el-header-user">
                <button
                  onClick={casLogin}
                  style={{
                    background: '#1890ff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 16px',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  统一身份认证登录
                </button>
              </div>
            ))}
          </div>
        </header>
        <div className="el-content">
          {children}
        </div>
        <footer className="el-footer">
          <p>{footerText || siteFooter}</p>
        </footer>
      </div>
    </div>
  );
}

export default PageLayout;
