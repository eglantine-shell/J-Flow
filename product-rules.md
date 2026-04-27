# 产品规则文档

本文档定义当前有效的产品规则。

当前进入 V2.1：Todo 行为重构实现阶段。
- 当前文档描述 V2.1 最新已确认规则与实现方向
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
- 未完成后顺延到今天

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

Todo 的编辑、完成、取消完成、删除、顺延到今天，首先由“这是不是一条 Todo”决定，而不是由底层来源决定。

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
- 历史顺延实现判断

---

## 三、Todo 规则

### 1. Todo 的职责

Todo 用于承载某一天真实要做的事项。

包括但不限于：
- 普通一次性 Todo
- 从种草加入的 Todo
- 重复 Todo 的当前实例
- 未完成后顺延到今天的 Todo

### 2. 普通未完成 Todo 默认顺延到今天

这是 V2.1 的核心规则。

任意一次性 Todo 在创建当天出现一条。

若当天未完成，则在新的一天到来时：
- 这条 Todo 直接顺延到今天
- 心智应理解为“搬移 date”
- 不应复制出一条 continuation / carryover 副本
- 不应保留昨天那条仍然 pending 的独立副本

这意味着：
- 同一条一次性 Todo 在任一时刻只有一个当前实例
- 未完成跨日是普通 Todo 的基础行为，不是分次专属能力
- 分次 Todo 与普通 Todo 在跨日规则上没有本质差异

顺延的触发边界：
- 它是“现实日期推进”行为
- 用户手动查看未来日期时，不应提前生成未来 Todo
- 用户查看历史日期时，也不应为了历史浏览补写顺延结果

V2.1-C 当前已实现第一步：
- `DayPlanItem.originDate` 已落地
- 普通 Todo 的 rollover 已从“复制 carryover 副本”改为“搬移 date”
- 新的普通 rollover 不再继续扩展 `continuationOfItemId / carriedFromDate`
- repeating occurrence 的深层重构仍留给 V2.1-D

### 3. 普通 Todo 删除 = 结束这条 Todo

对普通一次性 Todo，包括：
- 手动输入 Todo
- 从种草加入 Todo
- 普通未完成后已顺延的 Todo

删除表示：
- 删除这条 Todo
- 终止这条 Todo 的未来延续

当前删除语义不是：
- 只跳过今天，明天继续回来

“跳过今天”可作为未来功能单独设计，但不是当前删除定义。

### 4. 重复 Todo 的删除语义不同

重复 Todo 需要区分两个动作：

1. 删除当天实例
- 只结束这一条 occurrence
- 不影响未来重复

2. 停止重复
- 停止这条重复规则
- 未来不再出现新的重复实例

这与普通一次性 Todo 的“删除即结束整条 Todo”不同。

### 5. 重复 Todo 的直觉规则

重复规则定义的是：
- 这条 Todo 在什么节奏下应该出现

重复 Todo 的新规则应理解为：
- recurrence 只负责决定哪些命中日会创建新的 occurrence
- 同一模板 + 同一命中日，最多创建一个 occurrence
- 不同命中日可以创建不同 occurrence

每个 occurrence 创建后，都应像一条普通 Todo：
- 若未完成，则在之后的日期中继续顺延搬移
- 若完成，则这一条 occurrence 结束
- 若删除，则这一条 occurrence 结束
- 它不会阻止下一次命中日再创建新的 occurrence

因此：
- repeating Todo 允许并存多条
- 并存不是 bug
- 它们代表不同命中日创建出来的不同 occurrence

例如每周三重复：
- 上周三创建的 occurrence 若一直未完成，会一路顺延到今天
- 本周三到来时，仍然要创建本周三新的 occurrence
- 用户今天可能同时看到两条同模板 Todo
- 它们应靠“创建于某日”来区分，而不是靠“延续自某日”区分

停止重复：
- 仅表示停用整条重复规则
- 历史已存在的 occurrence 保留
- 未来不再创建新的 occurrence

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
- 未完成时，与普通 Todo 一样自动顺延搬移到今天

因此：
- 分次不拥有独立产品心智
- continuation / carryover 只是历史实现方式之一
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
- 可顺延到今天

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
- `createdAtHint`
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
- 创建于某日

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
- 支撑重复与顺延的内部链路
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
- 历史 continuation / carryover 内部链路

但这些应服务于 Todo 产品心智，而不是取代 Todo 产品心智。

### 3. 当前不新增字段

V2.1 规则重写阶段，不擅自新增：
- 产品字段
- schema 字段
- storage 结构

若后续实现发现现有结构不足，应先补规则，再决定是否调整数据模型。

---

## 九、V2.1 任务拆分原则

为避免一次性改太多，V2.1 应拆为五个任务包：

### V2.1-A：文档规则重写
- 明确顺延搬移心智
- 明确普通 Todo 单实例流动
- 明确 repeating Todo 多 occurrence 并存

### V2.1-B：Todo rollover 模型确认
- 确认“创建于某日”的可靠来源
- 确认是否需要新增字段

### V2.1-C：普通 Todo 顺延搬移实现
- 把复制式 carryover 改成 date 搬移
- 分次 Todo 共用同一套顺延逻辑

### V2.1-D：重复 Todo occurrence 生成重构
- 废弃 single active occurrence
- 改为同模板同命中日最多一条 occurrence
- 不同命中日 occurrence 可并存

### V2.1-E：UI 文案与 ViewModel 调整
- `carryHint` 改为 `createdAtHint`
- UI 文案改成“创建于”

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

---

## 十一、V2.1-B / V2.1-C 模型结论

V2.1-B 已确认模型方向，V2.1-C 已落地第一版字段实现。

当前方案是：
- 已新增 `originDate`
- `date` 表示当前落点日期
- `originDate` 表示这条 Todo 或这条 repeating occurrence 最初进入 Todo 列表的日期

推荐原因：
- 它最符合“顺延搬移”心智
- 它能统一普通 Todo、分次 Todo、从种草加入 Todo、repeating occurrence
- 它不依赖 root 链反查历史
- 它最适合支撑 UI 的“创建于 M/D”

当前不推荐长期依赖：
- `rootItemId -> 根实例 date`
- `carriedFromDate`
- `continuationOfItemId`

因为这些字段更适合历史兼容，不适合作为最终产品语义来源。
