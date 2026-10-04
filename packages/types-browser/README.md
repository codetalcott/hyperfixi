# @hyperfixi/types-browser

TypeScript type definitions for the hyperfixi browser globals.

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

The globals are then typed:

```typescript
window.hyperfixi.evaluate('toggle .active on me', { me: button });
window._hyperscript.parse('on click add .highlight').errors; // []

window.LokaScriptSemantic.parse('トグル .active', 'ja');
window.LokaScriptSemantic.translate('toggle .active', 'en', 'ko');

window.LokaScriptI18n.getProfile('ja');
```

## Provided Types

### window.hyperfixi / window.\_hyperscript

One object, `HyperfixiAPI`: the public API of `@hyperfixi/engine`, which its `hyperfixi-hs.js`
installs (and `@hyperfixi/core`'s `hyperfixi.js`, the same file). It is shaped like upstream
`_hyperscript`'s:

- `hyperfixi(source, context?)` / `evaluate(source, context?)` — run commands, features or an
  expression; `context.me` is the element `me` refers to
- `parse(source)` — parse without running; grammar errors are in `.errors`
- `process(node)` / `processNode(node)` — initialise the scripted elements under a node
- `cleanup(element)` — remove what an element's script installed
- `config` — settings, and the `as <Name>` conversion table
- `use(plugin)`, `addBeforeProcessHook(hook)`, `addAfterProcessHook(hook)` — upstream's plugin API
- `addSourceTransform(transform)` — not in upstream: rewrite a script as it is read
- `version`

The package's typecheck checks the engine's own `api` against `HyperfixiAPI`, so the two cannot
drift apart.

> **4.0:** until then `window.hyperfixi` was typed as `@hyperfixi/core`'s own API (`compile`,
> `compileSync`, `execute`, `createContext`, `evalHyperScript`, …). `hyperfixi.js` is the engine's
> file now, and none of those exist on it: `compileSync(code)` → `parse(code).errors`;
> `execute(code, el)` → `evaluate(code, { me: el })`; `compile(code, { language })` → load
> `@lokascript/hyperscript-adapter` beside a semantic bundle. `window.lokascript` is gone.
> `LokaScriptCoreAPI` remains as a deprecated alias of `HyperfixiAPI`. (3.x's published
> `index.d.ts` also never reached its window augmentation: `globals.d.ts` was not emitted.)

### window.LokaScriptSemantic

Semantic parsing and translation API (from `@lokascript/semantic`'s browser bundles):

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
<script src="https://cdn.jsdelivr.net/npm/@hyperfixi/engine/dist/hyperfixi-hs.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@lokascript/semantic/dist/browser.global.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@lokascript/i18n/dist/lokascript-i18n.min.js"></script>

<script>
  window.hyperfixi.evaluate('add .ready to me', { me: document.body });
  window.LokaScriptSemantic.translate('toggle .active', 'en', 'ja');
</script>
```

## License

MIT
