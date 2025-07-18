# Plan: Move test-repo creation to system temp folder

## Objective

Currently, the test repository is created within the project's working directory, causing clutter. This plan outlines the steps to move the test repository creation to the system's temporary folder.

## Steps

1.  **Modify `scripts/create-test-repo.sh`:**
    *   Update the script to use the system's temporary directory. This can be achieved by using the `$TMPDIR` environment variable in bash, which provides a standard way to get the temporary directory path.
    *   The script should create a new directory inside the temp folder, for example: `$TMPDIR/repo-statter-test-repo`.

2.  **Update `package.json` scripts:**
    *   The `npm run analyse` script and any other scripts that rely on the test repo will need to be updated to point to the new location in the temp directory.
    *   This might involve passing the path of the test repo as an argument to the scripts.

3.  **Update CLI handler:**
    *   The CLI handler in `src/cli/handler.ts` might need to be updated to accept the path to the test repo as an argument.

4.  **Cleanup:**
    *   The `create-test-repo.sh` script should include a cleanup mechanism to remove the test repository from the temp folder after the tests have been run. This can be achieved by adding a `trap` command at the beginning of the script to ensure that the temporary directory is removed on script exit.
