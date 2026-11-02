import React, { useEffect, useState, useRef } from 'react';
import {
  Card, Button, Space, Form, Input, Select, Tag, message, Popconfirm, Typography, Divider, Empty, Spin
} from 'antd';
import {
  PlusOutlined, ThunderboltOutlined, DeleteOutlined, CheckCircleFilled,
  SafetyCertificateOutlined, CloudServerOutlined, LinkOutlined, RobotOutlined,
} from '@ant-design/icons';
import { getConfig, updateConfig } from '../../api/config';

const { Text, Title, Paragraph } = Typography;

// 常用供应商模板（name 同时作为标识；logo 用品牌色首字母）
const PROVIDER_TEMPLATES = {
  deepseek: { name: 'DeepSeek', type: 'DeepSeek', base_url: 'https://api.deepseek.com', model: 'deepseek-v4-flash', color: '#4D6BFE', hint: '深度求索官方接口，支持 deepseek-v4-flash 等模型' },
  qwen: { name: '通义千问', type: 'OpenAI 兼容', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', color: '#615CED', hint: '阿里云百炼 DashScope 兼容模式' },
  kimi: { name: 'Kimi(月之暗面)', type: 'OpenAI 兼容', base_url: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', color: '#000000', hint: '月之暗面 Kimi 大模型' },
  zhipu: { name: '智谱GLM', type: 'OpenAI 兼容', base_url: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash', color: '#3859FF', hint: '智谱 AI ChatGLM 系列' },
};

const PROVIDERS_KEY = 'llm.providers';
const GATEWAY = import.meta.env.VITE_GATEWAY_BASE_URL || 'http://localhost:8530';

// 类型选项（外观 + 值）
const TYPE_OPTIONS = [
  { value: 'DeepSeek', label: 'DeepSeek' },
  { value: 'OpenAI 兼容', label: 'OpenAI 兼容' },
  { value: '其他', label: '其他' },
];

export default function LlmConfigManagePage() {
  
  const [providers, setProviders] = useState([]);
  const [current, setCurrent] = useState(null);  // 当前生效 provider（可能来自 llm.* 三键）
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);   // 右侧当前编辑的 provider id
  const [editKey, setEditKey] = useState(0);            // 切换编辑对象时重置表单
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);   // {ok, msg}
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [provVal, base, keyVal, model] = await Promise.all([
        getConfig(PROVIDERS_KEY).catch(() => null),
        getConfig('llm.base_url').catch(() => null),
        getConfig('llm.api_key').catch(() => null),
        getConfig('llm.model').catch(() => null),
      ]);
      let list = [];
      if (provVal?.configValue) {
        try { list = JSON.parse(provVal.configValue); } catch { list = []; }
      }
      if (!Array.isArray(list)) list = [];
      const curBase = base?.configValue || '';
      const curKey = keyVal?.configValue || '';
      const curModel = model?.configValue || '';
      const active = list.find(p => p.base_url === curBase && p.api_key === curKey && p.model === curModel) || null;
      setProviders(list);
      setCurrent(active ? { ...active } : (curBase ? { base_url: curBase, api_key: curKey, model: curModel, name: '当前模型' } : null));
      // 默认选中第一个（或当前生效的）
      if (list.length) {
        const target = active || list[0];
        setSelectedId(target.id);
        setEditKey(k => k + 1);
        form.setFieldsValue({
          name: target.name, type: target.type, base_url: target.base_url,
          api_key: target.api_key, model: target.model,
        });
      } else {
        setSelectedId(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const isCurrent = (p) =>
    current && ((current.id && current.id === p.id)
      || (!current.id && current && current.base_url === p.base_url && current.model === p.model && current.api_key === p.api_key));

  const selectProvider = (p) => {
    setSelectedId(p.id);
    setTestResult(null);
    setEditKey(k => k + 1);
    form.setFieldsValue({ name: p.name, type: p.type, base_url: p.base_url, api_key: p.api_key, model: p.model });
  };

  const quickAdd = (key) => {
    const tpl = PROVIDER_TEMPLATES[key];
    if (listHas(tpl.name)) { message.info(`已存在「${tpl.name}」配置，可直接编辑`); return; }
    const fresh = { id: `p_${Date.now()}`, name: tpl.name, type: tpl.type, base_url: tpl.base_url, api_key: '', model: tpl.model, color: tpl.color, hint: tpl.hint };
    const next = [...providers, fresh];
    updateConfig(PROVIDERS_KEY, JSON.stringify(next));
    setProviders(next);
    setSelectedId(fresh.id);
    setTestResult(null);
    setEditKey(k => k + 1);
    form.setFieldsValue({ name: fresh.name, type: fresh.type, base_url: fresh.base_url, api_key: '', model: fresh.model });
    message.success(`已添加 ${fresh.name} 模板，请填入 API Key`);
  };

  const listHas = (name) => providers.some(p => p.name === name);

  const saveSelected = async () => {
    // 校验是否选中了编辑对象
    if (!selectedId) { message.warning('请先选择或添加一个供应商'); return; }
    try {
      const values = await form.validateFields();
      setSaving(true);
      const next = providers.map(p => p.id === selectedId ? { ...p, ...values } : p);
      await updateConfig(PROVIDERS_KEY, JSON.stringify(next));
      setProviders(next);
      // 若当前编的对象即"当前生效"且改动了关键连接字段，则同步刷新当前状态展示
      message.success('已保存');
      if (current && current.id === selectedId) {
        // 同步刷新 current（仅当改动是同一 provider）
        load();
      }
    } catch (err) {
      if (err?.message) message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const setAsCurrent = async (p) => {
    if (!p.api_key) { message.warning('请先填写该供应商的 API Key'); return; }
    const hide = message.loading('正在切换当前大模型…', 0);
    try {
      await Promise.all([
        updateConfig('llm.base_url', p.base_url),
        updateConfig('llm.api_key', p.api_key),
        updateConfig('llm.model', p.model),
      ]);
      await fetch(`${GATEWAY}/v1/admin/llm-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_url: p.base_url, api_key: p.api_key, model: p.model }),
      });
      message.success(`已切换为当前使用：${p.name}`);
      await load();
    } catch (e) {
      message.error('切换失败：' + (e?.message || '未知错误'));
    } finally {
      hide();
    }
  };

  const removeProvider = async (p) => {
    const next = providers.filter(x => x.id !== p.id);
    await updateConfig(PROVIDERS_KEY, JSON.stringify(next));
    message.success('已删除');
    setSelectedId(next.length ? next[0].id : null);
    if (next.length) {
      setEditKey(k => k + 1);
      form.setFieldsValue({ name: next[0].name, type: next[0].type, base_url: next[0].base_url, api_key: next[0].api_key, model: next[0].model });
    } else {
      form.resetFields();
    }
    setProviders(next);
  };

  // 模拟"测试连接"：调用网关列出模型，验证 base_url + api_key 是否可达
  const testConnection = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }
    setTesting(true); setTestResult(null);
    try {
      const base = (values.base_url || '').replace(/\/+$/, '');
      const resp = await fetch(`${base}/models`, {
        headers: { Authorization: `Bearer ${values.api_key}` },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const count = Array.isArray(data?.data) ? data.data.length : 0;
      setTestResult({ ok: true, msg: `连接成功，可用模型 ${count} 个` });
    } catch (e) {
      setTestResult({ ok: false, msg: `连接失败：${e?.message || e}` });
    } finally {
      setTesting(false);
    }
  };

  const logo = (p) => {
    const color = p.color || '#1677ff';
    const initial = (p.name || '?').charAt(0);
    return (
      <div style={{ width: 40, height: 40, borderRadius: 10, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
        {initial}
      </div>
    );
  };

  const selected = providers.find(p => p.id === selectedId) || null;

  return (
    <div>
      {/* 顶部说明条 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <Title level={5} style={{ margin: 0 }}><SafetyCertificateOutlined /> 大模型配置</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>管理可接入的大模型供应商，并将其中一个设为当前查询网关使用的大模型。切换后即时生效，无需重启服务。</Text>
        </div>
        <Space>
          {Object.keys(PROVIDER_TEMPLATES).map(k => (
            <Button key={k} size="small" onClick={() => quickAdd(k)}>{PROVIDER_TEMPLATES[k].name}</Button>
          ))}
        </Space>
      </div>

      {/* 当前生效横幅 */}
      <div style={{
        border: '1px solid #d9f7be', background: '#f6ffed', borderRadius: 8, padding: '12px 16px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <CheckCircleFilled style={{ color: '#52c41a', fontSize: 20 }} />
        <div style={{ flex: 1 }}>
          <Text strong>当前生效：</Text>
          {current ? (
            <>
              <Text>{current.name || '当前模型'}</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>{current.base_url}</Text>
              <Tag color="blue" style={{ marginLeft: 8 }}>{current.model}</Tag>
            </>
          ) : (
            <Text type="warning">尚未配置，请在下方添加并"设为当前"</Text>
          )}
        </div>
      </div>

      <Spin spinning={loading}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* 左：供应商列表 */}
          <Card style={{ width: 320, flexShrink: 0 }} styles={{ body: { padding: 8 } }}>
            <div style={{ padding: '4px 8px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>模型供应商</Text>
              <Tag color="default">{providers.length}</Tag>
            </div>
            {providers.length === 0 && !loading ? (
              <Empty description="暂无供应商" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 24 }} />
            ) : (
              providers.map(p => {
                const active = isCurrent(p);
                const sel = p.id === selectedId;
                return (
                  <div key={p.id} onClick={() => selectProvider(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                      background: sel ? '#e6f4ff' : 'transparent', border: sel ? '1px solid #91caff' : '1px solid transparent',
                      marginBottom: 4,
                    }}>
                    {logo(p)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Text strong style={{ fontSize: 13 }} ellipsis>{p.name}</Text>
                        {active && <Tag color="green" style={{ marginInlineEnd: 0 }}>当前</Tag>}
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }} ellipsis>{p.model}</Text>
                    </div>
                  </div>
                );
              })
            )}
            <Divider style={{ margin: '8px 0' }} />
            <Button type="dashed" block icon={<PlusOutlined />} onClick={() => quickAddCustom()}>添加自定义供应商</Button>
          </Card>

          {/* 右：详情 / 编辑 */}
          <Card style={{ flex: 1, minWidth: 0 }}>
            {!selected ? (
              <Empty description="请从左侧选择一个供应商，或添加新的供应商" style={{ padding: 48 }} />
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  {logo(selected)}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Title level={5} style={{ margin: 0 }}>{selected.name}</Title>
                      {isCurrent(selected) && <Tag color="green">当前使用</Tag>}
                      {selected.hint && <Text type="secondary" style={{ fontSize: 12 }}>{selected.hint}</Text>}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{selected.base_url}</Text>
                  </div>
                  <Space>
                    <Popconfirm title="确认删除该供应商配置？" onConfirm={() => removeProvider(selected)}>
                      <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                    {!isCurrent(selected) && (
                      <Button type="primary" size="small" icon={<ThunderboltOutlined />} onClick={() => setAsCurrent(selected)}>设为当前</Button>
                    )}
                  </Space>
                </div>

                <Form key={editKey} form={form} layout="vertical" disabled={!selected}>
                  <Form.Item name="name" label="供应商名称" rules={[{ required: true, message: '请输入名称' }]}>
                    <Input placeholder="如：DeepSeek、通义千问" prefix={<RobotOutlined />} />
                  </Form.Item>
                  <Form.Item name="type" label="类型" rules={[{ required: true }]}>
                    <Select options={TYPE_OPTIONS} />
                  </Form.Item>
                  <Form.Item name="base_url" label="API Base URL" rules={[{ required: true, message: '请输入接口地址' }]}>
                    <Input placeholder="https://api.deepseek.com" prefix={<LinkOutlined />} />
                  </Form.Item>
                  <Form.Item
                    name="api_key" label="API Key"
                    rules={[{ required: true, message: '请输入 API Key' }]}
                    extra="密钥仅用于网关调用大模型，展示时打码存储"
                  >
                    <Input.Password placeholder="sk-..." prefix={<CloudServerOutlined />} />
                  </Form.Item>
                  <Form.Item name="model" label="模型名称" rules={[{ required: true, message: '请输入模型名' }]}>
                    <Input placeholder="deepseek-v4-flash" />
                  </Form.Item>
                </Form>

                {testResult && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 6, marginBottom: 12,
                    background: testResult.ok ? '#f6ffed' : '#fff2f0',
                    border: `1px solid ${testResult.ok ? '#b7eb8f' : '#ffccc7'}`,
                    color: testResult.ok ? '#389e0d' : '#cf1322',
                  }}>
                    <Text>{testResult.ok ? '✓ ' : '✗ '}{testResult.msg}</Text>
                  </div>
                )}

                <Divider style={{ margin: '12px 0' }} />
                <Space>
                  <Button type="primary" loading={saving} onClick={saveSelected}>保存配置</Button>
                  <Button loading={testing} onClick={testConnection}>测试连接</Button>
                </Space>
              </>
            )}
          </Card>
        </div>
      </Spin>
    </div>
  );

  function quickAddCustom() {
    const fresh = { id: `p_${Date.now()}`, name: '自定义供应商', type: 'OpenAI 兼容', base_url: '', api_key: '', model: '', color: '#8c8c8c', hint: '自定义 OpenAI 兼容接口' };
    const next = [...providers, fresh];
    updateConfig(PROVIDERS_KEY, JSON.stringify(next));
    setProviders(next);
    setSelectedId(fresh.id);
    setTestResult(null);
    setEditKey(k => k + 1);
    form.setFieldsValue({ name: fresh.name, type: fresh.type, base_url: fresh.base_url, api_key: fresh.api_key, model: fresh.model });
    message.success('已添加自定义供应商，请完善连接参数');
  }
}
