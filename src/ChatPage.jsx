import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAgentDetail } from './api/agent';
import { useUser } from './UserContext';

function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [agent, setAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    getAgentDetail(id)
      .then((data) => {
        setAgent(data);
        setMessages([
          { id: 1, sender: 'agent', content: `你好！我是${data.name}，有什么可以帮助你的吗？`, timestamp: new Date() },
        ]);
      })
      .catch(() => navigate('/'));
  }, [id, navigate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const sendMessage = () => {
    if (!inputMessage.trim() || !agent) return;
    const text = inputMessage.trim();
    setMessages((prev) => [...prev, { id: prev.length + 1, sender: 'user', content: text, timestamp: new Date() }]);
    setInputMessage('');
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        id: prev.length + 1,
        sender: 'agent',
        content: `这是${agent.name}的回复：你刚才说的是"${text}"。`,
        timestamp: new Date(),
      }]);
    }, 800);
  };

  if (!agent) return null;

  const nickname = user?.nickname || user?.username;

  return (
    <div className="chat-immersive">
      {/* 顶部细条：返回 + 智能体身份 */}
      <header className="chat-top">
        <button className="chat-back" onClick={() => navigate('/plaza')} aria-label="返回">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <span className="chat-agent-emoji">{agent.icon || '🤖'}</span>
        <div className="chat-agent-meta">
          <b>{agent.name}</b>
          <span className="chat-agent-desc">{agent.description || (agent.tags || []).slice(0, 3).join(' · ')}</span>
        </div>
      </header>

      {/* 消息流：吃满剩余高度 */}
      <div className="chat-stream" ref={scrollRef}>
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg chat-msg--${m.sender}`}>
            <span className="chat-msg__ava">{m.sender === 'user' ? (nickname?.[0] || '我') : (agent.icon || '🤖')}</span>
            <div className="chat-msg__body">
              <div className="chat-msg__name">{m.sender === 'user' ? (nickname || '我') : agent.name}</div>
              <div className="chat-msg__bubble">{m.content}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 输入区：悬浮胶囊 */}
      <footer className="chat-composer">
        <div className="chat-composer__box">
          <textarea
            rows={1}
            placeholder={`向 ${agent.name} 提问…（Enter 发送 / Shift+Enter 换行）`}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
          />
          <button
            className="chat-send"
            onClick={sendMessage}
            disabled={!inputMessage.trim()}
            aria-label="发送"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </button>
        </div>
      </footer>
    </div>
  );
}

export default ChatPage;
