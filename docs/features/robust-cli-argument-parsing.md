# Robust CLI Argument Parsing

## Idea
Implement a more user-friendly and flexible command-line interface using a dedicated CLI library, moving beyond basic `process.argv` parsing.

## Implementation Suggestions

### 1. Choose a CLI Library
- **Yargs:** A popular choice for Node.js, providing powerful parsing, command definitions, and help generation.
- **Commander.js:** Another widely used library, simpler for basic CLIs, but still very capable.
- **`arg`:** A minimal, unopinionated argument parser if more control is desired.

### 2. Refactor `src/cli/handler.ts`
- **Replace `process.argv` logic:** Remove the manual parsing of `process.argv` and replace it with the chosen library's API.
- **Define Commands:** Clearly define commands (e.g., `analyse`, `build`, `compare`) and their respective options/arguments.
- **Validation:** Leverage the library's built-in validation for argument types, required arguments, and default values.

### 3. Enhance CLI Features
- **Help Messages:** Automatically generate comprehensive help messages (`--help`) for commands and options.
- **Aliases:** Support short aliases for common options (e.g., `-r` for `--repo`).
- **Default Values:** Easily set default values for options.
- **Subcommands:** Organize complex functionality into subcommands (e.g., `repo-statter analyse`, `repo-statter config`).
- **Error Handling:** Provide more informative error messages for invalid arguments.

### 4. Integration with `package.json` scripts
- Update `package.json` scripts to use the new CLI structure (e.g., `"analyse": "tsx src/index.ts analyse"`).

## Impact
- Improves the developer experience for users of the CLI.
- Makes the tool easier to use and understand.
- Reduces the likelihood of user errors due to incorrect arguments.
- Provides a more professional and scalable foundation for future CLI enhancements.
