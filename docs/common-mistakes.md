# Common Mistakes

## Using watch mode for tests (RESOLVED)

**Problem**: `npm run test` was running vitest in watch mode, which waits for file changes and doesn't exit.

**Solution**: Simplified to single `npm run test` command that runs once and exits.

**Resolution**: Removed `test:run` script, made `test` run `vitest run` by default.

## Debugging in browser

* Don't log objects or DOM elements.  They are difficult to copy.  Use JSON.stringify() and other formatting techniques.