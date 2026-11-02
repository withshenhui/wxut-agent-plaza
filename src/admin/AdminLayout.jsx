import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, theme, Avatar, Dropdown } from 'antd';
import {
  DashboardOutlined,
  RobotOutlined,
  AppstoreOutlined,
  CloudServerOutlined,
  UserOutlined,
  SettingOutlined,
  FileOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAdmin } from './AdminContext';

const { Sider, Header, Content } = Layout;

const menuItems = [
  { key: '/admin/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/admin/agents', icon: <RobotOutlined />, label: '智能体管理' },
  { key: '/admin/categories', icon: <AppstoreOutlined />, label: '分类管理' },
  { key: '/admin/models', icon: <CloudServerOutlined />, label: '模型管理' },
  { key: '/admin/users', icon: <UserOutlined />, label: '用户管理' },
  { type: 'divider' },
  {
    key: 'settings', icon: <SettingOutlined />, label: '系统设置',
    children: [
      { key: '/admin/xixi', label: '锡锡导员管理' },
      { key: '/admin/llm-config', label: '大模型配置' },
      { key: '/admin/configs', label: '基础配置' },
    ],
  },
  { key: '/admin/files', icon: <FileOutlined />, label: '文件管理' },
  { key: '/admin/logs', icon: <FileTextOutlined />, label: '操作日志' },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAdmin();
  const { token: themeToken } = theme.useToken();

  // 根据当前路径自动展开所属父级（系统设置子菜单）
  const [openKeys, setOpenKeys] = useState(['settings']);

  const dropdownItems = [
    { key: 'home', icon: <DashboardOutlined />, label: '回到前台', onClick: () => { window.location.hash = '#/'; } },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true, onClick: logout },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} trigger={null}
        style={{ background: themeToken.colorBgContainer }}>
        <div style={{ height: 48, margin: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, fontSize: 16, color: themeToken.colorPrimary }}>
          <img src="/plaza/logo3.png" alt="logo" style={{ height: 36, width: 36, borderRadius: 4 }} />
          {!collapsed && <span>AI管理后台</span>}
        </div>
        <Menu mode="inline" selectedKeys={[location.pathname]} items={menuItems}
          openKeys={collapsed ? [] : openKeys}
          onOpenChange={(keys) => setOpenKeys(keys)}
          onClick={({ key }) => navigate(key)} />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: themeToken.colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${themeToken.colorBorderSecondary}` }}>
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)} />
          <Dropdown menu={{ items: dropdownItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{user?.nickname || user?.username || '管理员'}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
