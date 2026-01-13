/**
 * LSP Integration Module for AST Toolkit
 * Provides LSP server integration using existing reference data and infrastructure
 */

import { findNodes, calculateComplexity, analyzeMetrics, detectCodeSmells } from '../index.js';
import type { ASTNode, ComplexityMetrics, CodeSmell, AnalysisResult } from '../types.js';

// ============================================================================
// LSP Types (Compatible with reference implementation)
// ============================================================================

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface TextDocumentIdentifier {
  uri: string;
}

export interface Diagnostic {
  range: Range;
  severity?: DiagnosticSeverity;
  code?: string | number;
  source?: string;
  message: string;
}

export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

export interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: SymbolKind;
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}

export enum SymbolKind {
  File = 1,
  Module = 2,
  Namespace = 3,
  Package = 4,
  Class = 5,
  Method = 6,
  Property = 7,
  Field = 8,
  Constructor = 9,
  Enum = 10,
  Interface = 11,
  Function = 12,
  Variable = 13,
  Constant = 14,
  String = 15,
  Number = 16,
  Boolean = 17,
  Array = 18,
  Object = 19,
  Key = 20,
  Null = 21,
  EnumMember = 22,
  Struct = 23,
  Event = 24,
  Operator = 25,
  TypeParameter = 26,
}

export interface CompletionItem {
  label: string;
  kind?: CompletionItemKind;
  detail?: string;
  documentation?: string;
  insertText?: string;
  sortText?: string;
}

export enum CompletionItemKind {
  Text = 1,
  Method = 2,
  Function = 3,
  Constructor = 4,
  Field = 5,
  Variable = 6,
  Class = 7,
  Interface = 8,
  Module = 9,
  Property = 10,
  Unit = 11,
  Value = 12,
  Enum = 13,
  Keyword = 14,
  Snippet = 15,
  Color = 16,
  File = 17,
  Reference = 18,
  Folder = 19,
  EnumMember = 20,
  Constant = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25,
}

export interface HoverInfo {
  contents: string;
  range?: Range;
}

// ============================================================================
// AST-to-LSP Integration Functions
// ============================================================================

/**
 * Convert AST analysis results to LSP diagnostics
 */
export function astToLSPDiagnostics(ast: ASTNode): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Get complexity analysis
  const complexity = calculateComplexity(ast);
  const smells = detectCodeSmells(ast);

  // Convert code smells to diagnostics
  for (const smell of smells) {
    if (smell.location.line !== undefined && smell.location.column !== undefined) {
      diagnostics.push({
        range: {
          start: { line: smell.location.line - 1, character: smell.location.column - 1 },
          end: { line: smell.location.line - 1, character: smell.location.column + 10 },
        },
        severity: mapSmellSeverityToLSP(smell.severity),
        code: smell.type,
        source: 'hyperscript-ast-toolkit',
        message: smell.message,
      });
    }
  }

  // Add complexity warnings
  if (complexity.cyclomatic > 10 && ast.line !== undefined && ast.column !== undefined) {
    diagnostics.push({
      range: {
        start: { line: ast.line - 1, character: ast.column - 1 },
        end: { line: ast.line - 1, character: ast.column + 10 },
      },
      severity: DiagnosticSeverity.Warning,
      code: 'high-cyclomatic-complexity',
      source: 'hyperscript-ast-toolkit',
      message: `High cyclomatic complexity: ${complexity.cyclomatic} (recommended: <= 10)`,
    });
  }

  if (complexity.cognitive > 15 && ast.line !== undefined && ast.column !== undefined) {
    diagnostics.push({
      range: {
        start: { line: ast.line - 1, character: ast.column - 1 },
        end: { line: ast.line - 1, character: ast.column + 10 },
      },
      severity: DiagnosticSeverity.Information,
      code: 'high-cognitive-complexity',
      source: 'hyperscript-ast-toolkit',
      message: `High cognitive complexity: ${complexity.cognitive} (recommended: <= 15)`,
    });
  }

  return diagnostics;
}

/**
 * Extract document symbols from AST for outline view
 */
export function astToLSPSymbols(ast: ASTNode): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];

  // Find event handlers
  const eventHandlers = findNodes(ast, node => node.type === 'eventHandler');
  for (const handler of eventHandlers) {
    const handlerData = handler as any;
    symbols.push({
      name: `on ${handlerData.event}${handlerData.selector ? ` (${handlerData.selector})` : ''}`,
      detail: 'Event Handler',
      kind: SymbolKind.Event,
      range: nodeToRange(handler),
      selectionRange: nodeToRange(handler),
      children: extractCommandSymbols(handlerData.commands || []),
    });
  }

  // Find behaviors
  const behaviors = findNodes(ast, node => node.type === 'behavior');
  for (const behavior of behaviors) {
    const behaviorData = behavior as any;
    symbols.push({
      name: `behavior ${behaviorData.name || 'anonymous'}`,
      detail: 'Behavior Definition',
      kind: SymbolKind.Class,
      range: nodeToRange(behavior),
      selectionRange: nodeToRange(behavior),
    });
  }

  // Find function definitions
  const functions = findNodes(ast, node => node.type === 'function' || node.type === 'def');
  for (const func of functions) {
    const funcData = func as any;
    symbols.push({
      name: `def ${funcData.name || 'anonymous'}`,
      detail: 'Function Definition',
      kind: SymbolKind.Function,
      range: nodeToRange(func),
      selectionRange: nodeToRange(func),
    });
  }

  return symbols;
}

/**
 * Generate completion items based on AST context
 */
export function astToLSPCompletions(ast: ASTNode, position: Position): CompletionItem[] {
  const completions: CompletionItem[] = [];

  // Find the node at the current position
  const nodeAtPosition = findNodeAtPosition(ast, position);

  if (!nodeAtPosition) {
    // Default completions for top-level context
    completions.push(
      { label: 'on', kind: CompletionItemKind.Keyword, detail: 'Event handler' },
      { label: 'init', kind: CompletionItemKind.Keyword, detail: 'Initialization' },
      { label: 'behavior', kind: CompletionItemKind.Keyword, detail: 'Behavior definition' },
      { label: 'def', kind: CompletionItemKind.Keyword, detail: 'Function definition' }
    );
  } else {
    // Context-aware completions based on the current node
    completions.push(...getContextualCompletions(nodeAtPosition));

    // Always include default completions as fallback
    if (completions.length === 0) {
      completions.push(
        { label: 'on', kind: CompletionItemKind.Keyword, detail: 'Event handler' },
        { label: 'init', kind: CompletionItemKind.Keyword, detail: 'Initialization' },
        { label: 'behavior', kind: CompletionItemKind.Keyword, detail: 'Behavior definition' },
        { label: 'def', kind: CompletionItemKind.Keyword, detail: 'Function definition' }
      );
    }
  }

  return completions;
}

/**
 * Generate hover information for AST nodes
 */
export function astToLSPHover(ast: ASTNode, position: Position): HoverInfo | null {
  const nodeAtPosition = findNodeAtPosition(ast, position);

  if (!nodeAtPosition) {
    return null;
  }

  const analysis = analyzeMetrics(nodeAtPosition);

  let contents = `**${nodeAtPosition.type}**\n\n`;

  // Add node-specific information
  if (nodeAtPosition.type === 'command') {
    const cmdData = nodeAtPosition as any;
    contents += `Command: \`${cmdData.name}\`\n\n`;
  } else if (nodeAtPosition.type === 'eventHandler') {
    const handlerData = nodeAtPosition as any;
    contents += `Event: \`${handlerData.event}\`\n`;
    if (handlerData.selector) {
      contents += `Selector: \`${handlerData.selector}\`\n`;
    }
    contents += '\n';
  }

  // Add complexity metrics
  contents += `**Complexity Metrics:**\n`;
  contents += `- Cyclomatic: ${analysis.complexity.cyclomatic}\n`;
  contents += `- Cognitive: ${analysis.complexity.cognitive}\n`;
  contents += `- Maintainability Index: ${analysis.maintainabilityIndex.toFixed(1)}\n\n`;

  // Add code smells if any
  if (analysis.smells.length > 0) {
    contents += `**Code Issues:**\n`;
    for (const smell of analysis.smells.slice(0, 3)) {
      // Show first 3 smells
      contents += `- ${smell.message}\n`;
    }
  }

  return {
    contents,
    range: nodeToRange(nodeAtPosition),
  };
}

// ============================================================================
// LSP Integration with Reference Server
// ============================================================================

/**
 * Create AST-enhanced LSP handlers that can be integrated with the reference server
 */
export function createASTEnhancedLSPHandlers(referenceHandlers: any) {
  return {
    ...referenceHandlers,

    async provideCompletions(params: any) {
      // Get completions from reference server
      const referenceCompletions = (await referenceHandlers.provideCompletions?.(params)) || [];

      // Add AST-based completions if we have an AST for this document
      const ast = getDocumentAST(params.textDocument.uri);
      if (ast) {
        const astCompletions = astToLSPCompletions(ast, params.position);
        return [...referenceCompletions, ...astCompletions];
      }

      return referenceCompletions;
    },

    async provideHover(params: any) {
      // Get hover from reference server first
      const referenceHover = await referenceHandlers.provideHover?.(params);

      // Enhance with AST information
      const ast = getDocumentAST(params.textDocument.uri);
      if (ast) {
        const astHover = astToLSPHover(ast, params.position);
        if (astHover) {
          if (referenceHover) {
            // Combine both hover contents
            return {
              contents: `${referenceHover.contents}\n\n---\n\n${astHover.contents}`,
              range: astHover.range,
            };
          } else {
            return astHover;
          }
        }
      }

      return referenceHover;
    },

    async provideDiagnostics(params: any) {
      // Get diagnostics from reference server
      const referenceDiagnostics = (await referenceHandlers.provideDiagnostics?.(params)) || [];

      // Add AST-based diagnostics
      const ast = getDocumentAST(params.textDocument.uri);
      if (ast) {
        const astDiagnostics = astToLSPDiagnostics(ast);
        return [...referenceDiagnostics, ...astDiagnostics];
      }

      return referenceDiagnostics;
    },

    async provideDocumentSymbols(params: any) {
      // Get symbols from reference server
      const referenceSymbols = (await referenceHandlers.provideDocumentSymbols?.(params)) || [];

      // Add AST-based symbols
      const ast = getDocumentAST(params.textDocument.uri);
      if (ast) {
        const astSymbols = astToLSPSymbols(ast);
        return [...referenceSymbols, ...astSymbols];
      }

      return referenceSymbols;
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapSmellSeverityToLSP(severity: string): DiagnosticSeverity {
  switch (severity) {
    case 'high':
      return DiagnosticSeverity.Error;
    case 'medium':
      return DiagnosticSeverity.Warning;
    case 'low':
      return DiagnosticSeverity.Information;
    default:
      return DiagnosticSeverity.Hint;
  }
}

function nodeToRange(node: ASTNode): Range {
  const startLine = (node.line ?? 1) - 1;
  const startChar = node.column ?? 0;

  // Use actual end position when available (parser provides start/end offsets)
  if (node.end !== undefined && node.start !== undefined) {
    const length = node.end - node.start;
    return {
      start: { line: startLine, character: startChar },
      end: { line: startLine, character: startChar + length },
    };
  }

  // Fallback: use raw text length if available
  if ((node as any).raw && typeof (node as any).raw === 'string') {
    return {
      start: { line: startLine, character: startChar },
      end: { line: startLine, character: startChar + (node as any).raw.length },
    };
  }

  // Last resort: estimate based on node type
  const estimatedLength = estimateNodeLength(node);
  return {
    start: { line: startLine, character: startChar },
    end: { line: startLine, character: startChar + estimatedLength },
  };
}

function estimateNodeLength(node: ASTNode): number {
  const data = node as any;
  switch (node.type) {
    case 'selector':
      return (data.value?.length ?? 5) + 1;
    case 'command':
      return (data.name?.length ?? 5) + 10;
    case 'identifier':
      return data.name?.length ?? 2;
    case 'literal':
      return String(data.value ?? '').length + 2; // +2 for quotes
    case 'eventHandler':
      return 20; // "on click" etc.
    case 'behavior':
      return 15 + (data.name?.length ?? 5);
    default:
      return 10;
  }
}

function extractCommandSymbols(commands: any[]): DocumentSymbol[] {
  return commands.map(cmd => ({
    name: cmd.name || 'unknown',
    detail: 'Command',
    kind: SymbolKind.Method,
    range: nodeToRange(cmd),
    selectionRange: nodeToRange(cmd),
  }));
}

function findNodeAtPosition(ast: ASTNode, position: Position): ASTNode | null {
  const targetLine = position.line + 1; // LSP is 0-based, AST is 1-based
  const targetChar = position.character; // Both use 0-based column

  // Find nodes that contain the target position using actual boundaries
  const containingNodes = findNodes(ast, node => {
    if (node.line !== targetLine) return false;

    const nodeStart = node.column ?? 0;

    // Calculate node end position
    let nodeEnd: number;
    if (node.end !== undefined && node.start !== undefined) {
      nodeEnd = nodeStart + (node.end - node.start);
    } else if ((node as any).raw) {
      nodeEnd = nodeStart + (node as any).raw.length;
    } else {
      nodeEnd = nodeStart + estimateNodeLength(node);
    }

    return targetChar >= nodeStart && targetChar <= nodeEnd;
  });

  if (containingNodes.length === 0) {
    // Fallback: find closest node on the same line
    const lineNodes = findNodes(ast, node => node.line === targetLine);
    if (lineNodes.length > 0) {
      // Prefer meaningful node types
      const priorityNodes = lineNodes.filter(node =>
        ['eventHandler', 'command', 'conditional', 'behavior', 'def'].includes(node.type)
      );
      return priorityNodes[0] ?? lineNodes[0] ?? null;
    }
    return null;
  }

  // Return the most specific (smallest) node containing the position
  return containingNodes.reduce<ASTNode | null>((best, current) => {
    if (!best) return current;

    // Calculate sizes for comparison
    const currentSize = getNodeSize(current);
    const bestSize = getNodeSize(best);

    // Prefer smaller (more specific) nodes
    if (currentSize < bestSize) return current;
    if (bestSize < currentSize) return best;

    // If same size, prefer higher-priority node types
    const currentPriority = getNodePriority(current.type);
    const bestPriority = getNodePriority(best.type);

    return currentPriority >= bestPriority ? current : best;
  }, null);
}

function getNodeSize(node: ASTNode): number {
  if (node.end !== undefined && node.start !== undefined) {
    return node.end - node.start;
  }
  if ((node as any).raw) {
    return (node as any).raw.length;
  }
  return estimateNodeLength(node);
}

function getNodePriority(nodeType: string): number {
  switch (nodeType) {
    case 'eventHandler':
      return 3;
    case 'command':
      return 2;
    case 'conditional':
      return 2;
    case 'selector':
      return 1;
    case 'identifier':
      return 1;
    default:
      return 0;
  }
}

function getContextualCompletions(node: ASTNode): CompletionItem[] {
  const completions: CompletionItem[] = [];

  switch (node.type) {
    case 'eventHandler':
      completions.push(
        { label: 'add', kind: CompletionItemKind.Method, detail: 'Add class/attribute' },
        { label: 'remove', kind: CompletionItemKind.Method, detail: 'Remove class/attribute' },
        { label: 'toggle', kind: CompletionItemKind.Method, detail: 'Toggle class/attribute' },
        { label: 'put', kind: CompletionItemKind.Method, detail: 'Set content/value' },
        { label: 'fetch', kind: CompletionItemKind.Method, detail: 'HTTP request' },
        { label: 'if', kind: CompletionItemKind.Keyword, detail: 'Conditional' }
      );
      break;

    case 'conditional':
      completions.push(
        { label: 'then', kind: CompletionItemKind.Keyword, detail: 'Then clause' },
        { label: 'else', kind: CompletionItemKind.Keyword, detail: 'Else clause' },
        { label: 'end', kind: CompletionItemKind.Keyword, detail: 'End conditional' }
      );
      break;

    default:
      // Default command completions
      completions.push(
        { label: 'me', kind: CompletionItemKind.Variable, detail: 'Current element' },
        { label: 'it', kind: CompletionItemKind.Variable, detail: 'Current context' },
        { label: 'you', kind: CompletionItemKind.Variable, detail: 'Event target' }
      );
  }

  return completions;
}

// Document AST storage class for instance-based management
class DocumentASTStorage {
  private documentASTs = new Map<string, ASTNode>();

  getDocumentAST(uri: string): ASTNode | null {
    return this.documentASTs.get(uri) || null;
  }

  setDocumentAST(uri: string, ast: ASTNode): void {
    this.documentASTs.set(uri, ast);
  }

  clearDocumentAST(uri: string): void {
    this.documentASTs.delete(uri);
  }

  clear(): void {
    this.documentASTs.clear();
  }
}

// Global fallback storage for backward compatibility
const globalStorage = new DocumentASTStorage();

function getDocumentAST(uri: string): ASTNode | null {
  return globalStorage.getDocumentAST(uri);
}

export function setDocumentAST(uri: string, ast: ASTNode): void {
  globalStorage.setDocumentAST(uri, ast);
}

export function clearDocumentAST(uri: string): void {
  globalStorage.clearDocumentAST(uri);
}

// ============================================================================
// Integration Configuration
// ============================================================================

export interface LSPIntegrationConfig {
  enableDiagnostics?: boolean;
  enableCompletions?: boolean;
  enableHover?: boolean;
  enableSymbols?: boolean;
  complexityThresholds?: {
    cyclomatic: number;
    cognitive: number;
  };
}

export const DEFAULT_LSP_CONFIG: LSPIntegrationConfig = {
  enableDiagnostics: true,
  enableCompletions: true,
  enableHover: true,
  enableSymbols: true,
  complexityThresholds: {
    cyclomatic: 10,
    cognitive: 15,
  },
};

export function createLSPIntegration(config: LSPIntegrationConfig = DEFAULT_LSP_CONFIG) {
  const storage = new DocumentASTStorage();

  return {
    config,
    astToLSPDiagnostics: config.enableDiagnostics ? astToLSPDiagnostics : () => [],
    astToLSPCompletions: config.enableCompletions ? astToLSPCompletions : () => [],
    astToLSPHover: config.enableHover ? astToLSPHover : () => null,
    astToLSPSymbols: config.enableSymbols ? astToLSPSymbols : () => [],
    createASTEnhancedLSPHandlers,
    setDocumentAST: (uri: string, ast: ASTNode) => storage.setDocumentAST(uri, ast),
    clearDocumentAST: (uri: string) => storage.clearDocumentAST(uri),
    getDocumentAST: (uri: string) => storage.getDocumentAST(uri),
    clearAllDocuments: () => storage.clear(),
  };
}
