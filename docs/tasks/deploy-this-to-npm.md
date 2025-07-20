# Deploy to NPM: A Step-by-Step Guide

This guide will walk you through the process of publishing a Node.js package to the npm registry for the first time.

## Prerequisites

1.  **Node.js and npm:** You must have Node.js installed, which includes the npm command-line interface (CLI). You can download it from [nodejs.org](https://nodejs.org/).
2.  **npm Account:** You need a free account on the npm website. If you don't have one, sign up at [npmjs.com/signup](https://www.npmjs.com/signup).

---

## Step 1: Log in to Your npm Account

Before you can publish, you need to log in to your npm account from your terminal.

```bash
npm login
```

Enter your username, password, and the email address associated with your account.

---

## Step 2: Prepare Your `package.json`

The `package.json` file is the heart of your project. It contains metadata that npm uses to identify your project and handle its dependencies. Here are the most important fields to check before publishing:

-   **`name`**: The name of your package. This must be unique on the npm registry. If the name is taken, you will get an error when you try to publish.
-   **`version`**: The current version of your package. This must follow [Semantic Versioning (SemVer)](https://semver.org/). For your first release, `1.0.0` is a good choice. You **must** increment this version every time you publish an update.
-   **`description`**: A short sentence describing what your package does. This helps users find your package.
-   **`main`**: The entry point to your application. This should point to the main JavaScript file that will be executed when someone `require()`s your package (e.g., `dist/index.js`).
-   **`types`**: If you are using TypeScript, this field points to your main type declaration file (e.g., `dist/index.d.ts`).
-   **`files`**: An array of file and directory patterns that should be included in the published package. This is **very important** to prevent publishing source files, tests, or other development-only assets.
    -   Example: ` "files": ["dist", "README.md"] `
-   **`repository`**: An object pointing to your code repository.
    -   Example: `"repository": { "type": "git", "url": "https://github.com/your-username/your-repo.git" }`
-   **`keywords`**: An array of strings that act as tags to help users discover your package.
-   **`license`**: Specify a license for your code (e.g., "MIT", "ISC"). This is important for legal reasons.

---

## Step 3: Build Your Project

If your project uses TypeScript, or needs any other form of transpilation or bundling, make sure to run your build script to generate the final JavaScript files in your output directory (commonly `dist` or `build`).

```bash
# This command depends on your project setup
npm run build
```

---

## Step 4: Perform a Dry Run (Recommended)

To avoid mistakes, you can perform a "dry run". This command simulates the publishing process and shows you exactly which files will be uploaded to the registry without actually publishing them.

```bash
npm publish --dry-run
```

Review the output carefully to ensure only the intended files are included. If you see unexpected files, adjust the `files` array in your `package.json`.

---

## Step 5: Publish the Package

Once you are confident that everything is set up correctly, run the publish command:

```bash
npm publish
```

If your package name is not taken and there are no other errors, your package will be uploaded to the npm registry.

*Note: By default, packages are public. If you are part of an organization or have a paid account, you can publish private packages using the `--access` flag.*

---

## Step 6: Verify Your Package

Go to `https://www.npmjs.com/package/<your-package-name>` to see your published package. Congratulations!

---

## How to Update Your Package

To release a new version of your package:

1.  **Make your code changes.**
2.  **Run your tests and build script.**
3.  **Increment the version number.** You can do this manually in `package.json` or use the `npm version` command, which also creates a git tag.
    ```bash
    # Examples of using the npm version command
    npm version patch   # for bugfixes (e.g., 1.0.0 -> 1.0.1)
    npm version minor   # for new features (e.g., 1.0.1 -> 1.1.0)
    npm version major   # for breaking changes (e.g., 1.1.0 -> 2.0.0)
    ```
4.  **Publish again.**
    ```bash
    npm publish
    ```
5.  **Push your git tags (if you used `npm version`).**
    ```bash
    git push --tags
    ```
