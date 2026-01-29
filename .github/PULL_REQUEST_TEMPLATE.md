## Summary

<!-- Brief description of what this PR does and why -->

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] CI/Build changes
- [ ] Dependencies update

## Affected Packages

- [ ] `@lokascript/core`
- [ ] `@lokascript/semantic`
- [ ] `@lokascript/i18n`
- [ ] `@lokascript/vite-plugin`
- [ ] `@lokascript/mcp-server`
- [ ] `@lokascript/patterns-reference`
- [ ] Other: <!-- specify -->

## Test Plan

<!-- How was this tested? Include commands run and results -->

- [ ] `npm run test:quick --prefix packages/core` passes
- [ ] `npm run typecheck --workspaces` passes
- [ ] New tests added for changed code
- [ ] Bundle sizes checked (no unexpected growth)

## Checklist

- [ ] Code follows project conventions (see CLAUDE.md)
- [ ] Self-reviewed the diff
- [ ] No `any` types introduced without justification
- [ ] No security issues (eval, innerHTML with user input, exposed secrets)
- [ ] Documentation updated if public APIs changed
