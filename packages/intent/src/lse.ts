/**
 * @lokascript/intent/lse
 *
 * The LSE codec on its own: bracket syntax and protocol JSON for commands and
 * simple handlers. The package root exports all of this too; this entry is for
 * a consumer that wants the codec without the schema vocabulary.
 */

// Bracket syntax
export {
  STRUCTURAL_ROLES,
  parseExplicit,
  isExplicitSyntax,
  parseCompound,
  isCompoundSyntax,
} from './ir/parser';
export { renderExplicit } from './ir/renderer';

// Protocol JSON
export { toProtocolJSON, fromProtocolJSON, validateProtocolJSON } from './ir/protocol';

// What the encodings cannot carry
export { LossyEncodingError, findUnencodable } from './ir/encodable';
export type { EncodeOptions, EncodingSurface } from './ir/encodable';

// References a bare word may name
export { DEFAULT_REFERENCES, isValidReference } from './ir/references';

export type {
  SchemaLookup,
  ParseExplicitOptions,
  IRDiagnostic,
  ProtocolNodeKind,
  ProtocolChainType,
  ProtocolValueJSON,
  ProtocolNodeJSON,
  ProtocolCommandJSON,
  ProtocolEventHandlerJSON,
  ProtocolCompoundJSON,
  ProtocolDiagnosticJSON,
  AnnotationJSON,
} from './ir/types';
