# @hyperfixi/i18n

Comprehensive internationalization (i18n) support for HyperFixi and _hyperscript applications.

## Installation

```bash
npm install @hyperfixi/i18n
```

## Features

- **🌍 Multi-language Support**: Built-in dictionaries for 13 languages (English, Spanish, French, German, Japanese, Korean, Chinese, Arabic, Turkish, Portuguese, Indonesian, Quechua, Swahili)
- **🔄 Runtime Locale Switching**: Dynamic language switching in browser environments with automatic detection
- **⚡ SSR Integration**: Server-side rendering with locale detection, SEO optimization, and hydration support
- **📊 Pluralization**: CLDR-compliant pluralization rules for complex languages (Russian, Arabic, etc.)
- **💰 Formatting**: Locale-aware number, date, currency, and unit formatting with fallbacks
- **🛠️ Build Tool Integration**: Vite and Webpack plugins for build-time translation
- **🔍 Language Detection**: Automatically detect the language of hyperscript code from content
- **✅ Validation**: Comprehensive dictionary validation with coverage reports and warnings
- **🎯 Type Safety**: Full TypeScript support with comprehensive type definitions
- **⚡ Performance**: Caching, lazy loading, and optimized translation algorithms
- **📱 Browser Support**: Modern APIs with graceful fallbacks for legacy environments

## When to Use i18n vs Semantic

HyperFixi has two packages for multilingual support with different purposes:

| Package                 | Purpose                                      | Use Case                                                  |
|-------------------------|----------------------------------------------|-----------------------------------------------------------|
| **@hyperfixi/semantic** | Parse code written in any language → execute | Users **write** hyperscript in their native language      |
| **@hyperfixi/i18n**     | Transform code between languages             | **Translate** code examples for docs/teaching             |

**Use @hyperfixi/semantic** when your users will write hyperscript in their native language. It parses multilingual input directly into executable AST nodes with native idiom support (e.g., Japanese conditionals like `クリックしたら`).

**Use @hyperfixi/i18n** (this package) when you need to translate code examples between languages for documentation, tutorials, or teaching materials. It transforms existing code for display purposes—showing learners how the same logic looks in different languages.

Example workflow for documentation:

```typescript
// You have English examples in your docs
const english = 'on click toggle .active';

// Translate to show Japanese readers the equivalent
const japanese = translator.translate(english, { from: 'en', to: 'ja' });
// → "クリック で .active を 切り替え"
```

## Quick Start

### Basic Translation

```typescript
import { HyperscriptTranslator } from '@hyperfixi/i18n';

const translator = new HyperscriptTranslator({ locale: 'es' });

// Translate from Spanish to English
const english = translator.translate(
  'en clic alternar .activo',
  { to: 'en' }
);
// Result: "on click toggle .activo"

// Translate from English to Korean
const korean = translator.translate(
  'on click toggle .active',
  { from: 'en', to: 'ko' }
);
// Result: "클릭 토글 .active"
```

### Language Detection

```typescript
const detectedLocale = translator.detectLanguage(
  'si verdadero entonces registrar "hola"'
);
// Result: "es"
```

### Build Tool Integration

#### Vite

```typescript
// vite.config.ts
import { hyperscriptI18nVitePlugin } from '@hyperfixi/i18n/plugins/vite';

export default {
  plugins: [
    hyperscriptI18nVitePlugin({
      sourceLocale: 'es',
      targetLocale: 'en',
      preserveOriginal: true
    })
  ]
};
```

#### Webpack

```javascript
// webpack.config.js
const { HyperscriptI18nWebpackPlugin } = require('@hyperfixi/i18n/plugins/webpack');

module.exports = {
  plugins: [
    new HyperscriptI18nWebpackPlugin({
      sourceLocale: 'es',
      targetLocale: 'en'
    })
  ]
};
```

## Supported Languages

| Language | Code | Status | Word Order | Features |
|----------|------|--------|------------|----------|
| English | `en` | ✅ Complete | SVO | Base language |
| Spanish | `es` | ✅ Complete | SVO | Pluralization, morphological normalization |
| French | `fr` | ✅ Complete | SVO | Pluralization |
| German | `de` | ✅ Complete | V2 | Pluralization |
| Japanese | `ja` | ✅ Complete | SOV | Native idioms, morphological normalization |
| Korean | `ko` | ✅ Complete | SOV | Native idioms, morphological normalization |
| Chinese | `zh` | ✅ Complete | SVO | Particle handling |
| Arabic | `ar` | ✅ Complete | VSO | RTL support, morphological normalization |
| Turkish | `tr` | ✅ Complete | SOV | Agglutinative morphology, vowel harmony |
| Portuguese | `pt` | ✅ Complete | SVO | Full dictionary |
| Indonesian | `id` | ✅ Complete | SVO | Agglutinative support |
| Quechua | `qu` | ✅ Complete | SOV | Agglutinative support |
| Swahili | `sw` | ✅ Complete | SVO | Noun class system |

## API Reference

### HyperscriptTranslator

```typescript
class HyperscriptTranslator {
  constructor(config: I18nConfig);
  
  // Translate hyperscript text
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
import { HyperscriptTranslator, Dictionary } from '@hyperfixi/i18n';

const customDictionary: Dictionary = {
  commands: {
    on: 'sur',
    click: 'cliquer',
    toggle: 'basculer'
  },
  // ... other categories
};

const translator = new HyperscriptTranslator({
  locale: 'fr',
  dictionaries: {
    fr: customDictionary
  }
});
```

### LSP Integration

```typescript
import { I18nLanguageProvider } from '@hyperfixi/i18n/lsp';

const provider = new I18nLanguageProvider('es');

// Get completions
const completions = await provider.provideCompletions(document, position);

// Get hover information
const hover = await provider.provideHover(document, position);
```

### CLI Usage

```bash
# Install globally
npm install -g @hyperfixi/i18n

# Translate a file
hyperfixi-translate input.html output.html --from es --to en

# Translate a directory
hyperfixi-translate src/ dist/ --from es --to en
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
