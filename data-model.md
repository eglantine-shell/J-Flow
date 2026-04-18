# 数据模型文档

本文档定义 V1 的核心数据结构。
V1 使用本地存储，因此需要明确区分“长期存在的模板数据”和“某一天实际出现的实例数据”。

字段名允许使用英文，说明文字使用中文。

---

## 一、建模原则

### 1. 模板与实例分离
本项目至少存在两层数据：

- 决策库条目：长期存在，用户主动维护
- 当日事项实例：某一天实际出现在页面中的事项

不能将两者混为一体，否则会难以处理：
- 重复任务
- 分次任务
- 临时事项
- 自动生成事项
- 决策模式选入事项

### 2. 来源必须可追踪
Todo 模式中的事项必须知道自己来自哪里。
至少要区分：
- 自动生成
- 决策选入
- 临时手动添加

### 3. 任务条目需保留扩展空间
后续可能需要：
- 模糊搜索
- 前置提醒
- 更细的状态机

因此字段设计不能过死。

---

## 二、时间场景

type SceneTag = {
  id: string
  name: string
  createdAt: string
  isBuiltIn: boolean
}

说明：

时间场景是 tag，可多选
可由系统提供默认值，也可由用户自定义

## 三、活动类型
type ActivityType = {
  id: string
  name: string
  createdAt: string
  isBuiltIn: boolean
}

说明：
每条决策库条目必须有且只有一个主活动类型

## 四、决策库条目
type TaskTemplate = {
  id: string
  title: string
  date: string
  activityTypeId: string
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

字段说明：

title：条目内容，例如“《abc》”“买牛奶”“整理书架”
date：条目日期；所有条目都必须有该字段，添加时默认写入当天
activityTypeId：主活动类型
sceneTagIds：适用时间场景，可为空，可多选
只有少数系统内置标签参与白天/晚上映射，其他标签仅作为筛选标签
interestLevel：兴趣程度，1/2/3
isNecessary：是否必要
requiresPreparation：是否需要准备
preparationNotes：准备备注
recurrence：重复规则
对于重复条目，date 是重复规则的锚点
其中 `daily` 表示从锚点日期开始每天生效
V1 的 `daily / weekly / monthly / yearly` 都是“日历型重复”
- `daily`：从锚点日期开始，每天命中
- `weekly`：每周命中锚点对应的星期
- `monthly`：每月命中锚点对应的日号
- `yearly`：每年命中锚点对应的月 + 日
V1 不支持“每隔 x 天 / 每隔 x 周 / 每隔 x 月”的间隔型重复
若后续需要支持 interval-based recurrence，应扩展为另一套 recurrence 结构，而不是直接复用当前枚举语义
isSegmented：是否分次
isArchived：是否归档；仅表示用户主动停用该模板，不再参与决策与自动生成

## 五、重复任务周期实例

对于带重复规则的任务，需要有周期实例层。
否则无法处理“本周期已完成 / 未完成 / 过期未完成”。

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

说明：

dateKey：该实例所属周期的标识
daily: 2026-04-15
weekly: 2026-W16
monthly: 2026-04
yearly: 2026
这些实例键都服务于“日历型重复”：
- weekly 代表“该锚点星期所在周”
- monthly 代表“该锚点日号所在月”
- yearly 代表“该锚点月日所在年”
它们不表示“距离上次完成后过了一个间隔周期”
status：周期实例状态
progressState：用于兼容分次任务
progressPercent：实例级百分比进度，范围为 0-100；对于分次任务，0-99 表示继续中，100 表示整体完成
progressNote：自由进度说明，V1 可选填或由系统生成简单描述
每个被日期规则触发的非必要重复任务实例，都应在当天生成对应的 `DayPlanItem`

## 六、当日计划事项

这是某一天真正显示在决策模式或 todo 模式里的事项实例。

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

说明：

source 决定该事项来自哪里
manual_temporary 类型通常没有 templateId
decision_selected 通常来自某个 TaskTemplate
auto_generated 通常来自两类情况：
- 自动进入当天计划的必要事项
- 按日期规则触发的非必要重复任务
- 命中当天日期的非必要一次性条目
targetDate 表示该事项关联的目标日期：
- 对正常当天事项，通常与 `date` 相同
- 对提前手动选入的未来事项，`date` 是实际安排/完成日，`targetDate` 是原目标日期
timeBlock 只区分白天 / 晚上两种语境
timeBlockSource 用于区分：
- 明确映射到白天
- 默认归到白天
- 明确映射到晚上
- 因用户拖动进入晚间语境
若默认白天条目被重新拖回白天区域，则应恢复为白天语境
sortOrder 用于持久化当天计划中的显示顺序
status 用于控制 todo 显示与历史状态
progressPercent 为实例级进度字段，范围为 0-100
对于非分次任务，可在完成前保持为 0，完成后置为 100
consumesDateTrigger 用于表达该 `DayPlanItem` 是否消费了某个模板在某个目标日期上的自动触发机会
写入策略：
- 只要该 `DayPlanItem` 在完成后会抵消模板于 `targetDate` 当天的自动出现，就写入 `consumesDateTrigger = true`
- 这包括：
  - 当天正常自动触发并完成
  - 提前手动完成未来 `targetDate` 的事项
- 临时事项或不抵消任何目标日期触发机会的普通手动事项，不写入 `consumesDateTrigger = true`
若某 `RecurringTaskInstance` 在当天被触发且其模板为非必要重复任务，则通常应存在一个关联的 `DayPlanItem`，并通过 `recurringInstanceId` 建立关系
若某条目因“必要事项”或“命中当天日期的一次性事项”自动进入当天计划，则其 `DayPlanItem` 可不依赖 `recurringInstanceId`
若未来日期的一次性非必要条目被提前手动选入并完成，则原目标日期不应再自动出现该条目

轻量建模建议：
- V1 采用“实例层承载消费语义”的方案，不单独新增完整的 occurrence / trigger 记录表
- 推荐用 `targetDate + consumesDateTrigger` 表达“本次触发已被消费”
- 这样可以保持：
  - 模板层仍然只描述长期规则
  - 实例层承载某次实际安排与完成
  - 实现复杂度低于新增独立触发记录层

## 七、临时事项

V1 可直接复用 DayPlanItem，不必单独建表。
只需满足：

source = manual_temporary
templateId 为空
title 仅为一行文字

## 八、设置项
type AppSettings = {
  initialized: boolean

  tieBreakerOrder: 'asc' | 'desc'

  weatherEnabled: boolean

  createdAt: string
  updatedAt: string
}

说明：

initialized：是否完成首次初始化
tieBreakerOrder：兴趣程度相同时按加入时间正序或倒序
weatherEnabled：V1 不启用真实天气，但预留开关

## 九、推荐逻辑输入输出

为了让推荐逻辑更清晰，建议单独抽象输入输出结构。

type RecommendationInput = {
  date: string
  timeBlock: 'day' | 'night'
  activityTypeId: string
  sceneTagIds: string[]
}
type RecommendationResult = {
  recommended: TaskTemplate | null
  candidates: TaskTemplate[]
}

说明：

sceneTagIds 表示当前决策语境下由系统自动推导出的场景条件
当前时段语境只区分白天 / 晚上
V1 不做打分，只做筛选 + 排序

## 十、建议的本地存储结构
type AppData = {
  settings: AppSettings
  sceneTags: SceneTag[]
  activityTypes: ActivityType[]
  taskTemplates: TaskTemplate[]
  recurringTaskInstances: RecurringTaskInstance[]
  dayPlanItems: DayPlanItem[]
}

## 十一、必须遵守的数据规则
每个决策库条目必须有一个活动类型
时间场景可以为空
临时事项不能回写模板状态
分次任务不预设总次数
百分比进度只保存在实例层，不保存在模板层
重复任务必须通过周期实例追踪状态
所有必要事项必须自动生成对应的当日实例
按日期规则触发的非必要重复任务必须自动生成对应的当日实例
命中当天日期的非必要一次性条目必须自动生成对应的当日实例
所有条目都必须有日期字段
重复任务必须以模板日期作为重复锚点
Todo 模式显示的是实例，不直接显示模板
决策推荐的对象是模板，加入计划后才生成实例
同一模板在同一天的同一时段语境内不能重复生成实例

补充说明：
- 当前数据模型已经可以表达“模板仍存在，但某次当日计划已完成”
- 为了表达“未来日期的一次性非必要条目被提前完成后，其原目标日期这次触发已被消费”，推荐在实例层使用 `targetDate` 与 `consumesDateTrigger`
- 当前不建议为 V1 单独引入完整的 occurrence / trigger 记录表，除非后续规则继续显著变复杂
- 不应将该语义实现为 `TaskTemplate.isArchived = true`
