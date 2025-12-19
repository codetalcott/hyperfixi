# @hyperfixi/types-browser

TypeScript type definitions for HyperFixi browser globals.

## Installation

```bash
npm install --save-dev @hyperfixi/types-browser
```

## Usage

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@hyperfixi/types-browser"]
  }
}
```

Now you get full TypeScript autocomplete for browser globals:

```typescript
// Full IDE autocomplete and type safety!
window.hyperfixi.execute('toggle .active', document.body)
window._hyperscript.compile('on click add .highlight')

window.HyperFixiSemantic.parse('トグル .active', 'ja')
window.HyperFixiSemantic.translate('toggle .active', 'en', 'ko')

window.HyperFixiI18n.translate('on click toggle .active', 'en', 'ja')
```

## Provided Types

### window.hyperfixi / window._hyperscript

Core HyperFixi API (from `hyperfixi-browser.js` or `hyperfixi-multilingual.js`):

- `compile(source, options?)` - Compile hyperscript to AST
- `execute(source, element?, context?)` - Execute hyperscript
- `parse(source)` - Parse to AST
- `processNode(node)` - Process single DOM node
- `process(root?)` - Process entire document
- `createContext(element?, options?)` - Create execution context
- `isValidHyperscript(source)` - Validate syntax
- `version` - Get version string
- `createRuntime(options?)` - Create runtime instance

### window.HyperFixiSemantic

Semantic parsing API (from `hyperfixi-semantic.browser.global.js`):

- `parse(source, language)` - Parse in any of 13 languages
- `translate(source, fromLang, toLang)` - Translate between languages
- `getAllTranslations(source, sourceLang)` - Get all translations
- `createSemanticAnalyzer(options?)` - Create analyzer
- `supportedLanguages` - Array of supported language codes

### window.HyperFixiI18n

Grammar transformation API (from `hyperfixi-i18n.min.js`):

- `translate(source, fromLang, toLang)` - Transform with grammar rules
- `createTransformer(options?)` - Create transformer instance
- `supportedLocales` - Array of supported locales
- `getProfile(locale)` - Get language grammar profile

## Browser Bundle Loading

```html
<!-- Load HyperFixi browser bundles -->
<script src="https://cdn.jsdelivr.net/npm/@hyperfixi/core/dist/hyperfixi-browser.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@hyperfixi/semantic/dist/hyperfixi-semantic.browser.global.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@hyperfixi/i18n/dist/hyperfixi-i18n.min.js"></script>

<!-- Now use with full TypeScript support -->
<script>
  // TypeScript knows about these globals!
  window.hyperfixi.execute('toggle .active')
  window.HyperFixiSemantic.parse('トグル .active', 'ja')
  window.HyperFixiI18n.translate('toggle .active', 'en', 'ja')
</script>
```

## License

MIT
