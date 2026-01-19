# Git Hooks - LokaScript

## Current Configuration

### Pre-Commit Hook

**Status**: ✅ Active (via husky + lint-staged)

**What runs:**

- **Prettier formatting** on staged TypeScript and config files
- Automatically formats code before commit
- Fast (~1-2 seconds)

**Configuration:**

```json
{
  "lint-staged": {
    "packages/*/src/**/*.ts": ["prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

**How it works:**

1. You run `git commit`
2. Husky intercepts the commit
3. Lint-staged runs prettier on staged files
4. Formatted files are automatically added back to the commit
5. Commit proceeds

### What's NOT in Pre-Commit

These validation steps run separately:

| Check                | When It Runs     | Why Not Pre-Commit                  |
| -------------------- | ---------------- | ----------------------------------- |
| Type checking        | Manual / CI      | Too slow (~30s) for every commit    |
| Tests                | Manual / CI      | Too slow (~1-2min) for every commit |
| Build                | Manual / CI      | Too slow (~30s) for every commit    |
| Version validation   | Pre-publish only | Only needed before release          |
| Changelog validation | Pre-publish only | Only needed before release          |

## Recommended Workflow

### During Development (Fast)

```bash
# Make changes
# Commit (pre-commit auto-formats)
git commit -m "feat: add new feature"
# ✅ Prettier runs automatically
```

### Before Pushing (Thorough)

```bash
# Validate everything before push
npm run typecheck                  # ~30s
npm test                           # ~1-2min

# Or combined
npm run rebuild:fast               # Build + typecheck + validate
```

### Before Publishing (Complete)

```bash
# Full validation (runs automatically)
npm run prepublishOnly
# Runs: version:validate + changelog:validate + build + test
```

## Optional: Stricter Pre-Commit Checks

If you want to add more checks to pre-commit, here are options:

### Option 1: Add Type Checking (Recommended for Small Commits)

```json
{
  "lint-staged": {
    "packages/*/src/**/*.ts": ["prettier --write", "bash -c 'tsc --noEmit'"]
  }
}
```

⚠️ **Trade-off**: Slower commits (~30s), but catches type errors earlier

### Option 2: Add Linting

```json
{
  "lint-staged": {
    "packages/*/src/**/*.ts": ["prettier --write", "eslint --fix"]
  }
}
```

⚠️ **Trade-off**: Slower commits (~10s), auto-fixes lint issues

### Option 3: Build Changed Packages

```json
{
  "lint-staged": {
    "packages/*/src/**/*.ts": [
      "prettier --write",
      "bash -c 'npm run build --workspace=$(dirname $(dirname $0))'"
    ]
  }
}
```

⚠️ **Trade-off**: Much slower commits (~30s+), ensures builds pass

### Option 4: Run Tests on Changed Files

```json
{
  "lint-staged": {
    "packages/*/src/**/*.ts": ["prettier --write", "bash -c 'npm test -- --changed'"]
  }
}
```

⚠️ **Trade-off**: Slower commits (variable), catches test failures

## Pre-Push Hook (Alternative)

For stricter validation without slowing down commits, use a **pre-push** hook instead:

```bash
# .husky/pre-push
npm run typecheck || exit 1
npm run changelog:validate || exit 1
```

This runs before `git push`, blocking pushes that fail validation.

**Advantages:**

- Commits stay fast
- Validation still enforced before sharing code
- Can make multiple commits, then validate once before push

## Bypass Hooks (Emergency)

If you need to bypass hooks temporarily:

```bash
# Skip pre-commit hook
git commit --no-verify -m "emergency fix"

# Skip pre-push hook
git push --no-verify
```

⚠️ **Use sparingly** - bypassing hooks defeats their purpose!

## Current Hook Files

```
.husky/
├── _/           # Husky internal files
└── pre-commit   # Runs: npx lint-staged
```

To add more hooks:

```bash
npx husky add .husky/pre-push "npm run typecheck"
```

## CI/CD vs Local Hooks

**Philosophy**: Keep local hooks fast, run thorough checks in CI/CD

| Check                | Local Hook    | CI/CD         |
| -------------------- | ------------- | ------------- |
| Formatting           | ✅ Pre-commit | ✅ Always     |
| Type checking        | ⚠️ Optional   | ✅ Always     |
| Linting              | ⚠️ Optional   | ✅ Always     |
| Unit tests           | ❌ Too slow   | ✅ Always     |
| Integration tests    | ❌ Too slow   | ✅ Always     |
| Build verification   | ❌ Too slow   | ✅ Always     |
| Version validation   | ❌ Not needed | ✅ On release |
| Changelog validation | ❌ Not needed | ✅ On release |

## Disabling Hooks

If you prefer no pre-commit hooks:

```bash
# Remove pre-commit hook
rm .husky/pre-commit

# Or disable husky entirely
npm pkg delete scripts.prepare
```

## Recommendations

### For Solo Development

Current setup is fine:

- Fast commits
- Manual validation before push
- Full validation before publish

### For Team Development

Consider adding **pre-push** hook:

```bash
# .husky/pre-push
#!/bin/sh
echo "Running pre-push validation..."
npm run typecheck || exit 1
npm run changelog:validate || exit 1
echo "✅ Pre-push checks passed"
```

This ensures:

- Commits stay fast
- No one pushes broken code
- Validation is enforced automatically

### For Strict Projects

Add to **pre-commit**:

```json
{
  "lint-staged": {
    "packages/*/src/**/*.ts": ["prettier --write", "eslint --fix", "bash -c 'npm run typecheck'"]
  }
}
```

⚠️ Warning: This will make commits slower but catch issues earlier.

## Summary

**Current state:**

- ✅ Pre-commit: Prettier auto-formatting (fast)
- ❌ No pre-push validation
- ✅ Pre-publish: Full validation via `prepublishOnly`

**Works well for:**

- Fast iteration
- Solo development
- Trust in manual validation

**Consider adding if:**

- Working with a team
- Want automatic validation before push
- Prefer catching errors earlier

---

**See also:**

- [MAINTENANCE.md](MAINTENANCE.md) - Full maintenance guide
- [REBUILD_WORKFLOW.md](REBUILD_WORKFLOW.md) - Build procedures
- [PRE_PUBLICATION_REPORT.md](PRE_PUBLICATION_REPORT.md) - Publication checks
