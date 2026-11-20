import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, ConfigProvider, Dropdown } from 'antd';
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
  HomeOutlined,
  CommentOutlined,
  ApiOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useAdmin } from './AdminContext';
import './admin.css';

const { Sider, Header, Content } = Layout;

const menuItems = [
  { key: '/admin/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { type: 'group', label: '内容运营' },
  { key: '/admin/agents', icon: <RobotOutlined />, label: '智能体管理' },
  { key: '/admin/categories', icon: <AppstoreOutlined />, label: '分类管理' },
  { key: '/admin/models', icon: <CloudServerOutlined />, label: '模型管理' },
  { key: '/admin/users', icon: <UserOutlined />, label: '用户管理' },
  { type: 'group', label: '平台维护' },
  {
    key: 'settings', icon: <SettingOutlined />, label: '系统设置',
    children: [
      { key: '/admin/xixi', icon: <CommentOutlined />, label: '锡锡导员管理' },
      { key: '/admin/llm-config', icon: <ApiOutlined />, label: '大模型配置' },
      { key: '/admin/configs', icon: <ToolOutlined />, label: '基础配置' },
    ],
  },
  { key: '/admin/files', icon: <FileOutlined />, label: '文件管理' },
  { key: '/admin/logs', icon: <FileTextOutlined />, label: '操作日志' },
];

const PAGE_TITLES = {
  '/admin/dashboard': ['仪表盘', '平台运行与服务总览'],
  '/admin/agents': ['智能体管理', '上架、编辑与分类归属'],
  '/admin/categories': ['分类管理', '智能体广场的服务分类'],
  '/admin/models': ['模型管理', '接入的大模型与调度配置'],
  '/admin/users': ['用户管理', '平台账号与角色'],
  '/admin/xixi': ['锡锡导员管理', '学院数据查询智能体'],
  '/admin/llm-config': ['大模型配置', '模型服务通道与密钥'],
  '/admin/configs': ['基础配置', '站点信息与运行参数'],
  '/admin/files': ['文件管理', '广场素材与静态资源'],
  '/admin/logs': ['操作日志', '后台操作审计记录'],
};

// antd v6 主题令牌：与前台品牌蓝一致，全局统一圆角与密度
const adminTheme = {
  token: {
    colorPrimary: '#4A6CF7',
    colorInfo: '#4A6CF7',
    colorSuccess: '#12B76A',
    colorWarning: '#D97706',
    colorError: '#E5484D',
    borderRadius: 10,
    fontSize: 13.5,
    colorText: '#182234',
    colorTextSecondary: '#4A5568',
    colorBorder: '#D9DEEA',
    colorBorderSecondary: '#E6E9F2',
    colorBgLayout: '#F5F6FA',
  },
  components: {
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      itemSelectedBg: '#ECF0FF',
      itemSelectedColor: '#3B5AE6',
      itemHoverBg: '#F1F3FA',
      itemHeight: 40,
      itemMarginInline: 8,
      itemBorderRadius: 10,
      groupTitleFontSize: 10.5,
    },
    Table: { headerBg: '#F7F8FC', headerColor: '#4A5568', borderRadius: 14 },
    Card: { borderRadiusLG: 16 },
    Button: { borderRadius: 10, controlHeight: 34 },
  },
};

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAdmin();

  const [openKeys, setOpenKeys] = useState([]);

  const [title, sub] = PAGE_TITLES[location.pathname] || ['管理后台', ''];
  const nickname = user?.nickname || user?.username || '管理员';

  const dropdownItems = [
    { key: 'home', icon: <HomeOutlined />, label: '回到前台', onClick: () => { window.location.hash = '#/'; } },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true, onClick: logout },
  ];

  return (
    <ConfigProvider theme={adminTheme}>
      <Layout style={{ minHeight: '100vh' }} className="admin-scope">
        <Sider
          width={230} collapsedWidth={72} collapsible collapsed={collapsed} trigger={null}
          className={`adm-sider${collapsed ? ' adm-sider-collapsed' : ''}`}
        >
          <div className="adm-brand">
            <img src="/plaza/logo3.png" alt="logo" />
            {!collapsed && (
              <div>
                <div className="bt">AI 管理后台</div>
                <div className="be">WOPLUS ADMIN</div>
              </div>
            )}
          </div>
          <div style={{ overflowY: 'auto', overflowX: 'hidden' }}>
            <Menu
              mode="inline" selectedKeys={[location.pathname]} items={menuItems}
              openKeys={collapsed ? [] : openKeys}
              onOpenChange={(keys) => setOpenKeys(keys)}
              onClick={({ key }) => navigate(key)}
              inlineCollapsed={collapsed}
            />
            <div className="adm-side-foot" style={{ display: collapsed ? 'none' : 'block' }}>
              <div className="adm-side-user">
                <span className="av">{nickname[0]}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="n">{nickname}</div>
                  <div className="r">平台管理员</div>
                </div>
              </div>
            </div>
          </div>
        </Sider>
        <Layout>
          <Header className="adm-header">
            <button
              className="adm-ghost-btn" style={{ width: 34, height: 34, padding: 0, justifyContent: 'center' }}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
            <div>
              <div className="ttl">{title}</div>
              {sub && <div className="crumb">{sub}</div>}
            </div>
            <span className="sp" />
            <button className="adm-ghost-btn" onClick={() => { window.location.hash = '#/'; }}>
              <HomeOutlined style={{ fontSize: 13 }} />回到前台
            </button>
            <Dropdown menu={{ items: dropdownItems }} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1px solid var(--aline)', borderRadius: 12, padding: '4px 12px 4px 4px' }}>
                <span className="av" style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#4A6CF7,#6B8AFF)', color: '#fff', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{nickname[0]}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--aink)' }}>{nickname}</span>
              </div>
            </Dropdown>
          </Header>
          <Content>
            <div className="adm-page">
              <Outlet />
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
