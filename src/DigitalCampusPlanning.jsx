import React, { useState, useEffect, useRef } from 'react';
import PageLayout from './components/PageLayout';

function DigitalCampusPlanning() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('section1');
  const [showModal, setShowModal] = useState(false);
  const [currentImage, setCurrentImage] = useState('');
  const contentRef = useRef(null);

  // 监听滚动事件，更新当前活跃章节
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['section1', 'section2', 'section3'];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetBottom = offsetTop + element.offsetHeight;

          if (scrollPosition >= offsetTop && scrollPosition < offsetBottom) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <PageLayout
      activePath="/campus-planning"
      title="AI科普"
      isSidebarCollapsed={isSidebarCollapsed}
      setIsSidebarCollapsed={setIsSidebarCollapsed}
      footerText="© 无锡职业技术大学    Powered By 信息化与数据服务中心"
    >
      <div style={{ display: 'flex', gap: '20px', maxWidth: '1600px', margin: '0 auto', width: '100%' }} ref={contentRef}>
        {/* 左侧主要内容 */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* 第1节：大模型多模态发展 */}
          <section id="section1" className="el-section">
            <h2 className="el-section__title" style={{ textAlign: 'center' }}>1. 大模型多模态发展</h2>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <p className="el-section__text">
                大模型的多模态发展是人工智能领域的重要趋势，它突破了传统单一文本处理的限制，实现了对文本、图像、音频、视频等多种模态信息的融合理解和生成。以下是从2020年到2026年的发展时间线：
              </p>
              <div className="el-info-box" style={{ marginBottom: '2rem' }}>
                <h3 className="el-section__subtitle" style={{ color: '#0066cc' }}>发展时间线（2020-2026）</h3>
                <div style={{ position: 'relative', paddingLeft: '3rem' }}>
                  {/* 时间线 */}
                  <div style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '0',
                    bottom: '0',
                    width: '2px',
                    backgroundColor: '#0066cc'
                  }}></div>

                  {/* 2020年 */}
                  <div style={{ marginBottom: '2rem', position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: '-2rem',
                      top: '0.3rem',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: '#0066cc'
                    }}></div>
                    <h4 style={{ fontSize: '1.3rem', fontWeight: '600', color: '#333', marginBottom: '1rem' }}>2020年</h4>
                    <p className="el-section__text" style={{ marginBottom: '0.5rem' }}>
                      <strong>重点产品：</strong> GPT-3
                    </p>
                    <p className="el-section__text" style={{ color: '#666' }}>
                      OpenAI发布GPT-3，参数量达1750亿，虽然主要专注于文本处理，但为后续多模态发展奠定了基础。
                    </p>
                  </div>

                  {/* 2021年 */}
                  <div style={{ marginBottom: '2rem', position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: '-2rem',
                      top: '0.3rem',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: '#0066cc'
                    }}></div>
                    <h4 style={{ fontSize: '1.3rem', fontWeight: '600', color: '#333', marginBottom: '1rem' }}>2021年</h4>
                    <p className="el-section__text" style={{ marginBottom: '0.5rem' }}>
                      <strong>重点产品：</strong> DALL-E
                    </p>
                    <p className="el-section__text" style={{ color: '#666' }}>
                      OpenAI发布DALL-E，首次实现了从文本描述生成图像的能力，标志着双模态融合的开始。
                    </p>
                  </div>

                  {/* 2022年 */}
                  <div style={{ marginBottom: '2rem', position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: '-2rem',
                      top: '0.3rem',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: '#0066cc'
                    }}></div>
                    <h4 style={{ fontSize: '1.3rem', fontWeight: '600', color: '#333', marginBottom: '1rem' }}>2022年</h4>
                    <p className="el-section__text" style={{ marginBottom: '0.5rem' }}>
                      <strong>重点产品：</strong> DALL-E 2、Stable Diffusion
                    </p>
                    <p className="el-section__text" style={{ color: '#666' }}>
                      OpenAI发布DALL-E 2，图像生成质量大幅提升；同时Stable Diffusion开源，推动了文本到图像生成技术的普及。
                    </p>
                  </div>

                  {/* 2023年 */}
                  <div style={{ marginBottom: '2rem', position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: '-2rem',
                      top: '0.3rem',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: '#0066cc'
                    }}></div>
                    <h4 style={{ fontSize: '1.3rem', fontWeight: '600', color: '#333', marginBottom: '1rem' }}>2023年</h4>
                    <p className="el-section__text" style={{ marginBottom: '0.5rem' }}>
                      <strong>重点产品：</strong> GPT-4V、Claude 2
                    </p>
                    <p className="el-section__text" style={{ color: '#666' }}>
                      OpenAI发布GPT-4V，实现了文本与图像的双向理解；Anthropic发布Claude 2，支持更长的上下文和多模态能力。
                    </p>
                  </div>

                  {/* 2024年 */}
                  <div style={{ marginBottom: '2rem', position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: '-2rem',
                      top: '0.3rem',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: '#0066cc'
                    }}></div>
                    <h4 style={{ fontSize: '1.3rem', fontWeight: '600', color: '#333', marginBottom: '1rem' }}>2024年</h4>
                    <p className="el-section__text" style={{ marginBottom: '0.5rem' }}>
                      <strong>重点产品：</strong> GPT-5、Gemini Ultra、Seedance 1.0
                    </p>
                    <p className="el-section__text" style={{ color: '#666' }}>
                      OpenAI发布GPT-5，支持文本、图像、音频、视频的多模态融合；Google发布Gemini Ultra，实现了更全面的多模态能力；Seedance 1.0：初步实现了视频生成和编辑能力。
                    </p>
                  </div>

                  {/* 2025年 */}
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: '-2rem',
                      top: '0.3rem',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: '#0066cc'
                    }}></div>
                    <h4 style={{ fontSize: '1.3rem', fontWeight: '600', color: '#333', marginBottom: '1rem' }}>2025年</h4>
                    <p className="el-section__text" style={{ marginBottom: '0.5rem' }}>
                      <strong>重点产品：</strong> Manus（通用智能体）、Seedance 2.0、GPT-5 Pro、Gemini Advanced
                    </p>
                    <p className="el-section__text" style={{ marginBottom: '1rem' }}>
                      Manus：作为首个真正意义上的通用智能体，具备先进的3D生成、多模态理解和自主交互能力，能够在不同场景下自主规划和执行任务，标志着智能体时代的正式到来。
                    </p>
                    <p className="el-section__text">
                      Seedance 2.0：实现了更高级的视频生成和编辑功能；GPT-5 Pro：支持更复杂的多模态任务，为智能体提供强大的底层能力；Gemini Advanced：实现了跨模态推理，增强了智能体的理解能力。这些技术的融合，使得智能体能够更加自然地与用户和环境交互。
                    </p>
                  </div>
                </div>
              </div>
              <p className="el-section__text">
                多模态大模型的发展为智能体广场带来了全新的交互方式，用户可以通过多种形式与智能体进行沟通，获得更加丰富和直观的回应。
              </p>
            </div>
          </section>

          {/* 第2节：大模型数据管理中台 */}
          <section id="section2" className="el-section">
            <h2 className="el-section__title" style={{ textAlign: 'center' }}>2. 大模型数据管理中台</h2>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <p className="el-section__text" style={{ marginBottom: '2rem' }}>
                大模型数据管理中台是智能体的核心基础设施，它为大模型和智能体提供了全生命周期的数据管理能力，实现了数据的规范化、标准化和智能化处理，是大模型发挥价值的关键支撑。
              </p>
              <div className="el-info-box" style={{ marginBottom: '2rem' }}>
                <h3 className="el-section__subtitle" style={{ color: '#0066cc' }}>大模型数据管理中台能力</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>数据采集与集成</strong>：从多源异构系统获取数据，支持结构化和非结构化数据的统一采集
                    </span>
                  </li>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>数据治理与质量控制</strong>：建立数据标准，实施数据清洗、脱敏和质量监控
                    </span>
                  </li>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>智能数据处理</strong>：利用大模型能力对数据进行智能标注、分类和结构化处理
                    </span>
                  </li>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>向量存储与检索</strong>：构建高性能向量数据库，支持语义级数据检索
                    </span>
                  </li>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>数据服务与API管理</strong>：提供标准化数据服务接口，支持多场景数据应用
                    </span>
                  </li>
                </ul>
              </div>
              <div className="el-info-box" style={{ marginBottom: '2rem' }}>
                <h3 className="el-section__subtitle" style={{ color: '#0066cc' }}>大模型中的数据作用</h3>
                <p className="el-section__text" style={{ marginBottom: '1.5rem' }}>
                  数据是大模型的"燃料"和"知识源泉"，在大模型的训练、微调、推理和应用全流程中发挥着关键作用：
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '1.5rem' }}>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>模型训练基础</strong>：高质量的数据是训练高性能大模型的前提，决定了模型的知识边界和能力上限
                    </span>
                  </li>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>模型个性化微调</strong>：通过领域特定数据的微调，使通用大模型适配校园特定场景
                    </span>
                  </li>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>推理增强</strong>：通过检索增强生成（RAG）技术，为大模型提供实时、准确的外部知识
                    </span>
                  </li>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>智能体决策支撑</strong>：为智能体提供决策所需的实时数据和历史数据，提升决策准确性
                    </span>
                  </li>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>持续优化反馈</strong>：通过用户交互数据和应用效果数据，持续优化模型性能
                    </span>
                  </li>
                </ul>
                <p className="el-section__text" style={{ marginBottom: '1.5rem' }}>
                  <strong>数据管理实践</strong>：信息中心建立了完善的数据管理体系，包括数据标准制定、数据质量监控、数据安全保障等，确保数据在大模型应用中的合规性和有效性。
                </p>
              </div>
              <p className="el-section__text">
                大模型数据管理中台的建设，为锡职大智能体广场提供了强大的数据支撑能力。通过数据与大模型的深度融合，我们能够为师生提供更加个性化、智能化的服务，推动学校数字化转型向更高水平发展。信息中心将持续加强数据管理能力建设，不断丰富数据资源，为大模型和智能体的应用创造更广阔的空间。
              </p>
            </div>
          </section>

          {/* 第3节：智能体 */}
          <section id="section3" className="el-section">
            <h2 className="el-section__title" style={{ textAlign: 'center' }}>3. 智能体</h2>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <p className="el-section__text" style={{ marginBottom: '2rem' }}>
                随着2025年Manus等通用智能体的出现，智能体技术正式成为人工智能发展的核心方向。智能体是一种基于大模型和数据管理中台构建的具有自主感知、认知、决策和执行能力的AI系统。
              </p>
              <div className="el-info-box" style={{ marginBottom: '2rem' }}>
                <h3 className="el-section__subtitle" style={{ color: '#0066cc' }}>智能体的定义</h3>
                <p className="el-section__text" style={{ marginBottom: '1.5rem' }}>
                  智能体（Intelligent Agent）是指能够在特定环境中感知状态，根据预设目标和规则，自主做出决策并执行行动的人工智能系统。在校园场景中，智能体具有以下特征：
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '1.5rem' }}>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>自主性</strong>：能够独立规划和执行任务，无需人类持续干预
                    </span>
                  </li>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>感知能力</strong>：能够理解多模态输入，包括文本、图像、语音等
                    </span>
                  </li>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>认知能力</strong>：能够基于大模型和知识库进行推理、学习和问题解决
                    </span>
                  </li>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>交互能力</strong>：能够与用户和其他系统进行自然、有效的沟通
                    </span>
                  </li>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>适应性</strong>：能够根据环境变化和用户反馈调整行为策略
                    </span>
                  </li>
                </ul>
              </div>
              <div className="el-info-box" style={{ marginBottom: '2rem' }}>
                <h3 className="el-section__subtitle" style={{ color: '#0066cc' }}>智能体的作用</h3>
                <p className="el-section__text" style={{ marginBottom: '1.5rem' }}>
                  在数智化校园建设中，智能体发挥着多方面的重要作用：
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '1.5rem' }}>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>教学辅助</strong>：为师生提供个性化学习资源推荐、智能答疑、作业批改等服务
                    </span>
                  </li>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>科研支持</strong>：协助教师进行文献综述、实验设计、数据分析等科研活动
                    </span>
                  </li>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>管理服务</strong>：优化校园管理流程，提供智能审批、信息查询、资源调度等服务
                    </span>
                  </li>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>生活服务</strong>：为师生提供校园导航、活动推荐、健康管理等便捷服务
                    </span>
                  </li>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>决策支持</strong>：为学校管理层提供数据驱动的决策建议和分析报告
                    </span>
                  </li>
                  <li className="el-list-item">
                    <span className="el-list-item__bullet">•</span>
                    <span className="el-section__text">
                      <strong>创新引擎</strong>：推动教育教学模式创新，促进跨学科融合和知识创造
                    </span>
                  </li>
                </ul>
              </div>
              <p className="el-section__text" style={{ marginBottom: '2rem' }}>
                智能体是大模型技术在校园场景中的具体应用形态，它通过理解用户需求，规划任务步骤，并调用相应的工具和服务来完成复杂任务，为校园生活和工作带来智能化、个性化的体验。
              </p>

              {/* 规划图 */}
              <div className="el-section__image" style={{ marginBottom: '2rem' }}>
                <h3 className="el-section__subtitle" style={{ color: '#0066cc' }}>智能体广场规划架构</h3>
                <img
                  src={`http://210.28.145.186:3001/plaza/arc.png?t=${new Date().getTime()}`}
                  alt="智能体广场规划架构"
                  style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
                  onClick={() => {
                    setCurrentImage('http://210.28.145.186:3001/plaza/arc.png');
                    setShowModal(true);
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'scale(1)';
                  }}
                />
              </div>

              {/* 智慧校园生态系统图表 */}
              <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h3 className="el-section__subtitle" style={{ color: '#0066cc' }}>立体式智慧校园生态</h3>
                <div className="el-info-box" style={{ maxWidth: '1000px', margin: '0 auto', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem'
                  }}>
                    {/* 从下到上排列：智能体集群、超级智能门户、垂类大模型、校本大模型 */}
                    <div className="el-org-box el-org-box--primary" style={{ backgroundColor: '#00cccc' }}>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem' }}>智能体集群</h4>
                      <p style={{ fontSize: '1rem', lineHeight: '1.6' }}>多类型智能体协同工作，满足多样化需求</p>
                    </div>
                    <div className="el-org-box el-org-box--primary" style={{ backgroundColor: '#00aacc' }}>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem' }}>超级智能门户</h4>
                      <p style={{ fontSize: '1rem', lineHeight: '1.6' }}>统一入口，智能分流，提供一站式智能服务体验</p>
                    </div>
                    <div className="el-org-box el-org-box--primary" style={{ backgroundColor: '#0088cc' }}>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem' }}>垂类大模型</h4>
                      <p style={{ fontSize: '1rem', lineHeight: '1.6' }}>特定领域专业模型，如教学、科研、管理等垂直场景</p>
                    </div>
                    <div className="el-org-box el-org-box--primary" style={{ backgroundColor: '#0066cc' }}>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem' }}>校本大模型</h4>
                      <p style={{ fontSize: '1rem', lineHeight: '1.6' }}>学校专属大模型，融合校情数据，提供个性化服务</p>
                    </div>
                  </div>
                  <div className="el-org-box" style={{
                    marginTop: '2rem',
                    backgroundColor: '#fff',
                    textAlign: 'center'
                  }}>
                    <h4 style={{ fontSize: '1.3rem', fontWeight: '600', color: '#0066cc', marginBottom: '1rem' }}>立体式智慧校园生态</h4>
                    <p className="el-section__text">
                      构建起"校本大模型+垂类大模型＋超级智能门户＋智能体集群"的立体式智慧校园生态，
                      为师生提供全方位、个性化的智能服务，推动学校数字化转型和智能化升级。
                    </p>
                  </div>
                </div>
              </div>

              {/* 四块内容 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                {/* 第一块：智能体应用场景 */}
                <div className="el-info-box">
                  <h3 className="el-section__subtitle" style={{ color: '#0066cc' }}>智能体应用场景</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        <strong>教学辅助</strong>：智能答疑、个性化学习路径推荐、作业批改
                      </span>
                    </li>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        <strong>科研支持</strong>：文献综述、实验设计、数据分析
                      </span>
                    </li>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        <strong>管理服务</strong>：流程审批、信息查询、校园服务
                      </span>
                    </li>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        <strong>生活服务</strong>：校园导航、活动推荐、健康管理
                      </span>
                    </li>
                  </ul>
                </div>

                {/* 第二块：智能体技术架构 */}
                <div className="el-info-box">
                  <h3 className="el-section__subtitle" style={{ color: '#0066cc' }}>智能体技术架构</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        <strong>感知层</strong>：多模态输入处理，包括文本、图像、音频、视频
                      </span>
                    </li>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        <strong>认知层</strong>：大模型推理、知识库检索、意图理解
                      </span>
                    </li>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        <strong>决策层</strong>：任务规划、工具调用、行动执行
                      </span>
                    </li>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        <strong>交互层</strong>：自然语言生成、多模态输出、用户反馈处理
                      </span>
                    </li>
                  </ul>
                </div>

                {/* 第三块：智能体特点 */}
                <div className="el-info-box">
                  <h3 className="el-section__subtitle" style={{ color: '#0066cc' }}>智能体特点</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        <strong>自主性</strong>：能够自主规划和执行任务
                      </span>
                    </li>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        <strong>交互性</strong>：与用户和其他系统进行自然交互
                      </span>
                    </li>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        <strong>适应性</strong>：根据环境变化调整行为策略
                      </span>
                    </li>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        <strong>协作性</strong>：多个智能体协同完成复杂任务
                      </span>
                    </li>
                  </ul>
                </div>

                {/* 第四块：智能体广场规划 */}
                <div className="el-info-box">
                  <h3 className="el-section__subtitle" style={{ color: '#0066cc' }}>智能体广场规划</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        <strong>平台建设</strong>：构建统一的智能体管理平台，实现智能体的注册、部署和管理
                      </span>
                    </li>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        <strong>生态构建</strong>：鼓励师生参与智能体开发，形成丰富的智能体生态
                      </span>
                    </li>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        <strong>应用推广</strong>：在教学、科研、管理等领域推广智能体应用
                      </span>
                    </li>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        <strong>持续优化</strong>：根据用户反馈和技术发展，持续优化智能体性能
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 第五块：智能体案例 */}
              <div className="el-info-box" style={{ marginBottom: '2rem' }}>
                <h3 className="el-section__subtitle" style={{ color: '#0066cc', textAlign: 'center' }}>智能体案例</h3>
                <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#0066cc', marginBottom: '1rem' }}>智能推荐智能体</h4>

                  {/* 图片展示 - 每张一行，可点击打开模态框 */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div className="el-section__image" style={{ marginBottom: '1.5rem' }}>
                      <img
                        src={`http://210.28.145.186:3001/plaza/case1.png?t=${new Date().getTime()}`}
                        alt="智能推荐智能体案例1"
                        style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
                        onClick={() => {
                          setCurrentImage('http://210.28.145.186:3001/plaza/case1.png');
                          setShowModal(true);
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'scale(1.05)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'scale(1)';
                        }}
                      />
                    </div>
                    <div className="el-section__image" style={{ marginBottom: '1.5rem' }}>
                      <img
                        src={`http://210.28.145.186:3001/plaza/case2.png?t=${new Date().getTime()}`}
                        alt="智能推荐智能体案例2"
                        style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
                        onClick={() => {
                          setCurrentImage('http://210.28.145.186:3001/plaza/case2.png');
                          setShowModal(true);
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'scale(1.05)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'scale(1)';
                        }}
                      />
                    </div>
                    <div className="el-section__image">
                      <img
                        src={`http://210.28.145.186:3001/plaza/case3.png?t=${new Date().getTime()}`}
                        alt="智能推荐智能体案例3"
                        style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
                        onClick={() => {
                          setCurrentImage('http://210.28.145.186:3001/plaza/case3.png');
                          setShowModal(true);
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'scale(1.05)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'scale(1)';
                        }}
                      />
                    </div>
                  </div>

                  <p className="el-section__text" style={{ marginBottom: '1rem' }}>
                    <strong>应用场景</strong>：成绩查询、个性化学习资源推荐、课程选修指导、学术文献推送、就业信息推荐、职业规划指导
                  </p>
                  <p className="el-section__text" style={{ marginBottom: '1rem' }}>
                    <strong>功能特点</strong>：
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '1.5rem' }}>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        成绩查询：实时获取学生考试成绩，分析成绩趋势，提供学习建议
                      </span>
                    </li>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        个性化推荐：基于用户历史行为和偏好，结合课程体系和学习进度，智能推荐适合的学习资源和课程
                      </span>
                    </li>
                    <li className="el-list-item">
                      <span className="el-list-item__bullet">•</span>
                      <span className="el-section__text">
                        就业推荐：根据学生专业、技能、兴趣和成绩，智能匹配适合的就业岗位和实习机会
                      </span>
                    </li>
                  </ul>
                  <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <a
                      href="http://210.28.145.149:8080/ai?tk=eyJjbiI6IumrmOaeq+mbryIsInVpZCI6IjIwMjIxMDEyNzcifQ=="
                      target="_blank"
                      rel="noopener noreferrer"
                      className="el-button el-button--primary"
                    >
                      智能推荐智能体入口
                    </a>
                  </div>
                </div>
              </div>

              <p className="el-section__text">
                锡职大智能体广场汇聚了多种类型的智能体，包括教学辅助、科研支持、管理服务等，为师生提供全方位的智能服务体验。通过规划图展示的架构，我们可以看到智能体广场的整体布局和各部分之间的关系，而通过具体案例，我们可以更直观地了解智能体在实际应用中的价值和效果。
              </p>
            </div>
          </section>

        </div>

        {/* 右侧目录 - 固定定位 */}
        <nav className="el-anchor">
          <div className="el-anchor__inner">
            <div className="el-anchor__title">目录</div>
            <a
              href="#section1"
              className={`el-anchor__link ${activeSection === 'section1' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('section1').scrollIntoView({ behavior: 'smooth' });
              }}
            >
              1. 大模型多模态发展
            </a>
            <a
              href="#section2"
              className={`el-anchor__link ${activeSection === 'section2' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('section2').scrollIntoView({ behavior: 'smooth' });
              }}
            >
              2. 大模型数据管理中台
            </a>
            <a
              href="#section3"
              className={`el-anchor__link ${activeSection === 'section3' ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('section3').scrollIntoView({ behavior: 'smooth' });
              }}
            >
              3. 智能体
            </a>
          </div>
        </nav>
      </div>

      {/* 图片模态框 */}
      {showModal && (
        <div
          className="el-image-modal"
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '90%',
              cursor: 'default'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={{
                position: 'absolute',
                top: '-40px',
                right: '-40px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '24px',
                color: '#fff',
                transition: 'background-color 0.2s ease'
              }}
              onClick={() => setShowModal(false)}
              onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            >
              ×
            </button>
            <img
              src={currentImage}
              alt="放大图片"
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default DigitalCampusPlanning;
