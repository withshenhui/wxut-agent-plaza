import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from './components/PageLayout';
import AgentIcon from './components/AgentIcon';

function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 模拟智能体数据
  const mockAgents = [
    {
      id: 1,
      name: '日常管理智能体',
      icon: '📅',
      description: '提供学生日常管理和事务处理帮助。',
      tags: ['学生', '日常', '管理'],
      detail: '这是一个专业的日常管理智能体，可以帮助你处理学生日常管理事务。'
    },
    {
      id: 2,
      name: '心理健康智能体',
      icon: '❤️',
      description: '提供心理健康咨询和情绪支持。',
      tags: ['心理', '健康', '咨询'],
      detail: '这是一个专业的心理健康智能体，可以帮助你处理心理问题，提供情绪支持。'
    },
    {
      id: 3,
      name: '智能推荐智能体',
      icon: '🎯',
      description: '为学生提供个性化的学习和发展推荐。',
      tags: ['智能', '推荐', '个性化'],
      detail: '这是一个专业的智能推荐智能体，可以为你提供个性化的学习和发展推荐。',
      url: 'http://210.28.145.149:8080'
    },
    {
      id: 4,
      name: '贫困生资助智能体',
      icon: '💰',
      description: '提供贫困生资助政策和申请帮助。',
      tags: ['贫困生', '资助', '政策'],
      detail: '这是一个专业的贫困生资助智能体，可以帮助你了解资助政策，指导申请流程。'
    },
    {
      id: 5,
      name: '职业规划智能体',
      icon: '🎓',
      description: '提供职业规划建议和就业指导。',
      tags: ['职业', '规划', '就业'],
      detail: '这是一个专业的职业规划智能体，可以帮助你规划职业生涯，提供就业指导。'
    },
    {
      id: 6,
      name: '少数民族学生关怀智能体',
      icon: '🤝',
      description: '为少数民族学生提供关怀和支持服务。',
      tags: ['少数民族', '学生', '关怀'],
      detail: '这是一个专业的少数民族学生关怀智能体，可以为你提供关怀和支持服务。'
    },
    {
      id: 7,
      name: '班主任工作评估智能体',
      icon: '📊',
      description: '提供班主任工作评估和管理帮助。',
      tags: ['班主任', '工作', '评估'],
      detail: '这是一个专业的班主任工作评估智能体，可以帮助你进行工作评估和管理。'
    },
    {
      id: 8,
      name: '学生党建智能体',
      icon: '🚩',
      description: '提供学生党建工作和党员发展帮助。',
      tags: ['学生', '党建', '党员'],
      detail: '这是一个专业的学生党建智能体，可以帮助你了解党建工作和党员发展流程。'
    },
    {
      id: 9,
      name: '就业实习智能体',
      icon: '💼',
      description: '提供就业实习信息和指导服务。',
      tags: ['就业', '实习', '指导'],
      detail: '这是一个专业的就业实习智能体，可以帮助你获取就业实习信息，提供指导服务。'
    },
    {
      id: 11,
      name: '岗聘管理智能体',
      icon: '💼',
      description: '提供教师岗聘管理和相关政策咨询。',
      tags: ['教师', '岗聘', '管理'],
      detail: '这是一个专业的岗聘管理智能体，可以帮助你了解岗聘政策，处理岗聘相关事务。'
    },
    {
      id: 12,
      name: '职称评定智能体',
      icon: '🎓',
      description: '提供教师职称评定政策和申请帮助。',
      tags: ['教师', '职称', '评定'],
      detail: '这是一个专业的职称评定智能体，可以帮助你了解职称评定政策，指导申请流程。'
    },
    {
      id: 13,
      name: '发展成长智能体',
      icon: '📈',
      description: '提供教师专业发展和成长规划帮助。',
      tags: ['教师', '发展', '成长'],
      detail: '这是一个专业的发展成长智能体，可以帮助你进行专业发展规划，促进个人成长。'
    },
    {
      id: 14,
      name: '企业实践管理智能体',
      icon: '🏭',
      description: '提供教师企业实践管理和相关服务。',
      tags: ['教师', '企业', '实践'],
      detail: '这是一个专业的企业实践管理智能体，可以帮助你管理企业实践相关事务。'
    },
    {
      id: 15,
      name: '实训教学管理智能体',
      icon: '🔧',
      description: '提供实训教学管理和相关服务。',
      tags: ['实训', '教学', '管理'],
      detail: '这是一个专业的实训教学管理智能体，可以帮助你管理实训教学相关事务。'
    },
    {
      id: 16,
      name: '技能大赛管理智能体',
      icon: '🏆',
      description: '提供技能大赛管理和相关服务。',
      tags: ['技能', '大赛', '管理'],
      detail: '这是一个专业的技能大赛管理智能体，可以帮助你管理技能大赛相关事务。'
    },
    {
      id: 17,
      name: '课程建设智能体',
      icon: '📚',
      description: '提供课程建设指导和管理帮助。',
      tags: ['课程', '建设', '管理'],
      detail: '这是一个专业的课程建设智能体，可以帮助你进行课程建设和管理。'
    },
    {
      id: 18,
      name: '教学评价智能体',
      icon: '📊',
      description: '提供教学评价和质量分析服务。',
      tags: ['教学', '评价', '质量'],
      detail: '这是一个专业的教学评价智能体，可以帮助你进行教学评价和质量分析。'
    },
    {
      id: 19,
      name: '课件制作智能体',
      icon: '🎨',
      description: '提供课件制作指导和相关资源。',
      tags: ['课件', '制作', '资源'],
      detail: '这是一个专业的课件制作智能体，可以帮助你制作高质量的课件，提供相关资源。'
    },
    {
      id: 20,
      name: '实训基地管理智能体',
      icon: '🏢',
      description: '提供实训基地管理和相关服务。',
      tags: ['实训', '基地', '管理'],
      detail: '这是一个专业的实训基地管理智能体，可以帮助你管理实训基地相关事务。'
    },
    {
      id: 21,
      name: '教材建设管理智能体',
      icon: '📖',
      description: '提供教材建设管理和相关服务。',
      tags: ['教材', '建设', '管理'],
      detail: '这是一个专业的教材建设管理智能体，可以帮助你管理教材建设相关事务。'
    },
    {
      id: 22,
      name: '科研项目管理智能体',
      icon: '📋',
      description: '提供科研项目管理和申报指导。',
      tags: ['科研', '项目', '管理'],
      detail: '这是一个专业的科研项目管理智能体，可以帮助你管理科研项目，指导申报流程。'
    },
    {
      id: 23,
      name: '科研成果管理转化智能体',
      icon: '🔄',
      description: '提供科研成果管理和转化服务。',
      tags: ['科研', '成果', '转化'],
      detail: '这是一个专业的科研成果管理转化智能体，可以帮助你管理科研成果，促进成果转化。'
    },
    {
      id: 24,
      name: '专利管理智能体',
      icon: '📄',
      description: '提供专利申请和管理相关服务。',
      tags: ['专利', '申请', '管理'],
      detail: '这是一个专业的专利管理智能体，可以帮助你进行专利申请和管理。'
    },
    {
      id: 25,
      name: '高水平研究所管理智能体',
      icon: '🏛️',
      description: '提供高水平研究所管理和相关服务。',
      tags: ['研究所', '高水平', '管理'],
      detail: '这是一个专业的高水平研究所管理智能体，可以帮助你管理研究所相关事务。'
    },
    {
      id: 26,
      name: '科研团队管理智能体',
      icon: '👥',
      description: '提供科研团队管理和建设帮助。',
      tags: ['科研', '团队', '管理'],
      detail: '这是一个专业的科研团队管理智能体，可以帮助你管理科研团队，促进团队建设。'
    },
    {
      id: 27,
      name: '科研实训室管理智能体',
      icon: '🔬',
      description: '提供科研实训室管理和相关服务。',
      tags: ['科研', '实训室', '管理'],
      detail: '这是一个专业的科研实训室管理智能体，可以帮助你管理实训室相关事务。'
    },
    {
      id: 28,
      name: '学术交流管理智能体',
      icon: '💬',
      description: '提供学术交流活动管理和相关服务。',
      tags: ['学术', '交流', '管理'],
      detail: '这是一个专业的学术交流管理智能体，可以帮助你管理学术交流活动。'
    },
    {
      id: 29,
      name: '科研诚信管理智能体',
      icon: '✅',
      description: '提供科研诚信教育和管理服务。',
      tags: ['科研', '诚信', '管理'],
      detail: '这是一个专业的科研诚信管理智能体，可以帮助你了解科研诚信要求，规范科研行为。'
    },
    {
      id: 30,
      name: '固定资产管理智能体',
      icon: '🏢',
      description: '提供固定资产管理和相关服务。',
      tags: ['固定', '资产', '管理'],
      detail: '这是一个专业的固定资产管理智能体，可以帮助你管理固定资产相关事务。'
    },
    {
      id: 31,
      name: '智慧教室管理智能体',
      icon: '📱',
      description: '提供智慧教室管理和相关服务。',
      tags: ['智慧', '教室', '管理'],
      detail: '这是一个专业的智慧教室管理智能体，可以帮助你管理智慧教室相关事务。'
    },
    {
      id: 32,
      name: '能源与设施监控智能体',
      icon: '🔌',
      description: '提供能源与设施监控和管理服务。',
      tags: ['能源', '设施', '监控'],
      detail: '这是一个专业的能源与设施监控智能体，可以帮助你监控和管理能源与设施。'
    },
    {
      id: 33,
      name: '校园安防智能体',
      icon: '🛡️',
      description: '提供校园安防管理和相关服务。',
      tags: ['校园', '安防', '管理'],
      detail: '这是一个专业的校园安防智能体，可以帮助你管理校园安防相关事务。'
    },
    {
      id: 34,
      name: '网络与信息服务监控智能体',
      icon: '🌐',
      description: '提供网络与信息服务监控和管理。',
      tags: ['网络', '信息', '监控'],
      detail: '这是一个专业的网络与信息服务监控智能体，可以帮助你监控和管理网络与信息服务。'
    },
    {
      id: 35,
      name: '物业服务智能体',
      icon: '🏠',
      description: '提供物业服务管理和相关服务。',
      tags: ['物业', '服务', '管理'],
      detail: '这是一个专业的物业服务智能体，可以帮助你管理物业服务相关事务。'
    },
    {
      id: 36,
      name: '一卡通综合服务智能体',
      icon: '💳',
      description: '提供一卡通综合服务和管理帮助。',
      tags: ['一卡通', '服务', '管理'],
      detail: '这是一个专业的一卡通综合服务智能体，可以帮助你使用和管理一卡通服务。'
    },
    {
      id: 37,
      name: '信息化建设智能体',
      icon: '💻',
      description: '提供信息化建设相关咨询和服务。',
      tags: ['信息化', '建设', '咨询'],
      detail: '这是一个专业的信息化建设智能体，可以帮助你了解信息化建设相关信息，提供咨询服务。',
      url: 'http://210.28.144.91/chat/71SQGSKnGVExSy3o'
    },
    {
      id: 38,
      name: '法务管理智能体',
      icon: '⚖️',
      description: '提供法务咨询和管理相关服务。',
      tags: ['法务', '咨询', '管理'],
      detail: '这是一个专业的法务管理智能体，可以帮助你获取法务咨询，管理法务相关事务。'
    }
  ];

  // 获取当前智能体信息
  useEffect(() => {
    const foundAgent = mockAgents.find(a => a.id === parseInt(id));
    if (foundAgent) {
      setAgent(foundAgent);
      setMessages([
        {
          id: 1,
          sender: 'agent',
          content: `你好！我是${foundAgent.name}，有什么可以帮助你的吗？`,
          timestamp: new Date()
        }
      ]);
    } else {
      navigate('/');
    }
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
        footerText="© 锡职大智能体广场    技术支持：信息中心"
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
