---
name: fetch-context
mcp_tool: fetch_context
description: |
  Fetch additional context from the platform when needed.
  Use this to get more message history or search for related conversations.
  NOTE: In MCP mode, only `user_info` type is fully supported.
parameters:
  type: object
  properties:
    type:
      type: string
      enum: [recent_messages, search_messages, user_info]
      description: Type of context to fetch
    query:
      type: string
      description: Search query (for search_messages type)
    limit:
      type: integer
      default: 20
      description: Maximum items to return
  required: [type]
---

# Fetch Context Skill

Retrieve additional context from the platform to better understand the conversation.

## MCP Tool

This skill is exposed as an MCP tool: `fetch_context`

To use via MCP, call the `fetch_context` tool with the parameters described above.

> [!NOTE]
> In MCP mode, only `user_info` type is fully supported.
> `recent_messages` and `search_messages` require a real platform connection.

## Available Types

- `recent_messages`: Get more recent message history
- `search_messages`: Search for messages by keyword
- `user_info`: Get information about the current user

## When to Use

- Initial context is insufficient
- Need to reference older conversations
- Looking for specific past discussions

## Example

```json
{
  "type": "search_messages",
  "query": "project deadline",
  "limit": 10
}
```
