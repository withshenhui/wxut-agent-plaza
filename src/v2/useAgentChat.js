import { useState, useEffect, useRef } from 'react';
import { GATEWAY_BASE, COLLEGE_MODELS, SUGGEST_COLLEGE, SUGGEST_ALL, confirmDialog } from './ui.jsx';
import { parseSseEvents } from './sse.js';

// 与桌面 ChatPage 完全一致的接口地址（request.js 同源相对路径策略）
const API_BASE = import.meta.env.PROD ? '/agent-plaza/api/v1' : '/api/v1';

/* 就业助手：意向卡选项（与后端 guide 事件一致）——首屏即展示，对齐原型 */
const EMP_GUIDE = {
  cities: ['无锡', '苏州', '南京', '上海', '不限'],
  types: ['全职', '实习', '都看'],
  pays: ['5K 以下', '5-8K', '8-12K', '12K 以上', '不限'],
};

function loadConvs(agentId) {
  try { return JSON.parse(localStorage.getItem(`v2-chat-${agentId}`) || '[]'); } catch { return []; }
}

/**
 * 智能体对话内核（桌面 ChatPage 与移动 MobileChatPage 共用同一套逻辑）。
 *
 * 抽取范围（与桌面逐字等价）：会话列表与切换、服务端历史加载（GET /chat/history）、
 * 服务端保存（POST /chat/save，带 sessionId）、欢迎语（按 agentType 分文案）、
 * send() 三协议 SSE（rag/emp 走 /{api}/…chat；gw 走网关 chat/completions）、
 * 删除会话、placeholder 推荐轮换、就业画像/意向城市、对话用量上报。
 *
 * 仅"展现形式"由各自视图决定；本 hook 不产出任何 DOM。
 *
 * @param {object} agent  智能体对象（需 id / agentType；可选 suggest / categoryKey / description / name）
 * @param {{ user?: object, onNeedLogin?: (msg?: string) => void }} options
 */
export function useAgentChat(agent, { user, onNeedLogin } = {}) {
  const [convs, setConvs] = useState(() => loadConvs(agent.id));
  // 就业助手：进入即呈现"欢迎词 + 意向卡"，不自动恢复上次会话（历史仍保留在左栏，可点开）
  const [activeId, setActiveId] = useState(() => (
    agent.agentType === 'native-employment' ? null : (loadConvs(agent.id)[0]?.id ?? null)));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState('');
  const bottomRef = useRef(null);
  const gw = COLLEGE_MODELS[Number(agent.id)];
  const agentSuggest = (agent.suggest || '').split('|').map((x) => x.trim()).filter(Boolean);
  const suggestions = agentSuggest.length ? agentSuggest
    : Number(agent.id) === 111 ? SUGGEST_ALL : (agent.categoryKey === 'college' ? SUGGEST_COLLEGE : []);
  const storageKey = `v2-chat-${agent.id}`;
  const active = convs.find((c) => c.id === activeId);
  const [phIdx, setPhIdx] = useState(0);

  const [currentModel, setCurrentModel] = useState('');

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
          title: title || '对话',
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
  const [empProfileLoaded, setEmpProfileLoaded] = useState(false);
  useEffect(() => {
    if (!isEmp) return;
    // 画像接口凭 user_token 鉴权，不依赖 user 对象（避免其加载时序导致不发起请求）
    const tk = localStorage.getItem('user_token');
    if (!tk) { setEmpProfileLoaded(true); return; }
    fetch(`${API_BASE}/employment/profile`, { headers: { Authorization: `Bearer ${tk}` } })
      .then((r) => r.json()).then((j) => { if (j.data && j.data.studentNo) setEmpProfile(j.data); })
      .catch(() => {})
      .finally(() => setEmpProfileLoaded(true));
  }, [isEmp, user]);
  // 意向卡城市：取自真实岗位库（/employment/meta），无数据时回退 EMP_GUIDE 默认选项
  const [empCities, setEmpCities] = useState(null);
  useEffect(() => {
    if (!isEmp || !user) return;
    const tk = localStorage.getItem('user_token');
    fetch(`${API_BASE}/employment/meta`, { headers: tk ? { Authorization: `Bearer ${tk}` } : {} })
      .then((r) => r.json()).then((j) => { const cs = j.data && j.data.cities; if (cs && cs.length) setEmpCities(cs); }).catch(() => {});
  }, [isEmp, user]);

  const welcome = () => ([
    { id: 'w', sender: 'agent', guide: isEmp ? (empCities && empCities.length ? { ...EMP_GUIDE, cities: [...empCities, '不限'] } : EMP_GUIDE) : null, content: (gw || isRag || isEmp)
      ? (isEmp
        ? (empProfile
          ? `你好，我是**${agent.name}**～我已读取你的学籍与成绩信息（见上方档案卡），结合在库校招岗位为你匹配适合的工作。\n\n先告诉我你的**求职意向**，我来为你匹配在库校招岗位：`
          : (empProfileLoaded
            ? `你好，我是**${agent.name}**～**未查询到你的学籍档案**：就业岗位推荐面向**在校学生**，按学号关联学籍与成绩数据。\n\n如果你是在校学生，请使用学校统一身份认证的**学生账号**登录后再试；如学籍信息有误或需要开通，请联系信息化与数据服务中心（dcc@wxut.edu.cn）。`
            : `你好，我是**${agent.name}**～正在读取你的学籍信息…`))
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

  return {
    convs, activeId, setActiveId,
    msgs, input, setInput,
    send, newChat, delConv,
    loading, toolStatus,
    suggestions, phPool, phIdx,
    isRag, isEmp, gw, empProfile, currentModel,
    bottomRef,
  };
}

export default useAgentChat;
