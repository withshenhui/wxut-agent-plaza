import React from 'react';
import Sidebar from './Sidebar';
import { useSiteConfig } from './SiteConfigContext';

function PageLayout({ children, title, onBack, isSidebarCollapsed, setIsSidebarCollapsed, activePath, footerText }) {
  const { siteFooter } = useSiteConfig();
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
            <div className="el-header-user">
              <div className="el-header-avatar">管</div>
              <span className="el-header-username">管理员</span>
            </div>
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
