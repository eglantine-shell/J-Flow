# J-Flow Sync Target Driver 设计（草案）

## 文档定位

这份文档只讨论一件事：

- 如何把当前 Sync 2-5 中写死的“本地同步文件夹”抽象成 `sync target driver`

本文档不做：

- OneDrive OAuth 细节
- Microsoft Graph API 细节
- UI 改造细节
- 同步规则改写

它的目标是为后续两类 target 做准备：

- `localFolder` driver
- `oneDriveAppFolder` driver

同步协议层继续复用：

- `sync-info.json`
- `devices/`
- `items/`
- `tombstones/`
- `locks/`
- `last-write-wins`
- `importRemoteChanges`
- `exportLocalChanges`
- `syncNow`

---

## 一、目标

当前 `J-Flow` 的同步已经完成了两层：

1. 同步协议层  
   例如：
   - `items/`
   - `tombstones/`
   - `sync-info.json`
   - `devices/`
   - `locks/`

2. 同步行为层  
   例如：
   - 本地变化导出
   - 远端变化导入
   - `last-write-wins`
   - 手动同步闭环

但底层“文件放在哪里、怎么读写”目前仍然写死为：

- 本地目录
- `node:fs/promises`

这会带来一个问题：

- 如果未来要支持 OneDrive App Folder，就需要把底层文件访问逻辑整体再拆一轮

因此最优先的下一步，不是直接写 OneDrive，而是：

- 先抽象 `SyncTargetDriver`
- 先把当前 local folder sync 变成第一个 driver

这样后续新增 OneDrive target 时，改的是 driver，而不是重写同步核心。

---

## 二、Driver Interface 草案

### 1. 核心接口建议

建议抽出一个 TypeScript 风格的接口：

```ts
type SyncTargetEntry = {
  logicalPath: string
  kind: 'file' | 'directory'
  updatedAt?: string
  size?: number
}

type SyncTargetDriver = {
  readText(logicalPath: string): Promise<string>
  writeText(logicalPath: string, content: string): Promise<void>
  delete(logicalPath: string): Promise<void>
  list(logicalPrefix: string): Promise<SyncTargetEntry[]>
  exists(logicalPath: string): Promise<boolean>
  ensureDir(logicalPath: string): Promise<void>
  safeWriteJson(logicalPath: string, data: unknown): Promise<void>
}
```

这不是最终唯一形式，但方向建议保持：

- 同步核心只依赖逻辑路径
- 不直接依赖真实磁盘路径
- 不直接依赖 `fs`

### 2. `logicalPath` 约定

建议统一使用 POSIX 风格：

- `sync-info.json`
- `devices/<deviceId>.json`
- `items/dayPlanItems/x.json`
- `tombstones/dayPlanItems/x.json`
- `locks/sync_<deviceId>.json`

也就是：

- 一律使用 `/`
- 不在同步核心里出现 Windows `\`
- 不在同步核心里拼真实绝对路径

### 3. localFolder driver 的职责

`localFolder` driver 负责把：

- `items/dayPlanItems/x.json`

映射到真实磁盘路径，例如：

- `/Users/.../J-Flow Sync/items/dayPlanItems/x.json`

换句话说：

- 同步核心只知道逻辑路径
- `localFolder` driver 负责路径拼接和 `fs` 访问

### 4. oneDrive driver 的职责

`oneDriveAppFolder` driver 负责把：

- `items/dayPlanItems/x.json`

映射到 OneDrive App Folder 内的相对路径，例如：

- `Apps/J-Flow/items/dayPlanItems/x.json`

换句话说：

- 同步核心仍只知道逻辑路径
- `oneDriveAppFolder` driver 负责把这些路径翻译成 Graph API 调用

### 5. `safeWriteJson()`

建议保留这个抽象，而不要把 JSON 原子写逻辑散落在同步核心里。

原因：

- `localFolder` 需要 `.tmp -> rename`
- `oneDriveAppFolder` 未来不一定有“本地原子 rename”语义

因此：

- 同步核心只调用 `safeWriteJson()`
- driver 决定如何实现“尽量安全”的写入

---

## 三、现有文件如何迁移

这一节的目标不是给出代码，而是提前看清现有模块将来该怎么拆。

### 1. `electron/sync-folder.ts`

当前职责：

- 路径校验
- 本地目录初始化
- `sync-info.json` 读写
- `devices/<deviceId>.json` 读写
- 本地 JSON 安全写入
- 本地锁文件读写

当前问题：

- 它深度依赖本地磁盘路径和 `fs`
- 同步核心很多地方现在都要经过它

未来建议：

- 它不再是“所有同步目标共用的工具文件”
- 更适合演变成：
  - `LocalFolderDriver`
  - 或 `local folder adapter`

应迁出的逻辑：

- `safeWriteJsonAtomic`
- 目录 ensure
- `sync-info.json` 本地读写
- `devices/` 本地读写
- `locks/` 本地读写

保留在“协议层”的应是：

- `sync-info.json` 的字段规则
- `devices/<deviceId>.json` 的结构规则
- `locks/` 的最小语义规则

### 2. `electron/sync-export.ts`

当前职责：

- 读取本地 `sync_changes`
- 读取本地实体正文
- 写出 `items/` 或 `tombstones/`
- 成功后更新 `syncedAt`

当前问题：

- 写文件时直接依赖本地目录 helper

未来建议：

- `sync-export` 不应关心底层是 local folder 还是 OneDrive
- 应只关心：
  - 要写哪个 `logicalPath`
  - 要写什么 JSON

也就是说，未来应改成：

- 接受一个 `SyncTargetDriver`
- 调 `driver.safeWriteJson(logicalPath, payload)`

### 3. `electron/sync-import.ts`

当前职责：

- 扫描远端 `items/`
- 扫描远端 `tombstones/`
- 读取 JSON
- 校验 JSON
- 做 LWW
- 应用到本地 SQLite

当前问题：

- 目录扫描和文件读取直接依赖本地目录

未来建议：

- `sync-import` 不应关心底层是 local folder 还是 OneDrive
- 它应只关心：
  - 从 driver 拿到逻辑路径列表
  - 读取这些逻辑路径的文本内容
  - 再做 JSON 校验和 LWW

也就是说，未来应改成：

- `driver.list('items/dayPlanItems')`
- `driver.readText('items/dayPlanItems/x.json')`

### 4. `electron/sync-now.ts`

当前职责：

- 检查同步目标路径
- 准备同步目录
- 获取锁
- 自动备份
- import
- export
- 成功后写 `lastSyncedAt`

当前问题：

- 它现在虽然像“编排层”，但编排前置仍然默认目标是本地目录

未来建议：

- `sync-now` 不应关心底层是 local folder 还是 OneDrive
- 它应只关心：
  - 当前使用哪个 target
  - 拿到哪个 driver
  - 编排 import / export / backup / lock / metadata

也就是说，未来应改成：

- `resolveSyncTargetDriver(config)`
- `runManualSync({ driver, ... })`

---

## 四、Target Config 设计

建议把同步目标配置从“一个路径”升级成一个 discriminated union。

```ts
type SyncTargetType = 'localFolder' | 'oneDriveAppFolder'

type SyncTargetConfig =
  | {
      type: 'localFolder'
      path: string
    }
  | {
      type: 'oneDriveAppFolder'
      accountId: string
      displayName?: string
    }
```

### 1. `localFolder`

说明：

- `path` 是本机路径
- 不参与跨设备同步
- 不应出现在同步目录内容中

### 2. `oneDriveAppFolder`

说明：

- `accountId` 是本机保存的 OneDrive 账号标识
- `displayName` 用于设置页显示
- token 不在这里
- token 不进入同步数据

### 3. 本机存储原则

建议：

- `SyncTargetConfig` 只保存在本机
- 不进 `items/`
- 不进 `tombstones/`
- 不进共享同步目录

原因：

- 每台设备自己的目标配置、授权状态和 token 都是本机私有信息

### 4. Web 端边界

当前建议继续保持：

- Web 端不参与同步
- `SyncTargetConfig` 只对 Desktop 生效

---

## 五、设置页未来心智

当前设置页的心智还是：

- “同步文件夹”

如果未来支持 OneDrive，设置页应升级为：

- “同步目标”

建议未来目标类型至少有：

- 本地文件夹
- OneDrive

对应心智应变成：

- 本地文件夹：用户选择一个目录
- OneDrive：用户连接一个云目标

这一步非常重要，因为它能避免用户误解：

- 现在不是“只能选一个本地路径”
- 而是在选择“同步存储目标”

但这轮只做文档，不实现 UI。

---

## 六、实现顺序建议

推荐顺序如下。

### 1. 新增 driver interface

先把同步核心需要的文件读写能力抽成统一接口。

### 2. 实现 `LocalFolderDriver`

先用它完整适配当前本地同步目录能力。

目标是：

- 不改变当前用户行为
- 只是把底层实现换成 driver

### 3. 把 `sync-folder / sync-export / sync-import / sync-now` 改为通过 driver 读写

原则：

- `sync-export` 不关心底层是不是本地目录
- `sync-import` 不关心底层是不是本地目录
- `sync-now` 不关心底层是不是本地目录

### 4. 保证现有 local folder sync 行为不变

这一阶段最重要的目标不是“新功能”，而是：

- 行为不变
- 数据格式不变
- 测试继续通过

### 5. 保证 Sync 1-5 现有测试仍通过

driver 重构不应该改变：

- `sync-info.json`
- `devices/`
- `items/`
- `tombstones/`
- `syncNow`
- `last-write-wins`

### 6. 再进入 OneDrive OAuth 设计

等 driver 层稳定后，再开始补：

- 浏览器授权
- localhost 回调
- token 获取与刷新

### 7. 再进入 OneDrive driver 最小读写

最后才开始：

- 用 OneDrive App Folder 读写 `sync-info.json`
- 再逐步接 `items/`、`tombstones/`、`locks/`

---

## 七、本轮明确不做什么

这轮只做设计文档，不做下面这些事：

- 不写 OneDrive OAuth
- 不写 Microsoft Graph API
- 不改现有同步代码
- 不改设置页 UI
- 不改 `last-write-wins`
- 不改 `syncNow` 行为
- 不做自动同步
- 不做 WebDAV

---

## 八、迁移风险

### 1. 当前代码里“路径”和“协议”混在一起

现在很多模块同时处理：

- 逻辑路径
- 真实磁盘路径
- JSON 结构
- 同步行为

抽 driver 时，最容易出现的风险是：

- 一边改路径层
- 一边不小心改了同步行为

所以重构时要特别强调：

- 先抽象
- 再迁移
- 不顺手改规则

### 2. `safeWriteJson` 的语义不能直接照搬到 OneDrive

本地文件夹有：

- `.tmp -> rename`

OneDrive App Folder 不一定有完全相同语义。

所以抽象时要把它定义成：

- “安全写入目标 JSON”

而不是：

- “一定使用本地 rename”

### 3. 锁机制未来会是第一批差异点

当前 `locks/` 是本地目录语义。

未来 OneDrive 上的锁虽然仍可沿用“锁文件”心智，但实现细节可能不同。

所以：

- 先保留锁协议
- 不要把当前本地文件锁实现直接当成云目标实现前提

---

## 九、当前建议

如果下一轮继续推进，我建议优先新增一份更偏工程拆解的任务文档，例如：

- `docs/sync-target-driver-implementation-plan.md`

重点拆：

- 现有 `sync-folder.ts` 里哪些函数先迁到 `LocalFolderDriver`
- 哪些 service 先改成注入 `driver`
- 哪些测试需要先改成以 `driver` 为中心的测试方式
