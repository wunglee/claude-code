# 提示 03：创建基于 esbuild 的构建系统

## 背景

您正在 `/workspaces/claude-code` 目录中工作。这是 Claude Code CLI —— 一个使用 React + Ink 的 TypeScript/TSX 终端应用程序。它最初是使用 **Bun 的打包器** 和特性标志构建的，但该构建配置未包含在泄漏中。

我们需要创建一个构建系统，它：
1. 将整个 `src/` 树打包为可运行的输出
2. 将 `bun:bundle` 别名到我们的垫片 `src/shims/bun-bundle.ts`
3. 注入 `MACRO` 全局变量（通过 `src/shims/macro.ts` 预加载）
4. 处理 TSX/JSX（React）
5. 处理 ESM `.js` 扩展名导入（代码使用 `import from './foo.js'` 映射到 `./foo.ts`）
6. 生成可在 **Bun**（主要）或 **Node.js 20+**（次要）下运行的输出

## 现有文件

- `src/shims/bun-bundle.ts` — 运行时 `feature()` 函数（在提示 02 中创建）
- `src/shims/macro.ts` — 全局 `MACRO` 对象（在提示 02 中创建）
- `src/shims/preload.ts` — 预加载引导（在提示 02 中创建）
- `src/entrypoints/cli.tsx` — 主入口点
- `tsconfig.json` — 有 `"jsx": "react-jsx"`、`"module": "ESNext"`、`"moduleResolution": "bundler"`

## 任务

### 第 A 部分：安装 esbuild

```bash
bun add -d esbuild
```

### 第 B 部分：创建构建脚本

创建 `scripts/build-bundle.ts`（一个可由 Bun 运行的构建脚本）：

```ts
// scripts/build-bundle.ts
// 用法：bun scripts/build-bundle.ts [--watch] [--minify]

import * as esbuild from 'esbuild'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dir, '..')
const watch = process.argv.includes('--watch')
const minify = process.argv.includes('--minify')

const buildOptions: esbuild.BuildOptions = {
  entryPoints: [resolve(ROOT, 'src/entrypoints/cli.tsx')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outdir: resolve(ROOT, 'dist'),
  outExtension: { '.js': '.mjs' },
  
  // 在所有其他代码之前注入 MACRO 全局变量
  inject: [resolve(ROOT, 'src/shims/macro.ts')],
  
  // 将 bun:bundle 别名到我们的运行时垫片
  alias: {
    'bun:bundle': resolve(ROOT, 'src/shims/bun-bundle.ts'),
  },
  
  // 不打包 node 内置模块或原生包
  external: [
    // Node 内置模块
    'fs', 'path', 'os', 'crypto', 'child_process', 'http', 'https',
    'net', 'tls', 'url', 'util', 'stream', 'events', 'buffer',
    'querystring', 'readline', 'zlib', 'assert', 'tty', 'worker_threads',
    'perf_hooks', 'async_hooks', 'dns', 'dgram', 'cluster',
    'node:*',
    // 无法打包的原生插件
    'fsevents',
  ],
  
  jsx: 'automatic',
  
  // 用于调试的源映射
  sourcemap: true,
  
  minify,
  
  // Banner：CLI 的 shebang + 预加载 MACRO 全局变量
  banner: {
    js: '#!/usr/bin/env node\n',
  },
  
  // 处理代码库使用的 .js → .ts 解析
  resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  
  logLevel: 'info',
}

async function main() {
  if (watch) {
    const ctx = await esbuild.context(buildOptions)
    await ctx.watch()
    console.log('正在监视更改...')
  } else {
    const result = await esbuild.build(buildOptions)
    if (result.errors.length > 0) {
      console.error('构建失败')
      process.exit(1)
    }
    console.log('构建完成 → dist/')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

**重要**：这是一个起点。您可能需要迭代外部模块列表和别名配置。代码库有约 1,900 个文件 —— 某些导入可能需要特殊处理。当您运行构建时：

1. 运行它：`bun scripts/build-bundle.ts`
2. 查看错误
3. 修复它们（添加外部模块、修复别名等）
4. 重复直到成功打包

您将遇到的常见问题：
- **使用原生模块的 npm 包** → 添加到 `external`
- **`process.env.USER_TYPE === 'ant'` 后面的动态 `require()` 调用** → 这些是 Anthropic 内部代码，包装它们或创建存根
- **循环依赖** → esbuild 会处理这些但可能会警告
- **从 barrel 文件重新导出** → 应该可以工作，但请注意问题

### 第 C 部分：添加 npm 脚本

将这些添加到 `package.json` 的 `"scripts"` 中：

```json
{
  "build": "bun scripts/build-bundle.ts",
  "build:watch": "bun scripts/build-bundle.ts --watch",
  "build:prod": "bun scripts/build-bundle.ts --minify"
}
```

### 第 D 部分：创建 dist 输出目录

将 `dist/` 添加到 `.gitignore`（如果不存在则创建一个）。

### 第 E 部分：迭代构建错误

运行构建并修复出现的问题。目标是干净的 `bun scripts/build-bundle.ts` 生成 `dist/cli.mjs`。

**无法解析模块的策略**：如果模块引用 Anthropic 内部包或 Bun 特定的 API（如 `Bun.hash`、`Bun.file`），请在 `src/shims/` 中创建最小的垫片，提供兼容的替代方案。

### 第 F 部分：测试输出

成功构建后：
```bash
node dist/cli.mjs --version
# 或
bun dist/cli.mjs --version
```

这应该打印版本。之后可能会崩溃，因为没有配置 API 密钥 —— 目前这没问题。

## 验证

1. `bun scripts/build-bundle.ts` 完成且无错误
2. `dist/cli.mjs` 存在
3. `bun dist/cli.mjs --version` 或 `node dist/cli.mjs --version` 打印版本字符串
4. `package.json` 有 `build`、`build:watch`、`build:prod` 脚本
