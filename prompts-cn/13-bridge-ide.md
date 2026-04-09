# Prompt 13: 桥接层（VS Code / JetBrains IDE 集成）

## 背景

您正在 `/workspaces/claude-code` 目录下工作。"桥接"是连接 Claude Code 与 IDE 扩展（VS Code、JetBrains）的子系统。它支持：
- 从 IDE 远程控制 Claude Code
- 在 IDE 和 CLI 之间共享文件上下文
- 从 IDE UI 进行权限审批
- 跨 IDE 和终端的会话管理

桥接受 `feature('BRIDGE_MODE')` **控制**，是最复杂的可选子系统（`src/bridge/` 中有约 30 个文件）。

## 关键文件

- `src/bridge/bridgeMain.ts` — 主桥接编排
- `src/bridge/bridgeApi.ts` — 桥接 API 端点
- `src/bridge/bridgeMessaging.ts` — WebSocket/HTTP 消息
- `src/bridge/bridgeConfig.ts` — 桥接配置
- `src/bridge/bridgeUI.ts` — 桥接 UI 渲染
- `src/bridge/jwtUtils.ts` — 桥接连接的 JWT 认证
- `src/bridge/types.ts` — 桥接类型
- `src/bridge/initReplBridge.ts` — REPL 集成
- `src/bridge/replBridge.ts` — REPL 桥接句柄

## 任务

### 部分 A：理解桥接架构

阅读 `src/bridge/types.ts` 和 `src/bridge/bridgeMain.ts`（前 100 行）。记录：
1. 桥接使用哪些协议？（WebSocket、HTTP 轮询等）
2. 认证如何工作？（JWT）
3. 哪些消息在 IDE 和 CLI 之间流动？
4. 桥接生命周期如何管理？

### 部分 B：评估哪些需要 vs 哪些可以推迟

桥接是初始构建的**锦上添花**功能。分类：
1. **必须工作**：功能标志门控（`feature('BRIDGE_MODE')` 返回 `false` → 跳过桥接代码）
2. **可以推迟**：完整的桥接功能
3. **可能中断**：即使禁用时也假设桥接可用的代码路径

### 部分 C：验证功能门控是否有效

确保当 `CLAUDE_CODE_BRIDGE_MODE=false`（或未设置）时：
1. 不导入桥接代码
2. 跳过桥接初始化
3. 不出现桥接相关错误
4. CLI 在纯终端模式下正常工作

### 部分 D：为安全起见存根桥接

如果任何代码路径在功能门控之外引用桥接功能：
1. 创建 `src/bridge/stub.ts` 提供空操作实现
2. 确保从 `src/bridge/` 导入不会崩溃
3. 确保 REPL 在没有桥接的情况下工作

### 部分 E：记录桥接激活

为将来的工作，记录启用桥接需要什么：
1. 设置 `CLAUDE_CODE_BRIDGE_MODE=true`
2. 需要什么 IDE 扩展？
3. 需要什么认证设置？
4. 它使用哪些端口/套接字？

### 部分 F：检查 Chrome 扩展桥接

`src/entrypoints/cli.tsx` 中引用了 `--claude-in-chrome-mcp` 和 `--chrome-native-host` 模式。阅读这些路径并记录它们的作用。这些可以推迟 —— 只需确保它们在不使用时不会崩溃。

## 验证

1. CLI 在桥接禁用时正常工作（默认）
2. stdout/stderr 中没有桥接相关错误
3. `feature('BRIDGE_MODE')` 正确返回 `false`
4. 桥接架构已记录，供将来启用
5. 桥接关闭时没有导致崩溃的悬空导入
