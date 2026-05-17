# 项目交接摘要

## 最新状态（2026-05-17，GitHub 发布前整理，优先参考）
- 本轮目标不是开发新功能，而是整理仓库对外可读性。
- 本轮未改：
  - 业务逻辑
  - UI
  - 存储层
  - Electron main / preload 行为
- 本轮已完成：
  - `README.md` 重写为面向 GitHub 读者的项目介绍
  - 新增：
    - `docs/README.md`
  - `.gitignore` 已补齐构建产物、缓存、日志、本地数据库、备份目录等忽略规则
- 当前仓库整理策略：
  - 根目录继续保留当前有效规则文档
  - `docs/README.md` 作为内部开发资料索引
  - 暂不直接把根目录规则文档整体迁入 `docs/`
- 暂不整体迁移的原因：
  - `AGENTS.md` 当前要求新任务开始前优先读取根目录下的这些文档
  - 若直接迁移，会先破坏现有协作约定
- 当前打包产物说明已在 `README.md` 中收口：
  - `electron-builder` 输出目录：
    - `release/`
  - 当前最新 macOS 自用包：
    - `release/J-Flow-V1.4.dmg`
  - 当前 Windows portable 包：
    - `release/J-Flow-V1-win-portable.exe`
- 本轮已验证：
  - `corepack pnpm run lint`
  - `corepack pnpm run build`
  - `corepack pnpm run build:desktop`
  均已通过
- 当前后续建议：
  - push 到 GitHub 前人工确认是否保留根目录：
    - `J-Flow.PNG`
    - `logo.PNG`
  - 若未来要正式迁移开发文档到 `docs/`，先同步调整：
    - `AGENTS.md`
    - 各文档交叉引用
    - 新任务启动阅读顺序
- 用户后续已确认：
  - 根目录图片资源继续保留
  - 接受当前兼容方案
  - 不再做文档迁移
  - `release/` 历史本地产物可清理
- 当前 `release/` 已清理为仅保留：
  - `release/J-Flow-V1.4.dmg`

## 最新状态（2026-05-17，优先参考）
- 当前已将 macOS 打包产物版本名从：
  - `J-Flow-V1.3.dmg`
  调整为：
  - `J-Flow-V1.4.dmg`
- 本轮已实际执行：
  - `corepack pnpm run package:mac`
- 当前已产出：
  - `release/J-Flow-V1.4.dmg`

## 最新状态（2026-05-15，优先参考）
- 分次事项的日志口径又补了一轮：
  - 不新增 `当日推进` 分区
  - 若分次事项当天有推进，且到当天结束时仍未完成
  - 则在 `当日未完成` 中优先显示：
    - `推进 xxx 20% -> 40%`
- 当前“推进总量”采用：
  - 当天第一次推进前的起点
  - 到当天最后一次推进后的进度
- 数据层本轮新增：
  - `segmentedProgressLogs`
  - SQLite 新表：
    - `segmented_progress_logs`
- 当前这轮已通过：
  - `corepack pnpm run lint`
  - `corepack pnpm exec vitest run src/features/logbook/logbook-service.test.ts src/db/storage.test.ts electron/sqlite.test.ts`
  - `corepack pnpm run build`

## 最新状态（2026-05-15，优先参考）
- 日志页又补了一条轻量操作：
  - 每条“当日快照”现在支持直接删除
  - 删除前会提示是否永久删除
- 当前删除范围仅限：
  - 这条 `logbook entry` 本身
  - 不会反向删除原始 Todo 或别的日期日志
- 当前这轮已通过：
  - `corepack pnpm run lint`
  - `corepack pnpm run build`

## 最新状态（2026-05-05，优先参考）
- 已修复一个已打包版本回归：
  - `logbookEntries.completedItems.time` 之前写入为全角时间 `HH：mm`
  - schema 却只接受半角 `HH:mm`
  - 导致打开应用时初始化读取日志失败
- 当前已改为：
  - schema 同时接受半角 / 全角时间格式
- 修复后已重新打包：
  - `release/J-Flow-V1.3.dmg`
- 当前已将 macOS 打包产物版本名从：
  - `J-Flow-V1.2.dmg`
  调整为：
  - `J-Flow-V1.3.dmg`
- 本轮已实际执行：
  - `corepack pnpm run package:mac`
- 当前已产出：
  - `release/J-Flow-V1.3.dmg`
- Todo 侧“垃圾桶页”方向已取消，改为：
  - Sidebar 导航中的 `垃圾桶` 替换为 `日志`
  - 新增独立 `Logbook` 页
- 当前日志规则首版已落地：
  - 每次进入 Todo 同步链路前，会先检查并补生成“昨天”的日志
  - 日志内容包含：
    - 当日完成
    - 当日未完成
    - 当日删除
    - 备注
  - `未完成` 仅记录当天页面上仍存在的 pending
  - 手动改到未来日期的事项，不算当天未完成
  - 分次未完成事项会在标题后追加：
    - `进度：x%`
  - 来源于种草且完成的事项记为：
    - `拔草`
  - 备注可编辑，其余正文是只读快照
  - 每天日志支持一键复制 Markdown
- 数据层本轮新增：
  - `dayPlanItems.deletedAt`
  - `appData.logbookEntries`
  - SQLite 新表：
    - `logbook_entries`
- 种草删除确认文案已改为：
  - `确认永久删除种草条目「xx」吗？`
- 当前这轮已通过：
  - `corepack pnpm run lint`
  - `corepack pnpm run build`
  - `corepack pnpm exec vitest run src/db/storage.test.ts electron/sqlite.test.ts`
- 当前首版已知边界：
  - 现在只稳定补生成“昨天”的日志。
  - 若应用连续多天完全未打开，历史更早天的“未完成快照”目前不会自动追补重建，这是当前最小稳定实现。

## 最新状态（2026-05-04，优先参考）
- 当前又补了一轮 Todo 计划日期调整：
  - quick add / 编辑共用面板第一行新增日历入口
  - 新增 Todo 时可直接指定未来日期
  - 未完成普通 Todo 可直接改当前计划日期
  - 改到未来日期后，中间日期不再继续顺延显示
  - 到了新日期后，再按现有顺延规则继续运行
  - repeating Todo 默认只改当前 occurrence 的显示日期
  - 不改整条重复规则
  - 已完成事项仍不开放改计划日期
- UI 要点：
  - 日历入口与“普通/拔草”“日夜”保持同一行
  - 模式切换已轻压宽度与字号，避免拉长浮层
- 当前这轮已通过：
  - `corepack pnpm run lint`
  - `corepack pnpm run build`

## 最新状态（2026-05-03，补充）
- 本轮又追加完成：
  - 种草清单支持直接编辑条目内容
  - 当前仅编辑 `title`
  - 不支持在该入口修改 tag
- Mac 打包配置已更新为：
  - 打包前自动将根目录 `J-Flow.PNG` 同步为 `build/icon.png`
  - `.dmg` 产物名改为：
    - `J-Flow-V1.2.dmg`
- 当前仍未实际执行本轮 `.dmg` 打包，只完成了配置更新。
- 若下轮需要打包，优先使用：
  - `corepack pnpm run package:mac`

## 最新状态（2026-05-03，优先参考）
- 当前主线仍是：
  - `J-Flow V3 Desktop`
- 本轮新增小修目标：
  - 设置页追加“完成时间取整”
- 当前本轮已完成：
  - `AppSettings` 新增：
    - `completedAtRoundingMinutes`
  - 默认值已定为：
    - `5 分钟取整`
  - 取值已支持：
    - 不取整
    - 5 分钟取整
    - 10 分钟取整
    - 30 分钟取整
  - Todo 勾选完成时，`completedAt` 已按设置自动取整写入
  - 已完成事项手动修改完成时间仍保留精确输入，不二次取整
  - Web 本地旧数据 / 导入备份缺少该字段时，会自动回落到默认 `5`
  - SQLite 旧库已补兼容列：
    - `completed_time_rounding_minutes`
- 本轮同时新增记录：
  - 应用程序图标已经更新为根目录：
    - `J-Flow.PNG`
  - 下次打包前，需要同步检查并更新打包图标资源链路
- 当前这份 `handoff.md` 下方保留较长历史记录；若与本节冲突，以本节、`product-rules.md`、`dev-log.md` 最新记录为准。

## 最新状态（2026-05-02，优先参考）
- 当前已进入：
  - `V3.4 Windows Compatibility`
- 本轮目标不是重写 Windows 版，而是在现有 Electron Desktop 基础上新增 Windows target。
- 当前已完成：
  - 新增 `package:win`
  - `electron-builder` 已扩展 Windows `portable` target
  - 已复查并确认以下路径逻辑未写死 macOS：
    - Electron `userData` 数据目录
    - SQLite 主库路径
    - JSON 自动备份目录
    - 打开数据目录逻辑
    - 导入 / 导出文件对话框默认路径
    - icon 打包路径
  - 保留：
    - `package:mac`
    - Web `build`
    - Desktop `build:desktop`
- 当前已验证：
  - `corepack pnpm run lint`
  - `corepack pnpm run build`
  - `corepack pnpm run build:desktop`
  均已通过
- 当前 Windows 打包现状：
  - 2026-05-02 已通过镜像环境变量在 macOS 环境产出：
    - `release/J-Flow-V1-win-portable.exe`
  - 本次使用过的镜像环境变量：
    - `ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/`
    - `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`
  - 当前已知问题：
    - Windows 设备打开首包后“没有反应”
    - 后续计划是在 Windows 真机上继续跑 Codex 并排查
- 当前整体进度状态：
  - Web 端继续保持可用
  - macOS `V1` 版本正在实用测试中
  - Windows 端处于“已产出首包、待真机排查”状态
- Windows 数据安全结论：
  - Windows 用户数据目录继续走 Electron `app.getPath('userData')`
  - SQLite 主库为：
    - `<userData>/j-flow.sqlite3`
  - JSON 自动备份目录为：
    - `<userData>/backups`
  - 第一轮 `portable` 不会把用户数据写进应用目录
  - 从 macOS 迁移到 Windows，推荐走 JSON 导出 / 导入，而不是直接复制 SQLite
- 当前这份 `handoff.md` 下方保留较长历史记录；若与本节冲突，以本节、`product-rules.md`、`dev-log.md` 最新记录为准。

## 最新状态（2026-05-01，优先参考）
- 当前已完成：
  - `V3.3`：
    - Desktop 主库存储切到 SQLite
    - Desktop `app-data service`
    - 桌面化导入 / 导出
    - 自动备份第一版
    - 数据目录 / 主库文件说明收口
  - `V3.4` 前置：
    - `package:mac` 第一版已可产出本机可用 `.dmg`
- 当前最新进行中的主线是：
  - `V3 Desktop UI Pass 01`
- 本轮已完成的 UI 初调：
  - `AppShell` 改为更像桌面应用 toolbar
  - 今日页改为更稳定的 workspace + quick capture 结构
  - 种草清单页改为更像 manager list
  - 设置页改为更像 app preferences
  - 全局控件和面板层级已做第一轮桌面化收口
- 本轮又完成了第一轮人工方向调整：
  - 布局已改为左侧 Sidebar + 右侧 workspace
  - 左侧接入常驻月历
  - Sidebar 已包含：
    - `TODO`
    - `种草清单`
    - `垃圾桶`（占位）
    - `设置`
  - 右侧主页改为：
    - 黄色 `+` 打开浮层 Quick add
    - Todo 单大卡片承载白天 / 晚上 / 已完成
    - 底部种草区改为 bottom sheet 风格
- 当前又完成了第二轮人工细修：
  - Sidebar 已适当放宽
  - `J-Flow` 右对齐
  - 副标题改为：
    - `J人用的拔草todo`
  - Quick add 入口改为 Todo 卡片内白色条目
  - Quick add 浮层已放大，并支持点击外部时保存并关闭
  - Todo 区已去掉 `DAY / NIGHT` 说明文字
  - 快速种草标题改为：
    - `GRASS 种草`
  - 种草清单 / 垃圾桶 / 设置页头文案已进一步统一收口
- 随后又补了一轮返工：
  - 删除 Todo 顶部残留独立 `+`
  - Quick add 浮层改为更窄、更高
  - 设置页头改成与其他页面同结构
  - 种草清单单行密度继续下压
- 本轮又完成了独立页结构统一修复：
  - 种草清单 / 垃圾桶 / 设置 三个独立页已统一回同一套页面壳
  - 设置页已去掉单独的页级外层结构，标题间距已按统一基线收口
  - 种草清单页已收口标题下首屏控件区，不再像松散拼接页面
- 当前这份 `handoff.md` 下方保留了较长历史阶段记录；若与本节冲突，以本节与 `product-rules.md`、`dev-log.md` 最新记录为准。

## 当前阶段
- 当前已进入阶段切换：`J-Flow V2 Web` 收口完成，后续主线切换为 `J-Flow V3 Desktop`。
- 已部署网页端地址：
  - `https://eglantine-shell.github.io/J-Flow/`
- 该网页端是 `V2` 阶段结果。
- 网页端当前已经基本可用，但仍存在若干业务逻辑与 UI 缺陷。
- 由于当前网页 UI 已经不适合继续反复调整，网页端暂时不再继续增改。
- “网页端暂不更新”不等于废弃网页端：
  - 网页端继续作为已部署、可试用、可参考的 `V2` 版本保留
  - 未来待 `V3 Desktop` 稳定后，再评估是否将部分能力回写到网页端
- 当前已进入 `V3.0 Desktop Foundation` 第一轮代码落地：
  - 最小 Electron 骨架已接入
  - 网页端 `dev/build` 保持可用
  - macOS 桌面开发链路已跑通
  - Electron 桌面窗口已可打开并显示现有 J-Flow 页面
  - 当前仍未进入打包 / SQLite / 数据目录迁移
- 当前已进入 `V3.1 Core Fixes` 第一轮：
  - 已完成“天气占位改日历跳转”
  - 主页现已支持通过日历图标跳转到任意日期
  - Web / Desktop 共用同一套日期状态入口
- 当前已进入 `V3.1 Core Fixes` 第二轮：
  - 已完成“完成事项自动下沉 + completedAt + 完成时间修改”
  - 已完成事项统一显示在列表底部
  - 已完成事项按 `completedAt` 从早到晚排序
  - 已完成事项支持修改完成时间
  - 已完成事项改为中性无色样式
- 当前已进入 `V3.1 Core Fixes` 第三轮：
  - 已完成“重复规则扩充”
  - 重复规则已从旧五类枚举升级为：
    - `none`
    - `calendar`
    - `afterCompletion`
  - 当前代码仍保留旧 `recurrence` 字段作为兼容层
  - 新增 UI 已支持：
    - 不重复
    - 按日历重复
    - 完成后重复
    - 间隔数字 1-100
    - 单位 天 / 周 / 月 / 年
- 当前已完成本轮规则落地：
  - 已完成事项按完成日期归属显示，而不是按原计划日期显示
  - 修改 `completedAt` 后，事项会迁移到对应完成日期的已完成区
  - 取消完成后，事项回到当前有效计划日期的未完成区
  - 若事项此前已被顺延到今天，则取消完成后回到今天，而不是误回更早历史日期
  - 停止重复时，保留当前与既往 occurrence，清理 future occurrence
  - 恢复重复时继续采用“切到日期再生成”的懒生成策略

## 当前有效方向

### V2 Web 的定位
- 作为已上线、可试用的参考版本继续保留。
- 保留现有 React / Vite / TypeScript 网页构建能力。
- 不删除现有页面、历史文档、既有实现。
- 原则上不再继续承接新的功能扩展、复杂规则重做与 UI 大改。

### V3 Desktop 的定位
- 下一阶段命名为：`J-Flow V3 Desktop`
- 当前目标是 Electron 跨平台桌面版。
- 第一阶段优先在 macOS 上开发、自测和试用。
- Windows 作为后续适配与打包目标，不作为当前每轮开发阻塞项。
- 第一目标不是追求最小包体，而是尽快得到一个：
  - 可长期自用
  - 本地储存稳定
  - 便于持续迭代
  - 便于数据迁移与备份
  的桌面工具。
- 技术方案优先采用 `Electron`，暂不优先引入 `Tauri/Rust` 复杂度。

### 当前 V3.1 已完成项
- 第一项已完成：
  - 取消天气占位
  - 改为日历图标与任意日期跳转
- 第二项已完成：
  - 完成事项自动下沉
  - `completedAt` 正式用于完成排序
  - 已完成事项支持修改完成时间
- 第三项已完成：
  - 重复规则扩充
  - 旧五类重复规则兼容读取
  - `completedAt` 正式作为完成后重复基准
- 本轮已完成的补充规则：
  - 已完成事项按完成日期归属显示
  - 修改完成时间后跨日期迁移
  - 停止重复清理 future occurrence
  - 恢复重复继续懒生成
- 第五项已完成：
  - Todo 手动排序
  - 排序模式 + 上移 / 下移按钮
  - 复用 `sortOrder`
  - 已完成事项不参与排序
  - 排序模式显示白天 / 晚上分隔线
  - 跨分隔线移动时，同步更新当前日期实例 `timeBlock`
  - 本轮已修复跨日夜分界线 bug：
    - 跨线移动不再把另一条 item 一起挤到对侧
    - 只改变移动中的 item 的 day/night 归属
  - 本轮已补修空组边界 bug：
    - 白天无事项时，晚上第一条可上移到白天
    - 晚上无事项时，白天最后一条可下移到晚上
- 当前 V3.2 第一轮已完成：
  - 顶部导航支持：
    - 今日
    - 种草清单
    - 设置
  - 种草清单已迁出为独立页面
  - 主页保留轻量种草输入与保存
  - 主页不再承载完整种草清单浏览
- 当前 V3.2 第二轮已完成：
  - 主页底部种草区支持批量种草
  - 使用多行输入框
  - 每行生成一条独立种草项
  - 空行自动忽略
  - 单次最多 20 条
  - 本轮已补修批量落库 bug：
    - 创建流程已从并发写入改为顺序写入
  - 本轮同时补修存储层竞态：
    - `mutateAppData(...)` 改为事务内读取与写回
    - 降低旧快照覆盖新写入的风险
- 2026-04-30 本轮紧急状态补充：
  - 已修复 `CreateTaskTemplateForm.tsx` 中残留 merge 冲突导致的白屏
  - 当前页面已恢复为可编译状态
  - 批量种草“最终只落最后一条”的业务问题仍需继续确认，不能仅凭此前文档结论视为已彻底解决
- 2026-04-30 本轮收口补充：
  - 已为批量种草补最小自动化测试：
    - 多行解析与 20 条上限校验
    - 存储层连续创建不丢前项
    - `sceneTagIds` 不再与调用方共享数组引用
  - `build` / `build:desktop` 脚本已改为直接命令链
  - 当前 `corepack pnpm run build` 与 `corepack pnpm run build:desktop` 均已通过
- 当前 V3.2 第三轮已完成：
  - 种草清单页支持直接加入真实今日白天
  - 每条未完成种草新增轻量 `TODO` 按钮
  - 已排入未完成 Todo 的条目显示：
    - `已排在 M/D`
  - 已在今日白天或晚上的条目：
    - 按钮禁用
  - 已在其他日期未完成 Todo 中的条目：
    - 点击后移动原 Todo 到真实今日白天
    - 不新建副本
  - 种草清单展示范围已调整为：
    - 所有未完成种草
    - 不再仅限 `active`
- 当前 V3.3 第一轮已完成：
  - 设置页支持桌面化 JSON 导入 / 导出
  - 桌面环境下改用系统文件对话框，而不是浏览器下载 / 上传
  - 设置页支持显示当前桌面数据目录
  - 设置页支持“打开数据目录”
  - Web 环境仍保留原有导入 / 导出回退
- 当前 V3.3 第二轮已完成：
  - Desktop 主库存储第一版已切到 SQLite
  - Electron main 现持有 SQLite 主库
  - renderer 通过 preload bridge 读写桌面主库快照
  - Web 继续保留 Dexie
  - SQLite 当前表结构已落地：
    - `meta`
    - `settings`
    - `scene_tags`
    - `activity_types`
    - `task_templates`
    - `recurring_task_instances`
    - `day_plan_items`
  - 首次 Desktop SQLite 为空时：
    - 优先尝试从当前可读的旧 Dexie 快照迁移
    - 读不到旧快照时回退到 seed
  - 当前仍不是最终形态的细粒度 SQLite repository：
    - renderer 侧仍复用快照式仓库逻辑
    - Desktop 通过 revision 控制快照替换并发
  - 2026-05-01 已补修 Desktop 启动误触 IndexedDB 问题：
    - `src/db/index.ts` 不再默认 re-export Dexie client
    - `src/db/storage.ts` 中 Web 侧 Dexie 保持按需加载
    - 当前 Desktop 初始化默认应只走 SQLite bridge
- 当前 V3.3 第三轮已完成第一版：
  - Desktop 实体级 SQLite repository 已开始落地
  - `window.jflowDesktop.repository` 已接入：
    - `settings`
    - `sceneTags`
    - `activityTypes`
    - `taskTemplates`
    - `recurringTaskInstances`
    - `dayPlanItems`
  - `src/db/storage.ts` 中上述实体的 Desktop 分支，已优先改走 main 侧实体级 IPC
  - 快照桥当前仍保留给：
    - `get / replace / update / reset / import / export`
    - 首次旧 Dexie -> SQLite 迁移
  - 当前仍是“实体 CRUD 已下沉、组合动作部分仍在 renderer 编排”的过渡形态
- 当前 V3.3 第三轮补收口已完成：
  - Desktop 下 `getAppData()` 已优先改走 main 侧聚合读取
  - `sceneTags.deleteAndDetachTemplates` 已下沉到 SQLite 事务
  - `activityTypes.deleteIfUnused` 已下沉到 SQLite 事务
  - 当前 Desktop 主路径已进一步摆脱 renderer 侧“先查再改”编排
- 当前 V3.3 第三轮再收口已完成：
  - 外部日常业务代码已不再直接调用：
    - `appDataRepository.update`
    - `appDataRepository.replace`
  - 已改走实体级 CRUD 的路径包括：
    - 批量种草兜底补写
    - 停止重复
    - Todo 手动排序
    - recurrence 自动生成同步
    - Todo 顺延 carryover
  - 当前仅 `SetupPage` 仍保留整包 `replaceAppData`
    - 作为初始化完成时的合理整包落盘语义
- 当前 V3.3 第三轮最终收口已完成：
  - `storage.ts` 中 Desktop 下的：
    - `get`
    - `replace`
    - `reset`
    - `import`
    - `export`
    - `update`
    已统一改走更明确的 `appData service`
  - `storage.ts` 不再自行处理 Desktop 的 snapshot revision retry 细节
  - 当前快照替换语义已经退到 Electron main 受控实现层
- 当前 V3.3 第四轮已完成第一版：
  - 桌面版自动备份已接入
  - 自动备份目录：
    - 数据目录下 `backups/`
  - 自动备份当前默认：
    - 使用完整 JSON 快照
    - 最多保留最近 `20` 份
    - 启动时做当日备份检查
    - `replace / reset / import` 后自动补备份
- 当前 V3.3 第四轮补充已完成：
  - 已为 SQLite / `app-data service` 补最小自动化测试
  - 新增覆盖：
    - `electron/sqlite.test.ts`
    - `electron/backup.test.ts`
    - `src/db/storage.desktop.test.ts`
  - 当前已验证：
    - SQLite 核心 repository 代表路径
    - 自动备份生成 / 跳过 / 轮换
    - Desktop `appData service` 接线不再依赖旧 snapshot bridge
  - `build:desktop` 已显式排除 Electron `*.test.ts`
    - 测试可运行
    - 桌面构建不再被测试编译约束干扰
- 2026-05-01 本轮测试收口补充：
  - 自动备份轮换测试已移除真实时间等待
  - `electron/backup.ts` 当前支持最小可选时钟注入：
    - 默认仍使用真实系统时间
    - 仅用于测试中构造时间序列
  - 自动备份测试耗时已从秒级等待降为毫秒级
  - 当前自动备份目录位于数据目录下：
    - `backups/`
  - 自动备份格式：
    - 完整 JSON 快照
  - 自动备份触发时机：
    - 应用启动后的当日备份检查
    - `appData.replace`
    - `appData.reset`
    - `appData.import`
  - 自动备份轮换策略：
    - 最多保留最近 `20` 份
  - 设置页已新增：
    - 自动备份目录展示
    - 最近一次自动备份时间
    - 自动备份数量
    - “立即创建备份”
    - “打开备份目录”
- 2026-05-01 本轮说明收口补充：
  - 设置页现在会同时展示：
    - 桌面数据目录
    - 当前 SQLite 主库文件路径
  - 当前桌面口径已统一为：
    - 运行时主库：`SQLite`
    - 主库文件：`j-flow.sqlite3`
    - 主库位置：Electron `userData` 目录内
    - 自动备份目录：数据目录下 `backups/`
    - 手动导出 JSON：通过系统文件对话框选择保存位置，不强制写回数据目录
- 当前未开始 / 未完成：
  - `updateAppData` 在 Desktop 下仍保留为过渡层
  - main 侧更细粒度的 batch / transaction service 仍可继续扩充
  - 自动备份的后续增强：
    - 开关
    - 自定义保留数量
    - 备份列表
    - 选择某份自动备份恢复
  - 代码签名 / 公证

- 2026-05-01 打包前收口已开始：
  - README 已更新到当前 Desktop 真实状态
  - 手测清单已补：
    - macOS 打包前验收
    - `.dmg` 第一版验收
  - `package.json` 已接入最小 `electron-builder` 配置与 `package:mac`
  - 当前目标为：
    - 产出本机自用、未签名的 `.dmg`
    - 不做公证 / App Store / 发布级分发
- 2026-05-01 `package:mac` 第一版已完成：
  - 已新增：
    - `package:mac`
    - 最小 `electron-builder` 配置
  - 已补：
    - `README.md` 当前状态
    - `manual-test-checklist.md` 的 macOS 打包前验收与 `.dmg` 验收
  - 为兼容当前无全局 `pnpm` 环境：
    - 新增 `scripts/pnpm` shim
    - `package:mac` 运行时会把该 shim 加入 PATH
  - 为避免打包时重复下载 Electron：
    - `electron-builder` 当前复用本地 `node_modules/electron/dist`
  - 当前已产出并校验：
    - `release/mac-arm64/J-Flow.app`
    - `release/J-Flow-0.1.0.dmg`
    - `hdiutil verify` 已通过
  - 当前仍属第一版限制：
    - 未签名
    - 未公证
    - 使用默认 Electron 图标

## V3 Desktop 推荐技术方案

### 架构分层
- `main process`
  - 应用生命周期
  - BrowserWindow 创建
  - 数据目录定位
  - 本地数据库访问
  - 导入 / 导出
  - 自动备份
  - 打开数据文件夹
  - 未来同步入口
- `preload`
  - 暴露受控桌面 API 给渲染层
  - 隔离 Node / 文件系统能力
  - 避免渲染层直接持有完整本地权限
- `renderer`
  - 继续承载现有 React UI
  - 路由、状态管理、表单、视图组件、业务展示逻辑尽量复用

### 与现有 Vite / React 项目的接入方式
- 保留现有前端项目作为 renderer 基础。
- 将桌面能力抽象为 repository / bridge 层，而不是把 Electron 能力散落到业务组件里。
- 网页端继续使用现有 Dexie/IndexedDB adapter。
- 桌面端新增 desktop storage adapter，后续对接 SQLite。
- 当前第一轮实际落地文件：
  - `electron/main.ts`
  - `electron/preload.ts`
  - `electron/tsconfig.json`

### 打包与命令建议
- 打包工具优先：`electron-builder`
- 推荐后续命令：
  - `pnpm run dev`
    - 保留网页端开发
    - 默认端口：`5173`
  - `pnpm run build`
    - 保留网页端生产构建
  - `pnpm run build:web`
    - 保留网页端构建
  - `pnpm run build:electron`
    - 编译 Electron 主进程与 preload
  - `pnpm run dev:desktop`
    - 启动 Vite + Electron 开发模式，优先在 macOS 跑通
    - Desktop renderer 默认端口：`4173`
  - `pnpm run build:desktop`
    - 构建 renderer 与 Electron 产物
  - `pnpm run package:win`
    - 后续打 Windows 安装包

### 当前 dev 链路状态
- Web dev：
  - 使用 `pnpm run dev`
  - 默认端口 `5173`
- Desktop dev：
  - 使用 `pnpm run dev:desktop`
  - Desktop renderer 默认端口 `4173`
- Electron dev URL 当前已固定为：
  - `http://localhost:4173/J-Flow/`
- `wait-on` 当前等待真实页面可访问后再启动 Electron。
- `loadURL` 已增加基本错误处理。

## V3 本地储存方案结论

### 推荐结论
- V3 第一阶段推荐：
  - 运行时主数据库：`SQLite`
  - 完整备份 / 导入 / 导出格式：`JSON`
- 不建议继续长期依赖 `IndexedDB` 作为桌面端主库。
- 不建议仅依赖单个巨大 JSON 文件作为运行时数据库。

### 方案比较结论
- `Dexie / IndexedDB`
  - 优点：复用现有代码最多，迁移成本低
  - 缺点：桌面端数据定位、迁移、备份、恢复体验都不理想
- `SQLite`
  - 优点：更适合桌面端本地数据库、schema version、migration、备份恢复
  - 缺点：接入成本高于 IndexedDB
- `JSON`
  - 优点：可读、适合导入导出
  - 缺点：不适合作为长期运行时主数据库

### V3 里程碑推荐落点
- `V3.0`：
  - Electron 跨平台桌面骨架
  - macOS 优先跑通
- `V3.1`：
  - 在 macOS 桌面版中完成核心功能修复
- `V3.2`：
  - 种草清单独立页面
  - 批量种草
- `V3.3`：
  - 本地数据库
  - 导入 / 导出
  - 自动备份
  - 数据目录管理
- `V3.4`：
  - Windows 兼容性
  - Windows 打包
  - Windows 真机测试与路径适配

### 数据目录与安全策略
- 默认数据目录应按平台分别落位：
  - macOS 使用用户应用支持目录
  - Windows 后续适配到对应用户应用数据目录
- 数据目录、文件读写、数据库访问应尽量按跨平台方式设计。
- 后续支持：
  - 打开数据文件夹
  - 自定义数据目录
  - 自动备份
  - schema version / migration
  - 导入前校验
  - 临时文件写入与原子替换

## V3 必做功能方向

### 1. 日历跳转
- 删除天气方向。
- 顶部天气占位图标改为日历图标。
- 点击后打开日期选择器，跳转到任意一天查看 / 编辑 / 补录 Todo。

### 2. 重复规则扩充
- 从旧的五个固定标签升级为两大类：
  - `calendar`
  - `afterCompletion`
- 支持：
  - 每 x 天 / 周 / 月 / 年
  - 完成后 x 天 / 周 / 月 / 年
- `x` 限制在 `1-100`。
- 当前实现策略：
  - 新字段：
    - `repeatType`
    - `repeatIntervalUnit`
    - `repeatIntervalValue`
  - 旧字段 `recurrence` 暂不删除
  - 读取时优先新字段，缺失时回退旧字段映射
  - 旧 `daily / weekly / monthly / yearly` 继续按原语义可用
- 完成后重复当前采用稳定优先策略：
  - 只有当前 occurrence 完成后才计算下一次
  - 下一次基于 `completedAt + interval`
  - 若已生成下一次后再修改上一条 `completedAt`
  - 当前不自动追溯调整已生成的下一次 occurrence
  - 修改 `completedAt` 当前只影响已完成事项显示归属，不应顺手触发下一次生成
  - 停止重复时保留当前和既往，清理 future occurrence
  - 清理 future occurrence 的边界使用当前操作日期 `selectedDate / targetDate`
  - 恢复重复时不立即回填 future occurrence，继续切到日期再生成

### 3. Todo 手动排序
- 增加当天实例级排序。
- 排序页中恢复白天 / 晚上实线分隔。
- 非排序页不显示这条分隔线。
- 越过分隔线时，事项 `timeBlock` 与颜色语境同步变化。
- 当前实现方式：
  - 排序模式 + 上移 / 下移按钮
  - 即时保存
  - 复用 `sortOrder`
  - 已完成事项不参与排序
  - 同组内移动使用组内交换
  - 跨组移动使用“移出原组，插入目标组”，只改变移动中的 item 归属

### 4. 完成后排序与完成时间修改
- 已完成事项自动下沉到底部。
- 已完成事项按 `completedAt` 升序显示。
- 已完成事项按 `completedAt` 对应日期归属显示，而不是继续挂在原计划日期下。
- 这里只改变列表显示归属，不应随意重写原计划字段：
  - `date / originDate / targetDate` 继续保留计划语义
- 支持编辑完成时间。
- 修改 `completedAt` 后，事项应迁移到新的完成日期页面。
- 已完成事项不再保留白天 / 晚上语境色。
- 历史已完成事项若缺少 `completedAt`：
  - 先保留在已完成组
  - 排到已完成组最后
  - 用户可手动补录完成时间
- 取消完成后，事项应回到当前有效计划日期的未完成区。
- 若事项此前已经顺延到今天，则取消完成后应回到今天，而不是回更早历史日期。

### 5. 种草清单独立页面
- 主页面底部保留轻量种草区。
- 已保存种草清单迁移为独立页面。
- 新页面与设置页平级。
- Todo 添加入口仍可从种草中选择 / 推荐拔草。
- 当前第一轮已落地：
  - 独立页面承接现有 `TemplateManagerPanel`
  - 主页原完整清单展开入口改为跳转按钮

### 6. 批量种草
- 在主页底部种草输入区支持分行输入多条内容。
- 同批次共享：
  - 种草分类
  - 时间场景
  - 兴趣程度
- 每行保存为独立种草 item。
- 当前第一版已落地：
  - 多行 `textarea`
  - 按换行切分生成多条
  - 空行忽略
  - 最多 20 条
  - 单行输入时行为与原单条保存一致

## 下一位开发者应先做什么
1. 先阅读：
   - `handoff.md`
   - `product-rules.md`
   - `data-model.md`
   - `constraints.md`
   - `app-structure.md`
   - `task-list.md`
   - `dev-log.md`
2. 当前 `V3.1 Core Fixes` 关键项已基本收口，已进入 `V3.2 Grass List Page` 第二轮。
3. 下一优先项建议切换到：
   - Todo 页面调用种草清单的入口优化
   - 或种草清单页内“加入今日 Todo”动作
4. 当前这一轮没有做：
   - SQLite
   - 导入 / 导出
   - 数据目录迁移
   - Windows 打包
   - 打包
5. 当前 `V3.0 Desktop Foundation` 可标记为：
   - Electron dev 链路已跑通
   - 尚未进入打包 / SQLite / 数据目录迁移
6. 在 `V3.0` 基础稳定前，不要提前冲进复杂同步、账号系统、云数据库或移动端方向。

## 本轮改动文档
- `handoff.md`
- `dev-log.md`
- `task-list.md`
- `README.md`
- `data-model.md`
- `product-rules.md`
- `app-structure.md`
- `constraints.md`

## 2026-05-02 当前有效状态补充
- 首页 Todo 区的 UI 细修已完成多轮收口：
  - 空状态虚线框已移除
  - 已完成事项已去掉 `已完成` tag
  - 已完成事项不再显示 `创建于 xx`、准备备注、分次进度条
  - “TODO 未完成”已改为“Todo / 待办”
- 独立页面的标题统一问题已收口：
  - `种草清单`
  - `垃圾桶`
  - `设置`
- quick add 当前分为两类：
  - 普通条目：显示 Todo 输入框 + 附加设置
  - 拔草条目：不显示顶部 Todo 输入框，显示候选清单 + 附加设置

## Todo 编辑能力现状
- 未完成事项的右侧编辑入口已从“行内改标题”切换为“卡片式编辑”。
- 复用 quick add 浮层，但区分 `create / edit` 模式。
- 编辑边界如下：
  - 普通事项：
    - 锁定事项类型切换
    - 可改日夜
    - 可改 Todo 内容
    - 可改附加设置
  - 拔草事项：
    - 锁定事项类型切换
    - 可改日夜
    - 不可改事项内容
    - 可改附加设置
  - 已完成事项：
    - 不再显示右侧编辑按钮
    - 仅保留“完成于 xx”的完成时间编辑

## Todo 浮层与右列布局现状
- 首页 Todo 区现在是固定高度容器，白天 / 晚上 / 已完成都在容器内部纵向滚动。
- quick add / 编辑卡片当前不再使用统一固定原点：
  - 新增：锚定到带加号的空白框下方左对齐
  - 编辑：锚定到当前事项卡片下方左对齐
- 当前刻意不做边界保护：
  - 浮层可能在靠近底部或右边时出现遮挡
  - 这是按当前产品要求保留的行为，不是 bug
- 重复规则行当前分为两种展示：
  - `按日历重复`：配置行居中
  - `完成后重复`：配置行右对齐
- `准备` 选项当前行为：
  - 勾选后自动聚焦到准备备注输入区
  - 准备备注为必填
  - 在准备备注输入区按回车可直接保存事项

## macOS 打包当前状态
- `package:mac` 已可直接产出本机可用 `.dmg`
- 当前应用图标已接入打包配置：
  - 原始资源：`J-Flow.png`
  - 打包资源：`build/icon.png`
- 当前最新 `.dmg` 产物为：
  - `release/J-Flow-V1.dmg`
- `release/` 中仍保留更早一期历史产物：
  - `release/J-Flow-0.1.0.dmg`
  - 当前未清理，避免误删历史构建
- 当前 `electron-builder` 仍会提示：
  - `package.json` 缺少 `description`
  - `package.json` 缺少 `author`
  但不影响本地打包成功

## 下一位开发者接手时的注意点
- 如果继续做 Todo 编辑，请优先手测以下路径：
  - 普通单次事项编辑保存
  - 拔草事项编辑保存
  - 重复规则从 `none -> repeating`
  - 重复规则从 `repeating -> none`
- 当前“重复规则”编辑已接入，但它同时影响 `dayPlanItems / taskTemplates / recurringTaskInstances`，后续改动不要只盯 UI。
