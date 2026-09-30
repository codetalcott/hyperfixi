# @lokascript/i18n

Comprehensive internationalization (i18n) support for LokaScript and \_hyperscript applications.

> **This package no longer translates code.** Its grammar transformer was retired on 2026-08-28 (#1001). To translate hyperscript between languages, use [`@lokascript/semantic`](https://www.npmjs.com/package/@lokascript/semantic): `translate(code, from, to)` or `render(parse(code, from), to)`. `@lokascript/i18n` provides the per-language vocabulary — dictionaries, keyword providers, locale utilities and word-order profiles.

## Installation

```bash
npm install @lokascript/i18n
```

## Features

- **🌍 Multi-language Support**: Built-in dictionaries for 24 languages (Arabic, Bengali, Chinese, English, French, German, Hebrew, Hindi, Indonesian, Italian, Japanese, Korean, Malay, Polish, Portuguese, Quechua, Russian, Spanish, Swahili, Tagalog, Thai, Turkish, Ukrainian, Vietnamese)
- **🔄 Runtime Locale Switching**: Dynamic language switching in browser environments with automatic detection
- **⚡ SSR Integration**: Server-side rendering with locale detection, SEO optimization, and hydration support
- **📊 Pluralization**: CLDR-compliant pluralization rules for complex languages (Russian, Arabic, etc.)
- **💰 Formatting**: Locale-aware number, date, currency, and unit formatting with fallbacks
- **🛠️ Build Tool Integration**: Vite and Webpack plugins for build-time keyword substitution
- **🔍 Language Detection**: Automatically detect the language of hyperscript code from content
- **✅ Validation**: Comprehensive dictionary validation with coverage reports and warnings
- **🎯 Type Safety**: Full TypeScript support with comprehensive type definitions
- **⚡ Performance**: Caching, lazy loading, and optimized translation algorithms
- **📱 Browser Support**: Modern APIs with graceful fallbacks for legacy environments

## When to Use i18n vs Semantic

LokaScript has two packages for multilingual support with different purposes:

| Package                  | Purpose                                                            | Use Case                                                                 |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| **@lokascript/semantic** | Parse code written in any language → execute; translate it         | Users **write** hyperscript in their native language; **translate** code |
| **@lokascript/i18n**     | Per-language vocabulary: dictionaries, keyword providers, profiles | Tools and runtimes that need the **words** of each language              |

**Use @lokascript/semantic** when your users will write hyperscript in their native language. It parses multilingual input directly into executable AST nodes with native idiom support (e.g., Japanese conditionals like `クリックしたら`).

**Use @lokascript/semantic** too when you need to translate code examples between languages for documentation, tutorials, or teaching materials. It parses the code and renders it in the target language's own word order.

Example workflow for documentation:

```typescript
import { translate } from '@lokascript/semantic';

// You have English examples in your docs
const english = 'toggle .active';

// Translate to show Japanese readers the equivalent
const japanese = translate(english, 'en', 'ja');
// → ".active を 切り替え"
```

**Use @lokascript/i18n** (this package) for the vocabulary itself: keyword dictionaries, keyword providers for parsers and editors, locale detection and formatting, and the word-order profiles.

## Quick Start

### Keyword Substitution

`HyperscriptTranslator` (and the ready-made `defaultTranslator`) swaps keywords word-for-word using the dictionaries. It does not parse the code or reorder words, so its output is not a faithful translation — for that, use `@lokascript/semantic`'s `translate`.

```typescript
import { HyperscriptTranslator } from '@lokascript/i18n';

const translator = new HyperscriptTranslator({ locale: 'en' });

// Swap English keywords for Korean ones, in place
const korean = translator.translate('on click toggle .active', { from: 'en', to: 'ko' });
// Result: "에 클릭 토글 .active" (keywords substituted; English word order kept)
```

### Language Detection

```typescript
const detectedLocale = translator.detectLanguage('si verdadero entonces registrar "hola"');
// Result: "es"
```

### Build Tool Integration

Both plugins run `HyperscriptTranslator` over hyperscript attributes at build time, so they substitute keywords; they do not translate.

#### Vite

```typescript
// vite.config.ts
import { hyperscriptI18nVitePlugin } from '@lokascript/i18n/plugins/vite';

export default {
  plugins: [
    hyperscriptI18nVitePlugin({
      sourceLocale: 'es',
      targetLocale: 'en',
      preserveOriginal: true,
    }),
  ],
};
```

#### Webpack

```javascript
// webpack.config.js
const { HyperscriptI18nWebpackPlugin } = require('@lokascript/i18n/plugins/webpack');

module.exports = {
  plugins: [
    new HyperscriptI18nWebpackPlugin({
      sourceLocale: 'es',
      targetLocale: 'en',
    }),
  ],
};
```

## Supported Languages

| Language   | Code | Status      | Word Order | Features                                   |
| ---------- | ---- | ----------- | ---------- | ------------------------------------------ |
| English    | `en` | ✅ Complete | SVO        | Base language                              |
| Spanish    | `es` | ✅ Complete | SVO        | Pluralization, morphological normalization |
| French     | `fr` | ✅ Complete | SVO        | Pluralization                              |
| German     | `de` | ✅ Complete | V2         | Pluralization                              |
| Japanese   | `ja` | ✅ Complete | SOV        | Native idioms, morphological normalization |
| Korean     | `ko` | ✅ Complete | SOV        | Native idioms, morphological normalization |
| Chinese    | `zh` | ✅ Complete | SVO        | Particle handling                          |
| Arabic     | `ar` | ✅ Complete | VSO        | RTL support, morphological normalization   |
| Turkish    | `tr` | ✅ Complete | SOV        | Agglutinative morphology, vowel harmony    |
| Portuguese | `pt` | ✅ Complete | SVO        | Full dictionary                            |
| Indonesian | `id` | ✅ Complete | SVO        | Agglutinative support                      |
| Quechua    | `qu` | ✅ Complete | SOV        | Agglutinative support                      |
| Swahili    | `sw` | ✅ Complete | SVO        | Noun class system                          |
| Bengali    | `bn` | ✅ Complete | SOV        | —                                          |
| Hebrew     | `he` | ✅ Complete | SVO        | RTL support                                |
| Hindi      | `hi` | ✅ Complete | SOV        | —                                          |
| Italian    | `it` | ✅ Complete | SVO        | Pluralization                              |
| Malay      | `ms` | ✅ Complete | SVO        | —                                          |
| Polish     | `pl` | ✅ Complete | SVO        | Pluralization                              |
| Russian    | `ru` | ✅ Complete | SVO        | Pluralization                              |
| Tagalog    | `tl` | ✅ Complete | VSO        | —                                          |
| Thai       | `th` | ✅ Complete | SVO        | —                                          |
| Ukrainian  | `uk` | ✅ Complete | SVO        | —                                          |
| Vietnamese | `vi` | ✅ Complete | SVO        | —                                          |

## API Reference

### HyperscriptTranslator

```typescript
class HyperscriptTranslator {
  constructor(config: I18nConfig);

  // Substitute keywords word-for-word (no parsing, no reordering)
  translate(text: string, options: TranslationOptions): string;

  // Get detailed translation with token information
  translateWithDetails(text: string, options: TranslationOptions): TranslationResult;

  // Detect language of hyperscript text
  detectLanguage(text: string): string;

  // Add custom dictionary
  addDictionary(locale: string, dictionary: Dictionary): void;

  // Get supported locales
  getSupportedLocales(): string[];

  // Validate a dictionary
  validateDictionary(locale: string): ValidationResult;

  // Check if locale uses RTL
  isRTL(locale: string): boolean;

  // Get completions for IDE support
  getCompletions(context: CompletionContext): string[];
}
```

### Types

```typescript
interface I18nConfig {
  locale: string;
  fallbackLocale?: string;
  dictionaries?: Record<string, Dictionary>;
  detectLocale?: boolean;
  rtlLocales?: string[];
}

interface TranslationOptions {
  from?: string;
  to: string;
  preserveOriginal?: boolean;
  validate?: boolean;
}

interface Dictionary {
  commands: Record<string, string>;
  modifiers: Record<string, string>;
  events: Record<string, string>;
  logical: Record<string, string>;
  temporal: Record<string, string>;
  values: Record<string, string>;
  attributes: Record<string, string>;
}
```

## Advanced Usage

### Custom Dictionaries

```typescript
import { HyperscriptTranslator, Dictionary } from '@lokascript/i18n';

const customDictionary: Dictionary = {
  commands: {
    on: 'sur',
    click: 'cliquer',
    toggle: 'basculer',
  },
  // ... other categories
};

const translator = new HyperscriptTranslator({
  locale: 'fr',
  dictionaries: {
    fr: customDictionary,
  },
});
```

## Contributing

We welcome contributions, especially new language dictionaries!

### Adding a New Language

1. Create a new dictionary file in `src/dictionaries/[locale].ts`
2. Follow the existing dictionary structure
3. Add comprehensive tests
4. Submit a pull request

Example dictionary structure:

```typescript
export const fr: Dictionary = {
  commands: {
    on: 'sur',
    tell: 'dire',
    trigger: 'déclencher',
    // ... all commands
  },
  modifiers: {
    to: 'à',
    from: 'de',
    // ... all modifiers
  },
  // ... other categories
};
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Validate dictionaries
npm run validate-dictionaries
```

## License

MIT
