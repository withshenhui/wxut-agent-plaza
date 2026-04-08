import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from './components/PageLayout';
import AgentIcon from './components/AgentIcon';
import { getAgentDetail } from './api/agent';

function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 从后端获取智能体详情
  useEffect(() => {
    getAgentDetail(id)
      .then((data) => {
        setAgent(data);
        setMessages([
          {
            id: 1,
            sender: 'agent',
            content: `你好！我是${data.name}，有什么可以帮助你的吗？`,
            timestamp: new Date()
          }
        ]);
      })
      .catch(() => navigate('/'));
  }, [id, navigate]);

  // 发送消息
  const sendMessage = () => {
    if (!inputMessage.trim() || !agent) return;

    const newMessage = {
      id: messages.length + 1,
      sender: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages([...messages, newMessage]);
    setInputMessage('');

    // 模拟智能体回复
    setTimeout(() => {
      const agentReply = {
        id: messages.length + 2,
        sender: 'agent',
        content: `这是${agent.name}的回复：你刚才说的是"${inputMessage.trim()}"。`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentReply]);
    }, 1000);
  };

  // 处理键盘事件
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  if (!agent) {
    return (
      <PageLayout
        title="智能体对话"
        onBack={() => navigate('/')}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        activePath=""
      >
        <div className="el-section">
          <p className="el-section__text">加载中...</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="智能体对话"
      onBack={() => navigate('/')}
      isSidebarCollapsed={isSidebarCollapsed}
      setIsSidebarCollapsed={setIsSidebarCollapsed}
      activePath=""
      footerText="© 锡职大智能体广场    技术支持：信息中心"
    >
      {/* 智能体详情区域 */}
      <div className="el-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <AgentIcon emoji={agent.icon} category="student" />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--el-text-color-primary)', marginBottom: '8px', margin: '0 0 8px 0' }}>{agent.name}</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {agent.tags.map((tag, index) => (
                <span key={index} className="el-tag el-tag--default">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 聊天容器 */}
      <div className="el-chat-container">
        <div className="el-chat-messages">
          {messages.map(message => (
            <div
              key={message.id}
              className={`el-chat-message${message.sender === 'user' ? ' el-chat-message--user' : ''}`}
            >
              <span className="el-chat-avatar">
                {message.sender === 'user' ? '👤' : agent.icon}
              </span>
              <div>
                <div className={`el-chat-bubble${message.sender === 'user' ? ' el-chat-bubble--user' : ' el-chat-bubble--agent'}`}>
                  {message.content}
                </div>
                <div className="el-chat-time">{message.timestamp.toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="el-chat-input-bar">
          <input
            type="text"
            placeholder="输入消息..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button className="el-button el-button--primary" onClick={sendMessage}>发送</button>
        </div>
      </div>
    </PageLayout>
  );
}

export default ChatPage;
