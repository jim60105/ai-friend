---
name: memory-save
mcp_tool: memory_save
description: |
  Save important information to persistent memory for future conversations.
  Use this to remember user preferences, important facts, or relationship details.
  Memory is append-only and cannot be deleted, only disabled.
parameters:
  type: object
  properties:
    content:
      type: string
      description: The memory content to save (plain text)
    visibility:
      type: string
      enum: [public, private]
      default: public
      description: |
        - public: visible in all contexts
        - private: only visible in DM contexts
    importance:
      type: string
      enum: [high, normal]
      default: normal
      description: |
        - high: always loaded into context
        - normal: retrieved via search
  required: [content]
---

# Memory Save Skill

This skill allows you to save important information that should persist across conversations.

## MCP Tool

This skill is exposed as an MCP tool: `memory_save`

To use via MCP, call the `memory_save` tool with the parameters described above.

## When to Use

- Remember user preferences or settings
- Store important relationship details
- Save facts that will be useful in future interactions

## Guidelines

- Keep memories concise and factual
- Use `importance: high` sparingly for critical information
- Use `visibility: private` for sensitive personal information (only in DM)

## Example

Save a user's preference:

```json
{
  "content": "User prefers to be called by nickname 'Alex'",
  "visibility": "public",
  "importance": "normal"
}
```
