/**
 * LSP Metadata Module for LokaScript
 *
 * Provides canonical keyword lists and hover documentation for the language server.
 * This is the single source of truth - language-server imports from here.
 *
 * @example
 * ```typescript
 * import { COMMAND_KEYWORDS, HOVER_DOCS } from '@hyperfixi/core/lsp-metadata';
 * ```
 */

// =============================================================================
// KEYWORD CATEGORIES
// =============================================================================

/**
 * All command keywords in LokaScript
 */
export const COMMAND_KEYWORDS = [
  // DOM Commands
  'toggle',
  'add',
  'remove',
  'show',
  'hide',
  'put',
  'set',
  'get',
  'make',
  'swap',
  'morph',
  'append',
  'take',
  'render',

  // Async Commands
  'wait',
  'fetch',
  'settle',

  // Event Commands
  'send',
  'trigger',

  // Navigation Commands
  'go',
  'pushUrl',
  'replaceUrl',

  // Control Flow Commands
  'if',
  'else',
  'unless',
  'repeat',
  'for',
  'while',
  'break',
  'continue',

  // Execution Commands
  'call',
  'return',
  'throw',
  'halt',
  'exit',

  // Utility Commands
  'log',
  'tell',
  'copy',
  'pick',
  'beep',
  'js',
  'async',

  // Animation Commands
  'transition',
  'measure',

  // Data Commands
  'increment',
  'decrement',
  'default',

  // Behavior Commands
  'install',
] as const;

/**
 * Reference keywords (special identifiers)
 */
export const REFERENCE_KEYWORDS = [
  'me',
  'you',
  'it',
  'result',
  'event',
  'target',
  'detail',
  'body',
  'window',
  'document',
] as const;

/**
 * Top-level feature keywords
 */
export const FEATURE_KEYWORDS = [
  'on',
  'behavior',
  'def',
  'init',
  'worker',
  'socket',
  'eventsource',
] as const;

/**
 * Block/structure keywords
 */
export const BLOCK_KEYWORDS = ['then', 'end', 'from', 'to', 'into', 'with', 'as', 'in'] as const;

/**
 * Positional expression keywords
 */
export const POSITIONAL_KEYWORDS = [
  'first',
  'last',
  'next',
  'previous',
  'closest',
  'parent',
  'children',
  'random',
] as const;

/**
 * Logical/comparison keywords
 */
export const LOGICAL_KEYWORDS = [
  'and',
  'or',
  'not',
  'is',
  'are',
  'exists',
  'empty',
  'matches',
  'contains',
  'includes',
  'has',
  'no',
  'true',
  'false',
  'null',
] as const;

/**
 * All keywords combined (for quick lookup)
 */
export const ALL_KEYWORDS = [
  ...COMMAND_KEYWORDS,
  ...REFERENCE_KEYWORDS,
  ...FEATURE_KEYWORDS,
  ...BLOCK_KEYWORDS,
  ...POSITIONAL_KEYWORDS,
  ...LOGICAL_KEYWORDS,
] as const;

// =============================================================================
// HOVER DOCUMENTATION
// =============================================================================

export interface HoverDoc {
  title: string;
  description: string;
  example: string;
  category: 'command' | 'reference' | 'feature' | 'block' | 'positional' | 'logical';
  since?: string;
}

/**
 * Hover documentation for all keywords
 */
export const HOVER_DOCS: Record<string, HoverDoc> = {
  // DOM Commands
  toggle: {
    title: 'toggle',
    description: 'Toggles a class, attribute, or visibility state.',
    example: 'toggle .active on me\ntoggle @disabled on #btn',
    category: 'command',
  },
  add: {
    title: 'add',
    description: 'Adds a class or attribute to an element.',
    example: 'add .highlight to me\nadd @disabled to #btn',
    category: 'command',
  },
  remove: {
    title: 'remove',
    description: 'Removes a class, attribute, or element.',
    example: 'remove .highlight from me\nremove #temp',
    category: 'command',
  },
  show: {
    title: 'show',
    description: 'Makes an element visible.',
    example: 'show #modal\nshow me with *opacity',
    category: 'command',
  },
  hide: {
    title: 'hide',
    description: 'Hides an element.',
    example: 'hide #modal\nhide me with *opacity',
    category: 'command',
  },
  put: {
    title: 'put',
    description: 'Sets the content of an element.',
    example: 'put "Hello" into #message\nput response into #results',
    category: 'command',
  },
  set: {
    title: 'set',
    description: 'Sets a variable or property.',
    example: 'set :count to 0\nset $globalVar to "value"',
    category: 'command',
  },
  get: {
    title: 'get',
    description: 'Gets a value from an element or variable.',
    example: 'get the value of #input\nget #myElement',
    category: 'command',
  },
  make: {
    title: 'make',
    description: 'Creates a new element.',
    example: 'make a <div/> then put it after me',
    category: 'command',
  },
  swap: {
    title: 'swap',
    description: 'Swaps content between elements.',
    example: 'swap #a with #b\nswap innerHTML of #target with response',
    category: 'command',
  },
  morph: {
    title: 'morph',
    description: 'Morphs element content with smooth transitions.',
    example: 'morph #content to response',
    category: 'command',
  },
  append: {
    title: 'append',
    description: 'Appends content to an element.',
    example: 'append "<li>Item</li>" to #list',
    category: 'command',
  },
  take: {
    title: 'take',
    description: 'Takes/claims a class from sibling elements.',
    example: 'take .active from .tabs',
    category: 'command',
  },
  render: {
    title: 'render',
    description: 'Renders a template with data.',
    example: 'render #template with {name: "World"}',
    category: 'command',
  },

  // Async Commands
  wait: {
    title: 'wait',
    description: 'Pauses execution for a duration or until an event.',
    example: 'wait 1s\nwait 500ms then remove .loading\nwait for htmx:afterSwap',
    category: 'command',
  },
  fetch: {
    title: 'fetch',
    description: 'Makes an HTTP request.',
    example: 'fetch /api/data as json\nfetch /api/users then put it into #list',
    category: 'command',
  },
  settle: {
    title: 'settle',
    description: 'Waits for CSS transitions to complete.',
    example: 'add .fade-out then settle then remove me',
    category: 'command',
  },

  // Event Commands
  send: {
    title: 'send',
    description: 'Dispatches a custom event.',
    example: 'send myEvent to #target\nsend refresh to <body/>',
    category: 'command',
  },
  trigger: {
    title: 'trigger',
    description: 'Triggers an event on an element.',
    example: 'trigger click on #btn\ntrigger submit on closest <form/>',
    category: 'command',
  },

  // Navigation Commands
  go: {
    title: 'go',
    description: 'Navigates to a URL or scrolls to an element.',
    example: 'go to url /home\ngo to #section\ngo back',
    category: 'command',
  },

  // Control Flow Commands
  if: {
    title: 'if',
    description: 'Conditional execution.',
    example: 'if .active toggle .active\nif :count > 10 log "high"',
    category: 'command',
  },
  else: {
    title: 'else',
    description: 'Alternative branch in conditional.',
    example: 'if .active remove .active else add .active',
    category: 'block',
  },
  unless: {
    title: 'unless',
    description: 'Inverse conditional (if not).',
    example: 'unless .disabled add .clicked',
    category: 'command',
  },
  repeat: {
    title: 'repeat',
    description: 'Loops a specified number of times or over items.',
    example: 'repeat 5 times log "hello"\nrepeat for item in items',
    category: 'command',
  },
  for: {
    title: 'for',
    description: 'Iterates over a collection.',
    example: 'for item in items\n  log item\nend',
    category: 'command',
  },
  while: {
    title: 'while',
    description: 'Loops while condition is true.',
    example: 'while :count < 10\n  increment :count\nend',
    category: 'command',
  },
  break: {
    title: 'break',
    description: 'Exits the current loop.',
    example: 'repeat for x in items\n  if x is empty break\nend',
    category: 'command',
  },
  continue: {
    title: 'continue',
    description: 'Skips to the next iteration.',
    example: 'repeat for x in items\n  if x < 0 continue\n  log x\nend',
    category: 'command',
  },

  // Execution Commands
  call: {
    title: 'call',
    description: 'Calls a function or method.',
    example: 'call myFunction()\ncall element.focus()',
    category: 'command',
  },
  return: {
    title: 'return',
    description: 'Returns a value from a function.',
    example: 'return :result\nreturn x + y',
    category: 'command',
  },
  throw: {
    title: 'throw',
    description: 'Throws an error.',
    example: 'throw "Invalid input"',
    category: 'command',
  },
  halt: {
    title: 'halt',
    description: 'Stops all execution and event bubbling.',
    example: 'halt\nhalt the event',
    category: 'command',
  },
  exit: {
    title: 'exit',
    description: 'Exits the current handler.',
    example: 'if not valid exit',
    category: 'command',
  },

  // Utility Commands
  log: {
    title: 'log',
    description: 'Logs a value to the console.',
    example: 'log "Hello"\nlog the value of #input',
    category: 'command',
  },
  tell: {
    title: 'tell',
    description: 'Sets context for subsequent commands.',
    example: 'tell #modal to show',
    category: 'command',
  },
  copy: {
    title: 'copy',
    description: 'Copies text to clipboard.',
    example: 'copy "Hello" to clipboard\ncopy the value of #input',
    category: 'command',
  },
  pick: {
    title: 'pick',
    description: 'Opens a file picker dialog.',
    example: 'pick file then log it',
    category: 'command',
  },
  beep: {
    title: 'beep',
    description: 'Highlights element for debugging.',
    example: 'beep! me\nbeep! #target',
    category: 'command',
  },
  js: {
    title: 'js',
    description: 'Executes inline JavaScript.',
    example: 'js(event) return event.clientX end',
    category: 'command',
  },
  async: {
    title: 'async',
    description: 'Runs commands asynchronously (non-blocking).',
    example: 'async do fetch /api/data end',
    category: 'command',
  },

  // Animation Commands
  transition: {
    title: 'transition',
    description: 'Applies CSS transition.',
    example: "transition #box's opacity to 0 over 500ms",
    category: 'command',
  },
  measure: {
    title: 'measure',
    description: 'Measures element dimensions.',
    example: 'measure #box then log result.width',
    category: 'command',
  },

  // Data Commands
  increment: {
    title: 'increment',
    description: 'Increments a numeric value.',
    example: 'increment :count\nincrement #counter.value by 5',
    category: 'command',
  },
  decrement: {
    title: 'decrement',
    description: 'Decrements a numeric value.',
    example: 'decrement :count\ndecrement #counter.value by 2',
    category: 'command',
  },
  default: {
    title: 'default',
    description: 'Sets a default value if undefined.',
    example: 'default :count to 0',
    category: 'command',
  },

  // Behavior Commands
  install: {
    title: 'install',
    description: 'Installs a behavior on an element.',
    example: 'install Draggable',
    category: 'command',
  },

  // Reference Keywords
  me: {
    title: 'me',
    description: 'References the current element (the element with this hyperscript).',
    example: 'toggle .active on me',
    category: 'reference',
  },
  you: {
    title: 'you',
    description: 'References the element that triggered the event.',
    example: 'add .clicked to you',
    category: 'reference',
  },
  it: {
    title: 'it',
    description: 'References the result of the last expression.',
    example: 'fetch /api/data then put it into #result',
    category: 'reference',
  },
  result: {
    title: 'result',
    description: 'Alias for `it` - the result of the last expression.',
    example: 'call myFunction() then log result',
    category: 'reference',
  },
  event: {
    title: 'event',
    description: 'References the current event object.',
    example: 'log event.target\nif event.key is "Enter"',
    category: 'reference',
  },
  target: {
    title: 'target',
    description: 'References the event target element.',
    example: 'add .clicked to target',
    category: 'reference',
  },
  detail: {
    title: 'detail',
    description: 'References the detail property of custom events.',
    example: 'log detail.message',
    category: 'reference',
  },
  body: {
    title: 'body',
    description: 'References document.body.',
    example: 'add .dark-mode to body',
    category: 'reference',
  },

  // Feature Keywords
  on: {
    title: 'on',
    description: 'Defines an event handler.',
    example: 'on click toggle .active\non keydown[key=="Enter"] submit()',
    category: 'feature',
  },
  behavior: {
    title: 'behavior',
    description: 'Defines a reusable behavior.',
    example: 'behavior Clickable\n  on click toggle .active\nend',
    category: 'feature',
  },
  def: {
    title: 'def',
    description: 'Defines a function.',
    example: 'def greet(name)\n  log "Hello " + name\nend',
    category: 'feature',
  },
  init: {
    title: 'init',
    description: 'Runs code when element initializes.',
    example: 'init\n  set :count to 0\nend',
    category: 'feature',
  },

  // Block Keywords
  then: {
    title: 'then',
    description: 'Chains commands sequentially.',
    example: 'add .loading then fetch /api then remove .loading',
    category: 'block',
  },
  end: {
    title: 'end',
    description: 'Ends a block (behavior, def, if, repeat, etc.).',
    example: 'behavior Modal\n  on open show me\nend',
    category: 'block',
  },
  from: {
    title: 'from',
    description: 'Specifies source element.',
    example: 'remove .active from .tabs',
    category: 'block',
  },
  to: {
    title: 'to',
    description: 'Specifies destination or target.',
    example: 'add .active to me\ngo to url /home',
    category: 'block',
  },
  into: {
    title: 'into',
    description: 'Specifies insertion destination.',
    example: 'put "Hello" into #message',
    category: 'block',
  },
  with: {
    title: 'with',
    description: 'Specifies accompanying options or data.',
    example: 'show me with *opacity\nrender #template with {name: "World"}',
    category: 'block',
  },
  as: {
    title: 'as',
    description: 'Type conversion or format specification.',
    example: 'fetch /api as json\nget #input as Int',
    category: 'block',
  },
  in: {
    title: 'in',
    description: 'Specifies iteration target.',
    example: 'for item in items',
    category: 'block',
  },

  // Positional Keywords
  first: {
    title: 'first',
    description: 'Selects the first element from a collection.',
    example: 'first <li/> in #list',
    category: 'positional',
  },
  last: {
    title: 'last',
    description: 'Selects the last element from a collection.',
    example: 'last <li/> in #list',
    category: 'positional',
  },
  next: {
    title: 'next',
    description: 'Selects the next sibling element.',
    example: 'next <input/>',
    category: 'positional',
  },
  previous: {
    title: 'previous',
    description: 'Selects the previous sibling element.',
    example: 'previous <div/>',
    category: 'positional',
  },
  closest: {
    title: 'closest',
    description: 'Selects the nearest ancestor matching selector.',
    example: 'closest <form/>\nclosest .container',
    category: 'positional',
  },
  parent: {
    title: 'parent',
    description: 'Selects the parent element.',
    example: 'parent of me',
    category: 'positional',
  },
  random: {
    title: 'random',
    description: 'Selects a random element from a collection.',
    example: 'random <li/> in #list',
    category: 'positional',
  },

  // Logical Keywords
  and: {
    title: 'and',
    description: 'Logical AND operator.',
    example: 'if .active and .visible',
    category: 'logical',
  },
  or: {
    title: 'or',
    description: 'Logical OR operator.',
    example: 'if .error or .warning',
    category: 'logical',
  },
  not: {
    title: 'not',
    description: 'Logical NOT operator.',
    example: 'if not .disabled',
    category: 'logical',
  },
  is: {
    title: 'is',
    description: 'Equality or type check.',
    example: 'if :count is 0\nif me is .active',
    category: 'logical',
  },
  exists: {
    title: 'exists',
    description: 'Checks if element/value exists.',
    example: 'if #modal exists',
    category: 'logical',
  },
  empty: {
    title: 'empty',
    description: 'Checks if value is empty.',
    example: 'if #input.value is empty',
    category: 'logical',
  },
  matches: {
    title: 'matches',
    description: 'Tests against a selector or pattern.',
    example: 'if me matches .active',
    category: 'logical',
  },
  contains: {
    title: 'contains',
    description: 'Checks if element contains another.',
    example: 'if #list contains #item',
    category: 'logical',
  },
  has: {
    title: 'has',
    description: 'Checks if element has a class/attribute.',
    example: 'if me has .active',
    category: 'logical',
  },
} as const;

// =============================================================================
// EVENT NAMES
// =============================================================================

/**
 * Common DOM event names for completions
 */
export const EVENT_NAMES = [
  // Mouse events
  'click',
  'dblclick',
  'mousedown',
  'mouseup',
  'mouseenter',
  'mouseleave',
  'mouseover',
  'mouseout',
  'mousemove',
  'contextmenu',

  // Keyboard events
  'keydown',
  'keyup',
  'keypress',

  // Form events
  'input',
  'change',
  'submit',
  'reset',
  'focus',
  'blur',
  'focusin',
  'focusout',

  // Document/Window events
  'load',
  'DOMContentLoaded',
  'unload',
  'beforeunload',
  'resize',
  'scroll',

  // Drag events
  'drag',
  'dragstart',
  'dragend',
  'dragenter',
  'dragleave',
  'dragover',
  'drop',

  // Touch events
  'touchstart',
  'touchend',
  'touchmove',
  'touchcancel',

  // Pointer events
  'pointerdown',
  'pointerup',
  'pointermove',
  'pointerenter',
  'pointerleave',
  'pointerover',
  'pointerout',
  'pointercancel',

  // Animation/Transition events
  'animationstart',
  'animationend',
  'animationiteration',
  'transitionstart',
  'transitionend',
  'transitionrun',
  'transitioncancel',

  // Custom htmx/hyperscript events
  'htmx:load',
  'htmx:beforeRequest',
  'htmx:afterRequest',
  'htmx:beforeSwap',
  'htmx:afterSwap',
  'htmx:afterSettle',
  'htmx:configRequest',
  'htmx:responseError',
  'htmx:sendError',

  // Intersection observer
  'intersect',
  'appear',
] as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CommandKeyword = (typeof COMMAND_KEYWORDS)[number];
export type ReferenceKeyword = (typeof REFERENCE_KEYWORDS)[number];
export type FeatureKeyword = (typeof FEATURE_KEYWORDS)[number];
export type BlockKeyword = (typeof BLOCK_KEYWORDS)[number];
export type PositionalKeyword = (typeof POSITIONAL_KEYWORDS)[number];
export type LogicalKeyword = (typeof LOGICAL_KEYWORDS)[number];
export type AllKeyword = (typeof ALL_KEYWORDS)[number];
export type EventName = (typeof EVENT_NAMES)[number];
