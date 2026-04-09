# Kimi API 使用指南

## 概述

本项目已配置为支持 Kimi API。除了标准的 SDK Headers 完整性修复外，无需额外的 Kimi 特定修复。

## 配置说明

### 必需配置

在 `~/.claude/settings.json` 中配置：

```json
{
  "env": {
    "ANTHROPIC_API_KEY": "your-kimi-api-key",
    "ANTHROPIC_BASE_URL": "https://api.kimi.com/coding",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "kimi-for-coding",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "kimi-for-coding",
    "ANTHROPIC_SMALL_FAST_MODEL": "kimi-for-coding"
  }
}
```

### 配置要点

1. **BASE_URL 不要包含 `/v1`**
   - ✅ 正确: `https://api.kimi.com/coding`
   - ❌ 错误: `https://api.kimi.com/coding/v1`
   
   SDK 会自动添加 `/v1` 路径，如果配置中包含会导致重复路径。

2. **模型名称完全灵活**
   - 支持任意模型名称，如 `kimi-for-coding`、`kimi-k2` 等
   - 不限制模型提供商
   - 只要 API 端点支持该模型即可

## SDK Headers 完整性修复

### 什么是这个修复

这是一个 **SDK 本身的缺陷修复**，不是 Kimi 特有的。

**问题**: SDK 的 `createResponseHeaders` 返回的 Proxy 缺少标准的 `.get()` 和 `.forEach()` 方法。

**影响**: 任何 HTTP 错误（404, 429, 500 等）都可能触发 `headers?.get is not a function` 错误。

**解决方案**: 修改 SDK 添加缺失的方法。

### 应用修复

SDK 升级后，运行：

```bash
./scripts/patch-sdk-headers.sh
bun run build
```

详细说明见: `SDK_HEADERS_FIX.md`

## 故障排除

### 问题: "模型不存在" 错误

**原因**: `ANTHROPIC_BASE_URL` 配置中包含了 `/v1`，导致 URL 路径重复

**解决**: 
```bash
# 检查当前配置
grep ANTHROPIC_BASE_URL ~/.claude/settings.json

# 确保是 https://api.kimi.com/coding（不包含 /v1）
```

### 问题: "error.headers?.get is not a function"

**原因**: SDK Headers 完整性修复未应用

**解决**: 
```bash
./scripts/patch-sdk-headers.sh
bun run build
```

## 测试验证

```bash
# 测试基本连通性
echo "2+2=" | node dist/cli.mjs -p
# 期望输出: 4

# 测试复杂查询
echo "Explain quantum computing in one sentence" | node dist/cli.mjs -p
```

## 相关文档

- SDK Headers 修复详情: `SDK_HEADERS_FIX.md`
- 详细修复日志: `FIX_LOG.md`
- 修复脚本: `scripts/patch-sdk-headers.sh`
