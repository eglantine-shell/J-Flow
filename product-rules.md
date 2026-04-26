# 产品规则文档

本文档定义当前有效的产品规则。

当前进入 V2.1：Todo 行为重构准备阶段。
- 本轮目标是重写产品规则与任务拆分，不改源码实现
- 若文档之间有冲突，以本文档为准
- 若现有实现与本文档冲突，以本文档作为后续重构目标

---

## 一、V2.1 核心定位

J-Flow 首先是一个彻头彻尾的 Todo List。

它比普通 Todo List 多出来的能力只有：
- Todo 可以有进度，未到 `100%` 时继续推进
- Todo 可以从种草清单加入，而不只能现场输入
- Todo 可以带“必要”视觉标记
- Todo 可以带“需要准备”的备注

除此之外，基础 Todo 行为必须符合成熟 Todo List 直觉。

---

## 二、核心原则

### 1. Todo 是一等公民

用户心智中的主语只有 Todo。

无论一条 Todo 来自：
- 手动输入
- 从种草加入
- 重复规则生成
- 未完成跨日延续

只要它已经进入 Todo 列表，就都应像普通 Todo 一样：
- 可编辑标题
- 可完成
- 可取消完成
- 可删除
- 可显示准备备注
- 可显示必要标记
- 若为分次事项，可推进进度

来源信息只能作为：
- 内部追踪信息
- 轻量 UI 标签

来源信息不能决定基础交互是否可用。

### 2. Todo 基础行为优先于来源差异

Todo 的编辑、完成、取消完成、删除、跨日延续，首先由“这是不是一条 Todo”决定，而不是由底层来源决定。

产品规则中不应再把以下内部来源差异写成用户规则：
- `manual_temporary`
- `decision_selected`
- `auto_generated`
- `templateKind`
- `recurringInstanceId`

### 3. UI 不直接感知底层来源分支

V2.1 后续实现应以面向 UI 的 Todo 视图模型为中心，而不是让 UI 直接根据底层实例字段分支。

UI 关注的是：
- 这条 Todo 显示什么
- 用户现在能做什么

UI 不应直接承担：
- 模板类型判断
- 来源分支判断
- 重复实例判断
- continuation 链路判断

---

## 三、Todo 规则

### 1. Todo 的职责

Todo 用于承载某一天真实要做的事项。

包括但不限于：
- 普通一次性 Todo
- 从种草加入的 Todo
- 重复 Todo 的当前实例
- 未完成后延续到今天的 Todo

### 2. 普通未完成 Todo 默认跨日延续

这是 V2.1 的核心规则。

任意一次性 Todo，只要同时满足：
- 未完成
- 未删除
- 不是未来日期上的新重复 occurrence

就应在下一天继续出现，直到：
- 用户完成它
- 用户删除它
- 用户主动改日期
- 用户归档或停止

这意味着：
- 未完成跨日不再是“分次专属能力”
- 它是普通 Todo 的基本行为
- 分次 Todo 与普通 Todo 在跨日规则上没有本质差异

V2.1-3 当前已实现：
- 普通一次性 Todo 会在次日自动生成 carryover Todo
- 该机制底层继续复用实例链字段
- `continuation` 在产品心智上已降级为 todo carryover 的内部实现机制

### 3. 普通 Todo 删除 = 结束这条 Todo

对普通一次性 Todo，包括：
- 手动输入 Todo
- 从种草加入 Todo
- 普通未完成延续 Todo

删除表示：
- 删除这条 Todo
- 终止这条 Todo 的未来延续

当前删除语义不是：
- 只跳过今天，明天继续回来

“跳过今天”可作为未来功能单独设计，但不是当前删除定义。

### 4. 重复 Todo 的删除语义不同

重复 Todo 需要区分两个动作：

1. 删除当天实例
- 只跳过这一次
- 不影响未来重复

2. 停止重复
- 停止这条重复规则
- 未来不再出现新的重复实例

这与普通一次性 Todo 的“删除即结束整条 Todo”不同。

### 5. 重复 Todo 的直觉规则

重复规则定义的是：
- 这条 Todo 在什么节奏下应该出现

重复 Todo 应符合成熟 Todo List 的直觉：
- 若当前 occurrence 未完成，它应继续显示为当前未完成事项或逾期事项
- 不应因为进入下一个命中日期，就制造多条难以理解的重复堆叠
- 用户完成当前 occurrence 后，系统再进入下一次 occurrence

V2.1-4 推荐方案：
- 保留现有 calendar-based recurrence 作为底层实现基础
- 但产品规则升级为：
  - 同一重复模板在任一时刻，最多只有一个 active pending occurrence
  - 若旧 occurrence 未完成，后续命中日不再无条件生成新的同类 occurrence
  - 旧 occurrence 通过 carryover 出现在新日期
  - 用户完成当前 occurrence 后，后续命中日再生成下一次 occurrence

推荐理由：
- 更符合 Todo app，而不是 habit tracker 的默认心智
- 用户看到的是“这条重复 Todo 还没做完”，而不是“一串同名待办堆叠”
- 与 V2.1 已完成的普通 Todo carryover 规则保持一致

V2.1-4 明确不采用“每次命中都无条件堆新实例”作为默认规则。

V2.1-4 当前已实现：
- recurrence 生成前会先检查该模板是否已有 active pending occurrence
- 若已有 active occurrence，则不生成新的 occurrence，由 carryover 负责把旧 occurrence 带到今天
- `daily / weekly / monthly / yearly` 全部统一采用这套规则
- carryover 出来的 repeating Todo 仍属于同一 occurrence

### 5A. active occurrence 定义

若采用上述方案，则：
- active occurrence 指某个重复模板当前仍处于待处理状态的那一次 occurrence
- 它可能最早生成于过去某个命中日
- 也可能因为未完成而通过 carryover 出现在今天
- active 的判断主语是 occurrence 本身，不是“今天是否命中”

状态影响：
- `pending`
  - 该 occurrence 仍 active
  - 后续命中日不再生成新的同模板 pending occurrence
- `completed`
  - 该 occurrence 结束 active 状态
  - 之后命中日可再生成下一次 occurrence
- `deleted`
  - 对 repeating Todo 表示“本次已被跳过/结束”
  - 当前 occurrence 失去 active 状态
  - 未来命中日仍可生成新的 occurrence

### 5B. carryover 与 repeating occurrence

若采用上述方案：
- carryover 出来的 repeating Todo 仍属于同一 occurrence
- 它不是新的 recurrence occurrence
- 只是同一 active occurrence 在新日期上的继续显示

删除某天 carryover 出来的 repeating Todo：
- 仍表示结束这一次 active occurrence
- 不表示停止整条重复规则
- 下一次命中日应允许生成新的 occurrence

停止重复：
- 表示停用整条重复规则
- 历史实例保留
- 未来不再生成新的 occurrence

### 6. 完成与取消完成

只要一条 Todo 已进入列表，就应支持成熟 Todo List 直觉下的完成与取消完成。

完成表示：
- 这条 Todo 当前已结束

取消完成表示：
- 这条 Todo 回到未完成状态

是否允许执行这些动作，不应再由来源类型直接决定。

---

## 四、分次、必要、准备

### 1. 分次只是 Todo 的 progress 属性

分次 Todo 不是另一套产品子系统。

分次 Todo 应理解为：
- 一条普通 Todo
- 额外带有 `progressPercent`

规则：
- `progressPercent < 100` 时，视为未完成
- `progressPercent = 100` 时，视为完成
- 未完成时，与普通 Todo 一样自动跨日延续

因此：
- 分次不拥有独立产品心智
- continuation 只是内部实现方式之一
- UI 上只表达“这条 Todo 现在有多少进度”

### 2. 必要只是 UI 标记

必要事项在 V2.1 中只是 Todo 的视觉标记。

它不应引入复杂自动安排语义：
- 不影响推荐主逻辑
- 不额外决定完成逻辑
- 不额外决定删除逻辑

### 3. 需要准备只是备注

“需要准备”只是 Todo 下方多一行准备备注。

它不应影响：
- 排序
- 推荐
- 自动生成
- 完成
- 删除

---

## 五、种草规则

### 1. 种草只是 Todo 来源之一

种草清单不是普通 Todo 的前置流程。

从种草加入 Todo 后，这条 Todo 应按普通 Todo 行为运行：
- 可编辑
- 可删除
- 可完成
- 可取消完成
- 可跨日延续

编辑当天 Todo：
- 不回写原种草

删除当天 Todo：
- 不删除原种草

### 2. 种草清单的职责

种草清单只负责：
- 存放想做但不一定今天做的内容
- 作为 Todo 输入区的可选来源
- 被推荐拔草

种草清单不负责：
- 定义普通 Todo 的基础交互
- 强迫用户先种草，后做 Todo

### 3. 种草与重复 Todo 分离

普通种草条目仍可长期存在。

但重复 Todo 不应再被用户心智理解为“先有模板，再有 Todo”。

对于重复 Todo：
- 用户感知到的是一条会重复出现的 Todo
- 底层若需要模板、规则、实例层，可继续保留
- 这些都属于内部实现，而不是产品主语

---

## 六、UI 视图模型规则

### 1. TodoViewModel 方向

V2.1 应新增或规划一个面向 UI 的 `TodoViewModel`。

UI 层只根据 `TodoViewModel` 渲染和决定按钮状态。

`TodoViewModel` 至少应表达：
- `id`
- `title`
- `date`
- `timeBlock`
- `isCompleted`
- `isDeleted`
- `isSegmented`
- `progressPercent`
- `isRepeating`
- `isNecessary`
- `preparationNotes`
- `carryHint`
- `originLabel`
- `canEdit`
- `canDelete`
- `canComplete`
- `canUncomplete`
- `canStopRepeating`
- `internalRef`

### 2. 按钮权限收口

后续实现中，以下按钮权限应统一从映射层给出：
- 是否可编辑
- 是否可删除
- 是否可完成
- 是否可取消完成
- 是否可停止重复

`TodoModePanel` 不应继续直接根据以下字段做 UI 分支：
- `source`
- `templateKind`
- `recurringInstanceId`
- `consumesDateTrigger`
- `continuationOfItemId`

### 3. 来源信息的展示方式

来源信息若需要展示，只应作为轻量标签，例如：
- 手动添加
- 来自种草
- 重复
- 延续自昨天

它不应控制核心交互能力。

---

## 七、内部实现降级说明

以下概念在 V2.1 中继续允许存在，但降级为内部实现说明，不再作为产品主规则：
- `source`
- `templateKind`
- `recurringInstanceId`
- `consumesDateTrigger`
- `continuation`
- `decision_selected`
- `todo_recurring`

这些概念的职责是：
- 支撑底层存储与同步
- 支撑重复与延续的内部链路
- 支撑历史兼容与迁移

它们不应再决定：
- 一条 Todo 是否看起来像 Todo
- 用户是否可以编辑 / 删除 / 完成 / 取消完成

---

## 八、数据结构策略

### 1. 当前限制

本轮只重写产品规则，不改：
- 源码实现
- schema
- storage
- 字段设计

### 2. 当前保留

当前底层仍允许保留：
- 模板层
- 重复实例层
- 当日实例层
- continuation 内部链路

但这些应服务于 Todo 产品心智，而不是取代 Todo 产品心智。

### 3. 当前不新增字段

V2.1 规则重写阶段，不擅自新增：
- 产品字段
- schema 字段
- storage 结构

若后续实现发现现有结构不足，应先补规则，再决定是否调整数据模型。

---

## 九、V2.1 任务拆分原则

为避免一次性改太多，V2.1 应拆为四个任务包：

### V2.1-1：规则与文档重写
- 明确 Todo 一等公民
- 明确普通未完成 Todo 自动延续
- 明确删除语义
- 明确分次只是 progress
- 明确种草只是来源

### V2.1-2：TodoViewModel 收口
- 新增 TodoViewModel 映射层
- UI 不再直接根据底层来源字段分支
- 统一 `canEdit / canDelete / canComplete / canUncomplete / canStopRepeating`

### V2.1-3：未完成 Todo 自然跨日延续
- 把当前 segmented continuation 扩展成通用 todo carryover
- 普通未完成 Todo 也能自动延续
- 删除普通 Todo 终止整条 Todo
- 分次 Todo 只是带进度的普通 Todo

### V2.1-4：重复 Todo 规则重构
- 避免同一重复规则制造多条难理解的 active occurrence
- 明确“删除当天实例”与“停止重复”
- 规划同一重复规则最多一个 active occurrence 的实现方案
- 完成当前 occurrence 后，再进入下一次 due date

---

## 十、冲突处理原则

### 1. 文档冲突

若文档之间有冲突，以本文档为准。

### 2. 产品规则与现有实现冲突

若现有实现仍保留旧分支逻辑：
- 应视为待重构历史实现
- 不反向修改产品规则来迁就旧实现

### 3. 规则空白

若后续实现阶段发现规则空白：
- 先补本文档
- 再进入实现
