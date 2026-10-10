# Multilingual Testing Framework

Automated validation system for HyperFixi's multilingual hyperscript support across 13 languages.

## Overview

This framework validates the multilingual system by:

- Loading patterns from the patterns-reference database (689 translations)
- Building or selecting appropriate language bundles
- Validating parsing across all languages
- Tracking bundle sizes and performance
- Comparing against baselines for regression detection

## Quick Start

```bash
# Test all languages in quick mode (10 patterns/language)
npm run test:multilingual

# Test specific language with verbose output
npm run test:multilingual -- --language ja --verbose

# Test multiple languages in full mode
npm run test:multilingual -- --languages ja,ko,es --full

# Compare against baseline
npm run test:multilingual -- --regression

# Save current results as new baseline
npm run test:multilingual -- --save-baseline
```

## Architecture

```
multilingual/
├── cli.ts                    # Command-line interface
├── orchestrator.ts           # Main test runner
├── types.ts                  # TypeScript types
├── pattern-loader.ts         # Database query layer
├── bundle-builder.ts         # Bundle selection/generation
├── validators/
│   ├── parse-validator.ts    # Parse validation
│   └── size-validator.ts     # Bundle size validation
└── reporters/
    ├── console-reporter.ts   # Minimal console output
    ├── json-reporter.ts      # Structured JSON results
    └── regression-reporter.ts # Baseline comparison
```

## Test Flow

1. **Load Configuration** - Parse CLI arguments
2. **Load Patterns** - Query patterns-reference database
3. **Select/Build Bundle** - Find or generate appropriate bundle
4. **Validate Parsing** - Test each pattern with semantic parser
5. **Report Results** - Output to console, JSON, and regression reports

## CLI Options

### Language Selection

```bash
-l, --language <code>        # Test specific language (en, ja, es, etc.)
--languages <codes>          # Test multiple languages (comma-separated)
```

### Bundle Options

```bash
-b, --bundle <name>          # Use specific bundle
--build                      # Build bundle before testing
```

### Test Modes

```bash
-m, --mode <mode>            # 'quick' or 'full' (default: quick)
--quick                      # Quick mode (10 patterns per language)
--full                       # Full mode (all patterns)
--limit <n>                  # Patterns per language in quick mode
```

### Output Options

```bash
-v, --verbose                # Enable verbose output
-r, --regression             # Compare to baseline
--save-baseline              # Save results as new baseline
```

### Filtering

```bash
-c, --confidence <n>         # Minimum confidence threshold (0-1)
--verified-only              # Only test verified translations
--categories <cats>          # Filter by categories (comma-separated)
```

## Examples

### Test Japanese with verbose output

```bash
npm run test:multilingual -- --language ja --verbose
```

Expected output:

```
Multilingual Test Runner v1.0.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Languages: ja (1)
Mode: quick mode (10 patterns/lang)

  ✓ JA: 53/53 (100%)  ⏱  0.8s  conf: 0.92

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary: ✓ PASS  53/53  Duration: 0.9s
```

### Test all priority languages

```bash
npm run test:multilingual -- --languages en,ja,ko,es --full
```

### Run regression test

```bash
npm run test:multilingual -- --regression
```

Expected regression output:

```
Regression Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ EN
  Parse Rate: +2.1%
  New Successes: 2

↑ JA
  Parse Rate: +5.3%
  Avg Confidence: +0.04
  New Successes: 3
```

### Save new baseline

```bash
npm run test:multilingual -- --full --save-baseline
```

## Programmatic Usage

```typescript
import { runMultilingualTests } from '@hyperfixi/testing-framework/multilingual';

const results = await runMultilingualTests({
  languages: ['ja', 'ko'],
  mode: 'full',
  regression: true,
});

console.log(`Tested ${results.summary.totalPatterns} patterns`);
console.log(
  `Success rate: ${((results.summary.totalSuccess / results.summary.totalPatterns) * 100).toFixed(1)}%`
);
```

## Output Files

### JSON Results

Location: `./test-results/results.json`

Structure:

```json
{
  "timestamp": "2026-01-17T10:30:00Z",
  "commit": "614da020",
  "languageResults": [
    {
      "language": "ja",
      "parseSuccess": 53,
      "parseFailure": 0,
      "parseRate": 1.0,
      "avgConfidence": 0.92
    }
  ],
  "bundles": {
    "browser-ja": {
      "size": 20480,
      "languages": ["ja"]
    }
  }
}
```

### Baseline

Location: `./test-results/baseline.json`

Structure:

```json
{
  "timestamp": "2026-01-17T10:00:00Z",
  "commit": "614da020",
  "languages": {
    "ja": {
      "parseSuccess": 51,
      "parseFailure": 2,
      "parseRate": 0.96,
      "avgConfidence": 0.88
    }
  }
}
```

## Supported Languages

| Code | Language   | Word Order | Status             |
| ---- | ---------- | ---------- | ------------------ |
| en   | English    | SVO        | ✅ High coverage   |
| ja   | Japanese   | SOV        | ✅ High coverage   |
| ko   | Korean     | SOV        | ✅ High coverage   |
| es   | Spanish    | SVO        | ✅ High coverage   |
| zh   | Chinese    | SVO        | ✅ High coverage   |
| ar   | Arabic     | VSO        | ✅ High coverage   |
| pt   | Portuguese | SVO        | ✅ Medium coverage |
| tr   | Turkish    | SOV        | ✅ Medium coverage |
| de   | German     | V2         | ✅ Medium coverage |
| fr   | French     | SVO        | ✅ Medium coverage |
| id   | Indonesian | SVO        | ✅ Medium coverage |
| qu   | Quechua    | SOV        | ⚠️ Low coverage    |
| sw   | Swahili    | SVO        | ⚠️ Low coverage    |

## Integration with CI

Add to `.github/workflows/test.yml`:

```yaml
- name: Run Multilingual Tests
  run: |
    npm run test:multilingual -- --full --regression
```

## Value matrix

`value-matrix.ts` generates every value shape and runs it: nine operand kinds
(literal, variable, selector, possessive, `of`, dotted, call, array, parens), the
operators, and five positions (`put` and `set` values, `if` and `repeat while`
conditions, `increment … by`). Each cell's English runs on the real
`hyperscript.org` engine, which is the oracle, and then in 49 lanes:

| Lane      | What runs                                                                    |
| --------- | ---------------------------------------------------------------------------- |
| `en`      | hyperfixi's English path (core's parser and runtime)                         |
| `en-rt`   | semantic's English parse, rendered back to English, on upstream              |
| `eng`     | the English source on `@hyperfixi/engine`                                    |
| `<L>/up`  | each of 23 languages, through `@lokascript/hyperscript-adapter`, on upstream |
| `<L>/eng` | the same adapter English on `@hyperfixi/engine`                              |

The `<L>` lane (each language on core's direct path) retired in Phase C2 of the
engine cutover, when text became the multilingual interchange; no cell failed
`<L>/eng` while passing `<L>`.

`baselines/value-matrix.json` lists every failing (cell, lane) pair; `*up` and
`*eng` stand for all 23 lanes of each. The gate runs in fifteen shards,
`value-matrix.<position>.test.ts`, and fails on a failing pair the baseline does not
list and on a listed pair that passes, so the list only shrinks.

Every run starts from a fresh fixture and fresh globals, hyperfixi's own global
variables included, and a body a lane removed is rebuilt. Otherwise one lane that
writes a global (`increment n`) or removes the body would fail every run after it;
`value-matrix.isolation.test.ts` pins both.

```bash
# After a fix: prune the pairs that pass now (refuses to add new ones)
npx tsx tools/regen-value-matrix-baseline.ts

# The burn-down: failing pairs by family, position, operand kind, operator, lane
npx tsx tools/regen-value-matrix-baseline.ts --report

# Raw results of every lane, for triage
npx tsx tools/regen-value-matrix-baseline.ts --dry-run --results /tmp/matrix.json
```

A lane that fails in `en-rt` fails in nearly every translation: semantic's English
parse lost the value, and every translation is rendered from it. Fix that first.

## English left in a translation

Every gate above asks whether a translation means what the source means; none asks
whether it reads as the language. `english-leaks.ts` counts, in each render, three kinds
of finding:

| Finding                             | What it is                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `<word>`                            | an English word the engine reads as grammar in the source, written in English             |
| `event:<name>`                      | an English event name where the language's lexicon has a word and the renderer may use it |
| `case:me`                           | the nominative `me` beside a role marker, in the 13 languages where that form is wrong    |
| `case:it`                           | the nominative `it` beside a role marker that wants another form (`CASE_RULES`)           |
| `case:me-object` / `case:it-object` | the nominative pronoun as a command's unmarked object, where that form is wrong           |

"Grammar" is derived per source: the tokens the engine's own parser matched as words, plus
the references in its parse. A word the language spells the same (es `a`, de `in`) and a
name spelled like a keyword are never counted; strings, `js` blocks and brace interiors
are not read. The report splits each word by context (`clause`: in a clause semantic keeps
as written; `bracket`, `call`, `property`, `plain`) and by whether the language has its own
word for it.

Two halves, each with a shrink-only baseline: `baselines/english-leaks.corpus.json` (every
non-markup corpus row, `render(parse(en), L)`; in `test:canonical`, after `populate`) and
`baselines/english-leaks.shapes.json` (the renders the command-shape shards already make).

```bash
# The burn-down: per language, per word (with contexts), per event
npx tsx tools/regen-english-leaks-baseline.ts --report

# After a fix: prune the findings that are gone (refuses to add new ones)
npx tsx tools/regen-english-leaks-baseline.ts            # both halves (corpus needs a fresh populate)
npx tsx tools/regen-english-leaks-baseline.ts --shapes   # one half
```

## Direct-path shapes on the text path

Core's `src/multilingual/*-direct-path.test.ts` files pin shapes core's direct path ran
(an English source rendered into 23 languages, compiled with `{ language }` on core,
installed in a fixture, triggered). That path retires with core's parser, so
`direct-path-shapes.ts` runs the same 287 cases — extracted once into
`direct-path-shapes.cases.json` — the way a page now runs a translation: the foreign
text as written on `@hyperfixi/engine` with the adapter's plugin and `lang` on `<html>`.
Upstream running the English is the oracle; where upstream rejects a core-only English
source, upstream running the adapter's English is. Signatures are the body diff (text
nodes normalized) plus a log of `fetch` / `history` / `window.open` / `scrollIntoView`
calls. `KNOWN` lists the 4 failing cases with their reasons and only shrinks; the gate
runs in three shards, `direct-path-shapes.<n>.test.ts`.

## Troubleshooting

### Bundle not found

If you see "Bundle not found", build it first:

```bash
npm run test:multilingual -- --build --language ja
```

### Patterns database not populated

Ensure the patterns database is populated:

```bash
cd packages/patterns-reference
npm run populate
```

### Low confidence scores

Enable verbose mode to see which patterns are failing:

```bash
npm run test:multilingual -- --verbose --language ja
```

## Future Enhancements

- [ ] Browser execution tests (Playwright)
- [ ] Performance benchmarks
- [ ] Visual regression for multilingual examples
- [ ] Auto-fix suggestions for common translation errors
- [ ] Coverage heatmap visualization

## Contributing

When adding a new language:

1. Add patterns to patterns-reference database
2. Generate translations with `npm run populate`
3. Run tests: `npm run test:multilingual -- --language <code>`
4. Save baseline: `npm run test:multilingual -- --language <code> --save-baseline`
