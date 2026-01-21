# CLAUDE.md - i18n Package

This file provides guidance for working with the `@lokascript/i18n` package.

## Package Purpose

Grammar transformation and translation between languages. Transforms existing hyperscript code for display purposes (documentation, tutorials).

**i18n vs Semantic:**

- **@lokascript/semantic**: Parse code written in any language → execute
- **@lokascript/i18n**: Transform/translate code between languages for display

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
├── grammar/            # Word order transformation
│   ├── profiles/       # Language profiles (word order, markers)
│   ├── transformer.ts  # GrammarTransformer class
│   └── types.ts        # Semantic roles, joinTokens
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
5. Add tests in `src/grammar/grammar.test.ts`

## Important Files

| File                            | Purpose                     |
| ------------------------------- | --------------------------- |
| `src/grammar/transformer.ts`    | GrammarTransformer class    |
| `src/grammar/profiles/index.ts` | Language profile registry   |
| `src/dictionaries/*.ts`         | Keyword translations        |
| `src/translator.ts`             | HyperscriptTranslator class |
| `src/browser.ts`                | Browser bundle exports      |

## Testing

```bash
# All tests
npm test --prefix packages/i18n

# Grammar transformation tests
npm test --prefix packages/i18n -- --run src/grammar/grammar.test.ts

# Translation tests
npm test --prefix packages/i18n -- --run src/translator.test.ts
```

## Browser Bundle

Output: `dist/lokascript-i18n.min.js` (68 KB)
Global: `window.LokaScriptI18n`

```html
<script src="lokascript-i18n.min.js"></script>
<script>
  const result = LokaScriptI18n.translate('on click toggle .active', 'en', 'ja');
</script>
```
