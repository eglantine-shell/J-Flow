# J-Flow WebDAV 接入 Sync Core 迁移计划（短版）

## 文档定位

这份文档只回答一件事：

- 在已经有 `WebDAV SyncTargetDriver` 的前提下，如何把它安全接入现有 sync core

本轮不做：

- 代码实现
- `syncNow` 改造
- `sync-export` / `sync-import` 改造
- 设置页 UI
- 自动同步

---

## 一、当前状态

当前已经有：

- `WebDAV low-level client`
- `WebDAV credential store`
- `WebDAV POC metadata service`
- `WebDAV SyncTargetDriver`
- `LocalFolderDriver`
- `sync-export` 已支持 driver 写入
- `sync-import` 已支持 driver 读取
- `syncNow` 已有 `target config / driver` 心智，但当前主链仍主要按 `localFolder` 编排

这意味着：

- 同步协议层已经基本独立
- 当前缺的不是同步规则
- 而是把 `WebDAV target` 安全接到现有 metadata / import / export / syncNow 主链

---

## 二、核心判断

### 1. 是否先让 `sync-folder.ts` 的 metadata / lock 能力支持通用 driver

建议：**是，先做这一步。**

原因：

- `sync-info.json`
- `devices/<deviceId>.json`
- `locks/`

这三类文件是完整同步前的最小公共协议层。

如果不先抽通用 metadata helper，而直接把 WebDAV 接进 `syncNow`，很容易导致：

- `localFolder` 和 `webdav` 分别维护两套 metadata 逻辑
- `syncNow` 里继续出现 target-specific 分支
- 后续调试 `lock / sync-info / devices` 时更难定位问题

### 2. 是否先新增通用 metadata helper

建议：**新增。**

建议的 helper 方向：

- `prepareSyncTarget(driver, context)`
- `readSyncInfo(driver)`
- `writeSyncInfo(driver, payload)`
- `updateDeviceInfo(driver, payload)`
- `acquireSyncLock(driver, context)`
- `releaseSyncLock(driver, deviceId)`

注意：

- 这些 helper 只抽“协议逻辑”
- 不改变 metadata 文件格式
- 不改变 lock 语义
- `localFolder` 先回归同样的测试，证明行为不变

### 3. WebDAV driver 是否可以复用当前 `sync-info.json / devices / locks` 规则

建议：**可以复用。**

当前 `WebDAV POC 02` 已经证明：

- `sync-info.json` 可写 / 可读 / 可复用
- `devices/<deviceId>.json` 可写

因此：

- metadata 协议本身无需为 WebDAV 另造一套
- `locks/` 也可以先沿用同样的文件语义

需要额外关注的是：

- WebDAV 上的“写入成功”不是本地磁盘语义
- 但第一阶段可以先接受“协议相同、底层一致性较弱”的前提

### 4. WebDAV target 接入 `syncNow` 前，是否应该先单独跑 metadata 测试

建议：**应该。**

顺序上更稳的是：

1. 先让通用 metadata helper 跑通 `localFolder`
2. 再让同一套 helper 跑通 `webdav`
3. 最后才接 `syncNow`

这样可以把风险分层隔离：

- metadata 层问题
- import / export 层问题
- `syncNow` 编排问题

不会一次性混在一起。

### 5. 何时让 `syncNow` 根据 `syncTargetConfig.type = webdav` 创建 WebDAV driver

建议：**最后一步再接。**

在这之前，至少要先完成：

- 通用 metadata helper
- WebDAV metadata 回归
- `sync-export` target 版能对接 WebDAV driver
- `sync-import` target 版能对接 WebDAV driver

否则 `syncNow` 接进去后，一旦失败，很难判断是：

- target resolver 问题
- metadata 问题
- import 问题
- export 问题
- lock 问题

### 6. 何时让 import / export 使用 WebDAV driver 进入完整同步闭环

建议：**在 metadata helper 跑稳之后，但在 `syncNow` 之前。**

也就是：

- 先让 export 单独能对 WebDAV driver 写 `items / tombstones`
- 再让 import 单独能对 WebDAV driver 读 `items / tombstones`
- 这两层都稳定后，再把它们编排进 `syncNow`

---

## 三、推荐迁移顺序

### Step 1：抽通用 sync metadata helper

把下面这几类协议逻辑从 `localFolder` 语义中再抽一层：

- `sync-info.json`
- `devices/<deviceId>.json`
- `locks/`

要求：

- metadata 格式不变
- lock 语义不变
- `localFolder` 行为不变

### Step 2：先让 localFolder 回归同一套 helper

目标：

- 所有现有 `localFolder` metadata / lock 测试继续通过
- 证明抽象没有改变行为

这一步是 WebDAV 接入前最重要的回归锚点。

### Step 3：用 WebDAV driver 跑 metadata POC

只验证：

- `prepare target`
- `sync-info.json`
- `devices/<deviceId>.json`
- `locks/`

这一步仍然：

- 不跑 `items / tombstones`
- 不跑 `LWW`
- 不跑 `syncNow`

### Step 4：把 WebDAV driver 接入 import / export 的 target 版函数

目标：

- export 能对 `webdav` 写：
  - `items/...`
  - `tombstones/...`
- import 能对 `webdav` 读：
  - `items/...`
  - `tombstones/...`

要求：

- 不改导入导出规则
- 不改 LWW
- 不改 partial failure 规则

### Step 5：最后才让 `syncNow` 支持 `webdav target`

此时 `syncNow` 再根据 `syncTargetConfig` 创建：

- `localFolder driver`
- `webdav driver`

然后完整跑：

- backup
- import
- export
- `lastSyncedAt`

---

## 四、风险点

### 1. WebDAV 上的 lock 文件语义和 localFolder 是否足够一致

风险：**基本一致，但不是完全同等。**

原因：

- local folder 上的锁更接近本地原子写
- WebDAV 上的锁只是“文件存在 + 内容时间戳”语义
- 并不是真正分布式锁

第一阶段建议：

- 保持现有 lock 文件协议
- 接受“足够好但不是强一致”的前提
- 不为 WebDAV 提前引入复杂锁机制

### 2. WebDAV `safeWriteJson` 只是 `PUT` 覆盖写，是否会影响 `sync-info / lock`

风险：**有一定风险，但当前可接受。**

影响点：

- `sync-info.json`
- `devices/<deviceId>.json`
- `locks/`

都没有本地 `.tmp -> rename` 的等价保障。

第一阶段建议：

- 接受 WebDAV 的“尽量安全写 JSON”定义
- 不为了强原子写扩大范围
- 如果后续实测坚果云写入表现不稳定，再单独增强

### 3. `PROPFIND list` 的返回是否与 `LocalFolderDriver list` 语义一致

风险：**这是接入前必须重点确认的地方。**

当前 sync core 依赖的是：

- `list(prefix)` 返回 prefix 下直接条目
- `logicalPath` 可直接被 import / export 消费

如果 WebDAV `PROPFIND` 返回语义和本地不一致，就会影响：

- 扫描范围
- 文件识别
- failure 数统计

因此 Step 4 前必须先确认：

- WebDAV driver 的 `list()` 语义已经对齐 `LocalFolderDriver`

### 4. WebDAV 网络失败时，partial / failed 应如何判定

建议：**仍沿用现有规则，但网络错误通常更容易触发 failed。**

大方向：

- 单文件失败但整批还能继续：
  - `partial`
- 关键前置失败：
  - `failed`

WebDAV 特别要注意的是：

- 网络错误 / 超时
- 认证失效
- PROPFIND 解析失败

这些更可能在 metadata 或目录扫描阶段直接让整轮无法继续，因此通常应按：

- `failed`

而不是勉强记成 `partial`

### 5. `syncNow` 写 `lastSyncedAt` 的条件是否需要因 WebDAV 网络错误更严格处理

建议：**保持现有 success-only 规则，但在 WebDAV 上更要严格执行。**

也就是：

- 只有完整闭环 success 才写 `lastSyncedAt`
- `partial` 不写
- `failed` 不写

这条规则在 WebDAV 上尤其重要，因为网络错误更容易导致“只完成了一半”。

---

## 五、当前推荐结论

最小安全顺序是：

1. 先抽通用 metadata helper
2. 先让 `localFolder` 回归同一套 helper
3. 再让 `webdav` 跑 metadata helper
4. 再把 `webdav` 接入 import / export target 版
5. 最后才让 `syncNow` 支持 `webdav`

这条顺序的核心是：

- 先统一协议层
- 再接远端 driver
- 最后接编排层

---

## 六、本轮不做

- 不改 `syncNow`
- 不改 `sync-folder`
- 不改 `sync-export`
- 不改 `sync-import`
- 不写 `items / tombstones`
- 不做完整同步
- 不做设置页 UI
- 不做自动同步
- 不做 OneDrive
