# AI中台 ↔ Dify 单点登录方案（91 Dify 1.13.3）

> **✅ 已于 2026-11-19 落地并全链路验证通过。** 生产改动：plaza WAR（commit 2849a7e，186 已部署）、前端 dist（侧栏走 SSO 入口，186 已部署）、Dify api 补丁镜像 `dify-api:c-api-1`（91 已上线，web 品牌定制镜像未动）。验证记录：admin ticket → passport 验票 → 自动开户 admin@plaza.wxut.edu.cn → 加入 shenhui's Workspace（editor）→ cookie 三件套 → /apps 200；ticket 重放被拒；xixi SSO 回归正常；login 接口回归 400 正常。回滚备份：186 `agent-plaza.war.bak-1119-pre-sso`；91 `~/dify-ssopatch/docker-compose.yaml.bak-*` 与 `.env.bak-*`。
> 原 3 个待确认项按默认落地：角色 editor（env `PLAZA_SSO_JOIN_ROLE` 可改）、邮箱域 plaza.wxut.edu.cn、目标工作区固定 361e8a69-…（env 可改）。

> 规划文档，尚未执行任何变更。（以下为落地前原文）
> 用户要求：AI中台登录后进入 Dify（https://aiagent.wxut.edu.cn/apps，域名 2026-11-09 已由信息中心配好；IP 入口 http://210.28.144.91/apps 仍可用）免登录；Dify 已有品牌定制（换 logo、去掉 Dify 文字标识），定制必须保留。

## 一、结论

**可行，且改动量比预想小。** 复用 AI中台已有的锡锡导员 ticket SSO 机制（`/sso/entry` 签发票据 → `/sso/validate` 共享密钥换用户名），Dify 侧只需在 API 加一个"验票 → 发登录 cookie → 302 到 /apps"的端点。**Dify web 前端零改动**（品牌定制镜像不用重建）。

## 二、现状调研（均为只读核实）

### AI中台侧（wxut-agent-pg-api）
- 已有 ticket SSO 机制（锡锡导员在用）：
  - `GET /api/v1/sso/entry?app=xixi`：被 CAS 过滤器保护，登录后签发**一次性票据（60 秒 TTL、消费即作废）**，302 到回调地址
  - `POST /api/v1/sso/validate`：锡锡后端带 `X-Sso-Secret` 共享密钥来换用户名
  - 回调地址按 app 参数从 `sso.callbacks` 配置 Map 读取
- CAS 用户自动开户：`authService.findOrCreateCasUser(uid, cn)` 已存在
- 侧栏"AI中台"菜单：直链 `http://210.28.144.91/apps`（未登录 Dify 时显示 Dify 自己的登录页）

### Dify 侧（91，1.13.3）
- **社区版无任何内置 SSO/OIDC/SAML**（企业版功能，.env.example 中无相关配置项）→ 必须改代码
- 登录机制：API 签发 TokenPair 后**写入 cookie**（access/refresh/csrf），web 全部 XHR 带 `withCredentials` → **服务端设 cookie 即完成登录，无需动前端**
- 关键内部 API（均在 `api/services/account_service.py`）：
  - `AccountService.login(account, ip_address)` → TokenPair（登录票据三件套）
  - `AccountService.create_account(email, name, ..., is_setup=True)` → 自动开户且跳过新手引导/注册开关
  - `TenantService.create_tenant_member(tenant, account, role=...)` → 加入现有工作区
  - `TenantService.create_owner_tenant_if_not_exist(account, is_setup=True)` → 自建工作区
- 免登录路由：不加 `@login_required` 装饰器的 console 路由天然开放（如 `/console/api/login`）
- nginx 代理：`/console/api` → api:5001，浏览器全程同源，无 CORS 问题
- 品牌定制在自建 web 镜像 `dify-web:c-web-4`；**api 用的是官方镜像**（本方案将首次引入 api 侧补丁）

## 三、方案设计（推荐：ticket 换 cookie）

```
浏览器                    AI中台后端(186)                Dify API(91)
  │ 点击侧栏"AI中台"          │                              │
  ├─ GET /sso/entry?app=dify ─►│                             │
  │      （无CAS会话则先CAS登录再回来，已有过滤器）              │
  │◄─ 302 + 一次性ticket ──────┤                              │
  ├─ GET 210.28.144.91/console/api/passport/sso-login?ticket=x ─►│
  │   （生产走 https://aiagent.wxut.edu.cn/console/api/passport/sso-login）
  │                            │   POST /sso/validate         │
  │                            │◄─（共享密钥+ticket换username）──┤
  │                            │                              ├─ 按email找/建账号(is_setup=True)
  │                            │                              ├─ 加入现有工作区(新用户)
  │                            │                              ├─ AccountService.login → TokenPair
  │◄─ Set-Cookie ×3 + 302 /apps ───────────────────────────────┤
  ├─ 打开 /apps 已登录，品牌定制原样生效                          │
```

要点：
1. 浏览器只接触一次性 ticket（60 秒、单次消费），**plaza JWT 全程不出现在 URL**；ticket→用户名的交换是 91→186 服务间调用，带共享密钥（常量时间比较，沿用现有 `X-Sso-Secret` 机制）
2. 用户名→邮箱映射：`{学号/工号}@plaza.wxut.edu.cn`（占位域名，仅作 Dify 账号唯一键，不发邮件）
3. 已有对应邮箱的 Dify 账号 → 直接登录；没有 → 自动开户（随机强密码，用户永远不需要知道，始终走 SSO）+ 加入现有工作区
4. Dify 自身登录页保留，作为兜底（管理员账号密码登录不受影响）

## 四、改动清单

### AI中台后端（wxut-agent-pg-api，常规发版）
| 文件 | 改动 |
|---|---|
| `SsoController.java` | `entry()` 增加 `app=dify` 分支：签发 ticket，302 到 `sso.callbacks.dify`；`redirectError()` 增加 dify 错误回跳 |
| `SsoController.java`（可选） | `/sso/validate` 返回体**追加** `name` 字段（CAS 的 cn 姓名），给 Dify 开户用显示名；对锡锡是新增字段，向后兼容 |
| `application-prod.yml` | `sso.callbacks.dify: https://aiagent.wxut.edu.cn/console/api/passport/sso-login` |
| `application.yml`（dev 同步） | 同上（域名走前置代理，本地调试需校园网环境） |

### AI中台前端（wxut-agent-pg，随下次发版）
| 位置 | 改动 |
|---|---|
| `Sidebar.jsx` | "AI中台"菜单 URL：已切 `https://aiagent.wxut.edu.cn/apps`（2026-11-09）；SSO 落地后改为 `/agent-plaza/api/v1/sso/entry?app=dify`（同源相对路径，IP/域名双入口通用） |

（可顺带完成之前搁置的"菜单链接可配置"：把该 URL 一起纳入 `menu.links` 配置）

### Dify 侧（91，补丁 + 重建 api 镜像）
| 项 | 内容 |
|---|---|
| 新增 `api/controllers/console/passport.py` | `GET /console/api/passport/sso-login?ticket=`：调 plaza validate → 找/建账号 → 加工作区 → `AccountService.login` → 设 cookie → 302 `/apps`；失败 302 到 `/signin`（保留 Dify 原登录页兜底） |
| 修改 `docker-compose.yaml` | api 服务镜像：`langgenius/dify-api:1.13.3` → `dify-api:c-api-1`（自建，源码在服务器上，与 web 定制同一套构建流程） |
| 新增环境变量 | `PLAZA_SSO_VALIDATE_URL=http://210.28.145.186:3001/agent-plaza/api/v1/sso/validate`、`PLAZA_SSO_SECRET=<共享密钥>`、`PLAZA_SSO_EMAIL_DOMAIN=plaza.wxut.edu.cn`、`PLAZA_SSO_JOIN_ROLE=normal`（加入工作区角色）、`PLAZA_SSO_TARGET_TENANT_ID=<现有工作区ID，空=自动取第一个>` |

### 不动的部分
- Dify web 镜像 `dify-web:c-web-4`：**零改动**，品牌定制（logo、去 Dify 标识）原样保留
- Dify 数据库：无 schema 变更，仅新增普通用户行
- 现有 Dify 账号、应用、知识库：不受影响

## 五、边界情况

| 场景 | 行为 |
|---|---|
| 未登录门户就点"AI中台" | 先被带去 CAS 登录 → 回来后自动完成整个 SSO（比现状更顺，现状是看到 Dify 登录页） |
| 用户在 Dify 已有会话 | 再次点击走 SSO → 刷新为最新身份，无感 |
| ticket 过期/重复使用 | Dify 302 到 `/signin`（Dify 自身登录页），可账号密码兜底 |
| plaza 用账号密码登录（无 CAS 会话）的用户 | 目前 `/sso/entry` 走 CAS 过滤器，此类用户会被要求过一次 CAS；如这类用户多，可后续把 `/sso/ticket`（JWT 换 ticket）从 admin-only 放开给所有登录用户，前端先取 ticket 再跳 Dify |
| 登出 | 门户登出不清 Dify cookie（Dify 会话独立保留）。单向 SSO，不做单点登出（SLO），如需要再单独规划 |
| 91→186 网络不通 | SSO 失败走 Dify 登录页兜底，不影响 Dify 本身运行 |

## 六、部署与回滚

1. 顺序：先发 Dify 侧（api 补丁镜像 + compose 切换 + 环境变量），验证 `/console/api/passport/sso-login` 可达（无 ticket 时应 302 到 /signin）；再发 plaza 后端（entry 分支 + 配置）；最后发前端（侧栏 URL）
2. 验证：门户登录 → 点"AI中台" → 直达 /apps 已登录、标题/logo 为定制版；二次点击无感；Dify 原账号密码登录仍可用；锡锡导员 SSO 回归验证（共用 validate，确认不受 name 字段影响）
3. 回滚：Dify 侧 compose 镜像行改回官方 tag 重启即回滚（数据无变更）；plaza 侧回滚 WAR；前端侧栏 URL 改回直链

## 七、与 Dify 升级计划的关系

本方案会给 api 侧引入第一个自建补丁。之前《dify-91-upgrade-plan.md》的升级流程需增加一步：**api 补丁与 web 品牌补丁一起重放到 1.18.0**（passport.py、compose 镜像行、SSO 环境变量）。SSO 先行落地的话，升级方案阶段 2 的补丁清单从"仅 web"扩为"web + api"。

## 八、待确认问题

1. **新用户加入现有工作区的角色**：`normal`（只能用已发布的应用，推荐）还是 `editor`（可自建应用）？或按 plaza 角色 mapping（admin→editor）？
2. 邮箱占位域名用 `plaza.wxut.edu.cn` 可以吗（仅作账号唯一键）？还是希望映射真实校园邮箱？
3. Dify 现有那个工作区（当前应用所在）确认就是 SSO 用户要进的目标工作区？
