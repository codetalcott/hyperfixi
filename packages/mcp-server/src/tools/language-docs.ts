/**
 * Language Documentation Tools
 *
 * MCP tools for querying hyperscript language documentation:
 * commands, expressions, keywords, features, and special symbols.
 *
 * Data sources:
 * - Commands: commandSchemas from @lokascript/semantic (45 commands with full schema data)
 * - Expressions: static EXPRESSION_CATALOG (~35 entries covering all expression categories)
 * - Keywords: KNOWN_PROFILES from @lokascript/semantic (25 languages)
 * - Features/Symbols: static catalogs
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// Semantic Package Import (module-level, following validation.ts pattern)
// =============================================================================

let semanticPackage: any = null;
try {
  semanticPackage = await import('@lokascript/semantic');
} catch {
  // semantic not available - will use BUILTIN_COMMANDS fallback
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const languageDocsTools: Tool[] = [
  {
    name: 'get_command_docs',
    description:
      'Get documentation for a specific hyperscript command. Returns syntax, description, and usage details.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The command name (e.g., "toggle", "add", "fetch")',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'get_expression_docs',
    description:
      'Get documentation for hyperscript expression types. Returns description, category, operators, and examples.',
    inputSchema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The expression name (e.g., "attribute-ref", "query-reference", "it")',
        },
      },
      required: ['expression'],
    },
  },
  {
    name: 'search_language_elements',
    description:
      'Search across all hyperscript language elements (commands, expressions, keywords, features, special symbols, semantic roles). Useful for discovering available features. Search for role names like "patient", "destination", "source" to understand semantic roles used in explicit syntax.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find matching language elements',
        },
        types: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['command', 'expression', 'keyword', 'feature', 'special_symbol', 'role'],
          },
          description: 'Filter by element types. If not specified, searches all types.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 10,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'suggest_best_practices',
    description:
      'Analyze hyperscript code and suggest improvements based on patterns and common best practices.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The hyperscript code to analyze',
        },
      },
      required: ['code'],
    },
  },
];

// =============================================================================
// Syntax String Generator
// =============================================================================

/**
 * Generate a human-readable syntax string from a command schema.
 * Converts schema roles into syntax like: toggle <class or attribute> [on <target element>]
 */
function generateSyntaxString(schema: any): string {
  const action: string = schema.action;

  if (!schema.roles || schema.roles.length === 0) {
    return action;
  }

  // Sort roles by SVO position
  const sortedRoles = [...schema.roles].sort(
    (a: any, b: any) => (a.svoPosition ?? 99) - (b.svoPosition ?? 99)
  );

  const parts = [action];
  for (const role of sortedRoles) {
    // Get the English preposition/marker for rendering
    const marker =
      role.renderOverride?.en !== undefined
        ? role.renderOverride.en
        : role.markerOverride?.en !== undefined
          ? role.markerOverride.en
          : '';

    // Use the role description as placeholder text
    const placeholder = `<${role.description || role.role}>`;

    if (marker) {
      if (role.required) {
        parts.push(`${marker} ${placeholder}`);
      } else {
        parts.push(`[${marker} ${placeholder}]`);
      }
    } else {
      if (role.required) {
        parts.push(placeholder);
      } else {
        parts.push(`[${placeholder}]`);
      }
    }
  }

  return parts.join(' ');
}

/**
 * Generate an explicit syntax example from a command schema.
 * Produces: [toggle patient:.active destination:#element]
 */
function generateExplicitExample(schema: any): string {
  const action: string = schema.action;
  if (!schema.roles || schema.roles.length === 0) {
    return `[${action}]`;
  }

  const parts = [action];
  for (const role of schema.roles) {
    const exampleValue = getExampleValue(role);
    parts.push(`${role.role}:${exampleValue}`);
  }
  return `[${parts.join(' ')}]`;
}

/**
 * Generate an LLM JSON example from a command schema.
 * Produces: { action: "toggle", roles: { patient: { type: "selector", value: ".active" } } }
 */
function generateJsonExample(schema: any): Record<string, unknown> {
  const roles: Record<string, { type: string; value: string | number | boolean }> = {};
  for (const role of schema.roles || []) {
    const primaryType = role.expectedTypes?.[0] ?? 'literal';
    roles[role.role] = {
      type: primaryType === 'expression' ? 'literal' : primaryType,
      value: getExampleValue(role),
    };
  }
  return { action: schema.action, roles };
}

/**
 * Get a representative example value for a role based on its expected types.
 */
function getExampleValue(role: any): string | number | boolean {
  if (role.default) {
    return role.default.value ?? 'me';
  }
  const primaryType = role.expectedTypes?.[0];
  switch (primaryType) {
    case 'selector':
      return role.description?.toLowerCase().includes('class') ? '.active' : '#element';
    case 'reference':
      return 'me';
    case 'number':
      return 5;
    case 'boolean':
      return true;
    case 'duration':
      return '500ms';
    default:
      return '"value"';
  }
}

// =============================================================================
// Expression Catalog
// =============================================================================

interface ExpressionDocEntry {
  name: string;
  description: string;
  category: string;
  tier: 'core' | 'common' | 'optional';
  evaluatesTo: string;
  operators?: string[];
  examples: string[];
}

const EXPRESSION_CATALOG: Record<string, ExpressionDocEntry> = {
  // === CORE: references ===
  me: {
    name: 'me',
    description: 'Reference to the current element (the element with the _ attribute)',
    category: 'references',
    tier: 'core',
    evaluatesTo: 'Element',
    examples: ['toggle .active on me', 'put "Hello" into me'],
  },
  you: {
    name: 'you',
    description:
      'Reference to the element that triggered the event (e.g., clicked element in delegated events)',
    category: 'references',
    tier: 'core',
    evaluatesTo: 'Element',
    examples: ['add .selected to you'],
  },
  it: {
    name: 'it',
    description: 'Reference to the result of the previous command',
    category: 'references',
    tier: 'core',
    evaluatesTo: 'Any',
    examples: ['fetch /api then put it into #output', 'get #input.value then log it'],
  },
  its: {
    name: 'its',
    description: "Possessive form of 'it' for accessing properties of the previous result",
    category: 'references',
    tier: 'core',
    evaluatesTo: 'Any',
    examples: ['fetch /api as json then put its name into #output'],
  },
  result: {
    name: 'result',
    description: "Alias for 'it' — the result of the previous command",
    category: 'references',
    tier: 'core',
    evaluatesTo: 'Any',
    examples: ['fetch /api then put the result into #output'],
  },
  'query-reference': {
    name: 'query-reference',
    description: 'CSS selector query for DOM elements. Use # for ID, . for class, <tag/> for tag',
    category: 'references',
    tier: 'core',
    evaluatesTo: 'Element | NodeList',
    operators: ['#id', '.class', '<tag/>'],
    examples: ['toggle .active on #button', 'put "text" into .output', 'remove <li/>'],
  },
  closest: {
    name: 'closest',
    description: 'Find the nearest ancestor element matching a selector',
    category: 'references',
    tier: 'core',
    evaluatesTo: 'Element',
    operators: ['closest'],
    examples: ['toggle .open on closest .accordion-item', 'set closest <div/>.textContent to ""'],
  },
  parent: {
    name: 'parent',
    description: 'Reference to the parent element',
    category: 'references',
    tier: 'core',
    evaluatesTo: 'Element',
    operators: ['parent'],
    examples: ['add .highlight to parent'],
  },

  // === CORE: logical ===
  equals: {
    name: 'equals',
    description: 'Equality comparison',
    category: 'logical',
    tier: 'core',
    evaluatesTo: 'Boolean',
    operators: ['is', '==', 'equals'],
    examples: ['if x is 5', 'if name equals "John"'],
  },
  'not-equals': {
    name: 'not-equals',
    description: 'Inequality comparison',
    category: 'logical',
    tier: 'core',
    evaluatesTo: 'Boolean',
    operators: ['is not', '!=', 'does not equal'],
    examples: ['if x is not 5', 'if status != "ok"'],
  },
  'greater-than': {
    name: 'greater-than',
    description: 'Greater than comparison',
    category: 'logical',
    tier: 'core',
    evaluatesTo: 'Boolean',
    operators: ['>', 'is greater than'],
    examples: ['if count > 10', 'if x is greater than y'],
  },
  'less-than': {
    name: 'less-than',
    description: 'Less than comparison',
    category: 'logical',
    tier: 'core',
    evaluatesTo: 'Boolean',
    operators: ['<', 'is less than'],
    examples: ['if count < 0', 'if x is less than y'],
  },
  and: {
    name: 'and',
    description: 'Logical AND operator',
    category: 'logical',
    tier: 'core',
    evaluatesTo: 'Boolean',
    operators: ['and', '&&'],
    examples: ['if x > 0 and x < 100'],
  },
  or: {
    name: 'or',
    description: 'Logical OR operator',
    category: 'logical',
    tier: 'core',
    evaluatesTo: 'Boolean',
    operators: ['or', '||'],
    examples: ['if status is "ok" or status is "pending"'],
  },
  not: {
    name: 'not',
    description: 'Logical NOT operator',
    category: 'logical',
    tier: 'core',
    evaluatesTo: 'Boolean',
    operators: ['not', '!'],
    examples: ['if not me has .active', 'if not :loading'],
  },
  contains: {
    name: 'contains',
    description: 'Check if a string or array contains a value',
    category: 'logical',
    tier: 'core',
    evaluatesTo: 'Boolean',
    operators: ['contains'],
    examples: ['if "hello world" contains "hello"', 'if .items contains #target'],
  },
  matches: {
    name: 'matches',
    description: 'Check if an element matches a CSS selector',
    category: 'logical',
    tier: 'core',
    evaluatesTo: 'Boolean',
    operators: ['matches'],
    examples: ['if I match .disabled', 'if it matches <input/>'],
  },
  'is-empty': {
    name: 'is-empty',
    description: 'Check if a value is empty (empty string, null, undefined, empty array)',
    category: 'logical',
    tier: 'core',
    evaluatesTo: 'Boolean',
    operators: ['is empty'],
    examples: ['if #input.value is empty'],
  },
  exists: {
    name: 'exists',
    description: 'Check if an element or value exists (is not null/undefined)',
    category: 'logical',
    tier: 'core',
    evaluatesTo: 'Boolean',
    operators: ['exists'],
    examples: ['if #modal exists', 'if :data exists'],
  },
  has: {
    name: 'has',
    description: 'Check if an element has a class or attribute',
    category: 'logical',
    tier: 'core',
    evaluatesTo: 'Boolean',
    operators: ['has', 'have'],
    examples: ['if me has .active', 'if #form has @required', 'if I do not have .loading'],
  },

  // === CORE: special (literals & math) ===
  'string-literal': {
    name: 'string-literal',
    description: 'String literal value enclosed in quotes',
    category: 'special',
    tier: 'core',
    evaluatesTo: 'String',
    examples: ['"Hello World"', "'single quotes'"],
  },
  'number-literal': {
    name: 'number-literal',
    description: 'Numeric literal value (integer or decimal)',
    category: 'special',
    tier: 'core',
    evaluatesTo: 'Number',
    examples: ['42', '3.14', '-1'],
  },
  'boolean-literal': {
    name: 'boolean-literal',
    description: 'Boolean true/false value',
    category: 'special',
    tier: 'core',
    evaluatesTo: 'Boolean',
    examples: ['true', 'false'],
  },
  addition: {
    name: 'addition',
    description: 'Addition operator for numbers or string concatenation',
    category: 'special',
    tier: 'core',
    evaluatesTo: 'Number | String',
    operators: ['+'],
    examples: ['set :total to :price + :tax', 'put "Hello " + name into #greeting'],
  },
  subtraction: {
    name: 'subtraction',
    description: 'Subtraction operator',
    category: 'special',
    tier: 'core',
    evaluatesTo: 'Number',
    operators: ['-'],
    examples: ['set :remaining to :total - :used'],
  },
  multiplication: {
    name: 'multiplication',
    description: 'Multiplication operator',
    category: 'special',
    tier: 'core',
    evaluatesTo: 'Number',
    operators: ['*'],
    examples: ['set :area to :width * :height'],
  },
  division: {
    name: 'division',
    description: 'Division operator',
    category: 'special',
    tier: 'core',
    evaluatesTo: 'Number',
    operators: ['/'],
    examples: ['set :average to :sum / :count'],
  },
  modulo: {
    name: 'modulo',
    description: 'Modulo (remainder) operator',
    category: 'special',
    tier: 'core',
    evaluatesTo: 'Number',
    operators: ['%'],
    examples: ['if :count % 2 is 0'],
  },

  // === COMMON: properties ===
  possessive: {
    name: 'possessive',
    description: "Access element properties using possessive syntax (element's property)",
    category: 'properties',
    tier: 'common',
    evaluatesTo: 'Any',
    operators: ["'s", 'my', 'its', 'your'],
    examples: ["#input's value", 'my textContent', 'its length', "the button's disabled"],
  },
  'attribute-ref': {
    name: 'attribute-ref',
    description: 'Reference to a DOM attribute using @ prefix',
    category: 'properties',
    tier: 'common',
    evaluatesTo: 'String',
    operators: ['@'],
    examples: ['toggle @disabled', 'set @data-id to "123"', 'if me has @hidden'],
  },
  'style-ref': {
    name: 'style-ref',
    description: 'Reference to a CSS style property using * prefix',
    category: 'properties',
    tier: 'common',
    evaluatesTo: 'String',
    operators: ['*'],
    examples: ['set *background-color to "red"', 'transition *opacity to 0 over 500ms'],
  },
  'property-access': {
    name: 'property-access',
    description: 'Direct property access using dot notation',
    category: 'properties',
    tier: 'common',
    evaluatesTo: 'Any',
    examples: ['set #input.value to ""', 'put element.textContent into :text'],
  },

  // === COMMON: conversion ===
  as: {
    name: 'as',
    description: 'Type conversion using the "as" keyword',
    category: 'conversion',
    tier: 'common',
    evaluatesTo: 'varies',
    operators: ['as'],
    examples: [
      'fetch /api as json',
      '"42" as Number',
      ':data as JSON',
      'fetch /page as html',
      ':input as Int',
    ],
  },

  // === OPTIONAL: positional ===
  first: {
    name: 'first',
    description: 'Get the first item from a collection',
    category: 'positional',
    tier: 'optional',
    evaluatesTo: 'Any',
    operators: ['first'],
    examples: ['first of .items', 'first <li/>'],
  },
  last: {
    name: 'last',
    description: 'Get the last item from a collection',
    category: 'positional',
    tier: 'optional',
    evaluatesTo: 'Any',
    operators: ['last'],
    examples: ['last of .items', 'last <li/>'],
  },
  next: {
    name: 'next',
    description: 'Get the next sibling element matching a selector',
    category: 'positional',
    tier: 'optional',
    evaluatesTo: 'Element',
    operators: ['next'],
    examples: ['toggle .open on next .panel', 'next <input/>'],
  },
  previous: {
    name: 'previous',
    description: 'Get the previous sibling element matching a selector',
    category: 'positional',
    tier: 'optional',
    evaluatesTo: 'Element',
    operators: ['previous'],
    examples: ['previous <li/>', 'previous .sibling'],
  },

  // === OTHER ===
  'function-call': {
    name: 'function-call',
    description: 'Call a JavaScript function or method',
    category: 'function-calls',
    tier: 'common',
    evaluatesTo: 'Any',
    examples: ['call alert("Hello")', ':text.toUpperCase()', ':arr.join("-")', 'Math.random()'],
  },
  'array-literal': {
    name: 'array-literal',
    description: 'Array literal using bracket notation',
    category: 'array',
    tier: 'optional',
    evaluatesTo: 'Array',
    operators: ['[', ']'],
    examples: ['set :colors to ["red", "green", "blue"]'],
  },
  'object-literal': {
    name: 'object-literal',
    description: 'Object literal using brace notation',
    category: 'object',
    tier: 'optional',
    evaluatesTo: 'Object',
    operators: ['{', '}'],
    examples: ['set :config to {method: "POST", body: :data}'],
  },
  'time-expression': {
    name: 'time-expression',
    description: 'Time duration literal (ms, s, seconds, etc.)',
    category: 'time',
    tier: 'common',
    evaluatesTo: 'Number (milliseconds)',
    examples: ['wait 500ms', 'wait 2s', 'wait 1 second'],
  },
};

// =============================================================================
// Features Catalog
// =============================================================================

const FEATURES_CATALOG = [
  {
    name: 'event-handler',
    description: 'Handle DOM events with the "on" keyword',
    trigger: 'on <event>',
  },
  {
    name: 'behavior',
    description: 'Define a reusable behavior that can be installed on elements',
    trigger: 'behavior <Name>',
  },
  { name: 'init', description: 'Initialization block that runs once on load', trigger: 'init' },
  {
    name: 'install',
    description: 'Install a behavior onto an element',
    trigger: 'install <Behavior>',
  },
  {
    name: 'def',
    description: 'Define a reusable function',
    trigger: 'def <name>(params)',
  },
  {
    name: 'worker',
    description: 'Run code in a web worker for background processing',
    trigger: 'worker',
  },
  {
    name: 'event-modifiers',
    description: 'Modify event handling with .once, .prevent, .stop, .debounce(N), .throttle(N)',
    trigger: 'on click.once, on submit.prevent',
  },
];

// =============================================================================
// Special Symbols Catalog
// =============================================================================

const SPECIAL_SYMBOLS_CATALOG = [
  { name: 'class-ref', symbol: '.', description: 'CSS class reference prefix (.active, .hidden)' },
  { name: 'id-ref', symbol: '#', description: 'CSS ID reference prefix (#button, #output)' },
  {
    name: 'attribute-ref',
    symbol: '@',
    description: 'HTML attribute reference prefix (@disabled, @data-id)',
  },
  {
    name: 'style-ref',
    symbol: '*',
    description: 'CSS style property reference prefix (*background-color, *opacity)',
  },
  {
    name: 'local-var',
    symbol: ':',
    description: 'Local variable prefix — scoped to the element (:count, :data)',
  },
  {
    name: 'global-var',
    symbol: '$',
    description: 'Global variable prefix — shared across all elements ($theme, $user)',
  },
  {
    name: 'html-literal',
    symbol: '<tag/>',
    description: 'HTML literal element selector (<div/>, <button.class#id/>)',
  },
  {
    name: 'possessive',
    symbol: "'s",
    description: "Possessive property access (element's property, my textContent)",
  },
  {
    name: 'then',
    symbol: 'then',
    description: 'Command chain separator for sequential execution',
  },
  {
    name: 'end',
    symbol: 'end',
    description: 'Block terminator for if/repeat/for/while blocks',
  },
];

// =============================================================================
// Semantic Role Catalog
// =============================================================================

/**
 * Semantic roles used in explicit syntax ([command role:value ...]).
 * Derived from linguistic thematic roles (theta roles), extended for web/UI semantics.
 * Each role has a general definition plus which commands use it and example explicit syntax.
 */
const ROLE_CATALOG: Record<
  string,
  {
    name: string;
    description: string;
    origin: string;
    usage: string;
    commands: string[];
    explicitExample: string;
  }
> = {
  patient: {
    name: 'patient',
    description:
      'The entity undergoing the action — what is being acted upon. The most common role, used by 25+ commands.',
    origin: 'Linguistic thematic role: the entity that undergoes a change of state.',
    usage:
      'The class being toggled, the content being put, the element being shown, the variable being incremented.',
    commands: [
      'toggle',
      'add',
      'remove',
      'put',
      'set',
      'show',
      'hide',
      'wait',
      'log',
      'increment',
      'decrement',
      'append',
      'prepend',
      'copy',
      'throw',
      'call',
      'return',
      'focus',
      'blur',
      'beep',
      'pick',
      'render',
      'morph',
      'swap',
    ],
    explicitExample: '[toggle patient:.active]',
  },
  destination: {
    name: 'destination',
    description:
      'Where the action targets or where something ends up. Intentionally broad: DOM element, URL, or variable. Disambiguated by value type per command.',
    origin: 'Linguistic thematic role: the endpoint or goal location of a motion/transfer.',
    usage:
      'The element receiving a class (toggle/add), the container for content (put), the URL to navigate to (go), the variable to store into (set).',
    commands: [
      'toggle',
      'add',
      'put',
      'remove',
      'append',
      'prepend',
      'trigger',
      'clone',
      'show',
      'hide',
      'transition',
      'go',
      'tell',
      'set',
      'get',
      'fetch',
      'send',
      'morph',
      'swap',
    ],
    explicitExample: '[put patient:"hello" destination:#output]',
  },
  source: {
    name: 'source',
    description: 'Where something originates from — the origin of data or the element to act on.',
    origin: 'Linguistic thematic role: the starting point of a motion/transfer.',
    usage: 'The element to remove from, the URL to fetch from, the event source element.',
    commands: ['remove', 'on', 'get', 'take', 'pick', 'repeat', 'for', 'measure', 'fetch'],
    explicitExample: '[fetch source:/api/data responseType:json]',
  },
  event: {
    name: 'event',
    description: 'The trigger event for an event handler.',
    origin: 'DOM event model.',
    usage: 'The event name that starts execution: click, input, keydown, mouseover, custom events.',
    commands: ['on', 'trigger', 'send', 'repeat'],
    explicitExample: '[on event:click body:[toggle patient:.active]]',
  },
  condition: {
    name: 'condition',
    description: 'A boolean expression that controls whether something executes.',
    origin: 'Control flow semantics.',
    usage: 'The test in an if/unless/while block.',
    commands: ['if', 'unless', 'while'],
    explicitExample: '[if condition:"x > 5"]',
  },
  quantity: {
    name: 'quantity',
    description: 'A numeric amount for the action.',
    origin: 'Linguistic quantifier role.',
    usage: 'How much to increment/decrement by, how many times to repeat.',
    commands: ['increment', 'decrement', 'repeat', 'for'],
    explicitExample: '[increment patient:#count quantity:5]',
  },
  duration: {
    name: 'duration',
    description: 'A time span for the action.',
    origin: 'Temporal adverbial role.',
    usage: 'How long a transition takes.',
    commands: ['transition'],
    explicitExample: '[transition patient:opacity duration:500ms]',
  },
  goal: {
    name: 'goal',
    description: 'The target value or state to reach.',
    origin: 'Linguistic thematic role: the desired end-state.',
    usage: 'The target value in a transition.',
    commands: ['transition'],
    explicitExample: '[transition patient:opacity goal:0]',
  },
  style: {
    name: 'style',
    description: 'The visual or behavioral manner of the action.',
    origin: 'Adverbial modifier for manner/instrument.',
    usage: 'Animation style for show/hide (fade, slide, opacity).',
    commands: ['show', 'hide', 'render', 'transition'],
    explicitExample: '[show patient:#modal style:opacity]',
  },
  method: {
    name: 'method',
    description: 'The technique or HTTP method used.',
    origin: 'Instrument/manner role, specialized for web.',
    usage: 'HTTP method for fetch (GET, POST), swap strategy (innerHTML, outerHTML).',
    commands: ['swap', 'fetch'],
    explicitExample: '[fetch source:/api method:POST responseType:json]',
  },
  responseType: {
    name: 'responseType',
    description: 'The expected response format.',
    origin: 'HTTP content negotiation.',
    usage: 'How to parse a fetch response: json, text, html, blob.',
    commands: ['fetch'],
    explicitExample: '[fetch source:/api responseType:json]',
  },
  manner: {
    name: 'manner',
    description:
      'Reserved role for insertion position. Not currently used in command schemas — swap uses "method", put handles position via destination markers.',
    origin: 'Linguistic adverbial role for how an action is performed.',
    usage: 'Reserved for future use.',
    commands: [],
    explicitExample: '(not currently used)',
  },
  agent: {
    name: 'agent',
    description:
      'Who or what performs the action. Reserved for future use (AI agents, server-side execution).',
    origin: 'Linguistic thematic role: the entity that initiates the action.',
    usage: 'Reserved for future use.',
    commands: [],
    explicitExample: '(not currently used)',
  },
  loopType: {
    name: 'loopType',
    description: 'The loop variant for repeat commands.',
    origin: 'Control flow semantics.',
    usage: 'Loop style: forever, times, while, until, until-event.',
    commands: ['repeat'],
    explicitExample: '[repeat loopType:forever]',
  },
};

// =============================================================================
// Best Practices Rules
// =============================================================================

interface BestPractice {
  id: string;
  name: string;
  description: string;
  check: (code: string) => { applies: boolean; suggestion?: string; improved?: string };
}

const BEST_PRACTICES: BestPractice[] = [
  {
    id: 'prefer-toggle',
    name: 'Prefer toggle over add/remove pairs',
    description:
      'Use toggle when you want to switch a class on/off rather than separate add/remove',
    check: (code: string) => {
      if (
        /if.*has.*\.([\w-]+).*remove.*\1.*else.*add.*\1/i.test(code) ||
        /if.*has.*\.([\w-]+).*add.*\1.*else.*remove.*\1/i.test(code)
      ) {
        const match = code.match(/\.([\w-]+)/);
        const className = match ? match[1] : 'active';
        return {
          applies: true,
          suggestion: `Consider using "toggle .${className}" instead of if/else with add/remove`,
          improved: `toggle .${className}`,
        };
      }
      return { applies: false };
    },
  },
  {
    id: 'use-then-chaining',
    name: 'Use then for command chaining',
    description: 'Chain multiple commands with "then" for sequential execution',
    check: (code: string) => {
      const onCount = (code.match(/\bon\s+\w+/gi) || []).length;
      const thenCount = (code.match(/\bthen\b/gi) || []).length;
      if (onCount > 1 && thenCount === 0 && code.length < 200) {
        return {
          applies: true,
          suggestion: 'Consider combining related handlers using "then" for sequential commands',
        };
      }
      return { applies: false };
    },
  },
  {
    id: 'avoid-deep-nesting',
    name: 'Avoid deeply nested if statements',
    description:
      'Deeply nested conditionals are hard to read; consider early returns or separate behaviors',
    check: (code: string) => {
      const ifCount = [...code.matchAll(/\bif\b/gi)].length;
      const endCount = [...code.matchAll(/\bend\b/gi)].length;
      if (ifCount >= 3 && endCount >= 3) {
        return {
          applies: true,
          suggestion:
            'Consider simplifying nested conditionals using guard clauses or breaking into separate behaviors',
        };
      }
      return { applies: false };
    },
  },
  {
    id: 'use-wait-for-timing',
    name: 'Use wait for delays instead of setTimeout',
    description: 'Hyperscript provides built-in "wait" for cleaner delay syntax',
    check: (code: string) => {
      if (/setTimeout|setInterval/i.test(code)) {
        return {
          applies: true,
          suggestion: 'Use hyperscript "wait 100ms" instead of JavaScript setTimeout',
          improved: 'wait 100ms then ...',
        };
      }
      return { applies: false };
    },
  },
  {
    id: 'prefer-css-selectors',
    name: 'Use CSS selectors for element references',
    description: 'Prefer CSS selectors (#id, .class) over document.querySelector',
    check: (code: string) => {
      if (/document\.querySelector|document\.getElementById|document\.getElementsBy/i.test(code)) {
        return {
          applies: true,
          suggestion:
            'Use hyperscript CSS selectors like "#id" or ".class" instead of document methods',
          improved: 'set #myElement.textContent to "Hello"',
        };
      }
      return { applies: false };
    },
  },
  {
    id: 'use-me-reference',
    name: 'Use "me" for current element',
    description: 'Use "me" to reference the current element instead of explicit selectors',
    check: (code: string) => {
      if (/on\s+\w+.*set\s+#\w+\.\w+/i.test(code) && !/\bme\b/i.test(code)) {
        return {
          applies: true,
          suggestion:
            'Consider using "me" to reference the current element instead of an explicit selector',
        };
      }
      return { applies: false };
    },
  },
  {
    id: 'use-possessive-syntax',
    name: 'Use possessive syntax for properties',
    description: 'Use "element\'s property" syntax for cleaner property access',
    check: (code: string) => {
      if (/\]\.(textContent|innerHTML|value|checked|disabled)/i.test(code)) {
        return {
          applies: true,
          suggestion:
            'Consider using possessive syntax like "the input\'s value" instead of ".value"',
        };
      }
      return { applies: false };
    },
  },
  {
    id: 'avoid-inline-javascript',
    name: 'Avoid inline JavaScript in hyperscript',
    description: 'Keep JavaScript separate from hyperscript for maintainability',
    check: (code: string) => {
      if (/js\s*{[^}]{50,}}/i.test(code)) {
        return {
          applies: true,
          suggestion:
            'Large JavaScript blocks in hyperscript reduce readability. Consider moving to a separate function.',
        };
      }
      return { applies: false };
    },
  },
];

// =============================================================================
// Built-in Command Fallback (used when @lokascript/semantic is unavailable)
// =============================================================================

const BUILTIN_COMMANDS: Record<string, any> = {
  toggle: {
    name: 'toggle',
    description: 'Toggle a class, attribute, or visibility on elements',
    syntax: 'toggle <class-ref | attribute-ref | visibility> [on <target>]',
  },
  add: {
    name: 'add',
    description: 'Add a class or attribute to elements',
    syntax: 'add <class-ref | attribute-ref> [to <target>]',
  },
  remove: {
    name: 'remove',
    description: 'Remove a class, attribute, or element',
    syntax: 'remove <class-ref | attribute-ref | element> [from <target>]',
  },
  set: {
    name: 'set',
    description: 'Set a property or variable value',
    syntax: 'set <target> to <value>',
  },
  put: {
    name: 'put',
    description: 'Put content into an element',
    syntax: 'put <value> into|before|after|at start of|at end of <target>',
  },
  fetch: {
    name: 'fetch',
    description: 'Fetch data from a URL',
    syntax: 'fetch <url> [as <type>] [with <options>]',
  },
  wait: {
    name: 'wait',
    description: 'Wait for a time duration or event',
    syntax: 'wait <time> | wait for <event>',
  },
  hide: {
    name: 'hide',
    description: 'Hide an element',
    syntax: 'hide [<target>] [with <strategy>]',
  },
  show: {
    name: 'show',
    description: 'Show a hidden element',
    syntax: 'show [<target>] [with <strategy>]',
  },
  send: {
    name: 'send',
    description: 'Send/trigger a custom event',
    syntax: 'send <event-name> [to <target>] [with <details>]',
  },
  beep: {
    name: 'beep',
    description: 'Debug output — logs a value with type info to the console',
    syntax: 'beep [<expression>]',
  },
  break: {
    name: 'break',
    description: 'Exit the current repeat/for/while loop',
    syntax: 'break',
  },
  copy: {
    name: 'copy',
    description: 'Copy a value to the clipboard',
    syntax: 'copy <expression>',
  },
  exit: {
    name: 'exit',
    description: 'Exit the current event handler immediately',
    syntax: 'exit',
  },
  pick: {
    name: 'pick',
    description: 'Pick a random item from a collection',
    syntax: 'pick <expression>',
  },
  render: {
    name: 'render',
    description: 'Render a template with variable substitution',
    syntax: 'render <template> [with <variables>]',
  },
};

// =============================================================================
// Tool Handlers
// =============================================================================

export async function handleLanguageDocsTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'get_command_docs':
        return handleGetCommandDocs(args);

      case 'get_expression_docs':
        return handleGetExpressionDocs(args);

      case 'search_language_elements':
        return handleSearchLanguageElements(args);

      case 'suggest_best_practices':
        return analyzeBestPractices(args.code as string);

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error in ${name}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// =============================================================================
// get_command_docs Handler
// =============================================================================

function handleGetCommandDocs(args: Record<string, unknown>): {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
} {
  const commandName = (args.command as string).toLowerCase();

  // Priority 1: Use commandSchemas from @lokascript/semantic
  if (semanticPackage?.commandSchemas) {
    const schema = semanticPackage.commandSchemas[commandName];

    if (schema) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                found: true,
                command: schema.action,
                description: schema.description,
                syntax: generateSyntaxString(schema),
                explicitSyntax: generateExplicitExample(schema),
                jsonSyntax: generateJsonExample(schema),
                category: schema.category,
                primaryRole: schema.primaryRole,
                hasBody: schema.hasBody || false,
                roles: schema.roles.map((r: any) => ({
                  role: r.role,
                  description: r.description,
                  required: r.required,
                  expectedTypes: r.expectedTypes,
                  default: r.default,
                })),
                errorCodes: schema.errorCodes || [],
                preconditions: schema.preconditions || [],
                recoveryHints: schema.recoveryHints || {},
                notes: schema.notes,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Command not found — provide all available commands and suggestions
    const allCommands = Object.keys(semanticPackage.commandSchemas).filter(
      (c: string) => c !== 'compound'
    );
    const suggestions = allCommands
      .filter((c: string) => c.includes(commandName) || commandName.includes(c))
      .slice(0, 5);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              found: false,
              command: commandName,
              message: `Command "${commandName}" not found`,
              suggestions: suggestions.length > 0 ? suggestions : undefined,
              availableCommands: allCommands,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Priority 2: Built-in fallback
  const command = BUILTIN_COMMANDS[commandName];
  if (command) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              found: true,
              ...command,
              note: 'Using built-in docs. @lokascript/semantic not available for full documentation.',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            found: false,
            command: commandName,
            message: `Command "${commandName}" not found`,
            availableCommands: Object.keys(BUILTIN_COMMANDS),
          },
          null,
          2
        ),
      },
    ],
  };
}

// =============================================================================
// get_expression_docs Handler
// =============================================================================

function handleGetExpressionDocs(args: Record<string, unknown>): {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
} {
  const expressionName = (args.expression as string).toLowerCase();

  // Look up in expression catalog
  const entry = EXPRESSION_CATALOG[expressionName];

  if (entry) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              found: true,
              expression: entry.name,
              description: entry.description,
              category: entry.category,
              tier: entry.tier,
              evaluatesToType: entry.evaluatesTo,
              operators: entry.operators,
              examples: entry.examples,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Fuzzy match suggestions
  const allExpressions = Object.keys(EXPRESSION_CATALOG);
  const suggestions = allExpressions
    .filter(e => e.includes(expressionName) || expressionName.includes(e))
    .slice(0, 5);

  // Group available expressions by category
  const byCategory: Record<string, string[]> = {};
  for (const [name, expr] of Object.entries(EXPRESSION_CATALOG)) {
    if (!byCategory[expr.category]) byCategory[expr.category] = [];
    byCategory[expr.category].push(name);
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            found: false,
            expression: expressionName,
            message: `Expression "${expressionName}" not found`,
            suggestions: suggestions.length > 0 ? suggestions : undefined,
            availableExpressions: allExpressions,
            byCategory,
          },
          null,
          2
        ),
      },
    ],
  };
}

// =============================================================================
// search_language_elements Handler
// =============================================================================

function handleSearchLanguageElements(args: Record<string, unknown>): {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
} {
  const query = (args.query as string).toLowerCase();
  const types = args.types as string[] | undefined;
  const limit = (args.limit as number) || 10;

  const searchTypes = types || [
    'command',
    'expression',
    'keyword',
    'feature',
    'special_symbol',
    'role',
  ];
  const results: Array<{ type: string; name: string; description: string; [key: string]: any }> =
    [];

  // Search commands
  if (searchTypes.includes('command')) {
    if (semanticPackage?.commandSchemas) {
      for (const [action, schema] of Object.entries(semanticPackage.commandSchemas) as [
        string,
        any,
      ][]) {
        if (action === 'compound') continue;
        if (
          action.includes(query) ||
          schema.description?.toLowerCase().includes(query) ||
          schema.category?.includes(query)
        ) {
          results.push({
            type: 'command',
            name: action,
            description: schema.description,
            syntax: generateSyntaxString(schema),
            category: schema.category,
          });
        }
      }
    } else {
      // Fallback to BUILTIN_COMMANDS
      for (const [cmdName, cmd] of Object.entries(BUILTIN_COMMANDS)) {
        if (cmdName.includes(query) || cmd.description?.toLowerCase().includes(query)) {
          results.push({
            type: 'command',
            name: cmd.name,
            description: cmd.description,
            syntax: cmd.syntax,
          });
        }
      }
    }
  }

  // Search expressions
  if (searchTypes.includes('expression')) {
    for (const [name, entry] of Object.entries(EXPRESSION_CATALOG)) {
      if (
        name.includes(query) ||
        entry.description.toLowerCase().includes(query) ||
        entry.category.includes(query) ||
        entry.operators?.some(op => op.toLowerCase().includes(query))
      ) {
        results.push({
          type: 'expression',
          name: entry.name,
          description: entry.description,
          category: entry.category,
        });
      }
    }
  }

  // Search keywords (from language profiles)
  if (searchTypes.includes('keyword') && semanticPackage?.KNOWN_PROFILES) {
    const seenKeywords = new Set<string>();
    for (const [lang, profile] of Object.entries(semanticPackage.KNOWN_PROFILES) as [
      string,
      any,
    ][]) {
      if (!profile.keywords) continue;
      for (const [keyword, trans] of Object.entries(profile.keywords) as [string, any][]) {
        const primary = (trans?.primary || '').toLowerCase();
        const dedupeKey = `${lang}:${keyword}`;
        if (seenKeywords.has(dedupeKey)) continue;
        if (primary.includes(query) || keyword.includes(query)) {
          seenKeywords.add(dedupeKey);
          results.push({
            type: 'keyword',
            name: trans?.primary || keyword,
            description: `"${keyword}" in ${lang}`,
            language: lang,
            englishEquivalent: keyword,
          });
        }
      }
    }
  }

  // Search features
  if (searchTypes.includes('feature')) {
    for (const feature of FEATURES_CATALOG) {
      if (
        feature.name.toLowerCase().includes(query) ||
        feature.description.toLowerCase().includes(query)
      ) {
        results.push({
          type: 'feature',
          name: feature.name,
          description: feature.description,
          trigger: feature.trigger,
        });
      }
    }
  }

  // Search special symbols
  if (searchTypes.includes('special_symbol')) {
    for (const sym of SPECIAL_SYMBOLS_CATALOG) {
      if (
        sym.name.toLowerCase().includes(query) ||
        sym.symbol.includes(query) ||
        sym.description.toLowerCase().includes(query)
      ) {
        results.push({
          type: 'special_symbol',
          name: sym.name,
          symbol: sym.symbol,
          description: sym.description,
        });
      }
    }
  }

  // Search semantic roles
  if (searchTypes.includes('role')) {
    for (const [name, role] of Object.entries(ROLE_CATALOG)) {
      if (
        name.includes(query) ||
        role.description.toLowerCase().includes(query) ||
        role.origin.toLowerCase().includes(query) ||
        role.usage.toLowerCase().includes(query) ||
        role.commands.some(c => c.includes(query))
      ) {
        results.push({
          type: 'role',
          name: role.name,
          description: role.description,
          origin: role.origin,
          usage: role.usage,
          commands: role.commands,
          explicitExample: role.explicitExample,
        });
      }
    }
  }

  const limited = results.slice(0, limit);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            query,
            types: searchTypes,
            totalResults: results.length,
            results: limited,
          },
          null,
          2
        ),
      },
    ],
  };
}

// =============================================================================
// Best Practices Analysis
// =============================================================================

function analyzeBestPractices(code: string): {
  content: Array<{ type: string; text: string }>;
} {
  const suggestions: Array<{
    rule: string;
    description: string;
    suggestion: string;
    improved?: string;
  }> = [];

  for (const practice of BEST_PRACTICES) {
    const result = practice.check(code);
    if (result.applies) {
      suggestions.push({
        rule: practice.name,
        description: practice.description,
        suggestion: result.suggestion || practice.description,
        improved: result.improved,
      });
    }
  }

  const patternSuggestions = findSimilarPatterns(code);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            code,
            analysisComplete: true,
            suggestionsCount: suggestions.length,
            suggestions,
            similarPatterns: patternSuggestions,
            overallScore:
              suggestions.length === 0
                ? 'good'
                : suggestions.length <= 2
                  ? 'could improve'
                  : 'needs attention',
          },
          null,
          2
        ),
      },
    ],
  };
}

function findSimilarPatterns(code: string): Array<{ pattern: string; example: string }> {
  const patterns: Array<{ pattern: string; example: string }> = [];

  if (/toggle\s+\./i.test(code)) {
    patterns.push({
      pattern: 'Class toggle',
      example: 'on click toggle .active on me',
    });
  }

  if (/fetch\s+/i.test(code)) {
    patterns.push({
      pattern: 'Data fetching',
      example: 'fetch /api/data as json then put result into #target',
    });
  }

  if (/on\s+click/i.test(code) && /add\s+\./i.test(code)) {
    patterns.push({
      pattern: 'Click handler with class',
      example: 'on click add .selected to me then remove .selected from .siblings',
    });
  }

  if (/wait\s+\d+/i.test(code)) {
    patterns.push({
      pattern: 'Timed action',
      example: 'on click add .loading then wait 500ms then remove .loading',
    });
  }

  return patterns;
}
