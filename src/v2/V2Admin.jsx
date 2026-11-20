import React, { useState, useEffect, useCallback } from 'react';

// 与 V1 完全一致的后端接口地址（request.js 同源相对路径策略）
const API_BASE = import.meta.env.PROD ? '/agent-plaza/api/v1' : '/api/v1';
import { useNavigate } from 'react-router-dom';
import { Icon, Modal, Switch, Pager, useToast, AgentAvatar, CAT_ICON } from './ui.jsx';
import * as agentApi from '../api/agent';
import * as catApi from '../api/category';
import * as modelApi from '../api/model';
import * as userApi from '../api/user';
import * as logApi from '../api/log';
import * as fileApi from '../api/file';
import * as configApi from '../api/config';

const MENU = [
  { key: 'dashboard', icon: 'dashboard', label: '仪表盘' },
  { key: 'agents', icon: 'spark', label: '智能体管理' },
  { key: 'categories', icon: 'tag', label: '分类管理' },
  { key: 'models', icon: 'chip', label: '模型管理' },
  { key: 'users', icon: 'users', label: '用户管理' },
];
const SUB_MENU = [
  { key: 'xixi', icon: 'headset', label: '锡锡导员管理' },
  { key: 'llm', icon: 'sliders', label: '大模型配置' },
  { key: 'basic', icon: 'gear', label: '基础配置' },
  { key: 'files', icon: 'folder', label: '文件管理' },
  { key: 'logs', icon: 'doclog', label: '操作日志' },
];
const TITLES = {
  dashboard: '仪表盘', agents: '智能体管理', categories: '分类管理', models: '模型管理',
  users: '用户管理', xixi: '锡锡导员管理', llm: '大模型配置', basic: '基础配置',
  files: '文件管理', logs: '操作日志',
};

export default function V2Admin({ user, onLogout }) {
  const [page, setPage] = useState('dashboard');
  const navigate = useNavigate();
  const toast = useToast();
  const go = useCallback((p) => { setPage(p); window.scrollTo(0, 0); }, []);
  return (
    <div className="v2-admin-app">
      <aside className="v2-sidebar">
        <div className="v2-side-brand">
          <img src="./v2-logo.png" alt="无锡职业技术大学校徽" />
          <div><div className="t1">锡职大 AI中台 <span style={{ fontSize: 9, color: 'var(--el-primary)', fontWeight: 700 }}>V2</span></div><div className="t2">AGENT PLAZA · ADMIN</div></div>
        </div>
        <nav className="v2-side-menu">
          {MENU.map((m) => (
            <div key={m.key} className={`v2-menu-item${page === m.key ? ' active' : ''}`} onClick={() => go(m.key)}>
              <span className="ic"><Icon name={m.icon} /></span>{m.label}
            </div>
          ))}
          <div className="v2-menu-group">系统设置</div>
          {SUB_MENU.map((m) => (
            <div key={m.key} className={`v2-menu-item sub${page === m.key ? ' active' : ''}`} onClick={() => go(m.key)}>
              <span className="ic"><Icon name={m.icon} /></span>{m.label}
            </div>
          ))}
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
          {page === 'xixi' && <XixiAdmin toast={toast} />}
          {page === 'llm' && <LlmAdmin toast={toast} />}
          {page === 'basic' && <BasicAdmin toast={toast} />}
          {page === 'files' && <FilesAdmin toast={toast} />}
          {page === 'logs' && <LogsAdmin />}
        </div>
      </div>
    </div>
  );
}

/* ================= 仪表盘 ================= */
function Dashboard({ go }) {
  const [st, setSt] = useState(null);
  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/agents?size=100`).then((r) => r.json()),
      fetch(`${API_BASE}/categories`).then((r) => r.json()),
      fetch(`${API_BASE}/models?category=general&size=50`).then((r) => r.json()),
      fetch(`${API_BASE}/models?category=vertical&size=50`).then((r) => r.json()),
    ]).then(([a, c, g, v]) => {
      const agents = a.data?.records || [];
      setSt({
        agents: a.data?.total ?? agents.length,
        cats: (c.data || []).length,
        models: (g.data?.records || []).length + (v.data?.records || []).length,
        visits: agents.reduce((s, x) => s + (x.visitCount || 0), 0),
        top: [...agents].sort((x, y) => (y.visitCount || 0) - (x.visitCount || 0)).slice(0, 5),
        byCat: (c.data || []).map((cc) => ({ label: cc.label, n: agents.filter((x) => x.categoryName === cc.label).length })),
      });
    }).catch(() => setSt({ err: true }));
  }, []);
  if (!st) return <div className="v2-loading">数据加载中…</div>;
  if (st.err) return <div className="v2-empty">数据加载失败，请刷新重试</div>;
  const kpis = [
    { lb: '智能体', vl: st.agents, cmp: `累计访问 ${st.visits.toLocaleString()}`, bar: 'var(--el-primary)' },
    { lb: '分类', vl: st.cats, cmp: '覆盖广场全部标签', bar: 'var(--p-secondary)' },
    { lb: '模型', vl: st.models, cmp: '本地部署 + 外部合作', bar: '#8B5CF6' },
    { lb: '学院锡锡导员', vl: st.byCat.find((x) => x.label === '锡锡导员')?.n ?? 0, cmp: '实时数据查询', bar: 'var(--p-success)' },
  ];
  return (
    <>
      <div className="v2-page-head">
        <div><div className="v2-ph-title">仪表盘</div><div className="v2-ph-sub">平台核心数据概览 · 实时统计</div></div>
      </div>
      <div className="v2-kpi-row">
        {kpis.map((k) => (
          <div key={k.lb} className="v2-kpi">
            <span className="bar" style={{ background: k.bar }} />
            <div className="lb">{k.lb}</div><div className="vl">{k.vl.toLocaleString()}</div><div className="cmp">{k.cmp}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="v2-card">
          <div className="ct">访问量 TOP5 智能体</div>
          <div className="cs">按累计访问次数排序</div>
          {st.top.map((a) => (
            <div key={a.id} className="v2-hbar-row">
              <span className="v2-hbar-name">{a.name}</span>
              <div className="v2-hbar-track">
                <div style={{ width: `${(a.visitCount / st.top[0].visitCount) * 100}%`, background: 'var(--el-primary)' }} />
              </div>
              <span className="v2-hbar-val">{(a.visitCount || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="v2-card">
          <div className="ct">各分类智能体数</div>
          <div className="cs">实时统计</div>
          {st.byCat.map((c) => (
            <div key={c.label} className="v2-hbar-row">
              <span className="v2-hbar-name">{c.label}</span>
              <div className="v2-hbar-track">
                <div style={{ width: `${(c.n / Math.max(...st.byCat.map((x) => x.n), 1)) * 100}%`, background: 'var(--p-secondary)' }} />
              </div>
              <span className="v2-hbar-val">{c.n} 个</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ================= 智能体管理 ================= */
function AgentsAdmin({ toast }) {
  const [list, setList] = useState(null);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null); // {} 新增 / agent 编辑
  const load = () => {
    agentApi.searchAgents({ size: 100 }).then((d) => setList(d.records || [])).catch((e) => { setList([]); toast('加载失败：' + e.message); });
    catApi.listCategories().then(setCats).catch(() => {});
  };
  useEffect(load, []);
  const rows = (list || []).filter((a) => !q || (a.name + a.description + (a.tags || []).join('')).includes(q));
  const save = async (data) => {
    try {
      const payload = { ...data, tags: typeof data.tags === 'string' ? data.tags.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : data.tags };
      if (data.id) await agentApi.updateAgent(data.id, payload);
      else await agentApi.createAgent(payload);
      toast(`已保存「${data.name}」`);
      setEdit(null); load();
    } catch (e) { toast('保存失败：' + e.message); }
  };
  const del = async (a) => {
    if (!window.confirm(`确认删除智能体「${a.name}」？删除后卡片从广场即时消失，不可恢复。`)) return;
    try { await agentApi.deleteAgent(a.id); toast('已删除'); load(); } catch (e) { toast('删除失败：' + e.message); }
  };
  if (!list) return <div className="v2-loading">加载中…</div>;
  return (
    <>
      <div className="v2-page-head">
        <div><div className="v2-ph-title">智能体管理</div><div className="v2-ph-sub">维护广场上的全部智能体 · 当前共 {list.length} 个</div></div>
        <button className="v2-btn" onClick={() => setEdit({ isRecommended: 0, status: 1, sortOrder: 100 })}>＋ 新增智能体</button>
      </div>
      <div className="v2-filter-bar">
        <input className="v2-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索名称 / 描述 / 标签" />
      </div>
      <div className="v2-tbl-wrap">
        <table className="v2-table">
          <thead><tr><th>图标</th><th>名称</th><th>分类</th><th>描述</th><th style={{ textAlign: 'right' }}>访问</th><th>推荐</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td><span className="v2-ag-ic"><AgentAvatar agent={a} size={30} /></span></td>
                <td style={{ color: 'var(--aink)', fontWeight: 500 }}>{a.name}</td>
                <td><span className="v2-tag blue">{a.categoryName}</span></td>
                <td style={{ whiteSpace: 'normal', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.description}</td>
                <td className="num" style={{ textAlign: 'right' }}>{(a.visitCount || 0).toLocaleString()}</td>
                <td><Switch on={a.isRecommended === 1} onChange={async (v) => { try { await agentApi.updateAgent(a.id, { ...a, isRecommended: v ? 1 : 0 }); load(); } catch (e) { toast('失败：' + e.message); } }} /></td>
                <td><span className={`v2-tag ${a.status === 1 ? 'ok' : 'off'}`}>{a.status === 1 ? '启用' : '停用'}</span></td>
                <td>
                  <button className="v2-link" onClick={() => setEdit(a)}>编辑</button>
                  <button className="v2-link danger" onClick={() => del(a)}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="v2-tbl-foot"><span>共 {rows.length} 个智能体</span></div>
      </div>
      <div className="v2-notice blue" style={{ marginTop: 14 }}>
        <span style={{ flexShrink: 0, marginTop: 2 }}><Icon name="info" size={15} /></span>
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
        ['图标 (emoji)', 'icon', '填一个 emoji 字符'],
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
  useEffect(load, []);
  const save = async (data) => {
    try {
      if (data.id) await catApi.updateCategory(data.id, data);
      else await catApi.createCategory(data);
      toast(`已保存「${data.label}」`); setEdit(null); load();
    } catch (e) { toast('保存失败：' + e.message); }
  };
  const del = async (c) => {
    if (!window.confirm(`确认删除分类「${c.label}」？`)) return;
    try { await catApi.deleteCategory(c.id); toast('已删除'); load(); } catch (e) { toast('删除失败：' + e.message); }
  };
  if (!list) return <div className="v2-loading">加载中…</div>;
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
      fetch(`${API_BASE}/models?category=general&size=50`).then((r) => r.json()),
      fetch(`${API_BASE}/models?category=vertical&size=50`).then((r) => r.json()),
    ]).then(([g, v]) => setList([...(g.data?.records || []), ...(v.data?.records || [])]))
      .catch(() => { setList([]); toast('加载失败'); });
  };
  useEffect(load, []);
  const save = async (data) => {
    try {
      if (data.id) await modelApi.updateModel(data.id, data);
      else await modelApi.createModel(data);
      toast(`已保存「${data.name}」`); setEdit(null); load();
    } catch (e) { toast('保存失败：' + e.message); }
  };
  const del = async (m) => {
    if (!window.confirm(`确认删除模型「${m.name}」？`)) return;
    try { await modelApi.deleteModel(m.id); toast('已删除'); load(); } catch (e) { toast('删除失败：' + e.message); }
  };
  if (!list) return <div className="v2-loading">加载中…</div>;
  return (
    <>
      <div className="v2-page-head">
        <div><div className="v2-ph-title">模型管理</div><div className="v2-ph-sub">维护「模型服务」页向师生展示的模型条目 · 当前共 {list.length} 个</div></div>
        <button className="v2-btn" onClick={() => setEdit({ category: 'general' })}>＋ 新增模型</button>
      </div>
      <div className="v2-tbl-wrap">
        <table className="v2-table">
          <thead><tr><th>模型名称</th><th>供应商</th><th>类型</th><th>描述</th><th>分类</th><th>操作</th></tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, color: 'var(--aink)', fontWeight: 500 }}>{m.name}</td>
                <td>{m.provider}</td>
                <td><span className="v2-tag blue">{m.type}</span></td>
                <td style={{ whiteSpace: 'normal', maxWidth: 320 }}>{m.description}</td>
                <td><span className={`v2-tag ${m.category === 'vertical' ? 'mid' : 'blue'}`}>{m.category === 'vertical' ? '垂类' : '通用'}</span></td>
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
            ['图标 URL', 'iconUrl', '供应商 logo 地址'],
            ['标签(逗号分隔)', 'tags', '如 限时免费'],
          ].map(([lb, k, hint, req]) => (
            <div className="v2-fm-row" key={k}>
              <span className={`v2-fm-label${req ? ' req' : ''}`}>{lb}</span>
              <div className="v2-fm-body"><input className="v2-fm-i" value={typeof edit[k] === 'string' ? edit[k] : (Array.isArray(edit[k]) ? edit[k].join(',') : '')} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} placeholder={hint} /></div>
            </div>
          ))}
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
function UsersAdmin({ toast }) {
  const [list, setList] = useState(null);
  const [page, setPage] = useState(1);
  const load = () => userApi.listUsers({ page, size: 20 }).then((d) => setList(d)).catch((e) => { setList({ records: [] }); toast('加载失败：' + e.message); });
  useEffect(() => { load(); }, [page]);
  const toggle = async (u) => {
    try { await userApi.updateUserStatus(u.id, u.status === 1 ? 0 : 1); toast(u.status === 1 ? `已禁用「${u.nickname || u.username}」` : `已启用「${u.nickname || u.username}」`); load(); } catch (e) { toast('失败：' + e.message); }
  };
  const reset = async (u) => {
    if (!window.confirm(`确认重置「${u.nickname || u.username}」的密码？重置后请第一时间通知用户。`)) return;
    const pwd = 'Wxit@' + Math.random().toString(36).slice(2, 8);
    try { await userApi.resetPassword(u.id, pwd); toast(`已重置，新初始密码：${pwd}（请通知用户）`); } catch (e) { toast('失败：' + e.message); }
  };
  if (!list) return <div className="v2-loading">加载中…</div>;
  return (
    <>
      <div className="v2-page-head">
        <div><div className="v2-ph-title">用户管理</div><div className="v2-ph-sub">管理后台的登录账号 · 当前共 {list.total ?? list.records.length} 个</div></div>
      </div>
      <div className="v2-tbl-wrap">
        <table className="v2-table">
          <thead><tr><th>ID</th><th>用户名</th><th>昵称</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            {list.records.map((u) => (
              <tr key={u.id}>
                <td className="num">{u.id}</td>
                <td style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12 }}>{u.username}</td>
                <td style={{ color: 'var(--aink)', fontWeight: 500 }}>{u.nickname}</td>
                <td><span className={`v2-tag ${u.status === 1 ? 'ok' : 'off'}`}>{u.status === 1 ? '启用' : '禁用'}</span></td>
                <td>
                  <button className="v2-link" onClick={() => toggle(u)}>{u.status === 1 ? '禁用' : '启用'}</button>
                  <button className="v2-link" onClick={() => reset(u)}>重置密码</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="v2-tbl-foot">
          <span>共 {list.total ?? list.records.length} 个账号 · CAS 账号密码随学校统一认证体系，无需在此重置</span>
          <Pager page={page} total={list.total ?? list.records.length} size={20} onPage={setPage} />
        </div>
      </div>
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
    if (!window.confirm(`确认删除供应商「${p.name}」？`)) return;
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
      <div className="v2-notice warn" style={{ marginTop: 14 }}>
        <span style={{ flexShrink: 0, marginTop: 2 }}><Icon name="warn" size={15} /></span>
        <span>更换大模型供应商会<b>直接影响全平台的对话效果</b>。操作顺序：添加/编辑供应商 → 填写 API 地址与密钥 → 保存 → 设为当前使用。请勿在业务高峰期切换。</span>
      </div>
    </>
  );
}

/* ================= 基础配置 ================= */
const BASIC_KEYS = [['site_name', '站点名称，显示在页面标题'], ['site_footer', '页脚文案'], ['upload_max_size', '上传大小上限（MB）'], ['upload_allowed_types', '允许上传的文件类型，逗号分隔']];
function BasicAdmin({ toast }) {
  const [vals, setVals] = useState(null);
  const load = () => configApi.listConfigs().then((d) => {
    const map = {};
    (Array.isArray(d) ? d : d?.records || []).forEach((c) => { map[c.configKey] = c.configValue; });
    setVals(map);
  }).catch(() => { setVals({}); toast('加载失败'); });
  useEffect(() => { load(); }, []);
  if (!vals) return <div className="v2-loading">加载中…</div>;
  const save = async () => {
    try {
      await Promise.all(BASIC_KEYS.map(([k]) => vals[k] !== undefined && configApi.updateConfig(k, vals[k])));
      toast('基础配置已保存'); load();
    } catch (e) { toast('保存失败：' + e.message); }
  };
  return (
    <>
      <div className="v2-page-head">
        <div><div className="v2-ph-title">基础配置</div><div className="v2-ph-sub">站点名称、页脚与上传限制等全局参数</div></div>
      </div>
      <div className="v2-card" style={{ maxWidth: 760 }}>
        <div className="v2-kv-form">
          {BASIC_KEYS.map(([k, hint]) => (
            <div className="v2-kv-row" key={k}>
              <span className="k" style={{ fontFamily: 'ui-monospace,Menlo,monospace' }}>{k}</span>
              <span className="v"><input className="v2-fm-i" value={vals[k] ?? ''} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} /><div className="v2-fm-hint">{hint}</div></span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16 }}><button className="v2-btn" onClick={save}>保存配置</button></div>
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
  useEffect(load, []);
  const del = async (f) => {
    if (!window.confirm(`确认删除「${f.originalName || f.fileName || f.id}」？`)) return;
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
                <td className="num">{(f.createdAt || '').replace('T', ' ').slice(0, 19)}</td>
                <td>
                  <a className="v2-link" href={`/agent-plaza/api/v1/files/download/${f.id}`} target="_blank" rel="noreferrer">下载</a>
                  <button className="v2-link danger" onClick={() => del(f)}>删除</button>
                </td>
              </tr>
            ))}
            {!recs.length && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--p-t4)' }}>暂无文件</td></tr>}
          </tbody>
        </table>
        <div className="v2-tbl-foot"><span>共 {recs.length} 个文件</span></div>
      </div>
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
  if (!list) return <div className="v2-loading">加载中…</div>;
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
                <td className="num" style={{ color: 'var(--p-t4)' }}>{(l.createdAt || '').replace('T', ' ').slice(0, 19)}</td>
                <td style={{ color: 'var(--aink)', fontWeight: 500 }}>{l.operatorName || l.username || '—'}</td>
                <td style={{ whiteSpace: 'normal' }}>{l.content || l.operation || l.description || '—'}</td>
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
