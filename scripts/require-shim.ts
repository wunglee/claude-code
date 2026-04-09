// scripts/require-shim.ts
// 为 ESM bundle 提供全局 require 函数
// 解决 CommonJS 模块动态 require Node 内置模块的问题

import { createRequire } from 'module'

const require = createRequire(import.meta.url)

if (typeof globalThis.require === 'undefined') {
  globalThis.require = require
}
