import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAdmin } from '../AdminContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

// 智能体 SVG 插画（带动画）
const RobotIllustration = () => (
  <div style={{ animation: 'robotFloat 3s ease-in-out infinite' }}>
    <svg width="180" height="180" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 身体光晕 */}
      <circle cx="100" cy="100" r="80" fill="url(#glow)" opacity="0.3">
        <animate attributeName="r" values="78;82;78" dur="3s" repeatCount="indefinite" />
      </circle>
      {/* 头部 */}
      <circle cx="100" cy="90" r="50" fill="#E8F4FD" stroke="#1890FF" strokeWidth="2"/>
      {/* 左眼 */}
      <rect x="75" y="72" width="20" height="16" rx="4" fill="#1890FF" opacity="0.8">
        <animate attributeName="height" values="16;2;16" dur="4s" begin="0s" repeatCount="indefinite" />
      </rect>
      {/* 右眼 */}
      <rect x="105" y="72" width="20" height="16" rx="4" fill="#1890FF" opacity="0.8">
        <animate attributeName="height" values="16;2;16" dur="4s" begin="0.1s" repeatCount="indefinite" />
      </rect>
      <circle cx="85" cy="80" r="4" fill="white"/>
      <circle cx="115" cy="80" r="4" fill="white"/>
      {/* 嘴巴 */}
      <path d="M88 100 Q100 110 112 100" stroke="#1890FF" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <animate attributeName="d" values="M88 100 Q100 110 112 100;M88 100 Q100 100 112 100;M88 100 Q100 110 112 100" dur="3s" repeatCount="indefinite" />
      </path>
      {/* 天线 */}
      <line x1="100" y1="40" x2="100" y2="28" stroke="#1890FF" strokeWidth="2"/>
      <circle cx="100" cy="24" r="5" fill="#52C41A">
        <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* 身体 */}
      <rect x="60" y="105" width="80" height="40" rx="12" fill="#E8F4FD" stroke="#1890FF" strokeWidth="2"/>
      {/* 身体按钮 */}
      <circle cx="85" cy="120" r="4" fill="#1890FF" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" begin="0s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="120" r="4" fill="#1890FF" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" begin="0.3s" repeatCount="indefinite" />
      </circle>
      <circle cx="115" cy="120" r="4" fill="#1890FF" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" begin="0.6s" repeatCount="indefinite" />
      </circle>
      {/* 左手 */}
      <line x1="60" y1="115" x2="42" y2="108" stroke="#1890FF" strokeWidth="2" strokeLinecap="round">
        <animate attributeName="y2" values="108;100;108" dur="2s" repeatCount="indefinite" />
      </line>
      <circle cx="38" cy="106" r="5" fill="#E8F4FD" stroke="#1890FF" strokeWidth="1.5">
        <animate attributeName="cy" values="106;98;106" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* 右手 */}
      <line x1="140" y1="115" x2="158" y2="108" stroke="#1890FF" strokeWidth="2" strokeLinecap="round">
        <animate attributeName="y2" values="108;100;108" dur="2s" begin="0.5s" repeatCount="indefinite" />
      </line>
      <circle cx="162" cy="106" r="5" fill="#E8F4FD" stroke="#1890FF" strokeWidth="1.5">
        <animate attributeName="cy" values="106;98;106" dur="2s" begin="0.5s" repeatCount="indefinite" />
      </circle>
      {/* 腿 */}
      <line x1="75" y1="145" x2="70" y2="170" stroke="#1890FF" strokeWidth="2" strokeLinecap="round"/>
      <line x1="125" y1="145" x2="130" y2="170" stroke="#1890FF" strokeWidth="2" strokeLinecap="round"/>
      <ellipse cx="100" cy="178" rx="45" ry="6" fill="#1890FF" opacity="0.08"/>
      <defs>
        <radialGradient id="glow">
          <stop offset="0%" stopColor="#1890FF" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#1890FF" stopOpacity="0"/>
        </radialGradient>
      </defs>
    </svg>
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
          <RobotIllustration />
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
              <img src="http://210.28.145.186:3001/plaza/logo3.png" alt="logo" style={{ height: 52, width: 52, borderRadius: 4 }} />
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
            <div style={{ textAlign: 'center' }}>
              <a href="#/">返回前台首页</a>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
}
