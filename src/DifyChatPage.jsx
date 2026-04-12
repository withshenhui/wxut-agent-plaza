import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { marked } from 'marked';

const DIFY_BASE = import.meta.env.PROD
  ? `${import.meta.env.VITE_API_BASE_URL || ''}/dify/v1`
  : '/dify/v1';
const DIFY_API_KEY = 'app-YUWEWyPPnRQOXoYEiNxu8CUe';

export default function DifyChatPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('2013070823');
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [opening, setOpening] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [expandedThinking, setExpandedThinking] = useState({});
  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);
  const streamingRef = useRef(false);
  const thinkingTimers = useRef({});

  // 获取应用参数（开场白、推荐问题）
  useEffect(() => {
    fetch(`${DIFY_BASE}/parameters`, {
      headers: { Authorization: `Bearer ${DIFY_API_KEY}` },
    })
      .then(r => r.json())
      .then(data => {
        setOpening(data.opening_statement || '');
        setSuggestedQuestions(data.suggested_questions || []);
      })
      .catch(() => {});
  }, []);

  // 获取会话列表
  const loadConversations = useCallback(() => {
    fetch(`${DIFY_BASE}/conversations?user=${userId}&limit=50`, {
      headers: { Authorization: `Bearer ${DIFY_API_KEY}` },
    })
      .then(r => r.json())
      .then(res => setConversations(res.data || []))
      .catch(() => {});
  }, [userId]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // 加载会话历史消息
  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    // 流式传输中不加载历史，避免覆盖正在流式的消息
    if (streamingRef.current) return;
    fetch(`${DIFY_BASE}/messages?user=${userId}&conversation_id=${activeConvId}&limit=50`, {
      headers: { Authorization: `Bearer ${DIFY_API_KEY}` },
    })
      .then(r => r.json())
      .then(res => {
        const list = [];
        (res.data || []).reverse().forEach(m => {
          if (m.query) {
            list.push({ id: m.id + '-q', role: 'user', content: m.query });
          }
          if (m.answer) {
            list.push({ id: m.id + '-a', role: 'assistant', content: m.answer });
          }
        });
        setMessages(list);
      })
      .catch(() => setMessages([]));
  }, [activeConvId, userId]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 新建会话
  const newChat = () => {
    setActiveConvId(null);
    setMessages([]);
  };

  // 删除会话
  const deleteConv = (convId) => {
    fetch(`${DIFY_BASE}/conversations/${convId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${DIFY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: userId }),
    }).then(() => {
      if (activeConvId === convId) { setActiveConvId(null); setMessages([]); }
      loadConversations();
    });
  };

  // 切换思考过程展开/收起
  const toggleThinking = (msgId) => {
    setExpandedThinking(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // 发送消息（流式）
  const sendMessage = async (text) => {
    const query = text || input.trim();
    if (!query || streaming) return;
    setInput('');
    setStreaming(true);
    streamingRef.current = true;

    // 添加用户消息到列表
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: query }]);

    const taskIdRef = { current: null };
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${DIFY_BASE}/chat-messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${DIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {},
          query,
          response_mode: 'streaming',
          conversation_id: activeConvId || '',
          user: userId,
        }),
        signal: abortRef.current.signal,
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMsgId = Date.now() + 1;
      let fullAnswer = '';
      let fullThinking = '';
      let convId = activeConvId;
      let thinkingStartTime = null;
      let thinkingTimerInterval = null;

      // 先添加空的 assistant 消息
      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        thinking: '',
        thinkingDone: false,
        thinkingTime: 0,
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);

            // 处理思考过程事件（Dify agent_thought 或含 thinking 的 message）
            if (data.event === 'agent_thought') {
              const thought = data.thought || data.agent_thought || '';
              if (thought) {
                if (!thinkingStartTime) {
                  thinkingStartTime = Date.now();
                  // 启动计时器，每秒更新 thinkingTime
                  thinkingTimerInterval = setInterval(() => {
                    const elapsed = Math.round((Date.now() - thinkingStartTime) / 1000);
                    setMessages(prev =>
                      prev.map(m => m.id === assistantMsgId ? { ...m, thinkingTime: elapsed } : m)
                    );
                  }, 1000);
                }
                fullThinking += thought;
                setMessages(prev =>
                  prev.map(m => m.id === assistantMsgId ? { ...m, thinking: fullThinking } : m)
                );
              }
            }

            if (data.event === 'message') {
              // 处理 thinking 字段（部分模型在 message 事件中包含思考内容）
              if (data.thinking) {
                if (!thinkingStartTime) {
                  thinkingStartTime = Date.now();
                  thinkingTimerInterval = setInterval(() => {
                    const elapsed = Math.round((Date.now() - thinkingStartTime) / 1000);
                    setMessages(prev =>
                      prev.map(m => m.id === assistantMsgId ? { ...m, thinkingTime: elapsed } : m)
                    );
                  }, 1000);
                }
                fullThinking += data.thinking;
              }
              fullAnswer += data.answer || '';
              setMessages(prev =>
                prev.map(m => m.id === assistantMsgId ? {
                  ...m,
                  content: fullAnswer,
                  thinking: fullThinking || m.thinking,
                } : m)
              );
            }

            if (data.event === 'message_end') {
              // 停止计时器
              if (thinkingTimerInterval) clearInterval(thinkingTimerInterval);
              const thinkingDuration = thinkingStartTime
                ? Math.round((Date.now() - thinkingStartTime) / 1000)
                : 0;
              // 标记思考完成，记录用时
              setMessages(prev =>
                prev.map(m => m.id === assistantMsgId ? {
                  ...m,
                  thinkingDone: true,
                  thinkingTime: thinkingDuration,
                } : m)
              );
              // 流式结束后再设置 activeConvId，避免触发历史加载覆盖消息
              if (data.conversation_id && !convId) {
                convId = data.conversation_id;
                // 延迟设置，确保 streamingRef 先置 false
                setTimeout(() => {
                  setActiveConvId(convId);
                }, 0);
              }
              loadConversations();
            }

            if (data.event === 'error') {
              if (thinkingTimerInterval) clearInterval(thinkingTimerInterval);
              setMessages(prev =>
                prev.map(m => m.id === assistantMsgId ? {
                  ...m,
                  content: `[错误] ${data.message || '未知错误'}`,
                  thinkingDone: true,
                  thinkingTime: thinkingStartTime ? Math.round((Date.now() - thinkingStartTime) / 1000) : 0,
                } : m)
              );
            }

            if (data.task_id) taskIdRef.current = data.task_id;
          } catch {}
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setMessages(prev => [...prev, { id: Date.now() + 2, role: 'assistant', content: `[请求失败] ${e.message}` }]);
      }
    } finally {
      if (thinkingTimerInterval) clearInterval(thinkingTimerInterval);
      setStreaming(false);
      streamingRef.current = false;
    }
  };

  // 停止生成
  const stopGenerate = () => {
    abortRef.current?.abort();
    setStreaming(false);
    streamingRef.current = false;
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'var(--el-font-family)', background: 'var(--el-bg-color-page)' }}>
      {/* CSS 动画 & Markdown 样式 */}
      <style>{`
        @keyframes ds-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes ds-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .ds-thinking-spinner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }
        .ds-thinking-spinner svg {
          animation: ds-spin 1s linear infinite;
        }
        .ds-thinking-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          cursor: pointer;
          user-select: none;
          border-radius: 8px 8px 0 0;
          transition: background 0.2s;
          background: linear-gradient(135deg, rgba(79, 108, 255, 0.06) 0%, rgba(145, 109, 255, 0.06) 100%);
        }
        .ds-thinking-header:hover {
          background: linear-gradient(135deg, rgba(79, 108, 255, 0.1) 0%, rgba(145, 109, 255, 0.1) 100%);
        }
        .ds-thinking-label {
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ds-thinking-label.active {
          color: #6366f1;
        }
        .ds-thinking-label.done {
          color: #8b5cf6;
        }
        .ds-thinking-duration {
          font-size: 12px;
          color: #a1a1aa;
          margin-left: 4px;
        }
        .ds-chevron {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 14px;
          color: #a1a1aa;
          margin-left: auto;
          display: inline-flex;
        }
        .ds-chevron.expanded {
          transform: rotate(180deg);
        }
        .ds-thinking-body {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
          opacity: 0;
          border-top: 1px solid rgba(139, 92, 246, 0.1);
          background: linear-gradient(180deg, rgba(79, 108, 255, 0.02) 0%, rgba(145, 109, 255, 0.02) 100%);
        }
        .ds-thinking-body.expanded {
          max-height: 2000px;
          opacity: 1;
        }
        .ds-thinking-body-inner {
          padding: 10px 14px 12px;
          font-size: 13px;
          line-height: 1.8;
          color: #71717a;
        }
        .ds-thinking-body-inner p:last-child {
          margin-bottom: 0;
        }

        /* Markdown 渲染样式 */
        .dify-markdown { word-break: break-word; }
        .dify-markdown p { margin: 0 0 8px; }
        .dify-markdown p:last-child { margin-bottom: 0; }
        .dify-markdown h1, .dify-markdown h2, .dify-markdown h3,
        .dify-markdown h4, .dify-markdown h5, .dify-markdown h6 {
          margin: 12px 0 6px; font-weight: 600; line-height: 1.4;
        }
        .dify-markdown h1 { font-size: 1.3em; }
        .dify-markdown h2 { font-size: 1.2em; }
        .dify-markdown h3 { font-size: 1.1em; }
        .dify-markdown ul, .dify-markdown ol { margin: 6px 0; padding-left: 20px; }
        .dify-markdown li { margin: 2px 0; }
        .dify-markdown blockquote {
          margin: 8px 0; padding: 6px 12px;
          border-left: 3px solid #ddd; background: #f9f9f9; color: #666;
        }
        .dify-markdown code {
          background: #f0f0f0; padding: 2px 5px; border-radius: 3px;
          font-size: 0.9em; font-family: 'Menlo', 'Consolas', monospace;
        }
        .dify-markdown pre {
          margin: 8px 0; padding: 12px; border-radius: 6px;
          background: #1e1e1e; color: #d4d4d4; overflow-x: auto;
        }
        .dify-markdown pre code {
          background: none; padding: 0; font-size: 0.85em; color: inherit;
        }
        .dify-markdown strong { font-weight: 600; }
        .dify-markdown em { font-style: italic; }
        .dify-markdown a { color: var(--el-color-primary); text-decoration: none; }
        .dify-markdown a:hover { text-decoration: underline; }
        .dify-markdown table { border-collapse: collapse; margin: 8px 0; width: 100%; }
        .dify-markdown th, .dify-markdown td {
          border: 1px solid #e0e0e0; padding: 6px 10px; text-align: left;
        }
        .dify-markdown th { background: #f5f5f5; font-weight: 600; }
        .dify-markdown hr { border: none; border-top: 1px solid #e0e0e0; margin: 12px 0; }
      `}</style>

      {/* 左侧会话列表 */}
      <div style={{ width: 260, borderRight: '1px solid var(--el-border-color-light)', display: 'flex', flexDirection: 'column', background: 'var(--el-bg-color)' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--el-border-color-lighter)' }}>
          <button
            onClick={newChat}
            style={{
              width: '100%', padding: '10px', borderRadius: 8, border: '1px dashed var(--el-border-color)',
              background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--el-color-primary)', fontWeight: 500,
            }}
          >
            + 新建对话
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                background: activeConvId === conv.id ? 'var(--el-color-primary-light-9)' : 'transparent',
                color: activeConvId === conv.id ? 'var(--el-color-primary)' : 'var(--el-text-color-regular)',
                fontSize: 13, transition: 'background 0.2s',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {conv.name || '新对话'}
              </span>
              <span
                onClick={(e) => { e.stopPropagation(); deleteConv(conv.id); }}
                style={{ marginLeft: 8, opacity: 0.4, fontSize: 16, flexShrink: 0 }}
                title="删除"
              >
                ×
              </span>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--el-border-color-lighter)', fontSize: 12, color: 'var(--el-text-color-secondary)' }}>
          Dify API 测试页
        </div>
      </div>

      {/* 右侧聊天区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* 顶栏 */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', borderBottom: '1px solid var(--el-border-color-light)', background: 'var(--el-bg-color)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--el-text-color-secondary)' }}>←</button>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--el-text-color-primary)', margin: 0 }}>
              就业推荐智能体
            </h2>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--el-color-primary-light-9)', color: 'var(--el-color-primary)' }}>
              Dify
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--el-text-color-secondary)' }}>
            <span>用户ID:</span>
            <input
              value={userId}
              onChange={e => setUserId(e.target.value)}
              style={{
                padding: '4px 8px', border: '1px solid var(--el-border-color)', borderRadius: 6,
                fontSize: 13, width: 140, outline: 'none',
              }}
            />
          </div>
        </div>

        {/* 消息区域 */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--el-fill-color-lighter)',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          {/* 开场白 */}
          {!activeConvId && opening && messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0 20px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16, margin: '0 auto 16px',
                background: 'linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-primary-light-3) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#fff',
              }}>🤖</div>
              <p style={{ fontSize: 15, color: 'var(--el-text-color-regular)', lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>{opening}</p>
            </div>
          )}

          {/* 推荐问题 */}
          {!activeConvId && suggestedQuestions.length > 0 && messages.length === 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  style={{
                    padding: '8px 16px', borderRadius: 20, border: '1px solid var(--el-border-color)',
                    background: 'var(--el-bg-color)', cursor: 'pointer', fontSize: 13,
                    color: 'var(--el-text-color-regular)', transition: 'all 0.2s',
                  }}
                  onMouseOver={e => { e.target.style.borderColor = 'var(--el-color-primary)'; e.target.style.color = 'var(--el-color-primary)'; }}
                  onMouseOut={e => { e.target.style.borderColor = 'var(--el-border-color)'; e.target.style.color = 'var(--el-text-color-regular)'; }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* 消息列表 */}
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <span style={{ fontSize: 24, minWidth: 36, textAlign: 'center', flexShrink: 0 }}>
                {msg.role === 'user' ? '👤' : '🤖'}
              </span>
              <div style={{ maxWidth: '70%', minWidth: 0 }}>
                {msg.role === 'assistant' ? (
                  <div style={{
                    background: 'var(--el-bg-color)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}>
                    {/* 思考过程 - DeepSeek 风格 */}
                    {msg.thinking && (
                      <div>
                        {/* 标题栏 */}
                        <div
                          className="ds-thinking-header"
                          onClick={() => toggleThinking(msg.id)}
                        >
                          {msg.thinkingDone ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#8b5cf6"/>
                            </svg>
                          ) : (
                            <span className="ds-thinking-spinner">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="rgba(99,102,241,0.2)" strokeWidth="2.5" fill="none"/>
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="#6366f1" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                              </svg>
                            </span>
                          )}
                          <span className={`ds-thinking-label ${msg.thinkingDone ? 'done' : 'active'}`}>
                            {msg.thinkingDone ? '已深度思考' : '思考中'}
                          </span>
                          {msg.thinkingDone && msg.thinkingTime && (
                            <span className="ds-thinking-duration">用时 {msg.thinkingTime}s</span>
                          )}
                          {!msg.thinkingDone && (
                            <span className="ds-thinking-duration" style={{ animation: 'ds-pulse 1.5s ease-in-out infinite' }}>思考中...</span>
                          )}
                          <span className={`ds-chevron ${expandedThinking[msg.id] ? 'expanded' : ''}`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                        </div>
                        {/* 思考内容 - CSS 过渡折叠 */}
                        <div className={`ds-thinking-body ${expandedThinking[msg.id] ? 'expanded' : ''}`}>
                          <div
                            className="ds-thinking-body-inner dify-markdown"
                            dangerouslySetInnerHTML={{ __html: marked.parse(msg.thinking || '') }}
                          />
                        </div>
                      </div>
                    )}
                    {/* 回答内容 */}
                    {msg.content && (
                      <div
                        className="dify-markdown"
                        style={{
                          padding: '12px 14px',
                          fontSize: 14,
                          lineHeight: 1.6,
                          color: 'var(--el-text-color-primary)',
                        }}
                        dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }}
                      />
                    )}
                  </div>
                ) : (
                  <div style={{
                    padding: '12px 16px', borderRadius: 8, fontSize: 14, lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    background: 'linear-gradient(135deg, #4A6CF7 0%, #6B8AFF 100%)', color: '#fff',
                  }}>
                    {msg.content}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--el-border-color-light)',
          display: 'flex', gap: 12, background: 'var(--el-bg-color)',
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="输入消息..."
            disabled={streaming}
            style={{
              flex: 1, padding: '10px 16px', border: '1px solid var(--el-border-color)',
              borderRadius: 8, fontSize: 14, outline: 'none',
            }}
          />
          {streaming ? (
            <button
              onClick={stopGenerate}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: 'var(--el-color-danger)', color: '#fff', cursor: 'pointer', fontSize: 14,
              }}
            >
              停止
            </button>
          ) : (
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: input.trim() ? 'var(--el-color-primary)' : 'var(--el-color-primary-light-7)',
                color: '#fff', cursor: input.trim() ? 'pointer' : 'default', fontSize: 14,
              }}
            >
              发送
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
