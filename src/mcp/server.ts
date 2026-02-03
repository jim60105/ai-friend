// src/mcp/server.ts
/**
 * MCP Server Entry Point
 *
 * This module implements an MCP (Model Context Protocol) server that exposes
 * the chatbot's skills as MCP tools. This allows ACP Agents (like GitHub Copilot CLI)
 * to interact with our chatbot through the standardized MCP protocol.
 *
 * Transport: stdio (standard input/output)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { loadConfig } from "@core/config-loader.ts";
import { MemoryStore } from "@core/memory-store.ts";
import { WorkspaceManager } from "@core/workspace-manager.ts";
import { MemoryHandler } from "@skills/memory-handler.ts";
import { ReplyHandler } from "@skills/reply-handler.ts";
import { ContextHandler } from "@skills/context-handler.ts";
import type { SkillContext } from "@skills/types.ts";
import type { WorkspaceInfo } from "../types/workspace.ts";
import type { Platform } from "../types/events.ts";

// MCP Server Implementation
const MCP_SERVER_NAME = "agent-chatbot";
const MCP_SERVER_VERSION = "0.1.0";

/**
 * Global state for the MCP server
 */
let memoryStore: MemoryStore | null = null;
let workspaceManager: WorkspaceManager | null = null;
let memoryHandler: MemoryHandler | null = null;
let replyHandler: ReplyHandler | null = null;
let contextHandler: ContextHandler | null = null;

/**
 * Initialize the MCP server dependencies
 */
async function initializeDependencies(): Promise<void> {
  // Load configuration
  const config = await loadConfig();

  // Initialize workspace manager
  workspaceManager = new WorkspaceManager(config.workspace);

  // Initialize memory store
  memoryStore = new MemoryStore(workspaceManager, config.memory);

  // Initialize skill handlers
  memoryHandler = new MemoryHandler(memoryStore);
  replyHandler = new ReplyHandler();
  contextHandler = new ContextHandler();
}

/**
 * Get or create workspace info for MCP tool execution
 * For MCP tools, we use environment variables to determine the context
 */
function getWorkspaceInfo(): WorkspaceInfo {
  // Get workspace context from environment variables
  // These should be set by the MCP client when invoking the server
  const platformStr = Deno.env.get("MCP_PLATFORM") ?? "discord";
  const platform: Platform = platformStr === "misskey" ? "misskey" : "discord";
  const userId = Deno.env.get("MCP_USER_ID") ?? "unknown";
  const channelId = Deno.env.get("MCP_CHANNEL_ID") ?? "unknown";
  const isDm = Deno.env.get("MCP_IS_DM") === "true";

  const workspaceKey = `${platform}/${userId}/${channelId}`;

  return {
    key: workspaceKey,
    path: workspaceManager?.getWorkspacePath(workspaceKey) ?? "",
    isDm,
    components: {
      platform,
      userId,
      channelId,
    },
  };
}

/**
 * Create a mock platform adapter for MCP tool execution
 * Note: send-reply and fetch-context require a real platform adapter
 */
function createMockPlatformAdapter() {
  return {
    platform: "mcp",
    sendReply: (_channelId: string, _message: string) => {
      // MCP tools should use the tool result to communicate back
      // This is a placeholder that returns success but doesn't actually send
      console.error(
        "[MCP] send-reply called via MCP - message returned as tool result instead",
      );
      return Promise.resolve({ success: true, messageId: "mcp-result" });
    },
    fetchRecentMessages: (_channelId: string, _limit: number) => {
      console.error("[MCP] fetch-context not available via MCP - requires platform connection");
      return Promise.resolve([]);
    },
    searchRelatedMessages: (
      _guildId: string,
      _channelId: string,
      _query: string,
      _limit: number,
    ) => {
      console.error("[MCP] search not available via MCP - requires platform connection");
      return Promise.resolve([]);
    },
    getUsername: (_userId: string) => {
      return Promise.resolve(Deno.env.get("MCP_USERNAME") ?? "unknown");
    },
    isConnected: () => true,
    connect: async () => {},
    disconnect: async () => {},
  };
}

/**
 * Create skill context for tool execution
 */
function createSkillContext(): SkillContext {
  const workspace = getWorkspaceInfo();
  const channelId = Deno.env.get("MCP_CHANNEL_ID") ?? "unknown";
  const userId = Deno.env.get("MCP_USER_ID") ?? "unknown";

  return {
    workspace,
    platformAdapter: createMockPlatformAdapter() as unknown as SkillContext["platformAdapter"],
    channelId,
    userId,
  };
}

/**
 * Main function to start the MCP server
 */
async function main(): Promise<void> {
  // Initialize dependencies
  await initializeDependencies();

  // Create MCP server
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  // Register memory-save tool
  server.tool(
    "memory_save",
    "Save important information to persistent memory for future conversations. " +
      "Use this to remember user preferences, important facts, or relationship details. " +
      "Memory is append-only and cannot be deleted, only disabled.",
    {
      content: z.string().describe("The memory content to save (plain text)"),
      visibility: z
        .enum(["public", "private"])
        .default("public")
        .describe(
          "Visibility: public (visible in all contexts) or private (only visible in DM contexts)",
        ),
      importance: z
        .enum(["high", "normal"])
        .default("normal")
        .describe(
          "Importance: high (always loaded into context) or normal (retrieved via search)",
        ),
    },
    async ({ content, visibility, importance }) => {
      if (!memoryHandler) {
        return {
          content: [{ type: "text", text: "Error: Memory handler not initialized" }],
          isError: true,
        };
      }

      const context = createSkillContext();
      const result = await memoryHandler.handleMemorySave(
        { content, visibility, importance },
        context,
      );

      if (result.success) {
        return {
          content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
        };
      }

      return {
        content: [{ type: "text", text: `Error: ${result.error}` }],
        isError: true,
      };
    },
  );

  // Register memory-search tool
  server.tool(
    "memory_search",
    "Search through saved memories by keywords. " +
      "Use this to recall information from past conversations.",
    {
      query: z.string().describe("Search keywords to find relevant memories"),
      limit: z
        .number()
        .int()
        .positive()
        .default(10)
        .describe("Maximum number of results to return"),
    },
    async ({ query, limit }) => {
      if (!memoryHandler) {
        return {
          content: [{ type: "text", text: "Error: Memory handler not initialized" }],
          isError: true,
        };
      }

      const context = createSkillContext();
      const result = await memoryHandler.handleMemorySearch({ query, limit }, context);

      if (result.success) {
        return {
          content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
        };
      }

      return {
        content: [{ type: "text", text: `Error: ${result.error}` }],
        isError: true,
      };
    },
  );

  // Register memory-patch tool
  server.tool(
    "memory_patch",
    "Modify memory metadata (enabled, visibility, importance). " +
      "Content cannot be modified, only the metadata. " +
      "To 'delete' a memory, disable it with enabled=false.",
    {
      memory_id: z.string().describe("The ID of the memory to modify"),
      enabled: z
        .boolean()
        .optional()
        .describe("Whether the memory is active (set to false to 'delete')"),
      visibility: z
        .enum(["public", "private"])
        .optional()
        .describe("Change visibility level"),
      importance: z.enum(["high", "normal"]).optional().describe("Change importance level"),
    },
    async ({ memory_id, enabled, visibility, importance }) => {
      if (!memoryHandler) {
        return {
          content: [{ type: "text", text: "Error: Memory handler not initialized" }],
          isError: true,
        };
      }

      const context = createSkillContext();
      const result = await memoryHandler.handleMemoryPatch(
        { memory_id, enabled, visibility, importance },
        context,
      );

      if (result.success) {
        return {
          content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
        };
      }

      return {
        content: [{ type: "text", text: `Error: ${result.error}` }],
        isError: true,
      };
    },
  );

  // Register send-reply tool
  // Note: In MCP context, this returns the message as tool result instead of sending to platform
  server.tool(
    "send_reply",
    "Compose the final reply message to send to the user. " +
      "IMPORTANT: In MCP mode, this returns the message as the tool result. " +
      "The AI host is responsible for sending the actual message. " +
      "Can only be called ONCE per interaction.",
    {
      message: z.string().describe("The final message to send to the user"),
    },
    ({ message }) => {
      if (!replyHandler) {
        return {
          content: [{ type: "text", text: "Error: Reply handler not initialized" }],
          isError: true,
        };
      }

      const context = createSkillContext();

      // Check if reply was already sent
      if (replyHandler.hasReplySent(context.workspace.key, context.channelId)) {
        return {
          content: [{ type: "text", text: "Error: Reply can only be sent once per interaction" }],
          isError: true,
        };
      }

      // In MCP mode, we return the message as tool result
      // The actual sending is done by the MCP client/host
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                action: "send_reply",
                message: message,
                timestamp: new Date().toISOString(),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // Register fetch-context tool
  server.tool(
    "fetch_context",
    "Fetch additional context from the platform. " +
      "NOTE: Limited functionality in MCP mode - only user_info is fully supported.",
    {
      type: z
        .enum(["recent_messages", "search_messages", "user_info"])
        .describe("Type of context to fetch"),
      query: z
        .string()
        .optional()
        .describe("Search query (required for search_messages type)"),
      limit: z.number().int().positive().default(20).describe("Maximum items to return"),
    },
    async ({ type, query, limit }) => {
      if (!contextHandler) {
        return {
          content: [{ type: "text", text: "Error: Context handler not initialized" }],
          isError: true,
        };
      }

      const context = createSkillContext();
      const result = await contextHandler.handleFetchContext({ type, query, limit }, context);

      if (result.success) {
        return {
          content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
        };
      }

      return {
        content: [{ type: "text", text: `Error: ${result.error}` }],
        isError: true,
      };
    },
  );

  // Create stdio transport
  const transport = new StdioServerTransport();

  // Connect and start server
  await server.connect(transport);

  // Log to stderr (not stdout, as stdout is used for MCP protocol)
  console.error(`[MCP] ${MCP_SERVER_NAME} v${MCP_SERVER_VERSION} started`);
  console.error(
    `[MCP] Available tools: memory_save, memory_search, memory_patch, send_reply, fetch_context`,
  );
}

// Run the server
main().catch((error) => {
  console.error("[MCP] Fatal error:", error);
  Deno.exit(1);
});
