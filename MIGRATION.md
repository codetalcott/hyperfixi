# Migration Guide

## Migrating from 3.x to 4.0

### Overview

In 4.0 `@hyperfixi/core` no longer has its own hyperscript engine. `@hyperfixi/engine` replaces
it. That engine follows upstream `_hyperscript`'s grammar and passes upstream's own test suite.

- **Script tags.** `hyperfixi.js` is now the engine's `hyperfixi-hs.js`, byte for byte (34 KB
  gzipped, where 3.x's was ~352 KB).
- **Node and bundlers.** `@hyperfixi/core`'s root is `export * from '@hyperfixi/engine'`.
- **htmx attributes.** They come from real htmx 4 (or fixi) loaded beside the engine.
- **Other languages.** Hyperscript in another language runs through
  `@lokascript/hyperscript-adapter`.

**Who is not affected:**

- Pages that load a pinned 3.x URL (`@hyperfixi/core@3.3.0/dist/…`) keep working.
- Scripts already written in upstream's spelling run unchanged; this repo's examples and docs have
  used it since 3.3.0. Two hyperfixi additions also still work: `new X()` and `toggle <element>`.

**Before you upgrade:**

- **Unpinned CDN URLs.** An unpinned URL such as `unpkg.com/@hyperfixi/core/dist/hyperfixi.js`
  serves 4.0 as soon as it is published. Pin it to `@3.3.0` until you have migrated.
- **Upgrade every package together.** Versions are lockstep, and internal ranges are `^4.0.0`.
  For example, `@hyperfixi/behaviors@4` peers on `@hyperfixi/engine@^4`.

**Find what breaks first.** The engine is the oracle. Check each script with its parse:

```js
import { register, everything, api } from '@hyperfixi/engine';

register(...everything);
api.parse('on click toggle .active on me').errors; // [] when 4.0 reads it
```

In a page on `hyperfixi-hs.js`, each script the engine rejects logs a `console.error` and
dispatches `hyperscript:parse-error` on its element. The 4.0 `@lokascript/language-server` and MCP
`validate_hyperscript` report the same errors.

### Removed bundles and files

| 3.x                                                                                 | 4.0                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hyperfixi.js` (core's full bundle, ~352 KB)                                        | Same path, now the engine (34 KB). Canonical name: `@hyperfixi/engine/dist/hyperfixi-hs.js`                                                                                                              |
| `hyperfixi-hx.js`, `hyperfixi-hybrid-hx.js`, `lokascript-hybrid-hx.js`              | `hyperfixi-hs.js` + htmx 4 or fixi; localized `hx-*` names: `@lokascript/htmx-adapter`                                                                                                                   |
| `hyperfixi-hx-v4.js`                                                                | `hyperfixi-hs.js` + htmx 4 (`hx-sse`, `hx-ws`); `hx-live` → the engine's `live` block                                                                                                                    |
| `hyperfixi-hybrid-complete.js`, `lokascript-hybrid-complete.js`                     | `hyperfixi-hs.js`                                                                                                                                                                                        |
| `hyperfixi-multilingual.js`, `lokascript-multilingual.js`                           | `hyperfixi-hs.js` + one `@lokascript/semantic` bundle + the lite adapter (`hyperscript-i18n-lite.global.js`), or `hyperfixi-hs.js` + a per-language adapter bundle (`hyperscript-i18n-<lang>.global.js`) |
| `hyperfixi-classic-i18n.js` (+ `hyperfixi-browser-classic-i18n.js`, `lokascript-…`) | As for `hyperfixi-multilingual.js`; set the language with `lang` on `<html>` or an element                                                                                                               |
| `hyperfixi.mjs` + `chunks/` (`@hyperfixi/core/browser/modular`)                     | `@hyperfixi/vite-plugin`, or `register()` the modules you need from `@hyperfixi/engine`                                                                                                                  |
| `hyperfixi-browser.js`, `lokascript-browser.js`                                     | `hyperfixi.js` or `hyperfixi-hs.js`                                                                                                                                                                      |
| `dist/index.min.js` (UMD global `LokaScriptCore`)                                   | `hyperfixi-hs.js` (`window.hyperfixi`)                                                                                                                                                                   |
| `@hyperfixi/core/vocab/htmx/{lang}.js`                                              | `@lokascript/htmx-adapter/vocab/{lang}.js` (same data)                                                                                                                                                   |

### Removed attributes (core's htmx layer)

| 3.x                                                                        | 4.0                                                                         |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `hx-get`, `hx-target`, `hx-swap`, `hx-on:*` on core's runtime; fixi `fx-*` | The same attributes on real htmx 4 or fixi, loaded beside `hyperfixi-hs.js` |
| `hx-live="put $count into me"`                                             | `_="live put $count into me end"`                                           |
| `sse-connect` / `sse-swap`                                                 | htmx 4's `hx-sse` extension (`hx-sse:connect`)                              |
| `ws-connect` / `ws-send`                                                   | htmx 4's `hx-ws` extension (`hx-ws:connect`, `hx-ws:send`)                  |
| Localized names (`hx-obtener`, `hx-取得`, …)                               | `@lokascript/htmx-adapter`, loaded before htmx, plus its `vocab/{lang}.js`  |

### `window.hyperfixi` in the browser

`window.hyperfixi` is the engine's public object, the same object as `window._hyperscript`. It
has `evaluate`, `parse`, `process` / `processNode`, `use`, `config`, `addBeforeProcessHook` and
`addSourceTransform`.

| 3.x                                                                                           | 4.0                                                                                                         |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `hyperfixi.compileSync(code)` / `compile(code)`                                               | `hyperfixi.parse(code).errors` (empty when valid)                                                           |
| `hyperfixi.execute(code, el)`                                                                 | `hyperfixi.evaluate(code, { me: el })`                                                                      |
| `hyperfixi.execute(code, lang)`, `setLocale(lang)` (multilingual bundles)                     | `lang` / `data-lang` on the element or `<html>`, with the hyperscript adapter loaded                        |
| `hyperfixi.evalLSENode(node)`                                                                 | `<lse-intent>` from `@hyperfixi/intent-element`, or `LokaScriptSemantic.render(node, 'en')` then `evaluate` |
| `debugControl`, `semanticDebug`, `localStorage 'hyperfixi:debug'`, `hyperfixi:semantic-parse` | The `breakpoint` command (pauses in DevTools), `log`, `beep!`                                               |
| `_hyperscript.behaviors.resolve`                                                              | Load `@hyperfixi/behaviors`' browser bundle; it defines every behavior as it loads                          |
| `validatePartialContent`                                                                      | None                                                                                                        |
| `window.lokascript`                                                                           | `window.hyperfixi`                                                                                          |

### `@hyperfixi/core` in Node and bundlers

| 3.x                                                                             | 4.0                                                                                                                                            |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `require('@hyperfixi/core')`                                                    | `import` (the root is ESM-only; `/multilingual`, `/ast-utils`, `/reference`, `/metadata`, `/lsp-metadata` still `require`)                     |
| `hyperscript.compileSync(code)` / `compile` / `validate`                        | `api.parse(code).errors`, or `parse(code)`, which throws `ParseError`                                                                          |
| `hyperscript.eval(code, el)`                                                    | `evaluate(code, { me: el })` (needs a DOM: browser, jsdom or happy-dom)                                                                        |
| `hyperscript.compileAsync(code, { language })`                                  | `preprocess(code, lang)` from `@lokascript/hyperscript-adapter`, then `evaluate`; on a page, `api.use(hyperscriptI18n())`                      |
| `Runtime`, `RuntimeBase`                                                        | `register(...everything)` (or only the modules you use), then `boot()` in a browser                                                            |
| `installPlugin(plugin)`                                                         | `api.use(plugin)` for a `_hyperscript`-style plugin; `register(module)` for grammar (see `@hyperfixi/speech`)                                  |
| `getParserExtensionRegistry`, `ParserExtensionRegistry`, `setGlobal`            | `register(module)`; a module is `(grammar) => void` and can import `expr` from the engine                                                      |
| `createContext`, `getElementScopeMap`, `getElementVar` / `setElementVar`        | None                                                                                                                                           |
| `DebugController`, `createDebugController`                                      | None; use the `breakpoint` command                                                                                                             |
| `fromCoreAST` / `toCoreAST` (root and `/ast-utils`)                             | `fromSemanticAST` from `@lokascript/semantic`, plus `withEnginePositions(nodes, source, engineTree)` from `/ast-utils`                         |
| `/commands`, `/expressions`                                                     | Grammar modules from the root: `import { toggle, swap, morph } from '@hyperfixi/core'`                                                         |
| `/parser/full`, `/parser/hybrid/*`, `/parser/regex`                             | The engine's `parse`, `Parser`, `createGrammar`, `tokenize`                                                                                    |
| `/behaviors` (`registerHistorySwap`, …)                                         | `@hyperfixi/behaviors`; HistorySwap is a few lines of hyperscript (`on popstate from window fetch location.href as html put it into targetEl`) |
| `/bundle-generator`                                                             | `@hyperfixi/vite-plugin`                                                                                                                       |
| `/registry`, `/registry/*`                                                      | None                                                                                                                                           |
| `/lse` (`parseExplicit`, `renderExplicit`)                                      | `@lokascript/framework/ir`                                                                                                                     |
| `/multilingual`: `MultilingualHyperscript`, `getMultilingual()`, `multilingual` | The functions `parse(code, lang)`, `render(node, lang)`, `translate(code, from, to)` (all async)                                               |
| `/multilingual`: `parseToAST`                                                   | `render(node, 'en')`, then run that text on the engine                                                                                         |
| `/multilingual`: `getSupportedLanguages`, `getLanguageInfo`                     | `getSupportedLanguages()` from `@lokascript/semantic`; no `getLanguageInfo`                                                                    |
| `/multilingual`: `schemaRoleInferrer`                                           | None                                                                                                                                           |
| `/reference`: `availability`, `getCommandsByAvailability`                       | None: there are no tiers, and a bundle has a command when it registers that command's module                                                   |

### Other packages and tools

| 3.x                                                                                          | 4.0                                                                                     |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `@hyperfixi/reactivity`                                                                      | Built into the engine: `live`, `when`, `bind`                                           |
| `@hyperfixi/realtime`                                                                        | htmx 4's `hx-sse` / `hx-ws`                                                             |
| `@hyperfixi/components`                                                                      | Upstream `_hyperscript`'s component extension                                           |
| `@hyperfixi/speech`: `speechPlugin`                                                          | `register(...everything, speak)`, then `boot()`                                         |
| `@hyperfixi/speech`: `ask` / `answer`                                                        | The engine's own `ask` / `answer` (in `everything` and `hyperfixi-hs.js`)               |
| `@hyperfixi/behaviors`: `Toggleable(target: …)`                                              | `Toggleable(targetEl: …)`                                                               |
| `@hyperfixi/behaviors`: `LokaScriptInstance`, `LokaScriptWindow`                             | `HyperscriptHost`, `HyperscriptWindow`                                                  |
| `@hyperfixi/vite-plugin`: `mode: 'compile'`                                                  | Remove it; the default mode is what 4.0 builds                                          |
| `@hyperfixi/vite-plugin`: `CompiledHandler`, `CompileOptions`, `set/clear/hasSemanticParser` | None                                                                                    |
| `@lokascript/compilation-service`: `compile()`, `POST /compile`                              | `validate()` / `POST /validate`; then put the hyperscript in an `_="…"` attribute as is |
| `@lokascript/compilation-service`: compile cache, `/cache`, `getCacheStats`, `clearCache`    | None                                                                                    |
| `@lokascript/compilation-service`: `generate()` with no `target` or `'js'`                   | Pass `target: 'react' \| 'vue' \| 'svelte' \| 'intent-element'`                         |
| `@lokascript/compilation-service`: `generateTests`' `executionMode: 'compiled'`              | Drop the option; generated tests always run the hyperscript                             |
| MCP `compile_hyperscript`                                                                    | `validate_and_compile`, then the hyperscript as is                                      |
| MCP `execute_lse`; `lse_to_hyperscript`'s `compile` option                                   | `lse_to_hyperscript` (text), then run it on the engine                                  |
| `@hyperfixi/types-browser`: `LokaScriptCoreAPI`                                              | `HyperfixiAPI` (the old name is a deprecated alias)                                     |

### Syntax your scripts may use that 4.0 rejects

The engine reads upstream's grammar plus two additions, `new X()` and `toggle <element>`. The
language server's hyperscript mode flags those two additions if your scripts must also run on
upstream. The multilingual reader still accepts every core-only form below, and its English
render writes the upstream spelling.

| 3.x (core only)                                                                                  | 4.0 (upstream spelling)                                                                                                                   |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `X has .c`, `I have .c`                                                                          | `X matches .c`, `I match .c`                                                                                                              |
| `prepend X to Y`                                                                                 | `put X at start of Y`                                                                                                                     |
| `swap innerHTML of X with Y` (`outerHTML`, `beforeBegin`, `afterBegin`, `beforeEnd`, `afterEnd`) | `put Y into X` (`into X's outerHTML`, `before X`, `at start of X`, `at end of X`, `after X`)                                              |
| `swap delete X`                                                                                  | `remove X`                                                                                                                                |
| `… using view transition`                                                                        | `start view transition … end`                                                                                                             |
| `push url X`, `replace url X`                                                                    | `call history.pushState(null, '', X)`, `call history.replaceState(null, '', X)`                                                           |
| `copy "text"`                                                                                    | `call navigator.clipboard.writeText("text")`                                                                                              |
| `set @a to v on X`                                                                               | `set @a of X to v` (or `set X's @a to v`)                                                                                                 |
| `toggle [a] on X`                                                                                | `toggle @a on X`                                                                                                                          |
| `toggle *display on X`                                                                           | `toggle *display of X`                                                                                                                    |
| `morph X with Y`                                                                                 | `morph X to Y`                                                                                                                            |
| `on input.debounce(300)`, `.throttle(1s)`                                                        | `on input debounced at 300ms`, `throttled at 1s`                                                                                          |
| `unless C A then B` (leading `unless`)                                                           | `if not (C) A then B end` (a trailing `A unless C` still works)                                                                           |
| `tell X to show`                                                                                 | `tell X show end`                                                                                                                         |
| `repeat for x in xs with index i`                                                                | `repeat for x in xs index i`                                                                                                              |
| `my?.a?.b`                                                                                       | `my a.b` (property chains are null-safe)                                                                                                  |
| `previous <input/>.value`                                                                        | `the value of previous <input/>`                                                                                                          |
| `fetch /search?q=${my value}` (a spaced `${…}` in a bare URL)                                    | `` fetch `/search?q=${my value}` ``                                                                                                       |
| `fetch "/x" do not throw`                                                                        | `fetch "/x" as text do not throw`                                                                                                         |
| `fetch /x with method:'POST' and headers:{…}` (hybrid bundles)                                   | `fetch /x with {method:'POST', headers:{…}}`                                                                                              |
| `fetch /x and put it into #y`                                                                    | `fetch /x then put it into #y`                                                                                                            |
| `body:(closest <form/> as FormData)`                                                             | `js(me) return new FormData(me.closest('form')) end then fetch /x with method:"POST", body:it`                                            |
| `closest nav`                                                                                    | `closest <nav/>`                                                                                                                          |
| `js(event) window.confirm("Sure?") end` as an expression                                         | The JS expression itself: `if not window.confirm("Sure?")`                                                                                |
| `make a <div>Hi</div>`                                                                           | `make a <div/> then put "Hi" into it`                                                                                                     |
| `add .x on #el`, `put "x" in #el`                                                                | `add .x to #el`, `put "x" into #el`                                                                                                       |
| `toggle class .a`                                                                                | `toggle .a`                                                                                                                               |
| commands joined with `and`                                                                       | `then`, or a new line                                                                                                                     |
| `a + b * c` (mixed operators, no parentheses)                                                    | `a + (b * c)`                                                                                                                             |
| `beep x` (bare)                                                                                  | `beep! x`                                                                                                                                 |
| `<script type="text/hyperscript" for="#btn">…`                                                   | A plain `<script type="text/hyperscript">` with `on click from #btn …`                                                                    |
| `process partials`, the `pseudo` keyword, `a ? b : c`, `sorted by … desc`                        | No upstream form. Write the logic in a `js … end` block or with `if … else … end`; a call such as `foo()` still works as a pseudo-command |
| `x as Math`                                                                                      | No upstream form: it parses, but no runtime has a `Math` conversion                                                                       |

### Same syntax, different result

The engine runs these as upstream does, which differs from core's 3.x behavior:

| Script                                                             | 3.x (core)                                            | 4.0 (engine and upstream)                                                                                |
| ------------------------------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `swap #a with #b`                                                  | put `#b`'s content into `#a`                          | exchanges the two elements                                                                               |
| `show #x` when a stylesheet hides `#x`                             | showed it                                             | removes the inline `display` only, so `#x` stays hidden; toggle a class, or `show #x with display:block` |
| `show` / `hide … with *opacity` (or `*visibility`)                 | always toggled `display`                              | uses the strategy                                                                                        |
| `tell #x …`                                                        | `me` became `#x`                                      | `me` stays; `#x` is `you`                                                                                |
| `set .item.textContent to "y"` (many matches)                      | set the first match                                   | sets every match                                                                                         |
| `set @a of X to v` (3.x: `set @a to v on X`), `X` matching several | set the first match only                              | sets every match                                                                                         |
| `put [1, 2] into #out`                                             | wrote `1,2`                                           | writes `12`                                                                                              |
| `put my.tagName into #out`                                         | wrote `button`                                        | writes `BUTTON`                                                                                          |
| `empty #input`                                                     | left the input's value                                | clears it                                                                                                |
| `go to "#frag"`, `go to "back"`                                    | threw                                                 | sets the hash / navigates back                                                                           |
| `no ""`, `no false`                                                | core's answers differed                               | `true`, `false`                                                                                          |
| `increment #count`                                                 | incremented the element's text                        | does not; write `increment #count's textContent`                                                         |
| `toggle #x's @a`                                                   | toggled the attribute                                 | parses as `toggle <element>` on the attribute's value; write `toggle @a on #x`                           |
| `toggle .a on this`                                                | `this` was `me`                                       | `this` is an ordinary (unset) variable; write `me`                                                       |
| `on change in #x`                                                  | ran when `#x`'s children changed (a mutation watcher) | a DOM `change` event filtered by `in #x`; to watch children, write `on mutation of childList from #x`    |
| `go forward`                                                       | went forward in history                               | goes to a variable named `forward`; write `call history.forward()`                                       |
| A parse error                                                      | core's own reporting                                  | `hyperscript:parse-error` on the element plus `console.error`                                            |

**Behaviors you define yourself** follow upstream's rules:

- **Parameters.** `set :x` in a behavior writes the element's scope, not the parameter. Default a
  parameter in `init` with `if x is undefined set element's x to … end`.
- **`from` targets.** A `from` target with `or` needs parentheses:
  `on click from (triggerEl or me)`.
- **Order.** Define a behavior above the elements that install it.

### Step by step: a page that loads `hyperfixi.js`

1. **Pin or switch the script.** `@hyperfixi/core@4/dist/hyperfixi.js` keeps working, and it is
   now the engine. The canonical file is `@hyperfixi/engine@4/dist/hyperfixi-hs.js`:

   ```html
   <!-- 3.x -->
   <script src="https://unpkg.com/@hyperfixi/core@3/dist/hyperfixi.js"></script>
   <!-- 4.0 -->
   <script src="https://unpkg.com/@hyperfixi/engine@4/dist/hyperfixi-hs.js"></script>
   ```

2. **Load the page and read the console.** Each script the engine rejects logs an error.
   Rewrite it with the syntax table above, then check the "same syntax, different result" table.
3. **Replace removed `window.hyperfixi` calls** (`compileSync`, `execute`, `setLocale`,
   `debugControl`, …) using the browser table.
4. **If the page used `hyperfixi-hx.js` or `hx-*` attributes,** add htmx 4 (or fixi) after the
   engine. For localized attribute names, load `@lokascript/htmx-adapter` and its vocab module
   before htmx:

   ```html
   <script src="hyperfixi-hs.js"></script>
   <script src="https://unpkg.com/@lokascript/htmx-adapter@4/dist/htmx-i18n.global.js"></script>
   <script src="https://unpkg.com/@lokascript/htmx-adapter@4/vocab/es.js"></script>
   <script src="htmx.js"></script>
   <!-- htmx 4 -->
   ```

   Rewrite `hx-live="…"` as `_="live … end"`, and `sse-*` / `ws-*` as htmx 4's `hx-sse` /
   `hx-ws`.

5. **If the page runs hyperscript in another language,** replace `hyperfixi-multilingual.js` or
   `hyperfixi-classic-i18n.js` with the engine plus the adapter. The `_` attribute keeps the text
   you wrote:

   ```html
   <script src="hyperfixi-hs.js"></script>
   <script src="https://unpkg.com/@lokascript/semantic@4/dist/browser.global.js"></script>
   <script src="https://unpkg.com/@lokascript/hyperscript-adapter@4/dist/hyperscript-i18n-lite.global.js"></script>

   <button lang="ja" _="クリック で .active を トグル">切り替え</button>
   ```

   A smaller semantic bundle works too (`browser-es.es.global.js`, `browser-priority.…`). Since
   4.0 every one of them registers English, which the adapter needs.

6. **If the page uses behaviors,** load the behaviors bundle after the engine, and rename
   Toggleable's `target:` argument to `targetEl:`:

   ```html
   <script src="hyperfixi-hs.js"></script>
   <script src="https://unpkg.com/@hyperfixi/behaviors@4/dist/resolver.browser.global.js"></script>
   ```

7. **If the page used `@hyperfixi/reactivity` / `realtime` / `components`,** remove them. Use
   the engine's `live` / `when` / `bind`, htmx 4's `hx-sse` / `hx-ws`, or upstream's component
   extension.

### Step by step: `@hyperfixi/vite-plugin`

1. **Upgrade together:** `npm install @hyperfixi/vite-plugin@^4 @hyperfixi/engine@^4`. If any
   script is not in English (the plugin's `semantic` option), install `@lokascript/semantic@^4`
   as well: the generated bundle imports it, and the plugin does not depend on it.
2. **Clean up the config:**
   - Remove `mode: 'compile'`. Leaving it set only logs a warning.
   - `devFallback: 'full'` or `'hybrid-complete'` still works, and both mean `'everything'`. Rename
     it when convenient.
3. **Keep `import 'hyperfixi'`** (or `virtual:hyperfixi`, or `@hyperfixi/core`). Replace any side-effect import of
   `@hyperfixi/core/browser/hybrid-hx`, `/hybrid-complete` or `/hybrid-hx-v4`. They no longer
   exist.
4. **Rewrite core-only syntax** with the tables above. The bundle registers only the modules
   for keywords the scan finds. A form the engine lacks fails with a parse error that names the
   token.
5. **If you use `hx-*` attributes,** load htmx 4 yourself. The plugin no longer bundles an htmx
   layer. With `hx-*` attributes (or `htmx: true`), it hands htmx-swapped content to the engine.
6. **Expect a different size:** 18–34 KB gzipped, where 3.x produced 3.9–12.5 KB (or 352 KB on a
   `fetch` fallback). A non-English language adds semantic's parser and that language: 3 commands
   plus Spanish measured 209 KB.

### Step by step: importing `@hyperfixi/core` in Node or a library

1. **Use `import`.** The root is ESM-only. The subpaths `/multilingual`, `/ast-utils`,
   `/reference`, `/metadata` and `/lsp-metadata` still support `require`. If you only need the
   engine, depend on `@hyperfixi/engine` directly; `@hyperfixi/core` adds the tooling subpaths
   and `@lokascript/semantic`.
2. **Build an engine instead of a runtime:**

   ```js
   // 3.x
   import { hyperscript } from '@hyperfixi/core';
   const result = hyperscript.compileSync('toggle .active');
   await hyperscript.eval('add .clicked to me', element);

   // 4.0
   import { register, everything, api, evaluate, boot } from '@hyperfixi/core';
   register(...everything); // or register(on, toggle, add, …) for a smaller engine
   api.parse('toggle .active').errors; // [] when valid
   evaluate('add .clicked to me', { me: element });
   boot(); // in a browser: install as window._hyperscript and process the document
   ```

   `evaluate` runs against `document.body`, so Node needs a DOM such as jsdom or happy-dom.
   `parse` and `api.parse` do not.

3. **Watch the reused names.** At the root, `parse` is the engine's: it returns
   `{ kind: 'commands' | 'features' | 'expression', … }` and throws `ParseError`. `render` is
   the engine's template module. Semantic's parse and render live at
   `@hyperfixi/core/multilingual`, and both are async.
4. **Run other languages as text:**

   ```js
   import { preprocess } from '@lokascript/hyperscript-adapter';
   evaluate(preprocess('トグル .active', 'ja'), { me: element });
   // translate only:
   import { translate } from '@hyperfixi/core/multilingual';
   await translate('toggle .active', 'en', 'ar');
   ```

5. **Plugins.** Upstream-style plugins go through `api.use(plugin)`. New syntax is a grammar
   module passed to `register`, written like `@hyperfixi/speech`'s `speak` with `expr` imported
   from the engine.
6. **AST tooling.** Replace `fromCoreAST` with `@lokascript/semantic`'s `parseSemantic` →
   `buildAST` → `fromSemanticAST`. Add source spans with `withEnginePositions(nodes, source,
engineTree)` from `@hyperfixi/core/ast-utils`, where `engineTree` is the engine's `parse` of
   the same source.
7. **Reference data.** `@hyperfixi/core/reference` documents the engine's 53 commands; drop
   reads of `availability`. `metadata.bundleInfo` has one row, the engine's bundle.

## Migrating from v1.x to v2.0.0

### Overview

Version 2.0.0 splits the project into two npm scopes:

- **`@hyperfixi/*`** — Core hyperscript engine (runtime, parser, commands, vite-plugin, etc.)
- **`@lokascript/*`** — Multilingual packages (semantic parsing, i18n, language-server, etc.)

The primary window global is now `window.hyperfixi`. Bundle filenames changed from `lokascript-*.js` to `hyperfixi-*.js`.

**Backward compatibility:** Old `@lokascript/*` engine package names will be published as stub packages that re-export from `@hyperfixi/*`. Old bundle filenames (`lokascript-*.js`) are provided as aliases. `window.lokascript` still works with a deprecation warning.

**Timeline:**

- **v2.0.0** (Current): New names are primary, old names work with deprecation warnings
- **v3.0.0** (Future): Old names and aliases removed

### Quick Migration

#### 1. Update npm Packages

```bash
# Before
npm install @lokascript/core @lokascript/vite-plugin

# After
npm install @hyperfixi/core @hyperfixi/vite-plugin
```

**Package name changes:**

| v1.x (Old)                      | v2.0.0 (New)                   |
| ------------------------------- | ------------------------------ |
| `@lokascript/core`              | `@hyperfixi/core`              |
| `@lokascript/behaviors`         | `@hyperfixi/behaviors`         |
| `@lokascript/vite-plugin`       | `@hyperfixi/vite-plugin`       |
| `@lokascript/types-browser`     | `@hyperfixi/types-browser`     |
| `@lokascript/testing-framework` | `@hyperfixi/testing-framework` |
| `@lokascript/developer-tools`   | `@hyperfixi/developer-tools`   |
| `@lokascript/smart-bundling`    | `@hyperfixi/smart-bundling`    |
| `@lokascript/aot-compiler`      | `@hyperfixi/aot-compiler`      |

**Unchanged packages** (stay under `@lokascript`):

- `@lokascript/semantic`
- `@lokascript/i18n`
- `@lokascript/language-server`
- `@lokascript/mcp-server`
- `@lokascript/hyperscript-adapter`
- `@lokascript/patterns-reference`

#### 2. Update TypeScript Imports

```typescript
// Before
import { hyperscript } from '@lokascript/core';
import { hyperfixi } from '@lokascript/vite-plugin';
import type { BrowserEventPayload } from '@lokascript/core/registry/browser';

// After
import { hyperscript } from '@hyperfixi/core';
import { hyperfixi } from '@hyperfixi/vite-plugin';
import type { BrowserEventPayload } from '@hyperfixi/core/registry/browser';
```

#### 3. Update Bundle References

```html
<!-- Before -->
<script src="lokascript-hybrid-complete.js"></script>

<!-- After -->
<script src="hyperfixi-hybrid-complete.js"></script>
```

**Bundle filename changes:**

| v1.x (Old)                       | v2.0.0 (New)                   |
| -------------------------------- | ------------------------------ |
| `lokascript-browser.js`          | `hyperfixi.js`                 |
| `lokascript-lite.js`             | `hyperfixi-lite.js`            |
| `lokascript-lite-plus.js`        | `hyperfixi-lite-plus.js`       |
| `lokascript-hybrid-complete.js`  | `hyperfixi-hybrid-complete.js` |
| `lokascript-hybrid-hx.js`        | `hyperfixi-hx.js`              |
| `lokascript-browser-minimal.js`  | `hyperfixi-minimal.js`         |
| `lokascript-browser-standard.js` | `hyperfixi-standard.js`        |
| `lokascript-multilingual.js`     | `hyperfixi-multilingual.js`    |

#### 4. Update Window Global

```javascript
// Before
window.lokascript.execute('toggle .active', el);

// After
window.hyperfixi.execute('toggle .active', el);
```

#### 5. Update Debug localStorage Key

```javascript
// Before
localStorage.setItem('lokascript:debug', '*');

// After
localStorage.setItem('hyperfixi:debug', '*');
```

(The old key still works as a fallback.)

#### 6. Update CLI Commands

```bash
# Before
npx lokascript validate src/
npx lokascript-test
npx lokascript-aot compile src/

# After
npx hyperfixi validate src/
npx hyperfixi-test
npx hyperfixi-aot compile src/
```

### Automated Migration

Use find-and-replace across your project:

```bash
# Package imports (only rename engine packages, NOT @lokascript/semantic, @lokascript/i18n, etc.)
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.mjs" \) \
  -not -path "*/node_modules/*" \
  -exec perl -i -pe 's#\@lokascript/(core|behaviors|vite-plugin|types-browser|testing-framework|developer-tools|smart-bundling|aot-compiler)#\@hyperfixi/$1#g' {} +

# Bundle references in HTML
find . -type f -name "*.html" \
  -exec sed -i '' 's/lokascript-browser\.js/hyperfixi.js/g' {} + \
  -exec sed -i '' 's/lokascript-hybrid-complete\.js/hyperfixi-hybrid-complete.js/g' {} + \
  -exec sed -i '' 's/lokascript-hybrid-hx\.js/hyperfixi-hx.js/g' {} + \
  -exec sed -i '' 's/lokascript-lite-plus\.js/hyperfixi-lite-plus.js/g' {} + \
  -exec sed -i '' 's/lokascript-lite\.js/hyperfixi-lite.js/g' {} + \
  -exec sed -i '' 's/lokascript-browser-minimal\.js/hyperfixi-minimal.js/g' {} + \
  -exec sed -i '' 's/lokascript-browser-standard\.js/hyperfixi-standard.js/g' {} + \
  -exec sed -i '' 's/lokascript-multilingual\.js/hyperfixi-multilingual.js/g' {} +

# Window global
find . -type f \( -name "*.html" -o -name "*.js" -o -name "*.ts" \) \
  -not -path "*/node_modules/*" \
  -exec sed -i '' 's/window\.lokascript/window.hyperfixi/g' {} +
```

### Backward Compatibility

#### Bundle File Aliases

Old bundle names still work in v2.0.0 (they are copies of the new names):

```html
<!-- Both work -->
<script src="hyperfixi-hybrid-complete.js"></script>
<!-- New (primary) -->
<script src="lokascript-hybrid-complete.js"></script>
<!-- Old (alias, will be removed in v3.0.0) -->
```

#### Window Global

`window.lokascript` still works but shows a console warning:

```javascript
window.lokascript.execute(...)  // Shows deprecation warning
window.hyperfixi.execute(...)   // No warning
```

#### npm Stub Packages — retracted (2026-08-03)

Earlier revisions of this guide promised the old `@lokascript/*` engine package names would be republished as v2.0.0 stubs re-exporting from `@hyperfixi/*`. **That will not happen.** By the time the stubs could ship, the migration window had closed — the stranded names see only registry-scanner background traffic (~30 downloads/month, uniform across names) versus thousands on the `@hyperfixi/*` homes — and a silently-working wrapper would keep dead names accumulating new code forever, while forwarding only the main entry (none of `@hyperfixi/core`'s dozens of subpath exports).

Instead, the four `@lokascript/*` engine names that were ever published (`core`, `vite-plugin`, `mcp-server`, `patterns-reference`) are deprecated on npm with pointer messages naming their `@hyperfixi/*` replacement. If you still depend on one, switch the package name — the API at the time of the rename was identical. Full rationale: `stubs/README.md`.

### Why the Rename?

The project has two distinct audiences:

1. **Most users** want a modern hyperscript engine with fixi/htmx integration — "HyperFixi" communicates this immediately
2. **Multilingual users** want to write hyperscript in their native language — "LokaScript" (from Sanskrit "loka" = world) fits this

Having everything under `@lokascript/*` confused the messaging. The dual-scope split makes each product's purpose clear.

### Support

- **GitHub Issues:** https://github.com/codetalcott/hyperfixi/issues
- **Documentation:** https://github.com/codetalcott/hyperfixi#readme
