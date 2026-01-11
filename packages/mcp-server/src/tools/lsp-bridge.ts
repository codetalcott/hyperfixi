/**
 * LSP Bridge Tools for MCP Server
 * Exposes diagnostics, completions, and hover via MCP protocol
 *
 * Supports 21 languages via @hyperfixi/semantic for multilingual assistance.
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// Try to import from ast-toolkit
let astToolkit: any = null;
try {
  astToolkit = await import('@hyperfixi/ast-toolkit');
} catch {
  // ast-toolkit not available
}

// Try to import parse function from core
let parseFunction: any = null;
try {
  const core = await import('@hyperfixi/core');
  parseFunction = core.parse;
} catch {
  // core not available
}

// Try to import semantic package for multilingual support
let semanticPackage: any = null;
try {
  semanticPackage = await import('@hyperfixi/semantic');
} catch {
  // semantic not available - will use English-only fallback
}

// Import error fixes registry
import { getFixesForDiagnostic } from './error-fixes.js';
import type { CodeFix } from '@hyperfixi/core';

// =============================================================================
// Cached Semantic Analyzer (Phase 6 - Performance)
// =============================================================================

// Module-level cached analyzer instance - reuses built-in LRU cache
let cachedAnalyzer: ReturnType<typeof semanticPackage.createSemanticAnalyzer> | null = null;

/**
 * Get or create cached semantic analyzer.
 * The analyzer has built-in LRU caching (1000 entries) for repeated parses.
 */
function getSemanticAnalyzer(): ReturnType<typeof semanticPackage.createSemanticAnalyzer> | null {
  if (!semanticPackage) return null;
  if (!cachedAnalyzer) {
    cachedAnalyzer = semanticPackage.createSemanticAnalyzer();
  }
  return cachedAnalyzer;
}

// ============================================================================
// LSP Bridge Tool Definitions
// ============================================================================

export const lspBridgeTools = [
  {
    name: 'get_diagnostics',
    description: 'Analyze hyperscript code and return LSP-compatible diagnostics (errors, warnings, hints). Supports 21 languages.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string',
          description: 'The hyperscript code to analyze',
        },
        language: {
          type: 'string',
          description: 'Language code (en, ko, ja, es, zh, ar, tr, pt, fr, de, id, qu, sw, etc.). Default: en',
          default: 'en',
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
    description: 'Get context-aware code completions for hyperscript at a given position. Returns keywords in specified language.',
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
        language: {
          type: 'string',
          description: 'Language code (en, ko, ja, es, zh, ar, tr, pt, fr, de, id, qu, sw, etc.). Default: en',
          default: 'en',
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
    description: 'Get hover documentation for a hyperscript element at a given position. Supports multilingual keywords.',
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
        language: {
          type: 'string',
          description: 'Language code (en, ko, ja, es, zh, ar, tr, pt, fr, de, id, qu, sw, etc.). Default: en',
          default: 'en',
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
        language: {
          type: 'string',
          description: 'Language code for recognizing keywords. Default: en',
          default: 'en',
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
  const language = (args.language as string) || 'en';

  switch (name) {
    case 'get_diagnostics':
      return getDiagnostics(args.code as string, language, args.uri as string | undefined);
    case 'get_completions':
      return getCompletions(
        args.code as string,
        args.line as number,
        args.character as number,
        language,
        args.context as string | undefined
      );
    case 'get_hover_info':
      return getHoverInfo(args.code as string, args.line as number, args.character as number, language);
    case 'get_document_symbols':
      return getDocumentSymbols(args.code as string, language);
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
  language: string,
  _uri?: string
): Promise<CallToolResult> {
  const diagnostics: Diagnostic[] = [];
  let semanticConfidence = 0;

  // Phase 5: Try semantic analysis first (works for all supported languages)
  // Phase 6: Use cached analyzer for performance
  const analyzer = getSemanticAnalyzer();
  if (analyzer) {
    try {
      const result = analyzer.analyze(code, language);
      semanticConfidence = result.confidence;

      // Add semantic-level errors
      if (result.errors && result.errors.length > 0) {
        for (const err of result.errors) {
          diagnostics.push({
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: code.split('\n')[0]?.length || code.length },
            },
            severity: 1, // Error
            code: 'semantic-error',
            source: 'hyperfixi-semantic',
            message: err,
          });
        }
      }

      // Low confidence warning
      if (result.confidence > 0 && result.confidence < 0.3) {
        diagnostics.push({
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: code.length },
          },
          severity: 2, // Warning
          code: 'low-confidence',
          source: 'hyperfixi-semantic',
          message: `Code could not be fully parsed (${(result.confidence * 100).toFixed(0)}% confidence)`,
        });
      }

      // Validate semantic roles (e.g., toggle without patient)
      if (result.confidence >= 0.5 && result.command) {
        const cmd = result.command.name;
        const roles = result.command.roles;

        if (cmd === 'toggle' && !roles.has('patient')) {
          diagnostics.push({
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: code.length } },
            severity: 2,
            code: 'missing-role',
            source: 'hyperfixi-semantic',
            message: 'toggle command missing target (add .class, @attr, or selector)',
          });
        }

        if (cmd === 'put' && !roles.has('destination')) {
          diagnostics.push({
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: code.length } },
            severity: 2,
            code: 'missing-role',
            source: 'hyperfixi-semantic',
            message: 'put command missing destination (add "into #element")',
          });
        }
      }
    } catch {
      // Semantic parsing failed - continue with other methods
    }
  }

  // Try AST-based analysis if semantic didn't find issues
  if (diagnostics.length === 0 && astToolkit && parseFunction) {
    try {
      const ast = parseFunction(code);
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

  // Fallback: simple pattern-based analysis with multilingual support
  if (diagnostics.length === 0) {
    diagnostics.push(...runSimpleDiagnostics(code, language));
  }

  // Build code actions for each diagnostic that has fixes
  const codeActions: Array<{ diagnosticIndex: number; fixes: CodeFix[] }> = [];
  for (let i = 0; i < diagnostics.length; i++) {
    const diagnostic = diagnostics[i];
    if (diagnostic.code) {
      const fixes = getFixesForDiagnostic(diagnostic.code);
      if (fixes.length > 0) {
        codeActions.push({ diagnosticIndex: i, fixes });
      }
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            diagnostics,
            count: diagnostics.length,
            language,
            hasErrors: diagnostics.some((d) => d.severity === 1),
            hasWarnings: diagnostics.some((d) => d.severity === 2),
            semanticConfidence: semanticConfidence > 0 ? semanticConfidence : undefined,
            // Phase 6: Include code actions for IDE/LLM automation
            codeActions: codeActions.length > 0 ? codeActions : undefined,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Get valid command keywords for a language.
 * Uses semantic package if available, otherwise falls back to English.
 */
function getValidCommandsForLanguage(language: string): string[] {
  const englishCommands = [
    'toggle', 'add', 'remove', 'show', 'hide',
    'set', 'get', 'put', 'append', 'prepend',
    'increment', 'decrement', 'log', 'send', 'trigger',
    'wait', 'fetch', 'call', 'go', 'focus', 'blur',
    'on', 'if', 'then', 'else', 'end', 'repeat', 'for',
  ];

  if (!semanticPackage || language === 'en') {
    return englishCommands;
  }

  try {
    const profile = semanticPackage.getProfile(language);
    if (profile && profile.keywords) {
      const commands: string[] = [...englishCommands]; // Always include English for compatibility
      for (const [engCommand, translation] of Object.entries(profile.keywords)) {
        const trans = translation as { primary?: string; alternatives?: string[] };
        if (trans.primary) {
          commands.push(trans.primary.toLowerCase());
        }
        if (trans.alternatives) {
          commands.push(...trans.alternatives.map((a: string) => a.toLowerCase()));
        }
      }
      return [...new Set(commands)];
    }
  } catch {
    // Profile not available for this language
  }

  return englishCommands;
}

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Find the closest matching command for a potentially misspelled word.
 */
function findClosestCommand(
  word: string,
  commands: string[]
): { command: string; distance: number } | null {
  let closest: { command: string; distance: number } | null = null;
  for (const cmd of commands) {
    const dist = levenshteinDistance(word, cmd);
    if (dist <= 2 && (!closest || dist < closest.distance)) {
      closest = { command: cmd, distance: dist };
    }
  }
  return closest;
}

function runSimpleDiagnostics(code: string, language: string = 'en'): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lines = code.split('\n');
  const validCommands = getValidCommandsForLanguage(language);

  // Build command pattern for 'missing then' check
  const commandPattern = validCommands.slice(0, 10).join('|'); // Use first 10 common commands
  const missingThenRegex = new RegExp(`\\b(${commandPattern})\\s+\\.\\w+\\s+(${commandPattern})\\b`, 'i');

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

    // Missing 'then' between commands (common mistake) - now multilingual
    if (missingThenRegex.test(line)) {
      diagnostics.push({
        range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
        severity: 2,
        code: 'missing-then',
        source: 'hyperfixi-mcp',
        message: 'Commands should be separated by "then"',
      });
    }

    // Check for potential command typos
    const words = line.split(/\s+/);
    for (const word of words) {
      const lower = word.toLowerCase();
      // Skip if it's a valid command, selector, string, number, or short word
      if (
        validCommands.includes(lower) ||
        /^[.#@<"'`0-9]/.test(word) ||
        word.length < 3 ||
        /^(on|to|from|into|as|with|for|if|then|else|end|in|the|a|an|my|its|me|you|it)$/i.test(word)
      ) {
        continue;
      }
      // Check if it's close to a valid command (edit distance <= 2)
      const closestCommand = findClosestCommand(lower, validCommands);
      if (closestCommand && closestCommand.distance > 0) {
        const idx = line.indexOf(word);
        diagnostics.push({
          range: {
            start: { line: i, character: idx },
            end: { line: i, character: idx + word.length },
          },
          severity: 2,
          code: 'possible-typo',
          source: 'hyperfixi-mcp',
          message: `Unknown command "${word}". Did you mean "${closestCommand.command}"?`,
        });
      }
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
  language: string,
  context?: string
): Promise<CallToolResult> {
  const completions: CompletionItem[] = [];

  // Try AST-based completions first
  if (astToolkit && parseFunction) {
    try {
      const ast = parseFunction(code);
      if (ast && astToolkit.astToLSPCompletions) {
        const astCompletions = astToolkit.astToLSPCompletions(ast, { line, character });
        completions.push(...astCompletions);
      }
    } catch {
      // Fall through to default completions
    }
  }

  // Add context-aware completions with multilingual support
  if (completions.length === 0 || context) {
    completions.push(...getContextualCompletions(code, line, character, language, context));
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ completions, count: completions.length, language }, null, 2),
      },
    ],
  };
}

/**
 * Get keyword translation for a command in a specific language.
 */
function getKeywordTranslation(command: string, language: string): { label: string; englishLabel?: string } {
  if (!semanticPackage || language === 'en') {
    return { label: command };
  }

  try {
    const profile = semanticPackage.getProfile(language);
    if (profile && profile.keywords && profile.keywords[command]) {
      const trans = profile.keywords[command] as { primary?: string };
      if (trans.primary) {
        return { label: trans.primary, englishLabel: command };
      }
    }
  } catch {
    // Profile not available
  }

  return { label: command };
}

/**
 * Get reference translation (me, it, you) for a specific language.
 */
function getReferenceTranslation(ref: string, language: string): { label: string; englishLabel?: string } {
  if (!semanticPackage || language === 'en') {
    return { label: ref };
  }

  try {
    const profile = semanticPackage.getProfile(language);
    if (profile && profile.references && profile.references[ref]) {
      return { label: profile.references[ref], englishLabel: ref };
    }
  } catch {
    // Profile not available
  }

  return { label: ref };
}

function getContextualCompletions(
  code: string,
  line: number,
  character: number,
  language: string,
  context?: string
): CompletionItem[] {
  const completions: CompletionItem[] = [];
  const lines = code.split('\n');
  const currentLine = lines[line] || '';
  const beforeCursor = currentLine.slice(0, character);

  // Determine context from code if not provided
  const inferredContext = context || inferContext(beforeCursor);

  // Helper to create completion with multilingual support
  const cmd = (eng: string, detail: string, insertText?: string) => {
    const trans = getKeywordTranslation(eng, language);
    return {
      label: trans.label,
      kind: 2,
      detail: trans.englishLabel ? `${detail} (${trans.englishLabel})` : detail,
      insertText: insertText?.replace(eng, trans.label),
    };
  };

  const ref = (eng: string, detail: string) => {
    const trans = getReferenceTranslation(eng, language);
    return {
      label: trans.label,
      kind: 6,
      detail: trans.englishLabel ? `${detail} (${trans.englishLabel})` : detail,
    };
  };

  switch (inferredContext) {
    case 'event':
      // Event names are generally not translated in hyperscript
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
        cmd('toggle', 'Toggle class/visibility', 'toggle .${1:class}'),
        cmd('add', 'Add class/attribute', 'add .${1:class} to ${2:me}'),
        cmd('remove', 'Remove class/element', 'remove .${1:class} from ${2:me}'),
        cmd('show', 'Show element', 'show ${1:me}'),
        cmd('hide', 'Hide element', 'hide ${1:me}'),
        cmd('put', 'Set content', 'put ${1:value} into ${2:target}'),
        cmd('set', 'Set variable', 'set ${1:variable} to ${2:value}'),
        cmd('fetch', 'HTTP request', 'fetch ${1:/api/endpoint}'),
        cmd('wait', 'Pause execution', 'wait ${1:1s}'),
        cmd('send', 'Dispatch event', 'send ${1:eventName} to ${2:target}'),
        cmd('trigger', 'Trigger event', 'trigger ${1:eventName} on ${2:target}'),
        cmd('call', 'Call function', 'call ${1:functionName}()'),
        cmd('log', 'Console log', 'log ${1:value}'),
        { label: getKeywordTranslation('if', language).label, kind: 14, detail: 'Conditional' },
        { label: getKeywordTranslation('repeat', language).label, kind: 14, detail: 'Loop' }
      );
      break;

    case 'expression':
      completions.push(
        ref('me', 'Current element'),
        ref('you', 'Event target'),
        ref('it', 'Last result'),
        ref('result', 'Last result (alias)'),
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
      // Top-level completions with multilingual support
      completions.push(
        { label: getKeywordTranslation('on', language).label, kind: 14, detail: 'Event handler' },
        { label: getKeywordTranslation('init', language).label, kind: 14, detail: 'Initialization' },
        { label: getKeywordTranslation('behavior', language).label, kind: 7, detail: 'Define behavior' },
        { label: getKeywordTranslation('def', language).label, kind: 3, detail: 'Define function' }
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
  character: number,
  language: string
): Promise<CallToolResult> {
  // Try AST-based hover first
  if (astToolkit && parseFunction) {
    try {
      const ast = parseFunction(code);
      if (ast && astToolkit.astToLSPHover) {
        const hover = astToolkit.astToLSPHover(ast, { line, character });
        if (hover) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ ...hover, language }, null, 2) }],
          };
        }
      }
    } catch {
      // Fall through to token-based hover
    }
  }

  // Fallback: token-based hover with multilingual support
  const hover = getTokenBasedHover(code, line, character, language);
  return {
    content: [{ type: 'text', text: JSON.stringify(hover ? { ...hover, language } : { language }, null, 2) }],
  };
}

function getTokenBasedHover(
  code: string,
  line: number,
  character: number,
  language: string
): { contents: string; range?: Range } | null {
  const lines = code.split('\n');
  const currentLine = lines[line];
  if (!currentLine) return null;

  // Find the word at the cursor position
  const word = getWordAtPosition(currentLine, character);
  if (!word) return null;

  // Get documentation for the word (with multilingual keyword lookup)
  const doc = getHoverDocumentation(word.text, language);
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

/**
 * Normalize a word to English for documentation lookup.
 * Checks if the word is a translated keyword and returns the English equivalent.
 */
function normalizeToEnglish(word: string, language: string): string {
  const wordLower = word.toLowerCase();

  // If English or no semantic package, return as-is
  if (!semanticPackage || language === 'en') {
    return wordLower;
  }

  try {
    const profile = semanticPackage.getProfile(language);
    if (profile && profile.keywords) {
      // Check if word matches any translated keyword
      for (const [engKey, translation] of Object.entries(profile.keywords)) {
        const trans = translation as { primary?: string; alternatives?: string[] };
        if (trans.primary?.toLowerCase() === wordLower) {
          return engKey;
        }
        if (trans.alternatives?.some((a: string) => a.toLowerCase() === wordLower)) {
          return engKey;
        }
      }
    }
    // Check references (me, it, you)
    if (profile && profile.references) {
      for (const [engRef, translatedRef] of Object.entries(profile.references)) {
        if ((translatedRef as string).toLowerCase() === wordLower) {
          return engRef;
        }
      }
    }
  } catch {
    // Profile not available
  }

  return wordLower;
}

function getHoverDocumentation(word: string, language: string = 'en'): string | null {
  // Normalize the word to English for documentation lookup
  const normalizedWord = normalizeToEnglish(word, language);

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

  return docs[normalizedWord] || null;
}

// ============================================================================
// Document Symbols
// ============================================================================

async function getDocumentSymbols(code: string, language: string): Promise<CallToolResult> {
  const symbols: DocumentSymbol[] = [];

  // Try AST-based symbols first
  if (astToolkit && parseFunction) {
    try {
      const ast = parseFunction(code);
      if (ast && astToolkit.astToLSPSymbols) {
        const astSymbols = astToolkit.astToLSPSymbols(ast);
        symbols.push(...astSymbols);
      }
    } catch {
      // Fall through to pattern-based extraction
    }
  }

  // Fallback: pattern-based extraction with multilingual support
  if (symbols.length === 0) {
    symbols.push(...extractSymbolsFromCode(code, language));
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ symbols, count: symbols.length, language }, null, 2),
      },
    ],
  };
}

/**
 * Get all keyword variants for a given English keyword in a specific language.
 */
function getKeywordVariants(engKeyword: string, language: string): string[] {
  const variants = [engKeyword]; // Always include English

  if (!semanticPackage || language === 'en') {
    return variants;
  }

  try {
    const profile = semanticPackage.getProfile(language);
    if (profile && profile.keywords && profile.keywords[engKeyword]) {
      const trans = profile.keywords[engKeyword] as { primary?: string; alternatives?: string[] };
      if (trans.primary) {
        variants.push(trans.primary);
      }
      if (trans.alternatives) {
        variants.push(...trans.alternatives);
      }
    }
  } catch {
    // Profile not available
  }

  return variants;
}

function extractSymbolsFromCode(code: string, language: string = 'en'): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];
  const lines = code.split('\n');

  // Get multilingual keyword variants
  const onVariants = getKeywordVariants('on', language);
  const behaviorVariants = getKeywordVariants('behavior', language);
  const defVariants = getKeywordVariants('def', language);
  const initVariants = getKeywordVariants('init', language);

  // Build regex patterns with global flag for multiple matches per line
  const onPattern = new RegExp(`\\b(${onVariants.join('|')})\\s+(\\w+(?:\\[.*?\\])?)`, 'gi');
  const behaviorPattern = new RegExp(`\\b(${behaviorVariants.join('|')})\\s+(\\w+)`, 'gi');
  const defPattern = new RegExp(`\\b(${defVariants.join('|')})\\s+(\\w+)`, 'gi');
  const initPattern = new RegExp(`\\b(${initVariants.join('|')})\\b`, 'gi');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Event handlers: on click, on keydown, etc. (multilingual) - find ALL on same line
    for (const eventMatch of line.matchAll(onPattern)) {
      const keyword = eventMatch[1];
      const eventName = eventMatch[2];
      const matchIndex = eventMatch.index ?? 0;
      symbols.push({
        name: `${keyword} ${eventName}`,
        detail: 'Event Handler',
        kind: 24, // Event
        range: {
          start: { line: i, character: matchIndex },
          end: { line: i, character: matchIndex + eventMatch[0].length },
        },
        selectionRange: {
          start: { line: i, character: matchIndex },
          end: { line: i, character: matchIndex + eventMatch[0].length },
        },
      });
    }

    // Behaviors: behavior Name (multilingual) - find ALL on same line
    for (const behaviorMatch of line.matchAll(behaviorPattern)) {
      const keyword = behaviorMatch[1];
      const name = behaviorMatch[2];
      const matchIndex = behaviorMatch.index ?? 0;
      symbols.push({
        name: `${keyword} ${name}`,
        detail: 'Behavior Definition',
        kind: 5, // Class
        range: {
          start: { line: i, character: matchIndex },
          end: { line: i, character: matchIndex + behaviorMatch[0].length },
        },
        selectionRange: {
          start: { line: i, character: matchIndex },
          end: { line: i, character: matchIndex + behaviorMatch[0].length },
        },
      });
    }

    // Functions: def name() (multilingual) - find ALL on same line
    for (const defMatch of line.matchAll(defPattern)) {
      const keyword = defMatch[1];
      const name = defMatch[2];
      const matchIndex = defMatch.index ?? 0;
      symbols.push({
        name: `${keyword} ${name}`,
        detail: 'Function Definition',
        kind: 12, // Function
        range: {
          start: { line: i, character: matchIndex },
          end: { line: i, character: matchIndex + defMatch[0].length },
        },
        selectionRange: {
          start: { line: i, character: matchIndex },
          end: { line: i, character: matchIndex + defMatch[0].length },
        },
      });
    }

    // Init blocks (multilingual) - find ALL on same line
    for (const initMatch of line.matchAll(initPattern)) {
      const keyword = initMatch[1];
      const matchIndex = initMatch.index ?? 0;
      symbols.push({
        name: keyword,
        detail: 'Initialization',
        kind: 9, // Constructor
        range: {
          start: { line: i, character: matchIndex },
          end: { line: i, character: matchIndex + keyword.length },
        },
        selectionRange: {
          start: { line: i, character: matchIndex },
          end: { line: i, character: matchIndex + keyword.length },
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
