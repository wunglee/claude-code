// src/tools/TungstenTool/TungstenLiveMonitor.tsx
// Stub 文件 - TungstenTool 在泄露版本中不存在
// 注意：此组件仅在 "ant" 构建中渲染，external 构建中条件为 false

import React from 'react';

/**
 * TungstenLiveMonitor - 实时监控组件（Ant 内部功能）
 * 
 * 在 external 构建中此组件永远不会渲染（条件："external" === 'ant' 为 false）
 * 创建此 stub 仅为满足模块导入
 */
export function TungstenLiveMonitor(): React.ReactElement | null {
  // Ant-only feature, always returns null in external builds
  return null;
}

// 默认导出
export default TungstenLiveMonitor;
