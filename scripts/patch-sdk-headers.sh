#!/bin/bash
# SDK 通用 Headers 完整性修复脚本
# 用于在官方 SDK 升级后快速恢复 Kimi API 兼容性

set -e

SDK_DIR="node_modules/@anthropic-ai/sdk"

echo "=== Anthropic SDK 通用 Headers 完整性修复 ==="
echo ""

# 检查 SDK 是否存在
if [ ! -d "$SDK_DIR" ]; then
    echo "❌ 错误: SDK 目录不存在: $SDK_DIR"
    echo "请先运行: npm install 或 bun install"
    exit 1
fi

# 备份原始文件
if [ ! -f "$SDK_DIR/core.js.backup" ]; then
    echo "📦 备份 core.js..."
    cp "$SDK_DIR/core.js" "$SDK_DIR/core.js.backup"
fi

if [ ! -f "$SDK_DIR/core.mjs.backup" ]; then
    echo "📦 备份 core.mjs..."
    cp "$SDK_DIR/core.mjs" "$SDK_DIR/core.mjs.backup"
fi

# 修复 core.js
echo "🔧 修复 core.js..."
cat > /tmp/patch-core.js << 'EOFPATCH'
const createResponseHeaders = (headers) => {
    const data = Object.fromEntries(
    // @ts-ignore
    headers.entries());
    const proxy = new Proxy(data, {
        get(target, name) {
            const key = name.toString();
            return target[key.toLowerCase()] || target[key];
        },
    });
    // Add .get() method for Kimi API compatibility
    Object.defineProperty(proxy, 'get', {
        value: function(name) {
            const key = name.toString().toLowerCase();
            return data[key] ?? null;
        },
        writable: false,
        configurable: true,
    });
    // Add .forEach() method for logging compatibility
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
EOFPATCH

# 提取并替换 createResponseHeaders 函数
node -e "
const fs = require('fs');
const content = fs.readFileSync('$SDK_DIR/core.js', 'utf8');
const newPatch = fs.readFileSync('/tmp/patch-core.js', 'utf8');

// 匹配 createResponseHeaders 函数
const regex = /const createResponseHeaders = \(headers\) => \{[\s\S]*?\};\s*exports\.createResponseHeaders = createResponseHeaders;/;

if (regex.test(content)) {
    const newContent = content.replace(regex, newPatch.trim() + '\nexports.createResponseHeaders = createResponseHeaders;');
    fs.writeFileSync('$SDK_DIR/core.js', newContent);
    console.log('✅ core.js 修复成功');
} else {
    console.log('⚠️  core.js 中未找到 createResponseHeaders 函数，可能已修复或版本不兼容');
}
"

# 修复 core.mjs
echo "🔧 修复 core.mjs..."
cat > /tmp/patch-core.mjs << 'EOFPATCH'
export const createResponseHeaders = (headers) => {
    const data = Object.fromEntries(
    // @ts-ignore
    headers.entries());
    const proxy = new Proxy(data, {
        get(target, name) {
            const key = name.toString();
            return target[key.toLowerCase()] || target[key];
        },
    });
    // Add .get() method for Kimi API compatibility
    Object.defineProperty(proxy, 'get', {
        value: function(name) {
            const key = name.toString().toLowerCase();
            return data[key] ?? null;
        },
        writable: false,
        configurable: true,
    });
    // Add .forEach() method for logging compatibility
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
EOFPATCH

# 提取并替换 createResponseHeaders 函数
node -e "
const fs = require('fs');
const content = fs.readFileSync('$SDK_DIR/core.mjs', 'utf8');
const newPatch = fs.readFileSync('/tmp/patch-core.mjs', 'utf8');

// 匹配 export const createResponseHeaders 函数
const regex = /export const createResponseHeaders = \(headers\) => \{[\s\S]*?\};/;

if (regex.test(content)) {
    const newContent = content.replace(regex, newPatch.trim());
    fs.writeFileSync('$SDK_DIR/core.mjs', newContent);
    console.log('✅ core.mjs 修复成功');
} else {
    console.log('⚠️  core.mjs 中未找到 createResponseHeaders 函数，可能已修复或版本不兼容');
}
"

echo ""
echo "=== ✅ SDK 通用 Headers 完整性修复完成 ==="
echo ""
echo "📋 说明:"
echo "   - 修改了 node_modules/@anthropic-ai/sdk/core.js 和 core.mjs"
echo "   - 为 createResponseHeaders 返回的 Proxy 添加了 .get() 和 .forEach() 方法"
echo "   - 原文件已备份为 .backup 后缀"
echo ""
echo "🔄 下一步:"
echo "   运行 'bun run build' 重新构建项目"
