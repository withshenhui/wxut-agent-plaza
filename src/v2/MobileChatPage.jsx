import React, { useState, useEffect, useRef } from 'react';
import { useAgentChat } from './useAgentChat.js';
import { useTypewriter } from './useTypewriter.js';
import { AgentAvatar, Icon } from './ui.jsx';
import { renderMd, jumpToCite, escapeHtml2 } from './V2App.jsx';
import { EmploymentIntentCard, EmploymentJobCards, StudentProfileCard } from './V2Employment.jsx';

const API_BASE = import.meta.env.PROD ? '/agent-plaza/api/v1' : '/api/v1';

/**
 * 企微移动版「全页」对话：与桌面 ChatPage 共用同一对话内核（useAgentChat）——
 * 欢迎语、历史（服务端）、保存语义、三协议 SSE、引用块/就业卡全部同源，
 * 仅布局不同（顶部返回广场 + 智能体名 + 历史入口；消息区；输入栏吸底 safe-area）。
 */
export default function MobileChatPage({ agent, user, onBack, onNeedLogin }) {
  const [showHistory, setShowHistory] = useState(false);
  const {
    convs, activeId, setActiveId, msgs, input, setInput, send, newChat, delConv,
    loading, toolStatus, suggestions, phPool, phIdx, isEmp, empProfile, bottomRef,
  } = useAgentChat(agent, { user, onNeedLogin });
  const bodyRef = useRef(null);

  // 流式期间跟随滚动到底：仅在用户贴近底部时跟随，避免打断手动上滑查看历史；
  // 长度取自"流式中最后一条"的目标内容（分片增长即触发），滴字本身不再额外滚动。
  const last = msgs[msgs.length - 1];
  const lastStreamLen = last && last.streaming ? (last.content || '').length : 0;
  useEffect(() => {
    if (!lastStreamLen) return;
    const el = bodyRef.current;
    if (!el || el.scrollHeight - el.scrollTop - el.clientHeight > 120) return;
    el.scrollTop = el.scrollHeight;
  }, [lastStreamLen]);

  return (
    <div style={S.root}>
      {/* 顶部：← 返回广场 + 智能体名 + 历史入口 */}
      <header style={S.header}>
        <button style={S.back} onClick={onBack} title="返回广场">
          <Icon name="back" size={16} /><span style={{ marginLeft: 4 }}>返回广场</span>
        </button>
        <div style={S.headMid}>
          <AgentAvatar agent={agent} size={26} />
          <span style={S.headName}>{agent.name}</span>
        </div>
        <button style={S.hist} onClick={() => setShowHistory(true)}>历史</button>
      </header>

      {/* 消息区 */}
      <div style={S.body} ref={bodyRef}>
        {isEmp && empProfile && <StudentProfileCard profile={empProfile} />}
        {msgs.map((m) => (
          <div key={m.id} className={`wx-msg ${m.sender === 'user' ? 'user' : 'ai'}`}>
            {m.sender === 'user'
              ? (
                <div className="wx-bubble v2-md">
                  <div dangerouslySetInnerHTML={{ __html: escapeHtml2(m.content).replace(/\n/g, '<br>') }} />
                </div>
              )
              : <AiBubble m={m} send={send} toolStatus={toolStatus} />}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 输入栏吸底（env 安全区避软键盘） */}
      <div style={S.inputBar}>
        {suggestions.length > 0 && (
          <div style={S.suggests}>
            {suggestions.map((q, i) => <span key={i} style={S.sug} onClick={() => send(q)}>{q}</span>)}
          </div>
        )}
        <div style={S.inputRow}>
          <textarea
            rows={1}
            value={input}
            placeholder={`试试问：${phPool[phIdx % phPool.length]}` || '输入你的问题…'}
            onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'; }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            style={S.ta}
          />
          <button style={{ ...S.send, opacity: loading ? 0.6 : 1 }} onClick={() => send()} disabled={loading} title="发送"><Icon name="send" size={17} /></button>
        </div>
      </div>

      {/* 历史：该智能体的会话列表（服务端历史，同桌面数据源） */}
      {showHistory && (
        <div style={S.histMask} onClick={() => setShowHistory(false)}>
          <div style={S.histPanel} onClick={(e) => e.stopPropagation()}>
            <div style={S.histHead}>
              <span style={S.histTitle}>历史对话</span>
              <span style={S.histClose} onClick={() => setShowHistory(false)}>✕</span>
            </div>
            <button style={S.newBtn} onClick={() => { newChat(); setShowHistory(false); }}>＋ 新对话</button>
            <div style={S.convList}>
              {convs.map((c) => (
                <div key={c.id} style={{ ...S.convItem, ...(c.id === activeId ? S.convItemOn : {}) }}
                     onClick={() => { setActiveId(c.id); setShowHistory(false); }}>
                  <span style={S.convT}>{c.title}</span>
                  <button style={S.convRm} onClick={(e) => delConv(e, c.id)} title="删除">✕</button>
                </div>
              ))}
              {!convs.length && <div style={S.convEmpty}>暂无历史对话</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 正在流式的 AI 气泡（抽出子组件以便逐条使用 useTypewriter —— msgs.map 内不能调 hook）。
 * - 流式中：用打字机把目标内容逐字"滴"出来（renderMd(shown)），避免 SSE 整片替换的跳变；
 * - 非流式（历史/已完成）：直接渲染 m.content，不做二次动画；
 * - 引用块/就业意向卡/画像卡/岗位卡/note 均沿用原条件（多为 !m.streaming 才显示）。
 */
function AiBubble({ m, send, toolStatus }) {
  const shown = useTypewriter(m.content, m.streaming);
  const text = m.streaming ? shown : m.content;
  return (
    <div className="wx-bubble v2-md">
      {text
        ? <div dangerouslySetInnerHTML={{ __html: renderMd(text, m.citations ? m.citations.length : 0) }} onClick={jumpToCite} />
        : <div className="v2-loading-inline"><span className="v2-typing"><i></i><i></i><i></i></span>{toolStatus || '正在思考…'}</div>}
      {/* 引用卡置于气泡内：jumpToCite 依赖 closest('.v2-bubble, .wx-bubble') 内查找 .v2-cite（移动气泡用 .wx-bubble） */}
      {!m.streaming && m.citations && m.citations.length > 0 && (
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
      {!m.streaming && m.guide && (
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
      {m.jobs && m.jobs.length > 0 && (m.content || !m.streaming) && <EmploymentJobCards jobs={m.jobs} onAsk={(q) => send(q)} />}
      {!m.streaming && m.note && <div className="v2-note-line">{m.note}</div>}
    </div>
  );
}

/* 全页布局内联样式（移动端特有外壳；气泡/引用/就业卡复用 v2.css 既有类） */
const S = {
  root: { position: 'fixed', left: 0, right: 0, top: 0, bottom: 0, margin: '0 auto', maxWidth: 560,
    display: 'flex', flexDirection: 'column', background: '#F4F7FB', color: 'var(--p-t1,#182234)' },
  header: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#fff',
    borderBottom: '1px solid #E6ECF3', flex: '0 0 auto' },
  back: { display: 'inline-flex', alignItems: 'center', border: 'none', background: 'transparent',
    color: '#4A6CF7', fontSize: 13.5, padding: '6px 4px', cursor: 'pointer', flex: '0 0 auto' },
  headMid: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headName: { fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  hist: { flex: '0 0 auto', border: '1px solid #E6ECF3', background: '#F7F9FC', color: '#4A5A6E',
    fontSize: 13, padding: '6px 12px', borderRadius: 16, cursor: 'pointer' },
  body: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '12px 12px 16px' },
  inputBar: { flex: '0 0 auto', padding: '8px 12px', paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
    background: '#fff', borderTop: '1px solid #E6ECF3' },
  suggests: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, WebkitOverflowScrolling: 'touch' },
  sug: { flex: '0 0 auto', fontSize: 12.5, padding: '5px 12px', borderRadius: 16, border: '1px solid #E6ECF3',
    background: '#F7F9FC', color: '#4A5A6E', whiteSpace: 'nowrap', cursor: 'pointer' },
  inputRow: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  ta: { flex: 1, minHeight: 40, maxHeight: 96, resize: 'none', border: '1px solid #E6ECF3', borderRadius: 10,
    padding: '9px 12px', fontSize: 14, lineHeight: 1.5, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  send: { flex: '0 0 auto', width: 44, height: 40, border: 'none', borderRadius: 10, background: '#4A6CF7',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  histMask: { position: 'absolute', inset: 0, background: 'rgba(16,24,40,.35)', zIndex: 5,
    display: 'flex', justifyContent: 'flex-end' },
  histPanel: { width: '82%', maxWidth: 360, height: '100%', background: '#fff', display: 'flex', flexDirection: 'column',
    boxShadow: '-8px 0 30px rgba(16,24,40,.15)', paddingBottom: 'env(safe-area-inset-bottom)' },
  histHead: { display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #E6ECF3' },
  histTitle: { flex: 1, fontSize: 15, fontWeight: 600 },
  histClose: { fontSize: 16, color: '#4A5A6E', padding: '4px 8px', cursor: 'pointer' },
  newBtn: { margin: 12, height: 40, border: 'none', borderRadius: 10, background: '#4A6CF7', color: '#fff',
    fontSize: 14, cursor: 'pointer' },
  convList: { flex: 1, overflowY: 'auto', padding: '0 12px 12px' },
  convItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10,
    border: '1px solid #E6ECF3', marginBottom: 8, cursor: 'pointer' },
  convItemOn: { borderColor: '#4A6CF7', background: '#F2F5FF' },
  convT: { flex: 1, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  convRm: { flex: '0 0 auto', border: 'none', background: 'transparent', color: '#A9B2C0', fontSize: 13, cursor: 'pointer' },
  convEmpty: { textAlign: 'center', color: '#7A8A9E', fontSize: 12.5, padding: '18px 0' },
};
