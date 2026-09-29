import React, { useCallback, useEffect, useState } from 'react';
import { Card, Space, Button, Tooltip, Alert } from 'antd';
import { ReloadOutlined, ExportOutlined, InfoCircleOutlined } from '@ant-design/icons';
import adminRequest from '../../api/request';

// 锡锡导员管理平台 SSO 跳板：携带一次性 ticket 由锡锡后端换取登录态后自动进入首页
const XIXI_SSO_LOGIN = 'http://210.28.144.49:8002/xiaozhi/user/sso-login';

export default function XixiManagePage() {
  const [frameSrc, setFrameSrc] = useState('');
  const [ticketError, setTicketError] = useState(null);

  const loadWithTicket = useCallback(async () => {
    setTicketError(null);
    try {
      const { ticket } = await adminRequest.post('/sso/ticket');
      setFrameSrc(`${XIXI_SSO_LOGIN}?ticket=${encodeURIComponent(ticket)}`);
    } catch (e) {
      setTicketError(e.message || '获取锡锡登录凭证失败');
    }
  }, []);

  useEffect(() => { loadWithTicket(); }, [loadWithTicket]);

  const openInNewWindow = async () => {
    try {
      const { ticket } = await adminRequest.post('/sso/ticket');
      window.open(`${XIXI_SSO_LOGIN}?ticket=${encodeURIComponent(ticket)}`, '_blank');
    } catch (e) {
      setTicketError(e.message || '获取锡锡登录凭证失败');
    }
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <span>锡锡导员管理</span>
          <Tooltip title="通过统一身份认证自动登录后内嵌展示；如无法加载可点击「在新窗口打开」">
            <InfoCircleOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />
          </Tooltip>
        </Space>
      }
      extra={
        <Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={loadWithTicket}>
            刷新
          </Button>
          <Button size="small" type="primary" icon={<ExportOutlined />} onClick={openInNewWindow}>
            在新窗口打开
          </Button>
        </Space>
      }
    >
      {ticketError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message="自动登录失败"
          description={`${ticketError}；请确认该账号已在锡锡平台开通，然后点击「刷新」重试。`}
        />
      )}
      {frameSrc && (
        <iframe
          title="锡锡导员管理"
          src={frameSrc}
          style={{ width: '100%', height: 'calc(100vh - 200px)', border: '1px solid #f0f0f0', borderRadius: 6 }}
        />
      )}
    </Card>
  );
}
