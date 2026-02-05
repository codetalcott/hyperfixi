#!/usr/bin/env node
/**
 * LokaScript Language Server
 *
 * LSP implementation for hyperscript with 21 language support.
 * Reuses analysis infrastructure from @lokascript/semantic and @lokascript/ast-toolkit.
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
  Range,
  TextEdit,
  DocumentFormattingParams,
} from 'vscode-languageserver/node.js';

import { TextDocument } from 'vscode-languageserver-textdocument';

// =============================================================================
// Optional Package Imports
// =============================================================================

let semanticPackage: any = null;
let astToolkit: any = null;
let parseFunction: any = null;

// Try to import semantic package for multilingual support
try {
  semanticPackage = await import('@lokascript/semantic');
} catch {
  console.error('[lokascript-ls] @lokascript/semantic not available - using English-only fallback');
}

// Try to import ast-toolkit for enhanced analysis
try {
  astToolkit = await import('@lokascript/ast-toolkit');
} catch {
  console.error('[lokascript-ls] @lokascript/ast-toolkit not available');
}

// Try to import core package for parsing
try {
  const core = await import('@lokascript/core');
  parseFunction = core.parse;
} catch {
  console.error('[lokascript-ls] @lokascript/core not available');
}

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

// Server configuration
interface ServerSettings {
  language: string;
  maxDiagnostics: number;
}

const defaultSettings: ServerSettings = {
  language: 'en',
  maxDiagnostics: 100,
};

let globalSettings: ServerSettings = defaultSettings;

// =============================================================================
// HTML Hyperscript Extraction
// =============================================================================

interface HyperscriptRegion {
  code: string;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
  type: 'attribute' | 'script';
}

/**
 * Checks if a document is HTML based on URI or content
 */
function isHtmlDocument(uri: string, content: string): boolean {
  if (uri.endsWith('.html') || uri.endsWith('.htm')) return true;
  if (content.trim().startsWith('<!DOCTYPE') || content.trim().startsWith('<html')) return true;
  // Check for HTML tags
  if (/<\w+[^>]*>/.test(content) && !content.trim().startsWith('on ')) return true;
  return false;
}

/**
 * Extracts hyperscript regions from HTML content.
 * Returns regions for _="..." and _='...' attributes and <script type="text/hyperscript"> tags.
 */
function extractHyperscriptRegions(content: string): HyperscriptRegion[] {
  const regions: HyperscriptRegion[] = [];

  // Track position for multiline matching
  let fullContent = content;

  // Extract _="..." attributes (double quotes, handles multiline)
  const doubleQuoteRegex = /_="([^"\\]*(?:\\.[^"\\]*)*)"/g;
  let match;

  while ((match = doubleQuoteRegex.exec(fullContent)) !== null) {
    const code = match[1].replace(/\\"/g, '"'); // Unescape quotes
    const startOffset = match.index + 3; // After _="
    const endOffset = match.index + match[0].length - 1; // Before final "

    // Convert offset to line/character
    const startPos = offsetToPosition(content, startOffset);
    const endPos = offsetToPosition(content, endOffset);

    regions.push({
      code,
      startLine: startPos.line,
      startChar: startPos.character,
      endLine: endPos.line,
      endChar: endPos.character,
      type: 'attribute',
    });
  }

  // Extract _='...' attributes (single quotes, handles multiline)
  const singleQuoteRegex = /_='([^'\\]*(?:\\.[^'\\]*)*)'/g;

  while ((match = singleQuoteRegex.exec(fullContent)) !== null) {
    const code = match[1].replace(/\\'/g, "'"); // Unescape quotes
    const startOffset = match.index + 3; // After _='
    const endOffset = match.index + match[0].length - 1; // Before final '

    // Convert offset to line/character
    const startPos = offsetToPosition(content, startOffset);
    const endPos = offsetToPosition(content, endOffset);

    regions.push({
      code,
      startLine: startPos.line,
      startChar: startPos.character,
      endLine: endPos.line,
      endChar: endPos.character,
      type: 'attribute',
    });
  }

  // Extract <script type="text/hyperscript">...</script>
  const scriptRegex = /<script\s+type=["']text\/hyperscript["'][^>]*>([\s\S]*?)<\/script>/gi;

  while ((match = scriptRegex.exec(fullContent)) !== null) {
    const code = match[1];
    const startOffset = match.index + match[0].indexOf('>') + 1;
    const endOffset = match.index + match[0].lastIndexOf('</script>');

    const startPos = offsetToPosition(content, startOffset);
    const endPos = offsetToPosition(content, endOffset);

    regions.push({
      code,
      startLine: startPos.line,
      startChar: startPos.character,
      endLine: endPos.line,
      endChar: endPos.character,
      type: 'script',
    });
  }

  return regions;
}

/**
 * Converts a character offset to line/character position.
 * Handles both Unix (LF) and Windows (CRLF) line endings.
 */
function offsetToPosition(content: string, offset: number): { line: number; character: number } {
  let line = 0;
  let character = 0;

  // Clamp offset to valid range
  const maxOffset = Math.min(offset, content.length);

  for (let i = 0; i < maxOffset; i++) {
    if (content[i] === '\r' && content[i + 1] === '\n') {
      // CRLF: count as single newline, skip the \r
      line++;
      character = 0;
      i++; // Skip the \n in next iteration
    } else if (content[i] === '\n') {
      // LF only
      line++;
      character = 0;
    } else if (content[i] === '\r') {
      // CR only (old Mac style, rare)
      line++;
      character = 0;
    } else {
      character++;
    }
  }

  return { line, character };
}

/**
 * Finds which hyperscript region (if any) contains the given position
 */
function findRegionAtPosition(
  regions: HyperscriptRegion[],
  line: number,
  character: number
): { region: HyperscriptRegion; localLine: number; localChar: number } | null {
  for (const region of regions) {
    // Check if position is within region bounds
    const afterStart =
      line > region.startLine || (line === region.startLine && character >= region.startChar);
    const beforeEnd =
      line < region.endLine || (line === region.endLine && character <= region.endChar);

    if (afterStart && beforeEnd) {
      // Calculate local position within the region
      let localLine = line - region.startLine;
      let localChar: number;

      if (line === region.startLine) {
        localChar = character - region.startChar;
      } else {
        localChar = character;
      }

      return { region, localLine, localChar };
    }
  }
  return null;
}

// =============================================================================
// Initialization
// =============================================================================

connection.onInitialize((params: InitializeParams): InitializeResult => {
  connection.console.log('LokaScript Language Server initializing...');

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
  connection.console.log('LokaScript Language Server initialized');
});

// =============================================================================
// Configuration
// =============================================================================

connection.onDidChangeConfiguration(change => {
  globalSettings = (change.settings?.lokascript as ServerSettings) || defaultSettings;
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

  // Try semantic analysis first (works for all 21 supported languages)
  const analyzer = getSemanticAnalyzer();
  if (analyzer) {
    try {
      // First try with configured language
      let result = analyzer.analyze(code, language);
      let usedLanguage = language;

      // If confidence is low, try other supported languages
      // This enables automatic language detection for multilingual code
      if (result.confidence < 0.5) {
        // Try common languages first (Spanish, Japanese, Korean, German, French, etc.)
        const languagesToTry = ['es', 'ja', 'ko', 'de', 'fr', 'pt', 'zh', 'ar', 'tr', 'id'];

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
            connection.console.log(`[lokascript-ls] Language detection failed for '${lang}': ${e}`);
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
            source: 'lokascript',
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
          source: 'lokascript',
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
            source: 'lokascript',
            message: 'toggle command missing target (add .class, @attr, or selector)',
          });
        }

        if (cmd === 'put' && !roles.has('destination')) {
          diagnostics.push({
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: code.length } },
            severity: DiagnosticSeverity.Warning,
            code: 'missing-role',
            source: 'lokascript',
            message: 'put command missing destination (add "into #element")',
          });
        }
      }
    } catch (e) {
      connection.console.log(`[lokascript-ls] Semantic parsing failed, trying fallback: ${e}`);
    }
  }

  // Try AST-based analysis
  if (diagnostics.length === 0 && astToolkit && parseFunction) {
    try {
      const ast = parseFunction(code);
      if (ast && astToolkit.astToLSPDiagnostics) {
        const astDiagnostics = astToolkit.astToLSPDiagnostics(ast);
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
        source: 'lokascript',
        message: parseError.message || 'Failed to parse hyperscript',
      });
    }
  }

  // Fallback: simple pattern-based analysis
  if (diagnostics.length === 0) {
    diagnostics.push(...runSimpleDiagnostics(code, language));
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

  // Helper for multilingual keyword lookup
  const getKeyword = (eng: string): string => {
    if (!semanticPackage || language === 'en') return eng;
    try {
      const profile = semanticPackage.getProfile(language);
      if (profile?.keywords?.[eng]?.primary) {
        return profile.keywords[eng].primary;
      }
    } catch (e) {
      connection.console.log(`[lokascript-ls] Keyword lookup failed for '${eng}': ${e}`);
    }
    return eng;
  };

  switch (context) {
    case 'event':
      completions.push(
        { label: 'click', kind: CompletionItemKind.Event, detail: 'Mouse click event' },
        { label: 'dblclick', kind: CompletionItemKind.Event, detail: 'Double click event' },
        { label: 'mouseenter', kind: CompletionItemKind.Event, detail: 'Mouse enter event' },
        { label: 'mouseleave', kind: CompletionItemKind.Event, detail: 'Mouse leave event' },
        { label: 'keydown', kind: CompletionItemKind.Event, detail: 'Key down event' },
        { label: 'keyup', kind: CompletionItemKind.Event, detail: 'Key up event' },
        { label: 'input', kind: CompletionItemKind.Event, detail: 'Input change event' },
        { label: 'change', kind: CompletionItemKind.Event, detail: 'Value change event' },
        { label: 'submit', kind: CompletionItemKind.Event, detail: 'Form submit event' },
        { label: 'load', kind: CompletionItemKind.Event, detail: 'Element load event' },
        { label: 'focus', kind: CompletionItemKind.Event, detail: 'Focus event' },
        { label: 'blur', kind: CompletionItemKind.Event, detail: 'Blur event' }
      );
      break;

    case 'command':
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

function getWordAtPosition(
  line: string,
  character: number
): { text: string; start: number; end: number } | null {
  let start = character;
  let end = character;

  // Extended regex to handle:
  // - Latin characters with diacritics (á, ñ, ü, etc.)
  // - CJK characters (Japanese, Korean, Chinese)
  // - Arabic, Hebrew, Cyrillic, etc.
  // Using Unicode property escapes for proper multilingual support
  const isWordChar = (char: string): boolean => {
    if (!char) return false;
    // Match: letters, marks, numbers, hyphen, dot, underscore
    // This covers Latin, CJK, Arabic, Hebrew, Cyrillic, etc.
    return /[\p{L}\p{M}\p{N}_.-]/u.test(char);
  };

  while (start > 0 && isWordChar(line[start - 1])) {
    start--;
  }
  while (end < line.length && isWordChar(line[end])) {
    end++;
  }

  if (start === end) return null;
  return { text: line.slice(start, end), start, end };
}

function getHoverDocumentation(word: string, language: string): string | null {
  const wordLower = word.toLowerCase();

  // Normalize to English for lookup
  const engWord = normalizeToEnglish(wordLower, language);

  // Base documentation in English
  const docs: Record<string, { title: string; description: string; example: string }> = {
    toggle: {
      title: 'toggle',
      description: 'Toggles a class, attribute, or visibility state.',
      example: 'toggle .active on me\ntoggle @disabled on #btn',
    },
    add: {
      title: 'add',
      description: 'Adds a class or attribute to an element.',
      example: 'add .highlight to me\nadd @disabled to #btn',
    },
    remove: {
      title: 'remove',
      description: 'Removes a class, attribute, or element.',
      example: 'remove .highlight from me\nremove #temp',
    },
    show: {
      title: 'show',
      description: 'Makes an element visible.',
      example: 'show #modal\nshow me with *opacity',
    },
    hide: {
      title: 'hide',
      description: 'Hides an element.',
      example: 'hide #modal\nhide me with *opacity',
    },
    put: {
      title: 'put',
      description: 'Sets the content of an element.',
      example: 'put "Hello" into #message\nput response into #results',
    },
    set: {
      title: 'set',
      description: 'Sets a variable or property.',
      example: 'set :count to 0\nset $globalVar to "value"',
    },
    get: {
      title: 'get',
      description: 'Gets a value from an element or variable.',
      example: 'get the value of #input\nget #myElement',
    },
    fetch: {
      title: 'fetch',
      description: 'Makes an HTTP request.',
      example: 'fetch /api/data as json\nfetch /api/users then put it into #list',
    },
    wait: {
      title: 'wait',
      description: 'Pauses execution for a duration.',
      example: 'wait 1s\nwait 500ms then remove .loading',
    },
    send: {
      title: 'send',
      description: 'Dispatches a custom event.',
      example: 'send myEvent to #target\nsend refresh to <body/>',
    },
    trigger: {
      title: 'trigger',
      description: 'Triggers an event on an element.',
      example: 'trigger click on #btn\ntrigger submit on closest <form/>',
    },
    call: {
      title: 'call',
      description: 'Calls a function or method.',
      example: 'call myFunction()\ncall element.focus()',
    },
    log: {
      title: 'log',
      description: 'Logs a value to the console.',
      example: 'log "Hello"\nlog the value of #input',
    },
    go: {
      title: 'go',
      description: 'Navigates to a URL.',
      example: 'go to url /home\ngo to url #section',
    },
    on: {
      title: 'on',
      description: 'Defines an event handler.',
      example: 'on click toggle .active\non keydown[key=="Enter"] submit()',
    },
    if: {
      title: 'if',
      description: 'Conditional execution.',
      example: 'if .active toggle .active\nif :count > 10 log "high"',
    },
    repeat: {
      title: 'repeat',
      description: 'Loops a specified number of times.',
      example: 'repeat 5 times log "hello"\nrepeat for item in items',
    },
    behavior: {
      title: 'behavior',
      description: 'Defines a reusable behavior.',
      example: 'behavior Clickable\n  on click toggle .active\nend',
    },
    me: {
      title: 'me',
      description: 'References the current element (the element with this hyperscript).',
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
      description: 'Alias for `it` - the result of the last expression.',
      example: 'call myFunction() then log result',
    },
  };

  const doc = docs[engWord];
  if (!doc) return null;

  // Build hover content
  let content = `**${doc.title}**`;

  // If the word was translated, show the original word too
  if (wordLower !== engWord) {
    content = `**${word}** → *${engWord}*`;
  }

  content += `\n\n${doc.description}`;
  content += `\n\n\`\`\`hyperscript\n${doc.example}\n\`\`\``;

  // Add translations from cache (built lazily)
  const translations = getKeywordTranslations(engWord);
  if (translations) {
    content += `\n\n**Translations:** ${translations}`;
  }

  return content;
}

// Cache for keyword translations (English → translated versions)
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

  // Build translation strings for each English keyword
  const englishKeywords = [
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

  for (const engWord of englishKeywords) {
    const translations: string[] = [];

    for (const [lang, langName] of Object.entries(langMap)) {
      try {
        const profile = semanticPackage.getProfile(lang);
        const kw = profile?.keywords?.[engWord as keyof typeof profile.keywords];
        if (kw) {
          const trans = kw as { primary?: string };
          if (trans.primary && trans.primary !== engWord) {
            translations.push(`${langName}: \`${trans.primary}\``);
          }
        }
      } catch (e) {
        connection.console.log(`[lokascript-ls] Translation cache: profile '${lang}' not found`);
      }
    }

    if (translations.length > 0) {
      cache.set(engWord, translations.join(' · '));
    }
  }

  return cache;
}

function getKeywordTranslations(engWord: string): string | null {
  if (!translationCache) {
    translationCache = buildTranslationCache();
  }
  return translationCache.get(engWord) || null;
}

// Cache for reverse keyword lookup (translation → English)
let reverseKeywordCache: Map<string, string> | null = null;

function buildReverseKeywordCache(): Map<string, string> {
  const cache = new Map<string, string>();

  if (!semanticPackage) return cache;

  const languagesToTry = ['es', 'ja', 'ko', 'de', 'fr', 'pt', 'zh', 'ar', 'tr', 'id', 'qu', 'sw'];

  for (const lang of languagesToTry) {
    try {
      const profile = semanticPackage.getProfile(lang);
      if (profile?.keywords) {
        for (const [engKey, translation] of Object.entries(profile.keywords)) {
          const trans = translation as { primary?: string; alternatives?: string[] };
          if (trans.primary) {
            cache.set(trans.primary.toLowerCase(), engKey);
          }
          if (trans.alternatives) {
            for (const alt of trans.alternatives) {
              cache.set(alt.toLowerCase(), engKey);
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

function normalizeToEnglish(word: string, _language: string): string {
  // If it's already an English keyword, return it
  const englishKeywords = [
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
    'focus',
    'blur',
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
  ];
  if (englishKeywords.includes(word)) return word;

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
    let searchText = text;
    let baseLineOffset = 0;
    let baseCharOffset = 0;

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
      searchText = text; // Search entire document for definitions
      baseLineOffset = 0;
      baseCharOffset = 0;
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

    // Normalize to English for pattern matching
    const engWord = normalizeToEnglish(targetWord.toLowerCase(), globalSettings.language);

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
      const lines = text.split('\n');

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
 * Helper: Get keyword variants for a given English keyword
 */
function getKeywordVariants(eng: string): string[] {
  const variants = [eng];
  if (!semanticPackage) return variants;

  const languagesToTry = ['es', 'ja', 'ko', 'de', 'fr', 'pt', 'zh', 'ar', 'tr', 'id'];
  for (const lang of languagesToTry) {
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

/**
 * Helper: Escape special regex characters
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Helper: Find line number within a region given a character offset
 */
function findLineInRegion(code: string, offset: number): number {
  let line = 0;
  for (let i = 0; i < offset && i < code.length; i++) {
    if (code[i] === '\n') line++;
  }
  return line;
}

/**
 * Helper: Find character position in line given a character offset
 */
function findCharInLine(code: string, offset: number): number {
  let lastNewline = -1;
  for (let i = 0; i < offset && i < code.length; i++) {
    if (code[i] === '\n') lastNewline = i;
  }
  return offset - lastNewline - 1;
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

    // Try AST-based formatting first
    if (parseFunction && astToolkit?.generate) {
      try {
        const ast = parseFunction(text);
        if (ast) {
          const formatted = astToolkit.generate(ast, { minify: false, indentation: indentStr });
          if (formatted && formatted.trim()) {
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
        }
      } catch (parseError) {
        connection.console.log(
          `[lokascript-ls] AST formatting failed, using fallback: ${parseError}`
        );
      }
    }

    // Fallback: Pattern-based formatting
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

/**
 * Simple pattern-based hyperscript formatter.
 * Handles indentation for blocks and normalizes whitespace.
 */
function formatHyperscript(code: string, indentStr: string = '  '): string {
  const lines = code.split('\n');
  const formattedLines: string[] = [];
  let indentLevel = 0;

  // Block-starting keywords that always increase indent (require matching 'end')
  const blockKeywords = /^(behavior|def|if|repeat|for|while)\b/i;
  // Keywords that decrease indent
  const dedentKeywords = /^(end|else)\b/i;
  // 'on' is special - only increases indent if it's a multiline declaration
  const onKeyword = /^on\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      formattedLines.push('');
      continue;
    }

    // Decrease indent for dedent keywords (before adding line)
    if (dedentKeywords.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Add the formatted line
    const indent = indentStr.repeat(indentLevel);
    formattedLines.push(indent + trimmed);

    // Increase indent for block keywords (after adding line)
    // But not if the line also contains 'end' (single-line blocks)
    if (blockKeywords.test(trimmed) && !/\bend\s*$/i.test(trimmed)) {
      indentLevel++;
    }

    // 'on' keyword: increase indent unless next non-empty line is 'end' or another 'on'
    // Single-line handlers like "on click toggle .active" followed by "end" or another handler
    // don't need extra indentation
    if (onKeyword.test(trimmed)) {
      const nextLine = findNextNonEmptyLine(lines, i + 1);
      // Only skip indent increase if next line is 'end' or another 'on' at same level
      if (nextLine && !/^(end|on)\b/i.test(nextLine)) {
        indentLevel++;
      }
    }

    // Special case: "else" increases indent after itself
    if (/^else\b/i.test(trimmed)) {
      indentLevel++;
    }
  }

  return formattedLines.join('\n');
}

/**
 * Find the next non-empty line starting from index
 */
function findNextNonEmptyLine(lines: string[], startIndex: number): string | null {
  for (let i = startIndex; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed) return trimmed;
  }
  return null;
}

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
