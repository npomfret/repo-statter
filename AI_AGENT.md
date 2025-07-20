# 🛑 MANDATORY: READ THIS FIRST - DO NOT SKIP

STOP! DO NOT WRITE ANY CODE until you have completed ALL items in this document.

## Required Pre-Work Checklist

Before making **ANY** code changes, you MUST:

- [ ] Read [engineering.md](directives/engineering.md) completely
- [ ] Read [code-style.md](directives/code-style.md) completely
- [ ] Read [logging.md](directives/logging.md) completely
- [ ] Read [testing.md](directives/testing.md) completely
- [ ] State: "I have read all directive files and understand I cannot make code changes until instructed."

## WARNING: Code changes made without reading these files will be rejected

Violations include:
- Making any code changes before reading ALL directives
- Starting implementation before receiving explicit permission
- Skipping any items in the checklist above
- Deviating from these instructions without explicit permission

## Required Confirmation

After reading all directives, you MUST explicitly state: 
"I have read all directive files and understand I cannot make code changes until instructed."

Do NOT proceed with any code changes until you receive explicit permission to do so.

# Development Workflow
- After any change, run the appropriate build and tests
  - Use `npm run test` for running tests
  - Use `npm run typecheck` for type checking
  - To test changes with a test repository:
    - Run `./scripts/create-test-repo.sh` which creates a test repo in a temp directory
    - The script outputs the path, use it like: `npm run analyse /path/to/temp/repo -- --output test-repo.html`
    - Or use `./scripts/run-tests.sh` which handles creation, analysis, and cleanup automatically
  - Test repos are now created in the system temp directory, not in the project root

# Tech Stack
- Runtime: Node.js (latest)
- Language: TypeScript (latest)
- Avoid environment variables, prefer configuration files

# Code Style
- async/await over promises
- ES modules: `import { foo } from 'bar'`


# ⚠️ FINAL REMINDER
NO CODE CHANGES until explicitly instructed to proceed. You MUST wait for permission after creating your plan.
