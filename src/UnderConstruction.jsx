import React from 'react';
import { Link } from 'react-router-dom';

function UnderConstruction({ pageType }) {
  // 导航栏组件
  const NavBar = () => (
    <header style={{ backgroundColor: 'var(--el-color-primary)', color: '#fff', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <img
          src="https://www.wxit.edu.cn/images/logo0706.png"
          alt="无锡职业技术大学"
          style={{ height: '40px', width: 'auto' }}
        />
      </div>
      <nav>
        <ul style={{ display: 'flex', listStyle: 'none', gap: '1rem', margin: 0, padding: 0 }}>
          <li><Link to="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500, transition: 'opacity 0.3s' }}>首页</Link></li>
          <li><Link to="/guide" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>数智化校园建设规划</Link></li>
          <li><a href="http://210.28.144.91/apps" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>AI中台</a></li>
          <li><a href="http://210.28.144.91:12345/dolphinscheduler/ui" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>数据中台</a></li>
          <li><Link to="/manual" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>操作指南</Link></li>
          <li><Link to="/about" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>关于我们</Link></li>
        </ul>
      </nav>
    </header>
  );

  // 数智化校园建设规划页面 (PPT风格)
  const CampusPlanPage = () => (
    <main style={{ flex: 1, overflowX: 'hidden' }}>
      <div style={{ width: '100%', height: '100vh', position: 'relative', scrollSnapType: 'y mandatory' }}>
        {/* 幻灯片 1 */}
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'start', backgroundColor: '#f5f5f5', padding: '2rem' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '2rem', color: 'var(--el-color-primary)', textAlign: 'center' }}>
            数智化校园建设规划
          </h1>
          <div style={{ width: '80%', maxWidth: '1000px', marginBottom: '2rem' }}>
            <img
              src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20smart%20campus%20with%20digital%20technology%20infrastructure%20and%20AI%20systems&image_size=landscape_16_9"
              alt="数智化校园概览"
              className="el-section__image"
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
          <p style={{ fontSize: '1.2rem', color: 'var(--el-text-color-primary)', maxWidth: '800px', textAlign: 'center' }}>
            无锡职业技术大学数智化校园建设规划旨在通过先进的信息技术和人工智能技术，
            打造智慧、高效、创新的校园环境，提升教学、科研和管理水平。
          </p>
        </div>

        {/* 幻灯片 2 */}
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'start', backgroundColor: 'var(--el-color-primary-light-9)', padding: '2rem' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '2rem', color: 'var(--el-color-primary)', textAlign: 'center' }}>
            智能教学环境
          </h2>
          <div style={{ width: '80%', maxWidth: '1000px', marginBottom: '2rem' }}>
            <img
              src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=smart%20classroom%20with%20interactive%20displays%20and%20AI%20teaching%20assistants&image_size=landscape_16_9"
              alt="智能教学环境"
              style={{ width: '100%', height: 'auto', borderRadius: 'var(--el-border-radius-base)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            />
          </div>
          <p style={{ fontSize: '1.2rem', color: 'var(--el-text-color-primary)', maxWidth: '800px', textAlign: 'center' }}>
            建设智能教室，配备交互式显示屏、AI教学助手等先进设备，
            实现个性化教学和智能化学习体验。
          </p>
        </div>

        {/* 幻灯片 3 */}
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'start', backgroundColor: '#f3e5f5', padding: '2rem' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '2rem', color: 'var(--el-color-primary)', textAlign: 'center' }}>
            科研创新平台
          </h2>
          <div style={{ width: '80%', maxWidth: '1000px', marginBottom: '2rem' }}>
            <img
              src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=research%20laboratory%20with%20advanced%20technology%20and%20data%20analytics&image_size=landscape_16_9"
              alt="科研创新平台"
              style={{ width: '100%', height: 'auto', borderRadius: 'var(--el-border-radius-base)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            />
          </div>
          <p style={{ fontSize: '1.2rem', color: 'var(--el-text-color-primary)', maxWidth: '800px', textAlign: 'center' }}>
            构建科研创新平台，整合科研资源，提供智能数据分析和文献检索服务，
            促进科研成果转化和创新能力提升。
          </p>
        </div>

        {/* 幻灯片 4 */}
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'start', backgroundColor: '#e8f5e8', padding: '2rem' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '2rem', color: 'var(--el-color-primary)', textAlign: 'center' }}>
            智慧校园管理
          </h2>
          <div style={{ width: '80%', maxWidth: '1000px', marginBottom: '2rem' }}>
            <img
              src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=smart%20campus%20management%20center%20with%20digital%20dashboards%20and%20AI%20systems&image_size=landscape_16_9"
              alt="智慧校园管理"
              style={{ width: '100%', height: 'auto', borderRadius: 'var(--el-border-radius-base)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            />
          </div>
          <p style={{ fontSize: '1.2rem', color: 'var(--el-text-color-primary)', maxWidth: '800px', textAlign: 'center' }}>
            建立智慧校园管理系统，实现校园安防、能源管理、资产管理等智能化，
            提升校园管理效率和服务质量。
          </p>
        </div>

        {/* 幻灯片 5 */}
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'start', backgroundColor: 'var(--el-color-warning-light-9)', padding: '2rem' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '2rem', color: 'var(--el-color-primary)', textAlign: 'center' }}>
            未来展望
          </h2>
          <div style={{ width: '80%', maxWidth: '1000px', marginBottom: '2rem' }}>
            <img
              src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=futuristic%20smart%20campus%20with%20AI%20technology%20and%20sustainable%20design&image_size=landscape_16_9"
              alt="未来展望"
              style={{ width: '100%', height: 'auto', borderRadius: 'var(--el-border-radius-base)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            />
          </div>
          <p style={{ fontSize: '1.2rem', color: 'var(--el-text-color-primary)', maxWidth: '800px', textAlign: 'center' }}>
            未来，无锡职业技术大学将继续推进数智化校园建设，
            打造全国领先的智慧校园典范，为师生提供更加智能、便捷、高效的校园环境。
          </p>
        </div>
      </div>
    </main>
  );

  // WIKI风格页面组件
  const WikiPage = ({ title, sections }) => (
    <main style={{ flex: 1, backgroundColor: 'var(--el-bg-color-page)', padding: '2rem 0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '2rem', padding: '0 20px' }}>
        {/* 侧边栏导航 */}
        <aside style={{ width: '250px', flexShrink: 0, position: 'sticky', top: '2rem', alignSelf: 'flex-start' }}>
          <div className="el-anchor__inner">
            <h3 className="el-anchor__title">目录</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {sections.map((section, index) => (
                <li key={index} style={{ marginBottom: '0.75rem' }}>
                  <a
                    href={`#section-${index + 1}`}
                    className="el-link"
                    style={{ fontSize: '0.9rem', display: 'block', padding: '0.25rem 0' }}
                  >
                    {section.title}
                  </a>
                  {section.subsections && section.subsections.length > 0 && (
                    <ul style={{ listStyle: 'none', paddingLeft: '1rem', marginTop: '0.5rem' }}>
                      {section.subsections.map((subsection, subIndex) => (
                        <li key={subIndex} style={{ marginBottom: '0.5rem' }}>
                          <a
                            href={`#subsection-${index + 1}-${subIndex + 1}`}
                            style={{ color: 'var(--el-text-color-secondary)', textDecoration: 'none', fontSize: '0.85rem', display: 'block', padding: '0.25rem 0' }}
                          >
                            {subsection}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* 主内容区 */}
        <div style={{ flex: 1 }}>
          <div className="el-section">
            <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', color: 'var(--el-text-color-primary)', textAlign: 'center' }}>
              {title}
            </h1>

            {sections.map((section, index) => (
              <section key={index} id={`section-${index + 1}`} style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', color: 'var(--el-color-primary)', borderBottom: '2px solid var(--el-border-color-lighter)', paddingBottom: '0.5rem' }}>
                  {index + 1}. {section.title}
                </h2>
                <div style={{ lineHeight: '1.6', color: 'var(--el-text-color-primary)' }}>
                  {section.content}
                </div>

                {section.image && (
                  <div className="el-section__image" style={{ margin: '1.5rem 0' }}>
                    <img
                      src={section.image}
                      alt={section.title}
                    />
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );

  // 操作指南页面 (WIKI风格)
  const ManualPage = () => {
    const sections = [
      {
        title: '智能体广场使用指南',
        content: `
          <p>智能体广场是无锡职业技术大学数智化校园建设的重要组成部分，为师生提供各种智能服务。本指南将帮助您快速上手使用智能体广场。</p>
          <p>智能体广场提供了多种专业AI助手服务，涵盖教学辅助、科研支持、校园服务等多个领域，助力智慧校园建设。</p>
        `,
        image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=user%20interface%20of%20smart%20agent%20plaza%20with%20multiple%20AI%20agents&image_size=landscape_16_9'
      },
      {
        title: '如何使用智能体',
        content: `
          <p>使用智能体非常简单，只需按照以下步骤操作：</p>
          <ol>
            <li>在首页浏览或搜索您需要的智能体</li>
            <li>点击智能体卡片上的"开始对话"按钮</li>
            <li>对于外部链接的智能体，会直接跳转到对应页面</li>
            <li>对于内部智能体，会进入聊天界面与智能体进行交互</li>
          </ol>
          <p>智能体会根据您的问题提供专业的回答和帮助。</p>
        `,
        image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=user%20chatting%20with%20AI%20agent%20interface&image_size=landscape_16_9'
      },
      {
        title: '智能体集群介绍',
        content: `
          <p>智能体广场将智能体按照功能分类，分为以下几个集群：</p>
          <ul>
            <li><strong>学生管理智能体群</strong>：提供学生日常管理、心理健康、智能推荐等服务</li>
            <li><strong>教师工作智能体群</strong>：提供岗聘管理、职称评定、发展成长等服务</li>
            <li><strong>教务教学智能体群</strong>：提供实训教学管理、技能大赛管理、课程建设等服务</li>
            <li><strong>科研管理智能体群</strong>：提供科研项目管理、科研成果管理转化等服务</li>
            <li><strong>后勤管理智能体群</strong>：提供固定资产管理、智慧教室管理等服务</li>
            <li><strong>其他特色智能体群</strong>：提供信息化建设、法务管理等服务</li>
          </ul>
        `,
        image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=organization%20chart%20of%20AI%20agent%20clusters&image_size=landscape_16_9'
      },
      {
        title: 'AI中台使用指南',
        content: `
          <p>AI中台是智能体的管理和部署平台，您可以通过以下步骤使用：</p>
          <ol>
            <li>点击导航栏中的"AI中台"链接</li>
            <li>登录系统（使用学校统一身份认证）</li>
            <li>在平台中浏览和管理可用的智能体</li>
            <li>根据需要部署和配置智能体</li>
          </ol>
          <p>AI中台为智能体的开发和管理提供了便捷的工具和接口。</p>
        `,
        image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=AI%20platform%20dashboard%20with%20agent%20management%20interface&image_size=landscape_16_9'
      },
      {
        title: '数据中台使用指南',
        content: `
          <p>数据中台是学校数据管理和分析的平台，您可以通过以下步骤使用：</p>
          <ol>
            <li>点击导航栏中的"数据中台"链接</li>
            <li>登录系统（使用学校统一身份认证）</li>
            <li>在平台中浏览和管理数据集</li>
            <li>使用数据分析工具进行数据处理和分析</li>
          </ol>
          <p>数据中台为学校的数据分析和决策提供了强大的支持。</p>
        `,
        image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=data%20platform%20dashboard%20with%20data%20visualization&image_size=landscape_16_9'
      },
      {
        title: '常见问题解答',
        content: `
          <h4>1. 如何添加新的智能体？</h4>
          <p>请联系信息化建设部门，提交智能体开发和部署申请。</p>

          <h4>2. 智能体的回答不准确怎么办？</h4>
          <p>您可以通过智能体聊天界面的反馈功能，对智能体的回答进行评价和反馈。</p>

          <h4>3. 如何访问外部智能体？</h4>
          <p>外部智能体在点击"开始对话"后会直接跳转到对应网站，您需要根据提示进行操作。</p>

          <h4>4. 智能体广场支持移动设备吗？</h4>
          <p>是的，智能体广场采用响应式设计，支持在手机、平板等移动设备上使用。</p>
        `
      }
    ];

    return <WikiPage title="操作指南" sections={sections} />;
  };

  // 关于我们页面 (WIKI风格)
  const AboutPage = () => {
    const sections = [
      {
        title: '关于智能体广场',
        content: `
          <p>智能体广场是无锡职业技术大学数智化校园建设的重要成果，旨在通过人工智能技术为师生提供更加智能、便捷、高效的服务。</p>
          <p>我们致力于打造一个集成多种智能服务的平台，涵盖教学、科研、管理等各个领域，为学校的数字化转型提供有力支持。</p>
        `,
        image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20university%20campus%20with%20digital%20technology%20elements&image_size=landscape_16_9'
      },
      {
        title: '建设目标',
        content: `
          <p>智能体广场的建设目标包括：</p>
          <ul>
            <li>提升教学质量：通过智能教学助手，为教师和学生提供个性化的教学支持</li>
            <li>提高管理效率：通过智能管理助手，优化学校各项管理流程</li>
            <li>促进科研创新：通过智能科研助手，为科研人员提供文献检索、数据分析等支持</li>
            <li>改善校园服务：通过智能服务助手，为师生提供便捷的校园服务</li>
          </ul>
        `
      },
      {
        title: '技术架构',
        content: `
          <p>智能体广场采用先进的技术架构，包括：</p>
          <ul>
            <li><strong>前端技术</strong>：React、React Router、Vite</li>
            <li><strong>后端技术</strong>：Spring Boot、Python Flask</li>
            <li><strong>AI技术</strong>：大语言模型、机器学习、自然语言处理</li>
            <li><strong>数据存储</strong>：MySQL、MongoDB、Redis</li>
            <li><strong>部署环境</strong>：Docker、Kubernetes、Tomcat</li>
          </ul>
        `,
        image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=technology%20architecture%20diagram%20for%20AI%20agent%20platform&image_size=landscape_16_9'
      },
      {
        title: '联系方式',
        content: `
          <p>如果您对智能体广场有任何问题或建议，欢迎通过以下方式联系我们：</p>
          <ul>
            <li><strong>邮箱</strong>：info@wxut.edu.cn</li>
            <li><strong>电话</strong>：0510-85910000</li>
            <li><strong>地址</strong>：江苏省无锡市高浪西路1600号无锡职业技术大学</li>
          </ul>
        `
      }
    ];

    return <WikiPage title="关于我们" sections={sections} />;
  };

  // 根据pageType渲染不同的页面
  const renderPage = () => {
    switch (pageType) {
      case 'campus':
        return <CampusPlanPage />;
      case 'manual':
        return <ManualPage />;
      case 'about':
        return <AboutPage />;
      default:
        return <CampusPlanPage />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <NavBar />
      {renderPage()}
      <footer style={{ backgroundColor: 'var(--el-text-color-primary)', color: '#fff', textAlign: 'center', padding: '1rem 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <p>&copy; 2025 无锡职业技术大学 版权所有</p>
        </div>
      </footer>
    </div>
  );
}

export default UnderConstruction;
