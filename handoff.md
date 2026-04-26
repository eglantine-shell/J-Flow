# 项目交接摘要

## 当前版本目标
- 当前已从 V2 试用修复阶段，进入 V2.1：Todo 行为重构准备阶段。
- 本轮核心目标不是继续堆功能，而是重写产品规则，让 Todo 成为唯一主语。

## 当前阶段结论
- 当前 UI 已基本具备 Todo 外观，但产品规则、数据模型口径与关键实现仍偏向模板 / 实例 / 来源分支中心。
- V2 试用后确认：当前系统虽然功能很多，但基础 Todo List 心智不对。
- V2.1 的首要任务是把“像 Todo”提升为“本质上就是 Todo”。

## V2.1 核心表达
- Todo 是一等公民。
- 普通未完成 Todo 默认跨日延续。
- 普通 Todo 删除 = 结束这条 Todo。
- 重复 Todo 需要区分“删除当天实例”和“停止重复”。
- 分次只是 Todo 的 progress 属性。
- 必要与需要准备只是 UI 属性。
- 种草只是 Todo 来源之一。
- UI 后续应基于 `TodoViewModel`，而不是直接根据底层来源字段分支。

## 当前旧实现的核心问题
- UI 上看到的是 Todo。
- 但系统真实主语仍然偏向：
  - `TaskTemplate`
  - `DayPlanItem`
  - `RecurringTaskInstance`
  - `continuation`
- 用户行为仍被以下内部字段分叉：
  - `source`
  - `templateKind`
  - `recurringInstanceId`
  - `consumesDateTrigger`
  - `rootItemId / continuationOfItemId`

## 本轮文档迁移结论
- `product-rules.md` 已切到 V2.1 口径。
- `app-structure.md` 已明确 Todo 区应基于 `TodoViewModel` 工作。
- `data-model.md` 已把 `source / templateKind / recurringInstanceId / consumesDateTrigger / continuation` 降级为内部实现说明。
- `task-list.md` 已改为 V2.1-1 到 V2.1-4 四个任务包。
- `manual-test-checklist.md` 已改为以 Todo 直觉为中心的手测口径。

## 哪些旧规则被处理

### 已废弃为产品主规则
- “UI 直接消费 DayPlanItem，并按来源决定交互”
- “未完成跨日主要是分次专属能力”
- “种草是普通 Todo 的前置流程”
- “重复 Todo 的产品主语是模板与实例”

### 已降级为内部实现说明
- `source`
- `templateKind`
- `recurringInstanceId`
- `consumesDateTrigger`
- `continuation`
- `decision_selected`
- `todo_recurring`

### 当前继续保留
- 白天 / 晚上语境
- 日历型重复基础结构
- 种草清单
- 必要标记
- 准备备注
- 分次进度表达

## 推荐的后续任务顺序
1. V2.1-1：规则与文档重写（已完成）
2. V2.1-2：TodoViewModel 收口（已完成第一版）
3. V2.1-3：未完成 Todo 自然跨日延续（已完成第一版）
4. V2.1-4：重复 Todo 规则重构（已完成第一版）

## 当前已知风险
- 当前 UI 已新增 ViewModel 防腐层，但 action handler 内仍保留少量底层判断以维持既有行为。
- 当前 repeating Todo 已接入 active occurrence 与 carryover 第一版，但旧历史数据若已经堆出多个 pending occurrence，迁移期表现仍可能不够完美。
- `RecurringTaskInstance.status = expired` 当前同时承担“历史过期”和“本次跳过/结束”的内部语义，后续若要继续细化需要再评估。

## 当前明确未实现
- `decision_selected` 转重复
- 拖动排序 / 拖动改变晚间语境
- 导出 / 导入
- 已归档种草恢复
- 搜索 / 筛选
- 自动化业务测试
- iOS App 迁移

## 关键文件位置
- `AGENTS.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `task-list.md`
- `manual-test-checklist.md`
- `handoff.md`
- `dev-log.md`

## 最近一次完成的 task
- 完成 V2.1-4 第一版：
  - 全部 recurrence 类型统一为“同模板最多一个 active pending occurrence”
  - `auto-generated` 生成前先检查 active occurrence
  - repeating Todo 可通过 carryover 延续到后续日期
  - 删除 repeating carryover 等价于结束/跳过本次 occurrence
  - 停止重复继续仅通过归档模板完成
  - 未新增字段、未改 schema
- 完成 V2.1-4 规则方案确认：
  - 推荐 repeating Todo 采用“同一重复模板最多一个 active pending occurrence”
  - 明确 carryover repeating Todo 仍属于同一 occurrence
  - 明确删除当天实例 = 结束本次 / 跳过本次，未来命中仍可继续生成
  - 明确停止重复 = 归档模板，历史保留，未来不再生成
  - 当前推荐继续复用现有字段，不新增 schema
- 完成 V2.1-3 第一版：
  - `continuation` 改造成通用 todo carryover 同步
  - 普通未完成 Todo 自动跨日延续
  - 分次 Todo 并入同一套 carryover 机制
  - 普通 Todo 删除后通过链结束规则阻止未来继续延续
  - 重复 Todo 深层规则保持不变
- 完成 V2.1-2 第一版：
  - 新增 `TodoViewModel` 映射层
  - `TodoModePanel` 改为先映射 `DayPlanItem` 再渲染
  - `canEdit / canDelete / canComplete / canUncomplete / canStopRepeating` 收口到映射层
  - 来源标签、重复判断、carry hint 收口到映射层
- 完成 V2.1-1：
  - Todo 一等公民规则重写
  - 普通未完成 Todo 自动跨日延续规则写入
  - 删除语义重写
  - 分次降级为 progress 属性
  - 种草降级为来源
  - TodoViewModel 规划写入文档
  - 旧来源字段降级为内部实现说明
