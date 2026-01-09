# GitHub Rulesets

This directory contains JSON configurations for GitHub repository rulesets that protect the HyperFixi codebase.

## What are Rulesets?

GitHub Rulesets are a modern way to define and enforce repository policies. They provide more flexibility and features than traditional branch protection rules.

## Files in this Directory

### `branch-protection.json`

This ruleset protects the main/master branch with the following rules:

**Pull Request Requirements:**
- Minimum 1 approving review required
- Code owner approval required for files they own
- Stale reviews dismissed on new pushes
- All review threads must be resolved

**Required Status Checks:**
- `build` - Project must build successfully
- `test` - All tests must pass
- `lint` - Code must pass linting
- `typecheck` - TypeScript types must be valid

**History Protection:**
- Branch deletion prevented
- Force pushes blocked
- Linear history required (no merge commits)
- Signed commits required

## How to Enable

These rulesets are provided as reference configurations. To enable them:

### Option 1: Via GitHub UI (Recommended)

1. Go to repository **Settings**
2. Navigate to **Rules** → **Rulesets**
3. Click **New ruleset** → **New branch ruleset**
4. Name it "Main Branch Protection"
5. Under **Target branches**, add `main` and/or `master`
6. Configure each rule as specified in `branch-protection.json`
7. Set **Enforcement status** to **Active**
8. Click **Create**

### Option 2: Via GitHub API

You can import the ruleset using GitHub's API:

```bash
# Get your repository ID
REPO_ID=$(gh api repos/codetalcott/hyperfixi --jq .id)

# Create the ruleset
gh api \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  /repos/codetalcott/hyperfixi/rulesets \
  --input .github/rulesets/branch-protection.json
```

### Option 3: Via Terraform

If you manage your GitHub infrastructure as code:

```hcl
resource "github_repository_ruleset" "main_protection" {
  name        = "Main Branch Protection"
  repository  = "hyperfixi"
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["refs/heads/main", "refs/heads/master"]
      exclude = []
    }
  }

  rules {
    pull_request {
      required_approving_review_count   = 1
      dismiss_stale_reviews_on_push     = true
      require_code_owner_review         = true
      require_last_push_approval        = false
      required_review_thread_resolution = true
    }

    required_status_checks {
      required_check {
        context = "build"
      }
      required_check {
        context = "test"
      }
      required_check {
        context = "lint"
      }
      required_check {
        context = "typecheck"
      }
      strict_required_status_checks_policy = true
    }

    deletion = true
    non_fast_forward = true
    required_linear_history = true
    required_signatures = true
  }
}
```

## Customization

You can customize these rulesets for your needs:

### Adjust Required Reviewers
Change `required_approving_review_count` to require more reviewers:
```json
"required_approving_review_count": 2
```

### Add More Status Checks
Add additional checks to the `required_status_checks` array:
```json
{
  "context": "security-scan",
  "integration_id": null
}
```

### Allow Bypass for Admins
Add bypass actors to allow administrators to bypass rules:
```json
"bypass_actors": [
  {
    "actor_id": 5,
    "actor_type": "RepositoryRole",
    "bypass_mode": "always"
  }
]
```

Note: `actor_id: 5` represents the "Admin" role.

### Relax Signing Requirements
If signed commits are too strict, you can remove this rule by deleting:
```json
{
  "type": "required_signatures"
}
```

## Verification

After enabling the ruleset, verify it's working:

1. Try to push directly to main (should fail)
2. Create a PR without passing CI (should not be mergeable)
3. Try to force push to a protected branch (should fail)
4. Verify code owner review is requested for appropriate files

## Troubleshooting

### Status Checks Not Found
If GitHub can't find the status checks:
- Ensure the CI workflow has run at least once
- Check that job names match exactly (case-sensitive)
- Wait a few minutes for GitHub to index the checks

### Can't Merge PRs
If you can't merge even after all checks pass:
- Verify your branch is up to date with main
- Check that all review threads are resolved
- Ensure you have the required number of approvals

### Bypass Not Working
If bypass actors aren't working:
- Check that actor IDs are correct
- Verify the actor type (User, Team, or RepositoryRole)
- Ensure bypass mode is set correctly

## Related Documentation

- Main documentation: `/docs/REPOSITORY_RULESET.md`
- Security policy: `/SECURITY.md`
- Code owners: `/.github/CODEOWNERS`
- CI workflow: `/.github/workflows/ci.yml`

## Support

For questions or issues with rulesets:
- Check [GitHub's Rulesets Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- Open an issue in the repository
- Contact the maintainers
