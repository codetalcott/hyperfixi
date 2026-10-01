/**
 * The engine as a library.
 *
 * An engine is assembled from grammar modules: `register(on, add, toggle)` makes those three
 * exist, and nothing else. `boot()` installs it as `window._hyperscript` and initialises the
 * document. Every module below is a function to pass to `register`.
 */
export {
  api,
  boot,
  cleanup,
  evaluate,
  grammar,
  parse,
  parseProgram,
  processNode,
  register,
} from './engine';
export type { Module, Parsed, SourceTransform } from './engine';
export { ParseError, Parser, createGrammar, formatError } from './parser';
export type { ChainRule, CommandRule, FeatureRule, Grammar, LeafRule } from './parser';
export { tokenize } from './tokenizer';
export type { Token } from './tokenizer';
export { config } from './runtime';
export type { Config } from './runtime';
export type * from './ast';

// Features
export { on } from './on';
export { behavior, def, init, install, setFeature } from './features';
export { createEffect, reactivity } from './reactivity';
export { liveTemplates } from './live-templates';

// Expression kinds beyond the core chain
export { conversions } from './conversions';
export { cookies } from './cookies';
export { expressionsExtra } from './expressions-extra';

// Commands
export { settle, transition, viewTransition } from './commands/animation';
export { halt, ifCommand, returnCommand, throwCommand } from './commands/control';
export { add, remove, toggle } from './commands/dom';
export {
  append,
  hideShow,
  make,
  measure,
  openClose,
  swap,
  take,
  targetCommands,
} from './commands/dom-more';
export { send, wait } from './commands/events';
export { js } from './commands/js';
export { loopControl, repeat, tell } from './commands/loops';
export { askAnswer, breakpoint, get_, log, pseudoCommand } from './commands/misc';
export { morph } from './commands/morph';
export { pick } from './commands/pick';
export { fetchCommand, go, scroll } from './commands/platform';
export { defaultCommand, increment, put, set } from './commands/setters';
export { render } from './templates';
