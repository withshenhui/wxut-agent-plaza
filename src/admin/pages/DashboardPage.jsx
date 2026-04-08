import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { RobotOutlined, AppstoreOutlined, CloudServerOutlined, UserOutlined } from '@ant-design/icons';
import adminRequest from '../../api/request';

export default function DashboardPage() {
  const [stats, setStats] = useState({ agents: 0, categories: 0, models: 0, users: 0 });

  useEffect(() => {
    Promise.all([
      adminRequest.get('/agents', { params: { size: 1 } }).catch(() => ({ total: 0 })),
      adminRequest.get('/categories').catch(() => []),
      adminRequest.get('/models', { params: { size: 1 } }).catch(() => ({ total: 0 })),
      adminRequest.get('/users', { params: { size: 1 } }).catch(() => ({ total: 0 })),
    ]).then(([agents, categories, models, users]) => {
      setStats({
        agents: agents.total || 0,
        categories: (categories || []).length,
        models: models.total || 0,
        users: users.total || 0,
      });
    });
  }, []);

  const items = [
    { title: '智能体总数', value: stats.agents, icon: <RobotOutlined />, color: '#1890ff' },
    { title: '分类总数', value: stats.categories, icon: <AppstoreOutlined />, color: '#52c41a' },
    { title: '模型总数', value: stats.models, icon: <CloudServerOutlined />, color: '#722ed1' },
    { title: '用户总数', value: stats.users, icon: <UserOutlined />, color: '#fa8c16' },
  ];

  return (
    <Row gutter={[16, 16]}>
      {items.map((item) => (
        <Col xs={24} sm={12} lg={6} key={item.title}>
          <Card>
            <Statistic title={item.title} value={item.value}
              prefix={<span style={{ color: item.color }}>{item.icon}</span>} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
