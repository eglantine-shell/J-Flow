# 数据模型文档

本文档定义当前版本的核心数据结构口径。

V2.1 的重要调整是：
- 产品主语切换为 Todo
- 模板、实例、来源、continuation / carryover 等概念降级为内部实现说明
- 种草从“可执行模板”降级为“轻量收藏记录”
- `DayPlanItem.originDate` 已作为 Todo 创建来源字段落地

字段名允许使用英文，说明文字使用中文。

---

## 一、V2.1 建模原则

### 1. 产品主语是 Todo，不是模板

产品层面对用户讲述的主语应是 Todo。

无论底层是否仍保留：
- 模板层
- 重复实例层
- 当日实例层
- continuation 链路

这些都只能服务于 Todo 行为，不应反过来定义 Todo 是什么。

### 2. UI 与底层模型分层

V2.1 后续实现应明确分成两层：

1. 底层存储模型
- 用于持久化、同步、兼容历史数据

2. UI 视图模型
- 用于渲染 Todo 与决定按钮状态

UI 不应直接把底层实例字段当作产品规则。

### 3. 当前字段策略

当前已新增：
- `DayPlanItem.originDate`

它用于稳定表达：
- 这条 Todo 最初进入 Todo 列表的日期
- 或某条 repeating occurrence 的原始命中日

若后续实现发现底层结构不足，应先补规则，再决定是否调整模型。

---

## 二、TodoViewModel 规划

V2.1 建议继续使用一个面向 UI 的 `TodoViewModel`。

### 最小字段集合

type TodoViewModel = {
  id: string
  title: string
  date: string
  timeBlock: 'day' | 'night'

  isCompleted: boolean
  isDeleted: boolean

  isSegmented: boolean
  progressPercent: number

  isRepeating: boolean
  isNecessary: boolean
  preparationNotes: string

  createdAtHint?: string
  originLabel?: string

  canEdit: boolean
  canDelete: boolean
  canComplete: boolean
  canUncomplete: boolean
  canStopRepeating: boolean

  internalRef: unknown
}

### 规划说明

- `TodoViewModel` 是 UI 层模型，不代表必须入库
- 它可以由现有底层结构映射而来
- `internalRef` 只用于映射层回写底层，不应直接暴露为产品心智

---

## 三、当前底层数据层

V2.1 当前仍允许保留以下底层模型。

### 1. SceneTag

用于表达用户主动维护的“有空就做”场景标签。

V2.1 新口径下：
- `SceneTag` 不再与白天 / 晚上自动绑定
- 不再与周中 / 周末自动绑定
- 不再依赖名称承担内部语义

它只是用户自定义标签集合。

### 2. ActivityType

用于表达种草清单分类。

它的职责是：
- 给种草分组
- 在拔草时缩小候选范围

### 3. TaskTemplate

仍可暂时保留，用于复用现有持久化结构，支撑：
- 种草长期存在
- 重复规则长期存在

但在 V2.1 中，`TaskTemplate` 不再天然表示“可直接执行模板”。

它在底层需要承担两种完全不同语义：
1. `grass`
- 轻量收藏记录
2. `todo_recurring`
- 重复 Todo 规则

这意味着：
- 底层类型可以暂时复用
- 产品解释必须严格分开

### 4. RecurringTaskInstance

仍可保留，用于支撑：
- 重复规则按周期追踪状态
- 当前 occurrence 的完成与进度同步

它属于内部实现层，不是用户主语。

### 5. DayPlanItem

仍可保留，用于支撑：
- 某一天实际出现的 Todo 实例
- 手动创建、从种草加入、重复生成、以及当前所在日期的 Todo 落地

它仍是当前 Todo 的主要存储对象。

---

## 四、TaskTemplate 的 V2.1 口径

type TaskTemplate = {
  id: string
  templateKind: 'grass' | 'todo_recurring'
  title: string
  date: string
  activityTypeId?: string
  sceneTagIds: string[]

  interestLevel: 1 | 2 | 3
  isNecessary: boolean

  requiresPreparation: boolean
  preparationNotes: string
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

  isSegmented: boolean

  createdAt: string
  updatedAt: string

  grassStatus?: 'active' | 'picked' | 'archived'
  isArchived: boolean
}

### 1. `grass` 的产品口径

当 `templateKind = 'grass'` 时，用户可编辑规则只应理解为：
- `activityTypeId`
- `title`
- `sceneTagIds`
- `interestLevel`
- `grassStatus`
- `createdAt`
- `updatedAt`

其中推荐状态语义应为：
- `active`
  - 仍在种草库中
  - 可被拔草
- `picked`
  - 已加入 Todo
  - 暂时不在种草库中
  - 不再参与拔草
- `archived`
  - 用户停用
  - 不再参与拔草

### 2. `grass` 上的历史兼容字段

以下字段在 `grass` 上允许暂时继续存在于底层，但降级为历史兼容字段，不再属于用户可编辑规则：
- `date`
- `isNecessary`
- `requiresPreparation`
- `preparationNotes`
- `recurrence`
- `isSegmented`

这些字段的处理原则：
- 允许老数据继续被 schema 接受
- 新实现不再把它们暴露为种草编辑能力
- 新实现不再把它们作为拔草主规则

另外，`isArchived` 在 `grass` 上也应逐步降级为兼容字段。

推荐兼容策略：
- 新规则优先读取 `grassStatus`
- 若旧数据没有 `grassStatus`：
  - `isArchived = true` 视为 `grassStatus = 'archived'`
  - `isArchived = false` 视为 `grassStatus = 'active'`

### 3. `grassStatus` 的字段定位

推荐新增：

```ts
grassStatus?: 'active' | 'picked' | 'archived'
```

命名建议继续使用 `grassStatus`，原因是：
- 它只服务 `templateKind = 'grass'`
- 不会误导到 `todo_recurring`
- 比通用 `status` 更不容易和 Todo/instance 状态混淆

不建议继续只复用 `isArchived`，因为那会混淆：
- 用户主动停用
- 已被加入 Todo 暂时离库

### 4. `todo_recurring` 的产品口径

当 `templateKind = 'todo_recurring'` 时，`TaskTemplate` 仍可继续承担重复规则对象。

也就是说：
- `recurrence`
- `date`
- `isNecessary`
- `requiresPreparation`
- `preparationNotes`
- `isSegmented`

这些字段对 `todo_recurring` 仍然有意义。

### 5. `isArchived` 的未来定位

推荐将 `isArchived` 逐步收口为：
- `todo_recurring` 上的长期有效字段
  - 表示这条重复规则是否已停止
- `grass` 上的兼容字段
  - 旧数据迁移 fallback
  - 最终不再作为 `grass` 的产品状态主字段

对于 `grass`：
- `grassStatus = 'archived'` 时，可同步保留 `isArchived = true`
- `grassStatus = 'active' | 'picked'` 时，可同步保留 `isArchived = false`

但新业务判断不应继续依赖 `isArchived` 区分 `active` 与 `picked`

### 6. 当前 schema 兼容策略

当前阶段建议：
- 不急着拆成两套底层表
- 继续复用 `TaskTemplate`
- 通过 `templateKind` 区分解释语义
- 对 `grass` 上多余字段做“保留存储、停止暴露、逐步清理”
- 对 `grass` 新增 `grassStatus` 承担生命周期状态

---

## 五、RecurringTaskInstance 的 V2.1 口径

type RecurringTaskInstance = {
  id: string
  templateId: string

  dateKey: string
  recurrence: 'daily' | 'weekly' | 'monthly' | 'yearly'

  status: 'pending' | 'completed' | 'expired'

  progressState: 'not_started' | 'in_progress' | 'completed'
  progressPercent: number
  progressNote: string

  generatedAt: string
  completedAt?: string
}

### V2.1 解释

它继续可用于底层追踪某次重复周期的状态。

但产品层不应把它直接解释为用户主语。

---

## 六、DayPlanItem 的 V2.1 口径

type DayPlanItem = {
  id: string
  date: string
  originDate?: string
  targetDate?: string
  timeBlock: 'day' | 'night'
  timeBlockSource: 'mapped_day' | 'default_day' | 'mapped_night' | 'manual_night'
  sortOrder: number
  source: 'auto_generated' | 'decision_selected' | 'manual_temporary'
  templateId?: string
  recurringInstanceId?: string
  consumesDateTrigger?: boolean
  rootItemId?: string
  continuationOfItemId?: string
  carriedFromDate?: string
  title: string
  activityTypeId?: string
  isNecessary: boolean
  requiresPreparation: boolean
  preparationNotes: string
  isSegmented: boolean
  progressState: 'not_started' | 'in_progress' | 'completed'
  progressPercent: number
  status: 'pending' | 'completed' | 'deleted'
  createdAt: string
  completedAt?: string
}

### V2.1 解释

`DayPlanItem` 才是执行属性真正落地的位置。

对于“从种草加入 Todo”：
- `templateId` 只保留来源追踪
- `source = decision_selected`
- `isNecessary`
- `requiresPreparation`
- `preparationNotes`
- `isSegmented`
- `date`
- `timeBlock`

都应在“本次加入 Todo”时确定，而不是从 `grass` 模板直接继承为长期规则。

另外，种草生命周期需要额外更新 `TaskTemplate.grassStatus`：
- 从种草加入 Todo：
  - `grassStatus = 'picked'`
- 来自种草的一次性 Todo 被删除：
  - `grassStatus = 'active'`
- 来自种草的一次性 Todo 被完成：
  - `grassStatus` 保持 `picked`

若来自种草的 Todo 被转成 repeating Todo：
- 原种草仍保持 `picked`
- 后续 recurring occurrence 与原种草不再自动联动

### `originDate` 的作用

`originDate` 用于表达：
- 这条 Todo 进入 Todo 列表的起点日期
- 或 repeating occurrence 的命中日期

UI 展示“创建于 M/D”时应优先读取它。

---

## 七、当前明确降级的内部字段

以下字段继续允许存在，但在产品层降级为内部实现说明：
- `source`
- `templateKind`
- `recurringInstanceId`
- `consumesDateTrigger`
- `continuationOfItemId`
- `carriedFromDate`
- `decision_selected`
- `todo_recurring`

另外，以下字段在 `grass` 上降级为历史兼容字段：
- `date`
- `isNecessary`
- `requiresPreparation`
- `preparationNotes`
- `recurrence`
- `isSegmented`

---

## 八、后续实现拆分建议

后续实现建议按以下顺序拆分：
1. 收缩种草表单，只保留轻量收藏字段
2. 给 `grass` 新增生命周期状态字段，并完成兼容迁移
3. 收缩种草管理页，支持区分 active / picked / archived
4. 改造拔草面板为“清单 + 场景多选”的显式筛选
5. 改造从种草加入 Todo 的创建流程，在加入时填写执行属性并将 `grassStatus` 改为 `picked`
6. 改造来自种草的一次性 Todo 删除逻辑，将 `grassStatus` 恢复为 `active`
7. 兼容旧 `grass` 数据，逐步停止消费历史执行字段
8. 最后再评估是否需要把 `grass` 与 `todo_recurring` 从同一底层模型中正式拆开
