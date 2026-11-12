/**
 * @lokascript/intent
 *
 * LSE (LokaScript Explicit Syntax): role-labeled node types, bracket syntax
 * parsing/rendering, and protocol JSON serialization.
 *
 * Scope: commands and simple handlers, not whole hyperscript programs. The
 * writers refuse a node outside it (LossyEncodingError); see protocol/README.md.
 *
 * Zero dependencies. Usable from any JS/TS project.
 *
 * @example
 * ```typescript
 * import { parseExplicit, toProtocolJSON, fromProtocolJSON } from '@lokascript/intent';
 *
 * // Parse bracket syntax
 * const node = parseExplicit('[toggle patient:.active destination:#button]');
 *
 * // Serialize to wire format
 * const json = toProtocolJSON(node);
 *
 * // Deserialize from wire format
 * const restored = fromProtocolJSON(json);
 * ```
 */

// Core semantic types
export type {
  ActionType,
  SemanticRole,
  SemanticValue,
  ExpectedType,
  LiteralValue,
  SelectorValue,
  ReferenceValue,
  PropertyPathValue,
  ExpressionValue,
  FlagValue,
  Annotation,
  ProtocolDiagnostic,
  SemanticNode,
  SemanticMetadata,
  SourcePosition,
  CommandSemanticNode,
  EventHandlerSemanticNode,
  EventModifiers,
  ConditionalSemanticNode,
  CompoundSemanticNode,
  LoopVariant,
  LoopSemanticNode,
} from './types';

// Factory functions
export {
  createLiteral,
  createSelector,
  createReference,
  createPropertyPath,
  createExpression,
  createFlag,
  createCommandNode,
  createEventHandlerNode,
  createConditionalNode,
  createCompoundNode,
  createLoopNode,
  extractValue,
  extractRoleValue,
  getRoleValue,
} from './types';

// Diagnostic types and utilities
export type {
  DiagnosticSeverity,
  Diagnostic,
  DiagnosticResult,
  DiagnosticSummary,
  DiagnosticCollector,
  DiagnosticOptions,
} from './diagnostics';
export { createDiagnosticCollector, fromError, filterBySeverity } from './diagnostics';

// Schema types
export type { CommandSchema, RoleSpec } from './schema';
export { defineCommand, defineRole, getRoleSpec } from './schema';

// IR: references
export { DEFAULT_REFERENCES, isValidReference } from './ir/references';

// IR: types (wire format, parse options)
export type {
  SemanticJSON,
  SemanticJSONValue,
  SchemaLookup,
  ParseExplicitOptions,
  IRDiagnostic,
  ProtocolNodeKind,
  ProtocolChainType,
  ProtocolValueJSON,
  ProtocolNodeJSON,
  ProtocolDiagnosticJSON,
  AnnotationJSON,
} from './ir/types';

// IR: bracket syntax parser
export {
  STRUCTURAL_ROLES,
  parseExplicit,
  isExplicitSyntax,
  parseCompound,
  isCompoundSyntax,
} from './ir/parser';

// IR: bracket syntax renderer
export { renderExplicit } from './ir/renderer';

// IR: what the encodings cannot carry
export { LossyEncodingError, findUnencodable } from './ir/encodable';
export type { EncodeOptions, EncodingSurface } from './ir/encodable';

// IR: protocol JSON serialization
export { toProtocolJSON, fromProtocolJSON, validateProtocolJSON } from './ir/protocol';
