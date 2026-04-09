# Prompt 06: 验证并修复 Ink/React 终端 UI 管道

## 背景

您正在 `/workspaces/claude-code` 目录下工作。CLI 使用 **React + Ink** 渲染其 UI —— 一个将 React 组件渲染到终端（而非浏览器）的框架。该项目包含一个**嵌入在 `src/ink/` 中的 Ink 自定义分支**。

关键文件：
- `src/ink.ts` — 公共 API（重新导出 `render()` 和 `createRoot()`，并用 `ThemeProvider` 包装）
- `src/ink/root.ts` — Ink 的根渲染器
- `src/ink/ink.tsx` — 核心 Ink 组件
- `src/ink/reconciler.ts` — 终端输出的 React 协调器
- `src/ink/dom.ts` — 终端 DOM 实现
- `src/ink/renderer.ts` — 将虚拟 DOM 渲染为终端字符串
- `src/ink/components/` — 内置 Ink 组件（Box、Text 等）
- `src/components/` — Claude Code 的约 140 个自定义组件

## 任务

### 部分 A：追踪渲染管道

按顺序阅读这些文件并记录渲染流程：

1. `src/ink.ts` → `render()` 和 `createRoot()` 如何工作
2. `src/ink/root.ts` → Ink 如何创建根并挂载 React
3. `src/ink/reconciler.ts` → 使用什么 React 协调器
4. `src/ink/renderer.ts` → 虚拟 DOM 如何变为终端输出
5. `src/ink/dom.ts` → "DOM 节点" 是什么样子的

在注释块或 README 部分中创建简要架构文档。

### 部分 B：验证 Ink 组件编译

检查核心 Ink 组件是否自包含：
```
src/ink/components/
```
列出所有组件并验证它们没有缺少导入。

### 部分 C：检查 ThemeProvider

阅读 `src/components/design-system/ThemeProvider.tsx`（或它所在的任何位置）。验证它：
1. 存在
2. 导出 `ThemeProvider` 组件
3. 主题系统不依赖外部资源

### 部分 D：创建最小渲染测试

创建 `scripts/test-ink.tsx`：
```tsx
// scripts/test-ink.tsx
// Ink 终端 UI 渲染的最小测试
// 用法：bun scripts/test-ink.tsx

import React from 'react'

// 需要先加载 shims
import './src/shims/preload.js'

// 现在尝试使用 Ink
import { render } from './src/ink.js'

// 最小组件
function Hello() {
  return <Text>Hello from Claude Code Ink UI!</Text>
}

// 需要从 Ink 导入 Text
import { Text } from './src/ink/components/Text.js'

async function main() {
  const instance = await render(<Hello />)
  // 给它一点时间渲染
  setTimeout(() => {
    instance.unmount()
    process.exit(0)
  }, 500)
}

main().catch(err => {
  console.error('Ink 渲染测试失败：', err)
  process.exit(1)
})
```

根据您的发现调整导入 —— Text 组件路径可能不同。

### 部分 E：修复任何问题

如果 Ink 渲染失败，常见问题有：
1. **缺少 `yoga-wasm-web` 或 `yoga-layout`** — Ink 使用 Yoga 进行 flexbox 布局。检查是否有 Yoga 依赖项或是否已嵌入。
2. **React 版本不匹配** — 代码使用 React 19。验证协调器是否兼容。
3. **终端检测** — Ink 检查 stdout 是否为 TTY。在某些环境中可能需要强制设置。
4. **缺少 chalk/ansi 依赖** — 终端颜色。

修复您发现的任何问题以使测试成功渲染。

### 部分 F：验证组件导入

检查 `src/components/` 组件是否可以从 Ink 系统无错误导入。选择 3-5 个关键组件：
- `src/components/MessageResponse.tsx`（或类似 —— 主聊天消息渲染器）
- `src/components/ToolUseResult.tsx`（或类似 —— 工具输出显示）
- `src/components/PermissionRequest.tsx`（或类似 —— 权限模态框）

阅读它们的导入并验证没有缺少任何内容。

## 验证

1. `scripts/test-ink.tsx` 将 "Hello from Claude Code Ink UI!" 渲染到终端
2. 未引入新的 TypeScript 错误
3. 您已记录渲染管道流程
