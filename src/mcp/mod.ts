// src/mcp/mod.ts
/**
 * MCP (Model Context Protocol) Server Module
 *
 * This module provides an MCP server that exposes the chatbot's skills as MCP tools,
 * allowing ACP Agents (like GitHub Copilot CLI) to interact with our chatbot
 * through the standardized MCP protocol.
 *
 * Usage:
 *   deno task mcp
 *
 * Configuration:
 *   Set MCP_PLATFORM, MCP_USER_ID, MCP_CHANNEL_ID, MCP_IS_DM environment variables
 *   to specify the context for tool execution.
 */

export * from "./server.ts";
