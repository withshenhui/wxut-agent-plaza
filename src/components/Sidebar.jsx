import React from 'react';
import { Link } from 'react-router-dom';

// SVG Icons - Line style matching the reference dashboard design
const icons = {
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  apps: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  ai: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
      <path d="M16 14H8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z"/>
      <circle cx="9" cy="7" r="0.5" fill="currentColor"/><circle cx="15" cy="7" r="0.5" fill="currentColor"/>
    </svg>
  ),
  knowledge: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      <line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  ),
  data: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  model: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M12 1v4"/><path d="M12 19v4"/><path d="M4.22 4.22l2.83 2.83"/><path d="M16.95 16.95l2.83 2.83"/><path d="M1 12h4"/><path d="M19 12h4"/><path d="M4.22 19.78l2.83-2.83"/><path d="M16.95 7.05l2.83-2.83"/>
    </svg>
  ),
  cloud: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>
  ),
  search: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  guide: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  book: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  claw: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
};

const menuItems = [
  { path: '/', icon: 'home', label: '首页' },
  { external: true, url: '#', icon: 'apps', label: '应用广场' },
  { external: true, url: 'http://210.28.144.91/apps', icon: 'ai', label: 'AI中台' },
  { external: true, url: '#', icon: 'knowledge', label: '知识库中心' },
  { external: true, url: 'http://210.28.144.91:12345/dolphinscheduler/ui', icon: 'data', label: '数据中台' },
  { path: '/model-management', icon: 'model', label: '模型服务' },
  { external: true, url: '#', icon: 'cloud', label: '统一云管中台' },
  { external: true, url: '#', icon: 'search', label: '智能问数' },
  { external: true, url: '#', icon: 'guide', label: '操作指南' },
  { path: '/campus-planning', icon: 'book', label: 'AI科普' },

  { path: '/about', icon: 'info', label: '关于我们' },
];

function Sidebar({ isCollapsed, onToggle, activePath }) {
  return (
    <aside className={`el-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="el-sidebar-inner">
        <div className="el-sidebar-logo">
          {!isCollapsed ? (
            <>
              <img
                src="http://210.28.145.186:3001/plaza/logo3.png"
                alt="锡职大"
              />
              <span className="el-sidebar-logo-text">AI校园</span>
            </>
          ) : (
            <img
              src="http://210.28.145.186:3001/plaza/logo3.png"
              alt="锡职大"
              style={{ height: '32px' }}
            />
          )}
        </div>
        <nav>
          <ul className="el-menu">
            {menuItems.map((item, i) => {
              const isActive = item.path === activePath;
              const linkContent = (
                <>
                  <span className="el-menu-item-icon">{icons[item.icon]}</span>
                  {!isCollapsed && <span className="el-menu-item-text">{item.label}</span>}
                </>
              );
              if (item.external) {
                return (
                  <li key={i}>
                    <a
                      href={item.url}
                      target={item.url.startsWith('http') ? '_blank' : undefined}
                      rel={item.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className={`el-menu-item ${isActive ? 'active' : ''}`}
                    >
                      {linkContent}
                    </a>
                  </li>
                );
              }
              return (
                <li key={i}>
                  <Link
                    to={item.path}
                    className={`el-menu-item ${isActive ? 'active' : ''}`}
                  >
                    {linkContent}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="el-sidebar-toggle">
          <button onClick={onToggle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isCollapsed ? (
                <>
                  <polyline points="9 18 15 12 9 6"/>
                </>
              ) : (
                <>
                  <polyline points="15 18 9 12 15 6"/>
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
