# COMMAND-FIRST WORKFLOW

## 🚀 Start EVERY Request with `/p`

The `/p` meta-prompt command automatically selects the best tools for your task:

```
/p analyze performance issues in my React app
/p fix the login bug in issue #123
/p refactor this code for better types
/p add dark mode to settings
```

## Why `/p`?

- **Zero Memory Load**: No need to remember tool names
- **Optimal Workflows**: Always uses the best combination of tools
- **Learning Aid**: Shows you which tools are selected and why
- **Can't Be Ignored**: Explicit command vs passive instructions

## Available Tools

**View all tools:**
- `/mcp-list` - See MCP servers (fast operations)
- `/agent-list` - See subagents (quality enforcement)

**Direct usage (optional):**
- MCP servers: `mcp__servername__method`
- Subagents: "Use the [agent-name] agent"

## The `/p` Advantage

Instead of:
- Remembering dozens of tool names
- Figuring out the right sequence
- Missing optimal approaches

Just use `/p` and get:
- Intelligent tool selection
- Proper sequencing
- Best practices enforced

## Examples of `/p` in Action

**Feature Development:**
```
/p add user authentication to the app
→ architect-advisor → MCP tools → quality agents → test-runner → auditor
```

**Bug Fixing:**
```
/p fix TypeError in user.service.ts line 45
→ architect-advisor → mcp__typescript-mcp__ → fix → test-runner → auditor
```

**Analysis:**
```
/p analyze bundle size and suggest optimizations
→ mcp__context-provider__ → mcp__typescript-mcp__ → analyst agent
```

## Remember

- **ALWAYS** start with `/p` for intelligent assistance
- The first `/p` in a session initializes MCP context
- Each `/p` returns an enhanced prompt with optimal tool usage
- Follow the enhanced prompt for best results

## Task files

Planned work needs one current file under `tasks/`, and so does unplanned
work a commit message could not adequately describe. The workflow itself —
naming, what a file accumulates, when it is deleted — is the `task-files`
skill. Load it before creating, updating, or deleting a task file.
