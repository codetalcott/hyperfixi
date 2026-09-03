# @lokascript/types-browser

TypeScript type definitions for LokaScript browser globals.

## Installation

```bash
npm install --save-dev @lokascript/types-browser
```

## Usage

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@lokascript/types-browser"]
  }
}
```

Now you get full TypeScript autocomplete for browser globals:

```typescript
// Full IDE autocomplete and type safety!
window.lokascript.execute('toggle .active', document.body);
window._hyperscript.compile('on click add .highlight');

window.LokaScriptSemantic.parse('トグル .active', 'ja');
window.LokaScriptSemantic.translate('toggle .active', 'en', 'ko');

window.LokaScriptI18n.getProfile('ja');
```

## Provided Types

### window.lokascript / window.\_hyperscript

Core LokaScript API (from `lokascript-browser.js` or `lokascript-multilingual.js`):

- `compile(source, options?)` - Compile hyperscript to AST
- `execute(source, element?, context?)` - Execute hyperscript
- `parse(source)` - Parse to AST
- `processNode(node)` - Process single DOM node
- `process(root?)` - Process entire document
- `createContext(element?, options?)` - Create execution context
- `isValidHyperscript(source)` - Validate syntax
- `version` - Get version string
- `createRuntime(options?)` - Create runtime instance

### window.LokaScriptSemantic

Semantic parsing and translation API (from `@lokascript/semantic`'s
`dist/browser.global.js`):

- `parse(source, language)` - Parse in any of 24 languages
- `translate(source, fromLang, toLang)` - Translate between languages
- `getAllTranslations(source, sourceLang)` - Get all translations
- `createSemanticAnalyzer(options?)` - Create analyzer
- `supportedLanguages` - Array of supported language codes

### window.LokaScriptI18n

Language vocabulary API (from `lokascript-i18n.min.js`):

- `supportedLocales` - Array of supported locales
- `getProfile(locale)` - Get language grammar profile

> `translate(source, fromLang, toLang)` and `createTransformer(options?)` were
> removed in 3.0.0 along with `@lokascript/i18n`'s grammar transformer.
> Translation lives on `window.LokaScriptSemantic.translate` — it parses to a
> semantic node and renders from it, so the output re-parses in the target
> language.

## Browser Bundle Loading

```html
<!-- Load LokaScript browser bundles -->
<script src="https://cdn.jsdelivr.net/npm/@hyperfixi/core/dist/hyperfixi.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@lokascript/semantic/dist/browser.global.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@lokascript/i18n/dist/lokascript-i18n.min.js"></script>

<!-- Now use with full TypeScript support -->
<script>
  // TypeScript knows about these globals!
  window.lokascript.execute('toggle .active');
  window.LokaScriptSemantic.parse('トグル .active', 'ja');
  window.LokaScriptSemantic.translate('toggle .active', 'en', 'ja');
</script>
```

## License

MIT
