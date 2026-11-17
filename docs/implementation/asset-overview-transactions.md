# 用户端资产总览与交易记录实施及验收

日期：2026-11-17。依据：CLAUDE.md、docs/design 全部五份设计文档，重点 F-U-101～108、F-U-501～508、ASSET-01～03、TRADE-08～09。

## 实施范围

1. 后端 asset 模块：当前资产、真实快照趋势、四类配置、主要持仓、三条确定性规则洞察、中文 PDF（正文及独立免责声明页）、导出审计。
2. 后端 trade 模块：定投计划查询/原子更新、金额/基金/日期校验、用户隔离、幂等回放、审计；完善流水类型和回执显示。
3. 前端：资产总览全部区块与加载/空态/错误重试、区间切换、基金抽屉、AI 入口、PDF 下载；交易筛选分页、只读回执、定投编辑及二次确认。
4. 验证：真实 MySQL/Redis Testcontainers、前端交互测试与构建、真实服务浏览器流程、移动端布局、PDF 渲染、改动审查。

## 文件边界与口径

新增 asset 与 auto-invest 相关 DTO/mapper/service/controller、测试、前端 API/hooks/components；修改现有交易展示、HTTP 二进制下载支持、POM（PDFBox）、设计文档及本验收记录。沿用已存在的数据库表，无 schema 变更。

总资产=持仓市值+现金余额（包含冻结）；累计收益仅为当前持仓浮盈亏；配置占比以持仓为分母，持仓 shareRatio 以总资产为分母。近30日变化与趋势来自真实日快照，不伪造历史；未测评显示未测评。基准为明确标记的演示配置，不作为市场行情。规则缺少输入时明确披露，不生成虚构 SAA 偏离。

计划保存不触发扣款或模拟 TA 确认；沿用独立 TA 流程。AI 入口复用现有对话抽屉，当前不调用模型。注册账户、现有委托、行情和用户未提交改动均保留。

## 验收记录

### 功能与合同

| 范围 | 交付与验证 |
|---|---|
| ASSET-01 | 总资产/持仓盈亏/冻结口径、四类配置舍入、Top3、无画像、无持仓、缺失净值失败、三条规则洞察 |
| ASSET-02 | 1M/3M/6M/1Y 真实日快照、日期窗口、首点归零、零基数、单点/空态、非法区间拒绝 |
| ASSET-03 | 中文二进制PDF、全部持仓、跨页记录完整、独立免责声明页、action=7审计、鉴权失败不下载错误内容 |
| TRADE-08/09 | 计划不存在态、创建/编辑/回读、金额/日期/基金数校验、重复基金、基金不存在、原子替换、保留暂停状态 |
| 写入边界 | 跨用户隔离、CSRF、幂等键格式、同键同体回放、异体/跨用户冲突、并发只写一次、审计失败全事务回滚 |
| 交易页面 | 五类流水资金方向、提交时间、三态颜色、TA回执详情、失败原因、URL筛选分页/刷新恢复、独立TA链接 |
| 页面交互 | 定投核对后再次确认、网络失败沿用原凭证、基金抽屉与申购跳转、AI预填入口、错误重试、320/590px布局 |

### 自动化证据

- 首轮红测：5个新端点集成用例因404失败，3个新页面用例因缺失内容失败。日志：`.acceptance/asset-red.log`、`.acceptance/asset-ui-red.log`。
- 新增 `AssetTransactionsIT` 10项，真实 MySQL 8 / Redis 7 Testcontainers，零失败、零跳过。包含并发、金额边界、权限、PDF解析及审计回滚；日志 `.acceptance/asset-final-integration.log`。回滚用例中的数据库 CHECK 异常为有意注入，并非通过条件被忽略。
- 前端新增8项（页面5项、PDF下载3项）；全量前端最近一次66项通过，日志 `.acceptance/asset-final-tests.log`；`npm run build` 三入口构建通过，日志 `.acceptance/asset-final-build.log`。
- 临时反转定投金额合计比较条件，一分钱不一致用例按预期失败；随后逐字节恢复源文件并重新全量测试通过。证据 `.acceptance/asset-mutation.log`。
- 适配已有壳层测试：匿名TA页面可请求自己的业务数据，仍禁止请求产品会话API；没有放宽角色、CSRF或账户归属边界。
- 初次全仓回归发现并行开发的TA批量回放响应字段和旧壳层断言问题，后续版本已修复。最终全仓 `mvn verify` 执行3项单元测试及64项集成测试，有两项旧测试/夹具问题：TA新增用例 `confirmedHoldingsAndScopedAdvisorHistoryReadSameCommittedFacts` 漏填 `advisor_customer_relation.assigned_at`；`AuthIT.advisorOnlyReachesAssignedActiveCustomers` 仍期望已授权客户的交易接口返回404，而该接口已实现并返回200。当前源码已补齐必填字段，并更新已授权分支为200空记录，保留未分配/失效关系403及非法ID400断言。已分别定向重跑：`TaReceiptIT` 当前12项、`AuthIT` 12项均通过；命令分别为 `mvn -q -Dit.test=TaReceiptIT verify`、`mvn -q -Dit.test=AuthIT verify`，日志为 `.acceptance/asset-ta-recheck.log`、`.acceptance/asset-auth-recheck.log`。日志 `.acceptance/asset-final-verify.log` 保留失败证据，不以局部通过替代全仓结论。

### 真实服务浏览器验收

使用独立后端18082，连接已有验收库 `tougu_auth_validation_20261116`；前端开发预览15174，构建预览15175。所有新增验收写入限定于新注册的 `asset_acceptance_1117_113410`（userId=4，密码 `AssetAccept1117!`）。该账户的持仓、历史日快照、五类交易及终态回执为**明确标记的验收夹具**，不代表真实投资记录或本轮执行了TA结算。账户注册、查询、计划写入、PDF导出与审计均经过真实HTTP/MySQL/Redis，未拦截API。

实际浏览器执行：

1. 登录后读取总资产52,061.70元、现金50,000.00元、冻结150.00元、可用49,850.00元；1M区间3条快照切换3M后5条。
2. 主要持仓打开基金详情，继续“申购该基金”跳转现有申购抽屉；AI诊断入口填入“帮我诊断当前组合”，明确显示服务尚未开放。
3. 计划创建300.00元/每月8日，核对后二次确认保存；刷新后回读；再调整400.00元/每月28日，刷新验证。数据库对应2条计划审计。
4. 五类流水/三种状态可见；筛选FAILED并查看限购失败回执；ESC关闭。`size=2`分页显示5笔/3页，翻页后刷新仍保留第2页。
5. 320px总览、交易页及编辑抽屉，590px总览均断言无横向溢出；桌面实际截图复核。
6. 实际下载PDF并以PyMuPDF逐页渲染检查：3页A4，正文含全部4只持仓、规则洞察，最后一页独立免责声明；中文可提取，无记录跨页拆分。导出审计action=7、object_type=asset_snapshot。

只读复核脚本 `.acceptance/asset/verify.py` 全部断言通过，结果 `.acceptance/asset/verified.json`：计划调整后现金、持仓数量4和交易笔数5不变；符合“仅保存计划、不扣款/不创建委托”。种子脚本 `.acceptance/asset/seed.py` 只用于新验收账号，不应在已有业务账号上补造历史。

截图及报告在 `frontend/output/playwright/`：

- `asset-overview-desktop.png`、`asset-overview-mobile.png`、`asset-overview-590.png`
- `asset-transactions-saved.png`、`asset-transactions-mobile.png`、`asset-receipt-failed.png`
- `auto-invest-confirm.png`、`auto-invest-mobile.png`、`asset-holding-detail.png`
- `asset-report.pdf`、`asset-report-page-1.png`～`asset-report-page-3.png`
- 构建预览复验：`asset-overview-production.png`、`asset-transactions-production.png`、`asset-transactions-production-mobile.png`；生产构建流程未捕获页面JavaScript异常。

开发过程中的HMR曾因源文件热更新触发React临时错误，刷新恢复；最终以构建预览复验。匿名恢复401、无画像404、无定投计划404是合同预期。共享工作区其他模块新增业务日期接口时，旧预览JAR曾返回404，最终预览需使用最新构建。

最终预览已更新后端构建副本，生产构建访问地址：`http://127.0.0.1:15175/investor/overview`、`http://127.0.0.1:15175/investor/transactions`。后端运行 `.acceptance/asset/demo-app.jar`，避免Windows占用Maven目标JAR；后端18082、构建预览15175进程编号分别记录在 `.acceptance/asset/backend.pid`、`production-preview.pid`。重启后端后需重新登录。源码哈希清单为 `.acceptance/asset/source-manifest.json`。

### 交付边界

本模块完成ASSET查询/导出及用户侧TRADE读写交互，不创建伪造历史快照、不调用付费模型、不在用户端模拟确认成交。AD-10定投执行调度、完整调仓建议页、完整持仓页和AI分析服务属于其各自模块；本次只复用入口。趋势基准为明确的演示参数，规则洞察为确定性观察，不代表实际投资建议或全面风险评估。

PDF依赖依据 [PDFBox官方下载](https://pdfbox.apache.org/download.html) 和 [官方嵌入字体示例](https://github.com/apache/pdfbox/blob/trunk/examples/src/main/java/org/apache/pdfbox/examples/pdmodel/EmbeddedFonts.java)；随包Noto中文字体附OFL许可证及来源说明。

### 代码复核

- 正确性：金额在服务端使用BigDecimal，前端校验使用整数分；现金冻结只影响可用现金；配置舍入合计100%；缺少画像、净值及历史数据有明确行为。
- 安全：当前用户取认证主体，查询不接受外部userId；投资者角色校验、CSRF、键绑定用户/路径/请求摘要；PDF复用统一HTTP客户端的会话失效处理。
- 事务：计划头/明细/审计/幂等记录同事务；按持久账户行锁串行更新；原响应缓存必须与已提交数据库摘要一致才允许回放。
- 性能与分层：持仓/目标配置/基金校验批量查询，无逐基金mapper调用；报表按同一事务快照生成全部持仓；前端数据访问放在API与hooks中。
- 可维护性：资产图表、配置、定投编辑、计划卡片分组件；二进制HTTP传输与资产报告文件名/格式校验分离；中文字体许可证及生成来源随包记录。无数据库结构变更、无自动迁移、无Git提交。

### 最终验收结论

本轮模块验收通过。后端全量回归加两类失败项定向重跑，当前汇总 68 项全部通过、零跳过（其中本轮新增10项），详情 `.acceptance/asset/backend-verification.json`；不是宣称最初全量命令一次通过。前端66项及生产构建通过。真实浏览器、移动端、PDF渲染及审计/余额只读复核通过。未提交Git，未改变数据库结构；保留共享工作区其他模块的修改。
