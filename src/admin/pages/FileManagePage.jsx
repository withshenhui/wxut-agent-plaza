import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Upload, message, Popconfirm, Tag } from 'antd';
import { UploadOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import adminRequest from '../../api/request';
import { deleteFile, getDownloadUrl } from '../../api/file';

export default function FileManagePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    adminRequest.get('/files', { params: { page: 1, size: 100 } })
      .then((res) => setData(res.records || res || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onUpload = (info) => {
    if (info.file.status === 'done') {
      message.success('上传成功');
      load();
    } else if (info.file.status === 'error') {
      message.error('上传失败');
    }
  };

  const onDelete = async (id) => {
    await deleteFile(id);
    message.success('删除成功');
    load();
  };

  const uploadProps = {
    name: 'file',
    action: '/api/v1/files/upload',
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
    showUploadList: false,
    onChange: onUpload,
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '原始文件名', dataIndex: 'originalName', ellipsis: true },
    { title: '大小', dataIndex: 'fileSize', width: 100, render: (v) => v ? `${(v / 1024).toFixed(1)} KB` : '-' },
    { title: '类型', dataIndex: 'mimeType', width: 150, render: (v) => v ? <Tag>{v}</Tag> : '-' },
    { title: '上传时间', dataIndex: 'createdAt', width: 170 },
    {
      title: '操作', width: 140, render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<DownloadOutlined />}
            onClick={() => window.open(getDownloadUrl(record.id), '_blank')}>下载</Button>
          <Popconfirm title="确认删除？" onConfirm={() => onDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Upload {...uploadProps}>
          <Button type="primary" icon={<UploadOutlined />}>上传文件</Button>
        </Upload>
      </Space>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} pagination={{ pageSize: 10 }} />
    </div>
  );
}
