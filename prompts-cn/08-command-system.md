# Prompt 08: 审计并连接命令系统

## 背景

您正在 `/workspaces/claude-code` 目录下工作。CLI 有约 50 个斜杠命令（例如 `/commit`、`/review`、`/init`、`/config`）。这些命令在 `src/commands.ts` 中注册，并在 `src/commands/` 中实现。

关键文件：
- `src/commands.ts`（约 25K 行）— 命令注册表（`getCommands()`）
- `src/commands/` — 各个命令实现
- `src/types/command.ts` — 命令类型定义

## 任务

### 部分 A：理解 Command 接口

阅读 `src/types/command.ts` 和 `src/commands.ts` 的顶部。记录：
1. `Command` 类型（name、description、execute、args 等）
2. 命令如何注册
3. 命令执行如何触发（从 REPL？从 CLI 参数？）

### 部分 B：审计命令注册表

完整阅读 `src/commands.ts`。创建所有命令的完整清单，按类别组织：

**基本命令**（基本操作所需）：
- `/help` — 显示帮助
- `/config` — 查看/编辑配置
- `/init` — 初始化项目
- `/commit` — git 提交
- `/review` — 代码审查

**功能开关命令**（在功能标志或 USER_TYPE 后面）：
- 列出哪个标志启用每个命令

**可能损坏的命令**（引用缺失导入或服务）：
- 列出任何无法解析其导入的命令

### 部分 C：验证核心命令编译

对于上述列出的基本命令，阅读其实现并检查：
1. 所有导入解析
2. 它们不依赖不可用的服务
3. 函数签名与 Command 类型匹配

### 部分 D：修复导入问题

与工具系统类似，命令可能有：
- 需要 `bun:bundle` 填充的功能开关导入
- Ant 内部代码路径
- 需要正确路径的动态导入

修复任何损坏的地方。

### 部分 E：处理"已移至插件"命令

有一个文件 `src/commands/createMovedToPluginCommand.ts`。阅读它 —— 一些命令已迁移到插件系统。这些应该优雅地告诉用户命令已移动，而不是崩溃。

### 部分 F：创建命令冒烟测试

创建 `scripts/test-commands.ts`：
```ts
// scripts/test-commands.ts
// 验证所有命令无错误加载
// 用法：bun scripts/test-commands.ts

import './src/shims/preload.js'

async function main() {
  const { getCommands } = await import('./src/commands.js')
  
  const commands = getCommands(/* 检查签名 */)
  
  console.log(`已加载 ${commands.length} 个命令：\n`)
  for (const cmd of commands) {
    console.log(`  /${cmd.name} — ${cmd.description || '(无描述)'}`)
  }
}

main().catch(err => {
  console.error('命令加载失败：', err)
  process.exit(1)
})
```

## 验证

1. `scripts/test-commands.ts` 列出所有可用命令
2. 核心命令（`/help`、`/config`、`/init`、`/commit`）存在
3. 没有缺失导入的运行时崩溃
4. 已移至插件的命令显示友好消息而不是崩溃
