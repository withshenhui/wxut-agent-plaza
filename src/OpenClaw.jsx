import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from './components/PageLayout';

function OpenClaw() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  return (
    <PageLayout
      title="OpenClaw（龙虾）"
      onBack={() => navigate('/')}
      isSidebarCollapsed={isSidebarCollapsed}
      setIsSidebarCollapsed={setIsSidebarCollapsed}
      activePath="/openclaw"
    >
      {/* Title and Introduction */}
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--el-text-color-primary)', marginBottom: '1rem' }}>OpenClaw 完全指南（花园版）！</h1>
        <p className="el-section__text" style={{ marginBottom: '1rem' }}>大家好，欢迎来到 code秘密花园，我是花园老师（ConardLi）。</p>
        <p className="el-section__text" style={{ marginBottom: '1rem' }}>最近 OpenClaw 太火了，这个现象级工具的热度似乎超越了以往的任何 AI 模型和产品。</p>
        <p className="el-section__text" style={{ marginBottom: '1rem' }}>微信指数直接破亿并且还在以超高速度增长。</p>
        <div style={{ fontSize: '0.9rem', color: 'var(--el-text-color-secondary)', display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
          <span>最后更新: 2026-03-13</span>
          <span>作者: 花园老师（ConardLi）</span>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="el-section">
        <h2 className="el-section__title">目录</h2>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <li><a href="#what-is-openclaw" className="el-link" style={{ fontSize: '1.1rem' }}>OpenClaw 到底是啥？</a></li>
          <li><a href="#why-openclaw" className="el-link" style={{ fontSize: '1.1rem' }}>OpenClaw 为什么火？</a></li>
          <li><a href="#architecture" className="el-link" style={{ fontSize: '1.1rem' }}>OpenClaw 的架构有啥独特之处？</a></li>
          <li><a href="#how-to-run" className="el-link" style={{ fontSize: '1.1rem' }}>OpenClaw 怎么跑起来？</a></li>
          <li><a href="#model-config" className="el-link" style={{ fontSize: '1.1rem' }}>OpenClaw 如何配置模型？</a></li>
          <li><a href="#feishu" className="el-link" style={{ fontSize: '1.1rem' }}>OpenClaw 怎么接入飞书？</a></li>
          <li><a href="#skills" className="el-link" style={{ fontSize: '1.1rem' }}>OpenClaw 怎么安装技能？</a></li>
          <li><a href="#personality" className="el-link" style={{ fontSize: '1.1rem' }}>OpenClaw 的人格架构和记忆系统</a></li>
          <li><a href="#multi-agent" className="el-link" style={{ fontSize: '1.1rem' }}>OpenClaw 的多智能体团队如何搭建？</a></li>
          <li><a href="#family" className="el-link" style={{ fontSize: '1.1rem' }}>OpenClaw 家族还有哪些选择？</a></li>
          <li><a href="#cases" className="el-link" style={{ fontSize: '1.1rem' }}>OpenClaw 有哪些有意思的玩法案例？</a></li>
          <li><a href="#security" className="el-link" style={{ fontSize: '1.1rem' }}>OpenClaw 如何才能安全的为你打工？</a></li>
        </ul>
      </div>

      {/* Content Sections */}
      <div className="el-section">
        <section id="what-is-openclaw">
          <h2 className="el-section__title">1. OpenClaw 到底是啥？</h2>
          <div className="el-section__image">
            <img src="/images/openclaw/openclaw-1.webp" alt="OpenClaw 概念图" />
          </div>
          <p className="el-section__text">
            OpenClaw 是一个开源、可自托管的个人 AI Agent 平台。它运行在你自己的机器上（笔记本、VPS 均可），连接你已有的聊天渠道（WhatsApp、Telegram、飞书等 22+ 平台）。它不仅能聊天 —— 更能执行任务：读写文件、处理邮件、运行代码、控制浏览器、调度工作流。
          </p>
          <p className="el-section__text">
            一句话概括：一个坐在你消息应用和工具链之间的 Agent 运行时 + 网关，24/7 永远在线。
          </p>
          <h3 className="el-section__subtitle">1.1 基础前提：模型推理服务</h3>
          <p className="el-section__text">
            GPT、DeepSeek 等大模型，本质是存储在磁盘上的超大参数文件（通常高达几十 GB 甚至上百 GB）。想要让大模型工作，需要一套专门的后端架构将其加载到显存中，对外提供 HTTP 或 WebSocket 接口。这个接收用户请求、进行数学矩阵运算并逐字生成回复的服务，就是推理服务。
          </p>
          <h3 className="el-section__subtitle">1.2 对话记忆：Memory 机制</h3>
          <div className="el-section__image">
            <img src="/images/openclaw/openclaw-2.webp" alt="Memory 机制示意图" />
          </div>
          <p className="el-section__text">
            推理服务本身是无状态的 HTTP 服务，请求处理完成后不会保留任何数据，不同请求可能被不同实例处理。大模型每次处理信息都有字数限制（即上下文窗口 Context Window），且输入的字数越多，计算成本越高、响应越慢。
          </p>
          <p className="el-section__text">
            因此我们也不能简单粗暴地把所有历史对话都塞进去，而是需要分层、按需管理：
          </p>
          <ul style={{ listStyle: 'disc', paddingLeft: '2rem', marginBottom: '1.5rem' }}>
            <li className="el-section__text"><strong>短期记忆：</strong>原封不动地保留最近几轮的对话原文，确保当前对话的连贯性。</li>
            <li className="el-section__text"><strong>长期记忆：</strong>对于久远的对话，系统会在后台触发另一个小模型，将冗长的历史对话压缩成简短摘要；或者提取出结构化的"实体特征"（例如：记住"用户是一名身在上海的程序员"），并存储在数据库中。</li>
          </ul>
          <p className="el-section__text">
            每次用户发起新提问时，系统会先提取并拼装这些记忆片段，再和当前问题一起发送给大模型。这套管理对话上下文、让AI具备 "记忆能力" 的机制，就是 Memory。
          </p>
          <h3 className="el-section__subtitle">1.3 外部知识：RAG 检索增强生成</h3>
          <div className="el-section__image">
            <img src="/images/openclaw/openclaw-3.webp" alt="RAG 工作流程图" />
          </div>
          <p className="el-section__text">
            大模型的知识完全受限于它的训练数据。一旦训练完成，它的知识就 "冻结" 了，无法回答实时新闻或企业内部的保密文档，且容易一本正经地胡说八道。
          </p>
          <p className="el-section__text">RAG 是目前解决此问题最成熟的技术路径，其核心是"先查资料，再作答"。</p>
          <h3 className="el-section__subtitle">1.4 工具调用：MCP 协议</h3>
          <div className="el-section__image">
            <img src="/images/openclaw/openclaw-4.webp" alt="MCP 协议示意图" />
          </div>
          <p className="el-section__text">
            有了 Memory 和 RAG，大模型具备了 "内部记忆" 和 "外部知识"，但它依然是一个封闭在服务器里的纯文本处理系统，无法主动执行获取实时天气、读写本地文件、查询数据库等外部操作。
          </p>
          <p className="el-section__text">
            为了打破这种封闭，行业内发展出了工具调用能力，而 MCP 则是一套标准化、开源的工程协议规范，专门用于统一模型与外部工具的对接标准。
          </p>
          <h3 className="el-section__subtitle">1.5 流程规划：Skills 能力</h3>
          <div className="el-section__image">
            <img src="/images/openclaw/openclaw-5.webp" alt="Skills 能力示意图" />
          </div>
          <p className="el-section__text">
            MCP 解决了"能不能调用工具"的问题，但大模型不知道 何时用、按什么顺序用、如何组合工具，就像拥有工具却不懂修车流程。
          </p>
          <p className="el-section__text">Skills 是一套结构化的操作手册/执行流程：它明确规定了特定场景下，工具的使用顺序、执行逻辑、注意事项。</p>
        </section>

        <section id="why-openclaw" style={{ marginTop: '3rem' }}>
          <h2 className="el-section__title">2. OpenClaw 为什么火？</h2>
          <div className="el-section__image">
            <img src="/images/openclaw/openclaw-6.webp" alt="OpenClaw 热度图表" />
          </div>
          <p className="el-section__text">OpenClaw 之所以火爆，主要因为它解决了几个关键痛点：</p>
          <ul style={{ listStyle: 'disc', paddingLeft: '2rem', marginBottom: '1.5rem' }}>
            <li className="el-section__text"><strong>易用性：</strong>相比其他需要复杂配置的 AI 工具，OpenClaw 提供了更友好的用户界面和更简单的部署流程。</li>
            <li className="el-section__text"><strong>灵活性：</strong>支持多种聊天平台接入，可扩展性强，用户可以根据自己的需求定制功能。</li>
            <li className="el-section__text"><strong>功能丰富：</strong>不仅能聊天，还能执行各种任务，如读写文件、处理邮件、运行代码等。</li>
            <li className="el-section__text"><strong>开源免费：</strong>完全开源，用户可以自由修改和扩展，无需支付昂贵的订阅费用。</li>
          </ul>
          <p className="el-section__text">短短两个月，OpenClaw 已经获得了 297K Stars、116K+ Discord 成员、1000+ 贡献者，成为了现象级的 AI 工具。</p>
        </section>

        <section id="architecture" style={{ marginTop: '3rem' }}>
          <h2 className="el-section__title">3. OpenClaw 的架构有啥独特之处？</h2>
          <div className="el-section__image">
            <img src="/images/openclaw/openclaw-7.webp" alt="OpenClaw 架构图" />
          </div>
          <p className="el-section__text">OpenClaw 的架构设计具有以下独特之处：</p>
          <ul style={{ listStyle: 'disc', paddingLeft: '2rem', marginBottom: '1.5rem' }}>
            <li className="el-section__text"><strong>模块化设计：</strong>采用模块化架构，各组件之间解耦，便于扩展和维护。</li>
            <li className="el-section__text"><strong>多平台支持：</strong>支持 22+ 聊天平台，用户可以在自己喜欢的平台上使用。</li>
            <li className="el-section__text"><strong>插件系统：</strong>通过 Skills 系统，用户可以轻松扩展 OpenClaw 的功能。</li>
            <li className="el-section__text"><strong>记忆机制：</strong>内置 Memory 系统，让 AI 具备长期记忆能力。</li>
            <li className="el-section__text"><strong>RAG 增强：</strong>支持检索增强生成，让 AI 能够访问最新信息。</li>
          </ul>
        </section>

        <section id="how-to-run" style={{ marginTop: '3rem' }}>
          <h2 className="el-section__title">4. OpenClaw 怎么跑起来？</h2>
          <div className="el-section__image">
            <img src="/images/openclaw/openclaw-8.webp" alt="OpenClaw 运行流程图" />
          </div>
          <p className="el-section__text">运行 OpenClaw 的基本步骤：</p>
          <ol style={{ listStyle: 'decimal', paddingLeft: '2rem', marginBottom: '1.5rem' }}>
            <li className="el-section__text"><strong>环境准备：</strong>确保你的机器有足够的内存和存储空间，安装好必要的依赖。</li>
            <li className="el-section__text"><strong>克隆代码：</strong>从 GitHub 上克隆 OpenClaw 的代码仓库。</li>
            <li className="el-section__text"><strong>配置模型：</strong>设置你要使用的大模型 API 或本地模型。</li>
            <li className="el-section__text"><strong>配置聊天平台：</strong>根据你的需求，配置相应的聊天平台接入。</li>
            <li className="el-section__text"><strong>启动服务：</strong>运行 OpenClaw 服务，开始使用。</li>
          </ol>
        </section>

        <section id="model-config" style={{ marginTop: '3rem' }}>
          <h2 className="el-section__title">5. OpenClaw 如何配置模型？</h2>
          <p className="el-section__text">OpenClaw 支持多种模型配置方式：</p>
          <ul style={{ listStyle: 'disc', paddingLeft: '2rem', marginBottom: '1.5rem' }}>
            <li className="el-section__text"><strong>API 模型：</strong>配置 GPT、DeepSeek 等通过 API 访问的模型。</li>
            <li className="el-section__text"><strong>本地模型：</strong>配置本地运行的模型，如 Llama、ChatGLM 等。</li>
            <li className="el-section__text"><strong>模型参数：</strong>根据需要调整模型的温度、top_p 等参数。</li>
          </ul>
        </section>

        <section id="feishu" style={{ marginTop: '3rem' }}>
          <h2 className="el-section__title">6. OpenClaw 怎么接入飞书？</h2>
          <p className="el-section__text">接入飞书的步骤：</p>
          <ol style={{ listStyle: 'decimal', paddingLeft: '2rem', marginBottom: '1.5rem' }}>
            <li className="el-section__text"><strong>创建飞书应用：</strong>在飞书开放平台创建一个新的应用。</li>
            <li className="el-section__text"><strong>配置权限：</strong>为应用添加必要的权限，如消息读写权限。</li>
            <li className="el-section__text"><strong>获取凭证：</strong>获取应用的 App ID 和 App Secret。</li>
            <li className="el-section__text"><strong>配置 OpenClaw：</strong>在 OpenClaw 中配置飞书相关参数。</li>
            <li className="el-section__text"><strong>部署应用：</strong>将应用部署到飞书，开始使用。</li>
          </ol>
        </section>

        <section id="skills" style={{ marginTop: '3rem' }}>
          <h2 className="el-section__title">7. OpenClaw 怎么安装技能？</h2>
          <p className="el-section__text">安装技能的方法：</p>
          <ol style={{ listStyle: 'decimal', paddingLeft: '2rem', marginBottom: '1.5rem' }}>
            <li className="el-section__text"><strong>浏览技能库：</strong>查看 OpenClaw 社区提供的技能库。</li>
            <li className="el-section__text"><strong>选择技能：</strong>根据你的需求选择合适的技能。</li>
            <li className="el-section__text"><strong>安装技能：</strong>按照技能的安装说明进行安装。</li>
            <li className="el-section__text"><strong>配置技能：</strong>根据需要配置技能的参数。</li>
            <li className="el-section__text"><strong>使用技能：</strong>在对话中触发技能，开始使用。</li>
          </ol>
        </section>

        <section id="personality" style={{ marginTop: '3rem' }}>
          <h2 className="el-section__title">8. OpenClaw 的人格架构和记忆系统</h2>
          <p className="el-section__text">OpenClaw 的人格架构和记忆系统包括：</p>
          <ul style={{ listStyle: 'disc', paddingLeft: '2rem', marginBottom: '1.5rem' }}>
            <li className="el-section__text"><strong>人格设定：</strong>用户可以为 OpenClaw 设置不同的人格特征，如性格、语气等。</li>
            <li className="el-section__text"><strong>短期记忆：</strong>存储最近的对话内容，确保对话的连贯性。</li>
            <li className="el-section__text"><strong>长期记忆：</strong>存储压缩后的历史对话和结构化的实体信息。</li>
            <li className="el-section__text"><strong>记忆检索：</strong>根据当前对话内容，智能检索相关的记忆片段。</li>
          </ul>
        </section>

        <section id="multi-agent" style={{ marginTop: '3rem' }}>
          <h2 className="el-section__title">9. OpenClaw 的多智能体团队如何搭建？</h2>
          <p className="el-section__text">搭建多智能体团队的步骤：</p>
          <ol style={{ listStyle: 'decimal', paddingLeft: '2rem', marginBottom: '1.5rem' }}>
            <li className="el-section__text"><strong>定义角色：</strong>为每个智能体定义明确的角色和职责。</li>
            <li className="el-section__text"><strong>配置智能体：</strong>为每个智能体配置相应的模型和技能。</li>
            <li className="el-section__text"><strong>设置协作机制：</strong>定义智能体之间的协作方式和信息传递机制。</li>
            <li className="el-section__text"><strong>测试和优化：</strong>测试多智能体团队的协作效果，进行必要的优化。</li>
          </ol>
        </section>

        <section id="family" style={{ marginTop: '3rem' }}>
          <h2 className="el-section__title">10. OpenClaw 家族还有哪些选择？</h2>
          <p className="el-section__text">OpenClaw 家族的其他选择包括：</p>
          <ul style={{ listStyle: 'disc', paddingLeft: '2rem', marginBottom: '1.5rem' }}>
            <li className="el-section__text"><strong>OpenClaw Core：</strong>核心版本，适合大多数用户。</li>
            <li className="el-section__text"><strong>OpenClaw Pro：</strong>专业版本，提供更多高级功能。</li>
            <li className="el-section__text"><strong>OpenClaw Enterprise：</strong>企业版本，适合企业级应用。</li>
            <li className="el-section__text"><strong>OpenClaw Mobile：</strong>移动版本，适合移动设备使用。</li>
          </ul>
        </section>

        <section id="cases" style={{ marginTop: '3rem' }}>
          <h2 className="el-section__title">11. OpenClaw 有哪些有意思的玩法案例？</h2>
          <p className="el-section__text">一些有趣的 OpenClaw 玩法案例：</p>
          <ul style={{ listStyle: 'disc', paddingLeft: '2rem', marginBottom: '1.5rem' }}>
            <li className="el-section__text"><strong>个人助手：</strong>作为个人助理，帮助管理日程、处理邮件等。</li>
            <li className="el-section__text"><strong>学习伴侣：</strong>帮助学习新知识，解答问题，提供学习资源。</li>
            <li className="el-section__text"><strong>创意助手：</strong>帮助生成创意，如写作、设计等。</li>
            <li className="el-section__text"><strong>代码助手：</strong>帮助编写代码，调试程序，优化性能。</li>
            <li className="el-section__text"><strong>健康顾问：</strong>提供健康建议，跟踪健康数据。</li>
          </ul>
        </section>

        <section id="security" style={{ marginTop: '3rem' }}>
          <h2 className="el-section__title">12. OpenClaw 如何才能安全的为你打工？</h2>
          <p className="el-section__text">确保 OpenClaw 安全使用的建议：</p>
          <ul style={{ listStyle: 'disc', paddingLeft: '2rem', marginBottom: '1.5rem' }}>
            <li className="el-section__text"><strong>权限管理：</strong>合理设置 OpenClaw 的权限，避免授予过多权限。</li>
            <li className="el-section__text"><strong>数据安全：</strong>注意保护敏感数据，避免在对话中泄露个人信息。</li>
            <li className="el-section__text"><strong>定期更新：</strong>及时更新 OpenClaw 到最新版本，修复安全漏洞。</li>
            <li className="el-section__text"><strong>监控使用：</strong>定期检查 OpenClaw 的使用情况，发现异常及时处理。</li>
            <li className="el-section__text"><strong>技能审核：</strong>只安装来自可信来源的技能，避免恶意技能。</li>
          </ul>
          <p className="el-section__text">
            虽然 OpenClaw 的灵活性设计使得安全隐患不可避免，但通过上述措施，可以大大降低安全风险，让 OpenClaw 安全地为你服务。
          </p>
        </section>
      </div>
    </PageLayout>
  );
}

export default OpenClaw;
