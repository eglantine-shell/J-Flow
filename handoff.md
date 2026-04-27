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
- 普通未完成 Todo 默认顺延到今天。
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
- `task-list.md` 已改为 V2.1-A 到 V2.1-E 五个任务包。
- `manual-test-checklist.md` 已改为以 Todo 直觉为中心的手测口径。
- V2.1-C 已完成第一版模型落地：
  - `date` 收敛为当前落点日期
  - `DayPlanItem.originDate` 已作为“创建于”统一来源落地
  - `targetDate` 继续主要服务 recurrence 与自动生成消费语义

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
1. V2.1-A：文档规则重写（已完成）
2. V2.1-B：Todo rollover 模型确认（已完成方案确认）
3. V2.1-C：普通 Todo 顺延搬移实现（已完成第一版）
4. V2.1-D：重复 Todo occurrence 生成重构（已完成第一版）
5. V2.1-E：UI 文案与 ViewModel 调整

## 当前已知风险
- 当前 UI 已新增 ViewModel 防腐层，但 action handler 内仍保留少量底层判断以维持既有行为。
- 普通 Todo 与 repeating Todo 都已切到 date 搬移式 rollover，但 repeating 的更细状态语义与旧数据兼容仍需继续清理。
- 旧数据虽然可兼容回退 `originDate ?? targetDate ?? date`，但历史数据的一次性清理与旧链字段降级还没做完。

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
- 完成 V2.1-E 第一批小修：
  - 过去日期不再允许新增 Todo
  - 手动输入、从种草添加、创建 repeating Todo 都只允许在 `selectedDate >= localToday` 时进行
  - “停止重复”改为可恢复，模板 `isArchived` 可在 true / false 间切换
  - 只有当天命中的 `todo_recurring` occurrence 显示停止/恢复按钮
  - 过去搬移到今天的 repeating occurrence 不显示该按钮
- 修复顺延后的 repeating occurrence 回写旧日期：
  - 原因是查看历史日期时，`auto-generated` 会复用同命中日 occurrence，并把它的 `date` 强行写回旧命中日
  - 现已改成：若该 occurrence 已顺延到更晚日期，则保留当前落点，不回写旧日期
- 修复停止重复后当天 repeating Todo 消失：
  - 原因是模板归档后，当天 occurrence 不再进入 `syncedItems`
  - `auto-generated` 旧清理逻辑会把这类未同步到的 `pending auto_generated` 项误标成 `deleted`
  - 现已改成：若对应模板已归档，则当天 occurrence 保留；停止重复只影响未来命中日
- 修复 repeating Todo 完成后消失：
  - 原因是 `consumesDateTrigger = true` 后，当天条目未进入 `syncedItems`
  - `auto-generated` 旧清理逻辑会把这类条目统一标成 `deleted`
  - 现已改成仅清理当天未同步到的 `pending auto_generated` 项
- 完成 V2.1-D 第一版：
  - `auto-generated` 已废弃 single active occurrence 阻断
  - 改为按 `templateId + targetDate/originDate` 去重
  - 不同命中日的 repeating occurrence 现在可并存
  - repeating occurrence 已参与 date 搬移式 rollover
  - 删除 repeating Todo 继续只结束本次 occurrence，不停止整条重复规则
  - 停止重复仍仅通过归档模板完成
- 完成 V2.1-C 第一版：
  - `DayPlanItem.originDate` 已落地到 model / schema / storage
  - 手动创建、从种草加入、auto-generated、手动创建 repeating 当天实例都已写入 `originDate`
  - 普通一次性 Todo rollover 已从复制副本改成更新原条目 `date`
  - UI 提示已从“延续自”切到“创建于”
  - 普通 rollover 不再继续扩展 `continuationOfItemId / carriedFromDate`
  - repeating occurrence 深层规则仍留给 V2.1-D
- 完成 V2.1-B 方案确认：
  - 对比了 `rootItemId -> 根实例 date`、`originDate`、`occurrenceDate` 等方案
  - 确认 `rootItemId` 方案只适合作为短期兼容层，不适合作为长期“创建于”来源
  - 确认 `occurrenceDate` 会让普通 Todo 与 repeating Todo 分裂建模
  - 当前长期推荐在允许改 schema 时新增 `originDate`
  - `originDate` 统一承担普通 Todo 与 repeating occurrence 的原始创建日 / 命中日语义
  - `date` 未来应明确只表达当前落点日期
  - `targetDate` 未来继续主要服务 recurrence 触发与 `consumesDateTrigger`
- 完成 V2.1-A：
  - 跨日逻辑产品规则从 carryover 副本心智改为顺延搬移心智
  - 普通一次性 Todo 明确为“单实例流动”
  - 分次 Todo 明确为“普通 Todo + progress”
  - repeating Todo 改为“多 occurrence，各 occurrence 单实例流动”
  - 废弃 single active occurrence 规则
  - UI 日期提示从“延续自”改为“创建于”
  - 后续任务拆分更新为 V2.1-B 到 V2.1-E
