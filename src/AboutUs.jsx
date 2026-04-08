import React, { useState, useEffect } from 'react';
import PageLayout from './components/PageLayout';

function AboutUs() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  // 监听页面滚动，更新当前活跃章节
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        'overview',
        'mission',
        'organization',
        'team',
        'achievements',
        'contact',
        'partners',
        'privacy',
        'terms'
      ];

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          // 当章节顶部进入视口200px时，将其设为活跃章节
          if (rect.top <= 200 && rect.bottom >= 200) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    // 添加滚动事件监听器
    window.addEventListener('scroll', handleScroll);

    // 初始检查
    handleScroll();

    // 清理事件监听器
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const anchorItems = [
    { id: 'overview', label: '1. 关于我们' },
    { id: 'mission', label: '2. 使命与愿景' },
    { id: 'organization', label: '3. 组织架构' },
    { id: 'team', label: '4. 团队介绍' },
    { id: 'achievements', label: '5. 主要成果' },
    { id: 'contact', label: '6. 联系方式' },
    { id: 'partners', label: '7. 合作伙伴' },
    { id: 'privacy', label: '8. 隐私政策' },
    { id: 'terms', label: '9. 使用条款' },
  ];

  return (
    <PageLayout
      activePath="/about"
      title="关于我们"
      isSidebarCollapsed={isSidebarCollapsed}
      setIsSidebarCollapsed={setIsSidebarCollapsed}
      footerText="© 无锡职业技术大学    Powered By 信息化与数据服务中心"
    >
      {/* WIKI标题和信息 */}
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#303133', marginBottom: '0.75rem' }}>关于我们</h1>
        <div style={{ fontSize: '0.875rem', color: '#909399', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
          <span>最后更新: 2026-02-24</span>
          <span>作者: 信息中心</span>
          <span>版本: 1.0</span>
        </div>
      </div>

      {/* 内容区域 - 左侧主内容 + 右侧目录 */}
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        {/* 左侧主要内容 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 1. 关于我们 */}
          <section id="overview" className="el-section">
            <h2 className="el-section__title">1. 关于我们</h2>
            <div className="el-section__text">
              <p>
                无锡职业技术大学智能体广场是学校信息化建设的重要组成部分，旨在为师生提供智能、高效、便捷的AI服务。我们致力于打造一个集成多种专业AI助手的平台，涵盖教学辅助、科研支持、校园服务等多个领域，助力智慧校园建设。
              </p>
              <p>
                平台由学校信息化与数据服务中心主导建设，联合各院系和部门共同参与，旨在利用人工智能技术提升学校的教学质量、科研能力和管理水平，为学校的高质量发展提供技术支撑。
              </p>
            </div>
            <div className="el-info-box" style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#303133', marginBottom: '0.75rem' }}>平台理念</h3>
              <p style={{ fontSize: '1rem', color: '#303133', lineHeight: '1.6' }}>
                智能、融合、创新、共享
              </p>
            </div>
          </section>

          {/* 2. 使命与愿景 */}
          <section id="mission" className="el-section">
            <h2 className="el-section__title">2. 使命与愿景</h2>
            <div className="el-section__text">
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 className="el-section__subtitle">使命</h3>
                <p>
                  利用人工智能技术赋能教育教学，提升学校治理能力，为师生提供个性化、智能化的服务，推动学校教育数字化转型，助力学校高质量发展。
                </p>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 className="el-section__subtitle">愿景</h3>
                <p>
                  成为教育领域人工智能应用的典范，构建具有锡职大特色的智能校园生态系统，为师生创造更加智能、便捷、高效的学习和工作环境。
                </p>
              </div>
            </div>
          </section>

          {/* 3. 组织架构 */}
          <section id="organization" className="el-section">
            <h2 className="el-section__title">3. 组织架构</h2>
            <div className="el-section__text">
              <p>
                智能体广场项目由学校信息化与数据服务中心主导，成立专门的项目组负责平台的规划、建设和运营。组织架构如下：
              </p>
            </div>
            <div className="el-info-box" style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#303133', marginBottom: '1rem' }}>智能体广场项目组架构</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0', alignItems: 'center' }}>
                <div className="el-org-box el-org-box--primary" style={{ minWidth: '250px' }}>
                  项目领导小组
                </div>
                <div className="el-org-connector"></div>
                <div className="el-org-box el-org-box--light" style={{ minWidth: '250px' }}>
                  项目执行组
                </div>
                <div className="el-org-connector"></div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div className="el-org-box el-org-box--lighter">
                    技术研发组
                  </div>
                  <div className="el-org-box el-org-box--lighter">
                    内容建设组
                  </div>
                  <div className="el-org-box el-org-box--lighter">
                    运营维护组
                  </div>
                  <div className="el-org-box el-org-box--lighter">
                    推广应用组
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. 团队介绍 */}
          <section id="team" className="el-section">
            <h2 className="el-section__title">4. 团队介绍</h2>
            <div className="el-section__text">
              <p>
                智能体广场项目团队由学校信息化与数据服务中心的技术专家和各院系的业务骨干组成，拥有丰富的技术开发和教育教学经验。
              </p>
            </div>
            <div className="el-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '1rem' }}>
              <div className="el-info-box">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#303133', marginBottom: '0.75rem' }}>技术研发团队</h3>
                <p style={{ fontSize: '0.875rem', color: '#606266', lineHeight: '1.6' }}>
                  负责平台的技术架构设计、系统开发、AI模型集成等工作，拥有丰富的软件开发和人工智能应用经验。
                </p>
              </div>
              <div className="el-info-box">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#303133', marginBottom: '0.75rem' }}>内容建设团队</h3>
                <p style={{ fontSize: '0.875rem', color: '#606266', lineHeight: '1.6' }}>
                  负责智能体的内容设计、知识图谱构建、服务流程优化等工作，由各院系的业务专家组成。
                </p>
              </div>
              <div className="el-info-box">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#303133', marginBottom: '0.75rem' }}>运营维护团队</h3>
                <p style={{ fontSize: '0.875rem', color: '#606266', lineHeight: '1.6' }}>
                  负责平台的日常运营、系统维护、用户支持等工作，确保平台的稳定运行和持续优化。
                </p>
              </div>
              <div className="el-info-box">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#303133', marginBottom: '0.75rem' }}>推广应用团队</h3>
                <p style={{ fontSize: '0.875rem', color: '#606266', lineHeight: '1.6' }}>
                  负责平台的宣传推广、用户培训、应用场景挖掘等工作，促进平台在全校范围内的广泛应用。
                </p>
              </div>
            </div>
          </section>

          {/* 5. 主要成果 */}
          <section id="achievements" className="el-section">
            <h2 className="el-section__title">5. 主要成果</h2>
            <div className="el-section__text">
              <p>自项目启动以来，我们已经取得了以下主要成果：</p>
            </div>
            <div className="el-section__text">
              <div className="el-list-item">
                <span className="el-list-item__bullet">•</span>
                <span>构建了智能体广场平台，集成了多种专业AI助手服务</span>
              </div>
              <div className="el-list-item">
                <span className="el-list-item__bullet">•</span>
                <span>开发了多个领域的智能体，涵盖教学、科研、管理等多个方面</span>
              </div>
              <div className="el-list-item">
                <span className="el-list-item__bullet">•</span>
                <span>建立了AI中台和数据中台，为智能体提供技术支撑</span>
              </div>
              <div className="el-list-item">
                <span className="el-list-item__bullet">•</span>
                <span>制定了数智化校园建设规划，为学校的数字化转型提供指导</span>
              </div>
              <div className="el-list-item">
                <span className="el-list-item__bullet">•</span>
                <span>开展了多场培训活动，提升师生的AI应用能力</span>
              </div>
            </div>
          </section>

          {/* 6. 联系方式 */}
          <section id="contact" className="el-section">
            <h2 className="el-section__title">6. 联系方式</h2>
            <div className="el-section__text">
              <p>如有任何问题或建议，欢迎随时联系我们：</p>
            </div>
            <div className="el-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '1rem' }}>
              <div className="el-info-box">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#303133', marginBottom: '0.75rem' }}>信息化与数据服务中心</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <strong>电话：</strong> 0510-85916000
                  </li>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <strong>邮箱：</strong> dcc@wxit.edu.cn
                  </li>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <strong>地址：</strong> 无锡职业技术大学行政楼4楼
                  </li>
                </ul>
              </div>
              <div className="el-info-box">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#303133', marginBottom: '0.75rem' }}>服务时间</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <strong>工作日：</strong> 8:30 - 17:00
                  </li>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <strong>周末：</strong> 9:00 - 16:00
                  </li>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <strong>节假日：</strong> 9:00 - 15:00
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 7. 合作伙伴 */}
          <section id="partners" className="el-section">
            <h2 className="el-section__title">7. 合作伙伴</h2>
            <div className="el-section__text">
              <p>我们与以下单位建立了长期合作关系，共同推动智能校园建设：</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span className="el-tag el-tag--default">无锡市教育局</span>
              <span className="el-tag el-tag--default">江苏省教育厅</span>
              <span className="el-tag el-tag--default">华为技术有限公司</span>
              <span className="el-tag el-tag--default">腾讯科技有限公司</span>
              <span className="el-tag el-tag--default">阿里巴巴集团</span>
              <span className="el-tag el-tag--default">百度在线网络技术有限公司</span>
            </div>
          </section>

          {/* 8. 隐私政策 */}
          <section id="privacy" className="el-section">
            <h2 className="el-section__title">8. 隐私政策</h2>
            <div className="el-section__text">
              <p>我们重视用户隐私保护，致力于为用户提供安全、可靠的服务。以下是我们的隐私政策：</p>
            </div>
            <div className="el-section__text">
              <div className="el-list-item">
                <span className="el-list-item__bullet">•</span>
                <span>我们收集的信息仅用于提供和改进服务，不会用于其他目的</span>
              </div>
              <div className="el-list-item">
                <span className="el-list-item__bullet">•</span>
                <span>我们采取严格的安全措施保护用户信息，防止信息泄露</span>
              </div>
              <div className="el-list-item">
                <span className="el-list-item__bullet">•</span>
                <span>我们不会向第三方共享用户个人信息，除非获得用户明确授权</span>
              </div>
              <div className="el-list-item">
                <span className="el-list-item__bullet">•</span>
                <span>用户有权访问、修改或删除自己的个人信息</span>
              </div>
            </div>
          </section>

          {/* 9. 使用条款 */}
          <section id="terms" className="el-section">
            <h2 className="el-section__title">9. 使用条款</h2>
            <div className="el-section__text">
              <p>使用智能体广场平台，即表示您同意以下使用条款：</p>
            </div>
            <div className="el-section__text">
              <div className="el-list-item">
                <span className="el-list-item__bullet">•</span>
                <span>遵守国家法律法规和学校相关规定</span>
              </div>
              <div className="el-list-item">
                <span className="el-list-item__bullet">•</span>
                <span>合理使用平台资源，不得滥用或恶意攻击</span>
              </div>
              <div className="el-list-item">
                <span className="el-list-item__bullet">•</span>
                <span>尊重知识产权，不得侵犯他人合法权益</span>
              </div>
              <div className="el-list-item">
                <span className="el-list-item__bullet">•</span>
                <span>对使用平台产生的后果自行负责</span>
              </div>
              <div className="el-list-item">
                <span className="el-list-item__bullet">•</span>
                <span>平台有权根据需要调整服务内容和使用条款</span>
              </div>
            </div>
          </section>
        </div>

        {/* 右侧目录 - 粘性定位 */}
        <nav className="el-anchor">
          <div className="el-anchor__inner">
            <div className="el-anchor__title">目录</div>
            {anchorItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`el-anchor__link${activeSection === item.id ? ' active' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </PageLayout>
  );
}

export default AboutUs;
