import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { listConfigs, updateConfig } from '../../api/config';

export default function ConfigManagePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    listConfigs().then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openModal = (record) => {
    setEditing(record);
    form.setFieldsValue({ configValue: record.configValue });
    setModalOpen(true);
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      await updateConfig(editing.configKey, values.configValue);
      message.success('更新成功');
      setModalOpen(false);
      load();
    } catch (err) {
      if (err.message) message.error(err.message);
    }
  };

  const columns = [
    { title: 'Key', dataIndex: 'configKey', width: 200 },
    { title: 'Value', dataIndex: 'configValue', ellipsis: true },
    { title: '描述', dataIndex: 'description', ellipsis: true, width: 200 },
    { title: '更新时间', dataIndex: 'updatedAt', width: 170 },
    {
      title: '操作', width: 80, render: (_, record) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(record)}>编辑</Button>
      ),
    },
  ];

  return (
    <div>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} pagination={false} />
      <Modal title={`编辑配置: ${editing?.configKey}`} open={modalOpen} onOk={onSubmit} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="configValue" label="值" rules={[{ required: true, message: '请输入配置值' }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
