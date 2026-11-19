import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from './components/PageLayout';
import AgentIcon from './components/AgentIcon';
import { searchAgents, getCategories, getRecommendedAgents } from './api/agent';
import { searchModels } from './api/model';
import { useSiteConfig } from './components/SiteConfigContext';
import { useUser } from './UserContext';
import { launchAgent } from './utils/agentLaunch';
import './dashboard.css';

/* 仪表盘配色：在既有品牌色基础上做低饱和延展，保持 Linear 式的克制 */
const DONUT_COLORS = ['#4A6CF7', '#8B5CF6', '#0EA5E9', '#14B8A6', '#F59E0B', '#EC4899', '#94A3B8'];

const nf = (n) => (n == null ? '—' : Number(n).toLocaleString('zh-CN'));

/* ---------- 轻量图标（16px 线性，单色） ---------- */
const I = {
  agent: <><rect x="4" y="7" width="16" height="12" rx="3" /><path d="M12 3v4M9 13h.01M15 13h.01" /></>,
  model: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  category: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
  visit: <><path d="M3 12h4l3 8 4-16 3 8h4" /></>,
};

function Stat({ icon, label, value }) {
  return (
    <div className="dash-stat">
      <div className="dash-stat__top">
        <svg className="dash-stat__icon" viewBox="0 0 24 24" width="15" height="15" fill="none"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{I[icon]}</svg>
        <span className="dash-stat__label">{label}</span>
      </div>
      <div className="dash-stat__value">{value}</div>
    </div>
  );
}

function Panel({ title, meta, children, className = '' }) {
  return (
    <section className={`dash-panel ${className}`}>
      <header className="dash-panel__head">
        <h2 className="dash-panel__title">{title}</h2>
        {meta ? <span className="dash-panel__meta">{meta}</span> : null}
      </header>
      <div className="dash-panel__body">{children}</div>
    </section>
  );
}

/** 行式条形列表：排行 / 分布共用 */
function BarRow({ label, value, ratio, onClick, title }) {
  return (
    <li className={`dash-row ${onClick ? '' : 'dash-row--static'}`} onClick={onClick}>
      <span className="dash-row__label" title={title || label}>{label}</span>
      <span className="dash-row__bar">
        <span className="dash-row__fill" style={{ width: `${Math.max(5, ratio * 100)}%` }} />
      </span>
      <span className="dash-row__val">{value}</span>
    </li>
  );
}

function Donut({ items }) {
  const size = 148;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const total = items.reduce((s, i) => s + i.count, 0);
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="dash-donut">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {items.map((it, i) => {
          const frac = total ? it.count / total : 0;
          const dash = frac * circ;
          const el = (
            <circle
              key={it.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return el;
        })}
      </g>
      <text x="50%" y="47%" textAnchor="middle" className="dash-donut__num">{total}</text>
      <text x="50%" y="62%" textAnchor="middle" className="dash-donut__cap">个智能体</text>
    </svg>
  );
}

function DashboardHome() {
  const navigate = useNavigate();
  const { siteName, siteSubtitle } = useSiteConfig();
  const { user } = useUser();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [agents, setAgents] = useState([]);
  const [agentTotal, setAgentTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [modelTotal, setModelTotal] = useState(0);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      searchAgents({ size: 500 }),
      getCategories(),
      searchModels({ size: 200 }),
      getRecommendedAgents(),
    ]).then(([a, c, m, rec]) => {
      if (!alive) return;
      if (a.status === 'fulfilled') {
        const list = a.value?.records || [];
        setAgents(list);
        setAgentTotal(a.value?.total ?? list.length);
      }
      if (c.status === 'fulfilled') setCategories(c.value || []);
      if (m.status === 'fulfilled') {
        const list = m.value?.records || [];
        setModels(list);
        setModelTotal(m.value?.total ?? list.length);
      }
      if (rec.status === 'fulfilled') setRecommended((rec.value || []).slice(0, 8));
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const totalVisits = useMemo(
    () => agents.reduce((s, a) => s + (a.visitCount || 0), 0),
    [agents],
  );

  const topAgents = useMemo(
    () => [...agents].sort((x, y) => (y.visitCount || 0) - (x.visitCount || 0)).slice(0, 8),
    [agents],
  );
  const maxVisit = topAgents.length ? (topAgents[0].visitCount || 1) : 1;

  const catStats = useMemo(() => {
    const counts = new Map();
    agents.forEach((a) => {
      const k = a.categoryKey || 'other';
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return categories
      .map((c, i) => ({ key: c.categoryKey, label: c.label, count: counts.get(c.categoryKey) || 0, color: DONUT_COLORS[i % DONUT_COLORS.length] }))
      .sort((a, b) => b.count - a.count);
  }, [agents, categories]);

  const providers = useMemo(() => {
    const m = new Map();
    models.forEach((x) => {
      const p = x.provider || '未标注';
      m.set(p, (m.get(p) || 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [models]);

  const updatedAt = useMemo(
    () => new Date().toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    [],
  );

  const statItems = [
    { icon: 'agent', label: '在架智能体', value: loading ? '—' : nf(agentTotal) },
    { icon: 'model', label: '接入大模型', value: loading ? '—' : nf(modelTotal) },
    { icon: 'category', label: '服务分类', value: loading ? '—' : nf(categories.length) },
    { icon: 'visit', label: '累计访问量', value: loading ? '—' : nf(totalVisits) },
  ];

  return (
    <PageLayout
      title={siteName}
      isSidebarCollapsed={isSidebarCollapsed}
      setIsSidebarCollapsed={setIsSidebarCollapsed}
      activePath="/"
    >
      <div className="dash">
        {/* 页头 */}
        <header className="dash-head">
          <div className="dash-head__left">
            <h1 className="dash-head__title">{siteSubtitle || siteName}</h1>
            <p className="dash-head__sub">无锡职业技术大学 · AI 中台运行概览</p>
          </div>
          <div className="dash-head__right">
            <span className="dash-head__stamp">数据更新于 {updatedAt}</span>
            <button className="dash-btn" onClick={() => navigate('/plaza')}>
              进入智能体广场
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
        </header>

        {/* 指标卡 */}
        <div className="dash-stats">
          {statItems.map((s) => <Stat key={s.label} {...s} />)}
        </div>

        {/* 两列主体 */}
        <div className="dash-cols">
          {/* 左主栏 */}
          <div className="dash-colL">
            <Panel title="智能体访问排行" meta={`Top ${topAgents.length}`}>
              <ul className="dash-rows">
                {topAgents.map((a) => (
                  <BarRow
                    key={a.id}
                    label={a.name}
                    title={a.name}
                    value={nf(a.visitCount)}
                    ratio={(a.visitCount || 0) / maxVisit}
                    onClick={(e) => { e.currentTarget.classList.add('is-clicked'); launchAgent(navigate, a.id, user); }}
                  />
                ))}
                {!topAgents.length && <li className="dash-empty">{loading ? '加载中…' : '暂无数据'}</li>}
              </ul>
            </Panel>

            <Panel title="大模型一览" meta={`共 ${modelTotal} 个`}>
              <div className="dash-chips">
                {providers.map(([p, n]) => (
                  <span key={p} className="dash-chip">{p}<b>{n}</b></span>
                ))}
              </div>
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>模型</th>
                    <th>供应商</th>
                    <th>类别</th>
                    <th className="dash-table__r">发布时间</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="dash-model">
                          <span className="dash-model__badge">{(m.name || '?').trim()[0]}</span>
                          <span className="dash-model__name">{m.name}</span>
                          {m.type ? <span className="dash-tag">{m.type}</span> : null}
                        </div>
                      </td>
                      <td className="dash-muted">{m.provider || '—'}</td>
                      <td><span className="dash-tag dash-tag--soft">{m.category || 'general'}</span></td>
                      <td className="dash-table__r dash-muted">{m.releaseDate || '—'}</td>
                    </tr>
                  ))}
                  {!models.length && (
                    <tr><td colSpan={4} className="dash-empty">{loading ? '加载中…' : '暂无数据'}</td></tr>
                  )}
                </tbody>
              </table>
            </Panel>
          </div>

          {/* 右侧栏 */}
          <div className="dash-colR">
            <Panel title="分类分布" meta={`${categories.length} 类`}>
              <div className="dash-donut-wrap">
                <Donut items={catStats} />
                <ul className="dash-legend">
                  {catStats.map((c) => (
                    <li key={c.key} className="dash-legend__row">
                      <span className="dash-dot" style={{ background: c.color }} />
                      <span className="dash-legend__label" title={c.label}>{c.label}</span>
                      <span className="dash-legend__val">{c.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>

            <Panel title="推荐智能体" meta={`${recommended.length} 个`}>
              <ul className="dash-reco">
                {recommended.map((a) => (
                  <li key={a.id} className="dash-reco__row" onClick={() => launchAgent(navigate, a.id, user)}>
                    <AgentIcon emoji={a.icon} category={a.categoryKey || 'other'} size={18} />
                    <div className="dash-reco__text">
                      <span className="dash-reco__name">{a.name}</span>
                      <span className="dash-reco__desc">{a.description}</span>
                    </div>
                  </li>
                ))}
                {!recommended.length && <li className="dash-empty">{loading ? '加载中…' : '暂无推荐'}</li>}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default DashboardHome;
