# J-Flow Sync Target Driver 实施计划（草案）

## 文档定位

这份文档只做一件事：

- 把 [docs/sync-target-driver-design.md](/Users/yetingzhi/Documents/GitHub/vibecoding/J-Flow/docs/sync-target-driver-design.md) 落成一份可执行的代码迁移计划

本轮不做：

- OneDrive OAuth
- Microsoft Graph API
- 现有同步逻辑改写
- 设置页 UI 改造
- 自动同步

它的目标是先把当前已经工作的 local folder sync 抽成第一个 driver，为后续 `oneDriveAppFolder` driver 做准备。

---

## 一、迁移目标

当前 Sync 2-5 已经跑通了这些能力：

- `sync-info.json`
- `devices/`
- `items/`
- `tombstones/`
- `locks/`
- `importRemoteChanges`
- `exportLocalChanges`
- `syncNow`
- `last-write-wins`

这轮 driver 迁移不应改变：

- 同步协议
- 同步文件内容格式
- LWW 规则
- `syncNow` 的执行顺序
- 设置页当前行为

这轮迁移唯一要做的是：

- 把底层“读写本地同步目录”的能力，从同步核心里抽离成 `LocalFolderDriver`

---

## 二、建议新增文件

推荐先新增以下文件：

```text
electron/
  sync-target/
    types.ts
    local-folder-driver.ts
    index.ts
```

### 1. `electron/sync-target/types.ts`

职责：

- 定义 `SyncTargetDriver`
- 定义 `SyncTargetEntry`
- 定义 `SyncTargetType`
- 定义 `SyncTargetConfig`

建议内容：

```ts
export type SyncTargetType = 'localFolder' | 'oneDriveAppFolder'

export type SyncTargetConfig =
  | { type: 'localFolder'; path: string }
  | { type: 'oneDriveAppFolder'; accountId: string; displayName?: string }

export type SyncTargetEntry = {
  logicalPath: string
  kind: 'file' | 'directory'
  updatedAt?: string
  size?: number
}

export type SyncTargetDriver = {
  type: SyncTargetType
  readText(logicalPath: string): Promise<string>
  writeText(logicalPath: string, content: string): Promise<void>
  delete(logicalPath: string): Promise<void>
  list(logicalPrefix: string): Promise<SyncTargetEntry[]>
  exists(logicalPath: string): Promise<boolean>
  ensureDir(logicalPath: string): Promise<void>
  safeWriteJson(logicalPath: string, data: unknown): Promise<void>
}
```

### 2. `electron/sync-target/local-folder-driver.ts`

职责：

- 承接当前本地同步目录的真实读写
- 负责 `logicalPath -> absolute path` 映射
- 负责本地 `fs` 读写
- 负责本地 `.tmp -> rename` 安全写入

### 3. `electron/sync-target/index.ts`

职责：

- 汇总导出类型和 `LocalFolderDriver`
- 后续也可在这里补：
  - `createSyncTargetDriver(config)`
  - `resolveSyncTargetDriver(...)`

当前可以先保持简单，只做 local folder 的统一出口。

---

## 三、LocalFolderDriver 第一版建议

### 1. 第一版目标

第一版 `LocalFolderDriver` 不追求“重新设计本地同步目录层”。

目标只应是：

- 复用现有 `sync-folder.ts` 中已经验证过的本地目录行为
- 把这些行为包进 driver
- 不改变用户现有 local folder sync 行为

### 2. 建议复用 `sync-folder.ts` 的能力

建议直接复用或迁出的本地能力包括：

- 逻辑路径到真实磁盘路径的拼接
- 目录存在性检查
- 目录创建
- 文本文件读取
- 文本文件写入
- JSON 安全写入
- 删除文件
- 列出某个逻辑前缀下的 `.json` 文件

也就是说，`LocalFolderDriver` 第一版可以把当前这些能力吸收进去：

- `safeWriteJsonAtomic`
- `ensureSyncDirStructure` 中的本地目录 ensure 逻辑
- 本地 `sync-info.json` / `devices/` / `locks/` 读写所依赖的文件读写 helper

### 3. 哪些函数应迁出

建议迁入 `LocalFolderDriver`：

- 任何“真实磁盘路径 + fs + JSON 文件”的底层操作

例如：

- `resolvePath(basePath, logicalPath)` 一类 helper
- `safeWriteJsonAtomic`
- `readJsonFile`
- `writeTextFile`
- `listJsonFilesUnderPrefix`

### 4. 哪些函数保留为协议 helper

不建议把所有内容都塞进 driver。

应继续保留在协议层的包括：

- `sync-info.json` 字段规则
- `devices/<deviceId>.json` 字段规则
- `lock` 文件最小字段规则
- `entityType -> directory` 映射
- `item` / `tombstone` JSON 结构规则

原因是：

- 这些不是 local folder 特有逻辑
- 未来 `oneDriveAppFolder` 也要复用同一套协议

---

## 四、`sync-folder.ts` 的处理建议

### 1. 第一阶段不要直接改名

建议第一阶段先保留：

- `electron/sync-folder.ts`

不要一上来就把它硬改名成：

- `local-folder-driver.ts`

原因：

- 当前 `sync-folder.ts` 里不仅有底层本地目录读写，还有协议层 metadata、锁、目录初始化编排
- 直接改名会让“路径层”和“协议层”继续混在一起，只是换了文件名

### 2. 推荐策略：先保留，再逐步剥离

推荐做法：

1. 新增 `sync-target/local-folder-driver.ts`
2. 把最底层本地目录读写 helper 先迁入 driver
3. 让 `sync-folder.ts` 逐步从“直接用 fs”改为“调用 LocalFolderDriver”

这样可以降低风险：

- 对外 API 先不大动
- 先把底层替换掉
- 再慢慢把 `sync-folder.ts` 缩成协议辅助层

### 3. 哪些 API 第一阶段先不动

为了降低风险，建议第一阶段尽量保留这些入口函数名和调用关系：

- 同步目录准备相关入口
- `sync-info.json` 读写相关入口
- `devices/<deviceId>.json` 更新入口
- 锁相关入口

也就是说：

- 第一阶段先改实现依赖
- 不急着改掉所有函数签名

---

## 五、`sync-export.ts` 的迁移计划

### 1. 核心改法

建议把：

- 传入 `targetPath`

改成：

- 传入 `driver`

例如从：

- `exportLocalChangesToSyncFolder({ targetPath, ... })`

逐步变成：

- `exportLocalChangesToSyncTarget({ driver, ... })`

第一阶段也可以保留旧函数名，但内部改为使用 driver。

### 2. `sync-export` 未来只做什么

`sync-export` 未来只应负责：

- 读取本地 `sync_changes`
- 读取本地实体正文
- 构造 `item` / `tombstone` payload
- 生成 `logicalPath`
- 调 `driver.safeWriteJson(...)`
- 单条成功后写 `syncedAt`

### 3. `sync-export` 不应继续做什么

不应继续在这里做：

- 本地绝对路径拼接
- `fs.mkdir`
- `fs.writeFile`
- `.tmp -> rename`

这些都应交给 driver。

### 4. 明确不改变的规则

本轮迁移不改变：

- `sync_changes` 的读取顺序
- `upsert` 导出 item 的规则
- `delete` 导出 tombstone 的规则
- 成功后写 `syncedAt`
- 失败项保持待同步

---

## 六、`sync-import.ts` 的迁移计划

### 1. 核心改法

建议把：

- 直接扫描本地同步目录

改成：

- 通过 `driver.list(...)` 扫描逻辑目录
- 通过 `driver.readText(...)` 读取 JSON 文本

### 2. `sync-import` 未来只做什么

`sync-import` 未来只应负责：

- 列出 `items/` 和 `tombstones/` 下的逻辑文件
- 读取 JSON
- 校验 JSON 结构
- 做 LWW 判断
- 静默应用远端记录到本地 SQLite

### 3. 明确不改变的规则

本轮迁移不改变：

- 远端 `item` 扫描范围
- 远端 `tombstone` 扫描范围
- JSON 校验规则
- LWW 规则
- “本地已删除 + 远端旧 item 不复活”
- “本地已删除 + 远端新 item 可复活”
- 静默导入不制造新的待上送 `sync_changes`

也就是说：

- `sync-import` 只是把底层读文件方式换成 driver
- 不改导入行为本身

---

## 七、`sync-now.ts` 的迁移计划

### 1. 核心改法

`sync-now.ts` 当前隐含假设是：

- `syncTargetPath` 就等于同步目标

迁移后建议改成：

1. 从本机 sync state 读取 `SyncTargetConfig`
2. resolve 出对应 driver
3. 把 driver 传给 import / export / metadata / lock 流程

第一阶段仍然只支持：

- `localFolder`

也就是：

- 从当前 `syncTargetPath` 组装出：
  - `{ type: 'localFolder', path }`
- 再创建 `LocalFolderDriver`

### 2. `sync-now` 仍负责什么

`sync-now` 仍负责：

- 检查 target config
- 准备同步目标
- 获取锁
- 自动备份
- import
- export
- 成功后写 `lastSyncedAt`

### 3. 应改为走 driver 的部分

这些未来都应通过 driver 或 driver 承接的 helper 完成：

- 锁文件读写
- `sync-info.json` 读写
- `devices/<deviceId>.json` 读写
- import 读取远端记录
- export 写远端记录

### 4. 明确不改变的规则

本轮迁移不改变：

- `syncNow` 执行顺序
- “先 import，后 export”
- 自动备份时机
- 锁冲突处理
- success / partial / failed 判定
- `lastSyncedAt` 只在完全成功时写

---

## 八、测试迁移计划

### 1. 必须保持通过的现有测试

至少这些现有测试应继续通过：

- `electron/sync-folder.test.ts`
- `electron/sync-export.test.ts`
- `electron/sync-import.test.ts`
- `electron/sync-now.test.ts`
- `electron/sqlite.test.ts`
- `src/db/storage.desktop.test.ts`
- `src/db/storage.test.ts`

这些测试的意义是：

- 确认 driver 重构没有改掉 Sync 2-5 的现有行为

### 2. 建议新增的 driver 测试

新增：

- `electron/sync-target/local-folder-driver.test.ts`

优先覆盖：

- `logicalPath -> absolute path` 映射
- `readText`
- `writeText`
- `delete`
- `exists`
- `ensureDir`
- `list`
- `safeWriteJson`

重点不是再测一遍同步规则，而是测：

- LocalFolderDriver 的本地目录语义是否稳定

### 3. export/import/syncNow 如何确认行为不变

建议：

- 尽量保留现有测试输入输出和断言
- 允许只改测试中的注入方式，不改行为预期

例如：

- export 测试仍然断言写出了相同的 `items/` / `tombstones/`
- import 测试仍然断言 LWW 结果相同
- syncNow 测试仍然断言：
  - success / partial / failed
  - `lastSyncedAt` 写入规则
  - 锁和备份顺序不变

### 4. 测试迁移策略

建议先新增 driver 测试，再改现有同步测试依赖。

顺序更稳：

1. 先证明 `LocalFolderDriver` 自己可用
2. 再让 export/import/syncNow 改成用 driver
3. 最后验证原测试仍通过

---

## 九、严格不做什么

这轮 driver 迁移计划明确不做：

- 不做 OneDrive OAuth
- 不做 Microsoft Graph API
- 不改 LWW
- 不改 `syncNow` 行为
- 不改设置页 UI
- 不做自动同步
- 不做 WebDAV
- 不改同步协议文件结构
- 不新增新的同步规则

---

## 十、最小代码实施顺序

推荐严格按下面顺序推进。

### Step 1：新增 driver 类型和 `LocalFolderDriver`

目标：

- 先把 driver 接口立起来
- 先把 local folder 的底层能力包成 driver

### Step 2：让 `sync-folder` 的元数据操作使用 driver 或由 driver 承接

目标：

- `sync-info.json`
- `devices/`
- `locks/`

先不改外部行为，只把底层实现换成 driver。

### Step 3：改 `sync-export`

目标：

- 不再直接依赖本地 `fs`
- 只生成 `logicalPath`
- 用 `driver.safeWriteJson(...)`

### Step 4：改 `sync-import`

目标：

- 不再直接扫描本地目录
- 用 `driver.list(...)` 和 `driver.readText(...)`

### Step 5：改 `sync-now`

目标：

- 从本机 sync target config resolve 出 `LocalFolderDriver`
- 保持现有编排顺序不变

### Step 6：跑全量同步测试

目标：

- 证明 local folder sync 行为未变

### Step 7：文档更新

更新：

- `dev-log.md`
- `handoff.md`
- 如有必要再补 `app-structure.md`

---

## 十一、最大迁移风险

最大的风险不是写不出 driver，而是：

- 在抽 driver 的同时，不小心顺手改掉现有同步行为

尤其容易出问题的点包括：

- `safeWriteJson` 语义被改
- `sync-folder.ts` 中 metadata / lock / local fs helper 拆分过快
- export/import 在改成 driver 注入后，路径前缀或扫描范围发生变化
- syncNow 在 resolve driver 时顺手改了当前 target state 口径

因此建议：

- 先抽底层
- 再替换依赖
- 每一步都用现有测试锁行为

---

## 十二、当前建议

下一轮如果进入代码迁移，建议优先改：

- `LocalFolderDriver`

而不是先改：

- `syncNow`
- `OneDrive`
- 设置页

因为：

- `LocalFolderDriver` 是最小、边界最清楚、对现有功能影响最可控的一步
- 它先稳定下来，后面 export/import/syncNow 的改造才不会扩散
