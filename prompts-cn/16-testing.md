# Prompt 16: 添加测试基础设施与冒烟测试

## 背景

您正在 `/workspaces/claude-code` 目录下工作。源代码不包含任何测试文件或测试配置（它们大概在单独的目录或仓库中）。我们需要添加测试框架并为核心子系统编写冒烟测试。

## 任务

### 部分 A：设置 Vitest

```bash
bun add -d vitest @types/node
```

创建 `vitest.config.ts`：
```ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      'bun:bundle': resolve(__dirname, 'src/shims/bun-bundle.ts'),
    },
  },
})
```

创建 `tests/setup.ts`：
```ts
// 全局测试设置
import '../src/shims/preload.js'
```

添加到 `package.json`：
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### 部分 B：为填充编写单元测试

`tests/shims/bun-bundle.test.ts`：
- 测试 `feature()` 对未知标志返回 `false`
- 测试 `feature()` 对禁用标志返回 `false`
- 测试当设置了环境变量时 `feature()` 返回 `true`
- 测试 `feature('ABLATION_BASELINE')` 始终返回 `false`

`tests/shims/macro.test.ts`：
- 测试 `MACRO.VERSION` 是字符串
- 测试 `MACRO.PACKAGE_URL` 已设置
- 测试 `MACRO.ISSUES_EXPLAINER` 已设置

### 部分 C：为核心模块编写冒烟测试

`tests/smoke/tools.test.ts`：
- 测试 `getTools()` 返回数组
- 测试每个工具具有：name、description、inputSchema
- 测试 BashTool、FileReadTool、FileWriteTool 存在

`tests/smoke/commands.test.ts`：
- 测试 `getCommands()` 返回数组
- 测试每个命令具有：name、execute 函数
- 测试 /help 和 /config 命令存在

`tests/smoke/context.test.ts`：
- 测试 `getSystemContext()` 返回操作系统信息
- 测试可以收集 git 状态
- 测试在 Linux 上平台检测工作

`tests/smoke/prompt.test.ts`：
- 测试 `getSystemPrompt()` 返回非空数组
- 测试提示包括工具描述
- 测试 MACRO 引用已解析（没有 `undefined`）

### 部分 D：编写集成测试（如果有 API 密钥）

`tests/integration/api.test.ts`：
- 如果未设置 `ANTHROPIC_API_KEY` 则跳过
- 测试 API 客户端创建
- 测试简单消息（hello world）
- 测试流式传输工作
- 测试工具使用（计算器式工具调用）

`tests/integration/mcp.test.ts`：
- 测试 MCP 服务器启动
- 测试 MCP 客户端连接
- 测试工具列表
- 测试工具执行往返

### 部分 E：编写构建测试

`tests/build/bundle.test.ts`：
- 测试构建后 `dist/cli.mjs` 存在
- 测试它有 shebang
- 测试它不为空
- 测试 `node dist/cli.mjs --version` 干净退出

### 部分 F：添加预提交钩子（可选）

如果项目使用 git 钩子，添加：
```bash
# 在 package.json 或 git 钩子中
bun run typecheck && bun run test
```

## 验证

1. `bun run test` 运行所有测试
2. 填充测试通过
3. 冒烟测试通过（工具、命令、上下文、提示加载）
4. 没有 API 密钥时跳过集成测试
5. 有 API 密钥时集成测试通过
6. 测试输出清晰可读
