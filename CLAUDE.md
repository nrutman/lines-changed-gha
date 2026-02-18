# Claude Development Guide

**For detailed documentation, setup instructions, and usage examples, see [README.md](./README.md).**

This file contains Claude-specific workflow requirements for this GitHub Action project.

---

## 🚫 NEVER Use Git Commands

**Claude should NEVER run git commands.** This includes:
- `git commit`
- `git add`
- `git push`
- `git rebase`
- Any other git commands that modify the repository

Only use `git status` for verification purposes. The user will handle all git operations.

---

## ⚠️ CRITICAL: Before Completing Any Task

**YOU MUST complete these steps before marking any task as done:**

### 1. Run Full CI Pipeline
```bash
pnpm run ci
```
All checks must pass: type-check, lint, format, tests, build.

### 2. Verify Build is Up To Date
```bash
git status --porcelain dist/
```
**This MUST return empty output.** If it shows changes, run `pnpm run build` and check again.

### 3. Why This Matters
- GitHub Actions run pre-built code from `dist/` - they don't build at runtime
- The CI job "Verify Build Files Up To Date" will fail if `dist/` is stale
- Both source and `dist/` must be kept in sync (user will commit both together)

---

## Quick Commands

```bash
# Full CI (run before completing tasks)
pnpm run ci

# Development
pnpm run test:watch    # Tests in watch mode
pnpm run build         # Build action

# Individual checks
pnpm run type-check
pnpm run lint
pnpm run format
pnpm run test
```

---

## Workflow: Making Changes

1. Edit source files in `src/`
2. Run tests: `pnpm run test`
3. Build: `pnpm run build`
4. **Update documentation:** Ensure README.md and other markdown files reflect any UI, API, or behavior changes
5. **Run CI: `pnpm run ci`**
6. **Verify dist: `git status --porcelain dist/`** (must be empty)
7. Inform user that changes are ready (user will commit)

---

## 📝 Documentation Requirements

**ALWAYS update documentation when making changes:**

- If you modify the comment UI format, update the example in README.md
- If you change action inputs/outputs, update the tables in README.md
- If you add/remove features, update the Features section
- If you change behavior, update any relevant examples or instructions

**Key markdown files to check:**
- `README.md` - Main documentation with usage examples
- `CLAUDE.md` - This file (development workflow)
- `action.yml` - Action metadata (inputs, outputs, description)

---

## Project-Specific Constraints

- **Build system:** esbuild (see `build.mjs`)
- **Test runner:** Vitest (not Jest)
- **Key files:** `src/main.ts`, `action.yml`, `dist/index.js` (committed)
- **Repository:** https://github.com/nrutman/lines-changed-gha
- **Node version:** 20

---

## Common Issues

### "Verify Build Files Up To Date" CI failure
**Cause:** Source changed but `dist/` not rebuilt.

**Fix:**
```bash
pnpm run build
# Then verify: git status --porcelain dist/ (should be empty)
# Inform user that dist/ needs to be committed
```

### Need to debug
```bash
pnpm run test:watch     # Interactive test debugging
pnpm run type-check     # Check types only
```

---

**See [README.md](./README.md) for:**
- Setup instructions
- Git hooks configuration
- Usage examples
- Publishing workflow
- Architecture details
