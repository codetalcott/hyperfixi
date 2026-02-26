/**
 * IR (Intermediate Representation)
 *
 * Universal explicit bracket syntax for semantic DSL interchange.
 * Domain-agnostic — works for any DSL built on the framework.
 *
 * Three input formats converge on SemanticNode:
 *   1. Bracket syntax:  [toggle patient:.active destination:#button]
 *   2. LLM JSON:        { action: "toggle", roles: { patient: { type: "selector", value: ".active" } } }
 *   3. Natural language: (handled by language-specific parsers, not this module)
 *
 * @example
 * ```typescript
 * import { parseExplicit, renderExplicit, jsonToSemanticNode } from '@lokascript/framework/ir';
 *
 * const node = parseExplicit('[toggle patient:.active]');
 * const bracket = renderExplicit(node);   // "[toggle patient:.active]"
 * const json = semanticNodeToJSON(node);  // { action: "toggle", roles: { ... } }
 * ```
 */

// Types
export type {
  SemanticJSON,
  SemanticJSONValue,
  SchemaLookup,
  ParseExplicitOptions,
  IRDiagnostic,
} from './types';

// References
export { DEFAULT_REFERENCES, isValidReference } from './references';

// Explicit syntax parser
export { parseExplicit, isExplicitSyntax } from './explicit-parser';

// Explicit syntax renderer
export { renderExplicit } from './explicit-renderer';

// JSON schema conversion (deprecated — use fromProtocolJSON/validateProtocolJSON/toProtocolJSON)
export { jsonToSemanticNode, validateSemanticJSON, semanticNodeToJSON } from './json-schema';

// Protocol full-fidelity wire format
export type {
  ProtocolNodeJSON,
  ProtocolValueJSON,
  ProtocolNodeKind,
  ProtocolChainType,
  // v1.2 sub-types
  ProtocolDiagnosticJSON,
  AnnotationJSON,
  MatchArmJSON,
  LSEEnvelopeJSON,
} from './types';
export {
  toProtocolJSON,
  fromProtocolJSON,
  validateProtocolJSON,
  // v1.2 envelope
  toEnvelopeJSON,
  fromEnvelopeJSON,
  isEnvelope,
} from './protocol-json';

// Interchange AST → SemanticNode converter
export { fromInterchangeNode, convertValue, renderExpr } from './from-interchange';
