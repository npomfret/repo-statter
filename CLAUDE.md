# Development Workflow
- do the task you've been asked to do **and nothing else**
- Be minimal and elegant
- do not add any superfluous code / config / fallbacks
- small commits are preferred - break a problem down and suggest next steps
- after any work, suggest next steps
- After any change, run the appropriate build and tests
- Look at nearby/associated code for patterns and techniques - reuse them where appropriate

# Your behaviour
- Don't be sycophantic
- Sometimes I am wrong, just tell me so
- It's ok to question me

# Tech Stack
- Runtime: Node.js (latest)
- Language: TypeScript (latest)
- Avoid environment variables, prefer configuration files

# Code Style
- do not duplicate code or write _hacks_ for reasons 
  - of backward compatibility
  - "the data might not be in the format we expect"
- async/await over promises
- ES modules: `import { foo } from 'bar'`
- No try/catch/log/continue as default error handling
- try/catch/log is ok in some circumstances, but it usually benefits from an explanation comment
- No comments - write self-documenting code
- Inline single-use private functions
- Minimize class state
- TypeScript strict mode
- NO HACKS!

# Testing
- automated testing is valuable - do it, lots. But...
- Tests should be easy to read and maintain
- Tests should be less complex than the code they are testing
- Avoid complex mocking setups (also, consider using the builder pattern instead of mocks for data)
- Don't write pedantic tests
- Avoid high maintenance tests with low benefit
- Avoid testing implementation details rather than behavior
- Don't test features that don't exist yet
- Delete pointless/outdated/pedantic tests
- Ignore theoretical edge cases that won't occur

# Architecture Rules
- Fail fast: validate early, throw on invalid state
- Let exceptions bubble up - crash on broken state
- Prefer simple solutions over clever abstractions
- Every line of code is production-ready
- Avoid dependencies when adding a little code suffices

# Other guidance
- Aggressively tidy, delete, refactor the code.
- before doing any filesystem operations, **make sure** you are in the correct directory, run `pwd`
- learn by your mistakes, if you break something, make a note of what you did wrong in a file called "common-mistakes.md"