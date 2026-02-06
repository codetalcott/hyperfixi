/**
 * AST Interchange Format
 *
 * Shared AST types and converters for tools that consume parser output.
 */

export type {
  InterchangeNode,
  BaseNode,
  EventNode,
  CommandNode,
  LiteralNode,
  IdentifierNode,
  SelectorNode,
  VariableNode,
  BinaryNode,
  UnaryNode,
  MemberNode,
  PossessiveNode,
  CallNode,
  IfNode,
  RepeatNode,
  ForEachNode,
  WhileNode,
  PositionalNode,
  EventModifiers,
} from './types';

export { fromCoreAST } from './from-core';
export { toCoreAST } from './to-core';

// LSP integration
export {
  interchangeToLSPDiagnostics,
  interchangeToLSPSymbols,
  interchangeToLSPHover,
  interchangeToLSPCompletions,
  calculateCyclomatic,
  calculateCognitive,
} from './lsp';

export type {
  Position as LSPPosition,
  Range as LSPRange,
  Diagnostic as LSPDiagnostic,
  DiagnosticSeverity as LSPDiagnosticSeverity,
  DocumentSymbol as LSPDocumentSymbol,
  SymbolKind as LSPSymbolKind,
  CompletionItem as LSPCompletionItem,
  CompletionItemKind as LSPCompletionItemKind,
  HoverInfo as LSPHoverInfo,
} from './lsp';
