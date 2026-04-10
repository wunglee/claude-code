// scripts/test-prompt.ts
// Dump the full system prompt that would be sent to the API
// Usage: bun scripts/test-prompt.ts

import '../src/shims/preload.js'

import type { ToolPermissionContext } from '../src/types/permissions.js'

async function main() {
  // Enable config reading first
  const { enableConfigs } = await import('../src/utils/config.js')
  enableConfigs()
  
  // Import the prompt builder
  const { getSystemPrompt } = await import('../src/constants/prompts.js')
  const { getTools } = await import('../src/tools.js')
  
  // Create a minimal permission context
  const permissionContext: ToolPermissionContext = {
    mode: 'default',
    additionalWorkingDirectories: new Map(),
    alwaysAllowRules: {},
    alwaysDenyRules: {},
    alwaysAskRules: {},
    isBypassPermissionsModeAvailable: false,
  }
  
  // Get tools and use a default model
  const tools = getTools(permissionContext)
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
  
  console.log(`Using model: ${model}`)
  console.log(`Tool count: ${tools.length}`)
  console.log('Tools:', tools.map(t => t.name).join(', '))
  console.log('')
  
  // Build system prompt
  const prompt = await getSystemPrompt(tools, model)
  
  console.log('=== SYSTEM PROMPT ===')
  console.log('')
  
  // Print each section with clear separation
  for (let i = 0; i < prompt.length; i++) {
    const section = prompt[i]
    console.log(`--- Section ${i + 1} ---`)
    console.log(section)
    console.log('')
  }
  
  console.log('=== END ===')
  console.log(`\nTotal sections: ${prompt.length}`)
  console.log(`Total length: ${prompt.join('\n').length} characters`)
  
  // Check for MACRO references that weren't resolved
  const fullPrompt = prompt.join('\n')
  const macroMatches = fullPrompt.match(/MACRO\.\w+/g)
  if (macroMatches) {
    console.log('\n⚠️  WARNING: Unresolved MACRO references found:')
    macroMatches.forEach(m => console.log(`  - ${m}`))
  } else {
    console.log('\n✅ All MACRO references resolved')
  }
  
  // Check for undefined values
  if (fullPrompt.includes('undefined')) {
    console.log('\n⚠️  WARNING: "undefined" found in prompt output')
  } else {
    console.log('\n✅ No undefined values in prompt')
  }
}

main().catch(err => {
  console.error('Prompt test failed:', err)
  process.exit(1)
})
