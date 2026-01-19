# LokaScript Rebranding Assessment

**Date**: January 19, 2026
**Domains Reserved**: lokascript.org, lokascript.com
**Current Name**: HyperFixi
**Target Name**: LokaScript

## Executive Summary

Rebranding from HyperFixi to LokaScript requires updating **~6,313 references** across **873 files** in the codebase. Partial rebranding has already begun in the core API layer. This document outlines the complete scope and provides an execution plan.

**Estimated Effort**: 8-12 hours of focused work + testing
**Risk Level**: Medium (requires careful npm organization transition)

## Etymology & Naming

**LokaScript** (loka + script):

- **loka** (Sanskrit/Indo-European): "world, realm, universe"
- Reflects the multilingual scope (23 languages, SOV/VSO/SVO grammars)
- Natural English pronunciation: "LOW-kah-script"
- Domain availability: ✅ lokascript.org, ✅ lokascript.com

## Current Status

### Already Completed ✅

- `packages/core/src/api/lokascript-api.ts` - Primary API wrapper
- `packages/core/src/index.ts` - Exports lokascript as primary
- `packages/types-browser/src/globals.d.ts` - Type definitions
- Etymology documentation in place

### To Be Updated 🔄

#### 1. NPM Organization & Package Names

**Impact**: Critical - affects all imports and installations
**Scope**: 20 packages

```
Current:  @hyperfixi/*
Target:   @lokascript/*

Packages to rename:
- @hyperfixi/core          → @lokascript/core
- @hyperfixi/semantic      → @lokascript/semantic
- @hyperfixi/i18n          → @lokascript/i18n
- @hyperfixi/vite-plugin   → @lokascript/vite-plugin
- @hyperfixi/mcp-server    → @lokascript/mcp-server
- @hyperfixi/types-browser → @lokascript/types-browser
- (+ 14 more packages)
```

**Action Required**:

1. Reserve `@lokascript` organization on npmjs.com
2. Update all package.json files (20 files)
3. Update all internal dependencies (238 references)
4. Update all import statements (206 references)

#### 2. Global Variables & Browser APIs

**Impact**: High - breaking change for existing users
**Scope**: 44 references

```javascript
// Current
window.hyperfixi
window._hyperscript (compatibility)

// Target
window.lokascript
window._lokascript (compatibility)
window.hyperfixi (deprecated alias for migration)
```

**Files to Update**:

- `packages/core/src/compatibility/browser-bundle.ts`
- All browser bundle build scripts
- All HTML example files (62 examples)
- Test files referencing globals

#### 3. Repository & GitHub

**Impact**: Medium
**Scope**: GitHub organization, CI/CD, badges

```
Current:  github.com/codetalcott/hyperfixi
Target:   github.com/lokascript/lokascript (or similar)

Updates needed:
- Repository name and description
- GitHub Actions workflows (7 files)
- README badges and links
- GitHub organization (optional - could remain under codetalcott)
```

#### 4. Documentation Files

**Impact**: High - affects all user-facing docs
**Scope**: ~180 markdown files

Major documentation to update:

- `README.md` (main repository)
- `CLAUDE.md` (AI assistant context)
- `IMPLEMENTATION_SUMMARY.md`
- `PUBLICATION_PLAN.md`
- `CONTRIBUTING.md`
- Package READMEs (20 files)
- Package CHANGELOGs (5 files)
- All `.md` files in `docs/`, `roadmap/`, etc.

#### 5. Source Code References

**Impact**: Medium - mostly internal
**Scope**: 1,254 TypeScript/JavaScript files

Areas to update:

- Class names: `HyperFixi*` → `LokaScript*`
- Comments and JSDoc
- Error messages and logging
- Debug prefixes (e.g., `HYPERFIXI:`, `hyperfixi:`)
- Test descriptions and assertions

#### 6. HTML Examples & Demos

**Impact**: High - affects live demos
**Scope**: 62 HTML example files

Updates needed:

- Script src attributes
- Window object references
- Inline documentation
- Demo descriptions

#### 7. Configuration Files

**Impact**: Medium
**Scope**: ~30 config files

Files to update:

- `package.json` (root + 20 packages)
- `.mcp.json` (Model Context Protocol)
- `.github/copilot-instructions.md`
- `.claude/settings.local.json`
- `tsconfig.json` files
- Build configuration files

#### 8. External References

**Impact**: Critical - requires coordination
**Scope**: External systems

Systems to update:

- npm registry (new organization)
- GitHub repository settings
- CI/CD environment variables
- Domain DNS (lokascript.org → GitHub Pages or hosting)
- CDN links (if any)
- External documentation links

## Detailed Update Breakdown

### Phase 1: Foundation (2-3 hours)

**Priority**: Critical - Must complete before npm publication

1. **Reserve npm organization** (15 min)
   - Create `@lokascript` organization on npmjs.com
   - Add team members
   - Configure organization settings

2. **Update package names** (45 min)
   - All 20 `packages/*/package.json` files
   - Update internal dependencies
   - Update peerDependencies

3. **Update import statements** (30 min)
   - Find/replace `from '@hyperfixi/` → `from '@lokascript/`
   - 206 import statements across codebase

4. **Update GitHub workflows** (30 min)
   - 7 workflow files in `.github/workflows/`
   - Environment variables
   - Package references in CI/CD

### Phase 2: Core Code (2-3 hours)

**Priority**: High - Affects runtime behavior

1. **Browser globals** (45 min)
   - Update `window.hyperfixi` → `window.lokascript`
   - Add compatibility aliases
   - Update browser bundle builds

2. **Class and function names** (60 min)
   - `HyperFixi*` → `LokaScript*` class names
   - Function names in public API
   - Type names and interfaces

3. **Debug and logging** (30 min)
   - Update log prefixes
   - Error messages
   - Debug control names

### Phase 3: Documentation (2-3 hours)

**Priority**: High - User-facing content

1. **Main README** (30 min)
   - Title, description, badges
   - Installation instructions
   - Quick start examples

2. **Package READMEs** (60 min)
   - 20 package README files
   - Update all code examples
   - Update links and references

3. **CHANGELOGs** (30 min)
   - 5 CHANGELOG files
   - Add rebrand notes
   - Update package references

4. **Other documentation** (60 min)
   - CLAUDE.md
   - CONTRIBUTING.md
   - IMPLEMENTATION_SUMMARY.md
   - PUBLICATION_PLAN.md
   - All other `.md` files

### Phase 4: Examples & Tests (1-2 hours)

**Priority**: Medium - Important for demos

1. **HTML examples** (60 min)
   - 62 example files
   - Update script sources
   - Update global references

2. **Test files** (30 min)
   - Update test descriptions
   - Update assertions
   - Update mock references

### Phase 5: Cleanup & Verification (1-2 hours)

**Priority**: High - Quality assurance

1. **Search and destroy** (30 min)
   - Final grep for remaining `hyperfixi` references
   - Manual review of edge cases
   - Update any missed files

2. **Build and test** (30 min)
   - Run all tests
   - Build all packages
   - Verify browser bundles

3. **Documentation review** (30 min)
   - Check all links work
   - Verify code examples
   - Test installation instructions

## Migration Strategy

### Recommended Approach: Gradual Transition

**Phase 1: Dual Branding (Recommended for initial release)**

- Publish under `@lokascript` organization
- Keep `hyperfixi` as alias/compatibility layer
- Documentation mentions both names
- Timeline: 0-3 months

**Phase 2: Primary Rebrand**

- LokaScript becomes primary in all docs
- HyperFixi marked as legacy/deprecated
- Both names still work
- Timeline: 3-6 months

**Phase 3: Full Rebrand (Optional)**

- Remove HyperFixi references entirely
- Breaking change for old users
- Clean, unified branding
- Timeline: 6-12 months

### Alternative Approach: Clean Break

Rebrand everything at once before first npm publication. Simpler but more work upfront.

**Pros**:

- Clean start with no legacy baggage
- Simpler documentation
- No confusion for early adopters

**Cons**:

- More work before launch
- Loses any existing HyperFixi recognition
- Can't roll back easily

## Technical Considerations

### npm Package Transition

**Option 1: New Organization (Recommended)**

```bash
# Publish as new packages
npm publish @lokascript/core
npm publish @lokascript/semantic
# etc.

# Optional: Add deprecation notices to old packages
npm deprecate @hyperfixi/core "Package moved to @lokascript/core"
```

**Option 2: Transfer Ownership**

- Transfer existing `@hyperfixi` packages to new `@lokascript` org
- More complex, requires npm support
- Not recommended for clean rebrand

### Compatibility Layer

Keep backward compatibility during transition:

```typescript
// packages/core/src/index.ts
export { lokascript } from './api/lokascript-api';
export { hyperscript } from './api/hyperscript-api'; // deprecated

// Browser bundle
window.lokascript = lokascript;
window.hyperfixi = lokascript; // deprecated alias
```

### Breaking Changes

**Major breaking changes**:

1. npm package names (`@hyperfixi/*` → `@lokascript/*`)
2. Browser global (`window.hyperfixi` → `window.lokascript`)
3. Repository URL (if moving GitHub org)

**Mitigation**:

- Provide migration guide in README
- Keep compatibility aliases for 6-12 months
- Announce on social media and relevant communities

## Risk Assessment

### High Risk Items

1. **npm organization**: Must reserve before publication
2. **Import statements**: 206 references must be updated correctly
3. **Browser globals**: Breaking change for existing users
4. **Documentation**: Must be consistent to avoid confusion

### Medium Risk Items

1. **GitHub repository**: Moving requires updating all links
2. **CI/CD**: Environment variables and secrets
3. **Examples**: 62 files need updates
4. **External links**: May break if not redirected

### Low Risk Items

1. **Internal code**: Class names, comments (internal only)
2. **Test files**: No user impact
3. **Debug messages**: Mostly internal

## Recommended Action Plan

### Before npm Publication (Recommended)

**Pros**: Clean launch, no legacy issues, simpler branding
**Cons**: Delays publication by 1-2 days

**Steps**:

1. Reserve `@lokascript` npm organization
2. Update all package names and dependencies
3. Update browser globals and build scripts
4. Update documentation (READMEs, CHANGELOGs)
5. Update examples
6. Final verification and testing
7. Publish to npm as `@lokascript/*`

### After npm Publication (Alternative)

**Pros**: Faster time to market, gradual transition
**Cons**: Dual branding complexity, potential confusion

**Steps**:

1. Publish as `@hyperfixi` initially
2. Reserve `@lokascript` npm organization
3. Do full rebrand over 2-4 weeks
4. Republish as `@lokascript/*` with major version bump
5. Deprecate old packages

## Estimated Timeline

### Option 1: Full Rebrand Before Publication

- **Day 1 (4-6 hours)**: Phase 1-2 (Foundation + Core)
- **Day 2 (4-6 hours)**: Phase 3-5 (Docs + Examples + Testing)
- **Total**: 8-12 hours of focused work

### Option 2: Gradual Rebrand After Publication

- **Week 0**: Publish as `@hyperfixi`
- **Week 1-2**: Complete Phase 1-3 (Foundation, Core, Docs)
- **Week 3-4**: Complete Phase 4-5 (Examples, Testing)
- **Week 4**: Republish as `@lokascript` v2.0.0

## Search & Replace Commands

### Find all references

```bash
# Count references
grep -r "hyperfixi\|HyperFixi\|HYPERFIXI" \
  --include="*.ts" --include="*.js" --include="*.json" \
  --include="*.md" --include="*.html" --include="*.yml" \
  --exclude-dir=node_modules --exclude-dir=.git \
  --exclude-dir=dist --exclude-dir=coverage . | wc -l

# List affected files
grep -rl "hyperfixi\|HyperFixi\|HYPERFIXI" \
  --include="*.ts" --include="*.js" --include="*.json" \
  --include="*.md" --include="*.html" --include="*.yml" \
  --exclude-dir=node_modules --exclude-dir=.git \
  --exclude-dir=dist --exclude-dir=coverage .
```

### Automated replacements (use with caution)

```bash
# Package names
find . -name "package.json" -not -path "*/node_modules/*" \
  -exec sed -i '' 's/@hyperfixi/@lokascript/g' {} \;

# TypeScript/JavaScript
find packages -name "*.ts" -o -name "*.js" \
  -not -path "*/node_modules/*" -not -path "*/dist/*" \
  -exec sed -i '' 's/hyperfixi/lokascript/g' {} \;

# Documentation
find . -name "*.md" -not -path "*/node_modules/*" \
  -exec sed -i '' 's/HyperFixi/LokaScript/g' {} \;
  -exec sed -i '' 's/hyperfixi/lokascript/g' {} \;
```

**⚠️ WARNING**: Test these commands on a branch first. Review changes before committing.

## Checklist

### Pre-Rebrand

- [ ] Reserve `@lokascript` npm organization
- [ ] Create feature branch: `git checkout -b rebrand/lokascript`
- [ ] Back up current state
- [ ] Review this assessment with team

### Phase 1: Foundation

- [ ] Update all package.json names (20 files)
- [ ] Update all import statements (206 references)
- [ ] Update GitHub workflows (7 files)
- [ ] Update root package.json

### Phase 2: Core Code

- [ ] Update browser globals (window.lokascript)
- [ ] Update class names (HyperFixi* → LokaScript*)
- [ ] Update debug/logging prefixes
- [ ] Add compatibility aliases

### Phase 3: Documentation

- [ ] Update main README.md
- [ ] Update package READMEs (20 files)
- [ ] Update CHANGELOGs (5 files)
- [ ] Update CLAUDE.md
- [ ] Update CONTRIBUTING.md
- [ ] Update IMPLEMENTATION_SUMMARY.md
- [ ] Update PUBLICATION_PLAN.md
- [ ] Update all other .md files

### Phase 4: Examples & Tests

- [ ] Update HTML examples (62 files)
- [ ] Update test descriptions
- [ ] Update mock references

### Phase 5: Verification

- [ ] Run all tests: `npm test`
- [ ] Build all packages: `npm run build:all`
- [ ] Check browser bundles
- [ ] Grep for remaining "hyperfixi" references
- [ ] Manual review of critical files
- [ ] Test example HTML files

### Publication

- [ ] Commit changes
- [ ] Run pre-publish check workflow
- [ ] Dry-run publish
- [ ] Publish to npm as @lokascript/\*
- [ ] Verify npm packages
- [ ] Update lokascript.org/lokascript.com DNS
- [ ] Announce rebrand

## Next Steps

**Recommended**: Full rebrand before first npm publication

1. Review this assessment
2. Reserve `@lokascript` npm organization
3. Create rebrand branch
4. Execute Phase 1-5 (8-12 hours)
5. Test thoroughly
6. Publish to npm

**Questions to Answer**:

1. Do we want to move the GitHub repository to a new org?
2. Should we keep "HyperFixi" as a compatibility alias long-term?
3. What's the target date for publication?
4. Who will manage the npm organization?
5. What should lokascript.org display initially?

## Resources

- **npm organization**: https://www.npmjs.com/org/create
- **Domain management**: lokascript.org, lokascript.com
- **Repository**: github.com/codetalcott/hyperfixi (current)
- **Package references**: 873 files, ~6,313 occurrences
- **Import statements**: 206 files
- **Browser globals**: 44 references
