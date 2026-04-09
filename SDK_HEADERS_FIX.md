# SDK Headers 完整性修复

## 问题定义

**问题类型**: SDK 设计缺陷  
**影响范围**: 所有 HTTP 错误响应（404, 429, 500 等）  
**根本原因**: SDK 的 `createResponseHeaders` 返回的 Proxy 缺少标准 Headers 方法

## 问题详情

### SDK 原始实现

```javascript
const createResponseHeaders = (headers) => {
    return new Proxy(Object.fromEntries(headers.entries()), {
        get(target, name) {
            const key = name.toString();
            return target[key.toLowerCase()] || target[key];
        },
    });
};
```

### 问题

返回的对象只支持 `headers['key']` 语法，不支持：
- `headers.get('key')` - 返回 `undefined`，不是函数
- `headers.forEach(callback)` - 返回 `undefined`，不是函数

### 触发场景

当 API 返回任何 HTTP 错误时，代码尝试访问错误 headers：

```typescript
// withRetry.ts
const overageReason = error.headers?.get('anthropic-ratelimit-...')
// ❌ 报错: error.headers?.get is not a function

// errors.ts  
const rateLimitType = error.headers?.get?.('anthropic-ratelimit-...')
// ❌ 报错: error.headers?.get is not a function

// logging.ts
headers.forEach((_, key) => { ... })
// ❌ 报错: headers.forEach is not a function
```

## 修复内容

### 修改文件

1. `node_modules/@anthropic-ai/sdk/core.js`
2. `node_modules/@anthropic-ai/sdk/core.mjs`

### 修复代码

```javascript
const createResponseHeaders = (headers) => {
    const data = Object.fromEntries(headers.entries());
    const proxy = new Proxy(data, {
        get(target, name) {
            const key = name.toString();
            return target[key.toLowerCase()] || target[key];
        },
    });
    
    // 添加缺失的 .get() 方法
    Object.defineProperty(proxy, 'get', {
        value: function(name) {
            const key = name.toString().toLowerCase();
            return data[key] ?? null;
        },
        writable: false,
        configurable: true,
    });
    
    // 添加缺失的 .forEach() 方法
    Object.defineProperty(proxy, 'forEach', {
        value: function(callback) {
            for (const key of Object.keys(data)) {
                callback(data[key], key);
            }
        },
        writable: false,
        configurable: true,
    });
    
    return proxy;
};
```

## 修复脚本

```bash
./scripts/patch-sdk-headers.sh
```

## 为什么需要这个修复

1. **SDK 设计不完整**: 返回的 Headers 对象不符合 Fetch API Headers 接口标准
2. **代码依赖标准接口**: 项目代码使用 `headers.get()` 和 `headers.forEach()` 是合理做法
3. **任何 HTTP 错误都会触发**: 不限于特定 API 或特定错误类型

## 与 Kimi API 的关系

**无关** - 这个修复是 SDK 本身的缺陷，与 Kimi API 无关。

之前遇到的 404 错误是独立的配置问题（URL 路径重复），不是 Headers 问题导致的。

## 维护说明

当 SDK 升级后，需要重新应用此修复：

```bash
./scripts/patch-sdk-headers.sh
bun run build
```

## 文件备份

- `node_modules/@anthropic-ai/sdk/core.js.backup`
- `node_modules/@anthropic-ai/sdk/core.mjs.backup`
