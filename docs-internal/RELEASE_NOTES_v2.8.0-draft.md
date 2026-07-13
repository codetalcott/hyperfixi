# v2.8.0 release notes — DRAFT

> Prepared 2026-07-13 for the ≈ 2026-07-22 release. On release day, publish.yml
> creates the GitHub release with `--generate-notes`; replace its body with this
> draft via `gh release edit v2.8.0 --notes-file docs-internal/RELEASE_NOTES_v2.8.0-draft.md`
> (drop this header block first), or paste it above the auto-generated PR list.

---

## Highlights

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

The published size figures dated from an earlier, smaller-bundle era and are
now corrected everywhere (README, CLAUDE.md, docs/BROWSER_BUNDLES.md):

| Bundle                         | Actual (gzip) | Previously documented |
| ------------------------------ | ------------- | --------------------- |
| `hyperfixi-lite.js`            | 1.9 KB        | 1.9 KB                |
| `hyperfixi-hybrid-complete.js` | 7.7 KB        | 7.3 KB                |
| `hyperfixi-hx.js`              | 18 KB         | 9.7–13 KB             |
| `hyperfixi-multilingual.js`    | 97 KB         | 64 KB                 |
| `hyperfixi-hx-v4.js`           | ~540 KB       | ~257 KB               |
| `hyperfixi.js` (full)          | ~534 KB       | 203–286 KB            |

The slim bundles (lite / lite-plus / hybrid-complete / hybrid-hx) remain the
recommended starting point, and `@hyperfixi/vite-plugin` still emits the
minimal bundle automatically. An investigation into the full-bundle growth is
queued.

---

_Full changelog: auto-generated PR list below (or
`https://github.com/codetalcott/hyperfixi/compare/v2.7.2...v2.8.0`)._
