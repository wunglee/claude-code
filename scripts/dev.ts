// scripts/dev.ts
// Development launcher — runs the CLI directly via Bun's TS runtime.
//
// Usage:
//   bun scripts/dev.ts [args...]
//   bun run dev [args...]
//
// The bun:bundle shim is loaded automatically via bunfig.toml preload.
// Bun automatically reads .env files from the project root.
//
// Note: SDK Headers are patched automatically during 'bun install' via postinstall hook.

// Make this file a module so top-level await is allowed
export {}

// Load MACRO global (version, package url, etc.) before any app code
await import('../src/shims/macro.js')

// Launch the CLI entrypoint
await import('../src/entrypoints/cli.js')
