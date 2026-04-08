import React, { useState, useEffect } from 'react';
import PageLayout from './components/PageLayout';

function ModelManagement() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);

  // 模拟模型数据
  const [models, setModels] = useState({
    general: [
      {
        id: 1,
        name: 'deepeek-r1-distill-qwen',
        provider: '震泽',
        type: '推理',
        description: '320亿参数精简模型，强化性能与长文本处理效率。',
        date: '2025-03-01',
        tags: ['限时免费'],
        apiDocs: '#',
        tryout: '#',
        icon: 'https://assets.watone.cn/model_image/deepseek.svg'
      },
      {
        id: 2,
        name: 'deepeek-v3-671b',
        provider: '震泽',
        type: '文本生成',
        description: 'V形架构超大模型，本土版本，拥有6710亿参数，支持128K上下文长度的强大AI语言模型，擅长长文本理解、复杂推理和多语言任务。',
        date: '2025-03-01',
        tags: ['限时免费'],
        apiDocs: '#',
        tryout: '#',
        icon: 'https://assets.watone.cn/model_image/deepseek.svg'
      },
      {
        id: 3,
        name: 'deepeek-r1-671b',
        provider: '震泽',
        type: '文本生成',
        description: '6710亿参数的高效能推理优化模型，专注于长文本理解与延迟响应。',
        date: '2025-03-01',
        tags: ['限时免费'],
        apiDocs: '#',
        tryout: '#',
        icon: 'https://assets.watone.cn/model_image/deepseek.svg'
      },
      {
        id: 4,
        name: 'qwen2.5-instruct',
        provider: '4.0',
        type: '文本生成',
        description: '70亿参数指令优化模型，强化多轮对话与复杂任务执行能力。',
        date: '2025-03-01',
        tags: ['限时免费'],
        apiDocs: '#',
        tryout: '#',
        icon: 'https://assets.watone.cn/model_image/qwen2.svg'
      },
      {
        id: 5,
        name: 'bge-m3',
        provider: 'BAAI',
        type: '嵌入',
        description: '新一代多语言嵌入模型（Embedding），支持多语言文本向量化，优化检索与语义匹配任务，适应短文本混合场景。',
        date: '2025-03-01',
        tags: ['接入中', '限时免费'],
        apiDocs: '#',
        tryout: '#',
        icon: 'https://assets.watone.cn/model_image/zhiyuan.svg'
      },
      {
        id: 6,
        name: 'bge-reranker-v2-m3',
        provider: 'BAAI',
        type: 'Reranker',
        description: '基于BGE-M3优化的高性能重排模型，增强跨语言检索结果精度，适配短文本混合场景。',
        date: '2025-03-01',
        tags: ['限时免费'],
        apiDocs: '#',
        tryout: '#',
        icon: 'https://assets.watone.cn/model_image/zhiyuan.svg'
      },
      {
        id: 7,
        name: 'QWQ-32B',
        provider: '震泽',
        type: '大模型',
        description: 'QWQ-32B通过大规模模型学习，实现了在数学推理和代码生成等核心场景中的卓越表现，同时将部署成本压缩至消费级显卡可承载范围',
        date: '2025-03-01',
        tags: ['限时免费'],
        apiDocs: '#',
        tryout: '#',
        icon: 'https://assets.watone.cn/model_image/qwen2.svg'
      },
      {
        id: 8,
        name: 'qwen3',
        provider: '震泽',
        type: '大模型',
        description: 'Qwen-3.2在推理、指令理解、代理能力和多语言支持方面取得了突破性的进展，支持思考链测试和非思考链测试的无缝切换。',
        date: '2025-04-29',
        tags: ['限时免费'],
        apiDocs: '#',
        tryout: '#',
        icon: 'https://assets.watone.cn/model_image/qwen2.svg'
      }
    ],
    vertical: [
      {
        id: 9,
        name: '智造锡言校本大模型',
        provider: '无锡职大',
        type: '校本大模型',
        description: '基于无锡职业技术大学特色打造的校本大模型，融合学校教学、科研、管理等多维度数据，为师生提供个性化智能服务。',
        date: '2025-06-01',
        tags: ['校本', '特色'],
        apiDocs: '#',
        tryout: '#',
        icon: 'http://210.28.145.186:3001/plaza/avatar.png'
      },
      {
        id: 10,
        name: '汽车专业领域垂类模型',
        provider: '无锡职大',
        type: '垂类模型',
        description: '针对汽车专业领域优化的AI模型，涵盖汽车构造、维修、设计等专业知识，为汽车专业师生提供精准的智能辅助。',
        date: '2025-07-15',
        tags: ['汽车', '专业'],
        apiDocs: '#',
        tryout: '#',
        icon: 'http://210.28.145.186:3001/plaza/avatar.png'
      },
      {
        id: 11,
        name: '人工智能专业领域垂类模型',
        provider: '无锡职大',
        type: '垂类模型',
        description: '聚焦人工智能专业领域的深度模型，覆盖机器学习、深度学习、自然语言处理等核心知识，助力AI专业教学与研究。',
        date: '2025-08-10',
        tags: ['人工智能', '专业'],
        apiDocs: '#',
        tryout: '#',
        icon: 'http://210.28.145.186:3001/plaza/avatar.png'
      }
    ]
  });

  return (
    <PageLayout
      activePath="/model-management"
      title="模型服务"
      isSidebarCollapsed={isSidebarCollapsed}
      setIsSidebarCollapsed={setIsSidebarCollapsed}
      footerText="© 无锡职业技术大学    Powered By 信息化与数据服务中心"
    >
      {/* 提示信息 */}
      <div className="el-alert el-alert--warning">
        <strong>⚠️</strong> 模型推理与微调功能正处于内测阶段，我们正在持续优化系统性能，公测期间服务可能偶发波动，敬请谅解。
      </div>

      {/* Tab页切换 */}
      <div className="el-tabs__header">
        <button
          className={`el-tab-button ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          通用
        </button>
        <button
          className={`el-tab-button ${activeTab === 'vertical' ? 'active' : ''}`}
          onClick={() => setActiveTab('vertical')}
        >
          垂类
        </button>
      </div>

      {/* 模型列表 */}
      <div className="el-grid el-grid--models">
        {models[activeTab].map(model => (
          <div key={model.id} className="el-model-card">
            {/* 模型头部 */}
            <div className="el-model-card__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="el-model-card__icon">
                  <img src={model.icon} alt={model.name} />
                </div>
                <div>
                  <div className="el-model-card__name">{model.name}</div>
                  <div className="el-model-card__meta">{model.provider} · {model.type}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {model.tags.map((tag, index) => (
                  <span key={index} className={`el-badge ${tag === '接入中' ? 'el-badge--warning' : 'el-badge--primary'}`}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* 模型描述 */}
            <div className="el-model-card__desc">{model.description}</div>

            {/* 模型底部 */}
            <div className="el-model-card__footer">
              <div className="el-model-card__date">{model.date}</div>
              <div className="el-model-card__actions">
                <button
                  className="el-button--text"
                  onClick={() => {
                    setSelectedModel(model);
                    setIsDrawerOpen(true);
                  }}
                >
                  API调用说明
                </button>
                {!model.tags.includes('接入中') && (
                  <a href="#" className="el-link">体验使用</a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* API调用说明抽屉遮罩层 */}
      {isDrawerOpen && (
        <div className="el-drawer__overlay" onClick={() => setIsDrawerOpen(false)} />
      )}

      {/* API调用说明抽屉 */}
      {isDrawerOpen && selectedModel && (
        <div className="el-drawer">
          {/* 抽屉头部 */}
          <div className="el-drawer__header">
            <h3 className="el-drawer__title">{selectedModel.name}</h3>
            <button
              className="el-drawer__close"
              onClick={() => setIsDrawerOpen(false)}
            >
              ×
            </button>
          </div>

          {/* 抽屉内容 */}
          <div className="el-drawer__body">
            {/* 前提条件 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '600' }}>前提条件</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#606266' }}>您已获取API Key，用于API调用授权，<a href="#" className="el-link">开通/查看API Key</a>。</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#606266' }}>获取模型命名用于模型调用</p>
            </div>

            {/* 简介 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '600' }}>简介</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#606266' }}>{selectedModel.description}</p>
            </div>

            {/* API调用示例 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '600' }}>API 调用示例</h4>
              <div className="el-code-block">
                {`curl --location "https://zhenze-huhehaote.cmecloud.cn/v1/chat/completions" \\
--header "Content-Type: application/json" \\
--header "Authorization: Bearer api_key" \\
--data "{
  \\"model\\": \\"${selectedModel.name}\\",
  \\"messages\\": [
    {\\"role\\": \\"system\\", \\"content\\": \\"You are a helpful assistant.\\"},
    {\\"role\\": \\"user\\", \\"content\\": \\"3.11和3.9谁大\\"}
  ],
  \\"stream\\": true
}"`}
              </div>
              <button className="el-button--text" style={{ float: 'right' }}>复制</button>
            </div>

            {/* 调用响应示例 */}
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '600' }}>调用响应示例</h4>
              <div className="el-code-block">
                {`{
  "id": "chatd8a3878-f4ed-11ef-8772-5420b763279e",
  "object": "chat.completion",
  "created": 1764894852,
  "model": "${selectedModel.name}",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "要比较 3.11 和 3.9 的大小，我们可以从高位到低位依次比较每一位的数字。\\n\\n首先比较整数部分：\\n3.11 和 3.9 的整数部分都是 3，所以整数部分相等。\\n\\n接下来比较小数部分的第一位（十分位）：\\n3.11 的十分位是 1，3.9 的十分位是 9。\\n因为 1 < 9，所以 3.11 < 3.9。\\n\\n因此，3.9 大于 3.11。"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 120,
    "total_tokens": 135
  }
}`}
              </div>
              <button className="el-button--text" style={{ float: 'right' }}>复制</button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default ModelManagement;
