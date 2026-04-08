import React, { useState, useEffect } from 'react';
import PageLayout from './components/PageLayout';
import { searchModels } from './api/model';

function ModelManagement() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [models, setModels] = useState({ general: [], vertical: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      searchModels({ category: 'general', size: 50 }).catch(() => ({ records: [] })),
      searchModels({ category: 'vertical', size: 50 }).catch(() => ({ records: [] })),
    ]).then(([generalRes, verticalRes]) => {
      setModels({
        general: generalRes.records || [],
        vertical: verticalRes.records || [],
      });
    }).finally(() => setIsLoading(false));
  }, []);

  const currentModels = models[activeTab] || [];

  return (
    <PageLayout
      activePath="/model-management"
      title="模型服务"
      isSidebarCollapsed={isSidebarCollapsed}
      setIsSidebarCollapsed={setIsSidebarCollapsed}
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
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>加载中...</div>
        ) : currentModels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>暂无模型数据</div>
        ) : (
          currentModels.map(model => (
            <div key={model.id} className="el-model-card">
              {/* 模型头部 */}
              <div className="el-model-card__header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="el-model-card__icon">
                    <img src={model.iconUrl} alt={model.name} />
                  </div>
                  <div>
                    <div className="el-model-card__name">{model.name}</div>
                    <div className="el-model-card__meta">{model.provider} · {model.type}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {(model.tags || []).map((tag, index) => (
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
                <div className="el-model-card__date">{model.releaseDate}</div>
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
                  {!(model.tags || []).includes('接入中') && model.tryoutUrl && (
                    <a href={model.tryoutUrl} target="_blank" rel="noreferrer" className="el-link">体验使用</a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
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
