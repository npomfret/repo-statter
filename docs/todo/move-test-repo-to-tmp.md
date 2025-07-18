# Plan: Move test-repo creation to system temp folder

## Objective

Currently, the test repository is created within the project's working directory, causing clutter. This plan outlines the steps to move the test repository creation to the system's temporary folder.

## Current Analysis

- Test repo is created in project root as `test-repo` directory
- Referenced in:
  - `scripts/create-test-repo.sh` (creates it)
  - `scripts/run-tests.sh` (uses and cleans it up)
  - `src/git/parser.test.ts` (hardcoded path for integration test)
  - Documentation files (AI_AGENT.md, CLAUDE.md)
- CLI handler already accepts repo path as argument, no changes needed there
- Package.json scripts already use arguments, no changes needed

## Detailed Implementation Plan

### Step 1: Update `scripts/create-test-repo.sh`

**Changes needed:**
1. Use `mktemp -d` to create a unique temporary directory
2. Store the temp path in a variable and echo it at the end for other scripts to capture
3. Add trap for cleanup on script exit (optional - may want to keep for debugging)

**Implementation approach:**
```bash
# Replace line 8
REPO_DIR=$(mktemp -d "${TMPDIR:-/tmp}/repo-statter-test-repo.XXXXXX")

# At the end, output the path
echo "TEST_REPO_PATH=$REPO_DIR"
```

### Step 2: Update `scripts/run-tests.sh`

**Changes needed:**
1. Capture the temp directory path from create-test-repo.sh output
2. Use that path in the npm start command
3. Update cleanup to use the captured path

**Implementation approach:**
- Parse the output from create-test-repo.sh to get the TEST_REPO_PATH
- Use that path throughout the script

### Step 3: Update `src/git/parser.test.ts`

**Changes needed:**
1. Update line 247 which has hardcoded `path.join(process.cwd(), 'test-repo')`
2. Either make it configurable via environment variable or skip this test if test-repo doesn't exist

**Implementation approach:**
- Use environment variable TEST_REPO_PATH if available
- Otherwise skip the test with proper message

### Step 4: Consider Additional Improvements

1. **Output Path Management**: Since multiple scripts need to know the test repo path, consider:
   - Writing path to a temp file that other scripts can read
   - Or using environment variable consistently

2. **Cleanup Strategy**: 
   - Keep current manual cleanup in run-tests.sh
   - Don't add trap in create-test-repo.sh to allow debugging failed tests

3. **Documentation Updates**: Update references in AI_AGENT.md and CLAUDE.md if needed

## Benefits

1. No more test-repo cluttering the project directory
2. Automatic OS-level cleanup of temp directories
3. Multiple test runs won't conflict (unique temp dirs)
4. Better separation of test artifacts from source code

## Risks & Mitigation

1. **Risk**: Temp directory might have different permissions
   - **Mitigation**: mktemp creates with safe permissions by default

2. **Risk**: Integration test might fail if path not available
   - **Mitigation**: Make test conditional or configurable

3. **Risk**: Harder to debug failed tests (temp dir gone)
   - **Mitigation**: Keep manual cleanup approach, add debug flag if needed
