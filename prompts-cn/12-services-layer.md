# Prompt 12: 接入服务层（分析、策略、设置、会话）

## 背景

您正在 `/workspaces/claude-code` 目录下工作。CLI 在运行期间有多个后台服务：
- **分析/遥测** — GrowthBook 功能标志、OpenTelemetry 跟踪
- **策略限制** — 来自 Anthropic 后端的速率限制、配额执行
- **远程托管设置** — 服务器推送的配置
- **会话记忆** — 跨调用持久化的对话历史
- **引导数据** — 启动时从 API 获取的初始配置

其中大部分服务会与 Anthropic 的后端服务器通信，在我们的开发构建中会失败。目标是让它们优雅地失败（不崩溃应用）或提供存根。

## 关键文件

- `src/services/analytics/growthbook.ts` — GrowthBook 功能标志客户端
- `src/services/analytics/` — 遥测、事件日志
- `src/services/policyLimits/` — 速率限制执行
- `src/services/remoteManagedSettings/` — 服务器推送设置
- `src/services/SessionMemory/` — 对话持久化
- `src/services/api/bootstrap.ts` — 初始数据获取
- `src/entrypoints/init.ts` — 大多数服务的初始化位置
- `src/cost-tracker.ts` — Token 使用和成本跟踪

## 任务

### 部分 A：梳理初始化序列

仔细阅读 `src/entrypoints/init.ts`。记录：
1. 哪些服务按什么顺序初始化？
2. 哪些是阻塞的（必须在应用启动前完成）？
3. 哪些是即发即弃的（异步，可以静默失败）？
4. 如果每个服务失败会发生什么？

### 部分 B：使 GrowthBook 可选

阅读 `src/services/analytics/growthbook.ts`：
1. GrowthBook 如何初始化？
2. 从哪里调用？（整个代码库中的功能标志检查）
3. 如果初始化失败会发生什么？

**目标**：使 GrowthBook 静默失败 —— 如果 GrowthBook 不可用，所有功能标志检查应返回 `false`（默认值）。这可能已经处理了，但请验证。

### 部分 C：存根策略限制

阅读 `src/services/policyLimits/`：
1. 它执行哪些限制？（每分钟消息数、每天 Token 数等）
2. 达到限制时会发生什么？
3. `loadPolicyLimits()` 在哪里调用？

**目标**：让应用在没有策略限制的情况下工作。可以：
- 将服务存根为返回"无限制"（允许所有内容）
- 或捕获并忽略 API 调用的错误

### 部分 D：使远程设置可选

阅读 `src/services/remoteManagedSettings/`：
1. 它管理哪些设置？
2. 服务器不可达时的回退方案是什么？

**目标**：确保当远程端点失败时，应用可以使用默认设置工作。

### 部分 E：处理引导数据

阅读 `src/services/api/bootstrap.ts`：
1. 它获取哪些数据？
2. 什么使用这些数据？
3. 如果获取失败会发生什么？

**目标**：当引导失败时提供合理的默认值（没有 API 密钥 = 没有引导）。

### 部分 F：验证会话记忆

阅读 `src/services/SessionMemory/`：
1. 会话数据存储在哪里？（文件系统路径）
2. 如何识别会话？
3. 它是否适用于本地文件系统？

**目标**：会话记忆应该开箱即用，因为它使用本地文件系统。

### 部分 G：接入成本跟踪

阅读 `src/cost-tracker.ts`：
1. 如何计算成本？
2. 在哪里报告使用情况？
3. 它是否跨会话持久化？

**目标**：成本跟踪应该在本地工作（仅显示，不需要远程报告）。

### 部分 H：创建服务冒烟测试

创建 `scripts/test-services.ts`：
```ts
// scripts/test-services.ts
// 测试所有服务初始化时不会崩溃
// 用法：bun scripts/test-services.ts

import './src/shims/preload.js'

async function main() {
  console.log('Testing service initialization...')
  
  // 尝试运行初始化序列
  try {
    const { init } = await import('./src/entrypoints/init.js')
    await init()
    console.log('✅ Services initialized')
  } catch (err: any) {
    console.error('❌ Init failed:', err.message)
    // 记录哪个服务失败以及原因
  }
}

main()
```

## 验证

1. `bun scripts/test-services.ts` 完成而不崩溃（警告可以）
2. 缺失的远程服务记录警告，而不是崩溃
3. 会话记忆读取/写入本地文件系统
4. 成本跟踪在本地显示
5. 即使没有 Anthropic 后端（只需要 API 密钥），应用也可以启动
