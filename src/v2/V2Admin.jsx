import React, { useState, useEffect, useCallback } from 'react';

// 与 V1 完全一致的后端接口地址（request.js 同源相对路径策略）
const API_BASE = import.meta.env.PROD ? '/agent-plaza/api/v1' : '/api/v1';
import { useNavigate } from 'react-router-dom';
import { Icon, Modal, Switch, Pager, useToast, AgentAvatar, CAT_ICON, confirmDialog } from './ui.jsx';
import * as agentApi from '../api/agent';
import * as catApi from '../api/category';
import * as modelApi from '../api/model';
import * as userApi from '../api/user';
import * as logApi from '../api/log';
import ClientAdmin from './V2ClientAdmin.jsx';
import * as fileApi from '../api/file';
import * as configApi from '../api/config';
import FeaturesAdmin from './V2FeaturesAdmin.jsx';
import ConversationAdmin from './ConversationAdmin.jsx';
import * as feedbackApi from '../api/feedback';
import * as insightApi from '../api/insight';
import WecomSimulator from './WecomSimulator.jsx';

/* 管理后台菜单：1 级＝主题分组，2 级＝具体页；仪表盘为单页 1 级 */
const MENU_TREE = [
  { key: 'dashboard', icon: 'dashboard', label: '仪表盘' },
  { id: 'agent', icon: 'spark', label: '智能体', children: [
    { key: 'agents', icon: 'spark', label: '智能体管理' },
    { key: 'categories', icon: 'tag', label: '分类管理' },
  ] },
  { id: 'model', icon: 'chip', label: '模型服务', children: [
    { key: 'models', icon: 'chip', label: '模型管理' },
    { key: 'llm', icon: 'sliders', label: '大模型配置' },
  ] },
  { id: 'rbac', icon: 'users', label: '用户与权限', children: [
    { key: 'users', icon: 'users', label: '用户管理' },
    { key: 'features', icon: 'ext', label: '前台功能管理' },
  ] },
  { id: 'content', icon: 'send', label: '内容运营', children: [
    { key: 'xixi', icon: 'headset', label: '锡锡导员管理' },
    { key: 'feedback', icon: 'send', label: '意见反馈' },
    { key: 'clients', icon: 'download', label: '客户端管理' },
    { key: 'simulator', icon: 'phone', label: '企微仿真' },
  ] },
  { id: 'settings', icon: 'gear', label: '系统设置', children: [
    { key: 'basic', icon: 'gear', label: '基础配置' },
    { key: 'files', icon: 'folder', label: '文件管理' },
    { key: 'logs', icon: 'doclog', label: '操作日志' },
    { key: 'conversations', icon: 'chat', label: '对话管理' },
  ] },
];
const TITLES = {
  dashboard: '仪表盘', agents: '智能体管理', categories: '分类管理', models: '模型管理',
  users: '用户管理', feedback: '意见反馈', xixi: '锡锡导员管理', llm: '大模型配置', basic: '基础配置',
  clients: '客户端管理', files: '文件管理', logs: '操作日志', features: '前台功能管理',
  simulator: '企微仿真', conversations: '对话管理',
};

const ROUTE_KEYS = Object.keys(TITLES);

/* 图标网格选择器：智能体用图标库，模型用供应商 logo */
const ICON_CHOICES = ['dashboard', 'spark', 'tag', 'chip', 'cap', 'grad', 'briefcase', 'book', 'flask', 'wrench', 'robot', 'clipboard', 'chart', 'users', 'heart', 'headset', 'sliders', 'gear', 'folder', 'doclog', 'search', 'code', 'construction', 'check', 'download', 'send', 'ext'];
const LOGO_CHOICES = [
  { key: 'deepseek', label: 'DeepSeek', src: './v2-deepseek.svg' },
  { key: 'qwen', label: '通义千问', src: './v2-qwen.svg' },
  { key: 'zhiyuan', label: '智谱 BAAI', src: './v2-zhiyuan.svg' },
  { key: 'xixi', label: '锡锡（无锡职大）', src: './v2-xixi.png' },
];
function IconPicker({ value, onChange, kind = 'icon' }) {
  if (kind === 'logo') {
    return (
      <div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
          {LOGO_CHOICES.map((l) => (
            <div key={l.key} onClick={() => onChange(l.src)} title={l.label}
              style={{ width: 86, height: 70, borderRadius: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
                border: value === l.src ? '2px solid var(--el-primary)' : '1.5px solid var(--p-line2)', background: value === l.src ? 'var(--el-primary-l9)' : '#FAFBFD' }}>
              <img src={l.src} alt={l.label} style={{ width: 30, height: 30, objectFit: 'contain' }} />
              <div style={{ fontSize: 10.5, color: 'var(--p-t3)' }}>{l.label}</div>
            </div>
          ))}
        </div>
        <input className="v2-fm-i" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="或粘贴自定义图标 URL（优先级高于左侧选择）" />
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 6 }}>
      {ICON_CHOICES.map((name) => (
        <div key={name} onClick={() => onChange(name)} title={name}
          style={{ height: 44, borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: value === name ? '2px solid var(--el-primary)' : '1.5px solid var(--p-line2)', background: value === name ? 'var(--el-primary-l9)' : '#FAFBFD', color: value === name ? 'var(--el-primary)' : 'var(--p-t2)' }}>
          <Icon name={name} size={19} />
        </div>
      ))}
    </div>
  );
}

/* 环形图（前台 DonutChart 同款） */
function AdminDonut({ data, unit = '', centerLabel = '' }) {
  const total = data.reduce((s, x) => s + x[1], 0) || 1;
  const R = 62, C = 2 * Math.PI * R;
  const colors = ['var(--el-primary)', 'var(--p-secondary)', 'var(--p-accent)', 'var(--p-success)', '#8B5CF6', '#94A3B8', '#38BDF8'];
  let acc = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
      <svg viewBox="0 0 160 160" style={{ width: 148, height: 148, flexShrink: 0 }}>
        {data.map((x, i) => {
          const frac = x[1] / total;
          const dash = `${(frac * C).toFixed(1)} ${C}`;
          const off = (-acc * C).toFixed(1);
          acc += frac;
          return (
            <circle key={x[0]} cx="80" cy="80" r={R} fill="none" stroke={colors[i % colors.length]}
              stroke-width="21" stroke-dasharray={dash} stroke-dashoffset={off}
              transform="rotate(-90 80 80)" opacity="0.92">
              <title>{x[0]}：{x[1]}{unit}（{Math.round(frac * 100)}%）</title>
            </circle>
          );
        })}
        <text x="80" y="76" text-anchor="middle" font-size="20" font-weight="700" fill="var(--aink)">{total.toLocaleString()}</text>
        <text x="80" y="93" text-anchor="middle" font-size="9.5" fill="var(--p-t4)">{centerLabel}</text>
      </svg>
      <div style={{ flex: 1, minWidth: 130 }}>
        {data.map((x, i) => (
          <div key={x[0]} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2.5, background: colors[i % colors.length], flexShrink: 0 }} />
            <span style={{ color: 'var(--p-t2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x[0]}</span>
            <b style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--aink)' }}>{x[1]}{unit}</b>
            <span style={{ color: 'var(--p-t4)', width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Math.round((x[1] / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 表格骨架屏（前台 FundingSkeleton 同范式） */
function TableSkeleton({ rows = 6, kpis = false }) {
  return (
    <div className="v2-adm-sk">
      {kpis && <div className="sk-kpis"><div className="sk-kpi" /><div className="sk-kpi" /><div className="sk-kpi" /><div className="sk-kpi" /></div>}
      {kpis && <div className="sk-title" />}
      {Array.from({ length: rows }).map((_, i) => (
        <div className="sk-row" key={i}>
          <div className="sk-cir" />
          <div className="sk-ln" style={{ width: `${18 + (i % 3) * 6}%` }} />
          <div className="sk-chip" style={{ width: 64, marginLeft: 'auto' }} />
          <div className="sk-chip" style={{ width: 48 }} />
          <div className="sk-ln" style={{ width: 56 }} />
        </div>
      ))}
    </div>
  );
}

export default function V2Admin({ user, onLogout }) {
  const site = useSiteConfig();
  const [page, setPage] = useState(() => {
    // 初始 page 由地址栏决定：#/admin/{key}
    const h = window.location.hash || '';
    const seg = (h.split('#/admin/')[1] || '').split('?')[0].split('/')[0];
    return ROUTE_KEYS.includes(seg) ? seg : 'dashboard';
  });
  const navigate = useNavigate();
  const toast = useToast();
  // 分组菜单展开态：当前页所在分组默认展开
  const [openGroups, setOpenGroups] = useState(() => {
    const g = MENU_TREE.find((n) => n.children && n.children.some((c) => c.key === page));
    return g ? { [g.id]: true } : {};
  });
  useEffect(() => {
    const g = MENU_TREE.find((n) => n.children && n.children.some((c) => c.key === page));
    if (g) setOpenGroups((p) => (p[g.id] ? p : { ...p, [g.id]: true }));
  }, [page]);
  // 地址栏 → page（浏览器前进/后退/手输）
  useEffect(() => {
    const onHash = () => {
      const seg = (window.location.hash.split('#/admin/')[1] || '').split('?')[0].split('/')[0];
      setPage(ROUTE_KEYS.includes(seg) ? seg : 'dashboard');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  // 点菜单 → page + 地址栏同步
  const go = useCallback((p) => {
    setPage(p);
    window.location.hash = '#/admin/' + p;
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className="v2-admin-app">
      <aside className="v2-sidebar">
        <div className="v2-side-brand">
          <img src={site.logo} alt="无锡职业技术大学校徽" />
          <div><div className="t1">锡职大AI中台 <span style={{ fontSize: 9, color: 'var(--el-primary)', fontWeight: 700 }}>V2</span></div><div className="t2">WXUT AI CENTER · ADMIN</div></div>
        </div>
        <nav className="v2-side-menu">
          {MENU_TREE.map((n) => (n.children ? (
            <React.Fragment key={n.id}>
              <div className={`v2-menu-item grp${openGroups[n.id] ? ' open' : ''}`} onClick={() => setOpenGroups((p) => ({ ...p, [n.id]: !p[n.id] }))}>
                <span className="ic"><Icon name={n.icon} /></span>{n.label}
                <span className="arr"><Icon name="chevD" size={12} style={{ transform: openGroups[n.id] ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} /></span>
              </div>
              {openGroups[n.id] && n.children.map((c) => (
                <div key={c.key} className={`v2-menu-item sub${page === c.key ? ' active' : ''}`} onClick={() => go(c.key)}>
                  <span className="ic"><Icon name={c.icon} /></span>{c.label}
                </div>
              ))}
            </React.Fragment>
          ) : (
            <div key={n.key} className={`v2-menu-item${page === n.key ? ' active' : ''}`} onClick={() => go(n.key)}>
              <span className="ic"><Icon name={n.icon} /></span>{n.label}
            </div>
          )))}
        </nav>
      </aside>
      <div className="v2-main">
        <header className="v2-admin-header">
          <div className="v2-hd-left"><span className="crumb">管理后台 /</span> {TITLES[page]}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="v2-user" onClick={() => navigate('/')}>
              <div className="ava">{(user?.nickname || user?.username || '管').slice(0, 1)}</div>
              <span className="nm">{user?.nickname || user?.username}</span>
            </div>
            <button className="v2-btn ghost" onClick={onLogout}>退出</button>
          </div>
        </header>
        <div className="v2-dash">
          {page === 'dashboard' && <Dashboard go={go} />}
          {page === 'agents' && <AgentsAdmin toast={toast} />}
          {page === 'categories' && <CatsAdmin toast={toast} />}
          {page === 'models' && <ModelsAdmin toast={toast} />}
          {page === 'users' && <UsersAdmin toast={toast} />}
          {page === 'feedback' && <FeedbackAdmin toast={toast} />}
          {page === 'xixi' && <XixiAdmin toast={toast} />}
          {page === 'llm' && <LlmAdmin toast={toast} />}
          {page === 'clients' && <ClientAdmin toast={toast} />}
          {page === 'basic' && <BasicAdmin toast={toast} />}
          {page === 'features' && <FeaturesAdmin toast={toast} />}
          {page === 'simulator' && <WecomSimulator toast={toast} />}
          {page === 'files' && <FilesAdmin toast={toast} />}
          {page === 'logs' && <LogsAdmin />}
          {page === 'conversations' && <ConversationAdmin toast={toast} />}
        </div>
      </div>
    </div>
  );
}

/* ================= 仪表盘 ================= */
const WB_LABEL = { funding: '精准资助分析', safety: '学生安全分析', academic: '学业预警分析', mental: '学生心理健康关怀', employment: '就业工作台' };

function Dashboard({ go }) {
  const [st, setSt] = useState(null);
  const [loadedAt, setLoadedAt] = useState(null);
  const [users, setUsers] = useState(null);
  const refresh = () => {
    setSt(null); setUsers(null);
    Promise.all([
      fetch(`${API_BASE}/agents?size=100&includeBuilding=1`).then((r) => r.json()),
      fetch(`${API_BASE}/categories`).then((r) => r.json()),
      fetch(`${API_BASE}/models?category=general&size=200`).then((r) => r.json()),
      fetch(`${API_BASE}/models?category=vertical&size=200`).then((r) => r.json()),
      userApi.listUsers({ page: 1, size: 200 }).catch(() => null),
      insightApi.usage().catch(() => null),
    ]).then(([a, c, g, v, us, iu]) => {
      const agents = a.data?.records || [];
      const models = [...(g.data?.records || []), ...(v.data?.records || [])];
      const catMap = new Map();
      agents.forEach((x) => {
        const e = catMap.get(x.categoryName) || { n: 0, v: 0 };
        e.n += 1; e.v += x.visitCount || 0;
        catMap.set(x.categoryName, e);
      });
      const provMap = new Map();
      models.forEach((m) => provMap.set(m.provider, (provMap.get(m.provider) || 0) + 1));
      setUsers(us ? (us.records || []).length : null);
      setSt({
        agents: a.data?.total ?? agents.length,
        cats: (c.data || []).length,
        models: models.length,
        visits: agents.reduce((s2, x) => s2 + (x.visitCount || 0), 0),
        top: [...agents].sort((x, y) => (y.visitCount || 0) - (x.visitCount || 0)).slice(0, 8),
        byCat: (c.data || []).map((cc) => ({ label: cc.label, n: agents.filter((x) => x.categoryName === cc.label).length, v: agents.filter((x) => x.categoryName === cc.label).reduce((s2, x) => s2 + (x.visitCount || 0), 0) })),
        building: agents.filter((x) => x.isBuilding === 1).length,
        rec: agents.filter((x) => x.isRecommended === 1).length,
        on: agents.filter((x) => x.status === 1 && x.isBuilding !== 1).length,
        provs: [...provMap.entries()].sort((x, y) => y[1] - x[1]).slice(0, 7),
        local: models.filter((m) => (m.tags || []).includes('本地部署')).length,
        insight: { rows: (iu && iu.rows) || [], total: (iu && iu.total) || 0 },
      });
      setLoadedAt(new Date());
    }).catch(() => setSt({ err: true }));
  };
  useEffect(() => { refresh(); }, []);
  if (!st) return (
    <>
      <div className="v2-page-head"><div><div className="v2-ph-title">仪表盘</div><div className="v2-ph-sub">平台核心数据概览 · 实时统计</div></div></div>
      <TableSkeleton kpis />
    </>
  );
  if (st.err) return <div className="v2-empty">数据加载失败 · <button className="v2-link" onClick={refresh}>重试</button></div>;
  const kpis = [
    { lb: '智能体', vl: st.agents, cmp: `建设中 ${st.building} · 已上架 ${st.on}`, bar: 'var(--el-primary)', go: 'agents' },
    { lb: '累计访问', vl: st.visits, cmp: `推荐位 ${st.rec} 个`, bar: '#8B5CF6' },
    { lb: '模型', vl: st.models, cmp: `本地部署 ${st.local} 个`, bar: 'var(--p-accent)', go: 'models' },
    { lb: '分类', vl: st.cats, cmp: '覆盖广场全部标签', bar: 'var(--p-secondary)', go: 'categories' },
    { lb: '学院锡锡导员', vl: st.byCat.find((x) => x.label === '锡锡导员')?.n ?? 0, cmp: '实时数据查询', bar: 'var(--p-success)', go: 'agents' },
    { lb: '管理账号', vl: users ?? '—', cmp: '含 CAS 自动注册', bar: '#38BDF8', go: 'users' },
  ];
  const topMax = st.top[0]?.visitCount || 1;
  const catMax = Math.max(...st.byCat.map((x) => x.n), 1);
  return (
    <>
      <div className="v2-page-head">
        <div><div className="v2-ph-title">仪表盘</div><div className="v2-ph-sub">平台核心数据概览 · 实时统计{loadedAt ? ` · 更新于 ${loadedAt.toLocaleTimeString('zh-CN')}` : ''}</div></div>
        <button className="v2-btn ghost" onClick={refresh}><Icon name="back" size={14} style={{ transform: 'rotate(180deg)' }} /> 刷新数据</button>
      </div>
      <div className="v2-kpi-row" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {kpis.map((k) => (
          <div key={k.lb} className="v2-kpi" style={{ cursor: k.go ? 'pointer' : 'default', transition: 'box-shadow .15s' }} onClick={() => k.go && go(k.go)} onMouseEnter={(e) => k.go && (e.currentTarget.style.boxShadow = '0 4px 16px #1a31521a')} onMouseLeave={(e) => k.go && (e.currentTarget.style.boxShadow = 'none')}>
            <span className="bar" style={{ background: k.bar }} />
            <div className="lb">{k.lb}{k.go && <span style={{ fontSize: 10, color: 'var(--el-primary)', marginLeft: 6 }}>管理 →</span>}</div><div className="vl">{typeof k.vl === 'number' ? k.vl.toLocaleString() : k.vl}</div><div className="cmp">{k.cmp}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 16 }}>
        <div className="v2-card">
          <div className="ct">访问量 TOP8 智能体</div>
          <div className="cs">点击行直达编辑 · 按累计访问排序</div>
          {st.top.map((a) => (
            <div key={a.id} className="v2-hbar-row" style={{ cursor: 'pointer' }} onClick={() => go('agents')} title="前往智能体管理">
              <span className="v2-hbar-name">{a.name}</span>
              <div className="v2-hbar-track">
                <div style={{ width: `${(a.visitCount / topMax) * 100}%`, background: a.categoryKey === 'college' ? 'var(--p-success)' : 'var(--el-primary)' }} />
              </div>
              <span className="v2-hbar-val">{(a.visitCount || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="v2-card">
          <div className="ct">智能体分类分布</div>
          <div className="cs">数量与占比</div>
          <AdminDonut data={st.byCat.filter((x) => x.n > 0).map((x) => [x.label, x.n])} unit=" 个" centerLabel="智能体" />
        </div>
        <div className="v2-card">
          <div className="ct">模型供应商构成</div>
          <div className="cs">本地部署 + 外部合作</div>
          <AdminDonut data={st.provs} unit=" 个" centerLabel="模型" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
        <div className="v2-card">
          <div className="ct">各分类：数量 × 访问量</div>
          <div className="cs">双指标对比 · 点击前往分类管理</div>
          {st.byCat.map((c) => (
            <div key={c.label} className="v2-hbar-row cat-align" style={{ cursor: 'pointer' }} onClick={() => go('categories')} title="前往分类管理">
              <span className="nm">{c.label}</span>
              <div className="v2-hbar-track">
                <div style={{ width: `${(c.n / catMax) * 100}%`, background: 'var(--p-secondary)' }} />
              </div>
              <span className="v2-hbar-val" title="访问量">{c.n} 个 · {c.v.toLocaleString()} 次</span>
            </div>
          ))}
        </div>
        <div className="v2-card">
          <div className="ct">运营健康度</div>
          <div className="cs">上架结构一览</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {[
              ['已上架', st.on, 'var(--p-success)', '广场可见，师生可直接使用'],
              ['建设中', st.building, '#F59E0B', '广场隐藏，后台可继续编辑'],
              ['推荐位', st.rec, 'var(--el-primary)', '广场「全部」tab 置顶展示'],
            ].map(([lb, n, color, desc]) => (
              <div key={lb} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, background: '#F8FAFD', border: '1px solid #EEF2F8' }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: color + '1a', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>{n}</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--aink)' }}>{lb}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--p-t4)', marginTop: 2 }}>{desc}</div>
                </div>
                <div style={{ marginLeft: 'auto', width: 90 }}>
                  <div style={{ height: 6, borderRadius: 3, background: '#EDF1F6', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${st.agents ? (n / st.agents) * 100 : 0}%`, background: color, borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--p-t4)', textAlign: 'right', marginTop: 3 }}>{st.agents ? Math.round((n / st.agents) * 100) : 0}% 占比</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14, marginTop: 14 }}>
        <div className="v2-card">
          <div className="ct">数据洞察使用排名</div>
          <div className="cs">各分析工作台累计访问次数 · 含资助 / 安全 / 学业 / 心理 / 就业</div>
          {(!st.insight || st.insight.rows.length === 0) ? (
            <div className="v2-empty" style={{ padding: 18 }}>暂无访问数据 —— 师生进入 AI 数据洞察工作台后此处自动统计</div>
          ) : (
            <>
              {st.insight.rows.map((r) => (
                <div key={r.workbench} className="v2-hbar-row">
                  <span className="v2-hbar-name">{WB_LABEL[r.workbench] || r.workbench}</span>
                  <div className="v2-hbar-track">
                    <div style={{ width: `${(r.n / (st.insight.rows[0].n || 1)) * 100}%`, background: 'var(--p-accent)' }} />
                  </div>
                  <span className="v2-hbar-val" title={'最近 ' + String(r.lastDate || '').slice(0, 10)}>{(r.n || 0).toLocaleString()} 次</span>
                </div>
              ))}
              <div style={{ fontSize: 11.5, color: 'var(--p-t4)', marginTop: 8 }}>累计 {st.insight.total.toLocaleString()} 次访问</div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ================= 智能体管理 ================= */
/* 只透传后端 AgentCreateDTO 认可的字段：列表对象里的 id / agentType / visitCount / categoryKey 等
   未知字段若回传，后端 Jackson 会抛 UnrecognizedProperty → 500。此处统一白名单收口。 */
const AGENT_DTO_KEYS = ['name', 'icon', 'description', 'detail', 'categoryId', 'externalUrl', 'isRecommended', 'isBuilding', 'sortOrder', 'status', 'tags'];
const toAgentPayload = (o) => { const p = {}; AGENT_DTO_KEYS.forEach((k) => { if (o && o[k] !== undefined) p[k] = o[k]; }); return p; };
function AgentsAdmin({ toast }) {
  const [list, setList] = useState(null);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null); // {} 新增 / agent 编辑
  const load = () => {
    agentApi.searchAgents({ size: 100, includeBuilding: 1 }).then((d) => setList(d.records || [])).catch((e) => { setList([]); toast('加载失败：' + e.message); });
    catApi.listCategories().then(setCats).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  const save = async (data) => {
    try {
      const payload = toAgentPayload(data);
      payload.tags = typeof data.tags === 'string' ? data.tags.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : data.tags;
      if (data.id) await agentApi.updateAgent(data.id, payload);
      else await agentApi.createAgent(payload);
      toast(`已保存「${data.name}」`);
      setEdit(null); load();
    } catch (e) { toast('保存失败：' + e.message); }
  };
  const del = async (a) => {
    if (!(await confirmDialog({ title: '删除智能体', text: `确认删除「${a.name}」？删除后卡片从广场即时消失，不可恢复。`, okText: '删除', danger: true }))) return;
    try { await agentApi.deleteAgent(a.id); toast('已删除'); load(); } catch (e) { toast('删除失败：' + e.message); }
  };
  const [catF, setCatF] = useState('');
  const [stF, setStF] = useState('');
  if (!list) return (
    <>
      <div className="v2-page-head">
        <div><div className="v2-ph-title">智能体管理</div><div className="v2-ph-sub">维护广场上的全部智能体</div></div>
      </div>
      <TableSkeleton rows={7} />
    </>
  );
  const rows = (list || []).filter((a) => {
    if (catF && a.categoryName !== catF) return false;
    if (stF === 'building' && a.isBuilding !== 1) return false;
    if (stF === 'off' && a.status === 1) return false;
    if (stF === 'on' && a.status !== 1) return false;
    if (stF === 'rec' && a.isRecommended !== 1) return false;
    if (q && !(a.name + a.description + (a.tags || []).join('')).includes(q)) return false;
    return true;
  });
  const building = list.filter((a) => a.isBuilding === 1).length;
  return (
    <>
      <div className="v2-page-head">
        <div><div className="v2-ph-title">智能体管理</div><div className="v2-ph-sub">维护广场上的全部智能体 · 共 {list.length} 个（建设中 {building} · 已上架 {list.length - building}）</div></div>
        <button className="v2-btn" onClick={() => setEdit({ isRecommended: 0, status: 1, sortOrder: 100 })}>＋ 新增智能体</button>
      </div>
      <div className="v2-filter-bar">
        <input className="v2-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索名称 / 描述 / 标签" style={{ width: 230 }} />
        <select className="v2-select" value={catF} onChange={(e) => setCatF(e.target.value)}>
          <option value="">全部分类</option>
          {cats.map((c) => <option key={c.id} value={c.label}>{c.label}</option>)}
        </select>
        <select className="v2-select" value={stF} onChange={(e) => setStF(e.target.value)}>
          <option value="">全部状态</option>
          <option value="on">已上架</option>
          <option value="building">建设中</option>
          <option value="off">已停用</option>
          <option value="rec">推荐位</option>
        </select>
        {(catF || stF || q) && <button className="v2-link" onClick={() => { setCatF(''); setStF(''); setQ(''); }}>清除筛选</button>}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--p-t4)' }}>本页 {rows.length} / {list.length} 个</span>
      </div>
      <div className="v2-tbl-wrap">
        <table className="v2-table">
          <thead><tr><th>图标</th><th>名称</th><th>分类</th><th>描述</th><th style={{ textAlign: 'right' }}>访问</th><th>推荐</th><th>建设中</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td><span className="v2-ag-ic"><AgentAvatar agent={a} size={30} /></span></td>
                <td style={{ color: 'var(--aink)', fontWeight: 500 }}>{a.name}{a.isBuilding === 1 && <span className="v2-tag mid" style={{ marginLeft: 6 }}>建设中</span>}</td>
                <td><span className="v2-tag blue">{a.categoryName}</span></td>
                <td style={{ whiteSpace: 'normal', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }} title={a.description || ''}>{a.description}</td>
                <td className="num" style={{ textAlign: 'right' }}>{(a.visitCount || 0).toLocaleString()}</td>
                <td><Switch on={a.isRecommended === 1} onChange={async (v) => { try { await agentApi.updateAgent(a.id, { ...toAgentPayload(a), isRecommended: v ? 1 : 0 }); load(); } catch (e) { toast('失败：' + e.message); } }} /></td>
                <td><Switch on={a.isBuilding === 1} title="建设中：广场不展示" onChange={async (v) => { try { await agentApi.updateAgent(a.id, { ...toAgentPayload(a), isBuilding: v ? 1 : 0 }); toast(v ? `「${a.name}」已标记为建设中，广场不再展示` : `「${a.name}」已上架广场`); load(); } catch (e) { toast('失败：' + e.message); } }} /></td>
                <td><span className={`v2-tag ${a.status === 1 ? 'ok' : 'off'}`}>{a.status === 1 ? '启用' : '停用'}</span></td>
                <td>
                  <button className="v2-link" onClick={() => setEdit(a)}>编辑</button>
                  <button className="v2-link danger" onClick={() => del(a)}>删除</button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--p-t4)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Icon name="spark" size={36} style={{ color: '#C9D6E8' }} />
                  <div style={{ fontSize: 13 }}>没有匹配的智能体{(q || catF || stF) ? '，试试调整筛选条件' : ''}</div>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
        <div className="v2-tbl-foot"><span>共 {rows.length} 个智能体{list.length !== rows.length ? `（筛选自 ${list.length}）` : ''}</span></div>
      </div>
      <div className="v2-notice warn" style={{ marginTop: 14 }}>
        <span style={{ flexShrink: 0, marginTop: 2 }}><Icon name="warn" size={15} /></span>
        <span>临时下线智能体优先使用「停用」而非「删除」——停用可随时恢复，配置完整保留。删除后卡片从广场即时消失，不可恢复。</span>
      </div>
      {edit && <AgentModal agent={edit} cats={cats} onClose={() => setEdit(null)} onSave={save} />}
    </>
  );
}

function AgentModal({ agent, cats, onClose, onSave }) {
  const [f, setF] = useState({ ...agent, tags: Array.isArray(agent.tags) ? agent.tags.join(',') : (agent.tags || '') });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const cat = cats.find((c) => c.label === agent.categoryName) || cats[0];
  useEffect(() => { if (!f.categoryId && cat) set('categoryId', cat.id); }, [cat]);
  return (
    <Modal title={agent.id ? '编辑智能体' : '新增智能体'} onClose={onClose}
      footer={<>
        <button className="v2-btn ghost" onClick={onClose}>取消</button>
        <button className="v2-btn" onClick={() => onSave(f)}>保存</button>
      </>}>
      {[
        ['名称', 'name', '智能体显示名称，建议带学院/业务前缀', true],
        ['描述', 'description', '一句话简介，显示在广场卡片上'],
        ['标签', 'tags', '逗号分隔，用于检索'],
      ].map(([lb, k, hint, req]) => (
        <div className="v2-fm-row" key={k}>
          <span className={`v2-fm-label${req ? ' req' : ''}`}>{lb}</span>
          <div className="v2-fm-body">
            <input className="v2-fm-i" value={f[k] || ''} onChange={(e) => set(k, e.target.value)} placeholder={hint} />
          </div>
        </div>
      ))}
      <div className="v2-fm-row">
        <span className="v2-fm-label">图标</span>
        <div className="v2-fm-body">
          <IconPicker kind="icon" value={f.icon || ''} onChange={(v) => set('icon', v)} />
          <div style={{ fontSize: 11, color: 'var(--p-t4)', marginTop: 6 }}>当前：{f.icon ? `「${f.icon}」` : '未选择（保存后按分类默认图标显示）'}</div>
        </div>
      </div>
      <div className="v2-fm-row">
        <span className="v2-fm-label">分类</span>
        <div className="v2-fm-body">
          <select className="v2-fm-i" value={f.categoryId || ''} onChange={(e) => set('categoryId', Number(e.target.value))}>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div className="v2-fm-row">
        <span className="v2-fm-label">外部链接</span>
        <div className="v2-fm-body">
          <input className="v2-fm-i" value={f.externalUrl || ''} onChange={(e) => set('externalUrl', e.target.value)} placeholder="填写后点击卡片将跳转外部链接" />
        </div>
      </div>
      <div className="v2-fm-row">
        <span className="v2-fm-label">推荐</span>
        <div className="v2-fm-body"><div style={{ padding: '7px 0' }}><Switch on={f.isRecommended === 1} onChange={(v) => set('isRecommended', v ? 1 : 0)} /><span className="v2-fm-hint" style={{ display: 'inline-block', marginLeft: 9 }}>开启后在广场优先展示</span></div></div>
      </div>
      <div className="v2-fm-row">
        <span className="v2-fm-label">建设中</span>
        <div className="v2-fm-body"><div style={{ padding: '7px 0' }}><Switch on={f.isBuilding === 1} onChange={(v) => set('isBuilding', v ? 1 : 0)} /><span className="v2-fm-hint" style={{ display: 'inline-block', marginLeft: 9 }}>开启后智能体广场不展示该智能体（后台仍可见可编辑），建设完成关闭即可上架</span></div></div>
      </div>
      <div className="v2-fm-row">
        <span className="v2-fm-label">排序</span>
        <div className="v2-fm-body">
          <input className="v2-fm-i" type="number" style={{ width: 120 }} value={f.sortOrder ?? 100} onChange={(e) => set('sortOrder', Number(e.target.value))} />
          <div className="v2-fm-hint">数值越小排列越靠前</div>
        </div>
      </div>
      <div className="v2-fm-row">
        <span className="v2-fm-label">启用</span>
        <div className="v2-fm-body"><div style={{ padding: '7px 0' }}><Switch on={f.status === 1} onChange={(v) => set('status', v ? 1 : 0)} /><span className="v2-fm-hint" style={{ display: 'inline-block', marginLeft: 9 }}>关闭后广场不显示该智能体</span></div></div>
      </div>
    </Modal>
  );
}

/* ================= 分类管理 ================= */
function CatsAdmin({ toast }) {
  const [list, setList] = useState(null);
  const [edit, setEdit] = useState(null);
  const load = () => catApi.listCategories().then((d) => setList(Array.isArray(d) ? d : d?.records || [])).catch((e) => { setList([]); toast('加载失败：' + e.message); });
  useEffect(() => { load(); }, []);
  const save = async (data) => {
    try {
      if (data.id) await catApi.updateCategory(data.id, data);
      else await catApi.createCategory(data);
      toast(`已保存「${data.label}」`); setEdit(null); load();
    } catch (e) { toast('保存失败：' + e.message); }
  };
  const del = async (c) => {
    if (!(await confirmDialog({ title: '删除分类', text: `确认删除分类「${c.label}」？`, okText: '删除', danger: true }))) return;
    try { await catApi.deleteCategory(c.id); toast('已删除'); load(); } catch (e) { toast('删除失败：' + e.message); }
  };
  if (!list) return (
    <>
      <div className="v2-page-head"><div><div className="v2-ph-title">分类管理</div><div className="v2-ph-sub">广场智能体的分类体系</div></div></div>
      <TableSkeleton rows={5} />
    </>
  );
  return (
    <>
      <div className="v2-page-head">
        <div><div className="v2-ph-title">分类管理</div><div className="v2-ph-sub">维护广场的分类标签 · 当前 {list.length} 个分类</div></div>
        <button className="v2-btn" onClick={() => setEdit({ status: 1, sortOrder: 100 })}>＋ 新增分类</button>
      </div>
      <div className="v2-tbl-wrap">
        <table className="v2-table">
          <thead><tr><th>分类名称</th><th>Key</th><th>描述</th><th style={{ textAlign: 'right' }}>排序</th><th>启用</th><th>操作</th></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td style={{ color: 'var(--aink)', fontWeight: 500 }}>{c.label}</td>
                <td style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12 }}>{c.categoryKey}</td>
                <td style={{ whiteSpace: 'normal', maxWidth: 320 }}>{c.description}</td>
                <td className="num" style={{ textAlign: 'right' }}>{c.sortOrder}</td>
                <td><Switch on={c.status === 1} onChange={async (v) => { try { await catApi.updateCategory(c.id, { ...c, status: v ? 1 : 0 }); load(); } catch (e) { toast('失败：' + e.message); } }} /></td>
                <td>
                  <button className="v2-link" onClick={() => setEdit(c)}>编辑</button>
                  <button className="v2-link danger" onClick={() => del(c)}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="v2-tbl-foot"><span>共 {list.length} 个分类</span></div>
      </div>
      {edit && (
        <Modal title={edit.id ? '编辑分类' : '新增分类'} onClose={() => setEdit(null)}
          footer={<><button className="v2-btn ghost" onClick={() => setEdit(null)}>取消</button><button className="v2-btn" onClick={() => save(edit)}>保存</button></>}>
          {[
            ['分类名称', 'label', '如：学生管理', true],
            ['分类 Key', 'categoryKey', '英文标识，如 student', true],
            ['描述', 'description', '分类说明'],
          ].map(([lb, k, hint, req]) => (
            <div className="v2-fm-row" key={k}>
              <span className={`v2-fm-label${req ? ' req' : ''}`}>{lb}</span>
              <div className="v2-fm-body"><input className="v2-fm-i" value={edit[k] || ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} placeholder={hint} /></div>
            </div>
          ))}
          <div className="v2-fm-row">
            <span className="v2-fm-label">排序</span>
            <div className="v2-fm-body"><input className="v2-fm-i" type="number" style={{ width: 120 }} value={edit.sortOrder ?? 100} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) })} /></div>
          </div>
          <div className="v2-fm-row">
            <span className="v2-fm-label">启用</span>
            <div className="v2-fm-body"><div style={{ padding: '7px 0' }}><Switch on={edit.status === 1} onChange={(v) => setEdit({ ...edit, status: v ? 1 : 0 })} /></div></div>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ================= 模型管理 ================= */
function ModelsAdmin({ toast }) {
  const [list, setList] = useState(null);
  const [edit, setEdit] = useState(null);
  const load = () => {
    Promise.all([
      fetch(`${API_BASE}/models?category=general&size=200`).then((r) => r.json()),
      fetch(`${API_BASE}/models?category=vertical&size=200`).then((r) => r.json()),
    ]).then(([g, v]) => setList([...(g.data?.records || []), ...(v.data?.records || [])]))
      .catch(() => { setList([]); toast('加载失败'); });
  };
  useEffect(() => { load(); }, []);
  /* 类型下拉选项：页面上已出现的类型 + 常用标准类型（与列表一致，避免手填口径不一） */
  const STD_TYPES = ['文本生成', '推理', '通用推理', '嵌入', 'Reranker', '多模态理解', '图片理解', '图片生成', '语音识别', '语音生成', '内容提取'];
  const typeOptions = [...new Set([...(list || []).map((m) => m.type).filter(Boolean), ...(edit && edit.type ? [edit.type] : []), ...STD_TYPES])];
  const save = async (data) => {
    try {
      if (data.id) await modelApi.updateModel(data.id, data);
      else await modelApi.createModel(data);
      toast(`已保存「${data.name}」`); setEdit(null); load();
    } catch (e) { toast('保存失败：' + e.message); }
  };
  const del = async (m) => {
    if (!(await confirmDialog({ title: '删除模型', text: `确认删除模型「${m.name}」？`, okText: '删除', danger: true }))) return;
    try { await modelApi.deleteModel(m.id); toast('已删除'); load(); } catch (e) { toast('删除失败：' + e.message); }
  };
  if (!list) return (
    <>
      <div className="v2-page-head"><div><div className="v2-ph-title">模型管理</div><div className="v2-ph-sub">维护「模型服务」页向师生展示的模型条目</div></div></div>
      <TableSkeleton rows={6} />
    </>
  );
  return (
    <>
      <div className="v2-page-head">
        <div><div className="v2-ph-title">模型管理</div><div className="v2-ph-sub">维护「模型服务」页向师生展示的模型条目 · 当前共 {list.length} 个</div></div>
        <button className="v2-btn" onClick={() => setEdit({ category: 'general' })}>＋ 新增模型</button>
      </div>
      <div className="v2-tbl-wrap">
        <table className="v2-table">
          <thead><tr><th>模型名称</th><th>供应商</th><th>类型</th><th>描述</th><th>分类</th><th style={{ width: 70 }}>建设中</th><th>操作</th></tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, color: 'var(--aink)', fontWeight: 500 }}>{m.name}{(m.tags || []).includes('建设中') && <span className="v2-tag mid" style={{ marginLeft: 6 }}>建设中</span>}</td>
                <td>{m.provider}</td>
                <td><span className="v2-tag blue">{m.type}</span></td>
                <td style={{ whiteSpace: 'normal', maxWidth: 320 }}>{m.description}</td>
                <td><span className={`v2-tag ${m.category === 'vertical' ? 'mid' : 'blue'}`}>{m.category === 'vertical' ? '垂类' : '通用'}</span></td>
                <td><Switch on={(m.tags || []).includes('建设中')} title="建设中：模型服务页标记为建设中并沉底展示" onChange={async (v) => { try { const cur = m.tags || []; const tags = v ? [...cur.filter((t) => t !== '建设中'), '建设中'] : cur.filter((t) => t !== '建设中'); await modelApi.updateModel(m.id, { ...m, tags }); toast(v ? `「${m.name}」已标记为建设中` : `「${m.name}」已取消建设中`); load(); } catch (e) { toast('失败：' + e.message); } }} /></td>
                <td>
                  <button className="v2-link" onClick={() => setEdit(m)}>编辑</button>
                  <button className="v2-link danger" onClick={() => del(m)}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="v2-tbl-foot"><span>共 {list.length} 个模型 · 实际调用配置在『系统设置 → 大模型配置』</span></div>
      </div>
      {edit && (
        <Modal title={edit.id ? '编辑模型' : '新增模型'} onClose={() => setEdit(null)}
          footer={<><button className="v2-btn ghost" onClick={() => setEdit(null)}>取消</button><button className="v2-btn" onClick={() => save(edit)}>保存</button></>}>
          {[
            ['模型名称', 'name', '如 deepseek-v4-flash', true],
            ['供应商', 'provider', '如 震泽 / 无锡职大', true],
            ['类型', 'type', '如 文本生成 / 推理 / 嵌入'],
            ['描述', 'description', '对外展示的说明'],
            ['标签(逗号分隔)', 'tags', '如 云端模型,本地部署,默认'],
          ].map(([lb, k, hint, req]) => (
            <div className="v2-fm-row" key={k}>
              <span className={`v2-fm-label${req ? ' req' : ''}`}>{lb}</span>
              <div className="v2-fm-body">{k === 'type' ? (
                <select className="v2-fm-i" value={edit.type || ''} onChange={(e) => setEdit({ ...edit, type: e.target.value })}>
                  <option value="">请选择类型</option>
                  {typeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input className="v2-fm-i" value={typeof edit[k] === 'string' ? edit[k] : (Array.isArray(edit[k]) ? edit[k].join(',') : '')} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} placeholder={hint} />
              )}</div>
            </div>
          ))}
          <div className="v2-fm-row">
            <span className="v2-fm-label">图标</span>
            <div className="v2-fm-body">
              <IconPicker kind="logo" value={edit.iconUrl || ''} onChange={(v) => setEdit({ ...edit, iconUrl: v })} />
              <div style={{ fontSize: 11, color: 'var(--p-t4)', marginTop: 6 }}>当前：{edit.iconUrl ? '已选择' : '未选择（前台按名称/供应商自动匹配）'}</div>
            </div>
          </div>
          <div className="v2-fm-row">
            <span className="v2-fm-label">分类</span>
            <div className="v2-fm-body">
              <select className="v2-fm-i" value={edit.category || 'general'} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
                <option value="general">通用</option>
                <option value="vertical">垂类</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ================= 用户管理 ================= */
const ROLE_LABELS = { admin: '平台管理员', leader: '校领导', college_admin: '学院管理员', user: '普通用户' };
const PERM_LABELS = {
  'chat.college': '本院锡锡对话',
  'chat.all': '全校锡锡对话',
  'insight.funding': '精准资助分析',
  'insight.safety': '学生安全分析',
  'insight.academic': '学业预警分析',
  'insight.mental': '心理健康关怀',
  'insight.export': '名单导出（Excel/CSV）',
  'teacher.form': '智能填报',
  'kb.use': '知识库中心',
  'dev.entry': '智能体开发平台',
  'admin.dashboard': '使用统计（本院）',
  'admin.agent': '智能体管理',
  'admin.model': '模型管理',
  'admin.user': '用户与权限',
  'admin.config': '系统配置',
  'admin.file': '文件管理',
  'admin.log': '操作日志',
};
const PERM_GROUPS = [
  { h: '数据查询', keys: ['chat.college', 'chat.all'] },
  { h: 'AI场景分析', keys: ['insight.funding', 'insight.safety', 'insight.academic', 'insight.mental', 'insight.export'] },
  { h: '工作台', keys: ['teacher.form', 'kb.use', 'dev.entry'] },
];

function UsersAdmin({ toast }) {
  const [list, setList] = useState(null);
  const [page, setPage] = useState(1);
  const [colleges, setColleges] = useState([]);
  const [edit, setEdit] = useState(null); // {u, role, collegeId, perms:{}}
  const load = () => userApi.listUsers({ page, size: 20 }).then((d) => setList(d)).catch((e) => { setList({ records: [] }); toast('加载失败：' + e.message); });
  useEffect(() => { load(); }, [page]);
  useEffect(() => {
    fetch(`${API_BASE}/colleges`).then((r) => r.json()).then((j) => setColleges(j.data || [])).catch(() => {});
  }, []);
  const toggle = async (u) => {
    try { await userApi.updateUserStatus(u.id, u.status === 1 ? 0 : 1); toast(u.status === 1 ? `已禁用「${u.nickname || u.username}」` : `已启用「${u.nickname || u.username}」`); load(); } catch (e) { toast('失败：' + e.message); }
  };
  const reset = async (u) => {
    if (!(await confirmDialog({ title: '重置密码', text: `确认重置「${u.nickname || u.username}」的密码？重置后请第一时间通知用户。`, okText: '重置', danger: true }))) return;
    const pwd = 'Wxit@' + Math.random().toString(36).slice(2, 8);
    try { await userApi.resetPassword(u.id, pwd); toast(`已重置，新初始密码：${pwd}（请通知用户）`); } catch (e) { toast('失败：' + e.message); }
  };
  const openEdit = (u) => {
    setEdit({ u, role: u.role || 'user', collegeId: u.collegeId ?? '', devEntry: undefined });
    // 加载该用户当前权限（dev.entry 状态驱动开关；游客/失败按 false 处理不阻塞弹窗）
    userApi.getUserPerms(u.id)
      .then((perms) => {
        const on = Array.isArray(perms) && perms.includes('dev.entry');
        setEdit((e) => e && e.u.id === u.id ? { ...e, devEntry: on, devEntryInitial: on } : e);
      })
      .catch(() => { setEdit((e) => e && e.u.id === u.id ? { ...e, devEntry: false, devEntryInitial: false } : e); });
  };
  const saveEdit = async () => {
    const { u, role, collegeId, devEntry, devEntryInitial } = edit;
    try {
      await userApi.updateUser(u.id, {
        role,
        collegeId: collegeId === '' ? null : Number(collegeId),
      });
      // dev.entry 有变化才写（避免普通老师无记录时也写一行 granted=0）
      if (devEntry !== undefined && devEntryInitial !== undefined && devEntry !== devEntryInitial) {
        await userApi.setUserPerm(u.id, 'dev.entry', devEntry);
      }
      toast(`已保存「${u.nickname || u.username}」的角色与权限`);
      setEdit(null);
      load();
    } catch (e) { toast('失败：' + e.message); }
  };
  const [q, setQ] = useState('');
  const [roleF, setRoleF] = useState('');
  if (!list) return (
    <>
      <div className="v2-page-head">
        <div><div className="v2-ph-title">用户管理</div><div className="v2-ph-sub">账号 · 四层角色 · 学院归属与细粒度权限</div></div>
      </div>
      <TableSkeleton rows={8} />
    </>
  );
  const collegeName = (id) => (colleges.find((c) => c.id === id) || {}).name || '—';
  const allRecords = list.records || [];
  const rows = allRecords.filter((u) => {
    if (roleF && u.role !== roleF) return false;
    if (q && !((u.username || '') + (u.nickname || '')).includes(q.trim())) return false;
    return true;
  });
  return (
    <>
      <div className="v2-page-head">
        <div><div className="v2-ph-title">用户管理</div><div className="v2-ph-sub">账号 · 四层角色 · 学院归属与细粒度权限 · 当前共 {list.total ?? allRecords.length} 个</div></div>
      </div>
      <div className="v2-filter-bar">
        <input className="v2-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索工号 / 姓名" style={{ width: 220 }} />
        <select className="v2-select" value={roleF} onChange={(e) => setRoleF(e.target.value)}>
          <option value="">全部角色</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {roleF && <button className="v2-link" onClick={() => setRoleF('')}>清除筛选</button>}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--p-t4)' }}>本页 {rows.length} / {allRecords.length} 个账号</span>
      </div>
      <div className="v2-tbl-wrap">
        <table className="v2-table">
          <thead><tr><th>ID</th><th>用户名</th><th>昵称</th><th>角色</th><th>学院</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="num">{u.id}</td>
                <td style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12 }}>{u.username}</td>
                <td style={{ color: 'var(--aink)', fontWeight: 500 }}>{u.nickname}</td>
                <td><span className={`v2-role ${['admin', 'leader', 'college_admin'].includes(u.role) ? u.role : 'user'}`}>{ROLE_LABELS[u.role] || u.role}</span></td>
                <td>{u.collegeId != null ? collegeName(u.collegeId) : <span style={{ color: 'var(--p-t4)' }} title="该账号尚未登录过，下次 CAS 登录时自动从数据中台同步学院归属">未同步</span>}</td>
                <td><span className={`v2-tag ${u.status === 1 ? 'ok' : 'off'}`}>{u.status === 1 ? '启用' : '禁用'}</span></td>
                <td>
                  <button className="v2-link" onClick={() => openEdit(u)}>角色权限</button>
                  <button className="v2-link" onClick={() => toggle(u)}>{u.status === 1 ? '禁用' : '启用'}</button>
                  <button className="v2-link" onClick={() => reset(u)}>重置密码</button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--p-t4)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Icon name="users" size={36} style={{ color: '#C9D6E8' }} />
                  <div style={{ fontSize: 13 }}>没有匹配的账号{q || roleF ? '，试试调整搜索或筛选条件' : ''}</div>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
        <div className="v2-tbl-foot">
          <span>首次 CAS 登录自动同步学院归属（数据中台口径） · CAS 账号密码随学校统一认证体系</span>
          <Pager page={page} total={list.total ?? list.records.length} size={20} onPage={setPage} />
        </div>
      </div>

      {edit && (
        <div className="v2-modal-mask" onMouseDown={(e) => { if (e.target === e.currentTarget) setEdit(null); }}>
          <div className="v2-modal" style={{ width: 640 }}>
            <div className="v2-md-head"><div className="t">角色与权限 · {edit.u.nickname || edit.u.username}</div><button className="v2-md-close" onClick={() => setEdit(null)}>✕</button></div>
            <div className="v2-md-body">
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--p-t3)', marginBottom: 6 }}>角色</div>
                  <select className="v2-select" style={{ width: '100%' }} value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--p-t3)', marginBottom: 6 }}>学院</div>
                  <select className="v2-select" style={{ width: '100%' }} value={edit.collegeId} onChange={(e) => setEdit({ ...edit, collegeId: e.target.value })}>
                    <option value="">未分配</option>
                    {colleges.map((c) => <option key={c.id} value={c.id} title={c.scopeAll === 1 ? '数据范围=全校数据（如校资助中心等业务岗）' : undefined}>{c.name}{c.scopeAll === 1 ? '（数据范围=全校）' : ''}</option>)}
                  </select>
                </div>
              </div>
              <div className="v2-scope-explain">
                <div className="h"><Icon name="info" size={15} /> 数据权限说明</div>
                <div className="b">
                  平台功能对所有登录用户开放，无需逐一授权。<b>数据范围由「学院」决定</b>：
                  <ul>
                    <li>选择具体学院（如机械工程学院）→ AI场景分析、学院锡锡等数据能力<b>仅限该学院</b>；</li>
                    <li>选择<b>「全校」</b> → 可查看全部学院的数仓数据（适用于校资助中心等面向全校的业务岗）；</li>
                    <li>「非学院机构」/未分配 → 不含学院数据。</li>
                  </ul>
                  保存后立即生效，用户下次登录即可按新范围使用。
                </div>
              </div>
            </div>
              {/* 功能权限（申请开通制入口）：dev.entry 智能体开发平台 */}
              <div className="v2-scope-explain" style={{ marginBottom: 14 }}>
                <div className="h"><Icon name="code" size={15} /> 功能权限 · 申请开通制</div>
                <div className="b" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Switch on={!!edit.devEntry} onChange={(v) => setEdit({ ...edit, devEntry: v })} title="智能体开发平台" />
                  <div style={{ flex: 1 }}>
                    <b>智能体开发平台（dev.entry）</b>
                    <div style={{ marginTop: 2 }}>
                      开发平台实行申请开通制：老师由所在学院 / 部门向<b>信息化与数据服务中心</b>提出申请，
                      审核通过后在此勾选开通；未开通者平台入口不可用（有统一身份认证账号也不开放）。
                    </div>
                  </div>
                </div>
              </div>
            <div className="v2-md-foot">
              <button className="v2-btn ghost" onClick={() => setEdit(null)}>取消</button>
              <button className="v2-btn" onClick={saveEdit}>保存</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= 锡锡导员管理 ================= */
function XixiAdmin({ toast }) {
  return (
    <>
      <div className="v2-page-head">
        <div><div className="v2-ph-title">锡锡导员管理</div><div className="v2-ph-sub">语音智能体平台（线上虚拟助手 + 线下实体终端）· 独立管理体系</div></div>
      </div>
      <div className="v2-card" style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 16 }}>
        <div style={{ width: 58, height: 58, borderRadius: 15, background: 'linear-gradient(135deg,#0c1a33,#2c5fa8)', color: '#e3c98a', fontSize: 26, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>锡</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--aink)' }}>锡锡导员管理平台</div>
          <div style={{ fontSize: 12.5, color: 'var(--p-t3)', marginTop: 4, lineHeight: 1.7, maxWidth: 640 }}>
            承载语音对话智能体、音色、设备与聊天记录管理。与 AI 中台账号体系独立，统一身份认证账号两边通用。点击下方按钮将自动携带票据跳转（60 秒一次性票据），无需二次登录。
          </div>
        </div>
        <button className="v2-btn lg" onClick={() => toast('正式版将携带票据跳转 http://210.28.144.49:8002/')}>前往锡锡导员管理平台 →</button>
      </div>
      <div className="v2-opgrid">
        {[
          ['plus', '添加智能体', '新建语音智能体并『配置角色』人设。'],
          ['spark', '音色克隆', '配置与克隆智能体的 TTS 音色。'],
          ['sliders', '声纹识别', '管理说话人声纹与免唤醒。'],
          ['dashboard', '设备管理', '线下实体终端的接入与绑定。'],
          ['book', '知识库', '维护制度与业务知识内容。'],
          ['chip', '模型配置', '语音链路 LLM / TTS 供应商设置。'],
          ['doclog', '参数字典', '运行参数与业务字典维护。'],
          ['search', '聊天记录', '回看终端与线上会话记录。'],
        ].map(([ic, t, d]) => (
          <div key={t} className="v2-op">
            <div className="ic"><Icon name={ic} size={22} /></div>
            <div className="t">{t}</div><div className="d">{d}</div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ================= 大模型配置 ================= */
const PROVIDERS_KEY = 'llm.providers';
const KB_MODEL_KEYS = [
  ['kb.embed_base_url', '嵌入模型 API 地址', 'http://210.28.144.245:8014/v1'],
  ['kb.embed_model', '嵌入模型名称', 'qwen3-embedding-4b'],
  ['kb.rerank_base_url', '重排模型 API 地址', 'http://210.28.144.245:8015/v1'],
  ['kb.rerank_model', '重排模型名称', 'bge-reranker-v2-m3'],
];
function KbModelCard({ toast }) {
  // 文档解析服务（校园一体机）状态
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfHealth, setPdfHealth] = useState(null);
  useEffect(() => {
    configApi.getConfig('pdf.parse_url').then((r) => setPdfUrl((r && r.configValue) || '')).catch(() => {});
    fetch(`${API_BASE}/form/parse-service/health`, { headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` } })
      .then((r) => r.json()).then((j) => setPdfHealth(j.data || null)).catch(() => setPdfHealth({ online: false }));
  }, []);
  const savePdf = async () => {
    try { await configApi.updateConfig('pdf.parse_url', pdfUrl || ''); toast('文档解析服务配置已保存'); }
    catch (e) { toast('保存失败：' + e.message); }
  };
  const [vals, setVals] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      const rs = await Promise.all(KB_MODEL_KEYS.map(([k]) => configApi.getConfig(k).catch(() => null)));
      const v = {};
      KB_MODEL_KEYS.forEach(([k, , dft], i) => {
        const raw = rs[i]?.configValue ?? rs[i];
        v[k] = (typeof raw === 'string' && raw.trim()) ? raw : dft;
      });
      setVals(v);
    } catch { setVals(Object.fromEntries(KB_MODEL_KEYS.map(([k, , dft]) => [k, dft]))); }
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    setBusy(true);
    try {
      await Promise.all(KB_MODEL_KEYS.map(([k]) => configApi.updateConfig(k, vals[k] || '')));
      toast('知识库检索模型配置已保存');
    } catch (e) { toast('保存失败：' + e.message); } finally { setBusy(false); }
  };
  if (!vals) return null;
  return (
    <div className="v2-card" style={{ marginTop: 14 }}>
      <div className="ct">知识库检索模型（校园一体机）</div>
      <div className="cs">知识库中心向量化与重排序所用的模型 · 与对话大模型相互独立 · 默认使用校园智算一体机</div>
      <div className="v2-kv-form" style={{ marginTop: 10 }}>
        {KB_MODEL_KEYS.map(([k, lb]) => (
          <div className="v2-kv-row" key={k}>
            <span className="k">{lb}</span>
            <span className="v"><input className="v2-fm-i" value={vals[k] || ''} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} /></span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="v2-btn" disabled={busy} onClick={save}>{busy ? '保存中…' : '保存配置'}</button>
      </div>
      <div className="v2-notice warn" style={{ marginTop: 14 }}>
        <span style={{ flexShrink: 0, marginTop: 2 }}><Icon name="warn" size={15} /></span>
        <span>嵌入模型与库内向量强绑定：更换嵌入模型后<b>必须对库内文件逐个「重建索引」</b>（维度须一致），否则检索失效；重排模型可随时切换，异常时自动回退向量相似度排序。</span>
      </div>
      <div style={{ height: 1, background: 'var(--p-line)', margin: '18px 0' }} />
      <div className="ct">文档解析服务（校园智算一体机）</div>
      <div className="cs">智能填报「上传文件自动回填」所用 · PDF 解析引擎（PyMuPDF）部署于一体机，中台经此地址调用；服务不可达时自动回退中台内置解析</div>
      <div className="v2-kv-form" style={{ marginTop: 10 }}>
        <div className="v2-kv-row">
          <span className="k">服务地址</span>
          <span className="v"><input className="v2-fm-i" value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} placeholder="http://210.28.144.245:8016/parse" /></span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="v2-btn" onClick={savePdf}>保存配置</button>
        {pdfHealth && <span className={`v2-tag ${pdfHealth.online ? 'green' : 'red'}`}>{pdfHealth.online ? '服务在线' : '服务离线'}</span>}
        <span style={{ fontSize: 11.5, color: 'var(--p-t4)' }}>支持 PDF / Word / Excel 文本解析 · 扫描件需拍摄设备支持</span>
      </div>
    </div>
  );
}
function LlmAdmin({ toast }) {
  const [providers, setProviders] = useState(null);
  const [current, setCurrent] = useState(null);
  const [sel, setSel] = useState(null);
  const load = async () => {
    try {
      const [provVal, cur, key, model] = await Promise.all([
        configApi.getConfig(PROVIDERS_KEY).catch(() => null),
        configApi.getConfig('llm.base_url').catch(() => null),
        configApi.getConfig('llm.api_key').catch(() => null),
        configApi.getConfig('llm.model').catch(() => null),
      ]);
      let list = [];
      try { list = JSON.parse(provVal?.configValue || provVal || '[]'); } catch { list = []; }
      if (!Array.isArray(list)) list = [];
      setProviders(list);
      setSel(list[0] || null);
      setCurrent(cur ? { base_url: typeof cur === 'string' ? cur : cur?.configValue, api_key: typeof key === 'string' ? key : key?.configValue, model: typeof model === 'string' ? model : model?.configValue } : null);
    } catch (e) { setProviders([]); toast('加载失败：' + e.message); }
  };
  useEffect(() => { load(); }, []);
  const save = async (p) => {
    try {
      const next = providers.map((x) => (x.id === p.id ? p : x));
      await configApi.updateConfig(PROVIDERS_KEY, JSON.stringify(next));
      setProviders(next); toast(`已保存「${p.name}」`);
    } catch (e) { toast('保存失败：' + e.message); }
  };
  const add = async () => {
    const np = { id: Date.now(), name: '新供应商', type: 'DeepSeek', base_url: '', api_key: '', model: '' };
    const next = [...providers, np];
    await configApi.updateConfig(PROVIDERS_KEY, JSON.stringify(next));
    setProviders(next); setSel(np); toast('已添加，请填写配置');
  };
  const setCur = async (p) => {
    if (!p.api_key) { toast('请先填写该供应商的 API Key'); return; }
    try {
      await Promise.all([
        configApi.updateConfig('llm.base_url', p.base_url),
        configApi.updateConfig('llm.api_key', p.api_key),
        configApi.updateConfig('llm.model', p.model),
      ]);
      await fetch(`${import.meta.env.VITE_GATEWAY_BASE_URL || ''}/v1/admin/llm-config`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_url: p.base_url, api_key: p.api_key, model: p.model }),
      }).catch(() => {});
      toast(`已切换为当前使用：${p.name}`); load();
    } catch (e) { toast('切换失败：' + e.message); }
  };
  const remove = async (p) => {
    if (!(await confirmDialog({ title: '删除供应商', text: `确认删除供应商「${p.name}」？`, okText: '删除', danger: true }))) return;
    const next = providers.filter((x) => x.id !== p.id);
    await configApi.updateConfig(PROVIDERS_KEY, JSON.stringify(next));
    setProviders(next); setSel(next[0] || null); toast('已删除');
  };
  if (!providers) return <div className="v2-loading">加载中…</div>;
  const curName = current && providers.find((p) => p.base_url === current.base_url && p.model === current.model);
  return (
    <>
      <div className="v2-page-head">
        <div><div className="v2-ph-title">大模型配置</div><div className="v2-ph-sub">平台调用的大模型供应商与密钥 · 当前生效 {curName ? curName.name + '（' + (current.model || '') + '）' : '未配置'}</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 14, alignItems: 'start' }}>
        <div className="v2-card" style={{ padding: 0, overflow: 'hidden' }}>
          {providers.map((p) => (
            <div key={p.id} className={`v2-menu-item${sel?.id === p.id ? ' active' : ''}`} style={{ margin: 0, borderRadius: 0, borderBottom: '1px solid #F3F6FA' }} onClick={() => setSel(p)}>
              <span className="ic"><Icon name="chip" /></span>{p.name}
              {curName?.id === p.id && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--p-success)', fontWeight: 700 }}>当前生效</span>}
            </div>
          ))}
          <div className="v2-menu-item" style={{ color: 'var(--p-t3)', fontSize: 12.5 }} onClick={add}>＋ 添加自定义供应商</div>
        </div>
        {sel ? (
          <div className="v2-card">
            <div className="ct">{sel.name}</div>
            <div className="cs">{curName?.id === sel.id ? '当前生效供应商' : '备用供应商'} · 切换将影响全平台对话效果</div>
            <div className="v2-kv-form" style={{ marginTop: 10 }}>
              {[['供应商名称', 'name'], ['API 地址', 'base_url'], ['API 密钥', 'api_key'], ['默认模型', 'model']].map(([lb, k]) => (
                <div className="v2-kv-row" key={k}>
                  <span className="k">{lb}</span>
                  <span className="v"><input className="v2-fm-i" type={k === 'api_key' && sel[k] ? 'password' : 'text'} value={sel[k] || ''} onChange={(e) => setSel({ ...sel, [k]: e.target.value })} /></span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="v2-btn" onClick={() => save(sel)}>保存配置</button>
              <button className="v2-btn ghost" onClick={() => setCur(sel)}>设为当前使用</button>
              <span style={{ flex: 1 }} />
              <button className="v2-btn ghost" style={{ color: 'var(--abad)' }} onClick={() => remove(sel)}>删除</button>
            </div>
          </div>
        ) : <div className="v2-card"><div className="v2-loading">暂无供应商，请先添加</div></div>}
      </div>
      <KbModelCard toast={toast} />
      <div className="v2-notice warn" style={{ marginTop: 14 }}>
        <span style={{ flexShrink: 0, marginTop: 2 }}><Icon name="warn" size={15} /></span>
        <span>更换大模型供应商会<b>直接影响全平台的对话效果</b>。操作顺序：添加/编辑供应商 → 填写 API 地址与密钥 → 保存 → 设为当前使用。请勿在业务高峰期切换。</span>
      </div>
    </>
  );
}

/* ================= 基础配置 ================= */
const BASIC_KEYS = [
  ['site_name', '系统名称', '显示在浏览器标题与页面品牌处'],
  ['site_subtitle', '系统副标题', '显示在品牌名下方（如英文名 / 机构全称）'],
  ['site_footer', '页脚文案', '显示在页面底部的版权与署名文字'],
  ['upload_note_placeholder', '', ''],
  ['upload_max_size', '上传大小上限', '上传文件的大小上限（MB）'],
  ['upload_allowed_types', '允许上传的文件类型', '逗号分隔的文件扩展名，如 jpg,png,pdf,docx'],
  ['labelstudio.base_url', 'Label Studio 地址', 'AI数据工场标注对接：如 http://210.28.144.245:8082'],
  ['labelstudio.token', 'Label Studio Token', '标注对接令牌（请求头 Authorization: Token <token>）'],
];
function BasicAdmin({ toast }) {
  const [vals, setVals] = useState(null);
  const [lsMsg, setLsMsg] = useState('');
  const testLs = () => {
    const tk = localStorage.getItem('admin_token');
    setLsMsg('检测中…');
    fetch(`${API_BASE}/dataset/labelstudio/ping`, { headers: tk ? { Authorization: 'Bearer ' + tk } : {} })
      .then((r) => r.json())
      .then((j) => { const d = j?.data || {}; setLsMsg(d.ok ? `连通 ✓（Label Studio 项目数 ${d.projects ?? '?'}）` : `失败：${d.error || j?.message || '未知'}（先保存地址与 Token）`); })
      .catch((e) => setLsMsg('请求失败：' + e.message));
  };
  const load = () => configApi.listConfigs().then((d) => {
    const map = {};
    (Array.isArray(d) ? d : d?.records || []).forEach((c) => { map[c.configKey] = c.configValue; });
    setVals(map);
  }).catch(() => { setVals({}); toast('加载失败'); });
  useEffect(() => { load(); }, []);
  if (!vals) return <div className="v2-loading">加载中…</div>;
  const [logoUp, setLogoUp] = useState(false);
  const onLogoUpload = async (e) => {
    const f = e.target && e.target.files && e.target.files[0];
    if (!f) return;
    if (!/^image\//.test(f.type || '')) { toast('请选择图片文件（PNG / JPG / SVG）'); e.target.value = ''; return; }
    setLogoUp(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const d = await fileApi.uploadFile(fd);
      const url = `${API_BASE}/files/download/${d.id}`;
      await configApi.updateConfig('site_logo', url);
      setVals({ ...vals, site_logo: url });
      toast('系统 Logo 已更新，前台刷新后生效');
    } catch (e2) { toast('上传失败：' + e2.message); }
    setLogoUp(false);
    e.target.value = '';
  };
  const resetLogo = () => configApi.updateConfig('site_logo', '')
    .then(() => { setVals({ ...vals, site_logo: '' }); toast('已恢复默认 Logo'); })
    .catch((e) => toast('失败：' + e.message));
  const save = async () => {
    try {
      await Promise.all(BASIC_KEYS.map(([k]) => vals[k] !== undefined && configApi.updateConfig(k, vals[k])));
      toast('基础配置已保存'); load();
    } catch (e) { toast('保存失败：' + e.message); }
  };
  return (
    <>
      <div className="v2-page-head">
        <div><div className="v2-ph-title">基础配置</div><div className="v2-ph-sub">系统名称、Logo、页脚与上传限制等全局参数</div></div>
      </div>
      <div className="v2-card" style={{ maxWidth: 760 }}>
        <div className="v2-kv-form">
          {BASIC_KEYS.map(([k, label, hint]) => (
            <div className="v2-kv-row" key={k}>
              <span className="k">{label}</span>
              <span className="v"><input className="v2-fm-i" value={vals[k] ?? ''} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} /><div className="v2-fm-hint">{hint}</div></span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16 }}><button className="v2-btn" onClick={save}>保存配置</button></div>
      </div>
      <div className="v2-card" style={{ maxWidth: 760, marginTop: 14 }}>
        <div className="v2-kv-form">
          <div className="v2-kv-row">
            <span className="k">游客模式</span>
            <span className="v">
              <div className="v2-guest-switch">
                <button type="button" className={'v2-sw' + ((vals['guest.mode'] ?? 'on') !== 'off' ? ' on' : '')} aria-label="游客模式开关"
                  onClick={() => {
                    const next = (vals['guest.mode'] ?? 'on') === 'off' ? 'on' : 'off';
                    configApi.updateConfig('guest.mode', next)
                      .then(() => { setVals({ ...vals, 'guest.mode': next }); toast(next === 'off' ? '已关闭游客模式：访问任意页面均需登录' : '已开启游客模式：游客可免登录浏览'); })
                      .catch((e) => toast('保存失败：' + e.message));
                  }} />
                <span style={{ fontSize: 12.5, color: 'var(--p-t2)' }}>{(vals['guest.mode'] ?? 'on') !== 'off' ? '已开启：游客可免登录浏览广场与模型服务' : '已关闭：访问任意页面均需统一身份认证登录'}</span>
              </div>
              <div className="v2-fm-hint">开启后游客免登录浏览广场与模型服务；关闭后全站强制登录，未登录用户（含演示场景）无法进入任何页面</div>
            </span>
          </div>
        </div>
      </div>
      <div className="v2-card" style={{ maxWidth: 760, marginTop: 14 }}>
        <div className="v2-kv-form">
          <div className="v2-kv-row">
            <span className="k">系统 Logo</span>
            <span className="v">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <img src={(vals['site_logo'] && String(vals['site_logo']).trim()) || './v2-logo.png?v=2'} alt="系统 Logo"
                  style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--p-line2)', background: '#FAFBFD', padding: 6 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <label className="v2-btn ghost" style={{ cursor: 'pointer', height: 34, display: 'inline-flex', alignItems: 'center', padding: '0 14px', margin: 0 }}>
                      {logoUp ? '上传中…' : '上传 Logo'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onLogoUpload} />
                    </label>
                    {vals['site_logo'] && <button className="v2-btn ghost" onClick={resetLogo}>恢复默认</button>}
                  </div>
                  <div className="v2-fm-hint">建议透明背景 PNG / SVG，正方形或横向均可；用于顶栏品牌位、页脚、登录页与浏览器图标，保存后前台刷新生效</div>
                </div>
              </div>
            </span>
          </div>
        </div>
      </div>
      <div className="v2-card" style={{ maxWidth: 760, marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="v2-btn ghost" onClick={testLs}>测试 Label Studio 连通</button>
          <span style={{ fontSize: 12.5, color: 'var(--p-t3)' }}>{lsMsg || 'AI数据工场标注对接：填好上方「Label Studio 地址 / Token」并保存后，点此自检'}</span>
        </div>
      </div>
    </>
  );
}

/* ================= 文件管理 ================= */
function FilesAdmin({ toast }) {
  const [list, setList] = useState(null);
  const load = () => {
    import('../api/request').then(({ default: r }) => r.get('/files', { params: { page: 1, size: 100 } }))
      .then((d) => setList(d)).catch(() => { setList({ records: [] }); toast('加载失败'); });
  };
  useEffect(() => { load(); }, []);
  const del = async (f) => {
    if (!(await confirmDialog({ title: '删除文件', text: `确认删除「${f.originalName || f.fileName || f.id}」？`, okText: '删除', danger: true }))) return;
    try { await fileApi.deleteFile(f.id); toast('已删除'); load(); } catch (e) { toast('删除失败：' + e.message); }
  };
  if (!list) return <div className="v2-loading">加载中…</div>;
  const recs = list.records || [];
  return (
    <>
      <div className="v2-page-head">
        <div><div className="v2-ph-title">文件管理</div><div className="v2-ph-sub">后台上传文件的统一管理 · 上传受基础配置的大小上限与类型白名单约束</div></div>
      </div>
      <div className="v2-tbl-wrap">
        <table className="v2-table">
          <thead><tr><th>文件名</th><th>大小</th><th>上传时间</th><th>操作</th></tr></thead>
          <tbody>
            {recs.map((f) => (
              <tr key={f.id}>
                <td style={{ color: 'var(--aink)' }}>{f.originalName || f.fileName || f.id}</td>
                <td className="num">{f.fileSize ? `${(f.fileSize / 1024).toFixed(0)} KB` : '—'}</td>
                <td className="num">{(f.createTime || f.createdAt || '').replace('T', ' ').slice(0, 19)}</td>
                <td>
                  <a className="v2-link" href={`/agent-plaza/api/v1/files/download/${f.id}`} target="_blank" rel="noreferrer">下载</a>
                  <button className="v2-link danger" onClick={() => del(f)}>删除</button>
                </td>
              </tr>
            ))}
            {!recs.length && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '44px 20px', color: 'var(--p-t4)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <Icon name="folder" size={40} style={{ color: '#C9D6E8' }} />
                  <div style={{ fontSize: 13.5, color: 'var(--p-t3)' }}>还没有上传过文件</div>
                  <div style={{ fontSize: 12 }}>智能体图标、知识库附件等素材可上传后在外链引用 · 文件同样受白名单约束</div>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
        <div className="v2-tbl-foot"><span>共 {recs.length} 个文件</span></div>
      </div>
    </>
  );
}

/* ================= 意见反馈 ================= */
const FB_TYPES = ['功能建议', '问题报告', '体验反馈', '其他'];
const FB_SOURCES = [
  { key: 'xixibuddy', label: 'XixiBuddy 客户端' },
  { key: 'web', label: '网页端' },
];
function FeedbackAdmin({ toast }) {
  const [list, setList] = useState(null);
  const [page, setPage] = useState(1);
  const [typeF, setTypeF] = useState('');
  const [srcF, setSrcF] = useState('');
  const [stF, setStF] = useState('');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);
  const load = () => {
    setList(null);
    feedbackApi.listFeedback({ page, size: 20, ftype: typeF || undefined, source: srcF || undefined, status: stF === '' ? undefined : Number(stF), q: q || undefined })
      .then((d) => setList(d)).catch(() => setList({ records: [], total: 0 }));
  };
  useEffect(() => { const t = setTimeout(() => setQ(qInput), 300); return () => clearTimeout(t); }, [qInput]);
  useEffect(load, [page, typeF, srcF, stF, q]);
  const pending = (list?.records || []).filter((r) => !r.status).length;
  const mark = async (row, status) => {
    try {
      await feedbackApi.updateFeedbackStatus(row.id, status);
      toast(status ? '已标记为已处理' : '已重新打开');
      if (detail?.id === row.id) setDetail({ ...detail, status });
      load();
    } catch (e) { toast('失败：' + e.message); }
  };
  const srcLabel = (s) => (FB_SOURCES.find((x) => x.key === s) || { label: s || '未知来源' }).label;
  return (
    <>
      <div className="v2-page-head">
        <div><div className="v2-ph-title">意见反馈</div><div className="v2-ph-sub">各端提交的用户反馈（XixiBuddy 客户端 / 反馈页）· 按时间倒序</div></div>
      </div>
      <div className="v2-filter-bar">
        <select className="v2-select" value={typeF} onChange={(e) => { setPage(1); setTypeF(e.target.value); }}>
          <option value="">全部类型</option>
          {FB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="v2-select" value={srcF} onChange={(e) => { setPage(1); setSrcF(e.target.value); }}>
          <option value="">全部来源</option>
          {FB_SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select className="v2-select" value={stF} onChange={(e) => { setPage(1); setStF(e.target.value); }}>
          <option value="">全部状态</option>
          <option value="0">未处理</option>
          <option value="1">已处理</option>
        </select>
        <input className="v2-search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="搜索内容 / 联系方式" style={{ width: 210 }} />
        {(typeF || srcF || stF || q || qInput) && <button className="v2-link" onClick={() => { setTypeF(''); setSrcF(''); setStF(''); setQInput(''); setQ(''); }}>清除筛选</button>}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--p-t4)' }}>{stF === '0' ? `本页未处理 ${pending} 条` : ''}</span>
      </div>
      {!list ? <TableSkeleton rows={8} /> : (
        <div className="v2-tbl-wrap">
          <table className="v2-table">
            <thead><tr><th>提交时间</th><th>类型</th><th>来源</th><th>反馈内容</th><th>联系方式</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              {(list.records || []).map((r) => (
                <tr key={r.id}>
                  <td className="num" style={{ color: 'var(--p-t4)', whiteSpace: 'nowrap' }}>{(r.createdAt || r.created_at || '').toString().replace('T', ' ').slice(0, 19)}</td>
                  <td><span className={`v2-tag ${r.ftype === '问题报告' ? 'mid' : r.ftype === '功能建议' ? 'blue' : ''}`}>{r.ftype || '—'}</span></td>
                  <td style={{ color: 'var(--p-t2)', whiteSpace: 'nowrap', fontSize: 12.5 }}>{srcLabel(r.source)}</td>
                  <td style={{ whiteSpace: 'normal', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.content}>{r.content}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.contact || <span style={{ color: 'var(--p-t4)' }}>未留</span>}</td>
                  <td><span className={`v2-tag ${r.status ? 'ok' : 'mid'}`}>{r.status ? '已处理' : '未处理'}</span></td>
                  <td>
                    <button className="v2-link" onClick={() => setDetail(r)}>查看</button>
                    <button className="v2-link" onClick={() => mark(r, r.status ? 0 : 1)}>{r.status ? '重新打开' : '标记处理'}</button>
                  </td>
                </tr>
              ))}
              {!(list.records || []).length && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--p-t4)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Icon name="send" size={36} style={{ color: '#C9D6E8' }} />
                    <div style={{ fontSize: 13 }}>暂无反馈{(typeF || srcF || stF || q) ? '，试试调整筛选条件' : '，用户提交后会出现在这里'}</div>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
          <div className="v2-tbl-foot">
            <span>共 {list.total ?? 0} 条反馈</span>
            <Pager page={page} total={list.total ?? 0} size={20} onPage={setPage} />
          </div>
        </div>
      )}
      {detail && (
        <Modal title={`反馈详情 #${detail.id}`} onClose={() => setDetail(null)}
          footer={<>
            <button className="v2-btn ghost" onClick={() => setDetail(null)}>关闭</button>
            <button className="v2-btn" onClick={() => mark(detail, detail.status ? 0 : 1)}>{detail.status ? '重新打开' : '标记为已处理'}</button>
          </>}>
          <div className="v2-fm-row"><span className="v2-fm-label">提交时间</span><div className="v2-fm-body" style={{ color: 'var(--p-t2)' }}>{(detail.createdAt || detail.created_at || '').toString().replace('T', ' ').slice(0, 19)}</div></div>
          <div className="v2-fm-row"><span className="v2-fm-label">类型 / 来源</span><div className="v2-fm-body" style={{ color: 'var(--p-t2)' }}>{detail.ftype || '—'} · {srcLabel(detail.source)}</div></div>
          <div className="v2-fm-row"><span className="v2-fm-label">联系方式</span><div className="v2-fm-body" style={{ color: 'var(--p-t2)' }}>{detail.contact || '未留'}</div></div>
          <div className="v2-fm-row"><span className="v2-fm-label">反馈内容</span><div className="v2-fm-body"><div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, padding: '12px 14px', background: '#F7F9FC', borderRadius: 8, fontSize: 13.5, color: 'var(--aink)' }}>{detail.content}</div></div></div>
          {detail.version && <div className="v2-fm-row"><span className="v2-fm-label">客户端版本</span><div className="v2-fm-body" style={{ color: 'var(--p-t2)' }}>{detail.version}</div></div>}
          {(() => {
            const dev = detail.deviceInfo || detail.device_info || '';
            if (!dev) return null;
            const sep = dev.indexOf('; screen_resolution=');
            const ua = sep > -1 ? dev.slice(0, sep) : dev;
            const res = sep > -1 ? dev.slice(sep + '; screen_resolution='.length) : '';
            return (<>
              <div className="v2-fm-row"><span className="v2-fm-label">设备环境</span><div className="v2-fm-body" style={{ fontSize: 12, color: 'var(--p-t3)', wordBreak: 'break-all', lineHeight: 1.6 }}>{ua}</div></div>
              {res && <div className="v2-fm-row"><span className="v2-fm-label">屏幕</span><div className="v2-fm-body" style={{ fontSize: 12, color: 'var(--p-t3)', lineHeight: 1.6 }}>{res}</div></div>}
            </>);
          })()}
        </Modal>
      )}
    </>
  );
}

/* ================= 操作日志 ================= */
function LogsAdmin() {
  const [list, setList] = useState(null);
  const [page, setPage] = useState(1);
  useEffect(() => {
    logApi.listLogs({ page, size: 20 }).then((d) => setList(d)).catch(() => setList({ records: [], total: 0 }));
  }, [page]);
  if (!list) return (
    <>
      <div className="v2-page-head"><div><div className="v2-ph-title">操作日志</div><div className="v2-ph-sub">管理端关键操作记录 · 按时间倒序 · 只读</div></div></div>
      <TableSkeleton rows={8} />
    </>
  );
  return (
    <>
      <div className="v2-page-head">
        <div><div className="v2-ph-title">操作日志</div><div className="v2-ph-sub">管理端关键操作记录 · 按时间倒序 · 只读</div></div>
      </div>
      <div className="v2-tbl-wrap">
        <table className="v2-table">
          <thead><tr><th>时间</th><th>操作人</th><th>内容</th></tr></thead>
          <tbody>
            {(list.records || []).map((l) => (
              <tr key={l.id}>
                <td className="num" style={{ color: 'var(--p-t4)', whiteSpace: 'nowrap' }}>{(l.createTime || l.createdAt || '').replace('T', ' ').slice(0, 19)}</td>
                <td style={{ color: 'var(--aink)', fontWeight: 500 }}>{l.operatorName || l.username || '—'}</td>
                <td style={{ whiteSpace: 'normal' }}>{l.operation || l.content || '—'}{l.params ? <span style={{ color: 'var(--p-t4)', marginLeft: 8, fontSize: 12 }}>{l.params}</span> : null}</td>
              </tr>
            ))}
            {!(list.records || []).length && <tr><td colSpan={3} style={{ textAlign: 'center', padding: 32, color: 'var(--p-t4)' }}>暂无日志</td></tr>}
          </tbody>
        </table>
        <div className="v2-tbl-foot">
          <span>共 {list.total ?? 0} 条记录</span>
          <Pager page={page} total={list.total ?? 0} size={20} onPage={setPage} />
        </div>
      </div>
    </>
  );
}
