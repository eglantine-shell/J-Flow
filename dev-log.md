# Dev Log

## 2026-04-27（V2.1-D：repeating occurrence 重构）

### 本轮目标
- 废弃 repeating Todo 的 single active occurrence 阻断
- 同一模板 + 同一命中日最多一条 occurrence
- 不同命中日的 occurrence 可以并存
- repeating occurrence 未完成时直接搬移自己的 `date`
- 删除本次 occurrence 与停止重复保持分离

### 开始前已阅读
- `handoff.md`
- `dev-log.md`
- `task-list.md`
- `src/features/recurrence/auto-generated.ts`
- `src/features/continuation/todo-carryover.ts`
- `src/features/todo/TodoModePanel.tsx`
- `src/features/todo/todo-view-model.ts`

### 本轮关键判断
- 旧的 active occurrence 阻断会错误阻止新命中日 occurrence 生成，不符合当前产品规则。
- repeating occurrence 的核心是“同命中日去重”，不是“同模板全局只留一个 pending”。
- repeating rollover 与普通 Todo 一样改成搬移 `date` 后，才符合“每个 occurrence 都是一条普通 Todo”的规则。

### 本轮关键决策
- `auto-generated` 不再查“同模板最早 pending occurrence”。
- 改为：
  - 同模板 + 同一命中日只生成一次
  - 若该命中日已有 pending/completed occurrence，则复用并同步已有条目
  - 若该命中日已有 deleted occurrence，则不重新生成
- `todo-carryover` 不再为 repeating 复制副本
- deleting repeating Todo 继续：
  - `DayPlanItem.status = deleted`
  - `RecurringTaskInstance.status = expired`
  - 不归档模板

### 本轮修改
- 更新 `src/features/recurrence/auto-generated.ts`
  - 去掉 single active occurrence 阻断
  - 改为按 `templateId + targetDate/originDate` 去重
- 更新 `src/features/continuation/todo-carryover.ts`
  - repeating 也改成 date 搬移式 rollover
  - 不再创建 repeating carryover 副本
- 更新文档：
  - `dev-log.md`
  - `handoff.md`
  - `task-list.md`
  - `manual-test-checklist.md`

### 本轮刻意未做
- 未重构 repeating 的取消完成状态机
- 未删除旧 continuation 字段
- 未处理“不能创建过去 Todo”的问题
- 未做 UI polish

### 当前风险与待确认问题
- 若历史数据里已经存在旧的 repeating carryover 副本链，本轮不会主动清洗旧副本，只保证新行为不再继续扩展它们。
- 删除某个 repeating occurrence 后，如果该命中日不存在对应 `RecurringTaskInstance`，当前只能依赖 `DayPlanItem.status = deleted` 阻止再显示。

### 验证结果
- `pnpm run lint`：通过
- `pnpm run build`：通过
  - 保留既有 Vite chunk size warning，不影响构建成功

## 2026-04-27（V2.1-C：originDate 落地 + 普通 Todo 顺延搬移）

### 本轮目标
- 给 `DayPlanItem` 增加 `originDate`
- 所有新建 Todo 写入 `originDate`
- 把普通一次性 Todo 的跨日逻辑从“复制 carryover”改成“搬移 date”
- UI 提示从“延续自”改为“创建于”
- 不重构 repeating occurrence 生成规则

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `data-model.md`
- `app-structure.md`
- `task-list.md`
- `manual-test-checklist.md`
- `src/types/models.ts`
- `src/db/schema.ts`
- `src/db/storage.ts`
- `src/features/continuation/todo-carryover.ts`
- `src/features/recurrence/auto-generated.ts`
- `src/features/todo/todo-view-model.ts`
- `src/features/todo/TodoModePanel.tsx`
- `src/features/decision/recommendation.ts`

### 本轮关键判断
- `originDate` 必须落到模型、schema、storage 和创建路径，才能让“创建于”不再依赖 root 链反查。
- 普通 Todo 的 rollover 可以先安全切成 date 搬移，而 repeating Todo 本轮继续保守沿用旧 carryover 逻辑。
- 旧数据兼容最稳的方式，是统一回退到 `originDate ?? targetDate ?? date`。

### 本轮关键决策
- 新增 `DayPlanItem.originDate?: string`
- schema version 升到 `4`
- storage 在读取与持久化前统一补全旧数据 `originDate`
- 普通 rollover 只更新原条目：
  - `date`
  - `sortOrder`
  - 缺失时补 `originDate`
- 新的普通 rollover 不再继续写 `continuationOfItemId / carriedFromDate`
- `TodoViewModel.carryHint` 改为 `createdAtHint`

### 本轮修改
- 更新 `src/types/models.ts`
  - 为 `DayPlanItem` 增加 `originDate`
- 更新 `src/db/schema.ts`
  - 为 `dayPlanItemSchema` 增加 `originDate`
  - `APP_DATA_SCHEMA_VERSION` 升到 `4`
- 更新 `src/db/storage.ts`
  - 新增旧数据 `originDate` 回退兼容
  - `normalizeDayPlanItem` 自动写入 `originDate`
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 手动创建与手动创建 repeating 当天实例写入 `originDate`
  - UI 改读 `createdAtHint`
- 更新 `src/features/decision/recommendation.ts`
  - `decision_selected` 写入 `originDate`
- 更新 `src/features/recurrence/auto-generated.ts`
  - `auto_generated` 写入并保留 `originDate`
- 更新 `src/features/continuation/todo-carryover.ts`
  - 普通 Todo 改成 date 搬移式 rollover
  - repeating Todo 保留旧 carryover 副本逻辑，但会带上 `originDate`
- 更新 `src/features/todo/todo-view-model.ts`
  - `carryHint` 改为 `createdAtHint`
  - UI 文案改成“创建于 M/D”
  - `originLabel` 不再使用“延续”
- 更新文档：
  - `product-rules.md`
  - `data-model.md`
  - `app-structure.md`
  - `task-list.md`
  - `handoff.md`
  - `dev-log.md`
  - `manual-test-checklist.md`

### 本轮刻意未做
- 未重构 repeating occurrence 生成规则
- 未废弃 repeating 的 active occurrence 旧逻辑
- 未删除旧 continuation 字段
- 未做大规模 UI polish
- 未引入新依赖

### 当前风险与待确认问题
- repeating Todo 仍存在旧 carryover / single active occurrence 心智，等待 V2.1-D 处理。
- 旧数据虽然能兼容补出 `originDate`，但若历史链已经很长，“创建于”未必总能回到最初第一次进入 Todo 列表的那天。
- `decision_selected` 的旧兼容回退仍可能拿到 `targetDate` 而非真实加入日，这只会存在于老数据，后续新数据已改正。

### 验证结果
- `pnpm run lint`：通过
- `pnpm run build`：通过
  - 保留既有 Vite chunk size warning，不影响构建成功

## 2026-04-27（V2.1-B：Todo rollover 模型确认）

### 本轮目标
- 只确认 rollover 模型
- 对比 `rootItemId`、`originDate`、`occurrenceDate` 等方案
- 不改源码
- 不改 schema

### 开始前已阅读
- `handoff.md`
- `dev-log.md`
- `product-rules.md`
- `data-model.md`
- `app-structure.md`
- `task-list.md`
- `manual-test-checklist.md`
- `src/types/models.ts`
- `src/db/schema.ts`
- `src/db/storage.ts`
- `src/features/continuation/todo-carryover.ts`
- `src/features/recurrence/auto-generated.ts`
- `src/features/todo/todo-view-model.ts`
- `src/features/todo/TodoModePanel.tsx`
- `src/features/decision/recommendation.ts`

### 本轮关键判断
- 现有 `rootItemId -> 根实例 date` 更像历史链兼容技巧，不适合作为长期 UI “创建于”来源。
- 若采用真正的“顺延搬移”，`date` 必须收敛成“当前落点日期”，不能再同时承担原始创建日语义。
- `targetDate` 当前主要服务 recurrence 命中与 `consumesDateTrigger`，不适合作为所有 Todo 的统一“创建于”来源。
- 对 repeating Todo 单独加 `occurrenceDate` 会让普通 Todo 与 repeating Todo 分裂建模，不如 `originDate` 统一。

### 本轮关键决策
- 长期推荐在允许改 schema 时新增：
  - `originDate?: string`
- 字段语义：
  - `date` = 当前落点日期
  - `originDate` = 这条 Todo 或这条 occurrence 最初进入 Todo 列表的日期
- `targetDate` 继续主要承担：
  - recurrence 命中日
  - 自动生成消费语义
- `rootItemId / continuationOfItemId / carriedFromDate` 后续转向兼容层角色

### 本轮修改
- 更新 `data-model.md`
  - 补充 V2.1-B 方案比较与推荐结论
- 更新 `product-rules.md`
  - 补充 `originDate` 作为长期“创建于”来源的方向
- 更新 `app-structure.md`
  - 补充 `TodoViewModel.createdAtHint` 后续优先基于 `originDate`
- 更新 `task-list.md`
  - 补充 V2.1-B 后续实现顺序
- 更新 `handoff.md`
  - 同步 `date / targetDate / originDate` 的推荐定位
- 更新 `manual-test-checklist.md`
  - 补充 `createdAtHint` 后续推荐读取 `originDate`
- 更新 `dev-log.md`
  - 记录本轮模型确认结论

### 当前待确认问题
- 未来是否直接命名为 `originDate`，还是在实现前再与 `createdForDate / originalDate` 做一次最终命名确认
- 旧数据迁移时，是否用根实例 `date` 作为一次性回填来源
- repeating occurrence 的 `originDate` 是否直接使用 `targetDate`，还是优先使用 `RecurringTaskInstance.dateKey` 转日历日

### 验证结果
- 本轮只修改文档
- 未改源码
- 未运行 `pnpm run build`
- 未运行 `pnpm run lint`

## 2026-04-26（V2.1-A：Todo 跨日逻辑产品规则重构）

### 本轮目标
- 只重写产品规则与文档口径
- 把跨日逻辑从 carryover / continuation 副本心智改成顺延搬移心智
- 废弃 repeating Todo 的 single active occurrence 规则
- 不改源码

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`
- `manual-test-checklist.md`

### 本轮关键判断
- “昨天一条、今天再复制一条延续副本”的模型，仍然不像成熟 Todo List。
- 对一次性 Todo，更自然的用户理解是：没做完就搬到今天，而不是复制一个 continuation。
- 对 repeating Todo，新的命中日 occurrence 不应被旧 occurrence 未完成阻止；不同命中日的 occurrence 可以并存。
- UI 上“延续自某日”不再适合新模型，应该改为“创建于某日”。

### 本轮关键决策
- 普通一次性 Todo 改为“单实例流动”：
  - 同一条 Todo 在任一时刻只保留一个当前实例
  - 未完成时顺延搬移到今天
- 分次 Todo 改为“普通 Todo + progress”：
  - `progressPercent < 100` 时照常顺延搬移
- repeating Todo 改为“多 occurrence，各 occurrence 单实例流动”：
  - recurrence 只负责在命中日创建新的 occurrence
  - 不同命中日 occurrence 可以并存
- `continuation / carryover` 降级为历史实现说明，不再作为目标产品心智
- “创建于某日”字段来源本轮只记录分析，不新增字段

### 本轮修改
- 更新 `product-rules.md`
  - 普通 Todo 跨日规则改为顺延搬移
  - 废弃 single active occurrence 规则
  - repeating 改为多 occurrence 并存
- 更新 `app-structure.md`
  - Todo 区加载与展示心智改为 rollover / 顺延搬移
  - UI 提示改为“创建于某日”
- 更新 `data-model.md`
  - `carryHint` 规划改为 `createdAtHint`
  - 记录 `originDate / createdForDate / occurrenceDate` 的待确认分析
- 更新 `task-list.md`
  - 重排为 V2.1-A 到 V2.1-E
- 更新 `manual-test-checklist.md`
  - 手测口径改为顺延搬移与“创建于”
- 更新 `handoff.md`
  - 同步当前已确认的新规则与后续任务顺序
- 更新 `dev-log.md`
  - 记录本轮决策与旧口径废弃项

### 本轮废弃的旧口径
- carryover 生成副本
- continuation 副本链是产品心智
- 同一重复模板最多一个 active pending occurrence
- 旧 occurrence 未完成时不生成下一次 occurrence
- UI 显示“延续自某日”

### 当前待确认问题
- 普通 Todo 的“创建于某日”是否可稳定复用根实例 `date`
- repeating occurrence 的“命中日”是否应复用 `targetDate` / `RecurringTaskInstance.dateKey`
- 若现有字段不足，未来是否要新增 `originDate`、`createdForDate` 或 `occurrenceDate`

### 验证结果
- 本轮只修改文档
- 未改源码
- 未运行 `pnpm run build`
- 未运行 `pnpm run lint`

## 2026-04-26（V2.1：carryover 触发时机与 completed 链终止补丁）

### 本轮目标
- 修正 carryover 不应在“手动切到未来日期”时发生的问题
- 修正已完成 Todo 不应继续 carryover 到后续日期的问题
- 不改 recurrence 规则
- 不改 TodoViewModel 架构
- 不新增字段
- 不改 schema

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`
- `src/features/continuation/todo-carryover.ts`
- `src/features/todo/TodoModePanel.tsx`

### 本轮关键判断
- carryover 的产品含义是“现实日期推进后的继续显示”，不是“用户手动浏览未来日期时的预写入”。
- 旧逻辑按“最新 pending 候选”找 carryover，会忽略同 root 链更晚的 `completed` 或 `deleted`，从而把已经结束的链重新捞出。
- 这轮只需要修正同步触发时机和 root 链状态判断，不需要碰 recurrence 生成规则。

### 本轮关键决策
- `syncTodoCarryoversForDate` 继续保留，但只在 `selectedDate === localToday` 时触发。
- `localToday` 使用本地日期格式字符串，与项目现有 `YYYY-MM-DD` 格式一致，不引入 UTC 比较。
- carryover 候选改为先按 `rootItemId ?? id` 分组，再取 `selectedDate` 之前每条链的最新条目。
- 若普通 Todo 链最新条目状态为 `completed` 或 `deleted`，则整条链结束，不再 carryover。

### 本轮修改
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 数据同步链路改为：
    - 先执行 `syncAutoGeneratedDayPlanForDate(selectedDate)`
    - 仅当 `selectedDate === localToday` 时执行 `syncTodoCarryoversForDate(selectedDate)`
- 更新 `src/features/continuation/todo-carryover.ts`
  - 新增“按 root 链取 selectedDate 之前最新条目”的筛选逻辑
  - carryover 改为基于链最新状态决定，而不是基于较早的 pending 候选决定
  - 避免 `completed` / `deleted` 后又从更早 pending 重新生成
- 更新文档：
  - `product-rules.md`
  - `app-structure.md`
  - `task-list.md`
  - `handoff.md`
  - `manual-test-checklist.md`
  - `dev-log.md`

### 本轮刻意未做
- 未改 recurrence active occurrence 规则
- 未改 `templateKind`
- 未改 schema
- 未新增字段
- 未重构 TodoViewModel
- 未做 UI 改版
- 未引入新依赖

### 当前风险与待确认问题
- 本轮没有改 `auto-generated` 的日期查看逻辑，仍按既有 selectedDate 同步，这符合本轮“只修 carryover”边界。
- repeating Todo 的删除语义与更细状态机本轮没有重构，只保证普通 Todo 已完成/已删除链不再被旧 pending 复活。

### 验证结果
- `pnpm run lint`：通过
- `pnpm run build`：通过
  - 保留既有 Vite chunk size warning，不影响构建成功
## 2026-04-26（V2.1-4：repeating Todo active occurrence 重构）

### 本轮目标
- 实现 repeating Todo 的 active occurrence 规则
- 让重复 Todo 更符合 Todo app 心智，而不是 habit tracker 堆叠逻辑
- 不新增字段
- 不改 schema
- 不改种草推荐逻辑

### 开始前已阅读
- `handoff.md`
- `dev-log.md`
- `product-rules.md`
- `data-model.md`
- `app-structure.md`
- `task-list.md`
- `manual-test-checklist.md`
- `src/features/recurrence/auto-generated.ts`
- `src/features/continuation/todo-carryover.ts`
- `src/features/todo/todo-view-model.ts`
- `src/features/todo/TodoModePanel.tsx`

### 本轮关键判断
- 真正导致重复 Todo 像 habit tracker 的核心问题，不在 UI，而在 `auto-generated` 仍按“命中就生成”。
- repeating Todo 要符合 Todo 心智，必须同时满足两件事：
  - 生成前先检查 active occurrence
  - 未完成 active occurrence 能继续 carryover
- 当前不新增字段仍可做出第一版，因为：
  - `RecurringTaskInstance.status`
  - `DayPlanItem.recurringInstanceId`
  - carryover 链字段
  已经足够表达大部分状态。

### 本轮关键决策
- 全部 recurrence 类型统一采用：
  - 同一重复模板最多一个 active pending occurrence
- `auto-generated` 生成前先查该模板是否已有 pending occurrence。
- 若已有旧的 pending occurrence：
  - 不生成新的 `RecurringTaskInstance`
  - 不生成新的 `DayPlanItem`
  - 交给 carryover 把旧 occurrence 带到今天
- deleting repeating Todo 时：
  - `DayPlanItem.status = deleted`
  - 若有关联 `RecurringTaskInstance`，用 `status = expired` 表达“本次结束/跳过”
  - 不归档模板
- stopping recurring 时：
  - 继续仅归档模板

### 本轮修改
- 更新 `src/features/recurrence/auto-generated.ts`
  - 新增 active pending occurrence 检查
  - 已有 active occurrence 时，不再生成新的 repeating occurrence
  - auto-generated 条目统一补 `rootItemId`
- 更新 `src/features/continuation/todo-carryover.ts`
  - 放开未完成 repeating occurrence 参与 carryover
  - carryover repeating Todo 保持同一个 `recurringInstanceId`
  - 不创建新的 `RecurringTaskInstance`
- 更新 `src/features/todo/todo-view-model.ts`
  - repeating auto-generated Todo 映射为可删除
  - `canStopRepeating` 继续只对 `todo_recurring` 放开
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 删除 repeating Todo 时，同步把 `RecurringTaskInstance.status` 改为 `expired`
- 更新文档：
  - `product-rules.md`
  - `data-model.md`
  - `app-structure.md`
  - `task-list.md`
  - `handoff.md`
  - `dev-log.md`
  - `manual-test-checklist.md`

### 本轮刻意未做
- 未新增字段
- 未改 schema
- 未改 storage
- 未改 recurrence 类型
- 未做大规模 UI polish
- 未扩展复杂的 repeating 取消完成状态机
- 未改种草推荐逻辑

### 当前风险与待确认问题
- 若旧历史数据中已经存在多个同模板 pending repeating occurrence，当前第一版会尽量只认其中一个 active，但迁移期表现未必绝对完美。
- `expired` 当前同时承担“历史过期”和“本次跳过/结束”的内部语义，这在实现上可行，但语义不够优雅。
- 当前 repeating auto-generated 的标题编辑仍保持保守不放开。
- 当前 repeating auto-generated 的取消完成没有进一步扩展复杂状态机，本轮维持原有能力边界。

### 验证结果
- `pnpm run lint`：通过
- `pnpm run build`：通过
  - 保留既有 Vite chunk size warning，不影响构建成功

## 2026-04-26（V2.1-4：repeating Todo 规则重构方案确认）

### 本轮目标
- 只确认 repeating Todo 的重构方案
- 允许修改规则文档、模型口径、任务清单与交接文档
- 不改源码

### 开始前已阅读
- `handoff.md`
- `dev-log.md`
- `product-rules.md`
- `data-model.md`
- `app-structure.md`
- `task-list.md`
- `manual-test-checklist.md`
- `src/features/recurrence/auto-generated.ts`
- `src/features/continuation/todo-carryover.ts`
- `src/features/todo/todo-view-model.ts`
- `src/features/todo/TodoModePanel.tsx`

### 本轮关键判断
- J-Flow 是 Todo app，不是 habit tracker；默认不应采用“旧的没完成，新的还照样继续堆”的重复心智。
- 对 repeating Todo 最自然的用户理解是：
  - “这条重复 Todo 还没做完”
  - 而不是“系统又给我生成了一条新的同名任务”
- 按 recurrence 类型分裂产品规则会显著增加复杂度，但并不会明显提升用户理解。

### 本轮关键决策
- 推荐采用方案 A：
  - 同一重复模板最多一个 active pending occurrence
- 不推荐采用方案 B：
  - 每次命中都无条件生成新的 occurrence
- 不推荐 V2.1 采用方案 C：
  - 按 `daily / weekly / monthly / yearly` 分裂成多套不同心智
- 当前推荐继续复用现有字段，不新增 schema。
- `consumesDateTrigger` 当前仍可继续承担“本次命中已消费/跳过”的内部语义。

### 现有代码影响分析
- `src/features/recurrence/auto-generated.ts`
  - 当前是“命中即生成”。
  - 后续需新增“同模板已有 active pending occurrence 时，不生成新的 recurring instance/day item”判断。
- `src/features/continuation/todo-carryover.ts`
  - 当前保守排除 repeating Todo。
  - 若采用方案 A，后续需要让未完成 repeating occurrence 参与 carryover，但仍属于同一 occurrence。
- `src/features/todo/todo-view-model.ts`
  - 需要在后续实现中承接 repeating carryover 的能力映射。
  - carryover 出来的 repeating Todo 仍应表现为同一条当前待处理 Todo。
- `src/features/todo/TodoModePanel.tsx`
  - 后续需要校正完成、删除当天实例、停止重复的交互含义。
- `data-model / schema`
  - 当前不推荐新增字段，先复用现有结构验证。

### 本轮修改
- 更新 `product-rules.md`
  - 写入 repeating Todo 推荐方案 A
  - 明确 active occurrence 定义
  - 明确 pending / completed / deleted 的影响
  - 明确 carryover repeating Todo 仍属于同一 occurrence
- 更新 `data-model.md`
  - 记录现有字段复用方案
  - 记录 `RecurringTaskInstance`、`consumesDateTrigger` 与 carryover 的分工建议
- 更新 `app-structure.md`
  - 记录 repeating Todo 的推荐加载与展示心智
- 更新 `task-list.md`
  - 补 V2.1-4 推荐方案与实现拆分
- 更新 `handoff.md`
  - 同步下一阶段重点与已确认方向
- 更新 `manual-test-checklist.md`
  - 补充 V2.1-4 推荐口径
- 更新 `dev-log.md`
  - 记录本轮判断与后续实现边界

### 本轮刻意未做
- 未改任何源码
- 未改 schema
- 未改 storage
- 未新增字段
- 未开始 V2.1-4 的业务实现

### 当前风险与待确认问题
- 现有 `RecurringTaskInstance.status = expired` 的旧语义与“单 active occurrence”如何最平滑对齐，仍需实现前再细化。
- `consumesDateTrigger` 虽可继续复用，但后续若出现“跳过本次”和“提前完成未来命中”混用不清的问题，仍可能需要再细化内部口径。
- 当前仍需产品最终确认：
  - daily / weekly / monthly / yearly 是否全部统一采用方案 A
  - 删除 carryover repeating Todo 是否明确等价于“结束本次 occurrence”

### 验证结果
- 本轮仅修改文档，未运行构建与 lint。

## 2026-04-26（V2.1-3：普通未完成 Todo 的自然跨日延续）

### 本轮目标
- 把当前“只服务分次的 continuation”改造成更通用的 todo carryover
- 普通未完成 Todo 也应自动延续到下一天
- 不重构 recurrence
- 不实现“同一重复规则最多一个 active occurrence”
- 不新增字段，不改 schema，不改 storage

### 开始前已阅读
- `handoff.md`
- `dev-log.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `task-list.md`
- `manual-test-checklist.md`
- `src/features/continuation/segmented-continuation.ts`
- `src/features/decision/recommendation.ts`
- `src/features/todo/TodoModePanel.tsx`
- `src/features/todo/todo-view-model.ts`
- `src/types/models.ts`
- `src/db/schema.ts`
- `src/db/storage.ts`

### 本轮关键判断
- 旧 continuation 最大的问题不是“分次有 bug”，而是它把“跨日延续”错误地当成了分次专属能力。
- 若只把 `progressPercent > 0` 的分次继续延续，`0%` 分次和普通 pending Todo 都会违背 V2.1 规则。
- 若不把 completed 也视为链结束，旧 root 上更早的 pending 实例会在后续日期被错误“复活”。
- 本轮对 repeating Todo 最安全的做法是保守排除，不碰其 occurrence 规则。

### 本轮关键决策
- 新增 `src/features/continuation/todo-carryover.ts` 作为通用 carryover 模块。
- 将 `syncSegmentedContinuationsForDate` 降级为兼容别名，内部转调 `syncTodoCarryoversForDate`。
- carryover 可延续条件改为：
  - `status = pending`
  - `date < selectedDate`
  - 非 repeating
  - 普通 Todo：pending 即延续
  - 分次 Todo：`progressPercent < 100` 即延续，包含 `0%`
- 链结束条件改为：
  - 同 root 在 selectedDate 之前出现 `completed` 或 `deleted`
  - 都视为链结束
- selectedDate 当天若已有同 root 的任何状态实例，不再重复生成。
- `manual_temporary` 与 `decision_selected` 新建时固定补 `rootItemId`，保证后续链稳定。

### 本轮修改
- 新增 `src/features/continuation/todo-carryover.ts`
  - 实现：
    - `syncTodoCarryoversForDate`
    - `findLatestTodoCarryover`
    - `findLatestSegmentedTemplateCarryover`
- 更新 `src/features/continuation/segmented-continuation.ts`
  - 改为兼容导出层
- 更新 `src/features/continuation/index.ts`
  - 导出新 carryover 模块
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 日期加载顺序改为：
    - `syncAutoGeneratedDayPlanForDate`
    - `syncTodoCarryoversForDate`
  - `manual_temporary` 新建后固定补 `rootItemId`
- 更新 `src/features/decision/recommendation.ts`
  - `decision_selected` 新建后固定补 `rootItemId`
  - 保留分次模板最近未完成链进度继承
- 更新 `src/features/todo/todo-view-model.ts`
  - 对“非 repeating 的 auto_generated carryover”放开普通 Todo 能力映射
- 更新文档：
  - `product-rules.md`
  - `data-model.md`
  - `app-structure.md`
  - `task-list.md`
  - `handoff.md`
  - `dev-log.md`
  - `manual-test-checklist.md`

### 本轮刻意未做
- 未改 `src/types/models.ts`
- 未改 `src/db/schema.ts`
- 未改 `src/db/storage.ts`
- 未改 recurrence 生成规则
- 未实现“同一重复规则最多一个 active occurrence”
- 未重构 repeating Todo 的 occurrence 生命周期
- 未改 templateKind 规则
- 未引入新依赖

### 当前风险与待确认问题
- 本轮 carryover 主要处理一次性 Todo；对 `recurringInstanceId` 或 `templateKind = todo_recurring` 的 repeating Todo 继续保守排除。
- `auto_generated` 的“非 repeating 但非 carryover 当天实例”仍保持较保守能力映射，当前只对 carryover 普通 Todo 放开普通能力。
- repeating Todo 的 overdue / 下一次 occurrence 直觉问题仍完整留在 V2.1-4。

### 验证结果
- 待本轮代码完成后运行：
  - `pnpm run lint`
  - `pnpm run build`

## 2026-04-26（V2.1-2：TodoViewModel 收口）

### 本轮目标
- 新增 `TodoViewModel` 映射层
- 让 `TodoModePanel` 不再直接按 `source / templateKind / recurringInstanceId` 等底层字段决定基础交互
- 不改 carryover 规则
- 不改 recurrence 规则
- 不改数据模型、schema、storage

### 开始前已阅读
- `handoff.md`
- `dev-log.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `task-list.md`
- `design-guidelines.md`
- `constraints.md`
- `manual-test-checklist.md`
- `src/features/todo/TodoModePanel.tsx`
- `src/features/recurrence/auto-generated.ts`
- `src/features/continuation/segmented-continuation.ts`
- `src/features/decision/recommendation.ts`
- `src/types/models.ts`
- `src/db/schema.ts`
- `src/db/storage.ts`

### 本轮关键判断
- 本轮最稳的切口不是直接改业务规则，而是先加一层 UI 防腐层。
- `TodoModePanel` 当前最核心的问题不是“功能不够”，而是 JSX 里散落着来源分支判断。
- `source / templateKind / recurringInstanceId` 当前仍需要服务底层行为，但可以先集中收口到映射层。
- 为保持风险可控，本轮应保留少量 action handler 内部判断，以避免顺手改动现有完成 / 删除 / recurrence 语义。

### 本轮关键决策
- 新增 `src/features/todo/todo-view-model.ts`。
- 在该文件中集中定义：
  - `TodoViewModel`
  - `mapDayPlanItemToTodoViewModel`
  - `mapDayPlanItemsToTodoViewModels`
  - `isRepeatingTodo`
  - `getOriginLabel`
  - `getCarryHint`
  - `getTodoCapabilities`
- `TodoModePanel` 状态改为持有 `TodoViewModel[]`，而不是直接持有渲染期使用的 `DayPlanItem[]`。
- 编辑、删除、完成、取消完成、停止重复按钮优先改为读取：
  - `canEdit`
  - `canDelete`
  - `canComplete`
  - `canUncomplete`
  - `canStopRepeating`
- `internalRef` 保留底层 `DayPlanItem` 与必要模板 / 重复实例引用，用于 action handler 回写。

### 本轮修改
- 新增 `src/features/todo/todo-view-model.ts`
  - 定义 `TodoViewModel`
  - 集中收口来源标签、重复判断、carry hint 与能力映射
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 读取当天 `DayPlanItem` 后先映射为 `TodoViewModel`
  - 列表渲染使用 ViewModel 字段
  - 按钮显示与禁用状态改读能力字段
  - 事件处理通过 `internalRef.item` 回写底层数据
- 更新 `src/features/todo/index.ts`
  - 导出新 ViewModel 文件
- 更新文档：
  - `data-model.md`
  - `app-structure.md`
  - `task-list.md`
  - `handoff.md`
  - `manual-test-checklist.md`
  - `dev-log.md`

### 本轮刻意未做
- 未改 `src/types/models.ts`
- 未改 `src/db/schema.ts`
- 未改 `src/db/storage.ts`
- 未改 carryover / continuation 规则
- 未改 recurrence 生成规则
- 未实现普通未完成 Todo 跨日延续
- 未实现“同一重复规则最多一个 active occurrence”

### 当前风险与待确认问题
- `TodoModePanel` 的 action handler 里仍保留少量底层判断：
  - `consumesDateTrigger`
  - `item.source !== 'manual_temporary'`
  - `item.recurringInstanceId`
  这些判断目前保留是为了维持既有底层行为不变，后续可继续下沉到 action 层。
- 当前 ViewModel 仍通过 `internalRef.item` 回写底层实例，说明 UI 防腐层已建立，但写回层还没完全抽离。

### 验证结果
- 待本轮代码完成后运行：
  - `pnpm run lint`
  - `pnpm run build`

## 2026-04-26（V2.1-1：Todo 行为重构准备，规则与文档重写）

### 本轮目标
- 只重写产品规则、结构文档、数据模型口径、任务清单与手测清单
- 不改源码实现
- 不新增字段
- 不改 schema
- 不改 storage

### 开始前已阅读
- `handoff.md`
- `dev-log.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `task-list.md`
- `manual-test-checklist.md`
- `src/features/todo/TodoModePanel.tsx`
- `src/features/recurrence/auto-generated.ts`
- `src/features/continuation/segmented-continuation.ts`
- `src/features/decision/recommendation.ts`
- `src/types/models.ts`
- `src/db/schema.ts`
- `src/db/storage.ts`

### 本轮关键判断
- 当前系统虽然 UI 看起来像 Todo，但规则与实现仍然是模板 / 实例 / 来源分支中心。
- `TodoModePanel` 当前直接消费 `DayPlanItem`，并按 `source`、`templateKind`、`recurringInstanceId` 决定交互，这与“Todo 一等公民”直接冲突。
- 当前“未完成跨日”仍主要属于分次 continuation 语义，不符合成熟 Todo List 对普通未完成事项的直觉。
- `source / templateKind / recurringInstanceId / consumesDateTrigger / continuation` 仍然有技术价值，但不应再作为产品主规则。

### 本轮关键决策
- 将 Todo 明确写为唯一产品主语。
- 将“普通未完成 Todo 默认跨日延续”写入产品规则，且明确这不是分次专属能力。
- 将“普通 Todo 删除 = 结束整条 Todo”写为一次性 Todo 的默认语义。
- 将重复 Todo 的操作拆为：
  - 删除当天实例
  - 停止重复
- 将分次改写为：
  - Todo 的 `progress` 属性
  - 不再作为独立产品子系统
- 将必要与需要准备改写为 UI 属性。
- 将种草改写为 Todo 来源之一，而不是普通 Todo 的前置流程。
- 规划 `TodoViewModel` 作为 UI 统一入口。
- 将以下概念降级为内部实现说明：
  - `source`
  - `templateKind`
  - `recurringInstanceId`
  - `consumesDateTrigger`
  - `continuation`
  - `decision_selected`
  - `todo_recurring`

### 本轮修改
- 更新 `product-rules.md`
  - 重写为 V2.1 口径
  - 写入 Todo 一等公民规则
  - 写入普通未完成 Todo 默认跨日延续
  - 写入删除语义与重复 Todo 语义区分
  - 写入分次 = progress、必要 / 准备 = UI 属性、种草 = 来源
  - 写入 `TodoViewModel` 方向与内部字段降级说明
- 更新 `app-structure.md`
  - 明确 Todo 区的主语是 Todo
  - 明确 UI 后续应基于 `TodoViewModel`
  - 明确种草 / 推荐 / 内部实现层边界
- 更新 `data-model.md`
  - 把底层模型与 UI 视图模型分层写清楚
  - 把 `DayPlanItem` 从 UI 主模型降级为底层落地对象
  - 把来源字段和 continuation 降级为内部实现说明
- 更新 `task-list.md`
  - 重写为 V2.1-1 到 V2.1-4 四个任务包
  - 避免一次性同时改映射、carryover、recurrence
- 更新 `manual-test-checklist.md`
  - 改写为以 Todo 直觉为中心的手测口径
- 更新 `handoff.md`
  - 同步 V2.1 当前状态、旧规则降级结果与后续优先级
- 更新 `dev-log.md`
  - 记录本轮判断、决策、修改与未决问题

### 本轮刻意未做
- 未改任何源码实现文件
- 未改 `src/types/models.ts`
- 未改 `src/db/schema.ts`
- 未改 `src/db/storage.ts`
- 未改 recurrence 业务实现
- 未改 continuation 业务实现
- 未改 Todo UI 逻辑
- 未运行 lint / build

### 当前风险与待确认问题
- 当前实现仍然保留基于来源字段的权限分支，文档已领先于实现。
- “普通未完成 Todo 自动跨日延续”落地时，是否完全复用当前 continuation 链路，还是只复用其中一部分，还需在实现前最终确认。
- 重复 Todo 是否采用“同一重复规则最多一个 active occurrence”，当前文档已给出推荐方向，但仍需进入实现前再拍板。
- 若 daily recurrence 昨天未完成，今天是继续显示昨天那条，还是在 UI 上显示为“今日继续处理的同一条”，文档已倾向后一种用户感知，但具体内部映射策略待实现阶段确认。

### 验证结果
- 本轮仅修改文档，未运行构建与 lint。
