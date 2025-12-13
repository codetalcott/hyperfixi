# CLAUDE.md - Semantic Package

This file provides guidance for working with the `@hyperfixi/semantic` package.

## Package Overview

**Semantic-first multilingual parsing** for Hyperscript. This package parses hyperscript commands directly from 13 languages without requiring English translation first.

**730+ tests** | **13 languages** | **45 command schemas**

## Architecture

```
src/
├── tokenizers/           # Language-specific tokenizers (13 languages)
│   ├── english.ts        # SVO word order
│   ├── japanese.ts       # SOV word order
│   ├── arabic.ts         # VSO word order, RTL
│   ├── korean.ts         # SOV + agglutinative
│   ├── turkish.ts        # SOV + vowel harmony
│   ├── chinese.ts        # SVO + classifier particles
│   ├── spanish.ts        # SVO + verb conjugation
│   ├── portuguese.ts     # SVO + verb conjugation
│   ├── french.ts         # SVO + verb conjugation
│   ├── german.ts         # V2 word order
│   ├── indonesian.ts     # SVO + affixation
│   ├── quechua.ts        # SOV + agglutinative (indigenous)
│   ├── swahili.ts        # SVO + noun class system
│   ├── base.ts           # BaseTokenizer class
│   └── morphology/       # Morphological normalizers
│       ├── japanese-normalizer.ts  # Conjugation suffix stripping
│       ├── korean-normalizer.ts
│       ├── spanish-normalizer.ts
│       ├── arabic-normalizer.ts
│       └── turkish-normalizer.ts
│
├── generators/           # Pattern generation from schemas
│   ├── command-schemas.ts      # 45 command definitions
│   ├── language-profiles.ts    # Keywords for 13 languages
│   └── pattern-generator.ts    # Generate patterns from schemas
│
├── parser/               # Semantic parser
│   ├── semantic-parser.ts      # Main parser
│   └── pattern-matcher.ts      # Pattern matching engine
│
├── patterns/             # Hand-crafted patterns (fallback)
│   ├── toggle.ts
│   ├── put.ts
│   └── event-handler.ts
│
├── explicit/             # Explicit syntax (language-agnostic IR)
│   ├── parser.ts         # Parse explicit syntax
│   ├── renderer.ts       # Render to explicit syntax
│   └── converter.ts      # Convert between formats
│
├── types.ts              # Core type definitions
├── browser.ts            # Browser bundle entry point
├── core-bridge.ts        # Integration with @hyperfixi/core
└── index.ts              # Main entry point
```

## Essential Commands

```bash
# Run tests (730+ tests)
npm test --prefix packages/semantic
npm test --prefix packages/semantic -- --run  # Single run (no watch)

# Run specific test file
npm test --prefix packages/semantic -- --run src/tokenizers/japanese.test.ts

# Build
npm run build --prefix packages/semantic
npm run build:browser --prefix packages/semantic  # Browser bundle

# Type checking
npm run typecheck --prefix packages/semantic
```

## Key Concepts

### Word Order Patterns

| Pattern | Languages | Example |
|---------|-----------|---------|
| **SVO** | English, Chinese, Spanish, Portuguese, French, Indonesian, Swahili | `toggle .active on #button` |
| **SOV** | Japanese, Korean, Turkish, Quechua | `#button で .active を トグル` |
| **VSO** | Arabic | `بدّل .active على #button` |
| **V2** | German | `schalte .active auf #button um` |

### Tokenizers vs Normalizers

- **Tokenizers**: Split input into tokens, identify keywords by language
- **Normalizers**: Strip conjugation suffixes to find verb stems (morphological analysis)
  - Japanese: `切り替えて` → `切り替え` (strip て-form)
  - Spanish: `alternando` → `alternar` (strip -ando gerund)

### Semantic Roles

Commands are parsed into semantic roles, not positional arguments:

```typescript
// "put 'hello' into #output"
{
  action: 'put',
  roles: {
    patient: { kind: 'literal', value: 'hello' },    // what to put
    destination: { kind: 'selector', value: '#output' }  // where
  }
}
```

### Confidence Scoring

Each parse result includes a confidence score (0-1):
- `>= 0.7`: High confidence, use semantic result
- `0.5-0.7`: Medium confidence, may need fallback
- `< 0.5`: Low confidence, use traditional parser

## Adding a New Language

1. **Create tokenizer** in `src/tokenizers/{lang}.ts`:
   ```typescript
   export class NewLanguageTokenizer extends BaseTokenizer {
     readonly language = 'xx';
     readonly keywords: KeywordMap = {
       toggle: ['toggle_word', 'synonym'],
       show: ['show_word'],
       // ... all 45 commands
     };
   }
   export const newLanguageTokenizer = new NewLanguageTokenizer();
   ```

2. **Register tokenizer** in `src/tokenizers/index.ts`:
   ```typescript
   import { newLanguageTokenizer } from './new-language';
   tokenizers.set('xx', newLanguageTokenizer);
   export { newLanguageTokenizer } from './new-language';
   ```

3. **Add language profile** in `src/generators/language-profiles.ts`:
   ```typescript
   export const newLanguageProfile: LanguageProfile = {
     code: 'xx',
     name: 'New Language',
     wordOrder: 'SVO', // or SOV, VSO
     keywords: {
       toggle: { primary: 'toggle_word', alternatives: ['synonym'] },
       // ... all commands
     },
   };
   ```

4. **Add morphological normalizer** (if language has verb conjugation) in `src/tokenizers/morphology/`:
   ```typescript
   export class NewLanguageNormalizer implements MorphologicalNormalizer {
     normalize(word: string): NormalizationResult { ... }
   }
   ```

5. **Add tests** in `src/tokenizers/new-language.test.ts`

6. **Update browser exports** in `src/browser.ts`

## Important Files

| File | Purpose |
|------|---------|
| `src/types.ts` | ActionType union (45 actions), SemanticNode types |
| `src/generators/command-schemas.ts` | Schema definitions for all commands |
| `src/generators/language-profiles.ts` | Keyword translations (13 languages) |
| `src/parser/semantic-parser.ts` | Main parsing logic |
| `src/parser/pattern-matcher.ts` | Pattern matching engine |
| `src/tokenizers/base.ts` | BaseTokenizer class |
| `src/core-bridge.ts` | SemanticIntegrationAdapter for core package |

## Browser Usage

```html
<script src="hyperfixi-semantic.browser.global.js"></script>
<script>
  // Parse in any language
  const result = HyperFixiSemantic.parse('toggle .active', 'en');
  const jaResult = HyperFixiSemantic.parse('トグル .active', 'ja');

  // Translate between languages
  const japanese = HyperFixiSemantic.translate(
    'toggle .active on #button',
    'en',
    'ja'
  );

  // Get all translations
  const all = HyperFixiSemantic.getAllTranslations('toggle .active', 'en');
  // Returns: { en: '...', ja: '...', ar: '...', ... }
</script>
```

## Testing Patterns

### Unit Tests (Vitest)
```bash
npm test --prefix packages/semantic -- --run
```

### Browser Tests (Playwright)
Browser tests are in `packages/core/src/compatibility/browser-tests/semantic-multilingual.spec.ts`

```bash
npx playwright test packages/core/src/compatibility/browser-tests/semantic-multilingual.spec.ts
```

### Live Demo
```bash
npx http-server . -p 3000 -c-1
# Open: http://127.0.0.1:3000/examples/multilingual/semantic-demo.html
```

## Integration with Core

The semantic parser integrates with `@hyperfixi/core` via `SemanticIntegrationAdapter`:

```typescript
import { createSemanticAnalyzer } from '@hyperfixi/semantic';

const analyzer = createSemanticAnalyzer();
const result = analyzer.analyze('toggle .active', 'ja');

if (result.confidence >= 0.5) {
  // Use semantic parsing result
} else {
  // Fall back to traditional parser
}
```
