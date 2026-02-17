#!/usr/bin/env node
/**
 * Hyperscript / LokaScript Language Server
 *
 * LSP implementation supporting both original _hyperscript and LokaScript.
 * LokaScript is a 100% compatible superset of _hyperscript with extensions.
 *
 * Modes:
 * - 'hyperscript': Enforce _hyperscript-compatible syntax (for portability)
 * - 'lokascript': Allow all LokaScript features including extensions
 * - 'auto': Detect based on available packages
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  CompletionItem,
  CompletionItemKind,
  Hover,
  MarkupKind,
  Diagnostic,
  DiagnosticSeverity,
  DocumentSymbol,
  SymbolKind,
  CodeAction,
  CodeActionKind,
  TextDocumentPositionParams,
  DocumentSymbolParams,
  CodeActionParams,
  DidChangeConfigurationNotification,
  Location,
  TextEdit,
  DocumentFormattingParams,
} from 'vscode-languageserver/node.js';

import { TextDocument } from 'vscode-languageserver-textdocument';

// Import modular components
import type { ServerSettings, ServerMode } from './types.js';
import { defaultSettings } from './types.js';
import {
  detectLokascriptFeatures,
  getCommandsForMode,
  HYPERSCRIPT_COMMANDS,
} from './command-tiers.js';
import {
  isHtmlDocument,
  extractHyperscriptRegions,
  offsetToPosition,
  findRegionAtPosition,
  findLineInRegion,
  findCharInLine,
} from './extraction.js';
import { getWordAtPosition, escapeRegExp, findNextNonEmptyLine } from './utils.js';
import { formatHyperscript } from './formatting.js';

// =============================================================================
// Optional Package Imports
// =============================================================================

// Semantic package is bundled into the server for multilingual LSP support.
// Static import ensures all 25 languages are registered at startup.
import * as semanticImport from '@lokascript/semantic';
const semanticPackage: any = semanticImport;

/**
 * Get all registered language codes except the current one from the semantic package.
 * Used for auto-detection, reverse keyword cache, and keyword variant lookups.
 */
function getOtherLanguages(): string[] {
  if (!semanticPackage?.getRegisteredLanguages) return [];
  return semanticPackage.getRegisteredLanguages().filter((l: string) => l !== 'en');
}

let interchangeLSP: any = null;
let fromCoreASTFn: any = null;
let parseFunction: any = null;
let lspMetadata: any = null;

// Try to import core package for parsing and interchange-based LSP
try {
  const core = await import('@hyperfixi/core');
  parseFunction = core.parse;
  fromCoreASTFn = core.fromCoreAST;
  // Interchange-aware LSP module (replaces deprecated @lokascript/ast-toolkit)
  interchangeLSP = await import('@hyperfixi/core/ast-utils');
} catch {
  console.error('[lokascript-ls] @hyperfixi/core not available');
}

// Try to import LSP metadata from core (canonical keyword/hover docs source)
try {
  lspMetadata = await import('@hyperfixi/core/lsp-metadata');
} catch {
  console.error(
    '[lokascript-ls] @hyperfixi/core/lsp-metadata not available - using fallback keywords'
  );
}

// =============================================================================
// Fallback Constants (used when @hyperfixi/core/lsp-metadata is unavailable)
// =============================================================================

const FALLBACK_KEYWORDS = [
  'toggle',
  'add',
  'remove',
  'show',
  'hide',
  'put',
  'set',
  'get',
  'fetch',
  'wait',
  'send',
  'trigger',
  'call',
  'return',
  'throw',
  'halt',
  'exit',
  'go',
  'log',
  'on',
  'me',
  'you',
  'it',
  'result',
  'if',
  'else',
  'then',
  'end',
  'repeat',
  'for',
  'while',
  'behavior',
  'def',
  'init',
  'first',
  'last',
  'next',
  'previous',
  'closest',
  'parent',
  'and',
  'or',
  'not',
  'is',
  'exists',
  'empty',
  'has',
] as const;

const FALLBACK_HOVER_DOCS: Record<string, { title: string; description: string; example: string }> =
  {
    toggle: {
      title: 'toggle',
      description: 'Toggles a class, attribute, or visibility state.',
      example: 'toggle .active on me',
    },
    add: {
      title: 'add',
      description: 'Adds a class or attribute to an element.',
      example: 'add .highlight to me',
    },
    remove: {
      title: 'remove',
      description: 'Removes a class, attribute, or element.',
      example: 'remove .highlight from me',
    },
    show: { title: 'show', description: 'Makes an element visible.', example: 'show #modal' },
    hide: { title: 'hide', description: 'Hides an element.', example: 'hide #modal' },
    put: {
      title: 'put',
      description: 'Sets the content of an element.',
      example: 'put "Hello" into #message',
    },
    set: { title: 'set', description: 'Sets a variable or property.', example: 'set :count to 0' },
    get: {
      title: 'get',
      description: 'Gets a value from an element or variable.',
      example: 'get the value of #input',
    },
    fetch: {
      title: 'fetch',
      description: 'Makes an HTTP request.',
      example: 'fetch /api/data as json',
    },
    wait: { title: 'wait', description: 'Pauses execution for a duration.', example: 'wait 1s' },
    send: {
      title: 'send',
      description: 'Dispatches a custom event.',
      example: 'send myEvent to #target',
    },
    trigger: {
      title: 'trigger',
      description: 'Triggers an event on an element.',
      example: 'trigger click on #btn',
    },
    call: {
      title: 'call',
      description: 'Calls a function or method.',
      example: 'call myFunction()',
    },
    log: { title: 'log', description: 'Logs a value to the console.', example: 'log "Hello"' },
    go: { title: 'go', description: 'Navigates to a URL.', example: 'go to url /home' },
    on: {
      title: 'on',
      description: 'Defines an event handler.',
      example: 'on click toggle .active',
    },
    if: {
      title: 'if',
      description: 'Conditional execution.',
      example: 'if .active toggle .active',
    },
    repeat: {
      title: 'repeat',
      description: 'Loops a specified number of times.',
      example: 'repeat 5 times log "hello"',
    },
    behavior: {
      title: 'behavior',
      description: 'Defines a reusable behavior.',
      example: 'behavior Clickable\\n  on click toggle .active\\nend',
    },
    me: {
      title: 'me',
      description: 'References the current element.',
      example: 'toggle .active on me',
    },
    you: {
      title: 'you',
      description: 'References the element that triggered the event.',
      example: 'add .clicked to you',
    },
    it: {
      title: 'it',
      description: 'References the result of the last expression.',
      example: 'fetch /api/data then put it into #result',
    },
    result: {
      title: 'result',
      description: 'Alias for it - the result of the last expression.',
      example: 'call myFunction() then log result',
    },
  };

const FALLBACK_EVENT_NAMES = [
  'click',
  'dblclick',
  'mouseenter',
  'mouseleave',
  'keydown',
  'keyup',
  'input',
  'change',
  'submit',
  'load',
  'focus',
  'blur',
] as const;

// =============================================================================
// Mode Resolution
// =============================================================================

/**
 * Resolved mode after applying 'auto' detection.
 */
type ResolvedMode = 'hyperscript' | 'hyperscript-i18n' | 'lokascript';

/**
 * Resolve the server mode, handling 'auto' detection.
 *
 * In 'auto' mode:
 * - If @lokascript/semantic is available, use 'lokascript' mode
 * - Otherwise, use 'hyperscript' mode
 */
function resolveMode(settings: ServerSettings): ResolvedMode {
  if (settings.mode === 'hyperscript') return 'hyperscript';
  if (settings.mode === 'hyperscript-i18n') return 'hyperscript-i18n';
  if (settings.mode === 'lokascript') return 'lokascript';

  // 'auto' mode: detect based on available packages
  return semanticPackage ? 'lokascript' : 'hyperscript';
}

/**
 * Get the branding name for messages based on mode.
 */
function getBranding(mode: ResolvedMode): string {
  // hyperscript-i18n uses 'hyperscript' branding since it targets original _hyperscript
  return mode === 'lokascript' ? 'lokascript' : 'hyperscript';
}

/**
 * Check if multilingual features are enabled for the current mode.
 */
function isMultilingualEnabled(mode: ResolvedMode): boolean {
  return mode === 'lokascript' || mode === 'hyperscript-i18n';
}

/**
 * Check if the mode restricts to hyperscript-compatible commands only.
 */
function isHyperscriptCompatMode(mode: ResolvedMode): boolean {
  return mode === 'hyperscript' || mode === 'hyperscript-i18n';
}

// Resolved mode (cached, updated on config change)
let resolvedMode: ResolvedMode = 'hyperscript';

/**
 * Default mode override via environment variable.
 *
 * Set HYPERSCRIPT_LS_DEFAULT_MODE to override the default mode when
 * the user hasn't configured a mode explicitly. This is used by
 * wrapper packages like @hyperscript-tools/language-server to default
 * to 'hyperscript' mode without modifying this server's code.
 *
 * Values: 'hyperscript', 'hyperscript-i18n', 'lokascript', 'auto'
 */
const envDefaultMode = process.env.HYPERSCRIPT_LS_DEFAULT_MODE as ServerMode | undefined;

// =============================================================================
// Server Setup
// =============================================================================

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Cached semantic analyzer (LRU cache built-in)
let cachedAnalyzer: any = null;

function getSemanticAnalyzer(): any {
  if (!semanticPackage) return null;
  if (!cachedAnalyzer) {
    cachedAnalyzer = semanticPackage.createSemanticAnalyzer();
  }
  return cachedAnalyzer;
}

let globalSettings: ServerSettings = envDefaultMode
  ? { ...defaultSettings, mode: envDefaultMode }
  : defaultSettings;

// =============================================================================
// Initialization
// =============================================================================

connection.onInitialize((params: InitializeParams): InitializeResult => {
  // Resolve mode on initialization
  resolvedMode = resolveMode(globalSettings);
  const brand = getBranding(resolvedMode);
  connection.console.log(`${brand} Language Server initializing (mode: ${resolvedMode})...`);

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        triggerCharacters: ['.', '#', '@', ' ', ':'],
        resolveProvider: false,
      },
      hoverProvider: true,
      documentSymbolProvider: true,
      codeActionProvider: {
        codeActionKinds: [CodeActionKind.QuickFix],
      },
      definitionProvider: true,
      referencesProvider: true,
      documentFormattingProvider: true,
    },
  };
});

connection.onInitialized(() => {
  connection.client.register(DidChangeConfigurationNotification.type, undefined);
  const brand = getBranding(resolvedMode);
  connection.console.log(`${brand} Language Server initialized`);
});

// =============================================================================
// Configuration
// =============================================================================

connection.onDidChangeConfiguration(change => {
  // Accept settings from either 'lokascript' or 'hyperscript' namespace
  const envDefaults = envDefaultMode
    ? { ...defaultSettings, mode: envDefaultMode }
    : defaultSettings;
  globalSettings =
    (change.settings?.lokascript as ServerSettings) ||
    (change.settings?.hyperscript as ServerSettings) ||
    envDefaults;

  // Re-resolve mode when settings change
  const previousMode = resolvedMode;
  resolvedMode = resolveMode(globalSettings);

  if (previousMode !== resolvedMode) {
    const brand = getBranding(resolvedMode);
    connection.console.log(`Mode changed to '${resolvedMode}' (${brand})`);
  }

  // Clear keyword caches so they rebuild for the new language
  translationCache = null;
  reverseKeywordCache = null;

  documents.all().forEach(validateDocument);
});

// =============================================================================
// Document Validation (Diagnostics)
// =============================================================================

documents.onDidChangeContent(change => {
  validateDocument(change.document);
});

async function validateDocument(document: TextDocument): Promise<void> {
  const text = document.getText();
  const uri = document.uri;
  let allDiagnostics: Diagnostic[] = [];

  if (isHtmlDocument(uri, text)) {
    // Extract hyperscript regions from HTML
    const regions = extractHyperscriptRegions(text);

    for (const region of regions) {
      const diagnostics = await getDiagnostics(region.code, globalSettings.language);

      // Map diagnostics back to document positions
      for (const diag of diagnostics) {
        allDiagnostics.push({
          ...diag,
          range: {
            start: {
              line: region.startLine + diag.range.start.line,
              character:
                diag.range.start.line === 0
                  ? region.startChar + diag.range.start.character
                  : diag.range.start.character,
            },
            end: {
              line: region.startLine + diag.range.end.line,
              character:
                diag.range.end.line === 0
                  ? region.startChar + diag.range.end.character
                  : diag.range.end.character,
            },
          },
        });
      }
    }
  } else {
    // Pure hyperscript file
    allDiagnostics = await getDiagnostics(text, globalSettings.language);
  }

  connection.sendDiagnostics({ uri, diagnostics: allDiagnostics });
}

async function getDiagnostics(code: string, language: string): Promise<Diagnostic[]> {
  const diagnostics: Diagnostic[] = [];
  const brand = getBranding(resolvedMode);

  // In hyperscript-compat modes: check for LokaScript-only features first
  if (isHyperscriptCompatMode(resolvedMode)) {
    const lokascriptFeatures = detectLokascriptFeatures(code);
    for (const feature of lokascriptFeatures) {
      diagnostics.push({
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: code.split('\n')[0]?.length || code.length },
        },
        severity: DiagnosticSeverity.Error,
        code: 'lokascript-only',
        source: brand,
        message: `${feature.description} (not compatible with _hyperscript)`,
      });
    }
  }

  // In multilingual modes: try semantic analysis (works for all supported languages)
  // In hyperscript-compat mode: skip semantic analysis
  const analyzer = isMultilingualEnabled(resolvedMode) ? getSemanticAnalyzer() : null;
  if (analyzer) {
    try {
      // First try with configured language
      let result = analyzer.analyze(code, language);
      let usedLanguage = language;

      // If confidence is low, try other supported languages
      // This enables automatic language detection for multilingual code
      if (result.confidence < 0.5) {
        // Try all registered languages for automatic detection
        const languagesToTry = getOtherLanguages();

        for (const lang of languagesToTry) {
          if (lang === usedLanguage) continue;
          try {
            const tryResult = analyzer.analyze(code, lang);
            if (tryResult.confidence > result.confidence) {
              result = tryResult;
              usedLanguage = lang;
              if (result.confidence >= 0.7) break; // Good enough
            }
          } catch (e) {
            connection.console.log(`[${brand}-ls] Language detection failed for '${lang}': ${e}`);
          }
        }
      }

      // Add semantic-level errors
      if (result.errors && result.errors.length > 0) {
        for (const err of result.errors) {
          diagnostics.push({
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: code.split('\n')[0]?.length || code.length },
            },
            severity: DiagnosticSeverity.Error,
            code: 'semantic-error',
            source: brand,
            message: err,
          });
        }
      }

      // Low confidence warning - only if we really couldn't parse it
      // (skip for successfully detected multilingual code)
      if (result.confidence > 0 && result.confidence < 0.3) {
        diagnostics.push({
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: code.length },
          },
          severity: DiagnosticSeverity.Warning,
          code: 'low-confidence',
          source: brand,
          message: `Code could not be fully parsed (${(result.confidence * 100).toFixed(0)}% confidence)`,
        });
      }

      // Validate semantic roles
      if (result.confidence >= 0.5 && result.command) {
        const cmd = result.command.name;
        const roles = result.command.roles;

        if (cmd === 'toggle' && !roles.has('patient')) {
          diagnostics.push({
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: code.length } },
            severity: DiagnosticSeverity.Warning,
            code: 'missing-role',
            source: brand,
            message: 'toggle command missing target (add .class, @attr, or selector)',
          });
        }

        if (cmd === 'put' && !roles.has('destination')) {
          diagnostics.push({
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: code.length } },
            severity: DiagnosticSeverity.Warning,
            code: 'missing-role',
            source: brand,
            message: 'put command missing destination (add "into #element")',
          });
        }
      }
    } catch (e) {
      connection.console.log(`[${brand}-ls] Semantic parsing failed, trying fallback: ${e}`);
    }
  }

  // Try AST-based analysis via interchange format (works in both modes)
  if (diagnostics.length === 0 && interchangeLSP && parseFunction && fromCoreASTFn) {
    try {
      const ast = parseFunction(code);
      if (ast) {
        const interchange = fromCoreASTFn(ast);
        const nodes = interchange.type === 'event' ? [interchange] : [interchange];
        const astDiagnostics = interchangeLSP.interchangeToLSPDiagnostics(nodes, { source: brand });
        diagnostics.push(...astDiagnostics);
      }
    } catch (parseError: any) {
      diagnostics.push({
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: code.length },
        },
        severity: DiagnosticSeverity.Error,
        code: 'parse-error',
        source: brand,
        message: parseError.message || 'Failed to parse',
      });
    }
  }

  // Fallback: simple pattern-based analysis
  if (diagnostics.length === 0) {
    const simpleDiagnostics = runSimpleDiagnostics(code, language);
    // Update source to match current branding
    diagnostics.push(...simpleDiagnostics.map(d => ({ ...d, source: brand })));
  }

  return diagnostics.slice(0, globalSettings.maxDiagnostics);
}

function runSimpleDiagnostics(code: string, _language: string): Diagnostic[] {
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
        severity: DiagnosticSeverity.Error,
        code: 'unmatched-quote',
        source: 'lokascript',
        message: 'Unmatched single quote',
      });
    }

    if (doubleQuotes % 2 !== 0) {
      diagnostics.push({
        range: { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
        severity: DiagnosticSeverity.Error,
        code: 'unmatched-quote',
        source: 'lokascript',
        message: 'Unmatched double quote',
      });
    }
  }

  // Check for unbalanced parentheses/brackets
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;

  if (openParens !== closeParens) {
    diagnostics.push({
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
      severity: DiagnosticSeverity.Error,
      code: 'unbalanced-parens',
      source: 'lokascript',
      message: `Unbalanced parentheses: ${openParens} open, ${closeParens} close`,
    });
  }

  return diagnostics;
}

// =============================================================================
// Completions
// =============================================================================

connection.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const text = document.getText();
  const uri = document.uri;
  const position = params.position;
  const language = globalSettings.language;

  if (isHtmlDocument(uri, text)) {
    // Find if cursor is inside a hyperscript region
    const regions = extractHyperscriptRegions(text);
    const found = findRegionAtPosition(regions, position.line, position.character);

    if (!found) {
      // Not inside hyperscript - no completions
      return [];
    }

    // Get the code before cursor within this region
    const regionLines = found.region.code.split('\n');
    let beforeCursor = '';
    for (let i = 0; i <= found.localLine && i < regionLines.length; i++) {
      if (i === found.localLine) {
        beforeCursor += regionLines[i].slice(0, found.localChar);
      } else {
        beforeCursor += regionLines[i] + '\n';
      }
    }

    const context = inferContext(beforeCursor);
    return getContextualCompletions(context, language);
  } else {
    // Pure hyperscript file
    const offset = document.offsetAt(position);
    const beforeCursor = text.slice(0, offset);
    const context = inferContext(beforeCursor);
    return getContextualCompletions(context, language);
  }
});

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

function getContextualCompletions(context: string, language: string): CompletionItem[] {
  const completions: CompletionItem[] = [];

  // In hyperscript-compat mode: use canonical keywords only
  // In multilingual modes: use configured language with localized lookup
  const effectiveLanguage = isMultilingualEnabled(resolvedMode) ? language : 'en';

  // Helper for multilingual keyword lookup (active in multilingual modes)
  const getKeyword = (eng: string): string => {
    if (!isMultilingualEnabled(resolvedMode) || !semanticPackage || effectiveLanguage === 'en') {
      return eng;
    }
    try {
      const profile = semanticPackage.getProfile(effectiveLanguage);
      if (profile?.keywords?.[eng]?.primary) {
        return profile.keywords[eng].primary;
      }
    } catch (e) {
      const brand = getBranding(resolvedMode);
      connection.console.log(`[${brand}-ls] Keyword lookup failed for '${eng}': ${e}`);
    }
    return eng;
  };

  // Get available commands based on mode
  // hyperscript-i18n uses hyperscript command set (multilingual but hyperscript-compatible)
  const commandMode = isHyperscriptCompatMode(resolvedMode) ? 'hyperscript' : 'lokascript';
  const availableCommands = getCommandsForMode(commandMode);
  const isCommandAvailable = (cmd: string) =>
    availableCommands.includes(cmd as (typeof availableCommands)[number]);

  switch (context) {
    case 'event':
      // Use canonical event names from @hyperfixi/core/lsp-metadata, with fallback
      const eventNames: readonly string[] = lspMetadata?.EVENT_NAMES ?? FALLBACK_EVENT_NAMES;
      for (const eventName of eventNames) {
        completions.push({
          label: eventName,
          kind: CompletionItemKind.Event,
          detail: `${eventName} event`,
        });
      }
      break;

    case 'command':
      // Core commands (available in both modes)
      completions.push(
        {
          label: getKeyword('toggle'),
          kind: CompletionItemKind.Method,
          detail: 'Toggle class/visibility',
          insertText: `${getKeyword('toggle')} .\${1:class}`,
        },
        {
          label: getKeyword('add'),
          kind: CompletionItemKind.Method,
          detail: 'Add class/attribute',
          insertText: `${getKeyword('add')} .\${1:class} to \${2:me}`,
        },
        {
          label: getKeyword('remove'),
          kind: CompletionItemKind.Method,
          detail: 'Remove class/element',
          insertText: `${getKeyword('remove')} .\${1:class} from \${2:me}`,
        },
        { label: getKeyword('show'), kind: CompletionItemKind.Method, detail: 'Show element' },
        { label: getKeyword('hide'), kind: CompletionItemKind.Method, detail: 'Hide element' },
        {
          label: getKeyword('put'),
          kind: CompletionItemKind.Method,
          detail: 'Set content',
          insertText: `${getKeyword('put')} \${1:value} into \${2:target}`,
        },
        {
          label: getKeyword('set'),
          kind: CompletionItemKind.Method,
          detail: 'Set variable',
          insertText: `${getKeyword('set')} \${1:variable} to \${2:value}`,
        },
        {
          label: getKeyword('fetch'),
          kind: CompletionItemKind.Method,
          detail: 'HTTP request',
          insertText: `${getKeyword('fetch')} \${1:/api/endpoint}`,
        },
        {
          label: getKeyword('wait'),
          kind: CompletionItemKind.Method,
          detail: 'Pause execution',
          insertText: `${getKeyword('wait')} \${1:1s}`,
        },
        {
          label: getKeyword('send'),
          kind: CompletionItemKind.Method,
          detail: 'Dispatch event',
          insertText: `${getKeyword('send')} \${1:eventName} to \${2:target}`,
        },
        { label: getKeyword('trigger'), kind: CompletionItemKind.Method, detail: 'Trigger event' },
        { label: getKeyword('log'), kind: CompletionItemKind.Method, detail: 'Console log' },
        { label: getKeyword('if'), kind: CompletionItemKind.Keyword, detail: 'Conditional' },
        { label: getKeyword('repeat'), kind: CompletionItemKind.Keyword, detail: 'Loop' }
      );

      // LokaScript-only commands (only in lokascript mode, not in hyperscript-compat modes)
      if (!isHyperscriptCompatMode(resolvedMode)) {
        completions.push(
          {
            label: getKeyword('make'),
            kind: CompletionItemKind.Method,
            detail: 'Create element or instance',
            insertText: `${getKeyword('make')} a \${1:div}`,
          },
          {
            label: getKeyword('settle'),
            kind: CompletionItemKind.Method,
            detail: 'Wait for CSS transitions',
          },
          {
            label: getKeyword('measure'),
            kind: CompletionItemKind.Method,
            detail: 'Get element dimensions',
          },
          {
            label: getKeyword('morph'),
            kind: CompletionItemKind.Method,
            detail: 'DOM morph with state preservation',
            insertText: `${getKeyword('morph')} \${1:target} to \${2:content}`,
          },
          {
            label: getKeyword('persist'),
            kind: CompletionItemKind.Method,
            detail: 'Save to browser storage',
            insertText: `${getKeyword('persist')} \${1:value} as \${2:key}`,
          },
          {
            label: getKeyword('install'),
            kind: CompletionItemKind.Method,
            detail: 'Install behavior on element',
            insertText: `${getKeyword('install')} \${1:Behavior}`,
          }
        );
      }
      break;

    case 'expression':
      completions.push(
        { label: 'me', kind: CompletionItemKind.Variable, detail: 'Current element' },
        { label: 'you', kind: CompletionItemKind.Variable, detail: 'Event target' },
        { label: 'it', kind: CompletionItemKind.Variable, detail: 'Last result' },
        { label: 'result', kind: CompletionItemKind.Variable, detail: 'Last result (alias)' },
        { label: 'first', kind: CompletionItemKind.Keyword, detail: 'First in collection' },
        { label: 'last', kind: CompletionItemKind.Keyword, detail: 'Last in collection' },
        { label: 'next', kind: CompletionItemKind.Keyword, detail: 'Next sibling' },
        { label: 'previous', kind: CompletionItemKind.Keyword, detail: 'Previous sibling' },
        { label: 'closest', kind: CompletionItemKind.Keyword, detail: 'Closest ancestor' },
        { label: 'parent', kind: CompletionItemKind.Keyword, detail: 'Parent element' }
      );
      break;

    case 'selector':
      completions.push(
        {
          label: '#',
          kind: CompletionItemKind.Snippet,
          detail: 'ID selector',
          insertText: '#${1:id}',
        },
        {
          label: '.',
          kind: CompletionItemKind.Snippet,
          detail: 'Class selector',
          insertText: '.${1:class}',
        },
        {
          label: '<',
          kind: CompletionItemKind.Snippet,
          detail: 'Tag selector',
          insertText: '<${1:tag}/>',
        }
      );
      break;

    default:
      completions.push(
        { label: getKeyword('on'), kind: CompletionItemKind.Keyword, detail: 'Event handler' },
        { label: getKeyword('init'), kind: CompletionItemKind.Keyword, detail: 'Initialization' },
        {
          label: getKeyword('behavior'),
          kind: CompletionItemKind.Class,
          detail: 'Define behavior',
        },
        { label: getKeyword('def'), kind: CompletionItemKind.Function, detail: 'Define function' }
      );
  }

  return completions;
}

// =============================================================================
// Hover
// =============================================================================

connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  try {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;

    const text = document.getText();
    const uri = document.uri;
    const position = params.position;

    // For HTML files, check if we're inside a hyperscript region
    if (isHtmlDocument(uri, text)) {
      const regions = extractHyperscriptRegions(text);
      const found = findRegionAtPosition(regions, position.line, position.character);

      if (!found) {
        // Not inside hyperscript - no hover
        return null;
      }

      // Get the line within the region
      const regionLines = found.region.code.split('\n');
      const currentLine = regionLines[found.localLine];
      if (!currentLine) return null;

      const word = getWordAtPosition(currentLine, found.localChar);
      if (!word) return null;

      const doc = getHoverDocumentation(word.text, globalSettings.language);
      if (!doc) return null;

      // Map range back to document coordinates
      const startChar = found.localLine === 0 ? found.region.startChar + word.start : word.start;
      const endChar = found.localLine === 0 ? found.region.startChar + word.end : word.end;

      return {
        contents: { kind: MarkupKind.Markdown, value: doc },
        range: {
          start: { line: position.line, character: startChar },
          end: { line: position.line, character: endChar },
        },
      };
    }

    // Pure hyperscript file
    const lines = text.split('\n');
    const currentLine = lines[position.line];
    if (!currentLine) return null;

    const word = getWordAtPosition(currentLine, position.character);
    if (!word) return null;

    const doc = getHoverDocumentation(word.text, globalSettings.language);
    if (!doc) return null;

    return {
      contents: { kind: MarkupKind.Markdown, value: doc },
      range: {
        start: { line: position.line, character: word.start },
        end: { line: position.line, character: word.end },
      },
    };
  } catch (error) {
    connection.console.error(`Hover error: ${error}`);
    return null;
  }
});

function getHoverDocumentation(word: string, language: string): string | null {
  const wordLower = word.toLowerCase();

  // In multilingual modes: resolve to canonical keyword for doc lookup
  // In hyperscript mode: word is already canonical
  const canonicalKey = isMultilingualEnabled(resolvedMode)
    ? resolveCanonicalKeyword(wordLower, language)
    : wordLower;

  // Use canonical hover docs from @hyperfixi/core/lsp-metadata, with fallback
  const docs = lspMetadata?.HOVER_DOCS ?? FALLBACK_HOVER_DOCS;

  const doc = docs[canonicalKey];
  if (!doc) return null;

  // Build hover content
  let content = `**${doc.title}**`;

  // Show the user's keyword with the canonical form for reference
  if (isMultilingualEnabled(resolvedMode) && wordLower !== canonicalKey) {
    content = `**${word}** (${canonicalKey})`;
  }

  content += `\n\n${doc.description}`;
  content += `\n\n\`\`\`hyperscript\n${doc.example}\n\`\`\``;

  // Add translations in multilingual modes
  if (isMultilingualEnabled(resolvedMode)) {
    const translations = getKeywordTranslations(canonicalKey);
    if (translations) {
      content += `\n\n**Translations:** ${translations}`;
    }
  }

  return content;
}

// Cache for keyword translations (canonical keyword → localized forms)
let translationCache: Map<string, string> | null = null;

function buildTranslationCache(): Map<string, string> {
  const cache = new Map<string, string>();

  if (!semanticPackage) return cache;

  const langMap: Record<string, string> = {
    es: 'Spanish',
    ja: 'Japanese',
    ko: 'Korean',
    de: 'German',
    fr: 'French',
  };

  // Build translation strings for each canonical keyword
  const canonicalKeywords = [
    'toggle',
    'add',
    'remove',
    'show',
    'hide',
    'put',
    'set',
    'get',
    'fetch',
    'wait',
    'send',
    'trigger',
    'call',
    'log',
    'go',
    'on',
    'if',
    'repeat',
    'behavior',
    'me',
    'you',
    'it',
    'result',
  ];

  for (const canonicalKey of canonicalKeywords) {
    const translations: string[] = [];

    for (const [lang, langName] of Object.entries(langMap)) {
      try {
        const profile = semanticPackage.getProfile(lang);
        const kw = profile?.keywords?.[canonicalKey as keyof typeof profile.keywords];
        if (kw) {
          const trans = kw as { primary?: string };
          if (trans.primary && trans.primary !== canonicalKey) {
            translations.push(`${langName}: \`${trans.primary}\``);
          }
        }
      } catch (e) {
        connection.console.log(`[lokascript-ls] Translation cache: profile '${lang}' not found`);
      }
    }

    if (translations.length > 0) {
      cache.set(canonicalKey, translations.join(' · '));
    }
  }

  return cache;
}

function getKeywordTranslations(canonicalKey: string): string | null {
  if (!translationCache) {
    translationCache = buildTranslationCache();
  }
  return translationCache.get(canonicalKey) || null;
}

// Cache for reverse keyword lookup (localized keyword → canonical form)
let reverseKeywordCache: Map<string, string> | null = null;

function buildReverseKeywordCache(): Map<string, string> {
  const cache = new Map<string, string>();

  if (!semanticPackage) return cache;

  const languagesToTry = getOtherLanguages();

  for (const lang of languagesToTry) {
    try {
      const profile = semanticPackage.getProfile(lang);
      if (profile?.keywords) {
        for (const [canonicalKey, translation] of Object.entries(profile.keywords)) {
          const trans = translation as { primary?: string; alternatives?: string[] };
          if (trans.primary) {
            cache.set(trans.primary.toLowerCase(), canonicalKey);
          }
          if (trans.alternatives) {
            for (const alt of trans.alternatives) {
              cache.set(alt.toLowerCase(), canonicalKey);
            }
          }
        }
      }
      if (profile?.references) {
        for (const [engRef, translatedRef] of Object.entries(profile.references)) {
          if (typeof translatedRef === 'string') {
            cache.set(translatedRef.toLowerCase(), engRef);
          }
        }
      }
    } catch (e) {
      connection.console.log(`[lokascript-ls] Reverse keyword cache: profile '${lang}' not found`);
    }
  }

  return cache;
}

function resolveCanonicalKeyword(word: string, _language: string): string {
  // If it's already a canonical keyword, return it
  // Use canonical keyword list from @hyperfixi/core/lsp-metadata, with fallback
  const canonicalKeywords: readonly string[] = lspMetadata?.ALL_KEYWORDS ?? FALLBACK_KEYWORDS;
  if (canonicalKeywords.includes(word)) return word;

  // Build cache lazily
  if (!reverseKeywordCache) {
    reverseKeywordCache = buildReverseKeywordCache();
  }

  // Look up in cache
  return reverseKeywordCache.get(word) || word;
}

// =============================================================================
// Go to Definition
// =============================================================================

connection.onDefinition((params: TextDocumentPositionParams): Location | Location[] | null => {
  try {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;

    const text = document.getText();
    const uri = document.uri;
    const position = params.position;

    // Get the word at the current position
    let targetWord: string | null = null;

    if (isHtmlDocument(uri, text)) {
      // Find if cursor is inside a hyperscript region
      const regions = extractHyperscriptRegions(text);
      const found = findRegionAtPosition(regions, position.line, position.character);

      if (!found) {
        return null;
      }

      // Get the line within the region
      const regionLines = found.region.code.split('\n');
      const currentLine = regionLines[found.localLine];
      if (!currentLine) return null;

      const word = getWordAtPosition(currentLine, found.localChar);
      if (!word) return null;

      targetWord = word.text;
    } else {
      // Pure hyperscript file
      const lines = text.split('\n');
      const currentLine = lines[position.line];
      if (!currentLine) return null;

      const word = getWordAtPosition(currentLine, position.character);
      if (!word) return null;

      targetWord = word.text;
    }

    if (!targetWord) return null;

    // Search for definitions in the document
    const locations: Location[] = [];

    // Get multilingual variants for behavior/def keywords
    const behaviorVariants = getKeywordVariants('behavior');
    const defVariants = getKeywordVariants('def');

    // Pattern for behavior definitions: behavior Name
    const behaviorPattern = new RegExp(
      `\\b(${behaviorVariants.join('|')})\\s+(${escapeRegExp(targetWord)})\\b`,
      'gi'
    );

    // Pattern for function definitions: def functionName
    const defPattern = new RegExp(
      `\\b(${defVariants.join('|')})\\s+(${escapeRegExp(targetWord)})\\b`,
      'gi'
    );

    // Search in all hyperscript regions if HTML, or the entire file
    if (isHtmlDocument(uri, text)) {
      const regions = extractHyperscriptRegions(text);

      for (const region of regions) {
        // Search for behavior definitions
        for (const match of region.code.matchAll(behaviorPattern)) {
          const matchLine = findLineInRegion(region.code, match.index ?? 0);
          const matchChar = findCharInLine(region.code, match.index ?? 0);

          locations.push({
            uri: params.textDocument.uri,
            range: {
              start: {
                line: region.startLine + matchLine,
                character: matchLine === 0 ? region.startChar + matchChar : matchChar,
              },
              end: {
                line: region.startLine + matchLine,
                character:
                  (matchLine === 0 ? region.startChar + matchChar : matchChar) + match[0].length,
              },
            },
          });
        }

        // Search for function definitions
        for (const match of region.code.matchAll(defPattern)) {
          const matchLine = findLineInRegion(region.code, match.index ?? 0);
          const matchChar = findCharInLine(region.code, match.index ?? 0);

          locations.push({
            uri: params.textDocument.uri,
            range: {
              start: {
                line: region.startLine + matchLine,
                character: matchLine === 0 ? region.startChar + matchChar : matchChar,
              },
              end: {
                line: region.startLine + matchLine,
                character:
                  (matchLine === 0 ? region.startChar + matchChar : matchChar) + match[0].length,
              },
            },
          });
        }
      }
    } else {
      // Pure hyperscript file - search entire text
      // Search for behavior definitions
      for (const match of text.matchAll(behaviorPattern)) {
        const pos = offsetToPosition(text, match.index ?? 0);
        locations.push({
          uri: params.textDocument.uri,
          range: {
            start: pos,
            end: { line: pos.line, character: pos.character + match[0].length },
          },
        });
      }

      // Search for function definitions
      for (const match of text.matchAll(defPattern)) {
        const pos = offsetToPosition(text, match.index ?? 0);
        locations.push({
          uri: params.textDocument.uri,
          range: {
            start: pos,
            end: { line: pos.line, character: pos.character + match[0].length },
          },
        });
      }
    }

    if (locations.length === 0) return null;
    if (locations.length === 1) return locations[0]!;
    return locations;
  } catch (error) {
    connection.console.error(`Go to Definition error: ${error}`);
    return null;
  }
});

/**
 * Helper: Get all localized variants for a given canonical keyword
 */
function getKeywordVariants(eng: string): string[] {
  const variants = [eng];
  if (!semanticPackage) return variants;

  for (const lang of getOtherLanguages()) {
    try {
      const profile = semanticPackage.getProfile(lang);
      if (profile?.keywords?.[eng]) {
        const trans = profile.keywords[eng] as { primary?: string; alternatives?: string[] };
        if (trans.primary && !variants.includes(trans.primary)) {
          variants.push(trans.primary);
        }
        if (trans.alternatives) {
          for (const alt of trans.alternatives) {
            if (!variants.includes(alt)) {
              variants.push(alt);
            }
          }
        }
      }
    } catch {
      // Ignore missing profiles
    }
  }
  return variants;
}

// =============================================================================
// Find References
// =============================================================================

connection.onReferences((params): Location[] | null => {
  try {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;

    const text = document.getText();
    const uri = document.uri;
    const position = params.position;

    // Get the word at the current position
    let targetWord: string | null = null;

    if (isHtmlDocument(uri, text)) {
      const regions = extractHyperscriptRegions(text);
      const found = findRegionAtPosition(regions, position.line, position.character);

      if (!found) return null;

      const regionLines = found.region.code.split('\n');
      const currentLine = regionLines[found.localLine];
      if (!currentLine) return null;

      const word = getWordAtPosition(currentLine, found.localChar);
      if (!word) return null;

      targetWord = word.text;
    } else {
      const lines = text.split('\n');
      const currentLine = lines[position.line];
      if (!currentLine) return null;

      const word = getWordAtPosition(currentLine, position.character);
      if (!word) return null;

      targetWord = word.text;
    }

    if (!targetWord) return null;

    // Search for all references (word boundaries)
    const locations: Location[] = [];

    // Pattern to find all occurrences of the word
    const wordPattern = new RegExp(`\\b${escapeRegExp(targetWord)}\\b`, 'gi');

    if (isHtmlDocument(uri, text)) {
      const regions = extractHyperscriptRegions(text);

      for (const region of regions) {
        for (const match of region.code.matchAll(wordPattern)) {
          const matchLine = findLineInRegion(region.code, match.index ?? 0);
          const matchChar = findCharInLine(region.code, match.index ?? 0);

          locations.push({
            uri: params.textDocument.uri,
            range: {
              start: {
                line: region.startLine + matchLine,
                character: matchLine === 0 ? region.startChar + matchChar : matchChar,
              },
              end: {
                line: region.startLine + matchLine,
                character:
                  (matchLine === 0 ? region.startChar + matchChar : matchChar) + match[0].length,
              },
            },
          });
        }
      }
    } else {
      for (const match of text.matchAll(wordPattern)) {
        const pos = offsetToPosition(text, match.index ?? 0);
        locations.push({
          uri: params.textDocument.uri,
          range: {
            start: pos,
            end: { line: pos.line, character: pos.character + match[0].length },
          },
        });
      }
    }

    return locations.length > 0 ? locations : null;
  } catch (error) {
    connection.console.error(`Find References error: ${error}`);
    return null;
  }
});

// =============================================================================
// Document Formatting
// =============================================================================

connection.onDocumentFormatting((params: DocumentFormattingParams): TextEdit[] | null => {
  try {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;

    const text = document.getText();
    const uri = document.uri;
    const options = params.options;

    // Determine indent string based on options
    const indentStr = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';

    // For HTML documents, we only format the hyperscript regions
    // For now, only format pure hyperscript files
    if (isHtmlDocument(uri, text)) {
      // Don't format HTML documents - we'd need to preserve the HTML structure
      // and only format the hyperscript regions
      connection.console.log('[lokascript-ls] Formatting not supported for HTML documents');
      return null;
    }

    // Pattern-based formatting
    const formatted = formatHyperscript(text, indentStr);
    if (formatted !== text) {
      return [
        TextEdit.replace(
          {
            start: { line: 0, character: 0 },
            end: { line: document.lineCount, character: 0 },
          },
          formatted
        ),
      ];
    }

    return null;
  } catch (error) {
    connection.console.error(`Document Formatting error: ${error}`);
    return null;
  }
});

// =============================================================================
// Document Symbols
// =============================================================================

connection.onDocumentSymbol((params: DocumentSymbolParams): DocumentSymbol[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const text = document.getText();
  const uri = document.uri;
  const language = globalSettings.language;

  if (isHtmlDocument(uri, text)) {
    // Extract symbols from all hyperscript regions
    const regions = extractHyperscriptRegions(text);
    const allSymbols: DocumentSymbol[] = [];

    for (const region of regions) {
      const symbols = extractSymbols(region.code, language);

      // Map symbol positions back to document coordinates
      for (const symbol of symbols) {
        allSymbols.push({
          ...symbol,
          range: {
            start: {
              line: region.startLine + symbol.range.start.line,
              character:
                symbol.range.start.line === 0
                  ? region.startChar + symbol.range.start.character
                  : symbol.range.start.character,
            },
            end: {
              line: region.startLine + symbol.range.end.line,
              character:
                symbol.range.end.line === 0
                  ? region.startChar + symbol.range.end.character
                  : symbol.range.end.character,
            },
          },
          selectionRange: {
            start: {
              line: region.startLine + symbol.selectionRange.start.line,
              character:
                symbol.selectionRange.start.line === 0
                  ? region.startChar + symbol.selectionRange.start.character
                  : symbol.selectionRange.start.character,
            },
            end: {
              line: region.startLine + symbol.selectionRange.end.line,
              character:
                symbol.selectionRange.end.line === 0
                  ? region.startChar + symbol.selectionRange.end.character
                  : symbol.selectionRange.end.character,
            },
          },
        });
      }
    }

    return allSymbols;
  } else {
    return extractSymbols(text, language);
  }
});

function extractSymbols(code: string, language: string): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];
  const lines = code.split('\n');

  // Get multilingual keyword variants
  const getVariants = (eng: string): string[] => {
    const variants = [eng];
    if (!semanticPackage || language === 'en') return variants;
    try {
      const profile = semanticPackage.getProfile(language);
      if (profile?.keywords?.[eng]) {
        const trans = profile.keywords[eng] as { primary?: string; alternatives?: string[] };
        if (trans.primary) variants.push(trans.primary);
        if (trans.alternatives) variants.push(...trans.alternatives);
      }
    } catch (e) {
      connection.console.log(
        `[lokascript-ls] Symbol extraction: variant lookup failed for '${eng}'`
      );
    }
    return variants;
  };

  const onVariants = getVariants('on');
  const behaviorVariants = getVariants('behavior');
  const defVariants = getVariants('def');
  const initVariants = getVariants('init');

  const onPattern = new RegExp(`\\b(${onVariants.join('|')})\\s+(\\w+(?:\\[.*?\\])?)`, 'gi');
  const behaviorPattern = new RegExp(`\\b(${behaviorVariants.join('|')})\\s+(\\w+)`, 'gi');
  const defPattern = new RegExp(`\\b(${defVariants.join('|')})\\s+(\\w+)`, 'gi');
  const initPattern = new RegExp(`\\b(${initVariants.join('|')})\\b`, 'gi');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Event handlers
    for (const match of line.matchAll(onPattern)) {
      const matchIndex = match.index ?? 0;
      symbols.push({
        name: `${match[1]} ${match[2]}`,
        detail: 'Event Handler',
        kind: SymbolKind.Event,
        range: {
          start: { line: i, character: matchIndex },
          end: { line: i, character: matchIndex + match[0].length },
        },
        selectionRange: {
          start: { line: i, character: matchIndex },
          end: { line: i, character: matchIndex + match[0].length },
        },
      });
    }

    // Behaviors
    for (const match of line.matchAll(behaviorPattern)) {
      const matchIndex = match.index ?? 0;
      symbols.push({
        name: `${match[1]} ${match[2]}`,
        detail: 'Behavior Definition',
        kind: SymbolKind.Class,
        range: {
          start: { line: i, character: matchIndex },
          end: { line: i, character: matchIndex + match[0].length },
        },
        selectionRange: {
          start: { line: i, character: matchIndex },
          end: { line: i, character: matchIndex + match[0].length },
        },
      });
    }

    // Functions
    for (const match of line.matchAll(defPattern)) {
      const matchIndex = match.index ?? 0;
      symbols.push({
        name: `${match[1]} ${match[2]}`,
        detail: 'Function Definition',
        kind: SymbolKind.Function,
        range: {
          start: { line: i, character: matchIndex },
          end: { line: i, character: matchIndex + match[0].length },
        },
        selectionRange: {
          start: { line: i, character: matchIndex },
          end: { line: i, character: matchIndex + match[0].length },
        },
      });
    }

    // Init blocks
    for (const match of line.matchAll(initPattern)) {
      const matchIndex = match.index ?? 0;
      symbols.push({
        name: match[1],
        detail: 'Initialization',
        kind: SymbolKind.Constructor,
        range: {
          start: { line: i, character: matchIndex },
          end: { line: i, character: matchIndex + match[1].length },
        },
        selectionRange: {
          start: { line: i, character: matchIndex },
          end: { line: i, character: matchIndex + match[1].length },
        },
      });
    }
  }

  return symbols;
}

// =============================================================================
// Code Actions
// =============================================================================

connection.onCodeAction((params: CodeActionParams): CodeAction[] => {
  const diagnostics = params.context.diagnostics;
  const actions: CodeAction[] = [];

  for (const diagnostic of diagnostics) {
    if (diagnostic.code === 'missing-role' && diagnostic.message.includes('toggle')) {
      actions.push({
        title: 'Add class target to toggle',
        kind: CodeActionKind.QuickFix,
        diagnostics: [diagnostic],
        edit: {
          changes: {
            [params.textDocument.uri]: [
              {
                range: diagnostic.range,
                newText: 'toggle .${1:classname}',
              },
            ],
          },
        },
      });
    }

    if (diagnostic.code === 'missing-role' && diagnostic.message.includes('put')) {
      actions.push({
        title: 'Add destination to put command',
        kind: CodeActionKind.QuickFix,
        diagnostics: [diagnostic],
        edit: {
          changes: {
            [params.textDocument.uri]: [
              {
                range: diagnostic.range,
                newText: 'put ${1:value} into ${2:#element}',
              },
            ],
          },
        },
      });
    }
  }

  return actions;
});

// =============================================================================
// Start Server
// =============================================================================

documents.listen(connection);
connection.listen();
