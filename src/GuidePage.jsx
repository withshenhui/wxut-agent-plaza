import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from './components/PageLayout';
import AgentIcon from './components/AgentIcon';

/* 操作指南：每个功能 = 说明 + 分步操作 + 入口按钮，视觉沿用广场卡片体系 */
const FEATURES = [
  {
    icon: '🤖', category: 'other', b: '智能体广场', tag: '常用', tagType: 'primary',
    desc: '全校智能体的统一入口，按分类浏览、搜索并直接发起对话。',
    steps: [
      '点击左侧菜单「智能体广场」进入广场页面',
      '使用顶部搜索框按名称搜索，或按分类页签筛选',
      '点击智能体卡片即可进入对话页面，输入问题开始使用',
      '卡片上的描述与标签可帮助你快速找到合适的智能体',
    ],
    to: '/plaza', toLabel: '进入智能体广场',
  },
  /* 智能填报暂时下线（2026-11-20），恢复时取消注释即可
  {
    icon: '📝', category: 'institution', b: '智能填报', tag: '新功能', tagType: 'success',
    desc: '上传表格模板，AI 自动检索校内数据仓完成填写，叙述内容由大模型起草，全程可核对、可导出。',
    steps: [
      '点击左侧菜单「智能填报」进入功能页',
      '选择模板：使用预置模板（职称评审业绩表、年度考核登记表等），或上传自定义 Word / Excel / PDF，系统自动解析字段',
      '选择填报人：默认为本人，也可搜索工号为其他教师代填',
      'AI 填写：解析模板 → 检索教师数据仓 → 直填结构化字段 → 大模型起草叙述内容',
      '核对补充：逐项查看「数据依据」，黄色底纹单元格可直接修改，「需补充」字段手动填写',
      '预览导出：导出 Word / Excel / PDF，或保存至填报记录稍后继续',
    ],
    to: '/form-agent', toLabel: '进入智能填报',
  },
  */
  {
    icon: '🎓', category: 'education', b: '学院数据查询', tag: '学工', tagType: 'info',
    desc: '「锡锡导员」系列智能体覆盖十个学院，用自然语言即可查询学生、请假、消费等学院数据。',
    steps: [
      '在智能体广场找到对应学院的「锡锡导员-XX学院」智能体',
      '进入对话页，用自然语言直接提问，例如「这个学院有多少在校生」「当前正在请假的学生有哪些」',
      '回答基于学院数据库实时查询，并附带「您可以继续问我」的追问建议',
    ],
    to: '/plaza', toLabel: '找到学院智能体',
  },
  {
    icon: '📊', category: 'research', b: '模型服务', tag: '查看', tagType: 'info',
    desc: '查看平台接入的大模型列表、供应商与用途说明。',
    steps: [
      '点击左侧菜单「模型服务」',
      '查看各模型的名称、供应商、类别与描述',
      '模型由平台统一接入与调度，应用侧无需单独申请',
    ],
    to: '/model-management', toLabel: '查看模型服务',
  },
  {
    icon: '🛠️', category: 'logistics', b: '智能体开发平台', tag: '开发', tagType: 'warning',
    desc: '面向开发者的可视化编排平台，可创建、调试并发布自己的智能体到广场。',
    steps: [
      '点击左侧菜单「智能体开发平台」，使用学校统一身份认证单点登录',
      '在平台中「创建应用」，选择编排方式并配置提示词与知识库',
      '调试预览通过后发布应用',
      '如需上架到智能体广场供全校使用，请联系信息中心（dcc@wxit.edu.cn）登记',
    ],
    ext: 'https://aiagent.wxut.edu.cn/apps', toLabel: '打开开发平台',
  },
  {
    icon: '🔄', category: 'student', b: '数据中台', tag: '数据', tagType: 'info',
    desc: '基于 DolphinScheduler 的数据调度平台，管理校内数据同步与处理任务。',
    steps: [
      '点击左侧菜单「数据中台」，跳转 DolphinScheduler 控制台',
      '使用数据中台账号登录（与门户账号不通用）',
      '可查看项目工作流、定时调度与运行日志',
      '如需新建数据同步任务，请联系信息中心数据组',
    ],
    ext: 'http://210.28.144.91:12345/dolphinscheduler/ui', toLabel: '打开数据中台',
  },
  {
    icon: '🛡️', category: 'institution', b: '管理后台', tag: '管理员', tagType: 'danger',
    desc: '供管理员上架智能体、配置模型与系统参数、查看操作日志。',
    steps: [
      '点击页头头像菜单进入管理后台（仅管理员账号可见入口）',
      '「智能体管理」可上架、编辑、停用智能体并设置分类归属',
      '「大模型配置」维护模型服务通道与密钥',
      '「基础配置」可修改站点名称、菜单入口链接等运行参数',
      '所有操作均记录于「操作日志」，可随时审计',
    ],
    admin: true,
  },
];

const FAQS = [
  ['使用平台需要什么账号？', '全部服务使用学校统一身份认证（CAS）登录，无需单独注册。个别外部系统（如数据中台）使用其自有账号。'],
  /* 智能填报暂时下线（2026-11-20），FAQ 一并隐藏，恢复时取消注释
  ['智能填报的数据是从哪里来的？', '结构化字段直接来自校内教师数据仓快照（教职工、学历学位、科研、教学评价、年度考核等），每项可查看数据依据；叙述性内容由大模型基于数仓事实起草，需人工核对。'],
  */
  ['对话记录会保存吗？', '会话记录保存在平台内，可在对话页面查看历史；请勿在对话中输入个人敏感信息（身份证号、银行卡号等）。'],
  ['页面打不开或接口报错怎么办？', '先刷新页面或退出重新登录；仍无法解决请联系信息中心：电话 0510-85916000，邮箱 dcc@wxit.edu.cn。'],
  ['如何让自己的智能体上架到广场？', '在「智能体开发平台」完成开发与调试后，将应用信息发送至 dcc@wxit.edu.cn，经信息中心审核后上架。'],
];

const TAG_FILTERS = ['全部', '常用', '新功能', '学工', '开发', '数据', '管理员'];

export default function GuidePage() {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('全部');
  const kw = q.trim().toLowerCase();
  const list = FEATURES.filter((f) => (tab === '全部' || f.tag === tab)
    && (!kw
      || f.b.toLowerCase().includes(kw)
      || f.desc.toLowerCase().includes(kw)
      || f.steps.some((s) => s.toLowerCase().includes(kw))));

  return (
    <PageLayout activePath="/manual" title="操作指南">
      <style>{`
        .gd-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
        .gd-steps li{display:flex;gap:10px;font-size:13px;color:var(--el-text-color-regular);line-height:1.7}
        .gd-steps li i{font-style:normal;flex:none;width:19px;height:19px;border-radius:50%;background:var(--el-color-primary-light-9);color:var(--el-color-primary);font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;margin-top:2px}
        .gd-go{font-size:12px;font-weight:600;color:var(--el-color-primary)!important;background:var(--el-color-primary-light-9);border:1px solid var(--el-color-primary-light-7);border-radius:var(--el-border-radius-small);padding:6px 14px;text-decoration:none;display:inline-block;transition:all var(--el-transition-duration-fast)}
        .gd-go:hover{background:var(--el-color-primary);color:#fff!important;border-color:var(--el-color-primary)}
        .gd-faq-details{background:var(--el-fill-color-light);border:1px solid var(--el-border-color-lighter);border-radius:var(--el-border-radius-base);padding:0 18px;margin-bottom:10px}
        .gd-faq-details summary{cursor:pointer;font-size:13.5px;font-weight:600;color:var(--el-text-color-primary);padding:13px 0;list-style:none}
        .gd-faq-details summary::-webkit-details-marker{display:none}
        .gd-faq-details p{font-size:13px;color:var(--el-text-color-regular);line-height:1.8;margin:0;padding:0 0 13px}
        .gd2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
        @media(max-width:1000px){.gd2{grid-template-columns:1fr}}
      `}</style>

      {/* Hero —— 与智能体广场同款横幅 + 半透明搜索 */}
      <div className="el-hero">
        <div className="el-hero__image"><img src="/plaza/avatar.png" alt="操作指南" /></div>
        <div className="el-hero__content">
          <h1 className="el-hero__title">操作指南</h1>
          <p className="el-hero__subtitle">
            每个功能的具体操作步骤，按条目查看或直接搜索。<br />
            新功能持续上线，本指南同步更新。
          </p>
          <div className="el-search-bar" style={{ maxWidth: 420, margin: '0 auto' }}>
            <input placeholder="搜索功能或操作，例如：填报、对话、导出…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="el-tabs__pill">
        {TAG_FILTERS.map((t) => (
          <button key={t} className={`el-tab-pill${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* 功能卡 */}
      <div className="gd2">
        {list.map((f) => (
          <div className="el-agent-card" key={f.b} style={{ minHeight: 0 }}>
            <div className="el-agent-card__header">
              <AgentIcon emoji={f.icon} category={f.category} />
              <h3 className="el-agent-card__title">{f.b}</h3>
              <span className={`el-tag el-tag--${f.tagType}`} style={{ marginLeft: 'auto' }}>{f.tag}</span>
            </div>
            <p className="el-agent-card__desc">{f.desc}</p>
            <ol className="gd-steps" style={{ marginBottom: 16 }}>
              {f.steps.map((s, i) => <li key={i}><i>{i + 1}</i><span>{s}</span></li>)}
            </ol>
            <div className="el-agent-card__footer">
              <div className="el-agent-card__tags">
                {f.admin
                  ? <span className="el-tag el-tag--default">入口：页头头像菜单 → AI 管理后台</span>
                  : null}
              </div>
              {f.to && <Link className="gd-go" to={f.to}>{f.toLabel}</Link>}
              {f.ext && <a className="gd-go" href={f.ext} target="_blank" rel="noopener noreferrer">{f.toLabel} ↗</a>}
            </div>
          </div>
        ))}
        {!list.length && (
          <div className="el-info-box" style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--el-text-color-secondary)', fontSize: 13 }}>
            没有匹配「{q}」的功能，换个关键词试试（如：填报、对话、导出）
          </div>
        )}
      </div>

      {/* 常见问题 */}
      <h2 className="el-section__title" style={{ margin: '32px 0 16px' }}>常见问题</h2>
      {FAQS.map((f) => (
        <details className="gd-faq-details" key={f[0]} open>
          <summary>{f[0]}</summary>
          <p>{f[1]}</p>
        </details>
      ))}
    </PageLayout>
  );
}
