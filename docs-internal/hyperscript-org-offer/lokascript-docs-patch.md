# Patch: lokascript-docs patterns page → multilingual demo

**Target:** `~/projects/_hyper_min/sites/lokascript-docs/`
**Goal:** Make the patterns page demo-ready for the Carson hand-off — visitors can flip every visible pattern to any of 24 languages in one click, and (optionally) see the patterns execute live in the chosen language.

The site stays on `@lokascript/*` / `@hyperfixi/*` deps. The `@hyperscript-tools/*` URLs are reserved for the integration guide aimed at hyperscript.org (separate doc).

---

## Pre-flight — refresh `translations.json`

Before any UI work, regenerate the translations export from the upstream patterns DB. The current `patterns.json` shows duplicate / legacy language codes (`he` + `hebrew`, `es` + `es-MX`) — fixing that at the source first will save you from special-casing the UI.

```bash
cd ~/projects/_hyper_min/sites/lokascript-docs
node scripts/export-patterns.js
```

This reads from `~/projects/hyperfixi/packages/patterns-reference/data/patterns.db` and writes:

- `src/_data/patterns.json` (118 patterns + metadata)
- `src/patterns/translations.json` (per-pattern translation array)

**Verify after running:**

```bash
python3 -c "import json; d=json.load(open('src/_data/patterns.json')); print(sorted(set(d['languages']))); print(d['stats'])"
```

You should see exactly 24 ISO codes (no `hebrew`, no `es-MX`). If the duplicates persist, fix them at source in `~/projects/hyperfixi/packages/patterns-reference/` (most likely a row-cleanup query on `data/patterns.db`) before continuing — the chip grid below assumes 24 canonical codes.

---

## Part A — Global language chip grid (must-have)

All edits live in **`src/patterns/index.njk`**. Line numbers below refer to the file as it stands at the start of this patch.

### A.1 — Add a language chip strip above the patterns grid

Insert **after the `engine-legend` div (line 303)** and **before the `patterns-stats` div (line 305)**:

```njk
<div class="language-bar" id="language-bar">
  <div class="language-bar-label">Show patterns in:</div>
  <div class="language-chips" id="language-chips">
    <button type="button" class="language-chip is-active" data-lang="en"
      title="English">EN<span class="lang-native">English</span></button>
    <button type="button" class="language-chip" data-lang="es"
      title="Spanish">ES<span class="lang-native">Español</span></button>
    <button type="button" class="language-chip" data-lang="pt"
      title="Portuguese">PT<span class="lang-native">Português</span></button>
    <button type="button" class="language-chip" data-lang="fr"
      title="French">FR<span class="lang-native">Français</span></button>
    <button type="button" class="language-chip" data-lang="de"
      title="German">DE<span class="lang-native">Deutsch</span></button>
    <button type="button" class="language-chip" data-lang="it"
      title="Italian">IT<span class="lang-native">Italiano</span></button>
    <button type="button" class="language-chip" data-lang="pl"
      title="Polish">PL<span class="lang-native">Polski</span></button>
    <button type="button" class="language-chip" data-lang="ru"
      title="Russian">RU<span class="lang-native">Русский</span></button>
    <button type="button" class="language-chip" data-lang="uk"
      title="Ukrainian">UK<span class="lang-native">Українська</span></button>
    <button type="button" class="language-chip" data-lang="ja"
      title="Japanese">JA<span class="lang-native">日本語</span></button>
    <button type="button" class="language-chip" data-lang="ko"
      title="Korean">KO<span class="lang-native">한국어</span></button>
    <button type="button" class="language-chip" data-lang="zh"
      title="Chinese">ZH<span class="lang-native">中文</span></button>
    <button type="button" class="language-chip" data-lang="ar"
      title="Arabic" dir="rtl">AR<span class="lang-native">العربية</span></button>
    <button type="button" class="language-chip" data-lang="he"
      title="Hebrew" dir="rtl">HE<span class="lang-native">עברית</span></button>
    <button type="button" class="language-chip" data-lang="hi"
      title="Hindi">HI<span class="lang-native">हिन्दी</span></button>
    <button type="button" class="language-chip" data-lang="bn"
      title="Bengali">BN<span class="lang-native">বাংলা</span></button>
    <button type="button" class="language-chip" data-lang="id"
      title="Indonesian">ID<span class="lang-native">Indonesia</span></button>
    <button type="button" class="language-chip" data-lang="ms"
      title="Malay">MS<span class="lang-native">Melayu</span></button>
    <button type="button" class="language-chip" data-lang="th"
      title="Thai">TH<span class="lang-native">ไทย</span></button>
    <button type="button" class="language-chip" data-lang="tl"
      title="Tagalog">TL<span class="lang-native">Tagalog</span></button>
    <button type="button" class="language-chip" data-lang="vi"
      title="Vietnamese">VI<span class="lang-native">Việt</span></button>
    <button type="button" class="language-chip" data-lang="tr"
      title="Turkish">TR<span class="lang-native">Türkçe</span></button>
    <button type="button" class="language-chip" data-lang="sw"
      title="Swahili">SW<span class="lang-native">Kiswahili</span></button>
    <button type="button" class="language-chip" data-lang="qu"
      title="Quechua">QU<span class="lang-native">Runasimi</span></button>
  </div>
</div>
```

> The chip count is 24 — matches the canonical language set the adapter ships. If you'd rather drive this from `patterns.languages` (Nunjucks loop), feel free; the literal version is here so the patch stays self-contained.

### A.2 — Add CSS for the chip strip

Insert **before the closing `</style>` on line 256**:

```css
.language-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-3, 0.75rem);
  margin: var(--space-3, 0.75rem) 0;
  padding: var(--space-3, 0.75rem);
  background: var(--color-surface, #f5f5f5);
  border-radius: var(--radius-sm, 0.25rem);
  border: 1px solid var(--color-border, #e5e5e5);
}

.language-bar-label {
  font-size: 0.85rem;
  color: var(--color-muted, #666);
  font-weight: 600;
}

.language-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2, 0.5rem);
  flex: 1 1 auto;
}

.language-chip {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-2, 0.5rem);
  padding: 0.25rem 0.6rem;
  font-family: monospace;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 1px solid var(--color-border, #e5e5e5);
  border-radius: var(--radius-sm, 0.25rem);
  background: var(--color-bg, white);
  color: var(--color-fg, #333);
  cursor: pointer;
  transition:
    background 100ms,
    color 100ms,
    border-color 100ms;
}

.language-chip:hover {
  background: var(--color-surface, #f5f5f5);
  border-color: var(--color-accent, #4f46e5);
}

.language-chip.is-active {
  background: var(--color-accent, #4f46e5);
  border-color: var(--color-accent, #4f46e5);
  color: white;
}

.language-chip .lang-native {
  font-family: var(--font-sans, system-ui, sans-serif);
  font-weight: 400;
  font-size: 0.75rem;
  text-transform: none;
  letter-spacing: 0;
  opacity: 0.85;
}
```

### A.3 — Wire up the chip click handler

Insert at the **end of the inline `<script>` block (just before `</script>` on line 431)**:

```javascript
// Active language for the global switcher; persisted in URL hash.
var activeLang = (location.hash.match(/^#lang=([a-z-]+)$/) || [])[1] || 'en';

function applyActiveLang(lang) {
  activeLang = lang;
  // 1) Reflect on chips
  document.querySelectorAll('.language-chip').forEach(function (chip) {
    chip.classList.toggle('is-active', chip.dataset.lang === lang);
  });
  // 2) Lazy-load translations.json (reuse loadTranslations cache)
  ensureTranslations().then(function () {
    document.querySelectorAll('.pattern-card').forEach(function (card) {
      var id = card.dataset.id;
      var codeEl = card.querySelector('.pattern-code');
      if (!codeEl) return;
      // Stash the English source on first run
      if (!codeEl.dataset.english) codeEl.dataset.english = codeEl.textContent;

      if (lang === 'en') {
        codeEl.textContent = codeEl.dataset.english;
        codeEl.removeAttribute('dir');
        return;
      }
      var rows = (translationsData && translationsData[id]) || [];
      var match = rows.find(function (t) {
        return t.language === lang;
      });
      if (match) {
        codeEl.textContent = match.code;
      } else {
        codeEl.textContent = codeEl.dataset.english; // fall back
      }
      // RTL guard for Arabic + Hebrew
      if (lang === 'ar' || lang === 'he') {
        codeEl.setAttribute('dir', 'rtl');
      } else {
        codeEl.removeAttribute('dir');
      }
    });
    // Keep "Copy code" buttons in sync
    document.querySelectorAll('.copy-btn').forEach(function (btn) {
      var card = btn.closest('.pattern-card');
      var codeEl = card && card.querySelector('.pattern-code');
      if (codeEl) btn.dataset.code = codeEl.textContent;
    });
  });
  // 3) Persist in URL
  history.replaceState(null, '', '#lang=' + lang);
}

function ensureTranslations() {
  if (translationsData) return Promise.resolve();
  return fetch('/patterns/translations.json')
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      translationsData = data;
    });
}

document.getElementById('language-chips').addEventListener('click', function (e) {
  var chip = e.target.closest('.language-chip');
  if (!chip) return;
  applyActiveLang(chip.dataset.lang);
});

// Apply initial language on load (handles deep-links like patterns#lang=ja)
if (activeLang !== 'en') applyActiveLang(activeLang);
```

The handler reuses the same `translationsData` cache the existing `loadTranslations` already populates, so there's no extra fetch.

After this, clicking a chip:

1. flips every `.pattern-code` block on the page to the selected language
2. updates the "Copy code" buttons so they copy the visible (translated) text
3. sets `dir="rtl"` on Arabic + Hebrew code blocks
4. persists `#lang=ja` in the URL so the choice survives reload + share

---

## Part B — Live execution toggle (optional, recommended for the Carson demo)

The page already loads `hyperfixi.js` (engine) and `/js/hyperscript-i18n.global.js` (the multilingual adapter). Adding a toggle that turns each pattern card into a _runnable_ button gives Carson something he can actually click.

### B.1 — Add the toggle UI

Insert **inside the `language-bar` div** added in A.1, **after the `language-chips` div**:

```njk
<label class="live-toggle">
  <input type="checkbox" id="live-execution-toggle" />
  <span>Live execution</span>
</label>
```

CSS to add at the end of the block in A.2:

```css
.live-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--color-muted, #666);
  cursor: pointer;
  margin-left: auto;
}
.live-toggle input {
  margin: 0;
}
```

### B.2 — Per-card "Run" button (rendered lazily by JS)

Append to the chip click-handler script in A.3:

```javascript
function setLiveExecution(on) {
  document.querySelectorAll('.pattern-card').forEach(function (card) {
    var existing = card.querySelector('.run-btn');
    if (!on) {
      if (existing) existing.remove();
      return;
    }
    if (existing) {
      existing.setAttribute('_', card.querySelector('.pattern-code').textContent);
      existing.setAttribute('data-hyperscript-lang', activeLang);
      return;
    }
    var actions = card.querySelector('.pattern-actions');
    if (!actions) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn run-btn';
    btn.textContent = 'Run';
    btn.setAttribute('_', card.querySelector('.pattern-code').textContent);
    btn.setAttribute('data-hyperscript-lang', activeLang);
    actions.appendChild(btn);
  });
  // Re-process newly added _= attributes
  if (on && window.hyperfixi && typeof window.hyperfixi.process === 'function') {
    window.hyperfixi.process(document.getElementById('patterns-grid'));
  }
}

document.getElementById('live-execution-toggle').addEventListener('change', function (e) {
  setLiveExecution(e.target.checked);
});

// When the active language changes while live mode is on, refresh the buttons
var origApply = applyActiveLang;
applyActiveLang = function (lang) {
  origApply(lang);
  if (document.getElementById('live-execution-toggle').checked) {
    setLiveExecution(true);
  }
};
```

> `window.hyperfixi.process(...)` is the public API for re-scanning a subtree after DOM mutation. If your build exposes it under a different name (verify in `packages/core/src/api/hyperscript-api.ts`), substitute accordingly.

### B.3 — Caveats to call out in the page (or the demo blurb)

Live execution will work for self-contained patterns (`toggle .active on me`, `add .clicked to me`, `put 'Done' into #status` if `#status` happens to exist on the page). Patterns that fetch from `/api/...` or target nonexistent selectors will run silently or no-op. That's fine for a demo — Carson will get the visceral "wait, this Japanese hyperscript is actually toggling stuff" moment from the simple cases.

If you'd rather curate the runnable subset, add a `runnable: true` flag to the upstream patterns DB and gate the Run button on `card.dataset.runnable`.

---

## Verification checklist

After applying:

- [ ] `npm run build` (or your usual 11ty build cmd) succeeds with no warnings about missing assets.
- [ ] `/patterns` loads, the chip strip is visible above the patterns grid.
- [ ] Clicking `JA` swaps every code block to Japanese; `KO`, `ES`, `AR`, `HE`, `ZH` all work.
- [ ] Arabic + Hebrew chips render with `dir="rtl"` on the code blocks (you can verify in DevTools).
- [ ] URL updates to `/patterns#lang=ja`; reloading keeps Japanese active.
- [ ] "Copy code" copies the _translated_ text after a chip is clicked.
- [ ] (If Part B applied) Toggling Live execution adds a "Run" button to every card; clicking it on a `toggle .active on me` pattern toggles `.active` on that button.
- [ ] No console errors when flipping between languages or toggling live execution.

---

## Out of scope for this patch

- **Site UI translation** (nav, headings, prose) — the chip swap only retargets pattern code, not page chrome.
- **Translating the "Copy code" / "Run" button labels themselves** — keep them in English so visitors don't get lost.
- **Carson-facing CDN URLs** — the integration guide page (separate doc) is where `unpkg.com/@hyperscript-tools/multilingual/...` URLs live.
