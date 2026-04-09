# Prompt 11: MCP 客户端/服务器集成

## 背景

您正在 `/workspaces/claude-code` 目录下工作。CLI 内置 MCP（模型上下文协议）支持：
- **MCP 客户端** — 连接外部 MCP 服务器（工具、资源）
- **MCP 服务器** — 将 Claude Code 本身作为 MCP 服务器暴露

MCP 让 CLI 使用外部服务器提供的工具，并让其他客户端使用 Claude Code 作为工具提供者。

## 关键文件

- `src/services/mcp/` — MCP 客户端实现
- `src/services/mcp/types.ts` — MCP 配置类型
- `src/entrypoints/mcp.ts` — MCP 服务器模式入口点
- `src/tools/MCPTool/` — 调用 MCP 服务器的工具
- `src/tools/ListMcpResourcesTool/` — 列出 MCP 资源
- `src/tools/ReadMcpResourceTool/` — 读取 MCP 资源
- `src/tools/McpAuthTool/` — MCP 服务器认证
- `mcp-server/` — 独立 MCP 服务器子项目（来自 Prompt 04）

## 任务

### 部分 A：理解 MCP 客户端架构

阅读 `src/services/mcp/` 目录：
1. 如何发现 MCP 服务器？（`.mcp.json` 配置文件？）
2. 如何建立 MCP 服务器连接？（stdio、HTTP、SSE？）
3. 如何注册和提供 MCP 工具？
4. `ScopedMcpServerConfig` 类型是什么？

### 部分 B：理解 MCP 配置格式

搜索 `.mcp.json` 或 MCP 配置加载代码。记录：
1. 配置文件位于何处？（`~/.claude/.mcp.json`？项目根目录？）
2. 配置模式是什么？（服务器名称、命令、参数、环境？）
3. 如何配置多个服务器？

您可能找到的示例配置：
```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {}
    }
  }
}
```

### 部分 C：验证 MCP SDK 集成

项目使用 `@modelcontextprotocol/sdk` (^1.12.1)。检查：
1. 它是否安装在 `node_modules/` 中？
2. 导入是否工作：`import { Client } from '@modelcontextprotocol/sdk/client/index.js'`
3. 是否存在版本兼容性问题？

### 部分 D：使用我们自己的服务器测试 MCP 客户端

创建一个测试：
1. 在 Prompt 04 中修复的 `mcp-server/` 作为子进程启动
2. 使用 `src/services/mcp/` 中的 MCP 客户端通过 stdio 连接它
3. 列出可用工具
4. 调用一个工具（例如 `list_files` 或 `search_code`）

创建 `scripts/test-mcp.ts`：
```ts
// scripts/test-mcp.ts
// 测试 MCP 客户端/服务器往返
// 用法：bun scripts/test-mcp.ts

import './src/shims/preload.js'

// TODO: 
// 1. 将 mcp-server 作为子进程生成（stdio 传输）
// 2. 从 src/services/mcp/ 创建 MCP 客户端
// 3. 将客户端连接到服务器
// 4. 列出工具
// 5. 调用工具
// 6. 打印结果
```

### 部分 E：测试 MCP 服务器模式

CLI 本身可以作为 MCP 服务器运行（`src/entrypoints/mcp.ts`）。阅读此文件并验证：
1. 它暴露什么工具？
2. 它提供什么资源？
3. 它可以用 `bun src/entrypoints/mcp.ts` 启动吗？

### 部分 F：创建示例 MCP 配置

在项目根目录（或应用程序查找它的任何位置）创建 `.mcp.json`，配置本地 MCP 服务器：
```json
{
  "mcpServers": {
    "claude-code-explorer": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "env": {
        "CLAUDE_CODE_SRC_ROOT": "./src"
      }
    }
  }
}
```

## 验证

1. `src/services/mcp/` 中的 MCP 客户端代码无错误加载
2. MCP 服务器模式（`src/entrypoints/mcp.ts`）启动不崩溃
3. 往返测试（客户端 → 服务器 → 响应）工作
4. `.mcp.json` 配置文件已创建并可解析
