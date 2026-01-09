# Repository Protection Ruleset

This document describes the repository protection rules configured for the HyperFixi repository to ensure code quality, security, and collaborative development practices.

## Overview

The HyperFixi repository uses GitHub's branch protection rules and rulesets to protect critical branches and enforce quality standards. These rules help maintain code quality, prevent accidental deletions, and ensure proper review processes.

## Branch Protection Rules

### Main Branch Protection

The `main` (or `master`) branch is protected with the following rules:

#### 1. Pull Request Requirements
- **Required Approvals**: At least 1 approving review is required before merging
- **Code Owner Review**: Changes to files with designated code owners require approval from at least one code owner
- **Dismiss Stale Reviews**: Approval is automatically dismissed when new commits are pushed
- **Require Review Thread Resolution**: All review comments must be resolved before merging

#### 2. Status Check Requirements
All of the following CI checks must pass before merging:
- **build**: Ensures the project builds successfully across all workspaces
- **test**: Runs the full test suite to verify functionality
- **lint**: Validates code style and quality with ESLint
- **typecheck**: Ensures TypeScript type safety across the codebase

These checks are enforced with strict status check policy, meaning the branch must be up-to-date with the base branch before merging.

#### 3. History Protection
- **Prevent Deletion**: The main branch cannot be deleted
- **Prevent Force Pushes**: Force pushes are not allowed to prevent history rewriting
- **Linear History**: Requires a linear commit history (no merge commits)
- **Signed Commits**: All commits must be signed (GPG or S/MIME)

## Code Owners

The repository uses a `CODEOWNERS` file to designate ownership of critical paths:

### Critical Paths
- **Core Packages** (`/packages/core/`, `/packages/semantic/`, `/packages/i18n/`): Require review from @codetalcott
- **Build Configuration** (`package.json`, `tsconfig*.json`, etc.): Require review from @codetalcott
- **GitHub Configuration** (`.github/` directory): Require review from @codetalcott
- **Documentation** (`README.md`, `CONTRIBUTING.md`, etc.): Require review from @codetalcott

All files default to @codetalcott ownership unless a more specific rule applies.

## CI/CD Pipeline

The repository includes a comprehensive CI/CD pipeline (`.github/workflows/ci.yml`) that runs automatically on:
- Pushes to `main` or `master` branches
- Pull requests targeting `main` or `master` branches

### Pipeline Jobs

1. **Lint**: Validates code style and quality using ESLint
2. **Typecheck**: Verifies TypeScript type correctness
3. **Build**: Compiles all packages and workspaces
4. **Test**: Runs the complete test suite
5. **Integration Tests**: Executes integration tests for core packages
6. **CI Success**: Final gate that ensures all checks passed

### Concurrency Control
The pipeline uses concurrency groups to automatically cancel in-progress runs when new commits are pushed to the same PR, saving CI resources.

## Enforcement

### Active Enforcement
The ruleset is set to **active** enforcement, meaning:
- Rules are strictly enforced and cannot be bypassed without proper permissions
- Pull requests that don't meet requirements cannot be merged
- Status checks must pass before merge is allowed

### Bypass Actors
Currently, no bypass actors are configured. All contributors, including administrators, must follow the same rules.

## How to Work with These Rules

### For Contributors

1. **Create a Branch**: Always work on a feature branch, never directly on `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Commit Your Changes**: Make sure your commits are signed
   ```bash
   git commit -S -m "Your commit message"
   ```

3. **Push and Create PR**: Push your branch and create a pull request
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Wait for CI**: All CI checks must pass before your PR can be merged

5. **Request Review**: Ensure you get the required approvals, especially from code owners for files you modified

6. **Address Feedback**: Resolve all review comments before merging

### For Maintainers

#### Enabling the Ruleset

These ruleset configurations are provided as reference. To enable them in GitHub:

1. Go to repository **Settings** → **Rules** → **Rulesets**
2. Click **New ruleset** → **New branch ruleset**
3. Import the configuration from `.github/rulesets/branch-protection.json` or manually configure the rules as described in this document
4. Set enforcement to **Active**
5. Save the ruleset

#### Managing Code Owners

To update code ownership:
1. Edit `.github/CODEOWNERS`
2. Follow the syntax: `<path-pattern> @username-or-team`
3. More specific patterns override general ones
4. Commit and push the changes

#### Modifying CI Checks

To add or modify required status checks:
1. Update `.github/workflows/ci.yml` to add new jobs
2. Update the ruleset configuration to require the new check
3. Test the workflow in a branch before applying to main

## Security Considerations

### Signed Commits
Signed commits help verify the identity of contributors and ensure the integrity of the codebase. To set up commit signing:

1. Generate a GPG key:
   ```bash
   gpg --full-generate-key
   ```

2. Configure Git to use your key:
   ```bash
   git config --global user.signingkey YOUR_KEY_ID
   git config --global commit.gpgsign true
   ```

3. Add your GPG key to GitHub: Settings → SSH and GPG keys → New GPG key

### Dependency Security
The repository uses npm's lockfile and Husky pre-commit hooks to help ensure dependency integrity and catch issues before they reach CI.

## Troubleshooting

### CI Checks Failing
- Check the Actions tab in GitHub to see detailed logs
- Run the same commands locally: `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`
- Ensure your branch is up to date with main: `git pull origin main`

### Code Owner Review Not Available
- Ensure the code owners have been invited to the repository
- Verify the paths in CODEOWNERS match your changed files
- Check that the code owner's GitHub username is correct

### Linear History Issues
- Use rebase instead of merge to update your branch:
  ```bash
  git rebase origin/main
  ```
- Squash commits if needed before merging

### Signed Commit Issues
- Verify your GPG key is properly configured
- Ensure your key hasn't expired
- Make sure your key is added to your GitHub account

## Future Enhancements

Consider adding:
- **Dependabot**: Automated dependency updates with security checks
- **CodeQL**: Advanced security scanning for vulnerabilities
- **Release Automation**: Automated version bumping and publishing
- **Performance Benchmarks**: Track performance metrics over time
- **Coverage Requirements**: Enforce minimum test coverage thresholds

## References

- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [CODEOWNERS Syntax](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [Signed Commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification)
