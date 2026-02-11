# 🔒 Framework Package Privacy

This package is currently **private and in development**. It's tracked in git locally but should **not be pushed to GitHub** until ready for public release.

## Current Status

- ✅ `"private": true` in package.json (prevents npm publish)
- ✅ `"access": "restricted"` in publishConfig (extra safety)
- ⚠️ Commits are local only - **DO NOT PUSH** until ready

## Safety Measures

1. **npm publish protection**: The `"private": true` flag prevents accidental publishing
2. **Restricted access**: Even if you try to publish, it will require explicit access
3. **Local version control**: You can commit locally for safety/rollback

## When Ready to Make Public

1. Remove `"private": true` from package.json
2. Change `publishConfig.access` to `"public"`
3. Update this file or delete it
4. Push to GitHub
5. Publish to npm

## Git Workflow

```bash
# Safe: Commit locally (version control)
git add packages/framework/
git commit -m "wip: framework development"

# DANGER: Don't push to GitHub yet!
# git push  ← Skip this until ready to go public
```

## Testing

You can still test the package locally in the monorepo:

```bash
# Build the framework
cd packages/framework
npm run build

# Use it in semantic package (via workspaces)
cd ../semantic
npm install  # Links to local framework package
```

---

**Remember**: This package is invisible to GitHub until you explicitly push. Keep it that way until ready! 🔒
