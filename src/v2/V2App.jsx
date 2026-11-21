import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// 与 V1 完全一致的后端接口地址（request.js 同源相对路径策略）
const API_BASE = import.meta.env.PROD ? '/agent-plaza/api/v1' : '/api/v1';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon, AgentAvatar, COLLEGE_MODELS, GATEWAY_BASE, SUGGEST_COLLEGE, SUGGEST_ALL, useMascot, useToast, IconBuilding } from './ui.jsx';
import { getAgentDetail } from '../api/agent';
import { useV2User } from './V2User.jsx';
import { InsightHome, FundingWorkbench } from './V2Insight.jsx';
import { SceneWorkbench } from './V2Scene.jsx';
import V2Teacher from './V2Teacher.jsx';
import { XixiLoading } from './ui.jsx';
import { marked } from 'marked';

// marked：GFM 表格 + 换行分段；raw HTML 一律转义防注入（V1 CollegeQueryPage 同款）
function escapeHtml2(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
marked.use({
  breaks: true,
  gfm: true,
  renderer: { html(token) { return escapeHtml2(token.text); } },
});
function renderMd(text) {
  // 净化旧版历史数据中拼接的 HTML 尾注（改为 note 字段渲染）
  const cleaned = String(text || '').replace(/\n*<div class="v2-note-line">[\s\S]*?<\/div>\s*$/g, '').trim();
  try { return marked.parse(cleaned); } catch { return escapeHtml2(cleaned); }
}

/** 学工号 gzip+base64 编码为 sys.user_id（与 V1 utils/agentLaunch 完全一致） */
async function encodeUserId(userId) {
  const encoded = new TextEncoder().encode(userId);
  const stream = new Blob([encoded]).stream().pipeThrough(new CompressionStream('gzip'));
  const compressed = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(compressed);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** V1 同款智能体唤起：externalUrl 外跳(带登录态)/#/college-query 站内/其余进 V2 对话 */
async function launchAgentV2(navigate, agentId, user, onChat) {
  // 智能填报（39）改跳 AI教师工作台内部（不再外跳 dcs）
  if (agentId === 39) { navigate('/teacher'); return; }
  try {
    const detail = await getAgentDetail(agentId);
    const url = detail.externalUrl || detail.external_url;
    if (url) {
      if (url.startsWith('#/')) {
        // 站内路由：college-query 走 V2 流式对话，其他站内页跳 V1 对应页
        const m = url.match(/^#\/college-query\/(\d+)$/);
        if (m) { onChat(detail); return; }
        window.location.hash = url.slice(1);
        return;
      }
      const separator = url.includes('?') ? '&' : '?';
      let finalUrl = url;
      if (user?.username) {
        const encoded = await encodeUserId(user.username);
        finalUrl = `${url}${separator}sys.user_id=${encodeURIComponent(encoded)}`;
      }
      window.open(finalUrl, '_blank');
    } else {
      onChat(detail);
    }
  } catch {
    onChat(null);
  }
}

/* ============ 顶栏 ============ */
export function TopNav({ page, onNav, user, guest, onLogin, onLogout, perms }) {
  const has = (k) => Array.isArray(perms) && perms.includes(k);
  const canInsight = has('insight.funding') || has('insight.safety') || has('insight.academic') || has('insight.mental');
  const canTeacher = has('teacher.form');
  // 游客全显（展示性导航，点进去由守卫引导登录/提示无权限）
  const showInsight = !user || canInsight;
  const showTeacher = !user || canTeacher;
  const NAVS = [
    { key: 'plaza', label: '首页' },
    ...(showInsight ? [{ key: 'insight', label: 'AI 数据洞察' }] : []),
    ...(showTeacher ? [{ key: 'teacher', label: 'AI教师工作台' }] : []),
    { key: 'dev', label: '智能体开发平台' },
    { key: 'models', label: '模型服务' },
    { key: 'kb', label: '知识库中心' },
  ];
  return (
    <nav className="v2-topnav">
      <a className="v2-brand" href="#/" onClick={(e) => { e.preventDefault(); onNav('plaza'); }}>
        <img src="./v2-logo.png" alt="无锡职业技术大学校徽" />
        <div><div className="t1">锡职大AI中台</div><div className="t2">WXUT AI Center</div></div>
      </a>
      <div className="v2-nav-links">
        {NAVS.map((n) => (
          <a key={n.key} className={`v2-nav-link${page === n.key ? ' active' : ''}`}
            href={`#/${n.key === 'plaza' ? '' : n.key}`}
            onClick={(e) => { e.preventDefault(); onNav(n.key); }}>
            {n.label}{n.key === 'kb' && <span className="chip-new">NEW</span>}
          </a>
        ))}
      </div>
      <div className="v2-nav-right">
        {user ? (
          <>
            <div className="v2-user" title="统一身份认证账号">
              <div className="ava">{(user.nickname || user.username || '用').slice(0, 1)}</div>
              <span className="nm">{user.nickname || user.username}</span>
            </div>
            <button className="v2-btn ghost" onClick={onLogout} title="退出登录">退出</button>
          </>
        ) : guest ? (
          <>
            <div className="v2-user" title="游客模式（免登录演示）">
              <div className="ava" style={{ background: 'linear-gradient(135deg,#94A3B8,#CBD5E1)' }}>游</div>
              <span className="nm">游客</span>
            </div>
            <button className="v2-btn ghost" onClick={onLogin} title="使用统一身份认证登录">登录</button>
          </>
        ) : (
          <button className="v2-btn ghost" onClick={onLogin}>登录</button>
        )}
      </div>
    </nav>
  );
}

/* ============ 页脚 ============ */
export function Footer({ onNav, toast }) {
  return (
    <footer className="v2-site-foot">
      <div className="v2-foot-inner">
        <div className="v2-foot-grid">
          <div className="v2-foot-brand">
            <div className="row">
              <img src="./v2-logo.png" alt="无锡职业技术大学校徽" />
              <div><div className="t1">锡职大AI中台</div><div className="t2">WXUT AI Center</div></div>
            </div>
            <div className="desc">无锡职业技术大学全校统一的智能体入口与 AI 能力底座。让 AI 成为校园的新基础设施 —— 学习答疑、制度查询、数据洞察，点开即用。</div>
          </div>
          <div className="v2-foot-col">
            <div className="h">平台服务</div>
            <div className="lnk" onClick={() => onNav('plaza')}>智能体广场</div>
            <div className="lnk" onClick={() => onNav('models')}>模型服务</div>
            <div className="lnk" onClick={() => onNav('teacher')}>AI教师工作台</div>
            <div className="lnk" onClick={() => onNav('kb')}>知识库中心</div>
            <div className="lnk" onClick={() => toast('正式版将新窗口打开数据大屏')}>数据大屏</div>
          </div>
          <div className="v2-foot-col">
            <div className="h">了解平台</div>
            <div className="lnk" onClick={() => onNav('campus')}>数智化校园 · AI科普</div>
            <div className="lnk" onClick={() => onNav('guide')}>操作指南</div>
            <div className="lnk" onClick={() => onNav('about')}>关于我们</div>
          </div>
          <div className="v2-foot-col">
            <div className="h">开发者</div>
            <div className="lnk" onClick={() => onNav('dev')}>智能体开发平台</div>
            <div className="lnk" onClick={() => onNav('guide')}>上架广场指引</div>
            <div className="lnk" onClick={() => onNav('kb')}>知识库（文档问答）</div>
            <div className="lnk" onClick={() => { window.location.hash = '#/admin/login'; window.scrollTo(0, 0); }}>AI中台管理后台</div>
          </div>
          <div className="v2-foot-col">
            <div className="h">联系我们</div>
            <div className="lnk" style={{ cursor: 'default' }}>信息化与数据服务中心</div>
            <div className="lnk" style={{ cursor: 'default' }}>dcc@wxit.edu.cn</div>
            <div className="lnk" style={{ cursor: 'default' }}>工作日 8:30 – 17:00</div>
          </div>
        </div>
        <div className="v2-foot-copy">
          <span><b>无锡职业技术大学 · 信息化与数据服务中心</b></span>
          <span>© 2026 Wuxi University of Technology</span>
        </div>
      </div>
    </footer>
  );
}

/* ============ 首页 hero ============ */
/* 首页锡锡：气泡文案轮播（打字机 + 换句） */
const HERO_BUBBLES = [
  { b: '你好，我是锡锡！', sub: '校园 AI 形象 · 点击和我对话' },
  { b: '想查学院数据？问我呀', sub: '在校生 · 归寝 · 请假 · 消费 · 科研' },
  { b: '我接入了全校数仓', sub: '11 个学院 + 教职工 + 领导看板' },
  { b: '制度文件也可以问我', sub: '党建 / 教学 / 科研 / 人事 8 大类' },
];

function Hero({ agents, onChat, onSearch, q, onXixiBlocked }) {
  // RBAC：全校锡锡(111)已被上层过滤时，按钮/吉祥物点击走提示而非对话
  const isXixi = agents.find((a) => Number(a.id) === 111);
  const tryXixi = () => { isXixi ? onChat(isXixi) : onXixiBlocked && onXixiBlocked(); };
  const visits = agents.reduce((s, a) => s + (a.visitCount || 0), 0);
  const college = agents.filter((a) => a.categoryKey === 'college').length;
  const [bIdx, setBIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const cur = HERO_BUBBLES[bIdx];
  useEffect(() => {
    setTyped('');
    let i = 0;
    const full = cur.b;
    const t = setInterval(() => {
      i += 1;
      setTyped(full.slice(0, i));
      if (i >= full.length) clearInterval(t);
    }, 90);
    const swap = setTimeout(() => setBIdx((n) => (n + 1) % HERO_BUBBLES.length), 4200);
    return () => { clearInterval(t); clearTimeout(swap); };
  }, [bIdx]);
  return (
    <div className="v2-hero">
      <div className="v2-hero-inner">
        <div className="v2-hero-copy">
          <div className="v2-kicker">WUXI UNIVERSITY OF TECHNOLOGY · AI CENTER</div>
          <h1>锡职大 <span className="accent">AI中台</span> · 智能体广场</h1>
          <div className="sub">让 AI 成为校园的新基础设施 —— 学习答疑、制度查询、数据洞察，一个广场全部搞定</div>
          <div className="v2-hero-search">
            <Icon name="search" size={17} style={{ color: 'var(--p-t4)', flexShrink: 0 }} />
            <input value={q} onChange={(e) => onSearch(e.target.value)} placeholder="搜索智能体名称 / 描述 / 标签…" />
            <button className="v2-btn" onClick={tryXixi}>和锡锡聊聊</button>
          </div>
          <div className="v2-hero-stats">
            <div className="v2-hstat"><div className="v">{agents.length}</div><div className="k">智能体</div></div>
            <div className="v2-hstat"><div className="v">{visits.toLocaleString()}</div><div className="k">累计访问</div></div>
            <div className="v2-hstat"><div className="v">{college}</div><div className="k">学院锡锡导员</div></div>
          </div>
        </div>
        <div className="v2-hero-side" onClick={tryXixi} title="点击和锡锡对话">
          <div className="v2-mascot-ring" />
          <div className="v2-mascot-bubble" style={{ right: 198, top: 'calc(46% - 4px)' }} key={bIdx}>
            <b>{typed}{typed.length < cur.b.length ? <span className="cursor" /> : ''}</b>
            <div className="sub">{cur.sub}</div>
            <span className="tail" />
          </div>
          <div className="v2-hero-mascot">
            <img src="./v2-xixi.png" alt="锡锡 · 无锡职业技术大学 AI 形象" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ 广场 ============ */
function Plaza({ agents, cats, q, setQ, onChat, onNav, toast, onXixiBlocked }) {
  const [cat, setCat] = useState('全部');
  const labels = ['全部', ...cats.map((c) => c.label)];
  const cnt = (l) => (l === '全部' ? agents.length : agents.filter((a) => a.categoryName === l).length);
  const rows = agents.filter((a) =>
    (cat === '全部' || a.categoryName === cat) &&
    (!q || (a.name + a.description + a.categoryName + (a.tags || []).join('')).includes(q)));
  // 「全部」tab：推荐置顶 + 使用次数降序；建设中排最后（其余 tab 保持原顺序）
  const sorted = cat === '全部' && !q
    ? [...rows].sort((a, b) => {
        const ba = a.isBuilding === 1 ? 1 : 0, bb = b.isBuilding === 1 ? 1 : 0;
        if (ba !== bb) return ba - bb;
        const ra = a.isRecommended === 1 ? 0 : 1, rb = b.isRecommended === 1 ? 0 : 1;
        if (ra !== rb) return ra - rb;
        return (b.visitCount || 0) - (a.visitCount || 0);
      })
    : rows;
  return (
    <>
      <Hero agents={agents} onChat={onChat} onSearch={setQ} q={q} onXixiBlocked={onXixiBlocked} />
      <div className="v2-body">
        <div className="v2-dev-banner">
          <div className="ic"><Icon name="code" size={22} /></div>
          <div className="bd">
            <div className="t">智能体开发平台 <span className="tg">开发者</span></div>
            <div className="d">可视化编排开发你自己的智能体 —— 创建应用、配置提示词与知识库、调试预览，审核通过后可上架到智能体广场供全校使用。使用学校统一身份认证登录。</div>
          </div>
          <button className="v2-btn" style={{ height: 38, padding: '0 20px', flexShrink: 0 }} onClick={() => onNav('dev')}>了解更多 →</button>
        </div>
        <div className="v2-cat-chips">
          {labels.map((l) => (
            <span key={l} className={`v2-chip${cat === l ? ' on' : ''}`} onClick={() => setCat(l)}>
              {l}<span className="n">{cnt(l)}</span>
            </span>
          ))}
        </div>
        <div className="v2-agent-grid">
          {rows.length ? sorted.map((a) => {
            const building = a.isBuilding === 1;
            return (
            <div key={a.id} className={`v2-ag-card${building ? ' building' : ''}`} onClick={() => building ? toast('该智能体建设中，敬请期待') : onChat(a)}>
              {building ? <span className="rec bld">建设中</span> : (a.isRecommended === 1 && <span className="rec">推荐</span>)}
              <div className="em">{building ? <IconBuilding size={34} /> : <AgentAvatar agent={a} size={36} />}</div>
              <div className="nm">{a.name}</div>
              <div className="ds">{a.description || ''}</div>
              <div className="tags">{(a.tags || []).map((t, i) => <span key={i} className="tg">{t}</span>)}</div>
              <div className="ft">
                <span className="cat">{a.categoryName}</span>
                <span className="cnt">{building ? '开发建设中' : `访问 ${(a.visitCount || 0).toLocaleString()} 次`}</span>
              </div>
            </div>
            );
          }) : <div className="v2-empty">没有找到匹配的智能体，换个关键词试试</div>}
        </div>
      </div>
    </>
  );
}

/* ============ 对话页（SSE 流式，V1 同协议） ============ */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function mdLite(t) {
  let s = escapeHtml(t);
  const lines = s.split('\n'); let out = ''; let tbl = [];
  const flush = () => {
    if (tbl.length) {
      const rows = tbl.filter((r) => !/^[\s|:-]+$/.test(r));
      if (rows.length) {
        const cells = (r) => r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
        out += '<table>' + rows.map((r, i) => '<tr>' + cells(r).map((c) => `<t${i === 0 ? 'h' : 'd'}>${c}</t${i === 0 ? 'h' : 'd'}>`).join('') + '</tr>').join('') + '</table>';
      }
      tbl = [];
    }
  };
  for (const ln of lines) {
    if (/^\s*\|/.test(ln)) { tbl.push(ln); continue; }
    flush();
    out += (out ? '<br>' : '') + ln;
  }
  flush();
  return out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}

function ChatPage({ agent, onExit }) {
  const navigate = useNavigate();
  const [convs, setConvs] = useState(() => loadConvs(agent.id));
  const [activeId, setActiveId] = useState(() => (loadConvs(agent.id)[0]?.id ?? null));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState('');
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const isMascot = useMascot(agent);
  const gw = COLLEGE_MODELS[Number(agent.id)];
  const suggestions = Number(agent.id) === 111 ? SUGGEST_ALL : (agent.categoryKey === 'college' ? SUGGEST_COLLEGE : []);
  const storageKey = `v2-chat-${agent.id}`;
  const active = convs.find((c) => c.id === activeId);
  const [currentModel, setCurrentModel] = useState('');
  const [phIdx, setPhIdx] = useState(0);

  // placeholder 推荐问题：优先该智能体的建议，不足补通用问题
  const phPool = suggestions.length ? suggestions : SUGGEST_ALL;
  useEffect(() => {
    const t = setInterval(() => setPhIdx((i) => (i + 1) % phPool.length), 4000);
    return () => clearInterval(t);
  }, [phPool.length]);

  // 后台"大模型配置"当前生效的模型（脱敏公开端点）
  useEffect(() => {
    fetch(`${API_BASE}/configs/llm/current-model`).then((r) => r.json())
      .then((j) => setCurrentModel(j.data || '')).catch(() => {});
  }, []);

  // 持久化（最多 30 个会话）
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(convs.slice(0, 30))); } catch {} }, [convs, storageKey]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [active?.messages?.length, toolStatus]);

  const mutate = (convId, updater) => setConvs((prev) => prev.map((c) => (c.id === convId ? updater(c) : c)));
  const newChat = () => {
    const conv = { id: Date.now(), title: '新对话', messages: [], createdAt: Date.now() };
    setConvs((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setInput('');
    setLoading(false);
    setToolStatus('');
  };
  const delConv = (e, convId) => {
    e.stopPropagation();
    const conv = convs.find((c) => c.id === convId);
    if (conv && conv.messages.length > 0 && !window.confirm('确定删除这段对话历史吗？')) return;
    setConvs((prev) => {
      const next = prev.filter((c) => c.id !== convId);
      if (activeId === convId) setActiveId(next[0]?.id ?? null);
      return next;
    });
  };

  const welcome = () => ([
    { id: 'w', sender: 'agent', content: gw
      ? `你好，我是**${agent.name}**。${agent.description || ''}\n\n我接入了学院 MCP 数据查询服务，可直接查询学校数仓的实时数据（考勤、学籍、科研、消费等）。注意：考勤类数据约有 1–2 天同步延迟。`
      : `你好，我是**${agent.name}**。${agent.description || ''}\n\n该智能体的对话引擎正在接入中，当前可浏览广场其他智能体，或联系信息化与数据服务中心（dcc@wxit.edu.cn）咨询。` },
  ]);

  const msgs = active ? (active.messages.length ? active.messages : welcome()) : welcome();

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');
    // 无活动会话时自动开一段（首条消息即建会话）
    let convId = activeId;
    if (!convId) {
      convId = Date.now();
      const conv = { id: convId, title: content.slice(0, 20), messages: [], createdAt: Date.now() };
      setConvs((prev) => [conv, ...prev]);
      setActiveId(convId);
    }
    const userMsg = { id: Date.now(), sender: 'user', content };
    mutate(convId, (c) => ({ ...c, title: c.title === '新对话' ? content.slice(0, 20) : c.title, messages: [...c.messages, userMsg] }));
    if (!gw) {
      mutate(convId, (c) => ({ ...c, messages: [...c.messages, { id: Date.now() + 1, sender: 'agent', content: '该智能体的对话引擎正在接入中。你可以在广场选择学院锡锡导员或全校数据查询进行实时数据问答。' }] }));
      return;
    }
    setLoading(true); setToolStatus('');
    const genId = Date.now() + 1;
    mutate(convId, (c) => ({ ...c, messages: [...c.messages, { id: genId, sender: 'agent', content: '', streaming: true }] }));
    try {
      const _tk = localStorage.getItem('user_token');
      const resp = await fetch(`${GATEWAY_BASE}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(_tk ? { Authorization: `Bearer ${_tk}` } : {}) },
        body: JSON.stringify({ model: gw, messages: [{ role: 'user', content }], stream: true }),
      });
      if (!resp.ok || !resp.body) {
        if (resp.status === 401 || resp.status === 403) {
          let reason = '当前账号无该数据查询权限';
          try { const j = await resp.json(); reason = j?.error?.message || reason; } catch {}
          mutate(convId, (c) => ({ ...c, messages: [...c.messages, { id: Date.now() + 1, sender: 'agent', content: `⚠ ${reason}` }] }));
          setLoading(false);
          return;
        }
        throw new Error(`HTTP ${resp.status}`);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buf = ''; let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop();
        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') continue;
            let evt; try { evt = JSON.parse(payload); } catch { continue; }
            if (evt.type === 'tool') setToolStatus(evt.data?.message || '正在查询数据库…');
            else if (evt.type === 'text') {
              acc += evt.data ?? '';
              const content2 = acc;
              mutate(convId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === genId ? { ...m, content: content2 } : m)) }));
            }
          }
        }
      }
      mutate(convId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === genId ? { ...m, content: acc, streaming: false, note: '数据来源：学校数据中台 · 实时查询' } : m)) }));
    } catch (e) {
      mutate(convId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === genId ? { ...m, content: '查询失败：' + (e.message || '网络异常') + '，请稍后重试。', streaming: false } : m)) }));
    }
    setLoading(false); setToolStatus('');
  };

  return (
    <div className="v2-chat-shell v2-chat-wide">
      {/* 左：返回广场（独立于历史栏）+ 历史会话 */}
      <div className="v2-chat-left">
        <button className="v2-back-plaza" onClick={() => navigate('/')}>
          <Icon name="back" size={14} /> 返回广场
        </button>
        <aside className="v2-chat-history">
        <button className="v2-btn" style={{ width: '100%', marginBottom: 12 }} onClick={newChat}>＋ 新对话</button>
        <div className="v2-conv-list">
          {convs.map((c) => (
            <div key={c.id} className={`v2-conv-item${c.id === activeId ? ' on' : ''}`} onClick={() => setActiveId(c.id)}>
              <span className="t">{c.title}</span>
              <button className="rm" onClick={(e) => delConv(e, c.id)} title="删除">✕</button>
            </div>
          ))}
          {!convs.length && <div style={{ fontSize: 11.5, color: 'var(--p-t4)', textAlign: 'center', padding: '12px 0' }}>暂无历史对话</div>}
        </div>
        </aside>
      </div>

      {/* 中：对话 */}
      <div className="v2-chat-col">
        <div className="v2-chat-head">
          <div className="em"><AgentAvatar agent={agent} size={30} /></div>
          <div>
            <div className="t">{agent.name}</div>
            <div className="d">{agent.description || ''}</div>
          </div>
          <div style={{ flex: 1 }} />
          <span className="v2-model-chip">{gw ? `MCP：${gw}` : '平台默认模型'}</span>
        </div>
        <div className="v2-chat-scroll" ref={scrollRef}>
          {msgs.map((m) => (
            <div key={m.id} className={`v2-msg ${m.sender === 'user' ? 'user' : 'ai'}`}>
              {m.sender === 'user'
                ? <div className="who">我</div>
                : <div className="who"><AgentAvatar agent={agent} size={26} /></div>}
              <div className="v2-bubble v2-md">
                {m.sender === 'user'
                  ? <div dangerouslySetInnerHTML={{ __html: escapeHtml2(m.content).replace(/\n/g, '<br>') }} />
                  : m.content
                    ? <div dangerouslySetInnerHTML={{ __html: renderMd(m.content) }} />
                    : <div className="v2-loading-inline"><span className="v2-typing"><i></i><i></i><i></i></span>{toolStatus || '正在思考…'}</div>}
                {m.sender === 'agent' && !m.streaming && m.note && <div className="v2-note-line">{m.note}</div>}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
        <div className="v2-chat-inputbar">
          <div className="v2-suggests">
            {suggestions.map((q, i) => <span key={i} className="v2-sug" onClick={() => send(q)}>{q}</span>)}
          </div>
          <div className="v2-input-box">
            <textarea
              rows={1}
              value={input}
              placeholder={`试试问：${phPool[phIdx % phPool.length]}` || '输入你的问题…'}
              onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px'; }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <button className="v2-send" onClick={() => send()} disabled={loading} title="发送"><Icon name="send" size={17} /></button>
          </div>
          <div className="v2-input-hint">Enter 发送 · Shift + Enter 换行 · 内容由 AI 生成，请注意核对</div>
        </div>
      </div>

      {/* 右：智能体信息 */}
      <aside className="v2-chat-side">
        <div className="v2-side-card">
          <div className="t">智能体信息</div>
          <div className="em"><AgentAvatar agent={agent} size={48} /></div>
          <div className="nm">{agent.name}</div>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <span className="v2-tag blue">{agent.categoryName}</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="v2-kvv"><span className="k">使用模型</span><span className="v" style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11.5 }}>{currentModel || (gw ? '平台默认' : '—')}</span></div>
            <div className="v2-kvv"><span className="k">MCP 服务</span><span className="v" style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11.5 }}>{gw || '—'}</span></div>
            <div className="v2-kvv"><span className="k">累计访问</span><span className="v">{(agent.visitCount || 0).toLocaleString()} 次</span></div>
            <div className="v2-kvv"><span className="k">数据更新</span><span className="v">每日自动同步</span></div>
          </div>
        </div>
        <div className="v2-side-card">
          <div className="t">使用提示</div>
          <div style={{ fontSize: 11.5, color: 'var(--p-t3)', lineHeight: 1.75, marginTop: 8 }}>
            ① 直接用自然语言提问，如「查一下机械学院昨天的晚归人数」。<br />
            ② 涉及个人信息的查询仅限授权岗位，结果请勿外传。<br />
            ③ 数据来自学校数仓，考勤类数据约有 1–2 天同步延迟。
          </div>
        </div>
      </aside>
    </div>
  );
}

function loadConvs(agentId) {
  try { return JSON.parse(localStorage.getItem(`v2-chat-${agentId}`) || '[]'); } catch { return []; }
}

/* ============ 模型服务 ============ */
function Models({ toast }) {
  const [tab, setTab] = useState('general');
  const [q, setQ] = useState('');
  const [mg, setMg] = useState(null);
  const [mv, setMv] = useState(null);
  useEffect(() => {
    fetch(`${API_BASE}/models?category=general&size=50`).then((r) => r.json())
      .then((j) => setMg(j.data?.records || [])).catch(() => setMg([]));
    fetch(`${API_BASE}/models?category=vertical&size=50`).then((r) => r.json())
      .then((j) => setMv(j.data?.records || [])).catch(() => setMv([]));
  }, []);
  if (!mg || !mv) return <div className="v2-body"><XixiLoading text="AI加载数据中…" /></div>;
  const all = tab === 'general' ? mg : mv;
  const list = q ? all.filter((m) => [m.name, m.provider, m.type, m.description, ...(m.tags || [])].join(' ').toLowerCase().includes(q.toLowerCase())) : all;
  const provLogo = (m) => {
    if (m.iconUrl) return m.iconUrl; // 后台配置的图标优先
    const n = ((m.name || '') + (m.provider || '')).toLowerCase();
    if (n.includes('qwen')) return './v2-qwen.svg';
    if (n.includes('baai') || n.includes('bge')) return './v2-zhiyuan.svg';
    if (n.includes('deep')) return './v2-deepseek.svg';
    if ((m.provider || '').includes('无锡职大')) return './v2-xixi.png';
    return null;
  };
  // 背景 logo 墙：供应商 logo 淡色错落排布
  const bgLogos = [
    { src: './v2-deepseek.svg', x: 3, y: 6, s: 150, r: -14 },
    { src: './v2-qwen.svg', x: 14, y: 38, s: 110, r: 10 },
    { src: './v2-zhiyuan.svg', x: 7, y: 66, s: 130, r: -8 },
    { src: './v2-qwen.svg', x: 24, y: 12, s: 90, r: 16 },
    { src: './v2-deepseek.svg', x: 84, y: 10, s: 120, r: 12 },
    { src: './v2-zhiyuan.svg', x: 90, y: 44, s: 150, r: -12 },
    { src: './v2-qwen.svg', x: 82, y: 74, s: 100, r: -16 },
    { src: './v2-xixi.png', x: 40, y: 82, s: 90, r: 8 },
    { src: './v2-deepseek.svg', x: 60, y: 4, s: 80, r: 18 },
    { src: './v2-zhiyuan.svg', x: 55, y: 88, s: 110, r: 10 },
    { src: './v2-qwen.svg', x: 72, y: 30, s: 70, r: -20 },
    { src: './v2-deepseek.svg', x: 18, y: 88, s: 95, r: 6 },
  ];
  return (
    <>
      <div className="v2-models-bg" aria-hidden="true">
        {bgLogos.map((l, i) => (
          <img key={i} src={l.src} alt="" style={{ left: `${l.x}%`, top: `${l.y}%`, width: l.s, transform: `rotate(${l.r}deg)` }} />
        ))}
      </div>
      <div className="v2-sec-head v2-models-head">
        <h2>模型服务</h2>
        <p>学校本地部署与外部合作的大模型能力统一纳管 · 智能体经平台统一调用 · 公测期间服务可能偶发波动，敬请谅解</p>
      </div>
      <div className="v2-body" style={{ maxWidth: 1240 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div className="v2-tabs">
            <div className={`v2-tab${tab === 'general' ? ' on' : ''}`} onClick={() => setTab('general')}>通用<span className="n">{mg.length}</span></div>
            <div className={`v2-tab${tab === 'vertical' ? ' on' : ''}`} onClick={() => setTab('vertical')}>垂类<span className="n">{mv.length}</span></div>
          </div>
          <div className="v2-m-search">
            <Icon name="search" size={15} style={{ color: 'var(--p-t4)', flexShrink: 0 }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索模型名称 / 供应商 / 类型 / 标签…" />
            <span className="cnt">{q ? `${list.length} / ${all.length}` : `共 ${all.length} 个`}</span>
          </div>
        </div>
        <div className="v2-model-grid" style={{ marginTop: 16 }}>
          {list.length ? list.map((m) => {
            const logo = provLogo(m);
            const bld = (m.tags || []).includes('建设中');
            return (
              <div key={m.id} className={`v2-mdl-card${bld ? ' building' : ''}`}>
                <div className="v2-mdl-top">
                  <span className="pv">{logo
                    ? <img src={logo} alt={m.provider || ''} onError={(e) => { e.target.style.display = 'none'; }} />
                    : <Icon name="chip" size={19} />}</span>
                  <span className="nm">{m.name}</span>
                </div>
                <div className="ds">{m.description || ''}</div>
                <div className="v2-ft" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 13, paddingTop: 12, borderTop: '1px solid #F3F6FA', gap: 8, flexWrap: 'wrap' }}>
                  <span>{(m.tags || []).map((t, i) => <span key={i} className={`v2-tag ${t === '接入中' ? 'mid' : t === '建设中' ? 'off' : 'blue'}`}>{t}</span>)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--p-t4)' }}>{m.provider || '—'} · {m.type || ''}</span>
                    {bld
                      ? <span className="v2-dot-off"><i />建设中</span>
                      : <span className="v2-dot-on"><i />{(m.tags || []).includes('接入中') ? '接入中' : '服务中'}</span>}
                  </span>
                </div>
              </div>
            );
          }) : <div className="v2-empty">没有找到匹配的模型，换个关键词试试</div>}
        </div>
        <div className="v2-banner" style={{ marginTop: 22 }}>
          <div className="ic"><Icon name="doclog" size={26} /></div>
          <div>
            <div className="t">学院如何接入模型能力？</div>
            <div className="d">模型池面向全校开放：既包括<b>学校本地部署</b>的通用与垂类模型，也包括<b>外部合作伙伴</b>提供的模型服务。各学院如有专业垂类模型建设或模型调用需求，可联系<b>信息化与数据服务中心</b>提出申请，我们将协助完成评估、接入与智能体挂载。</div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ============ 开发平台 landing ============ */
/* ============ 开发平台使用指南（Dify 真实操作流程） ============ */
function DevGuide({ onClose, toast }) {
  const steps = [
    { no: '01', t: '提交开通申请', ic: 'doclog', body: [
      ['联系信息化与数据服务中心', '邮箱 dcc@wxit.edu.cn，说明：所在学院/部门、联系人、拟开发的智能体名称与业务场景、预期服务对象。'],
      ['等待评估', '中心会对场景进行评估（模型资源、数据边界、安全合规），一般 1–3 个工作日回复。'],
      ['开通账号', '评估通过后，为申请单位开通开发者账号与专属工作空间。'],
    ]},
    { no: '02', t: '登录开发平台', ic: 'users', body: [
      ['打开平台', '浏览器访问 aiagent.wxut.edu.cn/apps（智能体开发平台），建议使用 Chrome / Edge。'],
      ['账号登录', '使用信息中心审核开通的开发者账号登录；未开通账号者无法进入开发平台。'],
      ['进入工作室', '登录后进入「工作室」，即可看到本单位的空白应用与已有应用。'],
    ]},
    { no: '03', t: '创建应用', ic: 'plus', body: [
      ['新建空白应用', '工作室 → 「创建空白应用」→ 选择类型：Chatbot（对话助手，最常用）/ Agent（自主调用工具）/ 工作流（多步骤流程）。'],
      ['填写应用信息', '应用名称建议带学院/业务前缀（如"机械学院-课程答疑"），便于后续审核与上架。'],
      ['选择编排方式', '基础编排适合简单问答；Chatflow 适合多轮对话与分支场景。'],
    ]},
    { no: '04', t: '编排与配置', ic: 'code', body: [
      ['提示词（Prompt）', '在「编排」页编写系统提示词，定义智能体的角色、回答边界与语气。这是效果的根基，建议写清"你是谁/服务谁/怎么答/不答什么"。'],
      ['接入模型', '平台默认模型为后台统一配置（当前 deepseek-v4-flash），无需自行申请密钥；高级场景可联系中心调整。'],
      ['挂载知识库', '「上下文」→ 添加知识库：上传课件/制度文件等（支持 PDF、Word、TXT、Markdown），平台自动分段向量化，让智能体基于你的资料回答。'],
      ['添加工具', '如需查询学校数据，可联系中心接入 MCP 查询服务（如学院学生数据 query-xxx 系列）。'],
    ]},
    { no: '05', t: '调试与预览', ic: 'search', body: [
      ['右侧预览', '编排页右侧可实时对话调试，逐轮验证回答效果。'],
      ['查看引用', '挂载知识库后，回答会标注引用来源，点击可核对原文。'],
      ['迭代提示词', '根据调试结果反复修改提示词与知识库，直到效果稳定。'],
    ]},
    { no: '06', t: '发布与上架广场', ic: 'heart', body: [
      ['发布应用', '调试完成后点「发布」，应用即在平台内可用，可通过链接分享给同事试用。'],
      ['申请上架广场', '如需面向全校师生，联系信息化与数据服务中心（dcc@wxit.edu.cn）登记：应用名称、图标、分类、一句话描述。'],
      ['审核上线', '中心审核通过后，应用卡片将出现在 AI中台智能体广场，全校可点开使用。'],
    ]},
  ];
  const faqs = [
    ['开发平台和 AI中台是什么关系？', 'AI中台（智能体广场）是全校师生的使用入口；开发平台是面向开发者的编排工具。你在开发平台创建的应用，经审核后可上架到广场供全校使用。'],
    ['我没有编程基础，能用吗？', '可以。平台是可视化编排（写提示词、拖节点），无需写代码；复杂逻辑建议先从 Chatbot + 知识库做起。'],
    ['能调用学校的数据吗？', '可以。学生/教师/科研等数据查询已封装为 MCP 服务（如各学院 query-xxx），联系中心评估接入；敏感数据有权限边界。'],
    ['上架广场需要什么条件？', '应用有明确服务对象与场景、回答准确无违规内容、经所在单位同意。中心审核内容与安全性后上架。'],
    ['费用与资源限制？', '公测期间免费；平台统一提供模型算力，暂不对单个应用限额，如有大流量场景请提前与中心沟通。'],
  ];
  return (
    <div className="v2-body" style={{ maxWidth: 1000 }}>
      <button className="v2-btn ghost" onClick={onClose} style={{ marginBottom: 14 }}>← 返回平台介绍</button>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--aink)' }}>使用指南</div>
      <p style={{ fontSize: 13, color: 'var(--p-t3)', margin: '4px 0 22px' }}>从申请开通到上架广场的完整流程 · 基于智能体开发平台（aiagent.wxut.edu.cn）实际操作整理</p>

      {steps.map((st) => (
        <div key={st.no} className="v2-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--el-primary-l9)', color: 'var(--el-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{st.no}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--aink)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name={st.ic} size={18} /> {st.t}
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            {st.body.map(([k, v], i) => (
              <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, lineHeight: 1.75 }}>
                <span style={{ color: 'var(--el-primary)', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 110 }}>{k}</span>
                <span style={{ color: 'var(--p-t2)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--aink)', margin: '30px 0 14px' }}>常见问题</div>
      <div className="v2-card">
        {faqs.map(([q, a], i) => (
          <div key={i} style={{ padding: '13px 0', borderBottom: i < faqs.length - 1 ? '1px solid #F3F6FA' : 'none' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--aink)' }}><span style={{ color: 'var(--el-primary)' }}>Q{i + 1}</span>　{q}</div>
            <div style={{ fontSize: 12.5, color: 'var(--p-t3)', marginTop: 6, paddingLeft: 30, lineHeight: 1.75 }}>{a}</div>
          </div>
        ))}
      </div>

      <div className="v2-notice warn" style={{ marginTop: 18 }}>
        <span style={{ flexShrink: 0, marginTop: 2 }}><Icon name="warn" size={15} /></span>
        <span>本指南基于平台当前版本整理，功能迭代后以平台内实际界面为准；遇到问题可联系信息化与数据服务中心（dcc@wxit.edu.cn）。</span>
      </div>
    </div>
  );
}

function Dev({ toast }) {
  const [showGuide, setShowGuide] = useState(false);
  const feats = [
    ['code', '可视化编排', '拖拽节点搭建工作流，条件分支、循环、并行皆可编排，所见即所得。'],
    ['chip', '模型自由选择', '接入平台模型池：本地部署的通用与垂类模型、外部合作模型，按需调用。'],
    ['book', '知识库挂载', '上传课件、制度文件等资料构建专属知识库，让智能体带着你的资料回答。'],
    ['spark', '调试与预览', '实时预览对话效果，逐节点查看输入输出，调试通过再发布。'],
    ['heart', '上架智能体广场', '开发完成的应用经审核后可上架广场，供全校师生使用，成果全校共享。'],
    ['gear', '统一身份认证', '学校统一身份认证单点登录，账号权限由信息化与数据服务中心统一管理。'],
  ];
  const steps = [
    ['01', '提交开通申请', '各学院、部门如有开发需求，请联系信息化与数据服务中心（邮箱 dcc@wxit.edu.cn），说明单位、联系人、拟开发的智能体场景与预期用途。'],
    ['02', '评估与开通', '中心对场景进行评估，确认模型资源与数据边界；通过后为申请单位开通开发者账号与工作空间。'],
    ['03', '开发与调试', '登录平台创建应用，编排工作流、配置提示词与知识库，实时预览调试效果。'],
    ['04', '审核上架', '调试完成后提交审核；审核通过即可上架智能体广场，供全校师生使用。'],
  ];
  if (showGuide) return <DevGuide onClose={() => setShowGuide(false)} toast={toast} />;
  return (
    <>
      <div className="v2-hero" style={{ background: 'linear-gradient(135deg,#f6f9ff,#fff 55%,#f0f5ff)', textAlign: 'left' }}>
        <div className="v2-hero-inner" style={{ gridTemplateColumns: '1.15fr 1fr', gap: 44, alignItems: 'center' }}>
          <div>
            <div className="v2-kicker">AGENT DEVELOPMENT PLATFORM</div>
            <h1 style={{ fontSize: 32 }}>智能体开发平台</h1>
            <p className="sub" style={{ maxWidth: 560, marginTop: 12, fontSize: 14.5, lineHeight: 1.85 }}>
              面向全校师生的智能体可视化编排平台 —— 无需编程，像搭积木一样创建属于自己的 AI 应用：编排流程、配置提示词、挂载知识库、调试预览，一步到位。
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 26, flexWrap: 'wrap' }}>
              <button className="v2-btn lg" onClick={() => window.open('https://aiagent.wxut.edu.cn/apps', '_blank')}>进入开发平台 →</button>
              <button className="v2-btn ghost lg" onClick={() => { setShowGuide(true); window.scrollTo(0, 0); }}>使用指南</button>
              <span style={{ fontSize: 11.5, color: 'var(--p-t4)' }}>已开通账号 · 学校统一身份认证登录</span>
            </div>
          </div>
          <div style={{ background: 'var(--p-surface)', border: '1px solid var(--p-line2)', borderRadius: 16, boxShadow: '0 24px 60px #1a315224', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F8FAFC', borderBottom: '1px solid var(--p-line)', padding: '10px 14px' }}>
              <i style={{ width: 9, height: 9, borderRadius: '50%', background: '#FCA5A5' }} />
              <i style={{ width: 9, height: 9, borderRadius: '50%', background: '#FCD34D' }} />
              <i style={{ width: 9, height: 9, borderRadius: '50%', background: '#86EFAC' }} />
              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--p-t4)', fontFamily: 'ui-monospace,Menlo,monospace' }}>aiagent.wxut.edu.cn/apps</span>
            </div>
            <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {[['⌨', '开始', '输入问题'], ['◈', '大模型', 'deepseek-v4-flash'], ['▤', '知识库', '课程资料 · 制度文件'], ['✓', '回答', '带原文出处']].map(([ic, t, d], i) => (
                <React.Fragment key={i}>
                  {i > 0 && <div style={{ color: '#B6C4DB', fontSize: 15, lineHeight: 1.5, margin: '2px 0' }}>↓</div>}
                  <div style={{
                    width: 230, border: '1.5px solid var(--p-line2)', background: '#FDFEFF', borderRadius: 11,
                    padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                    boxShadow: '0 3px 10px #1a31520d', transform: i % 2 === 1 ? 'translateX(26px)' : (i === 2 ? 'translateX(-26px)' : 'none'),
                  }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--el-primary-l9)', color: 'var(--el-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{ic}</span>
                    <div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--aink)', lineHeight: 1.3 }}>{t}</div><div style={{ fontSize: 10.5, color: 'var(--p-t4)' }}>{d}</div></div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="v2-body" style={{ maxWidth: 1160 }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--aink)', margin: '36px 0 18px' }}>平台能做什么</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {feats.map(([ic, t, d], i) => (
            <div key={i} className="v2-card">
              <div style={{ color: 'var(--el-primary)', display: 'flex', marginBottom: 11 }}><Icon name={ic} size={22} /></div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--aink)' }}>{t}</div>
              <div style={{ fontSize: 12.5, color: 'var(--p-t3)', marginTop: 6, lineHeight: 1.7 }}>{d}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--aink)', margin: '40px 0 18px' }}>如何开通使用</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {steps.map(([no, t, d]) => (
            <div key={no} className="v2-card" style={{ padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--el-primary)', letterSpacing: 2 }}>{no}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--aink)', marginTop: 8 }}>{t}</div>
              <div style={{ fontSize: 12, color: 'var(--p-t3)', marginTop: 7, lineHeight: 1.75 }}>{d}</div>
            </div>
          ))}
        </div>
        <div className="v2-notice warn" style={{ marginTop: 16 }}>
          <span style={{ flexShrink: 0, marginTop: 2 }}><Icon name="warn" size={15} /></span>
          <span><b>平台实行申请开通制：</b>智能体开发平台不对全员默认开放，需由所在学院 / 部门向信息化与数据服务中心提出申请，开通后使用学校统一身份认证登录。个人开发爱好者可先在「知识库中心」体验文档问答能力，有正式场景再申请开发者权限。</span>
        </div>
        <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#3B82F6)', borderRadius: 18, padding: 36, textAlign: 'center', color: '#fff', marginTop: 40 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>准备好创建你的第一个智能体了吗？</div>
          <div style={{ fontSize: 13, opacity: .85, marginTop: 8 }}>联系信息化与数据服务中心开通账号 · dcc@wxit.edu.cn</div>
          <button className="v2-btn lg" style={{ marginTop: 18, background: '#fff', color: 'var(--el-primary-d2)' }} onClick={() => window.open('https://aiagent.wxut.edu.cn/apps', '_blank')}>进入开发平台 →</button>
        </div>
      </div>
    </>
  );
}

/* ============ 简单内容页（campus/guide/about/kb 建设中） ============ */
function SimplePage({ kind }) {
  const MAP = {
    campus: ['数智化校园建设规划', '以 AI中台 为底座，教学 · 科研 · 管理 · 服务四线并进的智慧校园蓝图'],
    guide: ['操作指南', '三步上手 AI中台 · 完整手册可下载留存'],
    about: ['关于 AI中台', '无锡职业技术大学 · 信息化与数据服务中心 出品'],
    kb: ['知识库中心', '上传你的资料，AI 帮你读 —— 文档可检索、可提问、答案带出处'],
  };
  const [t, d] = MAP[kind] || MAP.campus;
  return (
    <>
      <div className="v2-sec-head"><h2>{t}</h2><p>{d}</p></div>
      <div className="v2-body" style={{ maxWidth: 900 }}>
        <div className="v2-banner">
          <div className="ic"><Icon name="info" size={26} /></div>
          <div>
            <div className="t">V2 版本建设中</div>
            <div className="d">该板块在 V2 中规划与 V1 相同的功能，内容与数据以 V1（当前正式版）为准，可从首页顶部返回。知识库中心为 V2 新增模块，能力建设中。</div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ============ 主应用 ============ */
export default function V2App() {
  const [page, setPage] = useState('plaza');
  const [agents, setAgents] = useState([]);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState('');
  const [chatAgent, setChatAgent] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, guest, casLogin, logout, requireLogin, hasPerm, hasAnyPerm, dataScope } = useV2User();
  // 敏感操作引导弹窗：{msg, kind} kind='login'(未登录引导登录) | 'perm'(已登录但无权限，纯提示)
  const [prompt, setPrompt] = useState(null);
  const setLoginPrompt = (msg) => setPrompt({ msg, kind: 'login' });
  const setPermPrompt = (msg) => setPrompt({ msg, kind: 'perm' });
  const [workbench, setWorkbench] = useState(null);   // 数据洞察：当前工作台
  const [teacherWizard, setTeacherWizard] = useState(false); // 教师工作台：智能填报向导
  const [teacherRec, setTeacherRec] = useState(null);  // 继续填报的记录 id
  const [insightTab, setInsightTab] = useState('overview'); // 数据洞察：公开洞察/工作台 tab

  // 路由驱动对话页：#/chat/{id}（含直接刷新/分享链接进入）
  useEffect(() => {
    const m = location.pathname.match(/^\/chat\/(\d+)/);
    if (m && !user && agents.length) {
      // 游客直接访问对话链接 → 引导登录（一次性提示，不重复弹）
      setLoginPrompt((prev) => prev || '使用智能体对话需要登录');
    }
    if (m) {
      const id = Number(m[1]);
      const found = agents.find((a) => a.id === id);
      if (found) setChatAgent(found);
      else if (agents.length) {
        // 列表已加载但找不到（如直接刷 URL）→ 拉详情
        getAgentDetail(id).then((d) => setChatAgent(d)).catch(() => navigate('/', { replace: true }));
      }
    } else {
      setChatAgent(null);
      const segs = location.pathname.replace(/^\/+/, '').split('/');
      const p = segs[0] || 'plaza';
      if (p === 'insight' && ['funding', 'safety', 'academic', 'mental'].includes(segs[1])) {
      if (!user) { setPage('insight'); return; } // 游客直入工作台 → 停在频道首页
      const need = 'insight.' + segs[1];
      if (!hasPerm(need)) { setPage('insight'); setPermPrompt('该分析工作台未对您的账号开放'); return; }
      setPage('insight'); setWorkbench(segs[1]); return;
    }
      if (p === 'teacher') { setPage('teacher'); setTeacherWizard(segs[1] === 'form'); return; }
      setTeacherWizard(false);
      setWorkbench(null);
      setPage(['plaza', 'models', 'insight', 'teacher', 'dev', 'kb', 'campus', 'guide', 'about'].includes(p) ? p : 'plaza');
    }
  }, [location.pathname, agents, navigate]);

  useEffect(() => {
    // includeBuilding=1：前台也取建设中卡片（显示工程图标，排序沉底）
    fetch(`${API_BASE}/agents?size=100&includeBuilding=1`).then((r) => r.json())
      .then((j) => setAgents(j.data?.records || [])).catch((e) => setLoadErr(e.message));
    fetch(`${API_BASE}/categories`).then((r) => r.json())
      .then((j) => setCats((j.data || []).filter((c) => c.status === 1))).catch(() => {});
  }, []);

  const nav = useCallback((p) => {
    setChatAgent(null);
    setPage(p);
    navigate(p === 'plaza' ? '/' : `/${p}`, { replace: true });
    window.scrollTo(0, 0);
  }, [navigate]);

  // V1 同款智能体唤起：externalUrl 外跳(带 sys.user_id)/college-query 进 V2 流式对话/其余进 V2 对话
  const launch = useCallback((a) => {
    if (!a) return;
    // 游客使用智能体：引导登录
    if (!requireLogin()) { setLoginPrompt('使用智能体对话需要登录'); return; }
    // RBAC 前端预检（后端为最终防线）：学院锡锡仅本院可用，全校锡锡需 chat.all
    if (a.collegeId != null && user && !hasPerm('chat.all')) {
      if (a.collegeId === 0) {
        setPermPrompt('全校锡锡面向校领导与管理员开放'); return;
      }
      if (a.collegeId !== user.collegeId) {
        setPermPrompt(`该智能体面向${a.collegeName || '其他学院'}老师开放`); return;
      }
    }
    launchAgentV2(navigate, a.id, user, (detail) => {
      navigate(`/chat/${a.id}`);
    });
  }, [navigate, user, requireLogin, hasPerm]);

  // 敏感页面守卫：知识库/开发平台（游客可看介绍，进入操作需登录）；RBAC 权限门
  const guardNav = useCallback((p, label) => {
    if ((p === 'kb' || p === 'dev') && !requireLogin()) { setLoginPrompt(`${label}需要登录后使用`); return; }
    if (p === 'insight' && user && !hasAnyPerm(['insight.funding', 'insight.safety', 'insight.academic', 'insight.mental'])) {
      setPermPrompt('AI数据洞察面向学工线老师开放'); return;
    }
    if (p === 'teacher' && user && !hasPerm('teacher.form')) {
      setPermPrompt('AI教师工作台暂未对您的账号开放'); return;
    }
    nav(p);
  }, [nav, requireLogin, user, hasPerm, hasAnyPerm]);

  // 打开智能填报向导（可带记录 id 继续填报）
  const openWizard = useCallback((recId) => {
    setTeacherRec(recId || null);
    navigate('/teacher/form');
    window.scrollTo(0, 0);
  }, [navigate]);

  // 路由进入对话页：chatAgent 由路由驱动
  if (chatAgent) return (
    <>
      <TopNav page="plaza" onNav={nav} user={user} guest={guest} onLogin={casLogin} onLogout={logout} perms={user?.perms} />
      <ChatPage agent={chatAgent} onExit={() => nav('plaza')} />
    </>
  );

  return (
    <>
      <TopNav page={page} onNav={(p) => guardNav(p, p === 'kb' ? '知识库中心' : '智能体开发平台')} user={user} guest={guest} onLogin={casLogin} onLogout={logout} perms={user?.perms} />
      {loadErr && <div className="v2-body"><div className="v2-empty">实时数据加载失败：{loadErr}</div></div>}
      {page === 'plaza' && (agents.length === 0 && !loadErr
        ? <div className="v2-body" style={{ paddingTop: 120 }}><XixiLoading text="锡锡正在为您准备广场…" /></div>
        : <Plaza agents={agents} cats={cats} q={q} setQ={setQ} onChat={launch} onNav={(p) => guardNav(p, p === 'kb' ? '知识库中心' : '智能体开发平台')} toast={toast} onXixiBlocked={() => setPermPrompt('全校锡锡面向校领导与管理员开放')} />)}
      {page === 'models' && <Models toast={toast} />}
      {page === 'insight' && !workbench && (
        <InsightHome tab={insightTab} setTab={setInsightTab} perms={user ? (user.perms || []) : []} onOpenWorkbench={(w) => {
          if (!requireLogin()) { setLoginPrompt(w.title + '需要登录后使用'); return; }
          if (!hasPerm('insight.' + w.key)) { setPermPrompt('该分析工作台未对您的账号开放'); return; }
          if (w.status === 'building') { toast('该分析应用建设中，敬请期待'); return; }
          setWorkbench(w.key);
          navigate('/insight/' + w.key);
        }} />
      )}
      {page === 'insight' && workbench === 'funding' && (
        <FundingWorkbench toast={toast} user={user} canExport={hasPerm('insight.export')} dataScope={dataScope} onBack={() => { setWorkbench(null); navigate('/insight'); }} />
      )}
      {page === 'insight' && ['safety', 'academic', 'mental'].includes(workbench) && (
        <SceneWorkbench sceneKey={workbench} toast={toast} user={user} canExport={hasPerm('insight.export')} dataScope={dataScope} onBack={() => { setWorkbench(null); navigate('/insight'); }} />
      )}
      {page === 'dev' && <Dev toast={toast} />}
      {page === 'teacher' && (
        <V2Teacher user={user} requireLogin={requireLogin} toast={toast}
          wizard={teacherWizard}
          openRecordId={teacherRec}
          openWizard={openWizard}
          onExitWizard={() => { setTeacherWizard(false); setTeacherRec(null); navigate('/teacher'); }}
          onNav={nav} />
      )}
      {['campus', 'guide', 'about', 'kb'].includes(page) && <SimplePage kind={page} />}
      <Footer onNav={(p) => guardNav(p, p === 'kb' ? '知识库中心' : '智能体开发平台')} toast={toast} />

      {prompt && (
        <div className="v2-modal-mask" onMouseDown={(e) => { if (e.target === e.currentTarget) setPrompt(null); }}>
          <div className="v2-modal" style={{ width: 400 }}>
            <div className="v2-md-head"><div className="t">{prompt.kind === 'perm' ? '暂无使用权限' : '需要登录'}</div><button className="v2-md-close" onClick={() => setPrompt(null)}>✕</button></div>
            <div className="v2-md-body" style={{ paddingBottom: 8 }}>
              <div style={{ textAlign: 'center', padding: '14px 0 6px' }}>
                <img src="./v2-logo.png" alt="" style={{ width: 52, height: 52, objectFit: 'contain' }} />
              </div>
              <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--aink)', fontWeight: 600, margin: '8px 0 4px' }}>{prompt.msg}</p>
              {prompt.kind === 'login' && (
                <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--p-t3)', margin: 0 }}>使用学校统一身份认证登录后即可继续<br />（游客可以浏览广场与模型服务）</p>
              )}
              {prompt.kind === 'perm' && (
                <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--p-t3)', margin: 0 }}>如需开通权限，请联系信息化与数据服务中心（dcc@wxit.edu.cn）</p>
              )}
            </div>
            <div className="v2-md-foot" style={{ justifyContent: 'center', gap: 10 }}>
              <button className="v2-btn ghost" onClick={() => setPrompt(null)}>继续浏览</button>
              {prompt.kind === 'login'
                ? <button className="v2-btn" onClick={() => { setPrompt(null); casLogin(); }}>统一身份认证登录</button>
                : <button className="v2-btn" onClick={() => setPrompt(null)}>我知道了</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
