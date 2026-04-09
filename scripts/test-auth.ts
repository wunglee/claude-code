// scripts/test-auth.ts
// 快速测试 API 密钥是否配置正确并能连接到 Anthropic
// 用法: bun scripts/test-auth.ts

import '../src/shims/preload.js'
import Anthropic from '@anthropic-ai/sdk'

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY 未设置')
    console.error('请设置环境变量: export ANTHROPIC_API_KEY=sk-ant-...')
    process.exit(1)
  }

  console.log('API Key 前缀:', apiKey.substring(0, 15) + '...')
  
  const client = new Anthropic({
    apiKey,
    baseURL: process.env.ANTHROPIC_BASE_URL,
  })

  try {
    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
    console.log(`测试模型: ${model}`)
    
    const msg = await client.messages.create({
      model,
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say "hello" and nothing else.' }],
    })
    
    console.log('✅ API 连接成功!')
    const content = msg.content[0]
    if (content.type === 'text') {
      console.log('响应:', content.text)
    }
  } catch (err: any) {
    console.error('❌ API 连接失败:', err.message)
    if (err.message.includes('401')) {
      console.error('提示: API Key 可能无效或已过期')
    }
    process.exit(1)
  }
}

main()
