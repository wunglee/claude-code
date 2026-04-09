# Prompt 07: 审计并连接工具系统

## 背景

您正在 `/workspaces/claude-code` 目录下工作。Claude Code CLI 有约 40 个工具，LLM 可以在对话期间调用。每个工具位于 `src/tools/<ToolName>/` 并遵循一致的模式。

关键文件：
- `src/Tool.ts`（约 29K 行）— 工具类型定义、`ToolUseContext`、`PermissionResult` 等
- `src/tools.ts` — 工具注册表（返回所有可用工具的 `getTools()` 函数）
- `src/tools/` — 各个工具目录

## 任务

### 部分 A：理解 Tool 接口

阅读 `src/Tool.ts` 并记录 `Tool` 接口。关键问题：
1. `Tool` 有哪些字段？（name、description、inputSchema、execute 等）
2. 什么是 `ToolUseContext`？它为工具执行提供什么？
3. 工具权限如何工作？（`PermissionResult`、`needsPermission`）
4. 工具如何声明其输入模式？（JSON Schema / Zod）

### 部分 B：审计工具注册表

完整阅读 `src/tools.ts`。它在功能标志和环境检查后面动态导入工具：
```ts
const REPLTool = process.env.USER_TYPE === 'ant' ? ... : null
const SleepTool = feature('PROACTIVE') || feature('KAIROS') ? ... : null
```

创建完整清单：
1. **始终可用工具** — 无条件导入
2. **功能开关工具** — 哪个功能标志启用它们
3. **Ant 内部工具** — 在 `USER_TYPE === 'ant'` 后面（Anthropic 内部）
4. **损坏/缺失工具** — 任何引用但未找到的工具

### 部分 C：验证每个工具编译

对于 `src/tools/` 中的每个工具目录，检查：
1. 它是否有 `index.ts` 或主文件？
2. 它是否导出与 `Tool` 接口匹配的工具定义？
3. 其导入是否可解析？

关注基本操作必需的 **核心 10 个工具**：
- `BashTool` — shell 命令执行
- `FileReadTool` — 读取文件
- `FileWriteTool` — 写入文件  
- `FileEditTool` — 编辑文件（搜索和替换）
- `GlobTool` — 按模式查找文件
- `GrepTool` — 搜索文件内容
- `AgentTool` — 生成子代理
- `WebFetchTool` — HTTP 请求
- `AskUserQuestionTool` — 向用户询问输入
- `TodoWriteTool` — 待办事项列表管理

### 部分 D：修复导入问题

工具注册表（`src/tools.ts`）使用带有 `bun:bundle` 功能标志的动态导入。使用我们的运行时 shim，这些应该可以工作 —— 但请验证：

1. 当标志为 `false` 时，功能开关导入解析（应跳过）
2. 当标志为 `true` 时，功能开关导入解析（应加载）
3. Ant 内部工具在 `process.env.USER_TYPE !== 'ant'` 时优雅处理

修复任何导入解析错误。

### 部分 E：创建工具冒烟测试

创建 `scripts/test-tools.ts`：
```ts
// scripts/test-tools.ts
// 验证所有工具无错误加载
// 用法：bun scripts/test-tools.ts

import './src/shims/preload.js'

async function main() {
  const { getTools } = await import('./src/tools.js')
  
  // getTools() 可能需要参数 —— 检查其签名
  const tools = getTools(/* ... */)
  
  console.log(`已加载 ${tools.length} 个工具：\n`)
  for (const tool of tools) {
    console.log(`  ✓ ${tool.name}`)
  }
}

main().catch(err => {
  console.error('工具加载失败：', err)
  process.exit(1)
})
```

使脚本适应实际的 `getTools()` 签名。

### 部分 F：存根 Anthropic 内部工具

任何在 `USER_TYPE === 'ant'` 后面的工具都应被干净地排除。验证 null 检查是否有效，且当这些工具从注册表缺失时不会导致运行时错误。

## 验证

1. `scripts/test-tools.ts` 运行并列出所有可用工具而无错误
2. 上述列出的核心 10 个工具都存在
3. `src/tools/` 或 `src/tools.ts` 中没有 TypeScript 错误
4. Ant 内部工具被干净地排除（无崩溃）
