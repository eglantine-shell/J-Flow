# J-Flow OneDrive 同步目标设计（草案）

## 文档定位

这份文档描述的是：

- `J-Flow` 如果要支持“像 Joplin 一样接入 OneDrive”；
- 需要新增哪些能力；
- 应该怎样和当前已经实现的本地文件夹同步共存。

这不是实现代码，也不是最终产品规则。

它的目标是先把下面几个问题讲清楚：

- OneDrive 同步和当前“同步文件夹”是什么关系
- 为什么 Joplin 可以这样做
- J-Flow 需要怎样改，才不会推翻现有 Sync 1-5

---

## 一、问题定义

当前 `J-Flow` 已经实现的第一版同步，核心思路是：

- 每台设备保留自己的本地 SQLite
- 通过一个同步目录交换 `items/`、`tombstones/`、`sync-info.json`
- 手动点击“立即同步”

这套方案已经能支持：

- 本机目录
- iCloud Drive 目录
- OneDrive 本地同步目录
- Dropbox 本地同步目录
- NAS 挂载目录

只要这些目标在系统里表现成一个普通文件夹，就可以被当前方案使用。

但它和 Joplin 的 OneDrive 同步仍然不是一回事。

Joplin 的 OneDrive 同步是：

- 用户选择 `OneDrive`
- 用浏览器完成微软授权
- Joplin 直接通过 OneDrive / Microsoft Graph API 读写云端的 `Apps/Joplin`

也就是说，Joplin 不是要求用户先在 OneDrive 本地客户端里找一个目录。

它是直接接入 OneDrive 作为同步目标。

---

## 二、目标是什么

如果 `J-Flow` 要“像 Joplin 那样接 OneDrive”，目标不应该是：

- 新做一套完全不同的同步算法
- 推翻当前 Sync 1-5
- 引入 J-Flow 自己的账号系统

更合理的目标是：

- 保留当前同步格式和同步规则
- 新增一个 `OneDrive` 同步目标
- 让用户可以在设置页里把同步目标从“本地文件夹”切换成“OneDrive”

换句话说，变化的重点不是：

- “同步规则”

而是：

- “同步目标驱动”

---

## 三、OneDrive 同步和当前本地文件夹同步的关系

当前同步方案其实已经完成了两件最难的事情：

1. 定义了同步交换格式  
   例如：
   - `sync-info.json`
   - `devices/<deviceId>.json`
   - `items/...`
   - `tombstones/...`
   - `locks/...`

2. 定义了同步行为  
   例如：
   - 本地变更如何导出
   - 远端变更如何导入
   - `last-write-wins`
   - 删除如何传播
   - 手动同步闭环如何运行

所以 OneDrive 目标不应该重做这些事情。

OneDrive 目标应当只是把“底层读写位置”从：

- 本地目录

换成：

- OneDrive App Folder

这意味着：

- `sync-info.json` 仍然存在
- `items/` 仍然存在
- `tombstones/` 仍然存在
- `syncNow()` 的整体流程仍然存在

变的是：

- 文件怎么列出来
- 文件怎么读
- 文件怎么写
- 用户如何授权

---

## 四、为什么 Joplin 可以这样做

Joplin 的 OneDrive 同步本质上是：

1. 通过系统浏览器完成微软 OAuth 授权  
2. 拿到 OneDrive / Microsoft Graph 的访问 token  
3. 只读写应用自己的 App Folder  

这类模式的特点是：

- 不需要 Joplin 自己维护账号系统
- 不需要 Joplin 自己搭云数据库
- 用户也不需要手工去找 OneDrive 本地目录

用户看到的心智是：

- “我把同步目标设置成 OneDrive”

而不是：

- “我去本机挑了一个 OneDrive 文件夹”

这也是它比“选择本地同步目录”更像一个正式同步目标的地方。

---

## 五、J-Flow 需要新增什么能力

### 1. 同步目标模型

当前 `J-Flow` 的同步目标实际上只有一种：

- `localFolder`

如果要支持 OneDrive，建议把同步目标抽象成：

- `localFolder`
- `oneDrive`

也就是：

- 同步目标不再只是“一个路径”
- 而是“一个 target type + 一组 target config”

建议心智：

- `localFolder`
  - 通过本地目录读写同步文件
- `oneDrive`
  - 通过 OneDrive API 读写同步文件

### 2. OneDrive 授权层

新增一个桌面端授权模块，负责：

- 发起授权
- 打开系统浏览器
- 监听 `localhost` 回调
- 拿到授权 code
- 用 `Authorization Code + PKCE` 换 token
- 本机保存 token
- 支持断开连接

这部分能力应放在 Electron `main process`，不应直接放在 renderer。

### 3. OneDrive 同步驱动

新增一个同步驱动，用于把当前同步目录结构映射到 OneDrive App Folder。

它至少要支持：

- 读文本文件
- 写文本文件
- 删除文件
- 列目录
- 检查目录或文件是否存在

如果这一层抽象做得好，现有：

- `prepareSyncTargetDirectory`
- `exportLocalChangesToSyncFolder`
- `importRemoteChangesFromSyncFolder`
- `runManualSync`

都可以继续沿用，只需要把底层文件读写替换成 driver。

### 4. token 本地存储

OneDrive access token / refresh token 不应：

- 存进同步目录
- 存进业务同步数据
- 混进 `items/` 或 `sync_meta` 的普通同步字段

建议原则：

- token 是本机授权信息
- 只属于当前设备
- 不参与跨设备同步

理想做法是：

- 使用系统安全存储

如果第一版还没接系统 keychain，也至少要做到：

- token 独立保存
- 与业务 SQLite 数据隔离

### 5. 设置页心智切换

当前设置页同步卡片的心智是：

- 选择同步文件夹

如果新增 OneDrive，同步卡片要变成：

- 选择同步目标

例如：

- 本地文件夹
- OneDrive

然后：

- 选本地文件夹时，显示目录操作
- 选 OneDrive 时，显示连接 / 断开 / 账号状态

这一步很重要，因为它决定用户能否理解：

- J-Flow 不是“又多了一个路径设置”
- 而是“开始支持一个新的同步目标”

---

## 六、推荐架构方向

推荐把现有同步层继续收口成：

### 1. Sync Core

负责：

- 同步格式
- tombstone 规则
- `last-write-wins`
- 本地导入导出
- 同步闭环

这一层尽量不感知 OneDrive。

### 2. Sync Target Driver

负责：

- 如何列出远端文件
- 如何读写远端文件
- 如何删除远端文件
- 如何初始化目标空间

建议目标：

- `LocalFolderDriver`
- `OneDriveAppFolderDriver`

### 3. Auth / Connection Layer

只对云目标有效。

例如：

- `OneDriveAuthService`

负责：

- 授权
- 刷新 token
- 获取当前连接状态

### 4. Settings UI Layer

负责让用户看懂：

- 当前同步目标是什么
- 当前是否已连接
- 当前是否能立即同步

而不是让设置页直接感知 token 细节。

---

## 七、推荐实现顺序

如果未来要真正开始做，建议按下面顺序推进。

### Step 1：先更新规则文档

当前 `constraints.md` 仍写着：

- 当前不做云同步
- `OneDrive` 只是未来预留

如果正式开始做 OneDrive，需要先明确更新为：

- 不做 J-Flow 自有账号系统
- 但允许第三方云目标授权接入
- 第一目标为 `OneDrive`

### Step 2：先抽 sync target driver

不要一开始就直接写微软授权。

应先把现有同步实现里的“本地目录访问”抽成统一接口，并让当前 local folder 先跑通。

这样能保证：

- 架构不会被 OneDrive 特殊逻辑污染

### Step 3：单独做 OneDrive 授权

先做到：

- 可以连接 OneDrive
- 可以断开连接
- 可以拿到 token
- 可以读到自己的 App Folder

先不接入完整同步。

### Step 4：先做 OneDrive metadata 读写

第一批只做：

- `sync-info.json`
- `devices/<deviceId>.json`

验证 OneDrive driver 是真的能稳定读写。

### Step 5：再把 items / tombstones 接进去

这时才把：

- export
- import
- locks
- `syncNow`

切到 OneDrive driver。

### Step 6：最后再改设置页同步目标 UI

这一步不要太早做。

因为如果授权和 driver 还没稳定，UI 很容易先变复杂，结果功能还没跑通。

---

## 八、需要先确认的规则

在真的开始实现之前，我建议先确认这几件事。

### 1. 是否允许突破“当前不做云同步”约束

虽然 OneDrive 不是 J-Flow 自己的云数据库，但它已经是：

- 第三方云目标同步

所以这不是一个纯实现问题，而是阶段目标变化。

### 2. 是否接受“先支持 OneDrive，不先支持 Dropbox / Google Drive / WebDAV”

建议第一目标只做：

- OneDrive

否则范围会一下子扩大。

### 3. token 的本机存储策略

至少要明确：

- 是否可以先落本机本地配置
- 还是必须优先接系统安全存储

### 4. 设置页是否允许同步目标从“文件夹”升级成“目标类型”

这是后续 UI 设计的关键前提。

如果这点不确认，当前同步卡片会一直停留在“目录设置”心智里。

---

## 九、这件事不会改变什么

即使未来做成 OneDrive 目标，下面这些原则也仍然应该保持不变：

- 每台设备继续使用自己的本地 SQLite
- 不直接同步 SQLite 文件本体
- JSON 备份继续是备份，不当同步包
- 同步仍然优先是手动触发
- 不引入 J-Flow 自有账号系统

也就是说：

OneDrive 目标的引入，不等于把 J-Flow 变成在线 SaaS。

它只是把当前同步方案的“远端存储位置”从本地目录扩展到了受控云目标。

---

## 十、当前建议

当前最稳妥的下一步不是直接写代码，而是：

1. 先确认产品边界是否允许支持 OneDrive 目标  
2. 再补一份更偏工程实现的文档  

建议下一份文档可以是：

- `docs/sync-onedrive-implementation-plan.md`

重点写：

- target driver 接口
- OneDrive auth 流程
- token 存储建议
- 设置页“同步目标”状态机
- OneDrive driver 如何复用现有 Sync 2-5
