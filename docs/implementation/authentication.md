# 登录、注册、认证与权限实施记录

## 实施依据与计划（2026-11-16）

遵循 CLAUDE.md、设计 01 V1.8 / 02 V1.6（AD-16）/ 03 V1.4 / 04 V1.3 / 05 评审结论。保留用户新增的三入口和认证页面视觉结构。

1. 先添加真实 MySQL / Redis 集成测试，覆盖注册开户、登录/登出/会话恢复、CSRF、限流、停用/注销、双角色和客户归属边界；补前端表单与守卫测试，确认旧演示流程不满足契约。
2. 按业务域新增 auth 模块与 client 归属校验基础：MyBatis、事务开户、Argon2id 密码散列、追加审计、Session 持久化与轮换、Redis 登录失败限流。复用现有 schema.sql，不改已执行 SQL、不自动初始化业务数据库。
3. 收紧 Spring Security：区分匿名/登录用户/投资者/投顾/TA/内部工具；错误统一为设计中的 ProblemDetail。会话每次请求复查账号状态，停用或注销后不能继续使用旧会话。
4. 前端复用双端 auth UI：真实用户名/展示姓名/密码，注册角色取当前站点；注册成功不自动登录，投资者开户展示后端返回的演示余额。统一 API、内存会话状态、CSRF 头、受保护路由、安全站内回跳、角色不匹配提示和退出。
5. 修复多入口开发服务器在刷新 /login 和深链接时误回落用户端 HTML 的问题；验证三站点入口、真实前后端注册登录闭环、窄屏与键盘交互；执行 npm test / npm run build / mvn verify。

## 明确边界与实现选择

- 按 AD-16 保留本端登录，不自动跨站点跳转；错误角色显示无权限并允许退出后更换账号。注册角色由本端入口固定，服务端仍只接受 INVESTOR / ADVISOR 两值。
- 移除模拟短信验证码、任意密码延时登录和未接入的“保持登录”选项；契约只提供用户名口令认证，不扩展短信或密码重置接口。
- CSRF 以服务端 Session 绑定的 Token + X-CSRF-Token 实现，替换骨架的 X-XSRF-TOKEN cookie 方案；登录轮换 Session ID 与 CSRF，退出销毁会话。
- 本机不同端口的 Cookie 属于同一主机，浏览器按主机名共享、忽略端口，两产品端原本会互相覆盖 `JSESSIONID`。**开发期已在 Vite dev proxy 层做会话隔离**（`vite.config.ts` 的 `isolateSessionCookie`）：本端响应写出的会话 Cookie 加 `__<site>` 后缀（`:5173` → `JSESSIONID__investor`、`:5174` → `JSESSIONID__advisor`），转发回后端前还原原名并丢弃其他端会话 Cookie，因此在同一主机名（`localhost` / `127.0.0.1`）下两端可同时登录、互不覆盖，浏览器侧无感知。生产各站点使用独立主机名时 Cookie 天然按主机隔离，无需该改写。两产品端重新获取会话时严格验证角色，窗口恢复焦点和路由变化时复查。TA 不建立产品会话。
- 投资者注册在同一事务写 user/customer/cash_account/audit_log，默认演示现金 50000.00；投顾仅账号与审计，不创建风险画像或服务关系。
- 业务页仍为空页面，本批只提供认证/角色/客户归属防线，不实现资金交易、客户分配或 AI 业务。

## 验证结果

2026-11-16，本次实现已验证：

- `frontend`: `npm test -- --run`，7 文件、34 项通过；`npm run build` 通过，生成三份 HTML 入口。
- `web-ai-tougu`: `mvn verify` 通过，1 项单元测试 + 14 项集成测试，无跳过。Testcontainers 使用真实 MySQL 8 / Redis 7，覆盖注册事务回滚、两角色资源、注销用户名占用、64 位中文密码、会话与 CSRF 轮换、禁用账号、失败限流、MySQL 等价用户名、客户归属和编码 ID、TA 开关与内部令牌。另以真实 HTTP 验证可选 Redis Session 写入与 Cookie 属性。
- 前端回归覆盖安全回跳、字段错误、注册不自动登录、角色守卫、退出、会话恢复失败重试，以及旧 401 / 登录期间恢复 / 跨入口切换后的 CSRF 竞态。
- 按代码复核要求临时反转安全回跳条件，测试如期失败；恢复原文件后全套通过。
- 浏览器直连真实后端：用户端 / FA 端注册、开户结果、登录、深链接回跳、刷新恢复、错误角色停留本端、账户抽屉退出；TA 无认证请求及产品登录链接。
- FA 登录页在 320 / 768 / 1024 / 1440px 检查无横向溢出；用户名 Tab 到密码；Cookie 为 HttpOnly、SameSite=Lax（本机 HTTP 的 Secure=false）。截图位于 `frontend/output/playwright/auth-investor-desktop.png`、`auth-advisor-desktop.png`、`auth-advisor-mobile.png`。
- 独立复核发现的编码客户 ID 绕过、旧 CSRF、会话恢复并发覆盖问题均修复，并通过对应回归；最终只读复核未发现明确阻断项。

浏览器验收只使用独立库 `tougu_auth_validation_20261116`；既有 `tougu_platform` 当时尚无业务表，本次未写入或自动初始化该库。Testcontainers 使用一次性隔离数据库。日志、截图及构建输出为本地验收产物，不应提交。

本次结束时保留 8080 后端预览进程，连接上述独立验收库；三端既有开发服务器保持运行。该预览不属于部署，后续重启仍需按下节配置目标库。最终源码重新启动后，浏览器再次验证投资者登录成功。

## 三端演示入口与账号

以下账号于 2026-11-16 注册并完成登录验收，保存在独立验收库 `tougu_auth_validation_20261116`，用于本地演示。

| 入口 | 用户名 | 密码 | 说明 |
|---|---|---|---|
| [用户端](http://localhost:5173/login) | `acceptance_investor_1116` | `Acceptance1116!` | 展示姓名：验收投资者；开户初始演示资金 ¥50,000 |
| [FA 端](http://localhost:5174/login) | `acceptance_advisor_1116` | `Acceptance1116!` | 展示姓名：验收投顾；客户服务关系需另行分配 |
| [TA 端](http://localhost:5175/ta) | 无需登录 | — | 独立匿名演示入口；TA API 默认关闭，由 `TA_ENABLED` 控制 |

- 演示前按下节启动服务，并确保后端 `DB_URL` 指向上述验收库。这些账号不是自动初始化的种子账号，切换到其他数据库后不会自动存在。
- **双端可同时登录**：开发期 dev proxy 已按站点隔离会话 Cookie（见上节），直接用 `localhost:5173` 与 `localhost:5174` 分别登录投资者与投顾账号即可，互不覆盖、无需退出切换。
- TA 无需产品账号；本批业务页面仍为空页面，启用 TA API 开关不会补齐尚未实现的回执业务。

## 本地运行与配置

1. 启动 MySQL 和 Redis。按 `scripts/sql/schema.sql` 手工初始化目标库（先核对脚本库名与目标环境）；应用保持 `spring.sql.init.mode=never`。
2. 在启动后端的进程中设置 `DB_USERNAME`、`DB_PASSWORD`；非默认目标库设置完整 `DB_URL`（包含 `connectionTimeZone=UTC`）。根目录 `.env` 不会被 Spring Boot 自动读取。生产使用独立账号及 TLS 配置。
3. 在 `web-ai-tougu` 执行 `mvn spring-boot:run`；默认监听 8080。
4. 在 `frontend` 分别运行 `npm run dev`、`npm run dev:advisor`、`npm run dev:ta`，入口依次为 5173 / 5174 / 5175。API 同源 `/api/v1` 代理到 8080；三开发服务器各自使用依赖缓存，刷新本端深链接返回本端 HTML。
5. 生产三站点分别将 SPA 回退指向 `index.html` / `index.advisor.html` / `index.ta.html`，API 由同源反向代理承接；不要把 FA 深链接回退至用户端入口。

| 环境变量 | 默认值 | 作用 |
|---|---|---|
| `REGISTRATION_ENABLED` | `true` | 关闭时注册返回 404 |
| `INVESTOR_DEMO_CASH` | `50000.00` | 投资者开户演示现金 |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | `127.0.0.1` / `6379` / 空 | 登录限流始终依赖 Redis；不可用返回 `503 AUTH_SERVICE_UNAVAILABLE` |
| `LOGIN_MAX_FAILURES` / `LOGIN_LOCK_SECONDS` | `5` / `900` | 规范用户名 + 客户端 IP 失败锁定 |
| `SESSION_BACKEND` | `tomcat` | 可选 `redis`，共享 Session 使用 `fundpilot:sessions` 命名空间 |
| `SESSION_COOKIE_SECURE` | `false` | HTTPS 环境设为 `true`；会话默认空闲 30 分钟 |
| `TRUSTED_PROXY_PATTERN` | 不信任任何代理 | 部署代理时显式限定可信代理地址，避免伪造 IP 绕过限流 |
| `TA_ENABLED` | `false` | TA API 默认 404，页面保留独立匿名入口 |
| `AGENT_INTERNAL_TOKEN` | 空 | 内部工具独立令牌；空值拒绝所有内部工具调用 |

认证只提供投资者 / 投顾两角色、客户 ACTIVE 服务关系检查以及 TA / 内部工具边界；未新增管理员、权限配置或客户分配页面。后续业务 Controller 仍须使用方法权限与 `IClientAccessService.assertAssigned`，并确保用户资源由当前 Session 用户派生。

### 申购演示状态更新（2026-11-16）

同一验收库中的投资者已完成一笔真实演示申购 `T-20261116-001`（基金 `000311`，金额 ¥1,000，待登记确认）。当前现金余额 ¥50,000、冻结 ¥1,000、可用 ¥49,000；持仓尚未增加。默认 5173 用户端与 8080 后端已更新，可直接进入交易记录展示。流程、测试结果及截图见 [基金申购实施记录](fund-purchase.md)。后续继续申购会新增委托及冻结，不会自动 TA 成交。
