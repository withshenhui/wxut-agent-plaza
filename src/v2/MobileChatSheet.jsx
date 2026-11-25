import React, { useState, useEffect, useRef } from 'react';
import { parseSseEvents } from './sse.js';
import { renderMd, jumpToCite, escapeHtml2 } from './V2App.jsx';
import { AgentAvatar, GATEWAY_BASE, COLLEGE_MODELS } from './ui.jsx';
import { EmploymentIntentCard, EmploymentJobCards, StudentProfileCard } from './V2Employment.jsx';

const API_BASE = import.meta.env.PROD ? '/agent-plaza/api/v1' : '/api/v1';

/** 企微移动版半屏对话：三协议 SSE（rag/emp == /{api}/…chat；gw == gateway chat/completions）。 */
export default function MobileChatSheet({ agent, user, onClose }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState('');
  const [empProfile, setEmpProfile] = useState(null);
  const bottomRef = useRef(null);
  const isEmp = agent.agentType === 'native-employment';
  const isRag = agent.agentType === 'native-rag';
  const gw = COLLEGE_MODELS[Number(agent.id)] || '';

  // 就业智能体：登录后取学生画像（登录账号=学号），展示在消息流顶部
  useEffect(() => {
    if (!isEmp || !user) return;
    const tk = localStorage.getItem('user_token');
    fetch(`${API_BASE}/employment/profile`, { headers: tk ? { Authorization: `Bearer ${tk}` } : {} })
      .then((r) => r.json()).then((j) => { if (j.data) setEmpProfile(j.data); }).catch(() => {});
  }, [isEmp, user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length, toolStatus]);

  const mutate = (updater) => setMsgs((prev) => updater(prev));

  // 一轮对话落服务端（跟登录人走；sessionId 不传则后端自动建会话）
  const saveRound = (userContent, agentContent) => {
    const tk = localStorage.getItem('user_token');
    if (!tk || !agentContent) return;
    fetch(`${API_BASE}/chat/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
      body: JSON.stringify({ agentId: agent.id, title: userContent.slice(0, 20),
        messages: [{ sender: 'user', content: userContent }, { sender: 'agent', content: agentContent }] }),
    }).catch(() => {});
  };

  const send = async (textArg) => {
    const content = (textArg ?? input).trim();
    if (!content || loading) return;
    if ((isRag || isEmp || gw) && !localStorage.getItem('user_token')) {
      mutate((p) => [...p, { id: Date.now(), sender: 'agent', content: '请先在企业微信工作台重新进入以完成登录。' }]);
      return;
    }
    setInput('');
    const userId = Date.now();
    const genId = Date.now() + 1;
    mutate((p) => [...p, { id: userId, sender: 'user', content },
      { id: genId, sender: 'agent', content: '', streaming: true }]);
    setLoading(true); setToolStatus('');
    try {
      const tk = localStorage.getItem('user_token');
      if (isRag || isEmp) {
        const url = isEmp ? `${API_BASE}/employment/chat?q=${encodeURIComponent(content)}`
          : `${API_BASE}/kb/${agent.id}/chat?q=${encodeURIComponent(content)}`;
        const resp = await fetch(url, { headers: tk ? { Authorization: `Bearer ${tk}` } : {} });
        if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
        const reader = resp.body.getReader(); const dec = new TextDecoder('utf-8');
        let buf = ''; let acc = ''; let cites = null; let guide = null; let jobs = null;
        while (true) {
          const { value, done } = await reader.read(); if (done) break;
          buf += dec.decode(value, { stream: true });
          // 与桌面 ChatPage 一致：只把已完整接收的块交给纯模块解析，未闭合尾块留在 buf（逐片上屏时机不变）
          const parts = buf.split('\n\n');
          buf = parts.pop();
          for (const e of parseSseEvents(parts.join('\n\n'))) {
            if (e.name === 'tool') { try { setToolStatus(JSON.parse(e.data).message || '检索中…'); } catch {} }
            else if (e.name === 'citation') { try { cites = JSON.parse(e.data); } catch {} }
            else if (e.name === 'guide') { try { guide = JSON.parse(e.data); } catch {} }
            else if (e.name === 'jobs') {
              // 一到就上屏（后端先发"规则排序"版再发"LLM 精排"版）→ 不等正文流完就能看到岗位卡
              try { jobs = JSON.parse(e.data); mutate((p) => p.map((m) => (m.id === genId ? { ...m, jobs } : m))); } catch {}
            }
            else if (e.name === 'text') {
              try { acc += JSON.parse(e.data).data ?? ''; } catch {}
              setToolStatus('');
              mutate((p) => p.map((m) => (m.id === genId ? { ...m, content: acc } : m)));
            } else if (e.name === 'error') { let msg = '服务异常'; try { msg = JSON.parse(e.data).message || msg; } catch {} throw new Error(msg); }
          }
        }
        mutate((p) => p.map((m) => (m.id === genId ? { ...m, content: acc || '（未检索到相关内容）', streaming: false, citations: cites, guide, jobs } : m)));
        saveRound(content, acc);
      } else if (gw) {
        const resp = await fetch(`${GATEWAY_BASE}/v1/chat/completions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: `Bearer ${tk}` } : {}) },
          body: JSON.stringify({ model: gw, messages: [{ role: 'user', content }], stream: true }),
        });
        if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
        const reader = resp.body.getReader(); const dec = new TextDecoder('utf-8');
        let buf = ''; let acc = '';
        while (true) {
          const { value, done } = await reader.read(); if (done) break;
          buf += dec.decode(value, { stream: true });
          // 网关为 `data: {json}\n\n` 协议，复用同一解析器 + 同一"保留未闭合尾块"模式
          const parts = buf.split('\n\n');
          buf = parts.pop();
          for (const e of parseSseEvents(parts.join('\n\n'))) {
            const payload = e.data.trim();
            if (payload === '[DONE]') continue;
            let evt; try { evt = JSON.parse(payload); } catch { continue; }
            if (evt.type === 'tool') setToolStatus(evt.data?.message || '正在查询数据库…');
            else if (evt.type === 'text') { acc += evt.data ?? ''; mutate((p) => p.map((m) => (m.id === genId ? { ...m, content: acc } : m))); }
          }
        }
        mutate((p) => p.map((m) => (m.id === genId ? { ...m, content: acc, streaming: false } : m)));
        saveRound(content, acc);
      } else {
        mutate((p) => p.map((m) => (m.id === genId ? { ...m, content: '该智能体请在电脑端使用。', streaming: false } : m)));
      }
    } catch (e) {
      mutate((p) => p.map((m) => (m.id === genId ? { ...m, content: '查询失败：' + (e.message || '网络异常'), streaming: false } : m)));
    } finally { setLoading(false); setToolStatus(''); }
  };

  return (
    <div className="wx-sheet-mask" onClick={onClose}>
      <div className="wx-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="wx-sheet-head">
          <AgentAvatar agent={agent} size={28} />
          <div className="t">{agent.name}</div>
          <span className="close" onClick={onClose}>✕</span>
        </div>
        <div className="wx-sheet-body">
          {isEmp && empProfile && <StudentProfileCard profile={empProfile} />}
          {msgs.map((m) => (
            <div key={m.id} className={`wx-msg ${m.sender === 'user' ? 'user' : 'ai'}`}>
              <div className="wx-bubble v2-md">
                {m.sender === 'user'
                  ? <div dangerouslySetInnerHTML={{ __html: escapeHtml2(m.content).replace(/\n/g, '<br>') }} />
                  : m.content
                    ? <div dangerouslySetInnerHTML={{ __html: renderMd(m.content, m.citations ? m.citations.length : 0) }} onClick={jumpToCite} />
                    : <div className="v2-loading-inline"><span className="v2-typing"><i></i><i></i><i></i></span>{toolStatus || '正在思考…'}</div>}
                {/* 引用卡置于气泡内：jumpToCite 依赖 closest('.v2-bubble') 内查找 .v2-cite（与桌面同构） */}
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
              </div>
              {m.sender === 'agent' && !m.streaming && m.guide && (
                <EmploymentIntentCard guide={m.guide} onSubmit={(_picked, summary) => send(summary || '帮我推荐适合我的岗位')} />
              )}
              {m.sender === 'agent' && m.jobs && m.jobs.length > 0 && (m.content || !m.streaming) && (
                <EmploymentJobCards jobs={m.jobs} onAsk={(q) => send(q)} />
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="wx-sheet-input">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入消息…"
                 onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <button disabled={loading || !input.trim()} onClick={() => send()}>发送</button>
        </div>
      </div>
    </div>
  );
}
