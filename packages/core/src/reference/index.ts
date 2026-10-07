/**
 * Quick Reference Module for LokaScript
 *
 * Provides programmatic access to command documentation, bundle information,
 * and common patterns for developers and LLM agents.
 *
 * @example
 * ```typescript
 * import { commands, bundles, patterns } from '@hyperfixi/core/reference';
 *
 * // Get command syntax
 * console.log(commands.toggle.syntax); // 'toggle .class [on target]'
 *
 * // Find bundle by use case
 * const bundle = bundles.find(b => b.name === 'browser');
 * ```
 */

// =============================================================================
// COMMAND REFERENCE
// =============================================================================

export interface CommandRef {
  /** Command name */
  name: string;
  /** Brief description */
  description: string;
  /** Basic syntax pattern */
  syntax: string;
  /** Category for grouping */
  category: CommandCategory;
  /** Usage examples */
  examples: string[];
}

export type CommandCategory =
  | 'dom'
  | 'async'
  | 'data'
  | 'utility'
  | 'events'
  | 'navigation'
  | 'control-flow'
  | 'execution'
  | 'content'
  | 'animation'
  | 'advanced'
  | 'behaviors'
  | 'templates';

/**
 * Every command the engine (`@hyperfixi/engine`) registers, keyed by its keyword, with
 * syntax and examples in upstream _hyperscript's spelling. `npm run verify:reference`
 * checks the keys against the engine's grammar and parses every example on it.
 */
export const commands: Record<string, CommandRef> = {
  // DOM Commands
  toggle: {
    name: 'toggle',
    description: 'Toggle CSS classes, attributes, or properties on elements',
    syntax: 'toggle .class [on target]',
    category: 'dom',
    examples: ['toggle .active', 'toggle .hidden on #modal', 'toggle @disabled on <button/>'],
  },
  add: {
    name: 'add',
    description: 'Add CSS classes, attributes, or styles to elements',
    syntax: 'add .class [to target]',
    category: 'dom',
    examples: ['add .highlight', 'add .active to #nav', 'add @required to <input/>'],
  },
  remove: {
    name: 'remove',
    description: 'Remove CSS classes, attributes, styles, or elements',
    syntax: 'remove .class [from target]',
    category: 'dom',
    examples: ['remove .loading', 'remove #temp-element', 'remove @disabled from me'],
  },
  hide: {
    name: 'hide',
    description: 'Hide elements by setting display:none',
    syntax: 'hide [target]',
    category: 'dom',
    examples: ['hide', 'hide #modal', 'hide .dropdown'],
  },
  show: {
    name: 'show',
    description: 'Show hidden elements',
    syntax: 'show [target]',
    category: 'dom',
    examples: ['show', 'show #modal', 'show .dropdown'],
  },
  put: {
    name: 'put',
    description: 'Set content or values',
    syntax: 'put value into|before|after|at start of|at end of target',
    category: 'dom',
    examples: [
      'put "Hello" into #output',
      'put it into me',
      "put '<p>New</p>' into #container",
      'put "x" at end of me',
    ],
  },
  make: {
    name: 'make',
    description: 'Create new DOM elements',
    syntax: 'make a <tag/> [called name]',
    category: 'dom',
    examples: ['make a <div.card/>', 'make a <button/> then put it into #toolbar'],
  },
  empty: {
    name: 'empty',
    description: 'Remove all children from an element (sets innerHTML to empty)',
    syntax: 'empty [target]',
    category: 'dom',
    examples: ['empty me', 'empty #list', 'empty .results'],
  },
  open: {
    name: 'open',
    // Upstream's open is modal; core's `as non-modal` reads on the engine as an
    // expression, `(#d as non) - modal`. A non-modal dialog is `call #d.show()`.
    description: 'Open a dialog (showModal), details element, or popover',
    syntax: 'open [target]',
    category: 'dom',
    examples: ['open #myDialog', 'open #details', 'open #popup'],
  },
  close: {
    name: 'close',
    description: 'Close a dialog, details element, or popover',
    syntax: 'close [target]',
    category: 'dom',
    examples: ['close', 'close #myDialog', 'close #details'],
  },
  select: {
    name: 'select',
    description:
      'Select the text in an <input>/<textarea>, or select the contents of a DOM element',
    syntax: 'select [target]',
    category: 'dom',
    examples: ['select #search', 'select <textarea/>', 'select me'],
  },
  reset: {
    name: 'reset',
    description: 'Reset a <form> to its default values (HTMLFormElement.reset())',
    syntax: 'reset [target]',
    category: 'dom',
    examples: ['reset', 'reset #myForm', 'reset <form/>'],
  },
  clear: {
    name: 'clear',
    description:
      'Reset a variable to null, or clear the value of a form field (<input>, <textarea>, <select>)',
    syntax: 'clear <var|target>',
    category: 'data',
    examples: ['clear :count', 'clear myVar', 'clear #search', 'clear <textarea/>'],
  },
  breakpoint: {
    name: 'breakpoint',
    description: 'Drop into the debugger (emits a debugger; statement)',
    syntax: 'breakpoint',
    category: 'utility',
    examples: ['breakpoint', 'on click breakpoint'],
  },
  focus: {
    name: 'focus',
    description: 'Focus an element (calls HTMLElement.focus())',
    syntax: 'focus [target]',
    category: 'execution',
    examples: ['focus #search', 'focus the first <input/>', 'focus me'],
  },
  blur: {
    name: 'blur',
    description: 'Remove focus from an element (calls HTMLElement.blur())',
    syntax: 'blur [target]',
    category: 'execution',
    examples: ['blur #search', 'blur me'],
  },
  swap: {
    name: 'swap',
    description: 'Exchange two elements, or a writable value with another value',
    syntax: 'swap target with value',
    category: 'dom',
    examples: ['swap #a with #b', 'swap innerHTML of #target with result'],
  },
  morph: {
    name: 'morph',
    description: 'Intelligently morph element content preserving state',
    syntax: 'morph target to content',
    category: 'dom',
    examples: ['morph #content to result', 'morph me to "<div>New</div>"'],
  },

  // Async Commands
  wait: {
    name: 'wait',
    description: 'Pause execution for duration or until event',
    syntax: 'wait duration | wait for event',
    category: 'async',
    examples: ['wait 1s', 'wait 500ms', 'wait for transitionend'],
  },
  fetch: {
    name: 'fetch',
    description: 'Make HTTP requests',
    syntax: 'fetch url [as type] [with options]',
    category: 'async',
    examples: [
      'fetch /api/data as json',
      'fetch https://example.com/api as json',
      'fetch /api/${id} as json',
      'fetch /api/users as html',
      'fetch /api/submit with method:"POST"',
    ],
  },

  // Data Commands
  set: {
    name: 'set',
    description: 'Set variables or properties',
    syntax: 'set target to value',
    category: 'data',
    examples: ['set :count to 0', "set #input's value to ''", 'set x to 10'],
  },
  get: {
    name: 'get',
    description: 'Get property values',
    syntax: 'get expression',
    category: 'data',
    examples: ["get #input's value", "get #element's textContent"],
  },
  increment: {
    name: 'increment',
    description: 'Increase numeric value',
    syntax: 'increment target [by amount]',
    category: 'data',
    examples: ['increment :count', 'increment :score by 10'],
  },
  decrement: {
    name: 'decrement',
    description: 'Decrease numeric value',
    syntax: 'decrement target [by amount]',
    category: 'data',
    examples: ['decrement :count', 'decrement :lives by 1'],
  },
  default: {
    name: 'default',
    description: 'Set default value if not already set',
    syntax: 'default target to value',
    category: 'data',
    examples: ['default :count to 0', 'default :theme to "light"'],
  },

  // Utility Commands
  log: {
    name: 'log',
    description: 'Log values to console',
    syntax: 'log value',
    category: 'utility',
    examples: ['log "Debug info"', 'log :count', 'log event'],
  },
  tell: {
    name: 'tell',
    description: 'Execute commands on another element',
    syntax: 'tell target <commands> end',
    category: 'utility',
    examples: ['tell #other add .active end', 'tell <form/> call it.reset() end'],
  },
  pick: {
    name: 'pick',
    description: 'Pick a range of items or characters, or a regex match, out of a value',
    syntax: 'pick items|characters start to end from value | pick match of regex from text',
    category: 'utility',
    examples: ['pick items 0 to 2 from :list', 'pick characters 0 to 3 from "hello"'],
  },
  'beep!': {
    name: 'beep!',
    description: 'Log values to the console with their types (debugging)',
    syntax: 'beep! value[, value]',
    category: 'utility',
    examples: ['beep! me', 'beep! :count, result'],
  },
  ask: {
    name: 'ask',
    description: 'Ask the user for text (window.prompt); the answer is in it',
    syntax: 'ask message',
    category: 'utility',
    examples: ['ask "Your name?" then put it into #name'],
  },
  answer: {
    name: 'answer',
    description:
      'Show a message (window.alert), or ask to confirm (window.confirm) and put the chosen value in it',
    syntax: 'answer message [with yesValue or noValue]',
    category: 'utility',
    examples: ['answer "Saved"', 'answer "Delete it?" with "yes" or "no"'],
  },

  // Event Commands
  trigger: {
    name: 'trigger',
    description: 'Dispatch custom events',
    syntax: 'trigger eventName [on target]',
    category: 'events',
    examples: ['trigger customEvent', 'trigger submit on <form/>', 'trigger click on #btn'],
  },
  send: {
    name: 'send',
    description: 'Send event with data to element',
    syntax: 'send eventName[(detail)] [to target]',
    category: 'events',
    examples: ['send update to #dashboard', 'send notify(message: "Done") to #out'],
  },

  // Navigation Commands
  go: {
    name: 'go',
    description: 'Navigate to URL',
    syntax: 'go to url',
    category: 'navigation',
    examples: ['go to /dashboard', 'go to url /help in new window'],
  },
  scroll: {
    name: 'scroll',
    description:
      'Scroll an element into view (upstream _hyperscript 0.9.90 replacement for `go to top of`)',
    syntax:
      'scroll to [top|middle|bottom|nearest] [left|center|right] [of] target [smoothly|instantly] | scroll [target] [up|down|left|right] by n [px]',
    category: 'navigation',
    examples: [
      'scroll to #top',
      'scroll to bottom of #chat',
      'scroll to me smoothly',
      'scroll down by 200',
    ],
  },

  // Control Flow Commands
  if: {
    name: 'if',
    description: 'Conditional execution',
    syntax: 'if condition ... [else ...] end',
    category: 'control-flow',
    examples: ['if :count > 0 add .active end', 'if me matches .open hide me else show me end'],
  },
  repeat: {
    name: 'repeat',
    description: 'Loop execution',
    syntax:
      'repeat N times ... end | repeat while condition ... end | repeat for item in collection ... end',
    category: 'control-flow',
    examples: ['repeat 3 times add .pulse end', 'repeat while :count < 10 increment :count end'],
  },
  for: {
    name: 'for',
    description: 'Loop over a collection',
    syntax: 'for item in collection ... end',
    category: 'control-flow',
    examples: ['for item in <li/> add .done to item end'],
  },
  break: {
    name: 'break',
    description: 'Exit current loop',
    syntax: 'break',
    category: 'control-flow',
    examples: ['if :found break end'],
  },
  continue: {
    name: 'continue',
    description: 'Skip to next loop iteration',
    syntax: 'continue',
    category: 'control-flow',
    examples: ['if item matches .skip continue end'],
  },
  halt: {
    name: 'halt',
    description: 'Stop all execution',
    syntax: 'halt',
    category: 'control-flow',
    examples: ['if :error halt end'],
  },
  return: {
    name: 'return',
    description: 'Return value from function',
    syntax: 'return [value]',
    category: 'control-flow',
    examples: ['return :result', 'return'],
  },
  exit: {
    name: 'exit',
    description: 'Exit current handler',
    syntax: 'exit',
    category: 'control-flow',
    examples: ['if :done exit end'],
  },
  throw: {
    name: 'throw',
    description: 'Throw an error',
    syntax: 'throw message',
    category: 'control-flow',
    examples: ['throw "Invalid input"'],
  },

  // Execution Commands
  call: {
    name: 'call',
    description: 'Call a function or method',
    syntax: 'call expression',
    category: 'execution',
    examples: ['call validate()', 'call #myForm.reset()'],
  },

  // Content Commands
  append: {
    name: 'append',
    description: 'Append content to element',
    syntax: 'append content to target',
    category: 'content',
    examples: ['append "<li>New</li>" to #list', 'append result to #container'],
  },

  // Animation Commands
  start: {
    name: 'start',
    description: 'Animate DOM mutations via document.startViewTransition (View Transitions API)',
    syntax: 'start view transition [using name] <body> end',
    category: 'animation',
    examples: [
      'start view transition put result into #out end',
      'start view transition using "slide" remove .open from #panel end',
    ],
  },
  transition: {
    name: 'transition',
    description: 'Apply CSS transitions',
    syntax: 'transition [target] property to value [over duration]',
    category: 'animation',
    examples: [
      'transition opacity to 0 over 300ms',
      "transition #box's *opacity to 0 over 300ms",
      'transition height to 100px',
    ],
  },
  measure: {
    name: 'measure',
    description: 'Measure element dimensions',
    syntax: 'measure target',
    category: 'animation',
    examples: ['measure #element', 'measure me'],
  },
  settle: {
    name: 'settle',
    description: 'Wait for animations to complete',
    syntax: 'settle',
    category: 'animation',
    examples: ['add .animate then settle then remove .animate'],
  },
  take: {
    name: 'take',
    description: 'Take class from siblings (radio-button pattern)',
    syntax: 'take .class [from <source>] [for <recipient>]',
    category: 'animation',
    examples: ['take .active from .tab for me', 'take .selected'],
  },

  // Advanced Commands
  js: {
    name: 'js',
    description: 'Execute inline JavaScript',
    syntax: 'js[(params)] <javascript> end',
    category: 'advanced',
    examples: ['js console.log("hi") end', 'js(x) return x * 2 end'],
  },

  // Template Commands
  render: {
    name: 'render',
    description: 'Render template with data',
    syntax: 'render template [with name: value, ...]',
    category: 'templates',
    examples: ['render #userTemplate with user: :user'],
  },
};

/**
 * Get commands by category
 */
export function getCommandsByCategory(category: CommandCategory): CommandRef[] {
  return Object.values(commands).filter(cmd => cmd.category === category);
}

/**
 * Search commands by keyword
 */
export function searchCommands(query: string): CommandRef[] {
  const q = query.toLowerCase();
  return Object.values(commands).filter(
    cmd =>
      cmd.name.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.syntax.toLowerCase().includes(q)
  );
}

// =============================================================================
// BUNDLE REFERENCE
// =============================================================================

export interface BundleRef {
  /** Bundle name */
  name: string;
  /** Bundle file (in dist/) */
  file: string;
  /** Approximate gzipped size */
  size: string;
  /** Number of commands included */
  commandCount: number;
  /** Whether block commands (if/repeat/for) are included */
  hasBlocks: boolean;
  /** Whether event modifiers (`debounced at`, `throttled at`) are included */
  hasEventModifiers: boolean;
  /** Whether positional expressions (first, last, next) are included */
  hasPositional: boolean;
  /** Primary use case */
  useCase: string;
  /** Import path */
  importPath: string;
}

/**
 * All available bundles with metadata
 */
export const bundles: BundleRef[] = [
  // hybrid-complete and hybrid-hx retired in Phase C3 of the engine cutover,
  // multilingual after them (C-R3). Since C-R4b hyperfixi.js is the engine's
  // hyperfixi-hs.js (@hyperfixi/engine) under core's name; the same numbers
  // as metadata.ts's `browser` row.
  {
    name: 'browser',
    file: 'hyperfixi.js',
    size: '33.3 KB',
    commandCount: 53,
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    useCase: "Hyperscript, upstream's grammar, every module; the same file as hyperfixi-hs.js",
    importPath: '@hyperfixi/core/browser',
  },
];

/**
 * Find the smallest bundle that supports given features
 */
export function findBundleForFeatures(options: {
  commands?: string[];
  blocks?: boolean;
  eventModifiers?: boolean;
  positional?: boolean;
}): BundleRef | undefined {
  const { commands: requiredCommands = [], blocks, eventModifiers, positional } = options;

  // Sort by size (ascending)
  const sorted = [...bundles].sort((a, b) => parseFloat(a.size) - parseFloat(b.size));

  for (const bundle of sorted) {
    // Check features
    if (blocks && !bundle.hasBlocks) continue;
    if (eventModifiers && !bundle.hasEventModifiers) continue;
    if (positional && !bundle.hasPositional) continue;

    // The one bundle registers every module, so it has every documented command.
    if (requiredCommands.every(cmd => cmd in commands)) {
      return bundle;
    }
  }

  return undefined;
}

// =============================================================================
// COMMON PATTERNS
// =============================================================================

export interface PatternRef {
  /** Pattern name */
  name: string;
  /** Brief description */
  description: string;
  /** Hyperscript code */
  code: string;
  /** Required commands */
  commands: string[];
}

/**
 * Common patterns for quick reference
 */
export const patterns: PatternRef[] = [
  {
    name: 'Toggle Class',
    description: 'Toggle a class on click',
    code: 'on click toggle .active',
    commands: ['toggle'],
  },
  {
    name: 'Show/Hide Modal',
    description: 'Show modal on click, hide on close',
    code: 'on click show #modal\non click from .close hide #modal',
    commands: ['show', 'hide'],
  },
  {
    name: 'Form Submit',
    description: 'Submit form via fetch, show result',
    code: 'on submit halt the event then fetch /api/submit with {method:"POST", body: me as FormData} then put result into #response',
    commands: ['fetch', 'put'],
  },
  {
    name: 'Counter',
    description: 'Increment/decrement counter',
    code: 'on click from .increment increment :count\non click from .decrement decrement :count',
    commands: ['increment', 'decrement'],
  },
  {
    name: 'Debounced Input',
    description: 'Search with debounce',
    code: 'on input debounced at 300ms fetch `/search?q=${my value}` as html then put result into #results',
    commands: ['fetch', 'put'],
  },
  {
    name: 'Tab Switching',
    description: 'Radio-button style tab selection',
    code: 'on click take .active from .tab-btn then show next <.tab-panel/>',
    commands: ['take', 'show'],
  },
  {
    name: 'Infinite Scroll',
    description: 'Load more content on scroll',
    code: 'on scroll if me.scrollTop + me.clientHeight >= me.scrollHeight - 100 fetch /api/more then append result to #list end',
    commands: ['fetch', 'append'],
  },
  {
    name: 'Copy to Clipboard',
    description: 'Copy text with feedback',
    code: "on click call navigator.clipboard.writeText(#input's value) then add .copied then wait 1s then remove .copied",
    commands: ['call', 'add', 'wait', 'remove'],
  },
];

/**
 * Search patterns by keyword
 */
export function searchPatterns(query: string): PatternRef[] {
  const q = query.toLowerCase();
  return patterns.filter(
    p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q)
  );
}
