// scripts/test-memory.ts
// Test the memory system (memdir) functionality
// Usage: bun scripts/test-memory.ts

import '../src/shims/preload.js'

async function main() {
  // Enable config reading
  const { enableConfigs } = await import('../src/utils/config.js')
  enableConfigs()

  console.log('Testing memory system...\n')

  // Test 1: Load memory prompt via loadMemoryPrompt
  console.log('=== Test 1: loadMemoryPrompt() ===')
  try {
    const { loadMemoryPrompt } = await import('../src/memdir/memdir.js')
    const memoryPrompt = await loadMemoryPrompt()
    if (memoryPrompt) {
      console.log('✅ Memory prompt loaded successfully')
      console.log(`Length: ${memoryPrompt.length} characters`)
      // Check if it contains the expected sections
      if (memoryPrompt.includes('memory system')) {
        console.log('✅ Contains "memory system" reference')
      }
    } else {
      console.log('ℹ️  Memory prompt returned null (auto memory may be disabled)')
    }
  } catch (err) {
    console.error('❌ loadMemoryPrompt failed:', err)
  }

  console.log('')

  // Test 2: Check getClaudeMds via user context
  console.log('=== Test 2: getUserContext() with claudeMd ===')
  try {
    const { getUserContext } = await import('../src/context.js')
    const userContext = await getUserContext()
    
    if (userContext.claudeMd) {
      console.log('✅ ClaudeMd content found in user context')
      console.log(`Length: ${userContext.claudeMd.length} characters`)
      // Show first 500 chars
      const preview = userContext.claudeMd.substring(0, 500)
      console.log('\nPreview:')
      console.log('---')
      console.log(preview)
      console.log('---')
    } else {
      console.log('ℹ️  No claudeMd in user context (may be disabled or no files found)')
    }
    
    if (userContext.currentDate) {
      console.log(`✅ Current date: ${userContext.currentDate}`)
    }
  } catch (err) {
    console.error('❌ getUserContext failed:', err)
  }

  console.log('')

  // Test 3: Direct memory file reading
  console.log('=== Test 3: Direct memory file reading ===')
  try {
    const { getMemoryFiles } = await import('../src/utils/claudemd.js')
    const memoryFiles = await getMemoryFiles()
    console.log(`Found ${memoryFiles.length} memory files:`)
    for (const file of memoryFiles) {
      console.log(`  - ${file.path} (${file.content.length} chars)`)
    }
  } catch (err) {
    console.error('❌ getMemoryFiles failed:', err)
  }

  console.log('')
  console.log('=== Memory System Test Complete ===')
}

main().catch(err => {
  console.error('Memory test failed:', err)
  process.exit(1)
})
