# v2.8.0 release notes — DRAFT

> Prepared 2026-07-13 for the ≈ 2026-07-22 release. On release day, publish.yml
> creates the GitHub release with `--generate-notes`; replace its body with this
> draft via `gh release edit v2.8.0 --notes-file docs-internal/RELEASE_NOTES_v2.8.0-draft.md`
> (drop this header block first), or paste it above the auto-generated PR list.

---

## Highlights

### Full bundles cut nearly in half (~534 → ~309 KB gz)

Since 2.7.0 the full bundles had been shipping **two copies of the core runtime
and multilingual parser**: the bundled reactivity/realtime plugins resolved
`@hyperfixi/core` to its prebuilt library dist (which embeds a second copy of
`@lokascript/semantic`) alongside the bundle's own source graph. A rollup alias
now folds everything onto one graph:

- `hyperfixi.js`: ~534 → **~309 KB gz**
- `hyperfixi-hx-v4.js`: ~540 → **~321 KB gz**

(Re-measured 2026-07-20 on the release tree: the ~10 KB over the July-14 dedupe
figures is semantic-content growth from the pick-text-range/vocab arcs, single-copy
verified.)

Same features, same pre-installed plugins (verified by the plugin-install,
reactive-features, and full bundle-compatibility suites). CI size ceilings are
ratcheted down to catch any re-duplication.

### `fetch … with { … }` options in all 24 languages (#662)

`fetch` request options — braced bodies and naked named-arg forms (`method:`,
`headers:`, `body:`, …) — are now captured by the semantic parser in every
supported language. Previously the options clause was silently dropped in most
non-English languages (78 residual coverage firings, now 0), so a translated
`fetch` compiled but issued a bare GET. ~100 new locked tests.

### Event modifiers in all 24 languages (#673)

Event-modifier phrases — `once`, `debounce(N)`, `throttle(N)` and their
translated forms — now flow from every language's event-handler head to the
runtime (69 residual firings → 0). Handler heads like
`on click debounced at 500ms` (and the SOV/VSO equivalents) behave identically
in all 24 languages.

### "Unknown command: compound" fixed on semantic-path bundles (#675)

Multi-command handler bodies could throw `Unknown command: compound` at runtime
on the full bundle (`hyperfixi.js`, `hyperfixi-hx-v4.js`) — core's per-segment
semantic adapter surfaced a compound parse as a single command literally named
`compound`. The adapter now defers non-command parses to the traditional
parser. Surfaced by the first honest run of the bundle-compatibility suite;
the gallery fetch-data example now passes on all 8 bundles with real
assertions.

## Correctness & validation

- **Vocab consistency gate in CI** — cross-surface dictionary/profile/renderer
  disagreements are now validated in CI: 0 unwaived, every waiver probe-cited.
- **Input coverage is total** — every semantic `parseInternal` stage is
  instrumented (`--diagnose-coverage`); all residual firings are attributed to
  named families. A pattern can no longer score confidence 1.0 while silently
  dropping a trailing clause without that being measured.
- **Fidelity floors held** — the eight-signal multilingual ratchet
  (parse-rate, degenerate, R0-recall, R0-precision, multiset-recall, R1 roles,
  R2 execution, R3 values) holds the 2026-07-11 high-water marks: fidelity
  1.000 on all 3,696 corpus rows across 24 languages, avgRoleFidelity ≈ 0.992,
  avgValueRecall ≈ 0.997.

## Publish-pipeline hardening

- Reproducible installs in the publish workflow (`npm ci` + lockfile sync,
  #672).
- `pre-publish-check` is now an honest gate (#674): `set -o pipefail` on
  tee-masked steps, real exit codes end-to-end, export validation after bundle
  builds, complete BUILD_ORDER (including private deps), and a final verdict
  step that always runs. Size limits reset to measured reality as
  anti-regression ceilings.
- Version bumps land on `main` via a release token with PR fallback (#674).

## Documented bundle sizes now match reality

Every size figure is re-measured on the release artifacts (README, CLAUDE.md,
docs/BROWSER_BUNDLES.md); the full-bundle numbers reflect the dedupe above:

| Bundle                         | Actual (gzip) | 2.7.x         |
| ------------------------------ | ------------- | ------------- |
| `hyperfixi-lite.js`            | 1.9 KB        | 1.9 KB        |
| `hyperfixi-hybrid-complete.js` | 7.7 KB        | 7.7 KB        |
| `hyperfixi-hx.js`              | 18 KB         | 18 KB         |
| `hyperfixi-multilingual.js`    | 97 KB         | 97 KB         |
| `hyperfixi-hx-v4.js`           | **~321 KB**   | ~540 KB       |
| `hyperfixi.js` (full)          | **~309 KB**   | ~534 KB       |

The slim bundles (lite / lite-plus / hybrid-complete / hybrid-hx) remain the
recommended starting point, and `@hyperfixi/vite-plugin` still emits the
minimal bundle automatically.

## Multilingual correctness fixes

- **`go to url "/page"` no longer drops the URL** (#680) — the destination was
  silently lost in every language (the English reference itself was affected,
  which masked it); navigation now receives the real URL in all 24 languages.
- **Broken event listeners fixed in six languages** (#681) — the de/fr/id/it/
  pl/zh dictionaries rendered `mousedown`/`mouseup` as words the parser could
  not resolve (a listener that never fires — id even bound `keydown`). A new
  V3c vocabulary check now verifies every dictionary event word round-trips on
  the parse side.

---

_Full changelog: auto-generated PR list below (or
`https://github.com/codetalcott/hyperfixi/compare/v2.7.2...v2.8.0`)._
