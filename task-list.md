# 开发任务清单

本文档用于指导 V2.1 后续工作拆分。

说明：
- 当前进入 V2.1：Todo 行为重构实现阶段
- 本轮已完成“种草 / 拔草”规则重写与文档同步
- V2.1 的核心目标不是继续补功能，而是把 Todo 与种草的产品边界理顺

---

## V2.1 总目标

围绕以下方向推进：
- Todo 成为唯一执行主语
- 种草收口为轻量收藏池
- 执行属性只在加入 Todo 时设置
- 场景只由用户主动选择，不再自动语义推断
- 拔草只做显式筛选，不做名称匹配
- UI 基于 TodoViewModel，而不是直接根据内部字段分支

---

## V2.1-A：Todo rollover 规则重写

### 当前状态

- 已完成

### 已确认结果

- 普通一次性 Todo 采用顺延搬移
- 分次只是 Todo 的进度属性
- repeating Todo 采用多 occurrence 口径
- `continuation / carryover` 降级为历史实现说明

---

## V2.1-B：Todo rollover 模型确认

### 当前状态

- 已完成

### 已确认结果

- `DayPlanItem.originDate` 作为“创建于”来源字段落地
- `date` 收敛为当前落点日期
- `targetDate` 继续主要服务 recurrence 命中与消费语义

---

## V2.1-C：普通 Todo 顺延搬移实现

### 当前状态

- 已完成第一版

### 已完成范围

- 普通一次性 Todo 已从复制式 carryover 切到 date 搬移式 rollover
- 分次 Todo 已随普通 Todo 共用同一套普通 rollover

---

## V2.1-D：重复 Todo occurrence 生成重构

### 当前状态

- 已完成第一版

### 已完成范围

- `auto-generated` 已改为按命中日去重
- 不同命中日的 repeating occurrence 可并存
- deleting occurrence 与 stopping recurrence 已继续分离

---

## V2.1-E：UI 收口

### 当前状态

- 已完成第一版

### 已完成范围

- UI 已改为显示“创建于”
- Todo 列表已收口轻量标签与统一交互
- 拔草推荐入口已收口到 Todo 添加区

---

## V2.1-F：种草 / 拔草规则重写

### 目标

把“种草 = Todo 模板”的旧心智改成“种草 = 轻量收藏池”。

### 要求

- 明确种草只保留：
  - `activityTypeId`
  - `title`
  - `sceneTagIds`
  - `interestLevel`
- 明确执行属性不再属于种草：
  - `isNecessary`
  - `recurrence`
  - `requiresPreparation`
  - `preparationNotes`
  - `isSegmented`
  - `date`
- 明确场景不再与周中 / 周末、白天 / 晚上自动耦合
- 明确场景只按 `sceneTagId` 精确匹配
- 明确拔草时由用户显式选择“种草清单 + 场景”

### 交付物

- `product-rules.md` 更新
- `data-model.md` 更新
- `app-structure.md` 更新
- `task-list.md` 更新
- `handoff.md` 更新
- `dev-log.md` 更新
- `manual-test-checklist.md` 更新

### 当前状态

- 本轮完成

---

## V2.1-G：种草表单与管理页收缩

### 目标

把当前“种草像模板编辑器”的 UI 收口为轻量收藏编辑。

### 要求

- 新增种草表单只保留：
  - 清单
  - 标题
  - 场景
  - 兴趣程度
- 管理种草页只展示和编辑轻量收藏字段
- 管理页需要能区分：
  - `active`
  - `picked`
  - `archived`
- 去掉或隐藏 `date / recurrence / necessary / preparation / segmented` 的种草编辑入口
- 维持旧数据兼容，不在此包内做大规模数据迁移

### 风险控制

- 这一包只改种草 UI 与表单状态
- 不同时改拔草推荐逻辑

### 当前状态

- 本轮完成第一版
- 新增 / 编辑种草表单已只保留轻量字段
- 管理列表当前默认只显示 `active`
- `picked / archived` 的管理视图切换仍待补

---

## V2.1-H：拔草面板改造成显式筛选

### 目标

把当前“自动场景推断 + 默认推荐”改造成“用户主动选清单和场景”的筛选面板。

### 要求

- 拔草面板中加入场景 tag 多选
- 不再根据 `selectedDate` 自动推导周中 / 周末
- 不再根据 `timeBlock` 自动推导白天 / 晚上
- 不再根据 tag 名称做内部匹配
- 未选场景时，显示该清单全部候选
- 已选场景时，只按 `sceneTagId` 交集过滤
- 排序按：
  1. `interestLevel`
  2. `createdAt` + `tieBreakerOrder`
  3. 当天已加入 Todo 的同种草项后置

### 风险控制

- 这一包只改推荐数据准备与面板交互
- 不同时改 Todo 创建弹层结构

### 当前状态

- 本轮完成第一版
- 已支持用户显式选择场景 tag
- 已去掉日期 / 时段 / tag 名称自动推断

---

## V2.1-I：从种草加入 Todo 时再设置执行属性

### 目标

把“执行属性来自种草模板”改成“执行属性来自本次加入 Todo 的决定”。

### 要求

- 从种草加入时允许设置：
  - 必要
  - 需要准备
  - 准备备注
  - 分次
  - 重复
  - 日期
  - 白天 / 晚上
- 新建 `DayPlanItem` 时写入这些属性
- 需要把原 `grass` 的生命周期状态切到 `picked`
- 保持“加入后就是普通 Todo”的边界

### 风险控制

- 需要仔细处理与现有手动 Todo 创建入口的复用
- 需要确认重复 Todo 是否允许直接从种草转入

### 当前状态

- 本轮完成第一版
- 当前执行属性已从 Todo 添加区传入
- 当前也支持从种草直接按重复规则进入 Todo 领域

---

## V2.1-J：旧 grass 字段兼容与清理

### 目标

在不破坏旧数据的前提下，逐步停止消费 `grass` 上的历史执行字段。

### 要求

- 保留 schema 兼容
- 新增 `grassStatus` 并定义旧数据 fallback
- 新 UI 不再编辑旧字段
- 新推荐逻辑不再依赖旧字段
- 新加入 Todo 流程不再以旧字段为主来源
- 评估是否需要一次性数据清理脚本

### 风险控制

- 不要在这一包里贸然拆库
- 先停用规则消费，再评估迁移

### 当前状态

- 本轮完成第一版
- `grassStatus` 兼容旧 `isArchived` 数据已落地
- 旧执行字段停止在种草表单中暴露
- 更彻底的数据清理与迁移脚本仍待后续评估

---

## V2.1-K：种草生命周期落地

### 目标

把“加入 Todo 后离开种草库、删除后回库、完成后不回库”的生命周期规则落到实现设计中。

### 要求

- 为 `grass` 明确区分：
  - `active`
  - `picked`
  - `archived`
- recommendation 只消费 `active`
- 从种草加入 Todo 时：
  - 创建 `DayPlanItem`
  - 同步将原种草置为 `picked`
- 来自种草的一次性 Todo 删除时：
  - 删除当前 Todo
  - 同步将原种草恢复为 `active`
- 来自种草的一次性 Todo 完成时：
  - 不恢复种草
- 来自种草转 repeating 后：
  - 不因删除 occurrence 或停止重复而自动恢复种草

### 风险控制

- 需要明确只对“来自种草的一次性 Todo 删除”做回库
- 需要避免与“用户主动停用”共用同一状态

### 当前状态

- 本轮完成第一版
- 从种草加入 Todo 后，原种草会进入 `picked`
- 删除来自种草的一次性 Todo 后，原种草会恢复为 `active`
- 完成后不会回库
- repeating 边界保持“不自动回库”

---

## 当前明确废弃的旧方向

- “种草是 Todo 模板”
- “种草直接保存必要 / 重复 / 准备 / 分次 / 日期”
- “拔草根据周中 / 周末自动判断场景”
- “拔草根据白天 / 晚上自动判断场景”
- “通过 tag 名称做内部语义匹配”
- “必要种草天然不参与拔草”作为长期产品规则

---

## 当前仍需确认

1. 当天已加入 Todo 的同种草项，是“全部排除”还是“跨时段后置、同时段禁止重复添加”
2. 从种草加入 Todo 时，是否允许直接创建 repeating Todo
3. `TaskTemplate` 是否在后续版本继续复用，还是最终拆成 `grass` 与 `todo_recurring` 两套模型
4. `picked` 是否需要在管理页默认隐藏，还是作为单独分组可见
