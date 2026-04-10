# Claude in Chrome MCP 服务器自研实现方案

> 替代 `@ant/claude-for-chrome-mcp` 内部包的自研实现方案
> 状态：设计阶段 | 优先级：低

---

## 1. 项目背景

### 1.1 问题陈述

- `@ant/claude-for-chrome-mcp` 是 Anthropic 内部私有包，未发布到 npm
- 该包提供 Chrome 浏览器自动化功能的 MCP 服务器封装
- 现有代码中 `src/utils/claudeInChrome/` 已包含 Native Host 实现，但缺少 MCP 服务器层

### 1.2 目标

创建自研 MCP 服务器实现，完全兼容原包接口，使 `bun run dev` 能够正常工作。

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         Claude Code CLI                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │  Skill Tool │───▶│  MCP Client │───▶│  MCP Server Manager │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ Unix Socket (IPC)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Claude in Chrome MCP                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │ MCP Server Impl │───▶│  Socket Client  │───▶│ Chrome Native│ │
│  │ (自研实现)       │    │                 │    │ Host Process │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ Native Messaging (stdin/stdout)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Chrome Extension                            │
│                    (已安装官方扩展)                               │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 组件职责

| 组件 | 职责 | 状态 |
|------|------|------|
| MCP Server Manager | 管理 MCP 服务器生命周期 | 已存在 |
| MCP Server Impl | 自研 MCP 服务器实现 | 需开发 |
| Socket Client | Unix Socket 通信客户端 | 需开发 |
| Chrome Native Host | Native Messaging 主机 | 已存在 |
| Chrome Extension | Chrome 扩展 | 已安装 |

---

## 3. 接口设计

### 3.1 与原包接口对比

原包接口：

```typescript
// 核心函数
export function createClaudeForChromeMcpServer(context: ClaudeForChromeContext): Server;

// 工具定义
export const BROWSER_TOOLS: BrowserTool[];

// 类型
export interface ClaudeForChromeContext {
  serverName: string;
  logger: Logger;
  socketPath: string;
  getSocketPaths: () => string[];
  clientTypeId: string;
  onAuthenticationError: () => void;
  onToolCallDisconnected: () => string;
  onExtensionPaired: (deviceId: string, name: string) => void;
  getPersistedDeviceId: () => string | undefined;
  bridgeConfig?: BridgeConfig;
  initialPermissionMode?: PermissionMode;
}

export type PermissionMode = 'ask' | 'skip_all_permission_checks' | 'follow_a_plan';
```

自研实现接口（完全兼容）：

文件路径：`src/utils/claudeInChrome/mcpServerImpl.ts`

```typescript
export { createClaudeForChromeMcpServer, BROWSER_TOOLS };
export type { ClaudeForChromeContext, Logger, PermissionMode };
```

---

## 4. 工具列表

### 4.1 18 个浏览器工具

| 序号 | 工具名 | 功能描述 |
|------|--------|----------|
| 1 | javascript_tool | 在页面执行 JavaScript |
| 2 | read_page | 读取页面 HTML 内容 |
| 3 | find | 查找页面元素 |
| 4 | form_input | 填写表单输入 |
| 5 | computer | 点击、输入、滚动等 |
| 6 | navigate | 导航到指定 URL |
| 7 | resize_window | 调整浏览器窗口大小 |
| 8 | gif_creator | 录制操作 GIF |
| 9 | upload_image | 上传图片到页面 |
| 10 | get_page_text | 获取页面纯文本内容 |
| 11 | tabs_context_mcp | 获取所有标签页信息 |
| 12 | tabs_create_mcp | 创建新标签页 |
| 13 | update_plan | 更新执行计划 |
| 14 | read_console_messages | 读取控制台日志 |
| 15 | read_network_requests | 读取网络请求记录 |
| 16 | shortcuts_list | 列出页面快捷键 |
| 17 | shortcuts_execute | 执行快捷键 |

---

## 5. 通信协议

### 5.1 Native Host 协议

基于 `src/utils/claudeInChrome/chromeNativeHost.ts`：

```typescript
interface NativeMessage {
  type: 'tool_request' | 'tool_response' | 'event';
  id?: number;
  tool?: string;
  params?: unknown;
  result?: unknown;
  error?: string;
}

// 消息格式：4字节长度 + JSON 负载
```

### 5.2 Unix Socket 客户端

```typescript
class ChromeNativeHostClient {
  async connect(socketPath: string): Promise<void>;
  async callTool(tool: string, params: unknown): Promise<unknown>;
  async disconnect(): Promise<void>;
}
```

---

## 6. 实现计划

### 6.1 文件结构

```
src/utils/claudeInChrome/
├── chromeNativeHost.ts      # 已存在
├── mcpServer.ts             # 需修改
├── mcpServerImpl.ts         # 新建
├── socketClient.ts          # 新建
├── browserTools.ts          # 新建
└── types.ts                 # 新建
```

### 6.2 实现步骤

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 1 | 创建类型定义文件 | 1h |
| 2 | 实现 Unix Socket 客户端 | 2h |
| 3 | 实现工具定义 | 1h |
| 4 | 实现 MCP 服务器 | 3h |
| 5 | 修改调用点适配 async | 2h |
| 6 | 测试验证 | 2h |

总计：约 11 小时

### 6.3 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Native Host 协议变更 | 高 | 保持协议简单，关注官方更新 |
| Chrome 扩展版本不匹配 | 中 | 测试时明确版本要求 |
| Socket 权限问题 | 中 | 使用标准 Unix Socket 路径 |

---

## 7. 相关文件

- 现有 Native Host: `src/utils/claudeInChrome/chromeNativeHost.ts`
- 工具渲染: `src/utils/claudeInChrome/toolRendering.tsx`
- 调用入口: `src/utils/claudeInChrome/mcpServer.ts`
- 扩展安装: https://clau.de/chrome

---

## 8. 结论

此方案通过自研 MCP 服务器封装，完全替代 `@ant/claude-for-chrome-mcp` 内部包，使 Claude Code CLI 能够正常使用 Chrome 浏览器自动化功能。

优先级：低（不影响核心功能，当前可通过禁用功能绕过）
