/**
 * @lokascript/intent
 *
 * Universal UI intent protocol — LSE (LokaScript Explicit) types, bracket
 * syntax parsing/rendering, and protocol JSON serialization.
 *
 * Zero dependencies. Framework-agnostic. Usable from any JS/TS project.
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
  AsyncVariant,
  MatchArm,
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
  LSEEnvelope,
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
  createTryNode,
  createAsyncNode,
  createMatchNode,
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

// Schema-driven role inference
export type { ValueAdapter } from './inference/infer-roles';
export { inferRolesFromSchema } from './inference/infer-roles';

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
  MatchArmJSON,
  LSEEnvelopeJSON,
} from './ir/types';

// IR: bracket syntax parser
export {
  STRUCTURAL_ROLES,
  parseExplicit,
  isExplicitSyntax,
  parseCompound,
  parseDocument,
  isCompoundSyntax,
  isDocumentSyntax,
} from './ir/parser';

// IR: bracket syntax renderer
export { renderExplicit, renderDocument } from './ir/renderer';

// IR: protocol JSON serialization
export {
  toProtocolJSON,
  fromProtocolJSON,
  validateProtocolJSON,
  toEnvelopeJSON,
  fromEnvelopeJSON,
  isEnvelope,
} from './ir/protocol';
