/**
 * What an extension module may call: the one surface for module authors, in-tree (`src/ext/`)
 * or not (`@hyperfixi/speech`). `index.ts` exports it for ESM. The public object carries it as
 * `_hyperscript.kit`, and an extension loaded by a script tag (`dist/ext/<name>.js`) reads it
 * there, so it calls the page's engine instead of carrying a copy. An extension's value imports
 * come from here only (its types may come from anywhere); the build fails on any other. Adding
 * a name here changes the public API, so a name is added when an extension needs it.
 */
// A rule parses an operand with it.
export { expr } from './expressions';
// `config.hideShowStrategies`, `config.conversions`, and the rest of upstream's `config`.
export { config } from './runtime';
