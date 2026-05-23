# Dev Log

## 2026-05-23（Mac 收尾：并回 Windows V2.1 portable 图标修复）

### 本轮目标
- 不重打 macOS 包
- 只将 Windows 真机已验证有效的打包修复并回 Mac 主工作区
- 收口文档，明确 Windows V2.1 portable 已成功

### 本轮修改
- 更新：
  - `package.json`
  - `electron/main.ts`
  - `scripts/sync-icon.mjs`
  - `README.md`
  - `handoff.md`
- 新增：
  - `scripts/generate-icon-win.ps1`
- 当前并回的 Windows 有效修复包括：
  - `package:win` 参数从：
    - `-c.npmRebuild=false`
    修正为：
    - `--config.npmRebuild=false`
  - Windows portable 产物名收口为：
    - `J-Flow-V2.1-win-portable.exe`
  - `win.icon` 改为：
    - `build/icon.ico`
  - `extraResources` 带入：
    - `resources/icon.ico`
  - Windows 下 `BrowserWindow` 显式加载图标
  - Windows 下设置：
    - `app.setAppUserModelId('com.jflow.desktop')`
  - Windows 下 `sync-icon` 改为生成：
    - 圆角 `icon.png`
    - 多尺寸 `icon.ico`

### 当前结论
- Windows 真机那轮有价值的源码修复已并回主线。
- 这轮不需要重新打包 macOS `.dmg`。
- 后续若要继续收尾，优先只做：
  - 一次最小桌面构建验证
  - 文档核对

## 2026-05-23（V2.1 版本线收口与 macOS dmg 打包）

### 本轮目标
- 将当前 macOS 自用打包版本名从：
  - `V1.4`
  收口为：
  - `V2.1`
- 在相关文档里明确：
  - `V1.4`
    - 上一版稳定 macOS 自用包
  - `V2.0`
    - 主要更新为本地文件夹同步能力
  - `V2.1`
    - 在 `V2.0` 基础上增加必要事项 `DDL`

### 本轮修改
- 更新：
  - `package.json`
  - `README.md`
  - `handoff.md`
  - `manual-test-checklist.md`
- 当前打包产物名已从：
  - `J-Flow-V1.4.dmg`
  调整为：
  - `J-Flow-V2.1.dmg`
- 当前版本说明已统一为：
  - 不写成：
    - 官方云同步
  - 继续写为：
    - 本地文件夹同步能力
    - 最小自动同步

### 当前待验证
- 需要实际执行：
  - `corepack pnpm run package:mac`
  - 确认生成：
    - `release/J-Flow-V2.1.dmg`

### 验证结果
- `corepack pnpm run package:mac`：通过
- 成功产出：
  - `release/J-Flow-V2.1.dmg`
  - `release/J-Flow-V2.1.dmg.blockmap`

### 当前说明
- `release/` 中当前仍同时保留：
  - `J-Flow-V1.4.dmg`
  - `J-Flow-V2.1.dmg`
- 若后续希望只保留最新版本产物，可再单独清理旧包。

## 2026-05-23（日志快照重构为单一列表，并纳入 DDL / 逾期 / 分次 tag）

### 本轮目标
- 重做日志页与日志 Markdown 的组织方式
- 删除：
  - 当日完成
  - 当日未完成
  - 当日删除
  三分区
- 将：
  - 完成
  - 未完成
  - 删除
  - 必要
  - `DDL`
  - 逾期
  - 拔草
  - 分次推进
  统一进单一快照列表

### 本轮修改
- 更新：
  - `src/types/models.ts`
  - `electron/types.ts`
  - `src/db/schema.ts`
  - `src/db/storage.test.ts`
  - `electron/sqlite.ts`
  - `electron/sqlite.test.ts`
  - `src/features/logbook/logbook-service.ts`
  - `src/features/logbook/logbook-service.test.ts`
  - `src/pages/logbook/LogbookPage.tsx`
  - `src/styles/globals.css`
  - `product-rules.md`
  - `data-model.md`
- 当前日志数据模型已从：
  - `completedItems / unfinishedItems / deletedItems`
  收口为：
  - `snapshotItems`
- 当前日志规则已落地为：
  - 统一使用：
    - `- [x]`
    - `- [ ]`
  - 删除项显示为：
    - `- [x] ~~事项~~`
  - 必要事项正文加粗
  - `[拔草]`
    - `[逾期]`
    - `[分次]`
    作为末尾简易 tag
  - 未完成必要事项显示：
    - `DDL MMDD`
  - 已完成必要事项若逾期完成，仅保留：
    - `[逾期]`
    不再重复显示 `DDL`
  - 分次事项显示：
    - `已推进 a%→b%`
    或：
    - `当前进度 b%`
- 当前历史兼容已补：
  - 旧 `logbookEntries` 若仍是三分区结构
  - 读取时会自动转换为新 `snapshotItems`
  - SQLite 也已新增：
    - `snapshot_items_json`
    兼容列

### 验证结果
- `corepack pnpm exec vitest run src/features/logbook/logbook-service.test.ts src/db/storage.test.ts electron/sqlite.test.ts`：通过
- `corepack pnpm run build:desktop`：通过

### 当前风险
- 历史日志若生成于旧结构时代：
  - 不会补出新的 `DDL / 分次 / 拔草` 细粒度语义
  - 只能按旧快照信息做兼容转换
- 这属于当前接受范围，后续不建议为历史日志做高风险回填迁移

### 后续补丁
- 首页曾出现：
  - `db:app-data:replace`
  - `Provided value cannot be bound to SQLite parameter 2`
- 根因是：
  - 本机仍存在旧三分区日志结构
  - 在整库回写到 SQLite 时，个别条目未先归一化出：
    - `snapshotItems`
- 已补两层兼容：
  - `src/db/storage.ts`
    - 旧日志先归一化为：
      - `snapshotItems`
  - `electron/sqlite.ts`
    - 写入前再次兜底把旧日志转换为：
      - `snapshotItems`
- 额外补充回归测试：
  - `electron/sqlite.test.ts`
    覆盖“旧日志直接 replace 进桌面 SQLite”场景

### 后续补丁 2
- 用户继续反馈：
  - 日志条目之间行间距偏大
  - 旧日志里的分次事项仍显示为：
    - `事项 进度：81%`
    而不是约定的新格式
- 已补：
  - `src/styles/globals.css`
    - 收紧：
      - `logbook-list` 条目间距
      - `logbook-snapshot` 内联间距与行高
  - `src/db/storage.ts`
  - `electron/sqlite.ts`
    - 为旧日志快照追加二次兼容：
      - `xxx 进度：81%` -> 标题 `xxx` + `当前进度 81%`
      - `推进 xxx 30% -> 50%` -> 标题 `xxx` + `已推进 30%→50%`
- 这样旧日志无需手动重建，也能在页面里按新约定显示。

### 后续补丁 3
- 用户继续微调日志 UI：
  - `[分次]` 不要显示成胶囊
  - 行距再压一点
- 已补：
  - `src/pages/logbook/LogbookPage.tsx`
    - `[分次]` 当前改为普通文本 tag：
      - `[分次]`
  - `src/styles/globals.css`
    - 继续收紧日志列表条目间距、内联间距与行高

### 后续补丁 4
- 用户继续微调日志 UI：
  - `[分次]`
    - `[逾期]`
    - `[拔草]`
    都改为蓝色文本 tag
  - `[ ] / [x]` 改为视觉 checkbox
  - 已完成事项整体颜色变浅
- 已补：
  - `src/pages/logbook/LogbookPage.tsx`
    - 纯文本勾选前缀改为视觉 checkbox
    - `[分次] / [逾期] / [拔草]` 统一改为文本 tag 输出
  - `src/styles/globals.css`
    - 新增日志 checkbox 样式
    - 已完成项整体降低对比度
    - 文本 tag 统一改为蓝色

### 后续补丁 5
- 用户继续微调日志 UI：
  - 日志页蓝色再浅一点
  - 这一轮日志重构可以收口
- 已补：
  - `src/styles/globals.css`
    - 将日志页 checkbox 与文本 tag 的蓝色统一调浅一档

## 2026-05-23（DDL 录入区与今日截止颜色微调）

### 本轮目标
- 只修正 `DDL` 相关 UI
- 不改任何 `DDL` 业务逻辑

### 本轮修改
- 更新：
  - `src/features/todo/TodoModePanel.tsx`
  - `src/styles/globals.css`
- 当前录入区已从：
  - 白色长条框内嵌蓝色日期按钮
  调整为：
  - 单独蓝色按钮 `DDL MM/DD`
  - 紧接 `x 日内完成`
- 当前列表里的：
  - `今日截止`
  已从黄色改为与未到期相同的蓝色视觉
- 当前 `DDL` 蓝色按钮高度已对齐为：
  - `34px`
  与紧随其后的 stepper 输入高度一致

## 2026-05-23（DDL 反推天数允许超过 100，手输仍限制 1-100）

### 本轮目标
- 修补 `DDL` 表单联动的一个边界
- 保持：
  - 手动输入 `x 日内完成` 仍只允许 `1-100`
- 放开：
  - 根据日历真实日期反推出的 `x`
  可以超过 `100` 并显示出来

### 本轮修改
- 更新：
  - `src/features/todo/deadline.ts`
  - `src/features/todo/deadline.test.ts`
- 当前规则收口为：
  - 手动输入 `x 日内完成`：
    - 只允许 `1-100`
  - 日历点选真实 `deadlineDate` 后：
    - 系统反推出的 `x` 不再受 `100` 上限限制
    - 例如可显示：
      - `103`
      - `135`
- 这样做的原因是：
  - 当前底层主存仍然是：
    - 真实 `deadlineDate`
  - `x 日内完成` 同时承担：
    - 快捷输入器
    - 对真实日期的解释器
  - 因此超过 `100` 时不应留空

### 验证结果
- `corepack pnpm exec vitest run src/features/todo/deadline.test.ts src/db/storage.test.ts electron/sqlite.test.ts`：通过
- `corepack pnpm run build:desktop`：通过

## 2026-05-22（必要事项 DDL 第一版落地）

### 本轮目标
- 为必要事项增加强约束 `DDL`
- 第一版只做：
  - 日期型 `DDL`
  - 必要事项必填
  - Todo 列表展示
  - 模板 / 重复事项基础支持
- 当前不做：
  - 提醒
  - 自动排序
  - 日志细化规则

### 本轮修改
- 新增：
  - `src/features/todo/deadline.ts`
  - `src/features/todo/deadline.test.ts`
- 更新：
  - `src/types/models.ts`
  - `electron/types.ts`
  - `src/db/schema.ts`
  - `src/db/storage.ts`
  - `src/db/storage.test.ts`
  - `electron/sqlite.ts`
  - `src/features/decision/recommendation.ts`
  - `src/features/recurrence/auto-generated.ts`
  - `src/features/todo/TodoModePanel.tsx`
  - `src/features/todo/todo-view-model.ts`
  - `src/styles/globals.css`
  - `src/mocks/app-data.ts`
  - `product-rules.md`
  - `data-model.md`
  - `handoff.md`
- 当前规则已落地为：
  - `DDL` 只属于必要事项
  - 勾选必要时默认 `deadlineDate = item.date`
  - 取消必要时自动清空 `DDL`
  - 表单支持：
    - 日历选真实日期
    - `x 日内完成`
  - 底层只保存真实 `deadlineDate`
  - 修改 Todo `date` 不自动顺延 `deadlineDate`
  - 已完成事项不再显示 `DDL`
- 当前重复事项实现：
  - 通过模板 `date` 与模板 `deadlineDate` 的偏移，换算 future occurrence 的真实 `deadlineDate`
  - occurrence 一旦生成后，其 `deadlineDate` 固定

### 验证结果
- `corepack pnpm exec vitest run src/features/todo/deadline.test.ts src/db/storage.test.ts electron/sqlite.test.ts`：通过
- `corepack pnpm run build:desktop`：通过

### 当前风险
- 当前 overdue 项再次编辑时，允许保留过去的 `DDL`，但表单里的 `x 日内完成` 会因为无法反推而显示为空
- 当前未细化：
  - 已完成事项进入日志后，`DDL` 信息是否保留、如何保留
  - 这是下一轮需要单独讨论的规则

## 2026-05-22（最小自动同步落地）

### 本轮目标
- 在不改同步协议的前提下，为桌面端补最小自动同步
- 当前只允许：
  - 本地文件夹
  - app ready 后延迟一次
  - window focus 时一次
- 不做后台常驻、watcher、托盘与复杂策略

### 本轮修改
- 新增：
  - `electron/auto-sync.ts`
  - `electron/auto-sync.test.ts`
- 更新：
  - `electron/backup.ts`
  - `electron/backup.test.ts`
  - `electron/main.ts`
  - `app-structure.md`
  - `constraints.md`
  - `task-list.md`
  - `handoff.md`
- 当前实现方式：
  - 新增主进程内 `syncCoordinator`
  - 手动同步与自动同步共用同一协调层
  - 若已有同步执行中：
    - 自动同步跳过
    - 手动同步复用当前执行中的同步 promise
  - 自动同步当前触发点只有：
    - app ready 后延迟一次
    - window focus
  - 自动同步当前去抖：
    - `30s`

### 验证结果
- `corepack pnpm exec vitest run electron/auto-sync.test.ts electron/sync-now.test.ts electron/sqlite.test.ts src/db/storage.desktop.test.ts`：通过
- `corepack pnpm run build:desktop`：通过

### 当前风险
- 当前 renderer 没有额外订阅自动同步完成事件
- 如果设置页已经打开，自动同步完成后的状态通常要等下一次手动刷新 / 重新进入页面才会反映
- 这是当前“最小方案”刻意接受的范围，先不引入新的跨进程状态推送复杂度
- 启动阶段自动备份轮转已补 `ENOENT` 容错，避免旧备份文件在删除时瞬间缺失导致日志噪音

## 2026-05-22（文档收口：确认仅保留本地文件夹同步，并补自动同步最小方案）

### 本轮目标
- 不改业务代码
- 只更新文档口径，确保当前实现与文档一致
- 为下一步自动同步整理最小可实施方案

### 本轮修改
- 更新：
  - `app-structure.md`
  - `task-list.md`
  - `handoff.md`
- 当前文档已明确：
  - WebDAV 不再是当前有效功能
  - 当前同步只保留：
    - 本地文件夹
- `task-list.md` 已将同步方向收口为：
  - `自动同步`
  - `后台同步`
  - `OneDrive`
- `handoff.md` 已补充自动同步最小方案建议：
  - 只在桌面端
  - 只针对本地文件夹
  - 触发点先做：
    - app ready 后延迟一次
    - window focus 时一次
  - 增加最小去抖
  - 不引入 watcher / 托盘 / 后台常驻轮询

### 当前结论
- 当前有效同步能力只有：
  - 手动同步到本地文件夹
- 下一步若做自动同步，优先在现有 `syncNow` 外层增加轻量调度入口
- 不建议直接引入新同步协议、后台服务或复杂策略系统

## 2026-05-22（移除 WebDAV，只保留本地文件夹同步）

### 本轮目标
- 按当前产品决策，彻底移除：
  - 坚果云 `WebDAV`
- 同步当前只保留：
  - 本地文件夹
- 不改本地文件夹同步业务逻辑

### 本轮修改
- 更新：
  - `src/features/settings/SettingsPanel.tsx`
  - `src/db/storage.ts`
  - `src/db/storage.desktop.test.ts`
  - `src/types/models.ts`
  - `src/vite-env.d.ts`
  - `electron/main.ts`
  - `electron/preload.cts`
  - `electron/sqlite.ts`
  - `electron/sqlite.test.ts`
  - `electron/sync-now.ts`
  - `electron/sync-now.test.ts`
  - `electron/sync-target/index.ts`
  - `electron/sync-target/types.ts`
  - `electron/types.ts`
  - `package.json`
  - `constraints.md`
  - `handoff.md`
- 删除：
  - `electron/webdav/*`
  - `electron/sync-target/webdav-driver.ts`
  - `electron/sync-target/webdav-driver.test.ts`
  - `scripts/test-webdav-sync.mjs`
- 当前设置页已收口为：
  - 只显示本地文件夹同步
  - 不再显示 WebDAV 切换、表单、按钮、状态文案
- 当前后端已收口为：
  - preload / IPC 不再暴露 WebDAV 入口
  - `sync-now` 不再创建 WebDAV driver
  - 旧 `sync_meta.syncTargetConfig = webdav` 会被自动忽略
  - 设置本地同步文件夹时，会顺手清掉旧 `syncTargetConfig`

### 验证结果
- `corepack pnpm exec vitest run electron/sqlite.test.ts electron/sync-now.test.ts src/db/storage.desktop.test.ts`：通过
- `corepack pnpm run build:desktop`：通过

### 当前风险
- 仓库中的历史文档仍保留了较多 WebDAV 设计 / 实现记录，属于历史信息，不代表当前有效功能
- 当前有效功能口径以：
  - `constraints.md`
  - `handoff.md`
  为准

## 2026-05-22（同步状态圆点与文案间距优化）

### 本轮目标
- 只优化设置页同步卡片的视觉间距
- 修正：
  - 灰 / 红 / 绿状态圆点
  - 与状态说明文案
  之间距离过大
- 不改任何同步业务逻辑

### 根因
- `settings-sync-card__status` 与通用 `settings-sync-card__row` 共用了一条：
  - `justify-content: space-between`
- 这会把：
  - 左侧状态圆点
  - 右侧状态文案块
  强行推到两端
- 所以中间空白被整体拉大

### 本轮修改
- 更新：
  - `src/styles/globals.css`
- 当前已把：
  - `settings-sync-card__status`
  单独改为：
  - `justify-content: flex-start`
- 同时保留：
  - `settings-sync-card__row`
  继续使用：
  - `justify-content: space-between`
- 这样只影响同步状态行，不影响同步卡片里其他信息行与操作行布局

### 验证结果
- 本轮为纯样式修改
- 未运行自动化测试

### 当前风险
- 当前预期只影响同步卡片状态头部的横向排布
- 若后续发现窄屏下状态文案换行不理想，再单独微调状态行的对齐方式

## 2026-05-22（WebDAV 测试并保存链路可观测性补齐）

### 本轮目标
- 排查并收口设置页：
  - `测试并保存`
  点击后“没有反应”的问题
- 本轮先不假设根因是 WebDAV 协议或超时
- 先补足用户侧与 main process 侧可观测性

### 本轮判断
- 现阶段证据不足以直接认定：
  - WebDAV 网络超时
  就是这次“无响应”的根因
- 更需要先确认：
  - 点击是否真的发出了 IPC 调用
  - main process 是否进入 `db:sync:test-webdav-target`
  - Promise 是成功、失败，还是长时间 pending

### 本轮修改
- 更新：
  - `src/features/settings/SettingsPanel.tsx`
  - `electron/main.ts`
- 当前设置页已新增：
  - `isTestingWebdav`
  - `测试并保存中…` 按钮文案
  - 状态卡在测试期间显示：
    - `正在测试 WebDAV`
    - `正在验证连接、目录结构与凭据，请稍候…`
  - 测试期间禁用：
    - 同步目标切换
    - WebDAV 输入框
    - 行内测试按钮
    - 主操作按钮
- 当前 main process 已新增：
  - `db:sync:test-webdav-target` 开始日志
  - 成功日志
  - 失败日志
- 这样后续再复现时，可以先判断：
  - 是没触发
  - 还是触发后卡在某一步

### 验证结果
- `corepack pnpm exec vitest run electron/webdav/service.test.ts electron/webdav/metadata-poc.test.ts`：通过
- `corepack pnpm run build:desktop`：通过

### 当前建议
- 重新启动 Electron 桌面版后再测一次：
  - `清除配置 -> 重新输入 -> 测试并保存`
- 重点观察：
  - 按钮是否切换为 `测试并保存中…`
  - 状态卡是否进入 `正在测试 WebDAV`
  - 终端中是否出现：
    - `test-webdav-target:start`
    - `test-webdav-target:done`
    - `test-webdav-target:failed`

## 2026-05-22（坚果云 collection URL 尾斜杠兼容修复）

### 本轮目标
- 修复 electron 设置页点击：
  - `立即同步`
  后仍可能出现的：
  - `WebDAV 创建目录失败：503 operation=MKCOL logicalPath=. status=503`
- 不改同步规则，不改 UI 文案

### 根因
- 之前虽然已经补了：
  - `MKCOL 失败后 exists 回查`
  - `exists 先于 MKCOL`
- 但 `WebdavClient` 对目录类请求仍可能使用不带尾斜杠的 collection URL，例如：
  - `/dav/J-Flow`
  - `/dav/J-Flow/devices`
- 真实坚果云对 collection 的 `PROPFIND / MKCOL` 更稳的形态是带尾斜杠：
  - `/dav/J-Flow/`
  - `/dav/J-Flow/devices/`
- 因此 electron 版“立即同步”在 `prepareSyncTarget(...)` 阶段，仍可能因为根目录存在性检查不稳定，最后退回到：
  - `MKCOL .`
  并收到 `503`

### 本轮修改
- 更新：
  - `electron/webdav/client.ts`
  - `electron/webdav/client.test.ts`
- 当前 `resolveWebdavTargetPath(...)` 已支持目录类 URL 显式补尾斜杠
- 当前以下 WebDAV collection 操作统一走带尾斜杠的 URL：
  - `exists -> PROPFIND`
  - `list -> PROPFIND`
  - `ensureDir -> MKCOL`
- 这样根目录与嵌套目录都会统一按 collection 语义访问，减少坚果云把目录请求误判为异常路径的概率

### 验证结果
- `corepack pnpm exec vitest run electron/webdav/client.test.ts`：通过
- `corepack pnpm exec vitest run electron/sync-target/metadata.test.ts electron/sync-now.test.ts`：通过

### 当前建议
- 在 electron 设置页再次使用坚果云目标点击：
  - `立即同步`
- 重点确认：
  - 不再出现 `MKCOL logicalPath=.` 的 `503`

## 2026-05-21（坚果云 MKCOL 503 兼容修复）

### 本轮目标
- 只修复真实坚果云 manual test 中：
  - `prepare-target`
  - `WebDAV 创建目录失败：503 operation=MKCOL logicalPath=. status=503`
  这条兼容问题
- 不改正式同步规则

### 根因
- 坚果云在某些情况下对已存在目录执行 `MKCOL`，可能返回 `503`
- 当前 `WebDAV client.ensureDir(...)` 之前只对：
  - `405 + exists = true`
  视为可接受
- 于是当目录其实已经存在，但 `MKCOL` 返回 `503` 时，会被误判成 fatal

### 本轮修改
- 更新：
  - `electron/webdav/client.ts`
  - `electron/webdav/client.test.ts`
- 当前 `ensureDir(...)` 现在改为：
  - 任意 `MKCOL` 非成功状态下
  - 先尝试 `exists(partialLogicalPath)`
  - 如果目录实际上已经存在，则继续
  - 只有在确认不存在时，才抛原始错误
- 这条修复保持了：
  - localFolder 行为不变
  - metadata 格式不变
  - syncNow 规则不变

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm exec vitest run electron/webdav/client.test.ts electron/webdav/metadata-poc.test.ts electron/webdav/service.test.ts electron/sync-target/metadata.test.ts electron/sync-now.test.ts`：通过

### 当前建议
- 重新运行：
  - `corepack pnpm run test:webdav:manual`
- 重点观察：
  - 不再卡在 `prepare-target / MKCOL 503`

## 2026-05-21（坚果云已有目录先 exists 再 MKCOL）

### 本轮目标
- 继续收口坚果云 `prepare-target` 阶段的目录初始化兼容
- 避免对已存在根目录重复发 `MKCOL`

### 根因补充
- 上一轮“MKCOL 失败后再 exists”仍不够稳
- 因为坚果云根目录若已存在，最稳的路径其实是：
  - 先 `exists`
  - 存在就直接跳过 `MKCOL`
- 否则仍可能先触发不稳定的 `MKCOL 503`

### 本轮修改
- 更新：
  - `electron/webdav/client.ts`
  - `electron/webdav/client.test.ts`
- 当前 `ensureDir(...)` 已改为：
  - 对每一级目录先执行 `exists`
  - 已存在则直接继续
  - 不再先对已存在目录发 `MKCOL`

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm exec vitest run electron/webdav/client.test.ts electron/webdav/metadata-poc.test.ts electron/webdav/service.test.ts electron/sync-target/metadata.test.ts electron/sync-now.test.ts`：通过

## 2026-05-21（收紧 WebDAV manual test 为固定 2 条变更）

### 本轮目标
- 只收紧 `corepack pnpm run test:webdav:manual`
- 让这条 dev-only 手动测试入口稳定输出：
  - 1 个 `dayPlanItem upsert`
  - 1 个 `dayPlanItem delete / tombstone`
- 不改正式同步逻辑

### 根因
- `replaceSqliteSnapshot(dataPath, sqliteTestSeedAppData)` 会自动把 seed 数据写入本地数据库，
  同时把这些 seed 实体排进待同步队列。
- 当前 seed 至少包含：
  - `settings`
  - `2` 个 `sceneTags`
  - `2` 个 `activityTypes`
- 所以在创建 2 条测试 item 前，pending `sync_changes` 已经不是空的。
- 这就是之前：
  - `beforeSyncChangesCount = 7`
  - `exportedCount = 7`
  的原因。

### 本轮修改
- 更新：
  - `scripts/test-webdav-sync.mjs`
  - `docs/sync-webdav-manual-test.md`
- 当前脚本会在 seed 数据写入后，先把 seed 自动产生的 `sync_changes` 标记为已同步。
- 然后再只创建：
  - 一个 upsert 测试 item
  - 一个 delete 测试 item

### 预期输出
- `beforeSyncChangesCount = 2`
- `syncResult.status = "success"`
- `syncResult.exportResult.exportedCount = 2`
- `remote.itemExists = true`
- `remote.tombstoneExists = true`

### 当前边界
- 当前仍未改：
  - `syncNow` 核心规则
  - `sync_changes` 正式规则
  - `WebDAV driver`
  - `LWW`
  - 设置页 UI

## 2026-05-21（WebDAV manual test：远端附加校验 503 容错）

### 本轮目标
- 只增强 `test:webdav:manual` 的远端附加校验稳定性
- 不改正式同步逻辑
- 避免坚果云偶发 `PROPFIND 503` 把已成功的 `syncNow` 误判为整轮失败

### 现象判断
- 这次失败发生在 manual test 脚本同步完成后的远端校验阶段
- 报错为：
  - `WebDAV 列目录失败：503 operation=PROPFIND logicalPath=. status=503`
- 这更像是坚果云对 `PROPFIND` 的短暂 `service unavailable`
- 不代表：
  - 鉴权失败
  - metadata 失败
  - `syncNow` 主链失败

### 本轮修改
- 更新：
  - `scripts/test-webdav-sync.mjs`
  - `docs/sync-webdav-manual-test.md`
- 当前脚本已新增：
  - 对远端附加校验的有限重试
  - 对：
    - `rootEntries`
    - `itemEntries`
    - `tombstoneEntries`
    的容错收口
  - 直接使用 `driver.exists(...)` 校验：
    - item 是否存在
    - tombstone 是否存在
- 当前附加校验失败时会进入：
  - `remote.warnings`
  而不是直接把整轮同步结果打成脚本级 fatal

### 当前边界
- 当前仍未改：
  - `syncNow`
  - `WebDAV client` 正式语义
  - `LWW`
  - 设置页 UI

## 2026-05-21（WebDAV manual test bugfix：首次缺少 sync-info.json）

### 本轮目标
- 只修复真实坚果云 manual test 中的首次初始化失败问题
- 让：
  - 目录已创建
  - 但 `sync-info.json` 缺失
  的 WebDAV target 能被识别为“首次初始化 / 半初始化可修复”状态
- 不扩展同步范围，不改 UI，不改同步规则

### 根因
- `electron/sync-target/metadata.ts` 里的 `touchSyncInfo(...)` 之前只把本地文件系统的：
  - `ENOENT`
  视为首次初始化。
- WebDAV 首次读取 `sync-info.json` 时返回的是：
  - `code = not_found`
  - `status = 404`
- 因此 `prepareSyncTarget(...)` 把“缺少 `sync-info.json`”误判成 fatal error，导致 manual test 在：
  - `prepare-target`
  失败。

### 本轮修改
- 更新：
  - `electron/sync-target/metadata.ts`
  - `electron/sync-target/metadata.test.ts`
  - `electron/webdav/client.ts`
  - `electron/webdav/client.test.ts`
  - `electron/webdav/metadata-poc.test.ts`
- 当前修复内容：
  - 新增通用 `not found` 识别：
    - `ENOENT`
    - `code = not_found`
    - `status = 404`
  - `touchSyncInfo(...)` 现在会把 WebDAV `404` 正确识别为首次初始化
  - 目录已存在但缺少 `sync-info.json` 时，会自动补齐 `sync-info.json`
  - WebDAV 错误信息现在补充：
    - `operation`
    - `logicalPath`
    - `status`
  - 方便人工测试时直接从终端定位失败点

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm exec vitest run electron/sync-target/metadata.test.ts electron/webdav/client.test.ts electron/webdav/metadata-poc.test.ts electron/sync-folder.test.ts electron/sync-now.test.ts`：通过
- `corepack pnpm exec vitest run electron/webdav/service.test.ts electron/sync-target/webdav-driver.test.ts electron/sync-export.test.ts electron/sync-import.test.ts`：通过

### 当前边界
- 当前仍未做：
  - 设置页最终 WebDAV UI
  - 自动同步
  - OneDrive
- 当前建议：
  - 重新运行 `corepack pnpm run test:webdav:manual`
  - 重点确认：
    - `sync-info.json` 会在首次初始化时自动补齐
    - 半初始化目录可继续修复

## 2026-05-21（WebDAV syncNow 人工验证准备）

### 本轮目标
- 新增一个 dev-only / manual-test 入口
- 让本机可以用真实坚果云参数验证：
  - 保存 `webdav target config`
  - 保存 credential
  - 跑一次真实 `syncNow`
  - 在远端生成 metadata / item / tombstone
- 不做正式设置页 UI

### 本轮关键判断
- 当前最轻、最安全的入口是：
  - `pnpm` 脚本
  - `Electron` 运行的 dev-only 手动测试脚本
- 不采用设置页临时按钮，也不新增正式 bridge UI。
- 为了避免污染真实数据，本轮脚本只会创建临时 SQLite 数据目录，并强制建议使用测试远端目录，例如 `J-Flow-Test`。

### 本轮修改
- 更新：
  - `.gitignore`
  - `package.json`
- 新增：
  - `scripts/test-webdav-sync.mjs`
  - `docs/sync-webdav-manual-test.md`
- 新增命令：
  - `corepack pnpm run test:webdav:manual`
- 当前脚本会：
  - 读取 `.env.local`
  - 使用 `testAndSaveWebdavTarget(...)`
  - 再调用 `runManualSync(...)`
  - 最后列出远端根目录、`items/dayPlanItems`、`tombstones/dayPlanItems`
- 当前测试数据会自动创建：
  - 一个 `dayPlanItem upsert`
  - 一个 `dayPlanItem delete / tombstone`

### 安全边界
- `.env.local` 已加入 `.gitignore`
- password 不会进入：
  - 源码
  - 文档示例中的真实值
  - 输出结果
  - 日志
  - 同步目录
  - JSON 备份
- 当前脚本禁止使用正式 `rootPath = J-Flow`

### 验证结果
- `corepack pnpm run lint`：待本轮统一验证
- `corepack pnpm run build`：待本轮统一验证
- `corepack pnpm run build:desktop`：待本轮统一验证
- 当前这轮不在自动化测试里真实访问坚果云

### 当前边界
- 当前仍未做：
  - 正式设置页 WebDAV 配置 UI
  - 自动同步
  - OneDrive
- 当前脚本仅用于本机手动测试，不属于正式产品入口。

## 2026-05-21（WebDAV 接入 syncNow）

### 本轮目标
- 让 `syncNow` 根据 `syncTargetConfig.type` 创建对应 `SyncTargetDriver`
- 保持 `localFolder` 行为不变
- 支持 `webdav target` 的完整手动同步闭环
- 仍不做设置页最终 UI、自动同步或 OneDrive

### 本轮关键判断
- 当前最稳的接法是：
  - `syncNow` 统一切到：
    - 通用 metadata helper
    - target 版 `import / export`
  - `localFolder` 继续兼容旧 `syncTargetPath`
  - `webdav` 通过 `syncTargetConfig + credential store` 创建 driver
- 这样能最大程度复用现有同步核心，而不用再维护两套编排逻辑。

### 本轮修改
- 更新：
  - `electron/sync-now.ts`
  - `electron/sync-now.test.ts`
- 当前 `syncNow` 已改为：
  - 优先使用 `syncTargetConfig`
  - 若 `syncTargetConfig` 缺失，则兼容旧的 `syncTargetPath -> localFolder`
  - `localFolder -> LocalFolderDriver`
  - `webdav -> createWebdavDriverFromStoredCredential(...)`
- 当前同步编排已统一切到：
  - `prepareSyncTarget(driver, ...)`
  - `acquireSyncLock(driver, ...)`
  - `importRemoteChangesFromSyncTarget(...)`
  - `exportLocalChangesToSyncTarget(...)`
  - `updateDeviceInfo(driver, ...)`
  - `releaseSyncLock(driver, ...)`

### 当前能力
- 当前 `syncNow` 已支持：
  - `localFolder`
  - `webdav`
- 当前保持不变：
  - 先 `import`，后 `export`
  - `partial / failed` 不写 `lastSyncedAt`
  - `success` 才写本机与远端 `lastSyncedAt`
  - 无变化但成功仍写 `lastSyncedAt`
  - 导入仍不会制造新的待同步 `sync_changes`
- 当前 `webdav` 若缺少 credential，则会直接 `failed`

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm exec vitest run electron/sync-now.test.ts electron/sync-import.test.ts electron/sync-export.test.ts electron/sync-folder.test.ts electron/sync-target/local-folder-driver.test.ts electron/sync-target/webdav-driver.test.ts electron/sync-target/metadata.test.ts electron/webdav/client.test.ts electron/webdav/service.test.ts electron/webdav/metadata-poc.test.ts electron/webdav/import-export-poc.test.ts`：通过

### 当前边界
- 当前仍未做：
  - 设置页最终 `webdav` 同步目标 UI
  - 自动同步 / 定时同步 / 后台同步
  - OneDrive
- 当前建议下一步先用测试数据与测试坚果云目录做一轮小规模人工验证，再决定是否开始 UI 接线。

## 2026-05-21（WebDAV metadata POC：跑通通用 metadata helper）

### 本轮目标
- 用已经实现的 `WebDAV SyncTargetDriver` 跑通通用 metadata helper
- 只验证 metadata 层：
  - `sync-info.json`
  - `devices/<deviceId>.json`
  - `locks/`
- 不接完整同步

### 本轮关键判断
- 当前最稳的推进方式是：
  - 保持 `repository.sync.testWebdavTarget(...)` 这个受控入口不变
  - 但把它内部从旧的 metadata 写死逻辑切换到：
    - `WebDAV SyncTargetDriver`
    - 通用 metadata helper
- 这样既能验证 WebDAV target 可承载同样的 metadata 协议，
  又不会提前把 `syncNow / import / export` 拉进来。

### 本轮修改
- 新增：
  - `electron/webdav/metadata-poc.ts`
  - `electron/webdav/metadata-poc.test.ts`
- 更新：
  - `electron/webdav/service.ts`
  - `electron/webdav/service.test.ts`
  - `electron/webdav/client.test.ts`
  - `app-structure.md`
- 当前 `runWebdavMetadataPocTest(...)` 已通过：
  - `prepareSyncTarget(driver, ...)`
  - `readSyncInfo(driver)`
  - `updateDeviceInfo(driver, ...)`
  - `acquireSyncLock(driver, ...)`
  - `releaseSyncLock(driver, ...)`
  跑通 WebDAV target 上的 metadata 验证

### 当前能力
- 当前 WebDAV metadata POC 已验证：
  - 可初始化或复用 `sync-info.json`
  - 可写入 / 更新 `devices/<deviceId>.json`
  - 可获取 / 释放 `locks/sync_<deviceId>.json`
  - 未过期锁冲突仍有效
  - 过期 / 损坏锁仍可清理
- 当前 `repository.sync.testWebdavTarget(...)` 成功后仍会：
  - 保存 `webdav target config`
  - 保存 credential
- 当前失败时仍不会：
  - 保存 password
  - 覆盖旧可用 target config

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm exec vitest run electron/sync-target/metadata.test.ts electron/sync-target/webdav-driver.test.ts electron/webdav/client.test.ts electron/webdav/service.test.ts electron/webdav/metadata-poc.test.ts electron/sync-folder.test.ts electron/sync-export.test.ts electron/sync-import.test.ts electron/sync-now.test.ts`：通过

### 当前边界
- 当前仍未接入：
  - `syncNow`
  - `sync-export`
  - `sync-import`
- 当前仍未开始：
  - `items / tombstones`
  - `LWW`
  - 完整同步闭环
  - 设置页最终 UI

## 2026-05-20（WebDAV 接入 Sync Core Step 1：抽通用 metadata helper）

### 本轮目标
- 抽出通用 sync metadata helper
- 让：
  - `sync-info.json`
  - `devices/<deviceId>.json`
  - `locks/`
  的协议逻辑不再依赖 `localFolder` 专属实现
- 保持现有 `sync-folder.ts` 外部 API 兼容
- 保持 local folder 行为不变

### 本轮关键判断
- WebDAV 接入 sync core 前，最稳的第一步仍然是先把 metadata / lock 协议层抽出来。
- 当前不应该直接跳去改：
  - `syncNow`
  - `sync-export`
  - `sync-import`
- `sync-folder.ts` 现在更适合作为：
  - local folder 路径校验层
  - 旧 API 兼容包装层

### 本轮修改
- 新增：
  - `electron/sync-target/metadata.ts`
  - `electron/sync-target/metadata.test.ts`
- 更新：
  - `electron/sync-target/index.ts`
  - `electron/sync-folder.ts`
  - `app-structure.md`
- 当前通用 helper 已支持：
  - `prepareSyncTarget(driver, ...)`
  - `readSyncInfo(driver)`
  - `writeSyncInfo(driver, ...)`
  - `touchSyncInfo(driver, ...)`
  - `updateDeviceInfo(driver, ...)`
  - `acquireSyncLock(driver, ...)`
  - `releaseSyncLock(driver, ...)`
- `sync-folder.ts` 当前已改为：
  - 继续保留旧入口
  - 内部创建 `LocalFolderDriver`
  - 再调用通用 metadata helper

### 当前能力
- 当前 `sync-info.json` 规则保持不变：
  - 首次创建
  - 合法文件复用
  - 保留 `createdAt`
  - 刷新 `updatedAt`
- 当前 `devices/<deviceId>.json` 规则保持不变
- 当前 `locks/` 规则保持不变：
  - 未过期锁冲突
  - 过期 / 损坏锁清理
  - 只释放自己的锁

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm exec vitest run electron/sync-target/metadata.test.ts electron/sync-folder.test.ts electron/sync-target/local-folder-driver.test.ts electron/sync-target/webdav-driver.test.ts electron/sync-export.test.ts electron/sync-import.test.ts electron/sync-now.test.ts`：通过

### 当前边界
- 当前仍未让：
  - `syncNow`
  - `sync-export`
  - `sync-import`
  直接使用通用 metadata helper
- 当前仍未让 `webdav` 接入完整 sync core
- 当前仍未开始：
  - `items / tombstones`
  - `LWW`
  - 设置页 UI

## 2026-05-20（WebDAV POC 01：低层能力验证）

### 本轮目标
- 开始 `WebDAV / 坚果云` 第一轮代码 POC
- 只做远端低层能力验证
- 不接 `syncNow`
- 不接 `items / tombstones`
- 不改设置页 UI

### 本轮关键判断
- 当前最稳的落地方向是：
  - 先把 WebDAV low-level client 和 credential store 独立做出来
  - 不直接污染 sync core
- POC 阶段采用：
  - `fetch + XML parser`
  - 新增 `fast-xml-parser`
  - 不引入完整 WebDAV client 库
- 凭据继续严格限制为：
  - 本机隔离存储
  - 不进入同步目录
  - 不进入 `items / tombstones`
  - 不进入 JSON 备份

### 本轮修改
- 更新 `package.json`
  - 新增运行时依赖：
    - `fast-xml-parser`
- 更新 `pnpm-lock.yaml`
- 新增 `electron/webdav/types.ts`
  - 定义：
    - `WebdavTargetConfig`
    - credential store 相关类型
    - low-level client 错误类型
    - POC 结果类型
- 新增 `electron/webdav/credentials.ts`
  - 实现：
    - 凭据键生成
    - 基于 `Electron safeStorage + 本机隔离文件` 的保存 / 读取 / 删除
  - 规则：
    - 测试连接失败时默认不持久化凭据
    - 仅在显式成功后保存
- 新增 `electron/webdav/client.ts`
  - 实现：
    - `GET`
    - `PUT`
    - `DELETE`
    - `MKCOL`
    - `PROPFIND`
    - `exists`
  - 补充：
    - POSIX logicalPath 校验
    - `../` 防穿越
    - URL 编码
    - WebDAV 错误映射
- 新增 `electron/webdav/poc.ts`
  - 实现：
    - `runWebdavPocTest(config, password)`
  - 当前步骤：
    - 校验配置
    - ensure rootPath
    - 写测试 JSON
    - 读回测试 JSON
    - list 根目录
    - delete 测试 JSON
- 新增测试：
  - `electron/webdav/credentials.test.ts`
  - `electron/webdav/client.test.ts`

### 验证结果
- `corepack pnpm install`：通过
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm exec vitest run electron/webdav/credentials.test.ts electron/webdav/client.test.ts`：通过
- `corepack pnpm exec vitest run electron/sync-folder.test.ts electron/sync-export.test.ts electron/sync-import.test.ts electron/sync-now.test.ts electron/sync-target/local-folder-driver.test.ts`：通过

### 当前未完成 / 风险
- 当前 `WebDAV` 仍是 low-level POC，不代表已经接入现有同步主链。
- 目前还没有：
  - 正式 `webdav` target config 持久化代码
  - main / preload 受控 bridge
  - `SyncTargetDriver` 正式 `webdav` driver
  - `sync-info.json / devices` metadata 接入
  - 设置页 UI
- 下一阶段建议先做：
  - `webdav` target config
  - main 侧 credential store 接口
  - WebDAV metadata POC

## 2026-05-20（WebDAV POC：实现前最后决策）

### 本轮目标
- 在正式实现 `WebDAV / 坚果云` POC 前
- 再收口两个最小工程决策：
  - `webdav target config` 存放位置和持久化方式
  - WebDAV POC 使用 `fetch + XML parser` 还是完整 client 库

### 本轮关键判断
- 当前不需要再扩更多大方案，先把两个最小工程决策拍板，能让下一轮代码 POC 范围明显更稳。
- `webdav target config` 最适合落在本机 `SQLite sync_meta`，而不是同步目录或 JSON 备份中。
- 对当前 POC 范围来说，`fetch + XML parser` 比完整 WebDAV client 库更合适：
  - 更轻
  - 更可控
  - 更适合只做 metadata 级验证

### 本轮修改
- 新增 `docs/sync-webdav-poc-decisions.md`
  - 明确：
    - `syncTargetConfig` 后续保存在本机 `SQLite sync_meta`
    - `password / app password` 不进入 config
    - credential store POC 阶段采用：
      - `Electron safeStorage + 本机隔离文件`
    - 测试连接失败时默认不保存凭据
    - WebDAV POC 技术路线采用：
      - `fetch + XML parser`
    - XML parser 候选建议：
      - `fast-xml-parser`
- 更新 `handoff.md`
  - 记录当前 WebDAV POC 前的最终实现决策

### 验证结果
- 本轮仅更新文档，未改代码实现。

### 当前未完成 / 风险
- 当前只是决策文档，不代表已经开始 `webdav` target config、credential store 或 WebDAV low-level client 的代码实现。
- 下一轮若进入代码 POC，仍需要先确认：
  - `syncTargetPath` 与未来 `syncTargetConfig` 的兼容迁移策略
  - `fast-xml-parser` 是否最终采用
  - WebDAV low-level client 的错误模型如何收口

## 2026-05-20（WebDAV / 坚果云：边界收口与实施计划）

### 本轮目标
- 把第一云同步目标正式从 `OneDrive` 调整为 `WebDAV / 坚果云`
- 继续只改文档，不写代码
- 收口边界并补齐 `WebDAV` 实施计划

### 本轮关键判断
- 当前 `WebDAV / 坚果云` 更适合作为第一云同步目标，因为：
  - 不需要 `OAuth client id`
  - 不依赖 `Azure tenant / App Registration`
  - 更贴近当前 `SyncTargetDriver` 的“类文件系统”模型
- 这次方向调整不是推翻 `Sync 1-5`，而是把第一云目标从 `OneDrive` 切换为 `WebDAV / 坚果云`。
- 当前仍应先做 metadata POC，而不是直接接完整同步闭环。

### 本轮修改
- 更新 `constraints.md`
  - 把第一阶段云同步目标从 `OneDrive` 调整为 `WebDAV / 坚果云`
  - 明确：
    - 不做 `J-Flow` 自有账号系统
    - 不做 `J-Flow` 自有云数据库 / 自有云同步体系
    - 允许第三方同步目标接入
    - `OneDrive` 保留为未来目标，但暂缓
    - 当前不做自动同步 / 实时同步 / 后台定时同步
    - `JSON` 备份不是同步包
    - 继续复用现有同步协议主链
- 新增 `docs/sync-webdav-implementation-plan.md`
  - 细化：
    - `webdav` target config
    - 坚果云默认配置
    - credential store 设计
    - `WebDAV driver` 模块建议
    - WebDAV 方法映射
    - metadata POC 范围
    - 错误处理边界
    - 是否引入依赖的比较维度
    - 设置页未来状态机
    - 推荐实现顺序
- 更新 `handoff.md`
  - 记录 `WebDAV / 坚果云` 已成为第一阶段云同步目标
  - 记录当前仍未写 `WebDAV driver` 或坚果云 UI

### 验证结果
- 本轮仅更新文档与约束说明，未改代码实现。

### 当前未完成 / 风险
- 当前只是边界与实施计划，不代表已经开始 `WebDAV` 代码实现。
- 下一阶段仍需要先决定：
  - `SyncTargetConfig` 的持久化升级方式
  - WebDAV 凭据是否在“测试成功后再保存”
  - WebDAV 先用轻量库还是 `fetch + XML parser`
- 当前仍未开始：
  - `webdav` target config 代码
  - credential store
  - `WebDAV driver`

## 2026-05-20（WebDAV / 坚果云：方向切换与设计文档）

### 本轮目标
- 暂停 `OneDrive OAuth` 方向
- 改为优先收口 `WebDAV / 坚果云` 作为第一云同步目标
- 继续只改文档，不写代码

### 本轮关键判断
- 当前 `OneDrive` 方向的主要阻力不在同步协议本身，而在：
  - `App Registration`
  - `Azure tenant`
  - OAuth 前置配置获取
- `坚果云 WebDAV` 更适合作为现阶段第一云目标，因为：
  - 不需要 `OAuth client id`
  - 更接近当前 `SyncTargetDriver` 的“类文件系统”读写模型
  - 更适合作为远端 driver 的第一验证对象
- 这次调整不是推翻现有 `Sync 1-5`，而是把“第一云同步目标”从 `OneDrive` 暂时切换为 `WebDAV / 坚果云`。

### 本轮修改
- 新增 `docs/sync-webdav-jianguoyun-design.md`
  - 说明：
    - `WebDAV / 坚果云` 的产品边界
    - 用户需要准备的连接信息
    - `SyncTargetConfig` 的 `webdav` 设计
    - 凭据存储原则
    - `WebDAV driver` 的能力边界
    - 坚果云 POC 的最小验证范围
    - 设置页未来状态机建议
    - 推荐实现顺序
- 更新 `handoff.md`
  - 记录当前方向从 `OneDrive` 暂时切换到 `WebDAV / 坚果云`
  - 说明尚未开始 `WebDAV` 代码实现

### 验证结果
- 本轮仅新增与更新文档，未改代码实现。

### 当前未完成 / 风险
- 当前只是设计文档，不代表已经开始 `WebDAV driver` 或坚果云接入。
- 当前 `constraints.md` 仍然写着第一目标为 `OneDrive`，与本轮新方向存在待更新差异。
- 下一轮若正式开始 `WebDAV` 方向，应优先先改：
  - `constraints.md`
  - `SyncTargetConfig`
  - 凭据存储设计收口

## 2026-05-19（OneDrive：实现前决策收口）

### 本轮目标
- 继续只改文档
- 不写 OneDrive OAuth 代码
- 在进入 OneDrive OAuth POC 前，先收口三个前置决策：
  - 产品边界
  - OAuth POC 参数
  - token 存储方案

### 本轮关键判断
- 当前 `localFolder` 同步闭环与 `SyncTargetDriver` 主链已经建立，不需要推翻。
- OneDrive 下一阶段应被视为：
  - 新增第三方同步目标授权接入
  - 而不是引入 `J-Flow` 自有账号系统或自有云数据库
- 在真正开始 OAuth POC 前，最重要的是先把：
  - `constraints.md` 边界
  - OAuth POC 所需参数
  - token 存储策略
  收口清楚，避免后续一边实现一边改方向。

### 本轮修改
- 更新 `constraints.md`
  - 改写“当前不做云同步”的旧边界
  - 明确：
    - 不做 `J-Flow` 自有云同步体系
    - 允许第三方云同步目标授权接入
    - 第一目标为 `OneDrive`
    - 仍不做自动同步 / 实时同步 / WebDAV / Dropbox / Google Drive
- 新增 `docs/sync-onedrive-oauth-poc.md`
  - 说明：
    - Microsoft app client id
    - redirect URI
    - `Authorization Code + PKCE`
    - `localhost / 127.0.0.1` loopback callback
    - scopes 边界
    - App Folder 权限目标
    - 哪些配置可提交
    - 哪些信息不能提交到 Git
    - 本地 `.env.local` / `.env.example` 命名建议
- 新增 `docs/sync-onedrive-token-storage-options.md`
  - 对比：
    - `keytar`
    - `Electron safeStorage + 本机隔离文件`
    - POC 临时明文 / 隔离存储
  - 收口：
    - POC 阶段推荐方案
    - 正式阶段推荐方案
    - 各自风险
    - 对 macOS / Windows 打包的影响
- 更新 `handoff.md`
  - 记录 OneDrive 方向进入实现前决策阶段
  - 明确当前仍未写 OAuth、Graph API 和设置页 UI

### 验证结果
- 本轮仅更新文档与约束说明，未改代码实现。

### 当前未完成 / 风险
- `constraints.md` 边界已放开到“允许第三方同步目标授权接入”，但这不等于已开始实现 `OneDrive`。
- 当前仍未确认：
  - Microsoft app 注册参数的最终取值
  - scopes 的最终精确常量
  - token 存储正式方案最终是否采用 `keytar`
- 下一阶段若进入 OAuth POC，建议先只验证：
  - 浏览器授权
  - loopback callback
  - 账号信息
  - App Folder metadata 读写
  不要一开始就接完整同步链路。

## 2026-05-18（同步方案：实现前规格补充细节）

### 本轮目标
- 继续只改文档
- 补齐第一版同步开始实现前最容易出偏差的关键细节

### 本轮关键判断
- 当前同步仍处于设计阶段，本轮继续不进入实现。
- 第一版同步如果不先明确：
  - `entityType` 与目录名映射
  - `updatedAt` 的稳定来源
  - 本地删除记录机制
  - 本地变化识别基础
  - LWW 的时间假设
  - lock 文件格式
  - `sync-info.json` 最小字段
  后续实现很容易出现多处口径不一致。

### 本轮修改
- 更新 `docs/sync-implementation-plan.md`
  - 新增 `entityType` 与目录名映射表
  - 明确 `updatedAt` 不能在导出 sync item 时无脑刷新
  - 明确旧数据需要初始化 `updatedAt`
  - 明确本地删除不能只依赖远端 tombstone
  - 推荐补本地 `sync_changes` / `deleted_entities` / 本地 tombstone 机制
  - 明确 `lastSyncedAt` 的本地职责
  - 明确第一版 LWW 依赖设备时间基本准确
  - 新增最小 lock 文件格式建议
  - 新增 `sync-info.json` 最小字段建议

### 验证结果
- 本轮仅更新文档，未改代码实现。

### 当前未完成 / 风险
- 目前仍是实现前规格，不代表已经决定具体把本地同步元数据放在 SQLite meta、独立本地表还是本地配置文件。
- 若后续进入实现，仍需要先选定：
  - 本地 `sync_changes` 的具体落点
  - 旧数据 `updatedAt` 初始化时机
  - 锁过期与异常恢复的最终策略

## 2026-05-18（同步方案：实现前规格文档）

### 本轮目标
- 继续只做同步文档
- 不写实现代码
- 把第一版本地文件夹同步从产品说明细化为可执行的实现前规格

### 本轮关键判断
- 当前同步仍处于设计阶段，本轮继续不进入实现。
- 第一版同步继续保持最小范围：
  - 只支持桌面端
  - 每台设备继续使用自己的本地 SQLite
  - 用户选择同步文件夹
  - 只做“立即同步”
  - 同步前自动创建本地备份
  - 冲突先用“最后修改的一方胜出”
  - 不做账号系统 / WebDAV / 自动同步 / 实时同步
  - 不同步 SQLite 文件本体
  - 不把 JSON 备份当同步包

### 本轮修改
- 新增 `docs/sync-implementation-plan.md`
  - 细化：
    - 同步文件夹结构
    - sync item 文件最小格式
    - tombstone 规则
    - `deviceId` 规则
    - 冲突规则细化
    - 同步数据范围表格
    - “立即同步”步骤拆分
    - 第一版不做什么
    - 后续实现里程碑
- 更新 `docs/sync-design.md`
  - 在文末补充实现前规格文档入口
- 更新 `handoff.md`
  - 记录同步仍处于设计阶段，尚未实现
- 更新 `task-list.md`
  - 新增同步设计里程碑说明，并标注尚未进入实现

### 验证结果
- 本轮仅新增与更新文档，未改代码实现。

### 当前未完成 / 风险
- 当前文档已经足够指导第一版实现拆分，但仍未放开“开始实现同步”的阶段约束。
- 若后续进入实现，仍建议先再确认：
  - `settings` 最终哪些字段参与跨设备同步
  - tombstone 长期保留策略是否后续要提供清理能力
  - `logbookEntries` 与 `segmentedProgressLogs` 后续是否继续保持全量同步
  - 同步结果提示是否需要展示覆盖统计

## 2026-05-18（同步方案：第一版产品设计文档）

### 本轮目标
- 不开始实现同步
- 不改数据库 schema
- 不改设置页 UI
- 先把“最简单、可落地、可读懂”的同步方案写成产品文档

### 本轮关键判断
- 当前 `constraints.md` 仍然写着“当前不做云同步”，因此本轮只做设计文档，不直接进入实现。
- 用户已明确第一版同步边界：
  - 只支持桌面端
  - 每台设备继续使用自己的本地 SQLite
  - 用户选择同步文件夹
  - 只做“立即同步”
  - 同步前自动创建本地备份
  - 冲突先用“最后修改的一方胜出”
  - 不做账号系统 / 云服务器 / WebDAV / 实时同步
  - 不同步 SQLite 文件本体
  - 不把 JSON 备份当同步用

### 本轮修改
- 新增 `docs/sync-design.md`
  - 用产品语言说明：
    - 同步解决什么问题
    - 同步与备份的区别
    - 为什么不直接同步 SQLite
    - 第一版同步用户流程
    - 同步文件夹里大概放什么
    - 哪些数据需要同步
    - 哪些数据不需要同步
    - 第一版冲突处理方式
    - 后续演进方向

### 验证结果
- 本轮仅新增设计文档，未改代码实现。

### 当前未完成 / 风险
- 当前只是产品方案文档，不代表已放开“开始实现云同步”的阶段约束。
- 若后续进入实现，需要先同步调整相关规则文档，明确：
  - 第一版同步是否正式纳入当前阶段目标
  - 哪些设置字段跨设备同步
  - 日志与分次推进记录是否全部纳入同步主数据
- 当前文档有意避免深入到底层实现细节；后续实现前仍需补一版技术设计。

## 2026-05-17（V3.4 Windows 真机打包与启动修复）

### 本轮目标
- 在 Windows 真机上跑通 `package:win` 与 exe 启动验证
- 不做新功能
- 优先排查此前 Windows portable 包“双击打开没反应”的问题

### 本轮关键判断
- 此前“打开没反应”的直接原因不是业务逻辑，而是 packaged Electron preload 加载失败：
  - 初始产物中 `preload.js` 带 ESM `import`
  - 改成 `require` 后，TypeScript 在 `"type": "module"` + `NodeNext` 下仍会输出 `export {}`
  - Electron preload 按 CommonJS 语境加载时因此报语法错
- 最小修复是把 preload 源文件改为 `.cts`，让 TypeScript 输出 `preload.cjs`，并让 main process 指向该 `.cjs` 文件。
- Windows 打包脚本需要避免 Unix shell 写法；图标同步改为 Node 脚本。
- 当前 Windows 环境下 `electron-builder` 的 legacy `winCodeSign` 解压会因为无 symlink 权限失败，因此本轮先关闭 Windows exe resource edit：
  - `build.win.signAndEditExecutable=false`
  - 这是打包链路兼容处理，不是产品功能变化。

### 本轮修改
- 新增 `scripts/sync-icon.mjs`
  - 用跨平台 Node 脚本将 `J-Flow.PNG` 同步为 `build/icon.png`
- 更新 `package.json`
  - `sync:icon` 改为调用 Node 脚本
  - `package:win` 改为 Windows 可执行的命令链
  - `package:win` 内置 Electron / electron-builder 镜像环境变量
  - `package:win` 增加 `-c.npmRebuild=false`
  - Windows 打包配置纳入 `dist-electron/**/*.cjs`
  - Windows 配置增加 `signAndEditExecutable=false`
- 将 `electron/preload.ts` 改为 `electron/preload.cts`
  - 让 preload 编译为 CommonJS `.cjs`
  - preload 运行时仍只暴露原有 `window.jflowDesktop` bridge，不新增功能
- 更新 `electron/main.ts`
  - preload 路径从 `preload.js` 改为 `preload.cjs`
- 更新 `electron/tsconfig.json`
  - 纳入 `./**/*.cts`

### 验证结果
- `package:win`：已在 Windows 真机跑通
- `release/win-unpacked/J-Flow.exe`：
  - 启动后 10 秒仍存活
  - 未再出现 `Unable to load preload script`
  - 未再出现 preload `SyntaxError`
  - 未见 renderer `ERR_FILE_NOT_FOUND`
- `release/J-Flow-V1-win-portable.exe`：
  - 启动后 15 秒 portable 进程仍存活
  - 成功拉起 J-Flow 子进程
  - 未见 preload / renderer 加载错误
- 额外验证：
  - `dist-electron/preload.cjs` 中已无 ESM `import` / `export`

### 当前未完成 / 风险
- 当前 Windows portable 包为未签名本地测试包。
- 因 `signAndEditExecutable=false`，Windows exe 的资源编辑能力被关闭；后续如要正式发布，需要再解决 Windows `winCodeSign` / symlink 权限或签名环境问题。
- 本轮没有新增产品功能，也没有改 SQLite 数据路径规则。

## 2026-05-17（仓库整理：GitHub 发布前可读性收口）

### 本轮目标
- 将仓库整理成更适合 push 到 GitHub 的“对外可读”状态
- 不改业务逻辑、不改 UI、不改存储层、不做新功能
- 收口 README、开发文档入口、`.gitignore` 与打包产物说明

### 本轮关键判断
- 本轮不改业务实现，只做仓库层整理。
- `README.md` 不再承担开发交接与阶段日志职责，而是改为 GitHub 首页介绍文档。
- 当前不直接把根目录规则文档整体迁入 `docs/`：
  - 原因是 `AGENTS.md` 明确要求新任务开始前优先读取根目录下这些文档
  - 若本轮直接迁移，会先破坏现有协作约定
- 因此本轮采用低风险方案：
  - 保留根目录规则文档
  - 新增 `docs/README.md` 作为内部开发资料索引
  - 在 README 中明确区分“对外介绍”和“内部文档入口”

### 本轮修改
- 更新 `README.md`
  - 重写为面向 GitHub 读者的项目介绍
  - 补充：
    - 项目简介
    - 当前状态
    - 功能亮点
    - 平台支持
    - 技术栈
    - 本地开发命令
    - 打包产物位置
    - 数据与隐私
    - 当前限制 / Roadmap
    - 开发文档入口
    - License 状态
- 新增 `docs/README.md`
  - 作为内部开发文档索引页
  - 说明本轮为何暂不整体迁移根目录规则文档
- 更新 `.gitignore`
  - 补充忽略：
    - `.pnpm-store/`
    - `build/`
    - `release/`
    - `*.tsbuildinfo`
    - 本地数据库文件
    - 编辑器与系统临时文件
    - `backups/`

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过

### 当前未完成 / 风险
- 本轮没有直接删除 `release/` 中已有历史产物，只通过 `.gitignore` 防止后续误提交。
- 当前根目录仍保留：
  - `handoff.md`
  - `dev-log.md`
  - `product-rules.md`
  - `data-model.md`
  - `app-structure.md`
  - `constraints.md`
  - `task-list.md`
  - `design-guidelines.md`
  - `manual-test-checklist.md`
  这是为兼容当前协作规则的刻意保留，不是遗漏。
- 若后续希望把核心文档正式迁移到 `docs/`，建议先同步调整：
  - `AGENTS.md`
  - 文档引用路径
  - 新任务启动时的阅读约定

### 后续补充（同日）
- 用户随后确认：
  - 根目录图片资源继续保留
  - 接受当前兼容方案
  - 不再做文档迁移
  - `release/` 目录只保留：
    - `J-Flow-V1.4.dmg`
- 已按确认执行清理：
  - 删除旧 `.dmg`
  - 删除 `.blockmap`
  - 删除 Windows `portable` 包
  - 删除 `unpacked` / `mac-arm64` 与 builder 中间文件
- 清理后核对结果：
  - `release/` 当前仅剩：
    - `J-Flow-V1.4.dmg`

## 2026-05-17（V3 Desktop：Mac 打包版本名切到 V1.4）

### 本轮目标
- 将当前 macOS 打包产物名从 `V1.3` 更新为 `V1.4`
- 在当前代码状态下实际产出新 `.dmg`

### 本轮关键判断
- 这轮不改业务逻辑，只收口打包版本名与产物输出。
- 继续沿用现有图标同步链路：
  - 打包前自动将根目录 `J-Flow.PNG` 同步到 `build/icon.png`

### 本轮修改
- 更新 `package.json`
  - `build.dmg.artifactName` 改为：
    - `J-Flow-V1.4.dmg`
- 更新 `handoff.md`
  - 记录本轮已切到 `V1.4` 命名并执行实际打包

### 验证结果
- `corepack pnpm run package:mac`：通过
- 成功产出：
  - `release/J-Flow-V1.4.dmg`
  - `release/J-Flow-V1.4.dmg.blockmap`

### 当前未完成 / 风险
- 若 `electron-builder` 受本机环境或缓存影响失败，需要根据打包日志继续补修。

## 2026-05-15（V3 Desktop：分次事项按日汇总推进量到“当日未完成”）

### 本轮目标
- 不新增“当日推进”分区
- 让分次事项在日志的“当日未完成”里显示当天推进总量

### 本轮关键判断
- 用户不要独立的推进分区，因此本轮不新增 `当日推进`。
- 现有日志只会在次日生成“昨天快照”，单靠 `dayPlanItem.progressPercent` 只能看到最终值，看不到当天推进区间。
- 为了在不增加新分区的前提下保留推进信息，本轮新增按天聚合的分次推进记录：
  - 只记录当天第一次推进前的起点
  - 以及当天最后一次推进后的进度
- 生成“当日未完成”时：
  - 若当天存在推进聚合记录，则优先显示：
    - `推进 xxx 20% -> 40%`
  - 否则继续显示：
    - `xxx 进度：40%`

### 本轮修改
- 更新 `src/types/models.ts`、`electron/types.ts`、`src/db/schema.ts`
  - `AppData` 新增：
    - `segmentedProgressLogs`
  - 新增：
    - `SegmentedProgressLog`
  - `APP_DATA_SCHEMA_VERSION` 升级到 `9`
- 更新 `src/db/storage.ts`
  - 旧快照缺少 `segmentedProgressLogs` 时自动补空数组
- 更新 `electron/sqlite.ts`
  - 新增表：
    - `segmented_progress_logs`
  - SQLite 快照读写接入该集合
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 分次进度变更时，按“当天起点 -> 当天最后一次推进后的进度”聚合写入日志辅助记录
- 更新 `src/features/logbook/logbook-service.ts`
  - 生成“当日未完成”时优先读取推进聚合记录并输出：
    - `推进 xxx 20% -> 40%`
- 新增 `src/features/logbook/logbook-service.test.ts`
  - 覆盖未完成区的推进汇总文案
- 更新 `src/db/storage.test.ts`、`electron/sqlite.test.ts`
  - 覆盖旧快照默认空推进记录
  - 覆盖 SQLite 的推进记录 round-trip

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm exec vitest run src/features/logbook/logbook-service.test.ts src/db/storage.test.ts electron/sqlite.test.ts`：通过
- `corepack pnpm run build`：通过

### 当前未完成 / 风险
- 当前“推进总量”按“当天起点 -> 当天最后一次推进后的进度”计算，而不是记录每一次来回调整。
- 若分次事项当天推进后又完成，它不会出现在“当日未完成”中，这是符合当前区块语义的刻意边界。

## 2026-05-15（V3 Desktop：日志页支持删除当日快照）

### 本轮目标
- 让日志页中的每一条“当日快照”支持手动删除
- 删除前明确提示这是永久删除

### 本轮关键判断
- 本轮只删单条 `logbook entry`，不回溯删除原始 Todo 或别的日期日志。
- 删除入口保持轻量，不做成重操作区：
  - 与“复制 Markdown”并排放在卡片头部
- 删除确认文案明确为永久删除，避免误会是仅隐藏。

### 本轮修改
- 更新 `src/pages/logbook/LogbookPage.tsx`
  - 每条日志卡片头部新增轻量 `删除` 按钮
  - 删除前弹出确认：
    - `确认永久删除 xxxx.xx.xx 的当日快照吗？`
  - 删除后即时刷新当前日志列表
  - 同步清理该条日志对应的本地备注 / 复制 / 保存状态
- 更新 `src/styles/globals.css`
  - 为日志卡片头部操作组补充紧凑样式

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过

### 当前未完成 / 风险
- 本轮未新增日志页交互测试，当前主要依赖构建校验与手测。
- 日志删除是永久删除；当前没有“恢复日志”能力，这是符合本轮目标的刻意边界。

## 2026-05-05（V3 Desktop：Logbook 时间格式兼容修复 + V1.3 重打包）

### 本轮目标
- 修复已打包版本打开后日志页因 `completedItems.time` 校验失败导致的初始化报错
- 重新产出修复后的 `V1.3` macOS `.dmg`

### 本轮关键判断
- 问题不在日志生成本身，而在 schema 校验口径不一致：
  - 生成逻辑写入的是全角时间 `HH：mm`
  - schema 只接受半角时间 `HH:mm`
- 为了兼容已经生成过的日志快照，本轮不改历史数据，也不强制把全角时间迁成半角。
- 最稳的修法是放宽 schema，允许：
  - `HH:mm`
  - `HH：mm`

### 本轮修改
- 更新 `src/db/schema.ts`
  - `logbookCompletedItemSchema.time` 的正则改为同时接受半角 / 全角冒号
- 更新 `src/db/storage.test.ts`
  - 补充旧日志使用全角时间时仍可成功导入的兼容测试

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm exec vitest run src/db/storage.test.ts`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run package:mac`：通过
- 成功重新产出：
  - `release/J-Flow-V1.3.dmg`
  - `release/J-Flow-V1.3.dmg.blockmap`

### 当前未完成 / 风险
- 当前日志内部 `time` 仍保留全角格式，这是有意和页面文案保持一致；后续若想统一内部存储格式，可再单独做一次轻量归一化。

## 2026-05-05（V3 Desktop：Mac 打包版本名切到 V1.3）

### 本轮目标
- 将当前 macOS 打包产物名从 `V1.2` 更新为 `V1.3`
- 在当前代码状态下实际产出新 `.dmg`

### 本轮关键判断
- 这轮不单独改业务逻辑，只收口打包版本名与产物输出。
- 继续沿用现有图标同步链路：
  - 打包前自动将根目录 `J-Flow.PNG` 同步到 `build/icon.png`

### 本轮修改
- 更新 `package.json`
  - `build.dmg.artifactName` 改为：
    - `J-Flow-V1.3.dmg`
- 更新 `handoff.md`
  - 记录本轮已切到 `V1.3` 命名并执行实际打包

### 验证结果
- `corepack pnpm run package:mac`：通过
- 成功产出：
  - `release/J-Flow-V1.3.dmg`
  - `release/J-Flow-V1.3.dmg.blockmap`

### 当前未完成 / 风险
- 若 `electron-builder` 受本机环境或缓存影响失败，需要根据打包日志继续补修。

## 2026-05-05（V3 Desktop：Logbook 首版替代 Todo 垃圾桶）

### 本轮目标
- 放弃 Todo 垃圾桶页方向，改做按天归档的日志页
- 将种草删除文案明确为永久删除
- 为完成 / 未完成 / 删除行为补稳定的每日快照出口

### 本轮关键判断
- Todo 的真实价值不在“回收站”，而在“这一天到底发生了什么”，因此入口直接从 `垃圾桶` 改成 `日志`。
- 日志不依赖应用必须在零点开着，而是采用“补生成昨天”的稳妥方案：
  - 进入 Todo 同步链路前先检查昨天是否已有日志
  - 没有则立刻补生成
- `未完成` 只记录“当天页面上仍存在的 pending”。
- 手动改到未来日期的事项，不算当天未完成。
- 分次未完成事项只在日志文本里追加：
  - `进度：x%`
- 首版正文保持只读，避免日志变成第二套 Todo 系统；只开放 `备注` 编辑。

### 本轮修改
- 更新 `src/types/models.ts`、`electron/types.ts`、`src/db/schema.ts`
  - `DayPlanItem` 新增：
    - `deletedAt`
  - `AppData` 新增：
    - `logbookEntries`
  - 新增：
    - `LogbookEntry`
    - `LogbookCompletedItem`
    - `LogbookUnfinishedItem`
    - `LogbookDeletedItem`
  - `APP_DATA_SCHEMA_VERSION` 升级到 `8`
- 更新 `src/db/storage.ts`
  - 旧 Web 快照缺少 `logbookEntries` 时自动补空数组
  - `normalizeDayPlanItem(...)` 收口 `deletedAt`
- 更新 `electron/sqlite.ts`
  - `day_plan_items` 新增：
    - `deleted_at`
  - 新增表：
    - `logbook_entries`
  - SQLite 读写、整包 replace、旧库补列全部接入
- 新增 `src/features/logbook/logbook-service.ts`
  - 负责生成昨日日志
  - 负责输出 Markdown 文本
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 每次同步选中日期前，先补生成昨天日志
  - 删除 Todo 时写入 `deletedAt`
- 新增 `src/pages/logbook/LogbookPage.tsx`
  - 展示每日日志容器
  - 支持备注编辑
  - 支持一键复制 Markdown
- 更新 `src/app/router.tsx`、`src/app/shell/AppShell.tsx`
  - `/trash` 替换为 `/logbook`
  - Sidebar 文案从 `垃圾桶` 改为 `日志`
- 更新 `src/features/templates/TemplateManagerPanel.tsx`
  - 种草删除确认文案改为永久删除
- 更新 `src/styles/globals.css`
  - 补日志页样式
- 更新 `src/mocks/app-data.ts`、`electron/test-fixtures.ts`
  - 补 `logbookEntries`
- 更新 `src/db/storage.test.ts`、`electron/sqlite.test.ts`
  - 覆盖旧快照默认空日志数组
  - 覆盖 SQLite 的 `deletedAt / logbookEntries` round-trip

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm exec vitest run src/db/storage.test.ts electron/sqlite.test.ts`：通过

### 当前未完成 / 风险
- 当前首版只稳定补生成“昨天”的日志；如果应用连续多天完全未打开，期间更早日期的未完成快照不会自动回补。
- 日志复制当前依赖 `navigator.clipboard`，正常 Electron 开发窗口可用，但仍建议在打包产物里顺手验一次。

## 2026-05-04（V3 Desktop 小修：Todo 编辑/新增支持改计划日期）

### 本轮目标
- 在 quick add / 编辑共用面板中增加日期入口
- 允许未完成 Todo 直接改当前计划日期
- 保持重复事项“只改当前 occurrence，不改规则”

### 本轮关键判断
- 日期入口直接放进现有编辑面板第一行，不新增独立“延期”系统。
- quick add 和编辑共用一个日期草稿：
  - 新增时可直接创建到未来日期
  - 编辑时可直接把未完成 Todo 改到未来日期
- 普通 Todo 改期时，直接改 `dayPlanItem.date`。
- 重复事项改期时，继续保留当前 occurrence 的 `targetDate` 语义，只改实际显示用的 `date`，避免误改整条重复规则。
- 已完成事项继续只开放 `completedAt` 编辑，不在这里开放改计划日期。

### 本轮修改
- 更新 `src/features/todo/TodoModePanel.tsx`
  - quick add / 编辑面板新增日期草稿状态
  - 第一行新增日历入口
  - 新增与编辑都支持直接选择目标日期
  - 普通 Todo：
    - 创建时可直接落到目标日期
    - 编辑时直接更新当前 `dayPlanItem.date`
  - repeating Todo：
    - 编辑时只改当前 occurrence 的显示日期
    - 不改模板重复规则
- 更新 `src/styles/globals.css`
  - 为日历入口补充紧凑样式
  - 收口三组控件到同一行
  - 将模式切换字号轻压，避免拉长编辑卡片
- 更新 `manual-test-checklist.md`
  - 补充 quick add 改期、普通 Todo 改期、重复 Todo 改期口径

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过

### 当前未完成 / 风险
- 本轮尚未为“改计划日期”新增单元测试，当前主要依赖 Electron 手测。
- 当前仍不支持已完成事项改计划日期，这是刻意保留的规则边界。

## 2026-05-03（V3 Desktop 小修：种草条目编辑 + Mac 打包配置更新）

### 本轮目标
- 让种草清单支持直接编辑条目内容
- 不开放 tag 编辑
- 为下次 macOS 打包准备新图标与新 `.dmg` 名称

### 本轮关键判断
- 本轮只补“条目内容编辑”，不把种草清单重新扩成完整编辑表单，避免破坏当前列表密度。
- 现有规则里种草是 backlog，不是 Todo 模板，因此列表内编辑优先只允许改标题，不顺手开放场景或清单归属调整。
- 图标更新不在打包时临时手工处理，而是收进脚本，避免下次忘记同步 `J-Flow.PNG`。

### 本轮修改
- 更新 `src/features/templates/TemplateManagerPanel.tsx`
  - 种草列表新增单条编辑入口
  - 支持：
    - 进入编辑
    - 保存标题
    - 取消编辑
  - 仅更新 `title`
  - 不修改：
    - `activityTypeId`
    - `sceneTagIds`
- 更新 `src/styles/globals.css`
  - 为种草标题内联输入框与编辑按钮补充样式
- 更新 `package.json`
  - 新增：
    - `sync:icon`
  - `package:mac`
    - 打包前自动把根目录 `J-Flow.PNG` 同步到 `build/icon.png`
  - `package:win`
    - 同步沿用这套图标刷新逻辑
  - `build.dmg.artifactName` 改为：
    - `J-Flow-V1.2.dmg`
- 更新 `manual-test-checklist.md`
  - 补充种草列表标题编辑手测口径

### 验证结果
- 待本轮修改后统一执行：
  - `corepack pnpm run lint`
  - `corepack pnpm run build`

### 当前未完成 / 风险
- 本轮没有新增种草标题编辑的单测，当前主要依赖构建校验与 Electron 实机手测。
- 这次已把打包脚本切到自动同步根目录图标，但尚未实际执行 `.dmg` 打包验证。

## 2026-05-03（V3 Desktop 小修：完成时间取整设置）

### 本轮目标
- 在设置页追加“完成时间是否取整”选项
- 让 Todo 勾选完成时按设置写入 `completedAt`
- 保持旧备份、旧本地数据、SQLite 旧库自动兼容

### 本轮关键判断
- “完成时间取整”优先只作用于“勾选完成时的自动记录时间”。
- 已完成事项的手动时间编辑仍按用户输入值保存，不再额外二次取整，避免用户精确修正时被系统再改写。
- 新设置应默认落在 `5 分钟取整`，旧数据缺字段时也自动回落到这个默认值。

### 本轮修改
- 更新 `src/types/models.ts`、`electron/types.ts`
  - `AppSettings` 新增：
    - `completedAtRoundingMinutes`
  - 允许值：
    - `0`
    - `5`
    - `10`
    - `30`
- 更新 `src/features/todo/completed-at-rounding.ts`
  - 新增完成时间取整工具：
    - 默认值
    - 选项文案
    - 旧值归一化
    - 自动记录时间取整
- 更新 `src/db/schema.ts`
  - `appSettingsSchema` 新增完成时间取整字段
  - `APP_DATA_SCHEMA_VERSION` 升级到 `7`
- 更新 `src/db/storage.ts`
  - 旧 Web 本地数据 / 导入快照缺少该字段时，自动补成 `5`
- 更新 `electron/sqlite.ts`
  - `settings` 表新增：
    - `completed_time_rounding_minutes`
  - 已存在旧库时自动执行补列兼容
  - SQLite 读写设置时同步收口该字段
- 更新 `src/features/settings/SettingsPanel.tsx`
  - 设置页新增“完成时间取整”配置项
  - 提供：
    - 不取整
    - 5 分钟取整
    - 10 分钟取整
    - 30 分钟取整
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 普通 Todo 完成
  - 分次 Todo 进度到 100%
  - 两条完成链路都改为按设置写入取整后的 `completedAt`
- 更新 `src/features/todo/completed-at-rounding.test.ts`
  - 覆盖取整算法
- 更新 `src/db/storage.test.ts`
  - 覆盖旧数据缺字段时默认回落 `5`
- 更新 `manual-test-checklist.md`
  - 新增“完成时间取整”手测口径
- 记录图标提醒：
  - 当前应用程序图标已更新为根目录 `J-Flow.PNG`
  - 下次打包时需要同步切到这份图标资源

### 验证结果
- 待本轮修改后统一执行：
  - `corepack pnpm run lint`
  - `corepack pnpm run build`
  - `corepack pnpm run test -- --runInBand`

### 当前未完成 / 风险
- 本轮未把“手动修改完成时间”也接入自动取整，这是刻意保留的精确编辑语义。
- 下次进行 macOS / Windows 打包前，需要检查 `electron-builder` 图标来源是否已切到根目录 `J-Flow.PNG` 对应产物。

## 2026-05-02（V3.4 Windows Compatibility）

### 本轮目标
- 保留现有 macOS Desktop 能力
- 保留现有 Web 构建能力
- 在现有 Electron Desktop 基础上新增 Windows target
- 检查数据目录、SQLite、备份、导入导出、图标与打包配置是否写死 macOS

### 本轮关键判断
- 本轮不是重写 Windows 版，而是扩展现有 Electron Desktop 的跨平台打包能力。
- Windows 第一轮更适合优先选 `portable`：
  - 自用测试路径最短
  - 安装器变量最少
  - 能先验证图标、路径、SQLite 与导入导出兼容性
- 当前数据路径主链路已经基本符合跨平台要求，核心都走了 Electron / Node API，而不是手写 macOS 目录。

### 本轮检查结果
- `electron/main.ts`
  - 数据目录统一通过 `app.getPath('userData')`
  - 打开数据目录统一通过 `shell.openPath(...)`
  - JSON 导入 / 导出统一通过 `dialog.showOpenDialog(...)` / `dialog.showSaveDialog(...)`
- `electron/sqlite.ts`
  - SQLite 主库路径统一通过：
    - `path.join(dataPath, 'j-flow.sqlite3')`
- `electron/backup.ts`
  - 自动备份目录统一通过：
    - `path.join(dataPath, 'backups')`
- 唯一保留的显式平台判断是：
  - `process.platform !== 'darwin'` 时关闭所有窗口后退出应用
  - 这是 Electron 常规生命周期差异处理，不属于路径写死问题

### 本轮修改
- 更新 `package.json`
  - 新增：
    - `package:win`
  - `electron-builder` 新增 Windows 配置：
    - `win.target = portable`
    - `win.artifactName = J-Flow-V1-win-portable.${ext}`
    - `win.icon = build/icon.png`
  - 将 `electronDist=node_modules/electron/dist` 从全局 build 配置移除
  - 改为仅在 `package:mac` 中通过命令行参数传入，避免 Windows 打包误复用 macOS Electron runtime
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 修正 `useRef` DOM 类型，消除 `build` 暴露的 TS 报错
- 更新 `src/features/todo/todo-view-model.ts`
  - 明确 `buildTodoTags` 返回 `string[]`，消除 `build` 暴露的 TS 报错

### Windows 数据安全结论
- Windows 用户数据目录：
  - 继续通过 Electron `app.getPath('userData')` 获取
  - 预计位于 `%APPDATA%/J-Flow`
- SQLite 主库：
  - `<userData>/j-flow.sqlite3`
- JSON 自动备份目录：
  - `<userData>/backups`
- 卸载 / 删除应用：
  - 当前第一轮是 `portable`
  - 删除可执行文件不会自动删除 `%APPDATA%/J-Flow` 数据
- macOS -> Windows 迁移建议：
  - 推荐走 JSON 导出 / 导入
  - 不建议直接复制 SQLite 主库文件
- 安装 / 更新要求：
  - 不应覆盖 `userData` 目录中的用户数据

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm run package:win`：
  - 初次尝试失败，原因是需要下载 Windows Electron runtime，但本机网络无法解析 `github.com`
  - 2026-05-02 用户已使用镜像环境变量再次执行并成功产出：
    - `release/J-Flow-V1-win-portable.exe`
  - 实际使用命令包含：
    - `ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/`
    - `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`

### 当前未完成 / 风险
- 尚未在 Windows 真机验证：
  - `%APPDATA%/J-Flow` 实际路径
  - portable 可执行文件图标
  - JSON 导入 / 导出对话框
  - 数据目录打开行为
- 当前还没有 Windows `nsis` 安装器
- 当前已知问题：
  - Windows 首包打开后“没有反应”
  - 需在 Windows 真机环境继续排查：
    - 是否为 ARM64 / x64 架构问题
    - 是否被 SmartScreen 或系统策略拦截
    - 是否存在启动即崩溃但未显示日志的情况
- 当前阶段状态总结：
  - Web 端继续可用
  - macOS `V1` 版本进入实用测试
  - Windows 端进入待办排查阶段

## 2026-05-01（V3 Desktop UI Pass 01：独立页标题与页面壳统一修复）

### 本轮目标
- 修复种草清单独立页、垃圾桶独立页、设置独立页三者标题视觉不一致的问题
- 只处理真实存在的结构问题，不继续扩展到主观观感争论

### 本轮关键判断
- 垃圾桶页之所以接近理想状态，不是偶然，而是它当前使用的是最干净的独立页结构：
  - 统一外层 page stack
  - 统一 surface card
  - 统一 page header
- 设置页标题间距偏大，真实原因是它没有使用与垃圾桶相同的页面壳：
  - 外层使用了单独的 `settings-page` / `settings-surface-card`
  - 顶部页头与正文之间不在同一套页级 gap 基线内
- 种草清单页布局分散，真实原因不是标题文案，而是标题下第一屏内容被拆成彼此游离的计数区、筛选区和列表区：
  - 页面壳看似接近
  - 但首屏内容没有形成连续的单一工作区块

### 本轮修改
- 更新 `src/pages/grass-list/GrassListPage.tsx`
  - 移除独立页外层的 `page-stack--manager`
  - 改为与垃圾桶页一致的标准 `page-stack`
  - 给正文补统一的 `page-panel__body`
- 更新 `src/features/settings/SettingsPanel.tsx`
  - 设置页加载态与正常态都改回统一独立页壳：
    - `page-stack`
    - `surface-card surface-card--compact`
    - `page-panel`
    - `page-panel--settings`
  - 将页头以下内容纳入统一 `page-panel__body`
  - 去掉设置页依赖单独页面壳才能成立的结构
- 更新 `src/features/templates/TemplateManagerPanel.tsx`
  - 将计数区与筛选区合并为同一个 `template-manager__controls`
  - 收口种草页标题下第一屏结构，让正文起点更集中
- 更新 `src/styles/globals.css`
  - 新增统一的 `page-panel__body`
  - 为 manager / settings 正文补充页级 body 间距
  - 删除设置页原有独立外层壳样式依赖
  - 新增 `template-manager__controls` 样式，收口种草页首屏控件区

### 验证结果
- `corepack pnpm run lint`：通过

### 当前结论
- 三个独立页现在回到了同一套页级骨架：
  - 同类外层容器
  - 同类页头位置
  - 同类正文起点
- 设置页标题与正文的结构间距已按统一页面壳收口
- 种草清单页首屏已从“分散模块堆叠”收回为连续的管理区块

### 当前未完成 / 风险
- 本轮没有改垃圾桶真实功能，垃圾桶仍是占位页
- 本轮没有调整三页更深层的内容密度差异：
  - 设置页内部仍是多段 preferences/data/backup/testing
  - 种草页内部仍是筛选 + 列表
  这些属于业务内容差异，不再纳入本轮“统一标题与页面壳”修复范围

### 追加修正（按实际页面对比）
- 仅统一页面壳后，种草清单页仍未达到目标。
- 通过实际页面对比确认，真实问题是：
  - 种草页的 `page-panel__body--manager`
  - `template-manager`
  - `template-manager__controls`
  - `template-manager__filters`
  - `template-manager__list`
  这些 grid 容器在整页高度下发生了内容拉伸，导致：
  - 标题区与正文区像被分段撑开
  - 筛选卡内部控件下沉
  - 空状态卡被异常拉高
- 本轮已补充将这些容器统一收回到 `align-content: start / align-items: start`
- 这次修正仍然只处理真实存在的布局拉伸问题，不改业务结构

### 追加修正（设置页与种草页计数文案）
- 继续按实际页面对比确认：
  - 设置页也存在与种草页同类的 grid 拉伸问题
  - 设置页页头下方内容需要同样固定到顶部，而不是参与剩余高度分配
- 本轮已为：
  - `page-panel--settings`
  - `page-panel__body--settings`
  - `settings-panel`
  补充 `align-content: start / align-items: start`
- 同时补回种草页计数说明文案：
  - 当前这个数字统计的是当前筛选结果中的未完成种草数
  - 因此恢复为：
    - `未完成 X 条`

## 2026-05-02（V3 Desktop UI Pass 01：第三轮手动细修）

### 本轮目标
- 继续做桌面端第三轮人工细修
- 只处理：
  - Sidebar 品牌区与 TODAY 间距
  - quick add 悬浮卡片内部控件比例与密度
  - 拔草候选区滚动方式
  - 主页种草区说明文案合并

### 本轮关键判断
- Sidebar 当前不是结构错误，而是品牌栏和 TODAY 卡片之间的留白略松，只需轻压，不应重做侧栏比例。
- quick add 的主要问题不再是卡片壳尺寸，而是：
  - 内部 grid 默认拉伸
  - 普通条目模式的输入区过矮
  - 拔草模式候选列表没有局部滚动边界
- 拔草模式里真正需要滚动的是候选清单列表，不是整个浮层卡片。
- 主页种草区的两条说明文案表达的是同一件事，合并进 placeholder 更干净。

### 本轮修改
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 为 quick add 浮层新增 manual / grass 模式类
  - 为普通条目模式输入壳新增独立类
  - 为普通条目控件行新增独立类
  - 为拔草候选列表新增可滚动类
- 更新 `src/features/templates/TemplateFormFields.tsx`
  - 合并种草输入说明文案到 placeholder
  - 删除输入框下方重复说明
- 更新 `src/styles/globals.css`
  - 轻压 Sidebar 品牌区与 TODAY 卡片间距
  - 收口 quick add 浮层为贴顶排布，避免内部控件继续被卡片高度拉伸
  - 调整普通条目模式输入框高度为原先约 2 倍
  - 收紧普通条目模式控件区间距
  - 将拔草候选列表限制为 3 条高度并独立纵向滚动
  - 保持 checkbox / recurrence 控件高度一致

### 验证结果
- 待本轮修改后统一执行

### 当前未完成 / 风险
- 本轮不改 quick add 的业务流程与提交流程
- 若后续还要继续细调，将主要集中在：
  - 浮层不同模式的横向宽度
  - 候选条目单行密度
  - 普通条目模式的更细输入节奏

### 追加修正（quick add 小补丁）
- 拔草条目模式下不再显示顶部 Todo 输入框，避免与“从候选里直接加入”这一路径冲突。
- `必要 / 准备 / 分次` 与重复规则按钮高度统一回同一套 `--template-control-height` 基线，不再出现拔草模式控件略矮的问题。

### 追加修正（quick add 控件高度纠偏）
- 已撤回上一轮“高度翻倍”的误改。
- 当前保留的结果是：
  - 拔草条目模式下不显示顶部 Todo 输入框
  - `必要 / 准备 / 分次` 与“不重复”按钮保持同一高度基线

## 2026-05-02（V3 Desktop UI Pass 01：第四轮手动细修）

### 本轮目标
- 继续减少页面中不必要的框线
- 收口已完成区域的信息层级
- 调整种草清单页操作按钮文案与顺序

### 本轮关键判断
- 当前最影响页面清爽度的不是单个配色，而是“容器套容器”的层级过多。
- Todo 区在“无事项”时继续显示白天/晚上空框，会把本来应该干净的留白变成多余装饰。
- 设置页和种草清单页的问题都属于“内容已经足够分组，却还叠了一层容器框”。
- 已完成区域里“完成于 xx”比“创建于 xx”更大，会让次级信息抢主信息，需要缩回同一层级。

### 本轮修改
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 白天/晚上/已完成分组在无事项时不再渲染空状态卡
  - 仅保留有事项时的列表内容
  - tag 行改为仅在存在 tag 时才渲染
- 更新 `src/features/todo/todo-view-model.ts`
  - 取消已完成事项的 `已完成` tag 生成
- 更新 `src/features/templates/TemplateManagerPanel.tsx`
  - `TODO` 按钮改为 `TODO！`
  - 位置调整到兴趣程度 stepper 之后
- 更新 `src/styles/globals.css`
  - 缩小已完成时间按钮字号，使其与“创建于 xx”一致
  - 调整完成时间编辑图标尺寸
  - 去掉设置页各二级分组的边框、圆角和渐变底色
  - 去掉种草清单页顶部统计/筛选容器的边框、圆角和底色

### 验证结果
- 待本轮修改后统一执行

### 当前未完成 / 风险
- 本轮没有改设置页内部只读数据卡片，它们仍保留轻量信息面板样式
- 本轮没有调整种草清单单条 item 卡片本身的边框层级

## 2026-05-02（V3 Desktop UI Pass 01：第五轮手动细修）

### 本轮目标
- 继续精简已完成事项信息
- 调整种草清单计数对齐
- 修正主页 Todo 标题文案

### 本轮修改
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 已完成事项不再显示：
    - `创建于某日`
    - 准备备注
    - 分次进度条
  - 主页 `TODO` 区标题从：
    - `未完成`
    改为：
    - `待办`
- 更新 `src/styles/globals.css`
  - 种草清单顶部 `未完成 X 条` 计数改为左对齐

### 验证结果
- 待本轮修改后统一执行

### 当前未完成 / 风险
- 本轮没有继续调整种草清单单条卡片本身的边框层级

## 2026-05-01（V3 Desktop UI Pass 01：桌面应用化 UI 初调）

### 本轮目标
- 不改业务规则、不改数据模型、不改存储实现
- 先做一轮桌面应用化 UI 收口
- 优先去掉当前 macOS / Electron 端明显的“网页感”

### 当前 UI 为什么像网页
- `AppShell` 当前更像网页 header：
  - 顶部条过窄，且品牌、主导航、设置入口的关系更接近网页站点头部，而不是稳定的应用 toolbar
  - 主内容宽度仍锁在窄列，窗口像“网页容器”而不是“应用工作区”
- `HomePage` 当前更像单页网页：
  - 日期区、Todo 主区、底部种草输入区按网页段落自上而下堆叠
  - “今日”主工作区缺少稳定的 workspace 层级，像把多个模块放进同一页
- `TodoModePanel` 当前更像功能块集合：
  - 新增区、排序工具、白天 / 晚上 / 已完成分组都能用，但视觉关系不够清楚
  - 排序入口、快速新增、分组标题还不够“工具化”
- `GrassListPage` / `TemplateManagerPanel` 当前更像网页列表页：
  - 页面壳偏轻，条目偏卡片堆叠
  - 筛选、状态标签、`TODO` 按钮、兴趣调整器还不够像桌面管理列表
- `SettingsPanel` 当前更像网页表单页：
  - 各区块都是“说明 + 一排按钮”，更像 Web 设置页而不是 app preferences
  - 数据目录 / 主库 / 自动备份虽然信息完整，但信息面板层级还不够系统化
- 全局控件密度偏网页 / 移动端：
  - 间距略松、主内容列偏窄、按钮权重过于接近
  - 暖色与轻量气质本身没有问题，网页感主要来自布局、信息层级和面板组织方式

### 本轮策略
- 不重构路由，继续沿用现有页面结构
- 通过：
  - 更稳定的 app shell
  - 更像桌面工具栏的导航
  - 更宽、更稳定的 workspace
  - 更克制的面板层级
  - 更清楚的 preferences / manager list 视觉
  来完成第一轮应用化收口

### 本轮修改
- 更新 `src/app/shell/AppShell.tsx`
  - 顶部导航改成更像桌面 app toolbar 的结构：
    - 左侧品牌
    - 中部主导航
    - 右侧设置工具入口
  - 主内容外包一层更稳定的 `workspace`
- 更新 `src/pages/home/HomePage.tsx`
  - 今日页顶部改成工作区工具栏样式
  - 底部种草区改成更像 docked quick capture 的结构
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 快速新增区增加清晰的 workspace header
  - 白天 / 晚上 / 已完成分组统一为稳定的列表面板
  - 排序工具条更工具化
- 更新 `src/pages/grass-list/GrassListPage.tsx`
  - 增加页面壳与说明层级
- 更新 `src/features/templates/TemplateManagerPanel.tsx`
  - 种草管理区改成更像桌面 manager list
  - 增加列表计数、筛选标签标题、条目 meta 信息
- 更新 `src/features/templates/CreateTaskTemplateForm.tsx`
  - 补快速录入 footer 结构，便于收口消息和表单层级
- 更新 `src/features/settings/SettingsPanel.tsx`
  - 按 preferences / data / backup / testing 分组
  - 让数据目录与主库文件信息更像系统信息面板
- 更新 `src/styles/globals.css`
  - 扩大 Desktop workspace 宽度
  - 收口 toolbar / workspace / panel / list / preferences 的统一视觉
  - 调整桌面端密度、控件权重、状态面板与 dock 质感

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过

### 当前结论
- Desktop 端第一轮“应用程序化 UI 收口”已完成初调。
- 当前视觉重心已从“窄网页列 + 模块堆叠”调整为“稳定应用壳 + workspace 面板 + 轻量工具栏”。
- 本轮没有改业务规则、存储逻辑、数据结构或导入导出行为。

### 当前未完成 / 风险
- 这轮仍是第一轮 UI 初调，不是最终定稿：
  - 细节间距
  - 控件重量
  - 某些列表项文字层级
  仍可以继续人工细修
- 目前主要验证的是 `lint/build` 与接下来 Electron dev 观感，不包含 UI 自动化截图测试。

## 2026-05-01（V3 Desktop UI Pass 01：左右布局人工修改第一轮）

### 本轮目标
- 把当前顶部导航式布局改为更像本地桌面应用的左右结构
- 左侧固定 Sidebar，右侧为可拉伸 workspace
- 不改业务规则，只改 UI 结构与交互壳

### 本轮关键判断
- 仅靠顶部 toolbar 已经不足以承接你要求的“长期打开的小工具”气质，日期切换和导航需要稳定落到左侧。
- 左侧月历如果继续沿用 `input[type=date]` 弹出式体验，会明显拉回网页感，因此这轮直接接入常驻月历面板更合适。
- 主页右侧的 Quick add 若继续占据正常文档流，会与 Todo 主区抢层级；改成黄色 `+` + 浮层卡片，更符合你要的桌面工具感。

### 本轮修改
- 更新 `src/app/router.tsx`
  - 新增 `/trash` 占位路由
- 更新 `src/app/shell/AppShell.tsx`
  - 改为左右布局：
    - 左侧固定 Sidebar
    - 右侧 workspace
  - 把 `selectedDate` 提升到 Shell 层
  - 通过 `Outlet context` 传给主页
  - Sidebar 新增：
    - `J-Flow`
    - 左右切日 + Today 日期
    - 常驻月历
    - `TODO`
    - `种草清单`
    - `垃圾桶`
    - `设置`
- 更新 `src/components/ui/Icons.tsx`
  - 新增 `TrashIcon`
- 更新 `src/pages/home/HomePage.tsx`
  - 去掉右侧顶部日期工具栏
  - 主页日期改由 Shell 提供
  - 保留底部种草区，并收成 bottom sheet 风格
- 更新 `src/features/todo/TodoModePanel.tsx`
  - Quick add 改为黄色 `+`
  - 点击后展开漂浮卡片
  - 打开后输入框自动聚焦
  - Todo 改为单一大卡片内部承载：
    - 白天事项
    - 晚上事项
    - 已完成事项
- 新增 `src/pages/trash/TrashPage.tsx`
  - 垃圾桶占位页
- 更新 `src/styles/globals.css`
  - 补 Sidebar、月历、右侧 workspace、浮层 Quick add、Bottom Sheet 样式

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过

### 当前结论
- 当前桌面版已从“顶部导航 + 单列内容”进入“Sidebar + Workspace”的结构阶段。
- 常驻月历、浮层 Quick add 和垃圾桶占位都已接上。

### 当前未完成 / 风险
- 垃圾桶目前仅是占位页，尚未接真实删除恢复逻辑。
- Quick add 浮层当前仍是第一版，后续还可以继续细调：
  - 尺寸
  - 遮罩感
  - 关闭时状态是否保留
- Sidebar 月历目前是轻量实现，后续若要支持更复杂的月份跳转和键盘导航，还可继续增强。

## 2026-05-01（V3 Desktop UI Pass 01：左右布局人工修改第二轮）

### 本轮目标
- 对第一轮 Sidebar + Workspace 版本做第二轮人工细修
- 重点修正：
  - Sidebar 宽度与品牌排版
  - Quick add 入口与浮层手感
  - Todo 区文案精简
  - 种草 / 种草清单 / 垃圾桶 / 设置页头统一

### 本轮修改
- 更新 `src/app/shell/AppShell.tsx`
  - 左侧副标题改为：
    - `J人用的拔草todo`
- 更新 `src/features/todo/TodoModePanel.tsx`
  - Quick add 入口从独立黄色按钮改为白色条目
  - 白色条目左侧保留黄色 `+`
  - Quick add 浮层放大
  - 删除浮层顶部说明与右上角关闭按钮
  - 删除输入框右侧 `+`
  - 保留回车保存
  - 新增点击卡片外部时：
    - 有输入则保存并关闭
    - 无输入则直接关闭
  - 拔草候选区新增：
    - `按清单筛选`
    - `按场景筛选`
  - 删除 Todo 主卡片中的：
    - `DAY 白天事项`
    - `NIGHT 晚上事项`
    说明文字
- 更新 `src/pages/home/HomePage.tsx`
  - 快速种草标题改为：
    - `GRASS 种草`
- 更新 `src/features/templates/TemplateFormFields.tsx`
  - 调整兴趣程度行，让 `1 / 2 / 3` 紧跟在“兴趣程度”后
- 更新 `src/pages/grass-list/GrassListPage.tsx`
  - 删除页面说明文案
- 更新 `src/pages/trash/TrashPage.tsx`
  - 删除页面说明文案
- 更新 `src/features/settings/SettingsPanel.tsx`
  - 页面头改为：
    - `SETTINGS 设置`
  - 删除顶部说明文案
- 更新 `src/styles/globals.css`
  - 放宽 Sidebar 宽度
  - 品牌区右对齐
  - 调整种草清单列表间距
  - 收口 Quick add 白条入口和放大后的浮层样式
  - 补充推荐筛选小字样式
  - 收口设置页头样式

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过

### 当前结论
- 第二轮人工细修已经把右侧 Quick add、Sidebar 宽度、页面头文案和种草区细节进一步收齐。
- 当前桌面端整体已经更接近“本地长期打开的小工具”而不是网页页面。

### 当前未完成 / 风险
- 垃圾桶仍是占位页，没有接恢复逻辑。
- Quick add 浮层关闭即保存目前采用最小实现，后续如果你想区分：
  - 关闭但不保存
  - 点击空白保存
  还可以进一步精细化。

## 2026-05-01（V3 Desktop UI Pass 01：返工补丁）

### 本轮修改
- 收窄并抬高 Quick add 浮层
- 删除 Todo 顶部残留的独立 `+` 入口
- 保持 Sidebar 品牌区右对齐
- 设置页页面头改成与其他页面一致的：
  - 小字英文 eyebrow
  - 中文主标题
- 继续压缩种草清单单行密度

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过

## 2026-05-01（V3.4 前置：macOS 打包前收口 + `package:mac` 第一版）

### 本轮目标
- 先做 macOS 打包前收口
- 接入 `package:mac` 第一版最小打包配置
- 目标是产出本机自用、未签名的 `.dmg`

### 本轮关键判断
- 当前桌面运行链路、SQLite 主库、导入 / 导出、自动备份都已具备，因此已经到了可以尝试 macOS 第一版打包的阶段。
- 第一版不追求签名、公证或发布级配置，先以：
  - 本机可打包
  - `.dmg` 可挂载
  - `J-Flow.app` 可拖入 `Applications`
  - 应用可正常启动
  为目标更稳。
- 打包前必须先把 README 与手测清单更新到当前真实状态，避免继续沿用“尚未进入 SQLite / 打包前阶段”的旧口径。

### 本轮修改
- 更新 `README.md`
  - 收口当前 Desktop 状态
  - 补充 `package:mac` 命令说明
- 更新 `manual-test-checklist.md`
  - 新增 macOS 打包前验收项
  - 新增 `.dmg` 第一版验收项
- 更新 `package.json`
  - 新增 `package:mac`
  - 新增最小 `electron-builder` 配置：
    - `appId`
    - `productName`
    - `directories.output`
    - `files`
    - `mac.target = dmg`
    - `dmg.artifactName`
  - 排除 `dist-electron` 下的测试产物与测试夹具

### 验证结果
- `corepack pnpm install`：通过
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm run package:mac`：
  - 通过最小配置完成 `.app` 产出
  - 后续通过 `electron-builder --mac dmg --prepackaged release/mac-arm64/J-Flow.app` 完成 `.dmg` 封装
- `hdiutil verify release/J-Flow-0.1.0.dmg`：通过

### 当前结论
- 当前已具备接入 `package:mac` 第一版的条件。
- 当前第一版 macOS 打包已落地：
  - `release/J-Flow-0.1.0.dmg`
  - `release/mac-arm64/J-Flow.app`
- 本轮产物是本机自用安装包，不是发布级安装包。

### 当前未完成 / 风险
- 仍未接入：
  - 代码签名
  - 公证
  - App Store 分发
- 首次打开 unsigned 应用时，macOS 仍可能给出安全提示。
- 当前使用的是默认 Electron 图标，尚未补 `.icns` 应用图标资源。
- `package.json` 仍缺少 `description` 与 `author`，`electron-builder` 会给出提示但不阻塞打包。

## 2026-05-01（V3.3 Local Backup 第四轮补充：数据目录与主库文件说明收口）

### 本轮目标
- 收口“数据目录 / SQLite 主库 / 自动备份目录 / 手动导入导出”的说明口径
- 不改存储行为
- 不改备份规则
- 只补清晰的只读展示与文档说明

### 本轮关键判断
- 当前设置页虽然已经展示数据目录，但没有把“SQLite 主库文件就在这个目录里”明确说清。
- 当前文档里仍残留一段“桌面主数据仍是 IndexedDB 过渡方案”的旧状态描述，容易和现状冲突。
- 最稳的做法是新增一个只读 `storage info` bridge，把：
  - 数据目录
  - SQLite 主库文件路径
  - 自动备份目录
  一次性明确暴露给设置页。

### 本轮修改
- 更新 `electron/sqlite.ts`
  - 新增 `getSqliteDatabasePath(dataPath)`
- 更新 `electron/main.ts`
  - 新增 `app:get-storage-info`
  - 返回：
    - `dataPath`
    - `databasePath`
    - `autoBackupDirectory`
- 更新 `electron/preload.ts`
  - 暴露 `getStorageInfo()`
- 更新 `src/vite-env.d.ts`
  - 补齐 `DesktopStorageInfo` 类型
- 更新 `src/features/settings/SettingsPanel.tsx`
  - 设置页新增“当前 SQLite 主库文件”只读展示
  - 说明文案改为明确区分：
    - 数据目录
    - 运行时主库
    - `backups/` 自动备份目录
    - 手动导出 JSON 的实际保存位置由系统文件对话框决定
- 更新文档：
  - `app-structure.md`
  - `data-model.md`
  - `task-list.md`
  - `handoff.md`

### 验证结果
- 待本轮代码修改后统一执行

### 当前结论
- 当前桌面口径应明确为：
  - 运行时主库：SQLite
  - 主库文件：`j-flow.sqlite3`
  - 数据目录：Electron `userData`
  - 自动备份目录：数据目录下 `backups/`
  - 手动导出 JSON：不强制保存在数据目录

### 当前未完成 / 风险
- 本轮只做说明收口，没有新增“自定义数据目录”或“主库文件打开”能力。

## 2026-05-01（V3.3 Local Backup 第四轮补充：自动备份测试时钟注入）

### 本轮目标
- 只做测试收口
- 把自动备份轮换测试从真实时间等待改成可注入时钟
- 不改业务行为
- 不改备份规则
- 不做打包相关工作

### 本轮关键判断
- 自动备份测试当前最慢的点不是逻辑复杂，而是为生成不同文件名而真实等待秒级时间推进。
- 最小且安全的收口方式是：
  - 在 `electron/backup.ts` 内部给“当前时间”来源增加可注入时钟
  - 默认仍走真实 `Date`
  - 业务调用方完全不需要改
- 这样可以保留现有备份规则，同时让测试直接构造时间序列。

### 本轮修改
- 更新 `electron/backup.ts`
  - 为 `createAutoBackup(...)` 增加可选 `clock.now()` 注入
  - 默认仍使用真实 `new Date()`
- 更新 `electron/backup.test.ts`
  - 删除轮换测试中的 `setTimeout(1000)` 真实等待
  - 改为传入可控时间序列
  - 补充断言：
    - 轮换后保留首个文件应为 `08:00:02`
    - 最后一个文件应为 `08:00:21`

### 验证结果
- `corepack pnpm exec vitest run electron/backup.test.ts`：通过
- `corepack pnpm run lint`：通过

### 当前结论
- 自动备份测试已从真实时间等待切到可注入时钟。
- 本轮未改变任何业务语义、备份规则或运行时触发逻辑。

### 当前未完成 / 风险
- 目前时钟注入仅用于 `createAutoBackup(...)`，这是有意保持最小改动范围。
- 尚未进一步把时间相关 helper 全面抽象为独立测试工具；当前没有必要。

## 2026-05-01（V3.3 Local Backup 第四轮补充：SQLite / AppData Service 最小自动化测试）

### 本轮目标
- 为 Desktop 主库存储相关能力补最小自动化测试
- 优先覆盖：
  - SQLite repository 核心读写
  - 自动备份核心路径
  - `storage.ts` Desktop `appData service` 接线

### 本轮关键判断
- 这轮最值得先补的不是 UI 测试，而是数据安全链路上的“最小可回归护栏”：
  - `electron/sqlite.ts`
  - `electron/backup.ts`
  - `src/db/storage.ts` 的 Desktop 分支
- `build:desktop` 不应因为 Electron 测试文件而失败，因此桌面构建需要显式排除 `*.test.ts`。
- Electron 测试不应依赖 renderer 侧别名和 mocks，使用本地测试夹具更稳。

### 本轮修改
- 新增 `electron/test-fixtures.ts`
  - 提供 Electron 侧测试专用最小种子数据
- 新增 `electron/sqlite.test.ts`
  - 覆盖：
    - `replaceSqliteSnapshot` 后整包读回
    - `taskTemplates` / `dayPlanItems` 代表性 CRUD
    - `deleteSqliteSceneTagAndDetachTemplates`
    - `deleteSqliteActivityTypeIfUnused`
- 新增 `electron/backup.test.ts`
  - 覆盖：
    - 无数据时跳过备份
    - 正常生成 JSON 自动备份
    - 启动时同日备份跳过
    - 自动备份轮换最多保留 20 份
- 新增 `src/db/storage.desktop.test.ts`
  - 验证 Desktop 下：
    - `get`
    - `replace`
    - `reset`
    - `import`
    - `export`
    都走 `repository.appData`
  - 验证不再依赖旧 snapshot bridge 作为主路径
- 更新 `electron/tsconfig.json`
  - 排除 `./**/*.test.ts`
  - 避免 `build:desktop` 将测试文件纳入 Electron 产物编译

### 验证结果
- `corepack pnpm exec vitest run electron/sqlite.test.ts electron/backup.test.ts src/db/storage.desktop.test.ts`：通过
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过

### 当前结论
- SQLite / `app-data service` 已具备最小自动化回归护栏。
- 当前桌面构建与测试职责已分离：
  - 测试可独立运行
  - `build:desktop` 不再被测试文件拖垮

### 当前未完成 / 风险
- 目前仍未覆盖 Electron IPC 端到端测试。
- 自动备份轮换测试依赖真实时间等待，运行耗时较长。
- 仍未补更细粒度的 SQLite batch / transaction service 专项测试。

## 2026-05-01（V3.3 Local Backup 第四轮：自动备份第一版）

### 本轮目标
- 落地桌面版自动备份第一版
- 复用现有完整 JSON 快照格式
- 不做复杂定时器和多项配置，先把“默认开启、可见、可手动触发、可轮换”跑通

### 本轮关键判断
- 第一版自动备份最稳的策略不是先上“每 N 小时定时”，而是：
  - 启动后做一次当日备份检查
  - 在 `appData.replace / reset / import` 成功后自动补备份
- 这样能覆盖当前最关键的数据变更点，同时验证成本明显低于引入调度器。
- 备份应继续使用 JSON 快照，而不是直接复制 SQLite 运行时数据库文件。

### 本轮修改
- 新增 `electron/backup.ts`
  - 新增自动备份目录管理：
    - 数据目录下 `backups/`
  - 新增自动备份文件命名：
    - `j-flow-auto-backup-YYYYMMDD-HHmmss.json`
  - 新增轮换策略：
    - 最多保留最近 `20` 份
  - 新增启动备份检查：
    - 当日已有自动备份则跳过
- 更新 `electron/main.ts`
  - 新增 IPC：
    - `app:get-auto-backup-info`
    - `app:create-auto-backup`
    - `app:open-backup-directory`
  - `appData.replace / reset / import` 成功后自动创建备份
  - 启动时增加自动备份检查
- 更新 `electron/preload.ts`
  - 暴露：
    - `getAutoBackupInfo()`
    - `createAutoBackup()`
    - `openBackupDirectory()`
- 更新 `src/vite-env.d.ts`
  - 补齐自动备份相关 bridge 类型
- 更新 `src/features/settings/SettingsPanel.tsx`
  - 新增“自动备份”区块
  - 显示：
    - 自动备份目录
    - 最近一次自动备份时间
    - 当前自动备份数量
  - 新增：
    - “立即创建备份”
    - “打开备份目录”
  - 同步修正数据目录说明文案为当前 SQLite 口径

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过

### 当前结论
- 桌面版自动备份第一版已落地。
- 当前自动备份默认开启，采用 JSON 快照格式，保留最近 20 份。

### 当前未完成 / 风险
- 暂未提供：
  - 开关配置
  - 自定义保留数量
  - 定时计划
  - 备份列表浏览
  - 一键恢复指定自动备份
- 自动备份目前以事件触发为主，不是独立调度系统。

## 2026-05-01（V3.3 Local Backup 第三轮最终收口：Desktop AppData Service）

### 本轮目标
- 把 `storage.ts` 里 Desktop 下仍保留的：
  - `get / replace / reset / import / export / update`
  从“快照细节接口”收束到更明确的 main 侧 `app-data service`

### 本轮关键判断
- 当前外部日常业务代码已经基本退出快照桥，最后需要收口的是 `storage.ts` 自己内部的 Desktop 分支。
- 比起继续保留 renderer 侧的 `snapshot + revision` 心智，更清晰的做法是：
  - 由 Electron main 暴露明确的 `appData` service
  - `storage.ts` 仅消费：
    - `appData.get`
    - `appData.replace`
    - `appData.reset`
    - `appData.exportSnapshot`
    - `appData.importSnapshot`
- `updateAppData` 在 Desktop 下保留为过渡层，但内部也只复用 `appData.get + appData.replace`，不再自己做 revision 重试。

### 本轮修改
- 更新 `electron/main.ts`
  - 新增 IPC：
    - `db:app-data:replace`
    - `db:app-data:reset`
    - `db:app-data:export`
    - `db:app-data:import`
- 更新 `electron/preload.ts`
  - `repository.appData` 新增：
    - `replace`
    - `reset`
    - `exportSnapshot`
    - `importSnapshot`
- 更新 `src/vite-env.d.ts`
  - 补齐新增 `appData service` 类型定义
- 更新 `src/db/storage.ts`
  - Desktop 下：
    - `initializeAppData` 改走 `appData.get + appData.replace`
    - `exportAppDataSnapshot` 改走 `appData.exportSnapshot`
    - `replaceAppData` 改走 `appData.replace`
    - `importAppDataSnapshot` 改走 `appData.importSnapshot`
    - `resetAppData` 改走 `appData.reset`
    - `updateAppData` 改为基于 `appData.get + appData.replace` 的过渡实现
  - 删除 Desktop 主路径对 `snapshot revision retry` 的依赖

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过

### 当前结论
- Desktop 下 `storage.ts` 的整包能力已经从“快照桥细节”收口为更明确的 `app-data service`。
- 当前快照语义仍存在，但已经退居到 main 侧受控实现，而不是 renderer 自己处理。

### 当前未完成 / 风险
- `updateAppData` 在 Desktop 下仍作为过渡层存在，虽然外部业务已几乎不用它。
- Electron main 的 `app-data service` 目前内部仍复用了整包替换语义，不是最终形态的细粒度 batch service。
- 仍未补 SQLite service / app-data service 专项自动化测试。

## 2026-05-01（V3.3 Local Backup 第三轮再收口：日常业务退出快照桥）

### 本轮目标
- 继续压缩 Desktop 下 `updateAppData / replaceAppData` 的日常使用面
- 让快照桥更明确地退回：
  - setup 初始化
  - reset
  - import / export
  - 旧 Dexie 迁移

### 本轮关键判断
- 外部业务代码里真正还在依赖 `appDataRepository.update / replace` 的路径已经不多：
  - 批量种草兜底校验
  - 停止重复
  - Todo 手动排序
  - 自动生成 recurrence 同步
  - Todo 顺延 carryover
- 这些逻辑虽然之前借用了全局 mutator / replace，但本质上都能改成：
  - 实体级 CRUD
  - 或基于现有 repository 的批量更新

### 本轮修改
- 更新 `src/features/templates/CreateTaskTemplateForm.tsx`
  - 批量种草落库校验补写不再走 `appDataRepository.update`
  - 改为对缺失条目逐条 `taskTemplates.create`
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 停止重复不再走全局 `update`
  - 改为：
    - `taskTemplates.update`
    - `recurringTaskInstances.delete`
    - `dayPlanItems.delete`
  - 手动排序不再走全局 `update`
  - 改为逐条 `dayPlanItems.update`
- 更新 `src/features/continuation/todo-carryover.ts`
  - 顺延写回不再走 `appDataRepository.replace`
  - 改为逐条 `dayPlanItems.update`
- 更新 `src/features/recurrence/auto-generated.ts`
  - 自动生成同步不再走 `appDataRepository.replace`
  - 改为对变化过的：
    - `recurringTaskInstances.create / update`
    - `dayPlanItems.create / update`

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过

### 当前结论
- 外部日常业务代码已不再直接使用 `appDataRepository.update / replace`。
- 当前仅剩 `SetupPage` 保留 `replaceAppData`，这是符合语义的整包初始化场景。

### 当前未完成 / 风险
- `src/db/storage.ts` 中快照桥本身仍保留：
  - `replace / update / import / export / reset`
- 这轮的“批量实体更新”仍主要由 renderer 顺序编排，尚未全部进一步下沉为 main 侧 batch service。
- 仍未补 SQLite repository / batch update 专项自动化测试。

## 2026-05-01（V3.3 Local Backup 第三轮补收口：组合事务下沉 + 聚合读取收口）

### 本轮目标
- 继续收口 Desktop SQLite repository 第一版
- 把仍停留在 renderer 编排的高频组合动作下沉到 main 侧事务
- 把 Desktop 下的整包读取尽量收回到 main 侧聚合

### 本轮关键判断
- 当前最值得优先收口的不是继续加更多单表 CRUD，而是：
  - `sceneTags.deleteAndDetachTemplates`
  - `activityTypes.deleteIfUnused`
  - `getAppData()` 的 Desktop 聚合读取
- 这三项正好覆盖：
  - 跨实体联动事务
  - 初始化 / setup / guard 使用的整包读取入口
  - “快照桥仍被日常主路径借用”的关键残留点

### 本轮修改
- 更新 `electron/sqlite.ts`
  - 新增 `getSqliteAppData`
  - 新增 `deleteSqliteSceneTagAndDetachTemplates`
  - 新增 `deleteSqliteActivityTypeIfUnused`
- 更新 `electron/main.ts`
  - 新增 IPC：
    - `db:app-data:get`
    - `db:scene-tags:delete-and-detach-templates`
    - `db:activity-types:delete-if-unused`
- 更新 `electron/preload.ts`
  - `repository.appData.get()`
  - `repository.sceneTags.deleteAndDetachTemplates()`
  - `repository.activityTypes.deleteIfUnused()`
- 更新 `src/vite-env.d.ts`
  - 补齐新增 bridge 类型
- 更新 `src/db/storage.ts`
  - Desktop 下 `getAppData()` 改走 `repository.appData.get()`
  - `sceneTags.deleteAndDetachTemplates` 改走 main 侧事务 IPC
  - `activityTypes.deleteIfUnused` 改走 main 侧事务 IPC

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过

### 当前结论
- Desktop 下的高频组合动作已不再依赖 renderer 侧“先查再改”的分散写法。
- 初始化链路中的整包读取也已优先收回到 main 侧聚合。

### 当前未完成 / 风险
- 快照桥仍保留给：
  - `replace / update / import / export / reset`
  - 首次旧 Dexie -> SQLite 迁移
- 这轮仍未把所有全局 mutator 彻底替换成实体级或 service 级事务。
- SQLite repository 仍缺少专项自动化测试。

## 2026-05-01（V3.3 Local Backup 第三轮：Desktop SQLite 实体级 Repository 第一版）

### 本轮目标
- 开始把 Desktop 主库存储从“快照级替换”推进到“实体级 repository 操作”
- 保持现有页面调用口径不变
- 优先切基础 CRUD，不一轮重写全部组合业务

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
- 当前页面层大多已经通过 `appDataRepository.<entity>.*` 调用存储，而不是直接依赖整包 `AppData`，这非常适合渐进式下沉到 main。
- 这轮最稳的做法不是删除快照桥，而是：
  - 保留快照用于初始化、导入 / 导出、reset、旧 Dexie 迁移
  - 把日常实体 CRUD 优先切到 Electron main + SQLite
- 像 `deleteAndDetachTemplates`、`deleteIfUnused` 这类跨实体组合动作，先保留在 renderer 侧编排，避免一轮塞进过大的 SQL 事务重构。

### 本轮修改
- 更新 `electron/types.ts`
  - 新增 Electron 侧实体 update input 类型
- 更新 `electron/sqlite.ts`
  - 新增 SQLite 实体级读写方法：
    - `settings`
    - `scene_tags`
    - `activity_types`
    - `task_templates`
    - `recurring_task_instances`
    - `day_plan_items`
  - 新增单次实体变更的 revision bump 封装
- 更新 `electron/main.ts`
  - 新增实体级 IPC：
    - `db:settings:*`
    - `db:scene-tags:*`
    - `db:activity-types:*`
    - `db:task-templates:*`
    - `db:recurring-task-instances:*`
    - `db:day-plan-items:*`
- 更新 `electron/preload.ts`
  - 暴露 `window.jflowDesktop.repository`
- 更新 `src/vite-env.d.ts`
  - 补齐实体级 bridge 类型定义
- 更新 `src/db/storage.ts`
  - Desktop 分支的 `settings / sceneTags / activityTypes / taskTemplates / recurringTaskInstances / dayPlanItems`
    优先改走实体级 IPC
  - 快照桥仍保留给：
    - `get / replace / update / reset / import / export`
    - 首次旧 Dexie -> SQLite 迁移
  - 组合动作继续由 renderer 编排：
    - `sceneTags.deleteAndDetachTemplates`
    - `activityTypes.deleteIfUnused`

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过

### 当前结论
- Desktop 日常实体写入已开始脱离“整包快照读改写”模式。
- 当前页面层调用口径保持不变，但 Desktop 下大部分 repository CRUD 已经直接落到 Electron main + SQLite。

### 当前未完成 / 风险
- `getAppData / replace / update / import / export / reset` 仍保留快照桥，尚未完全实体化。
- 组合动作仍主要在 renderer 编排，暂未下沉为 main 侧事务级 service。
- 这轮还没有补 SQLite repository 专项自动化测试，当前主要依赖构建与桌面运行验证。

## 2026-05-01（V3.3 Local Backup 第二轮补修：Desktop 启动误触 IndexedDB）

### 本轮目标
- 修复 Desktop 新窗口启动时报：
  - `初始化状态读取失败`
  - `UnknownError Internal error opening backing store for indexedDB.open`

### 本轮关键判断
- Desktop 主库虽然已经切到 SQLite，但 `src/db/index.ts` 仍在 re-export `client`。
- 业务代码大量通过 `@/db` 引用仓库；这会让 Electron 渲染进程在普通 import 时就把 Dexie 客户端一并带入。
- 对 Desktop 而言，这种“无意带入 IndexedDB 入口”的风险高于单个 `db.open()` 调用本身，因此需要先把导出层收紧。

### 本轮修改
- 更新 `src/db/index.ts`
  - 移除对 `@/db/client` 的默认 re-export
  - 保留 `schema` 与 `storage` 导出
- 延续 `src/db/storage.ts` 的 Desktop / Web 分流口径：
  - Web 侧 Dexie 改为按需 lazy import
  - Desktop 启动路径默认不再通过 `@/db` 入口碰到 Dexie

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过

### 当前结论
- Desktop 初始化链路已进一步收紧，默认应只走 SQLite bridge。
- 本轮修复的是“Electron 启动时误触 IndexedDB 入口”的高概率根因。

## 2026-05-01（V3.3 Local Backup 第二轮：Desktop SQLite 主库存储第一版）

### 本轮目标
- 开始落地 Desktop 运行时主库存储迁移
- 不改现有页面调用口径
- 先完成：
  - Electron main 持有 SQLite
  - renderer 通过受控 bridge 读写桌面主库
  - Web 继续保留 Dexie

### 本轮关键判断
- 当前业务代码已经基本收敛在 `src/db/storage.ts`，最稳的切入点不是重写页面层，而是把最底层快照持久化后端改成双实现。
- 第一版不直接把所有业务改成 SQL 级 CRUD，而是：
  - Electron main 里用实体表存 SQLite
  - renderer 继续复用现有 `AppData` 快照式仓库逻辑
  - Desktop 通过 IPC 做快照读写与 revision 冲突控制
- 这样可以先把“主库从 IndexedDB 切到 SQLite”落地，再逐步细化实体级操作。

### 本轮修改
- 新增 `electron/sqlite.ts`
  - 使用 Node 内建 `node:sqlite`
  - 新增 SQLite schema：
    - `meta`
    - `settings`
    - `scene_tags`
    - `activity_types`
    - `task_templates`
    - `recurring_task_instances`
    - `day_plan_items`
  - 新增 revision 机制
  - 新增整库快照读取 / 替换
- 新增 `electron/types.ts`
  - 为 Electron 侧本地定义 `AppData` 相关类型
  - 避免把 `src/` 类型直接纳入 Electron `rootDir`
- 更新 `electron/main.ts`
  - 新增 IPC：
    - `db:get-app-data-snapshot`
    - `db:replace-app-data-snapshot`
  - Desktop 主库读写改由 main 进程持有 SQLite
- 更新 `electron/preload.ts`
  - 暴露桌面主库快照桥接方法
- 更新 `src/vite-env.d.ts`
  - 补齐新的 SQLite bridge 类型定义
- 更新 `src/db/storage.ts`
  - 新增 Desktop / Web 双后端分流
  - Desktop 下：
    - `get/replace/update/reset/import/export` 走 SQLite bridge
    - `update` 通过 revision 重试降低并发覆盖风险
  - Web 下继续保留现有 Dexie 行为
  - 首次 Desktop SQLite 为空时：
    - 优先尝试从当前可读的旧 Dexie 快照迁移
    - 若读不到旧快照，再回退到 seed

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过

### 当前结论
- Desktop 运行时主库存储现已具备 SQLite 第一版落地。
- 当前 renderer 层 API 基本不变，但 Desktop 实际持久化已经改由 Electron main + SQLite 承接。

### 当前未完成 / 风险
- 当前仍是“快照级仓库逻辑 + SQLite 实体表存储”的第一版，不是最终形态的细粒度 repository。
- 旧桌面数据向 SQLite 的迁移目前只覆盖：
  - 当前 renderer 还能直接读取到的 Dexie 快照
- 若旧数据已不在当前 renderer 可读域内，仍需通过现有 JSON 导入导出手动迁移。
- 自动备份、数据目录内主库可视化说明、SQLite 专项测试仍未补齐。

## 2026-05-01（V3.3 Local Backup 第一轮：桌面化导入导出 + 数据目录入口）

### 本轮目标
- 不接 SQLite
- 不重做现有 JSON 备份规则
- 只把当前设置页里的导入 / 导出升级为桌面化体验，并补上数据目录入口

### 本轮关键判断
- 当前设置页虽然已经有“数据导入 / 导出”，但本质仍是 Web 方案：
  - 导出依赖浏览器下载
  - 导入依赖文件 input 上传
- 当前运行时主数据仍是 IndexedDB 过渡方案，因此这轮不能假装“桌面数据目录已经承载全部运行时数据”。
- 更稳的 V3.3 第一段是：
  - 保留 JSON 备份语义
  - 在桌面环境下改用系统文件对话框
  - 显示并打开桌面数据目录
  - Web 环境继续保留现有回退实现

### 本轮修改
- 更新 `electron/main.ts`
  - 新增桌面 IPC：
    - `app:save-json-backup`
    - `app:read-json-backup`
    - `app:open-data-directory`
  - `app:get-data-path` 改为确保 `userData` 目录存在后再返回
- 更新 `electron/preload.ts`
  - 暴露：
    - `saveJsonBackup(...)`
    - `readJsonBackup()`
    - `openDataDirectory()`
- 更新 `src/vite-env.d.ts`
  - 补齐新的桌面 bridge 类型定义
- 更新 `src/features/settings/SettingsPanel.tsx`
  - 桌面环境优先使用系统文件对话框导出 / 导入 JSON
  - 新增“打开数据目录”按钮
  - 新增当前桌面数据目录展示
  - 保留 Web 环境下原有浏览器下载 / 上传回退
  - 明确提示当前仍处于桌面过渡阶段
- 更新 `src/styles/globals.css`
  - 新增数据目录信息卡样式

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过

### 当前结论
- 设置页现已支持桌面化导入导出。
- 桌面环境下可直接：
  - 选择导出位置
  - 选择备份文件导入
  - 打开桌面数据目录
- 当前运行时主数据仍未迁移到 SQLite；数据目录目前主要承接桌面备份文件与后续迁移基础。

## 2026-04-30（V3.2 Grass List Page 第三轮：种草清单直接加入今日 Todo）

### 本轮目标
- 为种草清单页中的每条未完成种草增加轻量化 `TODO` 按钮
- 默认加入真实今日白天
- 已排入未完成 Todo 的条目保留在种草清单中，并显示排期标签

### 本轮规则确认
- 种草清单展示所有未完成种草，而不是仅 `active`
- 已加入 Todo 但尚未完成的种草继续显示
- 条目显示小标签：
  - `已排在 M/D`
- `TODO` 按钮行为：
  - 已在今日白天或晚上：不可点击
  - 已在其他日期未完成 Todo 中：点击后将原 Todo 移至真实今日白天
  - 尚未加入 Todo：点击后按普通事项加入真实今日白天
    - 非必要
    - 非重复
    - 无准备
    - 不分次

### 本轮修改
- 新增 `src/features/templates/template-manager-state.ts`
  - 抽出种草条目与未完成 Todo 的关联判断
  - 统一计算：
    - 是否应在种草清单中显示
    - 是否已在今日
    - 是否已排在其他日期
    - `已排在 M/D` 标签文案
- 新增 `src/features/templates/template-manager-state.test.ts`
  - 覆盖今日排期、未来排期、已 picked 但仍应显示等状态判断
- 更新 `src/features/templates/TemplateManagerPanel.tsx`
  - 种草清单不再只筛 `active`
  - 改为显示所有未完成种草
  - 每条条目新增轻量 `TODO` 按钮
  - 已排期条目显示 `已排在 M/D`
  - 已在今日的条目按钮禁用
  - 已排在其他日期的条目点击后移动原 Todo 到真实今日白天
  - 未排入 Todo 的条目点击后直接加入真实今日白天
- 更新 `src/styles/globals.css`
  - 补充排期标签与轻量 `TODO` 按钮样式
- 更新 `product-rules.md`
  - 记录本轮确认后的种草清单展示范围与 `TODO` 按钮规则

### 验证结果
- `corepack pnpm exec vitest run src/features/templates/template-manager-state.test.ts src/features/templates/TemplateFormFields.test.ts src/db/storage.test.ts`：通过
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过

### 当前结论
- 种草清单页现在可以直接把条目拉入真实今日白天。
- 已在未来排期中的种草可以原位“移至今日”，不再需要先切到那一天处理。
- 已在今日的条目不会重复加入。

## 2026-04-30（V3.2 收口：批量种草回归测试 + 构建脚本修复）

### 本轮目标
- 不扩新功能
- 只做批量种草收口：
  - 增加最小自动化回归测试
  - 修复构建脚本链路
  - 补齐一处存储层共享引用细节

### 本轮关键判断
- 当前仓库几乎没有现成业务测试基座，不适合这一轮顺手引入更重的浏览器测试环境。
- 对这次 bug 最有价值的自动化护栏是：
  - 直接测批量种草输入解析与上限校验
  - 直接测存储层连续创建是否会丢掉前面已写入的模板
- 此外，`build` 脚本之前依赖脚本内再次调用 `pnpm`，在当前终端环境会失败，应该改成直接命令链。

### 本轮修改
- 新增 `src/db/storage.test.ts`
  - 为 `appDataRepository.taskTemplates.create(...)` 增加存储层回归测试
  - 覆盖“连续创建两条种草后，两条都仍然存在”
  - 覆盖“调用方后续修改原始 `sceneTagIds` 数组时，已创建模板不应被污染”
- 新增 `src/features/templates/TemplateFormFields.test.ts`
  - 覆盖批量种草多行解析
  - 覆盖超过 20 条时的校验文案
- 更新 `src/db/storage.ts`
  - `normalizeTaskTemplate(...)` 中复制 `sceneTagIds`
  - 避免创建后仍与调用方共享同一个数组引用
- 更新 `package.json`
  - `build` 改为直接执行 `tsc -b && vite build`
  - `build:desktop` 改为直接执行 renderer build + electron build
  - `dev:desktop` 改为直接执行 electron build + 并行启动 web/electron
  - 避免脚本内部再次依赖全局 `pnpm`

### 验证结果
- `corepack pnpm exec vitest run`：通过
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过

### 当前结论
- 批量种草现在至少有了最小自动化护栏，后续再出现“提示成功但只保留最后一条”时，能更早暴露。
- 构建脚本链路已恢复，不再依赖当前环境是否安装全局 `pnpm`。

## 2026-04-30（V3.2 紧急修复：批量种草遗留冲突导致白屏）

### 问题现象
- 页面出现白屏，应用无法正常打开。
- 批量种草相关问题尚未继续定位到最终根因前，前端已先被编译错误阻断。

### 根因判断
- `src/features/templates/CreateTaskTemplateForm.tsx` 残留了未清理的 merge 冲突标记：
  - `<<<<<<< ours`
  - `=======`
  - `>>>>>>> theirs`
- 该文件属于首页底部种草区提交流程，冲突标记进入源码后会直接导致前端构建失败，从而表现为白屏。

### 本轮修复
- 更新 `src/features/templates/CreateTaskTemplateForm.tsx`
  - 清理批量种草提交逻辑中的冲突标记
  - 保留“顺序创建 + 创建后校验补写”的当前实现分支
  - 明确 `createdItems` 为 `TaskTemplate[]`
- 更新 `dev-log.md`
  - 清理上一轮遗留的文档冲突标记
- 更新 `handoff.md`
  - 清理上一轮遗留的文档冲突标记
  - 记录当前白屏已恢复为可编译状态

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm exec vite build`：通过
- `corepack pnpm run build`：未通过
  - 原因不是本轮白屏修复回归，而是 `package.json` 中 `build` 脚本再次调用 `pnpm run build:web`
  - 当前终端环境没有全局 `pnpm`，因此脚本链路失败

### 当前结论
- 白屏的直接原因已修复，源码已恢复到可编译状态。
- 批量种草“提示多条但库里只剩最后一条”的业务问题仍需继续排查，尚未在这一轮宣告解决。

## 2026-04-30（V3.2 Grass List Page 第二轮补修：批量种草并发写覆盖）

### 问题现象
- 多行输入时，界面提示“已加入多条种草”
- 但实际存储结果只保留最后一条

### 根因判断
- 批量种草初版虽然已经取消 `Promise.all(...)`，但仍是“每一行都单独写一次整份 `AppData`”。
- 当前存储层采用的是整份 `AppData` 快照读改写持久化。
- 在同一次批量提交里连续多次写回整份快照，仍存在前几次结果被后一次写回覆盖的风险。
- 结果表现为：
  - 提示已保存多条
  - 最终持久化可能只保留最后一条
- 继续排查后确认，问题不只在批量种草提交层：
  - `mutateAppData(...)` 原本也是“事务外读当前快照，再事务内整包写回”
  - 这会让其他并发写入路径也存在旧快照覆盖新结果的可能

### 本轮修复
- 更新 `src/features/templates/CreateTaskTemplateForm.tsx`
  - 将批量创建从并发 `Promise.all(...)` 改为顺序 `for...of await`
  - 保持每一行生成独立种草项
  - 避免整份 `AppData` 并发写覆盖
- 更新 `src/db/storage.ts`
  - `mutateAppData(...)` 改为在同一个 Dexie 事务内读取当前 `AppData` 再写回
  - 避免事务外旧快照覆盖最新写入

### 当前结论
- 这轮修复后，批量种草仍然是：
  - 多行输入
  - 每行一条独立 item
  - 空行忽略
  - 最多 20 条
- 但创建过程当前仍是顺序写入，不是单次批量写入
- 同时，`AppData` 的通用写入路径比之前更稳，后续并发写互相覆盖的风险更低

## 2026-04-30（V3.2 Grass List Page 第二轮：批量种草）

### 本轮目标
- 只做主页底部种草区的批量种草
- 不改独立种草清单页面结构
- 不改 SQLite、导入导出、打包、Windows

### 开始前已阅读
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

### 本轮关键判断
- 当前主页种草输入已复用统一表单，不需要另起一套状态流。
- 第一版优先稳定实现：
  - 多行 `textarea`
  - 按换行切分
  - 每行生成独立 item
- 暂不实现复杂的“灰色 ... 占位行”交互，先保证数据正确和可用。

### 本轮修改
- 更新 `src/features/templates/TemplateFormFields.tsx`
  - 将种草内容输入从单行 `input` 改为多行 `textarea`
  - 新增 `GRASS_BATCH_MAX_LINES = 20`
  - 新增 `parseGrassBatchTitles(...)`
  - 校验规则改为：
    - 至少有 1 行有效内容
    - 空行自动忽略
    - 最多 20 条
- 更新 `src/features/templates/CreateTaskTemplateForm.tsx`
  - 提交时按换行切分标题
  - 继续复用同一组共享元信息：
    - `activityTypeId`
    - `sceneTagIds`
    - `interestLevel`
  - 一次提交生成 `1-20` 条独立种草项
  - 成功提示支持单条 / 多条文案
- 更新 `src/styles/globals.css`
  - 调整多行输入框最小高度与可调整行为

### 当前行为结论
- 主页底部种草区现已支持批量种草。
- 用户可在同一输入框内按换行输入多条内容。
- 每一行会生成一条独立种草项，而不是合并成一个 item。
- 空行会被忽略。
- 最多支持 20 条。
- 若只有 1 行，行为与之前单条保存一致。

### 验证结果
- `pnpm run lint`：通过
- `pnpm run build`：通过
- `pnpm run build:desktop`：通过

### 本轮没有做
- 没有做复杂动态占位行交互
- 没有改独立种草清单筛选 / 编辑结构
- 没有做“添加到今日 Todo”入口优化
- 没有改 SQLite、导入导出、打包、Windows

### 仍需本机真人点击确认
- 单行输入时，行为与原先单条保存一致
- 多行输入时，会生成多条独立种草项
- 空行会被忽略
- 超过 20 行时会被阻止保存
- 保存后的新条目能在独立种草清单页中看到

## 2026-04-30（V3.2 Grass List Page 补充收口：主页种草区按钮精简）

### 本轮目标
- 删除主页种草区原有的种草清单按钮
- 只保留：
  - `+/-`
  - `保存`

### 本轮修改
- 更新 `src/pages/home/HomePage.tsx`
  - 移除主页种草区内跳转“种草清单”的按钮
  - 主页种草区工具按钮现仅保留展开/收起与保存

### 本轮没有做
- 没有改独立种草清单页面
- 没有改路由
- 没有改种草数据流

## 2026-04-30（V3.2 Grass List Page 第一轮：导航骨架 + 独立页面壳）

### 本轮目标
- 只做：
  - 顶部导航骨架
  - 独立种草清单页面壳
  - 主页入口迁移
- 不改种草数据模型、不做批量种草、不做 SQLite、导入导出、打包、Windows

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `task-list.md`
- `dev-log.md`
- `src/app/router.tsx`
- `src/app/shell/AppShell.tsx`
- `src/pages/home/HomePage.tsx`
- `src/features/templates/TemplateManagerPanel.tsx`

### 本轮关键判断
- 当前已经有可复用的完整种草管理组件：
  - `TemplateManagerPanel`
- 当前最稳的第一步不是重写种草清单，而是：
  - 先把它迁到独立页面
  - 主页只保留轻量输入区
- 当前顶部壳只有设置按钮，因此需要先补轻量导航承接新页面

### 本轮修改
- 新增 `src/pages/grass-list/GrassListPage.tsx`
  - 独立种草清单页面先直接承接 `TemplateManagerPanel`
- 更新 `src/app/router.tsx`
  - 新增 `/grass-list`
- 更新 `src/app/shell/AppShell.tsx`
  - 顶部导航改为：
    - 今日
    - 种草清单
    - 设置
- 更新 `src/pages/home/HomePage.tsx`
  - 保留新增种草输入区与保存能力
  - 移除主页内 `TemplateManagerPanel` 展开
  - 原列表按钮改为跳转到独立种草清单页
- 更新 `src/styles/globals.css`
  - 补充顶部导航与独立页面壳的最小样式

### 当前行为结论
- 主页底部继续保留轻量种草输入区。
- 完整种草清单浏览已迁到独立页面。
- 顶部已可在：
  - 今日
  - 种草清单
  - 设置
 之间切换。

### 验证结果
- `pnpm run lint`：通过
- `pnpm run build`：通过
- `pnpm run build:desktop`：通过

### 本轮没有做
- 没有做批量种草
- 没有重写种草清单筛选/编辑逻辑
- 没有新增“添加到今日 Todo”快捷入口
- 没有改 SQLite、导入导出、打包、Windows

### 仍需本机真人点击确认
- 顶部能切换：
  - 今日
  - 种草清单
  - 设置
- 主页底部仍能新增种草
- 主页不再展开完整种草清单
- 独立种草清单页能正常看到现有种草项

## 2026-04-30（V3.1 Core Fixes：Todo 手动排序边界按钮禁用修复）

### 本轮目标
- 只修复排序模式下的一个边界 bug：
  - 白天无事项时，晚上第一条无法上移
  - 晚上无事项时，白天最后一条无法下移

### bug 原因
- 移动逻辑本身已经支持跨组插入。
- 但按钮禁用逻辑仍按“全局第一条 / 全局最后一条”在判断。
- 这会导致：
  - 夜间首条在没有白天项时，被误判为“不能上移”
  - 白天末条在没有晚上项时，被误判为“不能下移”

### 本轮修复
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 调整 `isMoveDisabled(...)`
  - 白天项：
    - 只有“白天第一条上移”会禁用
  - 晚上项：
    - 只有“晚上最后一条下移”会禁用
  - 允许：
    - 白天末条下移跨到晚上（即使当前晚上为空）
    - 晚上首条上移跨到白天（即使当前白天为空）

### 验证结果
- `pnpm run lint`：通过
- `pnpm run build`：通过
- `pnpm run build:desktop`：通过

## 2026-04-30（V3.1 Core Fixes：Todo 手动排序跨日夜分界线 bug 修复）

### 本轮目标
- 只修复 Todo 手动排序跨白天 / 晚上分界线的错误归属问题
- 不改重复规则、种草清单、SQLite、导入导出、打包、Windows

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

### bug 原因
- 上一版排序实现把全部未完成事项合并成一个数组重排。
- 跨线移动后，再按“白天条数边界”整体重算所有 item 的 `timeBlock`。
- 这会导致：
  - 移动中的 item 跨线时
  - 另一条相邻 item 也被动换组
- 本质问题是：
  - 跨组移动被错误实现成“全列表 swap + 边界重算归属”
  - 而不是“移出原组，插入目标组”

### 本轮修复
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 排序逻辑改为先拆成：
    - `dayItems`
    - `nightItems`
  - 同组内移动：
    - 继续组内交换
  - 跨组移动：
    - `night` 第一条上移时，移出 `nightItems`，插入 `dayItems` 末尾
    - `day` 最后一条下移时，移出 `dayItems`，插入 `nightItems` 开头
  - 最后分别重写 `sortOrder`
  - 只改变移动中的 item 的 `timeBlock / timeBlockSource`
  - 其他 item 保持原 day/night 归属

### 当前行为结论
- 同组内移动仍是相邻交换。
- 跨组移动现在采用：
  - 移出原组
  - 插入目标组
- 只改变移动中的 item 的 day/night 归属。
- 不再把另一条相邻 item 一起挤到对侧。

### 验证结果
- `pnpm run lint`：通过
- `pnpm run build`：通过
- `pnpm run build:desktop`：通过

### 本轮没有做
- 没有改重复规则
- 没有改种草清单独立页面
- 没有改 SQLite、导入导出、数据目录迁移
- 没有改打包、Windows 适配

### 仍需本机真人点击确认
- 用例 A：晚上第一条上移跨到白天，只改变移动中的 item 归属
- 用例 B：白天最后一条下移跨到晚上，只改变移动中的 item 归属
- 用例 C：白天组内移动仍然都是白天
- 用例 D：晚上组内移动仍然都是晚上
- 用例 E：边界无效移动保持不变

## 2026-04-30（V3.1 Core Fixes：Todo 手动排序）

### 本轮目标
- 只做 Todo 手动排序
- 不做重复规则、种草清单独立页面、SQLite、导入导出、打包、Windows

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
- `src/styles/globals.css`
- `src/types/models.ts`

### 本轮关键判断
- 当前已有 `DayPlanItem.sortOrder`，不需要新增独立 `order` 字段。
- 已完成事项已有独立的显示与排序逻辑：
  - 继续按 `completedAt` 显示
  - 不应参与手动排序
- 第一版优先稳定实现：
  - 排序模式
  - 上移 / 下移按钮
  - 每次移动即时保存
- 跨白天 / 晚上边界时：
  - 只更新当前日期实例的 `timeBlock`
  - 不去改模板全局语义

### 本轮修改
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 新增排序模式状态
  - 新增“调整顺序 / 完成排序”入口
  - 排序模式下为未完成事项显示上移 / 下移按钮
  - 复用 `sortOrder`
  - 每次移动后按 `1, 2, 3...` 重写当前日期未完成事项顺序
  - 跨过白天 / 晚上分隔线时，同步更新当前日期实例 `timeBlock`
  - 已完成事项继续沉底显示，不参与手动排序
- 更新 `src/styles/globals.css`
  - 新增排序模式按钮激活态
  - 新增排序模式分隔线样式
  - 新增排序模式标题细节样式

### 当前行为结论
- 排序只作用于当前 `selectedDate` 的未完成事项。
- 已完成事项不参与手动排序，继续在底部按 `completedAt` 排序。
- 普通查看模式不显示白天 / 晚上的实线分隔线。
- 排序模式中显示白天 / 晚上分隔线。
- 白天事项下移跨线后会变成晚上事项并变色。
- 晚上事项上移跨线后会变成白天事项并变色。

### 验证结果
- `pnpm run lint`：通过
- `pnpm run build`：通过
- `pnpm run build:desktop`：通过
- `pnpm run dev`：
  - 成功启动
  - `http://localhost:5173/J-Flow/` 返回 `200`
- `pnpm run dev:desktop`
  - 本轮未完成一次新的干净启动
  - 原因仍是本机 `4173` 已被现有 `node` 进程占用
  - `curl -I http://localhost:4173/J-Flow/` 返回 `200`
  - `lsof -nP -iTCP:4173 -sTCP:LISTEN` 显示端口已有监听

### 本轮没有做
- 没有接入拖拽库
- 没有改重复规则
- 没有改种草清单独立页面
- 没有改 SQLite、导入导出、数据目录迁移
- 没有改打包、Windows 适配

### 仍需本机真人点击确认
- 当前日期有多个未完成 Todo 时，确认可进入排序模式
- 确认未完成事项可上移 / 下移
- 确认刷新页面后顺序仍保留
- 确认已完成事项仍在底部且不参与排序
- 确认排序模式中有白天 / 晚上分隔线，普通模式没有
- 确认白天项下移越界后变成晚上项并变色
- 确认晚上项上移越界后变成白天项并变色
- 确认取消完成后回未完成区，不破坏排序

### 下一轮建议
- 若排序交互确认通过，可切到：
  - V3.2 Grass List Page
  - 或先做种草清单独立页面前的导航整理

## 2026-04-30（V3.1 Core Fixes：完成日期归属 + 停止重复清理未来）

### 本轮目标
- 只做以下 4 条实现：
  - 已完成事项按完成日期归属显示
  - 修改完成时间后的跨日期迁移
  - 停止重复清理 future occurrence
  - 恢复重复继续懒生成

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
- `src/features/todo/todo-view-model.ts`
- `src/features/recurrence/auto-generated.ts`
- `src/types/models.ts`

### 本轮关键判断
- 这轮优先改“列表显示归属”，不重写原计划字段语义：
  - `date / originDate / targetDate` 继续承担计划归属
  - `completedAt` 负责已完成事项的显示归属
- 取消完成后，事项应回到当前有效计划日期：
  - 如果事项此前已经顺延到今天，则回到今天
  - 不误回更早的 `originDate`
- 修改 `completedAt` 当前只影响已完成事项显示归属：
  - 本轮不让它顺手影响“完成后重复”的下一次生成
- 停止重复清理 future occurrence 时：
  - 边界使用用户当前操作日期 `selectedDate`
  - 不使用系统今天日期

### 本轮修改
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 新增已完成事项显示日期 helper
  - Todo 列表改为：
    - 未完成按 `date` 过滤显示
    - 已完成按 `completedAt` 对应日期过滤显示
  - 修改完成时间后，列表会按新的完成日期重新归属
  - 停止重复时不再只切 `isArchived`
    - 同时清理当前操作日期之后的 future occurrence
    - 保留当前和既往 occurrence
  - 恢复重复时仅解除停止状态，继续懒生成
- 更新 `src/features/recurrence/auto-generated.ts`
  - `afterCompletion` 的下一次生成基准改为只读 `recurringTaskInstances.completedAt`
  - 避免用户手动编辑已完成事项显示时间后，顺手影响下一次重复生成

### 当前行为结论
- 已完成事项现在按 `completedAt` 对应日期显示。
- 修改 `completedAt` 会改变已完成事项显示归属，但不改原计划日期字段。
- 取消完成后，事项回到当前有效计划日期的未完成区。
- 停止重复时，future occurrence 的判断以用户当前查看/操作日期为边界。
- 恢复重复时不立即回填 future occurrence，后续切到目标日期再生成。

### 验证结果
- `pnpm run lint`：通过
- `pnpm run build`：通过
- `pnpm run build:desktop`：通过

### 本轮没有做
- 没有改 Todo 手动排序
- 没有改种草清单独立页面
- 没有改 SQLite、导入导出、数据目录迁移
- 没有改打包、Windows 适配

### 仍需本机真人点击确认
- 将今天已完成事项的 `completedAt` 改成昨天，确认它从今天页移到昨天页
- 将昨天顺延到今天的事项在今天完成后再取消完成，确认它回到今天未完成区
- 以某个重复 Todo 在历史日期执行“停止重复”，确认只清理该操作日期之后的 future occurrence

### 下一轮建议
- 若这轮交互确认通过，可继续：
  - Todo 手动排序
  - 或补一轮已完成事项跨日期显示的边角交互收口

## 2026-04-30（V3.1 Core Fixes 规则收口：完成日期归属 + 停止重复）

### 本轮目标
- 只更新文档，不改代码
- 收口两组关键规则：
  - 已完成事项按完成日期归属
  - 停止重复时清理 future occurrence

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`

### 本轮新增规则结论
- 已完成事项不再默认挂在原计划日期下。
- 未完成事项按“当前有效计划日期”显示。
- 已完成事项按 `completedAt` 对应日期显示。
- 修改 `completedAt` 后，事项应迁移到新的完成日期页面。
- 取消完成后，事项应回到当前有效计划日期的未完成区。
- 若事项此前已经被顺延到今天，则取消完成后应回到今天，而不是误回更早历史日期。
- 停止重复时：
  - 保留当前日期及以前的 occurrence
  - 清理当前日期之后的 future occurrence
- 恢复重复时：
  - 不立即回填 future occurrence
  - 继续沿用“进入某天时同步生成”的懒生成策略

### 本轮判断依据
- 之前“未来已完成条目是否要保留”的顾虑，本质上来自“已完成事项仍挂在原计划日期”这一旧口径。
- 一旦改为“已完成事项按完成日期归属显示”：
  - 未来日期页面不应再保留这类已完成条目
  - 停止重复时清理 future occurrence 的规则会更干净、更一致
- 对于取消完成：
  - 若事项已经顺延到今天，用户心智中的当前计划归属就是今天
  - 因此取消完成后应回到今天，而不是回到更早的 originDate

### 本轮更新文档
- `product-rules.md`
  - 明确完成日期归属规则
  - 明确修改 `completedAt` 后的跨日期迁移
  - 明确取消完成回当前有效计划日期
  - 明确停止重复 / 恢复重复规则
- `data-model.md`
  - 明确 `date` 与 `originDate` 的职责边界
  - 明确未完成按 `date`，已完成按 `completedAt` 归属显示
  - 明确停止 / 恢复重复的模型语义
- `handoff.md`
  - 记录本轮规则收口结论
  - 调整下一位开发者的第一优先实现项
- `task-list.md`
  - 将上述规则落地列为 V3.1 下一轮优先任务

### 本轮没有做
- 没有改任何业务代码
- 没有改重复生成实现
- 没有改已完成事项跨日期迁移实现
- 没有改 SQLite、导入导出、打包、Windows

### 下一轮建议
- 先做一轮规则落地实现，范围只包含：
  - 已完成事项按完成日期归属显示
  - 修改完成时间后的跨日期迁移
  - 停止重复清理 future occurrence
  - 恢复重复继续懒生成
- 等这一轮收口后，再继续：
  - Todo 手动排序
  - 或 V3.2 相关页面重构

## 2026-04-29（V3.1 Core Fixes 第三轮：重复规则扩充）

### 本轮目标
- 只做重复规则扩充
- 不做 Todo 手动排序、种草清单独立页面、SQLite、导入导出、打包

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`
- `src/types/models.ts`
- `src/db/schema.ts`
- `src/db/storage.ts`
- `src/features/recurrence/auto-generated.ts`
- `src/features/continuation/todo-carryover.ts`
- `src/features/todo/TodoModePanel.tsx`
- `src/features/templates/CreateTaskTemplateForm.tsx`

### 本轮关键判断
- 当前重复系统的核心不是独立 repeat-rule 实体，而是：
  - `TaskTemplate.recurrence`
  - `RecurringTaskInstance.recurrence`
  - `syncAutoGeneratedDayPlanForDate(...)`
- 现有实例生成机制已经是“进入某天时同步生成”，这很适合继续沿用。
- 本轮最稳妥方案不是推倒旧 `recurrence`，而是：
  - 新增新模型字段
  - 保留旧字段作为兼容层
  - 读取时优先新字段，缺失时映射旧字段

### 本轮修改
- 更新 `src/types/models.ts`
  - 新增：
    - `RepeatType`
    - `RepeatIntervalUnit`
    - `RepeatRule`
  - 为 `TaskTemplate` 新增：
    - `repeatType`
    - `repeatIntervalUnit`
    - `repeatIntervalValue`
  - 为 `RecurringTaskInstance` 新增：
    - `targetDate`
    - `repeatType`
    - `repeatIntervalUnit`
    - `repeatIntervalValue`
- 新增 `src/features/recurrence/repeat-rule.ts`
  - 统一处理：
    - 旧五类规则映射到新模型
    - 新模型序列化回兼容字段
    - interval 取值 clamp
    - 日/月/年日期计算
    - 月 / 年不存在日期时落到最后一天
- 更新 `src/db/schema.ts`
  - schema 加入新重复字段
  - `APP_DATA_SCHEMA_VERSION` 升到 `6`
- 更新 `src/db/storage.ts`
  - 在 `normalizeLegacyAppData` 中补兼容层
  - 旧 `daily / weekly / monthly / yearly` 自动映射为：
    - `calendar + intervalValue=1 + intervalUnit`
- 更新 `src/features/recurrence/auto-generated.ts`
  - `calendar`
    - 改为支持 `每 x 天 / 周 / 月 / 年`
  - `afterCompletion`
    - 只有完成后才计算下一次
    - 下一次日期基于 `completedAt + interval`
    - 若当前已经存在下一次 pending occurrence，则不重复生成
  - 继续沿用“进入某天时同步生成”机制
- 更新 `src/features/continuation/todo-carryover.ts`
  - repeating item 判断同一 cycle 时，兼容：
    - 新 `targetDate`
    - 旧 `dateKey`
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 替换旧五个 recurrence 小标签
  - 新增：
    - 不重复
    - 按日历重复
    - 完成后重复
    - interval 数字输入
    - 单位选择
  - interval 输入范围限制为 `1-100`
- 更新 `src/styles/globals.css`
  - 为新重复规则 UI 补最小样式

### 新重复模型
- 逻辑模型：
  - `none`
  - `calendar`
  - `afterCompletion`
- interval：
  - `day`
  - `week`
  - `month`
  - `year`
- 当前落地策略：
  - 新字段承载新语义
  - 旧 `recurrence` 继续保留用于兼容

### 旧数据兼容策略
- 旧 `none`
  - -> `repeatType = none`
- 旧 `daily`
  - -> `calendar + 1 + day`
- 旧 `weekly`
  - -> `calendar + 1 + week`
- 旧 `monthly`
  - -> `calendar + 1 + month`
- 旧 `yearly`
  - -> `calendar + 1 + year`
- 当前阶段主要靠读取兼容层，不要求用户手动迁移旧数据

### 日历式重复规则
- 不管当前 occurrence 是否完成，未来命中日仍会继续出现
- 计算基准是模板锚点 `date`
- 支持：
  - 每 `x` 天
  - 每 `x` 周
  - 每 `x` 月
  - 每 `x` 年

### 完成后重复规则
- 只有当前 occurrence 完成后才会安排下一次
- 下一次基于 `completedAt`
- 若没有 `completedAt`，不生成下一次
- 当前若已经存在下一次 pending occurrence，不重复生成
- 本阶段采用稳定优先策略：
  - 若下一次已经生成
  - 后续再修改上一条 `completedAt`
  - 不自动追溯改已生成的下一次日期

### 日期计算规则
- `day`
  - 加 `x` 天
- `week`
  - 加 `7 * x` 天
- `month`
  - 按日历月加 `x` 月
  - 若目标月不存在对应日期，落到目标月最后一天
- `year`
  - 按日历年加 `x` 年
  - 若目标年对应月份不存在对应日期，落到该月最后一天

### 验证结果
- `pnpm run lint`：通过
- `pnpm run build`：通过
- `pnpm run build:desktop`：通过
- `pnpm run dev`
  - 正常启动
  - `http://localhost:5173/J-Flow/` 返回 `200`
- `pnpm run dev:desktop`
  - 本轮未能完成一次新的干净启动验证
  - 失败原因是本机已有旧进程占用 `4173`
  - `lsof -nP -iTCP:4173 -sTCP:LISTEN` 显示：
    - `node` 进程仍在监听 `4173`
  - 这是端口占用冲突，不是本轮代码编译错误

### 本轮明确没有做
- 没有做 Todo 手动排序
- 没有改种草清单独立页面
- 没有接 SQLite
- 没有做导入导出
- 没有做数据目录迁移
- 没有做打包
- 没有做 Windows 适配

### 下一轮建议
- 继续 `V3.1 Core Fixes`
- 下一项建议优先做：
  - Todo 手动排序
  - 或在进入 V3.2 前先整理桌面端导航与种草清单入口

## 2026-04-29（V3.1 Core Fixes 第二轮：完成事项自动下沉 + completedAt）

### 本轮目标
- 只做一个核心修复：
  - 完成事项自动下沉
  - 明确并使用 `completedAt`
  - 支持修改完成时间
- 不改重复规则、手动排序、种草清单、SQLite、导入导出、打包

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
- `src/features/todo/todo-view-model.ts`
- `src/styles/globals.css`
- `src/types/models.ts`
- `src/db/schema.ts`
- `src/db/storage.ts`

### 本轮关键判断
- `completedAt` 字段实际上已存在于当前类型、schema 与 storage 中，本轮不需要新增字段或重构存储层。
- 当前主要缺口不是“没有字段”，而是：
  - 列表仍按 `day/night` 分组显示已完成事项
  - 已完成事项没有统一沉底排序
  - 缺少完成时间修改入口
- 旧历史数据里若存在 `status = completed` 但没有 `completedAt`，本轮先做兼容排序，不做正式 migration：
  - 这类事项仍留在已完成组
  - 排序时放到带有效 `completedAt` 的事项之后
  - 用户可手动补录完成时间

### 本轮修改
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 调整 `sortTodoItems`
    - 未完成事项保持在上方
    - 已完成事项统一沉到底部
    - 已完成事项按 `completedAt` 从早到晚排序
  - 将展示分组调整为：
    - 白天未完成
    - 晚上未完成
    - 已完成
  - 完成 / 恢复未完成继续复用现有逻辑：
    - 完成时写入 `completedAt = new Date().toISOString()`
    - 恢复未完成时清空 `completedAt = undefined`
  - 新增已完成事项的原生 `datetime-local` 编辑入口
    - 仅已完成事项可编辑
    - 保存后同步更新 `dayPlanItem.completedAt`
    - 若存在 `recurringInstanceId`，同步更新对应 `recurringTaskInstance.completedAt`
- 更新 `src/features/todo/todo-view-model.ts`
  - 已完成 tag 简化为固定“已完成”
  - 具体完成时间改为单独可编辑的一行显示
- 更新 `src/styles/globals.css`
  - 已完成卡片改为中性无色样式
  - 已完成 tag 改为中性样式
  - 白天事项底色加深为更明显的浅黄色
  - 新增完成时间按钮与 `datetime-local` 输入样式

### completedAt 语义
- `completedAt` 存储为 ISO string
- 当用户把 Todo 标记为完成时：
  - `status = completed`
  - `completedAt = 当前时间 ISO string`
- 当用户把 Todo 恢复为未完成时：
  - `status = pending`
  - `completedAt = undefined`
- 本轮延续当前项目风格，统一使用 `undefined`，不引入 `null`

### 排序与兼容策略
- 未完成事项：
  - 继续沿用当前顺序
  - 本轮不改手动排序
- 已完成事项：
  - 按 `completedAt` 升序
  - `completedAt` 越早越靠上
  - `completedAt` 越晚越靠下
- 历史完成事项若缺少 `completedAt`：
  - 保留在已完成组
  - 排到已完成组最后
  - 不会导致崩溃

### 完成时间修改规则
- 仅已完成事项显示完成时间入口
- 点击后切换为原生 `datetime-local` 输入
- 输入非法时不写入
- 取消修改时不改数据
- 修改完成时间不会改变事项 `date`
- 修改完成时间不会触发重复规则变化

### 验证结果
- `pnpm run lint`：通过
- `pnpm run build`：通过
- `pnpm run build:desktop`：通过
- `pnpm run dev`
  - 受当前环境端口占用影响，本轮实际启动在 `5174`
  - `http://localhost:5174/J-Flow/` 返回 `200`
- `pnpm run dev:desktop`
  - Desktop renderer 正常启动在 `4173`
  - `http://localhost:4173/J-Flow/` 返回 `200`

### 本轮明确没有做
- 没有改重复规则
- 没有改手动排序
- 没有改种草清单页面
- 没有接 SQLite
- 没有做导入导出
- 没有做数据目录迁移
- 没有做打包
- 没有做 Windows 适配

### 下一轮建议
- 继续留在 `V3.1 Core Fixes`
- 下一项更适合做：
  - 重复规则扩充
  - 或 Todo 手动排序
- 如果希望先做边界更可控的一项，建议优先进入重复规则重构的文档到代码落地

## 2026-04-29（V3.1 Core Fixes 第一轮：天气占位改日历跳转）

### 本轮目标
- 正式进入 `V3.1 Core Fixes`
- 只做一个功能：
  - 取消天气占位
  - 改为日历图标与任意日期跳转
- 不改重复规则、排序、完成事项、种草清单、SQLite、导入导出、打包

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
- `src/components/ui/Icons.tsx`
- `src/styles/globals.css`
- `src/features/todo/TodoModePanel.tsx`

### 本轮关键判断
- 当前“天气占位”位于主页日期切换区，本质是一个纯 UI 占位，不涉及业务逻辑。
- 主页已经有前一天 / 后一天切换逻辑，因此日历跳转应直接复用同一套 `selectedDate` 更新入口。
- 当前最稳妥方案是原生 `input[type='date']`：
  - 不新增大型日期组件库
  - Web / Desktop 都可复用
  - 实现成本小、稳定性高

### 本轮修改
- 更新 `src/components/ui/Icons.tsx`
  - 新增 `CalendarIcon`
- 更新 `src/pages/home/HomePage.tsx`
  - 删除天气占位 UI
  - 新增日历图标入口
  - 新增原生日期选择器
  - 让前一天 / 后一天 / 日历选择共用同一套 `selectedDate` 更新逻辑
- 更新 `src/styles/globals.css`
  - 删除天气占位相关样式
  - 新增日历跳转按钮与隐藏 date input 样式

### 复用的现有逻辑
- 继续复用主页现有的 `selectedDate` 状态
- 继续复用 `TodoModePanel selectedDate={selectedDate}` 这条已有数据流
- 继续复用现有日期切换语义：
  - 前一天
  - 后一天
  - 现在新增“任意日期跳转”
- 未新增新的业务日期状态，也没有改 Todo 数据读取 / 展示入口

### 验证结果
- `pnpm run lint`：通过
- `pnpm run build`：通过
- `pnpm run build:desktop`：通过
- `pnpm run dev`
  - 正常启动
  - 本轮验证时因 5173 被占用，Vite 自动切到 `5174`
  - 页面可正常访问
- `pnpm run dev:desktop`
  - 正常启动
  - Desktop renderer 正常跑在 `4173`
  - Electron 开发窗口链路未报错
- 代码检索确认：
  - 当前 `src/pages` / `src/components` / `src/styles` 中已无天气占位相关 UI 残留

### 本轮明确没有做
- 没有改重复规则
- 没有改 Todo 排序
- 没有改完成事项逻辑
- 没有改种草清单页面
- 没有接 SQLite
- 没有做导入导出
- 没有做数据目录迁移
- 没有做打包
- 没有做 Windows 适配
- 没有改数据模型

### 下一轮建议
- 可以继续 `V3.1 Core Fixes`
- 下一项更合适的是：
  - 重复规则扩充
  - 或完成事项自动下沉与 `completedAt`
- 不建议在 `V3.1` 中间插入 SQLite、导入导出或打包工作

## 2026-04-29（V3.0 Desktop Foundation 第一轮：最小 Electron 骨架接入）

### 本轮目标
- 只做 `Desktop Foundation`
- 不改业务规则
- 让现有 React / Vite / TypeScript 应用在 macOS 上具备最小 Electron 桌面运行骨架
- 保留原网页端 `dev/build` 能力

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`
- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `src/main.tsx`
- `src/app/router.tsx`
- `src/features/settings/SettingsPanel.tsx`

### 本轮关键判断
- 当前项目结构足够轻，适合用最小 Electron 主进程 + preload 方式接入，不需要引入更重的 Electron 工程化方案。
- 网页端 `build` 当前依赖 GitHub Pages `base: '/J-Flow/'`，不能直接改坏。
- 桌面端构建需要独立 renderer 输出目录与 `./` base，避免未来加载本地文件时路径出错。
- 当前最小 IPC 适合只做开发验证，不应该污染正式业务 UI。

### 本轮新增依赖
- `electron`
- `concurrently`
- `wait-on`
- `cross-env`
- `@types/node`

### 本轮新增文件
- `electron/main.ts`
- `electron/preload.ts`
- `electron/tsconfig.json`

### 本轮关键实现
- 更新 `package.json`
  - 保留原 `dev`
  - 将原 `build` 继续作为网页端构建入口
  - 新增：
    - `build:web`
    - `build:electron`
    - `build:desktop:renderer`
    - `build:desktop`
    - `dev:desktop`
    - `dev:desktop:electron`
- 更新 `electron/main.ts`
  - 创建最小桌面窗口
  - 设置默认桌面尺寸
  - 开启 `contextIsolation`
  - 关闭 `nodeIntegration`
  - 注册最小 IPC：
    - `app:get-info`
    - `app:get-data-path`
- 更新 `electron/preload.ts`
  - 通过 `contextBridge` 暴露：
    - `getAppInfo()`
    - `getDataPath()`
- 更新 `src/vite-env.d.ts`
  - 补充 `window.jflowDesktop` 类型
- 更新 `src/main.tsx`
  - 在检测到桌面 API 时输出 console 验证信息
- 更新 `src/app/router.tsx`
  - 增加 `BASE_URL` 正常化，兼容桌面端 `./` base
- 更新 `.gitignore`
  - 忽略 `dist-electron`
  - 忽略 `dist-desktop`

### 验证结果
- `pnpm run build:electron`：通过
- `pnpm run build`：通过
- `pnpm run build:desktop`：通过
- `pnpm run lint`：通过
- `pnpm run dev:desktop`：
  - 已可在 macOS 上真正打开桌面窗口
  - 窗口中可正常显示现有 J-Flow 页面

### 本轮问题与修复记录
- Electron 初次安装时被 `pnpm` 的 ignored build scripts 阻止。
- 依赖安装阶段出现：
  - `Ignored build scripts: electron@41.3.0`
- 后续通过以下方式修复：
  - `pnpm approve-builds --all`
  - 手动执行 `install.js` 下载 Electron 二进制
- Electron dev URL 曾写为：
  - `http://127.0.0.1:5173/J-Flow/`
- 已修正为：
  - `http://localhost:4173/J-Flow/`
- `wait-on` 已改为等待真实页面：
  - `http-get://localhost:4173/J-Flow/`
- `electron/main.ts` 中的 `loadURL` 已增加错误处理：
  - 加载失败时会 `console.error` 输出 URL 与错误原因

### 当前阶段结论
- 当前 macOS Electron dev 链路已跑通。
- `V3.0 Desktop Foundation` 当前已达到：
  - Electron dev 链路可用
  - Web / Desktop 双开发链路可用
- 当前仍未进入：
  - SQLite
  - 导入导出
  - 数据目录迁移
  - 打包

### 本轮明确没有做
- 没有改重复规则
- 没有改 Todo 排序
- 没有改完成事项逻辑
- 没有改种草清单页面
- 没有接 SQLite
- 没有做导入导出
- 没有做数据目录迁移
- 没有做 Windows 打包
- 没有做云同步
- 没有做账号系统
- 没有重构业务逻辑

### 下一轮建议
- `V3.0 Desktop Foundation` 的 dev 链路问题已收口。
- 下一轮可以根据排期选择：
  - 继续补 V3.0 的非业务基础项
  - 或进入 `V3.1 Core Fixes`
- 进入 `V3.1` 前，仍不建议提前做 SQLite、导入导出、打包和 Windows 适配。

## 2026-04-29（阶段切换：从 V2 Web 转向 J-Flow V3 Desktop）

### 本轮目标
- 不改业务代码
- 完成项目交接整理
- 将项目主线从网页端 V2 收口状态，正式切换为 `J-Flow V3 Desktop`
- 更新核心文档中的阶段判断、技术方案、任务拆分与数据方向

### 开始前已阅读
- `README.md`
- `handoff.md`
- `dev-log.md`
- `task-list.md`
- `product-rules.md`
- `data-model.md`
- `constraints.md`
- `app-structure.md`
- `manual-test-checklist.md`
- `design-guidelines.md`

### 本轮关键判断
- 当前网页端已经基本可用，但仍有业务逻辑与 UI 缺陷。
- 继续在网页端做大规模规则重构与 UI 调整，边际收益已经明显下降。
- 网页端更适合冻结为已部署、可参考的 `V2` 版本，而不是继续作为主战场。
- 下一阶段最重要的不是继续扩网页功能，而是建立：
  - Electron 跨平台桌面壳
  - 本地数据库
  - 导入 / 导出
  - 数据目录
  - 备份恢复

### 本轮关键决策
- 正式将下一阶段命名为：`J-Flow V3 Desktop`
- 技术方案优先采用 `Electron`
- 当前不优先 `Tauri`
- V3 第一阶段优先本地储存，不做账号系统、云数据库、iCloud、手机端同步
- 运行时数据库优先推荐 `SQLite`
- `JSON` 作为完整备份、导入、导出、迁移格式
- 网页端继续保留，但暂不继续承接新功能

### 本轮新增需求整理
- 顶部天气占位改为日历跳转
- 重复规则扩充为：
  - `calendar`
  - `afterCompletion`
- Todo 手动排序
- 完成事项自动下沉与 `completedAt`
- 完成时间修改
- 种草清单独立页面
- 主页底部保留轻量种草区
- 批量种草
- V3 本地数据库、导入导出、备份与未来同步预留

### 本轮修改
- 更新 `handoff.md`
  - 明确 V2 网页端状态
  - 明确网页端暂不继续增改
  - 明确 V3 Desktop 主线
  - 明确下一位开发者优先事项
- 更新 `README.md`
  - 更新当前项目状态
  - 保留 V2 网页端说明
  - 加入 V3 Desktop 方向
  - 写明线上地址
- 更新 `constraints.md`
  - 明确当前不做云同步、账号系统、iCloud、原生移动端
  - 明确数据安全与导入导出是桌面版基础能力
- 更新 `product-rules.md`
  - 增加日历式重复与完成后重复规则
  - 增加完成事项排序规则
  - 增加手动排序与白天 / 晚上语境变更规则
  - 增加种草清单独立页面与批量种草规则
- 更新 `data-model.md`
  - 规划 `repeatType / intervalUnit / intervalValue`
  - 规划 `completedAt`
  - 规划 `order`
  - 规划 SQLite + JSON 方案
  - 规划 schema version / migration
- 更新 `app-structure.md`
  - 规划 Electron 目录结构
  - 说明 main / preload / renderer 分工
  - 规划桌面端路由与页面结构
- 更新 `task-list.md`
  - 新增 `V3.0 ~ V3.4` 任务组
  - 标注 Must-have 与 Later
- 更新 `dev-log.md`
  - 记录本轮阶段切换

### 验证结果
- 本轮未改业务源码
- 本轮未改 schema 实现
- 本轮未执行 `lint / build`
  - 原因：本轮仅进行文档更新与技术方案整理

### 当前未解决问题
- Electron 具体脚手架选型与接入方式尚未实施
- SQLite 具体库选型尚未最终定稿
- 已完成事项恢复未完成后的“原排序位恢复”是否做首版支持，仍可在实现前再收口
- 本地文件夹同步目前只完成方向预留，尚未进入实现设计细节

## 2026-04-29（文档修正：V3 Desktop 改为跨平台，macOS 优先开发）

### 本轮背景
- 在上一轮阶段切换基础上，用户进一步明确了当前真实开发环境与优先级。

### 用户确认的新判断
- `V3 Desktop` 不应被写死为 Windows 桌面版。
- 当前实际开发环境是 MacBook。
- 第一阶段应先做 Electron 跨平台桌面版，并优先在 macOS 上开发、自测和试用。
- Windows 版作为后续适配与打包目标，不作为当前每轮开发阻塞项。
- 当前不要转向 Swift / SwiftUI，也不要进入 App Store、签名、公证等正式发布流程。

### 本轮关键修正
- 将文档中的“Windows 优先桌面版”统一调整为：
  - Electron 跨平台桌面版
  - macOS 优先开发
  - Windows 后续适配
- 将里程碑调整为：
  - `V3.0 Desktop Foundation`
  - `V3.1 Core Fixes`
  - `V3.2 Grass List Page`
  - `V3.3 Local Backup`
  - `V3.4 Windows Compatibility`

### 本轮修改
- 更新 `handoff.md`
  - 修正平台方向与里程碑
- 更新 `dev-log.md`
  - 记录本轮平台口径修正
- 更新 `task-list.md`
  - 里程碑重排为 `V3.0 ~ V3.4`
- 更新 `README.md`
  - 修正为跨平台 Desktop，macOS 优先
- 更新 `app-structure.md`
  - 修正 Electron 壳与打包命令描述
- 更新 `constraints.md`
  - 明确不转向 Apple 原生 App 与正式发布流程

### 验证结果
- 本轮未改业务代码
- 本轮未执行 `lint / build`
  - 原因：仅文档修正

## 2026-04-28（V2.2：设置页数据导出 / 导入第一版）

### 本轮目标
- 实现网页端 V2.2：数据导出 / 导入
- 入口放在设置页中：
  - 排序设置之后
  - 测试工具之前
- 不改 schema，不改 storage 结构语义，只补本地快照导入 / 导出能力

### 开始前已阅读
- `handoff.md`
- `product-rules.md`
- `app-structure.md`
- `data-model.md`
- `constraints.md`
- `task-list.md`
- `design-guidelines.md`
- `dev-log.md`
- `src/features/settings/SettingsPanel.tsx`
- `src/db/storage.ts`
- `src/db/schema.ts`

### 本轮关键判断
- 当前最稳的导入方案是“备份文件整体覆盖当前本地数据”，不做合并导入。
- 现有 `getAppData` / `replaceAppData` / schema parse 已经足够支撑快照式导入 / 导出，不需要额外改 schema。
- 导出 / 导入入口应放在设置页而不是首页，符合当前网页端“工具型能力集中在设置页”的结构口径。

### 本轮关键决策
- 导出格式使用本地 JSON 快照。
- 导入读取 JSON 文件，并整体覆盖当前本地数据。
- 导入继续复用现有 schema 校验与 normalize 流程，保留：
  - `grassStatus` 兼容
  - `originDate` 兼容
- 导入前保留明确确认。
- 当前不实现：
  - 合并导入
  - 导入预览
  - 差异比较

### 本轮修改
- 更新 `src/db/storage.ts`
  - 新增 `exportAppDataSnapshot`
  - 新增 `importAppDataSnapshot`
  - 暴露到 `appDataStorage` 与 `appDataRepository`
- 更新 `src/features/settings/SettingsPanel.tsx`
  - 在排序设置后、测试工具前新增“数据导入 / 导出”区块
  - 新增“导出当前数据”按钮
  - 新增“导入备份文件”按钮
  - 增加本地文件读取、导入确认与成功提示
- 更新 `src/styles/globals.css`
  - 增加隐藏文件输入样式
- 更新 `handoff.md`
  - 记录 V2.2 已实现状态与新的后续路线
- 更新 `task-list.md`
  - 将数据导出 / 导入标记为已完成
- 更新 `manual-test-checklist.md`
  - 将导出 / 导入从待实现切到已实现手测项
- 更新 `dev-log.md`
  - 记录本轮实现与验证

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
  - 保留既有 Vite chunk size warning，不影响构建成功

## 2026-05-02 编辑卡片首轮实现

### 本轮目标
- 将 Todo 列表中的“编辑”从行内改标题切换为卡片式编辑。
- 已完成事项不再提供右侧编辑按钮，只保留完成时间编辑。
- 普通事项与拔草事项共用 quick add 卡片结构，但遵守不同的可编辑边界。

### 本轮关键决策
- 复用现有 quick add 浮层做 `create / edit` 两种模式，不再维护单独的行内编辑状态。
- 编辑普通事项时：
  - 锁定“普通/拔草条目”切换
  - 保留日夜切换
  - 显示 Todo 输入框
  - 保留附加设置
- 编辑拔草事项时：
  - 锁定“普通/拔草条目”切换
  - 保留日夜切换
  - 不显示 Todo 输入框
  - 只允许修改附加设置
- 已完成事项：
  - 右侧不再显示编辑按钮
  - 继续只允许通过“完成于 xx”入口编辑完成时间
- 编辑卡片点外部时直接关闭，不做自动保存，避免误提交半成品。

### 本轮修改
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 移除行内标题编辑状态与 UI
  - 新增基于 quick add 的编辑模式状态
  - 支持从现有事项预填编辑卡片
  - 普通事项编辑可改标题、时段与附加设置
  - 拔草事项编辑可改时段与附加设置，不显示内容输入
  - 已完成事项隐藏右侧编辑按钮
- 更新 `src/styles/globals.css`
  - 为编辑卡片补充底部操作区样式
  - 为锁定状态下的 segmented button 补充禁用交互样式

### 验证结果
- `corepack pnpm run lint`：通过

### 当前风险
- 编辑卡片中的“重复规则”已经接入保存，但其在“单次事项 <-> 重复事项”之间切换时，涉及实例/模板转换，仍需要后续补一轮人工回归验证。

## 2026-05-02 编辑卡片与种草停靠补丁

### 本轮修改
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 编辑卡片底部的“保存修改”改为图标按钮
- 更新 `src/styles/globals.css`
  - 将重复规则配置行压缩为按钮组下方的紧凑布局
  - 缩短重复间隔输入框与单位选择宽度
  - 调整首页右侧主列与种草区布局，保证种草区收起/展开时都固定在页面底部

### 验证结果
- `corepack pnpm run lint`：通过

## 2026-05-02 Todo 浮层锚点与右侧固定高度补丁

### 本轮修改
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 新增 quick add 浮层锚点状态
  - 新增模式改为锚定到空白加号框下方左对齐
  - 编辑模式改为锚定到当前事项卡片下方左对齐
  - Todo 列表区改为内部滚动容器结构
  - 重复规则配置行按重复类型切换不同对齐方式
- 更新 `src/styles/globals.css`
  - `按日历重复` 配置行改为卡片内居中
  - `完成后重复` 配置行改为卡片内右对齐
  - 首页右列高度改为固定视口高度分配
  - Todo 容器改为固定高度，内部滚动

### 验证结果
- `corepack pnpm run lint`：通过

### 当前风险
- 浮层定位这轮按要求未做边界保护，靠近容器底部或右侧时可能出现遮挡，这是当前已知且刻意保留的行为。

## 2026-05-02 重复控件高度统一补丁

### 本轮修改
- 更新 `src/styles/globals.css`
  - 将 quick add / 编辑卡片里 `必要 / 准备 / 分次 / 不重复 / 按日历重复 / 完成后重复` 六个控件高度统一到与 `1 / 天` 两个选择框一致的 34px

## 2026-05-02 文案收尾与准备备注保存修复

### 本轮修改
- 更新 `src/app/shell/AppShell.tsx`
  - 左侧日期卡片标题从 `TODAY` 改为 `THIS DAY`
- 更新 `src/features/todo/TodoModePanel.tsx`
  - 排序模式标题改为 `待办事项排序`
  - 排序说明改为“通过上下箭头调整待办事项顺序，跨过日夜分隔线后自动切换背景颜色。”
  - `准备` 勾选后自动聚焦到准备备注输入区
  - `准备` 勾选时备注改为必填
  - 在准备备注输入区按回车可直接保存事项
  - 编辑卡片保存按钮禁用逻辑同步纳入准备备注必填校验
- 更新 `src/pages/trash/TrashPage.tsx`
  - 占位说明文案改为新的开发中说明
- 更新 `src/features/settings/SettingsPanel.tsx`
  - `TESTING` 改为 `RESET`
  - `测试工具` 改为 `重置应用`
  - 删除“仅供当前开发 / 测试阶段使用”
  - 按钮文案改为 `重置`
  - 重置确认文案去掉“测试用”
- 更新 `src/styles/globals.css`
  - 去掉设置页重置区的粉色框和底色

### 验证结果
- `corepack pnpm run lint`：通过

## 2026-05-02 应用图标接入与 V1 dmg 打包

### 本轮目标
- 将根目录 `J-Flow.png` 接入桌面应用打包图标
- 产出一版明确命名的 `V1` macOS `.dmg`
- 同步更新打包与交接文档

### 本轮关键决策
- 当前不单独维护 `.icns` 源文件。
- 直接将根目录 `J-Flow.png` 复制为打包资源 `build/icon.png`，交给 `electron-builder` 在 macOS 打包阶段处理。
- 当前产物命名不改包版本号 `0.1.0`，只将 `.dmg` 文件名改为：
  - `J-Flow-V1.dmg`

### 本轮修改
- 新增 `build/icon.png`
  - 来源于根目录 `J-Flow.png`
- 更新 `package.json`
  - `build.mac.icon` 指向 `build/icon.png`
  - `build.dmg.artifactName` 改为 `J-Flow-V1.dmg`
- 更新 `README.md`
  - 将 macOS 打包状态更新为已完成
  - 补充当前图标来源与最新产物路径

### 验证结果
- `corepack pnpm run package:mac`：通过
- 成功产出：
  - `release/J-Flow-V1.dmg`
  - `release/J-Flow-V1.dmg.blockmap`

### 当前说明
- `release/` 目录中仍保留旧产物：
  - `J-Flow-0.1.0.dmg`
- 这是历史打包结果，本轮未主动清理。
- `electron-builder` 仍会提示 `package.json` 缺少 `description` 与 `author`，但不阻塞当前打包。

## 2026-05-18 Sync 1 本地同步元数据基础

### 本轮目标
- 开始本地文件夹同步实现，但只做 `Sync 1`
- 建立 `deviceId`、本地同步元数据与本地变更追踪基础
- 不实现同步文件夹、`items/`、`tombstones/`、立即同步或设置页 UI

### 本轮修改
- 更新 `electron/sqlite.ts`
  - SQLite schema version 升级到 `2`
  - 新增本地表：
    - `sync_meta`
    - `sync_changes`
  - 新增同步元信息默认项：
    - `deviceId`
    - `lastSyncedAt`
    - `lastSyncStatus`
    - `lastSyncError`
  - 为 `scene_tags`、`activity_types`、`recurring_task_instances`、`day_plan_items` 补齐 `updated_at`
  - 旧数据 migration 中自动初始化缺失的 `updated_at`
  - `settings / sceneTags / activityTypes / taskTemplates / recurringTaskInstances / dayPlanItems` 的 SQLite 写路径已接入 `sync_changes`
  - 删除实体时不再只删业务表，同时写入本地 `delete` 变化记录
- 更新 `electron/main.ts`、`electron/preload.cts`、`src/vite-env.d.ts`
  - 新增只读 bridge：
    - `repository.sync.getState()`
    - `repository.sync.listChanges()`
- 更新 `src/types/models.ts`、`electron/types.ts`、`src/db/schema.ts`
  - 为参与 Sync 1 的主要实体补齐稳定 `updatedAt`
  - 新增 `LocalSyncState` 与 `SyncChange` 类型
- 更新 `src/db/storage.ts`
  - 旧数据 normalize 时为 `sceneTags / activityTypes / recurringTaskInstances / dayPlanItems` 初始化 `updatedAt`
  - Web 路径的创建 / 修改逻辑同步补齐 `updatedAt`
- 更新若干测试 / fixture / mock / 页面辅助代码
  - 以适配 `updatedAt` 成为稳定必填字段

### 关键决策
- `deviceId` 当前存放在 SQLite `sync_meta`，仅桌面端生成，不参与跨设备同步。
- `lastSyncedAt` 当前也存放在 SQLite `sync_meta`，作为后续“读取本地自上次同步后的变化”的本地依据。
- 第一版本地删除记录采用 `sync_changes(changeType=delete)`，不依赖远端 tombstone 才知道本地删过什么。
- `updatedAt` 必须来自业务修改时刻，不能在未来导出 sync item 时临时刷新。

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm exec vitest run electron/sqlite.test.ts src/db/storage.test.ts src/db/storage.desktop.test.ts`：通过

### 当前边界
- 仍未实现同步文件夹选择
- 仍未实现同步目录初始化
- 仍未写入 `items/`
- 仍未写入 `tombstones/`
- 仍未实现“立即同步”

## 2026-05-18 Sync 2 同步文件夹准备层

### 本轮目标
- 只做 `Sync 2`
- 落地同步文件夹路径保存、目录可读写检查与同步目录初始化
- 不开始真正同步业务数据

### 本轮修改
- 更新 `electron/sqlite.ts`
  - `sync_meta` 新增本机 key：
    - `syncTargetPath`
  - 新增：
    - `setSqliteSyncTargetPath`
    - `clearSqliteSyncTargetPath`
  - `getSqliteLocalSyncState` 已扩展返回：
    - `syncTargetPath`
- 新增 `electron/sync-folder.ts`
  - 负责同步目录准备层能力：
    - 检查目录存在且为目录
    - 检查读写权限
    - 执行临时 JSON 写入 / 读回 / 删除测试
    - 初始化 `J-Flow Sync` 目录骨架
    - 读写并校验 `sync-info.json`
    - 写入 `devices/<deviceId>.json`
    - 通过 `.tmp + rename` 做 metadata 原子写入
- 更新 `electron/main.ts`、`electron/preload.cts`、`src/vite-env.d.ts`
  - `repository.sync` 新增：
    - `chooseTargetPath()`
    - `setTargetPath(path)`
    - `clearTargetPath()`
    - `testTargetPath(path?)`
- 更新 `src/db/storage.ts`
  - `appDataRepository.sync` 已对齐新增 bridge 方法
- 更新 `src/features/settings/SettingsPanel.tsx`
  - 新增一个轻量“数据与同步”入口
  - 当前支持：
    - 查看当前设备 ID
    - 查看当前同步文件夹
    - 选择同步文件夹
    - 测试同步文件夹
    - 清除同步文件夹
  - 当前不包含：
    - 立即同步
    - items / tombstones 状态展示
- 新增测试：
  - `electron/sync-folder.test.ts`

### 关键决策
- `syncTargetPath` 继续存放在本机 SQLite `sync_meta`，不参与跨设备同步。
- 第一版若用户选择的路径不存在，直接返回错误，不擅自创建父级路径。
- `sync-info.json` 若已存在且合法，则保留原 `createdAt`，仅刷新 `updatedAt`。
- `devices/<deviceId>.json` 当前只记录设备存在和最近可用状态，不当作业务同步结果。

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm exec vitest run electron/sync-folder.test.ts electron/sqlite.test.ts src/db/storage.test.ts src/db/storage.desktop.test.ts`：通过

### 当前边界
- 仍未实现 `items/` 导出
- 仍未实现 `tombstones/` 导出
- 仍未实现“立即同步”
- 仍未开始远端 item / tombstone 读取
- 仍未开始任何合并策略或 `last-write-wins`

## 2026-05-18 Sync 3 本地待同步变化导出

### 本轮目标
- 只做 `Sync 3`
- 将本地 `sync_changes` 中待同步变化导出到 sync folder
- 不开始远端读取、合并或冲突处理

### 本轮修改
- 新增 `electron/sync-export.ts`
  - 新增：
    - `exportLocalChangesToSyncFolder`
    - `exportPendingSyncChanges`
  - 当前导出规则：
    - `sync_changes upsert` -> `items/<entityDir>/<id>.json`
    - `sync_changes delete` -> `tombstones/<entityDir>/<id>.json`
  - 单条文件写入成功后，才更新对应 `sync_changes.syncedAt`
  - 部分失败时返回：
    - 成功数
    - 失败数
    - 失败项列表
- 更新 `electron/sqlite.ts`
  - 新增：
    - `listPendingSqliteSyncChanges`
    - `markSqliteSyncChangeSyncedAt`
- 更新 `electron/main.ts`、`electron/preload.cts`、`src/vite-env.d.ts`、`src/db/storage.ts`
  - `repository.sync` 新增：
    - `exportLocalChanges()`
- 新增 `electron/sync-export.test.ts`
  - 覆盖：
    - `dayPlanItem` upsert 导出 item
    - `dayPlanItem` delete 导出 tombstone
    - 成功写入后回写 `syncedAt`
    - upsert 实体缺失时报错且保持未同步
    - 部分成功时成功项写 `syncedAt`，失败项保持待同步

### 关键决策
- 本轮没有把“同步前自动备份”硬塞进导出主流程。
  - 若后续完整“立即同步”闭环需要自动备份，再在 Sync 5 串入。
- 本轮严格不更新本机 `lastSyncedAt`。
  - 当前只更新：
    - `sync_changes.syncedAt`
    - Sync 目录中的 metadata 文件时间
- 若 `upsert` 对应实体本地已不存在：
  - 当前直接返回失败
  - 不自动转成 tombstone
  - 以便暴露本地 change log / 删除链路异常

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm exec vitest run electron/sync-export.test.ts electron/sync-folder.test.ts electron/sqlite.test.ts src/db/storage.test.ts src/db/storage.desktop.test.ts`：通过

### 当前边界
- 仍未读取远端 `items/`
- 仍未读取远端 `tombstones/`
- 仍未做本地 / 远端合并
- 仍未做 `last-write-wins`
- 仍未实现“立即同步”按钮
- 仍未做自动同步

## 2026-05-18 Sync 4 远端变化导入与本地合并

### 本轮目标
- 只做 `Sync 4`
- 读取 sync folder 中的远端 `items/` 与 `tombstones/`
- 按第一版 `last-write-wins` 规则合并到本地 SQLite
- 远端导入不制造新的待上送 `sync_changes`

### 本轮修改
- 新增 `electron/sync-import.ts`
  - 新增：
    - `importRemoteChangesFromSyncFolder`
    - `applyRemoteSyncChanges`
  - 当前能力：
    - 扫描远端 `items/` / `tombstones/`
    - 校验远端 JSON
    - 按目录推断 `entityType`
    - 按时间排序后逐条应用
    - 返回 `applied / skipped / failed` 统计
- 更新 `electron/sqlite.ts`
  - 新增：
    - `getSqliteSyncChangeByEntity`
    - `applyRemoteSqliteSyncChangeState`
    - `applyRemoteSqliteSettings`
    - `applyRemoteSqliteSceneTag`
    - `applyRemoteSqliteActivityType`
    - `applyRemoteSqliteTaskTemplate`
    - `applyRemoteSqliteRecurringTaskInstance`
    - `applyRemoteSqliteDayPlanItem`
    - `applyRemoteSqliteDelete`
  - 这些方法用于“静默导入”：
    - 会更新本地 SQLite
    - 但不会制造新的待上送变化
- 更新 `electron/main.ts`、`electron/preload.cts`、`src/vite-env.d.ts`、`src/db/storage.ts`
  - `repository.sync` 新增：
    - `importRemoteChanges()`
- 新增 `electron/sync-import.test.ts`
  - 覆盖：
    - 远端 item 更新本地
    - 远端旧 item 跳过
    - 远端 tombstone 删除本地
    - 远端旧 tombstone 跳过
    - 本地已删除 + 远端旧 item 不复活
    - 本地已删除 + 远端新 item 可复活
    - 损坏 JSON / 目录与 `entityType` 不匹配 / 缺少 `deletedAt` 作为 failure
    - 不更新 `lastSyncedAt`
    - 不污染待上送 `sync_changes`

### 关键决策
- 当前不做“读到远端记录后直接跳过本机自己导出的 deviceId 特判”。
  - 允许照常读取
  - 再用 `last-write-wins` 判断自然跳过
- 远端导入写入本地时，不走普通本地变更路径。
  - 改为走“静默导入”路径
  - 并把对应 `sync_changes` 状态更新为已同步状态，而不是新的待上送变化
- 当前不更新本机 `lastSyncedAt`
  - 因为还不是完整同步闭环
- 当前也不把“同步前自动备份”硬塞进导入主流程
  - 等完整“立即同步”流程再统一串联

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm exec vitest run electron/sync-import.test.ts electron/sync-export.test.ts electron/sync-folder.test.ts electron/sqlite.test.ts src/db/storage.test.ts src/db/storage.desktop.test.ts`：通过

### 当前边界
- 仍未实现完整“立即同步”按钮
- 仍未实现自动同步
- 仍未实现人工冲突选择
- 仍未更新 `lastSyncedAt`
- 仍未把备份串入同步主流程

## 2026-05-18 Sync 5 最小手动同步闭环

### 本轮目标
- 只做 `Sync 5`
- 串起最小手动同步闭环：
  - 检查同步路径
  - 准备同步目录
  - 获取最小锁
  - 创建本地自动备份
  - 导入远端变化
  - 导出本地变化
  - 汇总结果
  - 仅在全链路完全成功时写 `lastSyncedAt`
- 本轮不接设置页 UI

### 本轮修改
- 新增 `electron/sync-now.ts`
  - 新增：
    - `runManualSync`
  - 当前能力：
    - 编排 `prepare -> lock -> backup -> import -> export`
    - 返回 `SyncNowResult`
    - `partial / failed` 时不写 `lastSyncedAt`
    - `finally` 中释放自己的锁
- 更新 `electron/sync-folder.ts`
  - 新增：
    - `acquireSyncLock`
    - `releaseSyncLock`
    - `updateSyncDeviceInfo`
  - 当前锁策略：
    - 使用 `locks/sync_<deviceId>.json`
    - 若发现其他设备未过期锁，直接返回失败
    - 过期或损坏锁文件可清理
    - 不删除其他设备未过期锁
- 更新 `electron/main.ts`、`electron/preload.cts`、`src/vite-env.d.ts`、`src/db/storage.ts`
  - `repository.sync` 新增：
    - `syncNow()`
- 新增 `electron/sync-now.test.ts`
  - 覆盖：
    - 完全成功
    - 无变化但成功
    - import failure -> partial
    - export failure -> partial
    - 备份失败 -> failed
    - 路径缺失 -> failed
    - 锁冲突 -> failed
    - 异常时释放自己的锁
    - 成功闭环不制造额外待上送 `sync_changes`
- 顺手修正 `electron/sync-import.ts`
  - `settings` 类型的 sync item 不再强制要求 `data.id`
  - 避免 settings 导入在无变化闭环里被误判为 failure

### 关键决策
- `lastSyncedAt` 只在完整闭环完全成功时写入
  - 写入时间使用 `completedAt`
  - 即使没有任何变化，只要整轮成功，也会写入
- 若 `import` 或 `export` 任一步存在 failure：
  - 本轮返回 `partial`
  - 保留已成功应用 / 导出的部分
  - 不写本机 `lastSyncedAt`
  - 不写远端 `devices/<deviceId>.json.lastSyncedAt`
- 自动备份只在 `syncNow` 主流程开头做一次
  - 备份失败直接中止
  - 不在 `import / export` 内部重复备份
- 锁释放固定放在 `finally`
  - 即使失败或抛异常，也尽量释放自己的锁

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm exec vitest run electron/sync-now.test.ts electron/sync-import.test.ts electron/sync-export.test.ts electron/sync-folder.test.ts electron/sqlite.test.ts src/db/storage.test.ts src/db/storage.desktop.test.ts`：通过

### 当前边界
- 当前仍未接设置页“立即同步”按钮
- 当前仍未做自动同步
- 当前仍未做 WebDAV / 账号系统
- 当前仍未做人工冲突选择
- 当前仍未做字段级合并

## 2026-05-19 Sync 5 UI 薄接入

### 本轮目标
- 只在设置页“数据与同步”区域接入一张最小同步卡片
- 复用已有：
  - `repository.sync.getState()`
  - `repository.sync.chooseTargetPath()`
  - `repository.sync.openTargetPath()`
  - `repository.sync.setTargetPath(path)`
  - `repository.sync.clearTargetPath()`
  - `repository.sync.testTargetPath(path?)`
  - `repository.sync.syncNow()`
- 不改同步核心流程，不做复杂同步中心

### 本轮修改
- 更新 `src/features/settings/SettingsPanel.tsx`
  - 将原来的同步按钮区重构为同步卡片
  - 新增：
    - 状态区
    - 同步文件夹区
    - 最近结果区
    - 主操作区
    - 详情折叠区
  - 当前支持：
    - 未设置时选择同步文件夹
    - 已设置时立即同步
    - 打开 / 更改同步文件夹
    - 查看最近一次同步结果摘要
    - 在详情区查看：
      - `deviceId`
      - `syncVersion`
      - import / export 统计
      - 最近一次备份路径
      - 完整错误
- 更新 `src/styles/globals.css`
  - 新增同步卡片相关样式
  - 为 `not configured / syncing / success / partial / failed` 提供轻量状态视觉
- 更新 `electron/main.ts`、`electron/preload.cts`、`src/vite-env.d.ts`、`src/db/storage.ts`
  - `repository.sync` 新增：
    - `openTargetPath()`
- 更新 `electron/sqlite.ts` 与 `electron/sync-now.ts`
  - 新增本机同步结果元数据持久化：
    - `lastSyncAttemptedAt`
    - `lastSyncResult`
  - 当前同步卡片刷新后仍可读取最近一次同步摘要，而不是只靠页面内临时 state

### 关键决策
- 同步卡片保持“桌面偏好设置”风格，不扩展成同步中心
- `deviceId`、`syncVersion`、完整错误、备份路径全部放进折叠详情
- 同步主区只保留：
  - 状态
  - 文件夹
  - 最近结果
  - 一个主按钮
- 当前为兼容“已设置文件夹但尚未第一次同步”的情况，UI 内部增加了一个轻量 `ready` 展示状态：
  - 文案：`同步已就绪`
  - 视觉保持中性
  - 不改变同步核心状态机

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm exec vitest run electron/sync-now.test.ts electron/sync-import.test.ts electron/sync-export.test.ts electron/sync-folder.test.ts electron/sqlite.test.ts src/db/storage.test.ts src/db/storage.desktop.test.ts`：通过

### 当前边界
- 当前仍只支持手动同步
- 当前仍未做自动同步 / 定时同步 / 后台同步
- 当前仍未做 WebDAV / 账号系统
- 当前仍未做冲突选择 UI
- 当前仍未做复杂同步历史页

## 2026-05-19 设置页数据与备份入口收口

### 本轮目标
- 收紧设置页里“数据导入 / 导出”和自动备份相关 UI
- 不改现有导入 / 导出逻辑
- 不改单独的自动备份逻辑
- 只把 UI 调整成更简洁的入口

### 本轮修改
- 更新 `src/features/settings/SettingsPanel.tsx`
  - `Data` 区域现在只保留：
    - `导入数据`
    - `导出数据`
    - `恢复备份`
  - 不再显示：
    - 数据目录
    - SQLite 主库路径
    - 自动备份目录
    - 单独的自动备份卡片
- 新增 `恢复备份` 行为：
  - 点击后会读取最新一份自动备份
  - 再沿用现有 `importSnapshot` 流程整体导入
  - 导入前仍会弹确认
- 更新 `electron/backup.ts`、`electron/main.ts`、`electron/preload.cts`、`src/vite-env.d.ts`
  - 新增读取最新自动备份内容的 bridge：
    - `readLatestAutoBackup()`

### 关键决策
- 自动备份逻辑本身不变，只收口 UI
- “恢复备份”不新造恢复链路，直接复用现有导入数据语义
- 当前仍不在设置页展示备份目录或备份列表

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过

### 当前边界
- 当前仍没有备份列表页
- 当前仍只支持“恢复最新一份自动备份”
- 当前仍未支持从设置页浏览多份自动备份

## 2026-05-19 OneDrive 同步目标方案文档

### 本轮目标
- 不开始实现 OneDrive
- 先补一份“像 Joplin 那样接入 OneDrive”的设计文档
- 明确它和当前本地文件夹同步的关系

### 本轮修改
- 新增：
  - `docs/sync-onedrive-design.md`
- 文档当前说明了：
  - OneDrive 同步目标和当前同步文件夹的区别
  - 为什么 Joplin 能通过浏览器授权接 OneDrive
  - J-Flow 要怎么把同步目标抽象成 driver
  - OneDrive auth、driver、token 存储、设置页心智需要怎样调整
  - 推荐实现顺序

### 关键决策
- 当前建议不是推翻 Sync 1-5
- 而是在现有同步格式和同步规则基础上，新增：
  - `OneDrive` 同步目标
- 当前也明确记录了一个规则冲突：
  - `constraints.md` 仍写着“当前不做云同步”
  - 若真的要开始做 OneDrive，需要先补产品边界确认

### 当前边界
- 当前仍未开始 OneDrive 实现
- 当前仍未新增账号系统
- 当前仍未修改现有 Sync 1-5 代码

## 2026-05-19 Sync Target Driver 设计文档

### 本轮目标
- 不开始写 OneDrive
- 先把当前 Sync 2-5 底层写死的本地同步文件夹抽象方向说明清楚
- 为 `localFolder` driver 和未来 `oneDriveAppFolder` driver 做准备

### 本轮修改
- 新增：
  - `docs/sync-target-driver-design.md`
- 文档当前说明了：
  - `SyncTargetDriver` 接口草案
  - `logicalPath` 统一使用 POSIX 风格
  - `localFolder` 如何把 logicalPath 映射到真实磁盘路径
  - `oneDriveAppFolder` 未来如何把 logicalPath 映射到 App Folder
  - `sync-folder.ts`、`sync-export.ts`、`sync-import.ts`、`sync-now.ts` 将来如何迁移
  - `SyncTargetConfig` 建议模型
  - 设置页未来应从“同步文件夹”升级为“同步目标”
  - 推荐实现顺序

### 关键决策
- 当前最优先的不是写 OneDrive OAuth
- 而是先抽：
  - `driver interface`
  - `LocalFolderDriver`
- 这样后续接 OneDrive 时，不需要再重拆 Sync 2-5 的核心逻辑

### 当前边界
- 当前仍未改任何同步代码
- 当前仍未开始 driver 重构
- 当前仍未开始 OneDrive 实现

## 2026-05-19 Sync Target Driver 实施计划文档

### 本轮目标
- 继续只写文档
- 不开始 OneDrive OAuth 或 Graph API
- 把 `SyncTargetDriver` 的设计文档进一步细化成可执行的代码迁移计划

### 本轮修改
- 新增：
  - `docs/sync-target-driver-implementation-plan.md`
- 文档当前补清了：
  - 推荐新增的 driver 相关文件
  - `LocalFolderDriver` 第一版的职责和复用边界
  - `sync-folder.ts` 是直接改名还是逐步剥离
  - `sync-export.ts` / `sync-import.ts` / `sync-now.ts` 如何在不改规则的前提下切到 driver
  - 现有测试如何迁移并确保行为不变
  - 最小代码实施顺序

### 关键决策
- 当前 driver 改造的第一步不应直接重命名 `sync-folder.ts`
- 更稳妥的方式是：
  - 先新增 `sync-target/` 目录
  - 先落 `LocalFolderDriver`
  - 再让 `sync-folder.ts` 逐步从“直接使用 fs”改成“调用 driver”
- 当前迁移目标不是新功能，而是保证现有 local folder sync 行为不变

### 当前边界
- 当前仍未改任何同步代码
- 当前仍未开始 OneDrive OAuth / Graph API
- 当前仍未开始设置页“同步目标”UI 改造

## 2026-05-19 Sync Target Driver Step 1

### 本轮目标
- 开始代码迁移，但只做 Step 1
- 新增 driver 类型定义与 `LocalFolderDriver`
- 不改 `sync-export` / `sync-import` / `sync-now` 现有行为

### 本轮修改
- 新增：
  - `electron/sync-target/types.ts`
  - `electron/sync-target/local-folder-driver.ts`
  - `electron/sync-target/index.ts`
  - `electron/sync-target/local-folder-driver.test.ts`
- 更新：
  - `app-structure.md`
- `LocalFolderDriver` 当前已支持：
  - `readText`
  - `writeText`
  - `delete`
  - `list`
  - `exists`
  - `ensureDir`
  - `safeWriteJson`
- 当前约束已落地：
  - `logicalPath` 统一按 POSIX 风格处理
  - 拒绝反斜杠路径
  - 拒绝绝对路径
  - 拒绝 `..` 路径穿越
  - 本地 JSON 安全写入继续使用 `.tmp -> rename`

### 关键决策
- 本轮没有直接改 `sync-folder.ts`，以避免把 Step 1 扩散成同步主流程改造。
- `LocalFolderDriver` 当前先作为独立底层能力落地，下一轮再让 metadata / lock / `sync-info` 相关操作开始逐步走 driver。

### 验证结果
- 本轮代码验证见命令结果。

### 当前边界
- 当前 `sync-export.ts` / `sync-import.ts` / `sync-now.ts` 仍直接依赖现有 local folder helper。
- 当前仍未开始 OneDrive。
- 当前仍未改同步规则或设置页 UI。

## 2026-05-19 Sync Target Driver Step 2

### 本轮目标
- 继续迁移 local folder driver，但只动 `sync-folder.ts`
- 让 metadata / lock / `sync-info` / `devices` 相关本地文件读写开始通过 `LocalFolderDriver` 承接
- 不改 `sync-export` / `sync-import` / `sync-now` 行为

### 本轮修改
- 更新：
  - `electron/sync-folder.ts`
  - `electron/sync-folder.test.ts`
  - `app-structure.md`
- 当前 `sync-folder.ts` 已在内部创建 `LocalFolderDriver(targetPath)`，并让这些能力走 driver：
  - 同步目录结构 ensure
  - `sync-info.json` 读取 / 写入 / 校验
  - `devices/<deviceId>.json` 写入 / 更新
  - `locks/` 读取 / 写入 / 删除
  - 本地目录读写测试中的临时 JSON 往返
- `getSyncItemDirectoryPath` / `getSyncTombstoneDirectoryPath` 当前也统一改为通过 logical path resolve 到真实路径
- 补充了锁相关测试：
  - 其他设备持有未过期锁时仍返回冲突
  - 过期锁仍会被清理后再继续获取

### 关键决策
- 本轮保留了 `sync-folder.ts` 的对外 API，不改函数名和调用方式。
- 本轮没有把 `sync-folder.ts` 完全改写成 driver-only 协议模块，而是先把底层 local `fs` 读写替换成 driver 调用，避免一步跨太大。
- 本轮继续保留 `safeWriteJsonAtomic` 的对外导出，避免影响现有 `sync-export.ts`。

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm exec vitest run electron/sync-folder.test.ts electron/sync-target/local-folder-driver.test.ts electron/sync-export.test.ts electron/sync-import.test.ts electron/sync-now.test.ts`：通过

### 当前边界
- 当前 `sync-export.ts` / `sync-import.ts` / `sync-now.ts` 仍未切到 driver 注入。
- 当前同步行为、文件结构、LWW 规则保持不变。
- 当前仍未开始 OneDrive。

## 2026-05-19 Sync Target Driver Step 3

### 本轮目标
- 只迁移 `sync-export.ts`
- 让本地变化导出的文件写入开始通过 `SyncTargetDriver`
- 不改 import / syncNow / UI / OneDrive

### 本轮修改
- 更新：
  - `electron/sync-export.ts`
  - `app-structure.md`
- 当前已保留旧对外入口：
  - `exportLocalChangesToSyncFolder(...)`
  - `exportPendingSyncChanges(...)`
- 当前新增 driver 版内部导出函数：
  - `exportPendingSyncChangesToTarget(...)`
- `sync-export.ts` 当前改为：
  - 只生成 logicalPath
  - `upsert -> items/<entityDir>/<id>.json`
  - `delete -> tombstones/<entityDir>/<id>.json`
  - 通过 `driver.safeWriteJson(logicalPath, payload)` 写入
- 当前保持不变：
  - pending `sync_changes` 读取顺序
  - `upsert` 实体不存在时返回 failure
  - `delete` 使用 `sync_changes.changedAt` 作为 `deletedAt`
  - 单条成功后逐条写 `syncedAt`
  - partial failure 行为
  - 不更新 `lastSyncedAt`
  - JSON 格式不变

### 关键决策
- 本轮没有删除旧入口，而是先用 wrapper 保持外部调用方不变。
- 本轮仍然由旧入口内部创建 `LocalFolderDriver(targetPath)`，这样 `sync-now.ts` 和调用侧无需同时改动。

### 验证结果
- 本轮代码验证见命令结果。

### 当前边界
- 当前 `sync-import.ts` / `sync-now.ts` 仍未切到 driver。
- 当前仍未开始 OneDrive。

## 2026-05-19 Sync Target Driver Step 4

### 本轮目标
- 只迁移 `sync-import.ts`
- 让远端 `items/` / `tombstones/` 的扫描与读取开始通过 `SyncTargetDriver`
- 不改 export / syncNow / UI / OneDrive

### 本轮修改
- 更新：
  - `electron/sync-import.ts`
  - `app-structure.md`
- 当前已保留旧对外入口：
  - `importRemoteChangesFromSyncFolder(...)`
  - `applyRemoteSyncChanges(...)`
- 当前 `sync-import.ts` 已开始使用 `LocalFolderDriver`
- 当前改为：
  - 用 `driver.list('items/...')` 扫描远端 item
  - 用 `driver.list('tombstones/...')` 扫描远端 tombstone
  - 用 `driver.readText(logicalPath)` 读取 JSON
- 当前保持不变：
  - 远端扫描范围
  - `settings` 不扫描 tombstone
  - JSON 校验规则
  - LWW 规则
  - 静默导入行为
  - partial failure 行为
  - 不更新 `lastSyncedAt`
  - 不写远端 `items/` / `tombstones`

### 关键决策
- 本轮没有新增 OneDrive driver，也没有修改 `sync-now.ts`。
- 本轮优先保持现有外部调用点不变，只替换 import 层的底层扫描与读取方式。

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm exec vitest run electron/sync-import.test.ts electron/sync-export.test.ts electron/sync-folder.test.ts electron/sync-target/local-folder-driver.test.ts electron/sync-now.test.ts`：通过

### 当前边界
- 当前 `sync-now.ts` 仍未切到 driver。
- 当前同步行为、文件结构、LWW 规则保持不变。
- 当前仍未开始 OneDrive。

## 2026-05-19 Sync Target Driver Step 5

### 本轮目标
- 只迁移 `sync-now.ts`
- 让 `syncNow` 开始采用 `target config -> driver -> 编排` 的心智
- 不改 import / export 规则，不改 UI，不做 OneDrive

### 本轮修改
- 更新：
  - `electron/sync-now.ts`
  - `electron/sync-now.test.ts`
  - `app-structure.md`
- 当前 `syncNow` 已新增：
  - `resolveSyncTargetConfig(syncState)`
  - `createSyncTargetDriver(config)`
- 当前默认行为是：
  - 从本机 sync state 读 `syncTargetPath`
  - 包装为 `{ type: 'localFolder', path }`
  - resolve 为 `LocalFolderDriver`
  - 然后继续走现有 local folder 的 prepare / lock / import / export 编排
- 当前已补 unsupported 分支：
  - 若 target config 不是 `localFolder`
  - 当前返回明确 failed
  - 不会假装支持，也不会直接崩溃

### 关键决策
- 本轮没有改 bridge，也没有要求调用方传 driver。
- 本轮仍保留现有 `prepareSyncTargetDirectory`、`acquireSyncLock`、`releaseSyncLock`、`updateSyncDeviceInfo` 的用法。
- 本轮没有强行让 `syncNow` 直接调用新的 import/export target 函数，而是先把 target config / driver resolve 心智立起来，保证行为不变优先。

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm exec vitest run electron/sync-now.test.ts electron/sync-import.test.ts electron/sync-export.test.ts electron/sync-folder.test.ts electron/sync-target/local-folder-driver.test.ts`：通过

### 当前边界
- 当前仍只支持 `localFolder` target。
- 当前仍未开始 OneDrive OAuth / Graph API。
- 当前 `syncNow` 行为、顺序、判定与 `lastSyncedAt` 规则保持不变。

## 2026-05-19 OneDrive 实现前规格文档

### 本轮目标
- 继续只写文档
- 不开始 OneDrive OAuth、Graph API 或 UI
- 把 OneDrive App Folder 同步目标进一步细化成可执行的工程计划

### 本轮修改
- 新增：
  - `docs/sync-onedrive-implementation-plan.md`
- 文档当前补清了：
  - OneDrive 同步目标的产品边界
  - `SyncTargetConfig` 如何扩展到 `oneDriveAppFolder`
  - 桌面端 OAuth 流程设计
  - App Folder 权限边界
  - token 存储的推荐方案与开发期临时方案
  - OneDrive driver 的能力边界
  - Graph API 的最小 POC 验证步骤
  - 设置页状态机
  - 现有 Sync 1-5 的复用与需要改造的部分
  - 推荐实现顺序

### 关键决策
- 当前不做 `J-Flow` 自有账号系统，但允许后续朝“第三方同步目标授权接入”方向推进。
- 第一目标继续建议只做：
  - `OneDrive`
- 当前不建议同时展开：
  - `Dropbox`
  - `Google Drive`
  - `WebDAV`
- 当前文档明确提出：
  - 若正式开始 OneDrive，需要后续更新 `constraints.md`
  - 但本轮不直接修改 `constraints.md`

### 当前边界
- 当前仍未开始 OneDrive 实现
- 当前仍未开始 Microsoft app 注册
- 当前仍未开始 OneDrive UI 改造

## 2026-05-20 WebDAV POC 02

### 本轮目标
- 扩展 `SyncTargetConfig`，正式加入 `webdav`
- 增加 main/preload/storage bridge 的受控 WebDAV POC 入口
- 用真实 metadata 结构验证坚果云 WebDAV 可承载：
  - `sync-info.json`
  - `devices/<deviceId>.json`
- 成功后保存本机 target config 和凭据
- 失败时不保存凭据，不覆盖旧 target config

### 本轮修改
- 更新：
  - `electron/sync-target/types.ts`
  - `electron/sqlite.ts`
  - `electron/types.ts`
  - `src/types/models.ts`
  - `electron/main.ts`
  - `electron/preload.cts`
  - `src/vite-env.d.ts`
  - `src/db/storage.ts`
  - `src/db/storage.desktop.test.ts`
  - `electron/sqlite.test.ts`
  - `electron/sync-now.test.ts`
  - `electron/webdav/poc.ts`
  - `electron/webdav/client.test.ts`
- 新增：
  - `electron/webdav/service.ts`
  - `electron/webdav/service.test.ts`

### 关键决策
- `webdav target config` 当前保存在本机 `SQLite sync_meta.syncTargetConfig`
- 当前仍保留旧的 `syncTargetPath`，不影响现有 `localFolder` 主链
- 应用密码只在测试连接成功后才保存
- 应用密码仍使用：
  - `Electron safeStorage + 本机隔离文件`
- 当前 bridge 命名放在 `repository.sync` 下，但明确只用于 POC：
  - `testWebdavTarget(config, password)`
  - `clearWebdavTarget()`

### 当前能力
- 当前 WebDAV POC 02 已支持：
  - 连接坚果云参数测试
  - `ensureDir(rootPath)`
  - 生成 / 复用 `sync-info.json`
  - 写入 `devices/<deviceId>.json`
  - 列出根目录
  - 成功后保存本机 target config 与凭据
  - 清除 target 时同步删除对应凭据
- 当前返回结构化结果：
  - 不包含 password

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm exec vitest run electron/webdav/credentials.test.ts electron/webdav/client.test.ts electron/webdav/service.test.ts electron/sqlite.test.ts electron/sync-folder.test.ts electron/sync-export.test.ts electron/sync-import.test.ts electron/sync-now.test.ts electron/sync-target/local-folder-driver.test.ts src/db/storage.desktop.test.ts`：通过

### 当前边界
- 当前仍未接入 `syncNow`
- 当前仍未开始 `items / tombstones`
- 当前仍未开始 `WebDAV SyncTargetDriver` 正式接入
- 当前仍未开始设置页最终 UI
- 当前仍未开始 OneDrive

## 2026-05-20 WebDAV POC 03

### 本轮目标
- 新增正式 `WebDAV SyncTargetDriver`
- 让 `webdav target` 具备与 `LocalFolderDriver` 对齐的 driver 能力
- 仍然不接 `syncNow`
- 仍然不接 `sync-export / sync-import`

### 本轮修改
- 新增：
  - `electron/sync-target/webdav-driver.ts`
  - `electron/sync-target/webdav-driver.test.ts`
- 更新：
  - `electron/sync-target/index.ts`
  - `electron/webdav/service.ts`
  - `electron/webdav/service.test.ts`
  - `app-structure.md`

### 关键决策
- `WebDAV SyncTargetDriver` 当前只做 driver 封装，不接同步主链。
- driver 本身不持久化 password。
- driver 创建时通过：
  - `createWebdavDriverFromStoredCredential(...)`
  从本机 credential store 读取 password，再包装现有 low-level `WebDAV client`。
- `safeWriteJson` 在 WebDAV 上当前定义为：
  - `JSON.stringify(data, null, 2) + '\n'`
  - 再走 `PUT` 覆盖写
- 当前不尝试实现本地 `.tmp -> rename` 等价语义。

### 当前能力
- 当前 `WebDAV SyncTargetDriver` 已支持：
  - `readText`
  - `writeText`
  - `delete`
  - `list`
  - `exists`
  - `ensureDir`
  - `safeWriteJson`
- 当前继续保持：
  - POSIX `logicalPath`
  - 拒绝反斜杠
  - 拒绝绝对路径
  - 拒绝 `../` 路径穿越

### 验证结果
- `corepack pnpm run lint`：通过
- `corepack pnpm run build`：通过
- `corepack pnpm run build:desktop`：通过
- `corepack pnpm exec vitest run electron/webdav/credentials.test.ts electron/webdav/client.test.ts electron/webdav/service.test.ts electron/sync-target/webdav-driver.test.ts electron/sync-target/local-folder-driver.test.ts electron/sync-folder.test.ts electron/sync-export.test.ts electron/sync-import.test.ts electron/sync-now.test.ts src/db/storage.desktop.test.ts electron/sqlite.test.ts`：通过

### 当前边界
- 当前仍未接入 `syncNow`
- 当前仍未改 `sync-export`
- 当前仍未改 `sync-import`
- 当前仍未开始 `items / tombstones`
- 当前仍未开始完整同步
- 当前仍未开始设置页最终 UI

## 2026-05-20 WebDAV 接入 Sync Core 迁移计划

### 本轮目标
- 继续只写文档
- 不改代码
- 把 `WebDAV SyncTargetDriver` 接入 sync core 的最小安全顺序收口成一页短计划

### 本轮修改
- 新增：
  - `docs/sync-webdav-core-integration-plan.md`

### 关键结论
- 建议先抽：
  - 通用 `sync metadata helper`
- 然后先让：
  - `localFolder`
  回归同一套 helper
- 再让：
  - `webdav`
  跑 metadata 级验证
- 再接：
  - import / export target 版
- 最后才让：
  - `syncNow`
  支持 `webdav`

### 当前边界
- 本轮没有改：
  - `sync-folder`
  - `sync-export`
  - `sync-import`
  - `syncNow`
- 本轮没有开始完整 WebDAV 同步闭环
## 2026-05-21 - WebDAV import/export target 验证

### 本轮目标

- 让 `WebDAV SyncTargetDriver` 接入现有 target 版 `sync-export` / `sync-import`
- 单独验证 `items/` 与 `tombstones/` 在 WebDAV target 上的读写能力
- 保持 `LWW`、`partial failure`、`syncedAt`、`lastSyncedAt` 行为不变
- 仍然不接 `syncNow`，不做完整同步闭环

### 已完成

- 在 [electron/sync-export.ts](./electron/sync-export.ts) 中新增并导出 `exportLocalChangesToSyncTarget(...)`
- 在 [electron/sync-import.ts](./electron/sync-import.ts) 中新增并导出 `importRemoteChangesFromSyncTarget(...)`
- 在 [electron/sync-import.ts](./electron/sync-import.ts) 中导出 `scanRemoteRecordsFromTarget(...)`
- 新增 [electron/webdav/import-export-poc.ts](./electron/webdav/import-export-poc.ts)，用于运行 WebDAV target 版导入 / 导出 POC
- 新增 [electron/webdav/import-export-poc.test.ts](./electron/webdav/import-export-poc.test.ts)

### 行为确认

- WebDAV export `upsert` 仍写入 `items/<entityDir>/<id>.json`
- WebDAV export `delete` 仍写入 `tombstones/<entityDir>/<id>.json`
- `upsert` 对应实体不存在时仍返回 `failure`，不会自动转 tombstone
- 单条导出成功后仍逐条写入 `syncedAt`
- `partial failure` 时成功项保留 `syncedAt`，失败项保持 pending
- WebDAV import 仍保持现有 JSON 校验与 `LWW` 规则
- 静默导入仍不会制造新的待同步 `sync_changes`
- 本轮仍不更新 `lastSyncedAt`

### 验证

- `corepack pnpm run lint`
- `corepack pnpm run build`
- `corepack pnpm run build:desktop`
- `corepack pnpm exec vitest run electron/webdav/import-export-poc.test.ts electron/sync-export.test.ts electron/sync-import.test.ts electron/sync-now.test.ts electron/sync-target/webdav-driver.test.ts electron/webdav/metadata-poc.test.ts electron/sync-target/local-folder-driver.test.ts`

### 当前状态

- WebDAV target 已能单独验证 metadata + import/export target 级读写
- 仍未接入 `syncNow`
- 仍未做完整 WebDAV 同步闭环

## 2026-05-21 - 设置页 WebDAV 同步目标 UI 薄接入

### 本轮目标

- 把设置页原来的“同步文件夹”卡片升级为“同步目标”卡片
- 在 UI 上同时支持：
  - 本地文件夹
  - 坚果云 `WebDAV`
- 继续只支持手动同步，不改同步核心

### 已完成

- 在 [src/features/settings/SettingsPanel.tsx](./src/features/settings/SettingsPanel.tsx) 中接入：
  - 同步目标模式切换
  - 本地文件夹配置区
  - 坚果云 `WebDAV` 配置区
  - 统一的最近结果与详情区
- 设置页当前已复用现有 bridge：
  - `repository.sync.getState()`
  - `repository.sync.chooseTargetPath()`
  - `repository.sync.setTargetPath()`
  - `repository.sync.clearTargetPath()`
  - `repository.sync.testTargetPath()`
  - `repository.sync.testWebdavTarget()`
  - `repository.sync.clearWebdavTarget()`
  - `repository.sync.syncNow()`
- 在 [src/styles/globals.css](./src/styles/globals.css) 中补了同步目标卡片的最小样式扩展

### 关键行为

- 当前设置页会根据本机同步状态显示：
  - 未设置同步目标
  - 本地文件夹
  - 坚果云 `WebDAV`
  - 同步中
  - success / partial / failed
- 坚果云 `WebDAV` 目标：
  - 只有测试成功后才保存 config 和 credential
  - password 不回显、不持久化到 renderer 状态之外
- 本地文件夹与 `WebDAV` 目标切换时，当前先在 UI 层清理另一侧旧入口，避免旧 `syncTargetPath` / `syncTargetConfig` 互相干扰

### 验证

- `corepack pnpm run lint`
- `corepack pnpm run build`
- `corepack pnpm run build:desktop`

### 当前边界

- 当前仍只支持手动同步
- 当前仍不做自动同步 / 后台同步
- 当前仍不做 `OneDrive`
- 本轮没有改：
  - `syncNow` 核心流程
  - `WebDAV driver`
  - `LWW`

## 2026-05-22 - 坚果云 WebDAV 根目录存在时的 MKCOL 兼容修复

### 本轮目标

- 修复设置页实测中：
  - `WebDAV 创建目录失败：503 operation=MKCOL logicalPath=. status=503`
- 保持同步核心规则不变
- 只收口 `WebDAV ensureDir(...)` 对坚果云根目录已存在场景的兼容性

### 根因

- 坚果云在根目录已存在时，`PROPFIND` / `MKCOL` 对根目录的响应并不总是稳定
- 当前 `ensureDir('')` 只依赖：
  - `exists(PROPFIND depth=0)`
  - 以及 `MKCOL` 失败后的再次 `exists`
- 当根目录已存在但：
  - `exists('')` 两次都命中瞬时错误
  - 或 `exists('')` 不能稳定确认存在
  时，会误把根目录当成“需要创建”，并进一步触发 `MKCOL` 503

### 已修复

- 在 [electron/webdav/client.ts](./electron/webdav/client.ts) 中增强 `ensureDir(...)`
- 当前会优先把“目录是否已可用”的判定抽成统一 helper：
  - 先尝试 `exists(...)`
  - 对瞬时错误重试一次
  - 对根目录场景，再尝试 `list('')` 作为存在性兜底
- 只要根目录实际上已经可列，就不再继续发 `MKCOL`
- 这样可以兼容坚果云“根目录已存在但返回 503”的情况

### 验证

- `corepack pnpm run lint`
- `corepack pnpm run build:desktop`
- `corepack pnpm exec vitest run electron/webdav/client.test.ts electron/webdav/metadata-poc.test.ts electron/webdav/service.test.ts electron/sync-target/metadata.test.ts electron/sync-now.test.ts`

### 当前建议

- 重新运行：
  - `corepack pnpm run test:webdav:manual`
- 观察是否还会卡在：
  - `prepare-target`
  - `MKCOL logicalPath=. status=503`

## 2026-05-22 - 坚果云已存在子目录的 MKCOL 503 兼容补强

### 本轮目标

- 修复 Electron 设置页实测中：
  - `WebDAV 创建目录失败：503 operation=MKCOL logicalPath=tombstones/activityTypes status=503`
- 保持同步规则不变，只增强 `WebDAV ensureDir(...)` 的存在性判断

### 根因

- 坚果云不只会在根目录已存在时对 `MKCOL` 返回 `503`
- 对某些已存在的子目录（如 `tombstones/activityTypes`），
  - `PROPFIND depth=0` 也可能不稳定
  - 导致当前逻辑误判“目录不存在”
  - 继而继续发 `MKCOL`
- 之前的兼容只覆盖了根目录，没覆盖“通过列父目录证明子目录已存在”的场景

### 已修复

- 在 [electron/webdav/client.ts](./electron/webdav/client.ts) 中增强：
  - `ensureDir(...)`
- 当前目录存在性判断会：
  - 优先 `exists(...)`
  - 对瞬时错误重试一次
  - 对根目录：
    - `list('')` 成功即可视为存在
  - 对子目录：
    - 通过 `list(parent)` 检查该子目录条目是否已存在
- 因此即使：
  - `exists('tombstones/activityTypes')`
  返回不稳定
  只要 `list('tombstones')` 能看到 `activityTypes/`，就不再继续发 `MKCOL`

### 验证

- `corepack pnpm run lint`
- `corepack pnpm run build:desktop`
- `corepack pnpm exec vitest run electron/webdav/client.test.ts electron/webdav/metadata-poc.test.ts electron/webdav/service.test.ts electron/sync-target/metadata.test.ts electron/sync-now.test.ts`

### 当前建议

- 重新在 Electron 设置页手动测试：
  - 坚果云 `WebDAV`
  - `J-Flow-Test`
- 重点确认：
  - 不再出现 `logicalPath=.`
  - 不再出现 `logicalPath=tombstones/activityTypes`
  的 `MKCOL 503`
