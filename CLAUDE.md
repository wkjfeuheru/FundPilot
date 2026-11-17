# CLAUDE.md — 项目开发规范

> 适用范围：`web-ai-tougu` 后端模块、`frontend` 前端模块；AI Agent（`web-ai-agent`）规范另行编写。

## 技术栈

- Java: 21（LTS 版本，强制）
- Spring Boot: 4.0.x
- 数据库: MySQL 8.0（服务端基线）
- 构建工具: Maven（在 `web-ai-tougu` 目录执行 mvn）
- 测试框架: JUnit Jupiter 6 + Testcontainers（由 Spring Boot 4.0.9 BOM 管理；集成测试禁止使用 H2）

## 架构规范

### 分层结构

web-ai-tougu/src/main/java/com/jason/
├── controller/     # REST 端点，只做参数校验和调用 service
├── service/        # 业务逻辑，接口以 I 前缀命名
├── mapper/         # 数据访问，MyBatis Mapper 接口，XML 放在 resources/mapper/
├── model/          # 实体类，与数据库表结构对应
├── dto/            # 请求/响应 DTO，不要把 Entity 直接暴露给 API
├── config/         # Spring 配置类
└── exception/      # 自定义异常 + 全局异常处理

### 命名规范

- 包命名：com.jason.模块名.层级
- 类命名：大驼峰，Service 接口加 I 前缀（如 IUserService）
- 方法命名：小驼峰，动词开头（如 getUserById、createOrder）
- 常量命名：全大写下划线分隔（如 MAX_RETRY_COUNT）

## 代码规范

### Controller 层

- 使用 @RestController + @RequestMapping
- 成功响应统一返回 ResponseEntity<ResponseDTO<T>>
- 参数校验使用 @Valid，不要在 controller 里写 if 判断
- 错误响应直接使用 ProblemDetail（Spring Boot 4.x 内置，RFC 7807 标准），不要再用 ResponseDTO 包裹
- URL 路径使用名词复数：/users 而不是 /getUsers

正确写法：
@PostMapping("/users")
public ResponseEntity<ResponseDTO<UserDTO>> createUser(
    @Valid @RequestBody CreateUserRequest request) {
    return ResponseEntity.ok(ResponseDTO.success(userService.createUser(request)));
}

禁止写法：
@PostMapping("/users")
public UserDTO createUser(@RequestBody CreateUserRequest request) {
    if (request.getName() == null) {
        throw new RuntimeException("name is null");
    }
    return userService.createUser(request);
}

### Service 层

- 使用构造器注入，不要用 @Autowired 字段注入
- 事务注解 @Transactional 只加在 Service 实现类上，不要加在接口上
- 跨服务调用不要嵌套 @Transactional，容易出事务穿透问题

正确写法：
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements IUserService {
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
}

禁止写法：
@Service
public class UserServiceImpl implements IUserService {
    @Autowired
    private UserMapper userMapper;
}

### Mapper 层（MyBatis 规范）

- Mapper 接口使用 @Mapper 注解，XML 文件放在 src/main/resources/mapper/ 下
- 禁止在循环里调用 mapper 方法（N+1 问题），批量操作使用 <foreach> 批量查询
- 分页查询使用手动 SQL 分页（LIMIT + OFFSET）；当前未引入 PageHelper
- 复杂查询写在 XML 中，简单查询可使用注解（@Select/@Insert/@Update/@Delete）
- 查询结果使用 DTO 或 Map 承载，禁止直接返回 Entity 给 API 层
- XML 中 SQL 关键字大写，参数使用 #{} 防止 SQL 注入，动态表名/列名才用 ${}

正确写法：
@Mapper
public interface UserMapper {
    List<UserDTO> selectUserDTOById(@Param("id") Long id);
}

禁止写法：
@Mapper
public interface UserMapper {
    User selectById(Long id); // 然后直接 return 给 API
}

### 异常处理

- 业务异常继承 BusinessException，包含错误码和错误信息
- 全局异常处理使用 @RestControllerAdvice
- 不允许直接 throw new RuntimeException("xxx")，必须使用自定义异常
- 日志记录使用 SLF4J，不允许使用 System.out.println

正确写法：
throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在: " + userId);

禁止写法：
throw new RuntimeException("用户不存在");

## 工作流规范

### Plan Mode（重要）

任何非简单任务都必须先进入 Plan Mode，写详细方案后再执行。

触发条件：
- 超过 3 个步骤的任务 → Plan Mode
- 涉及架构决策 → Plan Mode
- 修改核心业务逻辑 → Plan Mode
- 数据库 Schema 变更 → Plan Mode

工作流四阶段：探索（理解需求）→ 计划（写方案）→ 实施（写代码）→ 提交（验证）

### 每次修改后必须执行

在 `web-ai-tougu` 目录执行：

mvn verify

`mvn test` 只运行单元测试；集成测试由 Failsafe 在 `verify` 阶段执行。全量较慢时可定向运行集成测试（如 `mvn -Dit.test=XxxIT verify`）。测试通过才能提交，不允许跳过。

## 明确禁止的模式

- 禁止直接将 Entity 暴露在 API 响应里
- 禁止在循环里调用数据库方法
- 禁止使用 System.out.println 输出日志
- 禁止 catch 所有异常后 log.error("失败") 就完事，必须区分异常类型
- 禁止直接在 Controller 里写业务逻辑
- 禁止跳过测试提交代码
- 数据库变更使用手工 SQL 版本文件（命名 `V序号__描述.sql`），已执行的文件只能新增，禁止修改；不引入 Flyway/Liquibase

## API 设计规范

- URL 路径使用名词复数：/users 而不是 /getUsers
- HTTP 方法语义正确：GET 查询，POST 创建，PUT 全量更新，PATCH 部分更新，DELETE 删除
- 版本管理：URL 路径前缀 /api/v1/
- 分页接口返回自定义 `PageResponse<T>`，包含 `totalElements` 和 `totalPages`；使用手动 SQL 分页，不依赖 Spring Data `Page`/PageHelper
- 所有 API 时间字段使用 `Instant`，序列化为 ISO 8601 UTC（以 `Z` 结尾）；数据库与 Jackson 时区已统一为 UTC

## Git 提交规范

格式：类型(范围): 描述

类型：
- feat: 新功能
- fix: Bug 修复
- refactor: 重构（不涉及功能变化）
- test: 测试相关
- docs: 文档修改
- chore: 构建/配置相关

示例：feat(user): 添加用户手机号绑定功能

---

# 前端开发规范（`frontend`）

## 技术栈

- React 18 + TypeScript 5.6（`strict` / `noUnusedLocals` 已开启）
- 构建工具：Vite 6；开发端口 5173，`/api` 代理到后端 8080
- 路由：React Router 6；状态管理：Zustand 5（仅跨页面共享状态）
- 测试：Vitest 3 + Testing Library（jsdom 环境）
- 样式：沿用 `docs/prototype` 的设计 Token（CSS 变量）+ 模块化 CSS，不引入 UI 组件库、CSS-in-JS 或 Tailwind（如需引入须先评审）

## 目录结构

```
frontend/src/
├── app/            # 路由定义、路由守卫、全局 Provider
├── layouts/        # 应用壳层：侧边导航 / 顶栏 / 全局抽屉 / Toast
├── modes/
│   ├── investor/   # 用户端页面（7 个）
│   ├── advisor/    # FA 端页面（8 个）
│   └── ta/         # TA 演示页（独立路由域，不加载产品壳层）
├── components/     # 共享组件：Drawer / Toast / Metric / Table / Donut …
├── hooks/          # 自定义 Hook（useXxx）
├── stores/         # Zustand store，按领域拆分（auth / notification / aiChat / theme）
├── api/            # http.ts + endpoints/，与 /api/v1/* 一一对应
├── utils/          # 纯函数工具（格式化、校验、日期）
└── styles/         # tokens.css / base.css / components.css（自原型迁移）
```

- 页面放 `modes/<端>/`，跨端复用组件必须上提到 `components/`，禁止在两个端复制同一页面。
- 新增页面必须同步注册 `app/App.tsx` 路由与 `layouts/AppShell.tsx` 导航项，三者缺一不可。
- TA 域（`/ta`）独立渲染，不挂载 `AppShell`、不读写产品端主题。

## 命名规范

- 组件文件与组件：大驼峰，一文件一个主组件（如 `MetricCard.tsx`）
- Hook：`useXxx`（如 `usePolling.ts`）；store：`useXxxStore`
- 函数与变量：小驼峰，动词开头（`fetchHoldings`、`handleSubmit`）
- 常量：全大写下划线（`MAX_PAGE_SIZE`）；类型/接口：大驼峰（`Holding`、`TradeStatus`）
- 样式类名：kebab-case；组件级样式与组件同名（`MetricCard.module.css`）

## TypeScript 规范

- 禁止 `any`、`@ts-ignore`、`as unknown as X` 等逃逸写法；外部数据先用 `unknown` 接收再做类型收窄
- 类型导入使用 `import type`（`verbatimModuleSyntax` 已开启）
- 状态字段用联合类型而非多个布尔值，如 `type TradeStatus = 'PENDING_TA' | 'CONFIRMED' | 'FAILED'`
- API 请求/响应类型放在 `api/endpoints/` 或 `types.ts`，字段与后端 DTO 保持一致，不在组件内重复声明
- 后端 `Instant` 字段为 ISO 8601 UTC，展示时统一经 `utils/` 格式化为本地时间，禁止各页面自行拼日期

## 组件规范

- 只使用函数组件 + Hook，不写 class 组件
- 组件只负责渲染与交互，数据请求放 `hooks/` 或 `stores/`；页面组件不直接写业务算法
- Props 使用 `interface XxxProps` 显式声明；事件回调命名 `onXxx`，内部处理函数命名 `handleXxx`
- 提前 `return` 处理 loading / empty / error，避免深层三元与超过 3 层的 JSX 嵌套
- 列表 `key` 使用业务唯一 ID，禁止使用数组下标
- 单个组件建议不超过 200 行，超出后按区块拆分子组件
- 派生数据用 `useMemo`，事件处理用 `useCallback`，但禁止无理由包裹；依赖数组必须完整

## 状态管理

- 页面内状态用 `useState`；跨页面/跨层级共享才放 Zustand，禁止把所有状态塞进一个全局 store
- 订阅使用 selector（`useAuthStore((s) => s.role)`），禁止整 store 订阅
- 筛选、分页、页签等可分享状态优先放 URL `searchParams`，不使用全局状态
- 服务端数据不长期缓存到 store；按需请求，写操作成功后重新拉取或局部更新

## API 与数据

- 所有请求必须走 `src/api/http.ts`，禁止组件内直接 `fetch` / `axios`
- endpoint 按模块组织，函数名为 `listXxx` / `getXxx` / `createXxx` / `updateXxx` / `deleteXxx`
- 错误统一为 `ApiError`，页面按 `status` / `code` 区分处理（401 跳登录、403 提示无权限、409 提示状态冲突、422 展示字段错误），禁止 `catch {}` 后静默吞掉
- 后端地址不得硬编码，统一使用 `/api/v1/*` 走 Vite 代理；生产由 Spring Boot / Nginx 托管
- 写操作依赖 `http.ts` 注入的 CSRF 头；提交类接口涉及幂等时按后端约定携带 `Idempotency-Key`
- 金额、份额禁止用浮点数做累加比较：展示用格式化函数，参与计算时使用整数分/字符串或后端返回的精确值

## 样式与主题

- 颜色、圆角、间距、阴影必须取自 `styles/tokens.css` 变量，禁止散落硬编码色值
- 双主题通过 `<body>` class 切换（`advisor` 为 FA 端主题），组件内不得写死单一端配色
- 基础与全局样式放 `styles/`；页面/组件私有样式使用同名 `*.module.css`，避免全局类名冲突
- 内联 `style` 仅用于运行时计算值（如进度条宽度），静态样式一律写 CSS
- UI 以 `docs/prototype` 为还原基线，断点遵循原型：1300px / 860px / 590px
- 图标统一使用项目内 SVG 组件，不引入图标库整包

## 路由与权限

- 三路由域固定为 `/investor/*`、`/advisor/*`、`/ta/*`，不得新增第四域
- 未登录访问受保护路由跳本端 `/login` 并携带安全的站内回跳地址；按 AD-16 保留独立站点，角色不匹配显示无权限与退出入口，不自动跨站跳转
- 站内跳转使用 `Link` / `useNavigate`，禁止 `window.location.href`（登出、外部链接除外）
- 路由守卫统一在 `app/` 内实现，页面组件不重复判断角色

## 表单与交互

- 表单使用受控组件；提交前完成校验，校验规则与后端约束一致
- 提交期间禁用按钮并展示 pending 状态，防止重复提交
- 错误提示定位到字段，同时在表单顶部或 Toast 汇总；用户可见文案统一中文
- 每个数据区块必须具备加载中、空状态、错误重试三种状态
- 危险操作（赎回、跟调、批量确认）必须二次确认，并在确认文案中说明后果

## 可访问性与响应式

- 可点击元素使用 `button` / `a`，禁止用 `div` 绑定 onClick
- 图标按钮必须提供 `aria-label`；弹窗/抽屉需支持 ESC 关闭与焦点回收
- 表单控件与 `label` 关联；错误信息使用 `aria-describedby`
- 页面在 590px 宽度下核心操作仍可用，不得出现横向滚动

## 测试规范

- 测试文件放 `frontend/tests/`，命名 `Xxx.test.tsx`，与源文件结构对应
- 优先按用户行为断言（`getByRole` / `getByText`），避免断言组件内部实现
- 至少覆盖：壳层导航与路由、表单校验、loading/empty/error 三态、权限跳转、关键业务状态流转
- 修改后必须执行（在 `frontend` 目录）：

```bash
npm test -- --run    # 单次运行，避免进入 watch
npm run build        # tsc -b + vite build，类型错误即失败
```

- 涉及接口契约变更时，同步更新 `docs/design/04.API接口设计.md`；涉及交互流程变更时，同步更新 `docs/design/01.FundPilot_需求规格说明书.md`

## 代码风格

- 2 空格缩进、单引号、不写行尾分号、多行末尾保留尾逗号（与现有代码一致）
- 当前未引入 ESLint / Prettier；如后续引入，以仓库配置为准并一次性格式化，禁止混用两种风格
- 导入分组顺序：React 与第三方 → 项目内绝对/相对路径 → 类型导入 → 样式
- 注释只解释"为什么"，不复述代码；关键业务口径（KYC 匹配、SAA/TAA、TA 三态）必须注明需求编号

## 明确禁止的模式

- 禁止 `any` / `@ts-ignore` / 关闭 `strict`
- 禁止组件内裸 `fetch`、硬编码后端域名或端口
- 禁止直接操作 DOM（`document.querySelector` 等）；主题切换、焦点管理等统一封装在 Hook 中
- 禁止把业务数据、账号信息写死到组件；演示数据放 `mocks/` 或测试文件
- 禁止用数组下标作为列表 `key`
- 禁止提交 `dist/`、`node_modules/`、本地环境文件
- 禁止在 TA 域复用产品端壳层与导航
- 禁止跳过构建与测试提交代码
