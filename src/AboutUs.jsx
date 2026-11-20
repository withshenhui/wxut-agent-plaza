import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from './components/PageLayout';
import { searchAgents, getCategories } from './api/agent';
import { searchModels } from './api/model';
import './about.css';

const nf = (n) => (n == null ? '—' : Number(n).toLocaleString('zh-CN'));

/* 图标（24 视图，线性） */
const ICON = {
  grid: <><rect x="3" y="3" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" /></>,
  form: <><rect x="4.5" y="3" width="15" height="18" rx="2.5" /><path d="M9 9h6M9 13h6M9 17h3.5" /></>,
  grad: <><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></>,
  layers: <><path d="M12 2 3 7v10l9 5 9-5V7l-9-5z" /><path d="M3 7l9 5 9-5M12 12v10" /></>,
  nodes: <><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="12" cy="18" r="3" /><path d="M8.3 7.8 10.5 15M15.7 7.8 13.5 15" /></>,
  db: <><ellipse cx="12" cy="5" rx="8.5" ry="3" /><path d="M3.5 5v14c0 1.7 3.8 3 8.5 3s8.5-1.3 8.5-3V5" /><path d="M3.5 12c0 1.7 3.8 3 8.5 3s8.5-1.3 8.5-3" /></>,
  cpu: <><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.2 4.2l2.9 2.9M16.9 16.9l2.9 2.9M1 12h4M19 12h4M4.2 19.8l2.9-2.9M16.9 7.1l2.9-2.9" /></>,
  folder: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
  arrow: <path d="M9 6l6 6-6 6" />,
};
const svgIco = (k) => <svg viewBox="0 0 24 24">{ICON[k]}</svg>;

/* 能力卡：ios 图标 + 配色（与首页同一套色） */
const ABILITIES = [
  { ico: 'grid', color: '#3B82F6', bg: 'rgba(59,130,246,.10)', b: '智能体广场', desc: '教学、科研、校园服务等多领域 AI 助手，按分类浏览、即点即用。', to: '/plaza', tag: '常用' },
  /* 智能填报暂时下线（2026-11-20），恢复时取消注释即可
  { ico: 'form', color: '#F97316', bg: 'rgba(249,115,22,.10)', b: '智能填报', desc: '上传表格模板，AI 自动检索校内数据完成填写，可核对、留痕、导出成品。', to: '/form-agent', tag: '新功能' },
  */
  { ico: 'grad', color: '#10B981', bg: 'rgba(16,185,129,.10)', b: '学院数据查询', desc: '「锡锡导员」系列智能体覆盖十个学院，自然语言即可查询学院数据。', to: '/plaza', tag: '学工' },
  { ico: 'layers', color: '#8B5CF6', bg: 'rgba(139,92,246,.10)', b: '模型服务', desc: '接入 DeepSeek、Qwen 等大模型，由平台统一接入与调度。', to: '/model-management', tag: '查看' },
  { ico: 'nodes', color: '#0E7490', bg: 'rgba(14,116,144,.10)', b: '智能体开发平台', desc: '可视化编排开发你自己的智能体，审核后可上架到广场。', ext: 'https://aiagent.wxut.edu.cn/apps', tag: '开发' },
  { ico: 'db', color: '#F59E0B', bg: 'rgba(245,158,11,.10)', b: '数据中台', desc: '基于 DolphinScheduler 的数据调度，管理校内数据同步与处理任务。', ext: 'http://210.28.144.91:12345/dolphinscheduler/ui', tag: '数据' },
];

const TEAMS = [
  { b: '技术研发组', s: '平台架构、系统开发与大模型集成' },
  { b: '内容建设组', s: '智能体设计、知识库与语料建设' },
  { b: '运营维护组', s: '日常运营、系统维护与用户支持' },
  { b: '推广应用组', s: '用户培训、场景挖掘与推广落地' },
];

export default function AboutUs() {
  const [stats, setStats] = useState({ agents: null, models: null, categories: null });

  useEffect(() => {
    // 全部走公开接口：避免用 adminRequest 时，过期管理令牌把访客踢到后台登录页
    Promise.all([
      searchAgents({ size: 1 }).then((r) => r.total).catch(() => null),
      searchModels({ size: 1 }).then((r) => r.total).catch(() => null),
      getCategories().then((r) => (r || []).length).catch(() => null),
    ]).then(([agents, models, categories]) => setStats({ agents, models, categories }));
  }, []);

  const kpis = [
    { ico: 'grid', color: '#3B82F6', bg: 'rgba(59,130,246,.10)', v: stats.agents, label: '在架智能体' },
    { ico: 'cpu', color: '#10B981', bg: 'rgba(16,185,129,.10)', v: stats.models, label: '接入大模型' },
    { ico: 'folder', color: '#F97316', bg: 'rgba(249,115,22,.10)', v: stats.categories, label: '服务分类' },
  ];

  return (
    <PageLayout activePath="/about" contentClassName="el-content--plain">
      <div className="about">
        {/* 页头 */}
        <header className="about-head">
          <div className="about-eyebrow">WXIT · AI PLATFORM</div>
          <h1 className="about-title">关于我们</h1>
          <p className="about-lead">
            锡职大 AI 中台由 <b>信息化与数据服务中心</b> 主办，汇聚校内智能体与数据能力，
            让 AI 融入教学、科研与校园生活的每一个环节。
          </p>
        </header>

        {/* 平台数据 */}
        <section className="about-sect">
          <div className="about-kpis">
            {kpis.map((k) => (
              <div className="about-kpi" key={k.label}>
                <span className="about-kpi__ico" style={{ background: k.bg, color: k.color }}>{svgIco(k.ico)}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="about-kpi__val">{nf(k.v)}</div>
                  <div className="about-kpi__lab">{k.label}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 平台能力 */}
        <section className="about-sect">
          <div className="about-sect__h">
            <h2 className="about-sect__t">平台能力</h2>
            <p className="about-sect__d">六个入口覆盖智能体的用、建、管与底层数据能力。</p>
          </div>
          <div className="about-cards">
            {ABILITIES.map((a) => (
              <div className="about-card" key={a.b}>
                <span className="about-card__ico" style={{ background: a.bg, color: a.color }}>{svgIco(a.ico)}</span>
                <h3 className="about-card__t">{a.b}</h3>
                <p className="about-card__d">{a.desc}</p>
                <div className="about-card__f">
                  <span className="about-tag">{a.tag}</span>
                  {a.to
                    ? <Link className="about-go" to={a.to}>前往使用 {svgIco('arrow')}</Link>
                    : <a className="about-go" href={a.ext} target="_blank" rel="noopener noreferrer">前往使用 {svgIco('arrow')}</a>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 使命与愿景 */}
        <section className="about-sect">
          <div className="about-sect__h">
            <h2 className="about-sect__t">使命与愿景</h2>
          </div>
          <div className="about-two">
            <div className="about-quote about-quote--mission">
              <h3 className="about-quote__t"><span />使命</h3>
              <p className="about-quote__d">
                利用人工智能技术赋能教育教学，提升学校治理能力，为师生提供个性化、智能化的服务，推动学校教育数字化转型，助力学校高质量发展。
              </p>
            </div>
            <div className="about-quote about-quote--vision">
              <h3 className="about-quote__t"><span />愿景</h3>
              <p className="about-quote__d">
                成为教育领域人工智能应用的典范，构建具有锡职大特色的智能校园生态系统，为师生创造更加智能、便捷、高效的学习和工作环境。
              </p>
            </div>
          </div>
        </section>

        {/* 建设与运营 */}
        <section className="about-sect">
          <div className="about-sect__h">
            <h2 className="about-sect__t">建设与运营</h2>
            <p className="about-sect__d">
              平台由学校信息化与数据服务中心主导建设，成立专门项目组负责规划、建设和运营，联合各院系业务骨干共同参与。
            </p>
          </div>
          <div className="about-teams">
            {TEAMS.map((t, i) => (
              <div className="about-team" key={t.b}>
                <span className="about-team__n">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="about-team__t">{t.b}</h3>
                <p className="about-team__d">{t.s}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 联系我们 */}
        <section className="about-sect">
          <div className="about-sect__h">
            <h2 className="about-sect__t">联系我们</h2>
          </div>
          <div className="about-two">
            <div className="about-box">
              <h3 className="about-quote__t" style={{ marginBottom: 20 }}>信息化与数据服务中心</h3>
              <div className="about-kv">
                <div className="about-kv__r"><i>电话</i><b>0510-85916000</b></div>
                <div className="about-kv__r"><i>邮箱</i><a href="mailto:dcc@wxit.edu.cn">dcc@wxit.edu.cn</a></div>
                <div className="about-kv__r"><i>地址</i><b>无锡职业技术大学行政楼 4 楼</b></div>
              </div>
            </div>
            <div className="about-box">
              <h3 className="about-quote__t" style={{ marginBottom: 20 }}>服务时间</h3>
              <div className="about-kv">
                <div className="about-kv__r"><i>工作日</i><b>8:30 – 17:00</b></div>
                <div className="about-kv__r"><i>周末</i><b>9:00 – 16:00</b></div>
                <div className="about-kv__r"><i>节假日</i><b>9:00 – 15:00</b></div>
              </div>
            </div>
          </div>
        </section>

        {/* 条款与隐私 */}
        <section className="about-sect" style={{ marginBottom: 8 }}>
          <div className="about-sect__h">
            <h2 className="about-sect__t">条款与隐私</h2>
          </div>
          <div className="about-faq">
            <details className="about-acc" open>
              <summary className="about-acc__s">隐私政策</summary>
              <p className="about-acc__b">
                我们收集的信息仅用于提供和改进服务；采取严格的安全措施保护用户信息；不向第三方共享用户个人信息，除非获得用户明确授权；用户有权访问、修改或删除自己的个人信息。
              </p>
            </details>
            <details className="about-acc">
              <summary className="about-acc__s">使用条款</summary>
              <p className="about-acc__b">
                使用本平台即表示同意：遵守国家法律法规和学校相关规定；合理使用平台资源，不得滥用或恶意攻击；尊重知识产权；对使用平台产生的后果自行负责。平台有权根据需要调整服务内容和使用条款。
              </p>
            </details>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
