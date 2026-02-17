/**
 * Language Documentation Tools for original _hyperscript
 *
 * Self-contained command and expression documentation.
 * No external dependencies.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// Tool Definitions
// =============================================================================

export const languageDocsTools: Tool[] = [
  {
    name: 'get_command_docs',
    description:
      'Get documentation for a specific _hyperscript command. Returns syntax, description, and examples.',
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
      'Get documentation for _hyperscript expression types (e.g., "me", "closest", "attribute-ref").',
    inputSchema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The expression name (e.g., "me", "closest", "possessive", "as")',
        },
      },
      required: ['expression'],
    },
  },
  {
    name: 'search_language_elements',
    description:
      'Search across all _hyperscript language elements (commands, expressions, features, special symbols).',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find matching language elements',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 10)',
          default: 10,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'suggest_best_practices',
    description:
      'Analyze _hyperscript code and suggest improvements based on common best practices.',
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
// Command Documentation
// =============================================================================

interface CommandDoc {
  name: string;
  description: string;
  syntax: string;
  examples: string[];
  category: string;
}

const COMMAND_DOCS: Record<string, CommandDoc> = {
  toggle: {
    name: 'toggle',
    category: 'DOM Manipulation',
    description: 'Toggle a class, attribute, or visibility state on an element',
    syntax: 'toggle <class|attr> [on <target>]',
    examples: ['toggle .active on me', 'toggle .open on #menu', 'toggle @disabled on #btn'],
  },
  add: {
    name: 'add',
    category: 'DOM Manipulation',
    description: 'Add a class or attribute to an element',
    syntax: 'add <class|attr> [to <target>]',
    examples: ['add .highlight to me', 'add .error to #form', 'add @disabled to <button/>'],
  },
  remove: {
    name: 'remove',
    category: 'DOM Manipulation',
    description: 'Remove a class, attribute, or element from the DOM',
    syntax: 'remove <class|attr|element> [from <target>]',
    examples: ['remove .error from #form', 'remove me', 'remove @disabled from #btn'],
  },
  show: {
    name: 'show',
    category: 'DOM Manipulation',
    description: 'Show a hidden element, optionally with a transition',
    syntax: 'show <target> [with <transition>]',
    examples: ['show #modal', 'show #modal with *opacity'],
  },
  hide: {
    name: 'hide',
    category: 'DOM Manipulation',
    description: 'Hide an element, optionally with a transition',
    syntax: 'hide <target> [with <transition>]',
    examples: ['hide me', 'hide #modal with *opacity'],
  },
  put: {
    name: 'put',
    category: 'DOM Manipulation',
    description: 'Set element content (innerHTML, textContent, etc.)',
    syntax: 'put <value> into <target>',
    examples: ['put "Hello" into #greeting', 'put it into me', 'put "" into #output'],
  },
  append: {
    name: 'append',
    category: 'DOM Manipulation',
    description: 'Append content to the end of an element',
    syntax: 'append <content> to <target>',
    examples: ['append "<li>New</li>" to #list'],
  },
  set: {
    name: 'set',
    category: 'Data',
    description: 'Set a variable or element property',
    syntax: 'set <property> to <value>',
    examples: ['set :count to 0', 'set #input.value to ""', 'set $theme to "dark"'],
  },
  get: {
    name: 'get',
    category: 'Data',
    description: 'Get a value from an element or expression',
    syntax: 'get <expression>',
    examples: ['get #input.value', 'get closest <form/>'],
  },
  increment: {
    name: 'increment',
    category: 'Data',
    description: 'Add 1 to a numeric variable',
    syntax: 'increment <variable>',
    examples: ['increment :count', 'increment #counter.textContent'],
  },
  decrement: {
    name: 'decrement',
    category: 'Data',
    description: 'Subtract 1 from a numeric variable',
    syntax: 'decrement <variable>',
    examples: ['decrement :count'],
  },
  send: {
    name: 'send',
    category: 'Events',
    description: 'Dispatch a custom event to an element',
    syntax: 'send <event> [to <target>]',
    examples: ['send refresh to #list', 'send custom:update to <body/>'],
  },
  trigger: {
    name: 'trigger',
    category: 'Events',
    description: 'Trigger an event on an element',
    syntax: 'trigger <event> [on <target>]',
    examples: ['trigger submit on #form', 'trigger click on #btn'],
  },
  wait: {
    name: 'wait',
    category: 'Async',
    description: 'Pause execution for a specified duration',
    syntax: 'wait <duration>',
    examples: ['wait 500ms', 'wait 2s', 'wait 1 second'],
  },
  fetch: {
    name: 'fetch',
    category: 'Async',
    description: 'Make an HTTP request and store the result',
    syntax: 'fetch <url> [as <type>]',
    examples: [
      'fetch /api/data as json',
      'fetch /page as html',
      'fetch /api then put it into #output',
    ],
  },
  call: {
    name: 'call',
    category: 'Utility',
    description: 'Call a JavaScript function',
    syntax: 'call <function>(args)',
    examples: ['call alert("Hello")', 'call navigator.clipboard.writeText("copied")'],
  },
  log: {
    name: 'log',
    category: 'Utility',
    description: 'Log a value to the browser console',
    syntax: 'log <expression>',
    examples: ['log me', 'log #input.value', 'log "debug info"'],
  },
  go: {
    name: 'go',
    category: 'Navigation',
    description: 'Navigate to a URL',
    syntax: 'go to <url>',
    examples: ['go to /dashboard', 'go to url "/settings"'],
  },
  focus: {
    name: 'focus',
    category: 'Navigation',
    description: 'Focus an element',
    syntax: 'focus <target>',
    examples: ['focus #input', 'focus first <input/>'],
  },
  take: {
    name: 'take',
    category: 'DOM Manipulation',
    description: 'Move a class from siblings to the current element (exclusive selection)',
    syntax: 'take <class> from <group>',
    examples: ['take .active from .tabs', 'take .selected from .items'],
  },
  transition: {
    name: 'transition',
    category: 'Animation',
    description: 'Animate a CSS property change over a duration',
    syntax: 'transition <property> to <value> over <duration>',
    examples: ['transition *opacity to 0 over 500ms', 'transition *height to "0px" over 300ms'],
  },
  tell: {
    name: 'tell',
    category: 'Control Flow',
    description: 'Set the implicit target for subsequent commands',
    syntax: 'tell <target> <commands> end',
    examples: ['tell #sidebar toggle .collapsed end'],
  },
  if: {
    name: 'if',
    category: 'Control Flow',
    description: 'Conditional execution',
    syntax: 'if <condition> <commands> [else <commands>] end',
    examples: [
      'if me matches .active hide me else show me end',
      'if #input.value is empty add .error end',
    ],
  },
  repeat: {
    name: 'repeat',
    category: 'Control Flow',
    description: 'Loop a fixed number of times',
    syntax: 'repeat <count> times <commands> end',
    examples: ['repeat 5 times increment :count end'],
  },
  for: {
    name: 'for',
    category: 'Control Flow',
    description: 'Iterate over a collection',
    syntax: 'for <item> in <collection> <commands> end',
    examples: ['for item in .list-item add .processed to item end'],
  },
};

// =============================================================================
// Expression Documentation
// =============================================================================

interface ExpressionDoc {
  name: string;
  description: string;
  category: string;
  evaluatesTo: string;
  examples: string[];
}

const EXPRESSION_DOCS: Record<string, ExpressionDoc> = {
  me: {
    name: 'me',
    category: 'references',
    evaluatesTo: 'Element',
    description: 'Reference to the current element (the element with the _ attribute)',
    examples: ['toggle .active on me', 'put "Hello" into me'],
  },
  you: {
    name: 'you',
    category: 'references',
    evaluatesTo: 'Element',
    description: 'Reference to the element that triggered the event',
    examples: ['add .selected to you'],
  },
  it: {
    name: 'it',
    category: 'references',
    evaluatesTo: 'Any',
    description: 'Reference to the result of the previous command',
    examples: ['fetch /api then put it into #output'],
  },
  result: {
    name: 'result',
    category: 'references',
    evaluatesTo: 'Any',
    description: 'Alias for "it"',
    examples: ['fetch /api then put result into #output'],
  },
  its: {
    name: 'its',
    category: 'references',
    evaluatesTo: 'Any',
    description: "Possessive form of 'it' for property access",
    examples: ['fetch /api as json then put its name into #output'],
  },
  closest: {
    name: 'closest',
    category: 'references',
    evaluatesTo: 'Element',
    description: 'Find the nearest ancestor matching a selector',
    examples: ['toggle .open on closest .accordion-item'],
  },
  parent: {
    name: 'parent',
    category: 'references',
    evaluatesTo: 'Element',
    description: 'Direct parent element',
    examples: ['add .highlight to parent'],
  },
  first: {
    name: 'first',
    category: 'positional',
    evaluatesTo: 'Any',
    description: 'First item from a collection',
    examples: ['first of .items', 'first <li/>'],
  },
  last: {
    name: 'last',
    category: 'positional',
    evaluatesTo: 'Any',
    description: 'Last item from a collection',
    examples: ['last of .items', 'last <li/>'],
  },
  next: {
    name: 'next',
    category: 'positional',
    evaluatesTo: 'Element',
    description: 'Next sibling matching a selector',
    examples: ['toggle .open on next .panel'],
  },
  previous: {
    name: 'previous',
    category: 'positional',
    evaluatesTo: 'Element',
    description: 'Previous sibling matching a selector',
    examples: ['previous <li/>'],
  },
  possessive: {
    name: 'possessive',
    category: 'properties',
    evaluatesTo: 'Any',
    description: "Access element properties using 's or my/its/your",
    examples: ["#input's value", 'my textContent', 'its length'],
  },
  'attribute-ref': {
    name: 'attribute-ref',
    category: 'properties',
    evaluatesTo: 'String',
    description: 'Reference to a DOM attribute using @ prefix',
    examples: ['toggle @disabled', 'set @data-id to "123"'],
  },
  'style-ref': {
    name: 'style-ref',
    category: 'properties',
    evaluatesTo: 'String',
    description: 'Reference to a CSS style property using * prefix',
    examples: ['set *background-color to "red"'],
  },
  'query-reference': {
    name: 'query-reference',
    category: 'references',
    evaluatesTo: 'Element | NodeList',
    description: 'CSS selector query: #id, .class, <tag/>',
    examples: ['toggle .active on #button', 'remove <li/>'],
  },
  as: {
    name: 'as',
    category: 'conversion',
    evaluatesTo: 'varies',
    description: 'Type conversion',
    examples: ['fetch /api as json', '"42" as Number'],
  },
  matches: {
    name: 'matches',
    category: 'logical',
    evaluatesTo: 'Boolean',
    description: 'Check if element matches a CSS selector',
    examples: ['if me matches .disabled'],
  },
  contains: {
    name: 'contains',
    category: 'logical',
    evaluatesTo: 'Boolean',
    description: 'Check if string/array contains a value',
    examples: ['if "hello" contains "ell"'],
  },
  exists: {
    name: 'exists',
    category: 'logical',
    evaluatesTo: 'Boolean',
    description: 'Check if a value/element exists',
    examples: ['if #modal exists'],
  },
  'is-empty': {
    name: 'is-empty',
    category: 'logical',
    evaluatesTo: 'Boolean',
    description: 'Check if value is empty',
    examples: ['if #input.value is empty'],
  },
  has: {
    name: 'has',
    category: 'logical',
    evaluatesTo: 'Boolean',
    description: 'Check if element has a class or attribute',
    examples: ['if me has .active'],
  },
};

// =============================================================================
// Special Symbols
// =============================================================================

const SPECIAL_SYMBOLS = [
  { name: 'class-ref', symbol: '.', description: 'CSS class reference (.active, .hidden)' },
  { name: 'id-ref', symbol: '#', description: 'CSS ID reference (#button, #output)' },
  {
    name: 'attribute-ref',
    symbol: '@',
    description: 'HTML attribute reference (@disabled, @data-id)',
  },
  {
    name: 'style-ref',
    symbol: '*',
    description: 'CSS style property (*background-color, *opacity)',
  },
  { name: 'local-var', symbol: ':', description: 'Local variable (:count, :data)' },
  { name: 'global-var', symbol: '$', description: 'Global variable ($theme, $user)' },
  { name: 'html-literal', symbol: '<tag/>', description: 'HTML tag selector (<div/>, <button/>)' },
  {
    name: 'possessive',
    symbol: "'s",
    description: "Possessive property access (element's property)",
  },
  { name: 'then', symbol: 'then', description: 'Command chain separator' },
  { name: 'end', symbol: 'end', description: 'Block terminator for if/repeat/for/while' },
];

// =============================================================================
// Best Practices
// =============================================================================

const BEST_PRACTICES = [
  {
    id: 'prefer-toggle',
    pattern:
      /add\s+\.\w+[\s\S]*remove\s+\.\w+|if[\s\S]*has\s+\.\w+[\s\S]*remove[\s\S]*else[\s\S]*add/i,
    message: 'Consider using "toggle" instead of conditional add/remove',
    suggestion: 'toggle .className on element',
  },
  {
    id: 'use-then',
    pattern:
      /\b(toggle|add|remove|show|hide|set|put|fetch|wait|send)\b[^"'\n]*\b(toggle|add|remove|show|hide|set|put|fetch|wait|send)\b/i,
    message: 'Use "then" to chain commands for clarity',
    suggestion: 'command1 then command2',
  },
  {
    id: 'avoid-deep-nesting',
    pattern: /\bif\b[\s\S]*\bif\b[\s\S]*\bif\b/i,
    message: 'Avoid deeply nested conditionals — consider early returns or guard clauses',
    suggestion: 'if not condition return end',
  },
  {
    id: 'use-wait-for-timing',
    pattern: /setTimeout|setInterval/i,
    message: 'Use hyperscript "wait" instead of setTimeout',
    suggestion: 'wait 500ms',
  },
  {
    id: 'prefer-css-for-style',
    pattern: /set\s+\*[\w-]+\s+to/i,
    message: 'Consider using CSS classes instead of inline styles for maintainability',
    suggestion: 'toggle .styled instead of setting individual style properties',
  },
  {
    id: 'use-me',
    pattern: /document\.getElementById|document\.querySelector/i,
    message: 'Use "me" to reference the current element instead of DOM queries',
    suggestion: 'Use "me", "#id", or ".class" references',
  },
];

// =============================================================================
// Tool Handlers
// =============================================================================

export async function handleLanguageDocsTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'get_command_docs': {
        const command = (args.command as string)?.toLowerCase();
        if (!command) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Missing required parameter: command' }, null, 2),
              },
            ],
            isError: true,
          };
        }
        const doc = COMMAND_DOCS[command];
        if (!doc) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: `Unknown command: ${command}`,
                    availableCommands: Object.keys(COMMAND_DOCS).sort(),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
        return { content: [{ type: 'text', text: JSON.stringify(doc, null, 2) }] };
      }

      case 'get_expression_docs': {
        const expression = (args.expression as string)?.toLowerCase();
        if (!expression) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Missing required parameter: expression' }, null, 2),
              },
            ],
            isError: true,
          };
        }
        const doc = EXPRESSION_DOCS[expression];
        if (!doc) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: `Unknown expression: ${expression}`,
                    availableExpressions: Object.keys(EXPRESSION_DOCS).sort(),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
        return { content: [{ type: 'text', text: JSON.stringify(doc, null, 2) }] };
      }

      case 'search_language_elements': {
        const query = (args.query as string)?.toLowerCase();
        const limit = (args.limit as number) || 10;
        if (!query) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Missing required parameter: query' }, null, 2),
              },
            ],
            isError: true,
          };
        }

        const results: Array<{ type: string; name: string; description: string; match: string }> =
          [];

        // Search commands
        for (const [, doc] of Object.entries(COMMAND_DOCS)) {
          if (
            doc.name.includes(query) ||
            doc.description.toLowerCase().includes(query) ||
            doc.category.toLowerCase().includes(query)
          ) {
            results.push({
              type: 'command',
              name: doc.name,
              description: doc.description,
              match: doc.category,
            });
          }
        }

        // Search expressions
        for (const [, doc] of Object.entries(EXPRESSION_DOCS)) {
          if (
            doc.name.includes(query) ||
            doc.description.toLowerCase().includes(query) ||
            doc.category.includes(query)
          ) {
            results.push({
              type: 'expression',
              name: doc.name,
              description: doc.description,
              match: doc.category,
            });
          }
        }

        // Search special symbols
        for (const sym of SPECIAL_SYMBOLS) {
          if (
            sym.name.includes(query) ||
            sym.description.toLowerCase().includes(query) ||
            sym.symbol.includes(query)
          ) {
            results.push({
              type: 'special_symbol',
              name: sym.name,
              description: `${sym.symbol} — ${sym.description}`,
              match: sym.symbol,
            });
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { query, results: results.slice(0, limit), total: results.length },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'suggest_best_practices': {
        const code = args.code as string;
        if (!code) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Missing required parameter: code' }, null, 2),
              },
            ],
            isError: true,
          };
        }

        const suggestions: Array<{ id: string; message: string; suggestion: string }> = [];
        for (const practice of BEST_PRACTICES) {
          if (practice.pattern.test(code)) {
            suggestions.push({
              id: practice.id,
              message: practice.message,
              suggestion: practice.suggestion,
            });
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  suggestions,
                  count: suggestions.length,
                  code,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown language docs tool: ${name}` }],
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
