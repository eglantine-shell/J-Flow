# 开发任务清单

本文档用于指导 V2.1 后续工作拆分。

说明：
- 当前进入 V2.1：Todo 行为重构准备阶段
- 本轮只重写任务拆分，不执行实现
- V2.1 的核心目标不是继续补功能，而是把产品主语收口回 Todo

---

## V2.1 总目标

围绕以下方向推进：
- Todo 成为唯一产品主语
- 普通未完成 Todo 默认跨日延续
- 普通 Todo 删除表示结束整条 Todo
- 重复 Todo 的“删除当天实例”与“停止重复”分离
- 分次只是 Todo 的进度属性
- 种草只是 Todo 来源之一
- UI 基于 TodoViewModel，而不是直接根据内部字段分支

---

## V2.1-1：规则与文档重写

### 目标

统一产品叙事，明确 Todo 一等公民口径。

### 要求

- 明确 Todo 是唯一主语
- 明确普通未完成 Todo 默认跨日延续
- 明确普通 Todo 删除 = 结束整条 Todo
- 明确重复 Todo 删除当天实例 与 停止重复 的区别
- 明确分次只是 progress
- 明确必要 / 需要准备只是 UI 属性
- 明确种草只是来源之一
- 明确 `source / templateKind / recurringInstanceId / consumesDateTrigger / continuation` 降级为内部实现说明

### 交付物

- `product-rules.md` 更新
- `app-structure.md` 更新
- `data-model.md` 更新
- `manual-test-checklist.md` 更新
- `handoff.md` 更新
- `dev-log.md` 更新

### 当前状态

- 本轮完成

---

## V2.1-2：TodoViewModel 收口

### 目标

在 UI 层建立 Todo 的统一视图模型，切断 UI 对底层来源分支的直接依赖。

### 要求

- 新增 `TodoViewModel` 映射层
- Todo UI 不再直接消费裸 `DayPlanItem`
- Todo UI 不再直接根据以下字段决定按钮状态：
  - `source`
  - `templateKind`
  - `recurringInstanceId`
  - `consumesDateTrigger`
  - `continuationOfItemId`
- 统一映射出：
  - `canEdit`
  - `canDelete`
  - `canComplete`
  - `canUncomplete`
  - `canStopRepeating`

### 建议拆分

1. 设计 `TodoViewModel`
2. 补映射函数
3. TodoModePanel 改消费视图模型
4. 清理直接读来源字段的 UI 分支

### 风险控制

- 这一包只改映射与 UI 收口
- 不同时改 carryover 语义
- 不同时改 recurrence 语义

### 当前状态

- 本轮完成第一版
- 已新增 `TodoViewModel` 映射层
- `TodoModePanel` 已改为先映射再渲染
- 当前仍保留少量 action handler 内部判断，用于维持既有底层行为

---

## V2.1-3：未完成 Todo 自然跨日延续

### 目标

把当前“分次 continuation”升级为“通用 todo carryover”。

### 要求

- 普通未完成 Todo 也能自动延续到明天
- 分次 Todo 继续延续，但只是带进度的普通 Todo
- 普通 Todo 删除后，应终止整条 Todo 的未来延续
- 从种草加入的未完成 Todo 也应按普通 Todo 规则继续延续

### 重点改造

- 把当前 segmented continuation 从“分次专属逻辑”改造成“通用未完成 Todo carryover”
- 明确删除普通 Todo 时如何终止链路
- 明确完成后如何停止延续

### 风险控制

- 这一包只处理一次性 Todo 的自然跨日
- 不同时重构重复 Todo 的 occurrence 规则

### 当前状态

- 本轮完成第一版
- 普通未完成 Todo 已可自动延续到次日
- 分次 Todo 已并入同一套 carryover 机制
- 普通 Todo 删除已可通过链终止规则阻止未来继续延续
- repeating Todo 的深层规则仍留给 V2.1-4

---

## V2.1-4：重复 Todo 规则重构

### 目标

让重复 Todo 更符合成熟 Todo List 直觉。

### 要求

- 不再制造难理解的多 occurrence 堆叠
- 规划同一重复规则最多只有一个 active occurrence 的方案
- daily recurrence 若昨天未完成，今天优先继续显示昨天未完成的那条 Todo
- 完成当前 occurrence 后，再进入下一次 due date
- 明确“删除当天实例”与“停止重复”的语义和实现边界

### 重点问题

1. 是否从“每个命中日期无条件生成一条”改成“同一重复规则最多一个 active occurrence”
2. 当前 `RecurringTaskInstance` 的 `expired` 语义如何与 Todo 直觉对齐
3. 完成当前 occurrence 后，下一次 due date 如何计算
4. 删除当天实例如何只跳过本次而不影响未来

### 当前推荐方案

- 采用方案 A：
  - 同一重复模板最多一个 active pending occurrence
- 不采用“每次命中都无条件生成新 occurrence”作为默认规则
- 不推荐按 `daily / weekly / monthly / yearly` 分裂成不同产品心智

### 建议拆分

1. 文档规则更新
2. `auto-generated` active occurrence 判断
3. carryover 支持 repeating occurrence
4. `TodoViewModel` repeating 能力映射调整
5. 删除 / 停止重复交互边界验证
6. `manual-test-checklist.md` 更新

### 当前状态

- 本轮完成第一版实现
- `auto-generated` 已接入 active occurrence 判断
- repeating Todo 已可参与 carryover
- 删除当前 repeating occurrence 与停止重复已明确区分

### 风险控制

- 这一包单独处理 recurrence
- 避免与 V2.1-3 的 carryover 改造混在一起

---

## 当前明确降级的旧方向

- “UI 直接消费 DayPlanItem 并按来源分支交互”
- “未完成跨日主要是分次专属能力”
- “种草是普通 Todo 的前置流程”
- “重复 Todo 的产品主语是模板和实例”
- “来源字段决定是否可编辑 / 删除 / 取消完成”

---

## 当前不做

本轮不做：
- 源码实现改造
- schema 变更
- storage 变更
- 新字段设计
- recurrence 业务重构
- carryover 业务重构
