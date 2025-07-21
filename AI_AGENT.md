Before making **ANY** code changes, you MUST read these files:

- directives/engineering.md
- directives/code-style.md
- directives/logging.md
- directives/testing.md

Summarise what you have learned form them.

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
