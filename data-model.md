# 数据模型文档

本文档定义 `J-Flow V3 Desktop` 当前推荐的数据模型方向。

说明：
- V2 现有实现仍可继续运行
- 本文档优先描述 V3 的目标模型
- 具体迁移可以分阶段完成，不要求一轮改完

---

## 一、建模原则

### 1. Todo 仍是产品主语
- 用户看到的是 Todo。
- 存储模型允许分层，但 UI 不应直接暴露底层历史兼容分支。

### 2. 桌面端主库优先考虑 SQLite
- V3 运行时主数据库推荐 `SQLite`。
- JSON 只作为：
  - 完整导出
  - 完整导入
  - 迁移格式
  - 自动备份格式之一

### 3. 网页端与桌面端模型尽量兼容
- 字段命名尽量延续现有语义。
- 桌面端允许在 migration 中补充新字段与新表。

---

## 二、存储方案建议

### 1. Dexie / IndexedDB
优点：
- 可沿用当前网页实现
- 初期迁移成本低

缺点：
- 不适合作为桌面端长期主库
- 数据目录、用户迁移、备份、恢复体验较弱

### 2. SQLite
优点：
- 更适合桌面端本地长期储存
- 更适合 schema version 与 migration
- 更适合导入 / 导出 / 备份恢复

缺点：
- 接入成本高于 IndexedDB

### 3. 本地 JSON 文件
优点：
- 易读
- 易迁移
- 易备份

缺点：
- 不适合作为运行时主数据库
- 单文件容易变大、写入脆弱、难做长期演进

### 4. 推荐结论
- `V3.0` 目标主库：`SQLite`
- `JSON` 作为完整备份与迁移格式
- 若短期必须过渡，可先保留 Web 侧 IndexedDB 与 Desktop 侧 JSON 导入桥接，但这只是过渡方案

### 4.1 V2.4D 教学演示数据
- 教学演示模式需要一套独立 demo 数据。
- demo 数据仅用于前端教学展示，不属于运行时主数据。
- demo 数据不得写入 SQLite / IndexedDB。
- demo 数据不得进入 JSON 导出 / 导入 / 自动备份 / 同步协议。
- demo 数据不得复用或改写用户当前 Todo、种草、日志、设置、同步目标或自动备份信息。
- 若实现需要类型辅助，应作为前端只读 fixture / view model 处理，不新增持久化 schema。

### 5. Sync 1 本地同步元数据补充
- `SQLite` 继续作为每台设备自己的运行时主库。
- 第一版本地文件夹同步不会直接同步 `j-flow.sqlite3` 文件本体。
- 当前已在桌面端本地库中增加两类同步辅助表：
  - `sync_meta`
  - `sync_changes`
- `sync_meta` 当前用于保存：
  - `deviceId`
  - `lastSyncedAt`
  - `lastSyncStatus`
  - `lastSyncError`
  - `syncTargetPath`
- `sync_changes` 当前用于记录本机业务变化：
  - `entityType`
  - `entityId`
  - `changeType`
  - `changedAt`
  - `syncedAt`
  - `deviceId`
- 这些表只服务于后续同步实现，不改变当前产品的业务展示。

---

## 三、推荐实体

### 1. TodoItem

```ts
type TodoItem = {
  id: string
  title: string
  date: string
  originDate?: string
  deadlineDate?: string

  timeBlock: 'day' | 'night'
  order: number

  status: 'pending' | 'completed' | 'deleted'
  completedAt?: string

  isNecessary: boolean
  requiresPreparation: boolean
  preparationNotes: string

  isSegmented: boolean
  progressPercent: number

  isStepped: boolean
  currentStep: string
  nextStep?: string
  plannedSteps: string[]
  stepRootItemId?: string
  previousStepItemId?: string

  source: 'manual' | 'grass' | 'recurring'
  sourceRefId?: string

  repeatRuleId?: string
  createdAt: string
  updatedAt: string
}
```

说明：
- `date` 表示当前有效计划日期。
- `deadlineDate` 表示必要事项的真实截止日期。
- `deadlineDate` 当前只在：
  - `isNecessary = true`
  时有效。
- 第一版表单虽然支持：
  - `x 日内完成`
  但底层仍只保存真实 `deadlineDate`。
- `originDate` 用于追踪更早来源日期或首次生成日期，但不应直接决定当前显示归属。
- `order` 用于当天未完成事项手动排序。
- 当前实现优先复用现有 `sortOrder` 字段表达该语义，不额外新增独立 `order` 字段。
- `completedAt` 用于已完成事项排序与完成时间修改。
- 未完成事项按 `date` 归属显示。
- 已完成事项按 `completedAt` 对应日期归属显示，而不是按 `date` 继续挂在原页面。
- 已完成事项不参与未完成事项的 `order` 竞争。
- 完成时写入 ISO string。
- 恢复未完成时清空为 `undefined`。
- 删除时写入 `deletedAt`，供日志归档“当日删除”使用。
- 恢复未完成后，事项回到当前有效计划日期 `date` 的未完成区。
- 修改事项 `date` 时，不自动修改 `deadlineDate`。
- 若事项此前已被顺延到今天，则其当前 `date` 应视为今天：
  - 完成后再取消完成，应回到今天，而不是回到更早历史日期。
- 历史已完成事项若缺少 `completedAt`，本阶段先兼容排序到已完成组最后，不强制立刻 migration。
- V2.4 起，`requiresPreparation / preparationNotes` 的用户侧语义调整为备注：
  - 新数据中 `preparationNotes` 表示备注内容
  - `requiresPreparation` 仅作为历史兼容字段或派生布尔
  - UI 不再展示“准备”开关
  - 旧数据只要 `preparationNotes` 非空，就按 `备注：...` 展示
- V3 基础分步 Todo 已使用：
  - `isStepped`
  - `currentStep`
  - `nextStep`
  - `stepRootItemId`
  - `previousStepItemId`
- V3.1 分步优化建议新增：
  - `plannedSteps: string[]`
- `plannedSteps` 表示当前步骤之后的所有后续步骤，按数组顺序依次推进。
- `nextStep` 在 V3.1 后作为兼容字段保留：
  - 旧数据若只有 `nextStep` 且没有 `plannedSteps`，读取时等价于 `plannedSteps = [nextStep]`
  - 新数据保存时，可继续把 `nextStep` 同步写为 `plannedSteps[0] ?? ''`
  - 后续若所有数据完成迁移，可再评估是否移除用户不可见的 `nextStep` 兼容层
- `isStepped` 与 `isSegmented` 第一版互斥。
- 分步 Todo 的列表显示标题由：
  - `title`
  - `currentStep`
  拼接得到，不建议把拼接后的标题反写回 `title`。
- 分步 Todo 完成后若后续步骤队列非空，应创建新的 `DayPlanItem`：
  - `title` 沿用原基础标题
  - `currentStep` 取上一条 `plannedSteps[0]`
  - `plannedSteps` 取上一条 `plannedSteps.slice(1)`
  - `nextStep` 兼容写为新 `plannedSteps[0] ?? ''`
  - `deadlineDate` 不继承上一条，默认为空
  - `previousStepItemId` 指向上一条
  - `stepRootItemId` 沿用原 root，若不存在则取第一条分步 Todo 的 id
- 分步 Todo 的 `deadlineDate` 只约束当前步骤，不代表整条分步链路的总截止日期。
- V3.1 分步优化预计需要：
  - JSON app data schema version 从 `13` 升级到 `14`
  - SQLite schema version 从 `7` 升级到 `8`
  - `task_templates` 增加 `planned_steps_json`
  - `day_plan_items` 增加 `planned_steps_json`
  - JSON 导入、SQLite migration、同步 item 读写均补齐新字段兼容

### 2. RepeatRule

```ts
type RepeatRule = {
  id: string
  repeatType: 'none' | 'calendar' | 'afterCompletion'
  intervalUnit: 'day' | 'week' | 'month' | 'year'
  intervalValue: number

  anchorDate: string
  isActive: boolean

  createdAt: string
  updatedAt: string
}
```

规则：
- `intervalValue` 必须限制在 `1-100`
- `repeatType = none` 时，其余 interval 字段可为空或保留默认值
- `repeatType = afterCompletion` 时，下一次以 `completedAt` 为基准
- 当前代码阶段采用兼容层，而不是一次性删除旧 `recurrence`
- 旧字段仍保留，用于兼容：
  - `none`
  - `daily`
  - `weekly`
  - `monthly`
  - `yearly`
- 读取时优先使用：
  - `repeatType`
  - `repeatIntervalUnit`
  - `repeatIntervalValue`
- 若新字段缺失，则回退到旧 `recurrence` 自动映射

### 2.1 Recurring Todo 与 DDL
- 对重复 Todo，模板仍保存真实 `deadlineDate`。
- 后续 occurrence 生成时，通过：
  - 模板 `date`
  - 模板 `deadlineDate`
  反推出相对偏移，再换算出当次 occurrence 的真实 `deadlineDate`。
- 一旦 occurrence 已生成，其 `deadlineDate` 固定：
  - 后续改该条 Todo 的 `date`
  - 不自动顺延 `deadlineDate`

### 2.2 Recurring Todo 与日夜归属
- 对重复 Todo，模板应显式保存：
  - `timeBlock`
  - `timeBlockSource`
- 后续 occurrence 生成时直接继承模板 `timeBlock / timeBlockSource`。
- 场景 tag 仅作为用户定义的“有空就做”分类 / 筛选信息，不再参与日夜语境推断。
- 不应根据 tag 中文名称做语义匹配。
- 旧数据迁移时：
  - 若重复模板已有对应 `DayPlanItem` 实例，应优先从最近实例回填 `timeBlock`
  - 若无法回填，则默认 `day / default_day`

### 3. GrassItem

```ts
type GrassItem = {
  id: string
  activityTypeId?: string
  title: string
  sceneTagIds: string[]
  interestLevel: 1 | 2 | 3
  grassStatus: 'active' | 'picked' | 'archived'
  createdAt: string
  updatedAt: string
}
```

### 4. ActivityType

```ts
type ActivityType = {
  id: string
  name: string
  order: number
  createdAt: string
  updatedAt: string
}
```

### 5. SceneTag

```ts
type SceneTag = {
  id: string
  name: string
  order: number
  createdAt: string
  updatedAt: string
}
```

### 6. LogbookEntry

```ts
type LogbookEntry = {
  date: string
  snapshotItems: Array<{
    id: string
    status: 'completed' | 'pending' | 'deleted'
    titleSnapshot: string
    time?: string
    isNecessary: boolean
    isPicked: boolean
    isSegmented: boolean
    progressText?: string
    deadlineDate?: string
    deadlineStatus: 'none' | 'normal' | 'overdue'
  }>
  remark: string
  generatedAt: string
}
```

说明：
- 每天一条日志容器。
- `snapshotItems` 当前已收口为单一快照列表。
- `status = completed`：
  - 表示当日完成快照
  - `isPicked = true` 表示这条完成来自种草
- `status = pending`：
  - 只记录当天页面上仍存在的 pending
- 手动改到未来日期的事项，不计入原日期未完成。
- 分次事项通过：
  - `isSegmented`
  - `progressText`
  表达日志快照
- 必要事项通过：
  - `deadlineDate`
  - `deadlineStatus`
  表达日志中的 `DDL / 逾期` 状态
- 已完成事项不再在日志里重复展示 `DDL` 日期本身。
- `status = deleted`：
  - 记录当日删除快照
- `remark` 是唯一允许后续编辑的区域，其余正文保持归档语义。

### 7. SegmentedProgressLog

```ts
type SegmentedProgressLog = {
  date: string
  itemId: string
  titleSnapshot: string
  isNecessary: boolean
  fromProgress: number
  toProgress: number
}
```

说明：
- 这是给日志生成用的辅助聚合记录，不单独作为页面区块展示。
- 只用于支持分次事项在“当日未完成”里展示当天推进总量。
- 当前口径采用：
  - 当天第一次推进前的起点
  - 当天最后一次推进后的进度

### 8. AppSettings

```ts
type AppSettings = {
  initialized: boolean
  tieBreakerOrder: 'asc' | 'desc'
  weatherEnabled: boolean
  completedAtRoundingMinutes: 0 | 5 | 10 | 30

  defaultNightTodoByTimeEnabled: boolean
  defaultNightTodoStartHour: number
  defaultNightTodoEndHour: number

  createdAt: string
  updatedAt: string
}
```

说明：
- `defaultNightTodoByTimeEnabled` 控制新增 Todo 是否按当前本地小时自动默认到晚上。
- 默认值为：
  - `false`
- `defaultNightTodoStartHour / defaultNightTodoEndHour` 取值范围为：
  - `0-23`
- 默认建议值为：
  - `17`
  - `23`
- 支持跨午夜区间：
  - 若开始小时大于结束小时，则表示跨午夜
  - 例如 `22-6` 覆盖 `22:00-23:59` 与 `00:00-05:59`
- 该设置只影响新增表单打开时的默认 `timeBlock`，不改写已有 Todo。
- SQLite migration 与 JSON 导入应为旧数据补齐上述默认值。
- V2.4D 初始化页 / 功能教学第一版不新增持久化字段：
  - `initialized` 仍只表示是否完成首次初始化
  - `重看功能教学` 不应通过清空或改写 `initialized` 实现
  - 若后续需要记录教学完成时间，再单独设计设置字段

---

## 四、重复规则迁移

### 1. 旧字段到新字段
- `none`
  - -> `repeatType = none`
- `daily`
  - -> `repeatType = calendar`
  - -> `intervalUnit = day`
  - -> `intervalValue = 1`
- `weekly`
  - -> `repeatType = calendar`
  - -> `intervalUnit = week`
  - -> `intervalValue = 1`
- `monthly`
  - -> `repeatType = calendar`
  - -> `intervalUnit = month`
  - -> `intervalValue = 1`
- `yearly`
  - -> `repeatType = calendar`
  - -> `intervalUnit = year`
  - -> `intervalValue = 1`

### 2. 日历式与完成后重复的处理
- `calendar`
  - 固定按锚点命中日生成
- `afterCompletion`
  - 仅在当前实例完成后，基于 `completedAt` 生成下一次
  - 若当前已存在下一次 pending occurrence，则不重复生成
  - 若已生成下一次后再修改上一条的 `completedAt`，当前阶段不追溯重排已生成 occurrence
- 停止重复时：
  - 保留当前日期及以前的 occurrence
  - 清理当前日期之后的 future occurrence
- 恢复重复时：
  - 不立即回填之前被清理的 future occurrence
  - 继续采用“进入目标日期时再生成”的懒生成策略

### 3. 不存在日期的处理
- 月重复：落到目标月最后一天
- 年重复：落到目标年对应月的最后一天

---

## 五、排序模型

### 1. `order` 字段
- 当前代码层实际使用 `sortOrder` 表示某一天未完成 Todo 的手动顺序。
- `sortOrder` 只作用于当天实例。
- 手动排序时可按 `1, 2, 3...` 重写当前日期未完成事项的 `sortOrder`。

### 2. 白天 / 晚上语境
- `timeBlock` 继续使用：
  - `day`
  - `night`
- 当事项越过排序页中的白天 / 晚上分隔线时：
  - 同步修改 `timeBlock`
  - 同步刷新颜色语境
  - 当前只修改当天实例，不要求同步改模板全局语义

### 3. 已完成事项排序
- 已完成事项不参与未完成区的 `order`
- 已完成事项按 `completedAt` 升序排序

### 4. 恢复未完成
- 若从 completed 恢复到 pending：
  - 默认分配到未完成列表末尾
  - 如后续保留 `lastPendingOrder`，可再升级为恢复原位置

---

## 六、批量种草建模

批量种草不新增“批量 item”实体。

规则：
- 输入框多行提交后，每一行生成独立 `GrassItem`
- 同次提交可共享元信息，但入库必须拆成多条独立记录

---

## 七、本地数据库与文件结构

### 1. 默认数据目录
- Windows 下建议使用用户本地应用数据目录，例如：
  - `%APPDATA%/J-Flow`
  - 或 `%LOCALAPPDATA%/J-Flow`

### 2. 建议文件
- `j-flow.sqlite3`
- `backups/`
- `logs/` 或迁移日志文件

当前已落地口径：
- 桌面端运行时主库文件：
  - `j-flow.sqlite3`
- 自动备份目录：
  - `backups/`
- 手动导入 / 导出：
  - 继续使用完整 JSON 快照
  - 文件保存位置由系统文件对话框决定，不强制固定在数据目录中

### 3. 自定义数据目录
- 建议支持，但可放到 `V3.3`

### 4. 打开数据文件夹
- 建议支持，至少在 `V3.3` 提供稳定入口

---

## 八、导入 / 导出 / 备份

### 1. JSON 导入 / 导出
- 必须支持完整 JSON 导入 / 导出。
- 用于：
  - 备份
  - 换电脑迁移
  - 网页端到桌面端迁移

### 2. 自动备份
- 建议支持周期性自动备份。
- 可以导出为：
  - JSON 快照
  - 或 SQLite 文件副本

### 3. 避免数据损坏
- 数据写入使用事务
- 导入前先做 schema 校验
- 导入时先写临时文件 / 临时库，再原子替换
- 保留最近 N 份备份

---

## 九、Schema Version 与 Migration

### 1. Schema Version
- 数据库中维护 `schema_version`
- 每次结构变更必须附带 migration

### 2. Migration 原则
- 只做前进迁移
- 迁移前自动备份
- 迁移失败可回滚到迁移前备份

### 3. 旧数据补齐
- 旧 `completed = true` 但没有 `completedAt` 的事项：
  - migration 时补一个可追溯默认值
  - 推荐优先使用历史 `updatedAt`
  - 若无可用时间，再退回导入或迁移执行时间

---

## 十、网页端到桌面端的数据迁移

推荐迁移路径：
1. 网页端导出完整 JSON
2. 桌面端首次启动提供导入入口
3. 桌面端读取 JSON
4. 经 normalize 与 schema migration 后写入 SQLite

不建议：
- 直接尝试读取浏览器 IndexedDB 文件作为桌面端长期数据源
