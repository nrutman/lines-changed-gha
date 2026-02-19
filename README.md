# Lines Changed Summary Action

A GitHub Action that comments on pull requests with a lines changed summary (using GitHub's +/- style), with configurable file groups for flexible categorization and counting.

This is useful when you want to get an accurate sense of the PR scope by categorizing files (e.g., source code, tests, generated files) and controlling which ones count toward the main metric.

## Features

- 📊 Posts a clean lines changed summary on PRs
- 📁 Configurable file groups with custom labels and glob patterns
- 🎯 Control which groups count toward the main +/- metric
- 🔄 Updates the same comment on each run (no spam)
- 📄 Shows each group in collapsible sections with file tables
- 🔗 All filenames link directly to their diff in the PR
- 📃 Handles PRs with any number of files (automatic pagination)
- ✅ Validates glob patterns and warns about common mistakes
- 🔤 Optional whitespace-only change exclusion per group (via `git diff -w`)
- ⚡ Fast and lightweight TypeScript implementation

## Usage

### Basic Example (No Groups)

Without any file groups configured, all files go into a default "Changed" group and count toward the metric:

```yaml
name: Lines Changed Summary

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  lines-changed:
    runs-on: ubuntu-latest
    steps:
      - uses: nrutman/lines-changed-gha@v3
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### With File Groups

Use file groups to categorize changes and control what counts toward the main metric:

```yaml
- uses: actions/checkout@v6  # Required when using ignore-whitespace
- uses: nrutman/lines-changed-gha@v3
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    file-groups: |
      - label: "🧪 Tests"
        patterns:
          - "**/__tests__/**"
        count: true
      - label: "⚙️ Generated"
        patterns:
          - "**/generated/**"
          - "**/dist/**"
        count: false
      - label: "📦 Lock Files"
        patterns:
          - "*-lock.*"
          - "*.lock"
        count: false
    default-group-label: "🏅 Source Code"
```

### Custom Comment Header

```yaml
- uses: nrutman/lines-changed-gha@v3
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    comment-header: '## 📊 Code Changes Summary'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for API access | Yes | `${{ github.token }}` |
| `file-groups` | YAML configuration for file groups (see below) | No | `''` |
| `default-group-label` | Label for files not matching any group pattern | No | `'Changed'` |
| `comment-header` | Custom header text prepended to the summary | No | None |

### File Groups Configuration

The `file-groups` input accepts a YAML array of group definitions. Each group has:

| Property | Description | Required | Default |
|----------|-------------|----------|---------|
| `label` | Display name for this group | Yes | - |
| `patterns` | Array of glob patterns to match files | Yes | - |
| `count` | Whether files in this group count toward the main +/- metric | No | `true` |
| `ignore-whitespace` | Exclude whitespace-only changes from line counts (requires `actions/checkout`) | No | `false` |

**Important:** Groups are processed in order. The first matching group wins—a file cannot appear in multiple groups.

> **Note:** When using `ignore-whitespace: true`, the `actions/checkout` step must run before this action so that `git diff -w` can be used. If the checkout is missing, the action falls back to GitHub API counts and logs a warning.

#### Example Configuration

```yaml
file-groups: |
  - label: "🧪 Tests"
    patterns:
      - "**/__tests__/**"
      - "**/*.test.ts"
      - "**/*.spec.ts"
    count: true

  - label: "⚙️ Generated"
    patterns:
      - "**/generated/**"
      - "**/dist/**"
    count: false

  - label: "📄 Documentation"
    patterns:
      - "**/*.md"
      - "docs/**"
    count: false
    ignore-whitespace: true
```

Files not matching any group pattern will go into the default group (configurable via `default-group-label`, defaults to "Changed"). The default group always counts toward the main metric and is displayed first in the comment.

### Pattern Matching

Patterns follow the [minimatch](https://github.com/isaacs/minimatch) syntax:

- `**/generated/**` - Match all files in any `generated` directory
- `**/*.generated.ts` - Match all files ending with `.generated.ts`
- `*.lock` - Match lock files in the root directory
- `**/*.lock` - Match lock files anywhere
- `src/**/*.ts` - Match TypeScript files in the `src` directory tree
- `*-lock.*` - Match files like `package-lock.json`, `pnpm-lock.yaml`

**Pattern Validation:** The action validates your glob patterns and warns about common mistakes:
- Patterns starting with `/` (should be relative)
- Patterns using backslashes instead of forward slashes
- Invalid glob syntax

## Outputs

| Output | Description |
|--------|-------------|
| `added-lines` | Number of lines added (from groups with `count: true`) |
| `removed-lines` | Number of lines removed (from groups with `count: true`) |
| `uncounted-added-lines` | Number of lines added (from groups with `count: false`) |
| `uncounted-removed-lines` | Number of lines removed (from groups with `count: false`) |
| `total-files` | Total number of files changed |

### Using Outputs

```yaml
- uses: nrutman/lines-changed-gha@v3
  id: lines-changed
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    file-groups: |
      - label: "Generated"
        patterns:
          - "**/generated/**"
        count: false

- name: Check if PR is too large
  if: steps.lines-changed.outputs.added-lines > 500
  run: echo "::warning::This PR adds more than 500 lines of non-generated code"
```

## Example Comment

The action will post a comment like this:

---

## 🟩🟩🟩🟥🟥 **+342** / **-128**

<details>
<summary>🏅 Source Code (8 files, 60% of changes)</summary>

| File | Lines Added | Lines Removed |
|------|-------------|---------------|
| [`src/components/UserProfile.tsx`](https://github.com/owner/repo/pull/123/files#diff-xyz123) | +145 | -52 |
| [`src/utils/helpers.ts`](https://github.com/owner/repo/pull/123/files#diff-abc789) | +123 | -48 |
| ...

</details>

<details>
<summary>🧪 Tests (5 files, 25% of changes)</summary>

Patterns: `**/__tests__/**`

| File | Lines Added | Lines Removed |
|------|-------------|---------------|
| [`src/__tests__/UserProfile.test.tsx`](https://github.com/owner/repo/pull/123/files#diff-test123) | +50 | -15 |
| ...

</details>

<details>
<summary>⚙️ Generated (3 files, 15% of changes)*</summary>

Patterns: `**/dist/**`, `pnpm-lock.yaml`

| File | Lines Added | Lines Removed |
|------|-------------|---------------|
| [`dist/index.js`](https://github.com/owner/repo/pull/123/files#diff-abc123) | +50 | -5 |
| ...

</details>

---
\* *Not counted toward the main +/- metric*

*Generated by [Lines Changed](https://github.com/nrutman/lines-changed-gha) GitHub Action against [`a1b2c3d`](https://github.com/owner/repo/commit/a1b2c3d)*

---

## Migration from v2

v3 introduces a breaking change by replacing the `ignore-patterns` input with a more flexible file groups system.

### Before (v2)

```yaml
- uses: nrutman/lines-changed-gha@v2
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    ignore-patterns: '**/generated/**,**/*.lock,**/dist/**'
```

### After (v3)

```yaml
- uses: nrutman/lines-changed-gha@v3
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    file-groups: |
      - label: "Ignored"
        patterns:
          - "**/generated/**"
          - "**/*.lock"
          - "**/dist/**"
        count: false
    default-group-label: "Changed"
```

### Key Differences

| v2 | v3 |
|----|-----|
| `ignore-patterns` (comma-separated) | `file-groups` (YAML array) |
| Two categories: Changed/Ignored | Unlimited custom groups |
| `ignored-files` output | `uncounted-added-lines`, `uncounted-removed-lines` outputs |
| Fixed "Changed" and "Ignored" labels | Custom labels per group |

## Development

> **⚠️ Important:** This action requires the `dist/` folder to be committed to the repository. GitHub Actions run the pre-built code directly and do not build the action at runtime.

### Setup

```bash
pnpm install
```

#### Configure Git Hooks (Recommended)

Set up automatic dependency installation for all git operations:

```bash
git config core.hooksPath .githooks
```

This configures three hooks that run `pnpm install` when dependencies change:

**Git Hooks Included:**
- **`post-checkout`** - After `git checkout` or `git switch`
- **`post-merge`** - After `git merge` or `git pull`
- **`post-rewrite`** - After `git rebase`

All hooks are smart: they only run `pnpm install` if `package.json` or `pnpm-lock.yaml` actually changed, preventing unnecessary installations.

### Build

```bash
pnpm build
```

This compiles the TypeScript code and bundles it with dependencies using `esbuild`. Always commit the `dist/` folder after building.

### Testing

```bash
pnpm test           # Run tests once
pnpm test:watch     # Run tests in watch mode
```

### Full Check

```bash
pnpm check          # Type-check, lint, format, test, and build
```

### Ensuring Build Files Are Always Up To Date

The CI workflow includes a dedicated job called **"Verify Build Files Up To Date"** that checks if the committed `dist/` files match the source code. This prevents merging changes when build files are outdated.

#### Enable Branch Protection (Recommended)

To **enforce** that build files are always up to date:

1. Go to your repository **Settings** → **Branches**
2. Add a branch protection rule for `main`
3. Enable **"Require status checks to pass before merging"**
4. Select the following required checks:
   - ✅ **Test, Lint, and Type Check**
   - ✅ **Verify Build Files Up To Date**

This will prevent merging any PR where the build files are out of date.

### Testing Locally

To test the action locally, you can use [act](https://github.com/nektos/act) or create a test repository and reference your branch:

```yaml
- uses: nrutman/lines-changed-gha@your-branch-name
```

## License

MIT
