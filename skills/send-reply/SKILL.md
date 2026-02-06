---
name: send-reply
description: Send the final reply message to the user on the platform. This is the ONLY way to communicate with the user externally.
allowed-tools: Bash
---

# Send Reply Skill

Send your final response to the user. This is the gateway to external communication.

## Usage

```bash
${HOME}/.agents/skills/send-reply/scripts/send-reply.ts \
  --session-id "$SESSION_ID" \
  --message "Your reply message here"
```

## Critical Rules

1. **One reply only**: You can only send ONE reply per interaction. You MUST send exactly one reply.
2. **This is the ONLY external output**: All other processing remains internal
3. **Timeout**: The script won't run for more than 30 seconds. If it hangs, do stop_bash and retry ONCE. If it fails again, return an error message in JSON format.
