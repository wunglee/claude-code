# 提示 01：安装 Bun 运行时和依赖项

## 背景

您正在 `/workspaces/claude-code` 目录中工作，该目录包含 Anthropic 的 Claude Code CLI 的源代码。这是一个 TypeScript/TSX 项目，使用 **Bun** 作为其运行时（而非 Node.js）。`package.json` 指定了 `"engines": { "bun": ">=1.1.0" }`。

没有包含 `bun.lockb` 锁文件 —— 泄漏中未包含它。

## 任务

1. **安装 Bun**（如果尚未安装）：
   ```
   curl -fsSL https://bun.sh/install | bash
   ```
   然后确保 `bun` 在 PATH 中。

2. 在项目根目录（`/workspaces/claude-code`）中运行 **`bun install`** 以安装所有依赖项。这将生成一个 `bun.lockb` 锁文件。

3. **验证安装** — 确认：
   - `node_modules/` 存在并包含主要包：`@anthropic-ai/sdk`、`react`、`chalk`、`@commander-js/extra-typings`、`ink`（可能不存在单独包 —— 请检查 `@anthropic-ai/sdk`、`zod`、`@modelcontextprotocol/sdk`）
   - `bun --version` 返回 1.1.0+

4. **运行类型检查** 以查看当前状态：
   ```
   bun run typecheck
   ```
   报告任何错误 —— 暂时不要修复它们，只需捕获输出。

5. **同时为 mcp-server 子项目安装依赖项**：
   ```
   cd mcp-server && npm install && cd ..
   ```

## 验证

- `bun --version` 输出 >= 1.1.0
- `ls node_modules/@anthropic-ai/sdk` 执行成功
- `bun run typecheck` 运行（在此阶段预期会出现错误，只需报告即可）
