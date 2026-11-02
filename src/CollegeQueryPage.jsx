import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import PageLayout from './components/PageLayout';
import AgentIcon from './components/AgentIcon';
import { getAgentDetail } from './api/agent';

// 学院智能体 id -> 云枢网关 model 名
const COLLEGE_MODELS = {
  101: 'query-jixie', 102: 'query-kongzhi', 103: 'query-sheji', 104: 'query-qiche',
  105: 'query-jicheng', 106: 'query-guojiao', 107: 'query-caijing',
  108: 'query-guanli', 109: 'query-wenlv', 110: 'query-wulian',
};

// 网关地址：优先读环境变量，其次本地默认
const GATEWAY_BASE = import.meta.env.VITE_GATEWAY_BASE_URL || 'http://localhost:8530';

const SUGGESTIONS = [
  '这个学院有多少学生？',
  '按年级统计学生人数',
  '谁经常夜不归宿？',
  '班级消费对比',
  '当前正在请假的学生',
];

// 从回复中提取跟进问题（"您可以继续问我：…" 部分）
function extractFollowUps(content) {
  const m = String(content || '').match(/您可以继续问我[：:]\s*([\s\S]*?)(?:\n\s*\n|\s*$)/);
  if (!m) return [];
  let text = m[1]
    .replace(/[#*_`~]+/g, ' ')   // 去掉 markdown 符号
    .replace(/[<>]/g, ' ');
  const out = [];
  const parts = text
    .split(/\s*或者\s*|\s*或\s+|\n+|[；;。]/)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  for (let raw of parts) {
    // 丢弃/截断“方便我…”“如需…”“以上是…”等非问题性的收尾语，去掉列表符号
    raw = raw.replace(/^\s*(?:[-*•>]|[0-9]+[.、)])\s*/, '').trim();
    raw = raw.replace(/\s*(方便(?:我|您|你)?\s*[^？?]*|如需[^？?]*|以上是[^？?]*)$/, '').trim();
    if (raw.length > 30 && !/[？?]$/.test(raw)) continue;
    // 过滤含 XXXX/某某 等占位符的伪问题
    if (/X{2,}|某某|未提供|未填写|待定|输入学号|填写学号|查询学号/.test(raw)) continue;
    if (!out.includes(raw)) out.push(raw);
  }
  return out.slice(0, 3);
}

// 从展示内容中剔除"您可以继续问我"段落，避免在气泡内重复显示
function stripFollowUpSection(content) {
  return String(content || '').replace(/您可以继续问我[：:][\s\S]*$/, '').trim();
}

// 简易 HTML 转义，防止 LLM/数据库内容注入脚本
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// marked：开启换行分段，raw HTML 一律按纯文本转义（防注入）
marked.use({
  breaks: true,
  gfm: true,
  renderer: {
    html(token) { return escapeHtml(token.text); },
  },
});

function renderMarkdown(text) {
  try {
    return marked.parse(text || '');
  } catch {
    return escapeHtml(text || '');
  }
}

// 从回复中提取 JSON 数据块并表格化（仅用于已完成、非流式的消息）
function extractTables(content) {
  const jsonBlocks = (content.match(/\{[\s\S]*?\}|\[[\s\S]*?\]/g) || []);
  const parsed = [];
  for (const b of jsonBlocks) {
    try { parsed.push(JSON.parse(b)); } catch { /* 忽略非法 JSON */ }
  }
  const tableNode = (obj) => {
    const rows = Array.isArray(obj) ? obj : (obj?.rows);
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const keys = Object.keys(rows[0]);
    return (
      <div className="cq-table-wrap">
        <table className="cq-table">
          <thead><tr>{keys.map(k => <th key={k}>{k}</th>)}</tr></thead>
          <tbody>
            {rows.slice(0, 50).map((r, i) => (
              <tr key={i}>{keys.map(k => <td key={k}>{String(r[k] ?? '')}</td>)}</tr>
            ))}
          </tbody>
        </table>
        {rows.length > 50 && <div className="cq-table-more">仅显示前 50 条，共 {rows.length} 条</div>}
      </div>
    );
  };
  return parsed.map((v, i) => ({ node: tableNode(v), i })).filter(x => x.node);
}

// 渲染 Markdown 消息体（流式：随内容增长实时重渲染）
function MarkdownBody({ content }) {
  const html = React.useMemo(() => renderMarkdown(content), [content]);
  return <div className="cq-md" dangerouslySetInnerHTML={{ __html: html }} />;
}

// 智能体回复：流式时实时渲染 markdown + 光标，完成后附数据表格
function AgentReply({ content, streaming, showCursor, displayContent }) {
  const tables = streaming ? [] : extractTables(displayContent);
  return (
    <div className="cq-rich">
      {tables.map(t => <React.Fragment key={t.i}>{t.node}</React.Fragment>)}
      <MarkdownBody content={displayContent} />
      {showCursor && <span className="cq-typed-cursor" />}
    </div>
  );
}

// 跟进问题快捷卡片：点击直接作为新问题提问
function FollowUpChips({ items, onPick }) {
  if (!items.length) return null;
  return (
    <div className="cq-followups">
      <span className="cq-followups-label">您可以继续问：</span>
      <div className="cq-followups-list">
        {items.map((q, i) => (
          <button key={i} className="cq-followup" onClick={() => onPick(q)}>{q}</button>
        ))}
      </div>
    </div>
  );
}

function CollegeQueryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [conversations, setConversations] = useState([]); // 历史会话
  const [activeId, setActiveId] = useState(null);         // 当前会话 id
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState(''); // 工具执行进度提示
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const bottomRef = useRef(null);

  // —— 打字机速率控制：SSE 收到的内容先入队，再按固定速率逐字刷出 ——
  const queueRef = useRef('');      // 收到的但尚未展示的内容
  const timerRef = useRef(null);    // 刷字定时器
  const doneRef = useRef(false);    // 是否已收到流结束
  const stopReveal = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);
  const CHARS_PER_TICK = 5;   // 每 tick 刷出的字符数（调小=更慢）
  const TICK_MS = 55;          // tick 间隔（调大=更慢）

  const model = COLLEGE_MODELS[Number(id)];
  const storageKey = `college-chat-${model}`;
  const activeConv = conversations.find(c => c.id === activeId);

  // 加载当前学院的历史会话
  useEffect(() => {
    getAgentDetail(id).then(setAgent).catch(() => navigate('/'));
  }, [id, navigate]);

  // 初始化历史会话
  useEffect(() => {
    if (!model) return;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setConversations(saved);
      if (saved.length > 0) setActiveId(saved[0].id);
    } catch { /* 忽略损坏数据 */ }
  }, [storageKey, model]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeId, loading]);

  // 持久化历史
  const persist = useCallback((convs) => {
    try { localStorage.setItem(storageKey, JSON.stringify(convs.slice(0, 30))); } catch { /* 忽略 */ }
  }, [storageKey]);

  // 组件卸载时清理打字机定时器
  useEffect(() => () => stopReveal(), [stopReveal]);

  const mutate = useCallback((convId, updater) => {
    setConversations(prev => {
      const next = prev.map(c => c.id === convId ? updater(c) : c);
      persist(next);
      return next;
    });
  }, [persist]);

  // 新对话
  const newChat = () => {
    setLoading(false);
    setInput('');
    const conv = { id: Date.now(), title: '新对话', messages: [], createdAt: Date.now() };
    setConversations(prev => {
      const next = [conv, ...prev];
      persist(next);
      return next;
    });
    setActiveId(conv.id);
  };

  // 删除会话
  const deleteConv = (e, convId) => {
    e.stopPropagation();
    const conv = conversations.find(c => c.id === convId);
    if (conv && conv.messages.length > 0 && !window.confirm('确定删除这段对话历史吗？')) return;
    setConversations(prev => {
      const next = prev.filter(c => c.id !== convId);
      persist(next);
      return next;
    });
    if (activeId === convId) {
      const remaining = conversations.filter(c => c.id !== convId);
      setActiveId(remaining.length ? remaining[0].id : null);
    }
  };

  // 发起一轮问答：先追加 user 消息，再通过 SSE 流式读取 agent 回复
  const ask = (convId, content) => {
    // 重置打字机状态，避免上一轮的 done 标志/残留缓冲/定时器影响新一轮
    doneRef.current = false;
    queueRef.current = '';
    stopReveal();
    const userMsg = { id: Date.now(), sender: 'user', content };
    mutate(convId, c => ({
      ...c,
      title: c.title === '新对话' ? (content.slice(0, 20) || '新对话') : c.title,
      messages: [...c.messages, userMsg],
    }));
    setLoading(true);
    setToolStatus('');
    const genId = Date.now() + 1;
    // 预置一个"流式占位"的 agent 消息，随 SSE 增量更新
    mutate(convId, c => ({ ...c, messages: [...c.messages, { id: genId, sender: 'agent', content: '', streaming: true, raw: true }] }));

    const appendChunk = (chunk) => {
      mutate(convId, c => ({
        ...c,
        messages: c.messages.map(m =>
          m.id === genId ? { ...m, content: m.content + chunk } : m
        ),
      }));
    };
    const finishAgent = () => {
      setLoading(false);
      setToolStatus('');
      mutate(convId, c => ({
        ...c,
        messages: c.messages.map(m =>
          m.id === genId ? { ...m, streaming: false } : m
        ),
      }));
    };
    const failAgent = (msg) => {
      setLoading(false);
      setToolStatus('');
      mutate(convId, c => ({
        ...c,
        messages: c.messages.map(m =>
          m.id === genId ? { ...m, content: msg, streaming: false, raw: false } : m
        ),
      }));
    };

    fetch(`${GATEWAY_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content }], stream: true }),
    })
      .then(async (resp) => {
        if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
        const reader = resp.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buf = '';
        // 打字机：SSE 增量先入队，再按固定速率刷出
        // 流进行中按固定速率刷（有打字机感）；流结束后把剩余内容一次性刷出，避免长回答长时间卡住显得"没回复"
        const reveal = () => {
          if (doneRef.current) {
            // 流已结束：剩余内容全部刷出并收尾
            if (queueRef.current) {
              appendChunk(queueRef.current);
              queueRef.current = '';
            }
            stopReveal();
            finishAgent();
            return;
          }
          const take = queueRef.current.slice(0, CHARS_PER_TICK);
          queueRef.current = queueRef.current.slice(take.length);
          if (take) appendChunk(take);
        };
        timerRef.current = setInterval(reveal, TICK_MS);
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          // 按 SSE 事件边界切分
          const parts = buf.split('\n\n');
          buf = parts.pop();
          for (const part of parts) {
            const lines = part.split('\n');
            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              const payload = line.slice(5).trim();
              if (payload === '[DONE]') { doneRef.current = true; continue; }
              let evt;
              try { evt = JSON.parse(payload); } catch { continue; }
              if (evt.type === 'tool') {
                setToolStatus(evt.data?.message || '正在查询数据库…');
              } else if (evt.type === 'text') {
                queueRef.current += evt.data ?? '';
              }
            }
          }
        }
        doneRef.current = true;
        // 流已结束：由 reveal 计时器以受控速率刷完剩余内容后自动收尾
      })
      .catch(() => {
        stopReveal();
        failAgent('（连接查询网关失败，请确认网关已启动）');
      });
  };

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading || !model) return;
    setInput('');
    let convId = activeConv?.id;
    if (!convId) {
      convId = Date.now();
      const conv = { id: convId, title: content.slice(0, 20) || '新对话', messages: [], createdAt: Date.now() };
      setConversations(prev => {
        const next = [conv, ...prev];
        persist(next);
        return next;
      });
      setActiveId(convId);
    }
    ask(convId, content);
  };

  const onKey = (e) => { if (e.key === 'Enter') send(); };

  const fmtTime = (ts) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const fmtDay = (ts) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <PageLayout
      title="锡锡导员"
      onBack={() => navigate('/')}
      isSidebarCollapsed={isSidebarCollapsed}
      setIsSidebarCollapsed={setIsSidebarCollapsed}
      activePath="/"
      footerText="© 锡职大智能体广场    技术支持：信息中心"
    >
      <div className="cq-layout">
        {/* 左侧历史会话栏 */}
        <aside className="cq-history">
          <button className="cq-new-btn" onClick={newChat}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            新对话
          </button>
          <div className="cq-history-title">历史记录</div>
          <div className="cq-history-list">
            {conversations.length === 0 && (
              <div className="cq-history-empty">暂无历史记录</div>
            )}
            {conversations.map(c => (
              <div
                key={c.id}
                className={`cq-history-item${c.id === activeId ? ' cq-history-item--active' : ''}`}
                onClick={() => setActiveId(c.id)}
              >
                <div className="cq-history-item-top">
                  <span className="cq-history-item-title">{c.title || '新对话'}</span>
                  <span
                    className="cq-history-del"
                    onClick={(e) => deleteConv(e, c.id)}
                    title="删除"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                  </span>
                </div>
                <div className="cq-history-item-meta">
                  {c.messages.length
                    ? `${fmtDay(c.createdAt)} · ${c.messages.length} 条`
                    : '空白对话'}
                </div>
                <div className="cq-history-item-preview">
                  {(c.messages.find(m => m.sender === 'user')?.content || '').slice(0, 24)}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* 右侧对话区 */}
        <div className="cq-main">
          <div className="cq-head">
            <div className="cq-head-agent">
              <AgentIcon emoji={agent?.icon || '📊'} category="college" size={36} />
              <div>
                <div className="cq-head-name">{agent?.name || '锡锡导员'}</div>
                <div className="cq-head-sub">通过MCP工具实时查询本学院学生 / 成绩 / 门禁 / 请假 / 消费 / 处分 / 统计等数据</div>
              </div>
            </div>
          </div>

          <div className="cq-chat">
            <div className="el-chat-messages">
              {(!activeConv || activeConv.messages.length === 0) && (
                <div className="cq-welcome">
                  <div className="cq-welcome-icon">
                    <AgentIcon emoji={agent?.icon || '📊'} category="college" size={40} />
                  </div>
                  <p className="cq-welcome-title">你好，我是{agent?.name || '锡锡导员'}</p>
                  <p className="cq-welcome-sub">你可以问我：</p>
                  <div className="cq-sugs">
                    {SUGGESTIONS.map((s, i) => (
                      <button key={i} className="cq-sug" onClick={() => send(s)}>{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {activeConv?.messages.map((m, idx) => {
                const isLast = idx === activeConv.messages.length - 1;
                return (
                  <div key={m.id} className={`el-chat-message${m.sender === 'user' ? ' el-chat-message--user' : ''}`}>
                    {m.sender === 'user' ? (
                      <>
                        <div className="cq-bubble cq-bubble--user">{m.content}</div>
                        <span className="cq-avatar cq-avatar--user">我</span>
                      </>
                    ) : (
                      <>
                        <AgentIcon emoji={agent?.icon || '📊'} category="college" size={28} />
                        <div className="cq-col">
                          <div className="cq-bubble cq-bubble--agent">
                            <AgentReply
                              content={m.content || ''}
                              displayContent={stripFollowUpSection(m.content || '')}
                              streaming={!!m.streaming}
                              showCursor={!!m.streaming && isLast}
                            />
                            {m.streaming && isLast && toolStatus && (
                              <div className="cq-tool-status">
                                <span className="cq-tool-spin" />
                                {toolStatus}
                              </div>
                            )}
                          </div>
                          {!m.streaming && isLast && (
                            <FollowUpChips items={extractFollowUps(m.content || '')} onPick={send} />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="cq-input-bar">
              <input
                type="text"
                placeholder="输入你的查询，例如：各专业学生的平均成绩"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={onKey}
                disabled={loading}
              />
              <button
                className={`cq-send-btn${loading ? ' cq-send-btn--disabled' : ''}`}
                disabled={loading}
                onClick={() => send()}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2 15 22l-4-9-9-4z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default CollegeQueryPage;
