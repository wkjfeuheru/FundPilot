-- =====================================================================
-- FundPilot AI 基金投顾平台 · 全量建库脚本（V1.3，2026-11-16；V1.3 = 回写评审确认：注册开户初始化/非交易日顺延/分红演示口径，无表结构变更）
-- 依据：docs/design/03.数据库设计.md V1.4（FP-DB-2026-003）
-- 环境：MySQL 8.0 + InnoDB + utf8mb4/utf8mb4_0900_ai_ci，时区 UTC
-- 执行：人工按序执行并登记（CLAUDE.md/AD-08：spring.sql.init.mode=never）
-- 说明：本文件为初版全量脚本；后续变更走增量版本文件，已执行只增不改
-- 约定：
--   * 主键统一 id BIGINT UNSIGNED AUTO_INCREMENT（trading_day 声明性偏离）
--   * 业务时点 datetime(3) 存 UTC；deleted_at 零值 = '1970-01-01 00:00:00.000' 表示未删除
--   * 禁物理外键，关联完整性由应用层 + 对账保证；关联列均建索引
--   * 金额 decimal(18,2)；份额 decimal(18,4)；净值 decimal(11,4)；
--     权重/占比/费率按百分数值存储 decimal(7,4)（38.0000 = 38%），收益率 decimal(9,4)，覆盖度 decimal(5,2)
--   * 外部数据源字段：fund.data_source/data_synced_at 溯源；天天基金“亿元”规模导入时×1e8 转“元”
--   * 演进预留（本期不建表）：quant_task / quant_result（架构 7.6）
-- =====================================================================

CREATE DATABASE IF NOT EXISTS tougu_platform
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE tougu_platform;

-- =====================================================================
-- 域一：用户与客户（D1/D7/D8/4.14/5.6/6.2 —— user、client 模块）
-- =====================================================================

-- 1. user — 账户（双角色：investor/advisor；DDR-01 同一账户体系）
CREATE TABLE user (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    username                VARCHAR(64)     NOT NULL                COMMENT '登录名（唯一）',
    password_hash           VARCHAR(100)    NOT NULL                COMMENT '口令散列（bcrypt/argon2id，不存明文）',
    display_name            VARCHAR(64)     NOT NULL                COMMENT '展示姓名（问候语与头像首字来源）',
    role                    TINYINT         NOT NULL DEFAULT 1     COMMENT '角色：1=investor（C端用户）2=advisor（投顾）',
    status                  TINYINT         NOT NULL DEFAULT 1     COMMENT '账户状态：1=正常 2=停用',
    is_security_verified    TINYINT(1)      NOT NULL DEFAULT 0     COMMENT '安全认证状态：0=未验证 1=已验证（F-U-603）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_username (username)
) ENGINE = InnoDB COMMENT = '账户：双角色统一账户表（注销走逻辑删除，登录名不释放）';

-- 2. risk_profile — 风险画像/KYC（D1/4.14；C端测评与投顾侧客户KYC的单一事实源，TODO-10 全链路同步）
CREATE TABLE risk_profile (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    user_id                 BIGINT UNSIGNED NOT NULL                COMMENT '归属用户（仅 investor 有行，1:1）',
    risk_level              TINYINT         NOT NULL DEFAULT 1     COMMENT '当前有效风险等级：1=R1保守 2=R2稳健 3=R3平衡 4=R4成长 5=R5进取（文案映射应用层维护）',
    investment_goal         VARCHAR(128)    NOT NULL DEFAULT ''    COMMENT '投资目标自然语言（如“长期稳健增值”）',
    goal_category           TINYINT         NOT NULL DEFAULT 0     COMMENT '目标分类（与策略主分类比对）：0=未设置 1=稳健增值 2=均衡增长 3=积极成长 4=固收+ 5=多资产',
    horizon_years           TINYINT         NOT NULL DEFAULT 0     COMMENT '投资期限（年，KYC硬约束 BR-05）',
    liquidity_need          TINYINT         NOT NULL DEFAULT 0     COMMENT '流动性需求：0=未设置 1=低 2=中 3=高（策略流动性等级须不低于该值）',
    experience_years        TINYINT         NOT NULL DEFAULT 0     COMMENT '投资经验（年）',
    account_type            VARCHAR(32)     NOT NULL DEFAULT ''    COMMENT '账户类型（如“个人投资账户”）',
    evaluated_at            DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '最近测评完成时间（零值=从未测评）',
    valid_until             DATE            NOT NULL DEFAULT '1970-01-01' COMMENT '测评有效期止（BR-19，原型12个月）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_id (user_id)
) ENGINE = InnoDB COMMENT = '风险画像/KYC：客户风险等级与适当性信息单一事实源；注册不预建，首次测评创建';

-- 3. risk_questionnaire — 风险测评问卷模板（TODO-10 复用机构适当性问卷）
CREATE TABLE risk_questionnaire (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    version                 VARCHAR(16)     NOT NULL                COMMENT '问卷版本号（唯一）',
    title                   VARCHAR(128)    NOT NULL                COMMENT '问卷标题',
    question_count          TINYINT         NOT NULL DEFAULT 0     COMMENT '题目数（与题目表同事务维护）',
    status                  TINYINT         NOT NULL DEFAULT 1     COMMENT '状态：1=启用 2=停用',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_version (version)
) ENGINE = InnoDB COMMENT = '风险测评问卷模板（版本化，投顾端代填同用）';

-- 4. risk_question — 测评题目
CREATE TABLE risk_question (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    questionnaire_id        BIGINT UNSIGNED NOT NULL                COMMENT '所属问卷',
    sort_no                 TINYINT         NOT NULL                COMMENT '题目序号（1起）',
    title                   VARCHAR(255)    NOT NULL                COMMENT '题干',
    options                 JSON            NULL                    COMMENT '选项数组（不检索）：[{"text":"选项文本","score":分值}]，应用层计分',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_questionnaire_sort (questionnaire_id, sort_no)
) ENGINE = InnoDB COMMENT = '风险测评题目（选项与分值以JSON承载，应用层计分判级）';

-- 5. risk_assessment — 测评记录（仅追加；支持用户自测与投顾代填）
CREATE TABLE risk_assessment (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    user_id                 BIGINT UNSIGNED NOT NULL                COMMENT '被测评用户',
    questionnaire_id        BIGINT UNSIGNED NOT NULL                COMMENT '使用的问卷版本',
    answers                 JSON            NULL                    COMMENT '作答明细（不检索）：题目ID + 选项序号 + 得分（questionId/optionIndex/score）',
    total_score             SMALLINT        NOT NULL DEFAULT 0     COMMENT '总得分',
    risk_level              TINYINT         NOT NULL                COMMENT '本次判定等级：1=R1 2=R2 3=R3 4=R4 5=R5（历史保留，最新值冗余于 risk_profile）',
    evaluated_by_user_id    BIGINT UNSIGNED NOT NULL DEFAULT 0     COMMENT '代填投顾用户ID（0=用户自测，TODO-10）',
    evaluated_at            DATETIME(3)     NOT NULL                COMMENT '测评完成时间（UTC）',
    valid_until             DATE            NOT NULL                COMMENT '本次有效期止',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除，本表禁止删除）',
    PRIMARY KEY (id),
    KEY idx_user_evaluated (user_id, evaluated_at),
    KEY idx_questionnaire_id (questionnaire_id),
    KEY idx_evaluated_by (evaluated_by_user_id)
) ENGINE = InnoDB COMMENT = '风险测评记录：作答与判定留痕（取最新一条同步 risk_profile）';

-- 6. customer — 客户运营档案（D7/4.6；投顾侧视角字段，与 user 1:1）
CREATE TABLE customer (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    user_id                 BIGINT UNSIGNED NOT NULL                COMMENT '关联用户（唯一，仅 investor）',
    customer_code           VARCHAR(16)     NOT NULL                COMMENT '客户编号（C1024，唯一）',
    age                     TINYINT         NOT NULL DEFAULT 0     COMMENT '年龄（演示字段）',
    service_status          TINYINT         NOT NULL DEFAULT 4     COMMENT '服务状态：1=正常 2=待沟通 3=待调仓 4=跟进中（TODO-02 筛选维度）',
    priority                TINYINT         NOT NULL DEFAULT 2     COMMENT '优先级：1=高 2=中 3=低（TODO-02 筛选维度）',
    attention_note          VARCHAR(255)    NOT NULL DEFAULT ''    COMMENT '关注事项（AI风险描述，如“权益仓位超出约定上限6.5%”）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_id (user_id),
    UNIQUE KEY uk_customer_code (customer_code)
) ENGINE = InnoDB COMMENT = '客户运营档案：投资者注册时创建；AUM/区间收益/持有基金数由持仓与快照实时聚合';

-- 7. advisor_customer_relation — 投顾-客户服务关系（D8/ER-08；单一ACTIVE约束：生成列+唯一索引，工程已验证方案）
CREATE TABLE advisor_customer_relation (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    advisor_user_id         BIGINT UNSIGNED NOT NULL                COMMENT '投顾用户ID',
    customer_user_id        BIGINT UNSIGNED NOT NULL                COMMENT '客户用户ID',
    status                  TINYINT         NOT NULL DEFAULT 1     COMMENT '关系状态：1=ACTIVE 2=ENDED',
    active_customer_user_id BIGINT UNSIGNED GENERATED ALWAYS AS (IF(status = 1, customer_user_id, NULL)) STORED COMMENT '活跃客户生成列（仅约束用：ACTIVE行取客户ID，非活跃为NULL）',
    assigned_at             DATETIME(3)     NOT NULL                COMMENT '分配时间（UTC）',
    ended_at                DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '结束时间（零值=未结束）',
    version                 INT             NOT NULL DEFAULT 0     COMMENT '乐观锁版本（转移场景并发结束）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除，本表历史永久保留）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_active_customer (active_customer_user_id),
    KEY idx_customer_status (customer_user_id, status),
    KEY idx_advisor_status (advisor_user_id, status),
    CONSTRAINT chk_acr_status CHECK (status IN (1, 2))
) ENGINE = InnoDB COMMENT = '投顾-客户服务关系：一客户同时至多一个ACTIVE投顾（ER-08归属校验依据）';

-- =====================================================================
-- 域二：基金（D2/D19/4.1/4.16 —— fund 模块）
-- =====================================================================

-- 8. fund — 基金主数据（D2 与基金池 D19 合并，DDR-08；30列=上限；2026-11-16 真实数据源适配 DDR-12：加7列砍3列）
CREATE TABLE fund (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    fund_code               VARCHAR(10)     NOT NULL                COMMENT '基金代码（6位，唯一）',
    name                    VARCHAR(128)    NOT NULL                COMMENT '基金简称（对外展示口径；天天基金“基金全称”不入库）',
    fund_type               TINYINT         NOT NULL                COMMENT '资产大类（DR-05四分类，持仓聚合口径；导入时由官方细分类人工映射，DDR-14）：1=权益 2=债券 3=货币 4=黄金',
    risk_level              TINYINT         NOT NULL                COMMENT '风险等级：1=R1 2=R2 3=R3 4=R4 5=R5（适当性匹配；导入时人工/规则映射，天天基金仅文字描述）',
    category_label          VARCHAR(64)     NOT NULL DEFAULT ''    COMMENT '官方细分类（天天基金口径，如“指数型-股票”“货币型-普通货币”；fund_type 大类映射的依据）',
    style_tags              JSON            NULL                    COMMENT '风格标签（不检索，前端关键词过滤）：如“大盘成长”“红利低波”“宽基指数”',
    company                 VARCHAR(64)     NOT NULL DEFAULT ''    COMMENT '基金公司（单管理人集中度 BR-13/23 口径）',
    manager                 VARCHAR(128)    NOT NULL DEFAULT ''    COMMENT '基金经理（可多人，如“刘莹、王昌俊等”，DDR-15 加宽）',
    fund_size               DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '净资产规模（元；导入自天天基金“亿元”口径×1e8转换）',
    fund_size_as_of_date    DATE            NOT NULL DEFAULT '1970-01-01' COMMENT '规模截止日（季报口径，展示必须带日期）',
    inception_date          DATE            NOT NULL DEFAULT '1970-01-01' COMMENT '成立日期',
    benchmark               VARCHAR(128)    NOT NULL DEFAULT ''    COMMENT '业绩比较基准（如“95%×沪深300指数收益率+1.5%”；报告与详情抽屉使用）',
    latest_nav              DECIMAL(11,4)   NOT NULL DEFAULT 0     COMMENT '最新单位净值（fund_nav最新行冗余缓存，同事务维护；货币基金恒1.0000，收益看fund_nav.annualized_7d）',
    latest_nav_date         DATE            NOT NULL DEFAULT '1970-01-01' COMMENT '最新净值日期',
    return_1y               DECIMAL(9,4)    NOT NULL DEFAULT 0     COMMENT '近一年收益率（%，正绿负红；货币基金无此口径，恒存0，展示走7日年化）',
    purchase_status         TINYINT         NOT NULL DEFAULT 1     COMMENT '申购状态：1=开放申购 2=限购 3=暂停申购（TA失败注入来源 BR-35）',
    redeem_status           TINYINT         NOT NULL DEFAULT 1     COMMENT '赎回状态：1=开放赎回 2=暂停赎回',
    pool_rating             TINYINT         NOT NULL DEFAULT 0     COMMENT '池内评级：0=未评级 1=A+ 2=A 3=B+（构建与替换依据）',
    fee_purchase            DECIMAL(7,4)    NOT NULL DEFAULT 0     COMMENT '申购费率（%，天天基金优惠档实际成交口径，CR-12；官方原价不入库，DDR-14）',
    fee_redeem              DECIMAL(7,4)    NOT NULL DEFAULT 0     COMMENT '赎回费率（%，标准档；天天按持有期分档，演示取标准档，CR-13）',
    fee_manage              DECIMAL(7,4)    NOT NULL DEFAULT 0     COMMENT '管理费率（%）',
    fee_custodian           DECIMAL(7,4)    NOT NULL DEFAULT 0     COMMENT '托管费率（%）',
    fee_sales_service       DECIMAL(7,4)    NOT NULL DEFAULT 0     COMMENT '销售服务费率（%，C类份额主要成本）',
    is_pool_eligible        TINYINT(1)      NOT NULL DEFAULT 1     COMMENT '是否入池（组合构建只从池内筛选，BR-23）',
    data_source             VARCHAR(32)     NOT NULL DEFAULT 'DEMO' COMMENT '数据来源：DEMO=演示种子 EASTMONEY=天天基金导入（非官方API，演示用途，频率受控）',
    data_synced_at          DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '最近同步时间（零值=未同步；对账与刷新依据）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除；清退基金用 is_pool_eligible=0，物理删除禁止）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_fund_code (fund_code),
    KEY idx_type_risk (fund_type, risk_level),
    KEY idx_company (company),
    CONSTRAINT chk_fund_type CHECK (fund_type IN (1, 2, 3, 4)),
    CONSTRAINT chk_fund_risk CHECK (risk_level BETWEEN 1 AND 5),
    CONSTRAINT chk_fund_purchase CHECK (purchase_status IN (1, 2, 3)),
    CONSTRAINT chk_fund_redeem CHECK (redeem_status IN (1, 2))
) ENGINE = InnoDB COMMENT = '基金主数据+基金池（D2/D19合并）：类型/风险双向正交，申购赎回状态驱动TA失败注入；波动率/最大回撤由净值序列实时计算不入库（DDR-02/DDR-12），产品说明由细分类+风格标签+业绩基准组合渲染';

-- 9. fund_nav — 基金净值历史（仅追加；TA确认按T日净值的事实来源；2026-11-16 DDR-13 加货币基金收益两列）
CREATE TABLE fund_nav (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    fund_id                 BIGINT UNSIGNED NOT NULL                COMMENT '基金ID',
    nav_date                DATE            NOT NULL                COMMENT '净值日期（T日）',
    unit_nav                DECIMAL(11,4)   NOT NULL                COMMENT '单位净值（BR-34 T+1确认按T日净值；货币基金恒1.0000，不参与收益展示）',
    accum_nav               DECIMAL(11,4)   NOT NULL DEFAULT 0     COMMENT '累计净值（含分红口径；货币基金存0）',
    per_10k_income          DECIMAL(11,4)   NOT NULL DEFAULT 0     COMMENT '每万份收益（仅货币基金有值，非货币恒0；天天基金jjlsjz口径）',
    annualized_7d           DECIMAL(9,4)    NOT NULL DEFAULT 0     COMMENT '7日年化收益率（%，仅货币基金有值，非货币恒0）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除，本表禁止删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_fund_date (fund_id, nav_date)
) ENGINE = InnoDB COMMENT = '基金历史净值：日线净值（导入口径近1年，DDR-16），历史曲线与TA确认份额计算依据；复权净值暂缓（DDR-16）';

-- 10. favorite — 自选基金（物理删除，声明性偏离“必备四列”，DDR-09）
CREATE TABLE favorite (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    user_id                 BIGINT UNSIGNED NOT NULL                COMMENT '用户ID',
    fund_id                 BIGINT UNSIGNED NOT NULL                COMMENT '基金ID',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '自选时间（UTC）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_fund (user_id, fund_id),
    KEY idx_fund_id (fund_id)
) ENGINE = InnoDB COMMENT = '自选基金（BR-18 用户级开关集合，取消自选即物理删除）';

-- fund_dividend — 基金分红事件（2026-11-16 D5 评审新增；仅追加，插于基金域末尾）
CREATE TABLE fund_dividend (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    fund_id                 BIGINT UNSIGNED NOT NULL                COMMENT '基金ID',
    ex_date                 DATE            NOT NULL                COMMENT '权益登记/除权除息日（单位净值跳水日，对应历史净值表“分红送配”备注）',
    per_unit_dividend       DECIMAL(11,4)   NOT NULL                COMMENT '每份分红金额（元/份，如0.3400）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除，本表禁止删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_fund_ex_date (fund_id, ex_date)
) ENGINE = InnoDB COMMENT = '基金分红事件：导入净值时带出，支撑净值跳水解释与分红交易（trade_type=5）生成（生成路径待定，见05评审Q2）';

-- =====================================================================
-- 域三：资产与交易（D3~D6/D20/4.4/4.5 —— trade、advice 模块）
-- =====================================================================

-- 11. holding — 持仓（D3/4.2；市值/收益/占比实时计算不落库，DDR-02；清仓保留零份额行，DDR-10）
CREATE TABLE holding (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    user_id                 BIGINT UNSIGNED NOT NULL                COMMENT '归属用户',
    fund_id                 BIGINT UNSIGNED NOT NULL                COMMENT '持有基金',
    shares                  DECIMAL(18,4)   NOT NULL DEFAULT 0     COMMENT '持有份额（赎回上限 BR-32；清仓=0保留行）',
    cost_amount             DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '持仓成本（现金成本口径，CR-02收益计算依据）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_fund (user_id, fund_id),
    KEY idx_fund_id (fund_id)
) ENGINE = InnoDB COMMENT = '持仓：份额与成本为唯一存储事实，市值=份额×最新净值实时计算';

-- 12. cash_account — 现金账户（D20/4.4.2；冻结=Σ在途单freeze_amount，实时SUM不落库）
CREATE TABLE cash_account (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    user_id                 BIGINT UNSIGNED NOT NULL                COMMENT '归属用户（唯一）',
    cash_balance            DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '现金余额（演示种子50000）',
    version                 INT             NOT NULL DEFAULT 0     COMMENT '乐观锁版本（并发扣减 where user_id=? and version=?）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_id (user_id)
) ENGINE = InnoDB COMMENT = '现金账户：投资者注册时创建（演示初始50000）；可用现金=余额−Σ待登记单冻结（CR-16，含调仓净支出冻结 DDR-04）';

-- 13. asset_snapshot — 用户资产日快照（F-U-105趋势/CR-04区间收益，DDR-02）
CREATE TABLE asset_snapshot (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    user_id                 BIGINT UNSIGNED NOT NULL                COMMENT '用户ID',
    snapshot_date           DATE            NOT NULL                COMMENT '快照日（业务日）',
    market_value            DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '当日持仓总市值',
    cash_balance            DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '当日现金余额',
    total_asset             DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '当日总资产（市值+现金）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除，仅追加修正）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_date (user_id, snapshot_date)
) ENGINE = InnoDB COMMENT = '用户资产日快照：日终任务写入，支撑趋势图与区间收益（投顾AUM趋势按名下客户聚合）';

-- 14. trade_order — 交易单（订单头，D5/4.4.1；三态状态机 BR-15）
CREATE TABLE trade_order (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    order_code              VARCHAR(20)     NOT NULL                COMMENT '委托编号（T-20261115-001，唯一）',
    user_id                 BIGINT UNSIGNED NOT NULL                COMMENT '交易客户',
    trade_type              TINYINT         NOT NULL                COMMENT '交易类型：1=基金申购 2=基金赎回 3=基金调仓 4=基金定投 5=基金分红',
    status                  TINYINT         NOT NULL DEFAULT 1     COMMENT '状态：1=PENDING_TA待登记确认 2=CONFIRMED确认成功 3=FAILED确认失败（单向流转）',
    trade_date              DATE            NOT NULL                COMMENT '申请日（T日；T+1确认按T日净值 BR-34；非交易日顺延至下一交易日）',
    advice_id               BIGINT UNSIGNED NOT NULL DEFAULT 0     COMMENT '来源调仓建议ID（0=非跟调单，DF-12）',
    plan_id                 BIGINT UNSIGNED NOT NULL DEFAULT 0     COMMENT '来源定投计划ID（0=非定投单）',
    total_amount_in         DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '调入/申购总金额（明细同事务汇总）',
    total_amount_out        DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '调出/赎回总金额（明细同事务汇总）',
    total_fee               DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '预计费用合计（CR-12/13/14）',
    freeze_amount           DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '本单在途冻结金额：申购单=申购金额；调仓单=max(调入−调出,0)+预计费用；赎回/分红=0（DDR-04）',
    remark                  VARCHAR(255)    NOT NULL DEFAULT ''    COMMENT '备注（如“组合调仓 · 9只基金”）',
    version                 INT             NOT NULL DEFAULT 0     COMMENT '乐观锁版本（TA回执置终态 where id=? and version=?）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除，本表禁止删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_code (order_code),
    KEY idx_user_status_created (user_id, status, created_at),
    KEY idx_advice_id (advice_id),
    KEY idx_plan_id (plan_id)
) ENGINE = InnoDB COMMENT = '交易单订单头：三态状态机，确认成功才更新持仓与现金（BR-15/DF-13）';

-- 15. trade_order_item — 交易明细（标的行，DDR-03；确认结果回填于此）
CREATE TABLE trade_order_item (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    order_id                BIGINT UNSIGNED NOT NULL                COMMENT '所属交易单',
    fund_id                 BIGINT UNSIGNED NOT NULL                COMMENT '标的基金',
    direction               TINYINT         NOT NULL                COMMENT '方向：1=买入（申购/调入/增持/定投/分红转入）2=卖出（赎回/调出）',
    amount                  DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '申请金额（申购/调仓/定投有值；赎回为0）',
    shares                  DECIMAL(18,4)   NOT NULL DEFAULT 0     COMMENT '申请份额（赎回有值；申购/调仓为0）',
    fee                     DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '该标的预计费用',
    confirmed_amount        DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT 'TA确认金额（确认成功时按T日净值回填，CR-15；执行依据）',
    confirmed_shares        DECIMAL(18,4)   NOT NULL DEFAULT 0     COMMENT 'TA确认份额（确认成功时回填，持仓增减依据 DF-13）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除，本表禁止删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_fund (order_id, fund_id),
    KEY idx_fund_id (fund_id)
) ENGINE = InnoDB COMMENT = '交易明细：标的级金额/份额/费用与确认回填（同单同基金合并一行）';

-- 16. ta_receipt — TA回执（4.4.1；与交易单1:1终态绑定，整单成功/失败不支持部分成功Q5，仅模拟台写入 BR-39）
CREATE TABLE ta_receipt (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    order_id                BIGINT UNSIGNED NOT NULL                COMMENT '交易单ID（唯一，一单一次回执）',
    receipt_no              VARCHAR(24)     NOT NULL                COMMENT 'TA确认编号（TA20261116001，唯一）',
    result                  TINYINT         NOT NULL                COMMENT '确认结果：1=成功 2=失败',
    confirm_date            DATE            NOT NULL                COMMENT '确认日期（T+1）',
    nav_date                DATE            NOT NULL                COMMENT '净值基准日（T日）',
    unit_nav                DECIMAL(11,4)   NOT NULL                COMMENT '确认净值（T日单位净值）',
    total_confirmed_amount   DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '确认金额合计（明细级见 trade_order_item）',
    total_fee               DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '实际费用合计',
    fail_reason             TINYINT         NOT NULL DEFAULT 0     COMMENT '失败原因（成功=0）：0=无 1=基金暂停申购 2=限购 3=暂停赎回 4=赎回受限 5=交易状态异常（BR-35）',
    received_at             DATETIME(3)     NOT NULL                COMMENT '回执接收时间（UTC）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除，本表禁止删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_id (order_id),
    UNIQUE KEY uk_receipt_no (receipt_no),
    KEY idx_received_at (received_at),
    CONSTRAINT chk_ta_result CHECK (result IN (1, 2))
) ENGINE = InnoDB COMMENT = 'TA回执：终态留痕（成功→按明细更新持仓现金 DF-13；失败→保持原状）';

-- 17. rebalance_advice — 投顾调仓建议（订单头，D4/4.4；状态机 BR-28~31）
CREATE TABLE rebalance_advice (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    advice_code             VARCHAR(16)     NOT NULL                COMMENT '建议编号（RA-2026-1114，唯一）',
    customer_user_id        BIGINT UNSIGNED NOT NULL                COMMENT '接收客户',
    advisor_user_id         BIGINT UNSIGNED NOT NULL                COMMENT '推送投顾',
    status                  TINYINT         NOT NULL DEFAULT 1     COMMENT '状态：1=PENDING待确认 2=CONFIRMED已确认·交易待确认 3=COMPLETED已跟调完成 4=REJECTED已暂不跟调 5=EXPIRED已过期 6=TA_FAILED TA确认失败（单向流转）',
    pushed_at               DATETIME(3)     NOT NULL                COMMENT '推送时间（UTC，BR-28）',
    valid_until             DATE            NOT NULL                COMMENT '有效期止（3个交易日，BR-30；过期扫描置5）',
    basis                   VARCHAR(255)    NOT NULL DEFAULT ''    COMMENT '建议依据（如“基于R3平衡型画像与最新持仓”）',
    reason                  VARCHAR(512)    NOT NULL DEFAULT ''    COMMENT '调出调入理由（F-U-302）',
    total_sell_amount       DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '调出金额合计（明细同事务汇总）',
    total_buy_amount        DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '调入金额合计',
    total_fee               DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '预计费用',
    turnover_rate           DECIMAL(7,4)    NOT NULL DEFAULT 0     COMMENT '换手率（%，CR-14）',
    asset_before            JSON            NULL                    COMMENT '调前四类权重（不检索）：{"equity":41.7,"bond":33.9,"money":15.3,"gold":9.1}',
    asset_after             JSON            NULL                    COMMENT '调后四类权重（不检索）',
    version                 INT             NOT NULL DEFAULT 0     COMMENT '乐观锁版本（确认/暂不/过期并发推进）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除，本表禁止删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_advice_code (advice_code),
    KEY idx_customer_status (customer_user_id, status),
    KEY idx_advisor_pushed (advisor_user_id, pushed_at),
    KEY idx_status_valid (status, valid_until)
) ENGINE = InnoDB COMMENT = '投顾调仓建议：推送后不可变；确认跟调生成调仓交易（DF-12），在途互斥校验在服务层（BR-31）';

-- 18. rebalance_advice_item — 建议明细（4.4；推送时快照，不可修改）
CREATE TABLE rebalance_advice_item (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    advice_id               BIGINT UNSIGNED NOT NULL                COMMENT '所属建议',
    fund_id                 BIGINT UNSIGNED NOT NULL                COMMENT '标的基金',
    operation               TINYINT         NOT NULL                COMMENT '操作：1=调出 2=调入 3=增持（F-U-303）',
    current_weight          DECIMAL(7,4)    NOT NULL DEFAULT 0     COMMENT '当前仓位（%，推送时快照）',
    target_weight           DECIMAL(7,4)    NOT NULL DEFAULT 0     COMMENT '目标仓位（%）',
    weight_change           DECIMAL(7,4)    NOT NULL DEFAULT 0     COMMENT '变化pp（目标−当前）',
    amount                  DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '调仓金额（CR-14；方向由 operation 区分，金额存正数）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除，推送后不可变）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_advice_fund (advice_id, fund_id),
    KEY idx_fund_id (fund_id)
) ENGINE = InnoDB COMMENT = '调仓建议明细：基金级调出/调入/增持快照（确认跟调后作为交易执行依据）';

-- 19. auto_invest_plan — 定投计划（D6/4.5；一用户一计划）
CREATE TABLE auto_invest_plan (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    user_id                 BIGINT UNSIGNED NOT NULL                COMMENT '归属用户（唯一）',
    monthly_amount          DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '每月定投总金额（演示5000）',
    execute_day             TINYINT         NOT NULL DEFAULT 1     COMMENT '每月执行日（1~28，演示8日）',
    status                  TINYINT         NOT NULL DEFAULT 1     COMMENT '状态：1=ACTIVE 2=PAUSED',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除；调整计划为UPDATE留痕审计，TODO-07）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_id (user_id),
    CONSTRAINT chk_aip_day CHECK (execute_day BETWEEN 1 AND 28),
    CONSTRAINT chk_aip_status CHECK (status IN (1, 2))
) ENGINE = InnoDB COMMENT = '定投计划：触发由调度任务按执行日生成定投交易（AD-10，模拟口径不真实扣款）';

-- 20. auto_invest_plan_fund — 定投基金明细（分配规则：逐基金金额指定，Q3评审确认）
CREATE TABLE auto_invest_plan_fund (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    plan_id                 BIGINT UNSIGNED NOT NULL                COMMENT '所属计划',
    fund_id                 BIGINT UNSIGNED NOT NULL                COMMENT '定投基金',
    monthly_amount          DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '该基金每月定投金额（合计须等于计划总额，应用层校验）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_plan_fund (plan_id, fund_id),
    KEY idx_fund_id (fund_id)
) ENGINE = InnoDB COMMENT = '定投基金明细：逐基金金额指定（TODO-07 弹窗编辑+二次确认）';

-- =====================================================================
-- 域四：策略与组合（D11/D17/D18/4.10~4.17 —— strategy、portfolio 模块）
-- =====================================================================

-- 21. strategy — 策略（D17/4.13；上下架/评级变更需投研评审，6.9 投顾无权限）
CREATE TABLE strategy (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    strategy_code           VARCHAR(16)     NOT NULL                COMMENT '策略编号（S-2026-01，唯一）',
    name                    VARCHAR(128)    NOT NULL                COMMENT '策略名称（如“稳健增值03号”）',
    category                TINYINT         NOT NULL                COMMENT '主分类：1=稳健增值 2=均衡增长 3=积极成长 4=固收+ 5=多资产（BR-04）',
    risk_level              TINYINT         NOT NULL                COMMENT '策略风险等级：1=R1 2=R2 3=R3 4=R4 5=R5（KYC硬约束 BR-05）',
    style_tags              JSON            NULL                    COMMENT '风格副标签（不检索，前端关键词过滤）：如“红利”“低波”“成长”',
    status                  TINYINT         NOT NULL DEFAULT 1     COMMENT '状态：1=在售 2=观察 3=下架',
    min_horizon_years       TINYINT         NOT NULL DEFAULT 0     COMMENT '最低投资期限（年，硬约束）',
    liquidity_level         TINYINT         NOT NULL DEFAULT 0     COMMENT '流动性等级：0=未设置 1=低 2=中 3=高（须≥客户流动性需求）',
    min_investment          DECIMAL(18,2)   NOT NULL DEFAULT 0     COMMENT '起投金额（硬约束，≤客户可投资产）',
    description             VARCHAR(512)    NOT NULL DEFAULT ''    COMMENT '策略说明',
    current_score           SMALLINT        NOT NULL DEFAULT 0     COMMENT '综合评分0~100（最新评价冗余，CR-11；与 strategy_score 同事务维护）',
    current_rating          TINYINT         NOT NULL DEFAULT 0     COMMENT '星级0~5（1~5星映射自评分）',
    last_evaluated_at       DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '最近评价时间（有效期6个月，BR-26健康监控依据）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除；下架走status=3）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_strategy_code (strategy_code),
    KEY idx_status_risk (status, risk_level),
    CONSTRAINT chk_strategy_risk CHECK (risk_level BETWEEN 1 AND 5),
    CONSTRAINT chk_strategy_status CHECK (status IN (1, 2, 3)),
    CONSTRAINT chk_strategy_score CHECK (current_score BETWEEN 0 AND 100)
) ENGINE = InnoDB COMMENT = '策略库：KYC硬约束+加权评分匹配的候选池（服务客户数/AUM实时聚合不落库）';

-- 22. strategy_asset_allocation — 策略大类配置（4.15/BR-21/22；每策略固定4行）
CREATE TABLE strategy_asset_allocation (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    strategy_id             BIGINT UNSIGNED NOT NULL                COMMENT '所属策略',
    asset_class             TINYINT         NOT NULL                COMMENT '资产大类（DR-05）：1=权益 2=债券 3=货币 4=黄金',
    saa_base_weight         DECIMAL(7,4)    NOT NULL DEFAULT 0     COMMENT 'SAA基准权重（%，四行合计100，应用校验）',
    saa_min_weight          DECIMAL(7,4)    NOT NULL DEFAULT 0     COMMENT 'SAA区间下限（%）',
    saa_max_weight          DECIMAL(7,4)    NOT NULL DEFAULT 0     COMMENT 'SAA区间上限（%）',
    taa_weight              DECIMAL(7,4)    NOT NULL DEFAULT 0     COMMENT 'TAA当前权重（%，合计100；±1pp调整、带内约束 BR-22）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_strategy_asset (strategy_id, asset_class),
    CONSTRAINT chk_saa_range CHECK (saa_min_weight >= 0 AND saa_max_weight <= 100 AND saa_min_weight <= saa_max_weight),
    CONSTRAINT chk_asset_class CHECK (asset_class IN (1, 2, 3, 4))
) ENGINE = InnoDB COMMENT = '策略SAA基准/区间带/TAA配置：SAA越界与TAA偏离告警的比对基准（BR-12）';

-- 23. strategy_fund_position — 策略基金权重（4.16/BR-23；模型组合基金层直接引用）
CREATE TABLE strategy_fund_position (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    strategy_id             BIGINT UNSIGNED NOT NULL                COMMENT '所属策略',
    fund_id                 BIGINT UNSIGNED NOT NULL                COMMENT '基金（须 is_pool_eligible=1，池内筛选）',
    target_weight           DECIMAL(7,4)    NOT NULL DEFAULT 0     COMMENT '目标权重（%，单基金≤25由rule引擎校验 BR-23）',
    position_role           TINYINT         NOT NULL DEFAULT 1     COMMENT '角色：1=核心 2=卫星 3=流动性',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_strategy_fund (strategy_id, fund_id),
    KEY idx_fund_id (fund_id),
    CONSTRAINT chk_position_role CHECK (position_role IN (1, 2, 3))
) ENGINE = InnoDB COMMENT = '策略基金层权重：单基金/单管理人/单行业集中度约束的检查对象';

-- 24. strategy_score — 策略评价历史（D18，7维评分；仅追加，评级下调触发健康告警 BR-26）
CREATE TABLE strategy_score (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    strategy_id             BIGINT UNSIGNED NOT NULL                COMMENT '策略',
    ret_score               SMALLINT        NOT NULL DEFAULT 0     COMMENT '收益评分0~100',
    vol_score               SMALLINT        NOT NULL DEFAULT 0     COMMENT '波动评分0~100',
    drawdown_score          SMALLINT        NOT NULL DEFAULT 0     COMMENT '最大回撤评分0~100',
    sharpe_score            SMALLINT        NOT NULL DEFAULT 0     COMMENT '夏普评分0~100',
    stability_score         SMALLINT        NOT NULL DEFAULT 0     COMMENT '稳定性评分0~100',
    capacity_score          SMALLINT        NOT NULL DEFAULT 0     COMMENT '容量评分0~100',
    fee_score               SMALLINT        NOT NULL DEFAULT 0     COMMENT '费率评分0~100',
    total_score             SMALLINT        NOT NULL DEFAULT 0     COMMENT '综合分0~100（CR-11，7维加权）',
    rating                  TINYINT         NOT NULL DEFAULT 0     COMMENT '星级1~5',
    evaluated_at            DATETIME(3)     NOT NULL                COMMENT '评价时间（UTC）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除，本表仅追加）',
    PRIMARY KEY (id),
    KEY idx_strategy_evaluated (strategy_id, evaluated_at),
    CONSTRAINT chk_ss_rating CHECK (rating BETWEEN 0 AND 5),
    CONSTRAINT chk_ss_total CHECK (total_score BETWEEN 0 AND 100)
) ENGINE = InnoDB COMMENT = '策略评价历史：7维评分留痕（最新值冗余于 strategy.current_score/current_rating）';

-- 25. model_portfolio — 模型组合（D11/4.10；三级引用中间层）
CREATE TABLE model_portfolio (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    portfolio_code          VARCHAR(16)     NOT NULL                COMMENT '组合编号（MP-301，唯一）',
    strategy_id             BIGINT UNSIGNED NOT NULL                COMMENT '引用策略（BR-24 三级引用）',
    name                    VARCHAR(128)    NOT NULL                COMMENT '组合名称（如“稳健增值03号 · 标准组合”）',
    status                  TINYINT         NOT NULL DEFAULT 1     COMMENT '状态：1=正常 2=观察',
    ytd_return              DECIMAL(9,4)    NOT NULL DEFAULT 0     COMMENT '年初至今收益（%，模拟主数据）',
    annual_volatility       DECIMAL(9,4)    NOT NULL DEFAULT 0     COMMENT '年化波动（%，模拟主数据）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_portfolio_code (portfolio_code),
    KEY idx_strategy_id (strategy_id),
    CONSTRAINT chk_mp_status CHECK (status IN (1, 2))
) ENGINE = InnoDB COMMENT = '模型组合：风险等级经join策略推导；基金层引用策略 strategy_fund_position（DDR-07）';

-- 26. model_portfolio_allocation — 模型组合大类权重三层（4.10，每组合固定4行）
CREATE TABLE model_portfolio_allocation (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    portfolio_id            BIGINT UNSIGNED NOT NULL                COMMENT '模型组合',
    asset_class             TINYINT         NOT NULL                COMMENT '资产大类：1=权益 2=债券 3=货币 4=黄金',
    saa_weight              DECIMAL(7,4)    NOT NULL DEFAULT 0     COMMENT 'SAA权重（%，继承策略并可带内微调，DF-09）',
    taa_weight              DECIMAL(7,4)    NOT NULL DEFAULT 0     COMMENT 'TAA当前权重（%）',
    actual_weight           DECIMAL(7,4)    NOT NULL DEFAULT 0     COMMENT '实际权重（%，模拟主数据口径，F-A-405三层对比）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_portfolio_asset (portfolio_id, asset_class)
) ENGINE = InnoDB COMMENT = '模型组合大类权重：SAA/TAA/实际三层展示与偏离计算（CR-08/09）';

-- 27. client_portfolio — 客户组合（4.17/BR-24；一客户一活跃组合，更换引用为UPDATE）
CREATE TABLE client_portfolio (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    customer_user_id        BIGINT UNSIGNED NOT NULL                COMMENT '客户用户ID（唯一，一客户一活跃组合）',
    model_portfolio_id      BIGINT UNSIGNED NOT NULL                COMMENT '引用模型组合（BR-24 必须引用）',
    status                  TINYINT         NOT NULL DEFAULT 1     COMMENT '状态：1=正常 2=待调仓 3=待沟通 4=跟进中（与 customer.service_status 联动）',
    last_reviewed_at        DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '最近投顾复核时间（零值=未复核）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_customer_user_id (customer_user_id),
    KEY idx_model_portfolio_id (model_portfolio_id),
    CONSTRAINT chk_cp_status CHECK (status IN (1, 2, 3, 4))
) ENGINE = InnoDB COMMENT = '客户组合：三级引用末层；实际大类权重由持仓实时聚合（DDR-02）';

-- 28. client_portfolio_allocation — 客户组合带内微调目标权重（BR-24）
CREATE TABLE client_portfolio_allocation (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    portfolio_id            BIGINT UNSIGNED NOT NULL                COMMENT '客户组合',
    asset_class             TINYINT         NOT NULL                COMMENT '资产大类：1=权益 2=债券 3=货币 4=黄金',
    target_weight           DECIMAL(7,4)    NOT NULL DEFAULT 0     COMMENT '微调后目标权重（%，初始=所引模型组合SAA；实际权重实时聚合不落库）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_portfolio_asset (portfolio_id, asset_class)
) ENGINE = InnoDB COMMENT = '客户组合微调目标权重：允许在SAA区间带内微调（BR-24）；越界与偏离由风险扫描比对告警';

-- =====================================================================
-- 域五：风险（D9/D10/4.7 —— risk 模块）
-- =====================================================================

-- 29. risk_rule — 风险规则（46条预置，D10/4.7；阈值编辑不在本期 DR-06）
CREATE TABLE risk_rule (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    rule_code               VARCHAR(16)     NOT NULL                COMMENT '规则编号（唯一，风险事件引用展示）',
    rule_type               TINYINT         NOT NULL                COMMENT '规则类型：1=KYC适配 2=SAA区间 3=TAA偏离 4=集中度 5=流动性 6=回撤 7=策略健康',
    name                    VARCHAR(64)     NOT NULL                COMMENT '规则名称',
    default_level           TINYINT         NOT NULL DEFAULT 2     COMMENT '触发默认级别：1=高 2=中 3=低（可被扫描上下文覆盖）',
    threshold               JSON            NULL                    COMMENT '阈值参数（不检索，各规则结构不同）：如{"maxFundWeight":25,"maxManagerWeight":35}',
    coverage_rate           DECIMAL(5,2)    NOT NULL DEFAULT 0     COMMENT '示意覆盖度（%，4.7检查范围静态展示）',
    enabled                 TINYINT(1)      NOT NULL DEFAULT 1     COMMENT '是否启用（0=停用）',
    description             VARCHAR(512)    NOT NULL DEFAULT ''    COMMENT '规则说明（含约束公式）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除；停用走 enabled=0）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_rule_code (rule_code),
    CONSTRAINT chk_rr_type CHECK (rule_type BETWEEN 1 AND 7),
    CONSTRAINT chk_rr_level CHECK (default_level IN (1, 2, 3))
) ENGINE = InnoDB COMMENT = '风险规则：rule引擎集中读取（NFR-M4）；AI不得修改阈值与评级';

-- 30. risk_event — 风险事件（D9/4.7；复核是唯一状态推进，不可删除）
CREATE TABLE risk_event (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    event_code              VARCHAR(20)     NOT NULL                COMMENT '事件编号（唯一，通知/审计引用）',
    rule_id                 BIGINT UNSIGNED NOT NULL DEFAULT 0     COMMENT '命中规则ID（0=非规则引擎来源，预留）',
    category                TINYINT         NOT NULL                COMMENT '风险分类（DF-10筛选维度）：1=KYC与策略适配 2=SAA/TAA偏离 3=集中度与流动性 4=回撤与策略健康',
    level                   TINYINT         NOT NULL                COMMENT '风险级别：1=高 2=中 3=低（BR-12分级，红/金/青绿）',
    source_object_type      TINYINT         NOT NULL DEFAULT 0     COMMENT '来源对象类型（多态）：0=无 1=客户 2=策略 3=模型组合 4=客户组合 5=基金',
    source_object_id        BIGINT UNSIGNED NOT NULL DEFAULT 0     COMMENT '来源对象主键（多态引用，应用层解释）',
    source_object_name      VARCHAR(128)    NOT NULL DEFAULT ''    COMMENT '来源对象名称快照（客户名/策略名；展示冗余以源表为准）',
    title                   VARCHAR(128)    NOT NULL                COMMENT '事件标题（如“陈悦 · 策略风险等级不匹配”）',
    detail                  VARCHAR(1024)   NOT NULL DEFAULT ''    COMMENT '事件详情（具体数据与建议；权重/偏离扫描数值快照于此）',
    occurred_at             DATETIME(3)     NOT NULL                COMMENT '发生时间（UTC；列表排序 occurred_at DESC, id DESC）',
    review_status           TINYINT         NOT NULL DEFAULT 1     COMMENT '处置状态：1=未复核 2=已复核（BR-11，复核后红点/计数递减）',
    reviewed_by_user_id     BIGINT UNSIGNED NOT NULL DEFAULT 0     COMMENT '复核投顾用户ID',
    reviewed_at             DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '复核时间（零值=未复核）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除，本表禁止删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_event_code (event_code),
    KEY idx_review_level_category (review_status, level, category),
    KEY idx_occurred (occurred_at),
    KEY idx_source (source_object_type, source_object_id),
    KEY idx_rule_id (rule_id),
    CONSTRAINT chk_re_level CHECK (level IN (1, 2, 3)),
    CONSTRAINT chk_re_category CHECK (category BETWEEN 1 AND 4),
    CONSTRAINT chk_re_review CHECK (review_status IN (1, 2))
) ENGINE = InnoDB COMMENT = '风险事件：规则扫描生成（46条规则，G5），未复核计数驱动红点（CR-06）';

-- =====================================================================
-- 域六：报告与审批（D12/D13/4.8/4.11 —— report、approval 模块）
-- =====================================================================

-- 31. report — 投顾报告（D12/4.8；AI产物一律草案，DR-03/AD-11）
CREATE TABLE report (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    report_code             VARCHAR(20)     NOT NULL                COMMENT '报告编号（R-YYYY-NNNN，唯一，Q8评审确认）',
    report_type             TINYINT         NOT NULL                COMMENT '报告类型：1=客户配置建议书 2=组合诊断报告 3=季度服务报告',
    advisor_user_id         BIGINT UNSIGNED NOT NULL                COMMENT '生成投顾',
    customer_user_id        BIGINT UNSIGNED NOT NULL                COMMENT '关联客户（格式“姓名 · 风险画像”）',
    strategy_id             BIGINT UNSIGNED NOT NULL                COMMENT '关联策略（BR-27 一致性：与客户当前策略一致或草案说明理由）',
    status                  TINYINT         NOT NULL DEFAULT 1     COMMENT '状态：1=TEMPLATE_PREVIEW模板预览 2=AI_DRAFT草案待复核 3=UNDER_REVIEW复核审批中 4=APPROVED已通过（切换条件回退1，BR-09/ER-11）',
    content                 JSON            NULL                    COMMENT '报告五节结构化内容（不检索）：投资目标/策略与配置框架/组合表现/风险与适当性/建议与免责声明',
    generated_at            DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT 'AI草案生成时间（零值=未生成）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_report_code (report_code),
    KEY idx_advisor_status (advisor_user_id, status),
    KEY idx_customer_id (customer_user_id),
    KEY idx_strategy_id (strategy_id),
    CONSTRAINT chk_rp_type CHECK (report_type BETWEEN 1 AND 3),
    CONSTRAINT chk_rp_status CHECK (status BETWEEN 1 AND 4)
) ENGINE = InnoDB COMMENT = '投顾报告：AI初稿不具对外效力（BR-10），须复核+合规审批后方可进入客户沟通';

-- 32. approval_item — 审批事项（D13/4.11；复核通过幂等恒定 BR-08）
CREATE TABLE approval_item (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    approval_code           VARCHAR(16)     NOT NULL                COMMENT '事项编号（P-2026-1120，唯一）',
    item_type               TINYINT         NOT NULL                COMMENT '事项类型：1=SAA审议 2=TAA调整 3=基金调仓 4=配置建议 5=客户报告 6=现金流配置',
    level                   TINYINT         NOT NULL                COMMENT '审批层级（BR-25分层频率）：1=SAA 2=TAA 3=基金 4=客户',
    source_object_type      TINYINT         NOT NULL DEFAULT 0     COMMENT '关联对象类型（多态）：0=无 1=报告 2=调仓建议 3=策略 4=模型组合 5=客户组合',
    source_object_id        BIGINT UNSIGNED NOT NULL DEFAULT 0     COMMENT '关联对象主键',
    target_name             VARCHAR(128)    NOT NULL DEFAULT ''    COMMENT '关联对象名称快照（如“稳健增值03号”“李婧·客户报告”）',
    check_status            TINYINT         NOT NULL                COMMENT '规则校验状态：1=适当性检查通过 2=区间带检查通过 3=集中度提示待补充 4=风险提示待补充（3/4为金色警示）',
    approve_status          TINYINT         NOT NULL DEFAULT 1     COMMENT '审批状态：1=待复核 2=已通过（恒定不可回退，BR-08）',
    approver_user_id        BIGINT UNSIGNED NOT NULL DEFAULT 0     COMMENT '复核人用户ID',
    approved_at             DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '通过时间（零值=未通过）',
    version                 INT             NOT NULL DEFAULT 0     COMMENT '乐观锁版本（并发复核幂等）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除，本表禁止删除）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_approval_code (approval_code),
    KEY idx_status_level (approve_status, level),
    KEY idx_source (source_object_type, source_object_id),
    CONSTRAINT chk_ai_type CHECK (item_type BETWEEN 1 AND 6),
    CONSTRAINT chk_ai_level CHECK (level BETWEEN 1 AND 4),
    CONSTRAINT chk_ai_check CHECK (check_status BETWEEN 1 AND 4),
    CONSTRAINT chk_ai_status CHECK (approve_status IN (1, 2))
) ENGINE = InnoDB COMMENT = '审批队列：复核通过写审计（DF-06）；分层审批不得合并跳过（BR-07/25）';

-- =====================================================================
-- 域七：通知与AI（D14/D16/4.9/4.12 —— notification、agent 模块）
-- =====================================================================

-- 33. notification — 通知（D16/4.12/TODO-09；由event_outbox派发生成，AD-06）
CREATE TABLE notification (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    user_id                 BIGINT UNSIGNED NOT NULL                COMMENT '接收用户（双端共用一表，按登录角色过滤类型）',
    notify_type             TINYINT         NOT NULL                COMMENT '通知类型：1=风险告警(投顾) 2=待审批方案(投顾) 3=报告复核(投顾) 4=调仓建议待确认(用户) 5=运营通知(用户)',
    ref_object_type         TINYINT         NOT NULL DEFAULT 0     COMMENT '跳转对象类型（多态）：0=无 1=风险事件 2=审批事项 3=报告 4=调仓建议 5=策略',
    ref_object_id           BIGINT UNSIGNED NOT NULL DEFAULT 0     COMMENT '跳转对象主键（点击单条跳转对应页面）',
    title                   VARCHAR(128)    NOT NULL                COMMENT '标题（如“陈悦 · 权益比例超限”）',
    summary                 VARCHAR(255)    NOT NULL DEFAULT ''    COMMENT '摘要',
    read_at                 DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '已读时间（零值=未读；红点=未读计数，Redis缓存+30s轮询 AD-13）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除；已读不删）',
    PRIMARY KEY (id),
    KEY idx_user_read (user_id, read_at),
    KEY idx_user_created (user_id, created_at),
    CONSTRAINT chk_nt_type CHECK (notify_type BETWEEN 1 AND 5)
) ENGINE = InnoDB COMMENT = '通知：投顾端三类+用户端运营通知；点击置已读（单向），红点计数走Redis';

-- 34. chat_session — AI会话（D14）
CREATE TABLE chat_session (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    user_id                 BIGINT UNSIGNED NOT NULL                COMMENT '会话用户',
    client_mode             TINYINT         NOT NULL                COMMENT '发起端：1=用户端(AI理财助手) 2=投顾端(投顾Copilot)',
    last_message_at         DATETIME(3)     NOT NULL                COMMENT '最近消息时间（UTC，会话列表排序）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除）',
    PRIMARY KEY (id),
    KEY idx_user_last_message (user_id, last_message_at),
    CONSTRAINT chk_cs_mode CHECK (client_mode IN (1, 2))
) ENGINE = InnoDB COMMENT = 'AI对话会话：上下文注入与留痕的会话单元（7.2）';

-- 35. chat_message — 对话消息（D14/4.9；仅追加留痕，AD-04/AD-07）
CREATE TABLE chat_message (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    session_id              BIGINT UNSIGNED NOT NULL                COMMENT '所属会话',
    sender_role             TINYINT         NOT NULL                COMMENT '发送方：1=user 2=assistant',
    content                 TEXT            NOT NULL                COMMENT '消息文本（纯文本保留换行；已HTML转义并清理Markdown符号，AD-07；用户输入≤300字符应用层校验）',
    generation_mode         TINYINT         NOT NULL DEFAULT 1     COMMENT 'assistant生成方式：1=LLM流式 2=关键词路由降级（回复标注“简化模式”，7.3；user消息恒1）',
    context_snapshot        JSON            NULL                    COMMENT '上下文快照留痕（不检索）：工作区状态/客户KYC/SAA-TAA/持仓摘要（7.2/DR-03）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除，本表禁止删除）',
    PRIMARY KEY (id),
    KEY idx_session_created (session_id, created_at),
    CONSTRAINT chk_cm_sender CHECK (sender_role IN (1, 2)),
    CONSTRAINT chk_cm_mode CHECK (generation_mode IN (1, 2))
) ENGINE = InnoDB COMMENT = 'AI对话消息：消息完成追平后落库（打字机链路），含免责声明由应用层追加';

-- =====================================================================
-- 域八：平台与合规基座（D15/BR-30/34/AD-06/AD-10 —— audit、platform 模块）
-- =====================================================================

-- 36. audit_log — 审计日志（D15/NFR-S2；仅追加不可篡改，检索遵循F13边界 TODO-06）
CREATE TABLE audit_log (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    actor_user_id           BIGINT UNSIGNED NOT NULL DEFAULT 0     COMMENT '操作人用户ID（0=系统任务/TA模拟台）',
    actor_role              TINYINT         NOT NULL DEFAULT 0     COMMENT '操作人角色：0=系统 1=investor 2=advisor 3=TA模拟台',
    action                  TINYINT         NOT NULL                COMMENT '动作：1=生成 2=校验 3=复核 4=审批 5=执行 6=登录 7=导出 8=提交',
    object_type             VARCHAR(32)     NOT NULL                COMMENT '对象类型（表名或业务对象名，如 trade_order、report）',
    object_id               BIGINT UNSIGNED NOT NULL DEFAULT 0     COMMENT '对象主键',
    object_name             VARCHAR(128)    NOT NULL DEFAULT ''    COMMENT '对象业务编号快照（RA-…/T-…/P-…，检索结果直读）',
    detail                  JSON            NULL                    COMMENT '动作明细（不检索：变更前后状态、失败原因等）',
    trace_id                VARCHAR(64)     NOT NULL DEFAULT ''    COMMENT '链路追踪ID（对账与排查）',
    occurred_at             DATETIME(3)     NOT NULL                COMMENT '发生时间（UTC；检索排序 occurred_at DESC, id DESC）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC，恒不更新）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（恒零值；审计永不删除，规范必备四列声明性预留）',
    PRIMARY KEY (id),
    KEY idx_occurred (occurred_at),
    KEY idx_actor (actor_user_id, occurred_at),
    KEY idx_object (object_type, object_id),
    KEY idx_trace (trace_id),
    CONSTRAINT chk_al_role CHECK (actor_role IN (0, 1, 2, 3)),
    CONSTRAINT chk_al_action CHECK (action BETWEEN 1 AND 8)
) ENGINE = InnoDB COMMENT = '审计日志：仅追加（应用不提供UPDATE/DELETE通道）；检索时间范围[from,to)左闭右开，只读GET /api/v1/audit-logs';

-- 37. trading_day — 交易日历（BR-30/BR-34/定投执行日；声明性偏离：date列主键）
CREATE TABLE trading_day (
    cal_date                DATE            NOT NULL                COMMENT '日历日（主键，预生成3年）',
    is_trading_day          TINYINT(1)      NOT NULL DEFAULT 1     COMMENT '是否交易日：1=是 0=否（周末/节假日）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    PRIMARY KEY (cal_date)
) ENGINE = InnoDB COMMENT = '交易日历：有效期3个交易日、T+1确认、定投执行日计算依据（AD-10调度读取）';

-- 38. event_outbox — 事务性发件箱（AD-06；跨模块异步协作：风险→通知、审批→通知等）
CREATE TABLE event_outbox (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    event_type              VARCHAR(64)     NOT NULL                COMMENT '事件类型（如 risk.event.created、approval.passed、advice.pushed）',
    aggregate_type          VARCHAR(32)     NOT NULL                COMMENT '聚合根类型（表名）',
    aggregate_id            BIGINT UNSIGNED NOT NULL                COMMENT '聚合根主键',
    payload                 JSON            NOT NULL                COMMENT '事件负载（不检索）',
    dispatch_status          TINYINT         NOT NULL DEFAULT 1     COMMENT '派发状态：1=PENDING 2=DISPATCHED 3=FAILED',
    retry_count             TINYINT         NOT NULL DEFAULT 0     COMMENT '重试次数',
    next_retry_at            DATETIME(3)     NOT NULL                COMMENT '下次派发时间（UTC，失败退避）',
    dispatched_at           DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '派发完成时间（零值=未派发）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除；已派发行保留30天后清理任务物理删除）',
    PRIMARY KEY (id),
    KEY idx_status_next (dispatch_status, next_retry_at),
    KEY idx_aggregate (aggregate_type, aggregate_id),
    CONSTRAINT chk_eo_status CHECK (dispatch_status IN (1, 2, 3))
) ENGINE = InnoDB COMMENT = '事件发件箱：与业务同事务写入，调度派发（多实例经租约选主），幂等派发';

-- 39. processor_lease — 调度租约（AD-10；多实例选主）
CREATE TABLE processor_lease (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    processor_name          VARCHAR(64)     NOT NULL                COMMENT '任务名（唯一）：advice.expire-scan/risk.rule-scan/outbox.dispatch/autoinvest.trigger/asset.snapshot',
    lease_owner             VARCHAR(64)     NOT NULL DEFAULT ''    COMMENT '持有实例标识',
    lease_expires_at        DATETIME(3)     NOT NULL                COMMENT '租约到期时间（UTC，心跳续约）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除，无删除场景）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_processor_name (processor_name)
) ENGINE = InnoDB COMMENT = '调度租约：Spring Scheduling任务选主（无删除场景）';

-- 40. idempotency_key — 幂等键（关键写操作防重：创建/确认建议、SSE发消息等）
CREATE TABLE idempotency_key (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    idem_key                VARCHAR(64)     NOT NULL                COMMENT '幂等键（唯一，16-64位[A-Za-z0-9_-]，全局唯一防重放）',
    user_id                 BIGINT UNSIGNED NOT NULL                COMMENT '操作人（冲突校验）',
    request_path            VARCHAR(128)    NOT NULL                COMMENT '请求接口（如 POST /api/v1/advices）',
    request_digest          VARCHAR(64)     NOT NULL DEFAULT ''    COMMENT '请求体摘要（同key不同body→校验失败拒绝）',
    response_digest         VARCHAR(64)     NOT NULL DEFAULT ''    COMMENT '首次响应摘要（重复提交回放）',
    expires_at              DATETIME(3)     NOT NULL                COMMENT '过期时间（UTC；过期行7天由清理任务物理删除）',
    created_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间（UTC）',
    updated_at              DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间（UTC）',
    deleted_at              DATETIME(3)     NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '逻辑删除时间（零值=未删除；本表过期即物理清理）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_idem_key (idem_key),
    KEY idx_expires_at (expires_at)
) ENGINE = InnoDB COMMENT = '幂等键：关键写操作携带Idempotency-Key（工程惯例），防状态机操作重复提交';

-- =====================================================================
-- 全量建库脚本结束（41张表；种子演示数据见实施阶段初始脚本 V001）
-- 演进预留（本期不建）：quant_task / quant_result（架构 7.6）
-- =====================================================================

