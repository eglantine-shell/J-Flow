# J-Flow WebDAV / 坚果云同步目标实施计划（草案）

## 文档定位

这份文档只做一件事：

- 把 [docs/sync-webdav-jianguoyun-design.md](/Users/yetingzhi/Documents/GitHub/vibecoding/J-Flow/docs/sync-webdav-jianguoyun-design.md) 继续细化成可执行的工程计划

本轮不做：

- WebDAV driver 代码
- 坚果云账号密码 UI
- `syncNow` 代码改造
- `LocalFolderDriver` 改造
- 自动同步

它的目标是为 `WebDAV / 坚果云` 这个第一云同步目标补齐“实现前规格”，但不提前进入实现。

---

## 一、当前基础

当前 `J-Flow` 已经有这些基础能力：

- Sync 1-5 本地同步闭环
- `SyncTargetDriver` 设计
- `LocalFolderDriver`
- `syncNow` 的 target config / driver 心智
- local folder sync 继续可用

因此下一阶段的目标不是推翻这些能力，而是新增：

- `webdav` target config
- WebDAV credential store
- WebDAV driver
- 坚果云 metadata POC
- 设置页同步目标心智升级

这意味着：

- 现有 `items / tombstones / sync-info / locks / LWW / syncNow`
  继续复用
- 变化集中在：
  - 目标配置
  - 凭据存储
  - 远端 driver
  - 设置页目标配置

---

## 二、WebDAV target config

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
- 只在当前设备有效
- 不参与跨设备同步

`webdav.provider`
- 区分：
  - `jianguoyun`
  - `custom`
- 第一阶段优先做 `jianguoyun`

`webdav.baseUrl`
- WebDAV 服务地址
- 例如：
  - `https://dav.jianguoyun.com/dav/`

`webdav.rootPath`
- 远端同步根目录
- 第一阶段建议：
  - `J-Flow`

`webdav.username`
- WebDAV 登录用户名
- 在坚果云场景下通常是账号邮箱

`webdav.displayName`
- 设置页展示用
- 可选

### 2. 明确不进入 `SyncTargetConfig` 的信息

下面这些信息不应进入 `SyncTargetConfig`：

- password
- app password
- token 类敏感凭据

原因：

- `SyncTargetConfig` 用来描述“同步目标是什么”
- 不是凭据存储

### 3. 本机存储原则

建议：

- `baseUrl / rootPath / username` 只保存在本机
- 不进入同步目录
- 不进入 `items / tombstones`
- 不参与跨设备同步
- Web 端不使用

### 4. provider 默认值

当 `provider = 'jianguoyun'` 时，可提供默认值：

- `baseUrl = https://dav.jianguoyun.com/dav/`
- `rootPath = J-Flow`

---

## 三、坚果云默认配置

第一阶段推荐默认值：

- `WebDAV URL`
  - `https://dav.jianguoyun.com/dav/`
- `rootPath`
  - `J-Flow`
- `username`
  - 坚果云账号邮箱
- `password`
  - 坚果云第三方应用密码，不是登录密码

### 1. 用户侧准备步骤

用户需要在坚果云网页端进入：

- `账户信息`
- `安全选项`
- `第三方应用管理`

然后：

- 添加应用密码
- 应用名建议：
  - `J-Flow`

### 2. 安全边界

必须明确：

- 不要把应用密码提交到 Git
- 不要把应用密码写入同步目录
- 不要把应用密码写入 `items / tombstones`
- 不要把应用密码写入 JSON 备份

---

## 四、credential store

WebDAV 密码 / 应用密码是本机敏感信息，必须满足：

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
- 足以验证 WebDAV POC：
  - 连接
  - 目录读写
  - metadata 文件操作

### 2. 正式阶段建议

可继续评估：

- `keytar`
- 或系统凭据存储等价方案

### 3. 凭据索引方式

建议按同步目标维度存取凭据，例如组合键：

- `provider + baseUrl + username`

第一阶段至少保证：

- 同一个 `baseUrl + username` 可以稳定读回对应应用密码
- 更换账号或 URL 不会误用旧密码

### 4. 断开与清理

断开 `WebDAV` 同步目标时，应清理：

- 本机保存的密码 / 应用密码
- 本机该 target 对应的授权状态缓存

但不应清理：

- 远端 `J-Flow` 同步目录
- 本地业务数据

### 5. 测试连接失败时是否保存凭据

第一阶段建议：

- 测试连接失败时，不默认持久化凭据

原因：

- 可以避免错误密码长期留在本机配置中
- 也更符合“先验证通过，再保存”的保守策略

如果后续为了用户体验要支持“失败也暂存”，应单独再定规则。

---

## 五、WebDAV driver 模块设计

建议新增这些文件：

```text
electron/sync-target/webdav-driver.ts
electron/sync-target/webdav-driver.test.ts
electron/webdav/credentials.ts
electron/webdav/types.ts
```

### 1. 模块职责建议

`electron/sync-target/webdav-driver.ts`
- 实现 `SyncTargetDriver`
- 负责：
  - logicalPath -> WebDAV URL 映射
  - 远端文本读写
  - list / exists / ensureDir / delete

`electron/sync-target/webdav-driver.test.ts`
- 验证：
  - path 映射
  - URL 规范化
  - 路径安全
  - 方法级行为

`electron/webdav/credentials.ts`
- 负责：
  - WebDAV 凭据保存 / 读取 / 删除
- 不混进 driver 主逻辑

`electron/webdav/types.ts`
- WebDAV 相关：
  - 配置类型
  - 错误类型
  - 目录条目类型

### 2. 解耦原则

必须保持：

- `WebDAV driver` 属于 `sync target driver`
- `credential store` 和 `driver` 解耦
- 设置页 UI 不直接处理密码持久化

---

## 六、WebDAV driver 方法映射

`SyncTargetDriver` 方法与 WebDAV 的映射建议如下：

- `readText`
  - `GET`
- `writeText`
  - `PUT`
- `safeWriteJson`
  - `PUT JSON`
  - 第一版可先覆盖写
- `delete`
  - `DELETE`
- `list`
  - `PROPFIND`
- `exists`
  - `PROPFIND` 或 `GET`
- `ensureDir`
  - `MKCOL`

### 1. logicalPath 规则

`logicalPath` 继续统一使用 POSIX 风格，例如：

- `sync-info.json`
- `devices/<deviceId>.json`
- `items/dayPlanItems/<id>.json`

同步核心继续只处理逻辑路径，不处理真实远端 URL。

### 2. URL 映射规则

`WebDAV driver` 负责把：

- `logicalPath`

映射到：

- `baseUrl + rootPath + logicalPath`

例如：

- `baseUrl = https://dav.jianguoyun.com/dav/`
- `rootPath = J-Flow`
- `logicalPath = sync-info.json`

对应：

- `https://dav.jianguoyun.com/dav/J-Flow/sync-info.json`

### 3. URL 编码

driver 需要负责：

- URL 片段编码
- 路径拼接规范化

避免：

- 空格
- 中文
- 特殊字符

在远端路径中出现不可控差异。

### 4. 路径安全

必须防止：

- `../`
- 非法 absolute path 心智
- 通过 logicalPath 逃出 `rootPath`

原则是：

- `rootPath` 下才是 `J-Flow` 同步空间
- 任何 logicalPath 都不能逃逸出这个空间

---

## 七、POC 阶段范围

`WebDAV / 坚果云` POC 第一阶段只做 metadata 验证。

POC 只验证：

1. 可以用：
   - URL
   - 用户名
   - 应用密码
   连接坚果云 WebDAV
2. 可以创建或复用：
   - `rootPath = J-Flow`
3. 可以写入：
   - `sync-info.json`
4. 可以读取：
   - `sync-info.json`
5. 可以写入：
   - `devices/<deviceId>.json`
6. 可以 `list` 目录
7. 可以 `delete` 测试文件

POC 不做：

- `items / tombstones` 导入导出
- `syncNow` 完整闭环
- `LWW`
- UI 最终状态机
- 自动同步

---

## 八、WebDAV 错误处理

第一版至少需要能区分并返回清晰错误：

- `401 / 403`
  - 用户名或应用密码错误
- `404`
  - 目录或文件不存在
- `405`
  - `MKCOL` 目标已存在，或服务不支持某行为
- `409`
  - 父目录不存在
- `423`
  - locked，如服务返回
- 网络错误 / 超时
- `PROPFIND` 的 XML 解析失败
- 空间不足或写入失败

POC 阶段原则：

- 只需要返回清晰错误
- 不做复杂恢复
- 不做自动重试策略

---

## 九、是否引入依赖

这一点建议先在实现前做小范围决策，不要直接上依赖。

### 方案 A：直接用 `fetch + XML parser`

优点：

- 更轻
- 控制力更强
- 不容易被第三方库的抽象限制

缺点：

- `PROPFIND / MKCOL` 等细节都要自己处理
- XML 解析、命名空间、目录列表兼容性要自己兜

### 方案 B：使用轻量 WebDAV client 库

优点：

- 可能更快跑通 `PROPFIND / MKCOL / DELETE`
- 目录遍历和 URL 处理工作量更小

缺点：

- 需要额外评估：
  - Electron main process 可用性
  - macOS / Windows 打包影响
  - TypeScript 类型支持
  - 长期维护风险

### 当前建议

文档阶段先不定案，只先给出评估维度：

- Electron main process 可用性
- macOS / Windows 打包影响
- `PROPFIND / MKCOL` 支持是否稳定
- 类型支持是否足够
- 维护风险是否可接受

如果后续要快速跑通 POC，通常可以先优先比较一个轻量库与“自己写 `fetch + XML parser`”的成本，再决定。

---

## 十、设置页未来状态机

继续保持“同步目标”心智。

目标类型：

- 本地文件夹
- 坚果云 WebDAV
- `OneDrive`（未来）

坚果云状态至少包括：

- 未配置
- 已配置但未测试
- 连接测试成功
- 连接测试失败
- 同步中
- 同步成功
- 同步失败

主按钮建议：

- 未配置：
  - `配置坚果云`
- 已配置：
  - `立即同步`
- 测试失败：
  - `重新测试`
- 同步中：
  - `同步中…`

但本轮不实现 UI。

---

## 十一、实现顺序

建议后续按下面顺序推进：

1. `constraints` 边界更新
2. target config schema 增加 `webdav`
3. WebDAV credential store
4. WebDAV driver POC
   - `GET / PUT / PROPFIND / MKCOL / DELETE`
5. 坚果云 metadata POC
   - `sync-info.json / devices`
6. `WebDAV driver` 接入现有 `syncNow`
7. 设置页同步目标 UI
8. macOS + Windows 真机测试

---

## 十二、当前不做什么

当前明确不做：

- WebDAV driver 代码
- 增加 WebDAV 依赖
- 坚果云账号密码 UI
- `syncNow` 改造
- `LocalFolderDriver` 改造
- `items / tombstones` 同步
- 自动同步
- `OneDrive OAuth`
- `Dropbox / Google Drive / WebDAV` 以外目标

---

## 十三、当前结论

当前最合理的方向是：

- 先把第一云同步目标正式收口为 `WebDAV / 坚果云`
- 再做 target config、credential store、WebDAV driver POC
- 最后再让现有 `syncNow` 复用这个新 target

这样既能复用现有 `Sync 1-5` 主链，也能避开当前 `OneDrive` 前置配置阻力。 
