# Redis 开发规范

适用 Redis 6.0+，单体项目单实例部署（不涉及 Cluster）

## 一、键值设计

- Key 结构 `业务:对象:标识`，冒号分隔且全程可读，如 `order:1001:detail`。
- Key 长度 ≤128 字符；禁把整段 JSON、URL 或 SQL 语句当 Key。
- Key 只用字母、数字、`:`、`_`、`-`；禁空格、换行、引号与转义字符。
- 业务前缀与模块一一对应且全库唯一，禁多人各自造前缀。
- 单个 String 值 ≤10KB；超出必须压缩（Snappy / LZ4）或改用 Hash 分字段。
- Hash / List / Set / ZSet 元素数 ≤5000；超出必须拆分，如 `user:1001:sub_01`。
- 单 Key 内存占用 ≤10MB 为硬上限，超过即判定大 Key，必须重构。
- 禁把大对象整体序列化进单个 String（整表列表、全量配置、全量字典）。
- 热 Key（单 Key QPS 占比 >10%）必须拆成多个子 Key 或加本地缓存。
- 缓存与库的一致性用「先更新库、再删缓存」，禁先删缓存后写库。
- 缓存空值必须带短 TTL（≤60s），防穿透直接压到数据库。
- 原子计数用 `INCR` / `HINCRBY`，禁「读出来、加一、写回去」。

## 二、命令使用

- 禁 `KEYS`：遍历一律用 `SCAN`（`COUNT 1000`，游标循环到 0）。
- 禁 `FLUSHALL` / `FLUSHDB`：仅在物理隔离的测试实例可用。
- 禁生产长开 `MONITOR`：调试短时开启，限定时长并事后确认关闭。
- 禁 `DEL` 删大 Key：用 `UNLINK` 异步删除；集合类用 `HSCAN`+`HDEL`、`SSCAN`+`SREM`、`ZSCAN`+`ZREM` 渐进删。
- 批量读写用 `MSET` / `MGET` 或 Pipeline，禁循环单条调用。
- Pipeline 单批 ≤500 条命令，防单次网络包过大。
- 取数量用 `HLEN` / `SCARD` / `ZCARD`，禁 `HGETALL` / `SMEMBERS` 后客户端计数。
- 集合运算用 `SINTERSTORE` / `ZINTERSTORE` 在服务端算，禁拉回客户端求交并。
- 禁 `LRANGE key 0 -1` 取全量列表；分页取，单次 ≤500 条。
- 遍历大集合用 `HSCAN` / `SSCAN` / `ZSCAN`，禁一次取全量。
- 设值必须同时设过期：`SET key val EX 300`，禁先 `SET` 再单独 `EXPIRE`（中间失败即永久 Key）。
- Lua 脚本执行 ≤10ms，禁在脚本内做全量遍历、大计算或调用外部系统。
- 事务只放无条件写入；需要「读后判断再写」的用 Lua，禁 `MULTI` 里塞条件逻辑。

## 三、生命周期与内存

- 所有缓存 Key 必须设 TTL；持久化数据也必须有明确清理策略。
- TTL 必须加随机抖动：`base + random(0, 300)` 秒，防同一时刻批量失效。
- 同一业务 TTL 上限 ≤7 天，超出需评审；永久 Key 必须单独规划 Key 空间。
- 开启 `lazyfree-lazy-expire yes` 与 `lazyfree-lazy-eviction yes`，防过期、淘汰阻塞主线程。
- 必须显式配置 `maxmemory`（物理内存 70%）与 `maxmemory-policy`；纯缓存用 `allkeys-lru`，禁 `noeviction`。
- 单实例内存使用率 ≤80%；超出先治理大 Key 与无 TTL Key，再升配，禁调大淘汰阈值硬扛。
- 大 Key 禁设短 TTL，防集中过期触发同步删除；改用异步删除或主动清理。
- 禁把 Redis 当唯一存储；确需持久化的必须开 AOF + RDB，并做过恢复演练。
- 冷数据下沉到 DB 或对象存储，禁长期驻留 Redis 当历史库。

## 四、部署、安全与客户端

- 单实例即可满足单体项目；不启用 Cluster，避免 Slot 与跨 Key 限制带来的额外约束。
- 单实例为全站共享，任一慢命令阻塞所有业务：必须开 `slowlog-log-slower-than 10000`、`slowlog-max-len 1024`，每周检查慢日志。
- 统一使用 db0，靠 Key 前缀隔离业务；禁 `SELECT` 切库（监控、备份、迁移都会失效）。
- 单实例无副本，故障恢复只靠快照：必须保留 `save 900 1 / 300 10 / 60 10000` 策略，快照文件异地备份一份。
- 必须有熔断降级：Redis 超时或不可用时业务走 DB 或返回兜底值，禁把缓存故障放大成全站故障。
- 改掉默认端口 6379；启用 ACL（6.0+）按应用分配最小权限账号，禁共用 `default`。
- 绑内网 IP + 安全组白名单，禁公网直连；必须外网访问时走跳板或代理。
- 禁关闭 `protected-mode` 裸奔；`requirepass` 用强口令，且各环境不同。
- 业务账号禁 `CONFIG SET`、`SHUTDOWN` 等管理权限；`KEYS`、`FLUSHALL` 用 ACL 或 `rename-command` 禁用。
- 连接池按「应用实例数 × `maxTotal` ≤ `maxclients` 的 70%」估算，`minIdle` ≥10，`testOnBorrow=true`。
- 客户端必须设超时：连接 ≤1s、读 ≤500ms、写 ≤500ms；禁无限等待。
- 监控必看：内存使用率、连接数、命中率、每秒淘汰数、慢查询数。
- 告警阈值：内存 >80%、连接数超 `maxclients` 70%、每秒淘汰 >100、慢查询持续 >10ms。
