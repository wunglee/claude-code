# Prompt 14: 创建开发运行器

## 背景

您正在 `/workspaces/claude-code` 目录下工作。到目前为止，您应该已经：
- 安装了 Bun（Prompt 01）
- 为 `bun:bundle` 和 `MACRO` 提供了运行时填充（Prompt 02）
- 有一个构建系统（Prompt 03）
- 环境配置（Prompt 05）

现在我们需要一种**在开发模式下运行 CLI** 的方法 —— 快速启动而无需完整的生产构建。

## 任务

### 部分 A：创建 `bun run dev` 脚本

Bun 可以直接运行 TypeScript 而无需编译。创建一个开发启动器。

**选项 1：直接 Bun 执行**（推荐）

创建 `scripts/dev.ts`：
```ts
// scripts/dev.ts
// 开发启动器 —— 直接通过 Bun 运行 CLI
// 用法：bun scripts/dev.ts [args...]
// 或：bun run dev [args...]

// 首先加载填充
import '../src/shims/preload.js'

// 注册 bun:bundle 模块解析器
// 由于 Bun 原生支持该模块，我们可能需要
// 注册我们的填充。检查是否需要。

// 启动 CLI
await import('../src/entrypoints/cli.js')
```

**选项 2：使用 Bun 的 preload**

使用 Bun 的 `--preload` 标志：
```bash
bun --preload ./src/shims/preload.ts src/entrypoints/cli.tsx
```

**研究哪种方法有效**与 `bun:bundle` 导入。棘手的部分是 `bun:bundle` 是一个特殊的 Bun 模块名 —— 在运行时（没有打包器），Bun 可能无法识别它。您需要：
1. 使用 Bun 的 `bunfig.toml` 创建模块别名
2. 使用加载器/插件拦截导入
3. 使用预转换步骤重写导入

### 部分 B：在运行时处理 `bun:bundle` 导入

这是关键挑战。需要研究的选项：

**选项 A：`bunfig.toml` 别名**
```toml
[resolve]
alias = { "bun:bundle" = "./src/shims/bun-bundle.ts" }
```

**选项 B：Bun 插件**
创建一个 Bun 插件来拦截 `bun:bundle`：
```ts
// scripts/bun-plugin-shims.ts
import { plugin } from 'bun'

plugin({
  name: 'bun-bundle-shim',
  setup(build) {
    build.onResolve({ filter: /^bun:bundle$/ }, () => ({
      path: resolve(import.meta.dir, '../src/shims/bun-bundle.ts'),
    }))
  },
})
```
然后在 `bunfig.toml` 中引用它：
```toml
preload = ["./scripts/bun-plugin-shims.ts"]
```

**选项 C：构建时补丁**
如果运行时别名不起作用，使用快速的预构建转换，将 `from 'bun:bundle'` 替换为 `from '../shims/bun-bundle.js'`，输出到临时目录。

**按顺序尝试选项**并使用有效的那个。

### 部分 C：添加 npm 脚本

添加到 `package.json`：
```json
{
  "scripts": {
    "dev": "bun scripts/dev.ts",
    "dev:repl": "bun scripts/dev.ts --repl",
    "start": "bun scripts/dev.ts"
  }
}
```

### 部分 D：创建 `.env` 加载器

如果开发脚本没有自动加载 `.env`，添加 dotenv 支持：
```bash
bun add -d dotenv-cli
```
然后包装开发命令：
```json
"dev": "dotenv -e .env -- bun scripts/dev.ts"
```

或使用 Bun 内置的 `.env` 加载（Bun 自动读取 `.env` 文件）。

### 部分 E：测试开发运行器

1. 在 `.env` 中设置 `ANTHROPIC_API_KEY`
2. 运行 `bun run dev --version` → 应打印版本
3. 运行 `bun run dev --help` → 应打印帮助文本
4. 运行 `bun run dev` → 应启动交互式 REPL（需要可用的 Ink UI）
5. 运行 `ANTHROPIC_API_KEY=sk-ant-... bun run dev -p "say hello"` → 应进行一次 API 调用并打印响应

### 部分 F：添加调试模式

添加启用详细日志的调试脚本：
```json
{
  "scripts": {
    "dev:debug": "CLAUDE_CODE_DEBUG_LOG_LEVEL=debug bun scripts/dev.ts"
  }
}
```

## 验证

1. `bun run dev --version` 打印版本
2. `bun run dev --help` 无错误地打印帮助
3. `bun:bundle` 导入在运行时正确解析
4. `.env` 变量已加载
5. 启动时没有模块解析错误
