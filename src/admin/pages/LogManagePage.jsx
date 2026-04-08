import React, { useEffect, useState } from 'react';
import { Table, Input, Space, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { listLogs } from '../../api/log';

export default function LogManagePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [username, setUsername] = useState('');
  const [operation, setOperation] = useState('');

  const load = (p = page, u = username, op = operation) => {
    setLoading(true);
    listLogs({ page: p, size: 20, username: u || undefined, operation: op || undefined })
      .then((res) => { setData(res.records || []); setTotal(res.total || 0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onSearch = () => { setPage(1); load(1, username, operation); };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username', width: 120 },
    { title: '操作', dataIndex: 'operation', width: 160 },
    { title: '方法', dataIndex: 'method', ellipsis: true },
    { title: 'IP', dataIndex: 'ip', width: 130 },
    { title: '时间', dataIndex: 'createTime', width: 170 },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input placeholder="用户名" value={username} onChange={e => setUsername(e.target.value)}
          onPressEnter={onSearch} style={{ width: 150 }} prefix={<SearchOutlined />} />
        <Input placeholder="操作类型" value={operation} onChange={e => setOperation(e.target.value)}
          onPressEnter={onSearch} style={{ width: 150 }} />
        <Select placeholder="快速筛选" allowClear style={{ width: 150 }}
          onChange={(v) => { setOperation(v || ''); setPage(1); load(1, username, v || ''); }}
          options={[
            { label: '创建智能体', value: '创建智能体' },
            { label: '更新智能体', value: '更新智能体' },
            { label: '删除智能体', value: '删除智能体' },
          ]} />
      </Space>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        pagination={{ current: page, total, pageSize: 20, onChange: (p) => { setPage(p); load(p); } }} />
    </div>
  );
}
