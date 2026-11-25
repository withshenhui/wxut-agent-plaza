import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// 与 V1 完全一致的后端接口地址（request.js 同源相对路径策略）
const API_BASE = import.meta.env.PROD ? '/agent-plaza/api/v1' : '/api/v1';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon, AgentAvatar, COLLEGE_MODELS, GATEWAY_BASE, SUGGEST_COLLEGE, SUGGEST_ALL, useMascot, useToast, IconBuilding, Pager } from './ui.jsx';
import { getAgentDetail } from '../api/agent';
import { getPublicConfig } from '../api/config';
import { useV2User } from './V2User.jsx';
import { InsightHome, FundingWorkbench } from './V2Insight.jsx';
import { SceneWorkbench } from './V2Scene.jsx';
import V2Teacher from './V2Teacher.jsx';
import V2Knowledge from './V2Knowledge.jsx';
import { EmploymentWorkbench, EmploymentIntentCard, EmploymentJobCards, StudentProfileCard } from './V2Employment.jsx';
import { XixiLoading, confirmDialog } from './ui.jsx';
import { FEATURE_DEFAULTS, resolveFeatures, renderNavs, featureByKey, needOf } from './featureConfig.js';
import { parseSseEvents } from './sse.js';
import { marked } from 'marked';

// marked：GFM 表格 + 换行分段；raw HTML 一律转义防注入（V1 CollegeQueryPage 同款）
export function escapeHtml2(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
marked.use({
  breaks: true,
  gfm: true,
  renderer: { html(token) { return escapeHtml2(token.text); } },
});
export function renderMd(text, maxRef) {
  // 净化旧版历史数据中拼接的 HTML 尾注（改为 note 字段渲染）
  const cleaned = String(text || '').replace(/\n*<div class="v2-note-line">[\s\S]*?<\/div>\s*$/g, '').trim();
  try {
    let html = marked.parse(cleaned);
    // 正文里的引用标记 [n] → 可点击上标徽章（仅当该消息带引用数据时，编号越界保持原样）
    if (maxRef > 0) {
      html = html.replace(/\[(\d{1,2})\]/g, (m0, d) => {
        const no = Number(d);
        return no >= 1 && no <= maxRef
          ? `<sup class="v2-cref" data-ref="${no}" title="查看引用出处">[${no}]</sup>`
          : m0;
      });
    }
    return html;
  } catch { return escapeHtml2(cleaned); }
}

/** 点击正文引用标记 [n]：滚动到该条引用卡并高亮（气泡级查找——引用卡是正文容器的兄弟节点） */
export function jumpToCite(e) {
  const el = e.target.closest ? e.target.closest('.v2-cref') : null;
  if (!el) return;
  const no = Number(el.getAttribute('data-ref'));
  const bubble = e.currentTarget.closest('.v2-bubble') || e.currentTarget;
  const cite = Array.from(bubble.querySelectorAll('.v2-cite'))
    .find((x) => Number(x.getAttribute('data-no')) === no);
  if (!cite) return;
  cite.scrollIntoView({ behavior: 'smooth', block: 'center' });
  cite.classList.remove('hl');
  void cite.offsetWidth; // 重启动画
  cite.classList.add('hl');
  setTimeout(() => cite.classList.remove('hl'), 1800);
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
/** 兼容导出：后台「导航菜单」页（V2Admin.NavAdmin，Task 7 移除）仍从本模块 import 默认种子。
 *  改为由功能注册表 FEATURE_DEFAULTS.nav 派生，避免与注册表两处漂移；Task 6 起前台顶栏不再使用它。 */
export const NAV_DEFAULTS = FEATURE_DEFAULTS.nav.map((n) => ({ key: n.key, label: n.label }));

/** 功能注册表守卫（纯函数）：三处入口（直链 effect / guardNav / launch）统一走这里。
 *  - 功能缺失或 enabled=false → 未开放提示；
 *  - gate=login 且未登录 → 登录引导；
 *  - gate=perm 且已登录缺权限 → 权限提示。
 *  游客（无 user）始终放行浏览，仅在受控动作被触发时提示登录（保持既有行为）。 */
function gateCheck(feature, { user, perms, requireLogin, setLoginPrompt, setPermPrompt }) {
  if (!feature || feature.enabled === false) { setPermPrompt('该功能暂未开放'); return false; }
  const { gate, permKey } = needOf(feature);
  if (gate === 'login' && !requireLogin()) { setLoginPrompt('该功能需要登录后使用'); return false; }
  if (gate === 'perm' && user && permKey && !perms.includes(permKey)) {
    setPermPrompt('该功能未对您的账号开放，如需使用请联系管理员（dcc@wxit.edu.cn）');
    return false;
  }
  return true;
}

/** 顶栏导航：完全由功能注册表驱动（V2App 统一加载 resolved 后经 prop 传入）。
 *  加载期间（resolved===undefined）不渲染链接，避免闪现待隐藏项。 */
export function TopNav({ page, onNav, user, guest, onLogin, onLogout, perms, kbBadge, resolved }) {
  const NAVS = resolved === undefined ? [] : renderNavs(resolved, { user, perms });
  return (
    <nav className="v2-topnav">
      <a className="v2-brand" href="#/" onClick={(e) => { e.preventDefault(); onNav('plaza'); }}>
        <img src="./v2-logo.png?v=2" alt="无锡职业技术大学校徽" />
        <div><div className="t1">锡职大AI中台</div><div className="t2">WXUT AI Center</div></div>
      </a>
      <div className="v2-nav-links">
        {resolved === undefined ? null : NAVS.map((n) => n.external ? (
          <a key={n.key} className="v2-nav-link" href={n.href} target="_blank" rel="noreferrer">
            {n.label}{n.isNew && <span className="chip-new">NEW</span>}
          </a>
        ) : (
          <a key={n.key} className={`v2-nav-link${page === n.key ? ' active' : ''}`}
            href={n.key === 'plaza' ? '#/' : `#/${n.key}`}
            onClick={(e) => { e.preventDefault(); onNav(n.key); }}>
            {n.label}{n.isNew && <span className="chip-new">NEW</span>}
            {n.key === 'kb' && kbBadge > 0 && <span className="v2-nav-badge" />}
          </a>
        ))}
      </div>
      <div className="v2-nav-right">
        {user ? (
          <>
            <div className="v2-user" title="统一身份认证账号">
              <div className="ava">{(user.nickname || user.username || '用').slice(0, 1)}</div>
              <span className="nm">{user.nickname || user.username}</span>
              {user.collegeName && (
                <span className="v2-scope-badge" title={user.dataScope === 'all' ? '数据范围：全校' : '数据范围：本人学院'}>
                  {user.dataScope === 'all' ? '全校数据' : user.collegeName}
                </span>
              )}
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
export function Footer({ onNav, toast, resolved }) {
  // 管理后台入口随功能注册表显隐（admin.dashboard.enabled===false 时隐藏）；其余内容页入口不变
  const showAdmin = !resolved || resolved.byKey['admin.dashboard']?.enabled !== false;
  return (
    <footer className="v2-site-foot">
      <div className="v2-foot-inner">
        <div className="v2-foot-grid">
          <div className="v2-foot-brand">
            <div className="row">
              <img src="./v2-logo.png?v=2" alt="无锡职业技术大学校徽" />
              <div><div className="t1">锡职大AI中台</div><div className="t2">WXUT AI Center</div></div>
            </div>
            <div className="desc">无锡职业技术大学全校统一的智能体入口与 AI 能力底座。让 AI 成为校园的新基础设施 —— 智能体对话、制度问答、数据洞察、教师工作台与桌面客户端，点开即用。</div>
          </div>
          <div className="v2-foot-col">
            <div className="h">平台服务</div>
            <div className="lnk" onClick={() => onNav('plaza')}>智能体广场</div>
            <div className="lnk" onClick={() => onNav('insight')}>AI 数据洞察</div>
            <div className="lnk" onClick={() => onNav('teacher')}>AI教师工作台</div>
            <div className="lnk" onClick={() => onNav('kb')}>知识库中心</div>
            <div className="lnk" onClick={() => onNav('models')}>模型服务</div>
            <div className="lnk" onClick={() => window.open('/v2/harness/', '_blank')}>XixiBuddy 桌面客户端</div>
          </div>
          <div className="v2-foot-col">
            <div className="h">了解平台</div>
            <div className="lnk" onClick={() => onNav('campus')}>数智化校园 · AI科普</div>
            <div className="lnk" onClick={() => onNav('guide')}>操作指南</div>
            <div className="lnk" onClick={() => window.open('/feedback?source=web', '_blank')}>意见反馈</div>
            <div className="lnk" onClick={() => onNav('about')}>关于我们</div>
          </div>
          <div className="v2-foot-col">
            <div className="h">开发者</div>
            <div className="lnk" onClick={() => onNav('dev')}>智能体开发平台</div>
            <div className="lnk" onClick={() => onNav('guide')}>上架广场指引</div>
            <div className="lnk" onClick={() => onNav('kb')}>知识库（文档问答）</div>
            {showAdmin && <div className="lnk" onClick={() => { window.location.hash = '#/admin/login'; window.scrollTo(0, 0); }}>AI中台管理后台</div>}
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
  { b: '我是锡锡，你的校园 AI 助手', sub: '学习答疑 · 制度查询 · 数据洞察' },
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
          <h1>锡职大<span className="accent">AI中台</span> · 正式上线啦
            <span className="v2-confetti-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 10.6 2.9 21l10.4-1.6a1.4 1.4 0 0 0 .8-2.4L6.9 9.8a1.4 1.4 0 0 0-2.4.8z"/>
                <path d="M7.4 13.7l3.4 3.4"/>
                <path d="M11.5 8.5 13 4"/>
                <path d="M14.5 11.5 19 10"/>
                <path d="M11 14 8.5 16.5"/>
                <circle cx="17" cy="5" r="1.15" fill="currentColor" stroke="none"/>
                <circle cx="21" cy="8.5" r="1" fill="currentColor" stroke="none"/>
                <circle cx="16.5" cy="15" r="1" fill="currentColor" stroke="none"/>
              </svg>
            </span>
          </h1>
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
        <div className="v2-hero-side">
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

/* 就业助手：意向卡选项（与后端 guide 事件一致）——首屏即展示，对齐原型 */
const EMP_GUIDE = {
  cities: ['无锡', '苏州', '南京', '上海', '不限'],
  types: ['全职', '实习', '都看'],
  pays: ['5K 以下', '5-8K', '8-12K', '12K 以上', '不限'],
};

function ChatPage({ agent, onExit, onNeedLogin, user }) {
  const navigate = useNavigate();
  const [convs, setConvs] = useState(() => loadConvs(agent.id));
  // 就业助手：进入即呈现"欢迎词 + 意向卡"，不自动恢复上次会话（历史仍保留在左栏，可点开）
  const [activeId, setActiveId] = useState(() => (
    agent.agentType === 'native-employment' ? null : (loadConvs(agent.id)[0]?.id ?? null)));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState('');
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const isMascot = useMascot(agent);
  const gw = COLLEGE_MODELS[Number(agent.id)];
  const agentSuggest = (agent.suggest || '').split('|').map((x) => x.trim()).filter(Boolean);
  const suggestions = agentSuggest.length ? agentSuggest
    : Number(agent.id) === 111 ? SUGGEST_ALL : (agent.categoryKey === 'college' ? SUGGEST_COLLEGE : []);
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

  // 服务端对话历史：加载时拉API（跟登录人走），保存时双写API+localStorage
  const serverSessionIds = useRef({}); // convId -> server sessionId 映射
  const historyLoaded = useRef(false);
  const remoteReady = useRef(false);   // 服务端历史已就绪（或无需拉取）前不写服务端，避免把本地缓存当新会话重复创建
  const savedSig = useRef({});         // convId -> 已保存的最后一轮签名（防同一轮重复写、消息重复堆积）
  useEffect(() => {
    if (historyLoaded.current) return;
    historyLoaded.current = true;
    const tk = localStorage.getItem('user_token');
    if (!tk) { remoteReady.current = true; return; }
    fetch(`${API_BASE}/chat/history?agentId=${agent.id}`, { headers: { Authorization: `Bearer ${tk}` } })
      .then((r) => r.json()).then((j) => {
        const sessions = (j.data || []);
        if (!sessions.length) { remoteReady.current = true; return; }
        // 服务端有历史 → 覆盖本地（服务端是权威源）
        const remote = sessions.map((s) => ({
          id: Number(String(s.id).replace(/-/g, '').slice(0, 13)) || Date.now(),
          title: s.title || '对话',
          messages: (s.messages || []).map((m, i) => ({
            id: i, sender: m.sender, content: m.content,
            citations: null, guide: null, jobs: null, note: null,
          })),
          createdAt: s.createdAt || '',
        }));
        serverSessionIds.current = {};
        sessions.forEach((s, i) => {
          serverSessionIds.current[remote[i].id] = s.id;
        });
        setConvs(remote.slice(0, 30));
        // 就业助手：历史只进左栏列表，不自动打开（进入即欢迎词+意向卡，对齐原型）
        if (remote.length && agent.agentType !== 'native-employment') setActiveId(remote[0].id);
        remoteReady.current = true;
      }).catch(() => { remoteReady.current = true; });
  }, [agent.id]);

  // 对话完成后存服务端
  const saveToServer = async (convId, title, messages) => {
    const tk = localStorage.getItem('user_token');
    if (!tk || !messages || !messages.length) return;
    const sessionId = serverSessionIds.current[convId] || null;
    // 只存最近一轮（user + agent两条），sessionId为null时后端自动建
    const lastUser = [...messages].reverse().find((m) => m.sender === 'user');
    const lastAgent = [...messages].reverse().find((m) => m.sender === 'agent' && !m.streaming);
    if (!lastUser || !lastAgent) return;
    try {
      const r = await fetch(`${API_BASE}/chat/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body: JSON.stringify({
          agentId: agent.id,
          sessionId,
          title: title || convTitle(messages),
          messages: [
            { sender: 'user', content: lastUser.content },
            { sender: 'agent', content: lastAgent.content },
          ],
        }),
      });
      const j = await r.json();
      if (j.data && j.data.sessionId) serverSessionIds.current[convId] = j.data.sessionId;
      return true;
    } catch { return false; }
  };

  // 持久化（localStorage 作为缓存层 + 服务端调用）
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(convs.slice(0, 30))); } catch {}
    // 只在"本页新产生一轮对话"时写服务端：
    //  - remoteReady：等服务端历史加载完，避免把本地缓存当新会话又建一条
    //  - 消息 id 为时间戳（Date.now 量级）= 本页新生成；历史恢复的消息 id 是小序号 → 跳过
    //  - savedSig：同一轮只写一次，避免重复写导致消息重复堆积
    if (!remoteReady.current) return;
    const conv = convs[0];
    const lastMsg = conv?.messages?.[conv?.messages?.length - 1];
    if (!conv || !lastMsg || lastMsg.sender !== 'agent' || lastMsg.streaming) return;
    if (!(Number(lastMsg.id) > 1e12)) return;
    const sig = `${lastMsg.id}|${(lastMsg.content || '').length}`;
    if (savedSig.current[conv.id] === sig) return;
    savedSig.current[conv.id] = sig;
    saveToServer(conv.id, conv.title, conv.messages).then((ok) => { if (!ok) delete savedSig.current[conv.id]; });
  }, [convs, storageKey]);

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
  const delConv = async (e, convId) => {
    e.stopPropagation();
    const conv = convs.find((c) => c.id === convId);
    if (conv && conv.messages.length > 0 && !(await confirmDialog({ title: '删除对话', text: '确定删除这段对话历史吗？删除后不可恢复。', okText: '删除', danger: true }))) return;
    setConvs((prev) => {
      const next = prev.filter((c) => c.id !== convId);
      if (activeId === convId) setActiveId(next[0]?.id ?? null);
      return next;
    });
  };

  const isRag = agent.agentType === 'native-rag';
  const isEmp = agent.agentType === 'native-employment';
  // 就业智能体：登录后取学生画像，展示个性化欢迎
  const [empProfile, setEmpProfile] = useState(null);
  useEffect(() => {
    if (!isEmp || !user) return;
    const tk = localStorage.getItem('user_token');
    fetch(`${API_BASE}/employment/profile`, { headers: tk ? { Authorization: `Bearer ${tk}` } : {} })
      .then((r) => r.json()).then((j) => { if (j.data) setEmpProfile(j.data); }).catch(() => {});
  }, [isEmp, user]);
  // 意向卡城市：取自真实岗位库（/employment/meta），无数据时回退 EMP_GUIDE 默认选项
  const [empCities, setEmpCities] = useState(null);
  useEffect(() => {
    if (!isEmp || !user) return;
    const tk = localStorage.getItem('user_token');
    fetch(`${API_BASE}/employment/meta`, { headers: tk ? { Authorization: `Bearer ${tk}` } : {} })
      .then((r) => r.json()).then((j) => { const cs = j.data && j.data.cities; if (cs && cs.length) setEmpCities(cs); }).catch(() => {});
  }, [isEmp, user]);
  const empProfileCard = empProfile ? `\n\n**你的学籍信息：** ${empProfile.name || ''} · ${empProfile.college || ''} · ${empProfile.major || ''} · ${empProfile.grade || ''}级` : '';
  const welcome = () => ([
    { id: 'w', sender: 'agent', guide: isEmp ? (empCities && empCities.length ? { ...EMP_GUIDE, cities: [...empCities, '不限'] } : EMP_GUIDE) : null, content: (gw || isRag || isEmp)
      ? (isEmp
        ? `你好，我是**${agent.name}**～我已读取你的学籍与成绩信息（见上方档案卡），结合在库校招岗位为你匹配适合的工作。\n\n先告诉我你的**求职意向**，我来为你匹配在库校招岗位：`
        : isRag
        ? `你好，我是**${agent.name}**。${agent.description || ''}\n\n你可以直接和我聊天，也可以问我学校制度与办事流程问题——涉及制度的问题我会查询知识库并附原文出处。`
        : `你好，我是**${agent.name}**。${agent.description || ''}\n\n我接入了学院 MCP 数据查询服务，可直接查询学校数仓的实时数据（考勤、学籍、科研、消费等）。注意：考勤类数据约有 1–2 天同步延迟。`)
      : `你好，我是**${agent.name}**。${agent.description || ''}\n\n该智能体的对话引擎正在接入中，当前可浏览广场其他智能体，或联系信息化与数据服务中心（dcc@wxit.edu.cn）咨询。` },
  ]);

  const msgs = active ? (active.messages.length ? active.messages : welcome()) : welcome();

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    // 智慧就业助手依赖登录身份（登录账号=学号）读取学籍画像；游客直接引导登录，避免发出后落到 403
    if (isEmp && !localStorage.getItem('user_token')) {
      if (onNeedLogin) onNeedLogin('智慧就业助手需要登录后使用');
      return;
    }
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
    if (isRag || isEmp) {
      setLoading(true); setToolStatus('正在思考…');
      const genId = Date.now() + 1;
      mutate(convId, (c) => ({ ...c, messages: [...c.messages, { id: genId, sender: 'agent', content: '', streaming: true }] }));
      try {
        const _tk = localStorage.getItem('user_token');
        const _url = isEmp ? `${API_BASE}/employment/chat` : `${API_BASE}/kb/${agent.id}/chat`;
        const resp = await fetch(`${_url}?q=${encodeURIComponent(content)}`, {
          headers: _tk ? { Authorization: `Bearer ${_tk}` } : {},
        });
        if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
        const reader = resp.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buf = ''; let acc = ''; let cites = null; let guideData = null; let jobsData = null;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          // 只把已完整接收的块交给纯模块解析（末块留在 buf 等下一片，保持逐片上屏时机）
          const parts = buf.split('\n\n');
          buf = parts.pop();
          for (const { name: evtName, data } of parseSseEvents(parts.join('\n\n'))) {
            if (evtName === 'tool') { try { setToolStatus(JSON.parse(data).message || '检索中…'); } catch {} }
            else if (evtName === 'citation') { try { cites = JSON.parse(data); } catch {} }
            else if (evtName === 'guide') { try { guideData = JSON.parse(data); } catch {} }
            else if (evtName === 'jobs') {
              // 一到就上屏（后端会先发"规则排序"版再发"LLM 精排"版）→ 学生不用等正文流完才看到岗位卡
              try { jobsData = JSON.parse(data); mutate(convId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === genId ? { ...m, jobs: jobsData } : m)) })); } catch {}
            }
            else if (evtName === 'text') {
              try { acc += JSON.parse(data).data ?? ''; } catch {}
              // 逐片上屏：SSE 分片驱动原生打字机效果
              setToolStatus('');
              mutate(convId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === genId ? { ...m, content: acc } : m)) }));
            }
            else if (evtName === 'error') { let m = '服务异常'; try { m = JSON.parse(data).message || m; } catch {} throw new Error(m); }
          }
        }
        mutate(convId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === genId ? { ...m, content: acc || '（未检索到相关内容）', streaming: false, citations: cites, guide: guideData, jobs: jobsData, note: cites && cites.length ? '依据：' + cites.length + ' 条知识库出处' : null } : m)) }));
        // 对话用量上报（真实统计，供洞察页近7天对话）
        fetch(`${API_BASE}/insight/track-chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: agent.id }) }).catch(() => {});
      } catch (e) {
        mutate(convId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === genId ? { ...m, content: '查询失败：' + (e.message || '网络异常') + '，请稍后重试。', streaming: false } : m)) }));
      }
      setLoading(false); setToolStatus('');
      return;
    }
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
        // 只把已完整接收的块交给纯模块解析（末块留在 buf 等下一片，保持逐片上屏时机）
        const parts = buf.split('\n\n');
        buf = parts.pop();
        for (const { data } of parseSseEvents(parts.join('\n\n'))) {
          const payload = data.trim();
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
      mutate(convId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === genId ? { ...m, content: acc, streaming: false, note: '数据来源：学校数据中台 · 实时查询' } : m)) }));
      // 对话用量上报（真实统计，供洞察页近7天对话）
      fetch(`${API_BASE}/insight/track-chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: agent.id }) }).catch(() => {});
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
          <span className="v2-model-chip">{isEmp ? '校园就业 · 智能匹配' : isRag ? '知识库 RAG 问答' : (gw ? `MCP：${gw}` : '平台默认模型')}</span>
        </div>
        <div className="v2-chat-scroll" ref={scrollRef}>
          {isEmp && empProfile && <StudentProfileCard profile={empProfile} />}
          {msgs.map((m) => (
            <div key={m.id} className={`v2-msg ${m.sender === 'user' ? 'user' : 'ai'}`}>
              {m.sender === 'user'
                ? <div className="who">我</div>
                : <div className="who"><AgentAvatar agent={agent} size={26} /></div>}
              <div className="v2-bubble v2-md">
                {m.sender === 'user'
                  ? <div dangerouslySetInnerHTML={{ __html: escapeHtml2(m.content).replace(/\n/g, '<br>') }} />
                  : m.content
                    ? <div dangerouslySetInnerHTML={{ __html: renderMd(m.content, m.citations ? m.citations.length : 0) }} onClick={jumpToCite} />
                    : <div className="v2-loading-inline"><span className="v2-typing"><i></i><i></i><i></i></span>{toolStatus || '正在思考…'}</div>}
                {m.sender === 'agent' && !m.streaming && m.citations && m.citations.length > 0 && (
                  <div className="v2-cites">
                    <div className="v2-cites-t">原文引用（{m.citations.length}）</div>
                    {m.citations.map((c) => (
                      <div key={c.no} data-no={c.no} className="v2-cite" title={c.q || c.txt || c.a || '点击查看原文'}>
                        <span className="no">[{c.no}]</span>
                        <span className={`tag ${c.type === 'qa' ? 'blue' : 'grey'}`}>{c.type === 'qa' ? '问答' : '原文'}</span>
                        <span className="src">{c.doc}{c.loc ? ` · ${c.loc}` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
                {m.sender === 'agent' && !m.streaming && m.guide && (
                  <EmploymentIntentCard guide={m.guide} onSubmit={async (picked, summary) => {
                    const tk = localStorage.getItem('user_token');
                    try {
                      await fetch(`${API_BASE}/employment/intent`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: `Bearer ${tk}` } : {}) },
                        body: JSON.stringify(picked),
                      });
                    } catch (e) { /* 意向保存失败不阻塞推荐 */ }
                    send(summary || '帮我推荐适合我的岗位');
                  }} />
                )}
                {/* 岗位卡等"思考"结束（正文开始/回复完成）后再出现，避免与思考提示同时在场 */}
                {m.sender === 'agent' && m.jobs && m.jobs.length > 0 && (m.content || !m.streaming) && <EmploymentJobCards jobs={m.jobs} onAsk={(q) => send(q)} />}
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

      {/* 右：智能体信息（按智能体能力定制：RAG 制度类 / MCP 数据类） */}
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
            {isEmp
              ? <div className="v2-kvv"><span className="k">匹配引擎</span><span className="v">学籍画像 + 岗位库</span></div>
              : isRag
              ? <div className="v2-kvv"><span className="k">知识引擎</span><span className="v">RAG 检索 + 原文引用</span></div>
              : <div className="v2-kvv"><span className="k">MCP 服务</span><span className="v" style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11.5 }}>{gw || '—'}</span></div>}
            <div className="v2-kvv"><span className="k">累计访问</span><span className="v">{(agent.visitCount || 0).toLocaleString()} 次</span></div>
            {isEmp
              ? <div className="v2-kvv"><span className="k">岗位库更新</span><span className="v">主流招聘网站 · 每日自动同步</span></div>
              : isRag
              ? <div className="v2-kvv"><span className="k">知识库更新</span><span className="v">部门维护 · 即时生效</span></div>
              : <div className="v2-kvv"><span className="k">数据更新</span><span className="v">每日自动同步</span></div>}
          </div>
        </div>
        <div className="v2-side-card">
          <div className="t">使用提示</div>
          <div style={{ fontSize: 11.5, color: 'var(--p-t3)', lineHeight: 1.75, marginTop: 8 }}>
            {isEmp
              ? <>① 直接说「帮我推荐岗位」「我想找无锡的实习」，我会读取你的学籍信息（专业/年级）并匹配校招岗位。<br />
                 ② 每条推荐附匹配分、推荐理由与可补短板；岗位信息来自公开校招渠道，仅供参考。<br />
                 ③ 完善「就业意向」（城市/岗位类型/薪资）后推荐会更准。</>
              : isRag
              ? <>① 直接用自然语言提问，如「{phPool[phIdx % phPool.length] || '教师请假流程是什么'}」。<br />
                 ② 回答附「原文引用」，点击编号可查看出处文档与条款，重要事项请以原文为准。<br />
                 ③ 库内没有的问题会如实说明，建议咨询对应主管部门。</>
              : <>① 直接用自然语言提问，如「查一下机械学院昨天的晚归人数」。<br />
                 ② 涉及个人信息的查询仅限授权岗位，结果请勿外传。<br />
                 ③ 数据来自学校数仓，考勤类数据约有 1–2 天同步延迟。</>}
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
function curlOf(m) {
  const isLocal = (m.provider || '').includes('一体机');
  const base = isLocal ? 'https://aiask.wxut.edu.cn/llm/v1/chat/completions' : 'https://zhenze-huhehaote.cmecloud.cn/v1/chat/completions';
  return `curl --location "${base}" \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer api_key" \
  --data '{
  "model": "${m.name}",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "3.11和3.9谁大"}
  ],
  "stream": true
}'`;
}
function respOf(m) {
  return `{
  "id": "chatd8a3878-…", "object": "chat.completion", "created": 1764894852,
  "model": "${m.name}",
  "choices": [
    { "index": 0, "finish_reason": "stop",
      "message": { "role": "assistant", "content": "比较十分位：1 < 9，所以 3.11 < 3.9，3.9 更大。" } }
  ],
  "usage": { "prompt_tokens": 15, "completion_tokens": 120, "total_tokens": 135 }
}`;
}

function Models({ toast }) {
  const [tab, setTab] = useState('general');
  const [q, setQ] = useState('');
  const [mg, setMg] = useState(null);
  const [mv, setMv] = useState(null);
  const [sel, setSel] = useState(null);
  const [selBox, setSelBox] = useState(null); // 详情弹窗居中范围：右侧内容列的视口x区间（不含左侧筛选）
  const mainRef = useRef(null);
  const openSel = (m) => {
    setSel(m);
    const r = mainRef.current && mainRef.current.getBoundingClientRect();
    // 垂直居中区域排除顶栏：取 v2-topnav 实际高度
    const nav = document.querySelector('.v2-topnav');
    const navH = nav ? Math.round(nav.getBoundingClientRect().height) : 60;
    setSelBox(r ? { left: r.left, width: r.width, navH } : null);
  };
  const [copied, setCopied] = useState('');
  const [fProv, setFProv] = useState({});   // 左侧筛选：供应商
  const [fType, setFType] = useState({});   // 左侧筛选：模型类型
  const [page, setPage] = useState(1);
  const doCopy = (txt, key) => {
    navigator.clipboard?.writeText(txt).then(() => { setCopied(key); toast('已复制到剪贴板'); setTimeout(() => setCopied(''), 1800); }).catch(() => toast('复制失败，请手动选择复制'));
  };
  useEffect(() => {
    fetch(`${API_BASE}/models?category=general&size=200`).then((r) => r.json())
      .then((j) => setMg(j.data?.records || [])).catch(() => setMg([]));
    fetch(`${API_BASE}/models?category=vertical&size=200`).then((r) => r.json())
      .then((j) => setMv(j.data?.records || [])).catch(() => setMv([]));
  }, []);
  // 弹窗打开时锁定背景滚动（模态框惯例，与 ui.jsx 的 Modal 行为一致）
  useEffect(() => {
    if (!sel) return;
    document.body.classList.add('v2-modal-open');
    return () => document.body.classList.remove('v2-modal-open');
  }, [sel]);
  // 筛选/搜索/切 tab 时回到第一页
  useEffect(() => { setPage(1); }, [tab, q, fProv, fType]);
  if (!mg || !mv) return <div className="v2-body"><XixiLoading text="AI加载数据中…" /></div>;
  const all = tab === 'general' ? mg : mv;
  // 左侧筛选统计（按当前 tab 数据）
  const provs = Array.from(all.reduce((mp, m) => mp.set(m.provider || '—', (mp.get(m.provider || '—') || 0) + 1), new Map()).entries()).sort((a, b) => b[1] - a[1]);
  const types = Array.from(all.reduce((mp, m) => mp.set(m.type || '—', (mp.get(m.type || '—') || 0) + 1), new Map()).entries()).sort((a, b) => b[1] - a[1]);
  const provSel = Object.keys(fProv).filter((k) => fProv[k]);
  const typeSel = Object.keys(fType).filter((k) => fType[k]);
  const filtered = all.filter((m) =>
    (!q || [m.name, m.provider, m.type, m.description, ...(m.tags || [])].join(' ').toLowerCase().includes(q.toLowerCase())) &&
    (provSel.length === 0 || provSel.includes(m.provider || '—')) &&
    (typeSel.length === 0 || typeSel.includes(m.type || '—')));
  const PAGE_SIZE = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const list = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);
  const toggleF = (setter) => (key) => setter((prev) => ({ ...prev, [key]: !prev[key] }));
  const filterActive = provSel.length > 0 || typeSel.length > 0 || !!q;
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
        <p>学校本地部署与外部合作的大模型能力统一纳管 · 智能体经平台统一调用</p>
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
            <span className="cnt">{filterActive ? `${filtered.length} / ${all.length}` : `共 ${all.length} 个`}</span>
          </div>
        </div>
        <div className="v2-mdl-layout">
          <aside className="v2-mdl-filter">
            <div className="fh"><span>筛选</span>{(provSel.length || typeSel.length) ? <span className="rst" onClick={() => { setFProv({}); setFType({}); }}>重置</span> : null}</div>
            <div className="fgrp">
              <div className="ft">模型供应商</div>
              {provs.map(([p, n]) => (
                <label key={p} className={`fopt${fProv[p] ? ' on' : ''}`} onClick={() => toggleF(setFProv)(p)}>
                  <i className="cbx" /><span className="lb">{p}</span><em>{n}</em>
                </label>
              ))}
            </div>
            <div className="fgrp">
              <div className="ft">模型类型</div>
              {types.map(([t, n]) => (
                <label key={t} className={`fopt${fType[t] ? ' on' : ''}`} onClick={() => toggleF(setFType)(t)}>
                  <i className="cbx" /><span className="lb">{t}</span><em>{n}</em>
                </label>
              ))}
            </div>
          </aside>
          <div className="v2-mdl-main" ref={mainRef}>
        <div className="v2-model-grid" style={{ marginTop: 0 }}>
          {list.length ? list.map((m) => {
            const logo = provLogo(m);
            const bld = (m.tags || []).includes('建设中');
            return (
              <div key={m.id} className={`v2-mdl-card${bld ? ' building' : ''}`} style={{ cursor: 'pointer' }} onClick={() => openSel(m)} title="点击查看 API 调用说明">
                <div className="v2-mdl-top">
                  <span className="pv">{logo
                    ? <img src={logo} alt={m.provider || ''} onError={(e) => { e.target.style.display = 'none'; }} />
                    : <Icon name="chip" size={19} />}</span>
                  <span className="nm">{m.name}</span>
                </div>
                <div className="ds">{m.description || ''}</div>
                <div style={{ marginTop: 13, paddingTop: 12, borderTop: '1px solid #F3F6FA' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>{(m.tags || []).filter((t) => t !== '校园免费').map((t, i) => <span key={i} className={`v2-tag ${t === '接入中' ? 'mid' : t === '建设中' ? 'off' : 'blue'}`}>{t}</span>)}</span>
                    {bld
                      ? <span className="v2-dot-off"><i />建设中</span>
                      : <span className="v2-dot-on"><i />{(m.tags || []).includes('接入中') ? '接入中' : '服务中'}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--p-t4)', marginTop: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.provider || '—'} · {m.type || ''}</div>
                </div>
              </div>
            );
          }) : <div className="v2-empty">没有找到匹配的模型，换个关键词或筛选条件试试</div>}
        </div>
        {filtered.length > PAGE_SIZE && (
          <div className="v2-mdl-pager">
            <span className="tot">共 {filtered.length} 个模型 · 第 {curPage}/{totalPages} 页</span>
            <Pager page={curPage} total={filtered.length} size={PAGE_SIZE} onPage={setPage} />
          </div>
        )}
          </div>
        </div>
        {sel && selBox && (
          <>
            <div className="v2-modal-mask" style={{ background: 'rgba(15,23,42,.16)' }} onClick={(e) => { if (e.target === e.currentTarget) setSel(null); }} />
            <div style={{ position: 'fixed', left: selBox.left, top: selBox.navH, width: selBox.width, height: `calc(100vh - ${selBox.navH}px)`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, pointerEvents: 'none' }}>
              <div className="v2-modal" onClick={(e) => e.stopPropagation()} style={{ width: 860, height: 'calc(100vh - 180px)', pointerEvents: 'auto' }}>
              <div className="v2-md-head">
                <div style={{ minWidth: 0 }}>
                  <div className="t" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sel.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--p-t3)', fontWeight: 400, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sel.provider} · {sel.type}</div>
                </div>
                <button className="v2-md-close" onClick={() => setSel(null)}>✕</button>
              </div>
              <div className="v2-md-body" style={{ paddingTop: 40, paddingBottom: 40, flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div style={{ margin: 'auto 0' }}>
                {sel.description && (
                  <div style={{ background: 'var(--p-fill)', borderRadius: 11, padding: '11px 14px', fontSize: 12.5, color: 'var(--p-t2)', lineHeight: 1.7, marginBottom: 16 }}>{sel.description}</div>
                )}
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--aink)', margin: '2px 0 7px' }}>调用前提</div>
                <div style={{ fontSize: 12.5, color: 'var(--p-t2)', lineHeight: 1.8, marginBottom: 14 }}>
                  · 本平台模型经<b>统一网关代理</b>调用，各学院智能体默认使用平台当前生效模型（后台可切换），无需自行申请密钥<br />
                  · 教师个人开发场景如需直连 API，请联系<b>信息化与数据服务中心</b>（dcc@wxut.edu.cn）开通 API Key 与调用权限<br />
                  · 下述示例中的 <code style={{ background: 'var(--p-fill)', borderRadius: 4, padding: '1px 6px', fontSize: 11.5 }}>model</code> 参数需与本页模型名完全一致
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 0 7px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--aink)' }}>请求示例（OpenAI 兼容）</div>
                  <span className="v2-link" style={{ fontSize: 12 }} onClick={() => doCopy(models[0] ? curlOf(sel) : '', 'req')}>{copied === 'req' ? '已复制' : '复制'}</span>
                </div>
                <div className="v2-api-code"><pre>{curlOf(sel)}</pre></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0 7px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--aink)' }}>响应示例（流式截断）</div>
                  <span className="v2-link" style={{ fontSize: 12 }} onClick={() => doCopy(respOf(sel), 'resp')}>{copied === 'resp' ? '已复制' : '复制'}</span>
                </div>
                <div className="v2-api-code"><pre>{respOf(sel)}</pre></div>
                </div>
              </div>
            </div>
            </div>
          </>
        )}
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

function Dev({ toast, onGuide }) {
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
              <button className="v2-btn ghost lg" onClick={onGuide}>使用指南</button>
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

/* ============ 操作指南（指南枢纽：平台上手 + 开发平台 / XixiBuddy 指南入口） ============ */
function GuideHub() {
  return (
    <>
      <div className="v2-sec-head"><h2>操作指南</h2><p>平台三步上手 · 开发平台与桌面客户端指南入口</p></div>
      <div className="v2-body" style={{ maxWidth: 900 }}>
        <div className="v2-banner">
          <div className="ic"><Icon name="book" size={26} /></div>
          <div>
            <div className="t">三步上手 AI中台</div>
            <div className="d">① 使用统一身份认证登录（游客可先浏览广场与模型服务） → ② 在智能体广场选一个智能体：查学院数据、问制度、聊就业 → ③ 按需深入：知识库中心文档问答 · AI 数据洞察工作台 · AI 教师工作台。</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginTop: 16 }}>
          <div className="v2-card" style={{ cursor: 'pointer' }} onClick={() => { window.location.hash = '#/dev'; window.scrollTo(0, 0); }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EEF2FF', color: 'var(--el-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="code" size={19} /></div>
              <div><div className="ct">智能体开发平台 · 使用指南</div><div className="cs">面向开发者与各部门</div></div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--p-t2)', marginTop: 12, lineHeight: 1.7 }}>
              从申请开通到上架广场的完整路径：联系信息化与数据服务中心申请开发者账号 → 登录平台 → 创建应用 → 可视化编排（提示词 / 知识库挂载 / MCP 数据接入）→ 调试预览 → 审核上架智能体广场。入口见「智能体开发平台」页内使用指南。
            </div>
            <div className="lnk" style={{ marginTop: 12 }}>进入智能体开发平台 →</div>
          </div>
          <div className="v2-card" style={{ cursor: 'pointer' }} onClick={() => window.open('/v2/harness/guide', '_blank')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EEF2FF', color: 'var(--el-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="ext" size={19} /></div>
              <div><div className="ct">XixiBuddy 桌面客户端 · 操作指南</div><div className="cs">面向全体师生</div></div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--p-t2)', marginTop: 12, lineHeight: 1.7 }}>
              下载安装桌面客户端 → 统一身份认证登录 → 与锡锡对话查校园数据、问制度、使用校园技能。图文手册涵盖安装、登录、日常使用与常见问题，可在线阅读。
            </div>
            <div className="lnk" style={{ marginTop: 12 }}>打开完整指南（新窗口）→</div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ============ 简单内容页（campus/about 建设中；guide 走指南枢纽） ============ */
/* 数智化校园 · 建设规划（真实内容页） */
function CampusPage() {
  const icBox = { width: 38, height: 38, borderRadius: 10, background: 'var(--p-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--el-primary)', flexShrink: 0 };
  const lines = [
    { ic: 'cap', t: '教学', d: '学习答疑、课程与实训辅导类智能体统一在广场获取，把 AI 助手带进课堂与自习。' },
    { ic: 'flask', t: '科研', d: '文献检索、数据分析与科研数据查询（论文 / 横向），为教师科研提供数据与分析支撑。' },
    { ic: 'clipboard', t: '管理', d: '智能填报、AI 数据洞察、制度问答，把重复性事务交给 AI，为管理与学工条线减负。' },
    { ic: 'headset', t: '服务', d: '制度与办事流程问答、校园生活指引，让师生"问一次就办成"。' },
  ];
  const mods = [
    { ic: 'spark', t: '智能体广场', d: '聚合全校智能体，按学院与场景分类，一处入口即用。' },
    { ic: 'college', t: '学院锡锡导员', d: '11 个学院各有专属导员，实时回答本学院学生数据问题。' },
    { ic: 'network', t: '全校数据查询', d: '面向校领导与管理部门，跨学院汇总数据一问即得。' },
    { ic: 'chart', t: 'AI 数据洞察', d: '资助 / 安全 / 学业 / 心理 / 就业五个分析工作台，红黄绿灯识别关注线索。' },
    { ic: 'doclog', t: 'AI 教师工作台', d: '数仓字段自动带出、材料 AI 起草、按原版式一键导出 Word。' },
    { ic: 'book', t: '知识库中心', d: '学校制度与办事指南结构化知识库，支持问答并附原文出处。' },
    { ic: 'monitor', t: 'AI超级门户', tag: '待规划', d: '桌面客户端，把中台能力带到每位师生的电脑上。' },
    { ic: 'shield', t: '权限与安全', d: '统一身份认证与数据范围管控，敏感数据按角色可见、只读访问。' },
    { ic: 'plug', t: '开放接入', d: '面向开发者的智能体开发平台，审核上架后进入广场复用。' },
  ];
  return (
    <>
      <div className="v2-sec-head">
        <h2>数智化校园建设规划</h2>
        <p>以 AI 中台为底座，教学 · 科研 · 管理 · 服务四线并进的智慧校园蓝图</p>
      </div>
      <div className="v2-body" style={{ maxWidth: 980 }}>
        <div className="v2-banner">
          <div className="ic"><Icon name="landmark" size={24} /></div>
          <div>
            <div className="t">一个底座：锡职大 AI 中台</div>
            <div className="d">统一身份认证（CAS）+ 校园数据中台 + 校园智算算力与模型，向上支撑全校 AI 应用"一次接入、处处可用"。</div>
          </div>
        </div>

        <div className="v2t-sec-head" style={{ marginTop: 18 }}><div className="v2t-sec-t">四条主线</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {lines.map((x) => (
            <div className="v2-card" key={x.t}>
              <div style={{ ...icBox, marginBottom: 9 }}><Icon name={x.ic} size={19} /></div>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>{x.t}</div>
              <div style={{ fontSize: 12.5, color: 'var(--p-t3)', lineHeight: 1.75 }}>{x.d}</div>
            </div>
          ))}
        </div>

        <div className="v2t-sec-head" style={{ marginTop: 20 }}><div className="v2t-sec-t">已落地模块<span className="v2t-cnt">面向全校师生</span></div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {mods.map((m) => (
            <div className="v2-card" key={m.t}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                <span style={{ ...icBox, width: 32, height: 32, borderRadius: 9 }}><Icon name={m.ic} size={16} /></span>
                <span style={{ fontSize: 14, fontWeight: 800 }}>{m.t}</span>
                {m.tag ? <span className="v2-tag grey" style={{ marginLeft: 'auto' }}>{m.tag}</span> : null}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--p-t3)', lineHeight: 1.75 }}>{m.d}</div>
            </div>
          ))}
        </div>

        <div className="v2-banner" style={{ marginTop: 18 }}>
          <div className="ic"><Icon name="shield" size={22} /></div>
          <div>
            <div className="t">数据来源与合规</div>
            <div className="d">数据来自学校数据中台（数仓储 / 考勤 / 请假 / 成绩 / 一卡通等），只读访问、按账号权限限定数据范围。洞察类分析仅为关注线索，不构成任何处理结论；涉及个人信息的业务分析须登录并具备对应角色。</div>
          </div>
        </div>
      </div>
    </>
  );
}

/* 关于 AI 中台（真实内容页） */
function AboutPage() {
  return (
    <>
      <div className="v2-sec-head">
        <h2>关于 AI 中台</h2>
        <p>无锡职业技术大学 · 信息化与数据服务中心 出品</p>
      </div>
      <div className="v2-body" style={{ maxWidth: 900 }}>
        <div className="v2-card">
          <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 8 }}>平台简介</div>
          <div style={{ fontSize: 13, color: 'var(--p-t2)', lineHeight: 1.9 }}>
            锡职大 AI 中台是无锡职业技术大学面向全校师生建设的一体化人工智能应用平台。它以校园数据中台与智算算力为底座，
            统一接入学校统一身份认证（CAS），聚合智能体广场、AI 数据洞察、智能填报、知识库中心等能力，
            让 AI 成为教学、科研、管理与服务的新基础设施。平台面向师生开放，敏感数据按账号角色限定范围。
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
          <div className="v2-card">
            <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 8 }}>技术架构</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--p-t3)', lineHeight: 1.9 }}>
              <li>前端：React + Vite 单页应用，桌面 / 大屏自适应</li>
              <li>后端：Spring Boot 服务，统一 REST 接口与 SSE 流式对话</li>
              <li>算力：校园智算一体机 + 移动云大模型，内网优先</li>
              <li>认证：学校统一身份认证（CAS）单点登录</li>
            </ul>
          </div>
          <div className="v2-card">
            <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 8 }}>数据来源与合规</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--p-t3)', lineHeight: 1.9 }}>
              <li>数据来自学校数据中台，只读访问</li>
              <li>按账号角色限定数据范围（学院 / 全校）</li>
              <li>洞察类结果仅为关注线索，不作处理依据</li>
              <li>涉及个人信息须登录并具备对应权限</li>
            </ul>
          </div>
        </div>
        <div className="v2-banner" style={{ marginTop: 16 }}>
          <div className="ic"><Icon name="phone" size={22} /></div>
          <div>
            <div className="t">联系我们</div>
            <div className="d">无锡职业技术大学 信息化与数据服务中心 · dcc@wxit.edu.cn —— 平台使用、账号权限与数据接入咨询，欢迎来信。</div>
          </div>
        </div>
      </div>
    </>
  );
}

function SimplePage({ kind }) {
  if (kind === 'guide') return <GuideHub />;
  if (kind === 'about') return <AboutPage />;
  return <CampusPage />;
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
  const { user, guest, casLogin, logout, requireLogin, hasPerm, dataScope } = useV2User();
  // 敏感操作引导弹窗：{msg, kind} kind='login'(未登录引导登录) | 'perm'(已登录但无权限，纯提示)
  const [prompt, setPrompt] = useState(null);
  const setLoginPrompt = (msg) => setPrompt({ msg, kind: 'login' });
  const setPermPrompt = (msg) => setPrompt({ msg, kind: 'perm' });
  const [showGuide, setShowGuide] = useState(false);   // 开发平台·操作指南（#/dev/guide）路由化
  const [workbench, setWorkbench] = useState(null);   // 数据洞察：当前工作台
  const [teacherWizard, setTeacherWizard] = useState(false); // 教师工作台：智能填报向导
  const [teacherRec, setTeacherRec] = useState(null);  // 继续填报的记录 id
  const [teacherTpl, setTeacherTpl] = useState(null);  // 智能填报：地址栏 #/teacher/form/{模板id}/{步骤} 中的模板
  const [teacherStep, setTeacherStep] = useState(null); // 智能填报：地址栏中的当前步骤
  const [insightTab, setInsightTab] = useState('overview'); // 数据洞察：公开洞察/工作台 tab
  const [kbBadge, setKbBadge] = useState(0);   // 知识库：后台处理完成未读提示（红点）
  const [resolved, setResolved] = useState(undefined); // 前台功能注册表（undefined=加载中）：导航/守卫唯一来源
  const pageRef = useRef(page); pageRef.current = page;
  const tokenRef = useRef(null); tokenRef.current = typeof localStorage !== 'undefined' ? localStorage.getItem('user_token') : null;

  // 异步处理追踪：跨页面轮询"我可见库中处理中的文件"，完成/失败即弹提示（离开知识库也能收到）
  useEffect(() => {
    if (!user) return;
    let alive = true, timer = null;
    let tracked = new Map(); // fileId -> {kbId, name}
    const tick = async () => {
      try {
        const r = await fetch(`${API_BASE}/kb/processing`, { headers: tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {} });
        const j = await r.json().catch(() => null);
        const items = (j && j.code === 200 && j.data) || [];
        const nowIds = new Set(items.map((x) => x.fileId));
        // 完成检测：上一轮在处理、这一轮消失 → 查最终状态弹提示
        for (const [fid, meta] of tracked) {
          if (nowIds.has(fid)) continue;
          try {
            const rf = await fetch(`${API_BASE}/kb/${meta.kbId}/files`, { headers: tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {} });
            const jf = await rf.json().catch(() => null);
            const file = ((jf && jf.data) || []).find((x) => x.id === fid);
            if (file && file.status === 'done') {
              toast(`《${meta.name}》处理完成：${file.chunkCount ?? 0} 原文块 + ${file.qaCount ?? 0} 问答对，现在可检索`);
            } else if (file && file.status === 'failed') {
              toast(`《${meta.name}》处理失败：${file.errorMsg || '未知原因'}`);
            }
            if (pageRef.current !== 'kb') setKbBadge((n) => n + 1);
          } catch { /* 忽略单次查询失败 */ }
        }
        tracked = new Map(items.map((x) => [x.fileId, { kbId: x.kbId, name: x.name }]));
        if (alive) timer = setTimeout(tick, items.length ? 5000 : 10000);
      } catch {
        if (alive) timer = setTimeout(tick, 10000);
      }
    };
    timer = setTimeout(tick, 6000);
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [user, toast]);

  // 进入知识库频道 → 清掉完成红点
  useEffect(() => { if (page === 'kb') setKbBadge(0); }, [page]);

  // 前台功能注册表（sys_config `v2.features`，公开可读）：导航与守卫的唯一来源。
  // 解析失败/空配置 → resolveFeatures(null) 回退代码默认（FEATURE_DEFAULTS）。
  useEffect(() => {
    let alive = true;
    getPublicConfig('v2.features')
      .then((d) => {
        let cfg = null;
        try { const a = JSON.parse(d?.configValue || 'null'); cfg = a && typeof a === 'object' ? a : null; } catch { cfg = null; }
        if (alive) setResolved(resolveFeatures(cfg));
      })
      .catch(() => { if (alive) setResolved(resolveFeatures(null)); });
    return () => { alive = false; };
  }, []);

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
      return;
    }
    setChatAgent(null);
    const segs = location.pathname.replace(/^\/+/, '').split('/');
    const p = segs[0] || 'plaza';
    // 开发平台·操作指南路由化（#/dev/guide）：可分享/前进后退；离开则关闭
    const wantDevGuide = p === 'dev' && segs[1] === 'guide';
    if (!wantDevGuide) setShowGuide(false);
    if (resolved === undefined) return; // 注册表未就绪 → 加载后再路由（避免误判回退首页）
    const ctx = { user, perms: (user && user.perms) || [], requireLogin, setLoginPrompt, setPermPrompt };
    // 数据洞察子工作台直链：游客停在频道首页；已登录按注册表 gate 校验
    if (p === 'insight' && ['funding', 'safety', 'academic', 'mental', 'employment'].includes(segs[1])) {
      if (!user) { setPage('insight'); setInsightTab('overview'); return; }
      if (!gateCheck(resolved.byKey['insight.' + segs[1]], ctx)) { setPage('insight'); setInsightTab('overview'); return; }
      setPage('insight'); setWorkbench(segs[1]); return;
    }
    // 洞察频道内Tab路由化：#/insight = 公开洞察，#/insight/scenes = AI场景分析（工作台列表）
    if (p === 'insight') {
      setInsightTab(segs[1] === 'scenes' ? 'workbench' : 'overview');
      if (segs[1] === 'scenes') return; // 已完成路由（后续不覆盖）
    }
    // 页面/频道直链：统一走注册表 gate（游客放行浏览，登录后缺权限/未开放拦截）
    const f = featureByKey(resolved, p);
    if (f && !gateCheck(f, ctx)) { setPage('plaza'); setWorkbench(null); setTeacherWizard(false); return; }
    setTeacherWizard(p === 'teacher' && segs[1] === 'form');
    setTeacherTpl(p === 'teacher' && segs[1] === 'form' && segs[2] ? Number(segs[2]) : null);
    setTeacherStep(p === 'teacher' && segs[1] === 'form' && segs[3] ? Number(segs[3]) : null);
    // 第四段=记录 id：#/teacher/form/{模板}/{步骤}/{记录}——刷新/分享直达恢复
    setTeacherRec(p === 'teacher' && segs[1] === 'form' && segs[4] ? Number(segs[4]) : null);
    setWorkbench(null);
    if (wantDevGuide) { setPage('dev'); setShowGuide(true); return; }
    setPage(['plaza', 'models', 'insight', 'teacher', 'dev', 'kb', 'campus', 'guide', 'about'].includes(p) ? p : 'plaza');
  }, [location.pathname, agents, navigate, resolved]);

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
    // 功能注册表门（chat.gate='login'）：游客使用智能体 → 引导登录（配置未就绪时保持原登录预检）
    const gateCtx = { user, perms: (user && user.perms) || [], requireLogin, setLoginPrompt, setPermPrompt };
    if (resolved !== undefined) {
      if (!gateCheck(featureByKey(resolved, 'chat'), gateCtx)) return;
    } else if (!requireLogin()) { setLoginPrompt('使用智能体对话需要登录'); return; }
    // RBAC 数据范围预检（后端为最终防线）：锡锡随数据范围——scope=all（含学院=全校）放行全部；
    // college 范围锁本院
    if (a.collegeId != null && user && dataScope !== 'all') {
      if (a.collegeId !== user.collegeId) {
        setPermPrompt(`该智能体面向${a.collegeName || '其他学院'}老师开放`); return;
      }
    }
    launchAgentV2(navigate, a.id, user, (detail) => {
      navigate(`/chat/${a.id}`);
    });
  }, [navigate, user, requireLogin, dataScope, resolved]);

  // 页面/频道守卫：统一走功能注册表 gateCheck（游客放行浏览，登录后按 gate/权限拦截）
  const guardNav = useCallback((p) => {
    if (resolved !== undefined) {
      const ctx = { user, perms: (user && user.perms) || [], requireLogin, setLoginPrompt, setPermPrompt };
      if (!gateCheck(featureByKey(resolved, p), ctx)) return;
    }
    nav(p);
  }, [nav, resolved, user, requireLogin]);

  // 打开智能填报向导（可带记录 id 继续填报）
  const openWizard = useCallback((recId) => {
    setTeacherRec(recId || null);
    // 带 rec 段：路由解析还原 teacherRec（不带会被置 null 而落到选模板页）；
    // 真实模板/步骤由 FormWizard 记录恢复 effect 写入完整 URL
    navigate(recId ? '/teacher/form/0/4/' + recId : '/teacher/form');
    window.scrollTo(0, 0);
  }, [navigate]);

  // 路由进入对话页：chatAgent 由路由驱动
  if (chatAgent) return (
    <>
      <TopNav page="plaza" onNav={nav} user={user} guest={guest} onLogin={casLogin} onLogout={logout} perms={user?.perms} resolved={resolved} />
      <ChatPage agent={chatAgent} onExit={() => nav('plaza')} onNeedLogin={setLoginPrompt} user={user} />
    </>
  );

  return (
    <>
      <TopNav page={page} onNav={guardNav} user={user} guest={guest} onLogin={casLogin} onLogout={logout} perms={user?.perms} kbBadge={kbBadge} resolved={resolved} />
      {loadErr && <div className="v2-body"><div className="v2-empty">实时数据加载失败：{loadErr}</div></div>}
      {page === 'plaza' && (agents.length === 0 && !loadErr
        ? <div className="v2-body" style={{ paddingTop: 120 }}><XixiLoading text="锡锡正在为您准备广场…" /></div>
        : <Plaza agents={agents} cats={cats} q={q} setQ={setQ} onChat={launch} onNav={guardNav} toast={toast} onXixiBlocked={() => setPermPrompt('全校锡锡面向校领导与管理员开放')} />)}
      {page === 'models' && <Models toast={toast} />}
      {page === 'insight' && !workbench && (
        <InsightHome tab={insightTab} setTab={(t) => { setInsightTab(t); navigate(t === 'workbench' ? '/insight/scenes' : '/insight', { replace: true }); }} perms={user ? (user.perms || []) : []} onOpenWorkbench={(w) => {
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
      {page === 'insight' && workbench === 'employment' && (
        <EmploymentWorkbench toast={toast} user={user} dataScope={dataScope} onBack={() => { setWorkbench(null); navigate('/insight'); }} />
      )}
      {page === 'insight' && ['safety', 'academic', 'mental'].includes(workbench) && (
        <SceneWorkbench sceneKey={workbench} toast={toast} user={user} canExport={hasPerm('insight.export')} dataScope={dataScope} onBack={() => { setWorkbench(null); navigate('/insight'); }} />
      )}
      {page === 'dev' && (showGuide
        ? <DevGuide onClose={() => { navigate('/dev'); window.scrollTo(0, 0); }} toast={toast} />
        : <Dev toast={toast} onGuide={() => { navigate('/dev/guide'); window.scrollTo(0, 0); }} />)}
      {page === 'teacher' && (
        <V2Teacher user={user} requireLogin={requireLogin} toast={toast}
          wizard={teacherWizard}
          openRecordId={teacherRec}
          initialTplId={teacherTpl}
          initialStep={teacherStep}
          openWizard={openWizard}
          onExitWizard={() => { setTeacherWizard(false); setTeacherRec(null); navigate('/teacher'); }}
          onNav={nav} />
      )}
      {['campus', 'guide', 'about'].includes(page) && <SimplePage kind={page} />}
      {page === 'kb' && <V2Knowledge user={user} requireLogin={requireLogin} toast={toast} />}
      <Footer onNav={guardNav} toast={toast} resolved={resolved} />

      {prompt && (
        <div className="v2-modal-mask" onMouseDown={(e) => { if (e.target === e.currentTarget) setPrompt(null); }}>
          <div className="v2-modal" style={{ width: 400 }}>
            <div className="v2-md-head"><div className="t">{prompt.kind === 'perm' ? '暂无使用权限' : '需要登录'}</div><button className="v2-md-close" onClick={() => setPrompt(null)}>✕</button></div>
            <div className="v2-md-body" style={{ paddingBottom: 8 }}>
              <div style={{ textAlign: 'center', padding: '14px 0 6px' }}>
                <img src="./v2-logo.png?v=2" alt="" style={{ width: 52, height: 52, objectFit: 'contain' }} />
              </div>
              <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--aink)', fontWeight: 600, margin: '8px 0 4px' }}>{prompt.msg}</p>
              {prompt.kind === 'login' && (
                <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--p-t3)', margin: 0 }}>使用学校统一身份认证登录后即可继续<br />（游客可以浏览广场与模型服务）</p>
              )}
              {prompt.kind === 'login' && (
                <p style={{ textAlign: 'center', fontSize: 12, margin: '10px 0 0' }}>
                  <a style={{ color: 'var(--el-primary)', cursor: 'pointer' }}
                    onClick={() => window.open((location.pathname.indexOf('/agent-plaza/') === 0 ? '/agent-plaza/v2/' : '/v2/') + 'mock-login.html', '_blank')}>
                    没有统一身份认证账号？用账号密码登录
                  </a>
                </p>
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
