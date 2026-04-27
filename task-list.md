# 开发任务清单

本文档用于指导 V2.1 后续工作拆分。

说明：
- 当前进入 V2.1：Todo 跨日逻辑规则重构阶段
- 本轮只重写任务拆分，不执行实现
- V2.1 的核心目标不是继续补功能，而是把 Todo 的时间流动心智改正确

---

## V2.1 总目标

围绕以下方向推进：
- Todo 成为唯一产品主语
- 普通一次性 Todo 采用“顺延搬移”，不是“carryover 副本”
- 普通 Todo 删除表示结束整条 Todo
- 分次只是 Todo 的进度属性
- repeating Todo 采用“多 occurrence，各 occurrence 单实例流动”
- UI 显示“创建于”，而不是“延续自”
- UI 基于 TodoViewModel，而不是直接根据内部字段分支

---

## V2.1-A：文档规则重写

### 目标

把跨日逻辑从 carryover 副本心智改成顺延搬移心智。

### 要求

- 明确普通 Todo 在未完成时直接顺延到今天
- 明确分次 Todo 只是带进度的普通 Todo
- 废弃“同一重复模板最多一个 active pending occurrence”
- 明确 repeating Todo 的每个命中日都是独立 occurrence
- 明确 repeating occurrence 未完成时各自顺延搬移
- 明确 UI 显示“创建于某日”
- 明确 `continuation / carryover` 降级为历史实现说明

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

## V2.1-B：Todo rollover 模型确认

### 目标

在不急着动实现前，先确认“顺延搬移”模型是否需要新字段。

### 要求

- 分析普通 Todo 的“创建于某日”如何稳定表达
- 分析 repeating occurrence 的“命中日 / 创建日 / 当前所在日”如何区分
- 评估是否复用：
  - `rootItemId`
  - 根实例 `date`
  - `targetDate`
  - `RecurringTaskInstance.dateKey`
- 若现有结构不稳，再评估是否需要未来新增：
  - `originDate`
  - `createdForDate`
  - `occurrenceDate`

### 风险控制

- 这一包只确认模型口径
- 不同时改同步逻辑
- 不同时改 UI

### 当前状态

- 本轮完成方案确认
- 当前推荐结论：
  - 未来允许改 schema 时新增 `originDate`
  - 不推荐长期依赖 `rootItemId -> 根实例 date` 推导“创建于”
  - `occurrenceDate` 不如 `originDate` 统一
  - `date` 应收敛为“当前落点日期”
  - `targetDate` 继续主要服务 recurrence 命中与自动生成消费语义

---

## V2.1-C：普通 Todo 顺延搬移实现

### 目标

把当前复制式 carryover 改成一次性 Todo 的 date 搬移。

### 要求

- 未完成普通 Todo 在新的一天到来时直接移动到今天
- 不再生成 continuation / carryover 副本
- 同一条一次性 Todo 在任一时刻只保留一个当前实例
- `completed` / `deleted` 终止整条 Todo
- 分次 Todo 同样按这套规则搬移，并保留进度

### 风险控制

- 这一包只处理普通 Todo 与分次 Todo
- 不同时改 recurrence occurrence 生成逻辑

### 当前状态

- 本轮完成第一版
- `DayPlanItem.originDate` 已落地
- 普通一次性 Todo 已从复制式 carryover 切到 date 搬移式 rollover
- 分次 Todo 已随普通 Todo 共用同一套普通 rollover
- repeating occurrence 深层重构仍留给 V2.1-D

---

## V2.1-D：重复 Todo occurrence 生成重构

### 目标

废弃 single active occurrence，改成“同模板同命中日最多一条 occurrence，但不同命中日可并存”。

### 要求

- recurrence 只负责在命中日创建新的 occurrence
- 不因旧 occurrence 未完成而阻止新命中日 occurrence
- 同一模板 + 同一命中日不能重复创建
- 每个 occurrence 创建后，像普通 Todo 一样顺延搬移
- 删除某条 repeating Todo 只结束这一条 occurrence
- 停止重复仍只停止未来规则，不删除历史 occurrence

### 风险控制

- 这一包单独处理 recurrence
- 避免与普通 Todo 顺延搬移同时大改

### 当前状态

- 待开始

---

## V2.1-E：UI 文案与 ViewModel 调整

### 目标

把 UI 从“延续自”改成“创建于”，并与新 rollover 规则对齐。

### 要求

- `carryHint` 改为 `createdAtHint`、`originHint` 或同义字段
- 普通 Todo 若创建日就是今天，可不显示
- 顺延来的普通 Todo 显示“创建于 M/D”
- repeating Todo 若同模板并存多条，应靠“创建于 M/D”区分
- 保持 `TodoViewModel` 继续作为 UI 防腐层

### 风险控制

- 这一包只改展示口径
- 不重写整体 UI 架构

### 当前状态

- 待开始

---

## 当前明确废弃的旧方向

- “昨天未完成，今天生成一条 continuation / carryover 副本”
- “UI 显示延续自某日”
- “分次事项拥有独立 continuation 心智”
- “同一重复模板最多只有一个 active pending occurrence”
- “旧 occurrence 未完成时不生成下一次 occurrence”

---

## 当前不做

本轮不做：
- recurrence 业务实现改造

---

## V2.1-B 后续实现建议顺序

1. 模型与 schema 更新
2. 各创建路径写入 `originDate`
3. 把复制式 carryover 改成更新 `date` 的 rollover
4. `TodoViewModel.createdAtHint` 映射改读 `originDate`
5. repeating occurrence 创建时写入 `originDate = 命中日`
6. 清理 / 降级 `continuationOfItemId` 与 `carriedFromDate`
7. 更新手动验证清单与兼容策略
