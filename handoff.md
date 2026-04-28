# 项目交接摘要

## 当前版本目标
- 当前已从 V2.1-N2：移动端与种草标题纠偏，进入 V2.1-N3：移动端重复选项与种草按钮修正。
- 本轮核心目标是修正移动端重复选项压扁问题，以及种草区第三个按钮的图标语义。

## 最近一次完成的 task
- 完成 V2.1-N3 小修正：
  - 移动端重复选项不再被压成五个小竖条
  - 重复规则现在保持单行横向 options，必要时可横向滑动
  - 种草区第三个按钮已恢复为三横线
  - 第一个新增种草按钮仍保持 `+ / -`

## 上一轮完成的 task
- 完成 V2.1-N2 小修正：
  - 移动端“更多设置”已按两行实现：
    - `必要 / 准备 / 分次`
    - `不重复 / 每天 / 每周 / 每月 / 每年`
  - 移动端拔草候选已恢复为标题和黄色加号同一行
  - 顶层卡片标题已改回 `种草`
  - 列表面板标题已补回 `种草清单`
  - 种草区展开/收起按钮已改回 `+ / -`

## 更早一轮完成的 task
- 完成 V2.1-N UI 纠偏第一版：
  - Todo 输入区顶部两组 segmented control 已恢复为同一行
  - 切到 `拔草条目` 时，普通输入区不会消失
  - 拔草候选改回追加在普通输入区下方
  - 更多设置区已收紧为紧凑附加设置带
  - 白天 / 晚上事项之间的实线分隔已删除
  - 种草区标题 `种草清单` 已恢复
  - 种草区展开/收起按钮已改回三横线语义
  - 种草条目兴趣 stepper 前已补回 `兴趣程度`

## 更早一轮完成的 task
- 完成 V2.1-M UI 收口第一版：
  - 种草内容输入已压缩为单行 input
  - 兴趣程度已移到种草输入下方
  - `保存种草` 已改为标题工具区 save icon
  - 保存 icon 无内容时会 disabled / 弱化
  - 种草列表已去掉：
    - `Grass / x 条种草`
    - `选择一条种草开始编辑`
    - 完整编辑按钮与编辑面板
  - 种草列表已补齐：
    - 种草清单 tag 单选
    - 场景 tag 多选
  - 种草条目已改为：
    - 标题
    - 兴趣程度 stepper
    - 停用 `×`

## 更早一轮完成的 task
- 完成 V2.1-L UI 收口第一版：
  - Todo 输入区顶部已改成两组 segmented control：
    - `普通条目 / 拔草条目`
    - 太阳 / 月亮
  - 普通条目模式已改为：
    - 输入框
    - 输入框内添加图标
    - `...` 更多按钮
  - 拔草不再通过独立“打开 / 收起”按钮触发
  - 拔草模式现在直接展示：
    - 种草清单 tag
    - 场景 tag 多选
    - 待拔草列表
  - 候选列表已去掉：
    - 默认推荐文案
    - 候选列表说明
    - 兴趣等级文字说明
  - 必要 / 重复 / 准备 / 分次已统一到同一套紧凑视觉系统

## 更早一轮完成的 task
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

## 当前阶段结论
- `grassStatus` 生命周期已经落地第一版，种草现在开始具备 backlog / inbox 语义。
- Todo 输入区与拔草面板的交互心智已开始从“按钮打开额外区域”改成“模式切换”。
- 种草区 UI 也已开始从“编辑后台”改成“backlog 列表 + 轻量输入”。
- 当前已修正上一轮两个主要误解：
  - `拔草条目` 不是替换普通输入区
  - 更多设置区不是第二套主界面
- 当前仍未完成的是：
  - `picked / archived` 的完整管理视图
  - 更彻底的旧字段清理
  - 生命周期与更多边界场景的回归验证
  - 输入区与种草区的进一步细节 polish

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
- 当前 UI 已切换为“拔草条目”模式直接展示筛选和列表

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
5. 视需要继续优化输入区 / 种草区细节与移动端节奏

## 当前已知风险
- 当前实现里，`grass` 仍然复用 `TaskTemplate`，旧执行字段还在底层存在。
- `TemplateManagerPanel` 当前只默认显示 `active`，还不能直接查看 `picked / archived`。
- 种草列表已不再支持标题 / 清单 / 场景的完整编辑；如果后续需要恢复这些操作，需要单独重新定义入口。
- 从种草直接创建 repeating Todo 的路径已打通，但还需要回归验证更多边界场景。
- 当前顶部双 segmented 在窄屏上已强制保持同一行，若后续需要更强压缩，可再评估文案或内边距。

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
- 输入区模式是否需要在未来记忆上次选择

## 关键文件位置
- `AGENTS.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `task-list.md`
- `manual-test-checklist.md`
- `handoff.md`
- `dev-log.md`
