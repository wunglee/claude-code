# 构建提示索引

在单独的聊天会话中按顺序运行这些提示。每个提示都是自包含的。

| # | 文件 | 功能说明 | 依赖项 |
|---|------|---------|--------|
| 01 | `01-install-bun-and-deps.md` | 安装 Bun 运行时，安装所有依赖项 | — |
| 02 | `02-runtime-shims.md` | 创建 `bun:bundle` 运行时垫片和 `MACRO` 全局变量，使代码无需 Bun 的打包器即可运行 | 01 |
| 03 | `03-build-config.md` | 创建基于 esbuild 的构建系统，将 CLI 打包为单个可运行文件 | 01, 02 |
| 04 | `04-fix-mcp-server.md` | 修复 `mcp-server/` 中的 TypeScript 错误并使其可构建 | 01 |
| 05 | `05-env-and-auth.md` | 设置 `.env` 文件、API 密钥配置、OAuth 占位符 | 01 |
| 06 | `06-ink-react-terminal-ui.md` | 验证并修复 Ink/React 终端渲染管道 | 01, 02, 03 |
| 07 | `07-tool-system.md` | 审计并连接 40+ 工具实现（BashTool、FileEditTool 等） | 01–03 |
| 08 | `08-command-system.md` | 审计并连接 50+ 斜杠命令（/commit、/review 等） | 01–03, 07 |
| 09 | `09-query-engine.md` | 使核心 LLM 调用循环（QueryEngine）正常工作 — 流式传输、工具调用、重试 | 01–03, 05, 07 |
| 10 | `10-context-and-prompts.md` | 连接系统提示构建、上下文收集、记忆系统 | 01–03 |
| 11 | `11-mcp-integration.md` | 使 MCP 客户端/服务器集成正常工作 — 注册表、工具发现 | 01–04 |
| 12 | `12-services-layer.md` | 连接分析、策略限制、远程设置、会话记忆 | 01–03, 05 |
| 13 | `13-bridge-ide.md` | 为 VS Code / JetBrains 桥接层创建占位符或实现 | 01–03, 09 |
| 14 | `14-dev-runner.md` | 创建 `npm run dev` / `bun run dev` 脚本，以开发模式启动 CLI | 01–03 |
| 15 | `15-production-bundle.md` | 创建生产构建：压缩打包、平台特定打包 | 03 |
| 16 | `16-testing.md` | 添加测试基础设施（vitest），为核心子系统编写冒烟测试 | All |

## 快速开始

1. 打开一个新的 Copilot 聊天
2. 粘贴 `01-install-bun-and-deps.md` 的内容
3. 按照说明操作 / 让代理运行
4. 对 `02`、`03` 等重复此过程

## 注意事项

- 提示 07–13 可以在一定程度上**并行**运行（它们涉及不同的子系统）
- 如果某个提示失败，在进入下一个之前先修复问题
- 每个提示都设计为**可独立验证** —— 它会告诉你如何确认它是否正常工作
