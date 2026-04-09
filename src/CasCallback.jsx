import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, Result } from 'antd';
import { getUserInfo } from './api/userAuth';

export default function CasCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      return;
    }

    if (token) {
      localStorage.setItem('user_token', token);
      getUserInfo()
        .then(() => {
          navigate('/', { replace: true });
        })
        .catch(() => {
          localStorage.removeItem('user_token');
          navigate('/', { replace: true });
        });
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const hash = window.location.hash;
  const params = new URLSearchParams(hash.split('?')[1] || '');
  const error = params.get('error');

  if (error === 'auth_failed') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Result
          status="error"
          title="认证失败"
          subTitle="统一身份认证未通过，请重试"
          extra={<a href="#/">返回首页</a>}
        />
      </div>
    );
  }

  if (error === 'user_disabled') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Result
          status="warning"
          title="账号已禁用"
          subTitle="您的账号已被管理员禁用，请联系管理员"
          extra={<a href="#/">返回首页</a>}
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
