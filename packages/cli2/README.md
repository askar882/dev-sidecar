# dev-sidecar cli2

`cli2` 是面向终端与 Agent 场景的 `dev-sidecar` 命令行入口（命令名：`ds2`）。

## 安装与入口

### 方式一：全局安装（推荐）

在仓库根目录执行：

```bash
npm install -g ./packages/cli2
```

安装后可直接使用：

```bash
ds2 --help
```

### 方式二：不安装，直接运行（临时使用）

在仓库根目录执行：

```bash
node packages/cli2/cli.js --help
```

### 方式三：pnpm 全局链接（开发者）

在仓库根目录执行：

```bash
pnpm --filter @docmirror/dev-sidecar-cli2 link --global
```

安装后可直接使用：

```bash
ds2 --help
```

> Windows 如果提示命令不可用，请重开终端，或确认全局 npm/pnpm bin 目录在 PATH 中。

## 卸载

### 卸载 npm 全局安装

```bash
npm uninstall -g @docmirror/dev-sidecar-cli2
```

### 取消 pnpm 全局链接

在仓库根目录执行：

```bash
pnpm --filter @docmirror/dev-sidecar-cli2 unlink --global
```

如仍可执行 `ds2`，请重开终端；必要时检查 PATH 中是否残留旧的全局 bin 目录。

## 设计目标

- 提供稳定、可脚本化的命令行操作（支持 `--json` 输出）
- 与 GUI 共用同一内核，不强制双开
- 保持“服务进程”和“系统代理开关”可分离控制
- `cli2` 运行时能力优先复用 `core`，CLI 侧仅保留命令编排与输出

## 架构说明（runtime 下沉）

从当前版本开始，`cli2` 的运行时逻辑已下沉到 `@docmirror/dev-sidecar` 的 `core`：

- `core.api.runtime` 统一提供：状态探测、代理启停、插件启停、端口检查
- `packages/cli2/src/runtime.js` 变为薄封装，避免重复维护平台逻辑
- `proxy stop --server` 优先按 `core` 记录的服务 PID 停止，不再依赖脆弱的命令拼接链

这可以保证 GUI 与 CLI2 对“运行态”的判断和操作语义一致，减少两套实现分叉。

## 与 GUI 共存（重要）

`cli2` 与 GUI 默认共用同一内核：

- `ds2 proxy start`：如果检测到已有 `dev-sidecar` 内核，会**复用已有内核**，只执行系统代理开启，并自动启动已启用插件
- `ds2 proxy stop`：默认只关闭系统代理，**不停止服务进程**（避免把 GUI 内核关掉）
- `ds2 proxy stop --server`：同时关闭系统代理与服务进程（可能影响 GUI）

> `cli2` 现在会读取 `core` 持久化的运行态文件来判断服务和插件状态。
> 如果你当前运行的是旧版本 GUI / core，请先重启 GUI 一次，让它写出最新运行态文件。

## 常用命令

### 代理管理

- `ds2 proxy start`
  - 启动代理；若已有内核则复用，并自动启动已启用插件
- `ds2 proxy start --force`
  - 强制尝试新启服务（一般不建议与 GUI 共用时使用）
- `ds2 proxy stop`
  - 关闭系统代理，并停止运行中/已启用插件；默认保持服务运行
- `ds2 proxy stop --server`
  - 关闭系统代理、停止插件，并停止服务
- `ds2 proxy status`
  - 查看代理相关状态（服务端口、服务运行态、系统代理运行态、是否由 dev-sidecar 管理）

### 插件管理

- `ds2 plugin`
  - 查看插件列表
- `ds2 plugin status`
  - 查看插件运行态与启用态
- `ds2 plugin start [name]`
  - 启动指定插件；不传 `name` 时启动所有已启用插件
- `ds2 plugin stop [name]`
  - 停止指定插件；不传 `name` 时停止所有运行中或已启用插件
- `ds2 plugin restart [name]`
  - 重启指定插件；不传 `name` 时重启所有已启用插件

### 状态与配置

- `ds2 status`
  - 查看完整状态（服务、代理、插件）
- `ds2 config get [key]`
  - 读取配置（可指定键）
- `ds2 config set <key> <value>`
  - 更新配置，`value` 支持 JSON

### 其他

- `ds2 tui`
  - 打开终端交互界面

## JSON 输出（Agent/脚本）

绝大多数命令支持 `--json`，建议在自动化场景使用：

```bash
ds2 proxy start --json
ds2 proxy status --json
ds2 proxy stop --json
ds2 plugin status --json
```

返回结构通常包含：

- `success`：命令是否成功
- `action`：动作标识（如 `proxy_start`）
- `status`：运行态信息（服务运行、系统代理运行、插件状态等）
- `plugins`：插件操作结果或插件状态列表（部分命令返回）

## 本地开发运行

在仓库根目录执行：

```bash
node packages/cli2/cli.js --help
node packages/cli2/cli.js proxy status --json
```

## 注意事项

- Windows 下系统代理状态读取来自注册表（`Internet Settings`）
- Linux/macOS 在桌面代理命令不可用时，会回退到环境变量模式（`HTTP_PROXY`/`HTTPS_PROXY`）
- `server.running` 表示 `cli2` 能确认当前监听端口对应的是 `dev-sidecar` 自己的服务进程，而不只是“端口被占用”
- `proxy.running` 表示系统代理当前是否开启，不等同于 `config.proxy.enabled`
- `managedByDevSidecar` 为 `false` 时，通常表示当前代理或端口状态无法确认归属于 `dev-sidecar`
- `plugin.enabled` 表示配置上已启用；`plugin.running` 表示运行态上已启动，两者不是同一个概念
- `proxy stop --server` 只会尝试停止已确认属于 `dev-sidecar` 的服务进程，不会再按端口盲杀未知进程

## 下一步：cli2 与 core 联合打包（建议）

目标：让 `cli2` 像 GUI 一样，发布时携带可运行的 `core + mitmproxy + extra`，用户安装后可开箱即用。

### 推荐方案（优先）

使用 `pkg` 或 `nexe` 产出单文件/单目录可执行程序（如 `ds2.exe`），并在发布产物内附带：

- `@docmirror/dev-sidecar`（core）
- `@docmirror/mitmproxy`
- `extra/`（如 `sysproxy.exe`、证书/脚本等运行时资源）

优点：安装简单、入口统一、适合无 Node 环境用户。

### 实施步骤

1. 在 `packages/cli2` 新增打包脚本（`build:bin`、`build:dist`）。
2. 将 `src/mitmproxy.cjs`、`extra/` 复制到发布目录（例如 `dist/cli2/`）。
3. 启动时优先解析“相对可执行文件目录”的资源路径（避免依赖源码目录）。
4. 增加 Windows smoke test：`proxy start --json`、`proxy stop --json`、`status --json`。
5. 在根级发布流程中新增 `cli2` 产物上传，与 GUI 产物并列。

### 与 GUI 共存约束

- 默认保持当前语义：`start` 复用已有内核、`stop` 默认不关服务。
- 仅显式 `--server` 时才允许停止服务，避免误伤 GUI。
