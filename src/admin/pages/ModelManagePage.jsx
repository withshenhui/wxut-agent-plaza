import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Switch, InputNumber, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import adminRequest from '../../api/request';

export default function ModelManagePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = (p = page, kw = keyword) => {
    setLoading(true);
    adminRequest.get('/models', { params: { page: p, size: 10, keyword: kw || undefined } })
      .then((res) => { setData(res.records || []); setTotal(res.total || 0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onSearch = () => { setPage(1); load(1, keyword); };

  const openModal = (record = null) => {
    setEditing(record);
    if (record) {
      form.setFieldsValue({
        ...record,
        tags: record.tags ? record.tags.join(', ') : '',
        status: record.status !== 0,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ status: true, sortOrder: 0, category: 'general' });
    }
    setModalOpen(true);
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      const body = {
        ...values,
        tags: values.tags ? values.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [],
        status: values.status ? 1 : 0,
      };
      if (editing) {
        await adminRequest.put(`/models/${editing.id}`, body);
        message.success('更新成功');
      } else {
        await adminRequest.post('/models', body);
        message.success('创建成功');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      if (err.message) message.error(err.message);
    }
  };

  const onDelete = async (id) => {
    await adminRequest.delete(`/models/${id}`);
    message.success('删除成功');
    load();
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '名称', dataIndex: 'name', width: 160 },
    { title: '提供商', dataIndex: 'provider', width: 120 },
    { title: '类型', dataIndex: 'type', width: 100 },
    { title: '分类', dataIndex: 'category', width: 100 },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 70, render: (v) => v === 1 ? <Tag color="green">正常</Tag> : <Tag color="red">禁用</Tag> },
    {
      title: '操作', width: 140, render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(record)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => onDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input placeholder="搜索关键词" value={keyword} onChange={e => setKeyword(e.target.value)}
          onPressEnter={onSearch} style={{ width: 200 }} prefix={<SearchOutlined />} />
        <Button type="primary" onClick={onSearch}>搜索</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新增模型</Button>
      </Space>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        pagination={{ current: page, total, pageSize: 10, onChange: (p) => { setPage(p); load(p); } }} />
      <Modal title={editing ? '编辑模型' : '新增模型'} open={modalOpen} onOk={onSubmit} onCancel={() => setModalOpen(false)} width={600} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="provider" label="提供商" rules={[{ required: true }]}>
            <Input placeholder="如 OpenAI, 百度, 阿里" />
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Input placeholder="如 LLM, 图像, 语音" />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Select options={[
              { label: '通用', value: 'general' },
              { label: '文本', value: 'text' },
              { label: '图像', value: 'image' },
              { label: '语音', value: 'audio' },
              { label: '视频', value: 'video' },
            ]} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="releaseDate" label="发布日期">
            <Input placeholder="如 2024-01" />
          </Form.Item>
          <Form.Item name="apiDocsUrl" label="API 文档地址">
            <Input />
          </Form.Item>
          <Form.Item name="tryoutUrl" label="体验地址">
            <Input />
          </Form.Item>
          <Form.Item name="iconUrl" label="图标地址">
            <Input />
          </Form.Item>
          <Form.Item name="tags" label="标签 (逗号分隔)">
            <Input placeholder="如：大模型, 对话" />
          </Form.Item>
          <Space>
            <Form.Item name="sortOrder" label="排序">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="status" label="启用" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
