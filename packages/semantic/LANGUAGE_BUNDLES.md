# Language Bundle Status

## Overview

LokaScript Semantic provides single-language bundles for optimal bundle sizes. Each bundle contains only the tokenizer and patterns for one language, resulting in minimal file sizes (~14-20 KB gzipped).

## Available Single-Language Bundles

Every bundle except `core` and `lazy` also registers English (about 2 KB gzipped). English is the
render target: `@lokascript/hyperscript-adapter` translates a parse with `render(node, 'en')`,
because English is what `hyperfixi-hs.js` and `_hyperscript` read. Every bundle also exports
`translate`.

| Language   | Code | Bundle File               | Size   | Global Name            | Status   |
| ---------- | ---- | ------------------------- | ------ | ---------------------- | -------- |
| English    | en   | `browser-en.en.global.js` | ~94 KB | `LokaScriptSemanticEn` | ✅ Ready |
| Spanish    | es   | `browser-es.es.global.js` | ~71 KB | `LokaScriptSemanticEs` | ✅ Ready |
| French     | fr   | `browser-fr.fr.global.js` | ~64 KB | `LokaScriptSemanticFr` | ✅ Ready |
| German     | de   | `browser-de.de.global.js` | ~64 KB | `LokaScriptSemanticDe` | ✅ Ready |
| Portuguese | pt   | `browser-pt.pt.global.js` | ~63 KB | `LokaScriptSemanticPt` | ✅ Ready |
| Japanese   | ja   | `browser-ja.ja.global.js` | ~73 KB | `LokaScriptSemanticJa` | ✅ Ready |
| Korean     | ko   | `browser-ko.ko.global.js` | ~79 KB | `LokaScriptSemanticKo` | ✅ Ready |
| Chinese    | zh   | `browser-zh.zh.global.js` | ~65 KB | `LokaScriptSemanticZh` | ✅ Ready |
| Arabic     | ar   | `browser-ar.ar.global.js` | ~75 KB | `LokaScriptSemanticAr` | ✅ Ready |
| Turkish    | tr   | `browser-tr.tr.global.js` | ~80 KB | `LokaScriptSemanticTr` | ✅ Ready |
| Indonesian | id   | `browser-id.id.global.js` | ~63 KB | `LokaScriptSemanticId` | ✅ Ready |
| Quechua    | qu   | `browser-qu.qu.global.js` | ~63 KB | `LokaScriptSemanticQu` | ✅ Ready |
| Swahili    | sw   | `browser-sw.sw.global.js` | ~62 KB | `LokaScriptSemanticSw` | ✅ Ready |

## Multi-Language Bundles

| Bundle             | Code       | Languages           | Size    | Global Name                   |
| ------------------ | ---------- | ------------------- | ------- | ----------------------------- |
| Spanish + English  | es-en      | en, es              | ~110 KB | `LokaScriptSemanticEsEn`      |
| English + Turkish  | en-tr      | en, tr              | ~119 KB | `LokaScriptSemanticEnTr`      |
| Western            | western    | en, es, pt, fr, de  | ~135 KB | `LokaScriptSemanticWestern`   |
| East Asian         | east-asian | ja, zh, ko          | ~106 KB | `LokaScriptSemanticEastAsian` |
| Priority (11 lang) | priority   | 11 most common      | ~238 KB | `LokaScriptSemanticPriority`  |
| Full (all 23)      | browser    | All 23 languages    | ~635 KB | `LokaScriptSemantic`          |
| Lazy Loading       | lazy       | On-demand           | ~633 KB | `LokaScriptSemanticLazy`      |
| Core (CDN-ready)   | core       | None (load via CDN) | ~55 KB  | `LokaScriptSemanticCore`      |

## Usage Examples

### Turkish Bundle

```html
<script src="node_modules/@lokascript/semantic/dist/browser-tr.tr.global.js"></script>
<script>
  const { parse, canParse } = LokaScriptSemanticTr;

  // Parse Turkish hyperscript
  const result = parse('toggle .active', 'tr');
  console.log(result);

  // Check if Turkish is supported
  console.log(canParse('tr')); // true
  console.log(canParse('en')); // false (not in this bundle)
</script>
```

### French Bundle

```html
<script src="node_modules/@lokascript/semantic/dist/browser-fr.fr.global.js"></script>
<script>
  const { parse, getSupportedLanguages } = LokaScriptSemanticFr;

  // Parse French hyperscript
  const result = parse('toggle .active', 'fr');

  // Get supported languages
  console.log(getSupportedLanguages()); // ['fr']
</script>
```

### Korean Bundle

```html
<script src="node_modules/@lokascript/semantic/dist/browser-ko.ko.global.js"></script>
<script>
  const { parse, tokenize } = LokaScriptSemanticKo;

  // Parse Korean hyperscript
  const result = parse('toggle .active', 'ko');

  // Tokenize Korean input
  const tokens = tokenize('toggle .active', 'ko');
  console.log(tokens);
</script>
```

## Bundle Selection Guide

Choose the smallest bundle that covers your target languages:

1. **Single language** (~14-20 KB gzipped): Use if your app only needs one language
   - Example: French-only app → `browser-fr.fr.global.js` (64 KB)

2. **Two languages** (~25 KB gzipped): Use predefined pairs or create custom
   - Example: Bilingual ES/EN app → `browser-es-en.es-en.global.js` (110 KB)

3. **Regional bundle** (~30-48 KB gzipped): Use for regional markets
   - Example: European app → `browser-western.western.global.js` (135 KB)
   - Example: East Asian app → `browser-east-asian.east-asian.global.js` (106 KB)

4. **Priority languages** (~48 KB gzipped): 11 most common languages
   - Use for international apps with broad language support

5. **Full bundle** (~61 KB gzipped): All 23 languages
   - Use when you need maximum language coverage

## Generating Custom Bundles

You can generate custom language bundles with the languages you need:

```bash
# Generate Spanish + French bundle
npm run generate:bundle -- es fr

# Generate East Asian languages
npm run generate:bundle -- ja ko zh

# Estimate size before generating
npm run estimate:bundle -- tr de pt
```

## Testing Bundles

A test page is available at `packages/semantic/test-bundles.html` to verify:

- Global names are correct (LokaScript prefix)
- Bundles load properly
- Parse functionality works
- Supported languages are correct

Open the test page in a browser to run automated tests.

## Recent Updates (2026-01-19)

✅ **Rebrand Complete**: All bundles updated from HyperFixi → LokaScript

- Global names: `HyperFixiSemantic*` → `LokaScriptSemantic*`
- File naming: `hyperfixi-semantic.*` → `lokascript-semantic.*` (coming in v1.1.0)
- Source comments updated
- Documentation updated

✅ **Turkish, French, Korean bundles verified**:

- All three bundles built and tested
- Correct global names (LokaScriptSemanticTr, LokaScriptSemanticFr, LokaScriptSemanticKo)
- Bundle sizes optimized (~64-80 KB minified)
- Ready for public release

## NPM Publication

These bundles are included in the `@lokascript/semantic` npm package:

```bash
npm install @lokascript/semantic
```

All bundles are available in the `dist/` directory:

```
node_modules/@lokascript/semantic/
└── dist/
    ├── browser-tr.tr.global.js    # Turkish
    ├── browser-fr.fr.global.js    # French
    ├── browser-ko.ko.global.js    # Korean
    └── ... (17 more bundles)
```

## Browser Support

All bundles target ES2020 and work in:

- Chrome 80+
- Firefox 74+
- Safari 13.1+
- Edge 80+

## API Reference

Each single-language bundle exports:

```typescript
// Parsing
export function parse(input: string, language: string): SemanticNode;
export function canParse(language: string): boolean;

// Tokenization
export function tokenize(input: string, language: string): LanguageToken[];

// Language info
export function getSupportedLanguages(): string[];
export function getProfile(language: string): LanguageProfile;

// AST building
export function buildAST(node: SemanticNode): CommandNode;

// Explicit syntax
export function parseExplicit(input: string): SemanticNode;
export function renderExplicit(node: SemanticNode): string;

// Version
export const VERSION: string; // e.g., "1.0.0-tr"
```

---

**Last Updated**: 2026-01-19
**Package Version**: 1.0.0
**Status**: ✅ All bundles ready for publication
