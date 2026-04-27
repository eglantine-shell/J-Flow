# 数据模型文档

本文档定义当前版本的核心数据结构口径。

V2.1 的重要调整是：
- 产品主语切换为 Todo
- 模板、实例、来源、continuation / carryover 等概念降级为内部实现说明
- V2.1-C 已新增 `DayPlanItem.originDate`

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
- 手动创建、从种草加入、重复生成、以及当前所在日期的 Todo 落地

但它不应继续直接承担 UI 主模型职责。

新的文档方向下：
- `continuation / carryover` 不再应被视为目标模型
- 后续应从“复制一个跨日副本”改成“搬移当前 Todo 的 date”
- 是否还需要保留 continuation 链字段，取决于后续实现是否仍要兼容历史数据

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

新的文档规则下：
- recurrence 负责决定“哪些命中日要创建新的 occurrence”
- 同一模板 + 同一命中日，最多创建一个 occurrence
- 不同命中日创建出来的 occurrence 可以并存
- 每个 occurrence 在创建后，都像普通 Todo 一样顺延搬移

这意味着：
- 旧的“single active occurrence”产品规则应废弃
- 后续实现不应再因为旧 occurrence 未完成而阻止新命中日 occurrence 创建

当前结构判断：
- `originDate` 已作为第一版长期来源落地
- 但旧数据如何一次性回填与清理旧链字段，仍需后续继续推进

当前可选方案：
1. 复用 `rootItemId` 指向的根实例 `date` 作为创建日
2. 对 repeating Todo 复用 occurrence 首次创建时的 `targetDate` 或 `RecurringTaskInstance.dateKey`
3. 若现有字段无法稳定表达，再评估未来新增：
  - `originDate`
  - `createdForDate`
  - `occurrenceDate`

当前实现策略：
- 新创建的 DayPlanItem 显式写入 `originDate`
- 旧数据按 `originDate ?? targetDate ?? date` 兼容读取

### V2.1-B 模型结论

V2.1-C 已按该方案落地第一版字段实现。

#### 方案 A：不新增字段，靠 `rootItemId` 找根实例 `date`

优点：
- 短期内不需要 schema 变化
- 可最大化复用当前链字段

问题：
- 若顺延搬移模型成立，根实例本身也会被移动，根实例 `date` 会失去“原始创建日”意义
- 若为了保留根实例 `date` 而不移动根实例，则会重新落回“保留旧副本”的旧心智
- 删除、完成、重排、迁移历史链时，root 查询会越来越偏实现细节，不适合作为 UI 长期语义来源
- 对 repeating Todo 不够清楚，因为 repeating 的每个 occurrence 都需要稳定区分“命中日 / 创建日”，只靠 root 链解释成本高

结论：
- 不推荐作为长期目标模型
- 只适合作为短期兼容层，不适合作为最终“创建于”来源

#### 方案 B：新增 `originDate`

定义建议：
- `date` = 当前显示日期 / 当前落点日期
- `originDate` = 这条 Todo 或这条 occurrence 最初创建于哪一天

映射建议：
- 普通 Todo：创建时 `originDate = date`
- 从种草加入：`originDate = selectedDate`
- 分次 Todo：同普通 Todo
- repeating occurrence：`originDate = 该次命中日`
- 顺延搬移时：只更新 `date`，不更新 `originDate`

优点：
- 最符合产品心智
- 普通 Todo、分次 Todo、从种草加入、repeating occurrence 全都可统一
- UI “创建于 M/D” 读取路径简单直接
- 对 iOS / 多端迁移友好，因为语义稳定，不依赖历史链反查
- 后续即使逐步废弃 `continuationOfItemId / carriedFromDate`，`originDate` 仍然成立

对现有链字段的影响：
- `rootItemId` 仍可保留，用于表示同一条 Todo / occurrence 身份
- `continuationOfItemId`、`carriedFromDate` 可在迁移期保留做兼容
- 在顺延搬移模型稳定后，这两个字段可以逐步降级甚至废弃

结论：
- 推荐作为后续实现目标
- 是当前最统一、最清晰的方案

#### 方案 C：新增 `occurrenceDate`

优点：
- 对 repeating Todo 很直接
- 能表达某次 repeating occurrence 的命中日

问题：
- 会让普通 Todo 与 repeating Todo 分裂建模
- UI “创建于”将出现两套解释：
  - 普通 Todo 靠 root / createdAt / 其他字段
  - repeating Todo 靠 occurrenceDate
- 后续 ViewModel 和客户端实现复杂度更高

结论：
- 不如 `originDate` 统一
- 可作为 repeating 内部辅助概念，但不推荐单独作为唯一新增字段

#### 方案 D：`createdForDate` / `scheduledDate` / `originalDate` 等命名比较

- `createdForDate`
  - 更像“原本计划给哪一天”
  - 对从种草加入与 repeating occurrence 都还算能解释
  - 但对用户文案“创建于”不够直观

- `scheduledDate`
  - 更像“计划日”
  - 容易和当前 `date` 混淆
  - 不适合表达“最初创建于哪一天”

- `originalDate`
  - 语义接近 `originDate`
  - 但稍偏口语，内部字段读起来不如 `originDate` 稳定

- `originDate`
  - 最中性
  - 既可表达普通 Todo 的原始创建日，也可表达 repeating occurrence 的原始命中日
  - 最适合给 UI 文案“创建于 M/D”做统一来源

命名结论：
- 推荐未来新增字段名为 `originDate`

### V2.1-B 推荐结论

在后续允许改 schema / 加字段时，推荐新增：

```ts
originDate?: string
```

语义定义：
- `date`：当前落点日期
- `originDate`：这条 Todo 或这条 occurrence 最初创建于的日期

在此方案下：
- 普通 Todo、分次 Todo、从种草加入 Todo、repeating occurrence 全部统一
- UI “创建于”有稳定来源
- 顺延搬移不再依赖 root 链反查
- `rootItemId` 更纯粹地承担“身份关联”职责，而不是“回头推断创建日”职责

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
- 同步 rollover / 顺延搬移
- 保证重复规则消费语义
- 支撑历史兼容

当前历史实现中复用的链字段仍是：
- `rootItemId`
- `continuationOfItemId`
- `carriedFromDate`

V2.1-C 已新增：
- `originDate`

但它们不应直接决定：
- UI 上有哪些按钮
- 普通 Todo 是否能顺延到今天
- 从种草加入的 Todo 是否算普通 Todo

---

## 七、普通 Todo 的 V2.1 行为映射

### 1. 普通未完成 Todo 默认顺延到今天

V2.1 规则要求：
- 一次性 Todo 未完成时，默认顺延到今天

当前推荐解释为：
- 产品心智应优先理解为“date 搬移”
- 不再把 continuation / carryover 副本视为目标实现
- 若为了兼容历史数据暂时保留旧链字段，也应降级为过渡期技术说明

### 2. 删除语义

普通一次性 Todo 的删除，产品上表示：
- 结束这条 Todo
- 停止未来顺延

底层可继续保留内部链路字段，但删除行为不应再被解释为：
- 只是某种内部 source 的删除

### 3. 分次语义

分次 Todo 在产品上只是一条带 `progressPercent` 的普通 Todo。

当前推荐解释为：
- 仍允许底层通过历史链字段兼容旧数据
- 但 UI 只看：
  - 当前进度
  - 是否完成
  - 创建于哪一天

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

### 2. 删除某条 occurrence 与 停止重复

产品规则必须区分：

1. 删除某条 occurrence
- 只结束这一条 occurrence

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
3. 再重构 rollover 与 recurrence

---

## 十一、必须遵守的 V2.1 数据规则

- Todo 是产品主语
- UI 不直接根据 `source / templateKind / recurringInstanceId / consumesDateTrigger / continuation` 决定交互
- 普通未完成 Todo 默认顺延到今天
- 普通 Todo 删除表示结束整条 Todo
- 重复 Todo 必须区分“删除当天实例”和“停止重复”
- 分次只是进度属性，不是独立产品子系统
- 必要与需要准备只是 UI 属性
- 种草只是来源之一，不是普通 Todo 的前置流程
