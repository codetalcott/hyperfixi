# `@lokascript/semantic` v3.0.0 — release notes

## Status: **workspace-internal only**

`@lokascript/semantic@3.0.0` is **not published to npm**. The version bump from 2.x to 3.0.0 reflects breaking changes in this monorepo's workspace tree, but external installs continue to receive the last published 2.x.

If you are an external consumer of `@lokascript/semantic`: pin `^2.x` until a deliberate v3 publish is announced. There is currently no timeline for publishing v3.0.0 to npm — internal consumers use `workspace:*` and don't need it.

If you are working inside this monorepo: nothing to do. `workspace:*` resolves to the current `packages/semantic/` source.

## What changed in 3.0.0 (since 2.x)

The v3 cycle removed a set of deprecated APIs and consolidated parser entry points. The headline change is that `SemanticAnalyzer.analyze()` is gone — `parseSemantic()` (which uses the full parser, not pattern-only matching) is now the recommended entry point.

Migration shape for any future v3 publish:

```ts
// before (v2.x)
import { createSemanticAnalyzer } from '@lokascript/semantic';
const result = createSemanticAnalyzer().analyze(code, lang);

// after (v3.x)
import { parseSemantic } from '@lokascript/semantic';
const result = parseSemantic(code, lang);
// result.node, result.confidence, result.tokensConsumed
```

The full breaking-change set is recorded in commit [`e144aaa6`](../../../) — `feat(semantic)!: remove deprecated APIs, bump to v3.0.0`.

## If/when v3 is published

This file is the placeholder for the migration guide. At publish time the items below need expanding:

- [ ] Confirm `KNOWN_PROFILES` export shape matches the `2.x → 3.x` migration the user-facing docs promise.
- [ ] List every removed export from commit `e144aaa6` with its v3 replacement.
- [ ] Mention that `parseWithConfidence` now uses the full parser first, with pattern matching as a fallback — `tokensConsumed` is still populated for both paths.
- [ ] Verify `@lokascript/semantic/core` and `@lokascript/semantic/languages/*` subpath exports are documented for tree-shaking consumers.
- [ ] Run the actual `npm publish --dry-run` and confirm the `files` field in `package.json` ships the right artifacts.

## Why not publish now

The v3 work is verified working inside the workspace, but the public surface (subpath exports, what tooling-vs-user breaking changes look like across `@hyperfixi/*` consumers, etc.) hasn't been audited specifically for external consumption. Internal consumers are caught up via `workspace:*`. Publishing can happen as a deliberate later step when the public-API audit is done.
