# Dify 升级方案（91 服务器：1.13.3 → 1.18.0）

> 规划文档，尚未执行任何变更。硬约束：**升级后现有数据和配置完全不变，且全程可回滚。**

## 一、现状盘点（已核实，均为只读检查）

| 项 | 现状 |
|---|---|
| AI中台的 Dify 链接 | 侧栏"AI中台"菜单 → `http://210.28.144.91/apps`（Dify 自带 nginx，宿主机 80 端口） |
| 部署方式 | docker compose，位于 `/app/chat/dify-1.13.3/docker`；历史升级沿用"一版本一目录"（1.2.0 → 1.3.0 → 1.13.3，旧镜像都还在） |
| 运行版本 | dify-api 1.13.3、**自建 web 镜像 dify-web:c-web-4**、plugin-daemon 0.5.3-local、sandbox 0.2.14、weaviate 1.27.0、postgres 15-alpine、redis 6-alpine |
| 数据存储 | **bind mount（非命名卷）**：`./volumes/db/data`（PG）、`./volumes/weaviate`、`./volumes/plugin_daemon`（插件） |
| 配置现状（关键） | `.env` 仅 17 字节（只有 `TZ=Asia/Shanghai`），所有密钥/密码全部走 compose 文件里的默认值 |
| web 定制 | 品牌定制构建于 2026-04-13：标题"AI中台"、logo、favicon、zh-Hans 文案（app/common/login.json）、dify-logo 组件 |
| compose 本地改动 | 与官方 1.13.3 仅 **2 处** diff：web 服务换自建镜像 + privileged；weaviate 的 profiles 注释掉（默认启动） |
| 资源 | 磁盘空闲 324G；内存 31G 已用 21G（偏紧） |
| 门户嵌入页 | DifyChatPage（`/dify/v1`）在 186 的 nginx 上无对应代理，当前未走通；实际入口只有侧栏链接 |

## 二、升级目标

- 目标版本 **1.18.0**（2026-10-23 发布的最新稳定版，当前落后 5 个 minor 版本）
- 不变项：应用/工作流/知识库/对话记录/用户账号、模型供应商配置与凭据、API key、品牌定制、访问地址 `http://210.28.144.91/apps`

## 三、版本差异与风险清单

| 项 | 1.13.3（现） | 1.18.0（目标） | 风险与对策 |
|---|---|---|---|
| SECRET_KEY 等密钥 | .env 未设，走 compose 默认值 | .env.example 留空，**必须显式填写** | 升级前从运行容器 `docker inspect` 提取全部生效值，显式写入新 .env。⚠️ SECRET_KEY 若不一致，所有已配置的模型凭据将无法解密（直接违反"配置不变"） |
| web 镜像 | dify-web:c-web-4（品牌定制） | 官方镜像无定制 | 先将当前定制源码与官方 1.13.3 做 diff 生成补丁清单，重放到 1.18.0 源码，重建 `dify-web:c-web-5` |
| weaviate | 1.27.0 | 1.39.13，且镜像仓库迁至 `cr.weaviate.io` | 跨度较大：数据先完整备份再升级；新仓库国内可能拉取失败，需提前配加速/代理；若实测不兼容可先钉住 1.27.0 |
| plugin-daemon | 0.5.3-local | 0.6.10-local | 插件存储是 bind mount，随数据一起迁移；升级后核对插件清单 |
| sandbox | 0.2.14 | 0.2.15 | 低风险 |
| postgres / redis | 15-alpine / 6-alpine | 版本不变 | 无风险 |
| DB schema | — | 跨 5 个 minor 的自动迁移 | 迁移只跑在**数据副本**上，原目录数据不动，失败即回滚 |
| 新增服务 | — | api_websocket、knowledge_fs 系列、local_sandbox、init_permissions、worker_knowledge_fs_upgrade（一次性迁移任务） | 内存偏紧：切换时先停旧栈再起新栈；knowledge_fs 升级任务耗时需预留 |

## 四、执行步骤（六阶段）

### 阶段 0　盘点补测（只读，不影响运行）
1. `du -sh` 各 volumes 子目录，估算备份耗时与新目录磁盘占用
2. `docker inspect` 导出所有容器生效环境变量 → 汇总成"配置基线"（SECRET_KEY、DB/Redis 密码、PLUGIN_DAEMON_KEY 等）
3. 统计业务数据量：应用数、知识库数、用户数、对话量（PG 查询）
4. 确认 Dify nginx 暴露端口（应为 80）及 91 上是否有其他服务依赖该端口

### 阶段 1　全量备份（停机窗口开始）
1. `pg_dump` 先做一份运行中的热备
2. `docker compose down`（bind mount 数据不受影响）
3. 打包整个 `/app/chat/dify-1.13.3`（含 volumes、.env、compose、web 定制源码）→ `dify-1.13.3-full-backup-YYYYMMDD.tar.gz`
4. `docker save dify-web:c-web-4` 备份定制镜像（品牌资产，丢了要重做）

### 阶段 2　准备 1.18.0
1. 新建 `/app/chat/dify-1.18.0`（沿用一版本一目录惯例）
2. 提前拉取 1.18.0 全部镜像（重点处理 cr.weaviate.io 的国内连通性）
3. web 品牌补丁重放到 1.18.0 源码 → 构建 `dify-web:c-web-5`
   - 定制内容（2026-04-13，c-web-4）：标题"AI中台"、logo.png、favicon.ico、dify-logo 组件、zh-Hans 文案（app/common/login.json）
   - 若 SSO 方案（见 dify-91-sso-plan.md）已先行落地：api 侧补丁（passport.py + SSO 环境变量 + compose 镜像行）需一并重放，并重建 `dify-api:c-api-2`
4. 移植 2 处 compose 改动（web 镜像 + privileged；weaviate profile）
5. 用阶段 0 的配置基线**显式生成新 .env**（把原来所有"默认值"钉死写进去，保证配置不变）

### 阶段 3　数据迁移
1. 复制 volumes（db/data、weaviate、plugin_daemon、redis 等）到新目录——**原目录保持原样，这是回滚底线**
2. 起新栈：`MIGRATION_ENABLED=true` 自动执行 1.13.3 → 1.18.0 的数据库迁移
3. 跑 `worker_knowledge_fs_upgrade` 一次性任务（知识库文件系统迁移）
4. 盯迁移日志直至全部容器 healthy

### 阶段 4　验证（"数据与配置不变"逐项核查）
1. 原账号密码登录成功（用户数据未变）
2. 应用清单逐一对账（数量、名称）；抽查 1–2 个应用跑通对话/工作流
3. 知识库数量对账 + 抽查一次检索命中
4. 模型供应商列表与凭据可用（= SECRET_KEY 保持一致的最直接证据）
5. 访问地址不变：`http://210.28.144.91/apps` 直达，门户侧栏零改动
6. 品牌定制生效：标题"AI中台"、logo、favicon
7. 插件清单对账

### 阶段 5　切换与收尾
- 验证通过 → 旧目录原样保留（建议至少 2 周）再归档；新目录成为生产
- **回滚预案（任一环节失败触发）**：`down` 新栈 → 原目录 `docker compose up`。数据在原 bind mount 从未被写过，预计 2 分钟内完全恢复

## 五、停机窗口

- 预计 **30–60 分钟**（大头是备份打包和 DB 迁移，阶段 0 核完数据量后给出更准确估算）
- 建议晚间低峰执行

## 六、待确认问题

1. 停机窗口选什么时间？
2. 这个 Dify 除了 AI中台侧栏入口，还有谁在用（老师/学生/其他系统嵌入）？决定要不要提前通知
3. 品牌定制按原样重放（标题/图标/文案不变）——确认即可
