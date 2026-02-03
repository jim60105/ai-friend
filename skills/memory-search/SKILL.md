---
name: memory-search
mcp_tool: memory_search
description: |
  Search through saved memories using keywords.
  Returns relevant memories that match the search query.
parameters:
  type: object
  properties:
    query:
      type: string
      description: Search keywords to find relevant memories
    limit:
      type: integer
      default: 10
      description: Maximum number of results to return
  required: [query]
---

# Memory Search Skill

Search through persistent memories to recall past information.

## MCP Tool

This skill is exposed as an MCP tool: `memory_search`

To use via MCP, call the `memory_search` tool with the parameters described above.

## When to Use

- Need to recall user preferences
- Looking for previously discussed topics
- Checking relationship history

## Example

```json
{
  "query": "favorite color preferences",
  "limit": 5
}
```
