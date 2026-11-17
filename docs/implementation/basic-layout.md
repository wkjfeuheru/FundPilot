# 页面基本布局实施记录

## 范围与依据

2026-11-16：依据 `CLAUDE.md`、`docs/design/01~05` 全部设计文档及 `docs/prototype` 实现基础布局。用户明确要求各业务页面暂为空页面。

本次覆盖用户端 7 页、FA 端 8 页的共享壳层，以及三端入口、登录/注册占位、独立 TA 演示布局。页面仅保留标题与空白内容区域。保留 React 18、React Router 6、CSS 变量和 CSS Modules；不引入 UI/图标库。

> 口径更新（2026-11-16 第二批）：本批实施时为"单口 5173 承载三端"的旧形态，已按 Q5/AD-16 拆分为三站点（见文末实施记录），本文各节保留第一批历史记录，其中与拆分冲突的描述以实施记录为准。

## 实施计划

1. 先验证导航与具体页面落点、激活项、主题清理、抽屉关闭及焦点回收，确认现有骨架的缺项。
2. 以页面配置统一导航、面包屑与路由；页面文件按 `modes/investor`、`modes/advisor`、`modes/ta` 放置，共用空页面组件。
3. 还原品牌、侧边导航、AI 常驻入口、账户占位、顶栏、页脚与悬浮 AI 入口；246px 侧栏在 860px 折叠为 70px，590px 按原型缩为 59px，内容最大宽度 1600px。
4. 通知、账户、AI 抽屉仅提供容器与占位，支持遮罩/关闭按钮/ESC、焦点限制与回收、锁定背景滚动；不生成通知、账户或交易假数据。
5. 执行前端测试/构建、浏览器交互与响应式检查，并按工程要求尝试后端 `mvn verify`，记录实际结果。

## 本批边界

- 本批不接入认证、通知、业务日期、风险计数、AI 或交易 API。账户和业务日期使用明确占位，未接入数据时不展示红点计数。
- 登录/注册页第一批仅占位（第二批已按原型 React 化为演示模式页面，见文末实施记录）；产品域当前可直接预览布局，正式会话恢复与角色守卫需在认证批次统一实现，不伪造登录态。
- 无业务提交动作，不增加模拟操作、Toast 演示按钮或业务表单。
- TA 无产品导航、无 AI 入口，不管理产品主题。产品壳层离开时仅清理自己添加的主题 class。
- 保留已有工作区修改，不提交或恢复历史 Vue 文件。

## 验证结果

- 前端 `npm test -- --run`：3 个测试文件、9 项测试全部通过。新增用例先在旧骨架上失败，再在实现后通过；覆盖 15 项导航、激活态、深链接查询保留、主题清理、未知路由恢复、抽屉关闭和焦点回收。
- 前端 `npm run build`：TypeScript 严格检查与 Vite 生产构建通过；未新增依赖。
- 后端 `mvn verify`：BUILD SUCCESS；1 项单元测试、1 项 MySQL 8.0 Testcontainers 集成测试通过，0 失败、0 跳过。后端源码未改动。
- Playwright 实测用户端和 FA 端在 1440 / 1024 / 860 / 768 / 590 / 390 / 320px 下均无横向溢出；侧栏依断点分别为 246 / 70 / 59px。590px 以下顶栏分两行，保留当前页面、演示提示、通知和账户入口。
- 实测移动端 AI 抽屉宽度适配 320px；背景 inert、生效的 Tab 焦点限制、ESC 关闭及触发按钮焦点回收均通过。FA → 平台入口 → TA 导航后产品主题 class 清空，无产品侧栏与 AI 按钮。
- 内置浏览器因本地 browser-service 模块版本缺失无法初始化，改用独立 Playwright CLI 验证。首次发现 favicon 404，已补充本地品牌 SVG 图标并通过重新访问验证。
- 桌面用户端/FA 端、移动用户端/入口/抽屉截图保存在 `frontend/output/playwright/`。构建产物、依赖和浏览器临时记录仅用于本地验证，不纳入源码提交。
- 现有 AppShell 冒烟测试中的 MemoryRouter 仍打印 React Router v7 迁移提醒，不影响结果；应用 BrowserRouter 已显式启用相关 future flags。

## 预览

在 `frontend` 分别执行 `npm run dev`（用户端 :5173）、`npm run dev:advisor`（FA 端 :5174）、`npm run dev:ta`（TA 演示台 :5175）。5173/5174 首页即本端登录页，可直接访问 `/investor/overview`、`/advisor/overview` 预览布局；5175 首页直接进入 `/ta` 模拟台。

## 端口拆分与登录/注册入口实施记录（2026-11-16 第二批）

AD-16 改造已实施：

- **多入口**：`index.html`（investor）/ `index.advisor.html` / `index.ta.html` 三入口 + `main.tsx` / `main.advisor.tsx` / `main.ta.tsx` 三挂载点；`vite.config.ts` 按 `--mode` 映射端口（5173/5174/5175），dev 下 `/` rewrite 到本端入口，build 一次产出三份产物。`package.json` 脚本：`dev` / `dev:advisor` / `dev:ta`。新增 devDependency `@types/node`。
- **路由拆分**：`src/app/App.tsx` 与落地页 `EntryPage.tsx`（"选择您的工作空间"三卡片）移除；新增 `src/app/apps/ProductApp.tsx`（产品端共享站点应用，mode 参数化）+ `InvestorApp` / `AdvisorApp` / `TaApp`。站点内路由域不变；`/` 重定向到本端 `/login`；TA 站点 `/` 直接进 `/ta`。
- **登录/注册**：原占位 `AuthPage` 按原型 `auth/login.html`、`auth/register.html` + `auth.css` React 化——新增 `AuthShell.tsx`（左侧品牌视觉区，双端文案由 mode 固定）与 `RegisterPage.tsx`，`auth.css` 原样迁移至 `src/styles/auth.css`。表单校验、密码显隐、验证码倒计时、密码强度条、演示账号填充均还原；提交为演示模式，不调 `/auth` API、不建立会话，登录成功后进入本端 `/overview`。原型的手动角色切换器按站点固定角色移除。
- **验证**：`npm run build` 三入口产物通过；`npm run test -- --run` 15/15 通过（LayoutNavigation 改写为按站点断言、新增 AuthPages 5 项；原 advisor→TA 主题清理用例改为站点隔离断言）。
