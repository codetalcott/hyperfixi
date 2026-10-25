/**
 * What an extension module may call: the one surface for module authors, in-tree (`src/ext/`)
 * or not (`@hyperfixi/speech`). `index.ts` exports it for ESM. The script-tag bundle
 * (`bundles/full.ts`, so `hyperfixi-hs.js`) carries it as `_hyperscript.kit`, and an extension
 * loaded by a script tag (`dist/ext/<name>.js`) reads it there, so it calls the page's engine
 * instead of carrying a copy. Only that bundle carries it: a bundle built from ESM keeps only
 * the parts of the engine its modules use, and registers extensions from ESM. An extension's value imports
 * come from here only (its types may come from anywhere); the build fails on any other. Adding
 * a name here changes the public API, so a name is added when an extension needs it.
 */
// Parsing what follows a keyword: an operand (`expr`); a dotted name (`MyApp.chat`); a bare URL
// or an expression (`ws://…`, `/chat`, `url`); a value a feature takes when it is read
// (`evalStatic`, for `with timeout 1500`); a body of commands (`commandList`). (`socket`)
export { dotOrColonPath, evalStatic, expr, urlOrExpression } from './expressions';
export { commandList } from './statements';
// Running: a context to run commands in (`makeContext`), running them (`runList`), and defining
// the name a feature installs (`assignToNamespace`: on its element, or globally for a script
// tag). (`socket`) `config`: `config.hideShowStrategies` (`tailwind`), `config.conversions`, and
// the rest of upstream's `config`.
export { assignToNamespace, config, makeContext, runList } from './runtime';
