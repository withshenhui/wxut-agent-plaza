import { apiBase } from '../../api/request';
import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAdmin } from '../AdminContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

// 登录页插画：与前台首页横幅同源的吉祥物形象（生产部署于后端静态目录 /plaza/）
const LoginIllustration = () => (
  <div style={{ animation: 'robotFloat 3s ease-in-out infinite' }}>
    <img
      src="/plaza/avatar.png"
      alt="AI 助手"
      style={{ width: 240, height: 240, objectFit: 'contain', display: 'block' }}
      onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />
  </div>
);

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAdmin();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('登录成功');
      navigate('/admin/dashboard');
    } catch (err) {
      message.error(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #eef2ff 0%, #dbeafe 30%, #e0f2fe 60%, #f0f5ff 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 装饰元素 */}
      <div style={{
        position: 'absolute', top: -80, right: -80, width: 320, height: 320,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(24,144,255,0.08) 0%, transparent 70%)',
      }} />
      <div style={{
        position: 'absolute', bottom: -60, left: -60, width: 260, height: 260,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(82,196,26,0.06) 0%, transparent 70%)',
      }} />
      {/* 网格线 */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(24,144,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(24,144,255,0.04) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }} />

      {/* 中间内容区 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 200,
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 900, margin: '0 auto',
      }}>
        {/* 插画区 */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <LoginIllustration />
          <Text style={{ color: '#667', fontSize: 15, maxWidth: 300, textAlign: 'center', lineHeight: 1.8, marginTop: 24 }}>
            无锡职业技术大学 AI 管理平台<br />
            管理智能体、模型、用户与系统配置
          </Text>
        </div>

        {/* 登录卡片 */}
        <Card style={{
          width: 380, flexShrink: 0,
          border: 'none',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(24,144,255,0.1), 0 1px 4px rgba(0,0,0,0.06)',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Title level={3} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#1a1a3e', marginBottom: 4 }}>
              <img src="/plaza/logo3.png" alt="logo" style={{ height: 52, width: 52, borderRadius: 4 }} />
              AI管理后台
            </Title>
          </div>
          <Form onFinish={onFinish} size="large">
            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input prefix={<UserOutlined />} placeholder="用户名" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>登录</Button>
            </Form.Item>
            <Form.Item style={{ marginBottom: 8 }}>
              <Button
                block
                onClick={() => {
                  window.location.href = `${apiBase}/sso/entry?app=plaza-admin`;
                }}
              >
                统一身份认证登录
              </Button>
            </Form.Item>
            <div style={{ textAlign: 'center' }}>
              <a href="#/">返回前台首页</a>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
}
