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
            {user ? (
              <div className="el-header-user">
                <div className="el-header-avatar">{user.nickname ? user.nickname[0] : '用'}</div>
                <span className="el-header-username">{user.nickname || user.username}</span>
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
            )}
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
