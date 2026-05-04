# dixi M2.5 evaluation — prospective value to international users

> Written after building and exercising the docs-search demo at
> [`demo/search/`](demo/search/) (4 locales × en/es/ja/ar, fixi + moxi, 8 real
> doc fragments). All technical acceptance criteria passed; this document
> records honest observations on whether the **mechanism** translates into
> developer **value**.

## What we built

A polished docs viewer for the **Fixi Project itself** — content is a localized presentation of fixiproject.org's own pages. The demo is structured so it could **drop straight into fixiproject.org's site** as a multilingual docs interface, replacing the existing static pages with a search-and-filter UI in any of the four supported scripts.

The viewer has:

- 8 doc fragments hand-converted (BSD-0 sourced) from fixiproject.org's pages: about, the libraries tour, fixi.js, moxi.js, paxi.js, ssexi.js, rexi.js, demos. Each fragment carries a small attribution footer linking back to the canonical page.
- A search-and-filter sidebar (moxi `on-input` doing client-side substring filter)
- A collapsible sidebar (moxi `on-click` toggling a body class)
- Document loading via fixi (`fx-action` swapping fragments into `#content`)
- Four parallel locale files: `index.en.html`, `index.es.html`, `index.ja.html`, `index.ar.html`
- A 10-line dixi.js extension that generically rewrites `on-<localized-event>[.modifiers]` to `on-<canonical>` using the existing per-locale `values` map

**Sizes (post-M2.6, with full moxi coverage including modifiers):** dixi.js minified+gzipped is **1020 B** (just under the 1KB family-ethos ceiling, with no headroom for further additions). Per-locale data: 505–573 B gzipped — slightly over the aspirational 500B mark but family-comparable (paxi itself is 600B). The whole demo, including all eight fragments and CSS, is ~30 KB unminified.

**Test:** 80 checks across both demos pass — Phase A (M2 four-button demo): 16/16; Phase B (M2.5 search demo + M2.6 moxi-completion fixtures) × 4 locales: 16/16 each. Filter discriminator is `ssexi` — a proper noun that's stable across all locales because library names don't translate.

**Drop-in path:** to make this an actual deployable replacement for fixiproject.org's docs, swap the eight `fx-action="docs/<name>.html"` URLs for the canonical fixiproject paths (`fixi.html`, `moxi.html`, etc.). The fragment files become unnecessary in that scenario; fixi swaps in the real pages directly.

## Observations from the exercise

### 1. The literal diff between locale files is small and clean

`diff index.en.html index.es.html` shows exactly what you'd hope:

- `<html lang>` and `<title>` change
- A comment changes
- The locale `<script>` tag swaps
- Visible UI text translates
- Attribute _names_ swap (`fx-action` → `fx-acción`, `on-input` → `on-entrada`, etc.)

**Zero behavioral code changes.** The JS body inside `on-input="..."` stays identical across all four locales. The fragment URLs stay identical. The CSS selectors stay identical. dixi did its job: the _shape_ of the page is preserved; only the _vocabulary_ changes.

### 2. The four scripts compose without surprises

Latin / CJK / RTL all work the same way. The Arabic file adds `dir="rtl"` to `<html>` and the existing `inline-end` / `inline-start` CSS logical properties handle the layout flip automatically. dixi resolution worked uniformly across all four scripts.

### 3. moxi and fixi cohabit cleanly

The same demo uses both attribute systems on the same page. dixi's generic `on-*` rule (one Pass-2 loop in `normalizeElement`) handles moxi's attribute names without per-attribute hardcoding. This validates the broader claim that dixi is a _fixi-family_ utility, not a fixi-only one.

## What's gained

For an international developer **authoring** a fixi+moxi page in their language:

- **Locality of behavior preserved** — the entire page is one file, declarations live with markup, no build step. The fixi family's core promise survives translation.
- **Shape-preserving translation** — diffing two locale versions shows the change is mechanical and reviewable. Code reviewers can audit a localization change in seconds.
- **Genuine multi-script reach** — the same mechanism handles Latin, CJK, and RTL with no script-specific code paths. RTL "just works" because we lean on the family's existing `dir="rtl"` and CSS logical properties.
- **Composable across the family** — dixi works for fixi _and_ moxi _and_ (presumably) ssexi with no per-library code.
- **Tiny on the wire** — 956 B core + ~350 B per loaded locale is in the right neighborhood for the family's minimalism ethos.

The clearest **persona** the demo supports: a _senior developer who reads English fluently but is teaching juniors or non-anglophone team members_. The localized page lets the senior dev meet their team where they are without forking the page logic.

## What's lost or neutral

These are real and worth flagging up-front in any M3 README:

- **JS bodies stay English.** dixi translates attribute _names_ — including event names and modifiers (`on-clic.prevenir.una-vez` → `on-click.prevent.once` after M2.6). The JavaScript expression inside `on-input="event.target.value.toLowerCase()..."` stays in English forever. A Spanish developer reading the demo source still has to mentally context-switch into English JS for any logic. (Translating JS bodies would require something like `@lokascript/hyperscript-adapter`'s preprocessor, which is a different and much heavier mechanism.)
- **Vocabulary divergence within a team.** If half the team writes `fx-acción` and half writes `fx-action`, code review and cross-team grep both get harder. Linting could enforce one or the other, but no such linter exists yet.
- **Debugging asymmetry.** DevTools, error messages, MutationObserver traces, and fixi's own internal events all surface _canonical_ (English) attribute names — because that's what fixi sees post-rewrite. A Spanish developer authoring `fx-acción` will see `fx-action` everywhere in the inspector. This is unavoidable given the architecture but it's a real cognitive cost.
- **Doc-content asymmetry.** This demo's doc fragments are English. A _fully_ localized site would also translate the doc bodies. dixi solves the _authoring_ layer only; it doesn't help with content. Be honest about this in marketing.
- **Mojibake risk.** If a file is saved as anything other than UTF-8, attribute names with diacritics or non-Latin characters silently break. This is a real-world Windows / legacy-build-pipeline hazard.
- **Vocabulary choices are best-effort.** We picked `fx-acción` (with the diacritic), `fx-objetivo`, `fx-intercambio`. A native Spanish-speaking developer might prefer `fx-accion` (no diacritic for typeability), or `fx-destino` instead of `fx-objetivo`. The M2.6 modifier translations (`prevenir`/`detener`/`una-vez`/etc.) need native review even more — modifier semantics are subtler than attribute names. We don't have native-speaker review yet.
- **Adds dependency for a cohort of unknown size.** Every dixi-using page now has _three_ JS dependencies (dixi, locale data, plus fixi/moxi) where it might otherwise have one. Whether the value justifies the dependency for any given team is a judgment call.

## Go/no-go indicators for M3

The exercise confirms the **mechanism works**. It does not confirm that international developers **want** this. We're at the limit of what internal evaluation can tell us; the next signals must come from outside.

**Cheap external signals to gather before committing to M3 (recommended):**

1. **Deploy the M2.5 demo as a public landing page** (GitHub Pages). One day of work; the artifact already exists.
2. **Post to one or two venues**: a `fixiproject` discussion, `r/htmx`, the htmx Discord, or Mastodon/Bluesky tagging Carson Gross. Frame as "I built this small thing, would anyone find it useful?" — not as a launch.
3. **Watch for**: any reply at all from a non-English-native developer; any fork of the repo; any "we'd use this" reply. Two weeks is plenty.
4. **Flag for vocabulary review**: identify two native speakers per language (es, ja, ar to start) and ask: "would you actually write `fx-acción` and `on-clic.prevenir` in your code, or do you prefer English?" Their answer matters more than ours — particularly for modifiers, which are abstract enough that English may be the natural default even for non-anglophone devs.

**Strong "go" signal:** any non-English-native developer says "I want to use this in a real project."

**Strong "no" signal:** silence + native speakers saying "we'd just write English."

**Ambiguous:** generic "cool" reactions. Not enough to invest in 21 more locales.

## Recommendation

**Do M2.5+: deploy the demo, gather signal, then decide on M3.**

The content swap to fixiproject.org's own pages strengthens the pitch substantially. We're no longer asking Carson and the fixi-family audience "imagine a tool I built, in your language" — we're showing them "your own docs, in your language." The artifact is now a credible candidate to **drop into fixiproject.org as a multilingual docs landing page**, with one configuration change (swap the 8 fragment URLs for canonical page paths).

This is cheaper than committing to M3 directly:

- M3 as-planned costs ~1-2 weeks (21 locales × 50-entry hand-authoring, full README, npm publish, outreach).
- Soft-launching M2.5 costs ~1 day (GitHub Pages config + a post or two).
- The signal we gather in 1-2 weeks then tells us whether to commit or shelve.

The most concrete soft-launch path: **open a GitHub issue or discussion at `bigskysoftware/the-fixi-project`** showing the live demo and offering to PR a multilingual docs landing page if there's interest. This puts the artifact in front of exactly the right person (Carson Gross), uses fixi's own content as the demonstration, and frames the ask as "would you find this useful?" rather than "please adopt my tool."

If the soft-launch produces "I want to use this" reactions: proceed to M3 with confidence. If it produces silence or "just write English": pivot — possibly to a different home for the multilingual machinery (the original portfolio framing) rather than abandon entirely.

The artifact is real, working, and shippable today. The next investment should be in _measurement_, not more building.

## Appendix: links

- Live demo (when deployed): TBD
- M2.5 plan: [~/.claude/plans/please-research-the-feasibility-curious-crystal.md](../../../.claude/plans/please-research-the-feasibility-curious-crystal.md)
- M3 plan (full launch): [~/.claude/plans/dixi-js-launch.md](../../../.claude/plans/dixi-js-launch.md)
- Demo entry points: [`demo/search/index.en.html`](demo/search/index.en.html) · [`.es`](demo/search/index.es.html) · [`.ja`](demo/search/index.ja.html) · [`.ar`](demo/search/index.ar.html)
- Test: [`test/dixi.spec.mjs`](test/dixi.spec.mjs)
