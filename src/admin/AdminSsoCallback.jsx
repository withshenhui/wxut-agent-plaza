import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Result, Spin } from 'antd';
import { getUserInfo } from '../api/auth';

export default function AdminSsoCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const token = params.get('token');

    if (token) {
      localStorage.setItem('admin_token', token);
      getUserInfo()
        .then(() => navigate('/admin/dashboard', { replace: true }))
        .catch(() => {
          localStorage.removeItem('admin_token');
          navigate('/admin/login', { replace: true });
        });
    }
  }, [navigate]);

  const hash = window.location.hash;
  const params = new URLSearchParams(hash.split('?')[1] || '');
  const error = params.get('error');

  if (error === 'forbidden') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Result
          status="403"
          title="无管理后台权限"
          subTitle="该统一身份账号不是管理员，请联系管理员开通"
          extra={<a href="#/admin/login">返回登录</a>}
        />
      </div>
    );
  }

  if (error === 'user_disabled' || error === 'auth_failed') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Result
          status={error === 'user_disabled' ? 'warning' : 'error'}
          title={error === 'user_disabled' ? '账号已禁用' : '认证失败'}
          subTitle={error === 'user_disabled' ? '您的账号已被管理员禁用' : '统一身份认证未通过，请重试'}
          extra={<a href="#/admin/login">返回登录</a>}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spin size="large" tip="正在登录..." />
    </div>
  );
}
