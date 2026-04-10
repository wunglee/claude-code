// scripts/test-context.ts
// Test the context gathering system
// Usage: bun scripts/test-context.ts

import '../src/shims/preload.js'

async function main() {
  // Enable config reading
  const { enableConfigs } = await import('../src/utils/config.js')
  enableConfigs()

  console.log('Testing context gathering system...\n')

  // Test 1: System context (git status)
  console.log('=== Test 1: getSystemContext() ===')
  try {
    const { getSystemContext } = await import('../src/context.js')
    const systemContext = await getSystemContext()
    
    console.log('System context keys:', Object.keys(systemContext).join(', ') || '(none)')
    
    if (systemContext.gitStatus) {
      console.log('✅ Git status found')
      const lines = systemContext.gitStatus.split('\n')
      console.log(`   ${lines.length} lines of git status`)
      // Show first few lines
      console.log('\n   Preview:')
      lines.slice(0, 6).forEach(line => console.log(`   ${line}`))
    } else {
      console.log('ℹ️  No git status (not a git repo or git instructions disabled)')
    }
  } catch (err) {
    console.error('❌ getSystemContext failed:', err)
  }

  console.log('')

  // Test 2: User context (claudeMd + date)
  console.log('=== Test 2: getUserContext() ===')
  try {
    const { getUserContext } = await import('../src/context.js')
    // Clear cache to get fresh result
    getUserContext.cache.clear?.()
    
    const userContext = await getUserContext()
    console.log('User context keys:', Object.keys(userContext).join(', ') || '(none)')
    
    if (userContext.claudeMd) {
      console.log('✅ ClaudeMd content found')
      console.log(`   Length: ${userContext.claudeMd.length} characters`)
    }
    
    if (userContext.currentDate) {
      console.log(`✅ Current date: ${userContext.currentDate}`)
    }
  } catch (err) {
    console.error('❌ getUserContext failed:', err)
  }

  console.log('')

  // Test 3: Environment info
  console.log('=== Test 3: computeEnvInfo() ===')
  try {
    const { computeEnvInfo } = await import('../src/constants/prompts.js')
    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
    const envInfo = await computeEnvInfo(model)
    
    console.log('✅ Environment info computed')
    console.log('\nPreview:')
    console.log('---')
    console.log(envInfo.substring(0, 800))
    console.log('---')
  } catch (err) {
    console.error('❌ computeEnvInfo failed:', err)
  }

  console.log('')

  // Test 4: Platform detection
  console.log('=== Test 4: Platform detection ===')
  console.log(`Platform: ${process.platform}`)
  console.log(`Shell: ${process.env.SHELL || 'unknown'}`)
  console.log(`Node version: ${process.version}`)
  
  try {
    const { getUnameSR } = await import('../src/constants/prompts.js')
    const osVersion = getUnameSR()
    console.log(`OS Version: ${osVersion}`)
  } catch (err) {
    console.error('❌ getUnameSR failed:', err)
  }

  console.log('')
  console.log('=== Context Gathering Test Complete ===')
}

main().catch(err => {
  console.error('Context test failed:', err)
  process.exit(1)
})
