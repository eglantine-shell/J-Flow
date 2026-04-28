# Dev Log

## 2026-04-28（V2.1-N4：重复滚动修复、segmented 高度对齐、favicon）

### 本轮目标
- 修正移动端重复选项滚动总长度没有真正变长的问题
- 只对齐顶部两组 segmented control 的高度
- 将根目录 `logo.PNG` 设置为网页图标

### 本轮关键判断
- 上一轮失败的根因是移动端样式虽然新增了 `grid-auto-columns`，但没有覆盖掉桌面端的 `grid-template-columns: repeat(5, ...)`，所以浏览器仍在做 5 等分压缩。
- 顶部两组 segmented control 高度不一致，根因是右侧日夜切换仍保留了更小的 `min-height`。

### 本轮修改
- 更新 `src/styles/globals.css`
  - 在移动端将重复选项从隐式 grid 改为显式 flex 横向排布
  - 让每个重复选项固定占据接近第一行单项的宽度
  - 对齐顶部两组 segmented control 的高度
- 更新 `index.html`
  - 增加 favicon 链接
- 新增 `public/logo.PNG`
  - 从根目录复制，用于网页图标

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
  - 保留既有 Vite chunk size warning，不影响构建成功

## 2026-04-28（V2.1-N3：移动端重复选项与种草按钮修正）

### 本轮目标
- 修正移动端重复选项被压成竖条的问题
- 修正种草区第三个按钮应为三横线而不是 `+ / -`

### 本轮关键判断
- 重复选项的问题本质是移动端仍在强制 5 等分网格，导致宽度被压扁，不是高度本身出错。
- 顶层种草卡片需要两个不同语义的展开控件：
  - 新增种草：`+ / -`
  - 种草清单：三横线

### 本轮修改
- 更新 `src/styles/globals.css`
  - 移动端重复选项改为单行横向 options
  - 允许横向滑动，避免被压成竖条
- 更新 `src/pages/home/HomePage.tsx`
  - 种草清单展开按钮恢复为三横线 icon

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
  - 保留既有 Vite chunk size warning，不影响构建成功

## 2026-04-28（V2.1-N2：移动端与种草标题纠偏）

### 本轮目标
- 修正移动端“更多设置”没有按两行实现的问题
- 修正移动端拔草候选项被压成两行的问题
- 把种草区展开/收起按钮改回 `+ / -`
- 修正“种草”与“种草清单”两个标题层级

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`
- `src/pages/home/HomePage.tsx`
- `src/features/todo/TodoModePanel.tsx`
- `src/features/templates/TemplateManagerPanel.tsx`
- `src/styles/globals.css`

### 本轮关键判断
- 移动端“更多设置”走样的根因不是控件本身，而是第一行 settings row 没有声明三列网格。
- 拔草候选在移动端分成两行的根因是通用媒体查询把 `.candidate-item` 一起改成了单列布局。
- 顶层卡片标题应是 `种草`，列表面板内部标题才是 `种草清单`。

### 本轮修改
- 更新 `src/styles/globals.css`
  - 给“必要 / 准备 / 分次”行补上三列网格
  - 保持移动端重复规则为同一行五项
  - 恢复候选项为“标题 + 最右加号”同一行
- 更新 `src/pages/home/HomePage.tsx`
  - 顶层标题改回 `种草`
  - 两个展开/收起按钮改回 `+ / -`
- 更新 `src/features/templates/TemplateManagerPanel.tsx`
  - 补回列表面板标题 `种草清单`
- 更新 `handoff.md`
  - 记录标题层级与移动端修正
- 更新 `manual-test-checklist.md`
  - 补充 `+ / -` 与标题层级的手测口径

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
  - 保留既有 Vite chunk size warning，不影响构建成功

## 2026-04-28（V2.1-N：Todo / 种草 UI 误解修正）

### 本轮目标
- 修正 Todo 输入区顶部工具栏布局
- 修正“拔草条目”错误替换普通输入区的行为
- 收紧更多设置区的视觉体量
- 恢复种草区被误删的标题与辅助文案

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`
- `src/features/todo/TodoModePanel.tsx`
- `src/pages/home/HomePage.tsx`
- `src/features/templates/TemplateManagerPanel.tsx`
- `src/styles/globals.css`

### 本轮关键判断
- 本轮只做 UI 纠偏，不改业务逻辑，不改 schema/storage/recommendation/grassStatus/recurrence/rollover。
- “拔草条目”不应替换普通输入区，而应作为普通输入区下方的追加筛选与候选区域。
- “必要 / 重复 / 准备 / 分次”属于附加设置，不应长成第二套主界面。

### 本轮关键决策
- Todo 输入区顶部两组 segmented control 保持同一行：
  - 左侧 `普通条目 / 拔草条目`
  - 右侧 `白天 / 晚上`
- 普通输入框、输入框内添加按钮、`...` 更多按钮始终显示。
- 切到 `拔草条目` 时，只在输入区下方追加：
  - 种草清单 tag
  - 场景 tag
  - 候选列表
- 更多设置区改为两行紧凑附加设置：
  - 第一行：`必要 / 准备 / 分次`
  - 第二行：`不重复 / 每天 / 每周 / 每月 / 每年`
- 删除 Todo 列表中白天 / 晚上之间的实线分隔，保留背景区分。
- 恢复种草区标题 `种草清单`，并把展开/收起 icon 改回三横线语义。

### 本轮修改
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 拔草条目改回“追加式”显示，不再替换普通输入区
  - 更多设置区改成紧凑两行
  - 删除白天 / 晚上列表间的分隔线节点
- 更新 `src/pages/home/HomePage.tsx`
  - 恢复种草区标题 `种草清单`
  - 展开/收起输入区按钮改回三横线 icon
- 更新 `src/features/templates/TemplateManagerPanel.tsx`
  - 在兴趣 stepper 前补回 `兴趣程度` 文案
- 更新 `src/styles/globals.css`
  - 调整顶部双 segmented 同行布局
  - 收紧更多设置区尺寸与节奏
  - 种草 stepper 补齐标签文案的样式
- 更新 `handoff.md`
  - 记录这轮 UI 误解修正后的当前口径
- 更新 `manual-test-checklist.md`
  - 更新 Todo 输入区与种草区的手测预期

### 当前风险与待确认问题
- 顶部两组 segmented control 现在在移动端仍保持同一行，空间更紧，后续如要继续压缩文字可再做微调。
- 更多设置区虽然已明显收紧，但准备备注 textarea 仍会在勾选后单独展开，这是当前保留的必要例外。

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
  - 保留既有 Vite chunk size warning，不影响构建成功

## 2026-04-28（V2.1-M：种草区 UI 收口）

### 本轮目标
- 收缩种草输入区，去掉底部文字保存按钮
- 把种草列表从“完整编辑后台”改成 backlog 风格列表
- 为种草列表补齐和拔草模式一致的 tag 筛选

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`
- `src/pages/home/HomePage.tsx`
- `src/features/templates/CreateTaskTemplateForm.tsx`
- `src/features/templates/TemplateFormFields.tsx`
- `src/features/templates/TemplateManagerPanel.tsx`
- `src/styles/globals.css`

### 本轮关键判断
- 本轮只改种草区 UI，不动 Todo 输入区、Todo 列表、schema/storage 和生命周期规则。
- “种草”标题右侧工具区更适合作为新增保存入口，这样新增表单本身可以退回为轻量输入区域。
- 种草列表既然当前只展示 `active grass`，就不应继续保留完整编辑后台，而应改成 backlog list。

### 本轮关键决策
- 种草内容输入改为单行 input。
- 兴趣程度移到种草内容输入下方。
- `保存种草` 文本按钮移除，改为标题工具区 `save icon`。
- 种草列表不再支持完整编辑，只保留：
  - 兴趣程度 stepper
  - 删除 / 停用
- 种草列表筛选改为：
  - 种草清单 tag 单选
  - 场景 tag 多选
  - 不选场景时不过滤

### 本轮修改
- 更新 `src/pages/home/HomePage.tsx`
  - 种草标题工具区改为：
    - 展开 / 收起输入区 icon
    - 保存 icon
    - 展开 / 收起种草列表 icon
  - 保存 icon 通过表单 `id` 直接触发种草保存
- 更新 `src/components/ui/Icons.tsx`
  - 补充标题工具区所需的展开 / 收起 / 列表 icon
- 更新 `src/features/templates/CreateTaskTemplateForm.tsx`
  - 移除底部 `保存种草` 按钮
  - 向标题工具区暴露当前是否可保存 / 是否正在保存
- 更新 `src/features/templates/TemplateFormFields.tsx`
  - 种草内容改为单行输入
  - 兴趣程度移到文本框下方
- 更新 `src/features/templates/TemplateManagerPanel.tsx`
  - 去掉完整编辑面板
  - 去掉后台式说明文字
  - 新增活动清单 tag 单选与场景 tag 多选筛选
  - 条目改为标题 + 兴趣 stepper + 停用 `×`
- 更新 `src/styles/globals.css`
  - 为标题工具区 disabled icon、单行输入、种草列表 stepper 和停用按钮补样式
  - 去掉种草列表的后台感虚线边框
- 更新 `handoff.md`
  - 记录种草区 UI 已收口到 backlog 视角
- 更新 `manual-test-checklist.md`
  - 增补种草输入区与种草列表筛选 / stepper 的手测口径

### 当前风险与待确认问题
- 当前保存 icon 仍依赖“新增种草输入区已展开”这一前提；收起状态下会禁用，这和当前工具区设计一致。
- 种草列表目前仍只展示 `active`，`picked / archived` 的查看能力仍是后续任务。
- 兴趣 stepper 目前仍按 1~3 限制，未来若扩到 5 级，需要同步调整类型与视觉节奏。

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
  - 保留既有 Vite chunk size warning，不影响构建成功

## 2026-04-28（V2.1-L：Todo 输入区 + 拔草面板 UI 收口）

### 本轮目标
- 将 Todo 输入区改为“普通条目 / 拔草条目”双模式 segmented control
- 去掉拔草的独立打开 / 收起按钮
- 收口必要 / 重复 / 准备 / 分次的控件视觉
- 精简拔草候选列表的展示

### 开始前已阅读
- `handoff.md`
- `dev-log.md`
- `manual-test-checklist.md`
- `src/features/todo/TodoModePanel.tsx`
- `src/styles/globals.css`
- `src/components/ui/Icons.tsx`

### 本轮关键判断
- 本轮只改 Todo 输入区与拔草面板 UI，不改种草区 UI，不改业务规则，不改 schema/storage。
- “拔草条目”更适合成为输入区的一种模式，而不是额外按钮打开的二级面板。
- 普通条目模式应把添加动作收进输入框内部，减少外部按钮噪音。
- 重复规则若继续使用原生 `select`，会持续和其他三个控件不协调，因此改为同系统的 pill options 更合适。

### 本轮关键决策
- 顶部第一行改为两组 segmented control：
  - 左侧：`普通条目 / 拔草条目`
  - 右侧：太阳 / 月亮
- 普通条目模式第二行改为：
  - 输入框
  - 输入框内加号按钮
  - `...` 更多按钮
- 拔草条目模式不再显示：
  - 打开 / 收起按钮
  - 默认推荐文案
  - 候选列表说明
  - 兴趣等级文字说明
- 候选列表右侧加号使用黄色系，并按兴趣等级控制透明度

### 本轮修改
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 新增 `composerMode`
  - Todo 输入区改为双 segmented control
  - 普通条目输入改为输入框内添加按钮
  - 拔草模式切换后直接展示筛选与列表
  - 重复规则改为 inline pill options
  - 候选项改为标题 + 右侧加号
  - 新增兴趣加号透明度 helper
- 更新 `src/styles/globals.css`
  - 为模式切换、输入框内按钮、轻量日夜分段补样式
  - 为四项执行属性补统一 option grid 样式
  - 去掉旧拔草按钮 / 虚线分隔的视觉依赖
  - 精简候选列表样式
- 更新 `handoff.md`
  - 记录当前输入区与拔草面板 UI 口径
- 更新 `dev-log.md`
  - 记录本轮 UI 收口决策
- 更新 `manual-test-checklist.md`
  - 更新输入区与拔草面板的手测口径

### 当前风险与待确认问题
- 当前 `picked / archived` 的管理视图仍未补，这轮只处理输入区与拔草面板。
- 拔草模式切换时会保留当前筛选条件，但未来是否要记忆更长期的用户选择仍待确认。

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
  - 保留既有 Vite chunk size warning，不影响构建成功

## 2026-04-28（V2.1-K：种草生命周期实现第一版）

### 本轮目标
- 落地 `grassStatus`
- 让种草在加入 Todo 后离开种草库
- 让来自种草的一次性 Todo 删除后回库、完成后不回库

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`
- `manual-test-checklist.md`
- `src/features/templates/CreateTaskTemplateForm.tsx`
- `src/features/templates/TemplateFormFields.tsx`
- `src/features/templates/TemplateManagerPanel.tsx`
- `src/features/decision/recommendation.ts`
- `src/features/todo/TodoModePanel.tsx`
- `src/db/storage.ts`
- `src/types/models.ts`
- `src/db/schema.ts`
- `src/mocks/app-data.ts`

### 本轮关键判断
- 本轮在不拆 `TaskTemplate` 的前提下，优先把生命周期状态落到现有模型。
- `isArchived` 不能继续同时承担“已拔出待消费”和“用户主动停用”两种语义，因此必须引入 `grassStatus`。
- 推荐、种草表单、从种草创建 Todo、删除回库这几条链必须一起改，否则生命周期会前后不一致。

### 本轮关键决策
- 新增 `TaskTemplate.grassStatus?: 'active' | 'picked' | 'archived'`
- 旧数据兼容规则：
  - `grass + isArchived=true => archived`
  - `grass + isArchived=false => active`
- 新写入规则：
  - `archived => isArchived=true`
  - `active / picked => isArchived=false`
- `todo_recurring` 继续只使用 `isArchived`
- 从种草加入 Todo 时，执行属性改为来自 Todo 添加区当前选择，而不是来自 `grass`

### 本轮修改
- 更新 `src/types/models.ts`
  - 为 `TaskTemplate` 增加 `grassStatus`
- 更新 `src/db/schema.ts`
  - 为 `TaskTemplate` 增加 `grassStatus` schema
  - 升级 `APP_DATA_SCHEMA_VERSION`
- 更新 `src/db/storage.ts`
  - 为旧数据增加 `grassStatus` fallback
  - 为新写入与更新增加 `grassStatus <-> isArchived` 同步规则
- 更新 `src/mocks/app-data.ts`
  - 调整 mock grass 数据以兼容新口径
- 更新 `src/features/templates/TemplateFormFields.tsx`
  - 收缩种草表单，只保留轻量字段
- 更新 `src/features/templates/CreateTaskTemplateForm.tsx`
  - 新增 grass 默认写入 `grassStatus = active`
  - 底层旧执行字段写默认值
- 更新 `src/features/templates/TemplateManagerPanel.tsx`
  - 当前默认只显示 `active` grass
  - 停用时写 `grassStatus = archived`
- 更新 `src/features/decision/recommendation.ts`
  - recommendation 只消费 `grassStatus = active`
  - 改为显式 `sceneTagIds` 筛选
  - 从种草加入后将原 grass 置为 `picked`
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 拔草面板支持显式场景 tag 选择
  - 从种草加入 Todo 时将执行属性从当前添加区传入
  - 删除来自种草的一次性 Todo 时恢复原 grass 为 `active`
  - 完成来自种草 Todo 时不恢复
- 更新文档：
  - `product-rules.md`
  - `data-model.md`
  - `app-structure.md`
  - `task-list.md`
  - `handoff.md`
  - `dev-log.md`
  - `manual-test-checklist.md`

### 当前风险与待确认问题
- `TemplateManagerPanel` 目前只默认显示 `active`，`picked / archived` 的查看切换仍待补。
- 从种草直接创建 repeating Todo 已接入现有路径，但还需要补更多边界验证。
- 旧 `grass` 执行字段虽然不再在表单暴露，但底层仍保留，后续仍需继续清理。

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
  - 保留既有 Vite chunk size warning，不影响构建成功

## 2026-04-28（V2.1-K：种草生命周期方案确认）

### 本轮目标
- 确认“种草加入 Todo 后如何离库 / 回库”的生命周期规则
- 比较复用 `isArchived` 与新增生命周期字段两种方案
- 在不改源码的前提下同步文档口径

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `data-model.md`
- `task-list.md`
- `dev-log.md`
- `manual-test-checklist.md`
- `src/features/decision/recommendation.ts`
- `src/features/templates/TemplateManagerPanel.tsx`
- `src/features/todo/TodoModePanel.tsx`
- `src/db/schema.ts`
- `src/types/models.ts`

### 本轮关键判断
- 本轮只改文档，不改源码。
- 复用 `TaskTemplate.isArchived` 会把“用户主动停用”和“已被加入 Todo 暂时离库”混在一起，长期不可维护。
- 当前代码已经把 `isArchived` 同时用于：
  - `grass` 停用过滤
  - `todo_recurring` 停止重复
  因此继续给 `grass` 叠加“picked”语义风险更高。
- 若种草要承担 backlog / inbox 生命周期，就需要能区分：
  - 仍可被拔草
  - 已被消费但不算停用
  - 用户主动停用

### 本轮关键决策
- 推荐新增 `grassStatus: 'active' | 'picked' | 'archived'`
- 推荐继续保留 `TaskTemplate` 作为底层复用模型
- 推荐将 `isArchived` 未来收口为：
  - `todo_recurring` 的长期有效字段
  - `grass` 的兼容字段
- 推荐生命周期规则：
  - 从种草加入 Todo：`grassStatus = 'picked'`
  - 来自种草的一次性 Todo 删除：`grassStatus = 'active'`
  - 来自种草的一次性 Todo 完成：保持 `picked`
  - 用户停用种草：`grassStatus = 'archived'`
  - 来自种草转 repeating 后，不因删除 occurrence 或停止重复而自动恢复种草

### 本轮修改
- 更新 `product-rules.md`
  - 补充种草生命周期与 repeating 边界
- 更新 `data-model.md`
  - 为 `grass` 增加推荐生命周期字段设计与兼容策略
- 更新 `app-structure.md`
  - 补充种草管理页的状态视图方向
- 更新 `task-list.md`
  - 新增生命周期落地任务包
- 更新 `manual-test-checklist.md`
  - 补充离库 / 回库目标手测口径
- 更新 `handoff.md`
  - 更新当前阶段目标、风险与后续顺序
- 更新 `dev-log.md`
  - 记录本轮方案比较与决策

### 当前风险与待确认问题
- 当前代码尚无 `grassStatus`，老逻辑仍只按 `isArchived` 过滤。
- “picked 是否在管理页默认隐藏还是作为单独分组显示”仍待产品确认。
- “从种草加入 Todo 时是否允许直接创建 repeating Todo”仍待最终确认。

### 验证结果
- 本轮未运行 `lint` / `build`
- 原因：本轮只改文档，不改源码

## 2026-04-28（V2.1-F：种草 / 拔草规则重写与文档同步）

### 本轮目标
- 把“种草不是 Todo 模板，种草是轻量收藏池”写成统一规则
- 把“有空就做场景不再自动语义推断”写成统一规则
- 同步主规则、数据模型、结构文档、任务拆分、手测口径与交接摘要

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`
- `manual-test-checklist.md`
- `src/features/templates/CreateTaskTemplateForm.tsx`
- `src/features/templates/TemplateFormFields.tsx`
- `src/features/templates/TemplateManagerPanel.tsx`
- `src/features/decision/recommendation.ts`
- `src/features/todo/TodoModePanel.tsx`
- `src/features/todo/todo-view-model.ts`
- `src/db/storage.ts`
- `src/types/models.ts`
- `src/db/schema.ts`

### 本轮关键判断
- 本轮只改文档，不改源码。
- 当前实现里的 `grass` 明显仍是“半个 Todo 模板”，与最新产品心智冲突。
- 直接先拆底层模型风险较高，文档层应先明确：`TaskTemplate` 可暂时复用，但 `grass` 与 `todo_recurring` 的产品解释必须分离。
- 场景自动耦合白天 / 晚上、周中 / 周末，会让“有空就做”既像用户标签又像系统语义，当前需要先废弃这套规则。

### 本轮关键决策
- 将种草定义为轻量收藏池，只保留：
  - `activityTypeId`
  - `title`
  - `sceneTagIds`
  - `interestLevel`
- 将以下字段从 `grass` 的用户规则中移除，降级为历史兼容字段：
  - `isNecessary`
  - `recurrence`
  - `requiresPreparation`
  - `preparationNotes`
  - `isSegmented`
  - `date`
- 将场景规则改为：
  - 只由用户主动选择
  - 只按 `sceneTagId` 精确匹配
  - 不再根据日期、时段、tag 名称做自动推断
- 对“当天已加入 Todo 的同种草项”当前文档建议采用：
  - 同时段禁止重复添加
  - 跨时段候选后置，不作为默认推荐

### 本轮修改
- 更新 `product-rules.md`
  - 重写种草、场景、拔草规则
  - 明确废弃的 V1 / 早期 V2 遗留
- 更新 `data-model.md`
  - 明确 `TaskTemplate` 暂时复用策略
  - 标注 `grass` 上的历史兼容字段
- 更新 `app-structure.md`
  - 将种草区与拔草区定义改为“收藏池 + 显式筛选”
- 更新 `task-list.md`
  - 新增 V2.1-F 到 V2.1-J 的后续拆分
- 更新 `manual-test-checklist.md`
  - 改写种草 / 拔草目标手测口径
- 更新 `handoff.md`
  - 补充当前文档层结论与后续建议顺序
- 更新 `dev-log.md`
  - 记录本轮改动与决策

### 当前风险与待确认问题
- 当前代码仍按旧规则运行，尤其是：
  - 种草表单仍暴露执行属性
  - 拔草仍做自动场景推断
  - 从种草加入 Todo 仍继承模板执行字段
- 是否允许“同一天另一时段再次添加同一条种草”，当前仅形成文档建议，尚待实现轮最终确认。
- 是否允许“从种草直接创建 repeating Todo”，当前仍待确认。

### 验证结果
- 本轮未运行 `lint` / `build`
- 原因：本轮只改文档，不改源码

## 2026-04-28（V2.1-E：UI 微调）

### 本轮目标
- 缩小初始化页主句字号
- 调整初始化页两个配置块之间的垂直节奏
- 让 Todo 条目去边框、改成更轻的色块列表
- 将设置页三段结构合并为一个大卡片内的两个小模块

### 开始前已阅读
- `handoff.md`
- `dev-log.md`
- `src/pages/setup/SetupPage.tsx`
- `src/features/settings/SettingsPanel.tsx`
- `src/styles/globals.css`

### 本轮关键判断
- 本轮只做视觉层微调，不改初始化逻辑、不改 Todo 行为、不改设置功能。
- 初始化页主句更适合降到“次级标题”层级，而不是继续占用 hero 级视觉权重。
- Todo 区当前问题主要来自描边感，不需要靠阴影补偿，直接改成无边框色块更贴近轻量列表。
- 设置页可以继续保留 `设置` 主标题，但把排序设置和测试工具降级为同卡片内的子模块。

### 本轮修改
- 更新 `src/pages/setup/SetupPage.tsx`
  - 为初始化页增加局部样式作用域
- 更新 `src/features/settings/SettingsPanel.tsx`
  - 将排序设置与测试工具合并到同一个 `SurfaceCard`
- 更新 `src/styles/globals.css`
  - 缩小初始化页主句字号
  - 调整“种草清单”与“有空就做”两个配置块之间的垂直间距
  - 去掉 Todo 条目明显边框，改为无边框背景色块
  - 收口设置页为一个主卡片下的两个子模块，并补充分隔线与层级样式

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
  - 保留既有 Vite chunk size warning，不影响构建成功
