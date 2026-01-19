# npm Organization Setup Checklist

**Organization**: @lokascript
**Status**: ⏳ Pending Creation
**Date**: January 19, 2026

## Pre-Setup Verification

- [x] Name availability checked: ✅ `@lokascript` is available
- [x] Domains reserved: ✅ lokascript.org, lokascript.com
- [ ] npm account ready (or created)
- [ ] npm login confirmed (run: `npm whoami`)

## Organization Creation Steps

### Step 1: Create Organization (5 min)

- [ ] Visit https://www.npmjs.com/org/create
- [ ] Enter organization name: `lokascript`
- [ ] Choose **Free** plan (public packages)
- [ ] Confirm creation
- [ ] Note: Organization URL will be https://www.npmjs.com/org/lokascript

### Step 2: Configure Organization (10 min)

- [ ] Set notification email
- [ ] Enable 2FA (strongly recommended)
- [ ] Set default package access: `public`
- [ ] Add organization description: "Multilingual scripting for 23 languages"
- [ ] Add organization website: https://lokascript.org
- [ ] Add repository URL: https://github.com/codetalcott/hyperfixi

### Step 3: Add Team Members (Optional)

- [ ] Decide on team structure
- [ ] Add collaborators with appropriate roles:
  - [ ] Owner: (your npm username)
  - [ ] Admin: (if any)
  - [ ] Developer: (if any)
  - [ ] Read-only: (if any)

### Step 4: Generate Publishing Token (5 min)

- [ ] Visit https://www.npmjs.com/settings/YOUR_USERNAME/tokens
- [ ] Click "Generate New Token"
- [ ] Select type: **Automation** (for CI/CD)
- [ ] Enable permissions:
  - [ ] Read and write
  - [ ] Publish
- [ ] Copy token (save it securely - you won't see it again!)
- [ ] Token format: `npm_XXXXXXXXXXXXXXXXXXXXXXXXXXXX`

### Step 5: Add Token to GitHub (5 min)

**Option A: GitHub Website**

- [ ] Go to https://github.com/codetalcott/hyperfixi/settings/secrets/actions
- [ ] Click "New repository secret"
- [ ] Name: `NPM_TOKEN`
- [ ] Value: (paste token from Step 4)
- [ ] Click "Add secret"

**Option B: GitHub CLI**

```bash
gh secret set NPM_TOKEN --body "npm_YOUR_TOKEN_HERE"
gh secret list  # Verify it was added
```

## Verification Steps

Run these commands AFTER creating the organization:

```bash
# 1. Verify you're logged in
npm whoami
# Should output: your-npm-username

# 2. List your organizations
npm org ls lokascript
# Should show team members

# 3. View package access
npm access ls-packages lokascript
# Should show empty (no packages yet)

# 4. Check organization info
npm org ls lokascript --json
# Should show organization details
```

## Post-Setup Configuration

### Package Publishing Defaults

Set up organization-wide defaults:

```bash
# Set all packages to public by default
npm config set access public

# Verify config
npm config list
```

### Organization README (Optional)

- [ ] Visit https://www.npmjs.com/org/lokascript
- [ ] Click "Edit" to add organization README
- [ ] Add description, links, badges

Example README content:

```markdown
# LokaScript

Multilingual scripting language supporting 23 languages with native grammar transformations.

- 🌍 **23 Languages**: Arabic, Bengali, Chinese, English, French, German, Hindi, Indonesian, Italian, Japanese, Korean, Malay, Polish, Portuguese, Quechua, Russian, Spanish, Swahili, Tagalog, Thai, Turkish, Ukrainian, Vietnamese
- 📝 **Grammar Aware**: Handles SOV, VSO, and SVO word orders
- 🎯 **Semantic Parsing**: Understands intent across linguistic structures
- 🚀 **Tree-Shakeable**: Load only what you need

## Packages

- [@lokascript/core](https://www.npmjs.com/package/@lokascript/core) - Main runtime
- [@lokascript/semantic](https://www.npmjs.com/package/@lokascript/semantic) - Multilingual parser
- [@lokascript/i18n](https://www.npmjs.com/package/@lokascript/i18n) - Grammar transformation
- [@lokascript/vite-plugin](https://www.npmjs.com/package/@lokascript/vite-plugin) - Zero-config Vite integration
- [@lokascript/mcp-server](https://www.npmjs.com/package/@lokascript/mcp-server) - LLM integration

## Documentation

- **Website**: https://lokascript.org
- **GitHub**: https://github.com/codetalcott/hyperfixi
- **Getting Started**: https://lokascript.org/docs

## License

MIT
```

## Security Recommendations

- [ ] Enable 2FA on npm account
- [ ] Use automation token (not classic token)
- [ ] Set token expiration (1 year recommended)
- [ ] Store token securely (GitHub Secrets)
- [ ] Rotate token annually
- [ ] Limit token scope to specific packages (optional)
- [ ] Review organization members regularly

## Troubleshooting

### Issue: "Organization name already taken"

**Solution**: Try variations:

- `lokascript-js`
- `lokascript-dev`
- `thelokascript`

### Issue: "403 Forbidden" when publishing

**Causes**:

1. Token not added to GitHub secrets
2. Token expired
3. Insufficient permissions

**Solution**:

```bash
# Check token permissions
npm token list

# Regenerate token if needed
# Visit: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
```

### Issue: "Package name must be lowercase"

**Solution**: All package names should be lowercase:

- ✅ `@lokascript/core`
- ❌ `@LokaScript/Core`

## Next Steps After Setup

Once organization is created and verified:

1. [ ] Update IMPLEMENTATION_SUMMARY.md checklist
2. [ ] Begin Phase 1 of rebrand (package names)
3. [ ] Test dry-run publish with one package
4. [ ] Proceed with full rebrand

## Reference Links

- npm Organization Docs: https://docs.npmjs.com/organizations
- Publishing Scoped Packages: https://docs.npmjs.com/creating-and-publishing-scoped-public-packages
- Access Tokens: https://docs.npmjs.com/about-access-tokens
- GitHub Secrets: https://docs.github.com/en/actions/security-guides/encrypted-secrets

## Status Updates

| Date       | Action                | Status      |
| ---------- | --------------------- | ----------- |
| 2026-01-19 | Created checklist     | ✅ Complete |
|            | Organization creation | ⏳ Pending  |
|            | Token generation      | ⏳ Pending  |
|            | GitHub secret added   | ⏳ Pending  |
|            | Verification tests    | ⏳ Pending  |

---

**Notes**:

- Organization creation is free for public packages
- Can upgrade to paid plan later if private packages needed
- Token should be treated like a password (never commit to git)
