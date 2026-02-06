/**
 * Interchange-aware LSP Module
 *
 * Provides LSP server integration working directly with InterchangeNode.
 * This replaces the deprecated @lokascript/ast-toolkit LSP module, making
 * the language server parser-agnostic — both core and semantic parser output
 * can be converted to interchange and fed through these functions.
 *
 * Defines its own minimal LSP-compatible types so @lokascript/core has no
 * dependency on vscode-languageserver. The language server maps between these
 * and the real LSP types (which are structurally identical).
 */

import type {
  InterchangeNode,
  EventNode,
  CommandNode,
  IfNode,
  RepeatNode,
  ForEachNode,
  WhileNode,
} from './types';

// =============================================================================
// LSP-Compatible Types
// =============================================================================

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
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

// =============================================================================
// PRIMARY API
// =============================================================================

/**
 * Convert interchange AST nodes to LSP diagnostics.
 * Produces complexity warnings and structural issue diagnostics.
 */
export function interchangeToLSPDiagnostics(
  nodes: InterchangeNode[],
  options?: { source?: string; cyclomaticThreshold?: number; cognitiveThreshold?: number }
): Diagnostic[] {
  const source = options?.source ?? 'lokascript';
  const cyclomaticThreshold = options?.cyclomaticThreshold ?? 10;
  const cognitiveThreshold = options?.cognitiveThreshold ?? 15;
  const diagnostics: Diagnostic[] = [];

  for (const node of nodes) {
    const cyclomatic = calculateCyclomatic(node);
    const cognitive = calculateCognitive(node);
    const smells = detectSmells(node);

    // Code smell diagnostics
    for (const smell of smells) {
      diagnostics.push({
        range: nodeToRange(smell.node),
        severity: smell.severity,
        code: smell.code,
        source,
        message: smell.message,
      });
    }

    // Cyclomatic complexity warning
    if (cyclomatic > cyclomaticThreshold) {
      diagnostics.push({
        range: nodeToRange(node),
        severity: DiagnosticSeverity.Warning,
        code: 'high-cyclomatic-complexity',
        source,
        message: `High cyclomatic complexity: ${cyclomatic} (recommended: <= ${cyclomaticThreshold})`,
      });
    }

    // Cognitive complexity warning
    if (cognitive > cognitiveThreshold) {
      diagnostics.push({
        range: nodeToRange(node),
        severity: DiagnosticSeverity.Information,
        code: 'high-cognitive-complexity',
        source,
        message: `High cognitive complexity: ${cognitive} (recommended: <= ${cognitiveThreshold})`,
      });
    }
  }

  return diagnostics;
}

/**
 * Extract document symbols from interchange AST for outline view.
 */
export function interchangeToLSPSymbols(nodes: InterchangeNode[]): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];

  for (const node of nodes) {
    const symbol = nodeToSymbol(node);
    if (symbol) symbols.push(symbol);
  }

  return symbols;
}

/**
 * Generate hover information for the interchange node at a given position.
 */
export function interchangeToLSPHover(
  nodes: InterchangeNode[],
  position: Position
): HoverInfo | null {
  const node = findNodeAtPosition(nodes, position);
  if (!node) return null;

  let contents = `**${friendlyTypeName(node)}**\n\n`;

  switch (node.type) {
    case 'event':
      contents += `Event: \`${(node as EventNode).event}\`\n\n`;
      break;
    case 'command':
      contents += `Command: \`${(node as CommandNode).name}\`\n\n`;
      break;
    case 'if':
      contents += 'Conditional branch\n\n';
      break;
    case 'repeat':
    case 'foreach':
    case 'while':
      contents += 'Loop construct\n\n';
      break;
  }

  // Complexity for event/control-flow nodes
  if (['event', 'if', 'repeat', 'foreach', 'while'].includes(node.type)) {
    const cyclomatic = calculateCyclomatic(node);
    const cognitive = calculateCognitive(node);
    contents += `**Complexity:** cyclomatic ${cyclomatic}, cognitive ${cognitive}\n`;
  }

  return {
    contents,
    range: nodeToRange(node),
  };
}

/**
 * Generate context-aware completions at a given position.
 */
export function interchangeToLSPCompletions(
  nodes: InterchangeNode[],
  position: Position
): CompletionItem[] {
  const node = findNodeAtPosition(nodes, position);

  if (!node) {
    // Top-level completions
    return [
      { label: 'on', kind: CompletionItemKind.Keyword, detail: 'Event handler' },
      { label: 'init', kind: CompletionItemKind.Keyword, detail: 'Initialization' },
      { label: 'behavior', kind: CompletionItemKind.Keyword, detail: 'Behavior definition' },
      { label: 'def', kind: CompletionItemKind.Keyword, detail: 'Function definition' },
    ];
  }

  switch (node.type) {
    case 'event':
      return [
        { label: 'add', kind: CompletionItemKind.Method, detail: 'Add class/attribute' },
        { label: 'remove', kind: CompletionItemKind.Method, detail: 'Remove class/attribute' },
        { label: 'toggle', kind: CompletionItemKind.Method, detail: 'Toggle class/attribute' },
        { label: 'put', kind: CompletionItemKind.Method, detail: 'Set content/value' },
        { label: 'set', kind: CompletionItemKind.Method, detail: 'Set variable/property' },
        { label: 'fetch', kind: CompletionItemKind.Method, detail: 'HTTP request' },
        { label: 'if', kind: CompletionItemKind.Keyword, detail: 'Conditional' },
        { label: 'repeat', kind: CompletionItemKind.Keyword, detail: 'Loop' },
      ];
    case 'if':
      return [
        { label: 'then', kind: CompletionItemKind.Keyword, detail: 'Then clause' },
        { label: 'else', kind: CompletionItemKind.Keyword, detail: 'Else clause' },
        { label: 'end', kind: CompletionItemKind.Keyword, detail: 'End conditional' },
      ];
    case 'repeat':
    case 'foreach':
    case 'while':
      return [{ label: 'end', kind: CompletionItemKind.Keyword, detail: 'End loop' }];
    default:
      return [
        { label: 'me', kind: CompletionItemKind.Variable, detail: 'Current element' },
        { label: 'it', kind: CompletionItemKind.Variable, detail: 'Current context' },
        { label: 'you', kind: CompletionItemKind.Variable, detail: 'Event target' },
      ];
  }
}

// =============================================================================
// COMPLEXITY ANALYSIS (on interchange nodes directly)
// =============================================================================

/** Calculate cyclomatic complexity: 1 + number of decision points. */
export function calculateCyclomatic(node: InterchangeNode): number {
  let complexity = 1;

  walkInterchange(node, n => {
    if (isDecisionPoint(n)) complexity++;
  });

  return complexity;
}

/** Calculate cognitive complexity: decision points weighted by nesting depth. */
export function calculateCognitive(node: InterchangeNode): number {
  let complexity = 0;

  function walk(n: InterchangeNode, depth: number): void {
    const nests = isNestingConstruct(n);
    const newDepth = nests ? depth + 1 : depth;

    if (isDecisionPoint(n)) {
      complexity += 1 + depth;
    }

    for (const child of getChildren(n)) {
      walk(child, newDepth);
    }
  }

  walk(node, 0);
  return complexity;
}

// =============================================================================
// CODE SMELL DETECTION
// =============================================================================

interface SmellInfo {
  node: InterchangeNode;
  code: string;
  message: string;
  severity: DiagnosticSeverity;
}

function detectSmells(root: InterchangeNode): SmellInfo[] {
  const smells: SmellInfo[] = [];

  // Deep nesting check
  checkNesting(root, 0, smells);

  // Long event handler check
  if (root.type === 'event') {
    const body = (root as EventNode).body ?? [];
    if (body.length > 15) {
      smells.push({
        node: root,
        code: 'long-event-handler',
        message: `Event handler has ${body.length} commands (consider extracting behavior)`,
        severity: DiagnosticSeverity.Information,
      });
    }
  }

  return smells;
}

function checkNesting(node: InterchangeNode, depth: number, smells: SmellInfo[]): void {
  if (depth > 4 && isNestingConstruct(node)) {
    smells.push({
      node,
      code: 'deep-nesting',
      message: `Deeply nested ${node.type} (depth ${depth}, recommended: <= 4)`,
      severity: DiagnosticSeverity.Warning,
    });
  }

  const children = getChildren(node);
  const newDepth = isNestingConstruct(node) ? depth + 1 : depth;
  for (const child of children) {
    checkNesting(child, newDepth, smells);
  }
}

// =============================================================================
// TREE WALKING UTILITIES
// =============================================================================

/** Visit every node in an interchange tree. */
function walkInterchange(node: InterchangeNode, visitor: (n: InterchangeNode) => void): void {
  visitor(node);
  for (const child of getChildren(node)) {
    walkInterchange(child, visitor);
  }
}

/** Get all direct child interchange nodes. */
function getChildren(node: InterchangeNode): InterchangeNode[] {
  const children: InterchangeNode[] = [];

  switch (node.type) {
    case 'event': {
      const e = node as EventNode;
      if (e.body) children.push(...e.body);
      if (e.target) children.push(e.target);
      break;
    }
    case 'command': {
      const c = node as CommandNode;
      if (c.args) children.push(...c.args);
      if (c.target) children.push(c.target);
      break;
    }
    case 'if': {
      const i = node as IfNode;
      children.push(i.condition);
      children.push(...i.thenBranch);
      if (i.elseBranch) children.push(...i.elseBranch);
      if (i.elseIfBranches) {
        for (const branch of i.elseIfBranches) {
          children.push(branch.condition);
          children.push(...branch.body);
        }
      }
      break;
    }
    case 'repeat': {
      const r = node as RepeatNode;
      if (r.count && typeof r.count !== 'number') children.push(r.count);
      if (r.whileCondition) children.push(r.whileCondition);
      children.push(...r.body);
      break;
    }
    case 'foreach': {
      const f = node as ForEachNode;
      children.push(f.collection);
      children.push(...f.body);
      break;
    }
    case 'while': {
      const w = node as WhileNode;
      children.push(w.condition);
      children.push(...w.body);
      break;
    }
    case 'binary':
      children.push((node as any).left, (node as any).right);
      break;
    case 'unary':
      children.push((node as any).operand);
      break;
    case 'member':
      children.push((node as any).object);
      if (typeof (node as any).property !== 'string') children.push((node as any).property);
      break;
    case 'possessive':
      children.push((node as any).object);
      break;
    case 'call':
      children.push((node as any).callee);
      if ((node as any).args) children.push(...(node as any).args);
      break;
  }

  return children;
}

function isDecisionPoint(node: InterchangeNode): boolean {
  return node.type === 'if' || node.type === 'while' || node.type === 'foreach';
}

function isNestingConstruct(node: InterchangeNode): boolean {
  return (
    node.type === 'if' ||
    node.type === 'repeat' ||
    node.type === 'foreach' ||
    node.type === 'while' ||
    node.type === 'event'
  );
}

// =============================================================================
// POSITION & RANGE HELPERS
// =============================================================================

function nodeToRange(node: InterchangeNode): Range {
  const startLine = (node.line ?? 1) - 1; // LSP is 0-based, interchange is 1-based
  const startChar = node.column ?? 0;

  if (node.end !== undefined && node.start !== undefined) {
    const length = node.end - node.start;
    return {
      start: { line: startLine, character: startChar },
      end: { line: startLine, character: startChar + length },
    };
  }

  const estimatedLength = estimateLength(node);
  return {
    start: { line: startLine, character: startChar },
    end: { line: startLine, character: startChar + estimatedLength },
  };
}

function estimateLength(node: InterchangeNode): number {
  switch (node.type) {
    case 'event':
      return 3 + ((node as EventNode).event?.length ?? 5); // "on click"
    case 'command':
      return (node as CommandNode).name?.length ?? 5;
    case 'selector':
      return ((node as any).value?.length ?? 5) + 1;
    case 'identifier':
      return (node as any).value?.length ?? 2;
    case 'literal':
      return String((node as any).value ?? '').length + 2;
    default:
      return 10;
  }
}

function findNodeAtPosition(nodes: InterchangeNode[], position: Position): InterchangeNode | null {
  const targetLine = position.line + 1; // LSP 0-based → interchange 1-based
  const targetChar = position.character;

  let best: InterchangeNode | null = null;
  let bestSize = Infinity;

  for (const root of nodes) {
    walkInterchange(root, node => {
      const nodeLine = node.line ?? 1;
      if (nodeLine !== targetLine) return;

      const nodeStart = node.column ?? 0;
      let nodeEnd: number;
      if (node.end !== undefined && node.start !== undefined) {
        nodeEnd = nodeStart + (node.end - node.start);
      } else {
        nodeEnd = nodeStart + estimateLength(node);
      }

      if (targetChar >= nodeStart && targetChar <= nodeEnd) {
        const size = nodeEnd - nodeStart;
        // Prefer smaller (more specific) nodes
        if (size < bestSize) {
          best = node;
          bestSize = size;
        }
      }
    });
  }

  // Fallback: find closest node on same line
  if (!best) {
    for (const root of nodes) {
      walkInterchange(root, node => {
        if ((node.line ?? 1) === targetLine) {
          const priority = getNodePriority(node.type);
          if (!best || priority > getNodePriority(best.type)) {
            best = node;
          }
        }
      });
    }
  }

  return best;
}

function getNodePriority(type: string): number {
  switch (type) {
    case 'event':
      return 3;
    case 'command':
      return 2;
    case 'if':
      return 2;
    case 'selector':
      return 1;
    case 'identifier':
      return 1;
    default:
      return 0;
  }
}

function friendlyTypeName(node: InterchangeNode): string {
  switch (node.type) {
    case 'event':
      return 'Event Handler';
    case 'command':
      return `Command (${(node as CommandNode).name})`;
    case 'if':
      return 'Conditional';
    case 'repeat':
      return 'Repeat Loop';
    case 'foreach':
      return 'For Each Loop';
    case 'while':
      return 'While Loop';
    case 'binary':
      return `Binary Expression (${(node as any).operator})`;
    case 'unary':
      return `Unary Expression (${(node as any).operator})`;
    case 'literal':
      return 'Literal';
    case 'identifier':
      return 'Identifier';
    case 'selector':
      return 'CSS Selector';
    case 'variable':
      return 'Variable';
    case 'member':
      return 'Member Access';
    case 'possessive':
      return 'Possessive Expression';
    case 'call':
      return 'Function Call';
    default:
      return node.type;
  }
}

// =============================================================================
// SYMBOL EXTRACTION HELPERS
// =============================================================================

function nodeToSymbol(node: InterchangeNode): DocumentSymbol | null {
  switch (node.type) {
    case 'event': {
      const e = node as EventNode;
      const range = nodeToRange(node);
      return {
        name: `on ${e.event}`,
        detail: 'Event Handler',
        kind: SymbolKind.Event,
        range,
        selectionRange: range,
        children: extractBodySymbols(e.body ?? []),
      };
    }
    case 'command': {
      const c = node as CommandNode;
      const range = nodeToRange(node);
      return {
        name: c.name,
        detail: 'Command',
        kind: SymbolKind.Method,
        range,
        selectionRange: range,
      };
    }
    case 'if': {
      const range = nodeToRange(node);
      return {
        name: 'if',
        detail: 'Conditional',
        kind: SymbolKind.Struct,
        range,
        selectionRange: range,
        children: extractBodySymbols((node as IfNode).thenBranch),
      };
    }
    case 'repeat': {
      const range = nodeToRange(node);
      return {
        name: 'repeat',
        detail: 'Loop',
        kind: SymbolKind.Enum,
        range,
        selectionRange: range,
        children: extractBodySymbols((node as RepeatNode).body),
      };
    }
    case 'foreach': {
      const f = node as ForEachNode;
      const range = nodeToRange(node);
      return {
        name: `for each ${f.itemName}`,
        detail: 'Loop',
        kind: SymbolKind.Enum,
        range,
        selectionRange: range,
        children: extractBodySymbols(f.body),
      };
    }
    case 'while': {
      const range = nodeToRange(node);
      return {
        name: 'while',
        detail: 'Loop',
        kind: SymbolKind.Enum,
        range,
        selectionRange: range,
        children: extractBodySymbols((node as WhileNode).body),
      };
    }
    default:
      return null;
  }
}

function extractBodySymbols(body: InterchangeNode[]): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];
  for (const node of body) {
    const symbol = nodeToSymbol(node);
    if (symbol) symbols.push(symbol);
  }
  return symbols;
}
