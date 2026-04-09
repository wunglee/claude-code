# 提示 02：`bun:bundle` 功能标志和 `MACRO` 全局变量的运行时垫片

## 背景

您正在 `/workspaces/claude-code` 目录中工作。这是 Claude Code CLI 的源代码。它是为在 **Bun 的打包器** 下运行而构建的，该打包器提供了两个在运行时中不存在的构建时特性：

### 1. `bun:bundle` 功能标志

在整个代码中，您会找到：
```ts
import { feature } from 'bun:bundle'
if (feature('BRIDGE_MODE')) { ... }
```
Bun 的打包器在构建时将 `feature('X')` 替换为 `true`/`false` 以进行死码消除。如果没有打包器，此导入在运行时会失败。

**当前状态**：`src/types/bun-bundle.d.ts` 处有一个类型存根可以满足 TypeScript 的需求，但没有运行时模块。我们需要一个真正的模块。

### 2. `MACRO` 全局对象

代码引用了一个全局的 `MACRO` 对象，具有以下属性：
- `MACRO.VERSION` — 包版本字符串（例如 `"1.0.53"`）
- `MACRO.PACKAGE_URL` — npm 包名称（例如 `"@anthropic-ai/claude-code"`）
- `MACRO.ISSUES_EXPLAINER` — 反馈 URL/说明字符串

这些通常由打包器内联。一些文件已经使用 `typeof MACRO !== 'undefined'` 进行了保护，但大多数没有。

## 任务

### 第 A 部分：创建 `bun:bundle` 运行时模块

在 `src/shims/bun-bundle.ts` 创建一个文件，导出 `feature()` 函数。功能标志应可通过环境变量配置，以便我们可以切换它们：

```ts
// src/shims/bun-bundle.ts

// 功能标志及其启用状态的映射。
// 在生产 Bun 构建中，这些是编译时常量。
// 对于我们的开发构建，我们从环境变量读取并使用合理的默认值。
const FEATURE_FLAGS: Record<string, boolean> = {
  PROACTIVE: envBool('CLAUDE_CODE_PROACTIVE', false),
  KAIROS: envBool('CLAUDE_CODE_KAIROS', false),
  BRIDGE_MODE: envBool('CLAUDE_CODE_BRIDGE_MODE', false),
  DAEMON: envBool('CLAUDE_CODE_DAEMON', false),
  VOICE_MODE: envBool('CLAUDE_CODE_VOICE_MODE', false),
  AGENT_TRIGGERS: envBool('CLAUDE_CODE_AGENT_TRIGGERS', false),
  MONITOR_TOOL: envBool('CLAUDE_CODE_MONITOR_TOOL', false),
  COORDINATOR_MODE: envBool('CLAUDE_CODE_COORDINATOR_MODE', false),
  ABLATION_BASELINE: false,  // 对于外部构建始终关闭
  DUMP_SYSTEM_PROMPT: envBool('CLAUDE_CODE_DUMP_SYSTEM_PROMPT', false),
  BG_SESSIONS: envBool('CLAUDE_CODE_BG_SESSIONS', false),
}

function envBool(key: string, fallback: boolean): boolean {
  const v = process.env[key]
  if (v === undefined) return fallback
  return v === '1' || v === 'true'
}

export function feature(name: string): boolean {
  return FEATURE_FLAGS[name] ?? false
}
```

### 第 B 部分：创建 `MACRO` 全局定义

在 `src/shims/macro.ts` 创建一个文件，定义并安装全局 `MACRO` 对象：

```ts
// src/shims/macro.ts

// 在启动时从 package.json 读取版本
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const pkgPath = resolve(dirname(__filename), '..', '..', 'package.json')
let version = '0.0.0-dev'
try {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  version = pkg.version || version
} catch {}

const MACRO_OBJ = {
  VERSION: version,
  PACKAGE_URL: '@anthropic-ai/claude-code',
  ISSUES_EXPLAINER: '在 https://github.com/anthropics/claude-code/issues 报告问题',
}

// 作为全局变量安装
;(globalThis as any).MACRO = MACRO_OBJ

export default MACRO_OBJ
```

### 第 C 部分：创建预加载/引导文件

创建 `src/shims/preload.ts`，导入两个垫片，使它们在运行任何应用程序代码之前可用：

```ts
// src/shims/preload.ts
// 必须在任何应用程序代码之前加载。
// 提供 Bun 打包器构建时特性的运行时等效项。

import './macro.js'
// bun:bundle 通过构建别名解析，不在此处导入
```

### 第 D 部分：更新 tsconfig.json `paths`

当前的 tsconfig.json 有：
```json
"paths": {
  "bun:bundle": ["./src/types/bun-bundle.d.ts"]
}
```

这处理了类型检查。对于运行时，我们需要构建系统（提示 03）将 `bun:bundle` 别名到 `src/shims/bun-bundle.ts`。**不要更改 tsconfig.json** — 类型存根对 `tsc` 来说是正确的。只需在下一个提示中注意这一点。

### 第 E 部分：添加全局 MACRO 类型声明

检查是否已有 `MACRO` 的全局类型声明。如果没有，请添加到 `src/types/bun-bundle.d.ts` 或新的 `src/types/macro.d.ts`：

```ts
declare const MACRO: {
  VERSION: string
  PACKAGE_URL: string
  ISSUES_EXPLAINER: string
}
```

确保您的更改后 `tsc --noEmit` 仍然通过。

## 验证

1. `bun run typecheck` 应该通过（或与之前相同的错误 —— 没有新错误）
2. 文件 `src/shims/bun-bundle.ts`、`src/shims/macro.ts`、`src/shims/preload.ts` 存在
3. 运行 `bun -e "import { feature } from './src/shims/bun-bundle.ts'; console.log(feature('BRIDGE_MODE'))"` 应该打印 `false`
4. 运行 `bun -e "import './src/shims/macro.ts'; console.log(MACRO.VERSION)"` 应该打印版本
