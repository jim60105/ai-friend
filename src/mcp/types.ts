// src/mcp/types.ts
/**
 * MCP Server Type Definitions
 */

/**
 * Environment variables used by the MCP server
 */
export interface McpEnvironment {
  /** Platform identifier (discord, misskey) */
  MCP_PLATFORM?: string;
  /** User ID for the current context */
  MCP_USER_ID?: string;
  /** Channel ID for the current context */
  MCP_CHANNEL_ID?: string;
  /** Whether the context is a DM */
  MCP_IS_DM?: string;
  /** Username for the current user */
  MCP_USERNAME?: string;
}

/**
 * MCP Tool Result
 */
export interface McpToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * MCP Server Configuration
 */
export interface McpServerConfig {
  name: string;
  version: string;
}

/**
 * MCP Tool Definition
 */
export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}
