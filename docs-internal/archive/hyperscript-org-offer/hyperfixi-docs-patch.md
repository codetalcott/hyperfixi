# Patch: hyperfixi-docs patterns page → verify engine showcase

**Target:** `~/projects/_hyper_min/sites/hyperfixi-docs/`
**Goal:** Confirm the patterns page is solid as the **engine-only** showcase before the Carson hand-off. No multilingual UI on this site — that's lokascript.org's job. Audience split: hyperfixi.org = engine code browser, lokascript.org = multilingual demo.

The existing link in the patterns header already cross-references the multilingual page:

> _"Need these patterns in other languages? See the [multilingual pattern browser](https://lokascript.org/patterns/)."_

That's the entire multilingual story for this site.

---

## Pre-flight — refresh the engine bundle

The page passthrough-copies `node_modules/@hyperfixi/core/dist/hyperfixi.js`. Make sure that's current:

```bash
cd ~/projects/_hyper_min/sites/hyperfixi-docs
npm install                        # picks up the latest published @hyperfixi/core
ls -la node_modules/@hyperfixi/core/dist/hyperfixi.js
# Or, if you maintain a workspace link:
ls -la ../../node_modules/@hyperfixi/core/dist/hyperfixi.js
```

Note the file's mtime — it should match a recent `npm run build:browser --prefix packages/core` in the hyperfixi monorepo.

---

## Verification checklist

Walk through the deployed (or local-served) `/patterns` page and confirm:

- [ ] Page loads, header reads "_N_ hyperscript patterns. Search and filter to find the code you need." (where _N_ matches `getAllPatterns()` count from the upstream DB).
- [ ] `/api/patterns/stats` returns categories + totals (the page calls it on load).
- [ ] `/api/patterns?limit=20&page=1` returns the first batch of pattern cards.
- [ ] Search box filters live (300 ms debounce).
- [ ] Category and engine filters work.
- [ ] "Load more" button paginates through the full result set.
- [ ] "Copy code" copies the visible English to the clipboard.
- [ ] Engine badges render with the four legend swatches (`Both`, `_hyperscript`, `hyperfixi`, `Unverified`).
- [ ] Cross-link to `https://lokascript.org/patterns/` is present and resolves once lokascript-docs is deployed.
- [ ] Browser console is clean — no errors, no 404s for `hyperfixi.js`, theme fonts, or shared layout JS.

---

## Optional — make it runnable (skip for v1)

If you later want the engine showcase to be _interactive_ (pattern cards become real `<button>`s that execute on click), the same pattern from the lokascript-docs Part B applies — minus the language wiring, since this site is English-only:

```javascript
// Inside buildPatternCard(p), append:
'<div class="pattern-actions">' +
  '<button class="copy-btn" data-code="' +
  escapeHtml(p.code) +
  '">Copy code</button>' +
  '<button class="copy-btn run-btn" _="' +
  escapeHtml(p.code) +
  '">Run</button>' +
  '</div>';
```

Then call `window.hyperfixi.process(grid)` after each `loadPatterns()` to scan newly inserted cards. Same caveats as the lokascript-docs patch: only self-contained patterns (`me`-targeted, no `/api/...`) execute meaningfully.

**Recommendation:** Don't add this for the Carson hand-off. The engine showcase is most useful as a static reference; runnable demos are the multilingual site's job. Adding "Run" buttons here just dilutes the audience split.

---

## Out of scope

- **Multilingual chip strip** — leave it on lokascript.org/patterns. The cross-link is the bridge.
- **CDN URL changes** — site stays on `@hyperfixi/core` (its honest dep); `@hyperscript-tools/*` only appears in the integration guide aimed at hyperscript.org.
