# Prompt 05: 环境配置与 API 认证

## 背景

您正在 `/workspaces/claude-code` 目录下工作。CLI 需要 Anthropic API 密钥才能运行。认证系统支持多种后端：
- **直接 API** (`ANTHROPIC_API_KEY`) — 最简单
- **OAuth** (Claude.ai 订阅) — 复杂的浏览器流程
- **AWS Bedrock** — `AWS_*` 环境变量
- **Google Vertex AI** — GCP 凭证
- **Azure Foundry** — `ANTHROPIC_FOUNDRY_API_KEY`

## 任务

### 部分 A：从现有代码创建 `.env` 文件

搜索代码库中使用的所有环境变量。需要检查的关键文件：
- `src/entrypoints/cli.tsx`（在顶层读取环境变量）
- `src/services/api/client.ts`（API 客户端构建）
- `src/utils/auth.ts`（认证）
- `src/utils/config.ts`（配置加载）
- `src/constants/`（任何硬编码配置）
- `src/entrypoints/init.ts`（初始化读取）

创建一个 `.env.example` 文件（如果已存在则更新），包含所有可发现的环境变量，按类别组织，并附有文档注释。至少包括：

```env
# ─── 认证 ───
ANTHROPIC_API_KEY=           # 必需：您的 Anthropic API 密钥（sk-ant-...）

# ─── API 配置 ───
ANTHROPIC_BASE_URL=          # 自定义 API 端点（默认：https://api.anthropic.com）
ANTHROPIC_MODEL=             # 覆盖默认模型（例如：claude-sonnet-4-20250514）
ANTHROPIC_SMALL_FAST_MODEL=  # 快速/廉价操作模型（例如：claude-haiku）

# ─── 功能开关（由 bun:bundle shim 使用） ───
CLAUDE_CODE_PROACTIVE=false
CLAUDE_CODE_BRIDGE_MODE=false
CLAUDE_CODE_COORDINATOR_MODE=false
CLAUDE_CODE_VOICE_MODE=false

# ─── 调试 ───
CLAUDE_CODE_DEBUG_LOG_LEVEL=  # debug, info, warn, error
DEBUG=false
```

### 部分 B：追踪 API 客户端设置

阅读 `src/services/api/client.ts` 以了解 Anthropic SDK 的初始化方式。记录：
1. 它读取哪些环境变量
2. 如何在 API 后端之间选择（直接、Bedrock、Vertex 等）
3. API 密钥来自何处（环境变量？密钥链？OAuth 令牌？）

在 `.env.example` 顶部创建一个注释块，说明认证如何工作。

### 部分 C：创建最小认证测试

创建 `scripts/test-auth.ts`：
```ts
// scripts/test-auth.ts
// 快速测试 API 密钥是否已配置并能访问 Anthropic
// 用法：bun scripts/test-auth.ts

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function main() {
  try {
    const msg = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say "hello" and nothing else.' }],
    })
    console.log('✅ API 连接成功！')
    console.log('响应：', msg.content[0].type === 'text' ? msg.content[0].text : msg.content[0])
  } catch (err: any) {
    console.error('❌ API 连接失败：', err.message)
    process.exit(1)
  }
}

main()
```

### 部分 D：为开发环境存根 OAuth

OAuth 流程（`src/services/oauth/`）需要浏览器交互和 Anthropic 的 OAuth 端点。对于开发环境，我们希望绕过它。

搜索认证决策的位置（可能在 `src/utils/auth.ts` 或 `src/entrypoints/init.ts` 中）。记录在 `.env.example` 底部的注释中，需要存根什么才能跳过 OAuth 而仅使用 `ANTHROPIC_API_KEY`。

暂时不要修改源文件 —— 只需在 `.env.example` 底部的注释中记录发现。

## 验证

1. `.env.example` 存在，并包含全面的环境变量文档
2. `scripts/test-auth.ts` 存在
3. 设置有效的 `ANTHROPIC_API_KEY` 后：`bun scripts/test-auth.ts` 打印成功
4. 没有 API 密钥时：`bun scripts/test-auth.ts` 打印清晰的错误
