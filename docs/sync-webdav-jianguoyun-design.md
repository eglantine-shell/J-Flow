# J-Flow WebDAV / 坚果云同步目标设计（草案）

## 文档定位

这份文档描述的是：

- `J-Flow` 如果把第一云同步目标从 `OneDrive` 暂时切换为 `WebDAV / 坚果云`
- 需要明确哪些产品边界
- 应该怎样与当前已经实现的 `localFolder` 同步主链共存

这不是实现代码，也不是最终 UI。

它的目标是先把下面几件事讲清楚：

- 为什么当前优先做 `WebDAV / 坚果云`
- 用户需要准备什么
- `SyncTargetConfig` 和凭据存储怎么设计
- `WebDAV driver` 的能力边界是什么
- 后续实现顺序应该怎么拆

---

## 一、产品边界

### 1. 当前方向

当前同步边界建议明确为：

- 不做 `J-Flow` 自有账号系统
- 不做 `J-Flow` 自有云数据库
- 支持第三方同步目标
- 第一阶段云目标改为 `WebDAV / 坚果云`
- `OneDrive` 作为未来目标保留，但暂缓

### 2. 当前继续不做

- 不做自动同步
- 不做实时同步
- 不做后台定时同步
- 不同步 `SQLite` 文件本体
- 不把 `JSON` 备份当同步包

### 3. 当前继续复用

当前 `WebDAV / 坚果云` 目标不应推翻现有同步协议与同步主链，继续复用：

- `sync-info.json`
- `devices/`
- `items/`
- `tombstones/`
- `locks/`
- `last-write-wins`
- `syncNow`
- `SyncTargetDriver`

也就是说，变化重点不是：

- 同步规则

而是：

- 同步目标驱动
- 凭据存储
- 设置页目标心智

---

## 二、为什么当前优先做坚果云 WebDAV

相较于 `OneDrive App Folder`，`坚果云 WebDAV` 当前更适合作为第一云同步目标，原因是：

1. 不依赖 Microsoft App Registration
2. 不依赖 Azure tenant / app registration 前置配置
3. 不需要 OAuth client id
4. 更接近当前 `SyncTargetDriver` 的“类文件系统”心智
5. 更适合作为：
   - `GET / PUT / PROPFIND / MKCOL / DELETE`
   这一类远端文件目标的第一实现

换句话说：

- `WebDAV / 坚果云` 更像“远端文件系统 driver”
- `OneDrive` 更像“带授权接入的云平台 driver”

先做 WebDAV，有利于尽快验证：

- 云端 driver 的读写模型
- 凭据存储模型
- `syncNow` 与远端 driver 的接入方式

---

## 三、坚果云用户需要准备什么

用户侧需要准备：

- `WebDAV URL`
  - `https://dav.jianguoyun.com/dav/`
- 用户名
  - 坚果云账号邮箱
- 密码
  - 坚果云“第三方应用密码”，不是网页登录密码
- 建议应用密码名称
  - `J-Flow`
- 同步根目录
  - `J-Flow`

### 1. 应用密码获取方式

应在文档和未来设置页说明里明确：

- 用户需要进入坚果云网页版
- 路径：
  - `账户信息 → 安全选项 → 第三方应用管理`
- 在这里生成第三方应用密码

### 2. 安全边界

必须明确：

- 不要把应用密码提交到 Git
- 不要把应用密码写入同步目录
- 不要把应用密码写入 `items / tombstones`
- 不要让应用密码进入 JSON 备份

---

## 四、SyncTargetConfig 设计

建议从当前：

```ts
{ type: 'localFolder', path: string }
```

升级为：

```ts
type SyncTargetConfig =
  | { type: 'localFolder'; path: string }
  | {
      type: 'webdav'
      provider?: 'jianguoyun' | 'custom'
      baseUrl: string
      rootPath: string
      username: string
      displayName?: string
    }
```

### 1. 字段职责

`localFolder.path`
- 本机绝对路径
- 仅在当前设备有效
- 不参与跨设备同步

`webdav.provider`
- 用于区分：
  - `jianguoyun`
  - `custom`
- 第一阶段优先做 `jianguoyun`

`webdav.baseUrl`
- 例如：
  - `https://dav.jianguoyun.com/dav/`

`webdav.rootPath`
- 例如：
  - `J-Flow`
- 用于把同步协议结构挂在远端根目录下

`webdav.username`
- 当前设备用于连接 WebDAV 的账号标识
- 第一阶段对坚果云来说，通常就是邮箱

`webdav.displayName`
- 设置页展示用
- 可选

### 2. 明确不进入 `SyncTargetConfig` 的信息

下面这些信息不应进入 `SyncTargetConfig`：

- WebDAV 密码
- 坚果云第三方应用密码
- access token / refresh token 一类敏感凭据

原因：

- `SyncTargetConfig` 描述的是“当前同步目标是什么”
- 不是敏感凭据存储

### 3. 本机存储原则

建议：

- `SyncTargetConfig` 只保存在本机
- 不进入同步目录
- 不进入 `items / tombstones`
- 不参与跨设备同步
- Web 端不使用

---

## 五、凭据存储

延续 `OneDrive` 方向已经收口的原则：

- WebDAV 密码 / 应用密码是本机敏感授权信息
- 不写入同步目录
- 不写入 `items / tombstones`
- 不进入 JSON 备份
- 不跨设备同步
- renderer 不直接持久化密码

### 1. POC 阶段建议

推荐：

- `Electron safeStorage + 本机隔离文件`

原因：

- 不需要先引入更重的原生凭据模块
- 适合尽快验证：
  - WebDAV 连接
  - 目录读写
  - metadata 文件操作

### 2. 正式阶段建议

可再评估：

- `keytar`
- 或系统凭据存储等价方案

原则不变：

- 敏感凭据不进入同步协议
- 不进入业务数据导出

---

## 六、WebDAV Driver 能力边界

`WebDAV driver` 需要实现现有 `SyncTargetDriver`：

- `readText(logicalPath)`
- `writeText(logicalPath, content)`
- `delete(logicalPath)`
- `list(logicalPrefix)`
- `exists(logicalPath)`
- `ensureDir(logicalPath)`
- `safeWriteJson(logicalPath, data)`

### 1. logicalPath 规则

`logicalPath` 继续统一使用 POSIX 风格，例如：

- `sync-info.json`
- `devices/<deviceId>.json`
- `items/dayPlanItems/<id>.json`
- `tombstones/dayPlanItems/<id>.json`

同步核心继续只处理逻辑路径，不感知底层远端 URL 拼接。

### 2. 远端路径映射

`WebDAV driver` 负责把：

- `logicalPath`

映射到：

- `baseUrl + rootPath + logicalPath`

例如：

- `baseUrl = https://dav.jianguoyun.com/dav/`
- `rootPath = J-Flow`
- `logicalPath = sync-info.json`

对应远端对象：

- `https://dav.jianguoyun.com/dav/J-Flow/sync-info.json`

### 3. 方法与 WebDAV 动词映射

建议映射关系：

- `ensureDir`
  - `MKCOL`
- `list`
  - `PROPFIND`
- `readText`
  - `GET`
- `writeText`
  - `PUT`
- `safeWriteJson`
  - `PUT`
- `delete`
  - `DELETE`
- `exists`
  - `PROPFIND` 或 `GET` 判断

### 4. safeWriteJson 语义

在 `WebDAV` 上，`safeWriteJson` 不一定能完全复用本地 `.tmp -> rename` 语义。

因此第一版建议定义为：

- “尽量安全地写入 JSON”

第一版可以先采用：

- 直接 `PUT` 覆盖写

后续再评估是否需要更强保护，例如：

- 临时对象写入
- 服务端 replace 语义
- 更强一致性策略

当前不建议在 POC 阶段一开始就追求复杂远端原子写入。

---

## 七、坚果云 POC 阶段

第一阶段不要直接接完整同步。

POC 只验证：

1. 可以用：
   - URL
   - 用户名
   - 应用密码
   连接坚果云 WebDAV
2. 可以创建 / 复用 `J-Flow` 根目录
3. 可以写入 `sync-info.json`
4. 可以读取 `sync-info.json`
5. 可以写入 `devices/<deviceId>.json`
6. 可以列出目录
7. 可以删除测试文件

暂时不做：

- `items / tombstones` 导入导出
- `syncNow` 完整闭环
- 设置页最终状态机实现

这一步的目标是先证明：

- WebDAV 作为 `SyncTargetDriver` 是可行的
- 坚果云可以承载现有同步协议的 metadata 层

---

## 八、设置页状态机

未来设置页应从：

- `同步文件夹`

升级为：

- `同步目标`

目标类型：

- 本地文件夹
- 坚果云 WebDAV
- `OneDrive`（未来）

### 1. 坚果云状态建议

至少包括：

- 未配置
- 已配置但未测试
- 连接测试成功
- 连接测试失败
- 同步中
- 同步成功
- 同步失败

### 2. 主按钮建议

- 未配置：
  - `配置坚果云`
- 已配置：
  - `立即同步`
- 测试失败：
  - `重新测试`
- 同步中：
  - `同步中…`

### 3. 操作区建议

坚果云目标建议展示：

- `WebDAV URL`
- 用户名
- 同步目录
- 修改配置
- 清除配置
- 测试连接

注意：

- 密码不在主界面明文显示
- token / 应用密码不进入详情主区
- 详情区也只显示必要的技术信息，不应变成调试台

---

## 九、现有 Sync 1-5 如何复用

当前可以直接复用：

- `sync_changes`
- `updatedAt`
- `items / tombstones`
- `import`
- `export`
- `LWW`
- `syncNow`
- `backup`
- `lock` 语义

需要新增 / 改造的是：

- `SyncTargetConfig` 增加 `webdav`
- WebDAV 凭据存储
- WebDAV driver
- 设置页同步目标配置 UI

因此，坚果云目标不应重写同步算法。

它只是：

- 新增一个远端 driver
- 新增一个目标配置类型

---

## 十、实现顺序建议

建议后续按下面顺序推进：

1. 更新 `constraints.md`
   - 允许 `WebDAV / 坚果云` 作为第一云同步目标
   - `OneDrive` 暂缓
2. 扩展 `SyncTargetConfig`
   - 增加 `webdav`
3. 设计 WebDAV credential store
4. `WebDAV driver` POC
   - `GET / PUT / PROPFIND / MKCOL / DELETE`
5. 坚果云 metadata POC
   - `sync-info.json`
   - `devices/<deviceId>.json`
6. `WebDAV driver` 接入现有 `syncNow`
7. 设置页同步目标 UI
8. macOS + Windows 真机测试

---

## 十一、当前不做什么

当前明确不做：

- WebDAV driver 代码
- 坚果云账号密码 UI 代码
- `syncNow` 代码改造
- `LocalFolderDriver` 改造
- 自动同步
- `OneDrive OAuth`
- WebDAV 以外的其他云目标

---

## 十二、当前结论

当前最合理的方向是：

- 暂停 `OneDrive` 作为第一云目标
- 先做 `WebDAV / 坚果云`
- 继续复用当前已经成熟的：
  - 同步协议
  - 本地变化跟踪
  - 导入导出规则
  - `syncNow`
  - `SyncTargetDriver`

如果后续验证 `WebDAV` POC 跑通，再进入：

- `webdav` target config
- credential store
- driver 实现
- metadata POC

会比直接冲 `OneDrive OAuth` 更稳。 
