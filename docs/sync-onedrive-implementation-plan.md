# J-Flow OneDrive 同步目标实施计划（草案）

## 文档定位

这份文档只做一件事：

- 把 [docs/sync-onedrive-design.md](/Users/yetingzhi/Documents/GitHub/vibecoding/J-Flow/docs/sync-onedrive-design.md) 继续细化成可执行的工程计划

本轮不做：

- OneDrive OAuth 代码
- Microsoft Graph API 代码
- 设置页 UI 改造
- `syncNow` 代码改造
- `LocalFolderDriver` 代码改造

它的目标是为 OneDrive App Folder 同步目标补齐“实现前规格”，但不提前进入实现。

---

## 一、当前基础

当前 `J-Flow` 已经有这些基础能力：

- Sync 1-5 本地同步闭环
- `SyncTargetDriver` 设计
- `LocalFolderDriver`
- `syncNow` 的 target config / driver 心智
- local folder sync 继续可用

因此下一阶段的目标不是推翻这些能力，而是新增：

- OneDrive 授权层
- OneDrive App Folder driver
- 同步目标配置升级
- 设置页同步目标心智升级

这意味着：

- 现有 `items / tombstones / sync-info / locks / LWW / syncNow`
  继续复用
- 变化集中在：
  - 授权
  - token 存储
  - target config
  - target driver
  - 设置页目标切换

---

## 二、OneDrive 同步目标的产品边界

### 1. 当前建议边界

如果正式开始做 OneDrive，同步边界建议明确为：

- 不做 `J-Flow` 自有账号系统
- 允许第三方同步目标授权接入
- 第一目标只做 `OneDrive`
- 不做 `Dropbox / Google Drive / WebDAV`
- 不做自动同步
- 不同步 `SQLite` 文件本体
- 不把 `JSON` 备份当同步包
- 继续复用：
  - `items / tombstones / sync-info / locks / LWW / syncNow`

### 2. 为什么这不等于“做云数据库”

OneDrive 目标的本质仍然是：

- 每台设备保留自己的本地 SQLite
- 通过共享同步介质交换同步协议文件

变化是：

- 同步介质从“本地/挂载目录”
- 扩展到“OneDrive App Folder”

这不等于：

- 引入 J-Flow 自己的在线数据库
- 引入 J-Flow 自己的账号体系

### 3. 需要后续调整 `constraints.md`

当前 `constraints.md` 还写着：

- 当前不做云同步

如果后续正式开始 OneDrive，需要调整为类似：

- 不做 `J-Flow` 自有账号系统
- 不做 `J-Flow` 自有云数据库
- 但允许第三方云同步目标授权接入
- 第一目标为 `OneDrive`

本轮先只在文档里提出这个需要，不直接修改 `constraints.md`。

---

## 三、同步目标配置模型

### 1. 当前模型

当前 `syncNow` 内部实际只使用：

```ts
{ type: 'localFolder', path: string }
```

### 2. 目标模型

建议升级为：

```ts
type SyncTargetConfig =
  | { type: 'localFolder'; path: string }
  | {
      type: 'oneDriveAppFolder'
      accountId: string
      displayName?: string
      driveId?: string
    }
```

### 3. 字段职责

`localFolder.path`
- 本机绝对路径
- 仅在当前设备有效
- 不参与跨设备同步

`oneDriveAppFolder.accountId`
- 当前设备上 OneDrive 授权账号的标识
- 用于本机关联 token / 账号状态

`oneDriveAppFolder.displayName`
- 设置页展示用
- 例如用户邮箱或账号昵称

`oneDriveAppFolder.driveId`
- Graph 层可能需要的 drive 标识
- 可在授权后或首次 metadata 访问后缓存

### 4. 明确不进入 `SyncTargetConfig` 的信息

下面这些信息不应进入 `SyncTargetConfig`：

- access token
- refresh token
- token 过期时间原始敏感数据

原因：

- `SyncTargetConfig` 不是敏感凭据存储
- 它只描述“当前同步目标是什么”

### 5. 本机存储原则

建议：

- `SyncTargetConfig` 只保存在本机
- 不进入同步目录
- 不进入 `items / tombstones`
- 不参与跨设备同步
- Web 端不使用

---

## 四、OneDrive OAuth 流程设计

### 1. 第一版授权方式

建议：

- 使用系统浏览器
- 使用 `Authorization Code + PKCE`
- 使用 `localhost / 127.0.0.1` loopback redirect

这和 Joplin 的桌面授权心智一致，也更适合 Electron。

### 2. 职责分工

`Electron main process` 负责：

- 生成 PKCE verifier / challenge
- 启动本地 loopback 回调监听
- 拼授权 URL
- 打开系统浏览器
- 接收回调 code
- 换取 token
- 刷新 token
- 断开连接
- 清理本机 token

`renderer` 负责：

- 触发连接 / 断开动作
- 展示授权状态
- 不直接处理 token

### 3. 建议授权流程

1. 用户点击“连接 OneDrive”
2. main process 生成 PKCE 参数
3. main process 启动本地 loopback server
4. main process 打开系统浏览器到 Microsoft 授权页
5. 用户登录并同意授权
6. Microsoft 重定向回本地 `localhost` 回调
7. main process 收到 `code`
8. main process 向 Microsoft token endpoint 换取：
   - access token
   - refresh token
   - 账号基础信息
9. main process 把 token 保存到本机安全存储
10. main process 更新本机 OneDrive target metadata

### 4. 需要支持的操作

第一版应设计支持：

- 连接 OneDrive
- 断开 OneDrive
- 重新授权
- token refresh

### 5. 需要的配置项

至少需要：

- Microsoft app client id
- redirect URI
- scopes
- App Folder 权限范围

建议后续把这些收口在单独配置模块中，不要散落在 UI 和同步逻辑里。

---

## 五、OneDrive 权限范围

### 1. 第一版只使用 App Folder

建议第一版明确只使用：

- OneDrive App Folder

目标是：

- `J-Flow` 只能读写自己的 App Folder
- 不请求整个 OneDrive 的泛读写权限

### 2. 同步目录结构仍保持一致

OneDrive App Folder 内继续映射当前同步协议结构：

```text
sync-info.json
devices/
items/
tombstones/
locks/
```

这意味着：

- 本地 folder target 和 OneDrive target 共享同一套同步协议
- 差别只在底层 driver 的实现

### 3. 权限策略原则

建议原则：

- 只申请完成 App Folder 同步所需的最小权限
- 不为了省事请求更大范围的 OneDrive 文件访问能力

---

## 六、token 存储策略

### 1. 基本原则

access token / refresh token 是：

- 本机敏感授权信息
- 不是同步数据
- 不是业务数据

因此它们必须：

- 不写入同步目录
- 不写入 `items / tombstones`
- 不进入 `JSON` 备份
- 不跨设备同步

### 2. 推荐方案 A：系统安全存储

推荐正式方案：

- 使用系统安全存储
  - macOS Keychain
  - Windows Credential Manager

实现层可以后续再选型，例如：

- `keytar`
- Electron 平台可用的安全存储封装
- 或 `safeStorage + 本机隔离文件`

当前文档只确认原则，不提前锁死具体库。

### 3. 临时开发方案 B：本机隔离存储

如果 POC 阶段想先跑通授权和 Graph 访问，可接受一个临时开发方案：

- token 存在本机隔离位置
- 尽量做本机加密或平台隔离
- 明确标注：
  - 只用于开发阶段
  - 不作为正式发布方案

### 4. token 与业务数据的关系

建议后续结构上明确区分：

- 业务 SQLite 数据
- 同步元数据
- OneDrive 授权凭据

不要把这三者混在一个存储层里。

---

## 七、OneDrive Driver 能力边界

### 1. 目标接口

OneDrive driver 仍应实现当前 `SyncTargetDriver` 接口语义：

- `readText(logicalPath)`
- `writeText(logicalPath, content)`
- `delete(logicalPath)`
- `list(logicalPrefix)`
- `exists(logicalPath)`
- `ensureDir(logicalPath)`
- `safeWriteJson(logicalPath, data)`

### 2. `logicalPath` 继续统一

继续使用 POSIX 风格 logicalPath：

- `sync-info.json`
- `devices/<deviceId>.json`
- `items/dayPlanItems/x.json`
- `tombstones/dayPlanItems/x.json`
- `locks/sync_<deviceId>.json`

OneDrive driver 负责把它映射到：

- OneDrive App Folder 内路径

### 3. `safeWriteJson` 语义说明

本地目录里：

- `safeWriteJson` 目前等价于 `.tmp -> rename`

但在 OneDrive 上：

- 不一定存在完全等价的本地 rename 语义

因此建议把 OneDrive 版 `safeWriteJson` 定义为：

- “尽量安全地写入 JSON 文件”

可能的实现策略后续再定，例如：

- 先上传临时对象
- 再替换目标对象
- 或使用 OneDrive / Graph 的覆盖写策略并补失败保护

这轮先只定义语义，不提前定实现细节。

### 4. `ensureDir` 语义说明

OneDrive App Folder 下不一定和本地目录完全一样。

建议语义定义为：

- 确保该 logical directory 在目标中可被后续读写使用

实现上后续可根据 Graph 的文件夹接口决定：

- 不存在则创建
- 存在则复用

---

## 八、Graph API 最小验证步骤（POC）

第一阶段不要直接接完整同步。

建议先做一个最小 POC，只验证 OneDrive 目标的最小可行性：

1. 授权成功
2. 能获取当前账号信息
3. 能访问 App Folder
4. 能写入 `sync-info.json`
5. 能读取 `sync-info.json`
6. 能写入 `devices/<deviceId>.json`
7. 能列出目录

这个阶段明确不做：

- `items/` 导出
- `tombstones/` 导出
- 远端导入
- LWW 合并
- `syncNow` 闭环

原因：

- 先证明授权 + App Folder driver 基础能力成立
- 再把现有 Sync 1-5 接进去，风险更低

---

## 九、设置页状态机

### 1. 心智升级方向

设置页未来应从：

- “同步文件夹”

升级为：

- “同步目标”

### 2. 建议状态

至少包括：

- 未设置同步目标
- 使用本地文件夹
- OneDrive 未连接
- OneDrive 已连接
- OneDrive 授权过期 / 需要重新登录
- 同步中
- 同步成功
- 同步失败

### 3. 主按钮建议

`未设置同步目标`
- 主按钮：`选择同步目标`

`使用本地文件夹`
- 主按钮：`立即同步`
- 次级操作：`打开`、`更改`

`OneDrive 未连接`
- 主按钮：`连接 OneDrive`

`OneDrive 已连接`
- 主按钮：`立即同步`
- 次级操作：`重新授权`、`断开`

`OneDrive 授权过期`
- 主按钮：`重新登录`

`同步中`
- 主按钮：`同步中…`
- disabled

### 4. 本地文件夹与 OneDrive 操作区差异

`localFolder`
- 显示文件夹名 / 路径
- 支持打开本地同步目录
- 支持更改目录

`oneDriveAppFolder`
- 显示账号显示名
- 显示“同步位置：OneDrive App Folder”
- 不显示本地路径
- 支持重新授权 / 断开

### 5. 详情区建议

可以放进详情区：

- `deviceId`
- `syncVersion`
- import / export 统计
- 授权状态摘要
- 最近错误

不应放主界面：

- token
- refresh token 状态细节
- 过多技术字段

---

## 十、现有 Sync 1-5 的复用与改造

### 1. 直接复用

可以继续复用：

- `sync_changes`
- `updatedAt`
- `items / tombstones`
- `import`
- `export`
- `LWW`
- `syncNow`
- `backup`
- `lock` 语义

### 2. 需要改造

需要新增或改造：

- target config
- target resolver
- driver factory
- OneDrive auth
- OneDrive driver
- 设置页同步目标选择

### 3. 不建议推翻的部分

不建议重写：

- 同步协议
- 本地变化跟踪
- 导入导出规则
- 冲突处理规则

---

## 十一、推荐实现顺序

### Step 1：更新规则边界

明确：

- 不做 `J-Flow` 自有账号系统
- 允许第三方同步目标授权接入
- 第一目标为 `OneDrive`

### Step 2：扩展 target config schema

把当前仅有的：

- `localFolder`

升级为：

- `localFolder`
- `oneDriveAppFolder`

### Step 3：OneDrive OAuth POC

只先完成：

- 系统浏览器授权
- loopback 回调
- token 获取

### Step 4：确认 token 存储方案

先决定：

- 正式方案
- 开发期临时方案

### Step 5：OneDrive App Folder metadata 读写 POC

只验证：

- `sync-info.json`
- `devices/<deviceId>.json`
- 列目录

### Step 6：OneDrive driver 最小实现

把 `read / write / list / exists / ensureDir / safeWriteJson`
补齐到最小可用。

### Step 7：OneDrive driver 接入 `syncNow`

在 driver factory 层接入 `oneDriveAppFolder`，
让现有 `syncNow` 能跑在 OneDrive target 上。

### Step 8：设置页同步目标 UI

把当前“同步文件夹”升级成“同步目标”。

### Step 9：Mac + Windows 真机测试

至少验证：

- 连接 / 断开
- metadata 读写
- `syncNow`
- 本地数据不丢失

---

## 十二、本轮明确不做什么

本轮只写文档，不做下面这些事：

- 不写 OAuth 代码
- 不注册 Microsoft app
- 不写 Graph API
- 不改 `syncNow`
- 不改 `LocalFolderDriver`
- 不改设置页 UI
- 不直接修改 `constraints.md`
- 不做自动同步
- 不做 `WebDAV / Dropbox / Google Drive`

---

## 十三、当前建议

如果下一轮继续推进，我建议先继续只做文档或轻量配置设计，而不是马上写代码。

优先顺序建议是：

1. 先确认是否允许放开 `constraints.md` 中“当前不做云同步”的表述  
2. 再补一份更细的：
   - OneDrive OAuth 参数清单
   - token 存储方案对比
   - target config 在 SQLite / 本机配置中的最终落点
3. 再进入 OneDrive POC 实现
