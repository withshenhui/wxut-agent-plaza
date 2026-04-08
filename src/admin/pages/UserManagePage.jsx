import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Switch, Tag, message, Popconfirm } from 'antd';
import { EditOutlined, SearchOutlined, KeyOutlined } from '@ant-design/icons';
import { listUsers, updateUser, updateUserStatus, resetPassword } from '../../api/user';

export default function UserManagePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [pwdForm] = Form.useForm();

  const load = (p = page, kw = keyword, st = statusFilter) => {
    setLoading(true);
    listUsers({ page: p, size: 10, keyword: kw || undefined, status: st ?? undefined })
      .then((res) => { setData(res.records || []); setTotal(res.total || 0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onSearch = () => { setPage(1); load(1, keyword, statusFilter); };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue(record);
    setEditOpen(true);
  };

  const onEditSubmit = async () => {
    try {
      const values = await form.validateFields();
      await updateUser(editing.id, values);
      message.success('更新成功');
      setEditOpen(false);
      load();
    } catch (err) {
      if (err.message) message.error(err.message);
    }
  };

  const onToggleStatus = async (record) => {
    const newStatus = record.status === 1 ? 0 : 1;
    await updateUserStatus(record.id, newStatus);
    message.success('状态已更新');
    load();
  };

  const openResetPwd = (record) => {
    setEditing(record);
    pwdForm.resetFields();
    setPwdOpen(true);
  };

  const onResetPwd = async () => {
    try {
      const values = await pwdForm.validateFields();
      await resetPassword(editing.id, values.password);
      message.success('密码已重置');
      setPwdOpen(false);
    } catch (err) {
      if (err.message) message.error(err.message);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username', width: 120 },
    { title: '昵称', dataIndex: 'nickname', width: 120 },
    { title: '邮箱', dataIndex: 'email', width: 180 },
    { title: '手机', dataIndex: 'phone', width: 130 },
    { title: '角色', dataIndex: 'role', width: 80, render: (v) => v === 'admin' ? <Tag color="blue">管理员</Tag> : <Tag>用户</Tag> },
    { title: '状态', dataIndex: 'status', width: 80, render: (v) => v === 1 ? <Tag color="green">正常</Tag> : <Tag color="red">禁用</Tag> },
    { title: '注册时间', dataIndex: 'createdAt', width: 170 },
    {
      title: '操作', width: 220, render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Button type="link" size="small" onClick={() => onToggleStatus(record)}>
            {record.status === 1 ? '禁用' : '启用'}
          </Button>
          <Popconfirm title="确认重置该用户密码？" onConfirm={() => openResetPwd(record)}>
            <Button type="link" size="small" icon={<KeyOutlined />}>重置密码</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input placeholder="搜索用户名/昵称" value={keyword} onChange={e => setKeyword(e.target.value)}
          onPressEnter={onSearch} style={{ width: 200 }} prefix={<SearchOutlined />} />
        <Select placeholder="状态" allowClear style={{ width: 120 }} value={statusFilter}
          onChange={v => { setStatusFilter(v); setPage(1); load(1, keyword, v); }}
          options={[{ label: '正常', value: 1 }, { label: '禁用', value: 0 }]} />
        <Button type="primary" onClick={onSearch}>搜索</Button>
      </Space>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        pagination={{ current: page, total, pageSize: 10, onChange: (p) => { setPage(p); load(p); } }} />

      <Modal title="编辑用户" open={editOpen} onOk={onEditSubmit} onCancel={() => setEditOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="nickname" label="昵称"><Input /></Form.Item>
          <Form.Item name="email" label="邮箱"><Input /></Form.Item>
          <Form.Item name="phone" label="手机"><Input /></Form.Item>
          <Form.Item name="role" label="角色">
            <Select options={[{ label: '管理员', value: 'admin' }, { label: '普通用户', value: 'user' }]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="重置密码" open={pwdOpen} onOk={onResetPwd} onCancel={() => setPwdOpen(false)} destroyOnClose>
        <Form form={pwdForm} layout="vertical">
          <Form.Item name="password" label="新密码" rules={[{ required: true, min: 6, message: '密码至少6位' }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
