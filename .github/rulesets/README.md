# Branch Protection Rulesets

This directory contains GitHub repository rulesets for branch protection and security.

## Available Rulesets

### `branch-protection.json`

Protects the `main` branch with comprehensive rules including:

- **Pull Request Reviews**: Requires 1 approval, code owner review, and thread resolution
- **Required Status Checks**: Must pass lint, typecheck, tests, and build before merging
- **Deletion Protection**: Prevents branch deletion
- **Force Push Protection**: Blocks force pushes (non-fast-forward)
- **Linear History**: Enforces clean git history

**Status**: Currently **DISABLED** - must be manually enabled

## Enabling the Ruleset

### Option 1: GitHub UI (Recommended)

1. Go to **Settings** → **Rules** → **Rulesets**
2. Click **New ruleset** → **Import a ruleset**
3. Upload `.github/rulesets/branch-protection.json`
4. Change enforcement from "Disabled" to "Active"
5. Click **Create**

### Option 2: GitHub CLI

```bash
# First, update the enforcement in the JSON file
jq '.enforcement = "active"' .github/rulesets/branch-protection.json > /tmp/ruleset.json

# Then create the ruleset
gh api -X POST /repos/$(gh repo view --json nameWithOwner -q .nameWithOwner)/rulesets \
  --input /tmp/ruleset.json
```

### Option 3: GitHub API

```bash
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/rulesets \
  -d @.github/rulesets/branch-protection.json
```

## Before Enabling

### Required CI Job Names

The ruleset requires these CI jobs to pass:

- `Lint & Typecheck` - Code quality and TypeScript validation
- `Unit Tests (Node 20)` - Test suite on Node.js 20
- `Build All Packages` - Successful package builds

**Verify these match your workflow job names** in `.github/workflows/ci.yml`

### Optional: GPG Signing

The ruleset **does not** require signed commits by default. To add this protection:

1. Edit `branch-protection.json`
2. Add this rule to the `rules` array:

   ```json
   {
     "type": "required_signatures"
   }
   ```

3. Ensure all contributors have GPG signing configured

## Verifying Protection

After enabling, test the ruleset:

1. Create a new branch
2. Make a small change
3. Open a pull request
4. Verify the required checks appear
5. Verify you cannot merge without approval

## Troubleshooting

### "Required status check not found"

If GitHub can't find a required status check:

- Verify the job name exactly matches what's in your workflow
- Check that the workflow runs on pull requests
- Ensure the workflow file is on the target branch

### "Ruleset cannot be enabled"

- Ensure you have admin permissions
- Check that all referenced status checks exist
- Verify the JSON syntax is valid

## Updating the Ruleset

To update an existing ruleset:

1. Modify the JSON file
2. Go to **Settings** → **Rules** → **Rulesets**
3. Click on the ruleset name
4. Click **Edit**
5. Update the configuration
6. Click **Save changes**

Or use the GitHub API to update it programmatically.

## Bypass Actors

The `bypass_actors` array is empty, meaning **no one** can bypass these rules (not even admins). To allow bypasses:

1. Add actor IDs to the `bypass_actors` array
2. Get actor IDs from GitHub API or UI
3. Update the ruleset

## More Information

- [GitHub Rulesets Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [Required Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
