# npm Publish Fix - OIDC Trusted Publisher Configuration

## Problem

The publish workflow is failing with:

```text
npm notice Access token expired or revoked. Please try logging in again.
npm error 404 Not Found - PUT https://registry.npmjs.org/@lokascript%2fcore - Not found
```

## Root Cause

The packages were originally published from repository `hyperfixi/hyperfixi`, but the current repository is `codetalcott/lokascript`. npm's OIDC trusted publishing validates that the GitHub repository/workflow is authorized to publish to each package.

## Solution: Configure Trusted Publishers

**You must configure trusted publishers for EACH package on npmjs.com:**

### Steps for Each Package

1. **Log in to npmjs.com** as user `codetalcott`

2. **Navigate to each package's settings:**
   - [@lokascript/core](https://www.npmjs.com/package/@lokascript/core/access)
   - [@lokascript/semantic](https://www.npmjs.com/package/@lokascript/semantic/access)
   - [@lokascript/i18n](https://www.npmjs.com/package/@lokascript/i18n/access)
   - [@lokascript/vite-plugin](https://www.npmjs.com/package/@lokascript/vite-plugin/access)
   - [@lokascript/patterns-reference](https://www.npmjs.com/package/@lokascript/patterns-reference/access) (if it exists)

3. **In the left sidebar, click "Publishing Access"**

4. **Under "Trusted Publishers", click "Add trusted publisher"**

5. **Fill in the form:**
   - **Provider:** GitHub Actions
   - **Repository owner:** `codetalcott`
   - **Repository name:** `lokascript`
   - **Workflow file:** `publish.yml`
   - **Environment name:** (leave blank)

6. **Click "Add"**

7. **Repeat for all packages**

### Verification

After configuring trusted publishers, the publish workflow should work without any code changes. The existing workflow already has the correct permissions:

```yaml
permissions:
  contents: write
  id-token: write # ✅ This enables OIDC
```

## Alternative: Token-Based Publishing (Temporary)

If you need to publish immediately while configuring trusted publishers, you can temporarily use an automation token:

### 1. Create an Automation Token

1. Go to [npmjs.com → Account → Access Tokens](https://www.npmjs.com/settings/~/tokens)
2. Click "Generate New Token" → "Automation"
3. Copy the token (starts with `npm_...`)

### 2. Add Token to GitHub Secrets

1. Go to [Repository Settings → Secrets → Actions](https://github.com/codetalcott/lokascript/settings/secrets/actions)
2. Click "New repository secret"
3. Name: `NPM_TOKEN`
4. Value: (paste the token)
5. Click "Add secret"

### 3. Temporarily Modify the Workflow

Add environment variable to the publish step:

```yaml
- name: Publish to npm
  if: ${{ github.event.inputs.dry-run == 'false' }}
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }} # Add this line
  run: |
    # ... existing commands
```

**Important:** Remove this after configuring trusted publishers, as OIDC is more secure.

## Recommended Action

✅ **Configure trusted publishers (Solution 1)** - This is the modern, secure approach and requires no code changes.

The workflow is already correctly configured for OIDC. The only missing piece is the per-package trusted publisher configuration on npmjs.com.

## Fixed: Missing Repository Fields

✅ **FIXED:** Added missing `repository` fields to:

- `packages/i18n/package.json`
- `packages/patterns-reference/package.json`

These fields are required for npm provenance and help npm validate the trusted publisher configuration.

## Additional Notes

- The workflow successfully creates provenance statements (visible in logs: "Provenance statement published to transparency log")
- This confirms the OIDC token is being generated correctly
- The issue is purely authorization - npm doesn't recognize the new repository as trusted for these packages
- Once configured, OIDC provides better security than long-lived tokens:
  - No secrets to manage/rotate
  - Scoped to specific workflows
  - Automatic provenance and supply chain security

## Next Steps After Configuring Trusted Publishers

Once you've configured trusted publishers on npmjs.com:

1. Run the publish workflow again (no code changes needed)
2. The publish should succeed with provenance attached
3. Verify packages on npm show the GitHub repository link and provenance badge
