# J-Flow WebDAV POC 决策清单

## 文档定位

这份文档只做两件事：

1. 拍板 `webdav target config` 的本机存放位置和持久化方式
2. 拍板 WebDAV POC 是使用 `fetch + XML parser`，还是引入轻量 WebDAV client 库

本轮不做：

- WebDAV driver 代码
- credential store 代码
- `syncNow` 改造
- 设置页 UI

---

## 一、target config 存储决策

### 1. 当前基础

当前 `localFolder` 同步目标仍基于：

- `sync_meta.syncTargetPath`

这适合“只有一个本地路径”的阶段，但不适合扩展到：

- `localFolder`
- `webdav`
- `oneDrive`（未来）

### 2. 推荐决策

后续统一升级为：

- 在本机 `SQLite sync_meta` 中保存 `syncTargetConfig`

建议心智：

- 保留旧的 `syncTargetPath` 作为兼容字段
- 新主字段改为：
  - `syncTargetConfig`

推荐结构：

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

### 3. 明确边界

`syncTargetConfig`：

- 只保存在本机 `SQLite sync_meta`
- 不进入同步目录
- 不进入 `items / tombstones`
- 不进入 JSON 备份
- 不跨设备同步
- Web 端不使用

### 4. 凭据不进入 config

下面这些信息不进入 `syncTargetConfig`：

- password
- app password

原因：

- `syncTargetConfig` 描述的是“同步目标是什么”
- password 属于本机敏感凭据，应由 `credential store` 保存

### 5. 坚果云默认值

当：

- `provider = 'jianguoyun'`

建议默认：

- `baseUrl = https://dav.jianguoyun.com/dav/`
- `rootPath = J-Flow`

---

## 二、credential store 决策

### 1. POC 阶段推荐

POC 阶段采用：

- `Electron safeStorage + 本机隔离文件`

### 2. 推荐规则

凭据按下面维度索引：

- `provider + baseUrl + username`

这样可以保证：

- 同一个服务地址和用户名可以稳定读取同一份密码
- 更换 URL 或账号时不会误用旧凭据

### 3. 保存时机

第一阶段建议：

- 测试连接失败时，默认不持久化凭据
- 测试连接成功后，才保存凭据

原因：

- 避免错误密码长期留在本机
- 更符合“先验证，再保存”的保守策略

### 4. 清理时机

清除 `WebDAV target` 时，应同步删除：

- 本机保存的 WebDAV 密码 / 应用密码

但不应删除：

- 同步目录里的远端文件
- 本地业务数据

### 5. 安全边界

必须保持：

- renderer 不直接持久化密码
- 密码不进入同步目录
- 密码不进入 JSON 备份
- 密码不进入 `items / tombstones`

---

## 三、WebDAV 实现方式决策

### 方案 A：`fetch + XML parser`

优点：

- Electron main process 可直接使用
- 对 macOS / Windows 打包影响较小
- HTTP 方法和错误处理可完全自定义
- 依赖更轻
- 更适合当前 POC 只做：
  - `GET`
  - `PUT`
  - `DELETE`
  - `MKCOL`
  - `PROPFIND`

缺点：

- `PROPFIND` XML 需要自己解析
- WebDAV 细节需要自己封装
- 初始实现工作量高于直接套 client

### 方案 B：轻量 WebDAV client 库

优点：

- 目录访问和 WebDAV 方法封装可能更快起步
- POC 阶段某些操作可能更省代码

缺点：

- 需要额外评估：
  - Electron main process 兼容性
  - macOS / Windows 打包影响
  - `PROPFIND / MKCOL` 是否真的覆盖到位
  - 类型定义是否可靠
- 可能引入我们并不需要的大量抽象
- 后续出现兼容问题时，排查成本更高

### 当前建议

推荐：

- POC 阶段使用 `fetch + XML parser`

原因：

- 当前 POC 范围很小
- 只验证 metadata，不做完整同步
- 我们真正需要的是：
  - 可控的 HTTP 方法
  - 可控的错误处理
  - 可控的路径映射
- 不急着引入完整 WebDAV client 库

### XML parser 候选

如果走这个方向，建议只新增一个轻量 XML parser，候选例如：

- `fast-xml-parser`

原因：

- 轻量
- TypeScript / Node 生态成熟
- 适合作为 `PROPFIND` XML 解析器

当前不建议：

- 一上来引入完整 WebDAV client 库

---

## 四、WebDAV POC 代码阶段建议

下一轮代码 POC 建议严格保持最小范围：

1. 新增 WebDAV types
2. 新增 credential store
3. 新增 WebDAV low-level client
4. 实现：
   - `GET`
   - `PUT`
   - `DELETE`
   - `MKCOL`
   - `PROPFIND`
5. 连接坚果云测试
6. 写 / 读 / 删一个测试 JSON
7. 还不接 `syncNow`
8. 还不写 UI

这样可以先证明：

- 坚果云 WebDAV 可连接
- metadata 文件读写可行
- 凭据存储策略可工作

再进入下一步：

- `WebDAV driver`
- `sync-info.json / devices` POC

---

## 五、当前结论

本轮推荐决策如下：

1. `webdav target config`
   - 存在本机 `SQLite sync_meta`
   - 使用 `syncTargetConfig` JSON 结构
2. `credential store`
   - POC 阶段采用：
     - `Electron safeStorage + 本机隔离文件`
3. WebDAV POC 实现方式
   - 采用：
     - `fetch + XML parser`
   - 不先引入完整 WebDAV client 库

这三点拍板后，下一轮就可以比较稳地开始写 WebDAV POC 代码。 
