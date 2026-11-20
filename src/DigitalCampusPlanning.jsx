import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from './components/PageLayout';
import './science.css';

const topics = [
{
  "name": "多模态大模型",
  "question": "模型怎样读懂一张图？",
  "example": "给出实训设备的照片，再用文字指出要观察的部件。照片提供位置和外观，文字限定问题，两种输入一起帮助模型组织回答。",
  "sections": []
},
{
  "name": "数据管理中台",
  "question": "校园数据怎样变成可用的答案？",
  "example": "教师填报材料时，同一项学历信息可能出现在不同系统。中台先统一字段口径，再按权限提供给填报应用，方便教师核对来源。",
  "sections": [
    [
      "大模型数据管理中台能力",
      [
        [
          "数据采集与集成",
          "从多源异构系统获取数据，支持结构化和非结构化数据的统一采集"
        ],
        [
          "数据治理与质量控制",
          "建立数据标准，实施数据清洗、脱敏和质量监控"
        ],
        [
          "智能数据处理",
          "利用大模型能力对数据进行智能标注、分类和结构化处理"
        ],
        [
          "向量存储与检索",
          "构建高性能向量数据库，支持语义级数据检索"
        ],
        [
          "数据服务与API管理",
          "提供标准化数据服务接口，支持多场景数据应用"
        ]
      ]
    ],
    [
      "大模型中的数据作用",
      [
        [
          "模型训练基础",
          "高质量的数据是训练高性能大模型的前提，决定了模型的知识边界和能力上限"
        ],
        [
          "模型个性化微调",
          "通过领域特定数据的微调，使通用大模型适配校园特定场景"
        ],
        [
          "推理增强",
          "通过检索增强生成（RAG）技术，为大模型提供实时、准确的外部知识"
        ],
        [
          "智能体决策支撑",
          "为智能体提供决策所需的实时数据和历史数据，提升决策准确性"
        ],
        [
          "持续优化反馈",
          "通过用户交互数据和应用效果数据，持续优化模型性能"
        ],
        [
          "数据管理实践",
          "信息中心建立了完善的数据管理体系，包括数据标准制定、数据质量监控、数据安全保障等，确保数据在大模型应用中的合规性和有效性。"
        ]
      ]
    ]
  ]
},
{
  "name": "校园智能体",
  "question": "智能体怎样完成一项任务？",
  "example": "向课程助手询问下学期适合的选修课。它可以先了解你的专业和兴趣，再查询课程目录，列出候选课程并解释推荐理由。",
  "sections": [
    [
      "智能体的定义",
      [
        [
          "自主性",
          "能够独立规划和执行任务，无需人类持续干预"
        ],
        [
          "感知能力",
          "能够理解多模态输入，包括文本、图像、语音等"
        ],
        [
          "认知能力",
          "能够基于大模型和知识库进行推理、学习和问题解决"
        ],
        [
          "交互能力",
          "能够与用户和其他系统进行自然、有效的沟通"
        ],
        [
          "适应性",
          "能够根据环境变化和用户反馈调整行为策略"
        ]
      ]
    ],
    [
      "智能体的作用",
      [
        [
          "教学辅助",
          "为师生提供个性化学习资源推荐、智能答疑、作业批改等服务"
        ],
        [
          "科研支持",
          "协助教师进行文献综述、实验设计、数据分析等科研活动"
        ],
        [
          "管理服务",
          "优化校园管理流程，提供智能审批、信息查询、资源调度等服务"
        ],
        [
          "生活服务",
          "为师生提供校园导航、活动推荐、健康管理等便捷服务"
        ],
        [
          "决策支持",
          "为学校管理层提供数据驱动的决策建议和分析报告"
        ],
        [
          "创新引擎",
          "推动教育教学模式创新，促进跨学科融合和知识创造"
        ]
      ]
    ],
    [
      "智能体技术架构",
      [
        [
          "感知层",
          "多模态输入处理，包括文本、图像、音频、视频"
        ],
        [
          "认知层",
          "大模型推理、知识库检索、意图理解"
        ],
        [
          "决策层",
          "任务规划、工具调用、行动执行"
        ],
        [
          "交互层",
          "自然语言生成、多模态输出、用户反馈处理"
        ]
      ]
    ],
    [
      "智能体广场规划",
      [
        [
          "平台建设",
          "构建统一的智能体管理平台，实现智能体的注册、部署和管理"
        ],
        [
          "生态构建",
          "鼓励师生参与智能体开发，形成丰富的智能体生态"
        ],
        [
          "应用推广",
          "在教学、科研、管理等领域推广智能体应用"
        ],
        [
          "持续优化",
          "根据用户反馈和技术发展，持续优化智能体性能"
        ]
      ]
    ]
  ]
},
];

const introductions = [
  '文本、图像、语音和视频是不同的信息形式，也叫“模态”。多模态模型可以结合几种输入理解同一个问题，也可以按任务生成文字、图像或声音。',
  '校内业务系统各自记录着教学、科研和人事信息。数据管理中台负责汇集这些记录、统一口径，再让应用按需检索和使用。',
  '智能体以大模型为基础，根据目标规划步骤，调用知识库或业务工具，再根据执行结果调整下一步行动。',
];
const milestones = [
  ['文本生成', '给出一段课程说明，模型可以提取要点、续写段落或调整措辞。', 'GPT-3'],
  ['文字生成图像', '把场景、构图和颜色写进提示词，模型据此生成图像。', 'DALL·E、Stable Diffusion'],
  ['图文联合理解', '同时提交图表和问题，让模型结合坐标、图例与文字说明解读趋势。', 'GPT-4V'],
  ['语音与视频交互', '连续画面带来动作和顺序信息，语音则补充语调与节奏。', '音视频多模态模型'],
];
const figures = [
  ['arc', '智能体广场规划架构'], ['case1', '智能推荐案例一'], ['case2', '智能推荐案例二'], ['case3', '智能推荐案例三'],
];

function Figure({ figure, onOpen }) {
  const [available, setAvailable] = useState(true);
  const [file, label] = figure;
  return available && <button className="science-figure" onClick={() => onOpen(figure)}>
    <img src={`${import.meta.env.BASE_URL}plaza/${file}.png`} alt={label} onError={() => setAvailable(false)} />
    <span>{label} ↗</span>
  </button>;
}

export default function DigitalCampusPlanning() {
  const [collapsed, setCollapsed] = useState(false);
  const [index, setIndex] = useState(0);
  const [figure, setFigure] = useState(null);
  const dialog = useRef(null);
  const heading = useRef(null);
  const topic = topics[index];
  function selectTopic(next) {
    setIndex(next);
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: false }));
  }
  return <PageLayout activePath="/campus-planning" title="AI 科普" isSidebarCollapsed={collapsed} setIsSidebarCollapsed={setCollapsed}>
    <main className="science">
      <header className="science-cover">
        <div><p>无锡职业技术大学 · AI 科普</p><h2>读懂校园里的人工智能</h2>
          <span>从模型如何理解信息，到数据如何支撑服务，探索身边的 AI 应用。</span></div>
        <div className="science-orbit" aria-hidden="true"><i /><i /><i /><b /></div>
      </header>
      <div className="science-layout">
        <nav className="science-menu" aria-label="科普专题"><h3>专题目录</h3>
          {topics.map((t,i) => <button key={t.name} aria-current={i === index ? 'page' : undefined} onClick={() => selectTopic(i)}><span>{String(i + 1).padStart(2, '0')}</span>{t.name}</button>)}
        </nav>
        <article className="science-article" key={index}>
          <header><small>专题 {String(index + 1).padStart(2, '0')}　/　{topic.name}</small><h2 ref={heading} tabIndex="-1">{topic.question}</h2><p>{introductions[index]}</p></header>
          <aside className="science-example"><strong>校园里的例子</strong><p>{topic.example}</p></aside>
          {index === 0 && <section><h3>从文本到多模态</h3><ol className="science-timeline">{milestones.map(([title,detail,model]) => <li key={title}><h4>{title}</h4><small>{model}</small><p>{detail}</p></li>)}</ol></section>}
          {topic.sections.map(([title,rows],i) => <details key={title} open={i === 0}><summary>{title}</summary><dl>{rows.map(([name,detail]) => <React.Fragment key={name}><dt>{name}</dt><dd>{detail}</dd></React.Fragment>)}</dl></details>)}
          {index === 2 && <section><h3>智能推荐案例</h3><p>智能推荐可用于学习资源、选修课程和就业岗位匹配。以选课为例，专业培养方案限定可选范围，学习进度和兴趣帮助确定推荐顺序。</p>
            <div className="science-gallery">{figures.map(f => <Figure key={f[0]} figure={f} onOpen={item => {setFigure(item); dialog.current.showModal();}} />)}</div>
            <Link to="/plaza">浏览校园智能体 →</Link></section>}
          {index < topics.length - 1 && <button className="science-next" onClick={() => selectTopic(index + 1)}>下一专题 · {topics[index+1].name} →</button>}
        </article>
      </div>
      <dialog ref={dialog} className="science-dialog" aria-label={figure?.[1]} onClick={e => {if (e.target === dialog.current) dialog.current.close();}}>
        <button onClick={() => dialog.current.close()}>关闭</button>{figure && <img alt={figure[1]} src={`${import.meta.env.BASE_URL}plaza/${figure[0]}.png`} />}
      </dialog>
    </main>
  </PageLayout>;
}
