# 项目交接摘要

## 最新状态（2026-07-18，V3.2 坚果云 `.tmp` 写入兼容热修完成，优先参考）
- 本轮重新排查 Win A / Win B 可互通，但 Mac C 与 Windows 最新内容无法互通的问题。
- 过程结论：
  - Windows 路径 `C:\Users\萧锦瑟\Nutstore\1\J-Flow` 中的 `\1` 更像坚果云 Windows 客户端本地映射路径，不是必然错误目录。
  - Windows 资源管理器面包屑为 `坚果云 > J-Flow`，根目录冲突文件列表与 Mac 侧 `/Users/yetingzhi/Nutstore Files/J-Flow` 高度一致。
  - 真正异常是 Windows 侧出现 `sync-info.json.<timestamp>-<random>.tmp`，且状态同时显示绿色勾与红叉。
  - Mac 侧没有收到 Windows `59a28fdf-1264-4059-8099-520d850d1934` 设备文件的 2026-07-17 / 2026-07-18 更新，仍停在 2026-07-08。
- 代码层兼容判断：
  - `LocalFolderDriver.safeWriteJson` 此前使用 `.tmp -> rename` 的原子写法。
  - 该写法对普通本地磁盘合理，但在坚果云目录中会被客户端捕捉到中间 `.tmp` 文件，可能留下红叉 / 冲突状态，导致 Windows 本地写入成功但跨平台未落到 Mac。
- 最终人工确认：
  - 用户在 Windows 端创建普通探针文件 `jflow-sync-probe-win.txt` 后，坚果云网页端可见该文件。
  - Mac 本地 `/Users/yetingzhi/Nutstore Files/J-Flow` 搜不到该探针。
  - 最终发现 Mac 自动更新后坚果云客户端被关闭，且没有开机自启。
  - 因此本次“双端完全不同步”的最终根因是 Mac 坚果云客户端未运行，而不是 J-Flow 代码层同步失败。
  - 本轮 `.tmp` 写入修复仍保留，作为第三方云盘目录兼容性改进。
- 已完成代码修复：
  - `electron/sync-target/local-folder-driver.ts`
    - `safeWriteJson` 改为直接写最终 JSON 文件
    - 不再在同步目录内生成 `.tmp` 临时文件
  - `electron/sync-target/local-folder-driver.test.ts`
    - 新增回归测试确保 `safeWriteJson` 不留下 `.tmp`
- 已完成验证：
  - `corepack pnpm exec tsc --noEmit`
  - `corepack pnpm exec tsc -p electron/tsconfig.json --noEmit`
  - `corepack pnpm exec vitest run electron/sync-target/local-folder-driver.test.ts electron/sync-target/metadata.test.ts electron/sync-import.test.ts electron/sync-export.test.ts electron/sync-now.test.ts electron/sqlite.test.ts`
- 已重新打包 macOS：
  - `release/J-Flow-V3.2.dmg`
  - `release/J-Flow-V3.2.dmg.blockmap`
  - DMG SHA256：`b702cbf4e7c1e2522040430d1d095c1894da48853a6fa8109f6e9fb34691d7cc`
  - blockmap SHA256：`2d6d0452b440424ad3bf86e421c5941b391e4ed9a87e0efd839b55be21c17cde`
  - `hdiutil imageinfo`：通过
  - `hdiutil attach`：通过
  - `J-Flow.app` 版本为 `3.2.0`
  - app 内含 `icon.icns / icon.png`
- 已重新生成 Windows 源码交接包：
  - `J-Flow-V3.2-win-handoff-source-20260718.zip`
  - 用于 Windows 端重新打包包含坚果云 `.tmp` 写入兼容热修的安装包
  - 已确认排除 `.git/`、`node_modules/`、`release/`、`dist*/`、`.pnpm-store/`、`.env.local`、`.DS_Store`、`*.tsbuildinfo`、`*.zip`
- 已完成 Windows 真机打包，Mac 工作区已归档：
  - `release/J-Flow-V3.2-win-portable.exe`
  - SHA256：`543469A6285B02C1B1D7980B150F3ED379BAE48EBC31E365848008E3F2FAE3DE`
  - `release/J-Flow-V3.2-win-setup.exe`
  - SHA256：`3FE02510528C184C563DF399461CAE7A0F5FCE38AEB78FAA588B050087452D5E`
  - Windows 侧另有 `win-unpacked/J-Flow.exe` 与 setup blockmap；Mac 工作区当前只归档 portable / setup 两个 exe。
- 后续使用注意：
  - 使用坚果云等第三方云盘目录作为同步文件夹时，需要确认 Mac / Windows 两端云盘客户端正在运行，并开启目标文件夹同步。
  - 若未来再次出现不同步，先用普通 txt 探针验证第三方云盘是否跨端落地，再排查 J-Flow 导入 / 导出。

## 最新状态（2026-07-17，V3.2 同步 updatedAt 相等热修后 macOS 已重打包，优先参考）
- release 更新仍暂缓，等待 Windows 端按热修后源码重新打包。
- 新发现问题：
  - Win A 可同步 Win B 内容
  - Win A 最新内容与 Mac C 最新内容无法互通
- 根因：
  - 同一实体两端业务 `updatedAt` 相等
  - 但 V3/V3.1 migration / repair 后实体内容不同
  - 导入逻辑此前只在 `remote.updatedAt > local.updatedAt` 时应用远端
  - 相等时直接跳过，导致 Mac / Win 对同一实体的不同内容无法互相吸收
- 已完成热修：
  - sync item 新增可选 `syncUpdatedAt`
  - V3.2 repair upsert 使用 repair 排队时间作为同步层时间
  - 不改写业务实体 `updatedAt`
  - delete tombstone 仍保持原删除时间
  - 远端与本地业务 `updatedAt` 相等但内容不同，则应用当前同步文件内容
- 已完成验证：
  - `corepack pnpm exec tsc --noEmit`
  - `corepack pnpm exec tsc -p electron/tsconfig.json --noEmit`
  - `corepack pnpm exec vitest run electron/sync-import.test.ts electron/sync-export.test.ts electron/sqlite.test.ts electron/sync-now.test.ts electron/daily-logbook.test.ts src/features/logbook/logbook-service.test.ts src/db/storage.test.ts electron/selected-date-state.test.ts`
- 已重新打包 macOS：
  - `release/J-Flow-V3.2.dmg`
  - `release/J-Flow-V3.2.dmg.blockmap`
  - DMG SHA256：`e8063e24520a3addb91987dafbd79770b76743c082c62786b9602b90d0f10cab`
  - DMG 已通过 `hdiutil imageinfo` 与挂载校验
  - `J-Flow.app` 版本为 `3.2.0`
  - app 内含 `icon.icns / icon.png`
- 已重新生成 Windows 源码交接包：
  - `J-Flow-V3.2-win-handoff-source-20260717.zip`
  - SHA256：`050318bec614394bbd74c6ad30aa96f8ea023d7a0ad8cf9351a4fe4eebc3e491`
- 重要：
  - 当前 `release/J-Flow-V3.2-win-portable.exe`
  - 当前 `release/J-Flow-V3.2-win-setup.exe`
  仍是热修前 Windows 包，不包含本热修
  - 下一步必须使用新的 Windows 源码交接包重新打包 Windows exe

## 最新状态（2026-07-17，V3.2 Windows 真机打包完成，优先参考）
- Windows 端已完成 V3.2 打包。
- Windows 源码目录：
  - `E:\J-Flow\J-Flow-V3.2-Workspace`
- Windows 产物目录：
  - `E:\J-Flow\J-Flow-V3.2-Workspace\release`
- Mac 工作区已归档到 `release/`：
  - `release/J-Flow-V3.2-win-portable.exe`
  - `release/J-Flow-V3.2-win-setup.exe`
- Mac 本地已核对 SHA256，与 Windows 回传一致：
  - `J-Flow-V3.2-win-portable.exe`
    - `B6D04629275C9B31D98A68767DD46E291A5436AB3D2EB0FA0C770A6E054C4B6A`
  - `J-Flow-V3.2-win-setup.exe`
    - `2DFBBEF8A6516907F0EABAD47A9EDB9A31ECBFC8E13B840744428F8FFB570ABD`
- Windows 侧另有：
  - `win-unpacked\J-Flow.exe`
  - `J-Flow-V3.2-win-setup.exe.blockmap`
- 注意：截至本条记录，Mac 工作区只收到并归档了 portable / setup 两个 exe；未收到 `win-unpacked/` 和 setup blockmap 文件。
- Windows 侧验证：
  - 源码 zip SHA256 已匹配：`050318bec614394bbd74c6ad30aa96f8ea023d7a0ad8cf9351a4fe4eebc3e491`
  - `package.json version = 3.2.0`
  - `build/icon.ico` 已生成
  - `tsc --noEmit`：通过
  - `tsc -p electron/tsconfig.json --noEmit`：通过
  - 第一组 Vitest：`33 passed`
  - 第二组 Vitest：`18 passed`
  - `dir / portable / nsis` 打包均通过
- Windows 构建注意：
  - `pnpm install` 在 Electron postinstall 出现 `ECONNRESET`
  - Windows 侧复用本机缓存的 Electron `41.3.0` Windows x64 runtime 手动补齐
  - 本轮继续使用 `E:\J-Flow\.pnpm-tools` 里的本地 `node / pnpm` shim
  - `sync:icon` 默认覆盖 `build/icon.png` 时遇到权限拒绝，Windows 侧改临时 PNG 输出路径生成 `build/icon.ico`
  - Windows 侧最终 `build/` 只保留 `icon.png` 和 `icon.ico`
  - Windows 侧为 SQLite 测试稳定性做了最小测试兼容修复：新增关闭 cached SQLite 连接的测试 helper，并在清理临时目录前调用，避免 Windows 因 sqlite/wal/shm 句柄未释放报 `EBUSY`
- 非阻塞 warning：
  - Vite chunk size warning
  - electron-builder 提示 `package.json` 缺 `description / author`
  - Vitest 中 Node SQLite experimental warning
  - electron-builder / Node `DEP0190` warning

## 最新状态（2026-07-17，V3.2 macOS DMG 已打包，Windows 源码交接包已生成，优先参考）
- `package.json` 当前版本：
  - `version = 3.2.0`
- 当前 macOS 产物：
  - `release/J-Flow-V3.2.dmg`
  - `release/J-Flow-V3.2.dmg.blockmap`
- macOS DMG SHA256：
  - `e8063e24520a3addb91987dafbd79770b76743c082c62786b9602b90d0f10cab`
- DMG 已完成基础校验：
  - `hdiutil imageinfo`：通过
  - `hdiutil attach`：通过
  - `J-Flow.app` 版本为 `3.2.0`
  - `CFBundleIconFile = icon.icns`
  - app 内含 `Contents/Resources/icon.icns`
  - app 内含 `Contents/Resources/icon.png`
- 已生成 Windows 源码交接包：
  - `J-Flow-V3.2-win-handoff-source-20260717.zip`
- Windows 源码交接包最终 SHA256 以交接时重新计算结果为准。
- Windows 交接包已排除：
  - `.git/`
  - `node_modules/`
  - `release/`
  - `dist/`
  - `dist-desktop/`
  - `dist-electron/`
  - `.pnpm-store/`
  - `.env.local`
  - `.DS_Store`
  - `*.tsbuildinfo`
  - `*.zip`
- Windows 端打包注意：
  - 当前 Mac 工作区 `build/` 只含 `icon.png`
  - Windows 端必须先运行 `corepack pnpm run sync:icon` 生成 `build/icon.ico`
  - 再运行 Windows 打包命令
  - V3.2 预期 Windows 产物名：
    - `release/J-Flow-V3.2-win-portable.exe`
    - `release/J-Flow-V3.2-win-setup.exe`
- 本轮打包非阻塞提示：
  - Vite chunk size warning
  - electron-builder 提示 `package.json` 缺 `description / author`
  - macOS notarization skipped
  - macOS 打包提示 `build/icon.ico` 不存在，但 DMG 内图标资源已确认存在

## 最新状态（2026-07-17，V3.2 同步与分步日志快照修复完成，优先参考）
- 本轮修复目标：
  - V3 后 Mac / Windows 双端同步异常排查与修复
  - V3.1 分步 Todo 日志快照未显示当前步骤的修复
- 修复结论：
  - 同步异常根因不是同步 UI 或同步目标规则改动
  - V3/V3.1 新增的业务字段在 migration 后没有重新进入同步队列
  - Electron 自动补昨日日志仍使用原始 `item.title`，导致分步快照丢失当前步骤
- 已完成代码修复：
  - Electron 自动日志 completed / pending / deleted 快照均使用分步显示标题
  - 分步日志快照保存为 `事项：当前步骤`
  - 新增一次性 V3.2 同步 repair 标记 `v32SyncRepairAppliedAt`
  - repair 会把当前库中的 `taskTemplate / dayPlanItem` 重新加入待同步队列
  - repair 不改写业务实体 `updatedAt`
  - 旧远端分步 item 缺 `plannedSteps` 时，从 `nextStep` 归一化恢复
  - SQLite 写入层统一保持 `nextStep = plannedSteps[0] ?? ''`
- 已更新文档：
  - `product-rules.md`
  - `data-model.md`
  - `task-list.md`
  - `dev-log.md`
  - `handoff.md`
- 已完成验证：
  - `corepack pnpm exec tsc --noEmit`
  - `corepack pnpm exec tsc -p electron/tsconfig.json --noEmit`
  - `corepack pnpm exec vitest run electron/sqlite.test.ts electron/sync-import.test.ts electron/daily-logbook.test.ts src/features/logbook/logbook-service.test.ts src/db/storage.test.ts`
  - `corepack pnpm exec vitest run electron/sync-export.test.ts electron/sync-now.test.ts electron/selected-date-state.test.ts`
- 待人工验证：
  - 真实 Mac / Windows 双端使用同一个同步文件夹
  - 双端升级到 V3.2 后分别执行“立即同步”
  - 确认重复事项夜晚归属、分步后续步骤队列、普通新增 / 删除仍能正常交换
  - 确认自动日志中的分步已完成 / 未完成 / 删除快照显示 `事项：当前步骤`

## 最新状态（2026-07-08，V3.1 Windows 真机打包完成，优先参考）
- 用户已在 Windows 真机完成 V3.1 打包。
- Windows 源码目录：
  - `E:\J-Flow\J-Flow-V3.1-Workspace\J-Flow`
- Windows 产物目录：
  - `E:\J-Flow\J-Flow-V3.1-Workspace\J-Flow\release`
- Mac 工作区当前可见最终产物：
  - `release/J-Flow-V3.1-win-portable.exe`
  - `release/J-Flow-V3.1-win-setup.exe`
- Mac 本地已核对 SHA256，与 Windows 交接说明一致：
  - `J-Flow-V3.1-win-portable.exe`
    - `EC2DF7FCDB6AA874840BFE9A232B2CC7458136A3DB185B3DEA0732E50E4F2E03`
  - `J-Flow-V3.1-win-setup.exe`
    - `B0C068D777EA842FD6B7F27621FEC8BC44D1DAF20565728481BD011BCD2ED57E`
- Windows 侧另有：
  - `win-unpacked\J-Flow.exe`
  - `J-Flow-V3.1-win-setup.exe.blockmap`
- 本地 Windows 源码移交压缩包已按用户要求删除：
  - `J-Flow-V3.1-win-handoff-source-20260708.zip`
- Windows 构建结果：
  - `sync:icon`：通过
  - renderer build：通过
  - Electron TS build：通过
  - `package:win:dir`：通过
  - `package:win:portable`：通过
  - `package:win:nsis`：通过
- Windows 构建注意事项：
  - Windows 机器 PATH 里的 `node` 会被 WindowsApps 权限挡住。
  - Windows 侧使用 Codex runtime Node，并复制到：
    - `E:\J-Flow\.pnpm-tools\node.exe`
  - Windows 侧下载 pnpm `10.33.0` 到：
    - `E:\J-Flow\.pnpm-tools\package\bin\pnpm.cjs`
  - Windows 侧创建：
    - `E:\J-Flow\.pnpm-tools\pnpm.cmd`
    供 electron-builder 子进程识别 `pnpm`。
  - `pnpm install` 曾卡在 Electron postinstall 下载。
  - Windows 侧已手动从镜像下载并补齐 Electron `41.3.0` Windows x64 runtime，并恢复 `node_modules/electron` 的 npm 包壳。
  - 后续若重新安装依赖，最好确保 Windows PATH 先指向可用 Node，或复用 `.pnpm-tools` 方案。
- 非阻塞提示：
  - Vite chunk size warning
  - electron-builder 提示 `package.json` 缺 `description / author`

## 最新状态（2026-07-08，V3.1 Windows 源码交接包已生成，优先参考）
- 已生成 Windows 源码交接包：
  - `J-Flow-V3.1-win-handoff-source-20260708.zip`
- 该压缩包已在 Windows 打包完成后按用户要求删除。
- 交接包大小约 `3.0M`。
- 交接包包含当前 V3.1 源码、文档、脚本与 `build/icon.png`。
- 交接包已确认排除：
  - `.git/`
  - `node_modules/`
  - `release/`
  - `dist/`
  - `dist-desktop/`
  - `dist-electron/`
  - `.pnpm-store/`
  - `.env.local`
  - `.DS_Store`
  - `*.tsbuildinfo`
  - `*.zip`
- Windows 侧仍需在真机运行：
```bash
corepack pnpm install
corepack pnpm run sync:icon
corepack pnpm run build:desktop
corepack pnpm run package:win:dir
corepack pnpm run package:win:portable
corepack pnpm run package:win:nsis
```
- Windows 侧预期产物名：
  - `release/J-Flow-V3.1-win-portable.exe`
  - `release/J-Flow-V3.1-win-setup.exe`
- 注意：
  - macOS 本轮已生成并校验 `release/J-Flow-V3.1.dmg`
  - Windows 包尚未在本机生成或真机验证
  - Windows 真机打包前应先运行 `corepack pnpm run sync:icon`，生成 `build/icon.ico`

## 最新状态（2026-07-08，V3.1 macOS DMG 已打包并校验，优先参考）
- V3.1 macOS DMG 已生成：
  - `release/J-Flow-V3.1.dmg`
  - `release/J-Flow-V3.1.dmg.blockmap`
- `package.json` 已更新：
  - `version = 3.1.0`
  - macOS DMG artifact：`J-Flow-V3.1.dmg`
  - Windows setup artifact：`J-Flow-V3.1-win-setup.exe`
  - Windows portable artifact：`J-Flow-V3.1-win-portable.exe`
- README 已更新：
  - V3.1 从“计划”改为“已完成”
  - 当前桌面产物改为 V3.1 命名
  - 平台状态与 Releases 建议改为 V3.1 口径
- 本轮测试：
  - `corepack pnpm exec tsc --noEmit`：通过
  - `corepack pnpm exec tsc -p electron/tsconfig.json --noEmit`：通过
  - `corepack pnpm exec vitest run src/db/storage.test.ts electron/sqlite.test.ts electron/selected-date-state.test.ts`：通过，`23` 项
  - `corepack pnpm run package:mac`：通过
- 分步回归覆盖：
  - SQLite plannedSteps 往返
  - DayPlanItem plannedSteps 更新
  - 旧 `nextStep` 兼容迁移为 `plannedSteps`
  - selected-date 生成路径的既有回归
- DMG 校验：
  - `hdiutil attach` 成功，CRC 校验通过
  - `CFBundleDisplayName = J-Flow`
  - `CFBundleExecutable = J-Flow`
  - `CFBundleIconFile = icon.icns`
  - `CFBundleIdentifier = com.jflow.desktop`
  - `CFBundleShortVersionString = 3.1.0`
  - `CFBundleVersion = 3.1.0`
  - 包内包含 `app.asar`、`icon.icns`、`icon.png`
  - `release/latest-mac.yml` 指向 `J-Flow-V3.1.dmg`
- 打包注意：
  - `package:mac` 仍提示 `build/icon.ico` 不存在；这是 Windows extraResources 提示，不阻断 macOS DMG。
  - `build:desktop` 仍有既有 Vite 大 chunk warning，不阻断。
  - V3.1 Windows 包尚未在本轮打包，需后续 Windows 真机完成。

## 最新状态（2026-07-08，V3.1 教学态 bugfix，优先参考）
- 本轮修复两个教学态问题：
  - Guide 第 3 步进入 “Todo：普通/拔草条目” 时，新增 Todo 表单偶发没有出现在 Todo 页面。
  - 教学态中演示用的 `读《夜航西飞》` 可能被写入真实 Todo 数据。
- 后续复测发现 Guide 第 3 步仍不显示表单：
  - 经查不是表单开在别处，而是 demo 选中日期写死为 `2026-07-05`
  - 该日期在 2026-07-02 开发时是未来日期，但到 2026-07-08 已变成历史日期
  - Todo 真实业务规则会禁止历史日期新增，因此表单渲染条件被挡住
- 本轮已改为：
  - 教学选中日期动态取“打开教学时的本地今天 + 3 天”
  - 教学 demo 数据中的 Todo、重复实例、日志、分次记录同步使用该动态日期
  - 保留真实使用中历史日期不能新增 Todo 的规则，不做教学态历史日期豁免
- 根因与处理：
  - 教学数据隔离此前主要依赖 URL `?tutorial=1` 判断，真实 UI / 路由 / 表单事件交接时不够稳。
  - 现在 renderer 增加 `window.__JFLOW_TUTORIAL_MODE__` 会话标记。
  - 存储层同时识别会话标记与 URL 参数，教学态继续走内存 demo 数据，不走 SQLite / IndexedDB 持久化。
  - 教学结束 / 跳过时会先关闭 Todo / 种草新增表单，再退出教学态，避免演示表单残留后写入真实数据。
  - Todo 新增表单的“点外部自动保存”在教学态下禁用。
  - Guide 步骤的 `beforeShow` 事件增加多次补发，降低页面切换或组件挂载时错过事件的概率。
- 已验证：
  - `corepack pnpm exec tsc --noEmit`：通过
  - `corepack pnpm exec tsc -p electron/tsconfig.json --noEmit`：通过
  - `corepack pnpm run lint`：通过
  - `corepack pnpm run build:desktop`：通过
  - `build:desktop` 仍只有既有 Vite 大 chunk warning，不阻断。
- 仍建议人工复测：
  - 从设置页进入“使用教学”
  - 切到 Guide 第 3 步，确认页面日期为本地今天 + 3 天，Todo 新增表单稳定出现
  - 在教学态里操作 / 跳过后，确认真实 Todo 不出现新的 `读《夜航西飞》`

## 最新状态（2026-07-08，Windows 交接暂停与多步骤分步需求评估，优先参考）
- 用户已要求暂停 Windows 打包与交接。
- 原已生成的 `J-Flow-V3-win-handoff-source-20260707.zip` 已删除。
- 用户确认：该需求计为 `V3.1 分步优化`。
- 暂停原因：
  - 打包前需要继续增强 `分步 Todo`
  - 新需求是支持一次安排多个后续步骤，而不只是单个 `下一步`
  - 文档与真实 UI 教学也需要同步更新
- 当前评估结论：
  - 现有实现采用 `currentStep: string` + `nextStep: string`
  - 只能表达“当前步骤 + 一个下一步”
  - 若要支持多个预排步骤，应将后续步骤建模为有序队列，而不是继续叠加多个 `nextStepN` 字段
  - 建议新增兼容字段，例如 `plannedSteps: string[]`
  - 旧 `nextStep` 可迁移为 `plannedSteps[0]`，并在兼容期保留读取 / 导入兜底
- 文档已更新 V3.1 规划：
  - `product-rules.md`
  - `data-model.md`
  - `manual-test-checklist.md`
  - `README.md`
  - `task-list.md`
  - `dev-log.md`
  - `handoff.md`
- V3.1 计划 schema：
  - JSON app data schema：`14`
  - SQLite schema：`8`
- V3.1 数据模型与 migration 已完成：
  - `TaskTemplate.plannedSteps: string[]`
  - `DayPlanItem.plannedSteps: string[]`
  - JSON app data schema 已升到 `14`
  - SQLite schema 已升到 `8`
  - SQLite 新增 `task_templates.planned_steps_json`
  - SQLite 新增 `day_plan_items.planned_steps_json`
  - 旧库 migration 会从 `next_step` 回填 `planned_steps_json`
  - 旧 JSON / IndexedDB 数据若只有 `nextStep`，读取时补为单元素 `plannedSteps`
  - 新数据仍同步维护 `nextStep = plannedSteps[0] ?? ''` 作为兼容字段
- 已验证：
  - `corepack pnpm exec tsc --noEmit`：通过
  - `corepack pnpm exec tsc -p electron/tsconfig.json --noEmit`：通过
  - `corepack pnpm exec vitest run src/db/storage.test.ts electron/sqlite.test.ts electron/selected-date-state.test.ts`：通过，`23` 项
- 教学 demo 与 Guide 代码已更新：
  - Guide “分步和分次”说明改为队列式分步
  - 教学 demo 中 `读《夜航西飞》` 当前步骤为 `第一章`
  - 教学 demo 中后续步骤为 `第二章 / 第三章 / 第四章`
  - demo 数据中的模板与 Todo 均已补齐 `plannedSteps`
- V3.1 Todo 表单与完成逻辑已完成：
  - 分步表单后续步骤支持多行输入
  - 第一行右侧 `+` 可继续添加后续步骤
  - 新增行右侧可删除该行
  - 保存时过滤空白后续步骤并写入 `plannedSteps`
  - 普通 Todo、重复 Todo、从种草加入 Todo、编辑 Todo 均支持 `plannedSteps`
  - 完成分步 Todo 时按队列弹出：
    - `plannedSteps[0]` 成为新 Todo 的 `currentStep`
    - 剩余步骤成为新 Todo 的 `plannedSteps`
    - 新 Todo 不继承上一条 DDL
  - 旧 `nextStep` 数据仍兼容为单后续步骤
- 当前补充验证：
  - `corepack pnpm run lint`：通过
  - `corepack pnpm run build:desktop`：通过
  - `build:desktop` 仍有既有 Vite 大 chunk warning，不阻断
  - 教学 demo / Guide 更新后：
    - `corepack pnpm exec tsc --noEmit`：通过
    - `corepack pnpm exec tsc -p electron/tsconfig.json --noEmit`：通过
    - `corepack pnpm run build:desktop`：通过
- Windows 交接包需要在多步骤分步完成、验证、文档更新后重新生成。

## 最新状态（2026-07-07，V3 release 清理与 Windows 交接准备，历史记录）
- 本轮已清理本地 `release/` 历史产物。
- 当前 `release/` 仅保留：
  - `release/J-Flow-V3.dmg`
  - `release/J-Flow-V3.dmg.blockmap`
- 已删除的本地旧产物包括：
  - V1.4 / V2.1 / V2.2 / V2.3.1 / V2.3.2 / V2.4 的历史 DMG、EXE、blockmap
  - 旧 `release/mac-arm64/`
  - 旧 builder 临时配置文件
- 当前 `release/` 约 `115M`。
- Windows 交接重点：
  - 曾生成源码交接包：`J-Flow-V3-win-handoff-source-20260707.zip`
  - 该包已于 2026-07-08 按用户要求删除，待多步骤分步完成后重做
  - `package.json` 版本为 `3.0.0`
  - Windows 预期产物名：
    - `J-Flow-V3-win-portable.exe`
    - `J-Flow-V3-win-setup.exe`
  - Windows 真机必须先生成 `build/icon.ico`
  - 生成方式为运行 `corepack pnpm run sync:icon`
  - Windows 下该命令会调用 `scripts/generate-icon-win.ps1`
  - `scripts/fix-win-exe-icon.mjs` 会在 `afterPack` 阶段用 `rcedit.exe` 写入 exe 图标，缺少 `build/icon.ico` 时会报错中止
- 建议 Windows 侧命令：
```bash
corepack pnpm install
corepack pnpm run sync:icon
corepack pnpm run build:desktop
corepack pnpm run package:win:dir
corepack pnpm run package:win:portable
corepack pnpm run package:win:nsis
```
- 交接包不应包含：
  - `node_modules/`
  - `.git/`
  - `release/`
  - `dist/`
  - `dist-desktop/`
  - `dist-electron/`
  - 本地 `.env.local`
  - 本机 `.DS_Store`
- Windows 侧完成打包后应回传：
  - `release/J-Flow-V3-win-portable.exe`
  - `release/J-Flow-V3-win-setup.exe`
  - 如存在 setup blockmap，也回传并记录校验信息
- V3 Windows 包尚未在本轮验证，仍需 Windows 真机打包和启动测试。

## 最新状态（2026-07-07，V3 版本口径校正与打包准备，优先参考）
- 用户确认：原先称为 `V2.4` 的大更新应作为 `V3` 发布。
- V3 范围包含：
  - 原 V2.4 A：备注替代准备 + 夜间新增 Todo 默认归属晚上
  - 原 V2.4 B：拔草删除语义重构
  - 原 V2.4 C：分步 Todo
  - 原 V2.4 D：初始化页与真实 UI 使用教学
  - 2026-07-07 重复 Todo 日夜归属 bug 修复
- 本轮已更新：
  - `README.md`
  - `package.json`
  - `dev-log.md`
  - `handoff.md`
- 打包命名已更新：
  - macOS：`J-Flow-V3.dmg`
  - Windows setup：`J-Flow-V3-win-setup.exe`
  - Windows portable：`J-Flow-V3-win-portable.exe`
- V3 macOS 产物已生成：
  - `release/J-Flow-V3.dmg`
  - `release/J-Flow-V3.dmg.blockmap`
- 已挂载最终 DMG 校验：
  - `CFBundleDisplayName = J-Flow`
  - `CFBundleExecutable = J-Flow`
  - `CFBundleIconFile = icon.icns`
  - `CFBundleIdentifier = com.jflow.desktop`
  - `CFBundleShortVersionString = 3.0.0`
  - `CFBundleVersion = 3.0.0`
  - 包内包含 `app.asar`、`icon.icns`、`icon.png`
- 注意：
  - V3 Windows 包尚未在本轮打包验证
  - 本轮 `corepack pnpm run package:mac` 已正常通过，未复现之前的 pnpm 依赖收集 `ERR_SQLITE_ERROR`
  - 打包时仍提示 `build/icon.ico` 不存在；该资源只影响 Windows extraResources，本轮 macOS DMG 不受影响

## 最新状态（2026-07-07，V3 重复 Todo 日夜归属修复，优先参考）
- 本轮修复“每日重复的必要事项无法稳定放在晚上”的问题。
- 排查结论：
  - 现行规则已取消场景 tag 与白天 / 晚上的语义映射
  - 代码仍残留重复 Todo 的 tag 名称推断日夜逻辑
  - 根因是 `TaskTemplate` 没有保存 `timeBlock / timeBlockSource`
- 本轮已实现：
  - `TaskTemplate` 新增 `timeBlock`
  - `TaskTemplate` 新增 `timeBlockSource`
  - JSON app data schema version：`13`
  - SQLite schema version：`7`
  - SQLite `task_templates` 新增：
    - `time_block`
    - `time_block_source`
  - 旧 SQLite migration 优先从已有重复 occurrence 的最近 `DayPlanItem.timeBlock` 回填模板
  - 无法回填时默认 `day / default_day`
  - Web / renderer 重复生成路径直接继承模板日夜
  - Electron 后台日切重复生成路径直接继承模板日夜
  - Todo 表单创建 / 编辑重复 Todo 时写入模板日夜
  - 不再根据日夜选择自动写入“白天 / 晚上”场景 tag
  - 不再根据 `工作日晚上`、`晚上`、`白天` 等 tag 中文名推断日夜
- 本轮涉及文件：
  - `src/types/models.ts`
  - `electron/types.ts`
  - `src/db/schema.ts`
  - `src/db/storage.ts`
  - `electron/sqlite.ts`
  - `src/features/recurrence/auto-generated.ts`
  - `electron/selected-date-state.ts`
  - `src/features/todo/TodoModePanel.tsx`
  - `electron/selected-date-state.test.ts`
  - `product-rules.md`
  - `data-model.md`
  - `manual-test-checklist.md`
  - `task-list.md`
  - `dev-log.md`
  - `handoff.md`
- 当前验证：
  - `corepack pnpm exec tsc --noEmit`：通过
  - `corepack pnpm exec tsc -p electron/tsconfig.json --noEmit`：通过
  - `corepack pnpm exec vitest run src/db/storage.test.ts electron/sqlite.test.ts electron/selected-date-state.test.ts`：通过，`22` 项
- 后续注意：
  - `mapped_day / mapped_night` 仍作为旧数据兼容值保留
  - 目前未启动 Electron 人工验证，建议正式使用前检查一个每日重复必要晚上 Todo 的次日生成

## 最新状态（2026-07-02，V2.4 DMG 图标修复，优先参考）
- 新打包的 `release/J-Flow-V2.4.dmg` 曾出现没有 J-Flow 图标的问题。
- 排查结论：
  - 先前 DMG 是从未组装完成的裸 `Electron.app` 生成的。
  - 该 app bundle 的 `Info.plist` 仍为 Electron 默认元信息，并指向 `electron.icns`。
  - 包内缺少完整 J-Flow app resources，因此不是正确的 V2.4 试用包。
- 本轮已修复：
  - 重新在临时目录组装 `J-Flow.app`
  - 写入 `dist-electron`、`dist-desktop`、`package.json`
  - 补入运行时依赖 `fast-xml-parser` 及其依赖
  - 写入 `icon.icns` 与 `icon.png`
  - 将 app bundle 元信息改为 `J-Flow / com.jflow.desktop / 2.4.0`
  - 重新生成 `release/J-Flow-V2.4.dmg`
- 当前验证：
  - `electron-builder --mac dmg --prepackaged /private/tmp/jflow_v24_icon_fix_20260702/J-Flow.app -c.dmg.artifactName=J-Flow-V2.4.dmg`：通过
  - `release/J-Flow-V2.4.dmg`：生成成功，大小约 `111M`
  - 已挂载最终 DMG 校验：
    - `CFBundleDisplayName = J-Flow`
    - `CFBundleExecutable = J-Flow`
    - `CFBundleIconFile = icon.icns`
    - `CFBundleIdentifier = com.jflow.desktop`
    - `CFBundleShortVersionString = 2.4.0`
    - 包内 `icon.icns` 为有效 macOS icon
    - 包内包含 `dist-electron`、`dist-desktop`、`node_modules`
- 后续注意：
  - 完整 `electron-builder --mac dmg` 路径目前仍会在 pnpm 依赖收集阶段触发 `ERR_SQLITE_ERROR`
  - 本轮为保证 V2.4 包可用，采用手工组装 `J-Flow.app` 后 `--prepackaged` 打包
  - 后续应单独修复 electron-builder 与 pnpm 依赖收集兼容问题，避免手工组装成为常规流程

## 最新状态（2026-07-02，V2.4 确认完成但未经实际使用测试，优先参考）
- V2.4 已确认完成：
  - A：备注替代准备 + 夜间新增 Todo 默认归属晚上
  - B：拔草删除语义重构
  - C：分步 Todo
  - D：初始化页与真实 UI 使用教学
- 当前状态说明：
  - 已完成代码实现、文档更新与基础自动化验证
  - 已完成浏览器 / 构建层面的烟测
  - 尚未经过持续真实使用测试
  - 后续正式使用中仍需重点观察数据迁移、日常新增 / 编辑 / 删除、教学流程与同步设置在真实数据下的表现
- 本轮已实现：
  - 备注替代准备
  - 夜间新增 Todo 默认归属晚上，含起止小时配置
  - 拔草删除语义重构
  - 分步 Todo
- D：初始化页与功能教学已按“真实 J-Flow UI + 独立 demo 数据源”重做。
- 本轮进一步优化 D 的教学呈现：
  - 设置页原“重置应用”卡片改为 `初始化与使用教学`
  - GUIDE 卡片说明文案为：`重置应用后会清空当前本地应用数据，并回到第一次打开应用的初始化流程；也可以在此重看使用教学。`
  - GUIDE 卡片按钮为同级的 `重置应用` 与 `使用教学`
  - GUIDE 区域不再使用内层说明卡片，说明文案下方直接显示按钮
  - 教学栏改为真实 UI 之外的底部独立 rail
  - Electron 桌面端进入教学态时，会通过受控 bridge 尽量将窗口高度调整到当前屏幕可用最大高度
  - 教学态底部 rail 与真实 UI 工作区之间的空白已收紧
  - 跳过 / 完成教学后会恢复真实今天并触发真实数据重新加载
  - 高亮框内亮度提高，框外区域压暗
  - Guide 1 高亮侧栏 `THIS DAY` 与日历整体区域
  - Guide 2 保持在首页，展开下方真实 `种草` 输入区，并高亮完整种草卡片
  - Guide 3 使用拔草模式并勾选分次，同时展示备注输入区
  - 原 Guide 8 完成区导览已删除，后续同步与更多页面说明顺延
  - 当前最后一步显示种草清单页面，同时高亮侧栏下方 `种草清单 / 日志 / 设置` 导航区
- 已更新：
  - `product-rules.md`
  - `data-model.md`
  - `task-list.md`
  - `manual-test-checklist.md`
  - `dev-log.md`
  - `handoff.md`
- V2.4 A/B/C 代码实现涉及：
  - `src/types/models.ts`
  - `electron/types.ts`
  - `src/db/schema.ts`
  - `src/db/storage.ts`
  - `electron/sqlite.ts`
  - `electron/selected-date-state.ts`
  - `src/mocks/app-data.ts`
  - `electron/test-fixtures.ts`
  - `src/features/settings/SettingsPanel.tsx`
  - `src/features/todo/TodoModePanel.tsx`
  - `src/features/todo/todo-view-model.ts`
  - `src/components/ui/Icons.tsx`
  - `src/styles/globals.css`
  - `src/db/storage.test.ts`
  - `src/features/logbook/logbook-service.ts`
  - `src/features/recurrence/auto-generated.ts`
  - `src/features/decision/recommendation.ts`
  - `electron/sqlite.test.ts`
- V2.4 D 代码实现涉及：
  - `src/features/tutorial/TutorialOverlay.tsx`
  - `src/features/tutorial/tutorial-demo-data.ts`
  - `src/db/storage.ts`
  - `src/app/router.tsx`
  - `src/app/shell/AppShell.tsx`
  - `src/pages/logbook/LogbookPage.tsx`
  - `src/pages/setup/SetupPage.tsx`
  - `src/pages/grass-list/GrassListPage.tsx`
  - `src/features/settings/SettingsPanel.tsx`
  - `src/features/todo/TodoModePanel.tsx`
  - `src/styles/globals.css`
  - `electron/main.ts`
  - `electron/preload.cts`
  - `src/vite-env.d.ts`
- 数据模型变化：
  - `AppSettings` 新增：
    - `defaultNightTodoByTimeEnabled`
    - `defaultNightTodoStartHour`
    - `defaultNightTodoEndHour`
  - JSON app data schema version：`12`
  - SQLite schema version：`6`
  - `TaskTemplate` 新增：
    - `isStepped`
    - `currentStep`
    - `nextStep`
  - `DayPlanItem` 新增：
    - `isStepped`
    - `currentStep`
    - `nextStep`
    - `stepRootItemId`
    - `previousStepItemId`
- 兼容策略：
  - 旧 SQLite settings 表启动时补齐夜间默认列
  - 旧 SQLite task_templates / day_plan_items 表启动时补齐分步列
  - 旧 JSON 备份导入时补齐夜间默认字段
  - 旧 JSON 备份导入时补齐分步默认字段
  - 旧 `preparationNotes` 继续展示为 `备注：...`
  - `requiresPreparation` 作为兼容派生布尔保留
  - 若导入数据同时标记分次与分步，则按分步优先并关闭分次
- 当前行为：
  - Todo 表单不再显示 `准备` 开关
  - Todo 表单显示常驻单行 `备注` 输入
  - 备注输入位于 Todo 内容输入框下方、`必要 / 分次` 控件上方
  - 备注可空，不阻止提交
  - 有备注时保存到当前 Todo
  - 设置页新增“新增 Todo 默认时段”
  - 默认关闭，默认小时为 `17-23`
  - 开启后新增表单按当前本地小时默认白天 / 晚上
  - 编辑已有 Todo 不受该默认设置影响
  - 删除拔草 Todo 不再自动恢复种草
  - 未完成拔草 Todo 右侧显示“回到种草清单”返回箭头
  - 点击返回箭头时无二次确认、无额外成功反馈，并恢复对应种草模板
  - 彻底删除拔草 Todo 需要二次确认，确认后永久删除当前 Todo
  - 编辑按钮已移动到 Todo 标题后方，右侧操作区保留来源动作、完成勾选和删除
  - Todo 表单新增 `分步`
  - `分步` 与 `分次` 互斥
  - 开启分步后显示 `当前` 与 `下一步` 输入
  - 分步 Todo 显示为 `事项内容：当前步骤`
  - 完成分步 Todo 时，若 `下一步` 非空，自动创建新的 pending Todo
  - 自动创建的下一步不继承 DDL，也不继承必要状态
  - 取消完成当前步骤时，不自动删除已经生成的下一步
- V2.4D 最新确认规则：
  - 初始化页需承担首次开局配置与核心功能教学
  - `/setup` 继续服务首次初始化
  - 功能教学应为真实 UI 教学态，不能再做脱离 J-Flow 真实界面的独立演示舞台
  - 真实 UI 教学态使用独立 demo 数据，不展示或操作用户当前真实数据
  - demo 数据不得写入 SQLite / IndexedDB
  - demo 数据不得进入 JSON 导出 / 导入 / 自动备份 / 同步协议
  - 教学栏位于底部独立 rail，真实 UI 内容区为底部 rail 让位
  - Electron 桌面端进入教学态时，窗口高度尽量调整到当前屏幕可用最大高度
  - 当前介绍区域显示高亮框
  - 高亮框内亮度应高于周围，框外区域压暗
  - 教学栏不应遮挡被介绍的关键 UI
  - 使用 `?tutorial=1` 启动教学演示模式
  - 设置页提供 `初始化与使用教学` 卡片
  - `使用教学` 不清空当前本地数据
  - `使用教学` 不重置 Todo、种草、日志、设置、同步目标或自动备份信息
  - 第一版不新增持久化字段记录教学完成时间
- V2.4D 当前代码状态：
  - 首次 `/setup` 保存初始化配置后跳转 `/?tutorial=1`
  - 设置页 `使用教学` 跳转 `/?tutorial=1`
  - `?tutorial=1` 时 `storage.ts` 切换到内存 demo AppData
  - 教学态不调用 Desktop SQLite bridge
  - 教学态不读取真实同步目标或备份信息
  - `TutorialOverlay` 只负责底部教学栏、步骤切换和真实 DOM 高亮
  - 教学继续渲染 J-Flow 真实页面、真实组件、真实样式
  - 第 3-7 步会延迟触发真实 Todo 输入面板展开，确保必要 / DDL / 分步 / 分次 / 重复控件可被高亮
  - 教学栏位于底部独立 rail，真实 UI 内容区会让位
  - `TutorialOverlay` 进入教学态时调用 `window.jflowDesktop.expandWindowForTutorial()`
  - Electron main process 通过 `window:expand-for-tutorial` IPC 调整窗口高度，不进入全屏
  - 当前介绍区域显示高亮框
  - 高亮框滚动避让底部教学 rail
  - 教学完成或跳过后回到真实首页，并派发 `jflow:tutorial-exit`
  - AppShell 收到 `jflow:tutorial-exit` 后将 `today / selectedDate` 恢复为真实今天
  - 旧独立 `/tutorial` 页面已撤掉
- V2.4D 目标教学流程：
  - 日期：高亮 `THIS DAY` 与侧栏日历区，说明当前查看日期与今天的不同高亮
  - 首页下方种草入口：不切换到种草清单页，展开真实种草输入区，说明 tag、兴趣程度与批量添加
  - Todo 输入面板：展示 `TODO / 拔草` 切换、拔草条目语境、分次勾选和备注输入区
  - 日夜切换，并介绍设置页可开启夜间新增默认归属晚上
  - 必要按钮 + DDL 区，说明分步事项的 DDL 只属于当前这一步
  - 分步和分次
  - 重复，说明按日历重复与完成后重复的差异
  - 同步功能，说明本地文件夹同步与外部同步目录配合
  - 种草清单、日志和其他设置：显示种草清单页并高亮侧栏下方导航区
- 当前验证：
  - `corepack pnpm exec tsc --noEmit`：通过
  - `corepack pnpm exec vitest run src/db/storage.test.ts electron/sqlite.test.ts`：通过，`19` 项
  - `corepack pnpm exec vitest run src/features/logbook/logbook-service.test.ts`：通过，`3` 项
  - `corepack pnpm run lint`：通过
  - `corepack pnpm run build:desktop`：通过
  - `build:desktop` 仍有 Vite 大 chunk warning，不阻断
  - 浏览器烟测 `http://localhost:4173/J-Flow/?tutorial=1`：通过
    - 9 个步骤均在真实 J-Flow 页面中展示
    - 9 个步骤均找到真实 `data-tutorial-id` 目标并显示高亮
    - 9 个步骤标题与最新确认文案一致
    - 第 3-7 步均能正确展开真实 Todo 输入面板
    - 第 3 步显示拔草模式，且 `分次` 已勾选
    - 第 8 步显示同步功能
    - 第 9 步显示种草清单页面，并高亮侧栏下方 `种草清单 / 日志 / 设置` 导航区
    - 教学栏位于底部独立 rail
    - 真实 UI 工作区在底部 rail 上方独立滚动
    - 9 个步骤高亮框均不与底部 rail 重叠
    - 点击 `跳过` 后 demo 专属条目不再出现在页面文本中
    - 设置页 GUIDE 卡片文案与 `重置应用 / 使用教学` 按钮显示正确
- 下一步：
  - 进入正式自用前，进行一轮真实数据使用测试
  - 重点观察备注、夜间默认、拔草删除 / 返回、分步 Todo、教学模式和同步设置在真实日常数据下的表现

## 最新状态（2026-06-30，V2.4 文档规划完成，历史记录）
- 本轮仅修改文档，尚未改业务代码。
- V2.4 实施顺序已确认：
  - A：备注替代准备 + 夜间新增 Todo 默认归属晚上，含起止小时配置
  - B：拔草删除语义重构
  - C：分步 Todo
- 工作日 Todo 暂缓：
  - 原因是若不能可靠导入或维护节假日 / 调休日历，仅跳过周末意义不足
  - 后续重启前需先定义节假日数据来源、调休工作日处理和用户自定义 / 导入方案
- 已更新：
  - `product-rules.md`
  - `data-model.md`
  - `task-list.md`
  - `manual-test-checklist.md`
  - `dev-log.md`
- 关键规则变化：
  - `准备` 不再作为用户需要勾选的 Todo 属性
  - Todo 内容输入框下方新增常驻单行备注输入
  - 旧 `preparationNotes` 兼容展示为 `备注：...`
  - 设置页将新增“夜间新增 Todo 默认归属晚上”开关与起止小时
  - 来自种草的一次性 Todo 删除后，不再自动恢复原种草
  - 未完成拔草 Todo 将新增显式“回到种草清单”动作
  - 分步 Todo 与分次 Todo 第一版互斥
  - 分步 Todo 显示为 `事项内容：当前步骤`
  - V2.4 基础分步 Todo 完成后，若下一步非空，自动创建下一步 Todo
  - V3.1 将在此基础上扩展为多个后续步骤队列
  - 分步 Todo 自动创建下一步时不继承 DDL，DDL 只属于当前这一步
  - “回到种草清单”不需要二次确认，也不需要额外成功反馈
  - 彻底删除拔草 Todo 需要二次确认
- 本轮未运行代码测试，因为没有修改源码。

## 最新状态（2026-06-08，V2.3 Release 准备，优先参考）
- README 已从 V2.2 下载口径更新到 V2.3。
- GitHub Release 建议：
  - tag：`v2.3`
  - title：`J-Flow V2.3`
- 最终上传附件：
  - `J-Flow-V2.3.2.dmg`
  - `J-Flow-V2.3.2-win-setup.exe`
  - `J-Flow-V2.3.2-win-portable.exe`
- Release 文案应同时覆盖 V2.3.1 与 V2.3.2。
- README 已注明：
  - Windows 普通用户优先使用 setup
  - portable 首次启动更慢
  - 当前 macOS / Windows 产物均未正式签名

## 最新状态（2026-06-07，V2.3.2 Windows 真机结果已回并，优先参考）
- V2.3.2 的 macOS 与 Windows 产物均已完成。
- Windows 回传未修改业务逻辑或数据模型。
- Windows 打包命令已统一补充：
  - `-c.electronDist=node_modules/electron/dist`
- 当前正式 Windows 产物：
  - `release/J-Flow-V2.3.2-win-portable.exe`
  - `release/J-Flow-V2.3.2-win-setup.exe`
- Mac 侧已复核 SHA-256：
  - portable：`6c9eaafa4e480bece34987b20d6b05f569bc42e586c996642e008a6d458ba7fd`
  - setup：`7c7f845702ccd39ce9bbb26f05dd5be0cdd06af9e3d2559ea24b5b8d4bb37ca8`
- Windows 侧曾生成 setup blockmap，但本次未同步回 Mac：
  - SHA-256：`0738a855ea461667cd8160676c2e05ba983390a4b7ca1d468a17d6f890ea5025`
- Windows 图标静态验证：
  - portable、setup、`win-unpacked/J-Flow.exe` 均为 J-Flow 图标
- Windows 启动耗时：
  - portable 首次启动约 `9.35s`
  - unpacked 启动约 `0.80s`
  - 常驻后再次启动 portable 约 `0.33s` 恢复原实例
- 当前 EXE 均未签名。
- 仍待用户专项实测：
  - 托盘菜单“打开 / 退出”
  - 任务栏取消固定后重新固定
  - Defender / 360 拦截表现
- 临时 Windows 往返 handoff 已完成使命并清理；后续继续以本文件和 `dev-log.md` 为交接依据。

## 最新状态（2026-06-06，V2.3.2：代码实现完成，等待 Electron 人工测试，优先参考）
- 当前已进入：
  - `V2.3.2`
- 已更新：
  - `product-rules.md`
  - `task-list.md`
  - `manual-test-checklist.md`
  - `dev-log.md`
  - `src/components/ui/Icons.tsx`
  - `src/features/todo/TodoModePanel.tsx`
  - `src/features/todo/completed-at-editor.ts`
  - `src/features/todo/completed-at-editor.test.ts`
  - `src/styles/globals.css`
  - `package.json`
  - `pnpm-lock.yaml`
- 当前 `只看必要` 已实现：
  - 按钮位于 `调整顺序` 左侧
  - 支持今天、历史日期与未来日期
  - 同时筛选未完成与已完成必要事项
  - 只改变页面显示，不修改 Todo 数据与日志
  - 开启后文案为 `全部事项`
  - 开启后禁用 `调整顺序`
  - 排序模式中禁用 `只看必要`
- 当前完成时间编辑已实现：
  - 静态展示与编辑统一使用 24 小时制
  - 格式为 `HH:mm`
  - 不再使用会受 macOS / Chromium 本地化影响的 `datetime-local`
  - 当前编辑 UI 为日期输入与受控 `HH:mm` 时间输入
  - 打开编辑时默认聚焦并选中 `HH` 小时位
- 当前拖动排序已实现：
  - 继续复用 `sortOrder / timeBlock / timeBlockSource`
  - 排序模式显示拖动把手
  - 支持跨白天 / 晚上分隔线
  - 支持列表内滚动
  - 支持键盘排序
  - 已完成事项不参与
  - 已移除旧上移 / 下移按钮
- 已新增依赖：
  - `@dnd-kit/core`
  - `@dnd-kit/sortable`
  - `@dnd-kit/utilities`
- 当前验证：
  - `corepack pnpm run lint`：通过
  - 完成时间与日志相关测试共 `6` 项通过
  - `corepack pnpm run build:desktop`：通过
  - Electron 开发版已由用户完成人工测试
  - `corepack pnpm run package:mac`：通过
  - `hdiutil verify release/J-Flow-V2.3.2.dmg`：通过
- 当前正式 macOS 产物：
  - `release/J-Flow-V2.3.2.dmg`
  - `release/J-Flow-V2.3.2.dmg.blockmap`
- DMG SHA-256：
  - `a220b49b098cd21cbe6bbd70492789345506edd65ea127c15221129d47195bb7`
- Windows 移交将同时包含：
  - V2.3.1 全部改动
  - V2.3.2 全部改动
- Windows 移交说明：
  - `windows-handoff-v2.3.2.md`
- Windows 源码移交包：
  - `J-Flow-V2.3.2-win-handoff-source-20260606.zip`
- 该源码包已确认不包含：
  - `.env.local`
  - `node_modules`
  - macOS DMG / release 目录
  - 本地数据库
  - 旧版本移交 ZIP
- Windows 预期产物名已更新为：
  - `J-Flow-V2.3.2-win-portable.exe`
  - `J-Flow-V2.3.2-win-setup.exe`

## 最新状态（2026-05-30，V2.3.1：bug 修复、种草排序、控件压缩与 macOS 打包，优先参考）
- 当前已开始进入：
  - `V2.3.1`
  - 以使用体验优化与小 bug 修复为主
- 当前已修复 macOS 常驻跨天后：
  - 数据已由主进程完成日切顺延
  - 页面仍停在前一天的问题
- 当前 renderer 日期刷新策略为：
  - 每分钟检查一次本地日期
  - window focus 时检查
  - visibilitychange 时检查
  - 若当前选中日期仍是“旧的今天”，自动推进到新的今天
  - 若用户正在查看历史 / 未来日期，不自动跳走
- 当前已修复分次事项完成后回退时：
  - 已有日志快照继续显示为已完成的问题
- 当前回退处理为：
  - 分次完成事项点击取消完成后回到：
    - `pending`
    - `progressPercent = 90`
    - `completedAt = undefined`
  - 若对应日期的日志快照已经生成，则刷新该日期快照
  - 刷新快照时保留原日志备注与原 `generatedAt`
  - 不主动创建尚不存在的日志
- 当前主页左侧 `THIS DAY` 的左右箭头已改为黄色按钮，用于和月历箭头区分。
- 当前种草清单顶部已新增三态排序按钮：
  - 位于 `未完成 xx 条` 右侧
  - 与数量 tag 样式一致但可点击
  - 状态循环为：
    - `更新时间排序`
    - `高兴趣优先`
    - `低兴趣优先`
    - 回到 `更新时间排序`
  - 排序发生在清单 / 场景筛选之后
  - 兴趣相同时回落到更新时间倒序
- 当前必要 / 重复展开区的 stepper/select 控件已按用户指定压缩：
  - 控件内文字字号：`0.8rem`
  - 数字输入宽度：`50px`
  - 单位 select 宽度：`50px`
  - 控件 `min-height`：`28px`
  - 背景：`transparent`
- 当前必要选项下 DDL 日期按钮也已压缩到：
  - `min-height: 28px`
- 当前已记录但尚未实现的待设计方向：
  - 考虑实现进度条 UI 优化和“分步”概念
  - 目前不要把圆点、空白标签、步骤备注之间的关系写死为产品规则
  - 后续需要用户确认规则后再实现
- 当前 macOS 打包名已切到：
  - `J-Flow-V2.3.1.dmg`
- 当前已产出：
  - `release/J-Flow-V2.3.1.dmg`
  - `release/J-Flow-V2.3.1.dmg.blockmap`
- 本轮验证：
  - `corepack pnpm exec vitest run src/features/logbook/logbook-service.test.ts src/features/todo/completed-at-rounding.test.ts`：通过
  - `corepack pnpm run build:desktop`：通过
  - `corepack pnpm run dev:desktop`：已拉起 Electron 开发版，Vite 地址为 `http://localhost:4173/J-Flow/`
  - `corepack pnpm run package:mac`：通过
  - `hdiutil verify release/J-Flow-V2.3.1.dmg`：通过
- 本次 macOS 打包日志仍提示：
  - `build/icon.ico` 不存在
  - 该文件属于 Windows extraResources 口径，对本次 macOS dmg 未形成阻断
- 当前待评估优化结论：
  - 分次进度条：当前为原生 range，未显示实时数值；进度取整和分步备注需要先补产品规则

## 最新状态（2026-05-27，V2.2 Windows 真机打包结果已并回，优先参考）
- 当前 Windows 真机已产出：
  - `release/J-Flow-V2.2-win-portable.exe`
  - `release/J-Flow-V2.2-win-setup.exe`
  - `release/J-Flow-V2.2-win-setup.exe.blockmap`
  - `release/win-unpacked/`
- 当前 Windows 打包脚本已拆分为：
  - `package:win`
    - 默认仍指向 portable
  - `package:win:portable`
  - `package:win:dir`
  - `package:win:nsis`
- 当前已新增 Windows `afterPack` 钩子：
  - `scripts/fix-win-exe-icon.mjs`
- 该钩子会在 Windows `win-unpacked` 生成后，使用本地 `rcedit.exe` 将：
  - `build/icon.ico`
  写入：
  - `win-unpacked/J-Flow.exe`
- 当前对“固定到任务栏后退回 Electron 图标”的判断：
  - 根因不是 `BrowserWindow.icon`
  - 也不是托盘图标
  - 而是 Windows 固定任务栏时更容易抓取实际运行的内层 `J-Flow.exe`
  - 之前内层 exe 仍保留 Electron 默认图标资源
  - 现在打包链路已补修这一层
- 当前对“Windows 打开慢”的判断：
  - 业务代码层面已经后移了启动自动备份
  - 但 Windows `portable` 仍会有：
    - 自解包
    - 落盘
    - Defender / 360 实时扫描
    的明显成本
  - 因此若对普通 Windows 用户分发，后续更推荐：
    - `J-Flow-V2.2-win-setup.exe`
  - `portable` 更适合作为免安装备用包
- 当前仍需继续人工观察：
  - 安装包安装后启动速度
  - 固定任务栏后的图标缓存表现
  - Defender / 360 的拦截情况

## 最新状态（2026-05-26，V2.2 macOS 自测包已产出，优先参考）
- 当前已产出：
  - `release/J-Flow-V2.2.dmg`
  - `release/J-Flow-V2.2.dmg.blockmap`
- 当前 Windows 打包配置也已同步切到：
  - `J-Flow-V2.2-win-portable.exe`
- 当前这一包主要用于：
  - `V2.2` 桌面常驻
  - 日志 / 同步时序修正
  - 启动链路减阻
  的本机实测
- 当前还没有更新：
  - 正式 `README` 版本号口径
  - 对外 Releases 版本说明
  因为这一轮仍处于本地验包阶段

## 最新状态（2026-05-26，V2.2 第四阶段：启动链路减阻与日志时间格式统一，优先参考）
- 当前已完成一轮源码层启动优化：
  - 启动自动备份不再阻塞首窗口显示
- 当前行为调整为：
  - app ready 后先创建主窗口
  - 窗口显示后再异步尝试：
    - `maybeCreateStartupAutoBackup`
- 当前没有改变：
  - 启动自动备份“每天最多一份”的语义
  - 自动备份文件格式
  - 手动备份与同步前备份逻辑
- 当前这轮结论：
  - Windows 打开慢的问题中，源码层最明确的阻塞点已经被后移
  - 但 Windows `portable` 形态的：
    - 自解包
    - 杀软扫描
    仍可能继续贡献明显启动延迟
- 当前日志时间格式已统一为：
  - `HH:mm`
- 当前影响范围：
  - 新生成日志
  - 日志页展示
  - 复制出的 Markdown
  - 旧日志兼容导入后的时间规范化

## 最新状态（2026-05-26，V2.2 第三阶段：后台日切结算器已接入主进程，优先参考）
- 当前已新增：
  - 后台日切结算器
  - `electron/daily-rollover.ts`
- 当前主进程已开始维护：
  - “今天是否已经完成过日切结算”的本地元数据
  - 通过 SQLite `meta.lastDailyRolloverDate` 记录
- 当前后台刷新顺序已调整为：
  - 若已配置同步目标：
    - 优先等待 / 执行一次前台级同步刷新
  - 然后运行后台日切结算器：
    - 补昨天日志
    - 准备今天状态
      - 包括：
        - 今日重复事项生成
        - 今日未完成事项顺延
- 当前后台日切触发点包括：
  - app ready 后的最小自动刷新
  - window focus
  - 手动立即同步完成后
- 当前这样做的意义：
  - 即使用户不打开：
    - Todo 页
    - 日志页
  - 只要桌面应用在常驻并重新回到前台，也会优先把：
    - 昨天日志
    - 今天顺延 / 重复事项
    结算掉
- 当前桌面版进入 Todo / 日志页时仍会继续走：
  - 主进程前台刷新
  - 但如果今天已经完成过后台日切，则不会重复整天结算
- 当前仍成立的边界：
  - 这不是后台定时同步系统
  - 也不是 watcher 驱动同步
  - 当前仍只在：
    - startup
    - focus
    - 手动同步完成后
    这些受控时机进行后台结算

## 最新状态（2026-05-26，V2.2 第一阶段：桌面常驻能力已开放，优先参考）
- 当前已开始进入：
  - `V2.2`
  - 以 bug 修复与同步 / 日志优化为主
- 当前第一阶段已完成：
  - 桌面常驻能力开放
- 当前行为调整为：
  - 关闭主窗口默认不再直接退出应用
  - 应用继续常驻
  - 只有显式退出才真正结束进程
- 当前平台行为：
  - Windows：
    - 已接入托盘入口
    - 可通过托盘重新打开主窗口
    - 可通过托盘显式退出
  - macOS：
    - 关闭窗口后应用继续常驻
    - 通过激活应用重新显示主窗口
- 当前没有新增：
  - “关闭窗口不会退出应用”的提示文案
- 当前边界提醒：
  - 已开放的是：
    - 托盘 / 状态栏常驻
  - 仍未开放的是：
    - 后台定时同步
    - watcher 驱动同步
    - 用户自定义自动同步策略
- 下一步优先：
  - 重排日志生成、同步导入、未完成顺延之间的时序

## 最新状态（2026-05-26，V2.2 第二阶段：前台刷新先同步后补日志，优先参考）
- 当前已新增：
  - 前台刷新入口：
    - `app:prepare-current-day-state`
- 当前桌面版在进入：
  - 今日 Todo 页
  - 日志页
  时，会优先走主进程前台刷新，而不是由页面先直接补日志。
- 当前前台刷新顺序为：
  - 若已配置同步目标：
    - 优先等待 / 执行一次前台同步刷新
  - 然后补前一天日志
  - 最后再回到页面侧继续执行既有的今日顺延 / 重复生成逻辑
- 当前这样做的目的：
  - 避免昨天日志先于远端导入生成
  - 降低跨设备场景下：
    - A 设备白天操作
    - B 设备晚上操作
    - 次日 A 先打开时
    昨日日志缺失 B 端变化的问题
- 当前已进一步收口：
  - 选中日期的重复生成
  - 今日未完成事项顺延
  也优先由主进程准备流程执行，而不是只靠 renderer 自己结算
- 当前桌面版进入 Todo 页时的主流程已调整为：
  - 前台同步刷新
  - 补前一天日志
  - 准备当前选中日期的重复事项
  - 若选中的是今天，再处理今日顺延
  - renderer 主要负责读取和展示结果
- 当前仍然成立的重要事实：
  - `logbookEntries` 不属于同步协议
  - 日志仍然是每台设备本地生成、本地保存
  - 但现在生成时机会优先放到：
    - 导入远端之后
    - 顺延之前
- 当前 renderer 侧仍保留的角色：
  - Web 端继续使用既有页面内结算逻辑
  - Desktop 端以主进程准备为主，renderer 不再重复执行今日顺延 / 重复生成

## 最新状态（2026-05-24，V2.1 已正式发布，优先参考）
- `J-Flow V2.1` 已正式发布。
- 当前发布入口为：
  - `GitHub Releases`
  - `https://github.com/eglantine-shell/J-Flow/releases`
- 当前已确认真机验证通过的桌面产物：
  - macOS：
    - `release/J-Flow-V2.1.dmg`
  - Windows：
    - `release/J-Flow-V2.1-win-portable.exe`
- 当前版本线口径维持为：
  - `V1.4`
    - 上一版稳定 macOS 自用包
  - `V2.0`
    - 主要更新为本地文件夹同步能力
  - `V2.1`
    - 在 `V2.0` 基础上增加必要事项 `DDL`
- 当前 README / License / Releases 口径已对齐：
  - `README` 已改为更面向潜在使用者的正式说明
  - 仓库许可证已明确为：
    - `MIT`
  - 分发口径已统一为：
    - 通过 `GitHub Releases` 分发 `.dmg` 与 `.exe`
- 当前文档提醒仍然有效：
  - 不要把“本地文件夹同步”写成官方云同步

## 最新状态（2026-05-23，Windows V2.1 portable 图标修复已并回主线，优先参考）
- Windows V2.1 portable 已在真机打包成功。
- 当前最新 Windows 产物名为：
  - `release/J-Flow-V2.1-win-portable.exe`
- 当前已确认的产物 SHA256：
  - `00846D667827B552887BB6010F87C94B2D479E566E37586C03BE5CF337829385`
- Windows 图标修复已并回主线，当前处理方式为：
  - `scripts/sync-icon.mjs` 在 Windows 下生成圆角 `build/icon.png` 与多尺寸 `build/icon.ico`
  - `package.json` 的 `win.icon` 使用 `build/icon.ico`
  - `extraResources` 将 `icon.ico` 带入 `resources/icon.ico`
  - `electron/main.ts` 在 Windows 下对 `BrowserWindow` 显式传入该图标
  - `electron/main.ts` 在 Windows 下设置：
    - `app.setAppUserModelId('com.jflow.desktop')`
- 当前仍保持：
  - `win.signAndEditExecutable = false`
  因为 Windows 真机启用后会因 `winCodeSign` 解压 symlink 权限失败。
- 当前仍需用户在 Windows 真机重新打开最终 exe，确认：
  - 标题栏小图标
  - 任务栏图标
  均已刷新
- 文档口径提醒：
  - 不要把“本地文件夹同步”写成官方云同步。

## 最新状态（2026-05-23，版本线切到 V2.1，优先参考）
- 当前已确认上一版稳定 macOS 自用包为：
  - `V1.4`
- 当前版本线收口为：
  - `V2.0`
    - 主要更新为本地文件夹同步能力
  - `V2.1`
    - 在 `V2.0` 基础上增加必要事项 `DDL`
- 当前 macOS 打包产物名应为：
  - `release/J-Flow-V2.1.dmg`
- 当前已实际产出：
  - `release/J-Flow-V2.1.dmg`
- 当前说明口径：
  - 不写成：
    - 官方云同步
  - 继续统一写为：
    - 本地文件夹同步
    - 同步能力
    - 最小自动同步

## 最新状态（2026-05-23，日志快照已改为单一列表，并纳入 DDL / 逾期 / 分次 tag，优先参考）
- 当前日志页与复制 Markdown 已统一为：
  - `### 当日快照`
  单一列表
- 当前不再分为：
  - 当日完成
  - 当日未完成
  - 当日删除
- 当前日志语法已收口为：
  - 完成 / 删除：
    - `- [x]`
  - 未完成：
    - `- [ ]`
  - 删除项：
    - `- [x] ~~事项~~`
  - 必要事项正文加粗
  - `[拔草]`
    - `[逾期]`
    - `[分次]`
    作为末尾 tag，可叠加
- 当前 `DDL` 在日志中的规则：
  - 未完成必要事项：
    - 显示：
      - `DDL MMDD`
    - 若已逾期，再显示：
      - `[逾期]`
  - 已完成必要事项：
    - 未逾期 / 当天完成：
      - 不显示 `DDL`
    - 逾期完成：
      - 仅显示：
        - `[逾期]`
- 当前分次事项在日志中的规则：
  - 当日有推进：
    - `已推进 a%→b%`
  - 当日无推进：
    - `当前进度 b%`
- 当前存储结构已从：
  - `completedItems / unfinishedItems / deletedItems`
  收口为：
  - `snapshotItems`
- 当前兼容策略：
  - 历史旧日志若仍是三分区结构
  - 会在读取时自动转换为：
    - `snapshotItems`
  - 但不会回填缺失的历史 `DDL / 分次 / 拔草` 细粒度信息
- 当前日志 UI 已进一步微调为：
  - `[分次]`
    - `[逾期]`
    - `[拔草]`
    统一显示为浅蓝色文本 tag
  - 勾选前缀使用视觉 checkbox
  - 已完成事项整体颜色更浅
  - 行距已明显收紧

## 最新状态（2026-05-22，必要事项 DDL 第一版已落地，优先参考）
- 当前已新增：
  - 必要事项 `DDL`
- 当前规则：
  - `DDL` 只属于必要事项
  - 勾选必要时默认 `deadlineDate = item.date`
  - 取消必要时自动清空 `DDL`
  - 表单同时支持：
    - 日历点选真实日期
    - `x 日内完成`
  - 底层只保存真实 `deadlineDate`
  - 修改 Todo `date` 时，不自动顺延 `deadlineDate`
  - 已完成事项不再显示 `DDL`
- 当前列表展示：
  - 未到期：
    - `DDL 5/23`
  - 当天到期：
    - `今日截止`
  - 已逾期：
    - `DDL 5/23 已逾期`
  - 已逾期时：
    - 胶囊 tag 变红
    - 必要感叹号也变红
- 当前重复事项实现：
  - future occurrence 会通过模板 `date` 与模板 `deadlineDate` 的偏移换算出自己的真实 `deadlineDate`
  - occurrence 一旦生成后，`deadlineDate` 固定
- 当前已知待细化：
  - 已完成事项进入日志后，`DDL` 是否保留、如何保留
  - overdue 项在表单里无法反推出合法 `x` 时，`x 日内完成` 输入会显示为空，这属于当前接受范围

## 最新状态（2026-05-22，最小自动同步已落地，优先参考）
- 当前同步能力已升级为：
  - 本地文件夹手动同步
  - 本地文件夹最小自动同步
- 当前已完成的自动同步范围：
  - app ready 后延迟一次自动同步
  - window focus 时自动再尝试一次
  - `30s` 去抖
  - 若当前已有同步进行中则跳过
  - 若未配置同步文件夹则跳过
  - 自动同步失败只写入最近结果，不弹打断式错误
- 当前实现特点：
  - 自动同步与手动同步共用主进程内同一执行协调层
  - 若手动同步与自动同步撞上，会复用同一条执行中的同步 promise，避免并发重入
- 当前仍未做：
  - 自动同步开关设置
  - 固定间隔轮询
  - 文件系统 watcher
  - 托盘 / 菜单栏后台同步
  - `OneDrive`

## 最新状态（2026-05-22，WebDAV 已移除，仅保留本地文件夹同步，优先参考）
- 当前产品决策已确认：
  - 不再继续维护坚果云 `WebDAV`
- 当前已完成：
  - 设置页移除 WebDAV UI
  - preload / main process 移除 WebDAV IPC
  - `sync-now` 移除 WebDAV driver 分支
  - 删除 `electron/webdav/*`
  - 删除 WebDAV 手动测试脚本
- 当前同步只保留：
  - 本地文件夹
- 当前兼容处理：
  - 若本机 `sync_meta` 里仍残留旧的 `webdav` 配置
  - 现在会被自动忽略
  - 不再影响设置页与同步主链
- 当前建议：
  - 后续同步相关工作只围绕本地文件夹同步继续优化
  - 不要再基于旧的 WebDAV 文档继续实现

## 最新状态（2026-05-22，自动同步下一步建议：最小方案，优先参考）
- 当前手动同步主链已经可用：
  - 本地文件夹选择
  - `syncNow()`
  - 自动备份
  - 结果展示
- 下一步若开始自动同步，建议只做最小方案：
  - 只在桌面端
  - 只针对本地文件夹同步
  - 只在应用启动后与窗口重新获得焦点时尝试自动同步
  - 增加最小去抖：
    - 距离上次尝试不足 `30s` 不再自动触发
  - 若当前已有同步进行中，则跳过
  - 若未配置同步文件夹，则跳过
  - 自动同步失败时：
    - 只写入最近结果
    - 不弹打断式错误
  - 当前先不做：
    - 文件系统 watcher
    - 后台定时器常驻轮询
    - 菜单栏 / 托盘后台同步
    - 用户自定义自动同步策略
- 当前建议实施顺序：
  - 先新增 main / renderer 可调用的 `maybeAutoSync(reason)` 薄入口
  - 先接两个触发点：
    - app ready 后延迟一次
    - window focus 时一次
  - 等这条最小链路稳定后，再决定是否扩到定时器

## 最新状态（2026-05-22，WebDAV 测试并保存链路已补可观测性，优先参考）
- 用户反馈：
  - 清除配置后重新输入
  - 点击：
    - `测试并保存`
  看起来“没有反应”
- 当前判断：
  - 暂时不能直接认定是 WebDAV 超时或协议失败
  - 需要先确认点击链路是否真正进入 main process，以及在哪一步 pending
- 当前已补：
  - 设置页测试状态：
    - `测试并保存中…`
    - `正在测试 WebDAV`
  - main process 日志：
    - `test-webdav-target:start`
    - `test-webdav-target:done`
    - `test-webdav-target:failed`
- 当前建议：
  - 重启 Electron 后重新测试：
    - `清除配置 -> 重新输入 -> 测试并保存`
  - 先根据页面状态与终端日志判断：
    - 是否已发出 IPC
    - 是否进入 handler
    - 是否成功返回 / 失败返回 / 长时间 pending

## 最新状态（2026-05-22，坚果云 collection URL 尾斜杠已兼容，优先参考）
- electron 设置页点击：
  - `立即同步`
  仍出现：
  - `WebDAV 创建目录失败：503 operation=MKCOL logicalPath=. status=503`
  的根因已确认不是同步编排缺失，而是 WebDAV collection URL 形态兼容问题
- 当前已修复：
  - `electron/webdav/client.ts`
  - 目录类请求现在统一使用带尾斜杠的 collection URL
- 当前已覆盖：
  - 根目录 `PROPFIND`
  - 嵌套目录 `PROPFIND`
  - `ensureDir(...)` 里的 collection URL 断言
- 这主要是为了兼容坚果云对：
  - `/dav/J-Flow/`
  - `/dav/J-Flow/devices/`
  这类 collection URL 的更稳定处理
- 当前建议：
  - 在 electron 设置页重新点击一次：
    - `立即同步`
  - 重点确认：
    - 不再出现 `MKCOL logicalPath=.` 的 `503`

## 最新状态（2026-05-21，坚果云 MKCOL 503 已兼容，优先参考）
- 真实坚果云 manual test 又暴露出一个新兼容点：
  - `prepare-target`
  - `WebDAV 创建目录失败：503 operation=MKCOL logicalPath=. status=503`
- 当前已修复：
  - `WebDAV client.ensureDir(...)`
  - 现在只要 `MKCOL` 失败后能证明目录其实已经存在，就会继续
  - 不再只把 `405` 视为“已存在可接受”
- 这主要是为了兼容坚果云对已存在目录偶发返回 `503` 的情况
- 当前建议：
  - 重新运行 `corepack pnpm run test:webdav:manual`
  - 看是否不再卡在 `prepare-target`

## 最新状态（2026-05-21，坚果云目录初始化已改为先 exists，优先参考）
- `WebDAV client.ensureDir(...)` 当前已进一步收口为：
  - 先 `exists`
  - 已存在则跳过 `MKCOL`
- 这样在坚果云根目录 `J-Flow-Test` 已存在时：
  - 不会再先发不稳定的 `MKCOL`
  - 能更稳地避开 `503`
- 当前建议：
  - 再次运行 `corepack pnpm run test:webdav:manual`
  - 重点确认：
    - 不再在 `prepare-target` 失败

## 最新状态（2026-05-21，WebDAV manual test 已收紧为固定 2 条变更，优先参考）
- `corepack pnpm run test:webdav:manual` 当前已收紧为更稳定的回归入口。
- 当前脚本在写入测试 seed 数据后，会先把 seed 自动产生的 `sync_changes` 标记为已同步。
- 然后只再创建本轮测试的两条待同步变更：
  - 一个 `dayPlanItem upsert`
  - 一个 `dayPlanItem delete / tombstone`
- 当前预期输出应为：
  - `beforeSyncChangesCount = 2`
  - `syncResult.status = "success"`
  - `syncResult.exportResult.exportedCount = 2`
  - `remote.itemExists = true`
  - `remote.tombstoneExists = true`
- 当前仍建议：
  - 使用测试目录，例如 `J-Flow-Test`
  - 不要使用正式 `J-Flow`
  - 不要使用正式主数据目录

## 最新状态（2026-05-21，WebDAV manual test：远端附加校验已加 503 容错，优先参考）
- 真实坚果云 manual test 已确认：
  - `metadata`
  - `syncNow`
  - `items / tombstones`
  主链可用
- 当前又补了一层脚本稳定性：
  - 远端附加校验中的 `PROPFIND` 若偶发 `503`
  - 脚本会做有限重试
  - 若个别 listing 仍失败，会进入：
    - `remote.warnings`
  - 不再直接把已成功的 `syncNow` 误判成整轮脚本失败
- 当前 item / tombstone 是否存在，已额外通过：
  - `driver.exists(...)`
  直接校验
- 当前建议：
  - 重新运行 `corepack pnpm run test:webdav:manual`
  - 若 `syncResult.status = "success"` 且：
    - `remote.itemExists = true`
    - `remote.tombstoneExists = true`
    则可视为本轮真实 WebDAV 回归通过

## 最新状态（2026-05-21，WebDAV manual test bugfix：优先参考）
- 已修复真实坚果云 manual test 中的首次初始化问题：
  - 当远端目录结构已存在
  - 但 `sync-info.json` 缺失时
  - 现在会被识别为首次初始化 / 半初始化修复场景
  - 系统会自动创建并补齐 `sync-info.json`
- 根因是：
  - 通用 metadata helper 之前只把本地 `ENOENT` 识别为“文件不存在”
  - 没有把 WebDAV 的：
    - `code = not_found`
    - `status = 404`
    视为同类情况
- 当前已经补齐：
  - `touchSyncInfo(...)` 的 WebDAV `404` 识别
  - WebDAV 错误信息中的：
    - `operation`
    - `logicalPath`
    - `status`
- 当前建议：
  - 重新运行：
    - `corepack pnpm run test:webdav:manual`
  - 重点确认远端会补齐：
    - `J-Flow-Test/sync-info.json`
  - 并继续验证：
    - `devices/`
    - `items/`
    - `tombstones/`
    - `locks/`

## 最新状态（2026-05-21，WebDAV syncNow 人工验证准备，优先参考）
- 当前已新增 dev-only 手动测试入口：
  - `corepack pnpm run test:webdav:manual`
- 当前脚本位置：
  - `scripts/test-webdav-sync.mjs`
- 当前脚本会：
  - 读取仓库根目录 `.env.local`
  - 使用真实坚果云参数保存 `webdav target config + credential`
  - 自动创建临时 SQLite 数据目录
  - 自动构造：
    - 一个 `dayPlanItem upsert`
    - 一个 `dayPlanItem delete`
  - 运行一次真实 `syncNow`
  - 输出远端 `sync-info / devices / items / tombstones / locks` 验证结果
- 当前脚本不会：
  - 使用正式主数据目录
  - 返回 password
  - 把 password 写入日志
- 当前建议：
  - 手动验证时使用：
    - `baseUrl = https://dav.jianguoyun.com/dav/`
    - `rootPath = J-Flow-Test`
  - 不要使用正式 `J-Flow`

## 最新状态（2026-05-21，WebDAV 已接入 syncNow，优先参考）
- 当前 `syncNow` 已可根据 `syncTargetConfig.type` 创建对应 driver。
- 当前已支持：
  - `localFolder`
  - `webdav`
- 当前目标 resolve 规则：
  - 优先使用本机 `syncTargetConfig`
  - 若 `syncTargetConfig` 缺失，则继续兼容旧的 `syncTargetPath -> localFolder`
- 当前 `webdav` driver 的创建方式：
  - 从 `syncTargetConfig` 读取：
    - `baseUrl`
    - `rootPath`
    - `username`
    - `provider`
  - 从本机 credential store 读取 password
  - 若 credential 缺失，则当前 `syncNow` 直接 `failed`
- 当前 `syncNow` 已统一复用：
  - `prepareSyncTarget(driver, ...)`
  - `acquireSyncLock(driver, ...)`
  - `importRemoteChangesFromSyncTarget(...)`
  - `exportLocalChangesToSyncTarget(...)`
  - `updateDeviceInfo(driver, ...)`
  - `releaseSyncLock(driver, ...)`
- 当前保持不变：
  - 先 `import`，后 `export`
  - `partial / failed` 不写 `lastSyncedAt`
  - `success` 才写本机与远端 `lastSyncedAt`
  - 无变化但成功仍写 `lastSyncedAt`
  - 导入仍不会制造新的待同步 `sync_changes`
- 当前仍未开始：
  - 设置页最终 `webdav` 同步目标 UI
  - 自动同步
  - OneDrive
- 当前下一步建议：
  - 先用测试数据与测试坚果云目录做一轮小规模人工验证
  - 再决定是否进入“设置页同步目标 UI”阶段

## 最新状态（2026-05-21，WebDAV metadata POC，优先参考）
- 当前 `WebDAV SyncTargetDriver` 已能跑通通用 metadata helper。
- 当前 `repository.sync.testWebdavTarget(...)` 继续保留原受控入口，但内部已改为：
  - 创建 `WebDAV SyncTargetDriver`
  - 调用通用 metadata helper
  - 验证：
    - `prepareSyncTarget(driver, ...)`
    - `sync-info.json`
    - `devices/<deviceId>.json`
    - `locks/`
- 当前 WebDAV target 上已验证：
  - `sync-info.json` 格式与 localFolder 一致
  - `devices/<deviceId>.json` 格式与 localFolder 一致
  - `locks/sync_<deviceId>.json` 语义与 localFolder 一致
- 当前测试连接成功后仍会：
  - 保存 `webdav target config`
  - 保存 credential
- 当前测试连接失败时仍不会：
  - 保存 password
  - 覆盖旧可用配置
- 当前仍未开始：
  - `syncNow` 接入 `webdav`
  - `items / tombstones`
  - `import / export`
  - 完整同步闭环
- 当前下一步建议：
  - 开始让 `webdav` 进入 `sync core` 的下一小步
  - 优先接 `sync-export / sync-import` 的 target 版函数，而不是直接改 `syncNow`

## 最新状态（2026-05-20，WebDAV 接入 Sync Core Step 1，优先参考）
- 当前已新增通用 sync metadata helper：
  - `electron/sync-target/metadata.ts`
- 当前已把下面这些协议逻辑从 `localFolder` 专属实现中抽出：
  - `sync-info.json`
  - `devices/<deviceId>.json`
  - `locks/`
- 当前 helper 已支持：
  - `prepareSyncTarget(driver, ...)`
  - `readSyncInfo(driver)`
  - `writeSyncInfo(driver, ...)`
  - `touchSyncInfo(driver, ...)`
  - `updateDeviceInfo(driver, ...)`
  - `acquireSyncLock(driver, ...)`
  - `releaseSyncLock(driver, ...)`
- 当前 `electron/sync-folder.ts` 仍保留旧对外 API，但已改为：
  - local folder 路径校验
  - 旧 API 兼容包装层
  - 内部创建 `LocalFolderDriver` 后调用通用 helper
- 当前保持不变：
  - metadata 格式
  - lock 语义
  - local folder 行为
- 当前仍未开始：
  - 让 `webdav` 接入 `syncNow`
  - 让 `webdav` 接入完整 `import / export`
  - 完整同步闭环
- 当前下一步建议：
  - 先用 `WebDAV SyncTargetDriver` 跑同一套 metadata helper
  - 再进入 `webdav` 的 `import / export` target 版接线

## 最新状态（2026-05-18，同步方案文档，优先参考）
- 本轮没有开始实现同步。
- 本轮未改：
  - 数据库 schema
  - 设置页 UI
  - SQLite 存储逻辑
  - JSON 导入导出逻辑
- 本轮已新增：
  - `docs/sync-design.md`
- 当前同步方案文档已明确第一版方向：
  - 只支持桌面端
  - 每台设备继续使用自己的本地 SQLite
  - 用户在设置页选择同步文件夹
  - 同步文件夹可位于 iCloud Drive / OneDrive / Dropbox / 坚果云 / NAS
  - J-Flow 通过同步文件夹交换数据变化
  - 第一版只做“立即同步”
  - 同步前自动创建本地备份
  - 冲突先采用“最后修改的一方胜出”
  - 不做账号系统
  - 不做 WebDAV
  - 不做实时同步
  - 不同步 SQLite 文件本体
  - 不把 JSON 备份当同步用
- 当前状态仍是：
  - 已有同步产品方案文档
  - 尚未进入同步实现
  - 若要开始做代码，需要先基于这份文档继续细化技术方案和规则边界

## 最新状态（2026-05-18，同步实现前规格文档，优先参考）
- 本轮继续只做文档，不开始实现同步。
- 本轮未改：
  - 代码实现
  - SQLite schema
  - 设置页 UI
  - 同步按钮或同步逻辑
- 本轮已新增：
  - `docs/sync-implementation-plan.md`
- 当前已将第一版同步继续细化为实现前规格，明确了：
  - 同步文件夹目录结构
  - sync item 文件最小格式
  - tombstone 删除同步规则
  - `deviceId` 规则
  - `last-write-wins` 冲突细化口径
  - 各类数据的同步范围
  - “立即同步”步骤拆分
  - 第一版明确不做的范围
  - 后续实现里程碑拆分
- 当前同步仍处于设计阶段，尚未进入实现。
- 若后续开始写代码，建议先以：
  - `docs/sync-design.md`
  - `docs/sync-implementation-plan.md`
  作为同步实现的直接规格入口

## 最新状态（2026-05-18，同步实现前规格补充细节，优先参考）
- 本轮继续只改文档，不开始实现同步。
- 本轮继续未改：
  - 代码实现
  - SQLite schema
  - 设置页 UI
- 当前已在 `docs/sync-implementation-plan.md` 中补充：
  - `entityType` 与目录名映射表
  - `updatedAt` 的稳定来源要求
  - 本地删除记录机制建议
  - 本地 `lastSyncedAt` 与本地变化识别基础
  - 第一版 LWW 的设备时间假设
  - 最小 lock 文件格式建议
  - `sync-info.json` 最小字段建议
- 当前同步仍处于“可开始实现前的规格补完”阶段，尚未进入任何代码落地。

## 最新状态（2026-05-19，OneDrive 前置决策收口，优先参考）
- 当前 `localFolder` 同步主链已经可用，并已完成 `SyncTargetDriver` 迁移。
- 本轮继续只改文档，不写 OneDrive 代码。
- 本轮已完成：
  - 更新 `constraints.md`
    - 不再使用“当前完全不做云同步”的旧表述
    - 明确：
      - 不做 `J-Flow` 自有账号系统
      - 不做 `J-Flow` 自有云数据库
      - 允许第三方云同步目标授权接入
      - 第一目标为 `OneDrive`
      - 仍不做自动同步 / WebDAV / Dropbox / Google Drive
  - 新增：
    - `docs/sync-onedrive-oauth-poc.md`
    - `docs/sync-onedrive-token-storage-options.md`
- 当前已明确：
  - OneDrive 方向进入“实现前决策阶段”
  - 尚未写 OAuth 代码
  - 尚未接 Graph API
  - 尚未改设置页 UI
- 当前建议的前置决策收口：
  - OneDrive OAuth POC 使用系统浏览器
  - 使用 `Authorization Code + PKCE`
  - 使用 `localhost / 127.0.0.1` loopback callback
  - token 不进入同步目录、JSON 备份或跨设备同步数据
  - POC 阶段优先考虑：
    - `Electron safeStorage + 本机隔离文件`
  - 正式阶段优先评估：
    - `keytar` / 系统凭据存储
- 当前下一步建议：
  - 若确认以上边界与参数方向无误，可进入 OneDrive OAuth POC 代码阶段
  - 但仍应避免一开始就接完整 Graph 同步链路，建议先验证：
    - 授权
    - 账号信息
    - App Folder metadata 读写

## 最新状态（2026-05-20，WebDAV / 坚果云方向切换，优先参考）
- 当前决定暂时停止 `OneDrive OAuth` 方向，改为优先支持 `坚果云 WebDAV` 同步目标。
- 这次方向切换的原因：
  - `OneDrive App Registration / Azure tenant` 获取受阻
  - 坚果云官方支持 `WebDAV`
  - `WebDAV` 不需要 `OAuth client id`
  - 更适合当前 `SyncTargetDriver` 架构
- 本轮继续只改文档，不写代码。
- 本轮已新增：
  - `docs/sync-webdav-jianguoyun-design.md`
- 当前已明确：
  - 第一阶段云目标改为 `WebDAV / 坚果云`
  - `OneDrive` 保留为未来目标，但暂缓
  - 继续复用现有：
    - `sync-info.json`
    - `devices/`
    - `items/`
    - `tombstones/`
    - `locks/`
    - `LWW`
    - `syncNow`
    - `SyncTargetDriver`
- 当前已建议的后续顺序：
  - 先更新 `constraints.md` 边界，把第一云目标从 `OneDrive` 调整为 `WebDAV / 坚果云`
  - 再扩展 `SyncTargetConfig` 增加 `webdav`
  - 再做 WebDAV 凭据存储与 metadata POC
- 当前仍未做：
  - `WebDAV driver` 代码
  - 坚果云账号密码 UI
  - `syncNow` 改造
  - 自动同步

## 最新状态（2026-05-20，WebDAV / 坚果云实施计划，优先参考）
- 本轮继续只改文档，不写代码。
- 本轮已完成：
  - 更新 `constraints.md`
    - 第一阶段云同步目标正式调整为 `WebDAV / 坚果云`
    - `OneDrive` 保留为未来目标，但暂缓
    - 继续不做自动同步 / 实时同步 / 后台定时同步
    - 明确 `JSON` 备份不是同步包
  - 新增：
    - `docs/sync-webdav-implementation-plan.md`
- 当前已明确：
  - `webdav` target config 的推荐结构
  - 坚果云默认连接参数
  - credential store 原则
  - `WebDAV driver` 的方法映射
  - POC 只做 metadata 验证，不接完整同步
- 当前下一步建议：
  - 若边界与实施计划确认无误，可进入：
    - `SyncTargetConfig` 增加 `webdav`
    - WebDAV credential store 设计与实现
    - `WebDAV driver` metadata POC

## 最新状态（2026-05-20，WebDAV POC 前最后决策，优先参考）
- 本轮继续只改文档，不写代码。
- 本轮已新增：
  - `docs/sync-webdav-poc-decisions.md`
- 当前已拍板的实现前决策：
  - `webdav target config`
    - 后续统一保存在本机 `SQLite sync_meta`
    - 从单独的 `syncTargetPath` 逐步升级到 `syncTargetConfig`
  - `password / app password`
    - 不进入 `SyncTargetConfig`
    - 由本机 credential store 保存
  - credential store
    - POC 阶段采用：
      - `Electron safeStorage + 本机隔离文件`
    - 测试连接失败时默认不持久化凭据
    - 测试成功后再保存
  - WebDAV POC 技术路线
    - 采用：
      - `fetch + XML parser`
    - 当前不引入完整 WebDAV client 库
- 当前下一步建议：
  - 可开始进入 WebDAV POC 第一轮代码实现
  - 范围建议先限制为：
    - WebDAV types
    - credential store
    - low-level client
    - `GET / PUT / DELETE / MKCOL / PROPFIND`
    - 写读删一个测试 JSON

## 最新状态（2026-05-20，WebDAV POC 01，优先参考）
- 本轮已开始 `WebDAV / 坚果云` 的第一轮代码 POC。
- 本轮只做：
  - WebDAV low-level client
  - credential store
  - 基础远端方法验证
- 本轮未做：
  - `syncNow` 接入
  - `SyncTargetDriver` 正式 `webdav` driver
  - `items / tombstones`
  - 设置页 UI
- 本轮已新增：
  - `electron/webdav/types.ts`
  - `electron/webdav/credentials.ts`
  - `electron/webdav/client.ts`
  - `electron/webdav/poc.ts`
  - `electron/webdav/credentials.test.ts`
  - `electron/webdav/client.test.ts`
- 本轮已新增依赖：
  - `fast-xml-parser`
  - 仅用于 Electron main 侧解析 `PROPFIND` XML
  - 没有引入完整 WebDAV client 库
- 当前已实现：
  - WebDAV 凭据按 `provider + baseUrl + username` 维度索引
  - `Electron safeStorage + 本机隔离文件`
  - `GET / PUT / DELETE / MKCOL / PROPFIND`
  - `runWebdavPocTest(config, password)`
- 当前已明确：
  - password 不进入 target config
  - password 不进入同步目录、`items / tombstones`、JSON 备份
  - 测试连接失败时默认不持久化凭据
- 当前下一步建议：
  - 下一轮先把 `webdav` target config 和 `credential store` 接到受控 main 层入口
  - 再做 `sync-info.json / devices` metadata POC

## 最新状态（2026-05-17，Windows 真机打包与启动修复，优先参考）
- 本轮目标：
  - 在 Windows 真机上跑通 `package:win`
  - 验证 `release/J-Flow-V1-win-portable.exe` 启动
  - 不做新功能
  - 优先解决此前 Windows 包“打开没反应”
- 当前已确认根因：
  - packaged preload 之前以 `.js` 形式输出
  - 项目根为 `"type": "module"` 且 Electron tsconfig 使用 `NodeNext`
  - TypeScript 会让 preload 产物带 ESM 语法
  - Electron preload 加载时因此报：
    - `Unable to load preload script`
    - `SyntaxError`
- 当前已修复：
  - `electron/preload.ts` 已改为 `electron/preload.cts`
  - 编译产物变为：
    - `dist-electron/preload.cjs`
  - `electron/main.ts` 已改为加载：
    - `preload.cjs`
  - `package.json` 的 Windows 打包文件清单已包含：
    - `dist-electron/**/*.cjs`
- 当前 Windows 打包链路已调整：
  - `sync:icon` 改为跨平台 Node 脚本：
    - `scripts/sync-icon.mjs`
  - `package:win` 已改为 Windows 可执行命令链
  - `package:win` 内置 Electron / electron-builder 镜像环境变量
  - `package:win` 当前使用：
    - `electron-builder --win portable -c.npmRebuild=false`
- 当前验证结果：
  - `package:win` 已在 Windows 真机跑通
  - `release/win-unpacked/J-Flow.exe` 启动后 10 秒仍存活
  - `release/J-Flow-V1-win-portable.exe` 启动后 15 秒仍存活，并能拉起 J-Flow 子进程
  - 启动日志中未再出现 preload 加载失败
  - 启动日志中未见 renderer 文件加载失败
- 当前 Windows 打包风险：
  - 本轮为绕过当前 Windows 用户无 symlink 权限导致的 `winCodeSign` 解压失败，配置了：
    - `build.win.signAndEditExecutable=false`
  - 这意味着当前 Windows 包仍是本地测试包，正式发布前需要再处理签名 / exe resource edit 环境。
- 本轮没有改：
  - 产品规则
  - UI 功能
  - SQLite 数据目录规则
  - 业务数据模型

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

## 2026-05-18 Sync 1 当前有效状态

- 本地文件夹同步已进入实现阶段，但当前只完成 `Sync 1` 基础层。
- 已落地的内容：
  - 桌面端首次初始化会生成并持久化本机 `deviceId`
  - 本地同步元数据保存于 SQLite `sync_meta`
  - 本地变更记录保存于 SQLite `sync_changes`
  - `lastSyncedAt` 的本地保存位置已明确为 `sync_meta`
  - `settings / sceneTags / activityTypes / taskTemplates / recurringTaskInstances / dayPlanItems` 已具备稳定 `updatedAt` 语义
  - 本地删除会写 `sync_changes(changeType=delete)`，不再只是删业务表
- 当前可通过 preload bridge 读取：
  - `repository.sync.getState()`
  - `repository.sync.listChanges()`
- 当前仍未实现：
  - 同步文件夹选择
  - 同步目录初始化
  - `items/` 导出
  - `tombstones/` 导出
  - 立即同步按钮
  - 自动同步

## Sync 1 接手提醒
- 后续如果进入 `Sync 2`，应在现有 `sync_meta / sync_changes` 基础上继续，不要重做本地元数据结构。
- 后续如果扩展同步范围到 `logbookEntries / segmentedProgressLogs`，请先确认产品规则，不要为了同步先扩表。

## 2026-05-18 Sync 2 当前有效状态

- 本地文件夹同步的“准备层”已完成。
- 当前已支持：
  - 保存同步文件夹路径
  - 读取当前同步文件夹路径
  - 清除同步文件夹路径
  - 测试同步文件夹可读写
  - 初始化 `J-Flow Sync` 目录结构
  - 读取 / 校验 `sync-info.json`
  - 写入 / 更新 `devices/<deviceId>.json`
- `syncTargetPath` 当前存放位置：
  - SQLite `sync_meta`
- 当前同步目录结构已能初始化为：
  - `sync-info.json`
  - `devices/`
  - `items/<entityType>/`
  - `tombstones/<entityType>/`
  - `locks/`
- 当前设置页已新增轻量入口：
  - 选择同步文件夹
  - 测试同步文件夹
  - 清除同步文件夹
- 当前仍未实现：
  - `items/` 导出
  - `tombstones/` 实际写入
  - 立即同步
  - 远端读取
  - 合并策略

## Sync 2 接手提醒
- 下一轮进入 `Sync 3` 时，应直接复用：
  - `sync_meta.deviceId`
  - `sync_meta.lastSyncedAt`
  - `sync_meta.syncTargetPath`
  - `sync_changes`
- `sync-info.json` 当前已固定：
  - `syncVersion = 1`
  - `appName = J-Flow`
- 如果需要支持“不兼容 sync 目录”的更细提示，可以继续在 `electron/sync-folder.ts` 内细化错误分类，不要把校验逻辑散到 renderer。

## 2026-05-18 Sync 3 当前有效状态

- 本地文件夹同步的“本地变化导出层”已完成。
- 当前已支持：
  - 读取本地 `sync_changes` 中 `syncedAt IS NULL` 的变化
  - `upsert` 导出到 `items/<entityDir>/<id>.json`
  - `delete` 导出到 `tombstones/<entityDir>/<id>.json`
  - 单条导出成功后更新对应 `sync_changes.syncedAt`
  - 返回成功 / 失败统计与失败项列表
- 当前 bridge 已新增：
  - `repository.sync.exportLocalChanges()`
- 当前保持的边界：
  - 不读远端 `items`
  - 不读远端 `tombstones`
  - 不合并本地 / 远端数据
  - 不做冲突处理
  - 不更新本机 `lastSyncedAt`
  - 不把“同步前自动备份”硬塞进本轮主流程

## Sync 3 接手提醒
- 下一轮进入 `Sync 4` 时，应开始做：
  - 远端 `items/` 读取
  - 远端 `tombstones/` 读取
  - 本地合并准备
- 进入完整“立即同步”闭环前，不要把当前 `exportLocalChanges()` 误包装成 `syncNow()`。

## 2026-05-18 Sync 4 当前有效状态

- 远端变化读取与本地静默合并已完成。
- 当前已支持：
  - 读取远端 `items/`
  - 读取远端 `tombstones/`
  - 校验远端 JSON
  - 按第一版 `last-write-wins` 规则应用远端变化
  - 本地已删除 + 远端旧 item 不复活
  - 本地已删除 + 远端新 item 可复活
  - 远端导入后不会制造新的待上送 `sync_changes`
- 当前 bridge 已新增：
  - `repository.sync.importRemoteChanges()`
- 当前仍保持的边界：
  - 不做完整“立即同步”按钮
  - 不做自动同步
  - 不做人工冲突选择
  - 不更新本机 `lastSyncedAt`
  - 不把同步前自动备份塞进本轮主流程

## Sync 4 接手提醒
- 下一轮如果进入完整“立即同步”闭环，应把这些阶段按顺序串起来：
  - 本地备份
  - 远端导入
  - 本地导出
  - 结果提示
  - 最后再决定是否写 `lastSyncedAt`
- 进入 Sync 5 之前，不要把当前 `exportLocalChanges()` 和 `importRemoteChanges()` 误命名或包装成完整 `syncNow()`。

## 2026-05-18 Sync 5 当前有效状态

- 最小手动同步闭环已完成。
- 当前已支持：
  - `repository.sync.syncNow()`
  - 检查 `syncTargetPath`
  - 准备同步目录
  - 获取最小锁
  - 同步前创建一次本地自动备份
  - 导入远端变化
  - 导出本地变化
  - 汇总 `success / partial / failed`
  - 仅在全链路完全成功时写本机 `lastSyncedAt`
  - 仅在全链路完全成功时更新 `devices/<deviceId>.json.lastSyncedAt`
- 当前锁规则：
  - 使用 `locks/sync_<deviceId>.json`
  - 发现其他设备未过期锁时直接失败
  - 过期锁可忽略或清理
  - `finally` 中只释放自己的锁
- 当前仍保持的边界：
  - 不接设置页“立即同步”按钮 UI
  - 不做自动同步
  - 不做人工冲突选择
  - 不做字段级合并

## Sync 5 接手提醒
- 下一轮如果要继续做 Sync UI，只接一个最小设置页入口：
  - 立即同步按钮
  - 最近一次同步结果
  - 上次同步时间
  - 最近一次错误
- 若后续进入更完整的同步治理，再考虑：
  - 锁过期提示
  - 错误详情展示
  - 同步结果历史

## 2026-05-19 Sync 5 UI 当前有效状态

- 设置页“数据与同步”区域已接入最小同步卡片。
- 当前卡片已支持：
  - 同步状态展示
  - 当前同步文件夹展示
  - 最近一次同步结果摘要
  - `立即同步`
  - `打开 / 更改` 同步文件夹
  - 详情折叠区中的技术信息
- 当前详情区已包含：
  - 上次同步时间
  - `deviceId`
  - `syncVersion`
  - import 统计
  - export 统计
  - 最近一次备份路径
  - 完整错误信息
- 当前本机同步元数据已补充：
  - `lastSyncAttemptedAt`
  - `lastSyncResult`
- 当前仍保持的边界：
  - 不做自动同步
  - 不做后台同步
  - 不做 WebDAV / 账号系统
  - 不做复杂同步中心

## Sync 5 UI 接手提醒
- 下一轮优先做人工点检与文案微调，不要急着扩展功能。
- 如果后续要继续增强，建议顺序是：
  - 微调卡片文案与状态颜色
  - 增加最近一次同步结果的人类可读摘要
  - 最后才考虑同步历史或更复杂的错误查看

## 2026-05-19 设置页数据入口当前有效状态

- 设置页 `Data / 数据导入 / 导出` 已收口为一个轻量卡片。
- 当前只保留 3 个入口：
  - `导入数据`
  - `导出数据`
  - `恢复备份`
- 当前不再在设置页展示：
  - 数据目录
  - SQLite 主库路径
  - 自动备份目录
  - 单独的自动备份卡片
- `导入数据` 与 `导出数据` 行为未改。
- `恢复备份` 当前逻辑是：
  - 读取最新一份自动备份
  - 走现有导入数据流程覆盖当前本地数据
- 当前自动备份逻辑本身未改：
  - 启动时按既有规则自动备份
  - `syncNow` 前自动备份
  - 导入 / 重置 / 替换快照后仍按原逻辑创建备份

## 2026-05-19 OneDrive 同步目标文档当前有效状态

- 当前已新增：
  - `docs/sync-onedrive-design.md`
- 这份文档当前不是实现说明，而是方向分析。
- 当前文档已经明确：
  - J-Flow 若要像 Joplin 一样接 OneDrive，不应推翻现有 Sync 1-5
  - 更合理的方向是：
    - 保留现有同步格式
    - 新增 `OneDrive` 同步目标 driver
    - 用 OAuth + Microsoft Graph App Folder 读写同步文件
- 当前也明确记录了一个前置问题：
  - `constraints.md` 仍然写着“当前不做云同步”
  - 如果要正式开始 OneDrive，需要先确认是否放开这条边界

## OneDrive 文档接手提醒
- 下一轮如果继续 OneDrive 方向，建议先不要写代码。
- 优先补：
  - `docs/sync-onedrive-implementation-plan.md`
- 先把这些点定清楚：
  - target driver 接口
  - 授权流程
  - token 存储位置
  - 设置页如何从“同步文件夹”升级到“同步目标”

## 2026-05-19 Sync Target Driver 文档当前有效状态

- 当前已新增：
  - `docs/sync-target-driver-design.md`
- 这份文档当前明确了一个重要优先级：
  - 在开始 OneDrive 之前，先抽 `SyncTargetDriver`
- 当前建议的未来方向是：
  - `localFolder` driver 先承接现有实现
  - `oneDriveAppFolder` driver 后续再接
- 当前文档也明确了：
  - `sync-export`、`sync-import`、`sync-now` 都不应继续直接依赖本地文件系统
  - 同步核心未来应只依赖 driver

## Sync Target Driver 接手提醒
- 下一轮如果继续推进，优先补一份更偏工程拆分的文档：
  - `docs/sync-target-driver-implementation-plan.md`
- 建议先拆清：
  - `sync-folder.ts` 哪些函数迁到 `LocalFolderDriver`
  - 哪些 service 改成依赖注入 `driver`
  - 哪些测试先要围绕 driver 重构

## 2026-05-19 Sync Target Driver 实施计划当前有效状态

- 当前已新增：
  - `docs/sync-target-driver-implementation-plan.md`
- 这份文档当前不是实现结果，而是代码迁移顺序说明。
- 当前文档已经明确：
  - 建议新增：
    - `electron/sync-target/types.ts`
    - `electron/sync-target/local-folder-driver.ts`
    - `electron/sync-target/index.ts`
  - `LocalFolderDriver` 第一版应先承接当前 local folder 的底层 `fs` 行为
  - `sync-folder.ts` 第一阶段不建议直接改名，而应先保留并逐步剥离
  - `sync-export`、`sync-import`、`sync-now` 应逐步从“直接依赖本地目录”改为“依赖 driver”
  - 现有 Sync 2-5 行为和测试应保持不变

## Sync Target Driver 实施计划接手提醒
- 下一轮如果开始代码迁移，建议优先从：
  - `LocalFolderDriver`
  开始，不要先碰 OneDrive 或 UI。
- 第一阶段最重要的目标不是扩功能，而是：
  - driver 抽象完成
  - local folder sync 行为保持不变
  - 现有同步测试继续通过

## 2026-05-19 Sync Target Driver Step 1 当前有效状态

- 当前已新增：
  - `electron/sync-target/types.ts`
  - `electron/sync-target/local-folder-driver.ts`
  - `electron/sync-target/index.ts`
  - `electron/sync-target/local-folder-driver.test.ts`
- 当前 `LocalFolderDriver` 已提供：
  - `readText`
  - `writeText`
  - `delete`
  - `list`
  - `exists`
  - `ensureDir`
  - `safeWriteJson`
- 当前已明确：
  - `logicalPath` 使用 POSIX 风格
  - driver 内部负责映射到本地真实路径
  - 拒绝反斜杠、绝对路径和 `..` 路径穿越
  - `safeWriteJson` 继续沿用本地 `.tmp -> rename`

## Sync Target Driver Step 1 接手提醒
- 下一轮建议先改：
  - `sync-folder.ts`
  让 `sync-info`、`devices`、`locks` 相关本地目录操作开始由 `LocalFolderDriver` 承接。
- 当前仍不要同时改：
  - `sync-export.ts`
  - `sync-import.ts`
  - `sync-now.ts`
  以避免一步跨太大。

## 2026-05-19 Sync Target Driver Step 2 当前有效状态

- 当前 `electron/sync-folder.ts` 已开始在内部使用 `LocalFolderDriver`
- 当前已迁移到 driver 的本地 metadata 层包括：
  - 同步目录结构 ensure
  - `sync-info.json` 读取 / 写入
  - `devices/<deviceId>.json` 写入
  - `locks/` 读写
  - 本地目录读写测试时的临时 JSON 往返
- 当前保持不变：
  - `sync-folder.ts` 对外函数名
  - sync folder 文件结构
  - 锁语义
  - `sync-info` / `devices` 字段规则

## Sync Target Driver Step 2 接手提醒
- 下一轮建议改：
  - `sync-export.ts`
  让本地 item / tombstone 导出开始通过 driver 写入。
- 当前仍先不要同时去改：
  - `sync-import.ts`
  - `sync-now.ts`
  这样更容易把“导出行为是否不变”单独验证清楚。

## 2026-05-19 Sync Target Driver Step 3 当前有效状态

- 当前 `electron/sync-export.ts` 已开始使用 `SyncTargetDriver`
- 当前仍保留旧对外入口：
  - `exportLocalChangesToSyncFolder(...)`
  - `exportPendingSyncChanges(...)`
- 当前旧入口内部会创建：
  - `new LocalFolderDriver(targetPath)`
- 当前 export 层已改为：
  - 只生成 logicalPath
  - 用 `driver.safeWriteJson(...)` 写 `items/` 和 `tombstones/`
- 当前保持不变：
  - `upsert` / `delete` 导出规则
  - item / tombstone JSON 格式
  - `syncedAt` 逐条写入
  - partial failure 行为
  - 不更新 `lastSyncedAt`

## Sync Target Driver Step 3 接手提醒
- 下一轮建议改：
  - `sync-import.ts`
  让远端 `items/` / `tombstones/` 的读取开始通过 driver。
- 当前仍先不要同时去改：
  - `sync-now.ts`
  这样可以把“导入行为是否不变”单独锁住。

## 2026-05-19 Sync Target Driver Step 4 当前有效状态

- 当前 `electron/sync-import.ts` 已开始使用 `SyncTargetDriver`
- 当前仍保留旧对外入口：
  - `importRemoteChangesFromSyncFolder(...)`
  - `applyRemoteSyncChanges(...)`
- 当前 import 层已改为：
  - 用 `driver.list(logicalPrefix)` 扫描远端 `items/` / `tombstones/`
  - 用 `driver.readText(logicalPath)` 读取远端 JSON
- 当前保持不变：
  - 远端 item / tombstone 扫描范围
  - JSON 校验
  - LWW 判断
  - 静默导入
  - partial failure 行为
  - 不更新 `lastSyncedAt`

## Sync Target Driver Step 4 接手提醒
- 下一轮建议改：
  - `sync-now.ts`
  让 `syncNow` 自身开始 resolve driver，而不是默认依赖 local folder helper。
- 当前仍先不要同时去扩：
  - OneDrive
  - 设置页“同步目标”UI
  先把 driver 迁移闭环做完更稳。

## 2026-05-19 Sync Target Driver Step 5 当前有效状态

- 当前 `electron/sync-now.ts` 已开始采用：
  - `target config`
  - `driver`
  的编排心智
- 当前仍只支持：
  - `localFolder`
- 当前 `syncNow` 现在会：
  - 从本机 sync state 读取 `syncTargetPath`
  - 包装成 `{ type: 'localFolder', path }`
  - resolve 出 `LocalFolderDriver`
  - 再继续走现有 local folder 的 prepare / lock / import / export 流程
- 当前也已补：
  - unsupported target type 返回明确 failed

## Sync Target Driver Step 5 接手提醒
- 下一轮如果继续推进，有两个方向可选：
  - 先补一轮更明确的 target-resolver / target-config 存储整理
  - 或开始进入 OneDrive 前的实现前文档和最小 target factory 收口
- 当前不建议立刻去碰：
  - LWW
  - 设置页“同步目标”UI
  - 自动同步

## 2026-05-19 OneDrive 实现前规格当前有效状态

- 当前已新增：
  - `docs/sync-onedrive-implementation-plan.md`
- 这份文档当前不是实现代码，而是工程规格拆解。
- 当前文档已经明确：
  - 不做 `J-Flow` 自有账号系统
  - 允许后续做第三方同步目标授权接入
  - 第一目标只做 `OneDrive`
  - 继续复用：
    - `items / tombstones / sync-info / locks / LWW / syncNow`
  - 需要后续更新：
    - `constraints.md`
    - target config schema
    - target resolver / driver factory
    - 设置页“同步目标”心智

## OneDrive 实现前规格接手提醒
- 下一轮如果继续 OneDrive，建议先做决策确认：
  - 是否正式放开 `constraints.md` 中“当前不做云同步”的表述
  - 是否接受第一目标只做 `OneDrive`
  - token 存储优先走系统安全存储还是先做开发期临时方案
- 在这些边界确认前，不建议直接开始写 OAuth 或 Graph API 代码。

## 2026-05-20 WebDAV POC 02 当前有效状态

- 当前 `webdav` 已正式进入本机同步目标类型体系：
  - `SyncTargetConfig` 已支持 `webdav`
- 当前 `LocalSyncState` 已新增：
  - `syncTargetConfig`
- 当前 `webdav target config` 会保存在：
  - 本机 `SQLite sync_meta`
- 当前应用密码不会进入：
  - `syncTargetConfig`
  - 同步目录
  - `items / tombstones`
  - JSON 备份

## WebDAV POC 02 当前已接通的能力

- 当前 main/preload/storage bridge 已提供：
  - `repository.sync.testWebdavTarget(config, password)`
  - `repository.sync.clearWebdavTarget()`
- 当前 `testWebdavTarget(...)` 会做：
  - `ensureDir(rootPath)`
  - 生成或复用 `sync-info.json`
  - 写入 `devices/<deviceId>.json`
  - `list(rootPath)`
- 当前测试成功后才会：
  - 保存 `webdav target config`
  - 保存对应 credential
- 当前测试失败时：
  - 不保存 password
  - 不覆盖旧 target config

## WebDAV POC 02 接手提醒

- 当前仍然不是完整同步：
  - 未接 `syncNow`
  - 未接 `items / tombstones`
  - 未跑 `LWW`
- 当前如果要继续推进，下一轮建议做：
  - `WebDAV SyncTargetDriver` 最小实现
  - 或 `sync-info / devices` POC 再往 `syncNow` 前收一层
- 当前仍先不要同时去改：
  - 设置页最终 UI
  - 自动同步
  - OneDrive

## 2026-05-20 WebDAV POC 03 当前有效状态

- 当前已新增正式：
  - `WebDAV SyncTargetDriver`
- 当前 driver 已具备：
  - `readText`
  - `writeText`
  - `delete`
  - `list`
  - `exists`
  - `ensureDir`
  - `safeWriteJson`
- 当前 driver 仍然只服务于 WebDAV POC，不接完整同步主链。

## WebDAV POC 03 当前关键实现点

- 当前 `WebDAV SyncTargetDriver` 继续使用 POSIX `logicalPath` 心智。
- 当前继续拒绝：
  - 反斜杠
  - 绝对路径
  - `../` 路径穿越
- 当前 driver 会通过：
  - `createWebdavDriverFromStoredCredential(...)`
  从本机 credential store 读取 password，再创建 low-level `WebDAV client`
- 当前不会把 password 暴露给 renderer，也不会把 password 放进 driver 对外返回值。

## WebDAV POC 03 接手提醒

- 当前仍未接入：
  - `syncNow`
  - `sync-export`
  - `sync-import`
- 当前如果继续推进，下一轮最自然的是：
  - 开始把 `webdav driver` 接到现有 sync core 的 metadata / import / export 入口
  - 或先做一轮更小的 `syncNow` 前接线计划
- 当前仍先不要同时去碰：
  - 设置页最终 UI
  - 自动同步
  - OneDrive

## 2026-05-20 WebDAV 接入 Sync Core 当前有效计划

- 当前已新增：
  - `docs/sync-webdav-core-integration-plan.md`
- 当前推荐顺序已经收口为：
  1. 先抽通用 metadata helper
  2. 先让 `localFolder` 回归同一套 helper
  3. 再让 `webdav` 跑 metadata helper
  4. 再接 `import / export`
  5. 最后再接 `syncNow`

## WebDAV 接入 Sync Core 接手提醒

- 下一轮如果开始改代码，建议第一步只动：
  - `sync-folder.ts`
  - 或新增通用 metadata helper
- 当前不建议直接跳到：
  - `syncNow`
  - 或完整 WebDAV 同步闭环
## 2026-05-21 - WebDAV import/export POC 状态

### 当前已完成

- `WebDAV low-level client`
- `WebDAV credential store`
- `WebDAV metadata POC`
- `WebDAV SyncTargetDriver`
- 通用 `sync metadata helper`
- `WebDAV target` 版 `sync-export` / `sync-import` 验证

### 当前确认有效

- `exportLocalChangesToSyncTarget(...)` 已可用，WebDAV target 可写：
  - `items/<entityDir>/<id>.json`
  - `tombstones/<entityDir>/<id>.json`
- `importRemoteChangesFromSyncTarget(...)` 已可用，WebDAV target 可读：
  - `items/`
  - `tombstones/`
- `LWW`、`partial failure`、`syncedAt`、`lastSyncedAt` 规则保持不变
- password 仍不进入返回值、同步目录、JSON 备份或日志

### 仍未开始

- `syncNow` 接入 WebDAV target
- 完整 WebDAV 同步闭环
- 设置页最终 WebDAV 同步 UI

### 下一步建议

- 下一轮再决定是否进入“WebDAV 接入 syncNow”阶段
- 如果继续保持小步走，优先把 `syncNow` 与 `webdav target config / driver` 的接线做成单独一轮

## 2026-05-21 - 设置页同步目标 UI 当前状态

### 当前已完成

- 设置页同步卡片已从“同步文件夹”升级为“同步目标”
- 当前支持两类目标：
  - 本地文件夹
  - 坚果云 `WebDAV`
- 当前设置页已接入：
  - 本地文件夹选择 / 更改 / 打开
  - 坚果云 `WebDAV` 测试并保存
  - 清除当前同步目标
  - 手动触发 `syncNow()`
  - 查看最近一次同步摘要 / 错误 / 警告 / backup 路径

### 当前关键行为

- 当前 `syncTargetConfig` 会通过 `repository.sync.getState()` 返回给 renderer
- 当前设置页优先按：
  - `syncTargetConfig`
  - 旧 `syncTargetPath`
  来判断实际启用中的目标
- 当前切换目标时，UI 会先清理另一侧旧入口，避免：
  - `webdav config` 与旧 `localFolder path` 同时残留
- 坚果云 `WebDAV` password：
  - 不进入 `syncTargetConfig`
  - 不回显
  - 只通过 `testWebdavTarget(config, password)` 进入 main 侧保存

### 当前仍未做

- 自动同步 / 后台同步
- `OneDrive` 目标 UI
- 更复杂的目标管理页

### 如果继续推进

- 下一轮优先做人工点检和轻微文案 / 交互微调
- 如果 UI 稳定，再考虑是否需要补轻量 renderer 级测试

## 2026-05-22 - 坚果云 WebDAV 根目录 MKCOL 503 修复

### 当前已修复

- 设置页实测中，坚果云根目录已存在时，偶发会在：
  - `prepare-target`
  - `MKCOL logicalPath=. status=503`
  卡住
- 当前已在 [electron/webdav/client.ts](./electron/webdav/client.ts) 中增强：
  - `ensureDir(...)`
- 当前根目录存在性判断顺序是：
  - `exists(...)`
  - 对瞬时错误重试一次
  - 根目录场景额外尝试 `list('')`
- 只要根目录实际上已经可列，就不会再继续发 `MKCOL`

### 当前验证

- `electron/webdav/client.test.ts`
- `electron/webdav/metadata-poc.test.ts`
- `electron/webdav/service.test.ts`
- `electron/sync-target/metadata.test.ts`
- `electron/sync-now.test.ts`

都已通过。

### 你接手时需要知道

- 这轮还没有改：
  - `syncNow` 规则
  - `LWW`
  - 设置页主交互逻辑
- 当前最关键的下一步是：
  - 重新跑一次 `corepack pnpm run test:webdav:manual`
  - 确认真实坚果云下不再卡在根目录 `MKCOL 503`

## 2026-05-22 - 坚果云已存在子目录 MKCOL 503 修复

### 当前已修复

- Electron 设置页实测里，坚果云对已存在子目录也可能返回：
  - `WebDAV 创建目录失败：503 operation=MKCOL logicalPath=tombstones/activityTypes status=503`
- 当前 `WebDAV ensureDir(...)` 已补强为：
  - 根目录通过 `list('')` 兜底判断存在
  - 子目录通过 `list(parent)` 兜底判断存在
- 只要远端父目录可列，且目标子目录条目已存在，就不会继续发 `MKCOL`

### 当前测试已覆盖

- 根目录两次 `PROPFIND` 瞬时失败后，通过 `list('')` 认定存在
- 已存在子目录在 `exists(...)` 不稳定时，通过 `list(parent)` 认定存在
- 相关测试：
  - `electron/webdav/client.test.ts`
  - `electron/webdav/metadata-poc.test.ts`
  - `electron/webdav/service.test.ts`
  - `electron/sync-target/metadata.test.ts`
  - `electron/sync-now.test.ts`

### 当前下一步

- 回到 Electron 设置页再做一次真实坚果云手动同步
- 重点观察是否还会出现：
  - `logicalPath=.`
  - `logicalPath=tombstones/activityTypes`
  的 `MKCOL 503`
