#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_ROOT = path.resolve(
  process.env.CLAUDE_CODE_SRC_ROOT ?? path.join(__dirname, "..", "..", "src")
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function dirExists(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isFile();
  } catch {
    return false;
  }
}

/** List immediate children of a directory (files & dirs). */
async function listDir(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.map((e: { isDirectory(): boolean; name: string }) => (e.isDirectory() ? e.name + "/" : e.name)).sort();
  } catch {
    return [];
  }
}

/** Recursively collect all file paths under `root` (relative to root). */
async function walkFiles(root: string, rel = ""): Promise<string[]> {
  const results: string[] = [];
  let entries;
  try {
    entries = await fs.readdir(path.join(root, rel), { withFileTypes: true });
  } catch {
    return results;
  }
  for (const e of entries) {
    const child = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      results.push(...(await walkFiles(root, child)));
    } else {
      results.push(child);
    }
  }
  return results;
}

/** Safely resolve a user-supplied relative path under SRC_ROOT. */
function safePath(relPath: string): string | null {
  const resolved = path.resolve(SRC_ROOT, relPath);
  if (!resolved.startsWith(SRC_ROOT)) return null; // path traversal blocked
  return resolved;
}

// ---------------------------------------------------------------------------
// Tool & Command Metadata
// ---------------------------------------------------------------------------

interface ToolInfo {
  name: string;
  directory: string;
  files: string[];
}

interface CommandInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  files?: string[];
}

async function getToolList(): Promise<ToolInfo[]> {
  const toolsDir = path.join(SRC_ROOT, "tools");
  const entries = await fs.readdir(toolsDir, { withFileTypes: true });
  const tools: ToolInfo[] = [];

  for (const e of entries) {
    if (!e.isDirectory() || e.name === "shared" || e.name === "testing")
      continue;
    const files = await listDir(path.join(toolsDir, e.name));
    tools.push({ name: e.name, directory: `tools/${e.name}`, files });
  }
  return tools.sort((a, b) => a.name.localeCompare(b.name));
}

async function getCommandList(): Promise<CommandInfo[]> {
  const cmdsDir = path.join(SRC_ROOT, "commands");
  const entries = await fs.readdir(cmdsDir, { withFileTypes: true });
  const commands: CommandInfo[] = [];

  for (const e of entries) {
    if (e.isDirectory()) {
      const files = await listDir(path.join(cmdsDir, e.name));
      commands.push({
        name: e.name,
        path: `commands/${e.name}`,
        isDirectory: true,
        files,
      });
    } else {
      commands.push({
        name: e.name.replace(/\.(ts|tsx)$/, ""),
        path: `commands/${e.name}`,
        isDirectory: false,
      });
    }
  }
  return commands.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "claude-code-explorer", version: "1.0.0" },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ---- Resources -----------------------------------------------------------

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "claude-code://architecture",
      name: "Architecture Overview",
      description: "High-level overview of the Claude Code source architecture",
      mimeType: "text/markdown",
    },
    {
      uri: "claude-code://tools",
      name: "Tool Registry",
      description: "List of all agent tools with their files",
      mimeType: "application/json",
    },
    {
      uri: "claude-code://commands",
      name: "Command Registry",
      description: "List of all slash commands",
      mimeType: "application/json",
    },
  ],
}));

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
  resourceTemplates: [
    {
      uriTemplate: "claude-code://source/{path}",
      name: "Source file",
      description: "Read a source file from the Claude Code src/ directory",
      mimeType: "text/plain",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request: { params: { uri: string } }) => {
  const { uri } = request.params;

  if (uri === "claude-code://architecture") {
    const readmePath = path.resolve(SRC_ROOT, "..", "README.md");
    let text: string;
    try {
      text = await fs.readFile(readmePath, "utf-8");
    } catch {
      text = "README.md not found.";
    }
    return { contents: [{ uri, mimeType: "text/markdown", text }] };
  }

  if (uri === "claude-code://tools") {
    const tools = await getToolList();
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(tools, null, 2),
        },
      ],
    };
  }

  if (uri === "claude-code://commands") {
    const commands = await getCommandList();
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(commands, null, 2),
        },
      ],
    };
  }

  // Source file template
  if (uri.startsWith("claude-code://source/")) {
    const relPath = uri.slice("claude-code://source/".length);
    const abs = safePath(relPath);
    if (!abs) throw new Error("Invalid path");
    const text = await fs.readFile(abs, "utf-8");
    return { contents: [{ uri, mimeType: "text/plain", text }] };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// ---- Tools ---------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_tools",
      description:
        "List all Claude Code agent tools (BashTool, FileReadTool, etc.) with their source files.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "list_commands",
      description:
        "List all Claude Code slash commands (/commit, /review, /mcp, etc.) with their source files.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "get_tool_source",
      description:
        "Read the full source code of a specific Claude Code tool implementation. Provide the tool directory name (e.g. 'BashTool', 'FileEditTool').",
      inputSchema: {
        type: "object" as const,
        properties: {
          toolName: {
            type: "string",
            description:
              "Tool directory name, e.g. 'BashTool', 'FileReadTool'",
          },
          fileName: {
            type: "string",
            description:
              "Optional: specific file within the tool directory. If omitted, returns the main implementation file.",
          },
        },
        required: ["toolName"],
      },
    },
    {
      name: "get_command_source",
      description:
        "Read the source code of a specific Claude Code slash command. Provide the command name (e.g. 'commit', 'review', 'mcp').",
      inputSchema: {
        type: "object" as const,
        properties: {
          commandName: {
            type: "string",
            description: "Command name, e.g. 'commit', 'review', 'mcp'",
          },
          fileName: {
            type: "string",
            description:
              "Optional: specific file within the command directory.",
          },
        },
        required: ["commandName"],
      },
    },
    {
      name: "read_source_file",
      description:
        "Read any source file from the Claude Code src/ directory by relative path.",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: {
            type: "string",
            description:
              "Relative path from src/, e.g. 'QueryEngine.ts', 'services/mcp/types.ts'",
          },
          startLine: {
            type: "number",
            description: "Optional 1-based start line to read from.",
          },
          endLine: {
            type: "number",
            description: "Optional 1-based end line to read to.",
          },
        },
        required: ["path"],
      },
    },
    {
      name: "search_source",
      description:
        "Search for a pattern (regex or plain text) across the Claude Code source code. Returns matching lines with file paths and line numbers.",
      inputSchema: {
        type: "object" as const,
        properties: {
          pattern: {
            type: "string",
            description: "Search pattern (regex supported).",
          },
          filePattern: {
            type: "string",
            description:
              "Optional glob-like filter for file extensions, e.g. '.ts', '.tsx'.",
          },
          maxResults: {
            type: "number",
            description: "Maximum number of matches to return (default: 50).",
          },
        },
        required: ["pattern"],
      },
    },
    {
      name: "list_directory",
      description:
        "List files and subdirectories within a directory under src/.",
      inputSchema: {
        type: "object" as const,
        properties: {
          path: {
            type: "string",
            description:
              "Relative path from src/, e.g. 'services', 'tools/BashTool'. Use '' for the root.",
          },
        },
        required: ["path"],
      },
    },
    {
      name: "get_architecture",
      description:
        "Get a high-level architecture overview of Claude Code including directory structure, core systems, and key files.",
      inputSchema: { type: "object" as const, properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request: { params: { name: string; arguments?: Record<string, unknown> } }) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    // ---- list_tools ----
    case "list_tools": {
      const tools = await getToolList();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(tools, null, 2) }],
      };
    }

    // ---- list_commands ----
    case "list_commands": {
      const commands = await getCommandList();
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(commands, null, 2) },
        ],
      };
    }

    // ---- get_tool_source ----
    case "get_tool_source": {
      const toolName = (args as Record<string, unknown>)?.toolName as string;
      if (!toolName) throw new Error("toolName is required");
      const toolDir = safePath(`tools/${toolName}`);
      if (!toolDir || !(await dirExists(toolDir)))
        throw new Error(`Tool not found: ${toolName}`);

      let fileName = (args as Record<string, unknown>)?.fileName as
        | string
        | undefined;
      if (!fileName) {
        // Find the main implementation file
        const files = await listDir(toolDir);
        const main =
          files.find(
            (f) => f === `${toolName}.ts` || f === `${toolName}.tsx`
          ) ?? files.find((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
        if (!main) throw new Error(`No source files in ${toolName}`);
        fileName = main;
      }

      const filePath = safePath(`tools/${toolName}/${fileName}`);
      if (!filePath || !(await fileExists(filePath)))
        throw new Error(`File not found: tools/${toolName}/${fileName}`);
      const content = await fs.readFile(filePath, "utf-8");
      return {
        content: [
          {
            type: "text" as const,
            text: `// tools/${toolName}/${fileName}\n// ${content.split("\n").length} lines\n\n${content}`,
          },
        ],
      };
    }

    // ---- get_command_source ----
    case "get_command_source": {
      const commandName = (args as Record<string, unknown>)
        ?.commandName as string;
      if (!commandName) throw new Error("commandName is required");

      // Try directory first, then .ts / .tsx
      const candidates = [
        `commands/${commandName}`,
        `commands/${commandName}.ts`,
        `commands/${commandName}.tsx`,
      ];
      let found: string | null = null;
      let isDir = false;
      for (const c of candidates) {
        const abs = safePath(c);
        if (abs && (await dirExists(abs))) {
          found = abs;
          isDir = true;
          break;
        }
        if (abs && (await fileExists(abs))) {
          found = abs;
          break;
        }
      }
      if (!found) throw new Error(`Command not found: ${commandName}`);

      if (!isDir) {
        const content = await fs.readFile(found, "utf-8");
        return {
          content: [{ type: "text" as const, text: content }],
        };
      }

      const reqFile = (args as Record<string, unknown>)?.fileName as
        | string
        | undefined;
      if (reqFile) {
        const filePath = safePath(`commands/${commandName}/${reqFile}`);
        if (!filePath || !(await fileExists(filePath)))
          throw new Error(
            `File not found: commands/${commandName}/${reqFile}`
          );
        const content = await fs.readFile(filePath, "utf-8");
        return { content: [{ type: "text" as const, text: content }] };
      }

      // Return directory listing when no specific file requested
      const files = await listDir(found);
      return {
        content: [
          {
            type: "text" as const,
            text: `Command: ${commandName}\nFiles:\n${files.map((f) => `  ${f}`).join("\n")}`,
          },
        ],
      };
    }

    // ---- read_source_file ----
    case "read_source_file": {
      const relPath = (args as Record<string, unknown>)?.path as string;
      if (!relPath) throw new Error("path is required");
      const abs = safePath(relPath);
      if (!abs || !(await fileExists(abs)))
        throw new Error(`File not found: ${relPath}`);
      const content = await fs.readFile(abs, "utf-8");
      const lines = content.split("\n");
      const start = ((args as Record<string, unknown>)?.startLine as number) ?? 1;
      const end = ((args as Record<string, unknown>)?.endLine as number) ?? lines.length;
      const slice = lines.slice(
        Math.max(0, start - 1),
        Math.min(lines.length, end)
      );
      return {
        content: [
          {
            type: "text" as const,
            text: slice
              .map((l: string, i: number) => `${(start + i).toString().padStart(5)} | ${l}`)
              .join("\n"),
          },
        ],
      };
    }

    // ---- search_source ----
    case "search_source": {
      const pattern = (args as Record<string, unknown>)?.pattern as string;
      if (!pattern) throw new Error("pattern is required");
      const filePattern = (args as Record<string, unknown>)?.filePattern as
        | string
        | undefined;
      const maxResults =
        ((args as Record<string, unknown>)?.maxResults as number) ?? 50;

      let regex: RegExp;
      try {
        regex = new RegExp(pattern, "i");
      } catch {
        throw new Error(`Invalid regex pattern: ${pattern}`);
      }

      const allFiles = await walkFiles(SRC_ROOT);
      const filtered = filePattern
        ? allFiles.filter((f) => f.endsWith(filePattern))
        : allFiles;

      const matches: string[] = [];
      for (const file of filtered) {
        if (matches.length >= maxResults) break;
        const abs = path.join(SRC_ROOT, file);
        let content: string;
        try {
          content = await fs.readFile(abs, "utf-8");
        } catch {
          continue;
        }
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (matches.length >= maxResults) break;
          if (regex.test(lines[i]!)) {
            matches.push(`${file}:${i + 1}: ${lines[i]!.trim()}`);
          }
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: matches.length > 0
              ? `Found ${matches.length} match(es):\n\n${matches.join("\n")}`
              : "No matches found.",
          },
        ],
      };
    }

    // ---- list_directory ----
    case "list_directory": {
      const relPath = ((args as Record<string, unknown>)?.path as string) ?? "";
      const abs = safePath(relPath);
      if (!abs || !(await dirExists(abs)))
        throw new Error(`Directory not found: ${relPath}`);
      const entries = await listDir(abs);
      return {
        content: [
          {
            type: "text" as const,
            text: entries.length > 0 ? entries.join("\n") : "(empty directory)",
          },
        ],
      };
    }

    // ---- get_architecture ----
    case "get_architecture": {
      const topLevel = await listDir(SRC_ROOT);
      const tools = await getToolList();
      const commands = await getCommandList();

      const overview = `# Claude Code Architecture Overview

## Source Root
${SRC_ROOT}

## Top-Level Entries
${topLevel.map((e) => `- ${e}`).join("\n")}

## Agent Tools (${tools.length})
${tools.map((t) => `- **${t.name}** — ${t.files.length} files: ${t.files.join(", ")}`).join("\n")}

## Slash Commands (${commands.length})
${commands.map((c) => `- **${c.name}** ${c.isDirectory ? "(directory)" : "(file)"}${c.files ? ": " + c.files.join(", ") : ""}`).join("\n")}

## Key Files
- **main.tsx** — CLI entrypoint (Commander.js)
- **QueryEngine.ts** — Core LLM API caller, streaming, tool loops
- **Tool.ts** — Base tool types, schemas, permission model
- **commands.ts** — Command registry and loader
- **tools.ts** — Tool registry and loader
- **context.ts** — System/user context collection

## Core Subsystems
- **bridge/** — IDE integration (VS Code, JetBrains)
- **coordinator/** — Multi-agent orchestration
- **services/mcp/** — MCP client connections
- **services/api/** — Anthropic API client
- **plugins/** — Plugin system
- **skills/** — Skill system
- **tasks/** — Background task management
- **server/** — Server/remote mode
- **entrypoints/mcp.ts** — Built-in MCP server entrypoint
`;
      return { content: [{ type: "text" as const, text: overview }] };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Validate source root exists
  if (!(await dirExists(SRC_ROOT))) {
    console.error(`Error: Claude Code src/ directory not found at ${SRC_ROOT}`);
    console.error(
      "Set CLAUDE_CODE_SRC_ROOT environment variable to the src/ directory path."
    );
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Claude Code Explorer MCP server started (src: ${SRC_ROOT})`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
