# Lines Changed Summary Action

A GitHub Action that comments on pull requests with a lines changed summary (using GitHub's +/- style), with the ability to exclude files based on pattern matching.

This is useful when you want to get an accurate sense of the PR scope without counting generated files, lock files, or other files that don't meaningfully impact review effort.

## Features

- 📊 Posts a clean lines changed summary on PRs
- 🎯 Excludes files based on configurable patterns (e.g., `**/generated/**`, `*.lock`)
- 🔄 Updates the same comment on each run (no spam)
- 📁 Shows excluded and included files in collapsible sections
- 🔗 All filenames link directly to their diff in the PR
- ⚡ Fast and lightweight TypeScript implementation

## Usage

### Basic Example

```yaml
name: Lines Changed Summary

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  lines-changed:
    runs-on: ubuntu-latest
    steps:
      - uses: yourusername/lines-changed-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Exclude Generated Files

```yaml
- uses: yourusername/lines-changed-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    exclude-patterns: |
      **/generated/**,
      **/*.generated.ts,
      **/*.lock,
      **/dist/**
```

### Custom Comment Header

```yaml
- uses: yourusername/lines-changed-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    exclude-patterns: '**/generated/**,**/*.lock'
    comment-header: '## 📊 Code Changes (excluding generated files)'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for API access | Yes | `${{ github.token }}` |
| `exclude-patterns` | Comma-separated list of glob patterns to exclude | No | `''` |
| `comment-header` | Header text for the comment | No | `## Lines Changed Summary` |

### Pattern Matching

The `exclude-patterns` input accepts glob patterns that follow the [minimatch](https://github.com/isaacs/minimatch) syntax:

- `**/generated/**` - Exclude all files in any `generated` directory
- `**/*.generated.ts` - Exclude all files ending with `.generated.ts`
- `*.lock` - Exclude lock files in the root directory
- `**/*.lock` - Exclude lock files anywhere
- `**/dist/**` - Exclude all files in any `dist` directory

Multiple patterns can be combined with commas:
```yaml
exclude-patterns: '**/generated/**,**/*.lock,**/dist/**'
```

## Outputs

| Output | Description |
|--------|-------------|
| `added-lines` | Number of lines added (excluding filtered files) |
| `removed-lines` | Number of lines removed (excluding filtered files) |
| `total-files` | Total number of files changed |
| `excluded-files` | Number of files excluded by patterns |

### Using Outputs

```yaml
- uses: yourusername/lines-changed-action@v1
  id: lines-changed
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    exclude-patterns: '**/generated/**'

- name: Check if PR is too large
  if: steps.lines-changed.outputs.added-lines > 500
  run: echo "::warning::This PR adds more than 500 lines"
```

## Example Comment

The action will post a comment like this:

---

## Lines Changed Summary

**🟩 +342** **🟥 -128** (+214 net)

📊 **12** files included, **3** files excluded

<details>
<summary>Excluded files</summary>

The following files were excluded based on patterns: `**/generated/**`, `**/*.lock`

- [`src/generated/api.ts`](https://github.com/owner/repo/pull/123/files#diff-abc123)
- [`src/generated/types.ts`](https://github.com/owner/repo/pull/123/files#diff-def456)
- [`package-lock.json`](https://github.com/owner/repo/pull/123/files#diff-789abc)

</details>

<details>
<summary>Files included in summary</summary>

| File | Lines Added | Lines Removed |
|------|-------------|---------------|
| [`src/components/UserProfile.tsx`](https://github.com/owner/repo/pull/123/files#diff-xyz123) | +45 | -12 |
| [`src/utils/helpers.ts`](https://github.com/owner/repo/pull/123/files#diff-abc789) | +23 | -8 |
| ...

</details>

---

## Development

### Setup

```bash
pnpm install
```

### Build

```bash
pnpm run build
```

This compiles the TypeScript code and bundles it with dependencies using `@vercel/ncc`.

### Testing Locally

To test the action locally, you can use [act](https://github.com/nektos/act) or create a test repository and reference your branch:

```yaml
- uses: yourusername/lines-changed-action@your-branch-name
```

## Publishing

1. Build the action:
   ```bash
   pnpm run build
   ```

2. Commit the `dist/` folder:
   ```bash
   git add dist/
   git commit -m "Build action"
   ```

3. Tag and push:
   ```bash
   git tag -a v1 -m "Release v1"
   git push --tags
   ```

## License

MIT
