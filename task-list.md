# 开发任务清单

本文档用于指导 `J-Flow V3 Desktop` 后续工作拆分。

说明：
- 当前网页端属于 `V2` 已部署版本
- 当前主线是 `V3 Desktop`
- 本文档优先按里程碑拆分，不再把全部需求混成单个大任务

---

## 当前总目标

围绕以下方向推进：
- 将现有 React / Vite / TypeScript 项目封装为 Electron 跨平台桌面应用
- 第一阶段优先在 macOS 上跑通
- 建立本地数据库与数据安全基础
- 修复当前最影响使用体验的核心业务逻辑
- 重构种草清单体验
- 之后再做 Windows 兼容与打包适配

当前补充状态：
- 同步目前仍处于设计阶段
- 已完成：
  - `docs/sync-design.md`
  - `docs/sync-implementation-plan.md`
- 当前尚未开始同步实现

---

## V2 Web 保留状态

### 当前状态
- 已部署
- 继续保留
- 暂不继续新增功能

### 说明
- 网页端不是废弃物
- 网页端仍是：
  - 可试用版本
  - 已部署版本
  - V3 参考基线

---

## V3.0 Desktop Foundation

### 优先级
- Must-have

### 目标
- 先把现有网页端封装成可持续演进的 Electron 跨平台桌面骨架，并优先在 macOS 跑通

### 任务
- Electron 技术方案定稿
- Electron 项目骨架与目录结构
- main / preload / renderer 分工落地
- macOS 开发环境启动
- MacBook 本机自测流程跑通
- 保留网页端构建能力
- 跨平台数据目录策略确定
- 跨平台文件读写方案确定

### 交付物
- Electron 目录结构
- 桌面开发命令
- 构建命令
- macOS 优先打包命令
- 存储抽象层设计
- 数据目录与导入导出文档

### 当前状态
- 第一轮代码已开始
- 已完成：
  - Electron 主进程骨架
  - preload bridge 骨架
  - `dev:desktop`
  - `build:desktop`
  - 最小 IPC 示例
  - Electron dev 链路已跑通
- 当前仍未进入：
  - SQLite
  - 导入导出
  - 数据目录迁移
  - 打包

---

## V3.1 Core Fixes

### 优先级
- Must-have

### 目标
- 修复当前最影响真实使用体验的核心业务功能

### 任务组 A：日历跳转
- 删除天气方向
- 顶部天气占位改为日历图标
- 点击后打开日期选择器
- 支持跳转到任意一天查看 / 编辑 / 补录 Todo

### 任务组 B：重复规则扩充
- 设计新的 `repeatType`
- 支持 `none / calendar / afterCompletion`
- 支持 `intervalUnit`
- 支持 `intervalValue 1-100`
- 旧五类重复规则 migration
- 新 UI：分段选择 + 数字输入 + 单位选择

### 任务组 C：Todo 手动排序
- 设计 `order` 字段
- 排序模式 UI
- 先做稳定版上移 / 下移方案
- 排序页显示白天 / 晚上分隔线
- 越过分隔线时更新 `timeBlock`

### 任务组 D：完成后下沉与完成时间
- 新增或稳定 `completedAt`
- 旧 `completed: true` 数据 migration
- 已完成事项自动下沉
- 已完成事项按 `completedAt` 排序
- 支持修改完成时间
- 支持恢复未完成

### 任务组 E：视觉修正
- 白天事项颜色调整得更明显
- 晚上事项与已完成无色状态区分清楚

### 当前状态
- 已开始
- 第一轮已完成：
  - 天气占位改日历图标
  - 任意日期跳转
- 第二轮已完成：
  - 完成事项自动下沉
  - `completedAt` 排序
  - 完成时间修改
  - 白天事项颜色调整
- 第三轮已完成：
  - 重复规则扩充
  - `none / calendar / afterCompletion`
  - 旧五类规则兼容
  - 新重复规则输入 UI
- 第四轮已完成：
  - 已完成事项按完成日期归属显示
  - 修改完成时间后的跨日期迁移
  - 停止重复清理 future occurrence
  - 恢复重复继续懒生成
- 第五轮已完成：
  - Todo 手动排序
  - 排序模式 + 上移 / 下移按钮
  - 复用 `sortOrder`
  - 排序模式显示白天 / 晚上分隔线
  - 跨分隔线时更新当前日期实例 `timeBlock`

### 平台说明
- 本阶段功能修复优先在 macOS 桌面版中完成并自测
- 不要求当前每轮都同步完成 Windows 真机适配

---

## V2.3.2 Todo 筛选、完成时间与拖动排序

### 优先级
- Must-have

### 目标
- 在 macOS Desktop 先完成 Todo 页面使用体验优化
- 修复完成时间编辑的 12 / 24 小时制不一致
- 将现有上下箭头排序升级为拖动排序
- Mac 验证完成后再准备 Windows 源码移交

### 任务组 A：只看必要
- 在 Todo 页工具栏增加 `只看必要`
- 位置在 `调整顺序` 左侧
- 支持所有可查看日期
- 同时筛选：
  - 未完成必要事项
  - 已完成必要事项
- 再次点击恢复全部事项
- 筛选不写入数据库，不修改排序与状态
- 开启后按钮文案改为 `全部事项`
- 开启筛选后禁用 `调整顺序`
- 排序模式中禁用 `只看必要`

### 任务组 B：完成时间 24 小时制
- 定位 macOS / Chromium 原生 `datetime-local` 的 12 小时制本地化行为
- 替换为可明确控制的 24 小时制编辑 UI
- 日期与时间编辑后继续保存为正确 ISO 时间
- 保持：
  - 静态展示为 `HH:mm`
  - 修改后跨日期归属正确
  - 修改完成时间不触发完成后重复

### 任务组 C：拖动排序
- 继续复用现有：
  - `sortOrder`
  - `timeBlock`
  - `timeBlockSource`
- 使用成熟拖拽方案实现：
  - 鼠标拖动
  - 键盘排序
  - 拖动把手
  - 列表内滚动
- 支持跨越白天 / 晚上分隔线
- 放下后统一保存当前日期未完成事项顺序
- 已完成事项不参与拖动
- 拖动排序稳定后移除上移 / 下移按钮

### 任务组 D：Mac 验证与移交
- 跑相关单元测试
- 运行 `build:desktop`
- 拉起 Electron 开发版供人工测试
- 人工确认后：
  - 产出 `J-Flow-V2.3.2.dmg`
  - 执行 dmg 校验
  - 更新 `handoff.md`
  - 更新 `dev-log.md`
  - 准备 Git commit / push
  - 制作 Windows 源码移交压缩包

### 当前状态
- 已完成产品规则与验收项补充
- 已完成 `只看必要` 与排序模式互斥交互
- 已完成完成时间 24 小时制编辑
- 已完成基于 `dnd-kit` 的拖动排序
- 已通过桌面构建与 Electron 人工测试
- 已产出并校验 `J-Flow-V2.3.2.dmg`
- 已完成 Windows 源码移交与真机打包回并
- 已同步：
  - `J-Flow-V2.3.2-win-portable.exe`
  - `J-Flow-V2.3.2-win-setup.exe`
- V2.3.2 已完成收尾

---

## V2.4 Todo 语义优化：备注、夜间默认、拔草删除、分步、初始化教学

### 优先级
- Must-have

### 目标
- 先完成用户日常输入成本最低、规则最清晰的 Todo 体验优化。
- 本轮不实现工作日 Todo。
- 工作日 Todo 需等待节假日 / 调休日历来源明确后再重启。

### 任务组 A：备注替代准备 + 夜间新增默认
- 更新产品规则、数据模型与手动验证清单。
- 移除 Todo 表单中的 `准备` 选择。
- 在 Todo 内容输入框下方新增常驻单行备注输入框。
- 备注可空，不阻止提交。
- 旧 `preparationNotes` 继续兼容显示为：
  - `备注：...`
- 新建 / 编辑 Todo 时保存备注到当前 Todo。
- 设置页新增：
  - 夜间新增 Todo 默认归属晚上开关
  - 夜间开始小时
  - 夜间结束小时
- 默认关闭。
- 默认小时建议：
  - `17`
  - `23`
- 支持跨午夜区间。
- 该设置只影响新增表单默认值，不改写已有 Todo。

### 任务组 B：拔草删除语义重构
- 更新产品规则与手动验证清单。
- 来自种草的一次性 Todo 删除时，不再自动恢复原种草。
- 为未完成拔草 Todo 新增“回到种草清单”按钮。
- 点击“回到种草清单”时：
  - 当前 Todo 标记删除
  - 对应种草恢复为 `active`
- 完成后的拔草 Todo 不显示“回到种草清单”按钮。
- 调整 Todo 条目按钮布局：
  - 编辑按钮移到事项内容后
  - 右侧保留完成、删除与必要的来源动作

### 任务组 C：分步 Todo
- 更新产品规则、数据模型与手动验证清单。
- 新增 `分步` 类型，独立于 `分次`。
- `分步` 与 `分次` 第一版互斥。
- V2.4 基础分步表单包含：
  - 当前步骤
  - 下一步步骤
- 当前步骤必填。
- 下一步可空。
- 列表显示：
  - `事项内容：当前步骤`
- V2.4 基础分步完成时：
  - 当前 Todo 标记完成
  - 若下一步非空，自动创建下一步 Todo
  - 若下一步为空，链路结束
- 编辑分步 Todo 时，可修改当前步骤与下一步步骤。
- V3.1 将在此基础上把单个下一步扩展为多个后续步骤队列。

### 任务组 D：初始化页与功能教学
- 更新产品规则与手动验证清单。
- 将初始化页从“仅编辑种草清单 / 有空就做场景”升级为：
  - 首次开局配置
  - 核心功能教学
- 首次开局配置继续支持：
  - 编辑种草清单
  - 编辑有空就做场景
  - 至少保留一个种草清单
  - 至少保留一个有空就做场景
- 功能教学第一版覆盖：
  - 种草是 backlog
  - Todo 是执行层
  - TODO / 拔草入口
  - 白天 / 晚上与日期
  - 必要 / 备注 / 分步 / 分次 / 重复
  - 完成、顺延、日志
  - 本地数据、导入导出、备份、同步
- 新增独立重看教学入口：
  - 设置页新增 `初始化与使用教学` 卡片
  - 卡片内提供 `重置应用` 与 `使用教学` 两个同级按钮
  - 点击 `使用教学` 后进入教学流程
  - 不清空当前本地数据
  - 不改写现有 Todo、种草、日志、设置或同步目标
- 第一版重做为真实 UI 教学态：
  - 通过 `?tutorial=1` 启动
  - 使用独立 demo 数据，不使用用户当前本地数据
  - 教学栏放在底部独立 rail 中，真实 UI 内容区为底部 rail 让位
  - 桌面端进入教学态时，通过受控 bridge 尽量将窗口高度调整到当前屏幕可用最大高度
  - 当前介绍区域出现高亮框
  - 高亮框内亮度提高，框外区域压暗
  - demo 数据完整展示日期、种草、Todo 输入、必要、分步、分次、重复、完成区、同步、日志和设置
  - 教学期间不写入、不删除、不同步真实数据
- 教学流程：
  - 日期：高亮 `THIS DAY` 与侧栏日历区，说明当前查看日期与今天的不同高亮
  - 首页下方种草入口：不跳转到种草清单页，展开真实种草输入区，说明 tag、兴趣程度与批量添加
  - Todo 输入面板：展示 `TODO / 拔草` 切换、拔草条目语境、分次勾选和备注输入区
  - 日夜切换，并介绍设置页可开启夜间新增默认归属晚上
  - 必要按钮 + DDL 区，说明分步事项的 DDL 只属于当前这一步
  - 分步和分次
  - 重复，说明按日历重复与完成后重复的差异
  - 同步功能，说明本地文件夹同步与外部同步目录配合
  - 种草清单、日志和其他设置：显示种草清单页并高亮侧栏下方导航区
- `/setup` 继续服务首次初始化。
- 第一版不新增持久化字段记录教学完成时间。

### 当前状态
- 已确认工作日 Todo 暂缓。
- 已完成 V2.4 文档规划。
- 已完成任务组 A 代码实现。
- 已完成任务组 B 代码实现。
- 已完成任务组 C 代码实现。
- 已完成任务组 D 代码实现。
- V2.4 已确认完成。
- 当前尚未经过持续真实使用测试；后续使用中需重点观察真实数据下的新增、编辑、删除、迁移、教学与同步设置表现。
- V2.4 实际使用发现并修复：
  - 重复 Todo 旧逻辑仍通过场景 tag 名称推断日夜归属
  - 现已改为重复模板显式保存 `timeBlock / timeBlockSource`
  - 后续 occurrence 继承模板日夜，不再根据“工作日晚上”等 tag 名称推断
  - SQLite schema 升级到 `7`
  - JSON app data schema 升级到 `13`

---

## V3.1 分步 Todo 优化

说明：
- 本节为当前发布口径的 `V3.1`。
- 上方早期 `V3.1 Core Fixes` 属于历史里程碑命名，保留用于追踪旧任务。

### 优先级
- Must-have before Windows handoff

### 目标
- 在 V3 正式进行 Windows 交接与打包前，增强分步 Todo。
- 支持用户一次安排多个后续步骤，而不是只能填写一个 `下一步`。
- 同步更新真实 UI 教学与文档。

### 任务组 A：规则与数据模型
- 将分步 Todo 从单个 `nextStep` 扩展为后续步骤队列。
- 建议新增：
  - `plannedSteps: string[]`
- 保留 `nextStep` 作为兼容字段：
  - 旧数据 `nextStep` 读取为单元素队列
  - 新数据可同步写 `nextStep = plannedSteps[0] ?? ''`
- JSON app data schema 计划从 `13` 升级到 `14`。
- SQLite schema 计划从 `7` 升级到 `8`。
- SQLite 计划新增：
  - `task_templates.planned_steps_json`
  - `day_plan_items.planned_steps_json`

### 任务组 B：Todo 表单与完成逻辑
- 分步展开区保留 `当前步骤` 输入框。
- 后续步骤区默认显示一行 `下一步` 输入框与 `+` 按钮。
- 点击 `+` 增加一行新的 `下一步` 输入框。
- 保存时按界面顺序写入后续步骤队列，并忽略空白后续步骤。
- 完成当前步骤时：
  - 若队列非空，取第一项生成新 Todo 的 `currentStep`
  - 剩余项继续作为新 Todo 的后续步骤队列
  - 不继承上一条 DDL
  - 若队列为空，链路结束

### 任务组 C：教学与验证
- 教学 demo 数据改为包含多个后续步骤的分步 Todo。
- Guide “分步和分次”文案更新为：
  - 分步按后续步骤队列逐步生成
  - 分次用进度条记录推进百分比
- 手动验证覆盖：
  - 旧单 `nextStep` 数据兼容
  - 多后续步骤顺序推进
  - DDL 不继承
  - 编辑后续步骤队列
  - 分步 / 分次互斥

### 当前状态
- V3.1 分步 Todo 优化已完成代码实现。
- 已完成数据模型与 migration：
  - JSON app data schema `14`
  - SQLite schema `8`
  - `plannedSteps` 与旧 `nextStep` 兼容
- 已完成 Todo 表单与完成逻辑：
  - 多行后续步骤输入
  - 队列弹出创建下一步
  - 自动创建下一步不继承 DDL
- 已完成真实 UI 教学同步：
  - Guide 文案更新
  - demo 数据包含多个后续步骤
  - 教学 demo 日期动态取打开教学时的本地今天 + 3 天
- 已完成测试：
  - TypeScript renderer / electron 检查通过
  - SQLite / storage / selected-date-state 测试 `23` 项通过
- 已生成 V3.1 macOS DMG：
  - `release/J-Flow-V3.1.dmg`
  - `release/J-Flow-V3.1.dmg.blockmap`
- Windows 交接仍暂停，待后续重新准备 Windows 真机打包与源码交接。

---

## V3.2 同步与日志快照修复

说明：
- 本节为当前发布口径的 `V3.2`。
- 下方早期 `V3.2 Grass List Page` 属于历史路线图命名，后续版本号需重新顺延。

### 目标
- 修复 V3/V3.1 数据模型升级后，Mac / Windows 双端本地文件夹同步可能不传播新字段的问题。
- 修复分步 Todo 日志快照只显示基础事项、不显示当前步骤的问题。

### 已完成
- 日志快照：
  - renderer 日志服务继续使用分步显示标题
  - Electron 自动补昨日日志改为使用分步显示标题
  - 分步快照保存为 `事项：当前步骤`
- 同步修复：
  - 新增一次性 V3.2 同步 repair 标记 `v32SyncRepairAppliedAt`
  - repair 会把当前库中的 `taskTemplate / dayPlanItem` 重新加入待同步队列
  - repair 不改写业务实体 `updatedAt`
  - 远端旧分步 item 缺 `plannedSteps` 时，从 `nextStep` 归一化恢复后续步骤队列
  - 写入 SQLite 前统一保持 `nextStep = plannedSteps[0] ?? ''`
  - 追加坚果云兼容热修：本地文件夹同步写 JSON 时不再在同步目录内生成 `.tmp` 后 rename，改为直接写最终 JSON，避免坚果云留下红叉 / 冲突临时文件
- 回归测试：
  - Electron 自动日志分步快照
  - renderer 日志分步快照
  - V3.2 同步 repair 只执行一次
  - 旧远端分步 `nextStep` 导入归一化
  - 同步导出 / 手动同步闭环未回退
  - `LocalFolderDriver.safeWriteJson` 不留下 `.tmp` 文件

### 当前验证
- `corepack pnpm exec tsc --noEmit`：通过
- `corepack pnpm exec tsc -p electron/tsconfig.json --noEmit`：通过
- `corepack pnpm exec vitest run electron/sqlite.test.ts electron/sync-import.test.ts electron/daily-logbook.test.ts src/features/logbook/logbook-service.test.ts src/db/storage.test.ts`：通过，`33` 项
- `corepack pnpm exec vitest run electron/sync-export.test.ts electron/sync-now.test.ts electron/selected-date-state.test.ts`：通过，`18` 项
- 追加同步热修验证：
  - `corepack pnpm exec vitest run electron/sync-import.test.ts electron/sync-export.test.ts electron/sqlite.test.ts electron/sync-now.test.ts electron/daily-logbook.test.ts src/features/logbook/logbook-service.test.ts src/db/storage.test.ts electron/selected-date-state.test.ts`：通过，`52` 项
- 追加坚果云兼容热修验证：
  - `corepack pnpm exec vitest run electron/sync-target/local-folder-driver.test.ts electron/sync-target/metadata.test.ts electron/sync-import.test.ts electron/sync-export.test.ts electron/sync-now.test.ts electron/sqlite.test.ts`：通过，`55` 项
- 已生成 macOS DMG：
  - `release/J-Flow-V3.2.dmg`
  - SHA256：`b702cbf4e7c1e2522040430d1d095c1894da48853a6fa8109f6e9fb34691d7cc`
  - 该 DMG 已包含 `updatedAt` 相等同步热修与坚果云 `.tmp` 写入兼容热修
- 已生成 Windows 源码交接包：
  - `J-Flow-V3.2-win-handoff-source-20260718.zip`
  - 用于 Windows 端重新打包包含坚果云 `.tmp` 写入兼容热修的安装包
- 已完成 Windows 真机打包，Mac 工作区已归档：
  - `release/J-Flow-V3.2-win-portable.exe`
  - SHA256：`543469A6285B02C1B1D7980B150F3ED379BAE48EBC31E365848008E3F2FAE3DE`
  - `release/J-Flow-V3.2-win-setup.exe`
  - SHA256：`3FE02510528C184C563DF399461CAE7A0F5FCE38AEB78FAA588B050087452D5E`
  - Windows 侧另有 `win-unpacked/J-Flow.exe` 与 setup blockmap；Mac 工作区当前只归档 portable / setup 两个 exe。
- 真实双端同步排查最终结论：
  - Windows 端新建普通 txt 探针后，坚果云网页端可见；
  - Mac 本地同步文件夹不可见；
  - 用户确认 Mac 自动更新后坚果云客户端被关闭，且没有开机自启；
  - 因此“双端完全不同步”的最终根因是 Mac 端坚果云客户端未运行，不是 J-Flow 同步链路失败。

### 后续人工观察
- 使用真实 Mac / Windows 双端同步文件夹：
  - 先确认坚果云等第三方云盘客户端正在运行，且目标文件夹已完成同步
  - 至少一端执行一次“立即同步”
  - 确认重复事项夜晚归属、分步后续步骤队列、普通新增 / 删除仍能双端交换
- 查看自动生成日志：
  - 分步已完成 / 未完成 / 删除快照应显示 `事项：当前步骤`

---

## V3.2 Grass List Page

> 历史路线图标题；当前发布口径中，`V3.2` 已用于“同步与日志快照修复”。

### 优先级
- Must-have

### 目标
- 重构种草清单体验，但不破坏主页面 Todo 主体

### 任务组 A：种草清单独立页面
- 将已保存种草清单展示迁移为独立页面
- 与设置页平级
- 支持查看、筛选、编辑、删除

### 任务组 B：桌面端导航结构
- 顶部导航方案
- 主页面 / 种草清单页 / 设置页之间跳转
- 主页保留“查看种草清单”入口

### 任务组 C：主页底部种草区保留
- 保留轻量输入区
- 保留展开 / 收起种草区
- 保留保存当前种草
- 不再承载完整长列表浏览

### 任务组 D：批量种草
- 种草输入区支持多行输入
- 最多 20 行
- 空行忽略
- 每行生成独立 item

### 任务组 E：Todo 入口调用种草
- 从种草中选择
- 推荐拔草
- 从种草清单页面添加到今日 Todo

### 当前状态
- 第一轮已完成：
  - 顶部导航骨架
  - 独立种草清单页面壳
  - 主页“查看种草清单”入口迁移
  - 主页保留轻量种草输入区
- 第二轮已完成：
  - 批量种草
  - 多行输入框
  - 每行生成独立 item
  - 空行忽略
  - 最多 20 条

---

## V3.3 Local Backup

### 优先级
- Must-have

### 目标
- 做好长期自用的数据安全基础

### 任务组 A：本地数据库
- 桌面端运行时数据库接入
- schema version
- migration 方案

### 任务组 B：完整 JSON 导入 / 导出
- 完整导出
- 完整导入
- 恢复验证

### 任务组 C：自动备份
- 自动备份策略
- 备份轮换策略

### 任务组 D：数据目录管理
- 打开数据文件夹
- 自定义数据目录
- 默认目录文档与实现

### 任务组 E：恢复能力
- 备份恢复流程
- 恢复前确认
- 恢复后校验

### 当前状态
- 本轮完成文档拆分
- 已完成：
  - 桌面版 SQLite 主库存储
  - 桌面化 JSON 导入 / 导出
  - 数据目录入口
  - 自动备份第一版
  - 数据目录与主库文件说明收口
- 当前以本地桌面数据安全能力为主

---

## V3.4 Windows Compatibility

### 优先级
- In progress

### 目标
- 在保留现有 macOS Desktop 与 Web 构建能力前提下，给现有 Electron Desktop 新增 Windows target
- 当前不是重写 Windows 版，而是扩展跨平台桌面打包与路径兼容

### 任务

## V3.5 Folder Sync Design

### 优先级
- Planned

### 目标
- 为桌面端第一版“本地文件夹同步”完成产品方案与实现前规格
- 当前只做文档设计，不进入代码实现

### 同步第一版边界
- 只支持桌面端
- 每台设备继续使用自己的本地 SQLite
- 用户选择同步文件夹
- 只做“立即同步”
- 同步前自动创建本地备份
- 冲突先用“最后修改的一方胜出”
- 不做账号系统
- 不做 WebDAV
- 不做实时同步
- 不同步 SQLite 文件本体
- 不把 JSON 备份当同步用

### 当前已完成
- `docs/sync-design.md`
- `docs/sync-implementation-plan.md`
- 最小自动同步：
  - 启动后延迟一次自动同步
  - 窗口重新聚焦自动同步
  - `30s` 去抖
  - 自动同步与手动同步的进程内并发保护

### 当前未开始
- 后台同步
- `OneDrive`

### 后续实现建议顺序
- Sync 1：`deviceId` 与 sync metadata
- Sync 2：同步文件夹选择、保存、读写测试
- Sync 3：本地实体导出为 sync items
- Sync 4：远端 sync items 导入与合并
- Sync 5：立即同步按钮与结果提示
- Sync 6：锁、错误处理与自动备份收口
- Sync 7：最小自动同步
- Windows 打包
- Windows 真机测试
- 路径差异适配
- 安装器适配
- 默认数据目录适配
- 文件关联或权限差异排查

### 当前方案
- 第一轮 Windows 打包优先采用 `portable`
- 原因：
  - 适合自用测试
  - 配置最轻
  - 能先验证图标、路径、SQLite、导入导出

### 当前已完成
- 已新增 `package:win`
- 已在 `electron-builder` 中新增 Windows `portable` target
- 已确认以下路径未写死 macOS：
  - 数据目录
  - SQLite 主库
  - JSON 自动备份目录
  - 打开数据目录
  - 导入 / 导出文件对话框
  - 打包 icon 路径
- 已确认当前：
  - macOS `package:mac` 仍保留
  - Web `build` 仍保留
  - Desktop `build:desktop` 仍保留
- 已于 2026-05-02 通过镜像下载方式在 macOS 环境下成功产出：
  - `release/J-Flow-V1-win-portable.exe`
- 已于 2026-07-08 在 Windows 真机完成 V3.1 打包：
  - `release/J-Flow-V3.1-win-portable.exe`
  - `release/J-Flow-V3.1-win-setup.exe`
  - Windows 侧另有 `win-unpacked/J-Flow.exe`
  - Windows 侧另有 `J-Flow-V3.1-win-setup.exe.blockmap`
- V3.1 Windows SHA256：
  - portable：`EC2DF7FCDB6AA874840BFE9A232B2CC7458136A3DB185B3DEA0732E50E4F2E03`
  - setup：`B0C068D777EA842FD6B7F27621FEC8BC44D1DAF20565728481BD011BCD2ED57E`

### 当前未完成 / 风险
- V3.1 Windows 包已完成真机打包；后续若重新安装依赖或重打包，仍需注意 Windows 侧 Node / Electron 下载环境。
- Windows 侧需要先运行 `corepack pnpm run sync:icon` 生成 `build/icon.ico`。
- 当前 Windows `afterPack` 会检查并写入 exe 图标；缺少 `build/icon.ico` 时会中止打包，避免产出无图标包。
- 当前建议 Windows 真机依次验证：
  - `corepack pnpm run package:win:dir`
  - `corepack pnpm run package:win:portable`
  - `corepack pnpm run package:win:nsis`
- 当前在 macOS 环境构建 Windows 包时，仍需要联网下载 Windows Electron runtime；建议继续使用镜像。

---

## Later

### 可以后置的方向
- 本地文件夹同步设计与正式实现
- 本地文件夹同步正式实现
- WebDAV 同步
- 模糊搜索 / 智能搜索
- 提醒与通知
- 更复杂的 recurrence 编辑器
- 原生移动端
- 云同步
- 账号系统
