import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from './components/PageLayout';
import AgentIcon from './components/AgentIcon';
import { searchAgents, getCategories } from './api/agent';
import { useSiteConfig } from './components/SiteConfigContext';
import { useUser } from './UserContext';
import { launchAgent } from './utils/agentLaunch';

const staticTabs = [
  { key: 'all', label: '全部' },
];

/** 智能体广场：原首页的 Hero + 搜索 + 分类 + 卡片网格，整体迁移到这里 */
function AgentPlazaPage() {
  const [agents, setAgents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { siteName, siteSubtitle } = useSiteConfig();
  const { user } = useUser();
  const navigate = useNavigate();

  // 加载分类
  useEffect(() => {
    getCategories()
      .then((list) => setCategories(list || []))
      .catch(() => {});
  }, []);

  // 加载智能体数据
  useEffect(() => {
    setIsLoading(true);
    searchAgents({ keyword: searchTerm || undefined, size: 200 })
      .then((res) => {
        setAgents(res.records || []);
      })
      .catch(() => setAgents([]))
      .finally(() => setIsLoading(false));
  }, [searchTerm]);

  // 根据当前 tab 过滤
  const filteredAgents = activeTab === 'all'
    ? agents
    : agents.filter((a) => a.categoryKey === activeTab);

  return (
    <PageLayout
      title={siteName}
      isSidebarCollapsed={isSidebarCollapsed}
      setIsSidebarCollapsed={setIsSidebarCollapsed}
      activePath="/plaza"
      style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.5s ease' }}
    >
      {/* Hero Banner */}
      <div className="el-hero">
        <div className="el-hero__image">
          <img src="/plaza/avatar.png" alt="智能体广场" />
        </div>
        <div className="el-hero__content">
          <h1 className="el-hero__title">{siteSubtitle}</h1>
          <p className="el-hero__subtitle">
            我们提供多种专业AI助手服务，涵盖教学辅助、科研支持、校园服务等多个领域，助力智慧校园建设
          </p>
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div className="el-search-bar">
              <input
                type="text"
                placeholder="搜索智能体..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button>搜索</button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="el-tabs__pill">
        {[...staticTabs, ...categories.map((c) => ({ key: c.categoryKey, label: c.label }))].map((tab) => (
          <button
            key={tab.key}
            className={`el-tab-pill ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Agent Cards Grid */}
      <div className="el-grid el-grid--cards">
        {filteredAgents.map(agent => (
          <div
            key={agent.id}
            className="el-agent-card"
            onClick={() => launchAgent(navigate, agent.id, user)}
          >
            <div className="el-agent-card__header">
              <AgentIcon emoji={agent.icon} category={agent.categoryKey || 'other'} />
              <h3 className="el-agent-card__title">{agent.name}</h3>
            </div>
            <p className="el-agent-card__desc">{agent.description}</p>
            <div className="el-agent-card__footer">
              <div className="el-agent-card__tags">
                {agent.tags.map((tag, index) => (
                  <span key={index} className="el-tag el-tag--default">{tag}</span>
                ))}
              </div>
              {agent.visitCount != null && (
                <div className="el-agent-card__visit">
                  <svg viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor">
                    <path d="M512 192c-223.318 0-416.882 130.042-512 320 95.118 189.958 288.682 320 512 320 223.318 0 416.882-130.042 512-320-95.118-189.958-288.682-320-512-320zM764.45 361.406c52.196 31.994 96.478 73.614 129.548 122.594-33.070 48.98-77.352 90.6-129.548 122.594C700.648 650.254 609.49 680.676 512 680.676s-188.648-30.422-252.45-74.082c-52.196-31.994-96.478-73.614-129.548-122.594 33.070-48.98 77.352-90.6 129.548-122.594 10.538-6.46 21.418-12.474 32.598-18.030C274.476 370.98 290.26 404.6 314.5 432.5c31.436 36.184 74.744 60.5 122.5 68-20.25 20.75-32.5 49.064-32.5 80 0 64.616 52.384 117 117 117s117-52.384 117-117c0-30.936-12.25-59.25-32.5-80 47.756-7.5 91.064-31.816 122.5-68 24.24-27.9 40.024-61.52 45.352-98.124 11.18 5.556 22.060 11.57 32.598 18.030zM512 416c0 53.019-42.981 96-96 96s-96-42.981-96-96 42.981-96 96-96 96 42.981 96 96z" />
                  </svg>
                  <span>{agent.visitCount.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}

export default AgentPlazaPage;
