# 项目交接摘要

## 当前版本目标
- 当前已从 V2.1-K：种草生命周期方案确认阶段，进入 V2.1-K：种草生命周期实现第一版。
- 本轮核心目标已从“确认方案”推进到“落地第一版 grassStatus 生命周期”。

## 最近一次完成的 task
- 完成 V2.1-K 实现第一版：
  - `TaskTemplate` 已新增 `grassStatus`
  - 旧 `grass` 数据已按 `isArchived` 做兼容 fallback
  - 新增种草默认写入：
    - `templateKind = grass`
    - `grassStatus = active`
    - `isArchived = false`
  - 推荐候选现已只消费 `grassStatus = active` 的 `grass`
  - 从种草加入 Todo 后，原种草会切到 `picked`
  - 删除来自种草的一次性 Todo 后，原种草会恢复到 `active`
  - 完成来自种草的 Todo 不会恢复原种草
  - repeating 边界保持“不自动回库”

## 上一轮完成的 task
- 完成 V2.1-K 生命周期方案文档确认：
  - 已确认推荐新增 `grassStatus`
  - 已确认不建议复用 `isArchived` 同时表示“已拔出”和“用户停用”
  - 已确认种草生命周期推荐分为：
    - `active`
    - `picked`
    - `archived`
  - 已确认来自种草的一次性 Todo：
    - 删除时恢复种草
    - 完成时不恢复种草
  - 已确认来自种草转 repeating 后，不因删除 occurrence 或停止重复而自动恢复种草

## 当前阶段结论
- `grassStatus` 生命周期已经落地第一版，种草现在开始具备 backlog / inbox 语义。
- 当前仍未完成的是：
  - `picked / archived` 的完整管理视图
  - 更彻底的旧字段清理
  - 生命周期与更多边界场景的回归验证

## 当前新规则摘要

### 种草
- 种草不是 Todo 模板。
- 种草只包含：
  - `activityTypeId`
  - `title`
  - `sceneTagIds`
  - `interestLevel`
  - 生命周期状态
  - `createdAt / updatedAt`

### 生命周期
- 推荐新增 `grassStatus`
- 生命周期推荐分为：
  - `active`
  - `picked`
  - `archived`
- `active` 才显示在活动种草库并参与拔草
- `picked` 表示已加入 Todo，暂时离开种草库
- `archived` 表示用户主动停用
- 当前第一版实现已落地以上语义

### 场景
- 不再根据 `selectedDate` 自动推断周中 / 周末
- 不再根据 `timeBlock` 自动推断白天 / 晚上
- 不再根据 tag 名称做内部语义匹配
- 只按 `sceneTagId` 精确匹配

### 拔草
- 用户先选种草清单
- 再按需选场景 tag
- 未选场景时，不按场景过滤
- 已选场景时，只按 `sceneTagIds` 交集过滤
- 只有 `active` 种草参与拔草
- 排序优先：
  1. `interestLevel`
  2. `createdAt + tieBreakerOrder`
  3. 当天已加入 Todo 的同种草项后置

## 哪些旧规则被处理

### 已废弃为产品主规则
- “种草是 Todo 模板”
- “种草直接保存必要 / 重复 / 准备 / 分次 / 日期”
- “拔草根据周中 / 周末自动判断场景”
- “拔草根据白天 / 晚上自动判断场景”
- “通过场景名称做内部语义匹配”
- “只用 `isArchived` 同时表达停用与已拔出”

### 已降级为内部实现说明
- `TaskTemplate` 继续同时承载 `grass` 与 `todo_recurring`
- `templateKind`
- `source`
- `decision_selected`
- `continuation`
- `isArchived` 在 `grass` 上降级为兼容字段

### 当前继续保留
- 种草清单
- 场景标签
- Todo 的必要 / 准备 / 分次 / 重复能力
- 重复 Todo 底层结构

## 推荐的后续任务顺序
1. 补 `picked / archived` 的种草管理视图
2. 继续清理 `grass` 上的旧执行字段消费
3. 回归验证从种草转 repeating 的边界
4. 评估是否需要单独设计“退回种草”

## 当前已知风险
- 当前实现里，`grass` 仍然复用 `TaskTemplate`，旧执行字段还在底层存在。
- `TemplateManagerPanel` 当前只默认显示 `active`，还不能直接查看 `picked / archived`。
- 从种草直接创建 repeating Todo 的路径已打通，但还需要回归验证更多边界场景。

## 当前明确未实现
- `decision_selected` 转重复
- `picked / archived` 的完整管理切换
- 已归档种草恢复入口
- 导出 / 导入
- 搜索 / 筛选
- 自动化业务测试

## 当前仍需确认
- `TaskTemplate` 是否在后续版本最终拆分
- `picked` 是否需要在种草管理页默认隐藏，还是作为独立分组显示

## 关键文件位置
- `AGENTS.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `task-list.md`
- `manual-test-checklist.md`
- `handoff.md`
- `dev-log.md`
