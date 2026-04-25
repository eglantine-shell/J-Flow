# Dev Log

## 2026-04-25（正式试用前 UI 收口）

### 本轮目标
- 继续压轻初始化页、主页顶部、Todo 展开区与 Todo 条目视觉
- 修正设置图标识别性
- 只改界面文案、布局和样式
- 不改业务逻辑

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`

### 本轮关键判断
- 当前问题已经不是主路径是否成立，而是页面仍有几处“解释型 UI”太多，导致第一眼不像真正的日常 Todo app。
- 初始化页和 Todo 展开区都还保留了重复标题、重复说明和偏重的结构提示，这些都可以在不碰逻辑的前提下继续减掉。
- 设置图标当前虽然是 SVG，但识别性还不够像标准齿轮，需要直接换成更明确的 gear 轮廓。

### 本轮关键决策
- 初始化页主句降成次级标题层级，不再做 hero。
- 初始化页删除顶部说明句和底部说明句，只保留两组主标题与进入按钮。
- Todo 区删除“今天的 Todo”和白天 / 晚上数量摘要。
- Todo 展开区删除重复标题与重复说明，只留下真正可操作的控件。
- 推荐区改成单一候选列表，默认推荐只通过边框和尺寸轻微加强，不再分两个大区块。
- Todo 条目改成“左内容、右操作”的并排结构：
  - 右侧固定 checkbox 与 `×`
  - 删除按钮只对临时事项可用

### 本轮修改
- 更新 `src/components/ui/Icons.tsx`
  - 将设置图标改为更明确的线条齿轮 SVG
- 更新 `src/pages/setup/SetupPage.tsx`
  - 删除初始化页冗余说明
  - 提升两个配置区标题层级
- 更新 `src/pages/home/HomePage.tsx`
  - 删除 Todo 区摘要标题
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 删除展开区重复标题和说明
  - 将推荐卡改为统一候选列表
  - 将 Todo 操作区改到条目最右并排
  - 删除按钮改为 `×`
- 更新 `src/styles/globals.css`
  - 配套收口初始化页、顶部、推荐区与 Todo 条目样式
- 更新 `dev-log.md`
  - 记录本轮 UI 收口判断

### 本轮刻意未做
- 未改数据模型
- 未改 schema
- 未改 Todo 创建逻辑
- 未改从种草添加逻辑
- 未改推荐排序
- 未改自动生成逻辑
- 未改完成 / 分次推进逻辑
- 未改测试重置逻辑
- 未做临时重复 Todo
- 未做搜索、导出、拖拽
- 未引入新依赖

### 当前风险与待确认问题
- Todo 条目已经更接近真正 list item，但在极长标题和很多标签同时出现时，移动端密度仍可继续微调。
- 推荐卡当前已经去掉分区标题，但若后续继续压轻，还可再评估候选项的按钮尺寸与标签数量。

### 验证结果
- `pnpm run build`：通过
  - 存在既有的 Vite chunk size warning，但不影响构建成功
- `pnpm run lint`：通过

## 2026-04-25（V2-6 试用前收口与边界验证）

### 本轮目标
- 扫描并清理当前实现中残留的 V1 旧口径
- 核对 V2 主路径是否与文档一致
- 补一份可直接执行的手动验证清单
- 只修明显的小文案问题，不新增功能

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`
- `README.md`

### 本轮关键判断
- V2 主路径功能已经基本齐备，当前最大的风险不是缺功能，而是残留旧文案、状态文档过时，以及缺少一份面向试用的明确检查清单。
- 当前实现里仍会暴露给用户的 V1 旧口径已经很少，主要是“从种草添加”路径上的一条重复添加报错文案。
- 本轮应优先做“写实同步”，把 README、handoff 和试用清单同步到当前真实状态，而不是继续扩写功能。

### 本轮关键决策
- 只修实际会影响用户理解的旧文案，不为了改词去重构底层命名。
- 新增独立的 `manual-test-checklist.md`，避免把 README 或 task-list 写成过长的操作手册。
- 将项目状态从“V2 方向迁移阶段”更新为“V2 可正式试用阶段”。
- 明确记录当前仍未实现的后续能力：
  - 临时重复 Todo
  - 拖动排序 / 拖动改变晚间语境
  - 导出 / 导入
  - 已归档种草恢复
  - 搜索 / 筛选
  - 自动化业务测试
  - iOS App 迁移

### 本轮修改
- 更新 `src/features/decision/recommendation.ts`
  - 将重复添加报错从“同一模板”改为“同一条种草”，避免暴露 V1 口径
- 新增 `manual-test-checklist.md`
  - 补齐初始化、设置重置、Todo、从种草添加、种草管理、日期切换、刷新、构建与 lint 的手动验证项
- 更新 `README.md`
  - 将项目当前状态同步为 V2 已完成主路径迁移并进入可正式试用
  - 增加手动验证清单入口
- 更新 `handoff.md`
  - 标记 V2-6 已完成
  - 同步当前可试用状态、未实现项与最近任务
- 更新 `dev-log.md`
  - 记录本轮收口判断、修改与验证结果

### V2 主路径核对结果
- 初始化：
  - 当前代码与默认 seed 已使用 V2 文案和默认项
  - tag 原位新增 / 删除与至少保留一个规则仍在
- 主页：
  - 当前结构为 `Todo + 种草`
  - 已不存在“决策 / Todo”模式切换
- Todo 默认添加：
  - 默认继续创建 `manual_temporary`
  - 不回写种草层
- Todo 更多属性：
  - 当前支持必要事项、需要准备、准备备注、分次事项
  - 当前未提供临时重复 Todo 入口
- 从种草添加：
  - 已并入 Todo 添加区的“更多”
  - 不再保留独立拔草辅助区
- 种草区：
  - 当前仍可新增、编辑、停用，并保留 tag 管理与条件日期规则
- 设置页：
  - 当前保留排序设置与测试重置
  - 未重复保留时间场景 / 活动类型管理 section

### 本轮刻意未做
- 未新增功能
- 未改数据模型
- 未改 schema
- 未改推荐算法
- 未改自动生成规则
- 未改重复规则语义
- 未做拖动排序
- 未做导出 / 导入
- 未做搜索
- 未做 iOS 迁移准备代码

### 当前风险与待确认问题
- 当前“V2 主路径可试用”的判断主要基于代码路径核对与构建级验证，仍需要按手动清单做一轮真实试用走查。
- 模板层、`activityTypes`、`sceneTags` 等底层命名仍保留 V1 工程语义，但这符合当前“不改数据模型”的边界。
- 已归档种草恢复、搜索筛选和自动化业务测试仍未进入实现。

### 验证结果
- `pnpm run build`：通过
  - 存在既有的 Vite chunk size warning，但不影响构建成功
- `pnpm run lint`：通过

## 2026-04-25（V2-5 Todo list UI 轻量化）

### 本轮目标
- 让主页面更像一个日常可用的 Todo app，而不是功能面板集合
- 提升 Todo 作为主视觉主体的优先级
- 压轻添加入口、Todo 列表、白天 / 晚上分组与种草区的视觉重量
- 不改业务逻辑

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`
- `README.md`

### 本轮关键判断
- V2-4 已经把 Todo 添加入口融合完成，当前核心问题不再是功能缺失，而是视觉层级仍然偏“功能面板集合”。
- 本轮目标是让用户第一眼先看到“今天的 Todo”和一个轻量输入栏，而不是成组的卡片和扩展面板。
- 现有能力已经足够，本轮应主要通过 CSS 收口来解决，而不是继续改动业务结构。

### 本轮关键决策
- Todo 添加入口收成更像输入栏：
  - 输入框最突出
  - 白天 / 晚上 segmented 更小
  - “更多”降为弱动作
  - `+` 保留主操作但不夸张
- “更多”展开区降为输入栏下方的轻量扩展层，不再做成两张大卡片。
- Todo 条目从强卡片感收为更接近连续列表：
  - 降低阴影
  - 降低圆角
  - 缩小间距
  - 缩小状态 chip
- 白天 / 晚上分组保留，但退回轻量分隔层，不再形成大 section 心智。
- 种草区继续保留现有展开和管理能力，但视觉权重低于 Todo。

### 本轮修改
- 更新 `src/styles/globals.css`
  - 压轻顶部 / 日期区的间距和容器重量
  - 收口 Todo 添加区、更多展开区、Todo 列表项、白天 / 晚上分组
  - 降低种草区容器与展开面板的视觉权重
  - 补齐移动端下的紧凑布局
- 更新 `handoff.md`
  - 记录 V2-5 已完成及当前页面状态
- 更新 `dev-log.md`
  - 记录本轮 UI 收口判断与验证结果

### 本轮刻意未做
- 未改数据模型
- 未改 schema
- 未改 Todo 创建逻辑
- 未改从种草添加逻辑
- 未改推荐排序
- 未改自动生成逻辑
- 未改完成 / 分次推进逻辑
- 未做临时重复 Todo
- 未做导出 / 导入
- 未做搜索
- 未引入新依赖
- 未新增复杂动画

### 当前风险与待确认问题
- 当前页面已经明显更像 Todo list，但条目和种草区的文本层级、按钮尺寸、chip 密度仍有继续微调空间。
- “更多”展开区虽然已降权，但在信息较多时仍可能偏工程化，后续仍可继续压缩说明文案和控件密度。
- 种草区当前仍保留表单与管理面板并存的结构，这符合本轮“不改业务逻辑”的要求，但后续若要进一步产品化，还可以继续收口默认展开体验。

### 验证结果
- `pnpm run build`：通过
  - 仍有 Vite 的 chunk size warning，但不影响构建成功
- `pnpm run lint`：通过

## 2026-04-25（V2-4 Todo 添加入口融合）

### 本轮目标
- 将 Todo 顶部添加区融合为一个统一入口
- 默认优先支持快速新增普通临时 Todo
- 在“更多”里接入从种草添加与本次 Todo 的实例属性
- 移除主页面上冗余的独立拔草辅助区

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`
- `README.md`

### 本轮关键判断
- 当前 V2-3 已经把主页面迁移成 Todo + 种草，但用户在添加 Todo 时仍要额外面对一个独立拔草区，心智仍不够统一。
- 现有 `manual_temporary` 实例结构已经具备承载 `isNecessary / requiresPreparation / preparationNotes / isSegmented / progressState / progressPercent` 的能力，因此本轮不需要改数据模型。
- 重复规则仍依赖模板层和未来自动生成语义，如果让临时 Todo 直接支持重复，会把本轮从“入口融合”拉成“数据语义重写”，因此必须暂缓。

### 本轮关键决策
- Todo 添加区默认保留：
  - 输入框
  - 白天 / 晚上 segmented control
  - `+` 添加按钮
  - “更多”入口
- 默认不展开时：
  - 输入非空后直接创建 `manual_temporary DayPlanItem`
- 展开“更多”后：
  - 提供“从种草添加”入口，复用现有推荐与 `decision_selected` 逻辑
  - 提供本次 Todo 的实例属性：
    - 必要事项
    - 需要准备
    - 准备备注
    - 分次事项
- 删除主页面中独立的拔草辅助区，避免出现两个“从种草添加”入口。
- V2-4 暂不支持临时 Todo 的重复规则；重复仍通过种草 / 模板层保留，后续若需要要单独设计。

### 本轮修改
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 将临时事项添加区升级为统一 Todo 添加入口
  - 在“更多”里接入拔草推荐和实例属性
  - 默认新增继续创建 `manual_temporary`
  - 从种草添加继续创建 `decision_selected`
- 更新 `src/pages/home/HomePage.tsx`
  - 删除独立拔草辅助区
  - 保留 Todo 主体与下方种草区
- 更新 `src/styles/globals.css`
  - 补充统一添加入口与“更多”展开区的最小样式
- 更新 `handoff.md`
  - 记录 V2-4 已完成及当前边界
- 更新 `dev-log.md`
  - 记录本轮判断、决策和不支持项

### 本轮刻意未做
- 未改数据模型
- 未改 schema
- 未改自动生成逻辑
- 未改推荐排序
- 未实现临时重复任务
- 未做拖动排序
- 未做导出 / 导入
- 未做搜索
- 未引入新依赖
- 未做 V2-5 的完整 UI 轻量化

### 当前风险与待确认问题
- 当前“更多”里的实例属性已经接入，但整体视觉和信息密度仍然偏工程化，后续需要在 V2-5 继续做真正的 Todo UI 轻量化。
- 从种草添加与临时 Todo 现在已合并到同一入口，但还没有做更强的状态提示、交互动效或更细的空状态引导。
- 由于保留了 V1 推荐逻辑，当前场景推导仍受既有 `sceneTags` 语义限制，后续若要更贴近 V2 的“有空就做”心智，还需要继续收口。

### 验证结果
- `pnpm run build`：通过
  - 仍有 Vite 的 chunk size warning，但不影响构建成功
- `pnpm run lint`：通过

## 2026-04-25（V2-3 主页面从双模式迁移为 Todo + 种草）

### 本轮目标
- 将主页面从“决策 / Todo 双模式”迁移为“Todo + 种草”单页结构
- 删除模式切换，让 Todo 成为常驻主体
- 将原“决策库 / 增加安排”文案改成 V2 的“种草 / 拔草”
- 不做 V2-4 的添加入口融合

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`
- `README.md`

### 本轮关键判断
- 当前主页面的核心问题不是能力缺失，而是交互顺序仍停留在 V1 的“双模式”心智里。
- 现有 `DecisionModePanel` 实际上已经具备“自动事项 + 已选事项 + 推荐候选”的独立能力，因此不需要重写推荐逻辑，只需把它降级成 Todo 下方的“拔草”辅助区。
- `TaskTemplate` 相关新增、编辑、停用能力仍可直接复用，只需要把用户可见文案从“决策库 / 模板”迁移到“种草”。

### 本轮关键决策
- 在 `HomePage` 中移除模式切换与 `mode` 状态。
- 主页面固定改为：
  - 日期
  - Todo
  - 拔草
  - 种草
- Todo 作为第一主体常驻显示。
- 原推荐入口文案从“增加安排”调整为“拔草 / 从种草中添加”。
- 原底部“决策库”区域改为“种草”，但继续复用 `TaskTemplate`、模板表单和模板管理逻辑。
- `decision_selected`、推荐排序、自动生成规则全部保持不变，后续在 V2-4 再处理添加入口融合。

### 本轮修改
- 更新 `src/pages/home/HomePage.tsx`
  - 删除双模式切换
  - 让 Todo 常驻显示
  - 将原推荐面板迁移为 Todo 下方的“拔草”辅助区
  - 将原“决策库”区改名为“种草”
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 将 `decision_selected` 的用户可见标签从“已选”改为“拔草”
- 更新 `src/features/templates/CreateTaskTemplateForm.tsx`
  - 将新增、删除、保存等成功提示和加载文案改为“种草”口径
- 更新 `src/features/templates/TemplateManagerPanel.tsx`
  - 将模板管理相关用户文案改为“种草”口径
- 更新 `src/features/templates/TemplateFormFields.tsx`
  - 将 `活动类型 / 时间场景 / 模板内容` 等用户文案改为 `种草清单 / 有空就做 / 种草内容`
- 更新 `src/styles/globals.css`
  - 删除不再使用的双模式切换样式
  - 补充单页结构所需的最小分区标题样式
- 更新 `handoff.md`
  - 记录 V2-3 已完成
- 更新 `dev-log.md`
  - 记录本轮迁移判断、决策与验证结果

### 本轮刻意未做
- 未做 V2-4：Todo 添加入口融合
- 未新增“更多选项”展开
- 未改变临时事项数据结构
- 未改变 `decision_selected` 的底层语义
- 未改推荐排序
- 未改自动生成规则
- 未改数据模型
- 未改 schema
- 未引入新依赖

### 当前风险与待确认问题
- 当前主页面已经是 Todo + 种草 单页结构，但拔草入口仍是从 V1 决策面板最小迁移而来，交互还不够像最终的一体化 Todo 添加体验。
- 模板相关底层和部分代码命名仍然是 `template / activityType / sceneTag`，这符合本轮只改用户可见文案、不改数据模型的约束。
- 初始化页已切到 V2 语言，主页面也已切到 V2 结构，但设置页仍保留部分 V1 表达，后续可继续逐步收口。

### 验证结果
- `pnpm run build`：通过
  - 仍有 Vite 的 chunk size warning，但不影响构建成功
- `pnpm run lint`：通过

## 2026-04-25（V2-2 初始化页文案与默认项调整）

### 本轮目标
- 让初始化页率先切换到 V2 语言
- 保持现有 tag 式增删交互不变
- 同步首次初始化默认项
- 不改主页面、不改 Todo、不改推荐逻辑、不改数据模型

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`
- `README.md`

### 本轮关键判断
- 当前初始化页的交互机制已经足够轻量，问题主要在于对用户暴露的仍是 V1 的“活动类型 / 时间场景”语言。
- 用户这轮只要求初始化页率先切到 V2，因此应只改文案和默认 seed，不提前动主页面结构或推荐路径。
- 底层仍然沿用 `activityTypes` 与 `sceneTags`，因此这轮应保持字段与类型完全不变，只做展示层和默认值调整。

### 本轮关键决策
- 初始化页标题改为：
  - 哪怕你是一个100%的J人，想必也会有……
- `activityTypes` 在初始化页对用户表达为“种草清单”
- `sceneTags` 在初始化页对用户表达为“有空就做”
- 首次初始化默认项调整为：
  - 种草清单：阅读、观影、旅游
  - 有空就做：工作日晚上、周末、长假
- 保留当前 tag 交互：
  - 已有 tag：名称 + 删除
  - 新增 tag：`+` 后原位输入并保存
  - 至少保留一个
  - 输入非空才保存

### 本轮修改
- 更新 `src/pages/setup/SetupPage.tsx`
  - 将初始化页标题、说明文案、区块标题、校验提示和无障碍文案切换到 V2 语言
  - 保留现有 tag 式增删交互与布局结构
- 更新 `src/mocks/app-data.ts`
  - 调整首次初始化默认 `activityTypes`
  - 调整首次初始化默认 `sceneTags`
- 更新 `handoff.md`
  - 记录 V2-2 已完成
  - 明确初始化页已切到 V2 语言，主页面仍待 V2-3
- 更新 `dev-log.md`
  - 记录本轮决策与验证结果

### 本轮刻意未做
- 未改主页面
- 未改设置页
- 未改 Todo 区
- 未改种草 / 决策库区
- 未改推荐逻辑
- 未改自动生成逻辑
- 未改 `TaskTemplate`
- 未改 `AppData`
- 未改 schema
- 未引入新依赖

### 当前风险与待确认问题
- 初始化页已经切换到 V2 语言，但主页面与设置页仍保留 V1 口径，短期内存在“初始化心智已迁移、主流程尚未迁移”的阶段性割裂。
- 默认 `sceneTags` 改成“工作日晚上 / 周末 / 长假”后，当前 V1 中依赖内置“上午 / 晚上”名称的部分时段自动映射能力，在初始化完成前的默认数据上会变弱；这符合本轮只迁移初始化页的要求，但后续进入 V2-3/V2-4 时仍需整体评估。

### 验证结果
- `pnpm run build`：通过
  - 仍有 Vite 的 chunk size warning，但不影响构建成功
- `pnpm run lint`：通过

## 2026-04-25（V2 方向文档迁移与任务拆分重写）

### 本轮目标
- 基于 V1 试用反馈，完成 V2 方向说明
- 统一产品概念、页面结构与任务拆分文档
- 不改源码、不改数据模型、不改业务逻辑实现

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`
- `README.md`

### 本轮关键判断
- V1 的核心问题不是能力不够，而是产品中心放错了：把太多普通待办都逼进了“决策库”。
- 试用反馈说明，真正有价值的是把日常待办和“以后有空再做”的内容分开处理。
- 因此 V2 不应继续强化“决策模式 / Todo 模式”双模式，而应回到“Todo 为主体、种草为独立清单、拔草为增强能力”。
- 当前用户已明确要求本轮只做文档迁移，不进入代码实现，因此应先让概念、结构和任务拆分达成一致。

### 本轮关键决策
- 将 V2 产品本体统一表述为：
  - 普通 Todo List + 种草清单 + 有空时帮你拔草
- 明确概念迁移：
  - `决策库` → `种草清单`
  - `决策推荐` → `拔草推荐`
  - `活动类型` → 产品表达上更接近“种草分类”
  - `时间场景` → 产品表达上更接近“有空就做场景”
- 明确页面方向：
  - 主页面后续改为“头部 + 日期 + Todo + 种草”
  - 不再继续强化“决策模式 / Todo 模式”双模式结构
- `data-model.md` 本轮不改：
  - 用户已明确允许底层继续沿用 `activityTypes` 和 `sceneTags`
  - 当前仍处于概念迁移阶段，尚未进入数据结构重写
- `constraints.md` 本轮不改：
  - 当前产品边界没有发生本质变化
  - 仍然是单人、本地、轻量、不过度扩写

### 本轮修改
- 更新 `README.md`
  - 改为 V2 产品定位说明
  - 明确 V1 为已完成的可试用 MVP，当前进入 V2
- 更新 `product-rules.md`
  - 改写为当前有效的 V2 规则文档
  - 明确 Todo、种草、拔草的关系
- 更新 `app-structure.md`
  - 将页面结构改写为 V2 单页方向
  - 明确后续主页面为“头部 + 日期 + Todo + 种草”
- 更新 `task-list.md`
  - 重写为 V2-1 到 V2-6 的任务拆分
- 更新 `handoff.md`
  - 同步当前阶段、概念迁移、后续任务顺序和风险
- 更新 `dev-log.md`
  - 记录本轮判断、决策与未实现问题

### 本轮刻意未做
- 未改任何源码文件
- 未改 `data-model.md`
- 未改 `constraints.md`
- 未改任何 UI
- 未改业务逻辑
- 未引入新功能实现
- 未删除 V1 历史记录

### 当前风险与待确认问题
- 当前文档已经按 V2 口径重写，但实现仍是 V1 结构，短期内会存在“文档先行、实现滞后”的不一致。
- “新增事项默认是临时事项，但又可展开为更完整事项”的交互边界，当前只做了方向记录，后续还需要在实现前继续细化。
- `activityTypes` 与 `sceneTags` 是否最终足够支撑 V2 的单页融合流程，需要等实现阶段再验证。

### 验证结果
- 本轮未运行 `pnpm run build`
- 本轮未运行 `pnpm run lint`
- 原因：仅更新产品文档，不涉及源码与构建配置

## 2026-04-25（设置图标修正 + V1 第一版封板文档同步）

### 本轮目标
- 修正设置入口图标，避免与 Todo 临时事项中的太阳图标混淆
- 在说明文档中记录 V1 第一版 / 可试用 MVP 已完成状态
- 不改业务逻辑、不改数据模型、不调整其他 UI

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`

### 本轮关键判断
- 当前设置图标虽然是线条 icon，但仍然带有中心圆 + 八向短线的太阳感，容易和 Todo 临时事项里的太阳图标混淆。
- 这轮更适合只替换 `SettingsIcon` 图形本身，不改按钮尺寸、header 布局和 Todo 图标，避免为了一个视觉 bug 引入额外回归风险。
- 文档口径需要统一到“V1 第一版 / 可试用 MVP 已完成”，同时明确它仍不是正式稳定版产品。

### 本轮关键决策
- 将设置图标统一改为更明确的线条齿轮状 inline SVG，保留现有线宽、尺寸和按钮节奏。
- README、handoff、dev-log 统一同步：
  - V1 第一版主路径已完成
  - 当前已具备的能力
  - 当前仍保留的后续迭代项与技术债
  - 下一步转入试用反馈与后续迭代，而不是继续扩写 V1 主路径

### 本轮修改
- 更新 `src/components/ui/Icons.tsx`
  - 将 `SettingsIcon` 改为更明确的线条齿轮形
- 更新 `README.md`
  - 明确 V1 第一版 / 可试用 MVP 已完成
  - 同步当前已具备能力与仍未做项
- 更新 `handoff.md`
  - 明确当前状态为“V1 第一版已封板”
  - 下一步建议改为试用反馈与后续迭代
- 更新 `dev-log.md`
  - 记录本轮修正与验证结果

### 本轮刻意未做
- 未改业务逻辑
- 未改数据模型
- 未改推荐 / 自动生成 / Todo 完成 / 设置重置逻辑
- 未重构顶部栏
- 未调整 Todo 中的太阳 / 月亮图标
- 未引入新依赖

### 验证结果
- `pnpm run build`：通过
  - 仍有 Vite 的 chunk size warning，但不影响构建成功
- `pnpm run lint`：通过

### 当前风险与待确认问题
- 当前已完成 V1 第一版主路径，但仍缺自动化业务测试与更完整的真实试用反馈。
- 设置图标已和太阳图标拉开，但后续若再统一一整套 icon system，仍可继续微调各 icon 的视觉重心和描边节奏。

## 2026-04-24（初始化页 tag 化 + 顶部收口 + 默认 Todo）

### 本轮目标
- 将初始化页从后台式表单改为 tag 式配置
- 继续压缩主页面顶部、模板添加表单、Todo 临时事项入口
- 删除设置页中已重复的时间场景 / 活动类型管理区
- 将刷新后的默认模式改为 Todo
- 不改业务规则、不改数据模型、不改推荐 / 自动生成 / Todo 完成逻辑

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`

### 本轮关键判断
- 当前初始化页业务逻辑已经成立，问题主要是视觉结构太像后台表单，因此本轮只收口展示方式，不重写初始化数据流程。
- 活动类型与时间场景的全局新增 / 删除规则已经在主页面表单和存储层具备能力，所以设置页里继续保留同样的管理区会造成重复。
- 顶部设置入口已具备独立页面能力，本轮只需把 emoji 换成线条 icon，并把标题与设置入口拉回同一行。
- 刷新默认回到决策模式仅是 UI 默认值问题，本轮不需要做模式持久化。

### 本轮关键决策
- 初始化页改为单卡片内两组 tag 配置：
  - 已有项显示为 `名称 | ×`
  - 新增项使用原位输入 + 保存图标
  - 保留“至少保留一个”的既有规则
- 提取一组轻量 SVG 线条 icon，统一用于设置、保存、关闭、加号、太阳、月亮，不引入新依赖。
- 模板添加表单里的活动类型 / 时间场景改为与初始化页同款 tag 交互，同时复用现有全局删除规则。
- Todo 临时事项入口改为太阳 / 月亮 segmented control，保留原有 `manual_temporary` 创建语义。
- 设置页只保留返回主页、排序设置和测试重置，删除重复的统计色块与分类管理区。
- 首页默认模式从 `decision` 调整为 `todo`，不增加 localStorage 记忆。

### 本轮修改
- 新增 `src/components/ui/Icons.tsx`
  - 提供线条风格 `SettingsIcon`、`CheckIcon`、`CloseIcon`、`PlusIcon`、`SunIcon`、`MoonIcon`
- 更新 `src/pages/setup/SetupPage.tsx`
  - 删除顶部统计色块
  - 改为 tag 式时间场景 / 活动类型配置
  - 完成初始化区改为左侧说明 + 右侧 `→` 按钮
- 更新 `src/app/shell/AppShell.tsx`
  - 顶部设置入口改为线条 icon
- 更新 `src/features/templates/TemplateFormFields.tsx`
  - 兴趣程度改为与 `1 / 2 / 3` 同行
  - 活动类型 / 时间场景改为 tag 式选择 + 删除 + 原位新增
- 更新 `src/features/templates/CreateTaskTemplateForm.tsx`
  - 接入模板表单内的时间场景删除与活动类型删除
  - 删除活动类型时增加表单有效性兜底
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 临时事项时段选择改为太阳 / 月亮 segmented control
  - “添加”按钮收口为 `+`
- 更新 `src/pages/home/HomePage.tsx`
  - 默认模式改为 `todo`
- 更新 `src/features/settings/SettingsPanel.tsx`
  - 删除统计色块、时间场景 section、活动类型 section
  - 保留返回主页、排序设置、测试工具 / 重置应用
- 更新 `src/styles/globals.css`
  - 收口初始化页 tag、顶部 header、模板表单高度、Todo 临时入口 segmented 样式
  - 保持移动端两列并排与统一控件高度
- 更新 `handoff.md`
  - 同步当前最新收口状态与下一步建议

### 本轮刻意未做
- 未改 `product-rules.md`
- 未改数据模型
- 未改推荐逻辑
- 未改自动生成逻辑
- 未改 Todo 完成 / 分次推进逻辑
- 未做导出 / 导入 / 搜索
- 未重做整体视觉系统
- 未引入新依赖

### 验证结果
- `pnpm run build`：通过
  - 仍有 Vite 的 chunk size warning，但不影响构建成功
- `pnpm run lint`：通过

### 当前风险与待确认问题
- 模板表单内现在已经具备全局 tag 删除能力，但这类全局修改发生在录入上下文中，后续仍可继续评估是否需要更强提示文案。
- 初始化页与模板页的 tag 交互已统一，但按钮密度和输入宽度仍有继续微调空间。
- 当前仍无自动化业务测试，回归依然主要依赖构建与静态检查。

## 2026-04-21（设置页 + 测试专用重置）

### 本轮目标
- 补齐 V1 第一版设置入口与设置页
- 实现时间场景管理、活动类型管理、`tieBreakerOrder` 设置
- 提供“重置应用（测试用）”入口，清空当前本地数据并重新进入初始化流程
- 不扩写导出 / 搜索 / 归档恢复 / 推荐重构等其他能力

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`

### 本轮关键判断
- 这轮更适合做成一个独立但很轻的 `/settings` 页面，而不是首页内展开面板：
  - 用户明确希望设置入口出现在顶部 `J-Flow` 旁边
  - `app-structure.md` 允许“设置页 / 设置弹窗”
  - 新增一个受初始化守卫保护的页面即可满足要求，不会引入复杂路由体系
- 现有推荐逻辑已经读取 `AppSettings.tieBreakerOrder`，因此本轮只需补设置 UI 与存储写入
- 存储层已有 `resetAppData(mockSeedAppData)`，它正好等价于“回到第一次打开应用”的状态，因此测试重置优先复用现有能力

### 本轮关键决策
- 在 `AppShell` 的 `J-Flow` 旁边新增轻量设置图标入口，进入 `/settings`
- 设置页按四块组织：
  - 时间场景
  - 活动类型
  - 排序设置
  - 测试工具
- 时间场景删除逻辑下沉到存储层辅助接口：
  - 删除 tag 本身
  - 从所有模板的 `sceneTagIds` 中移除该 tag
  - 不触碰模板本身与历史实例
- 活动类型删除逻辑下沉到存储层辅助接口：
  - 若任一 `TaskTemplate` 仍引用该类型，则直接阻止删除
- `tieBreakerOrder` 通过 `settings.update` 写回 `AppSettings`
- 测试重置直接调用 `appDataRepository.reset()` 回到 `mockSeedAppData`，随后导航回 `/setup`

### 本轮修改
- 更新 `src/db/storage.ts`
  - 新增 `settings.update`
  - 新增 `sceneTags.deleteAndDetachTemplates`
  - 新增 `activityTypes.deleteIfUnused`
- 新增 `src/features/settings/SettingsPanel.tsx`
  - 实现设置页主体与四个模块
- 更新 `src/features/settings/index.ts`
  - 导出设置组件
- 新增 `src/pages/settings/SettingsPage.tsx`
  - 提供轻量页面包装
- 更新 `src/app/router.tsx`
  - 新增 `/settings` 路由，并沿用 `RequireInitialized`
- 更新 `src/app/shell/AppShell.tsx`
  - 在 `J-Flow` 旁边添加设置图标入口
- 更新 `src/styles/globals.css`
  - 补充设置入口、设置页、测试危险操作按钮等样式
- 更新 `handoff.md`
  - 同步本轮最近完成 task、下一步建议与当前边界

### 本轮刻意未做
- 未改 `product-rules.md`
- 未做导出 / 导入
- 未做搜索
- 未做已归档模板恢复
- 未改推荐逻辑本身
- 未改 Todo / 决策模式
- 未引入新依赖

### 验证结果
- `npm run build`：通过
  - 仍有 Vite 的 chunk size warning，但不影响构建成功
- `npm run lint`：通过

### 当前风险与待确认问题
- 当前设置页提供的是新增 / 删除与排序设置，没有提供“重命名已有时间场景 / 活动类型”；这不在本轮目标内
- 活动类型“被使用时不可删除”当前按所有 `TaskTemplate` 判断，包含已归档模板；这更保守，也更符合“仍有模板在使用”的规则口径
- 测试重置入口已经清空全部本地数据并回到未初始化状态，但它仍是测试工具，不代表最终正式产品入口形态

## 2026-04-21（决策 / Todo 双层结构拆除）

### 本轮目标
- 将决策模式和 Todo 模式从“section-first + inner card”改为“list-first + item-first”
- 只做层级重构，不新增功能，不改业务规则
- 保留白天 / 晚上分组语义，但让分组退回轻量辅助层

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`

### 本轮关键判断
- 当前页面“不像 todo list / plan list”的核心原因不是配色，而是：
  - 决策模式由 `.time-context` 承担外层大卡片视觉，`item-card` 被压成内层小卡片
  - Todo 模式由 `.todo-board__section` 承担外层大卡片视觉，`todo-item-card` 被压成内层小卡片
- 这与主文档中的既有口径一致性不足：
  - `app-structure.md` 已明确决策模式应为单列排程列表
  - `product-rules.md` 已明确颜色属于排程条目本身，而不是时段容器
- 因此本轮重点是“拆层级”，而不是简单调淡 section 背景

### 本轮关键决策
- 保留白天 / 晚上两个分组，但将其统一收敛为轻量 `list-group`
- 决策模式中的“添加安排”继续留在对应分组 header，但 header 只作为标签和操作入口，不再表现为大卡片标题区
- Todo 模式中的 `temporary-composer` 保留独立输入区，其下事项区改为连续单列列表
- 白天 / 晚上色彩重心明确挂回 `.item-card--day|night` 与 `.todo-item-card--day|night`
- 推荐面板与分次推进、完成、删除、临时事项等逻辑全部不改，仅改变它们所在的层级氛围

### 本轮修改
- 更新 `src/pages/home/HomePage.tsx`
  - 为决策模式分组补充轻量标签文本
  - 将原 `time-context` 强容器结构改为 `list-group`
  - 保留原自动事项、已选事项、推荐面板和“添加安排”入口，但把它们放回单列列表语境
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 将原 `.todo-board__section` 改为轻量 `list-group`
  - 保留临时事项输入区独立存在
  - 保留白天 / 晚上分组与所有现有完成、推进、删除、备注逻辑
- 更新 `src/styles/globals.css`
  - 去除 `.time-context` / `.todo-board__section` 的强背景主导地位
  - 新增 `list-group`、轻量 header 和 divider 样式
  - 将条目背景、边框、阴影和 day/night 区分集中到 `.item-card` / `.todo-item-card`
  - 保持 warm cream / oat border / light mode / 紧凑移动端节奏
- 更新 `handoff.md`
  - 同步最近完成 task、下一步建议与当前 UI 状态

### 本轮刻意未做
- 未改推荐逻辑
- 未改完成逻辑
- 未改分次推进逻辑
- 未改模板区
- 未改数据模型与任何业务字段语义
- 未调整 appbar、顶部日期区或决策库入口
- 未引入新依赖

### 验证结果
- `npm run build`：通过
- `npm run lint`：通过

### 当前风险与待确认问题
- 当前已实现 list-first 层级，但推荐面板和临时输入区仍然保留卡片感，后续若继续压层级，可再评估它们是否还要进一步变轻
- `item-card` / `todo-item-card` 现在成为主视觉主体，但若后续继续追求更强“列表感”，还可以进一步微调条目间距、tag 密度和操作区尺寸
- 当前仍无自动化业务测试，回归主要依赖构建和静态类型校验

## 2026-04-21（文档对齐 + 模板添加表单返工）

### 本轮目标
- 对齐顶层文档与当前项目进度
- 只修正模板添加表单的 UI / 交互问题
- 不扩写业务逻辑，不改产品规则，不触碰自动生成、推荐、Todo、实例层语义

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`
- `README.md`

### 文档检查结论
- `README.md` 存在与当前实现不一致的描述，需要同步：
  - 仍将决策模式描述为四个时间区块，而当前主路径已是单列白天 / 晚上语境
  - 未反映模板日期仅在“必要事项或重复条目”时显示的新口径
  - 未反映模板添加区已从旧三段 section 收敛为单区块
  - 未明确当前已完成主路径与仍未完成能力
- `constraints.md` 本轮未改：
  - 文档内容与 `product-rules.md`、当前实现边界无直接冲突
  - 本轮没有新增约束，只是同步进度与现状，修改它会造成无必要扰动
- 本轮未发现需要按 `product-rules.md` 处理的新规则冲突

### 本轮关键决策
- 继续复用 `TaskTemplateFormFields` 作为创建 / 编辑共用表单，只调整字段顺序与交互，不改数据写入语义
- inline creator 保留 Enter 提交作为辅助，同时新增原位“保存 / 取消”轻量动作，避免移动端只能依赖键盘提交
- 手机端不再把 `.template-form__row--inline` 强制打成单列，改为继续保留两列并排
- 控件高度统一优先通过 CSS 收口：`min-height`、`padding`、`line-height`、`border-radius` 与 segmented control 尺寸统一

### 本轮修改
- 更新 `README.md`
  - 同步当前决策模式为单列白天 / 晚上语境
  - 同步模板日期条件显隐口径
  - 同步模板添加区已收敛为单区块
  - 补充当前已完成主路径与尚未完成能力
- 更新 `src/features/templates/TemplateFormFields.tsx`
  - 将字段顺序调整为：
    1. 活动类型
    2. 模板内容
    3. 时间场景
    4. 兴趣程度
    5. 必要事项 + 重复规则
    6. 条件日期
    7. 需要准备 + 分次事项
    8. 条件备注
  - 为活动类型 / 时间场景 inline creator 新增明确可点击的“保存”动作
  - 额外补充轻量“取消”动作
  - 保存成功后仍沿用现有 create 语义，由父层将新活动类型自动选中、将新时间场景自动加入当前选中项
- 更新 `src/styles/globals.css`
  - 保留手机端两组双列并排
  - 统一兴趣程度、必要事项、重复规则、需要准备、分次事项的视觉高度
  - 收紧 creator tag、segmented control、select、toggle chip 的尺寸节奏
- 更新 `handoff.md`
  - 同步本轮最近完成 task、下一步建议与当前边界

### 本轮刻意未做
- 未修改 `constraints.md`
- 未改 `product-rules.md`
- 未改自动生成、推荐、Todo、实例层逻辑
- 未扩写设置页、拖动排序、测试任务
- 未引入新依赖

### 验证结果
- `npm run build`：通过
- `npm run lint`：通过

### 当前风险与待确认问题
- 本轮主要修正的是模板添加表单；模板管理编辑态虽然复用了同一表单顺序与控件样式，但并未额外做展开态压缩优化
- inline creator 已补足移动端点击保存链路，但若后续继续追求极致紧凑，仍可再评估按钮文案/宽度与错误提示位置
- 当前仍无自动化业务测试，回归仍以构建和静态类型校验为主

## 2026-04-17

### 本轮目标
- 阅读项目说明文档，整理实现约束与实施计划
- 当前阶段不编写业务代码
- 建立持续维护的开发日志文件

### 已阅读文件
- `README.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `AGENTS.md`

### 已确认的高优先级规则
- 开发前必须先阅读：`product-rules.md`、`app-structure.md`、`data-model.md`、`constraints.md`、`task-list.md`、`design-guidelines.md`、`dev-log.md`
- 规则优先级以 `product-rules.md` 为最高，其次是 `constraints.md`
- 若文档冲突，需要在本文件记录冲突与处理建议
- 不得擅自补充产品规则；遇到规则空白时，先提出问题，等待确认
- 每次关键修改后，必须更新本文件
- 当前阶段不要执行 `git commit` 或 `git push`

### 当前共识
- V1 是单人、本地网页应用
- 不做后端、登录、同步、天气 API、提醒、智能推荐增强
- 数据必须严格区分模板层与实例层
- 临时事项不能回写决策库状态
- 重复任务必须有周期实例层
- 分次任务采用自由进度推进，不预设总次数

### 实施前建议
- 后续每次开始新任务前，先阅读 `AGENTS.md` 和本文件，再进入对应任务
- 中大型任务先输出计划，等待确认后再进入代码实现

### 当前识别到的风险与待确认问题
- 暂无已确认之外的新增规则空白；后续实现中若再发现空白，需要先提出问题，再继续开发

### 本轮新增规则确认
- 同一模板在同一天的同一时间区块内，不允许重复选入
- 同一模板在同一天的不同时间区块内，允许重复选入
- 若模板当天已在其他时间区块出现，则该模板不作为默认推荐项，且在推荐列表中排到最末，但仍允许用户继续加入
- V1 需要支持数值型进度字段，命名可采用 `progressPercent`
- `progressPercent` 保存在实例层，不保存在模板层
- `progressPercent` 取值范围为 `0-100`
- 对于分次任务，`0-99` 表示继续中，`100` 表示该实例整体完成
- 必要事项不是每天自动出现，只有在该日期被日期规则触发时才出现
- 日期规则负责判断“今天该不该出现”
- 必要属性负责判断“出现后是否自动进入当天计划且不参与推荐竞争”
- 决策推荐的 `sceneTagIds` 由系统自动推导，V1 不需要用户手动额外选择
- V1 的 `sceneTagIds` 只从“日期 + 时间区块”推导，例如周中、周末、上午、下午、晚上
- 天气相关 tag 在 V1 不自动推导，也不参与实际命中

### 需要同步到实现方案的数据口径
- `DayPlanItem` 或等价实例模型需要补充 `progressPercent: number`
- 推荐逻辑需要额外考虑“当天已出现在其他时间区块”的模板降权到候选列表末尾
- 推荐逻辑需要阻止“同模板在同日同时间区块”重复加入
- 场景推导层需要独立封装，输入为 `date + timeBlock`，输出为自动推导出的 `sceneTagIds`

### 本轮产出
- 新增 `dev-log.md`
- 输出实施计划前的约束整理完成
- 补充并记录了 4 条关键产品规则确认

## 2026-04-17（规则回写）

### 本轮目标
- 将已确认规则同步回主文档，避免 `dev-log.md` 与规则文档分叉

### 本轮修改
- 更新 `product-rules.md`，补充：
  - 同日重复选入规则
  - 分次任务百分比进度规则
  - 必要事项“按日期触发后自动出现”的定义
  - `sceneTagIds` 的自动推导规则
- 更新 `app-structure.md`，补充：
  - 决策模式中场景由系统自动推导的交互说明
  - 已在其他时间区块出现的候选项排序规则
  - 同时间区块禁止重复加入规则
  - Todo 模式中的百分比进度展示要求
- 更新 `data-model.md`，补充：
  - `RecurringTaskInstance.progressPercent`
  - `DayPlanItem.progressPercent`
  - 百分比进度只保存在实例层的数据口径
  - 同日同时间区块内不得重复生成同模板实例的数据约束
- 更新 `task-list.md`，补充：
  - Task 9 的必要事项触发条件
  - Task 10 的自动场景推导与候选降级规则
  - Task 11 的重复选入边界
  - Task 14 的 `progressPercent` 要求

### 当前结论
- 后续实现可优先以主文档为准，`dev-log.md` 继续作为过程记录与风险记录使用

### 当前风险与待确认问题
- 暂无新增规则空白

## 2026-04-17（Task 1：项目底座）

### 本轮目标
- 执行 Task 1，仅完成前端项目初始化与基础目录结构搭建
- 不实现业务功能

### 开始前已阅读
- `AGENTS.md`
- `dev-log.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`

### 本轮关键决策
- 前端底座采用 `React + TypeScript + Vite`
- 路由采用 `React Router`
- 本地 UI 状态预留 `Zustand`
- 本地存储访问层预留 `Dexie`
- 数据校验预留 `Zod`
- 当前阶段先使用原生 CSS + 设计变量完成视觉底座，不额外引入更重的样式方案
- 目录按“应用入口 / 页面 / 领域功能 / 存储 / 状态 / 类型 / 样式”拆分，优先保证后续 Task 2-15 可平滑落位

### 本轮修改
- 新增前端工程基础文件：
  - `.gitignore`
  - `package.json`
  - `tsconfig.json`
  - `tsconfig.app.json`
  - `tsconfig.node.json`
  - `vite.config.ts`
  - `index.html`
- 新增应用入口与路由骨架：
  - `src/main.tsx`
  - `src/app/router.tsx`
  - `src/app/shell/AppShell.tsx`
- 新增页面占位：
  - `src/pages/home/HomePage.tsx`
  - `src/pages/setup/SetupPage.tsx`
- 新增通用 UI 与基础模块占位：
  - `src/components/ui/SurfaceCard.tsx`
  - `src/store/ui-store.ts`
  - `src/db/client.ts`
  - `src/lib/env.ts`
  - `src/features/*/index.ts`
  - `src/types/index.ts`
  - `src/mocks/index.ts`
  - `src/tests/setup.ts`
  - `src/vite-env.d.ts`
  - `src/styles/globals.css`
- 更新 `README.md`，补充技术栈、目录结构和启动说明

### 验证情况
- 已完成静态检查式自检：
  - 核对目录结构与入口文件
  - 核对路由骨架是否建立
  - 核对 Vite/Vitest 配置是否一致
- 未完成实际运行验证
  - 当前环境未发现 `node`、`npm`、`pnpm`、`yarn`、`bun`
  - 因此本轮无法安装依赖，也无法执行 `vite` / `tsc` / `vitest`

### 当前风险与待确认问题
- 当前项目文件已具备前端工程骨架，但仍需在具备 Node 环境后完成依赖安装与首次启动验证
- 若下一轮开始前环境仍缺少 Node，则 Task 2 可继续推进类型与存储设计文件，但无法做真实编译校验

## 2026-04-17（Task 1：真实运行校验）

### 本轮目标
- 对 Task 1 的前端底座进行真实运行校验

### 开始前已阅读
- `AGENTS.md`
- `dev-log.md`

### 本轮过程
- 重新确认本地存在 `node` 与 `npm`
- 尝试执行依赖安装与构建/测试校验
- 发现沙箱内访问 npm registry 时会报 `ENOTFOUND`
- 为避免引入不必要的新依赖，调整了底座配置：
  - 将 `vite.config.ts` 中的别名改为不依赖 Node 类型声明的写法
  - 将 Vitest 环境改为 `node`
  - 保留 `passWithNoTests: true`，使当前“无测试文件”的底座状态可被正常校验
- 移除了安装过程中意外生成的 `pnpm` 文件

### 本轮修改
- 更新 `vite.config.ts`
- 更新 `package.json`
- 更新 `tsconfig.node.json`
- 删除 `pnpm-lock.yaml`
- 删除 `pnpm-workspace.yaml`

### 验证结果
- `npm run build`：通过
- `npm run test -- --run`：通过
  - 当前无测试文件，Vitest 按预期以 `code 0` 退出

### 当前结论
- Task 1 的前端项目底座现已完成真实可运行校验

### 当前风险与待确认问题
- 当前测试通过仅表示测试基础设施可运行，不代表已有业务测试覆盖

## 2026-04-17（Task 2：核心数据模型）

### 本轮目标
- 只实现核心数据模型与 mock 数据
- 不实现本地存储层
- 不实现业务逻辑
- 不改动页面功能

### 开始前已阅读
- `AGENTS.md`
- `dev-log.md`
- `product-rules.md`
- `data-model.md`
- `task-list.md`

### 本轮关键决策
- 将领域模型集中放在 `src/types/models.ts`，避免后续模板层、实例层、设置层类型分散
- 同时保留 `AppSettings`、`AppData`、`RecommendationInput`、`RecommendationResult`，因为 Task 3/4 会直接依赖完整容器结构
- 用 `ProgressPercent = number` 加常量边界值表达 `0-100` 口径，先明确数据边界，不在本轮提前引入运行时校验逻辑
- 用 `DayPlanItemUniquenessKey` 和 `DAY_PLAN_ITEM_DUPLICATE_SCOPE` 表达“同日同时间区块内同模板不可重复”的数据约束范围
- mock 数据拆成两份：
  - `mockSeedAppData`：初始化前默认数据
  - `mockAppData`：初始化后、包含模板/周期实例/当日事项的最小示例数据

### 本轮修改
- 新增 `src/types/models.ts`
- 更新 `src/types/index.ts`
- 新增 `src/mocks/app-data.ts`
- 更新 `src/mocks/index.ts`

### 验证结果
- `npm run build`：通过

### 当前结论
- Task 2 所需的核心类型定义、实例层进度口径和最小 mock 数据已落地
- 后续 Task 3 可直接基于 `AppData` 和 mock 数据实现本地存储初始化

### 当前风险与待确认问题
- `progressPercent` 的 `0-100` 范围目前只在类型语义和常量层表达，尚未有运行时校验；这需要在 Task 3 或后续表单/存储写入层落实
- `dateKey` 的 daily / weekly / monthly / yearly 格式当前仍是字符串约定，尚未有格式化与校验工具
- “同一模板在同一天的同一时间区块内不能重复生成实例”目前只做了数据约束表达，真正的去重拦截要在 Task 3/11 的写入逻辑中实现
- 当前 mock 数据是最小可用样本，尚未覆盖删除状态、过期周期实例、归档模板等边界数据

## 2026-04-17（Task 2：补充边界 mock）

### 本轮目标
- 补充 Task 2 mock 数据中的边界样本

### 开始前已阅读
- `AGENTS.md`
- `dev-log.md`

### 本轮修改
- 更新 `src/mocks/app-data.ts`
- 新增一个 `status: 'expired'` 的 `RecurringTaskInstance`

## 2026-04-19（录入表单：现场新增场景与类型）

### 本轮目标
- 只补齐决策库条目录入表单里的“现场新增时间场景 / 活动类型”
- 不改动自动生成、推荐、Todo、模板管理逻辑

### 开始前已阅读
- `AGENTS.md`
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`

### 本轮关键决策
- 只在现有录入表单内增加轻量内嵌输入，不扩展成管理页或复杂弹窗
- 直接复用现有 `appDataRepository.sceneTags.create` 与 `appDataRepository.activityTypes.create`
- 新增成功后立即回填当前表单：
  - 新时间场景自动加入当前多选
  - 新活动类型自动设为当前单选值
- 校验保持轻量，只校验名称非空

### 本轮修改
- 更新 `src/features/templates/CreateTaskTemplateForm.tsx`
- 更新 `src/features/templates/TemplateFormFields.tsx`
- 更新 `src/styles/globals.css`

### 验证结果
- `pnpm run build`：通过
- `pnpm run lint`：通过

### 当前结论
- 录入时已支持现场新增时间场景和活动类型
- 新增项会立即进入当前表单可选项，并可直接用于本次模板提交

### 当前风险与待确认问题
- 当前未额外加入名称去重策略，仍保持轻量录入口径

## 2026-04-18（GitHub Pages 部署配置）

### 本轮目标
- 将当前 `Vite + React` 项目适配为可部署到 GitHub Pages
- 只做部署相关最小改动，不改动业务逻辑

### 开始前已阅读
- `AGENTS.md`
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`

### 本轮关键决策
- 将 CI 与本地包管理器统一为 `pnpm`
- 按仓库名 `J-Flow` 配置 Vite `base` 为 `/J-Flow/`，适配 GitHub Pages 仓库路径部署
- 使用 GitHub 官方 Pages Actions 流程：
  - `actions/configure-pages`
  - `actions/upload-pages-artifact`
  - `actions/deploy-pages`
- 保持默认 Vite 构建产物目录 `dist/`

### 本轮修改
- 更新 `package.json`
- 新增 `pnpm-lock.yaml`
- 更新 `vite.config.ts`
- 新增 `.github/workflows/deploy.yml`
- 更新 `README.md`
- 更新 GitHub Actions workflow 中的 action 版本与 `pnpm` 安装顺序
- 更新 `src/app/router.tsx`，让 React Router 使用与 Vite 一致的 `basename`
- 更新 `index.html`
- 新增 `public/404.html`，为 GitHub Pages 项目路径部署补充 SPA fallback

### 验证结果
- `pnpm run build`：通过
- `pnpm run lint`：通过

### 当前结论
- 项目部署配置已对齐 GitHub Pages 项目路径部署要求
- 部署工作流会在 `main` 分支 push 后自动构建并发布
- 已补齐 `pnpm-lock.yaml`，避免 `npm ci` 因缺少 lockfile 导致 Pages workflow 失败
- 已将 workflow 调整为先安装 `pnpm` 再进行 Node 缓存与依赖安装，并升级到 Node 24 runtime 兼容的 action 版本
- 已修正 GitHub Pages 下 BrowserRouter 未识别仓库前缀导致的应用内 404 问题，并补齐子路径刷新兜底

### 当前风险与待确认问题
- GitHub 仓库网页仍需手动将 Pages Source 切换为 `GitHub Actions`
- workflow 当前监听 `main`；若仓库默认分支不是 `main`，需要同步调整

## 2026-04-17（规则澄清：recurrence 仅支持日历型）

### 本轮目标
- 同步 V1 recurrence 语义边界
- 明确当前只支持日历型重复，不支持间隔型重复

### 开始前已阅读
- `AGENTS.md`
- `dev-log.md`
- `product-rules.md`
- `data-model.md`
- `constraints.md`

### 本轮修改
- 更新 `product-rules.md`
  - 明确 V1 当前支持的 recurrence 只有 `none / daily / weekly / monthly / yearly`
  - 明确 `daily / weekly / monthly / yearly` 都属于日历型重复
  - 明确补做、延后做、提前做不会改变未来锚点
  - 明确“每隔 x 天 / 每隔 x 周 / 每隔 x 月”不属于 V1
- 更新 `data-model.md`
  - 明确 `TaskTemplate.recurrence` 当前是日历型重复语义
  - 明确 `RecurringTaskInstance.dateKey` 服务于日历型周期，而非间隔型周期
  - 明确未来若支持 interval-based recurrence，应扩展为另一套 recurrence 结构
- 更新 `constraints.md`
  - 明确 V1 不做间隔型重复

### 当前结论
- 后续 Task 3 / Task 9 落地 recurrence 相关逻辑时，必须按日历型重复实现
- 不能把“补做导致下次触发顺延”写进当前 `daily / weekly / monthly / yearly` 语义

### 验证情况
- `npm run build`：通过

### 当前风险与待确认问题
- 当前无新增规则空白
- 新增一个 `isArchived: true` 的 `TaskTemplate`
- 新增一个与库条目标题重复、但 `source = manual_temporary` 的临时事项样本

### 验证结果
- `npm run build`：通过

### 当前结论
- 当前 mock 数据已覆盖：
  - 正常模板
  - 已归档模板
  - 周期中实例
  - 已完成实例
  - 已过期实例
  - 正常临时事项
  - 与库条目文字重复但不回写模板状态的临时事项

## 2026-04-17（重复任务自动入计划规则变更）

### 本轮目标
- 同步新的重复任务自动入计划规则到主文档与 mock 数据
- 暂停后续 task，先完成规则对齐

### 新确认规则
- 按日期规则被触发的重复任务，都应自动进入当天计划
- 该规则不区分是否必要
- 必要属性不决定是否自动进入当天计划，只决定展示身份与推荐逻辑
- 一次性非重复任务仍不自动进入当天计划

### 本轮修改
- 更新 `product-rules.md`
- 更新 `app-structure.md`
- 更新 `data-model.md`
- 更新 `task-list.md`
- 更新 `src/mocks/app-data.ts`

### 本轮调整内容
- 将“自动进入当天计划”的主体从“必要事项/重复事项”收敛为“按日期触发的重复任务”
- 明确必要属性只影响展示身份与推荐竞争，不影响是否自动生成当天实例
- 在 mock 数据中为 `template-study-english` 补了对应的 `auto_generated` 当日事项
- 将该模板对应的周期实例改为当日已生成但未完成，更贴合当前规则语义

### 验证结果
- `npm run build`：通过

### 当前影响范围
- 后续至少会影响 Task 3、Task 9、Task 10、Task 12

### 当前风险与待确认问题
- 当前规则已明确“重复任务自动入当天计划”，但 `auto_generated` 实例具体应默认落入哪个 `timeBlock`，仍需在实现时按产品口径统一
- 你在本轮文字确认中第 3 条出现了“必要的重复任务和非重复任务自动进入当天计划”与第 4 条“一次性非重复任务仍不自动进入当天计划”的潜在冲突；当前主文档已按“只有按日期触发的重复任务自动进入当天计划”同步，后续若要让“必要的一次性非重复任务”也自动进入，还需要再次明确

## 2026-04-17（自动入计划规则澄清）

### 本轮目标
- 将“自动进入当天计划”的最终口径同步回主文档与 mock 数据

### 新确认规则
- 自动进入当天计划的事项包括：
  - 所有必要事项（无论是否重复）
  - 所有按日期规则触发的非必要重复事项
- 非必要且不重复的事项不自动进入当天计划，仍通过决策模式选入或手动添加

### 本轮修改
- 更新 `product-rules.md`
- 更新 `app-structure.md`
- 更新 `data-model.md`
- 更新 `task-list.md`
- 更新 `src/mocks/app-data.ts`

### 本轮调整内容
- 将“自动进入当天计划”的主体修正为“所有必要事项 + 按日期触发的非必要重复事项”
- 在 mock 数据中新增一个“必要但不重复，仍自动进入当天计划”的样本：`template-pay-rent`

### 验证结果
- `npm run build`：通过

### 当前风险与待确认问题
- `auto_generated` 实例默认进入哪个白天/晚上语境，仍需在实现阶段统一策略

## 2026-04-17（时间结构与日期规则大改）

### 本轮目标
- 先同步新的时间结构与日期规则到主文档、类型定义与 mock 数据
- 暂不推进后续实现

### 新确认规则
- 一天不再分四段，改为只区分“白天 / 晚上”
- 条目时段归属按“明确白天 / 默认白天 / 明确晚上”判断
- 自动排序顺序为：明确白天 -> 默认白天 -> 明确晚上
- 条目颜色属于条目本身，而不是容器
- 默认归白天的条目若被拖到明确晚间条目之后，应进入晚间语境
- 每个条目都必须有日期字段，默认值为添加当天
- 重复规则以条目日期为锚点
- 自动进入当天计划的事项包括：
  - 所有必要事项
  - 所有命中当天日期规则的重复事项
  - 命中当天日期的非必要一次性条目
- 非必要、不重复、且未命中当天日期的事项不自动进入当天计划

### 本轮修改
- 更新 `product-rules.md`
- 更新 `app-structure.md`
- 更新 `data-model.md`
- 更新 `task-list.md`
- 更新 `src/types/models.ts`
- 更新 `src/mocks/app-data.ts`

### 本轮调整内容
- 将 `timeBlock` 口径改为 `day / night`
- 为 `DayPlanItem` 补充 `timeBlockSource` 与 `sortOrder`
- 为 `TaskTemplate` 补充 `date`
- 调整 mock 数据中的条目日期、时段语境与排序样本
- 新增“必要但不重复且命中当天日期”的自动入计划样本

### 验证结果
- `npm run build`：通过

### 当前风险与待确认问题
- “命中当天日期规则的重复事项”在 `daily` 规则下是否表示“从锚点日起每天都生效”，当前语义基本可推断，但仍未在主文档中明确写死
- 默认归白天的条目被拖入晚间后，若用户再次拖回白天区域，是否恢复为默认白天语境，当前尚未明确

## 2026-04-17（补充规则确认）

### 本轮目标
- 将 4 条补充确认规则同步到主文档与开发日志

### 新确认规则
- V1 不对用户自定义时间场景做自动语义判断
- 只有少数系统内置标签参与白天/晚上映射：
  - 白天：上午、下午、白天
  - 晚上：晚上、夜间
- 其他标签（包括用户自定义标签）不参与映射，默认归为 `default_day`
- `daily` 表示从锚点日期开始每天都生效
- `default_day` 只是自动排序时的初始归属；一旦用户手动调整位置，当前语境以当前位置为准
- 默认白天条目被拖到晚间后按夜间样式展示；再拖回白天后恢复白天样式
- 允许用户将未来日期的一次性非必要条目提前手动选入更早的一天
- 若该条目被提前完成，则该条目完成归档，并取消原目标日期的自动出现

### 本轮修改
- 更新 `product-rules.md`
- 更新 `app-structure.md`
- 更新 `data-model.md`
- 更新 `task-list.md`
- 更新 `dev-log.md`

### 当前风险与待确认问题
- 当前关于“提前完成后该条目完成归档”的归档语义已经明确为产品规则，但具体落在模板层、实例层还是两者联动，仍需在实现阶段细化

## 2026-04-17（提前完成不等于模板归档）

### 本轮目标
- 澄清“未来日期的一次性非必要条目被提前完成”与模板归档的关系

### 新确认规则
- 对于非必要、一次性、指定了未来日期的条目，如果用户提前手动选入并完成，则：
  - 该条目的本次计划视为已完成
  - 取消其原目标日期的自动出现
  - 这不等同于将 `TaskTemplate.isArchived` 设为 `true`
- `TaskTemplate.isArchived` 仅表示用户主动停用该模板，不再参与决策与自动生成
- “提前完成后不再在原目标日期自动出现”表达的是该条目本次触发已被消费，不是整个模板被归档

### 本轮修改
- 更新 `product-rules.md`
- 更新 `data-model.md`
- 更新 `dev-log.md`

### 当前结论
- 当前不要把“提前完成”实现为模板归档

### 当前风险与待确认问题
- 当前采用“实例层承载消费语义”的轻量方案方向
- 推荐在 `DayPlanItem` 增加 `targetDate` 与 `consumesDateTrigger`
- 当前不建议为 V1 单独引入完整的 occurrence / trigger 记录表

## 2026-04-17（消费语义统一写入口径）

### 本轮目标
- 将 `consumesDateTrigger` 的统一写入策略固定到主文档与开发日志

### 新确认规则
- `consumesDateTrigger` 不只用于“提前完成”场景
- 只要某条 `DayPlanItem` 在完成后会抵消模板于 `targetDate` 这一天的自动触发机会，就写入 `consumesDateTrigger = true`
- 这包括：
  - 当天正常自动触发并完成
  - 提前手动完成未来 `targetDate` 的事项
- 临时事项或不抵消任何目标日期触发机会的普通手动事项，不写入 `consumesDateTrigger = true`

### 本轮修改
- 更新 `product-rules.md`
- 更新 `data-model.md`
- 更新 `dev-log.md`

### 当前结论
- 后续 Task 3 / Task 9 应统一按 `targetDate + consumesDateTrigger` 的实例层口径实现
- 不要再将该语义写入 `TaskTemplate.isArchived`

## 2026-04-18（Task 3：本地存储层）

### 本轮目标
- 只实现本地存储层
- 建立统一的数据读写入口
- 支持初始化默认值
- 支持 `AppData` 的基础增删改查接口
- 可加入轻量运行时校验，但不实现业务规则

### 开始前已阅读
- `AGENTS.md`
- `dev-log.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`

### 本轮关键决策
- 存储层继续采用 `Dexie`，但 V1 只持久化一份 `AppData` 文档记录，不把当前阶段拆成多张业务表
- 统一读写入口分两层：
  - `appDataStorage` 负责整体初始化、读取、替换、更新、重置
  - `appDataRepository` 负责 `sceneTags / activityTypes / taskTemplates / recurringTaskInstances / dayPlanItems` 的基础 CRUD
- 运行时校验采用 `Zod`，只校验数据形状、枚举值、必要字段与 `progressPercent` 范围
- `mockSeedAppData` 仅用于首次初始化整份 `AppData` 或显式 reset，不用于单条写入
- 单条写入时只补字段级默认值：
  - 通用 `id`
  - `createdAt`
  - `updatedAt`
  - `TaskTemplate.date`
  - `RecurringTaskInstance.generatedAt`
- `TaskTemplate.date` 默认写入“当前写入当天”的本地日期字符串；若调用方显式传入 `date`，则保留传入值
- 当前 `recurrence` 继续按简化枚举存储，不预扩展为 interval 结构
- 为承接主文档口径，补齐 `DayPlanItem.targetDate` 与 `DayPlanItem.consumesDateTrigger` 字段，但本轮只提供字段级存取能力，不做任何消费语义判断

### 本轮修改
- 更新 `src/types/models.ts`
  - 为 `DayPlanItem` 补充 `targetDate?` 与 `consumesDateTrigger?`
- 更新 `src/db/client.ts`
  - `Dexie` 数据库新增 `appData` 表
  - 保留 `meta` 表并写入 schema version 元数据
  - 版本号从 `1` 扩展到 `2`，为后续升级预留入口
- 新增 `src/db/schema.ts`
  - 定义 `AppData`、各实体与持久化记录的 `Zod` schema
- 新增 `src/db/storage.ts`
  - 实现初始化、读取、替换、更新、重置
  - 实现五类集合的基础 CRUD
  - 实现字段级默认值补齐
- 新增 `src/db/index.ts`
  - 统一导出 db 相关入口

### 本轮明确未做
- 未实现“自动进入当天计划”
- 未实现推荐逻辑
- 未实现重复命中计算
- 未实现 `consumesDateTrigger` 的业务判断
- 未实现同日同语境去重、触发命中校验、targetDate 消费一致性校验
- 未为不同业务来源自动生成 `DayPlanItem` 或 `RecurringTaskInstance`

### 验证结果
- `npm run build`：通过
- `npm run lint`：通过

### 当前结论
- Task 3 所需的统一本地存储入口、初始化 seed、字段级默认值和基础 CRUD 已落地
- 当前存储层保持在“数据落地 + 轻量校验”边界内，没有提前承接 Task 4 / Task 9 的业务职责

### 当前风险与待确认问题
- 当前所有数据仍以单份 `AppData` 文档方式整体读写，V1 足够轻量，但后续若数据量增大，可能需要再评估拆表与局部更新策略
- 当前 schema version 只完成存储与元数据预留，尚未实现真实 migration 分支；后续结构升级时需要补 migration
- 当前仅提供字段级写入，不会阻止业务层写入“逻辑上不合理但结构合法”的数据；这些约束应放在 Task 4 / 9 / 10 / 11 对应业务层实现

## 2026-04-18（Task 4：首次初始化流程）

### 本轮目标
- 只实现首次初始化流程与初始化完成后的路由流转
- 不实现主页面业务功能
- 不实现决策模式
- 不实现 Todo 模式

### 开始前已阅读
- `AGENTS.md`
- `dev-log.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`

### 开始前确认
- 当前数据层中的 `timeBlock` 已统一为最新规则口径：
  - `day | night`
  - `mapped_day | default_day | mapped_night | manual_night`
- 未发现旧“四段时间”计划语义残留在数据层
- `sceneTags` 中保留“上午 / 晚上”等系统内置标签，仅作为后续映射来源，不等同于旧四段计划结构

### 本轮关键决策
- 路由采用“守卫组件”分流：
  - 未初始化访问首页时，重定向到 `SetupPage`
  - 已初始化访问 `SetupPage` 时，重定向回 `HomePage`
- `SetupPage` 采用本地草稿态编辑：
  - 用户在页面内修改时间场景与活动类型时，先只保存在页面状态中
  - 只有点击“完成初始化”且校验通过后，才一次性写回存储并把 `settings.initialized` 设为 `true`
- 不在初始化过程中自动写入 `initialized = true`
- 如果用户中途退出，应用仍保持未初始化状态
- `HomePage` 当前只承接“初始化完成后的最小入口”职责，展示默认使用当天日期这一语义，不提前接入主页面业务

### 本轮修改
- 更新 `src/app/router.tsx`
  - 为首页与初始化页接入初始化状态守卫
- 新增 `src/app/guards/InitializationGuard.tsx`
  - 负责读取本地初始化状态、加载态展示与路由重定向
- 更新 `src/pages/setup/SetupPage.tsx`
  - 实现时间场景 / 活动类型的初始化编辑
  - 实现“至少保留一个”的前端校验
  - 实现“完成初始化”后的统一写入与跳转
- 更新 `src/pages/home/HomePage.tsx`
  - 调整为最小主页面入口
  - 明确展示默认使用当天日期
- 更新 `src/app/shell/AppShell.tsx`
  - 根据当前路由展示更贴近 Task 4 的顶部元信息
- 更新 `src/styles/globals.css`
  - 补充初始化页表单、按钮、反馈信息和最小 HomePage 卡片样式

### 本轮已落实规则
- 未初始化进入 `SetupPage`
- 已初始化进入 `HomePage`
- 首次完成初始化后跳转到 `HomePage`
- 初始化页当前只允许编辑：
  - 时间场景
  - 活动类型
  - 完成初始化按钮与校验
- 初始化阶段删除规则按主文档简化执行：
  - 时间场景可删除，但至少保留一个
  - 活动类型可删除，但至少保留一个
- 只有明确点击“完成初始化”且校验通过时，才写入 `settings.initialized = true`

### 本轮明确未做
- 未实现日期输入
- 未实现条目录入
- 未实现推荐逻辑
- 未实现自动生成当天计划
- 未实现主页面四大区域的真实业务联动
- 未实现决策模式与 Todo 模式
- 未实现“活动类型被已有条目占用时不可删除”的复杂规则；该规则留待后续正式条目录入与管理流程

### 验证结果
- `npm run build`：通过
- `npm run lint`：通过

### 当前结论
- Task 4 所需的首次初始化流程、最小校验与初始化完成后的路由分流已落地
- 当前实现保持在“完成初始化前置步骤”边界内，没有扩写到 Task 6 / Task 8 / Task 9

### 当前风险与待确认问题
- 当前初始化页采用“本地草稿后一次性提交”策略，能严格收窄 `initialized` 写入时机；后续若需要支持中途草稿恢复，需要再单独定义是否允许保存未完成初始化草稿
- 当前 `HomePage` 只展示“默认使用当天日期”的初始化语义，还没有把该日期沉淀为跨页面共享状态；后续进入 Task 5 时需要决定日期状态归属

## 2026-04-18（Task 6：新增决策库条目录入）

### 本轮目标
- 只实现“新增条目”表单
- 支持将新条目写入 `TaskTemplate`
- 不实现已有条目的编辑、删除与管理列表
- 不实现自动生成、推荐逻辑或当天计划联动

### 开始前已阅读
- `AGENTS.md`
- `dev-log.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`

### 本轮关键决策
- 表单直接接入当前 `HomePage`，作为“新增决策库条目”卡片落在主页面内，先满足 Task 6 的录入目标，不等待 Task 5 的完整区域拆分
- 表单只支持从初始化后的已有：
  - 时间场景
  - 活动类型
  中选择，不支持现场新增
- `sceneTagIds` 允许为空提交
- `date` 作为核心字段始终显示：
  - 使用原生 `input[type="date"]`
  - 默认当天
  - 不添加复杂日历逻辑
- 字段分组采用“主字段 / 常用设置 / 高级设置”：
  - 主字段：日期、活动类型、具体内容
  - 常用设置：时间场景、兴趣程度、是否必要
  - 高级设置：是否需要准备、准备备注、重复规则、是否分次
- `requiresPreparation`、`preparationNotes`、`recurrence`、`isSegmented` 放入可展开的高级设置，避免把首屏录入做得过重
- `recurrence` 文案明确强调“日历型重复”，并说明：
  - `weekly / monthly / yearly` 命中的是日历锚点
  - 不是“每隔一段时间”
- 提交成功后：
  - 只创建 `TaskTemplate`
  - 不生成 `DayPlanItem`
  - 不生成 `RecurringTaskInstance`
  - 重置表单并显示成功反馈

### 本轮修改
- 新增 `src/features/templates/CreateTaskTemplateForm.tsx`
  - 实现新增条目录入表单
  - 接入本地存储写入 `taskTemplates`
- 更新 `src/features/templates/index.ts`
  - 导出录入表单组件
- 更新 `src/pages/home/HomePage.tsx`
  - 在当前最小 HomePage 中接入“新增决策库条目”卡片
- 更新 `src/styles/globals.css`
  - 补充表单布局、分组、选择器、开关与反馈信息样式

### 本轮已落实规则
- 支持字段：
  - `date`
  - `activityTypeId`
  - `title`
  - `sceneTagIds`
  - `interestLevel`
  - `isNecessary`
  - `requiresPreparation`
  - `preparationNotes`
  - `recurrence`
  - `isSegmented`
- 默认值符合当前文档口径：
  - `date = 当天`
  - `interestLevel = 2`
  - `isNecessary = false`
  - `requiresPreparation = false`
  - `recurrence = none`
  - `isSegmented = false`
- `sceneTagIds` 可为空提交
- `TaskTemplate.date` 在表单层显式展示并可修改；若用户不改，保持当天默认值
- `recurrence` 文案已明确为“日历型重复（calendar-based recurrence）”
- 当前提交只写入模板层，不越界进入实例层

### 本轮明确未做
- 未实现已有 `TaskTemplate` 的编辑
- 未实现已有 `TaskTemplate` 的删除
- 未实现条目管理列表
- 未实现现场新增时间场景或活动类型
- 未实现自动生成当天计划
- 未实现重复命中计算
- 未实现周期实例生成
- 未实现推荐逻辑
- 未实现必要事项与当天计划的联动

### 验证结果
- `npm run build`：通过
- `npm run lint`：通过

### 当前结论
- Task 6 所需的新增录入表单、字段默认值与本地存储写入已落地
- 当前录入体验已经可以让用户顺畅保存模板，但仍严格停留在模板层，不承担 Task 8 / Task 9 的业务职责

### 当前风险与待确认问题
- 当前表单已通过文案强调“日历型重复”，但还没有在页面别处统一展示该语义；后续若在条目管理或详情页再次展示 recurrence，需保持同口径
- 当前 `HomePage` 中已经承接了 Task 6 的录入入口，后续进入 Task 5 时需要将这块平滑迁移到正式的底部添加区结构中

## 2026-04-18（Task 8：主页面结构与计划区骨架）

### 本轮目标
- 实现主页面真实结构
- 让模式切换成为真实可切换的页面内状态
- 落地决策模式骨架、单列计划区与信息组织
- Todo 模式只做结构占位
- 不提前实现自动生成、推荐或排序业务逻辑

### 开始前已阅读
- `AGENTS.md`
- `dev-log.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`

### 本轮关键决策
- `HomePage` 从“最小壳层”升级为真实主页面容器，按四大区域组织：
  - 顶部信息区
  - 模式切换区
  - 主内容区
  - 底部添加区
- 模式切换改为真实页面内状态：
  - `decision`：显示真实骨架
  - `todo`：显示结构占位
- 决策模式中的单列计划区只承接“信息结构”，不承接“排序语义”
- 白天 / 晚上语境在页面中以两个独立段落承接：
  - 不实现默认白天 / 明确白天 / 明确晚上排序规则
  - 不实现拖动后语境切换
  - 不根据条目位置改变语境
- “增加安排”入口只做占位按钮，不触发推荐流程
- 底部添加区复用 Task 6 表单，只调整挂载位置与页面版式，不改写：
  - 字段逻辑
  - 字段分组
  - 提交语义

### 本轮修改
- 更新 `src/pages/home/HomePage.tsx`
  - 将 HomePage 重构为四大区域结构
  - 接入真实模式切换状态
  - 落地决策模式骨架与 Todo 模式占位
  - 将 Task 6 表单迁移到底部添加区
- 更新 `src/styles/globals.css`
  - 补充主页面四大区域、模式切换、顶部信息区、单列计划区、白天/晚上语境段和底部添加区样式

### 本轮已落实
- 主页面四大区域已具备真实结构
- 顶部信息区已展示：
  - 当前选中日期
  - 星期信息
  - 天气占位
  - 基础日期切换按钮
- 模式切换区已支持真实页面内切换
- 主内容区中：
  - 决策模式为本轮主落地视图
  - Todo 模式为结构占位
- 决策模式已落地：
  - 单列计划区
  - 白天段 / 晚上段
  - 自动事项占位
  - 手动事项占位
  - “增加安排”入口占位按钮
- 底部添加区已复用 Task 6 表单，且未改写其字段规则与提交语义

### 本轮明确未做
- 未实现自动进入当天计划逻辑
- 未实现推荐逻辑
- 未实现真实排序规则
- 未实现拖动交互
- 未实现基于位置改变条目语境
- 未实现 Todo 模式真实列表
- 未实现模板管理列表、编辑或删除入口

### 验证结果
- `npm run build`：通过
- `npm run lint`：通过

### 当前结论
- Task 8 已将主页面推进到“真实结构可承接后续任务”的阶段
- 当前实现重点是页面组织、语境承接与模式切换，不承担 Task 9 / Task 10 / Task 12 的业务计算职责

### 当前风险与待确认问题
- 当前日期切换只作用于页面结构展示，尚未与自动入计划、推荐或 Todo 列表联动；后续进入 Task 9 / Task 12 时需要统一 selectedDate 的业务消费方式
- 当前“增加安排”入口只是结构占位按钮；后续进入 Task 10 时需要决定是弹窗、抽屉还是内嵌面板
- 当前 Task 6 表单只是迁移到底部添加区，没有改写其语义；若后续主页面布局继续调整，需要注意不要反向破坏已确认的录入规则

## 2026-04-18（Task 9：自动进入当天计划）

### 本轮目标
- 根据当前 `selectedDate` 自动生成当天应出现的事项
- 采用“查看即惰性落库”策略
- 只处理 `auto_generated` 实例
- 将真实自动事项接入当前决策模式骨架

### 开始前已阅读
- `AGENTS.md`
- `dev-log.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`

### 本轮关键决策
- 当用户查看某个 `selectedDate` 时，允许并应当将该日期相关的自动生成结果持久化写回本地
- 当前只处理与该 `selectedDate` 相关的上下文：
  - 必要时生成 / 复用 `DayPlanItem`
  - 必要时生成 / 复用 `RecurringTaskInstance`
- 旧周期未完成实例只做最小必要更新：
  - 只处理当前模板
  - 只在当前查看日期命中时更新更早周期
  - 不做全库扫过期
- 自动生成仅覆盖：
  - 必要事项（命中日期规则时）
  - 命中日期规则的非必要重复事项
  - 命中当天日期的非必要一次性事项
- 当前只生成 `source = auto_generated` 的实例：
  - 不生成 `decision_selected`
  - 不处理 `manual_temporary`
- `sortOrder` 当前只服务自动事项在决策模式中的展示顺序，不承担拖拽排序或未来语境切换语义
- 时间场景映射采用当前文档口径的工程化推断：
  - 若命中夜间内置标签，则映射为 `mapped_night`
  - 否则若命中白天内置标签，则映射为 `mapped_day`
  - 否则为 `default_day`
  - 当前未扩展用户拖动改语境逻辑

### 本轮修改
- 新增 `src/features/recurrence/auto-generated.ts`
  - 实现按日期命中判断
  - 实现日历型重复 `dateKey` 计算
  - 实现当前日期上下文内的自动事项同步与惰性落库
- 更新 `src/features/recurrence/index.ts`
  - 导出自动生成模块
- 更新 `src/pages/home/HomePage.tsx`
  - 决策模式接入真实自动事项同步与展示
  - 白天 / 晚上段改为展示真实 `auto_generated` 项
- 更新 `src/styles/globals.css`
  - 补充自动事项卡片、状态标签和同步失败样式

### 自动事项判断口径
- 必要事项：
  - 不是每天都自动出现
  - 只有在该模板命中日期规则时才自动进入当天计划
- 命中日期规则的重复事项：
  - `daily`：从锚点日期开始每天命中
  - `weekly`：命中锚点对应星期
  - `monthly`：命中锚点对应日号
  - `yearly`：命中锚点对应月 + 日
- 命中当天日期的非必要一次性事项：
  - `recurrence = none`
  - `template.date === selectedDate`
- 若某模板在该 `targetDate` 上已有 `consumesDateTrigger = true` 的实例，则该次自动触发不再重复生成

### 持久化结果
- 会持久化：
  - 当前查看日期相关的 `auto_generated DayPlanItem`
  - 命中的重复模板所需的当前 `RecurringTaskInstance`
  - 当前模板更早但仍 `pending` 的旧周期实例更新为 `expired`
- 当前只停留在展示层：
  - 决策模式中的白天 / 晚上段 UI
  - 同步中 / 同步失败提示
  - 自动事项的展示卡片样式

### 本轮明确未做
- 未实现推荐逻辑
- 未实现“增加安排”后的选入逻辑
- 未实现 Todo 模式真实列表
- 未实现完成事项交互
- 未实现模板管理
- 未实现 decision_selected / manual_temporary 的生成
- 未实现用户手动排序、拖动与语境切换

### 验证结果
- `npm run build`：通过
- `npm run lint`：通过

### 当前结论
- Task 9 已将自动事项生成、复用、惰性落库与决策模式展示打通
- 当前自动实例层已经可以作为 Task 10 / Task 12 / Task 14 的基础数据输入

### 当前风险与待确认问题
- 当前自动排序在已落实“明确白天 -> 默认白天 -> 明确晚上”大顺序之外，组内采用稳定工程顺序；若后续产品需要更细组内排序规则，需要单独补充
- 当前 `consumesDateTrigger` 只在生成阶段被读取与尊重，完成交互后的写入与消费联动仍需在后续任务实现
- 当前自动事项展示仅接在决策模式；Todo 模式要到 Task 12 才会复用这些已落库实例做真实列表展示

## 2026-04-18（Task 12：Todo 模式真实列表）

### 本轮目标
- 将 Todo 模式从结构占位推进到真实实例列表
- 列表来源只基于 `DayPlanItem`
- 完整支持：
  - `auto_generated`
  - 已有 `manual_temporary`
- 对 `decision_selected` 保持结构兼容
- 支持非分次事项完成、已有临时事项删除、准备备注查看

### 开始前已阅读
- `AGENTS.md`
- `dev-log.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`

### 本轮关键决策
- Todo 模式读取前先复用 Task 9 的自动事项同步入口，确保当前 `selectedDate` 的自动事项已经落库
- 但 Todo 列表本身只从 `DayPlanItem` 读取，不回头从 `TaskTemplate` 推导
- 当前完整支持：
  - `auto_generated`
  - `manual_temporary`
- `decision_selected` 虽然当前可能暂无真实数据，但渲染层已支持其来源标签与展示结构
- 分次事项在 Task 12 不允许直接完成：
  - 只展示当前进度
  - 用禁用态按钮提示后续推进逻辑
- Task 12 不实现临时事项新增：
  - 只展示已有 `manual_temporary`
  - 支持删除已有 `manual_temporary`
- 完成事项写回保持最小：
  - `status = completed`
  - `completedAt`
  - `progressState = completed`
  - `progressPercent = 100`
- `consumesDateTrigger` 只在确实会抵消 `targetDate` 自动触发机会时写入：
  - 当前采用最小判断：有 `templateId`、有 `targetDate`、且不是 `manual_temporary`
  - 不做历史修复，不做额外批量更新

### 本轮修改
- 新增 `src/features/todo/TodoModePanel.tsx`
  - 实现 Todo 模式真实列表、完成与删除交互
- 更新 `src/features/todo/index.ts`
  - 导出 Todo 模式面板
- 更新 `src/pages/home/HomePage.tsx`
  - 用真实 Todo 面板替换结构占位
- 更新 `src/styles/globals.css`
  - 补充 Todo 列表、来源标签、白天/晚上样式和操作样式

### 本轮已落实
- Todo 模式当前只读取实例层 `DayPlanItem`
- 显示来源标签：
  - `auto_generated`
  - `decision_selected`
  - `manual_temporary`
- 显示白天 / 晚上样式分组
- 支持查看准备备注
- 对非分次事项支持完成
- 对已有临时事项支持删除
- 对分次事项只展示进度，不允许直接完成

### consumesDateTrigger 的本轮写入场景
- 仅在“非分次事项完成”时参与写入判断
- 且必须满足：
  - 不是 `manual_temporary`
  - 有 `templateId`
  - 有 `targetDate`
- 当前不会因为删除临时事项、查看列表或展示进度去改写 `consumesDateTrigger`

### 本轮明确未做
- 未实现推荐逻辑
- 未实现“增加安排”后的手动选入
- 未实现临时事项新增
- 未实现分次事项推进
- 未实现 Todo 排序编辑、语境切换或拖动
- 未实现模板管理

### 验证结果
- `npm run build`：通过
- `npm run lint`：通过

### 当前结论
- Task 12 已让 Todo 模式从实例层真实工作起来
- 当前展示、完成和删除都建立在 `DayPlanItem` 之上，没有回退到模板层推导

### 当前风险与待确认问题
- 当前 Todo 读取前会复用 Task 9 的同步入口，这能保证自动事项落库，但后续若 HomePage 需要统一 selectedDate 数据流，可能要把这类同步再集中收敛
- 当前 `consumesDateTrigger` 在完成交互中的写入仍是最小实现；更复杂的消费语义与分次推进联动需留给后续任务
- 当前 `decision_selected` 只实现了结构兼容，待 Task 10 / Task 11 写入真实数据后再补全对应体验

## 2026-04-18（Task 10：推荐逻辑与手动选入）

### 本轮目标
- 让“增加安排”入口进入真实推荐流程
- 在当前语境下展示内嵌推荐卡片
- 支持：
  - 推荐第一项
  - 查看候选列表
  - 选择后生成 `decision_selected`
- 不实现推荐增强、拖动、完成语义或模板管理

### 开始前已阅读
- `AGENTS.md`
- `dev-log.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`

### 本轮关键决策
- 推荐面板采用“当前语境下的内嵌推荐卡片”
- 当前一次只允许展开一个推荐面板：
  - 切换白天 / 晚上入口时，直接切换当前展开面板
  - `selectedDate` 变化时自动关闭面板
- 候选筛选优先尊重实例层：
  - 是否已经自动进入当天计划，优先看当天已有 `DayPlanItem`
  - 不再重新发明一套“猜它会不会自动出现”的逻辑
- `sceneTagIds` 的部分匹配保持轻量：
  - 与当前 `selectedDate + timeBlock` 自动推导出的场景做部分匹配
  - `sceneTagIds` 为空的模板允许进入候选
  - 但排在更匹配的模板之后
  - 不引入复杂打分系统
- 同一模板在同一天同一语境内不允许重复选入：
  - 候选筛选阶段直接排除
  - 创建 `decision_selected` 前再次做实例层兜底校验
- 若模板当天已在另一语境出现：
  - 仍允许进入候选
  - 但排到后面
  - 不作为默认推荐项
- `decision_selected.targetDate` 采用模板原始 `date`
  - `date = selectedDate`
  - `targetDate = template.date`
- `decision_selected` 当前只做最小初始化写入，不扩展到完成、消费或拖动语义

### 本轮修改
- 新增 `src/features/decision/recommendation.ts`
  - 实现推荐候选筛选、排序与 `decision_selected` 创建逻辑
- 更新 `src/features/decision/index.ts`
  - 导出推荐模块
- 更新 `src/pages/home/HomePage.tsx`
  - 决策模式接入内嵌推荐卡片
  - 手动事项占位改为真实 `decision_selected` 展示
- 更新 `src/styles/globals.css`
  - 补充推荐卡片、候选列表与手动选入展示样式

### 推荐候选筛选与排序规则
- 先按实例层排除：
  - 当天已自动进入计划的模板
  - 当前语境中已经存在的同模板
- 再按模板层排除：
  - `isArchived = true`
  - `isNecessary = true`
  - `activityTypeId` 不匹配
- 场景匹配：
  - 根据 `selectedDate + timeBlock` 自动推导当前场景 tag
  - 有部分命中的模板优先进入候选
  - `sceneTagIds` 为空的模板允许进入候选，但排后
  - 非空且完全不匹配的模板排除
- 排序：
  - 先按“是否当天已在另一语境出现”
  - 再按“是否为空场景模板”
  - 再按 `interestLevel`
  - 最后按 `settings.tieBreakerOrder`
- 默认推荐第一项：
  - 只从“当天未在另一语境出现”的候选中取第一项
  - 若只剩跨语境候选，则默认推荐可为空，但列表仍可查看和选择

### decision_selected 的本轮写入字段
- `source = decision_selected`
- `date = selectedDate`
- `targetDate = template.date`
- `timeBlock = 当前入口语境`
- `timeBlockSource`
  - 白天：`default_day`
  - 晚上：`manual_night`
- `sortOrder = 当前语境末尾`
- `templateId`
- `title`
- `activityTypeId`
- `isNecessary`
- `requiresPreparation`
- `preparationNotes`
- `isSegmented`
- `progressState = not_started`
- `progressPercent = 0`
- `status = pending`

### 本轮已真正落地
- “增加安排”入口进入真实推荐流程
- 当前语境下一次只展开一个内嵌推荐面板
- 推荐第一项
- 查看候选列表
- 同日同语境不重复选入
- 自动事项不参与推荐竞争
- 跨语境已出现模板降级但仍可选
- 选择后创建并展示 `decision_selected`

### 本轮继续后置
- 未实现推荐增强解释
- 未实现搜索
- 未实现拖动排序
- 未实现手动改语境
- 未实现完成语义
- 未实现分次推进
- 未实现模板管理

### 验证结果
- `npm run build`：通过
- `npm run lint`：通过

### 当前结论
- Task 10 已将决策模式从“自动事项展示”推进到“自动事项 + 手动推荐选入”的可用状态
- 当前推荐逻辑仍保持轻量，主要依赖实例层结果与基础排序规则，不承担后续任务的复杂交互职责

### 当前风险与待确认问题
- 当前场景推导采用轻量内置标签映射，满足 V1 现阶段需求；若后续需要更细场景推导规则，应在主文档中先补定义
- 当前默认推荐为空时，仍允许用户从候选列表中手动选；若后续需要更明确的空推荐 UX，可再优化文案
- 当前 `decision_selected` 已写入 `targetDate`，但其完成后的消费语义仍留给后续任务衔接

## 2026-04-18（Task 13：临时事项快速新增）

### 本轮目标
- 在 Todo 模式中提供临时事项快速新增
- 严格保持“一行文字 + day/night 选择”的极简交互
- 只创建 `manual_temporary DayPlanItem`
- 不进入模板层、不触发推荐或自动生成

### 开始前已阅读
- `AGENTS.md`
- `dev-log.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`

### 本轮关键决策
- 临时事项新增入口放在 Todo 模式列表顶部
- 交互保持极简：
  - 输入框
  - `day / night` 选择
  - 添加按钮
  - 支持回车提交
- 标题只要非空即可提交
- 创建成功后：
  - 清空标题输入
  - 保留当前 `day/night` 选择，便于连续添加同一时段事项
- 创建语义保持最小实例层口径：
  - 只创建 `source = manual_temporary` 的 `DayPlanItem`
  - 不写 `TaskTemplate`
  - 不关联 `RecurringTaskInstance`
  - 不写 `targetDate`
  - 不写 `consumesDateTrigger`
  - 不触发自动生成、推荐或消费逻辑

### 本轮修改
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 新增临时事项输入条
  - 实现 `manual_temporary` 创建逻辑
  - 创建后复用现有 Todo 列表刷新逻辑
- 更新 `src/styles/globals.css`
  - 补充临时事项输入区与控件样式

### 临时事项本轮写入字段
- `date = selectedDate`
- `timeBlock`
- `timeBlockSource`
- `sortOrder`
- `source = manual_temporary`
- `title`
- `isNecessary = false`
- `requiresPreparation = false`
- `preparationNotes = ''`
- `isSegmented = false`
- `progressState = not_started`
- `progressPercent = 0`
- `status = pending`

### day/night 映射口径
- 若用户选择 `day`
  - `timeBlock = day`
  - `timeBlockSource = default_day`
- 若用户选择 `night`
  - `timeBlock = night`
  - `timeBlockSource = manual_night`

### 本轮已落实
- Todo 模式可新增临时事项
- 临时事项严格保持一行文字
- 不支持多行备注、活动类型、准备信息、重复规则、分次设置
- 创建后 Todo 列表即时刷新

### 本轮明确未做
- 未实现临时事项编辑
- 未实现临时事项批量操作
- 未实现模板化保存
- 未实现分次推进
- 未实现模板管理

### 验证结果
- `npm run build`：通过
- `npm run lint`：通过

### 当前结论
- Task 13 已让 Todo 模式具备最小可用的临时事项快速新增能力
- 当前实现保持在实例层边界内，没有反向污染决策库或推荐逻辑

### 当前风险与待确认问题
- 当前临时事项默认只带最小实例字段，符合 V1 边界；若后续需要支持更丰富的临时事项属性，需要先补产品规则
- 当前创建后保留 `day/night` 选择是为了连续输入效率；如果后续用户反馈更偏向“每次恢复默认白天”，可以再调整交互细节

## 2026-04-18（Task 14：分次事项推进）

### 本轮目标
- 为已有分次实例提供推进交互
- 采用显式保存，不做即时写回
- 只更新当前已有 `DayPlanItem` 及其已关联的 `recurringInstanceId`
- 进度到 `100%` 时视为该实例整体完成

### 开始前已阅读
- `AGENTS.md`
- `dev-log.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`

### 本轮关键决策
- Task 14 只处理“已有分次实例”的推进：
  - 不生成新的 `DayPlanItem`
  - 不生成新的 `RecurringTaskInstance`
  - 不补历史，不修未来
- 推进 UI 放在 Todo 卡片内部展开
- 采用“slider + 数字输入 + 保存进度”：
  - slider 和数字输入只改本地草稿
  - 只有点击“保存进度”才真正写回存储
- 分次事项一旦保存为 `100%`：
  - 视为该实例整体完成
  - 本轮不允许回退到 `<100%`
  - 不做 `consumesDateTrigger` 回滚逻辑
- 只支持推进以下来源：
  - `auto_generated`
  - `decision_selected`
- 继续排除：
  - `manual_temporary`
- 对 `RecurringTaskInstance` 只做最小同步：
  - `progressPercent`
  - `progressState`
  - 达到 `100%` 时补 `status = completed` / `completedAt`
- `consumesDateTrigger` 只在完成时写入：
  - `1-99` 不写
  - 只有达到 `100%` 且满足既有条件时才写为 `true`

### 本轮修改
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 实现分次事项推进 UI
  - 实现显式保存进度逻辑
  - 实现 `RecurringTaskInstance` 的最小同步
- 更新 `src/styles/globals.css`
  - 补充分次推进面板、slider、数字输入和提示样式

### 进度状态映射
- `0` -> `progressState = not_started`
- `1-99` -> `progressState = in_progress`
- `100` -> `progressState = completed`

### 本轮写回字段
- `DayPlanItem`
  - `progressPercent`
  - `progressState`
  - 若达到 `100%`：
    - `status = completed`
    - `completedAt`
    - 满足条件时 `consumesDateTrigger = true`
- `RecurringTaskInstance`（仅在已关联 `recurringInstanceId` 时）
  - `progressPercent`
  - `progressState`
  - 若达到 `100%`：
    - `status = completed`
    - `completedAt`

### consumesDateTrigger 的本轮写入场景
- 仅在分次事项保存后达到 `100%` 时参与写入判断
- 且必须满足：
  - 有 `templateId`
  - 有 `targetDate`
- 不会在 `1-99` 的进行中状态写入
- 不会做回滚

### 本轮已落实
- 分次事项推进交互
- 显式保存进度
- `100%` 时整体完成
- 完成后不允许回退
- 周期实例最小同步

### 本轮明确未做
- 未实现分次事项历史记录
- 未实现多阶段拆分
- 未实现模板管理
- 未实现更复杂的周期修复
- 未实现 `manual_temporary` 的分次推进

### 验证结果
- `npm run build`：通过
- `npm run lint`：通过

### 当前结论
- Task 14 已让分次事项从“只展示进度”进入“可推进、可完成”的实例层状态
- 当前实现仍保持轻量，没有扩展出额外的阶段系统或复杂回滚语义

### 当前风险与待确认问题
- 当前分次事项一旦到 `100%` 就不可回退，这符合本轮约束；若后续产品需要回退能力，需要先补完整的消费回滚规则
- 当前推进面板只覆盖已有实例，不会主动生成缺失的周期实例；这与本轮范围一致，但后续若出现异常数据修复需求，需要单独处理

## 2026-04-18（Task 7：模板管理）

### 本轮目标
- 提供现有 `TaskTemplate` 的管理面板
- 支持查看、编辑与停用
- 默认只展示未归档模板
- 编辑只影响模板层，不回写已有实例

### 开始前已阅读
- `AGENTS.md`
- `dev-log.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`

### 本轮关键决策
- 本轮“删除”采用“归档停用（`isArchived = true`）”实现
- 不做物理删除
- 停用时不改动已有：
  - `DayPlanItem`
  - `RecurringTaskInstance`
- UI 文案统一使用“停用”
- 模板列表默认只展示未归档模板，不做“查看已归档”切换
- 模板编辑表单尽量复用 Task 6 的字段结构与规则：
  - 主字段
  - 常用设置
  - 高级设置
- 当前新增和编辑的主要差异只在：
  - 入口形态不同
  - 提交动作不同
  - 编辑说明文案强调“只影响未来自动生成与未来推荐”
- 模板管理入口放在主页面底部添加区附近，与新增表单并列组织

### 本轮修改
- 新增 `src/features/templates/TemplateFormFields.tsx`
  - 抽出 Task 6 与 Task 7 共用的字段结构、默认值与基础校验
- 重构 `src/features/templates/CreateTaskTemplateForm.tsx`
  - 复用共享字段组件，保持新增表单语义不变
- 新增 `src/features/templates/TemplateManagerPanel.tsx`
  - 实现模板列表、编辑与停用
- 更新 `src/features/templates/index.ts`
  - 导出共享表单与模板管理面板
- 更新 `src/pages/home/HomePage.tsx`
  - 在底部添加区接入“管理已有条目”入口和模板管理面板
- 更新 `src/styles/globals.css`
  - 补充模板管理布局、列表项、编辑区和入口样式

### 本轮已落实
- 模板管理入口
- 未归档模板列表
- 模板编辑
- 模板停用（归档）
- 编辑只更新 `TaskTemplate`
- 停用后模板不再参与未来自动生成与未来推荐
- 已有实例保持不变

### 本轮允许编辑的字段
- `title`
- `date`
- `activityTypeId`
- `sceneTagIds`
- `interestLevel`
- `isNecessary`
- `requiresPreparation`
- `preparationNotes`
- `recurrence`
- `isSegmented`

### 编辑后的影响范围
- 只影响未来自动生成
- 只影响未来推荐
- 不回写已有 `DayPlanItem`
- 不回写已有 `RecurringTaskInstance`
- 不做历史实例同步修复

### 停用后的当前系统行为
- 模板本身被标记为 `isArchived = true`
- 当前主页面已展示的实例不做额外修复
- 未来自动生成与推荐不再使用该模板
- 已存在实例仍按原样保留并继续展示

### 本轮明确未做
- 未实现已归档模板查看切换
- 未实现物理删除
- 未实现模板搜索筛选
- 未实现批量管理
- 未实现历史实例修复

### 验证结果
- `npm run build`：通过
- `npm run lint`：通过

### 当前结论
- Task 7 已让模板管理从“只新增”推进到“新增 + 管理 + 停用”的可用状态
- 当前实现严格区分模板层与实例层，没有把编辑或停用的影响扩散到既有实例

### 当前风险与待确认问题
- 当前默认不展示已归档模板，能先把管理面跑通；后续若用户需要恢复停用模板，需要再定义“查看/恢复已归档”规则与入口
- 当前编辑表单与 Task 6 共用字段结构，能保持语义一致；若后续需要在编辑态增加只读提示或差异说明，应继续围绕这套共享结构扩展，而不是再分叉出第三套表单

## 2026-04-19（首页 UI / 信息结构重构）

### 本轮目标
- 只重构首页相关 UI 与信息结构
- 不改业务逻辑、不改数据模型、不改规则
- 重点解决说明文案过多、层级反转、界面拥挤导致无法正常试用的问题

### 开始前已阅读
- `AGENTS.md`
- `handoff.md`
- `dev-log.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `design-guidelines.md`

### 本轮关键决策
- 模板管理仍保留在首页底部添加区内展开，不改为常驻双栏产品位置
- 优先做信息减法与层级重排，不为了“更好看”增加装饰元素
- 首页统一切换到 light mode，采用 warm cream 背景与 oat border 体系
- 说明类信息尽量退出主界面，保留下来的辅助文案控制为极短句
- 来源、必要、分次、准备、完成状态等信息统一收敛为短标签表达
- 不在本轮暴露 `timeBlockSource` 这类实现细节字段

### 本轮修改
- 更新 `src/app/shell/AppShell.tsx`
  - 删除任务号式元信息，缩短全局标题与副标题
- 更新 `src/pages/home/HomePage.tsx`
  - 重排首页结构
  - 重做顶部日期区、模式切换区、决策模式布局、底部添加区标题层级
  - 清理决策模式中的开发说明文案
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 重做 Todo 模式层级与卡片结构
  - 用短标签表达来源/必要/分次/准备/完成
  - 压缩空状态与进度说明文案
- 更新 `src/features/templates/CreateTaskTemplateForm.tsx`
  - 缩短加载与提交文案
- 更新 `src/features/templates/TemplateFormFields.tsx`
  - 压缩表单分组说明
  - 将“高级设置”改为更轻的“更多设置”
  - 删除多处开发说明式句子
- 更新 `src/features/templates/TemplateManagerPanel.tsx`
  - 将模板管理从“工具说明”改为“列表 + 编辑面板”
  - 模板属性改为标签显示
- 更新 `src/pages/setup/SetupPage.tsx`
  - 顺手清理初始化页里残留的开发说明式文案
- 更新 `src/styles/globals.css`
  - 全局切换到 light mode
  - 重建首页、Todo、决策、模板区、表单、标签与卡片的视觉层级

### 本轮删除的说明文案类型
- `Task X` 类任务号提示
- `V1 不接...`
- `当前只承接...`
- `后续这里会...`
- `这里只显示...`
- `当前信息区 / 模式切换区 / 主内容区 / 底部添加区` 这类开发命名式区块标题
- 暴露实现边界和存储语义的长说明段落

### 本轮改成标签 / 结构表达的信息
- 来源：`自动` / `已选` / `临时`
- 状态：`必要` / `已完成`
- 属性：`分次 xx%` / `准备` / `重复规则` / `场景数量`
- 时间区分：通过白天 / 晚上区块和浅色差异表达，而不是解释性文字
- 天气：保留极简占位 chip，不显示开发说明
- 模板属性：改为列表标签，不再写成长句解释

### 本轮验证结果
- `npm run build`：通过
- `npm run lint`：通过

### 当前结论
- 首页已经从“开发说明主导”切到“日期、模式、事项、动作主导”的试用状态
- 现有业务逻辑保持不变，但界面已更适合继续做真实试用与查找逻辑问题

### 当前风险与待确认问题
- 当前 light mode 与层级已经明显清晰，但视觉语气仍偏第一轮收口，后续仍可继续细化按钮密度、卡片节奏与排版精度
- 推荐面板和模板编辑面板虽然已降噪，但仍有继续压缩信息与增强扫描效率的空间

## 2026-04-19（移动端优先 / app 感收口）

### 本轮目标
- 继续只改 UI 与信息结构
- 不新增功能，不改业务逻辑
- 重点把首页从“网页页面”进一步收口为“移动端当前任务页”

### 开始前已阅读
- `AGENTS.md`
- `handoff.md`
- `dev-log.md`
- `src/pages/home/HomePage.tsx`
- `src/features/todo/TodoModePanel.tsx`
- `src/features/templates/TemplateManagerPanel.tsx`

### 本轮关键决策
- 底部添加区采用“首页底部主按钮，点击后原位展开”的方案
- 不使用悬浮按钮
- 优先让首页更像 app 中的当前任务页，而不是继续增加网页式展示层
- 顶部收成紧凑页头，把“今天 + 当前模式”提到第一视觉层
- 继续压缩事项卡、模式切换、模板管理的网页感与后台感

### 本轮修改
- 更新 `src/pages/home/HomePage.tsx`
  - 顶部改为更紧凑的 app 式页头
  - 将当前模式合并进顶部标签
  - 底部添加区改为主按钮触发的原位展开入口
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 进一步压缩 Todo 顶部摘要与临时事项入口
- 更新 `src/features/templates/TemplateManagerPanel.tsx`
  - 缩短模板管理标题与列表操作按钮，降低后台工具感
- 更新 `src/styles/globals.css`
  - 收紧壳层、页头、模式切换、卡片、标签、分区与移动端断点节奏
  - 新增底部添加区入口化样式

### 本轮完成的 app 化收口
- 首页顶部更像 app 导航栏 / 当前页头
- 模式切换更接近 segmented control
- 主内容区离顶部更近，当前模式更容易接管视觉焦点
- 底部录入能力从“长驻表单”收成“按需展开入口”
- 模板管理继续留在首页，但视觉上更像轻量管理层
- 事项卡继续压缩，保持标题优先、标签极短、动作明确

### 本轮验证结果
- `npm run build`：通过
- `npm run lint`：通过

### 当前结论
- 首页现在更接近移动端工具 app 的使用感：进入页面后更快看到“今天、当前模式、事项和操作”
- 业务逻辑保持不变，但首页已减少网页式连续模块堆叠的感觉

### 当前风险与待确认问题
- 当前录入入口已收起，但展开后的表单仍然偏完整，后续如继续做第三轮 UI，可考虑更强的分步式录入体验
- 模板管理虽然更轻了，但在手机上仍会占据较长页面，后续可继续优化为更强的单列管理节奏

## 2026-04-20（移动端垂直压缩）

### 本轮目标
- 继续只改信息结构与移动端呈现
- 进一步压缩首页和决策库展开后的垂直高度
- 让首页更接近 app 的单屏工作界面

### 开始前已阅读
- `AGENTS.md`
- `handoff.md`
- `dev-log.md`
- `src/app/shell/AppShell.tsx`
- `src/pages/home/HomePage.tsx`
- `src/features/todo/TodoModePanel.tsx`
- `src/features/templates/TemplateFormFields.tsx`
- `src/styles/globals.css`

### 本轮关键决策
- 品牌头部压成单行居中，仅保留 `J-Flow`
- 顶部日期区改成两行：`TODAY` + 左右箭头日期导航
- 决策模式与 Todo 模式顶部摘要都改成单行最小上下文
- 白天 / 晚上分区不再重复显示英中文标题，主要靠区块语境表达
- Todo 完成交互改成圆角小方框 checkbox 视觉，但不改现有完成逻辑
- 决策库入口改成一行工具栏：标题 + `+ / −` + 菜单图标
- 添加模板表单继续删除结构解释文案，压缩控件尺寸

### 本轮修改
- 更新 `src/app/shell/AppShell.tsx`
  - 删除 slogan 与副标题
  - 头部改为单行居中的 `J-Flow`
- 更新 `src/pages/home/HomePage.tsx`
  - 顶部日期区改为两行结构
  - 删除顶部模式 / 日期标签
  - 删除三按钮日期排布，改为左右箭头 + 当前日期
  - 决策模式顶部摘要改成单行
  - 决策库入口改成一行工具栏式结构
  - 安排卡片移除额外备注显示
- 更新 `src/features/todo/TodoModePanel.tsx`
  - Todo 顶部摘要改成单行计数
  - 临时事项快速新增区移除标题说明
  - 白天 / 晚上分区删除重复标题
  - 普通事项完成控件改成 checkbox 风格
- 更新 `src/features/templates/TemplateFormFields.tsx`
  - 删除“核心字段 / 常用设置 / 先填日期、类型和内容 / 用标签补充识别信息”等说明
  - 时间场景改成更紧凑的 tag 选择
  - 兴趣程度改成与标签同行
  - 必要事项、需要准备、分次事项去掉说明文字
  - 删除重复规则辅助说明段落
- 更新 `src/styles/globals.css`
  - 全面压缩头部、日期区、分区、卡片、标签、按钮、表单与展开区的垂直节奏
  - 新增日期箭头、工具栏图标按钮与 checkbox 风格完成控件样式

### 本轮删除的说明文案
- slogan / 副标题
- 顶部模式 tag 与日期 tag
- “决策模式”“已更新”
- `DAY / 白天`、`NIGHT / 晚上` 的双重标题
- `TODO`、`今天`
- `QUICK ADD`
- `核心字段`
- `先填日期、类型和内容`
- `常用设置`
- `用标签补充识别信息`
- `自动进入当天计划`
- 更多表单结构解释性小标题和辅助说明

### 本轮重点压缩的区块
- 品牌头部
- 顶部日期区
- 决策模式顶部摘要区
- Todo 顶部摘要区
- 临时事项快速新增区
- 白天 / 晚上分区头部
- 底部决策库入口
- 添加模板展开区中的说明头和大尺寸 tag 选择

### 本轮验证结果
- `npm run build`：通过
- `npm run lint`：通过

### 当前结论
- 首页第一屏现在更偏“当前日期导航 + 当前模式内容 + 直接操作”
- 决策库入口与展开表单的网页模块感进一步减弱
- 整体更接近移动端单屏工作界面，但仍保留现有业务逻辑与数据流

### 当前风险与待确认问题
- 当前 Todo 的 checkbox 已改成状态控件外观，但仍遵循现有“完成后不可回退”的逻辑；若后续要支持真正的双向切换，需要单独定义逻辑边界
- 模板管理区和展开表单虽然已经更紧凑，但展开后依然会拉长页面，后续仍可继续做更强的单列收纳

## 2026-04-20（移动端与桌面端对齐修正）

### 本轮目标
- 只修正当前移动端与桌面端未对齐的几个布局问题
- 顺手修正日期输入控件与活动类型控件的体量不一致问题
- 不开启新的 UI 重构目标
- 不改业务逻辑

### 开始前已阅读
- `AGENTS.md`
- `handoff.md`
- `dev-log.md`
- `src/app/shell/AppShell.tsx`
- `src/pages/home/HomePage.tsx`
- `src/features/todo/TodoModePanel.tsx`
- `src/features/templates/TemplateFormFields.tsx`
- `src/styles/globals.css`

### 本轮关键决策
- 只围绕 5 个已确认问题做收敛修复，不顺手扩改其他区域
- 决策库入口统一为“左标题 + 右操作组”
- 移动端 Todo 快速新增区优先保持单行紧凑排列
- 日期输入控件通过样式层压平体量，不改字段逻辑

### 本轮修改
- 更新 `src/pages/home/HomePage.tsx`
  - 将决策库入口改为左侧标题、右侧操作组结构
- 更新 `src/styles/globals.css`
  - 修正移动端品牌头部中的 `J-Flow` 居中
  - 修正移动端日期导航整体居中
  - 保持移动端 Todo 快速新增区尽量单行排列
  - 统一决策库入口为“左标题 + 右操作组”
  - 修正日期输入控件体量，使其更接近活动类型选择控件

### 本轮问题归类
- 只影响移动端的修正：
  - 品牌头部 `J-Flow` 居中
  - 日期区整体居中
  - Todo 快速新增区尽量单行排列
- 双端一起修正：
  - 决策库入口统一为左标题右操作组
  - 日期输入控件体量与活动类型选择控件对齐

### 本轮验证结果
- `npm run build`：通过
- `npm run lint`：通过

### 当前结论
- 这一轮没有引入新的结构目标，只把已确认的桌面端效果拉齐到移动端
- 决策库入口与日期控件在双端上也更一致了

### 当前风险与待确认问题
- 当前 Todo 快速新增区在极窄宽度下已尽量保持单行紧凑排列，但若后续还要继续压缩到更小屏幕，可能仍需要进一步调整控件最小宽度

## 2026-04-21（模板添加界面压缩 + 日期条件显隐）

### 本轮目标
- 将模板添加界面从三个分散 section 压缩为一个连续表单区块
- 删除表单中的结构性说明文案，提升移动端录入效率
- 只做与模板日期条件显隐直接相关的最小业务逻辑调整

### 开始前已阅读
- `AGENTS.md`
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`
- `src/features/templates/CreateTaskTemplateForm.tsx`
- `src/features/templates/TemplateFormFields.tsx`
- `src/features/templates/TemplateManagerPanel.tsx`
- `src/db/schema.ts`
- `src/db/storage.ts`
- `src/features/recurrence/auto-generated.ts`
- `src/features/decision/recommendation.ts`
- `src/styles/globals.css`

### 本轮关键决策
- 模板日期不改为可选字段，仍保留 `string`，但允许为空字符串 `''`
- 日期只在“必要事项”或“重复规则不是不重复”时显示；显示时默认当天
- 非必要且不重复的模板不显示日期，也不写入日期
- 活动类型改为与时间场景统一的 tag 选择样式，但保持单选语义
- 取消模板添加表单中的三段色块 section，改为单区块连续排布

### 文档冲突与处理
- 旧文档中存在“每个条目都必须有日期，默认值为添加当天”的口径
- 本轮已按新的产品规则更新 `product-rules.md` 与 `data-model.md`
- 同步更新了 `app-structure.md` 与 `task-list.md`，避免继续与产品规则冲突

### 本轮修改
- 更新 `src/db/schema.ts`
  - 允许 `TaskTemplate.date` 保存为空字符串 `''`
- 更新 `src/features/recurrence/auto-generated.ts`
  - 跳过无日期模板的日期触发匹配，避免空日期参与自动生成
- 更新 `src/features/decision/recommendation.ts`
  - 推荐生成实例时仅在模板存在日期时写入 `targetDate`
- 更新 `src/features/templates/TemplateFormFields.tsx`
  - 将模板添加表单重组为单区块紧凑布局
  - 活动类型改为单选 tag
  - 时间场景保留多选 tag，并将新增入口改为 `+` tag
  - 新增活动类型入口也改为 `+` tag
  - 删除“内容 / 时间场景 / 重复规则”等结构说明文字
  - 将“必要事项 + 重复规则”合并为一行，并按条件显示日期输入
  - 将“需要准备 + 分次事项”合并为一行
- 更新 `src/features/templates/CreateTaskTemplateForm.tsx`
  - 提交时按条件写入模板日期
  - 移除更多设置展开逻辑
- 更新 `src/features/templates/TemplateManagerPanel.tsx`
  - 编辑时沿用新的条件日期逻辑
  - 模板列表遇到空日期时不再渲染空白日期行
- 更新 `src/styles/globals.css`
  - 为紧凑单区块表单补齐行内排布、tag、toggle、输入框样式
  - 继续压缩移动端表单高度
- 更新 `product-rules.md`
- 更新 `data-model.md`
- 更新 `app-structure.md`

### 本轮删除的说明文案
- `内容`
- `时间场景`
- `重复规则`
- `核心字段`
- `先填日期、类型和内容`
- `常用设置`
- `用标签补充识别信息`
- `自动进入当天计划`
- 原有更多设置的结构性提示

### 本轮验证结果
- `npm run build`：通过
- `npm run lint`：通过

### 当前结论
- 模板添加区已从“长网页表单”转向“单区块紧凑录入面板”
- 日期逻辑已收敛为条件显隐，不再给所有模板默认写今天

### 当前风险与待确认问题
- 新增活动类型 / 时间场景的 inline tag 输入目前仍主要依赖键盘提交，后续如继续做移动端细修，可再评估是否需要更强的完成反馈
