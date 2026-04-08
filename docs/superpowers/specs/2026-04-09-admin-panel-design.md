# Admin Panel Design Spec

## Overview

在 wxut-agent-plaza 前端项目中新增后台管理模块，路由前缀 `/admin`，使用 Ant Design 组件库，对接已有的 Spring Boot 后端 API。

## Tech Stack

- **UI**: Ant Design 5.x (antd)
- **路由**: React Router，`/admin/*` 路由组
- **状态**: React Context 管理 token 和用户信息
- **HTTP**: axios（已有依赖）
- **图标**: @ant-design/icons

## Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/admin/login` | LoginPage | 管理员登录（调用 `POST /api/v1/auth/login`） |
| `/admin` | AdminLayout | 管理后台布局壳（侧边栏 + 内容区） |
| `/admin/dashboard` | DashboardPage | 数据概览（智能体数、用户数、访问量统计） |
| `/admin/agents` | AgentManagePage | 智能体管理：表格列表 + 搜索 + 新增/编辑弹窗 |
| `/admin/categories` | CategoryManagePage | 分类管理：表格列表 + 新增/编辑弹窗 |
| `/admin/models` | ModelManagePage | 模型管理：表格列表 + 搜索 + 新增/编辑弹窗 |
| `/admin/users` | UserManagePage | 用户管理：表格列表 + 状态切换 + 重置密码 |
| `/admin/configs` | ConfigManagePage | 系统配置：键值对列表 + 行内编辑 |
| `/admin/files` | FileManagePage | 文件管理：上传 + 列表 + 删除 |
| `/admin/logs` | LogManagePage | 操作日志：只读表格 + 筛选 |

## File Structure

```
src/
├── admin/                       # 管理后台模块
│   ├── AdminLayout.jsx          # 管理后台布局（Sider + Header + Content）
│   ├── AdminGuard.jsx           # 路由守卫（未登录跳转登录页）
│   ├── AdminContext.jsx         # Context: token, userInfo, login/logout
│   ├── pages/
│   │   ├── LoginPage.jsx        # 登录页
│   │   ├── DashboardPage.jsx    # 仪表盘
│   │   ├── AgentManagePage.jsx  # 智能体管理
│   │   ├── CategoryManagePage.jsx # 分类管理
│   │   ├── ModelManagePage.jsx  # 模型管理
│   │   ├── UserManagePage.jsx   # 用户管理
│   │   ├── ConfigManagePage.jsx # 系统配置
│   │   ├── FileManagePage.jsx   # 文件管理
│   │   └── LogManagePage.jsx    # 操作日志
├── api/                         # API 调用（已有 agent.js，需新增）
│   ├── agent.js                 # 已有
│   ├── category.js              # 新增
│   ├── model.js                 # 新增
│   ├── user.js                  # 新增
│   ├── config.js                # 新增
│   ├── file.js                  # 新增
│   ├── log.js                   # 新增
│   └── auth.js                  # 新增（登录、获取用户信息）
```

## Authentication Flow

1. 用户访问 `/admin/*`，AdminGuard 检查 localStorage 中是否有 token
2. 无 token → 重定向到 `/admin/login`
3. 登录成功 → 存 token 到 localStorage，存 userInfo 到 Context
4. 所有管理端 API 请求携带 `Authorization: Bearer <token>` header
5. 401 响应 → 清除 token，跳转登录页

## API Integration

所有管理端 API 调用复用同一个 axios 实例，自动携带 token：

```javascript
// src/api/request.js
const adminRequest = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

adminRequest.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminRequest.interceptors.response.use(
  (res) => {
    const { code, message, data } = res.data;
    if (code === 200) return data;
    return Promise.reject(new Error(message));
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.hash = '#/admin/login';
    }
    return Promise.reject(err);
  },
);
```

## Page Details

### LoginPage
- 表单字段：用户名、密码
- 登录成功后跳转 `/admin/dashboard`
- 使用 Ant Design Form + Input + Button

### DashboardPage
- 统计卡片：智能体总数、分类数、模型总数、用户总数
- 使用 Ant Design Statistic + Card + Row/Col

### AgentManagePage
- 表格列：ID、图标、名称、分类、描述、推荐、排序、状态、操作
- 搜索：关键词 + 分类筛选
- 新增/编辑弹窗（Modal + Form）：名称、图标、分类（Select）、描述、详情、外部链接、标签（动态添加）、推荐、排序、状态
- 删除确认（Popconfirm）
- 分页（Pagination）

### CategoryManagePage
- 表格列：ID、Key、标签、描述、图标、排序、状态、操作
- 新增/编辑弹窗：categoryKey、label、description、icon、sortOrder、status
- 删除确认

### ModelManagePage
- 表格列：ID、图标、名称、提供商、类型、分类、状态、操作
- 搜索：关键词 + 分类筛选
- 新增/编辑弹窗：名称、提供商、类型、描述、分类、API文档地址、体验地址、图标地址、标签、状态
- 删除确认 + 分页

### UserManagePage
- 表格列：ID、用户名、昵称、邮箱、手机、角色、状态、创建时间、操作
- 操作：编辑（弹窗修改昵称/邮箱/手机/角色）、切换状态（Switch）、重置密码
- 搜索：关键词 + 状态筛选

### ConfigManagePage
- 表格列：Key、Value、描述、操作
- 行内编辑或弹窗编辑 Value

### FileManagePage
- 上传区域（Upload）
- 文件列表表格：ID、原始文件名、大小、类型、上传时间、操作（下载/删除）

### LogManagePage
- 表格列：ID、用户名、操作、方法、IP、时间
- 筛选：用户名 + 操作类型
- 只读，不可编辑

## Dependencies to Install

```bash
npm install antd @ant-design/icons
```

## Integration with Existing App

在 App.jsx 的 Router 中添加 admin 路由组：

```jsx
<Route path="/admin/*" element={<AdminRoutes />} />
```

AdminRoutes 内部嵌套 AdminLayout + AdminGuard + 各管理页面。

前台页面不受影响，管理入口可通过 Sidebar 中的"管理后台"链接或直接访问 `#/admin`。
