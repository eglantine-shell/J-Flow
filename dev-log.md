# Dev Log

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
