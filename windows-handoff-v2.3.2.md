# J-Flow V2.3.2 Windows 移交说明

## 移交范围

本压缩包包含：

- V2.3.1：
  - macOS 跨日页面刷新修复
  - 分次事项完成后回退的日志修复
  - THIS DAY 黄色导航按钮
  - 种草清单三态兴趣排序
  - 必要 / 重复输入控件压缩
- V2.3.2：
  - Todo `只看必要`
  - 完成时间编辑统一为 24 小时制
  - Todo 拖动排序
  - `只看必要` 与排序模式互斥

分次进度条 UI 优化与“分步”概念仍然搁置，未在本轮实现。

## Windows 环境准备

1. 安装 Node.js。
2. 在项目目录运行：

```powershell
corepack enable
corepack pnpm install
```

3. 若 `build/icon.ico` 不存在，运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate-icon-win.ps1
```

## 验证命令

```powershell
corepack pnpm run lint
corepack pnpm exec vitest run src/features/todo/completed-at-editor.test.ts src/features/logbook/logbook-service.test.ts
corepack pnpm run build:desktop
corepack pnpm run dev:desktop
```

## Windows 打包

Portable：

```powershell
corepack pnpm run package:win:portable
```

安装包：

```powershell
corepack pnpm run package:win:nsis
```

预期产物：

- `release/J-Flow-V2.3.2-win-portable.exe`
- `release/J-Flow-V2.3.2-win-setup.exe`
- `release/J-Flow-V2.3.2-win-setup.exe.blockmap`

## 人工测试重点

- 跨日后 Today 页面刷新与事项顺延。
- 分次事项完成后回退，次日日志不再错误显示已完成。
- 种草清单排序按钮按以下顺序循环：
  - 更新时间排序
  - 高兴趣优先
  - 低兴趣优先
- `只看必要` 同时包含未完成和已完成必要事项。
- 开启 `只看必要` 后必须禁用 `调整顺序`。
- 完成时间编辑默认聚焦并选中 `HH`，使用 24 小时制。
- 拖动排序支持同一时段排序及跨白天 / 晚上分隔线。

完整测试项见：

- `manual-test-checklist.md`
- `handoff.md`
- `dev-log.md`

## 安全说明

- 压缩包不包含 `.env.local`。
- 坚果云 WebDAV 用户名和密码需要在 Windows 测试机本地重新配置。
- 压缩包不包含 macOS DMG、`node_modules`、构建缓存或本地数据库。
