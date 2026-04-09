# Prompt 04: 修复 MCP 服务器构建

## 背景

您正在 `/workspaces/claude-code/mcp-server/` 目录下工作。这是一个独立的子项目，为 Claude Code 源码提供 MCP（Model Context Protocol，模型上下文协议）服务器。它是一个更简洁、自包含的 TypeScript 项目。

目前 `npm run build`（运行 `tsc`）会因 TypeScript 错误而失败。

## 任务

1. **运行构建并捕获错误**：
   ```bash
   cd /workspaces/claude-code/mcp-server
   npm run build 2>&1
   ```

2. **修复 `mcp-server/src/server.ts` 和 `mcp-server/src/index.ts` 中的所有 TypeScript 错误**。常见问题包括：
   - 重复函数实现
   - 缺少导入
   - 与 MCP SDK 类型不匹配

3. **验证修复**：
   ```bash
   npm run build
   ```
   应该零错误完成，并在 `mcp-server/dist/` 中生成输出。

4. **测试 MCP 服务器运行**：
   ```bash
   node dist/index.js --help 2>&1 || node dist/index.js 2>&1 | head -5
   ```
   它可能会等待 stdio 输入而挂起（这对于 MCP 服务器来说是正常的）—— 只需验证它能启动而不崩溃即可。

## 关键文件

- `mcp-server/package.json` — 构建脚本和依赖项
- `mcp-server/tsconfig.json` — TypeScript 配置  
- `mcp-server/src/server.ts` — 主服务器逻辑（工具、资源、提示）
- `mcp-server/src/index.ts` — 入口点（stdio 传输）

## 验证

1. `cd mcp-server && npm run build` 零错误成功
2. `ls mcp-server/dist/` 显示编译后的 `.js` 文件
3. `node mcp-server/dist/index.js` 启动时不立即崩溃

---

## 修复：GitHub Push Protection 阻止推送

`git push origin main` 被拒绝，因为提交 `5e99ad6` 和 `7adaa5d` 在 `.mcpregistry_github_token` 中包含 **GitHub OAuth 令牌**。该文件已从磁盘删除，但仍存在于 git 历史中。您必须重写历史以删除它。

### 第 1 步：从历史记录中清除密钥

```bash
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .mcpregistry_github_token .mcpregistry_registry_token mcp-server/.mcpregistry_github_token mcp-server/.mcpregistry_registry_token' \
  --prune-empty HEAD~5..HEAD
```

### 第 2 步：推送

```bash
git push origin main
```

### 替代方案：交互式变基

```bash
git rebase -i HEAD~5
# 将提交 5e99ad6 和 7adaa5d 的 "pick" 改为 "edit"
# 在每个停止点，运行：
git rm --cached .mcpregistry_github_token .mcpregistry_registry_token 2>/dev/null
git rm --cached mcp-server/.mcpregistry_github_token mcp-server/.mcpregistry_registry_token 2>/dev/null
git commit --amend --no-edit
git rebase --continue
```

### 第 3 步：防止未来泄露

```bash
echo ".mcpregistry_github_token" >> .gitignore
echo ".mcpregistry_registry_token" >> .gitignore
git add .gitignore && git commit -m "chore: gitignore token files"
```
