# J-Flow 本地文件夹同步实现前规格（V1）

## 文档定位

这份文档是在 [sync-design.md](./sync-design.md) 基础上继续细化的“实现前规格”。

它的目标不是直接提供代码，而是让后续 Codex 或开发者能够按步骤开始实现第一版同步能力。

本文档继续遵守当前边界：

- 不做账号系统
- 不做云服务器
- 不做 WebDAV
- 不做自动同步
- 不做实时同步
- 不同步 SQLite 文件本体
- 不把 JSON 备份当同步包

---

## 一、同步文件夹结构

第一版建议采用固定目录结构，让不同设备写入和读取时都能保持一致。

建议结构如下：

```text
J-Flow Sync/
  sync-info.json
  devices/
    <deviceId>.json
  items/
    settings/
    sceneTags/
    activityTypes/
    taskTemplates/
    recurringTaskInstances/
    dayPlanItems/
    logbookEntries/
    segmentedProgressLogs/
  tombstones/
    settings/
    sceneTags/
    activityTypes/
    taskTemplates/
    recurringTaskInstances/
    dayPlanItems/
    logbookEntries/
    segmentedProgressLogs/
  locks/
```

### 1. `sync-info.json`

用途：

- 标识这是一个 J-Flow 同步目录
- 记录同步格式版本
- 记录最近一次同步目录写入时间
- 作为后续升级同步格式时的入口

### 2. `devices/`

用途：

- 每台设备写入自己的设备信息
- 用于辅助排查“最后是谁同步过”
- 不承载业务主数据

### 3. `items/`

用途：

- 保存当前可同步实体的最新共享状态
- 每类实体一个子目录
- 每条实体一份文件

### 4. `tombstones/`

用途：

- 保存删除记录
- 让“删除”这件事也能被另一台设备看见
- 防止一台设备刚删掉的数据，被另一台设备旧副本重新写回来

### 5. `locks/`

用途：

- 同步时放置临时锁文件
- 降低两台设备同时写同步目录时的覆盖风险
- 第一版只做最小锁机制，不做复杂分布式锁

### 6. `entityType` 与目录名映射

为了避免实现时混用“单数 entityType”和“复数目录名”，第一版建议固定映射如下：

| `entityType` | `items/` 目录名 | `tombstones/` 目录名 |
| --- | --- | --- |
| `settings` | `settings/` | `settings/` |
| `sceneTag` | `sceneTags/` | `sceneTags/` |
| `activityType` | `activityTypes/` | `activityTypes/` |
| `taskTemplate` | `taskTemplates/` | `taskTemplates/` |
| `recurringTaskInstance` | `recurringTaskInstances/` | `recurringTaskInstances/` |
| `dayPlanItem` | `dayPlanItems/` | `dayPlanItems/` |
| `logbookEntry` | `logbookEntries/` | `logbookEntries/` |
| `segmentedProgressLog` | `segmentedProgressLogs/` | `segmentedProgressLogs/` |

实现建议：

- 代码中维护一份统一映射表
- 不要在多个模块里手写目录名
- item 读写、tombstone 读写、扫描目录都通过同一映射取值

---

## 二、同步 item 文件格式

第一版建议每个同步实体都写成独立 JSON 文件，最小格式如下：

```json
{
  "syncVersion": 1,
  "entityType": "dayPlanItem",
  "id": "item-123",
  "updatedAt": "2026-05-18T10:30:00.000Z",
  "deletedAt": null,
  "deviceId": "device-macbook-a1b2",
  "data": {
    "...": "实体本体"
  }
}
```

### 1. `data`

含义：

- `data` 里放实体本体
- 内容应尽量贴近当前业务实体结构
- 不在这一层混入备份用途字段

### 2. `updatedAt`

含义：

- 表示这条同步实体最近一次有效修改时间
- 由业务修改发生时写入，而不是由导出 sync item 时临时刷新
- 第一版冲突判断主要依赖它

第一版必须明确：

- 不允许每次导出 sync item 时无脑刷新 `updatedAt`
- 否则会把“没有业务变化”的数据误判成“刚刚更新过”
- 这会直接破坏 `last-write-wins` 的正确性

第一版推荐要求：

- 参与同步的实体必须有稳定的“最后业务修改时间”
- 这个时间应在实体真实被新增、编辑、恢复、完成、删除前的最后一次有效写入时更新

如果当前某类实体还没有稳定的 `updatedAt`：

- Sync 1 需要补本地 sync metadata 或实体 `updatedAt` 机制
- 旧数据也需要初始化 `updatedAt`

旧数据初始化建议：

- 若实体本身已有 `updatedAt`，优先使用该字段
- 若没有，则回落到：
  - `createdAt`
  - 或当前一次性初始化时间

第一版可以接受“旧数据初始化时间不完全精确”，但初始化完成后必须稳定。

### 3. `deletedAt`

含义：

- 正常存在时为 `null`
- 当实体已被删除时，删除记录应进入 tombstone 文件
- 第一版不建议在 `items/` 中把删除态继续作为正式主记录长期保留

### 4. `entityType`

建议命名统一采用单数小驼峰：

- `settings`
- `sceneTag`
- `activityType`
- `taskTemplate`
- `recurringTaskInstance`
- `dayPlanItem`
- `logbookEntry`
- `segmentedProgressLog`

### 5. 文件名

建议规则：

- 文件名直接使用实体 `id`
- 后缀统一为 `.json`

例如：

- `items/dayPlanItems/item-123.json`
- `items/taskTemplates/template-456.json`

`settings` 是特例，建议固定为：

- `items/settings/app-settings.json`
- `tombstones/settings/app-settings.json`

### 6. 写入方式

第一版建议采用：

- 先写入临时文件
- 再原子替换正式文件

原因：

- 避免另一台设备读到半写入状态
- 降低云盘同步途中出现破损 JSON 的风险

建议心智是：

- “所有同步文件都应以完整文件形式出现”

### 7. `sync-info.json` 最小字段建议

第一版建议 `sync-info.json` 至少包含：

```json
{
  "syncVersion": 1,
  "createdAt": "2026-05-18T10:00:00.000Z",
  "updatedAt": "2026-05-18T10:30:00.000Z",
  "appName": "J-Flow",
  "minSupportedAppVersion": "0.1.0"
}
```

字段说明：

- `syncVersion`
  - 当前同步目录格式版本
- `createdAt`
  - 同步目录第一次初始化时间
- `updatedAt`
  - 最近一次有设备成功写入同步目录的时间
- `appName`
  - 用于识别这是否是 J-Flow 的同步目录
- `minSupportedAppVersion`
  - 可选
  - 未来若同步格式升级，可用于阻止过旧客户端误写

---

## 三、删除同步规则

删除同步第一版必须明确用 tombstone。

### 1. 删除实体时写 tombstone

当设备删除某条实体时：

- 不能只删本地 SQLite 记录
- 也不能只删同步目录中的 item 文件
- 必须写入一条 tombstone 记录

同时第一版还必须明确：

- 不能只依赖远端 tombstone

如果本机在“尚未同步”的状态下删除了一条实体，下一次同步时，本机仍必须知道：

- 这条实体已经在本地被删除
- 这次要把删除写到同步文件夹里

因此 Sync 1 或 Sync 3 需要设计本地删除记录机制，推荐候选有两种：

- 本地 tombstone 记录
- 本地 `sync_changes` / `deleted_entities` 记录

第一版推荐方案：

- 优先采用本地 `sync_changes` 或 `deleted_entities` 记录
- 同步执行时再把删除导出为同步目录中的 tombstone 文件

### 2. tombstone 如何同步到另一台设备

另一台设备同步时：

- 读取 `tombstones/<entityType>/`
- 如果发现某条 tombstone 比本地实体更新
- 就应在本地执行删除或标记删除逻辑

同时本机也要把自己尚未上送的删除记录导出到：

- `tombstones/<entityType>/`

### 3. 为什么不能只删除 item 文件

因为“文件没了”不等于“用户明确删除了它”。

只删文件会带来两个问题：

- 另一台设备无法区分“这是被删了”还是“这个文件还没同步过来”
- 另一台设备可能把自己的旧副本再写回来，导致删除失效

### 4. tombstone 保留多久

第一版建议：

- tombstone 长期保留
- 暂不做自动清理

理由：

- 第一版先优先保证删除不会丢
- 等同步链路稳定后，再考虑清理策略

### 5. 第一版是否做 tombstone 清理

第一版结论：

- 暂不做 tombstone 清理

### 6. 本地删除记录的推荐设计

第一版推荐：

- 不把“本地删除是否待同步”这件事寄希望于扫描 SQLite 最终状态
- 而是在本机单独维护同步元数据

建议至少能回答三件事：

- 哪条实体被删了
- 是什么类型的实体
- 这条删除是否已经成功写入同步目录

这样即使本机已经看不到这条实体正文，下一次同步仍然知道要写 tombstone。

---

## 四、deviceId 规则

### 1. 生成时机

第一次启用同步时生成 `deviceId`。

### 2. 存放位置

第一版建议：

- `deviceId` 保存在本机本地配置中
- 可以位于本机 SQLite 的 meta / 本地同步配置区
- 也可以位于专门的本机同步配置文件

第一版不要求现在就确定最终是 SQLite 还是本地配置文件，但必须保证：

- 同一台设备重启后仍保持稳定

### 3. 是否同步

`deviceId` 不同步。

原因：

- 它代表的是“这台设备是谁”
- 不是跨设备共享业务数据

### 4. 是否在设置页高级信息里显示

第一版建议：

- 可以显示在设置页高级信息中
- 但不要求第一版同步功能一开始就对普通用户突出展示

### 5. `devices/<deviceId>.json` 记录什么

建议记录最小信息：

```json
{
  "syncVersion": 1,
  "deviceId": "device-macbook-a1b2",
  "deviceName": "Yetingzhi MacBook",
  "platform": "darwin",
  "appVersion": "0.1.0",
  "lastSyncedAt": "2026-05-18T10:30:00.000Z"
}
```

用途：

- 帮助排查同步来源
- 让目录里能看出有哪些设备参与过同步

### 6. 本地同步元数据建议

第一版推荐在本机同时维护最小同步元数据，至少包含：

- `deviceId`
- `lastSyncedAt`
- 最近一次成功同步结果
- 本地待同步删除记录或本地待同步变更记录

`lastSyncedAt` 的职责是：

- 作为“读取本地自上次同步后的变化”的时间边界

它不应放在同步目录中作为共享字段，而应由每台设备各自维护本地值。

---

## 五、冲突规则细化

第一版采用 `last-write-wins`，但需要明确比较口径。

### 1. 比较字段

优先比较：

- `deletedAt`
- `updatedAt`

原则：

- 如果一方有更新更晚的 `deletedAt`，删除胜出
- 否则比较 `updatedAt`
- 时间更晚的一方胜出

第一版的前提假设是：

- 各设备系统时间基本准确

已知边界：

- 如果两台设备时间严重不一致
- “最后修改的一方胜出”可能不符合用户直觉

第一版接受这个限制，暂不处理：

- logical clock
- per-device revision compare
- server-assigned ordering

### 2. 修改 vs 修改

规则：

- 两边都修改同一实体时
- 比较 `updatedAt`
- 较晚的一方覆盖较早的一方

### 3. 删除 vs 修改

规则：

- 比较删除记录的 `deletedAt` 和对方实体的 `updatedAt`
- 时间更晚的一方胜出

这样可以覆盖两种情况：

- 先改后删：删除胜出
- 先删后又在另一端改：修改胜出

### 4. `completedAt` 冲突

第一版不单独给 `completedAt` 特殊优先级。

规则仍然是：

- 它只是实体字段的一部分
- 所属实体整体按 `updatedAt` 决定谁胜出

### 5. `date` 与 `completedAt` 的职责

虽然冲突按实体整体处理，但仍要坚持当前产品规则：

- `date` 表示当前有效计划日期
- `completedAt` 表示已完成事项的完成归属时间

同步时不能把两者混成一套字段语义。

也就是说：

- 胜出的实体记录可以整体覆盖
- 但后续业务逻辑仍按现有职责解释 `date` 和 `completedAt`

### 6. `taskTemplate` 与 `recurringTaskInstance`

这两类数据必须分开同步。

原因：

- 模板是模板
- 实例是实例
- 两者生命周期不同

不能因为模板同步，就把实例也当成模板的一部分覆盖掉。

### 7. 停止重复与 future occurrence 清理

当前产品规则里，“停止重复”会清理未来 occurrence。

第一版同步要求：

- future occurrence 的删除必须通过 tombstone 同步

否则另一台设备可能会把旧的 future occurrence 再写回来。

### 8. 本地变化识别的推荐基础

第一版必须明确，“读取本地自上次同步后的变化”不能只靠全量导出后瞎比。

需要回答：

- `lastSyncedAt` 存在哪里
- 如何判断哪些实体自上次同步后变了
- 如何判断哪些实体自上次同步后被删了

第一版推荐方案：

- 每台设备维护本地同步元数据
- 其中至少包含：
  - `lastSyncedAt`
  - 本地待同步删除记录
  - 最好再包含本地待同步变更记录

推荐优先级：

1. 推荐方案：本地 `sync_changes` 记录
2. 次选方案：依赖各实体稳定 `updatedAt` + 本地 `deleted_entities`

如果采用推荐方案，本地应至少能记录：

- `entityType`
- `entityId`
- `changeType`：`upsert` / `delete`
- `changedAt`
- `syncedAt` 或 `isSynced`

这样就能明确判断：

- 哪些实体要导出成 sync item
- 哪些实体要导出成 tombstone
- 哪些变化已经同步过，不要重复上送

---

## 六、同步数据范围

| 数据类型 | 是否同步 | 说明 |
| --- | --- | --- |
| `settings` | 部分同步 | 同步通用业务设置；不同步纯设备本地设置 |
| `sceneTags` | 同步 | 属于共享业务数据 |
| `activityTypes` | 同步 | 属于共享业务数据 |
| `taskTemplates` | 同步 | 包括种草模板与重复模板 |
| `recurringTaskInstances` | 同步 | 重复实例必须独立同步 |
| `dayPlanItems` | 同步 | Todo 主数据 |
| `logbookEntries` | 同步 | 日志页是用户可见业务数据 |
| `segmentedProgressLogs` | 同步 | 分次推进记录会影响日志与跨设备一致性 |
| 自动备份记录 | 不同步 | 只属于本机灾备能力 |
| 数据目录 | 不同步 | 每台设备本地路径不同 |
| 同步文件夹路径 | 不同步 | 属于本机配置 |
| 窗口状态 | 不同步 | 属于设备本地体验 |

### `settings` 进一步说明

第一版建议：

应同步的字段：

- `tieBreakerOrder`
- `completedAtRoundingMinutes`

暂不同步的字段：

- 任何纯设备本地显示偏好
- 本机数据目录
- 本机同步文件夹路径

当前 `settings` 中是否还会继续拆出更多本地字段，后续实现前仍需再确认。

### 本地变化判断补充

对于“读取本地自上次同步后的变化”，第一版推荐口径如下：

- `lastSyncedAt`：
  - 保存在本机同步元数据中
- 判断本地变更：
  - 优先读本地 `sync_changes`
  - 如果某类实体暂时没有 `sync_changes`，才回退到实体稳定 `updatedAt > lastSyncedAt`
- 判断本地删除：
  - 不通过扫描实体表判断
  - 而是通过本地 `deleted_entities` 或 `sync_changes(changeType=delete)` 判断

---

## 七、立即同步流程

第一版“立即同步”建议拆成以下步骤：

1. 创建本地备份
2. 检查同步文件夹
3. 获取锁
4. 读取远端 `items/` 与 `tombstones/`
5. 合并进本地 SQLite
6. 读取本地自上次同步后的变化
7. 写入 sync folder
8. 更新 `sync-info.json` 与 `devices/<deviceId>.json`
9. 释放锁
10. 显示同步结果

### 各步骤的产品含义

#### 1. 创建本地备份

- 任何同步前都先做
- 作为第一版安全兜底

#### 2. 检查同步文件夹

- 目录是否存在
- 结构是否可读写
- 是否是合法 J-Flow 同步目录

#### 3. 获取锁

- 尽量避免两台设备同时写
- 第一版只做最小锁文件机制

第一版建议锁文件最小格式如下：

```json
{
  "deviceId": "device-macbook-a1b2",
  "createdAt": "2026-05-18T10:30:00.000Z",
  "expiresAt": "2026-05-18T10:35:00.000Z",
  "appVersion": "0.1.0",
  "operation": "sync-now"
}
```

字段说明：

- `deviceId`
  - 当前占锁设备
- `createdAt`
  - 锁创建时间
- `expiresAt`
  - 锁过期时间
- `appVersion`
  - 当前写锁客户端版本
- `operation`
  - 建议固定写 `sync-now`

第一版建议锁过期时间：

- 5 分钟

如果想更保守，也可以用：

- 2 分钟

但第一版建议默认用 5 分钟，减少大目录或慢云盘场景下误判锁失效的概率。

#### 4. 读取远端

- 读取共享目录里的最新 item 和 tombstone

#### 5. 合并进本地 SQLite

- 先让本机拿到远端变化

#### 6. 读取本地变化

- 识别本机自上次同步以来新增、修改、删除了哪些实体

#### 7. 写入同步目录

- 把本机最新变化写回共享目录

#### 8. 更新同步元信息

- 更新目录级信息和设备级信息

#### 9. 释放锁

- 无论成功或失败，都应尽量释放

#### 10. 显示同步结果

- 告诉用户是否成功
- 有多少条更新
- 是否出现冲突覆盖

---

## 八、第一版不做什么

第一版明确不做：

- 自动同步
- WebDAV
- 账号系统
- 实时同步
- 人工冲突选择
- SQLite 文件同步
- 把 JSON 备份当同步包
- 移动端同步
- Web 端同步

---

## 九、实现里程碑

后续代码实现建议按以下顺序拆分。

### Sync 1：`deviceId` 与 sync metadata

目标：

- 生成并持久化 `deviceId`
- 明确本机同步元信息结构
- 定义 `sync-info.json` 与 `devices/<deviceId>.json`
- 确定本地 `lastSyncedAt`、本地删除记录与本地变更记录的保存方式
- 为缺少稳定 `updatedAt` 的旧数据建立初始化方案

当前实现状态：

- 已完成 `deviceId` 的本地生成与持久化
- 已完成 `sync_meta` 与 `sync_changes` 的 SQLite 基础落地
- 已完成 `settings / sceneTags / activityTypes / taskTemplates / recurringTaskInstances / dayPlanItems` 的本地变更记录基础
- 已完成旧数据缺失 `updatedAt` 的初始化兼容
- 当前仍未实现同步文件夹读写、`items/` / `tombstones/` 导出、立即同步按钮与锁文件

### Sync 2：同步文件夹选择、保存、读写测试

目标：

- 保存同步文件夹路径
- 校验目录可读写
- 初始化同步目录结构

### Sync 3：本地实体导出为 sync items

目标：

- 将本地业务实体导出为统一 sync item 文件
- 写入 `items/`
- 支持 tombstone 写入

### Sync 4：远端 sync items 导入与合并

目标：

- 读取同步目录中的 item 与 tombstone
- 按 `last-write-wins` 合并进本地 SQLite

### Sync 5：立即同步按钮与结果提示

目标：

- 串起一次完整“立即同步”
- 给用户可理解的结果提示

### Sync 6：锁、错误处理与自动备份收口

目标：

- 在同步前自动备份
- 补最小锁文件机制
- 明确失败后的恢复与提示

### Sync 7：后续自动同步预留

目标：

- 不实现自动同步
- 但为未来自动同步保留结构和元信息基础

---

## 十、与现有系统的关系

第一版同步不是替换当前数据体系，而是在当前体系上新增一层交换能力。

关系应当是：

- SQLite 继续做本地运行时主库
- JSON 备份继续做灾备与迁移
- 同步文件夹继续做跨设备变化交换

三者职责必须清晰分开。

---

## 十一、当前仍待后续实现前确认的点

虽然本文件已经足够指导第一版实现拆分，但下面这些点在开始写代码前仍建议再确认一次：

- `settings` 里最终哪些字段算“跨设备共享”
- tombstone 是否需要后续人工清理入口
- 同步结果提示里是否向用户展示“覆盖了几条远端/本地冲突”
- `logbookEntries` 是否全量同步，还是允许后续改成可重建策略

在这些点没有新增规则前，第一版实现应优先遵守“简单、可落地、可读懂”的方向。
