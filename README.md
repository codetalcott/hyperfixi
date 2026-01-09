# HyperFixi

Multilingual hyperscript for developers who don't think in English.

## About This Repo

Hyperscript is an English dialect for DOM scripting. Its readability—the key selling point—becomes a barrier for developers who don't think in English.

### Why Multilingual Hyperscript?

Three iterations to get here:

1. **Keyword translation**: `toggle` → `alternar` (Spanish), `トグル` (Japanese). Results read awkwardly—English grammar through foreign vocabulary.

2. **Grammar order transformation**: Languages structure differently—SVO (English), SOV (Japanese, Korean, Turkish), VSO (Arabic). Added transformations so `on click toggle .active` becomes `クリック で .active を トグル` with proper Japanese word order. Better, but still not idiomatic.

3. **Semantic role mapping**: Built a parser that identifies what each part of a command represents (agent, patient, instrument, etc.), then generates language-specific idiomatic output. This requires handwritten idiom support per language—practical only with LLM assistance or community contribution.

The result is more complex than original hyperscript. To keep bundle size reasonable, it's fully modular—load only the languages and commands you need.

## Current Status

| Package | Tests | Status |
| ------- | ----- | ------ |
| [@hyperfixi/core](./packages/core) | 3316 passing | Stable |
| [@hyperfixi/semantic](./packages/semantic) | 1984 passing | Stable |
| [@hyperfixi/i18n](./packages/i18n) | 299 passing, 10 failing | Mostly stable |
| [@hyperfixi/vite-plugin](./packages/vite-plugin) | 163 passing | Stable |

### Language Support

**Semantic parsing** (23 languages): Arabic, Bengali, Chinese, English, French, German, Hindi, Indonesian, Italian, Japanese, Korean, Malay, Polish, Portuguese, Quechua, Russian, Spanish, Swahili, Tagalog, Thai, Turkish, Ukrainian, Vietnamese

**Grammar transformation** (13 languages): Arabic, Chinese, English, French, German, Indonesian, Japanese, Korean, Portuguese, Quechua, Spanish, Swahili, Turkish

### Bundle Sizes

| Bundle | Size | Use Case |
| ------ | ---- | -------- |
| hyperfixi-lite.js | 8 KB | Minimal (8 commands, regex parser) |
| hyperfixi-hybrid-complete.js | 28 KB | Most projects (~85% hyperscript coverage) |
| hyperfixi-browser.js | 912 KB | Full bundle with all features |
| Semantic (English only) | 84 KB | Single-language semantic parsing |
| Semantic (all 23 languages) | 260 KB | Full multilingual support |

## Quick Start

### Browser (CDN)

```html
<script src="hyperfixi-hybrid-complete.js"></script>
<button _="on click toggle .active">Toggle</button>
```

### Vite Projects

```bash
npm install @hyperfixi/vite-plugin
```

```javascript
// vite.config.js
import { hyperfixi } from '@hyperfixi/vite-plugin';

export default {
  plugins: [hyperfixi()]
};
```

The plugin scans your files for `_="..."` attributes and generates a minimal bundle with only the commands you use.

### Multilingual Usage

```typescript
import { MultilingualHyperscript } from '@hyperfixi/core';

const ml = new MultilingualHyperscript();
await ml.initialize();

// Parse from any supported language
await ml.parse('#button の .active を 切り替え', 'ja');  // Japanese
await ml.parse('토글 .active', 'ko');                    // Korean
await ml.parse('alternar .active', 'es');                // Spanish

// Translate between languages
const arabic = await ml.translate('toggle .active', 'en', 'ar');
```

## Architecture

```text
packages/
├── core/           # Hyperscript runtime, parser, 43 commands
│   ├── parser/     # AST parser (~3800 lines)
│   ├── runtime/    # Execution engine
│   └── commands/   # Command implementations
│
├── semantic/       # Semantic-first multilingual parsing
│   ├── tokenizers/ # 23 language-specific tokenizers
│   ├── patterns/   # Command pattern generation
│   └── parser/     # Semantic parser with confidence scoring
│
├── i18n/           # Grammar transformation
│   ├── grammar/    # SOV/VSO word order transformation
│   └── profiles/   # 13 language profiles with markers
│
├── vite-plugin/    # Zero-config Vite integration
│   ├── scanner/    # Hyperscript detection in HTML/Vue/Svelte/JSX
│   └── generator/  # Minimal bundle generation
│
└── mcp-server/     # Model Context Protocol server for LLM integration
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test --prefix packages/core      # Core tests
npm test --prefix packages/semantic  # Semantic parser tests

# Build
npm run build:browser --prefix packages/core

# Start dev server
npm run dev  # Serves at http://127.0.0.1:3000
```

### Adding Language Support

```bash
# Scaffold a new language in the semantic package
cd packages/semantic
npm run add-language -- --code=xx --name=LanguageName --native=NativeName \
  --wordOrder=SVO --direction=ltr
```

Then fill in keyword translations in `src/generators/profiles/{code}.ts`.

## Known Limitations

- TypeScript: 3 minor type errors in test files
- i18n: 10 failing tests (language detection edge cases)
- Official hyperscript compatibility: ~85% (complex behaviors may differ)

## Contributing

This project is in early stages. If you're interested in contributing language support or have feedback, open an issue.

## License

MIT
