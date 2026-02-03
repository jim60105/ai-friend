---
name: memory-patch
mcp_tool: memory_patch
description: |
  Modify the state of an existing memory (enable/disable, change visibility/importance).
  Cannot modify the content - only metadata.
  Memories cannot be deleted, only disabled.
parameters:
  type: object
  properties:
    memory_id:
      type: string
      description: The ID of the memory to modify
    enabled:
      type: boolean
      description: Enable or disable the memory
    visibility:
      type: string
      enum: [public, private]
    importance:
      type: string
      enum: [high, normal]
  required: [memory_id]
---

# Memory Patch Skill

Modify metadata of existing memories without changing content.

## MCP Tool

This skill is exposed as an MCP tool: `memory_patch`

To use via MCP, call the `memory_patch` tool with the parameters described above.

## Capabilities

- Enable/disable memories
- Change visibility level
- Adjust importance level

## Limitations

- **Cannot modify content** - content is immutable
- **Cannot delete** - can only disable

## Example

Disable an outdated memory:

```json
{
  "memory_id": "mem_abc123",
  "enabled": false
}
```
