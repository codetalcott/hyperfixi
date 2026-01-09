# GitHub Configuration

This directory contains GitHub-specific configuration files for the HyperFixi repository.

## Directory Structure

```
.github/
├── CODEOWNERS                  # Code ownership definitions
├── rulesets/                   # Branch protection rulesets
│   ├── README.md              # Ruleset documentation
│   └── branch-protection.json # Main branch protection config
├── workflows/                  # GitHub Actions workflows
│   ├── ci.yml                 # Main CI/CD pipeline
│   └── patterns-reference.yml # Pattern reference CI
├── copilot-instructions.md    # GitHub Copilot guidelines
└── README.md                  # This file
```

## Key Files

### CODEOWNERS

Defines code ownership for automatic reviewer assignment. When a PR modifies files matching a pattern, the designated owners are automatically requested for review.

**Key protected paths:**
- Core packages (`/packages/core/`, `/packages/semantic/`, `/packages/i18n/`)
- Build configurations (`package.json`, `tsconfig*.json`, etc.)
- GitHub workflows (`.github/`)
- Documentation (`README.md`, `CONTRIBUTING.md`)

See the file for complete ownership mappings.

### rulesets/

Contains branch protection ruleset configurations:

- **branch-protection.json**: Protects main/master branches with:
  - Required approving reviews (1+ with code owner approval)
  - Required CI status checks (build, test, lint, typecheck)
  - Prevention of force pushes and deletions
  - Linear history requirement
  - Signed commit requirement

**Note:** These configurations are reference files. Enable them through GitHub Settings → Rules → Rulesets.

### workflows/

GitHub Actions CI/CD pipelines:

- **ci.yml**: Main CI pipeline that runs on all PRs and pushes to main
  - Lint, typecheck, build, test, and integration test jobs
  - Runs in parallel for efficiency
  - Required for branch protection
  
- **patterns-reference.yml**: Specialized CI for patterns-reference package
  - Only runs when patterns-reference files change
  - Includes translation validation

## Quick Links

### For Contributors
- 🚀 [Quick Start Guide](../docs/REPOSITORY_RULESET_QUICKSTART.md)
- 📊 [Protection Flow Diagram](../docs/REPOSITORY_PROTECTION_FLOW.md)
- 📝 [Contributing Guidelines](../CONTRIBUTING.md)

### For Maintainers
- 📚 [Complete Ruleset Documentation](../docs/REPOSITORY_RULESET.md)
- 🔒 [Security Policy](../SECURITY.md)
- ⚙️ [Ruleset Configuration Guide](./rulesets/README.md)

## CI/CD Pipeline

The main CI pipeline (ci.yml) performs the following checks:

1. **Lint** - ESLint code quality checks
2. **Typecheck** - TypeScript type validation
3. **Build** - Compile all workspace packages
4. **Test** - Run unit and functional tests
5. **Integration Test** - Test core package integrations

All checks must pass for a PR to be mergeable.

### Running CI Checks Locally

```bash
# Run individual checks
npm run lint
npm run typecheck
npm run build
npm run test
npm run test:integration

# Or run all at once (in sequence)
npm run lint && npm run typecheck && npm run build && npm run test
```

## Branch Protection

Protected branches (main/master) require:

✅ **Reviews**
- At least 1 approving review
- Code owner approval for owned files
- All review threads resolved

✅ **CI Checks**
- All status checks pass (build, test, lint, typecheck)
- Branch up to date with base

✅ **History**
- No force pushes
- No branch deletions
- Linear history (rebase only)
- Signed commits (GPG/S/MIME)

## Code Ownership

CODEOWNERS enables:
- **Automatic reviewer assignment** based on changed files
- **Required reviews** from code owners for protected paths
- **Clear accountability** for different parts of the codebase

To update code ownership:
1. Edit `.github/CODEOWNERS`
2. Use pattern syntax: `<path-pattern> @username-or-team`
3. More specific patterns override general ones

## Commit Signing

All commits to protected branches must be signed. To set up:

```bash
# Generate GPG key
gpg --full-generate-key

# Configure Git
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true

# Export key and add to GitHub
gpg --armor --export YOUR_KEY_ID
# Add at: GitHub Settings → SSH and GPG keys → New GPG key
```

## Troubleshooting

### CI Checks Failing
- View detailed logs in the Actions tab
- Run checks locally to debug
- Ensure branch is up to date with main

### Can't Merge PR
- Check all required reviews are approved
- Verify all CI checks passed
- Resolve all review comment threads
- Ensure commits are signed
- Update branch with main if needed

### Code Owner Not Auto-Assigned
- Check CODEOWNERS file syntax
- Verify username is correct
- Ensure user has access to repository
- Check if path pattern matches changed files

## Best Practices

### For Contributors
1. Always work on feature branches, never directly on main
2. Sign all your commits
3. Run CI checks locally before pushing
4. Keep PRs focused and small
5. Respond to review feedback promptly
6. Use rebase to keep history clean

### For Maintainers
1. Review CODEOWNERS regularly to keep ownership current
2. Update CI workflows when adding new checks
3. Test ruleset changes in a non-protected branch first
4. Document significant protection rule changes
5. Monitor CI performance and optimize as needed
6. Keep GitHub Actions versions updated

## Resources

- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [GitHub Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets)
- [CODEOWNERS Syntax](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Commit Signing](https://docs.github.com/en/authentication/managing-commit-signature-verification)

## Support

For questions or issues:
- Check the documentation links above
- Review [CONTRIBUTING.md](../CONTRIBUTING.md)
- Open an issue in the repository
- Contact the maintainers

---

Last updated: 2026-01-09
