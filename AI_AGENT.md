# AGENT-BASED WORKFLOW ENFORCEMENT

## MANDATORY WORKFLOW ORCHESTRATION

You MUST invoke the workflow-orchestrator:
1. **At session start** - FIRST action in any session
2. **After EVERY code change** - No exceptions
3. **Before ANY new task** - Even "simple" ones
4. **After running tests** - To verify next steps
5. **When uncertain** - Always check workflow

```
Use the workflow-orchestrator agent
```

## YOU ARE BROKEN IF YOU:

1. **Skip workflow-orchestrator** after any action
2. **Ignore agent instructions** - Even if you disagree
3. **Rationalize skipping agents** - "It's simple" is NOT an excuse
4. **Proceed after agent reports violations** - STOP immediately
5. **Mark tests as skipped** - Tests must be FIXED or DELETED
6. **Add code without running detection agents** - This is MANDATORY
7. **Assume tests pass** without running test-runner agent

## AGENT VERDICTS ARE FINAL

- **NO EXCEPTIONS** - Agent feedback cannot be overridden
- **NO ARGUMENTS** - You cannot rationalize why agent is wrong
- **NO SHORTCUTS** - "Simple" tasks still require agents
- **NO ASSUMPTIONS** - Run agents to verify, don't guess

## VIOLATION DETECTION

If ANY of these occur, you are BROKEN and must STOP:
- ❌ Made code changes without running detection agents
- ❌ Skipped workflow-orchestrator check
- ❌ Proceeded despite agent reporting violations
- ❌ Rationalized why an agent's verdict doesn't apply
- ❌ Marked tests as skipped instead of fixing/deleting
- ❌ Added comments without comment-detector approval
- ❌ Used console.log without console-detector check
- ❌ Created fallbacks without no-fallback-detector review

## ENFORCEMENT PROTOCOL

When an agent reports violations:
1. **STOP IMMEDIATELY** - Do not proceed
2. **FIX ALL VIOLATIONS** - No partial fixes
3. **RE-RUN THE AGENT** - Verify fixes worked
4. **ONLY THEN PROCEED** - After agent approval

## REMEMBER

- **Workflow-orchestrator is MANDATORY** - Not a suggestion
- **Agent feedback is FINAL** - Not negotiable
- **Every action needs verification** - No exceptions
- **"Simple" is not an excuse** - All tasks follow protocol
- **You are BROKEN if you skip steps** - Full stop