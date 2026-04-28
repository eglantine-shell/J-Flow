# 项目交接摘要

## 当前阶段
- 当前已完成 V2.2：设置页数据导出 / 导入第一版。
- 当前网页端已经补上最关键的数据安全闭环，开始接近“网页试用版冻结 + App 设计准备”。
- 本轮已改设置页与存储层实现，并补齐对应文档与手测口径。

## V2.1 已稳定的核心规则

### Todo 主规则
- Todo 是一等公民。
- `date` 表示这条 Todo 当前落点日期。
- `originDate` 表示这条 Todo 的创建日 / repeating occurrence 命中日。
- 普通 Todo 未完成时，会按 Todo 直觉顺延搬移到今天。
- 普通 Todo 一旦 `completed` 或 `deleted`，这条 Todo 即结束，不再继续延续。
- 分次只是 Todo 的 `progress` 属性，不是另一套系统。
- 必要 / 准备只是 UI 属性，不额外改变 Todo 生命周期。

### Repeating 规则
- repeating Todo 的 recurrence 只负责决定哪些命中日会生成新的 occurrence。
- 同一模板 + 同一命中日，最多生成一条 occurrence。
- 不同命中日可以生成不同 occurrence，因此 repeating Todo 允许并存多条。
- 每条 repeating occurrence 创建后都按普通 Todo 运行：
  - 未完成会继续顺延搬移
  - 完成会结束本次
  - 删除只结束本次
- 删除一次 repeating occurrence，不影响未来重复。
- 停止重复，只停止未来生成；历史与已存在 occurrence 保留。

### 种草规则
- 种草是 backlog，不是 Todo 模板。
- `grassStatus` 当前有效状态为：
  - `active`
  - `picked`
  - `archived`
- 只有 `active` 种草参与拔草候选。
- 从种草加入 Todo 后，原种草切到 `picked`。
- 删除来自种草的一次性 Todo 后，原种草恢复到 `active`。
- 完成来自种草的 Todo 后，原种草不回库。
- 删除某次来自种草的 repeating occurrence，不会恢复原种草。
- 停止重复也不会恢复原种草。
- 只有明确停止未来重复，才会停止新的 repeating occurrence 生成。

## 当前 UI 状态
- Todo 输入区已分为 `普通条目 / 拔草条目` 两种模式。
- 顶部日夜切换保留，且与左侧模式切换维持同一行。
- 过去日期不显示新增 Todo 区。
- 普通输入区仍然是统一入口：
  - 输入框
  - 输入框内加号
  - `...` 更多设置
- 拔草筛选已改成：
  - 种草清单 tag 单选
  - 场景 tag 多选
- 种草区已收缩为轻量 backlog，而不是模板编辑后台。
- 种草列表当前只做：
  - 筛选
  - 兴趣编辑
  - 停用
- `lucide-react` 已作为图标系统接入并成为当前图标基线。
- 日夜列表保留不同背景，但去掉了中间实线分隔。
- 网页 favicon 已接入 `logo.PNG`。

## 当前已知暂缓事项
- `picked / archived` 种草完整管理视图暂缓
- 拖拽排序暂缓
- iOS 原生交互暂缓
- 搜索暂缓
- 通知 / reminder 暂缓
- 多设备同步暂缓
- Todo 历史统计暂缓

## 当前实现状态判断

### 已经形成稳定心智的部分
- Todo 生命周期主规则已经稳定。
- 普通 Todo 与 repeating occurrence 的边界已经稳定。
- 种草作为 backlog、Todo 作为执行主语的产品边界已经稳定。
- 拔草从“自动猜”改成“用户显式筛选”的方向已经稳定。
- UI 主体结构已经接近网页试用版收口形态。

### 仍未形成完整闭环的部分
- 当前没有搜索 / 筛选入口，Todo 数量上来后排查与回看成本会升高。
- 当前手测口径虽已覆盖主规则，但 repeating 与 grass 生命周期仍值得再补一轮更完整回归。

## App 化前建议

### 强烈建议在网页端补齐
1. 更完整的手动验证闭环
   - repeating occurrence
   - grass 生命周期
2. 轻量级 Todo 搜索 / 状态筛选
   - 如果继续开放网页试用并允许真实使用，建议补最小检索能力
   - 若马上转入 App 设计并冻结网页，则可降级为次优先

### 建议留到 App 版
- 左滑删除
- 长按菜单
- bottom sheet
- 拖拽排序
- 本地通知
- iOS 日历 / reminder 集成
- widget
- haptic feedback

### 当前不建议继续扩展
- 多用户 / 协作
- 云同步
- 复杂统计
- AI 推荐
- 多层项目管理
- 标签系统再扩展
- 复杂 recurrence 自定义规则

## 推荐路线
1. V2.2
   - 已完成：设置页数据导出 / 导入第一版
2. V2.3
   - 完成生命周期与 recurrence 手测闭环
3. V2.4（可选）
   - 若网页端还要继续试用：补轻量 Todo 搜索 / 筛选
   - 若准备冻结网页：不做该项，转入 App 信息架构与交互设计

## 当前建议结论
- 如果只能再做 2 个小版本，优先做：
  - 生命周期与 recurrence 手测闭环
  - 视试用情况决定是否补轻量搜索 / 筛选
- 如果允许第 3 个小版本，再评估是否补轻量 Todo 搜索 / 筛选。
- 当前已经接近“网页试用版冻结 + App 设计准备”，但前提是至少补齐：
  - 核心生命周期回归验证

## 当前主要风险
- 当前实现里，`grass` 仍复用 `TaskTemplate`，旧字段仍存在于底层结构中。
- 当前搜索缺位在条目规模上来后会明显影响“完整 Todo List”体验。
- 当前导入为“整体覆盖当前本地数据”，尚不支持合并导入或导入预览。

## 本轮改动文档
- `handoff.md`
- `dev-log.md`
- `task-list.md`
- `manual-test-checklist.md`
