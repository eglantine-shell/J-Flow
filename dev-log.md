# Dev Log

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
