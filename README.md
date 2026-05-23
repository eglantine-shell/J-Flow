# J-Flow

J-Flow 是一个本地优先的个人 Todo 与种草清单桌面工具，适合管理日常待办、长期想做的事，以及“有空时从清单里挑一件来做”的轻量节奏。

在线参考版本：
- [J-Flow V2 Web](https://eglantine-shell.github.io/J-Flow/)

## 项目简介

J-Flow 试图解决几件很日常、但常常分散在不同工具里的事：

- 记录今天要做的 Todo
- 收藏暂时不做、但以后想试试的“种草”条目
- 在有空的时候，从种草清单里挑一个加入今天
- 以本地优先的方式保存数据，不依赖云端账号

它当前的主线不是团队协作，也不是云同步，而是先把一个适合长期自用的本地桌面版打磨稳定。

## 当前状态

- `V2 Web` 已部署，作为可试用和参考版本保留
- `V3 Desktop` 是当前主线
- macOS 桌面版目前已经可以本地打包自用
- 当前最新 macOS 自用包产物名为 `J-Flow-V2.1.dmg`
- 当前最新 Windows portable 产物名为 `J-Flow-V2.1-win-portable.exe`

当前版本线：

- `V1.4`
  - 上一版稳定 macOS 自用包
- `V2.0`
  - 主要更新为本地文件夹同步能力
- `V2.1`
  - 在 `V2.0` 基础上新增必要事项 `DDL`

## 功能亮点

- Todo 今日页与任意日期查看
- 日历跳转
- 重复规则：日历式重复 / 完成后重复
- 已完成事项按完成日期归属显示
- Todo 手动排序
- 种草清单独立页面
- 批量种草
- 桌面端本地 SQLite 存储
- JSON 导入 / 导出
- 数据目录入口与本地自动备份
- 本地文件夹同步与最小自动同步
- 必要事项 `DDL`
- 日志页（Logbook）查看每日完成、未完成与删除快照

## 平台支持

- Web：可运行，可作为参考版本
- macOS：当前主要自测与打包平台
- Windows：已接入打包链路，仍待进一步验证

当前阶段不包含：

- 账号系统
- 官方云同步
- iOS / Android 原生应用

## 技术栈

- React 19
- TypeScript
- Vite
- React Router
- Zustand
- Dexie（Web）
- Electron
- SQLite（Desktop）
- Vitest

## 本地开发

安装依赖：

```bash
corepack pnpm install
```

启动 Web 开发环境：

```bash
corepack pnpm run dev
```

启动 Desktop 开发环境：

```bash
corepack pnpm run dev:desktop
```

构建 Web：

```bash
corepack pnpm run build
```

构建 Desktop：

```bash
corepack pnpm run build:desktop
```

构建 Electron 主进程：

```bash
corepack pnpm run build:electron
```

打包 macOS 自用版本：

```bash
corepack pnpm run package:mac
```

打包 Windows portable：

```bash
corepack pnpm run package:win
```

## 打包产物

当前 `electron-builder` 输出目录为：

- `release/`

常见产物位置：

- macOS `.dmg`：`release/J-Flow-V2.1.dmg`
- Windows `.exe`：`release/J-Flow-V2.1-win-portable.exe`
- Windows SHA256：`00846D667827B552887BB6010F87C94B2D479E566E37586C03BE5CF337829385`

说明：

- `release/` 中既会有最终可分发产物，也会有 `.blockmap`、`builder-*.yml`、unpacked 目录等中间文件
- Git 仓库更推荐只提交源码，不提交二进制产物
- 若需要对外分发，更推荐通过 GitHub Releases 上传 `.dmg` / `.exe`

## 数据与隐私

J-Flow 当前是本地优先应用。

- Web 版数据保存在浏览器本地存储 / IndexedDB
- Desktop 版主库存储在本地 SQLite
- Desktop 用户数据目录通过 Electron `app.getPath('userData')` 获取
- Desktop 主库文件名当前为 `j-flow.sqlite3`
- 自动备份目录位于用户数据目录下的 `backups/`
- JSON 可用于完整导出、导入和备份
- 当前不依赖云端账号，也不做官方云同步

## 当前限制与 Roadmap

- Windows V2.1 portable 已在真机重新出包，仍待打开后的功能级手测
- 当前以单人长期自用为优先，不做多人协作
- 当前不做账号系统、云数据库、iCloud 或手机端同步
- 自动备份已支持基础能力，后续仍可继续完善备份管理体验
- 未来可能探索本地文件夹同步等本地优先方案

## 仓库说明

根目录优先保留源码、配置和当前有效规则文档；开发过程资料集中索引在：

- [开发文档索引](docs/README.md)

常用内部文档：

- [项目交接](handoff.md)
- [开发日志](dev-log.md)
- [产品规则](product-rules.md)
- [数据模型](data-model.md)
- [应用结构](app-structure.md)
- [约束说明](constraints.md)
- [任务清单](task-list.md)
- [手测清单](manual-test-checklist.md)

## License

MIT

Copyright (c) 2026 Ye Tingzhi

See [LICENSE](LICENSE).
