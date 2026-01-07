/**
 * LSP Bridge Tools for MCP Server
 * Exposes diagnostics, completions, and hover via MCP protocol
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// Try to import from ast-toolkit
let astToolkit: any = null;
try {
  astToolkit = await import('@hyperfixi/ast-toolkit');
} catch {
  // ast-toolkit not available
}

// Try to import parser from core
let parser: any = null;
try {
  const core = await import('@hyperfixi/core');
  parser = core.parser || core.HyperscriptParser;
} catch {
  // core not available
}

// ============================================================================
// LSP Bridge Tool Definitions
// ============================================================================

export const lspBridgeTools = [
  {
    name: 'get_diagnostics',
    description: 'Analyze hyperscript code and return LSP-compatible diagnostics (errors, warnings, hints)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string',
          description: 'The hyperscript code to analyze',
        },
        uri: {
          type: 'string',
          description: 'Optional document URI for caching (default: "inline")',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'get_completions',
    description: 'Get context-aware code completions for hyperscript at a given position',
    inputSchema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string',
          description: 'The hyperscript code',
        },
        line: {
          type: 'number',
          description: 'Line number (0-indexed)',
        },
        character: {
          type: 'number',
          description: 'Character position in line (0-indexed)',
        },
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
    description: 'Get hover documentation for a hyperscript element at a given position',
    inputSchema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string',
          description: 'The hyperscript code',
        },
        line: {
          type: 'number',
          description: 'Line number (0-indexed)',
        },
        character: {
          type: 'number',
          description: 'Character position in line (0-indexed)',
        },
      },
      required: ['code', 'line', 'character'],
    },
  },
  {
    name: 'get_document_symbols',
    description: 'Extract document symbols (event handlers, behaviors, functions) for outline view',
    inputSchema: {
      type: 'object' as const,
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

// ============================================================================
// Tool Handlers
// ============================================================================

export async function handleLspBridgeTool(
  name: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  switch (name) {
    case 'get_diagnostics':
      return getDiagnostics(args.code as string, args.uri as string | undefined);
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

// ============================================================================
// Diagnostic Analysis
// ============================================================================

async function getDiagnostics(
  code: string,
  _uri?: string
): Promise<CallToolResult> {
  const diagnostics: Diagnostic[] = [];

  // Try AST-based analysis first
  if (astToolkit && parser) {
    try {
      const ast = parser.parse(code);
      if (ast && astToolkit.astToLSPDiagnostics) {
        const astDiagnostics = astToolkit.astToLSPDiagnostics(ast);
        diagnostics.push(...astDiagnostics);
      }
    } catch (parseError: any) {
      // Parse error becomes a diagnostic
      diagnostics.push({
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: code.length },
        },
        severity: 1, // Error
        code: 'parse-error',
        source: 'hyperfixi-mcp',
        message: parseError.message || 'Failed to parse hyperscript',
      });
    }
  }

  // Fallback: simple pattern-based analysis
  if (diagnostics.length === 0) {
    diagnostics.push(...runSimpleDiagnostics(code));
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            diagnostics,
            count: diagnostics.length,
            hasErrors: diagnostics.some((d) => d.severity === 1),
            hasWarnings: diagnostics.some((d) => d.severity === 2),
          },
          null,
          2
        ),
      },
    ],
  };
}

function runSimpleDiagnostics(code: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lines = code.split('\n');

  // Check for common issues
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Unmatched quotes
    const singleQuotes = (line.match(/'/g) || []).length;
    const doubleQuotes = (line.match(/"/g) || []).length;
    const backticks = (line.match(/`/g) || []).length;

    if (singleQuotes % 2 !== 0) {
      diagnostics.push({
        range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
        severity: 1,
        code: 'unmatched-quote',
        source: 'hyperfixi-mcp',
        message: 'Unmatched single quote',
      });
    }

    if (doubleQuotes % 2 !== 0) {
      diagnostics.push({
        range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
        severity: 1,
        code: 'unmatched-quote',
        source: 'hyperfixi-mcp',
        message: 'Unmatched double quote',
      });
    }

    if (backticks % 2 !== 0) {
      diagnostics.push({
        range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
        severity: 1,
        code: 'unmatched-backtick',
        source: 'hyperfixi-mcp',
        message: 'Unmatched backtick',
      });
    }

    // Deprecated patterns
    if (/\bsetTimeout\b/.test(line)) {
      const idx = line.indexOf('setTimeout');
      diagnostics.push({
        range: {
          start: { line: i, character: idx },
          end: { line: i, character: idx + 10 },
        },
        severity: 2,
        code: 'prefer-wait',
        source: 'hyperfixi-mcp',
        message: 'Consider using "wait" command instead of setTimeout',
      });
    }

    // Missing 'then' between commands (common mistake)
    if (/\b(toggle|add|remove|show|hide)\s+\.\w+\s+(toggle|add|remove|show|hide)\b/.test(line)) {
      diagnostics.push({
        range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
        severity: 2,
        code: 'missing-then',
        source: 'hyperfixi-mcp',
        message: 'Commands should be separated by "then"',
      });
    }
  }

  // Check for unbalanced parentheses/brackets
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  const openBrackets = (code.match(/\[/g) || []).length;
  const closeBrackets = (code.match(/\]/g) || []).length;
  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;

  if (openParens !== closeParens) {
    diagnostics.push({
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
      severity: 1,
      code: 'unbalanced-parens',
      source: 'hyperfixi-mcp',
      message: `Unbalanced parentheses: ${openParens} open, ${closeParens} close`,
    });
  }

  if (openBrackets !== closeBrackets) {
    diagnostics.push({
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
      severity: 1,
      code: 'unbalanced-brackets',
      source: 'hyperfixi-mcp',
      message: `Unbalanced brackets: ${openBrackets} open, ${closeBrackets} close`,
    });
  }

  if (openBraces !== closeBraces) {
    diagnostics.push({
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
      severity: 1,
      code: 'unbalanced-braces',
      source: 'hyperfixi-mcp',
      message: `Unbalanced braces: ${openBraces} open, ${closeBraces} close`,
    });
  }

  return diagnostics;
}

// ============================================================================
// Code Completions
// ============================================================================

async function getCompletions(
  code: string,
  line: number,
  character: number,
  context?: string
): Promise<CallToolResult> {
  const completions: CompletionItem[] = [];

  // Try AST-based completions first
  if (astToolkit && parser) {
    try {
      const ast = parser.parse(code);
      if (ast && astToolkit.astToLSPCompletions) {
        const astCompletions = astToolkit.astToLSPCompletions(ast, { line, character });
        completions.push(...astCompletions);
      }
    } catch {
      // Fall through to default completions
    }
  }

  // Add context-aware completions
  if (completions.length === 0 || context) {
    completions.push(...getContextualCompletions(code, line, character, context));
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ completions, count: completions.length }, null, 2),
      },
    ],
  };
}

function getContextualCompletions(
  code: string,
  line: number,
  character: number,
  context?: string
): CompletionItem[] {
  const completions: CompletionItem[] = [];
  const lines = code.split('\n');
  const currentLine = lines[line] || '';
  const beforeCursor = currentLine.slice(0, character);

  // Determine context from code if not provided
  const inferredContext = context || inferContext(beforeCursor);

  switch (inferredContext) {
    case 'event':
      completions.push(
        { label: 'click', kind: 23, detail: 'Mouse click event' },
        { label: 'dblclick', kind: 23, detail: 'Double click event' },
        { label: 'mouseenter', kind: 23, detail: 'Mouse enter event' },
        { label: 'mouseleave', kind: 23, detail: 'Mouse leave event' },
        { label: 'keydown', kind: 23, detail: 'Key down event' },
        { label: 'keyup', kind: 23, detail: 'Key up event' },
        { label: 'input', kind: 23, detail: 'Input change event' },
        { label: 'change', kind: 23, detail: 'Value change event' },
        { label: 'submit', kind: 23, detail: 'Form submit event' },
        { label: 'load', kind: 23, detail: 'Element load event' },
        { label: 'focus', kind: 23, detail: 'Focus event' },
        { label: 'blur', kind: 23, detail: 'Blur event' }
      );
      break;

    case 'command':
      completions.push(
        { label: 'toggle', kind: 2, detail: 'Toggle class/visibility', insertText: 'toggle .${1:class}' },
        { label: 'add', kind: 2, detail: 'Add class/attribute', insertText: 'add .${1:class} to ${2:me}' },
        { label: 'remove', kind: 2, detail: 'Remove class/element', insertText: 'remove .${1:class} from ${2:me}' },
        { label: 'show', kind: 2, detail: 'Show element', insertText: 'show ${1:me}' },
        { label: 'hide', kind: 2, detail: 'Hide element', insertText: 'hide ${1:me}' },
        { label: 'put', kind: 2, detail: 'Set content', insertText: 'put ${1:value} into ${2:target}' },
        { label: 'set', kind: 2, detail: 'Set variable', insertText: 'set ${1:variable} to ${2:value}' },
        { label: 'fetch', kind: 2, detail: 'HTTP request', insertText: 'fetch ${1:/api/endpoint}' },
        { label: 'wait', kind: 2, detail: 'Pause execution', insertText: 'wait ${1:1s}' },
        { label: 'send', kind: 2, detail: 'Dispatch event', insertText: 'send ${1:eventName} to ${2:target}' },
        { label: 'trigger', kind: 2, detail: 'Trigger event', insertText: 'trigger ${1:eventName} on ${2:target}' },
        { label: 'call', kind: 2, detail: 'Call function', insertText: 'call ${1:functionName}()' },
        { label: 'log', kind: 2, detail: 'Console log', insertText: 'log ${1:value}' },
        { label: 'if', kind: 14, detail: 'Conditional', insertText: 'if ${1:condition} ${2:command} end' },
        { label: 'repeat', kind: 14, detail: 'Loop', insertText: 'repeat ${1:3} times ${2:command} end' }
      );
      break;

    case 'expression':
      completions.push(
        { label: 'me', kind: 6, detail: 'Current element' },
        { label: 'you', kind: 6, detail: 'Event target' },
        { label: 'it', kind: 6, detail: 'Last result' },
        { label: 'result', kind: 6, detail: 'Last result (alias)' },
        { label: 'first', kind: 14, detail: 'First in collection' },
        { label: 'last', kind: 14, detail: 'Last in collection' },
        { label: 'next', kind: 14, detail: 'Next sibling' },
        { label: 'previous', kind: 14, detail: 'Previous sibling' },
        { label: 'closest', kind: 14, detail: 'Closest ancestor' },
        { label: 'parent', kind: 14, detail: 'Parent element' }
      );
      break;

    case 'selector':
      completions.push(
        { label: '#', kind: 18, detail: 'ID selector', insertText: '#${1:id}' },
        { label: '.', kind: 18, detail: 'Class selector', insertText: '.${1:class}' },
        { label: '<', kind: 18, detail: 'Tag selector', insertText: '<${1:tag}/>' }
      );
      break;

    default:
      // Top-level completions
      completions.push(
        { label: 'on', kind: 14, detail: 'Event handler', insertText: 'on ${1:click} ${2:command}' },
        { label: 'init', kind: 14, detail: 'Initialization', insertText: 'init ${1:command}' },
        { label: 'behavior', kind: 7, detail: 'Define behavior', insertText: 'behavior ${1:Name}\n  ${2:// body}\nend' },
        { label: 'def', kind: 3, detail: 'Define function', insertText: 'def ${1:name}(${2:params})\n  ${3:// body}\nend' }
      );
  }

  return completions;
}

function inferContext(beforeCursor: string): string {
  const trimmed = beforeCursor.trim();

  if (/\bon\s*$/.test(trimmed)) return 'event';
  if (/\bthen\s*$/.test(trimmed)) return 'command';
  if (/^(on\s+\w+\s*)$/.test(trimmed)) return 'command';
  if (/(to|from|into|on)\s*$/.test(trimmed)) return 'selector';
  if (/\bif\s*$/.test(trimmed)) return 'expression';
  if (/\bset\s+:\w+\s+to\s*$/.test(trimmed)) return 'expression';

  return 'default';
}

// ============================================================================
// Hover Information
// ============================================================================

async function getHoverInfo(
  code: string,
  line: number,
  character: number
): Promise<CallToolResult> {
  // Try AST-based hover first
  if (astToolkit && parser) {
    try {
      const ast = parser.parse(code);
      if (ast && astToolkit.astToLSPHover) {
        const hover = astToolkit.astToLSPHover(ast, { line, character });
        if (hover) {
          return {
            content: [{ type: 'text', text: JSON.stringify(hover, null, 2) }],
          };
        }
      }
    } catch {
      // Fall through to token-based hover
    }
  }

  // Fallback: token-based hover
  const hover = getTokenBasedHover(code, line, character);
  return {
    content: [{ type: 'text', text: JSON.stringify(hover, null, 2) }],
  };
}

function getTokenBasedHover(
  code: string,
  line: number,
  character: number
): { contents: string; range?: Range } | null {
  const lines = code.split('\n');
  const currentLine = lines[line];
  if (!currentLine) return null;

  // Find the word at the cursor position
  const word = getWordAtPosition(currentLine, character);
  if (!word) return null;

  // Get documentation for the word
  const doc = getHoverDocumentation(word.text);
  if (!doc) return null;

  return {
    contents: doc,
    range: {
      start: { line, character: word.start },
      end: { line, character: word.end },
    },
  };
}

function getWordAtPosition(
  line: string,
  character: number
): { text: string; start: number; end: number } | null {
  // Find word boundaries
  let start = character;
  let end = character;

  // Go back to find start
  while (start > 0 && /[\w.-]/.test(line[start - 1])) {
    start--;
  }

  // Go forward to find end
  while (end < line.length && /[\w.-]/.test(line[end])) {
    end++;
  }

  if (start === end) return null;

  return {
    text: line.slice(start, end),
    start,
    end,
  };
}

function getHoverDocumentation(word: string): string | null {
  const docs: Record<string, string> = {
    // Commands
    toggle: '**toggle**\n\nToggle a class, attribute, or visibility on elements.\n\n```hyperscript\ntoggle .active on me\ntoggle @disabled on #input\n```',
    add: '**add**\n\nAdd a class, attribute, or style to elements.\n\n```hyperscript\nadd .highlight to me\nadd @required to #email\n```',
    remove: '**remove**\n\nRemove a class, attribute, style, or element.\n\n```hyperscript\nremove .error from #form\nremove me\n```',
    show: '**show**\n\nShow hidden elements with optional transition.\n\n```hyperscript\nshow #modal\nshow #panel with *opacity over 300ms\n```',
    hide: '**hide**\n\nHide elements with optional transition.\n\n```hyperscript\nhide #modal\nhide me with *opacity\n```',
    put: '**put**\n\nSet content or value of elements.\n\n```hyperscript\nput "Hello" into #greeting\nput it into #result\n```',
    set: '**set**\n\nSet a variable or element property.\n\n```hyperscript\nset :count to 0\nset $user to "guest"\n```',
    fetch: '**fetch**\n\nMake HTTP requests.\n\n```hyperscript\nfetch /api/data\nfetch /api/data as json\n```',
    wait: '**wait**\n\nPause execution.\n\n```hyperscript\nwait 1s\nwait 500ms\nwait for animationend\n```',

    // References
    me: '**me**\n\nThe current element with the `_` attribute.\n\n```hyperscript\nadd .active to me\n```',
    you: '**you**\n\nThe target of the current event (event.target).\n\n```hyperscript\non click from li add .selected to you\n```',
    it: '**it**\n\nThe result of the last expression or command.\n\n```hyperscript\nfetch /api then put it into #output\n```',
    result: '**result**\n\nAlias for `it` - the result of the last expression.\n\n```hyperscript\nfetch /api then put result into #output\n```',

    // Positional
    first: '**first**\n\nFirst element in a collection.\n\n```hyperscript\nremove first .item\n```',
    last: '**last**\n\nLast element in a collection.\n\n```hyperscript\nadd .active to last <li/>\n```',
    next: '**next**\n\nNext sibling element.\n\n```hyperscript\nfocus next <input/>\n```',
    previous: '**previous**\n\nPrevious sibling element.\n\n```hyperscript\nshow previous .panel\n```',
    closest: '**closest**\n\nNearest ancestor matching selector.\n\n```hyperscript\nadd .active to closest .card\n```',
    parent: '**parent**\n\nDirect parent element.\n\n```hyperscript\nremove parent\n```',

    // Control flow
    if: '**if**\n\nConditional execution.\n\n```hyperscript\nif me matches .active remove .active else add .active\n```',
    repeat: '**repeat**\n\nLoop a fixed number of times.\n\n```hyperscript\nrepeat 5 times append "<li/>" to #list\n```',
    for: '**for**\n\nIterate over collections.\n\n```hyperscript\nfor each item in .items add .highlight to item\n```',

    // Keywords
    on: '**on**\n\nEvent handler declaration.\n\n```hyperscript\non click toggle .active\non keydown[key=="Enter"] submit closest <form/>\n```',
    then: '**then**\n\nChain commands together.\n\n```hyperscript\nadd .loading then fetch /api then remove .loading\n```',
  };

  return docs[word.toLowerCase()] || null;
}

// ============================================================================
// Document Symbols
// ============================================================================

async function getDocumentSymbols(code: string): Promise<CallToolResult> {
  const symbols: DocumentSymbol[] = [];

  // Try AST-based symbols first
  if (astToolkit && parser) {
    try {
      const ast = parser.parse(code);
      if (ast && astToolkit.astToLSPSymbols) {
        const astSymbols = astToolkit.astToLSPSymbols(ast);
        symbols.push(...astSymbols);
      }
    } catch {
      // Fall through to pattern-based extraction
    }
  }

  // Fallback: pattern-based extraction
  if (symbols.length === 0) {
    symbols.push(...extractSymbolsFromCode(code));
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

function extractSymbolsFromCode(code: string): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Event handlers: on click, on keydown, etc.
    const eventMatch = line.match(/\bon\s+(\w+(?:\[.*?\])?)/);
    if (eventMatch) {
      symbols.push({
        name: `on ${eventMatch[1]}`,
        detail: 'Event Handler',
        kind: 24, // Event
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length },
        },
        selectionRange: {
          start: { line: i, character: line.indexOf('on') },
          end: { line: i, character: line.indexOf('on') + 2 + eventMatch[1].length },
        },
      });
    }

    // Behaviors: behavior Name
    const behaviorMatch = line.match(/\bbehavior\s+(\w+)/);
    if (behaviorMatch) {
      symbols.push({
        name: `behavior ${behaviorMatch[1]}`,
        detail: 'Behavior Definition',
        kind: 5, // Class
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length },
        },
        selectionRange: {
          start: { line: i, character: line.indexOf('behavior') },
          end: { line: i, character: line.indexOf('behavior') + 8 + behaviorMatch[1].length },
        },
      });
    }

    // Functions: def name()
    const defMatch = line.match(/\bdef\s+(\w+)/);
    if (defMatch) {
      symbols.push({
        name: `def ${defMatch[1]}`,
        detail: 'Function Definition',
        kind: 12, // Function
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length },
        },
        selectionRange: {
          start: { line: i, character: line.indexOf('def') },
          end: { line: i, character: line.indexOf('def') + 3 + defMatch[1].length },
        },
      });
    }

    // Init blocks
    if (/\binit\b/.test(line)) {
      symbols.push({
        name: 'init',
        detail: 'Initialization',
        kind: 9, // Constructor
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length },
        },
        selectionRange: {
          start: { line: i, character: line.indexOf('init') },
          end: { line: i, character: line.indexOf('init') + 4 },
        },
      });
    }
  }

  return symbols;
}

// ============================================================================
// LSP Types
// ============================================================================

interface Position {
  line: number;
  character: number;
}

interface Range {
  start: Position;
  end: Position;
}

interface Diagnostic {
  range: Range;
  severity: number;
  code?: string;
  source?: string;
  message: string;
}

interface CompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: string;
  insertText?: string;
  sortText?: string;
}

interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: number;
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}
