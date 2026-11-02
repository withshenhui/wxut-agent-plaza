import React, { useCallback, useEffect, useState } from 'react';
import { Card, Space, Alert, Spin, Tooltip } from 'antd';
import { InfoCircleOutlined, ExportOutlined } from '@ant-design/icons';
import adminRequest from '../../api/request';

// 锡锡导员管理平台 SSO 跳板：携带一次性 ticket 直接跳转，
// 由锡锡后端服务端换票并 302 回其前端 #/sso-callback（全程不经过学校 CAS，无 Referer 限制）
const XIXI_SSO_LOGIN = 'http://210.28.144.49:8002/xiaozhi/user/sso-login';

export default function XixiManagePage() {
  const [jumpUrl, setJumpUrl] = useState('');
  const [ticketError, setTicketError] = useState(null);

  const loadAndJump = useCallback(async () => {
    setTicketError(null);
    try {
      const { ticket } = await adminRequest.post('/sso/ticket');
      const url = `${XIXI_SSO_LOGIN}?ticket=${encodeURIComponent(ticket)}`;
      setJumpUrl(url);
      // replace 跳转：不留本跳板页的历史记录，从锡锡返回时不会落回这里造成循环跳转
      window.location.replace(url);
    } catch (e) {
      setTicketError(e.message || '获取锡锡登录凭证失败');
    }
  }, []);

  useEffect(() => { loadAndJump(); }, [loadAndJump]);

  return (
    <Card
      size="small"
      title={
        <Space>
          <span>锡锡导员管理</span>
          <Tooltip
            title="自动登录并跳转到锡锡导员管理平台（210.28.144.49:8002），无需再次输入账号密码"
          >
            <InfoCircleOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />
          </Tooltip>
        </Space>
      }
      extra={
        jumpUrl ? (
          <a href={jumpUrl} target="_blank" rel="noreferrer">
            <ExportOutlined /> 在新窗口打开
          </a>
        ) : null
      }
    >
      {ticketError ? (
        <Alert
          type="error"
          showIcon
          message="自动登录失败"
          description={
            <Space direction="vertical" size={4}>
              <span>{ticketError}；请确认该账号已在锡锡平台开通。</span>
              <a onClick={loadAndJump}>重新获取凭证并跳转</a>
            </Space>
          }
        />
      ) : (
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: 'rgba(0,0,0,0.45)' }}>
            正在获取登录凭证并跳转到锡锡导员管理平台…
          </div>
          {jumpUrl && (
            <div style={{ marginTop: 12 }}>
              若未自动跳转，<a href={jumpUrl}>点击这里进入</a>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
