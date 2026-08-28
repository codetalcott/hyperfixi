# CLAUDE.md - i18n Package

This file provides guidance for working with the `@lokascript/i18n` package.

## Package Purpose

Per-language **vocabulary and keyword providers**: the dictionaries that let the
parser recognise hyperscript written in 23 languages, plus the grammar
**profiles** (word order, role markers) that describe each one.

**It no longer translates.** `grammar/transformer.ts` — `GrammarTransformer`,
`translate`, `toLocale`, `toEnglish`, `parseStatement` — was retired 2026-08-28.
Every consumer moved to `@lokascript/semantic`, which is what the 3,657-row
corpus is written by and what every runtime surface already called. The measured
reason: on an `en → L → en'` round trip validated against the real
`hyperscript.org` parser, the transformer scored **4/24** where semantic scores
**24/24** (and 30/30 byte-exact).

**i18n vs Semantic, now:**

- **@lokascript/semantic**: parse code written in any language → execute, and
  render/translate between languages
- **@lokascript/i18n**: the words — dictionaries, keyword providers, locale
  manager, grammar profiles, direct mappings

## Essential Commands

```bash
# Run tests
npm test --prefix packages/i18n

# Build browser bundle
npm run build:browser --prefix packages/i18n

# TypeScript validation
npm run typecheck --prefix packages/i18n
```

## Architecture

```
src/
├── dictionaries/       # Language keyword translations (23 languages)
│   ├── en.ts          # English (base)
│   ├── ja.ts          # Japanese
│   ├── ko.ts          # Korean
│   └── ...
├── grammar/            # Word-order DESCRIPTION (no transformer since 2026-08-28)
│   ├── profiles/       # Language profiles (word order, markers)
│   ├── direct-mappings.ts # Direct language-pair word maps (browser API)
│   └── types.ts        # Semantic roles, reorderRoles/insertMarkers/joinTokens
├── parser/             # Language-specific keyword providers
│   ├── locale-manager.ts
│   └── {lang}.ts       # Per-language providers
├── plugins/            # Build tool integration
│   ├── vite.ts
│   └── webpack.ts
└── browser.ts          # Browser bundle entry
```

## Key Concepts

### Word Order Transformation

- **SVO** (Subject-Verb-Object): English, Chinese, Spanish
- **SOV** (Subject-Object-Verb): Japanese, Korean, Turkish
- **VSO** (Verb-Subject-Object): Arabic

Example: `on click toggle .active`

- English (SVO): `on click toggle .active`
- Japanese (SOV): `クリック で .active を トグル`
- Arabic (VSO): `زِد #count عند النقر`

### Semantic Roles

Commands have semantic roles (agent, patient, destination, etc.) that get reordered based on target language grammar.

## Adding a New Language

1. Create dictionary: `src/dictionaries/{code}.ts`
2. Add grammar profile: `src/grammar/profiles/{code}.ts` (if custom word order needed)
3. Create keyword provider: `src/parser/{code}.ts`
4. Export from `src/browser.ts`
5. Add tests in `src/grammar/profiles.test.ts`

## Important Files

| File                            | Purpose                     |
| ------------------------------- | --------------------------- |
| `src/grammar/profiles/index.ts` | Language profile registry   |
| `src/dictionaries/*.ts`         | Keyword translations        |
| `src/translator.ts`             | HyperscriptTranslator class |
| `src/browser.ts`                | Browser bundle exports      |

## Testing

```bash
# All tests
npm test --prefix packages/i18n

# Grammar profile / role-helper tests
npm test --prefix packages/i18n -- --run src/grammar/profiles.test.ts

# Translation tests
npm test --prefix packages/i18n -- --run src/translator.test.ts
```

## Browser Bundle

Output: `dist/lokascript-i18n.min.js` — measured 2026-08-28 at **154.0 KB raw /
38.7 KB gzipped**, down from 176.6 / 45.1 when the grammar transformer left
(−14%). (The figure here previously read "68 KB", unqualified and unverified.)
Global: `window.LokaScriptI18n`

```html
<script src="lokascript-i18n.min.js"></script>
<script>
  // Vocabulary and profiles. `LokaScriptI18n.translate` is GONE — for
  // translation, pair hyperfixi-multilingual.js with a semantic bundle and call
  // `hyperfixi.translate(code, from, to)`.
  const profile = LokaScriptI18n.getProfile('ja'); // { wordOrder: 'SOV', … }
</script>
```
