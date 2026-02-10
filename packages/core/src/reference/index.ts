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
 * const bundle = bundles.find(b => b.name === 'hybrid-complete');
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
  /** Availability in lite bundles */
  availability: BundleAvailability;
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

export type BundleAvailability = 'lite' | 'lite-plus' | 'hybrid' | 'full';

/**
 * All 43 commands with syntax and descriptions
 */
export const commands: Record<string, CommandRef> = {
  // DOM Commands
  toggle: {
    name: 'toggle',
    description: 'Toggle CSS classes, attributes, or properties on elements',
    syntax: 'toggle .class [on target]',
    category: 'dom',
    availability: 'lite',
    examples: ['toggle .active', 'toggle .hidden on #modal', 'toggle @disabled on <button/>'],
  },
  add: {
    name: 'add',
    description: 'Add CSS classes, attributes, or styles to elements',
    syntax: 'add .class [to target]',
    category: 'dom',
    availability: 'lite',
    examples: ['add .highlight', 'add .active to #nav', 'add @required to <input/>'],
  },
  remove: {
    name: 'remove',
    description: 'Remove CSS classes, attributes, styles, or elements',
    syntax: 'remove .class [from target]',
    category: 'dom',
    availability: 'lite',
    examples: ['remove .loading', 'remove #temp-element', 'remove @disabled from me'],
  },
  hide: {
    name: 'hide',
    description: 'Hide elements by setting display:none',
    syntax: 'hide [target]',
    category: 'dom',
    availability: 'lite',
    examples: ['hide', 'hide #modal', 'hide .dropdown'],
  },
  show: {
    name: 'show',
    description: 'Show hidden elements',
    syntax: 'show [target]',
    category: 'dom',
    availability: 'lite',
    examples: ['show', 'show #modal', 'show .dropdown'],
  },
  put: {
    name: 'put',
    description: 'Set content or values',
    syntax: 'put value into target',
    category: 'dom',
    availability: 'lite',
    examples: ['put "Hello" into #output', 'put it into me', "put '<p>New</p>' into #container"],
  },
  make: {
    name: 'make',
    description: 'Create new DOM elements',
    syntax: 'make <tag/> [put into target]',
    category: 'dom',
    availability: 'hybrid',
    examples: ['make <div.card/>', 'make <button/> put into #toolbar'],
  },
  swap: {
    name: 'swap',
    description: 'Replace element content using various strategies',
    syntax: 'swap content into target [strategy]',
    category: 'dom',
    availability: 'hybrid',
    examples: [
      'swap "<p>New</p>" into #container',
      'swap result into #list innerHTML',
      'swap content into #panel outerHTML',
    ],
  },
  morph: {
    name: 'morph',
    description: 'Intelligently morph element content preserving state',
    syntax: 'morph content into target',
    category: 'dom',
    availability: 'full',
    examples: ['morph result into #content', 'morph "<div>New</div>" into me'],
  },
  processPartials: {
    name: 'processPartials',
    description: 'Process partial templates in HTML content',
    syntax: 'processPartials content [into target]',
    category: 'dom',
    availability: 'full',
    examples: [
      'processPartials result into #container',
      'processPartials "<partial name=\"header\">...</partial>"',
    ],
  },

  // Async Commands
  wait: {
    name: 'wait',
    description: 'Pause execution for duration or until event',
    syntax: 'wait duration | wait for event',
    category: 'async',
    availability: 'lite-plus',
    examples: ['wait 1s', 'wait 500ms', 'wait for transitionend'],
  },
  fetch: {
    name: 'fetch',
    description: 'Make HTTP requests',
    syntax: 'fetch url [as type] [with options]',
    category: 'async',
    availability: 'hybrid',
    examples: [
      'fetch /api/data as json',
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
    availability: 'lite',
    examples: ['set :count to 0', "set #input's value to ''", 'set x to 10'],
  },
  get: {
    name: 'get',
    description: 'Get property values',
    syntax: 'get property [from target]',
    category: 'data',
    availability: 'lite-plus',
    examples: ['get value from #input', "get #element's textContent"],
  },
  increment: {
    name: 'increment',
    description: 'Increase numeric value',
    syntax: 'increment target [by amount]',
    category: 'data',
    availability: 'lite-plus',
    examples: ['increment :count', 'increment :score by 10'],
  },
  decrement: {
    name: 'decrement',
    description: 'Decrease numeric value',
    syntax: 'decrement target [by amount]',
    category: 'data',
    availability: 'lite-plus',
    examples: ['decrement :count', 'decrement :lives by 1'],
  },
  default: {
    name: 'default',
    description: 'Set default value if not already set',
    syntax: 'default target to value',
    category: 'data',
    availability: 'full',
    examples: ['default :count to 0', 'default :theme to "light"'],
  },

  // Utility Commands
  log: {
    name: 'log',
    description: 'Log values to console',
    syntax: 'log value',
    category: 'utility',
    availability: 'lite-plus',
    examples: ['log "Debug info"', 'log :count', 'log event'],
  },
  tell: {
    name: 'tell',
    description: 'Execute commands on another element',
    syntax: 'tell target to command',
    category: 'utility',
    availability: 'full',
    examples: ['tell #other to add .active', 'tell <form/> to reset()'],
  },
  copy: {
    name: 'copy',
    description: 'Copy text to clipboard',
    syntax: 'copy value',
    category: 'utility',
    availability: 'full',
    examples: ['copy "Text"', "copy #input's value"],
  },
  pick: {
    name: 'pick',
    description: 'Pick random item from collection',
    syntax: 'pick from collection',
    category: 'utility',
    availability: 'full',
    examples: ['pick from <li/>', 'pick from ["a", "b", "c"]'],
  },
  beep: {
    name: 'beep',
    description: 'Play a beep sound',
    syntax: 'beep',
    category: 'utility',
    availability: 'full',
    examples: ['beep'],
  },

  // Event Commands
  trigger: {
    name: 'trigger',
    description: 'Dispatch custom events',
    syntax: 'trigger eventName [on target]',
    category: 'events',
    availability: 'lite-plus',
    examples: ['trigger customEvent', 'trigger submit on <form/>', 'trigger click on #btn'],
  },
  send: {
    name: 'send',
    description: 'Send event with data to element',
    syntax: 'send eventName [to target] [with data]',
    category: 'events',
    availability: 'hybrid',
    examples: ['send update to #dashboard', 'send notify with {message: "Done"}'],
  },

  // Navigation Commands
  go: {
    name: 'go',
    description: 'Navigate to URL',
    syntax: 'go to url',
    category: 'navigation',
    availability: 'lite-plus',
    examples: ['go to /dashboard', 'go to url in new window'],
  },
  pushUrl: {
    name: 'push url',
    description: 'Update URL without page reload',
    syntax: 'push url path',
    category: 'navigation',
    availability: 'hybrid',
    examples: ['push url /page/2', 'push url /users/:id'],
  },
  replaceUrl: {
    name: 'replace url',
    description: 'Replace current URL in history',
    syntax: 'replace url path',
    category: 'navigation',
    availability: 'hybrid',
    examples: ['replace url /new-path'],
  },

  // Control Flow Commands
  if: {
    name: 'if',
    description: 'Conditional execution',
    syntax: 'if condition ... [else ...] end',
    category: 'control-flow',
    availability: 'hybrid',
    examples: ['if :count > 0 add .active end', 'if me has .open hide else show end'],
  },
  unless: {
    name: 'unless',
    description: 'Negative conditional',
    syntax: 'unless condition ... end',
    category: 'control-flow',
    availability: 'full',
    examples: ['unless :loading show #content end'],
  },
  repeat: {
    name: 'repeat',
    description: 'Loop execution',
    syntax: 'repeat N times ... end | for each item in collection ... end',
    category: 'control-flow',
    availability: 'hybrid',
    examples: ['repeat 3 times add .pulse end', 'for each item in <li/> add .done to item end'],
  },
  break: {
    name: 'break',
    description: 'Exit current loop',
    syntax: 'break',
    category: 'control-flow',
    availability: 'hybrid',
    examples: ['if :found break end'],
  },
  continue: {
    name: 'continue',
    description: 'Skip to next loop iteration',
    syntax: 'continue',
    category: 'control-flow',
    availability: 'hybrid',
    examples: ['if item has .skip continue end'],
  },
  halt: {
    name: 'halt',
    description: 'Stop all execution',
    syntax: 'halt',
    category: 'control-flow',
    availability: 'full',
    examples: ['if :error halt end'],
  },
  return: {
    name: 'return',
    description: 'Return value from function',
    syntax: 'return [value]',
    category: 'control-flow',
    availability: 'full',
    examples: ['return :result', 'return'],
  },
  exit: {
    name: 'exit',
    description: 'Exit current handler',
    syntax: 'exit',
    category: 'control-flow',
    availability: 'full',
    examples: ['if :done exit end'],
  },
  throw: {
    name: 'throw',
    description: 'Throw an error',
    syntax: 'throw message',
    category: 'control-flow',
    availability: 'full',
    examples: ['throw "Invalid input"'],
  },

  // Execution Commands
  call: {
    name: 'call',
    description: 'Call a function or method',
    syntax: 'call function() | call method on target',
    category: 'execution',
    availability: 'hybrid',
    examples: ['call validate()', 'call reset() on <form/>'],
  },
  pseudo: {
    name: 'pseudo',
    description: 'Execute pseudo-command',
    syntax: 'pseudo command',
    category: 'execution',
    availability: 'full',
    examples: ['pseudo init'],
  },

  // Content Commands
  append: {
    name: 'append',
    description: 'Append content to element',
    syntax: 'append content to target',
    category: 'content',
    availability: 'hybrid',
    examples: ['append "<li>New</li>" to #list', 'append result to #container'],
  },

  // Animation Commands
  transition: {
    name: 'transition',
    description: 'Apply CSS transitions',
    syntax: 'transition property to value [over duration]',
    category: 'animation',
    availability: 'full',
    examples: ['transition opacity to 0 over 300ms', 'transition height to 100px'],
  },
  measure: {
    name: 'measure',
    description: 'Measure element dimensions',
    syntax: 'measure target',
    category: 'animation',
    availability: 'full',
    examples: ['measure #element', 'measure me'],
  },
  settle: {
    name: 'settle',
    description: 'Wait for animations to complete',
    syntax: 'settle',
    category: 'animation',
    availability: 'full',
    examples: ['add .animate then settle then remove .animate'],
  },
  take: {
    name: 'take',
    description: 'Take class from siblings (radio-button pattern)',
    syntax: 'take .class [from siblings]',
    category: 'animation',
    availability: 'full',
    examples: ['take .active from .tabs', 'take .selected'],
  },

  // Advanced Commands
  js: {
    name: 'js',
    description: 'Execute inline JavaScript',
    syntax: 'js(code)',
    category: 'advanced',
    availability: 'full',
    examples: ['js(console.log("hi"))', 'js(return Date.now())'],
  },
  async: {
    name: 'async',
    description: 'Execute commands asynchronously',
    syntax: 'async do ... end',
    category: 'advanced',
    availability: 'hybrid',
    examples: ['async do fetch /api/data then put result into #output end'],
  },

  // Behavior Commands
  install: {
    name: 'install',
    description: 'Install a behavior on element',
    syntax: 'install BehaviorName',
    category: 'behaviors',
    availability: 'full',
    examples: ['install Draggable', 'install Sortable'],
  },

  // Template Commands
  render: {
    name: 'render',
    description: 'Render template with data',
    syntax: 'render template with data',
    category: 'templates',
    availability: 'full',
    examples: ['render #userTemplate with :user'],
  },
};

/**
 * Get commands by category
 */
export function getCommandsByCategory(category: CommandCategory): CommandRef[] {
  return Object.values(commands).filter(cmd => cmd.category === category);
}

/**
 * Get commands available in a specific bundle
 */
export function getCommandsByAvailability(availability: BundleAvailability): CommandRef[] {
  const order: BundleAvailability[] = ['lite', 'lite-plus', 'hybrid', 'full'];
  const availabilityIndex = order.indexOf(availability);
  return Object.values(commands).filter(
    cmd => order.indexOf(cmd.availability) <= availabilityIndex
  );
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
  /** Whether event modifiers (.debounce, .throttle) are included */
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
  {
    name: 'lite',
    file: 'lokascript-lite.js',
    size: '1.9 KB',
    commandCount: 8,
    hasBlocks: false,
    hasEventModifiers: false,
    hasPositional: false,
    useCase: 'Minimal interactivity (toggle, show/hide)',
    importPath: '@hyperfixi/core/browser/lite',
  },
  {
    name: 'lite-plus',
    file: 'lokascript-lite-plus.js',
    size: '2.6 KB',
    commandCount: 14,
    hasBlocks: false,
    hasEventModifiers: false,
    hasPositional: false,
    useCase: 'Basic interactivity with wait, log, increment',
    importPath: '@hyperfixi/core/browser/lite-plus',
  },
  {
    name: 'hybrid-complete',
    file: 'lokascript-hybrid-complete.js',
    size: '7.3 KB',
    commandCount: 21,
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    useCase: 'Most apps (~85% hyperscript coverage)',
    importPath: '@hyperfixi/core/browser/hybrid-complete',
  },
  {
    name: 'hybrid-hx',
    file: 'lokascript-hybrid-hx.js',
    size: '9.7 KB',
    commandCount: 21,
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    useCase: 'htmx/fixi compatibility with hx-* attributes',
    importPath: '@hyperfixi/core/browser/hybrid-hx',
  },
  {
    name: 'minimal',
    file: 'lokascript-browser-minimal.js',
    size: '58 KB',
    commandCount: 30,
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    useCase: 'Full parser, reduced commands',
    importPath: '@hyperfixi/core/browser/minimal',
  },
  {
    name: 'standard',
    file: 'lokascript-browser-standard.js',
    size: '63 KB',
    commandCount: 35,
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    useCase: 'Full parser, common commands',
    importPath: '@hyperfixi/core/browser/standard',
  },
  {
    name: 'browser',
    file: 'lokascript-browser.js',
    size: '203 KB',
    commandCount: 43,
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    useCase: 'Full bundle with all features',
    importPath: '@hyperfixi/core/browser',
  },
  {
    name: 'multilingual',
    file: 'lokascript-multilingual.js',
    size: '64 KB',
    commandCount: 43,
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    useCase: 'Full features + multilingual API (no parser)',
    importPath: '@hyperfixi/core/browser/multilingual',
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

    // Check commands
    const available = getCommandsByAvailability(
      bundle.name === 'lite'
        ? 'lite'
        : bundle.name === 'lite-plus'
          ? 'lite-plus'
          : bundle.name.includes('hybrid')
            ? 'hybrid'
            : 'full'
    );
    const availableNames = available.map(c => c.name);

    const hasAllCommands = requiredCommands.every(cmd => availableNames.includes(cmd));
    if (hasAllCommands) {
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
    code: 'on submit halt the event then fetch /api/submit with method:"POST" body:me then put result into #response',
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
    code: 'on input.debounce(300) fetch /search?q=${me.value} as html then put result into #results',
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
    code: "on click copy #input's value then add .copied wait 1s remove .copied",
    commands: ['copy', 'add', 'wait', 'remove'],
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
