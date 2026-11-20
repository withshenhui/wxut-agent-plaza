import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageLayout from './components/PageLayout';
import AgentIcon from './components/AgentIcon';
import { searchAgents, getCategories, getRecommendedAgents } from './api/agent';
import { searchModels } from './api/model';
import { apiBase } from './api/request';
import { useUser } from './UserContext';
import { launchAgent } from './utils/agentLaunch';
import logoDeepseek from './assets/model-logos/deepseek.svg';
import logoQwen from './assets/model-logos/qwen.svg';
import './dashboard.css';

/* 环形图配色：主蓝起，配以模板的绿/琥珀/橙，保持同一套色系 */
const DONUT_COLORS = ['#3B82F6', '#60A5FA', '#F97316', '#10B981', '#F59E0B', '#8B5CF6', '#94A3B8'];

/* 模型品牌 logo：按模型名匹配（simple-icons 官方图标）
   deepseek 系（含库里拼写为 deepeek 的震泽模型）统一用 DeepSeek 官方 logo；
   其余模型不使用品牌 logo，回落首字母头像 */
const brandOf = (name) => {
  const n = (name || '').toLowerCase();
  if (/deepeek|deep[- ]?seek/.test(n)) return { src: logoDeepseek, tint: 'deepseek' };
  if (/qwen/.test(n)) return { src: logoQwen, tint: 'qwen' };
  return null;
};

/* 供应商彩点 / 首字母头像配色：按索引、按名称哈希取 —— 稳定、不随机 */
const PROVIDER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#F97316', '#8B5CF6', '#EC4899'];
const AVA_COLORS = [
  { bg: 'rgba(59,130,246,.12)', fg: '#2563EB' },
  { bg: 'rgba(16,185,129,.12)', fg: '#059669' },
  { bg: 'rgba(245,158,11,.14)', fg: '#B45309' },
  { bg: 'rgba(249,115,22,.12)', fg: '#C2410C' },
  { bg: 'rgba(139,92,246,.12)', fg: '#6D28D9' },
  { bg: 'rgba(236,72,153,.12)', fg: '#BE185D' },
];
const avaColorOf = (name) => {
  let h = 0;
  const s = name || '';
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return AVA_COLORS[h % AVA_COLORS.length];
};

const nf = (n) => (n == null ? '—' : Number(n).toLocaleString('zh-CN'));

/* 平台概况卡片图标（16px 线性） */
const M_ICONS = {
  agent: <><rect x="4" y="7" width="16" height="12" rx="3" /><path d="M12 3v4M9 13h.01M15 13h.01" /></>,
  model: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  category: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
  visit: <><path d="M3 12h4l3 8 4-16 3 8h4" /></>,
};

function DashboardHome() {
  const navigate = useNavigate();
  const { user } = useUser();
  const isAdmin = user?.role === 'admin';

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [agents, setAgents] = useState([]);
  const [agentTotal, setAgentTotal] = useState(null);
  const [categories, setCategories] = useState(null);
  const [models, setModels] = useState([]);
  const [modelTotal, setModelTotal] = useState(null);
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
      // 智能填报暂时下线（2026-11-20）：推荐列表里同名智能体一并隐藏，恢复时移除该过滤
      if (rec.status === 'fulfilled') {
        setRecommended((rec.value || []).filter((a) => a.name !== '智能填报').slice(0, 10));
      }
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const totalVisits = useMemo(
    () => agents.reduce((s, a) => s + (a.visitCount || 0), 0),
    [agents],
  );

  const topAgents = useMemo(
    () => [...agents].sort((x, y) => (y.visitCount || 0) - (x.visitCount || 0)).slice(0, 10),
    [agents],
  );
  const maxVisit = topAgents.length ? (topAgents[0].visitCount || 1) : 1;
  const catStats = useMemo(() => {
    const agg = new Map();
    agents.forEach((a) => {
      const k = a.categoryKey || 'other';
      const cur = agg.get(k) || { count: 0, visits: 0 };
      cur.count += 1;
      cur.visits += a.visitCount || 0;
      agg.set(k, cur);
    });
    return (categories || [])
      .map((c, i) => ({
        key: c.categoryKey,
        label: c.label,
        ...(agg.get(c.categoryKey) || { count: 0, visits: 0 }),
        color: DONUT_COLORS[i % DONUT_COLORS.length],
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [agents, categories]);
  const topCatByVisit = useMemo(
    () => [...catStats].sort((a, b) => b.visits - a.visits)[0],
    [catStats],
  );

  const providers = useMemo(() => {
    const m = new Map();
    models.forEach((x) => {
      const p = x.provider || '未标注';
      m.set(p, (m.get(p) || 0) + 1);
    });
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], i) => ({ name, count, color: PROVIDER_COLORS[i % PROVIDER_COLORS.length] }));
  }, [models]);
  const providerColor = useMemo(() => {
    const m = new Map();
    providers.forEach((p) => m.set(p.name, p.color));
    return m;
  }, [providers]);

  const top1Share = useMemo(() => {
    if (!agents.length || !totalVisits) return null;
    const top = Math.max(...agents.map((a) => a.visitCount || 0));
    return Math.round((top / totalVisits) * 100);
  }, [agents, totalVisits]);

  const metrics = [
    { name: '在架智能体', count: agentTotal, hint: catStats.length ? `${catStats.length} 个分类` : '', link: '/plaza', tone: 'primary', ico: 'agent' },
    { name: '接入大模型', count: modelTotal, hint: providers.length ? `${providers.length} 家供应商` : '', link: '/model-management', tone: 'violet', ico: 'model' },
    { name: '服务分类', count: categories?.length, hint: topCatByVisit ? `最热 ${topCatByVisit.label}` : '', link: '/plaza', tone: 'amber', ico: 'category' },
    { name: '累计访问量', count: agentTotal === null ? null : totalVisits, hint: top1Share ? `头名占 ${top1Share}%` : '', link: '/plaza', tone: 'sky', ico: 'visit' },
  ];

  return (
    <PageLayout
      isSidebarCollapsed={isSidebarCollapsed}
      setIsSidebarCollapsed={setIsSidebarCollapsed}
      activePath="/"
      contentClassName="el-content--plain"
    >
      <div className="dash">
        <header className="campus-intro">
          <div className="campus-copy">
            <p className="campus-school">无锡职业技术大学 · AI 中台</p>
            <h1>让 AI 成为<span className="campus-headline-accent">校园的新基础设施</span></h1>
            <p className="campus-lead">智能体、数据与模型在这里汇聚。找到合适的 AI 助手，开启更高效的教学与工作。</p>
            <Link className="campus-primary" to="/plaza">探索智能体广场 <span aria-hidden="true">→</span></Link>
          </div>
        </header>

        {/* 智能填报 / 智能问数暂时下线（2026-11-20），入口先换成站内其它常用页；普通用户只留广场 */}
        <nav className="campus-tools" aria-label="常用服务">
          {(isAdmin
            ? [['智能体广场', '浏览全部智能体服务', '/plaza'], ['模型服务', '浏览已接入的模型', '/model-management'],
              ['智能体开发平台', '低代码搭建专属智能体', `${apiBase}/sso/entry?app=dify`], ['知识库中心', '校内知识统一管理', `${apiBase}/sso/entry?app=dify&redirect=/datasets`]]
            : [['智能体广场', '浏览全部智能体服务', '/plaza']]
          ).map(([name, detail, path]) => (
            <Link key={name} to={path}><strong>{name}</strong><small>{detail}</small><span aria-hidden="true">↗</span></Link>
          ))}
        </nav>

        <section className="campus-summary" aria-labelledby="summary-title">
          <h2 id="summary-title" className="cs-sr">平台概况</h2>
          <dl>{metrics.map((m) => (
            <div key={m.name}>
              <Link to={m.link} className={`cs-item cs-item--${m.tone}`}>
                <span className="cs-item__ico"><svg viewBox="0 0 24 24" aria-hidden="true">{M_ICONS[m.ico]}</svg></span>
                <dd>{loading ? '—' : nf(m.count)}</dd>
                <dt>{m.name}</dt>
                <p>{loading ? ' ' : (m.hint || '—')}</p>
              </Link>
            </div>
          ))}</dl>
        </section>

        {/* 排行 + 分类分布 */}
        <div className="dash-grid dash-grid--21">
          <section className="dash-card">
            <header className="dash-card__head dash-card__head--b">
              <h2 className="dash-card__title">智能体访问排行</h2>
              <span className="dash-card__sub">Top {topAgents.length}</span>
            </header>
            <div className="dash-card__body" style={{ paddingTop: 8 }}>
              <ul className="dash-rows">
                {topAgents.map((a, i) => (
                  <li key={a.id}>
                    <button className="dash-row" onClick={() => launchAgent(navigate, a.id, user)}>
                      <span className="dash-row__idx">{i + 1}</span>
                      <span className="dash-row__name" title={a.name}>{a.name}</span>
                      <span className="dash-row__bar">
                        <span
                          className="dash-row__fill"
                          style={{ width: `${Math.max(3, ((a.visitCount || 0) / maxVisit) * 100)}%`, animationDelay: `${i * 45}ms` }}
                        />
                      </span>
                      <span className="dash-row__val">{nf(a.visitCount)}</span>
                    </button>
                  </li>
                ))}
                {!topAgents.length && <li className="dash-empty">{loading ? '加载中…' : '暂无数据'}</li>}
              </ul>
            </div>
          </section>

          <section className="dash-card">
            <header className="dash-card__head dash-card__head--b">
              <h2 className="dash-card__title">分类分布</h2>
              <span className="dash-card__sub">{catStats.length} 类</span>
            </header>
            <div className="dash-card__body" style={{ paddingTop: 18 }}>
              <div className="dash-donut-wrap">
                <svg width={168} height={168} viewBox="0 0 168 168" className="dash-donut">
                  <g transform="rotate(-90 84 84)">
                    {(() => {
                      const stroke = 16;
                      const r = (168 - stroke) / 2;
                      const circ = 2 * Math.PI * r;
                      const sum = catStats.reduce((s, c) => s + c.count, 0) || 1;
                      let off = 0;
                      return catStats.map((c) => {
                        const d = (c.count / sum) * circ;
                        const el = (
                          <circle
                            key={c.key}
                            cx={84}
                            cy={84}
                            r={r}
                            fill="none"
                            stroke={c.color}
                            strokeWidth={stroke}
                            strokeDasharray={`${d.toFixed(1)} ${(circ - d).toFixed(1)}`}
                            strokeDashoffset={(-off).toFixed(1)}
                          />
                        );
                        off += d;
                        return el;
                      });
                    })()}
                  </g>
                  <text x="50%" y="46%" textAnchor="middle" className="dash-donut__num">{nf(agentTotal)}</text>
                  <text x="50%" y="61%" textAnchor="middle" className="dash-donut__cap">个智能体</text>
                </svg>
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

              {/* 补充事实：把卡片填满，也让环形图有可读的口径 */}
              <div className="dash-kv">
                <div className="dash-kv__r">
                  <span>规模最大</span>
                  <b>{catStats[0] ? `${catStats[0].label} · ${catStats[0].count} 个` : '—'}</b>
                </div>
                <div className="dash-kv__r">
                  <span>平均每类</span>
                  <b>{catStats.length ? `${Math.round(agentTotal / catStats.length)} 个` : '—'}</b>
                </div>
                <div className="dash-kv__r">
                  <span>累计访问</span>
                  <b>{agentTotal == null ? '—' : `${nf(totalVisits)} 次`}</b>
                </div>
                <div className="dash-kv__r">
                  <span>访问最多</span>
                  <b>{topCatByVisit ? `${topCatByVisit.label} · ${nf(topCatByVisit.visits)} 次` : '—'}</b>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* 大模型一览 + 推荐智能体 */}
        <div className="dash-grid dash-grid--21 dash-eq">
          <section className="dash-card">
            <header className="dash-card__head dash-card__head--b">
              <h2 className="dash-card__title">大模型一览</h2>
              <span className="dash-card__sub">共 {nf(modelTotal)} 个 · {providers.length} 家供应商</span>
            </header>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--p-line)' }}>
              <div className="dash-chips">
                {providers.map((p) => (
                  <span key={p.name} className="dash-chip">
                    <span className="dash-dotp" style={{ background: p.color }} />
                    {p.name}
                    <b>{p.count}</b>
                  </span>
                ))}
              </div>
            </div>
            <div style={{ overflowX: 'auto', flex: 1 }}>
              <table className="dash-tbl">
                <colgroup>
                  <col style={{ width: '44%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '18%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>模型</th>
                    <th>供应商</th>
                    <th>类别</th>
                    <th className="r">发布时间</th>
                  </tr>
                </thead>
                <tbody>
                  {models.slice(0, 10).map((m) => {
                    const brand = brandOf(m.name);
                    const ava = avaColorOf(m.name);
                    const pColor = providerColor.get(m.provider) || '#94A3B8';
                    const isVertical = m.category === 'vertical';
                    return (
                      <tr key={m.id}>
                        <td>
                          <div className="dash-mdl">
                            {brand ? (
                              <span
                                className="dash-mdl__ava"
                                style={{
                                  background: brand.tint === 'deepseek' ? 'rgba(77,107,254,.12)' : 'rgba(97,92,237,.12)',
                                }}
                              >
                                <img src={brand.src} alt="" />
                              </span>
                            ) : (
                              <span className="dash-mdl__ava" style={{ background: ava.bg, color: ava.fg }}>
                                {(m.name || '?').trim().slice(0, 1)}
                              </span>
                            )}
                            <span className="dash-mdl__txt">
                              <span className="dash-mdl__name" title={m.name}>{m.name}</span>
                              <span className="dash-mdl__meta" title={m.description || ''}>
                                {[m.type, m.description].filter(Boolean).join(' · ') || '—'}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="dash-prov">
                            <span className="dash-dotp" style={{ background: pColor }} />
                            <span className="dash-prov__n">{m.provider || '—'}</span>
                          </span>
                        </td>
                        <td>
                          <span
                            className="dash-pill"
                            style={
                              isVertical
                                ? { background: 'rgba(249,115,22,.12)', color: '#C2410C' }
                                : { background: 'rgba(59,130,246,.12)', color: '#2563EB' }
                            }
                          >
                            {isVertical ? '垂直' : '通用'}
                          </span>
                        </td>
                        <td className="r mono">{m.releaseDate || '—'}</td>
                      </tr>
                    );
                  })}
                  {!models.length && (
                    <tr><td colSpan={4} className="dash-empty">{loading ? '加载中…' : '暂无数据'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="dash-card">
            <header className="dash-card__head dash-card__head--b">
              <h2 className="dash-card__title">推荐智能体</h2>
              <span className="dash-card__sub">{recommended.length} 个</span>
            </header>
            <div className="dash-card__body" style={{ paddingTop: 8 }}>
              <ul className="dash-reco">
                {recommended.map((a) => (
                  <li key={a.id}>
                    <button className="dash-reco__row" onClick={() => launchAgent(navigate, a.id, user)}>
                      <AgentIcon emoji={a.icon} category={a.categoryKey || 'other'} size={18} />
                      <span className="dash-reco__text">
                        <span className="dash-reco__name">{a.name}</span>
                        <span className="dash-reco__desc">{a.description}</span>
                      </span>
                    </button>
                  </li>
                ))}
                {!recommended.length && <li className="dash-empty">{loading ? '加载中…' : '暂无推荐'}</li>}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}

export default DashboardHome;
