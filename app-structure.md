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

---

## 二、Electron 分层

### 1. Main Process
职责：
- 创建应用窗口
- 管理应用生命周期
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
  - 检查同步文件夹路径
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

当前 `Sync 5 UI` 已补入的设置页薄接入：
- 设置页 `数据与同步` 区域已收口为一张同步卡片
- 当前卡片包含：
  - 标题区
  - 状态区
  - 同步文件夹区
  - 最近结果区
  - 主操作区
  - 详情折叠区
- 当前设置页仅承担：
  - 选择同步文件夹
  - 打开同步文件夹
  - 更改同步文件夹
  - 手动触发 `syncNow()`
  - 查看最近一次同步摘要与技术详情
- 当前仍不承担：
  - 自动同步
  - 后台同步
  - 复杂同步中心

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
