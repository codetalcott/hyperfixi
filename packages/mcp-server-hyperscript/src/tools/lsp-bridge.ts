/**
 * LSP Bridge Tools for original _hyperscript
 *
 * Pattern-based diagnostics, completions, hover, and document symbols.
 * No external dependencies — pure regex/pattern analysis.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// Types
// =============================================================================

interface Diagnostic {
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  severity: number; // 1=Error, 2=Warning, 3=Info, 4=Hint
  code?: string;
  source: string;
  message: string;
}

interface CompletionItem {
  label: string;
  kind: string;
  detail?: string;
  documentation?: string;
}

interface DocumentSymbol {
  name: string;
  kind: string;
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
}

// =============================================================================
// Keyword Database
// =============================================================================

const COMMANDS = [
  'toggle',
  'add',
  'remove',
  'show',
  'hide',
  'set',
  'get',
  'put',
  'append',
  'prepend',
  'increment',
  'decrement',
  'log',
  'send',
  'trigger',
  'wait',
  'fetch',
  'call',
  'go',
  'focus',
  'blur',
  'return',
  'break',
  'continue',
  'exit',
  'halt',
  'throw',
  'transition',
  'take',
  'tell',
  'repeat',
  'for',
  'while',
  'if',
  'unless',
  'js',
  'default',
];

const FEATURES = ['on', 'behavior', 'def', 'init', 'worker', 'eventsource', 'socket'];
const REFERENCES = [
  'me',
  'you',
  'it',
  'result',
  'my',
  'its',
  'your',
  'event',
  'target',
  'detail',
  'body',
  'window',
  'document',
];
const BLOCK_KEYWORDS = ['then', 'end', 'else', 'from', 'to', 'into', 'with', 'as', 'in'];
const POSITIONAL = ['first', 'last', 'next', 'previous', 'closest', 'parent', 'children', 'random'];
const LOGICAL = [
  'and',
  'or',
  'not',
  'is',
  'exists',
  'empty',
  'matches',
  'contains',
  'has',
  'no',
  'do',
  'does',
];
const EVENTS = [
  'click',
  'dblclick',
  'submit',
  'input',
  'change',
  'focus',
  'blur',
  'keydown',
  'keyup',
  'keypress',
  'mouseenter',
  'mouseleave',
  'mouseover',
  'mouseout',
  'mousedown',
  'mouseup',
  'scroll',
  'load',
  'resize',
  'intersection',
  'mutation',
  'every',
];
const EVENT_MODIFIERS = ['once', 'prevent', 'stop', 'capture', 'passive', 'debounce', 'throttle'];

const ALL_KEYWORDS = [
  ...COMMANDS,
  ...FEATURES,
  ...REFERENCES,
  ...BLOCK_KEYWORDS,
  ...POSITIONAL,
  ...LOGICAL,
];

// =============================================================================
// Hover Documentation
// =============================================================================

const HOVER_DOCS: Record<string, { title: string; description: string; example: string }> = {
  toggle: {
    title: 'toggle',
    description: 'Toggle a class, attribute, or visibility on an element',
    example: 'toggle .active on me',
  },
  add: {
    title: 'add',
    description: 'Add a class or attribute to an element',
    example: 'add .highlight to me',
  },
  remove: {
    title: 'remove',
    description: 'Remove a class, attribute, or element',
    example: 'remove .error from #form',
  },
  show: {
    title: 'show',
    description: 'Show a hidden element, optionally with a transition',
    example: 'show #modal with *opacity',
  },
  hide: {
    title: 'hide',
    description: 'Hide an element, optionally with a transition',
    example: 'hide me with *opacity',
  },
  set: {
    title: 'set',
    description: 'Set a variable or element property',
    example: 'set :count to 0',
  },
  get: {
    title: 'get',
    description: 'Get a value from an element or expression',
    example: 'get #input.value',
  },
  put: {
    title: 'put',
    description: 'Put content into an element',
    example: 'put "Hello" into #greeting',
  },
  append: {
    title: 'append',
    description: 'Append content to the end of an element',
    example: 'append "<li>New</li>" to #list',
  },
  fetch: {
    title: 'fetch',
    description: 'Make an HTTP request',
    example: 'fetch /api/data as json',
  },
  wait: {
    title: 'wait',
    description: 'Pause execution for a specified duration',
    example: 'wait 500ms',
  },
  send: { title: 'send', description: 'Dispatch a custom event', example: 'send refresh to #list' },
  trigger: {
    title: 'trigger',
    description: 'Trigger an event on an element',
    example: 'trigger submit on #form',
  },
  call: {
    title: 'call',
    description: 'Call a JavaScript function',
    example: 'call alert("Hello")',
  },
  log: { title: 'log', description: 'Log a value to the console', example: 'log me' },
  increment: {
    title: 'increment',
    description: 'Add 1 to a variable',
    example: 'increment :count',
  },
  decrement: {
    title: 'decrement',
    description: 'Subtract 1 from a variable',
    example: 'decrement :count',
  },
  go: { title: 'go', description: 'Navigate to a URL', example: 'go to /dashboard' },
  take: {
    title: 'take',
    description: 'Move a class from siblings to this element (exclusive selection)',
    example: 'take .active from .tabs',
  },
  transition: {
    title: 'transition',
    description: 'Animate a CSS property change',
    example: 'transition *opacity to 0 over 500ms',
  },
  repeat: {
    title: 'repeat',
    description: 'Loop a fixed number of times',
    example: 'repeat 5 times ... end',
  },
  on: {
    title: 'on',
    description: 'Handle a DOM or custom event',
    example: 'on click toggle .active',
  },
  me: {
    title: 'me',
    description: 'Reference to the current element (the one with the _ attribute)',
    example: 'toggle .active on me',
  },
  you: {
    title: 'you',
    description: 'Reference to the event target element',
    example: 'add .selected to you',
  },
  it: {
    title: 'it',
    description: 'Reference to the result of the previous command',
    example: 'fetch /api then put it into #output',
  },
  result: {
    title: 'result',
    description: 'Alias for "it" — the result of the previous command',
    example: 'fetch /api then put result into #output',
  },
  closest: {
    title: 'closest',
    description: 'Find the nearest ancestor matching a selector',
    example: 'toggle .open on closest .accordion',
  },
  first: {
    title: 'first',
    description: 'Get the first item from a collection',
    example: 'first of .items',
  },
  last: {
    title: 'last',
    description: 'Get the last item from a collection',
    example: 'last of .items',
  },
  next: {
    title: 'next',
    description: 'Get the next sibling matching a selector',
    example: 'toggle .open on next .panel',
  },
  previous: {
    title: 'previous',
    description: 'Get the previous sibling matching a selector',
    example: 'previous <li/>',
  },
  behavior: {
    title: 'behavior',
    description: 'Define a reusable behavior that can be installed on elements',
    example: 'behavior Toggleable ... end',
  },
  def: {
    title: 'def',
    description: 'Define a reusable function',
    example: 'def greet(name) log name end',
  },
  init: {
    title: 'init',
    description: 'Run code once when the element loads',
    example: 'init add .loaded to me',
  },
};

// =============================================================================
// Tool Definitions
// =============================================================================

export const lspBridgeTools: Tool[] = [
  {
    name: 'get_diagnostics',
    description: 'Analyze _hyperscript code and return diagnostics (errors, warnings, hints)',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The hyperscript code to analyze' },
      },
      required: ['code'],
    },
  },
  {
    name: 'get_completions',
    description: 'Get context-aware code completions for _hyperscript at a given position',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The hyperscript code' },
        line: { type: 'number', description: 'Line number (0-indexed)' },
        character: { type: 'number', description: 'Character position (0-indexed)' },
        context: {
          type: 'string',
          enum: ['event', 'command', 'expression', 'selector'],
          description: 'Optional context hint for more relevant completions',
        },
      },
      required: ['code', 'line', 'character'],
    },
  },
  {
    name: 'get_hover_info',
    description: 'Get hover documentation for a _hyperscript keyword at a given position',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The hyperscript code' },
        line: { type: 'number', description: 'Line number (0-indexed)' },
        character: { type: 'number', description: 'Character position (0-indexed)' },
      },
      required: ['code', 'line', 'character'],
    },
  },
  {
    name: 'get_document_symbols',
    description: 'Extract document symbols (event handlers, behaviors, functions) for outline view',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The hyperscript code to analyze' },
      },
      required: ['code'],
    },
  },
];

// =============================================================================
// Tool Handlers
// =============================================================================

export async function handleLspBridgeTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  switch (name) {
    case 'get_diagnostics':
      return getDiagnostics(args.code as string);
    case 'get_completions':
      return getCompletions(
        args.code as string,
        args.line as number,
        args.character as number,
        args.context as string | undefined
      );
    case 'get_hover_info':
      return getHoverInfo(args.code as string, args.line as number, args.character as number);
    case 'get_document_symbols':
      return getDocumentSymbols(args.code as string);
    default:
      return {
        content: [{ type: 'text', text: `Unknown LSP bridge tool: ${name}` }],
        isError: true,
      };
  }
}

// =============================================================================
// Diagnostics
// =============================================================================

function getDiagnostics(code: string): { content: Array<{ type: string; text: string }> } {
  const diagnostics: Diagnostic[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Unmatched quotes
    const singleQuotes = (line.match(/'/g) || []).length;
    const doubleQuotes = (line.match(/"/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      diagnostics.push({
        range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
        severity: 1,
        code: 'unmatched-quote',
        source: 'hyperscript-mcp',
        message: 'Unmatched single quote',
      });
    }
    if (doubleQuotes % 2 !== 0) {
      diagnostics.push({
        range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
        severity: 1,
        code: 'unmatched-quote',
        source: 'hyperscript-mcp',
        message: 'Unmatched double quote',
      });
    }
  }

  // Unclosed blocks
  const blockOpens = (code.match(/\b(if|repeat|for|while)\b/gi) || []).length;
  const endCount = (code.match(/\bend\b/gi) || []).length;
  if (blockOpens > endCount) {
    diagnostics.push({
      range: {
        start: { line: 0, character: 0 },
        end: { line: lines.length - 1, character: lines[lines.length - 1].length },
      },
      severity: 2,
      code: 'unclosed-block',
      source: 'hyperscript-mcp',
      message: `Possibly unclosed block: ${blockOpens} openings, ${endCount} "end" keywords`,
    });
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            diagnostics,
            count: diagnostics.length,
            hasErrors: diagnostics.some(d => d.severity === 1),
            hasWarnings: diagnostics.some(d => d.severity === 2),
          },
          null,
          2
        ),
      },
    ],
  };
}

// =============================================================================
// Completions
// =============================================================================

function getCompletions(
  code: string,
  line: number,
  character: number,
  context?: string
): { content: Array<{ type: string; text: string }> } {
  const lines = code.split('\n');
  const currentLine = lines[line] || '';
  const prefix = currentLine.slice(0, character).trim().toLowerCase();
  const completions: CompletionItem[] = [];

  // Determine context from code
  const inferredContext = context || inferContext(prefix, code);

  switch (inferredContext) {
    case 'event':
      for (const event of EVENTS) {
        completions.push({ label: event, kind: 'Event', detail: `DOM event: ${event}` });
      }
      for (const mod of EVENT_MODIFIERS) {
        completions.push({ label: `.${mod}`, kind: 'Modifier', detail: `Event modifier: .${mod}` });
      }
      break;

    case 'command':
      for (const cmd of COMMANDS) {
        const doc = HOVER_DOCS[cmd];
        completions.push({
          label: cmd,
          kind: 'Keyword',
          detail: doc?.description || `Command: ${cmd}`,
          documentation: doc?.example,
        });
      }
      break;

    case 'expression':
      for (const ref of REFERENCES) {
        const doc = HOVER_DOCS[ref];
        completions.push({
          label: ref,
          kind: 'Variable',
          detail: doc?.description || `Reference: ${ref}`,
        });
      }
      for (const pos of POSITIONAL) {
        completions.push({ label: pos, kind: 'Keyword', detail: `Positional: ${pos}` });
      }
      break;

    case 'selector':
      completions.push(
        { label: '#', kind: 'Selector', detail: 'ID selector (#elementId)' },
        { label: '.', kind: 'Selector', detail: 'Class selector (.className)' },
        { label: '<', kind: 'Selector', detail: 'Tag selector (<tag/>)' },
        { label: '@', kind: 'Selector', detail: 'Attribute reference (@attrName)' },
        { label: ':', kind: 'Selector', detail: 'Local variable (:varName)' },
        { label: '$', kind: 'Selector', detail: 'Global variable ($varName)' },
        { label: '*', kind: 'Selector', detail: 'Style reference (*propertyName)' }
      );
      break;

    default: {
      // Show keyword-filtered completions
      const lastWord = prefix.split(/\s+/).pop() || '';
      const all = [
        ...COMMANDS,
        ...FEATURES,
        ...REFERENCES,
        ...BLOCK_KEYWORDS,
        ...POSITIONAL,
        ...LOGICAL,
      ];
      for (const kw of all) {
        if (!lastWord || kw.startsWith(lastWord)) {
          const doc = HOVER_DOCS[kw];
          completions.push({
            label: kw,
            kind: 'Keyword',
            detail: doc?.description || kw,
          });
        }
      }
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            completions: completions.slice(0, 30),
            context: inferredContext,
            total: completions.length,
          },
          null,
          2
        ),
      },
    ],
  };
}

function inferContext(prefix: string, code: string): string {
  if (/\bon\s+\w*$/.test(prefix)) return 'event';
  if (/\bthen\s*$/.test(prefix) || /^\s*$/.test(prefix)) return 'command';
  if (/\b(on|to|from|into)\s+$/.test(prefix)) return 'selector';
  if (/\b(if|while|unless)\s+/.test(prefix)) return 'expression';
  return 'auto';
}

// =============================================================================
// Hover Info
// =============================================================================

function getHoverInfo(
  code: string,
  line: number,
  character: number
): { content: Array<{ type: string; text: string }> } {
  const lines = code.split('\n');
  const currentLine = lines[line] || '';

  // Extract word at position
  let start = character;
  let end = character;
  while (start > 0 && /\w/.test(currentLine[start - 1])) start--;
  while (end < currentLine.length && /\w/.test(currentLine[end])) end++;
  const word = currentLine.slice(start, end).toLowerCase();

  if (!word) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ hover: null, word: '' }, null, 2) }],
    };
  }

  const doc = HOVER_DOCS[word];
  if (doc) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              hover: {
                contents: `### ${doc.title}\n\n${doc.description}\n\n**Example:** \`${doc.example}\``,
                word,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Check if it's an event
  if (EVENTS.includes(word)) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              hover: {
                contents: `### ${word}\n\nDOM event. Use with \`on ${word}\` to handle this event.\n\n**Example:** \`on ${word} toggle .active\``,
                word,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  return {
    content: [{ type: 'text', text: JSON.stringify({ hover: null, word }, null, 2) }],
  };
}

// =============================================================================
// Document Symbols
// =============================================================================

function getDocumentSymbols(code: string): { content: Array<{ type: string; text: string }> } {
  const symbols: DocumentSymbol[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Event handlers
    const eventMatch = line.match(/\bon\s+(\w+)/i);
    if (eventMatch) {
      symbols.push({
        name: `on ${eventMatch[1]}`,
        kind: 'Event',
        range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
      });
    }

    // Behaviors
    const behaviorMatch = line.match(/\bbehavior\s+(\w+)/i);
    if (behaviorMatch) {
      symbols.push({
        name: `behavior ${behaviorMatch[1]}`,
        kind: 'Class',
        range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
      });
    }

    // Functions
    const defMatch = line.match(/\bdef\s+(\w+)/i);
    if (defMatch) {
      symbols.push({
        name: `def ${defMatch[1]}`,
        kind: 'Function',
        range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
      });
    }

    // Init blocks
    if (/\binit\b/i.test(line)) {
      symbols.push({
        name: 'init',
        kind: 'Constructor',
        range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
      });
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ symbols, count: symbols.length }, null, 2),
      },
    ],
  };
}
