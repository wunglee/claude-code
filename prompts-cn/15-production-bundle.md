# Prompt 15: 生产包与打包

## 背景

您正在 `/workspaces/claude-code` 目录下工作。到目前为止，您应该已经有了可用的开发运行器（Prompt 14）和构建系统（Prompt 03）。本提示专注于创建生产质量的包。

## 任务

### 部分 A：优化 esbuild 配置

更新 `scripts/build-bundle.ts` 用于生产：

1. **Tree shaking** — esbuild 默认会这样做，但请验证：
   - `feature('X')` 门控代码，其中 X 为 `false` 应被消除
   - `process.env.USER_TYPE === 'ant'` 分支应被消除（设置 `define` 替换为 `false`）

2. **定义替换** — 构建时内联常量：
   ```ts
   define: {
     'process.env.USER_TYPE': '"external"',  // 不是 'ant'（Anthropic 内部）
     'process.env.NODE_ENV': '"production"',
   }
   ```

3. **压缩** — 为生产启用（`--minify` 标志）

4. **Source maps** — 用于生产调试的外部 source maps

5. **目标** — 确保兼容 Bun 1.1+ 和 Node.js 20+

### 部分 B：处理分块/拆分

完整的包会很大（~2-5 MB 压缩后）。考虑：
1. **单文件** — 最简单，到处可用（推荐用于 CLI 工具）
2. **代码拆分** — 多个块，只有在我们想要延迟加载时才有用

除非有问题，否则使用单文件。

### 部分 C：创建可执行文件

打包到 `dist/cli.mjs` 后：

1. **添加 shebang** — `#!/usr/bin/env node`（已在 banner 中）
2. **使其可执行** — `chmod +x dist/cli.mjs`
3. **测试运行** — `./dist/cli.mjs --version`

### 部分 D：平台打包

创建分发的打包脚本：

**npm 包**（`scripts/package-npm.ts`）：
```ts
// 在 dist/npm/ 中生成可发布的 npm 包
// - 带 bin、main、version 的 package.json
// - 打包的 CLI 文件
// - README.md
```

**独立二进制文件**（可选，通过 Bun）：
```bash
bun build --compile src/entrypoints/cli.tsx --outfile dist/claude
```
这会创建嵌入 Bun 运行时的单一二进制文件。并非所有功能都能工作，但值得测试。

### 部分 E：Docker 构建

更新现有的 `Dockerfile` 以生成可运行的容器：

```dockerfile
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile || bun install
COPY . .
RUN bun run build:prod

FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=builder /app/dist/cli.mjs /app/
RUN apk add --no-cache git ripgrep
ENTRYPOINT ["bun", "/app/cli.mjs"]
```

### 部分 F：验证生产构建

1. `bun run build:prod` 成功
2. `ls -lh dist/cli.mjs` — 检查文件大小
3. `node dist/cli.mjs --version` — 适用于 Node.js
4. `bun dist/cli.mjs --version` — 适用于 Bun
5. `ANTHROPIC_API_KEY=... node dist/cli.mjs -p "hello"` — 端到端工作

### 部分 G：CI 构建脚本

创建 `scripts/ci-build.sh`：
```bash
#!/bin/bash
set -euo pipefail

echo "=== 安装依赖 ==="
bun install

echo "=== 类型检查 ==="
bun run typecheck

echo "=== 代码检查 ==="
bun run lint

echo "=== 构建 ==="
bun run build:prod

echo "=== 验证构建 ==="
node dist/cli.mjs --version

echo "=== 完成 ==="
```

## 验证

1. `bun run build:prod` 生成 `dist/cli.mjs`
2. 包 < 10 MB（理想 < 5 MB）
3. `node dist/cli.mjs --version` 可用
4. `docker build .` 成功（如果 Docker 可用）
5. CI 脚本端到端运行无错误
