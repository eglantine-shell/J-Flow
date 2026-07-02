# 应用结构文档

本文档定义当前 `J-Flow V3 Desktop` 的推荐结构、页面组织与进程分工。

说明：
- 当前主线为桌面版
- 当前桌面版采用 Electron 跨平台方向，macOS 优先开发
- 当前 `V3.4 Windows Compatibility` 已开始，目标是在现有 Electron Desktop 基础上新增 Windows target
- 网页端仍保留，但不再作为新增功能主战场
- 若结构表述与产品规则冲突，以 `product-rules.md` 为准

---

## 一、整体结构

J-Flow 接下来采用“一套业务 UI，两种运行壳”的结构：
- `Web shell`
  - 保留 V2 网页端构建与试用
- `Desktop shell`
  - 新增 Electron 跨平台桌面壳
  - 第一阶段优先在 macOS 跑通
  - 当前继续保留 macOS 能力，同时新增 Windows 打包与路径适配

推荐目标是尽量复用：
- React 页面
- 路由
- 视图组件
- 状态管理
- 校验逻辑

尽量隔离差异：
- 文件系统
- 本地数据库
- 导入 / 导出
- 备份
- 桌面系统能力

### 1.1 V2.4D 真实 UI 教学态结构
- 真实 UI 教学态属于 renderer 侧 UI 能力，不属于 Electron main / preload 桌面能力。
- 教学态应由前端 fixture / view model 提供独立 demo 数据。
- 教学态必须复用真实页面视觉与组件，不应调用真实 repository 写入路径。
- 教学栏放在底部独立 rail 中，真实 UI 内容区为 rail 让位。
- 桌面端进入教学态时，renderer 通过受控 preload bridge 请求 main process 将窗口高度调整到当前屏幕可用最大高度。
- 窗口扩高不进入全屏，不直接暴露窗口对象给 renderer。
- 当前步骤控制高亮目标区域，高亮框内亮度提高，框外区域压暗。
- 教学步骤可展示首页、种草清单、设置页、日志等关键区域，但展示数据应来自 demo 数据而非用户真实数据。

---

## 二、Electron 分层

### 1. Main Process
职责：
- 创建应用窗口
- 管理应用生命周期
- 管理托盘 / 状态栏常驻能力
- 管理日切协调：
  - 补昨天日志
  - 准备今天状态
- 定位默认数据目录
- 管理数据库连接
- 执行导入 / 导出
- 执行自动备份
- 打开数据文件夹
- 暴露未来同步入口

当前第一轮实际已落地：
- `electron/main.ts`
- 创建最小桌面窗口
- 开启 `contextIsolation`
- 关闭 `nodeIntegration`
- 当前已扩展为：
  - `app:get-info`
  - `app:get-data-path`
  - `app:get-storage-info`
  - 桌面导入 / 导出
  - 自动备份
  - SQLite repository / app-data service

当前 `V3.4` 相关结论：
- 数据目录统一通过 `app.getPath('userData')`
- SQLite 主库统一通过 `path.join(dataPath, 'j-flow.sqlite3')`
- 自动备份目录统一通过 `path.join(dataPath, 'backups')`
- 打开目录、导入、导出均继续走 Electron 跨平台 API，不写死 macOS 路径
- 当前桌面壳层允许：
  - 关闭窗口后应用继续常驻
  - Windows 通过托盘恢复与退出
  - macOS 通过应用激活重新显示主窗口

### 2. Preload
职责：
- 向 renderer 暴露安全、受控的桌面 API
- 作为桌面能力桥接层

当前第一轮实际已落地：
- `electron/preload.cts`
- 暴露 `window.jflowDesktop`
- 仅包含：
  - `getAppInfo()`
  - `getDataPath()`

当前 `Sync 1` 已补入的 bridge 基础：
- `repository.sync.getState()`
- `repository.sync.listChanges()`
- 仅用于读取本机同步元数据与本地待同步变化
- 当前不包含同步文件夹选择、同步目录初始化或立即同步能力

当前 `Sync 2` 已补入的 bridge 基础：
- `repository.sync.chooseTargetPath()`
- `repository.sync.setTargetPath(path)`
- `repository.sync.clearTargetPath()`
- `repository.sync.testTargetPath(path?)`
- 当前已支持：
  - 保存同步文件夹路径
  - 读取本机同步状态
  - 测试目录可读写
  - 初始化 `J-Flow Sync` 目录骨架
  - 读写 `sync-info.json`
  - 写入 `devices/<deviceId>.json`
- 当前仍未支持：
  - `items/` 导出
  - `tombstones/` 导出
  - 立即同步
  - 远端合并

当前 `Sync 3` 已补入的 bridge 基础：
- `repository.sync.exportLocalChanges()`
- 当前仅负责：
  - 读取本地 `sync_changes` 中 `syncedAt IS NULL` 的记录
  - `upsert -> items/<entityDir>/<id>.json`
  - `delete -> tombstones/<entityDir>/<id>.json`
  - 单条写入成功后回写对应 `sync_changes.syncedAt`
- 当前仍不负责：
  - 读取远端 `items/`
  - 读取远端 `tombstones/`
  - 冲突处理
  - 完整“立即同步”闭环

当前 `Sync 4` 已补入的 bridge 基础：
- `repository.sync.importRemoteChanges()`
- 当前仅负责：
  - 读取远端 `items/`
  - 读取远端 `tombstones/`
  - 校验远端 JSON
  - 按第一版 `last-write-wins` 合并到本地 SQLite
  - 通过静默写入路径避免污染本地待上送 `sync_changes`
- 当前仍不负责：
  - 完整“立即同步”按钮
  - 自动同步
  - 人工冲突选择
  - `lastSyncedAt` 更新

当前 `Sync 5` 已补入的 bridge 基础：
- `repository.sync.syncNow()`
- 当前会按顺序编排：
  - 读取本机同步状态
  - resolve 同步目标配置
  - 创建对应 `SyncTargetDriver`
  - 准备同步目录
  - 获取最小锁
  - 创建本地自动备份
  - 导入远端变化
  - 导出本地变化
  - 汇总结果
  - 仅在全链路完全成功时写本机 `lastSyncedAt`
  - 仅在全链路完全成功时更新 `devices/<deviceId>.json.lastSyncedAt`
- 当前仍不负责：
  - 设置页“立即同步”按钮 UI
  - 自动同步
  - 人工冲突选择
  - 字段级合并

当前 `Sync UI` 已升级为“同步目标”卡片：
- 设置页 `数据与同步` 区域当前包含一张同步目标卡片
- 当前卡片包含：
  - 标题区
  - 状态区
  - 同步目标信息区
  - 最近结果区
  - 主操作区
  - 详情折叠区
- 当前设置页支持：
  - 本地文件夹同步目标
  - 本地文件夹选择 / 更改 / 打开
  - 清除当前同步文件夹
  - 手动触发 `syncNow()`
  - 查看最近一次同步摘要与技术详情
- 当前仍不承担：
  - 后台同步
  - 复杂同步中心

当前 `syncNow` 已完成的编排升级：
- `syncNow` 当前已支持：
  - `localFolder`
- 当前 resolve 规则：
  - 优先使用 `syncTargetConfig`
  - 若缺失则兼容旧 `syncTargetPath`
- 当前 `syncNow` 已统一走：
  - `prepareSyncTarget(driver, ...)`
  - `acquireSyncLock(driver, ...)`
  - `importRemoteChangesFromSyncTarget(...)`
  - `exportLocalChangesToSyncTarget(...)`
  - `updateDeviceInfo(driver, ...)`
  - `releaseSyncLock(driver, ...)`
- 当前主进程已接入最小自动同步：
  - app ready 后延迟一次
  - window focus 时一次
  - 30s 去抖
  - 若当前已有同步进行中则跳过
  - 若未配置同步目标则跳过
  - 自动同步与手动同步共用同一条执行中的 promise，避免并发重入
- 当前主进程已进一步接入最小后台日切：
  - 在 startup / focus / 手动同步完成后
  - 优先同步导入（若有同步目标）
  - 再补昨天日志
  - 再准备今天状态：
    - 今日重复事项生成
    - 今日未完成事项顺延
  - 通过本地元数据避免同一天重复整天结算
- 当前仍未接入：
  - 自动同步设置
  - `OneDrive`
  - 复杂同步目标管理

当前 `Sync Target Driver Step 1` 已补入的底层目录准备：
- 新增：
  - `electron/sync-target/types.ts`
  - `electron/sync-target/local-folder-driver.ts`
  - `electron/sync-target/index.ts`
- 当前仅新增：
  - `SyncTargetDriver` 类型草案
  - `LocalFolderDriver` 的本地文件能力
- 当前仍未切换：
  - `sync-folder.ts`
  - `sync-export.ts`
  - `sync-import.ts`
  - `sync-now.ts`
  到 driver 注入模式
- 当前这一层只负责：
  - `logicalPath -> 本地真实路径` 映射
  - 本地文本读写
  - 本地目录确保
  - 本地 JSON 安全写入
  - 本地目录列表读取
  - 路径穿越防护

当前 `Sync Target Driver Step 2` 已开始接入的本地 metadata 层：
- 新增：
  - `electron/sync-target/metadata.ts`
- 当前已抽出可复用的协议层 helper：
  - `prepareSyncTarget(driver, ...)`
  - `readSyncInfo(driver)`
  - `writeSyncInfo(driver, ...)`
  - `touchSyncInfo(driver, ...)`
  - `updateDeviceInfo(driver, ...)`
  - `acquireSyncLock(driver, ...)`
  - `releaseSyncLock(driver, ...)`
- `electron/sync-folder.ts` 当前已开始在内部创建 `LocalFolderDriver`
- 当前已通过 driver 承接：
  - 同步目录结构 ensure
  - `sync-info.json` 读写
  - `devices/<deviceId>.json` 写入
  - `locks/` 读写
  - 本地目录读写测试中的临时文件往返
- 当前 `sync-folder.ts` 的定位已经进一步收口为：
  - local folder 路径校验
  - 旧 API 兼容包装层
  - 本地真实路径 helper
- 当前仍未切换：
  - `sync-export.ts`
  - `sync-import.ts`
  - `sync-now.ts`
  到直接依赖 driver

当前 `Sync Target Driver Step 3` 已开始接入的本地导出层：
- `electron/sync-export.ts` 当前已开始使用 `SyncTargetDriver`
- 当前已保持：
  - 读取本地 pending `sync_changes`
  - `upsert -> items/<entityDir>/<id>.json`
  - `delete -> tombstones/<entityDir>/<id>.json`
  - 单条成功后写 `syncedAt`
  - partial failure 行为不变
- 当前变化仅在底层写入方式：
  - 不再在 export 层直接拼真实磁盘路径写文件
  - 改为生成 `logicalPath` 并调用 `driver.safeWriteJson(...)`

当前 `Sync Target Driver Step 4` 已开始接入的本地导入层：
- `electron/sync-import.ts` 当前已开始使用 `SyncTargetDriver`
- 当前已保持：
  - 远端 `items/` 扫描范围不变
  - 远端 `tombstones/` 扫描范围不变
  - JSON 校验规则不变
  - LWW 行为不变
  - 静默导入不污染本地待上送 `sync_changes`
- 当前变化仅在底层读取方式：
  - 不再在 import 层直接扫描本地目录和读取真实文件路径
  - 改为使用 `driver.list(logicalPrefix)` 和 `driver.readText(logicalPath)`

当前 `Sync Target Driver Step 5` 已开始接入的同步编排层：
- `electron/sync-now.ts` 当前已开始采用：
  - `sync target config`
  - `SyncTargetDriver`
  的心智
- 当前仍只支持：
  - `localFolder`
- 当前 `syncNow` 会：
  - 继续从本机 sync state 读取 `syncTargetPath`
  - 将其包装为 `{ type: 'localFolder', path }`
  - resolve 为 `LocalFolderDriver`
  - 再桥接回当前 local folder 的 prepare / lock / import / export 编排
- 当前保持不变：
  - `syncNow` 执行顺序
  - success / partial / failed 判定
  - `lastSyncedAt` 写入规则
  - local folder sync 用户行为

当前 `WebDAV POC 01` 已补入的远端低层能力：
- 新增：
  - `electron/webdav/types.ts`
  - `electron/webdav/credentials.ts`
  - `electron/webdav/client.ts`
  - `electron/webdav/poc.ts`
- 当前仅负责：
  - WebDAV 基础类型
  - 本机凭据隔离存储
  - `GET / PUT / DELETE / MKCOL / PROPFIND`
  - `runWebdavPocTest(...)`
- 当前仍不负责：
  - `SyncTargetDriver` 正式 `webdav` driver
  - `sync-info.json / devices` 正式 metadata 接入
  - `syncNow` 编排
  - 设置页 UI
  - `items / tombstones` 同步

当前 `WebDAV POC 02` 已补入的受控入口与 metadata 级验证：
- 新增：
  - `electron/webdav/service.ts`
- 当前 main/preload / storage bridge 已增加：
  - `repository.sync.testWebdavTarget(config, password)`
  - `repository.sync.clearWebdavTarget()`
- 当前会在测试成功后：
  - 将 `webdav` target config 保存到本机 `SQLite sync_meta`
  - 将应用密码保存到 `Electron safeStorage + 本机隔离文件`
- 当前 metadata 级验证会复用现有同步文件结构规则：
  - `sync-info.json`
  - `devices/<deviceId>.json`
- 当前仍不负责：
  - `syncNow` 正式接入
  - `items / tombstones`
  - `LWW`
  - 设置页最终 UI

当前 `WebDAV POC 03` 已补入正式 driver：
- 新增：
  - `electron/sync-target/webdav-driver.ts`
- 当前 `WebDAV SyncTargetDriver` 已实现：
  - `readText`
  - `writeText`
  - `delete`
  - `list`
  - `exists`
  - `ensureDir`
  - `safeWriteJson`
- 当前 driver 行为特点：
  - 继续使用 POSIX `logicalPath`
  - 继续拒绝反斜杠、绝对路径、`../` 路径穿越
  - 通过本机 credential store 读取 password 后，包装现有 low-level `WebDAV client`
- 当前仍不负责：
  - 接入 `syncNow`
  - 接入 `sync-export / sync-import`
  - 跑完整同步

当前 `WebDAV metadata POC` 已开始跑通通用 metadata helper：
- 当前 `repository.sync.testWebdavTarget(...)` 已改为：
  - 通过 `WebDAV SyncTargetDriver`
  - 调用通用 metadata helper
  - 验证：
    - `prepareSyncTarget(driver, ...)`
    - `sync-info.json`
    - `devices/<deviceId>.json`
    - `locks/`
- 当前保持不变：
  - metadata 文件格式
  - lock 语义
  - 不接 `syncNow`
  - 不接 `items / tombstones`

建议暴露能力示例：
- `getAppInfo`
- `getDataDirectory`
- `openDataDirectory`
- `exportJsonBackup`
- `importJsonBackup`
- `selectCustomDataDirectory`
- `todoRepository`
- `grassRepository`

### 3. Renderer
职责：
- 承载现有 React 应用
- 负责页面、交互、路由、状态管理、表单与展示
- 通过 bridge 调用桌面能力

---

## 三、目录结构建议

推荐后续目录方向：

```text
/
  electron/
    main/
      index.ts
      window.ts
      app-paths.ts
      backup-service.ts
      import-export.ts
      sqlite/
        index.ts
        migrations/
    preload/
      index.ts
      api.ts
  src/
    app/
    pages/
      home/
      grass-list/
      settings/
    features/
      todo/
      grass/
      calendar-jump/
      repeat-rule/
    shared/
    storage/
      interfaces/
      web/
      desktop/
```

原则：
- Electron 相关代码与 React renderer 分离
- 存储 adapter 分离
- 业务 UI 尽量不直接感知 Electron

当前第一轮实际目录：

```text
/
  electron/
    main.ts
    preload.cts
    tsconfig.json
```

---

## 四、路由与页面结构

### 1. 桌面端推荐页面
- 今日 / 日期页
- 种草清单页
- 日志页
- 设置页

### 2. 主页面
主页面继续以 Todo 为主体，包含：
- 顶部工具区
- 日期区
- Todo 区
- 底部轻量种草区

### 3. 种草清单页
独立页面承担：
- 查看已保存种草项
- 筛选
- 编辑
- 删除
- 归档
- 添加到今日 Todo

### 4. 设置页
承担：
- 数据导入 / 导出
- 数据目录管理
- 主库文件说明
- 打开数据文件夹
- 自动备份设置
- 分类 / 场景管理
- 本地文件夹同步入口
  - 选择同步文件夹
  - 测试同步文件夹
  - 清除同步文件夹路径

---

## 五、桌面端导航建议

当前更适合桌面版的方向是：
- 左侧 Sidebar + 右侧 workspace

原因：
- 日期切换、月历和主导航都需要长期常驻
- Todo 仍是主页面，但独立页已经不止两个
- 桌面端长期打开时，侧栏心智更稳定

当前不优先：
- 底部导航
  - 更偏移动端心智
- 回到只有顶部轻导航的结构
  - 已不足以承接当前 Desktop 版本的信息密度

建议 Sidebar 包含：
- 今日
- 种草清单
- 日志
- 设置

当前第一轮已落地：
- Sidebar 已支持：
  - 今日
  - 种草清单
  - 日志
  - 设置

若保留主页种草清单入口，可在种草区标题附近提供：
- “查看种草清单”按钮
- 或列表 icon 跳转入口

---

## 六、Todo 与种草页面关系

### 1. 主页面保留种草区
- 主页底部保留种草输入入口
- 继续支持：
  - 展开 / 收起种草区
  - 保存当前种草

### 2. 主页不再承载完整种草清单浏览
- 原“展开 / 收起种草清单”不再用于在主页中展开完整列表
- 改为跳转到独立种草清单页更合适

当前第一轮已落地：
- 主页原列表按钮改为跳转到独立种草清单页
- 独立页当前直接承接 `TemplateManagerPanel`

### 3. Todo 页面调用种草清单
- Todo 添加入口中仍支持：
  - 从种草中选择
  - 推荐拔草
- 数据来源与独立种草清单页面共享同一套存储

---

## 七、桌面端与网页端复用策略

### 1. 继续保留网页端构建能力
- 网页端仍可运行与构建
- 桌面端新增独立启动与打包命令
- 当前已验证：
  - `pnpm run dev`
  - `pnpm run build`
  - `pnpm run dev:desktop`
  - `pnpm run build:desktop`
  - `pnpm run lint`

### 2. 共用部分
- 页面组件
- 业务规则
- 路由定义的大部分结构
- 表单校验
- 视图模型

### 3. 平台差异部分
- 本地数据库
- 用户数据目录
- 打开目录能力
- 原生文件对话框
- 打包目标

### 4. 当前 Windows 目标
- 第一轮仅新增 `portable` 打包目标
- 不改变现有 Web shell
- 不替换现有 macOS Desktop shell
- 不新增 Windows 专属业务分支
- 2026-05-02 已在 macOS 环境下产出第一版 Windows `portable` 包，但当前仍待 Windows 真机排查启动问题

Windows 数据安全要求：
- 用户数据不放在打包产物目录
- Windows 下统一写入 Electron `userData`
- 推荐通过 JSON 导出 / 导入做跨平台迁移
- 不建议直接复制 SQLite 主库跨平台迁移
- 文件系统
- 数据目录
- 自动备份
- 打开文件夹

### 4. 当前桌面数据目录口径
- 设置页中展示的“桌面数据目录”指 Electron `userData` 目录。
- 当前 SQLite 运行时主库文件位于该目录下：
  - `j-flow.sqlite3`
- 自动备份位于该目录下：
  - `backups/`
- 手动导出 / 导入使用系统文件对话框：
  - 默认从数据目录起步
  - 但导出的 JSON 文件并不强制写回数据目录

---

## 八、开发与打包命令建议

推荐命令设计：
- `pnpm run dev`
  - 网页端开发
  - 默认端口：`5173`
- `pnpm run build`
  - 网页端构建
- `pnpm run build:web`
  - 网页端构建
- `pnpm run build:electron`
  - 编译 Electron 主进程与 preload
- `pnpm run dev:desktop`
  - Electron + Vite 开发
  - Desktop renderer 默认端口：`4173`
- `pnpm run build:desktop`
  - 桌面端构建
- `pnpm run package:win`
  - Windows 打包

当前 dev 链路说明：
- Electron dev URL：
  - `http://localhost:4173/J-Flow/`
- `wait-on` 等待真实页面可访问后再启动 Electron。
- `loadURL` 已增加基础错误处理。
## WebDAV POC 分层（当前状态）

- `electron/webdav/client.ts`
  - WebDAV 低层 HTTP 能力
  - 负责 `GET / PUT / DELETE / MKCOL / PROPFIND`
- `electron/webdav/credentials.ts`
  - WebDAV 凭据本机保存与删除
- `electron/webdav/metadata-poc.ts`
  - 只验证 WebDAV target 上的 metadata 结构：
    - `sync-info.json`
    - `devices/<deviceId>.json`
    - `locks/`
- `electron/webdav/import-export-poc.ts`
  - 只验证 WebDAV target 上的 `items/` 与 `tombstones/` 读写
  - 复用现有 target 版：
    - `exportLocalChangesToSyncTarget(...)`
    - `importRemoteChangesFromSyncTarget(...)`
- `electron/sync-target/webdav-driver.ts`
  - `SyncTargetDriver` 的 WebDAV 实现

### 当前边界

- WebDAV target 已能跑：
  - metadata helper
  - target 版 import/export
  - `syncNow`
- 仍未接：
  - 设置页最终 WebDAV 同步 UI
  - 自动同步 / 后台同步

### WebDAV dev-only 手动测试入口

- 当前已新增：
  - `scripts/test-webdav-sync.mjs`
- 当前命令：
  - `corepack pnpm run test:webdav:manual`
- 当前定位：
  - 仅用于本机真实坚果云验证
  - 不属于正式产品 UI
  - 不替代设置页同步目标配置流程
