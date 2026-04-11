# Phase 0 — Cross-language LSE equivalence verification

**Date:** 2026-04-10
**Status:** ✓ PASSED — all 5 target languages produce structurally identical protocol JSON

## Purpose

Before building the multilingual demo page, verify that the semantic parser actually produces the same canonical LSE for the same toggle behavior expressed in English, Japanese, Arabic, Spanish, and Korean. The test-suite `language-matrix.test.ts` asserts that `node.action` normalizes, but it does NOT assert that `node.roles` come out structurally equivalent. Without that verification, the whole demo story ("same LSE from 5 languages") could be false.

## Method

Parsed one canonical toggle-on-click phrase per language using `@lokascript/semantic`'s `parse(input, language)` function, then serialized via `@lokascript/intent`'s `toProtocolJSON` and compared the normalized JSON output side-by-side.

**Normalization rules** (stripped before comparison):

- `metadata.*` fields (sourceLanguage, sourceText, confidence, patternId — expected to legitimately differ)
- `selectorKind` on selector values (tokenizer sometimes infers it, sometimes not)
- `diagnostics` array (carries language-specific pattern names like `toggle-event-es-vso`)
- Object key order (so `{patient, destination}` equals `{destination, patient}`)

## Input phrases

Drawn verbatim from `packages/semantic/test/language-coverage/test-cases.ts` (the canonical cross-language fixture set). These are the phrases the existing 1240+ test suite has already validated against each language's tokenizer.

| Language | Code | Source fixture                     | Phrase                                       |
| -------- | ---- | ---------------------------------- | -------------------------------------------- |
| English  | `en` | `toggle-on-click` line 350         | `on click toggle .active on #button`         |
| Japanese | `ja` | `toggle-on-click` line 327         | `クリック で #button の .active を 切り替え` |
| Arabic   | `ar` | `toggle-with-destination` line 605 | `عند النقر بدّل .active على #button`         |
| Spanish  | `es` | `toggle-on-click` line 337         | `al clic alternar .active en #button`        |
| Korean   | `ko` | `toggle-on-click` line 328         | `클릭 할 때 #button 의 .active 를 토글`      |

### Note on Arabic phrase selection

The `toggle-on-click` fixture has Arabic as `عند النقر على #button بدّل .active` (line 330) — destination fronted before the verb. This particular word order causes the current Arabic tokenizer to **misparse**: it emits `{action: "on", patient: "#button", destination: "me"}`, dropping `.active` entirely. This looks like a real parser bug, but it's out of scope for this demo.

The `toggle-with-destination` fixture (line 605) uses `عند النقر بدّل .active على #button` — destination after the patient, matching the English pattern — and parses correctly. We use line 605 for the demo and leave the line 330 variant as a known issue for future parser work.

## Result

All 5 languages produce **structurally identical** protocol JSON after normalization:

```json
{
  "action": "on",
  "body": [
    {
      "action": "toggle",
      "kind": "command",
      "roles": {
        "destination": { "type": "selector", "value": "#button" },
        "patient": { "type": "selector", "value": ".active" }
      }
    }
  ],
  "kind": "event-handler",
  "roles": {
    "event": { "type": "literal", "value": "click" }
  }
}
```

| Language | Parse OK | Normalized matches en |
| -------- | -------- | --------------------- |
| en       | ✓        | — (reference)         |
| ja       | ✓        | ✓                     |
| ar       | ✓        | ✓                     |
| es       | ✓        | ✓                     |
| ko       | ✓        | ✓                     |

**Summary: 5/5 parse, 5/5 equivalent.**

## Findings relevant to the demo

1. **The core story holds.** Five languages with three different word orders (SVO: en/es, SOV: ja/ko, VSO: ar) all normalize to the same canonical LSE. This is the demo's central claim and it's true.

2. **Raw output still carries per-language metadata.** The diagnostics field includes the pattern name (`toggle-event-en-svo`, `toggle-event-ja-sov`, etc.). For the demo page, we may want to either (a) hide diagnostics in the "output" view or (b) show them as a "which pattern matched?" subtle annotation — could be an interesting visual to show the parser routing through different patterns to reach the same output.

3. **The Arabic tokenizer has a known word-order sensitivity.** The simpler/more idiomatic `toggle-on-click` phrasing fronts the destination and drops the patient. The `toggle-with-destination` phrasing works. For the demo, we use the working phrasing. Filing a mental note for future parser work.

4. **Order of roles in the output isn't stable.** Some languages emit `patient` first, others `destination` first. This doesn't affect correctness but it means consumers who care about ordering should sort keys. The `<lse-intent>` runtime doesn't care.

5. **`selectorKind` is inferred inconsistently.** English and Arabic got `selectorKind: 'class'` / `'id'`; some others did not. This is a minor tokenizer inconsistency, not a blocker.

## Conclusion

**Phase 1 is green-lit.** Proceed with the demo implementation using the 5 phrases listed above.
