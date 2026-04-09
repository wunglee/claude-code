# Prompt 10: 接入系统提示、上下文收集与记忆系统

## 背景

您正在 `/workspaces/claude-code` 目录下工作。CLI 在每次对话前构建详细的系统提示。此提示包括：
1. **静态指令** — 核心行为规则（来自 `src/constants/prompts.ts`）
2. **动态上下文** — 操作系统、shell、git 状态、工作目录（来自 `src/context.ts`）
3. **工具描述** — 从工具模式自动生成
4. **记忆** — 持久 `.claude.md` 文件（来自 `src/memdir/`）
5. **用户上下文** — 配置、首选项、项目设置

## 关键文件

- `src/constants/prompts.ts` — 系统提示构建
- `src/constants/system.ts` — 系统身份字符串
- `src/context.ts` — 操作系统/shell/git 上下文收集
- `src/context/` — 附加上下文模块
- `src/memdir/` — 记忆目录系统（读取 `.claude.md`、`CLAUDE.md` 文件）
- `src/utils/messages.ts` — 消息构建辅助函数

## 任务

### 部分 A：追踪系统提示构建

阅读 `src/constants/prompts.ts` 并梳理：
1. `getSystemPrompt()` 的签名和返回类型是什么？
2. 系统提示包含哪些部分？
3. 工具如何在提示中描述？
4. 存在哪些模型特定的变体？
5. `MACRO.ISSUES_EXPLAINER` 引用解析到哪里？

### 部分 B：修复上下文收集

阅读 `src/context.ts` 并：
1. 理解 `getSystemContext()` 和 `getUserContext()`
2. 这些收集操作系统信息、shell 版本、git 状态等
3. 验证它们在 Linux 上工作（此代码库可能是在 macOS 上开发的，因此某些路径可能是 macOS 特定的）
4. 修复任何平台特定问题

### 部分 C：接入记忆系统

阅读 `src/memdir/` 目录：
1. 它如何找到 `.claude.md` / `CLAUDE.md` 文件？
2. 记忆内容如何注入系统提示？
3. 它是否支持项目级、用户级和会话级记忆？

通过以下方式验证它工作：
1. 在项目根目录创建测试 `CLAUDE.md`
2. 运行系统提示构建器
3. 检查记忆是否出现在输出中

### 部分 D：创建提示检查脚本

创建 `scripts/test-prompt.ts`：
```ts
// scripts/test-prompt.ts
// 转储将发送到 API 的完整系统提示
// 用法：bun scripts/test-prompt.ts

import './src/shims/preload.js'

async function main() {
  // 导入提示构建器
  const { getSystemPrompt } = await import('./src/constants/prompts.js')
  
  // 可能需要传递工具列表和模型名称
  // 检查函数签名
  const prompt = await getSystemPrompt([], 'claude-sonnet-4-20250514')
  
  console.log('=== 系统提示 ===')
  console.log(prompt.join('\n'))
  console.log('=== 结束 ===')
  console.log(`\n总长度：${prompt.join('\n').length} 个字符`)
}

main().catch(err => {
  console.error('提示测试失败：', err)
  process.exit(1)
})
```

### 部分 E：修复提示中的 MACRO 引用

提示系统引用 `MACRO.ISSUES_EXPLAINER`。确保我们的 `MACRO` 全局（来自 `src/shims/macro.ts`）提供此值。如果提示引用其他 `MACRO` 字段，也添加它们。

### 部分 F：上下文模块审计

检查 `src/context/` 中的附加上下文模块：
- 项目检测（语言、框架）
- Git 集成（分支、状态、最近提交）
- 环境检测（CI、容器、SSH）

验证这些在我们的开发环境中工作。

## 验证

1. `bun scripts/test-prompt.ts` 转储完整的系统提示
2. 提示包括：工具描述、操作系统上下文、记忆内容
3. 输出中没有 `undefined` 或 `MACRO.` 引用
4. 记忆系统从项目根目录读取 `.claude.md`
