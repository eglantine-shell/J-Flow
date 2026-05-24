# J-Flow OneDrive OAuth POC 参数说明

## 文档定位

这份文档只回答一件事：

- `J-Flow` 如果开始做 `OneDrive App Folder` 同步目标，OAuth POC 需要先准备哪些参数和本地配置

本轮不做：

- OAuth 代码
- Microsoft Graph API 代码
- 设置页 UI
- `syncNow` 改造

---

## 一、POC 目标

OneDrive OAuth POC 第一阶段只验证：

1. 能在桌面端发起浏览器授权
2. 能通过 `localhost / 127.0.0.1` 回调拿到授权结果
3. 能拿到当前账号基础信息
4. 能为后续 `OneDrive App Folder driver` 提供最小授权基础

本阶段不验证：

- 完整同步闭环
- `items / tombstones` 导入导出
- 设置页最终 UI

---

## 二、OAuth 流程固定约束

第一版固定采用：

- 系统浏览器
- `Authorization Code + PKCE`
- `localhost / 127.0.0.1` loopback callback

职责分工：

- `Electron main process`
  - 生成 PKCE 参数
  - 拉起本地回调监听
  - 打开系统浏览器
  - 接收回调 code
  - 交换 token
  - 刷新 token
- `renderer`
  - 只触发连接 / 断开动作
  - 不直接持有 token

---

## 三、POC 所需参数

### 1. Microsoft App Client ID

用途：

- 标识当前桌面应用对应的 Microsoft App

建议配置名：

- `JFLOW_ONEDRIVE_CLIENT_ID`

说明：

- POC 阶段不要硬编码在业务代码中
- 应通过本地环境变量或本地开发配置注入

### 2. Redirect URI

用途：

- Microsoft 授权完成后回调到本机 loopback 服务

建议值形态：

- `http://127.0.0.1:9967/auth/callback`
- 或 `http://localhost:9967/auth/callback`

建议配置名：

- `JFLOW_ONEDRIVE_REDIRECT_URI`

说明：

- `localhost` 与 `127.0.0.1` 应在设计上视为同一类 loopback redirect
- 具体最终使用哪个，以后续 Microsoft App 注册配置为准

### 3. Authorization Scopes

用途：

- 告诉 Microsoft 本应用申请哪些权限

建议配置名：

- `JFLOW_ONEDRIVE_SCOPES`

建议在代码里最终收口为常量数组，而不是让用户在 UI 里填写。

### 4. App Folder 权限

POC 目标应明确限定为：

- 只访问 OneDrive App Folder

要求：

- 不请求整个 OneDrive 的泛读写权限
- 不请求与同步无关的用户数据权限

### 5. 可选辅助参数

未来可能还会需要：

- tenant 策略
- loopback 端口
- 回调路径

但 POC 第一阶段不建议把这些都做成可配置项，避免过早复杂化。

---

## 四、POC 推荐 scopes 方向

POC 应优先收口在“能登录 + 能访问 App Folder”的最小权限集。

建议方向：

- 基础身份 scopes
- 用于离线刷新的 scope
- 用于 App Folder 读写的权限 scope

POC 不应采用：

- 整盘泛读写
- 与邮件、日历、联系人等无关的扩展权限

说明：

- 具体 scope 字符串应在真正开始 Microsoft App 注册和 Graph POC 前，再和官方文档逐项核对。
- 本文档当前先定义“权限边界”，不提前写死未经验证的 scope 常量。

---

## 五、哪些配置可以提交到 Git

可以提交：

- 配置键名
- 示例配置文件
- `.env.example`
- OAuth 参数说明文档
- 非敏感默认值说明

例如可以提交：

```env
JFLOW_ONEDRIVE_CLIENT_ID=
JFLOW_ONEDRIVE_REDIRECT_URI=http://127.0.0.1:9967/auth/callback
```

说明：

- 示例文件可以有空值
- 文档中可以出现示例 `redirect URI`
- 只要不包含真实私密凭据即可

---

## 六、哪些配置不能提交到 Git

不能提交：

- 真实生产 `client id`，如果尚未确认是否公开纳入仓库
- access token
- refresh token
- 任何用户授权后的 token payload
- 本机测试账号信息快照
- 含敏感值的 `.env.local`
- 本机临时调试导出的授权结果 JSON

原则：

- 所有授权后敏感信息都只能保存在本机
- 不进入同步目录
- 不进入 `items / tombstones`
- 不进入 JSON 备份

---

## 七、本地配置文件命名建议

推荐：

- 仓库根目录：`.env.local`

可提交示例：

- `.env.example`

不建议：

- 把真实 OneDrive OAuth 配置直接写进 `package.json`
- 把真实配置散落进多个 Electron 文件

命名建议：

```env
JFLOW_ONEDRIVE_CLIENT_ID=
JFLOW_ONEDRIVE_REDIRECT_URI=http://127.0.0.1:9967/auth/callback
```

说明：

- POC 阶段先保持最小参数集
- 真正实现时，再决定是否需要把 scopes 也做成环境变量，还是直接收口在受控配置模块里

---

## 八、POC 前置检查清单

在开始写 OneDrive OAuth 代码前，应先确认：

1. `constraints.md` 已放开第三方云同步目标授权接入边界
2. 已确认第一目标只做 `OneDrive`
3. 已确认 token 不进入同步数据
4. 已确认本地配置文件命名
5. 已确认 POC 阶段不会把真实敏感值提交到 Git

---

## 九、POC 完成判定

OneDrive OAuth POC 完成的最小标准应是：

1. 可以从桌面端发起 OneDrive 登录授权
2. 可以通过 loopback callback 收到授权结果
3. 可以拿到当前账号基础信息
4. 可以把授权结果交给后续 OneDrive driver POC 使用

此时仍不要求：

- 跑通完整同步
- 改设置页最终目标选择 UI
- 支持多个第三方同步目标
