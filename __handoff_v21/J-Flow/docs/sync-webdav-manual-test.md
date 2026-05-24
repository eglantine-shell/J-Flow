# WebDAV / 坚果云手动测试

本文档用于说明如何在本机使用测试数据和测试目录，手动验证 `webdav syncNow` 是否能真实跑通坚果云。

## 一、测试前准备

请先在坚果云网页端生成第三方应用密码：

1. 登录坚果云网页版
2. 进入 `账户信息`
3. 打开 `安全选项`
4. 打开 `第三方应用管理`
5. 添加应用密码
6. 应用名建议填写：`J-Flow`

注意：
- 这里使用的是第三方应用密码，不是坚果云登录密码
- 不要把应用密码提交到 Git
- 不要把应用密码写入同步目录
- 不要把应用密码写入 JSON 备份

## 二、配置 `.env.local`

在仓库根目录创建 `.env.local`：

```env
JFLOW_WEBDAV_BASE_URL=https://dav.jianguoyun.com/dav/
JFLOW_WEBDAV_ROOT_PATH=J-Flow-Test
JFLOW_WEBDAV_USERNAME=your-email@example.com
JFLOW_WEBDAV_PASSWORD=your-webdav-app-password
```

说明：
- `JFLOW_WEBDAV_ROOT_PATH` 不要填写正式目录 `J-Flow`
- 建议继续使用测试目录，例如：
  - `J-Flow-Test`
  - `J-Flow-Test-YourName`

`.env.local` 已在 `.gitignore` 中忽略，不会默认提交。

## 三、运行命令

执行：

```bash
corepack pnpm run test:webdav:manual
```

这个命令会：

1. 先执行 `build:desktop`
2. 用 Electron 运行 dev-only 手动测试脚本
3. 自动创建一个临时 SQLite 数据目录
4. 自动构造最小测试数据
5. 先保存 `webdav target config + credential`
6. 再运行一次真实 `syncNow`

为了让结果稳定、可重复，脚本当前会：

1. 先写入测试 seed 数据
2. 将 seed 自动产生的 `sync_changes` 统一标记为已同步
3. 再只创建两条本轮测试变更：
   - 一个 `dayPlanItem upsert`
   - 一个 `dayPlanItem delete / tombstone`

因此本轮预期应是：

- `beforeSyncChangesCount = 2`
- `syncResult.exportResult.exportedCount = 2`

## 四、脚本会验证什么

脚本会使用测试数据目录，不会使用你的正式 J-Flow 数据目录。

脚本当前会验证：

1. `sync-info.json`
2. `devices/<deviceId>.json`
3. `locks/`
4. 一个 `dayPlanItem` 的 item export
5. 一个 `dayPlanItem` 的 tombstone export

也就是远端应看到：

```text
J-Flow-Test/
  sync-info.json
  devices/
  items/
  tombstones/
  locks/
```

并且在测试通过时，还应看到：

```text
items/dayPlanItems/<upsert-id>.json
tombstones/dayPlanItems/<delete-id>.json
```

## 五、终端预期输出

终端会输出一段 JSON 结果，内容包含：

- `success`
- `dataPath`
- `config`
- `metadataResult`
- `syncResult`
- `remote.rootEntries`
- `remote.dayPlanItemEntries`
- `remote.tombstoneEntries`
- `remote.itemExists`
- `remote.tombstoneExists`

结果中不会包含 password。

说明：
- 脚本在同步完成后会对远端做附加校验：
  - 列根目录
  - 列 `items/dayPlanItems`
  - 列 `tombstones/dayPlanItems`
  - 直接检查测试 item / tombstone 是否存在
- 坚果云偶发会对 `PROPFIND` 返回 `503`
- 当前脚本已对这类“远端附加校验”加入有限重试
- 如果个别目录 listing 仍然临时失败，会写进：
  - `remote.warnings`
  但不会把已经成功的 `syncNow` 误判成整轮同步失败

如果成功，重点看：

- `metadataResult.success = true`
- `syncResult.status = "success"` 或至少不是 `failed`
- `testItems.beforeSyncChangesCount = 2`
- `syncResult.exportResult.exportedCount = 2`
- `remote.itemExists = true`
- `remote.tombstoneExists = true`
- `remote.warnings` 为空，或仅包含附加校验阶段的临时告警

## 六、在坚果云网页端确认什么

到坚果云网页端确认：

1. `J-Flow-Test/` 目录存在
2. `sync-info.json` 存在
3. `devices/` 下有当前设备的 JSON
4. `items/dayPlanItems/` 下出现测试 item
5. `tombstones/dayPlanItems/` 下出现测试 tombstone

## 七、失败时如何排查

优先看终端输出中的：

- `metadataResult.errors`
- `syncResult.errors`
- `syncResult.warnings`
- `remote.warnings`

常见排查方向：

1. 用户名是否填写成坚果云账号邮箱
2. 密码是否是第三方应用密码，而不是登录密码
3. `baseUrl` 是否保持：
   - `https://dav.jianguoyun.com/dav/`
4. `rootPath` 是否用了测试目录，而不是正式目录
5. 本机网络是否能正常访问坚果云 WebDAV

## 八、如何清理测试目录

如果要清理远端测试目录：

1. 打开坚果云网页端
2. 找到 `J-Flow-Test`
3. 手动删除整个测试目录

如果你想保留测试目录做下一轮复测，也可以不删。

本地临时 SQLite 数据目录会在脚本输出中显示 `dataPath`，仅用于本轮测试，不会成为正式数据目录。
