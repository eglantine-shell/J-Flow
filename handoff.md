# 项目交接摘要

## 当前版本目标
- 当前已从 V2 试用修复阶段，进入 V2.1：Todo 行为重构准备阶段。
- 本轮核心目标不是继续堆功能，而是重写产品规则，让 Todo 成为唯一主语。

## 最近一次完成的 task
- 完成 V2.1-E UI 微调：
  - 初始化页主句已缩小到次级标题层级
  - “种草清单”与“有空就做”两个配置块之间的垂直间距已拉开
  - Todo 条目已去掉明显边框，改为更轻的白天 / 晚上色块列表
  - 设置页已从三个大卡片合并为一个主卡片，内部拆成“排序设置”和“测试工具”两个小模块

## 上一轮完成的 task
- 修复设置页重置后 404：
  - 原因是 reset 后使用了 `window.location.replace('/setup')`
  - 当前路由带 `basename`，绝对路径跳转会绕过 React Router，导致浏览器直达错误地址
  - 现已改回 `navigate('/setup', { replace: true })`

## 更早一轮完成的 task
- 完成 V2.1-E UI 小修二轮：
  - repeating Todo 的循环图标已调整到编辑图标之前
  - 必要事项不再显示“必要”tag，改为标题旁重要图标
  - 分次事项只保留一个可拖动的进度条，不再重复显示静态进度条
  - 设置页不再显示单独“返回主页”按钮；头部设置按钮在设置页内再次点击会返回主页

## 更早一轮完成的 task
- 完成 V2.1-E UI 收口 + Todo 交互修正：
  - 已引入 `lucide-react`，设置、初始化、Todo 新增区与 Todo list 已切到统一线条图标
  - 过去日期已直接不渲染“新增 Todo”区，历史列表仍可查看
  - 拔草推荐改为单按钮打开 / 收起，不再提供单独刷新入口
  - 拔草推荐里的“种草清单”选择已由 `select` 改成 tag
  - Todo list 已移除来源 / 重复 / 准备 / 分次标签，仅保留必要与完成态标签
  - 完成事项标签已支持显示 `完成于 MM/DD HH:mm`
  - repeating Todo 的停止 / 恢复已改为循环图标按钮，位于 checkbox 之前
  - repeating Todo 现在可直接编辑当前 occurrence 标题，只改当前 `DayPlanItem.title`
  - 分次 Todo 进度条已移到内容下方，并改成拖动即保存
  - 分次拖到 `100` 会自动完成；完成后可取消完成并回到 `90%`

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

## 更早一轮完成的 task
- 完成 V2.1-E 第一批小修：
  - 过去日期不再允许新增 Todo
  - 手动输入、从种草添加、创建 repeating Todo 都只允许在 `selectedDate >= localToday` 时进行
  - “停止重复”改为可恢复，模板 `isArchived` 可在 true / false 间切换
  - 只有当天命中的 `todo_recurring` occurrence 显示停止/恢复按钮
  - 过去搬移到今天的 repeating occurrence 不显示该按钮
