# 项目交接摘要

## 当前版本目标
- 交付一个可本地试用的单人网页 MVP，围绕“决策库模板 + 当天实例层”完成初始化、录入、自动入计划、推荐选入、Todo 执行与模板管理的主路径闭环。

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
- 移动端与桌面端对齐修正
- 已修正移动端品牌头部、日期区和 Todo 快速新增区与桌面端不一致的问题
- 决策库入口和日期输入控件也已做双端一致性修正

## 下一步最推荐做什么
- 先基于这一版双端更一致的首页做一轮真实试用，确认手机与桌面端关键布局是否都达到同一感受。
- 若继续做 UI，再回到推荐面板、模板管理展开态和长表单的进一步压缩。
- 工程侧已补齐 GitHub Pages 部署配置，可直接进入仓库级部署验证。

## 当前已知边界 / 技术债
- 暂无自动化业务测试，当前主要依赖 `npm run build` 与 `npm run lint`。
- 推荐、Todo、模板管理的交互都已可用，当前首页首屏已更紧凑，但展开后的推荐 / 模板区域仍有进一步压缩空间。
- 模板当前只支持停用，不支持物理删除、查看已归档或恢复已归档。
- 决策模式尚未实现拖动排序、语境切换与排序编辑。
- 设置页、导出/清空数据、搜索/筛选等能力仍未实现。
- `consumesDateTrigger` 仅有最小消费语义实现，不支持回滚与复杂历史修复。
- 分次事项在保存为 100% 后不可回退。
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
- 最近完成了一轮移动端与桌面端对齐修正：
  - `npm run build`：通过
  - `npm run lint`：通过
