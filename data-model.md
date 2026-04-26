# 数据模型文档

本文档定义当前版本的核心数据结构口径。

V2.1 的重要调整是：
- 产品主语切换为 Todo
- 模板、实例、来源、continuation 等概念降级为内部实现说明
- 本轮不新增字段，不改 schema，不改 storage

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

### 3. 当前不扩字段

本轮只重写规则与建模口径，不新增：
- 新字段
- 新 schema
- 新 storage 结构

若后续实现发现底层结构不足，应先补规则，再决定是否调整模型。

---

## 二、TodoViewModel 规划

V2.1 建议新增一个面向 UI 的 `TodoViewModel`。

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

  carryHint?: string
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
- V2.1-2 已按该方向落地到 Todo 功能层：
  - `TodoModePanel` 先读取底层 `DayPlanItem`
  - 再映射为 `TodoViewModel`
  - 按钮能力与轻量来源标签都尽量从映射层读取

---

## 三、当前底层数据层

V2.1 当前仍允许保留以下底层模型。

### 1. SceneTag

用于表达“有空就做”的场景标签。

### 2. ActivityType

用于表达种草分类。

### 3. TaskTemplate

仍可保留，用于支撑：
- 种草长期存在
- 重复规则长期存在

但在 V2.1 中，`TaskTemplate` 不再是产品主语。

它是内部持久化对象，不是用户在 Todo 主流程中首先感知的对象。

### 4. RecurringTaskInstance

仍可保留，用于支撑：
- 重复规则按周期追踪状态
- 当前 occurrence 的完成与进度同步

但在 V2.1 中，它属于内部实现层。

### 5. DayPlanItem

仍可保留，用于支撑：
- 某一天实际出现的 Todo 实例
- 手动创建、从种草加入、重复生成、跨日延续后的实例落地

但它不应继续直接承担 UI 主模型职责。

V2.1-3 当前已进一步落地：
- continuation 不再只服务分次事项
- 而是作为通用 todo carryover 的内部同步机制存在

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

  isArchived: boolean
}

### V2.1 解释

`TaskTemplate` 继续允许存在，但其产品地位下降为内部对象。

它主要服务于：
- 长期保存种草
- 保存重复规则

它不直接定义：
- Todo 是否可编辑
- Todo 是否可删除
- Todo 是否可完成
- Todo 是否可取消完成

### 降级说明

以下字段继续允许存在，但降级为内部实现说明：
- `templateKind`
- `date` 作为重复锚点
- `sceneTagIds`
- `isArchived`

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

用户看到的应该是：
- 当前这条重复 Todo
- 是否未完成
- 是否已完成
- 是否应继续

而不是：
- 当前命中了哪一个内部 instance

### 重构方向

V2.1-4 需要重点处理的问题是：
- 如何让日历型 recurrence 不再制造难理解的多 occurrence 堆叠
- 是否让同一重复规则在任意时刻最多只有一个 active occurrence

当前推荐答案：
- 采用“同一重复模板最多一个 active pending occurrence”
- carryover 出来的 repeating Todo 仍属于同一 occurrence
- 不把 carryover 视为新 occurrence
- V2.1-4 当前已按该方向实现第一版

当前结构判断：
- 暂不推荐新增字段
- 推荐继续复用：
  - `RecurringTaskInstance.status`
  - `DayPlanItem.recurringInstanceId`
  - `DayPlanItem.rootItemId / continuationOfItemId / carriedFromDate`
  - `DayPlanItem.consumesDateTrigger`

其中：
- `RecurringTaskInstance` 继续承担“这一次 recurrence occurrence 是否 pending / completed / ended”的主状态
- `DayPlanItem` 继续承担“这一次 occurrence 在哪一天显示给用户”
- `consumesDateTrigger` 当前仍可继续承担“本次命中已被消费/跳过，不要在同一 targetDate 再自动生成”的内部语义

本轮先记规则，不改结构。

---

## 六、DayPlanItem 的 V2.1 口径

type DayPlanItem = {
  id: string

  date: string
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

`DayPlanItem` 仍可继续作为当天实例层存在。

但它在 V2.1 中应被理解为：
- Todo 的底层落地对象

而不是：
- UI 直接消费并据此做产品分支的对象

### 需要降级为内部实现说明的字段

以下字段继续允许保留，但不应再被产品规则直接引用：
- `source`
- `templateId`
- `recurringInstanceId`
- `consumesDateTrigger`
- `rootItemId`
- `continuationOfItemId`
- `carriedFromDate`

这些字段可用于：
- 同步自动生成
- 同步 carryover
- 保证重复规则消费语义
- 支撑历史兼容

V2.1-3 当前复用的 carryover 链字段仍是：
- `rootItemId`
- `continuationOfItemId`
- `carriedFromDate`

本轮未新增任何字段。

V2.1-4 当前推荐：
- 对 repeating Todo 先复用上述链字段，不新增专门 active occurrence 字段
- 若后续实现证明仅靠现有字段无法稳定表达“跳过本次”和“下一次可再生成”，再单独评估字段扩展

但它们不应直接决定：
- UI 上有哪些按钮
- 普通 Todo 是否能跨日延续
- 从种草加入的 Todo 是否算普通 Todo

---

## 七、普通 Todo 的 V2.1 行为映射

### 1. 普通未完成 Todo 默认跨日延续

V2.1 规则要求：
- 一次性 Todo 未完成时，默认延续到明天

当前推荐解释为：
- 底层可继续通过 `DayPlanItem` 实例链表达
- 但产品心智不再称之为“分次 continuation 专属能力”
- 而应理解为“Todo carryover”

### 2. 删除语义

普通一次性 Todo 的删除，产品上表示：
- 结束这条 Todo
- 停止未来延续

底层可继续保留内部链路字段，但删除行为不应再被解释为：
- 只是某种内部 source 的删除

### 3. 分次语义

分次 Todo 在产品上只是一条带 `progressPercent` 的普通 Todo。

当前推荐解释为：
- 仍允许底层通过 continuation 链保存历史
- 但 UI 只看：
  - 当前进度
  - 是否完成
  - 是否来自昨天

---

## 八、种草与 Todo 的边界

### 1. 种草只是来源，不是前置流程

从种草加入 Todo 后：
- 这条 Todo 按普通 Todo 行为工作
- 编辑不回写原种草
- 删除不删除原种草

### 2. `decision_selected` 降级

`decision_selected` 可继续作为底层来源值保留。

但它在 V2.1 中只表示：
- 这条 Todo 最初来自种草

它不应决定：
- 能不能编辑
- 能不能删除
- 能不能完成
- 能不能取消完成

---

## 九、重复 Todo 的边界

### 1. `todo_recurring` 降级

`todo_recurring` 可继续保留为内部模板类型。

它的职责是：
- 标记某条重复 Todo 的后台托管模板

它不应成为用户的主要理解对象。

### 2. 删除当天实例 与 停止重复

产品规则必须区分：

1. 删除当天实例
- 只跳过本次

2. 停止重复
- 结束未来重复

底层可继续通过：
- `templateKind`
- `recurringInstanceId`
- `consumesDateTrigger`

等字段配合实现，但这些都属于技术实现层。

---

## 十、兼容策略

### 1. 历史字段继续保留

当前所有既有字段继续保留，不做删除式迁移。

### 2. 文档口径先切换

V2.1 当前先切换：
- 产品规则
- UI 视图模型规划
- 任务拆分

不立即切换：
- schema
- storage
- 业务实现

### 3. 后续实现策略

推荐后续通过“映射层优先”推进：
1. 先引入 `TodoViewModel`
2. 再逐步把 UI 从 `DayPlanItem` 分支迁出
3. 再重构 carryover 与 recurrence

---

## 十一、必须遵守的 V2.1 数据规则

- Todo 是产品主语
- UI 不直接根据 `source / templateKind / recurringInstanceId / consumesDateTrigger / continuation` 决定交互
- 普通未完成 Todo 默认跨日延续
- 普通 Todo 删除表示结束整条 Todo
- 重复 Todo 必须区分“删除当天实例”和“停止重复”
- 分次只是进度属性，不是独立产品子系统
- 必要与需要准备只是 UI 属性
- 种草只是来源之一，不是普通 Todo 的前置流程
