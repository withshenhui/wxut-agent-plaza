import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Switch, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { listCategories, createCategory, updateCategory, deleteCategory } from '../../api/category';

export default function CategoryManagePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    listCategories().then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openModal = (record = null) => {
    setEditing(record);
    if (record) {
      form.setFieldsValue({ ...record, status: record.status !== 0 });
    } else {
      form.resetFields();
      form.setFieldsValue({ status: true, sortOrder: 0 });
    }
    setModalOpen(true);
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      const body = { ...values, status: values.status ? 1 : 0 };
      if (editing) {
        await updateCategory(editing.id, body);
        message.success('更新成功');
      } else {
        await createCategory(body);
        message.success('创建成功');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      if (err.message) message.error(err.message);
    }
  };

  const onDelete = async (id) => {
    await deleteCategory(id);
    message.success('删除成功');
    load();
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Key', dataIndex: 'categoryKey', width: 120 },
    { title: '标签', dataIndex: 'label', width: 140 },
    { title: '图标', dataIndex: 'icon', width: 60, render: (v) => <span style={{ fontSize: 18 }}>{v}</span> },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '排序', dataIndex: 'sortOrder', width: 70 },
    { title: '状态', dataIndex: 'status', width: 70, render: (v) => v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag> },
    {
      title: '操作', width: 140, render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(record)}>编辑</Button>
          <Popconfirm title="确认删除？删除分类前请确保该分类下没有智能体" onConfirm={() => onDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新增分类</Button>
      </Space>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} pagination={false} />
      <Modal title={editing ? '编辑分类' : '新增分类'} open={modalOpen} onOk={onSubmit} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="categoryKey" label="分类 Key (英文标识)" rules={[{ required: true, message: '请输入分类 Key' }]}>
            <Input placeholder="如 student, teacher" />
          </Form.Item>
          <Form.Item name="label" label="显示名称" rules={[{ required: true, message: '请输入显示名称' }]}>
            <Input placeholder="如 学生管理" />
          </Form.Item>
          <Form.Item name="icon" label="图标 (emoji)">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
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
