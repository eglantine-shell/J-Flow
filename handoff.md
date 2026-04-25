# 项目交接摘要

## 当前版本目标
- 交付一个可本地试用的单人网页 MVP，围绕“决策库模板 + 当天实例层”完成初始化、录入、自动入计划、推荐选入、Todo 执行与模板管理的主路径闭环。

## 当前阶段结论
- V1 第一版已封板。
- 当前状态应视为“可试用 MVP 已完成”，下一步以真实试用、问题反馈、回归补强和后续迭代为主。
- 当前不应再把它表述为正式稳定产品。

## 当前已完成功能
- 首次初始化流程：时间场景与活动类型初始化、完成前路由拦截、完成后进入主页面。
- 本地存储层：`AppData` 统一读写、默认 seed、轻量校验、基础 CRUD。
- 主页面 UI：已完成一轮 light mode 信息结构重构，顶部日期区、模式切换、决策 / Todo 主区、底部添加区的层级已重新梳理。
- 决策库录入：新增 `TaskTemplate`，支持日期、活动类型、时间场景、兴趣程度、必要、准备、日历型重复、分次。
- 决策库录入：支持在录入表单内现场新增时间场景与活动类型，并立即用于当前提交。
- 自动入计划：根据 `selectedDate` 惰性生成并持久化 `auto_generated DayPlanItem` 与需要的 `RecurringTaskInstance`。
- 决策模式推荐：按活动类型与轻量场景匹配推荐候选，支持生成 `decision_selected DayPlanItem`。
- Todo 模式：基于 `DayPlanItem` 展示真实实例列表，支持非分次完成、准备备注查看、来源区分、白天/晚上样式。
- 临时事项：Todo 模式支持 `manual_temporary` 的快速新增与删除。
- 分次推进：对已有分次实例支持显式保存进度，100% 时完成并最小同步关联周期实例。
- 模板管理：查看未归档模板、编辑模板、停用模板（`isArchived = true`）。

## 当前主路径
1. 首次进入应用，在 Setup 完成时间场景与活动类型初始化。
2. 进入 Home，默认查看当天日期。
3. 在底部添加区创建决策库模板。
4. 在决策模式查看当天自动进入计划的事项。
5. 在白天或晚上语境点击“增加安排”，选择活动类型并接受推荐或从候选列表中选入。
6. 切换到 Todo 模式，完成普通事项、推进分次事项、查看准备备注、添加/删除临时事项。
7. 在模板管理面板中编辑或停用模板；这些变更只影响未来自动生成与未来推荐。

## 最近一次完成的 task
- 修正了设置入口图标：
  - 统一改为更明确的线条齿轮状 icon
  - 与 Todo 临时事项中的太阳图标拉开识别差异
- 同步完成 V1 第一版封板文档：
  - `README.md`
  - `dev-log.md`
  - `handoff.md`

## V1 第一版已具备能力
- 首次初始化
- 主页面日期切换
- Todo / 决策模式
- 决策库模板新增
- 活动类型 / 时间场景 tag 式新增与删除
- 条件日期
- 自动入计划
- 决策推荐选入
- Todo 临时事项
- 普通事项完成
- 分次事项进度推进
- 模板管理 / 停用
- 设置页
- 测试专用重置
- GitHub Pages 部署配置

## 下一步最推荐做什么
- 进入真实试用与反馈整理阶段，优先完整走一遍“初始化 → 模板录入 → 决策推荐 → Todo → 设置 / 重置 → 再初始化”的试用路径。
- 优先补最小业务测试、关键交互回归清单和问题修复，而不是继续扩写新功能。
- 若进入 V1 后续迭代，可按优先级评估：拖动排序、导出 / 导入、已归档恢复、搜索 / 筛选、更多 UI polish。

## 当前已知边界 / 技术债
- 暂无自动化业务测试，当前主要依赖 `pnpm run build` 与 `pnpm run lint`。
- 推荐、Todo、模板管理与设置页的交互都已可用；当前仍缺导出 / 搜索 / 已归档恢复与业务测试覆盖。
- 模板当前只支持停用，不支持物理删除、查看已归档或恢复已归档。
- 决策模式尚未实现拖动排序、语境切换与排序编辑。
- 导出/清空数据、搜索/筛选等能力仍未实现；清空数据目前仅提供测试专用重置入口。
- `consumesDateTrigger` 仅有最小消费语义实现，不支持回滚与复杂历史修复。
- 分次事项在保存为 100% 后不可回退。
- 模板录入内已具备全局 tag 删除能力，后续若继续产品化，可再评估是否需要更强确认反馈或撤销能力。
- 多设备同步、提醒、天气 API、原生能力都不属于当前 V1 范围。
- GitHub Pages 首次启用仍需在仓库网页里把 Pages Source 切换到 `GitHub Actions`。
- 部署工作流当前已统一为 `pnpm`，依赖 `pnpm-lock.yaml` 保持 CI 可重复安装。
- GitHub Actions workflow 已修正为先安装 `pnpm`，并升级到 Node 24 runtime 兼容的 action 版本。
- 路由已补齐与 Vite `BASE_URL` 一致的 `basename`，并为 GitHub Pages 子路径刷新补了 `404.html` SPA fallback。

## 关键文件位置
- `AGENTS.md`
- `dev-log.md`
- `.github/workflows/deploy.yml`
- `src/pages/home/HomePage.tsx`
- `src/db/storage.ts`
- `src/types/models.ts`
- `src/features/recurrence/auto-generated.ts`
- `src/features/decision/recommendation.ts`
- `src/features/todo/TodoModePanel.tsx`
- `src/features/templates/CreateTaskTemplateForm.tsx`
- `src/features/templates/TemplateManagerPanel.tsx`
- `src/features/templates/TemplateFormFields.tsx`

## 最近一次验证结果
- 最近完成了一轮初始化 / 顶部 / 模板表单 / 设置页 UI 收口：
  - `pnpm run build`：通过
  - `pnpm run lint`：通过
