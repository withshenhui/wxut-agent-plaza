import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Switch, InputNumber, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import adminRequest from '../../api/request';
import { listCategories } from '../../api/category';

export default function AgentManagePage() {
  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = (p = page, kw = keyword, cid = categoryId) => {
    setLoading(true);
    adminRequest.get('/agents', { params: { page: p, size: 10, keyword: kw || undefined, categoryId: cid || undefined } })
      .then((res) => { setData(res.records || []); setTotal(res.total || 0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    listCategories().then(setCategories).catch(() => {});
  }, []);

  const onSearch = () => { setPage(1); load(1, keyword, categoryId); };

  const openModal = async (record = null) => {
    setEditing(record);
    if (record) {
      // 先从详情接口获取完整数据（含 externalUrl 等）
      const detail = await adminRequest.get(`/agents/${record.id}`).catch(() => record);
      // 详情返回 categoryKey，需要映射为 categoryId 以匹配 Select
      const matchedCategory = categories.find(c => c.categoryKey === detail.categoryKey);
      form.setFieldsValue({
        ...detail,
        categoryId: matchedCategory ? matchedCategory.id : detail.categoryId,
        tags: (detail.tags || []).join(', '),
        isRecommended: !!detail.isRecommended,
        status: detail.status !== 0,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ status: true, isRecommended: false, sortOrder: 0 });
    }
    setModalOpen(true);
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      const body = {
        ...values,
        tags: values.tags ? values.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [],
        isRecommended: values.isRecommended ? 1 : 0,
        status: values.status ? 1 : 0,
      };
      if (editing) {
        await adminRequest.put(`/agents/${editing.id}`, body);
        message.success('更新成功');
      } else {
        await adminRequest.post('/agents', body);
        message.success('创建成功');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      if (err.message) message.error(err.message);
    }
  };

  const onDelete = async (id) => {
    await adminRequest.delete(`/agents/${id}`);
    message.success('删除成功');
    load();
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '图标', dataIndex: 'icon', width: 60, render: (v) => <span style={{ fontSize: 20 }}>{v}</span> },
    { title: '名称', dataIndex: 'name', width: 180 },
    { title: '分类', dataIndex: 'categoryName', width: 120 },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '推荐', dataIndex: 'isRecommended', width: 70, render: (v) => v === 1 ? <Tag color="blue">是</Tag> : <Tag>否</Tag> },
    { title: '状态', dataIndex: 'categoryKey', width: 70, render: (_, r) => <Tag color={r.isRecommended ? 'green' : 'default'}>正常</Tag> },
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
        <Select placeholder="选择分类" allowClear style={{ width: 160 }} value={categoryId}
          onChange={v => { setCategoryId(v); setPage(1); load(1, keyword, v); }}
          options={categories.map(c => ({ label: c.label, value: c.id }))} />
        <Button type="primary" onClick={onSearch}>搜索</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新增智能体</Button>
      </Space>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        pagination={{ current: page, total, pageSize: 10, onChange: (p) => { setPage(p); load(p); } }} />
      <Modal title={editing ? '编辑智能体' : '新增智能体'} open={modalOpen} onOk={onSubmit} onCancel={() => setModalOpen(false)} width={600} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="icon" label="图标 (emoji)">
            <Input />
          </Form.Item>
          <Form.Item name="categoryId" label="分类">
            <Select allowClear placeholder="选择分类" options={categories.map(c => ({ label: c.label, value: c.id }))} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="detail" label="详情">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="externalUrl" label="外部链接">
            <Input placeholder="填写后点击智能体将跳转外部链接" />
          </Form.Item>
          <Form.Item name="tags" label="标签 (逗号分隔)">
            <Input placeholder="如：学生, 日常, 管理" />
          </Form.Item>
          <Space>
            <Form.Item name="isRecommended" label="推荐" valuePropName="checked">
              <Switch />
            </Form.Item>
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
