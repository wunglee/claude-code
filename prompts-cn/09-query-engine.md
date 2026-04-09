# Prompt 09: 使 QueryEngine（核心 LLM 循环）功能正常

## 背景

您正在 `/workspaces/claude-code` 目录下工作。`QueryEngine`（`src/QueryEngine.ts`，约 46K 行）是 CLI 的核心 —— 它：
1. 向 Anthropic API 发送消息（流式传输）
2. 处理流式响应（文本、思考、tool_use 块）
3. 当 LLM 请求时执行工具（工具循环）
4. 处理重试、速率限制和错误
5. 跟踪令牌使用和成本
6. 管理对话上下文（消息历史）

这是最复杂的单个文件。目标是使其对基本对话循环足够功能正常。

## 关键依赖项

QueryEngine 依赖于：
- `src/services/api/client.ts` — Anthropic SDK 客户端
- `src/services/api/claude.ts` — 消息 API 包装器  
- `src/Tool.ts` — 工具定义
- `src/tools.ts` — 工具注册表
- `src/context.ts` — 系统上下文
- `src/constants/prompts.ts` — 系统提示
- 令牌计数工具
- 流式事件处理程序

## 任务

### 部分 A：梳理 QueryEngine 架构

阅读 `src/QueryEngine.ts` 并创建结构图：
1. **类结构** — 定义了哪些类/接口？
2. **公共 API** — 什么方法启动查询？它返回什么？
3. **消息流** — 用户消息如何成为 API 调用？
4. **工具循环** — 如何检测、执行和反馈工具调用？
5. **流式传输** — 如何处理流式事件？
6. **重试逻辑** — 如何处理 API 错误？

### 部分 B：追踪 API 调用路径

从 QueryEngine → API 客户端的链：
1. 阅读 `src/services/api/client.ts` — Anthropic SDK 客户端如何创建？
2. 阅读 `src/services/api/claude.ts` — 消息创建包装器是什么？
3. 传递哪些参数？（model、max_tokens、system prompt、tools、messages）
4. 如何处理流式传输？（SSE？SDK 流式传输？）

### 部分 C：识别并修复阻塞点

QueryEngine 将依赖许多子系统。对于每个依赖项：
- **如果它是必需的**（API 客户端、工具执行）→ 确保它工作
- **如果它是可选的**（分析、遥测、策略限制）→ 存根或跳过它

常见阻塞点：
1. **缺少 API 配置** → 需要 `ANTHROPIC_API_KEY`（Prompt 05）
2. **策略限制服务** → 可能阻止执行，需要存根
3. **GrowthBook/分析** → 需要存根或优雅失败
4. **远程托管设置** → 需要存根
5. **引导数据获取** → 可能需要可选

### 部分 D：创建最小对话测试

创建 `scripts/test-query.ts`，直接测试 QueryEngine：

```ts
// scripts/test-query.ts
// QueryEngine 的最小测试 —— 单个查询，无 REPL
// 用法：ANTHROPIC_API_KEY=sk-ant-... bun scripts/test-query.ts "What is 2+2?"

import './src/shims/preload.js'

async function main() {
  const query = process.argv[2] || 'What is 2+2?'
  
  // 导入并设置最小依赖项
  // 您需要通过阅读 src/QueryEngine.ts、src/query.ts 和 src/replLauncher.tsx 来找出确切的导入和初始化
  
  // 基本流程应该是：
  // 1. 创建 API 客户端
  // 2. 构建系统提示
  // 3. 创建 QueryEngine 实例
  // 4. 发送查询
  // 5. 打印响应
  
  console.log(`查询：${query}`)
  console.log('---')
  
  // TODO: 连接实际的 QueryEngine 调用
  // 这是最困难的部分 —— 记录您需要做什么
}

main().catch(err => {
  console.error('查询测试失败：', err)
  process.exit(1)
})
```

### 部分 E：处理流式响应

QueryEngine 可能使用 Anthropic SDK 的流式接口。确保：
1. 文本内容在流式传输时打印到 stdout
2. 处理思考块（根据配置显示或隐藏）
3. 工具使用块触发工具执行
4. 工具循环反馈结果并继续

### 部分 F：记录仍损坏的内容

在使基本查询工作后，记录：
1. 哪些功能工作
2. 哪些功能被存根
3. 完整功能需要什么

## 验证

1. `ANTHROPIC_API_KEY=sk-ant-... bun scripts/test-query.ts "What is 2+2?"` 得到响应
2. 流式输出实时出现
3. 没有未处理的崩溃（优雅的错误消息可以）
4. 架构已记录
