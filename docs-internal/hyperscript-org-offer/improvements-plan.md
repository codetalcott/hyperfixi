# Improvements + fixes before publishing

Pre-publish checklist for the hand-off. Each item lists the **why**, the
**fix**, and a **priority**:

- 🔴 **block-publish** — must land before either `npm publish` or sending the
  URL.
- 🟡 **polish** — strongly recommended before public hand-off; not strictly
  blocking.
- 🟢 **background** — can land any time; don't gate on these.

---

## 🔴 block-publish

### 1. Add a smoke test suite to `@hyperscript-tools/i18n`

The new package ships a CLI, an Eleventy plugin, and an HTML translator helper —
none of them have a test of their own. They lean implicitly on
`@lokascript/i18n`'s test suite, but our adapter layer (arg parsing, attribute
regex, lenient/strict mode, Eleventy filter wiring) is uncovered.

**Fix:** Three small `node:test` files under
`packages/hyperscript-tools-i18n/test/`:

- `cli.test.mjs` — argv parsing edge cases (unknown flag → exit 2; missing
  `--langs` → exit 2; `--strict` propagation; directory expansion).
- `html.test.mjs` — `translateHtml` round-trip for single/double/backtick
  attributes; lenient vs strict on a deliberately broken snippet; `from === to`
  no-op.
- `eleventy.test.mjs` — instantiate a fake `eleventyConfig.addFilter` collector,
  call `hyperscriptI18nPlugin(...)`, assert all three filters registered with
  the right behavior.

Wire `npm test` so the workflow's "Run tests" step at
[`.github/workflows/publish.yml:110`](../../.github/workflows/publish.yml) can
include it.

**Effort:** 1–2 hours.

### 2. Pin internal `dependencies` away from `*`

Both new packages have wildcard internal-dep specs:

- [`packages/multilingual-hyperscript/package.json`](../../packages/multilingual-hyperscript/package.json):
  `"@lokascript/hyperscript-adapter": "*"`
- [`packages/hyperscript-tools-i18n/package.json`](../../packages/hyperscript-tools-i18n/package.json):
  `"@lokascript/i18n": "*"`

Wildcards mean a future breaking change in `@lokascript/*` would silently break
consumers of `@hyperscript-tools/*` already-installed copies.

**Fix:** Pin to a caret range that matches what's published:

```json
"dependencies": {
  "@lokascript/hyperscript-adapter": "^2.4.0"
}
```

(Since the workflow bumps everything to 2.4.0 in lockstep, the caret allows
future 2.x but not 3.x.)

**Effort:** 5 minutes.

### 3. Verify `window.hyperfixi.process` actually works in the live-execution flow

I confirmed `process` exists at
[`packages/core/src/api/hyperscript-api.ts:1110`](../../packages/core/src/api/hyperscript-api.ts#L1110)
and the chip-handler's `setLiveExecution` calls it correctly. **But** I never
exercised the live path in a browser — the lokascript-docs build succeeded with
the chip strip rendered, but I haven't actually clicked "Live execution" on a
real browser and confirmed a translated `_=` button toggles `.active` on a card.

**Fix:** Run lokascript-docs locally, click into Spanish/Japanese/Arabic, toggle
live execution on, click a `toggle .active on me` pattern's Run button. If it
doesn't fire, the issue is one of:

- `window.hyperfixi` is namespaced differently in the deployed bundle.
- `process()` re-scan conflicts with the adapter's `getScript` override
  (timing).
- The dynamically-attached `_=` attribute isn't picked up because process()
  doesn't re-walk newly-set attributes — only newly-attached elements.

**Effort:** 15 minutes verify; up to 1 hour fix if broken.

---

## 🟡 polish before sending

### 4. Drop the `hebrew` and `es-MX` rows from the patterns DB

**Decision:** drop both. Spain-vs-Mexico Spanish split is interesting future
work, but not a current priority — `es-MX` data goes for now. `hebrew` is
strictly lower-quality than `he` and goes permanently.

**Verification of the Hebrew quality call:** spot-checked all 19 differing
`he` ↔ `hebrew` rows. `hebrew` consistently leaves the English `my`
untranslated where `he` translates it to `שלי`. Same shape across the whole
sample — `he` is the canonical, more-translated version.

| Pattern                       | `he`                         | `hebrew`                    |
| ----------------------------- | ---------------------------- | --------------------------- |
| chained-access-possessive-dot | `שלי.parentElement…`         | `my.parentElement…`         |
| default-value                 | `ברירת מחדל שלי @data-count` | `ברירת מחדל my @data-count` |
| event-debounce                | `${שלי value}`               | `${my value}`               |

**Fix:** one-shot migration script in
[`packages/patterns-reference/scripts/`](../../packages/patterns-reference/scripts/)
that deletes rows where `language IN ('hebrew', 'es-MX')`. Then re-export to
lokascript-docs (the export script will pick up the new shape; see Issue 9
for fixing the silent-preserve heuristic that hid these in the first place).
After the migration `totalLanguages: 26` becomes `24`.

**Future work (out of scope here):** when Spain-vs-Mexico support comes back
on the roadmap, the chip strip can grow a second-tier (regional dialect)
selector. Worth re-collecting the Mexican-Spanish translations from scratch
at that point rather than salvaging the current 114 rows.

**Effort:** 30 minutes.

### 5. Ship a `LICENSE` file in each new npm tarball

`@hyperscript-tools/multilingual` and `@hyperscript-tools/i18n` both declare
`"license": "MIT"` in `package.json` but neither ships a `LICENSE` file. npm
displays the SPDX identifier but convention is to include the full license text
in the tarball.

**Fix:** Copy [the root `LICENSE`](../../LICENSE) into both packages and add
`"LICENSE"` to each `files` array.

**Effort:** 5 minutes.

### 6. Delete `lokascript-docs-patch.md`

**Decision:** delete the file outright.
[`docs-internal/hyperscript-org-offer/lokascript-docs-patch.md`](./lokascript-docs-patch.md)
described insertion points for the **old monolithic** `index.njk`. The change
landed in the shared partial gated by `enableTranslations`, so anyone reading
the patch description today would apply it to a file that no longer exists.

A "implementation record" replacement would just duplicate commit `80214fd`'s
message without adding signal. The valuable bits are already homed:

- **Audience split rationale:** in [`README.md`](./README.md) and
  [`integration-guide.md`](./integration-guide.md).
- **What changed and why:** in commit `80214fd` (deliberately written as a
  record, not just a subject line).
- **Live-execution caveats** (which patterns actually run vs no-op): better
  as a 5-line comment in the shared partial near `setLiveExecution` than in
  a doc nobody will reread. Add this comment as part of the cleanup pass.

**Fix:** `git rm docs-internal/hyperscript-org-offer/lokascript-docs-patch.md`
and add a short live-exec comment to
[`packages/layouts/includes/patterns-page.njk`](../../../_hyper_min/packages/layouts/includes/patterns-page.njk)'s
shared partial.

**Effort:** 10 minutes.

### 7. Make the integration-guide language honest about the dep tree (defer bundling)

The wrapper's ESM `dist/index.js` re-exports from
`@lokascript/hyperscript-adapter`, so npm-install consumers see `@lokascript/*`
in their `node_modules`. This is cosmetic — doesn't break anything, doesn't
pollute their `package.json`, doesn't bloat their build (re-exports
tree-shake) — but the [integration guide](./integration-guide.md) currently
overstates the neutrality:

> _"Both packages are MIT, namespace-neutral, and have **zero dependency on
> any HyperFixi or LokaScript runtime.**"_

That statement is literally false. The runtime _is_
`@lokascript/hyperscript-adapter`, just packaged under a neutral name.

**Decision:** don't bundle the adapter (defer Option A from the original
draft). Bundling has real maintenance cost — wrapper's `dist/index.js` would
balloon from 227 bytes to several KB, and every adapter change has to flow
through both packages. The leak doesn't justify that today.

**Fix:** rewrite the misleading line in
[integration-guide.md](./integration-guide.md). For example:

> `@hyperscript-tools/*` are MIT-licensed, namespace-neutral wrappers over
> the LokaScript runtime (also MIT). The adapter logic lives at
> `@lokascript/hyperscript-adapter`; the wrapper exists so CDN URLs and
> integration code stay neutral.

This is transparent, costs 30 seconds, and pre-empts the "wait, what's
lokascript?" question Carson would otherwise have on first inspecting his
dep tree. Bundling stays available as a future option if the leak ever
becomes a real concern.

**Effort:** 5 minutes.

### 8. Smoke-test the published packages on a fresh CDN URL

Once published, fetch a unique URL we've never hit
(`unpkg.com/@hyperscript-tools/multilingual@2.4.0/dist/hyperscript-i18n-es.global.js`)
and confirm:

- File downloads (200 OK, ~140 KB).
- Loading it in a fresh HTML next to vanilla `_hyperscript` (from CDN)
  auto-registers and processes a `_="alternar .active on me"` button.

**Fix:** Add this as a manual step in the
[carson-handoff.md pre-send checklist](./carson-handoff.md), or wire into a
Playwright smoke test in `packages/multilingual-hyperscript/test/`.

**Effort:** 30 minutes manual; 2 hours automated.

### 9. Audit `translations.json` freshness behavior

The export script at
[`scripts/export-patterns.js`](../../../_hyper_min/sites/lokascript-docs/scripts/export-patterns.js)
preserves the existing translations file when the upstream DB has fewer
languages — that's how the `hebrew`/`es-MX` codes survived the latest re-export.
This silent-preserve heuristic was helpful once, but it's now actively masking
source-of-truth drift.

**Fix:** Replace the heuristic with two explicit modes:

```bash
# default: upstream wins
node scripts/export-patterns.js

# preserve mode: keep local additions (only intended for one-off curation)
node scripts/export-patterns.js --preserve-local
```

And document in the script's help that `--preserve-local` is for one-off cases,
not the steady state.

**Effort:** 30 minutes.

---

## 🟢 background

### 10. Bundle-size deserves a "lite" recommendation

The integration guide pitches the smallest single-language bundle at ~140 KB.
That's larger than vanilla `_hyperscript` itself (~22 KB gzipped). For
size-sensitive sites, the right answer is the **lite** bundle (~2 KB) plus a
separately-loaded semantic bundle (~16–48 KB depending on regional bundle).

**Fix:** Add a "Choosing a bundle" section to
[integration-guide.md](./integration-guide.md) that:

- Surfaces the lite path explicitly with a code snippet.
- Gives a decision tree: "one language → use the lang bundle"; "multiple regions
  → lite + semantic-priority"; "all 24 → full".
- Calls out gzipped sizes (currently we only show raw).

**Effort:** 1 hour.

### 11. The chip strip's RTL handling is partial

`AR` and `HE` chips set `dir="rtl"` on the code block. Good. But the chips
themselves render `dir="rtl"` text (Arabic, Hebrew native names) inside an LTR
container — works fine in practice but is brittle. Also, the live-execution Run
button's `_=` attribute when the active language is RTL doesn't get any RTL
treatment, which could matter for visual diff.

**Fix:** Lower priority cosmetic — defer until review or a real user complains.

### 12. The new package's `eleventy.ts` filter accepts `unknown` and silently returns inputs unchanged on type mismatch

[`packages/hyperscript-tools-i18n/src/eleventy.ts`](../../packages/hyperscript-tools-i18n/src/eleventy.ts):
`if (typeof input !== 'string' || typeof to !== 'string') return input;` — this
is defensive but means a Nunjucks template with a typo would render the wrong
thing without a clue. Eleventy's filter contract is permissive, so I picked
silent fall-through.

**Fix:** Add an `options.warn?: (msg: string) => void` hook so site builds can
opt into noisy warnings during development. Default stays silent.

**Effort:** 30 minutes.

### 13. Consolidate the handoff docs

[`docs-internal/hyperscript-org-offer/`](./README.md) has 5 markdown files now.
After improvement #6, several will say similar things. Worth a single
consolidated `OFFER.md` once the work is fully landed, with the implementation
patches archived or deleted.

**Fix:** Defer until after the hand-off — the docs are working scaffolding, and
consolidating prematurely loses the per-step rationale that's currently useful.

---

## Sequencing

**🔴 block-publish** in order (≈ 2–3 hrs):

1. **(2) Pin deps** — 5 min, quick win.
2. **(5) LICENSE files** — 5 min.
3. **(7) Fix the misleading "zero dependency" line in integration-guide.md** —
   5 min. Pairs naturally with (5) since it touches publish-adjacent docs.
4. **(6) Delete `lokascript-docs-patch.md` + add live-exec comment to the
   shared partial** — 10 min.
5. **(3) Live-exec browser smoke** — 15 min; may surface a real bug.
6. **(1) Smoke tests on `@hyperscript-tools/i18n`** — 1–2 hrs, biggest item.

**🟡 polish** after the block-publish set, in order:

1. **(4) Patterns DB cleanup** (drop `hebrew` + `es-MX` rows; re-export) —
   30 min.
2. **(8) CDN smoke test** post-publish — 30 min manual.
3. **(9) Export-script `--preserve-local` flag** — 30 min.

Then publish. Then **🟢 background** items as time allows.

All previously-open policy questions are resolved (see Issues 4, 6, 7
sections above).
