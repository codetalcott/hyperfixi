/**
 * LSE (LokaScript Explicit Syntax) bridge
 *
 * Connects core to framework's LSE IR module via optional peer dependency.
 * This is a separate entry point: `import { ... } from '@hyperfixi/core/lse'`
 *
 * @lokascript/framework must be installed as a peer dependency.
 * In the monorepo, workspace resolution handles this automatically.
 *
 * @example
 * ```typescript
 * import { parseExplicit, renderExplicit, isLSEAvailable } from '@hyperfixi/core/lse';
 *
 * if (isLSEAvailable()) {
 *   const node = await parseExplicit('[toggle patient:.active]');
 *   const bracket = await renderExplicit(node);
 * }
 * ```
 */

// Re-export types from framework root (type-only imports have zero runtime cost)
// Using root import because core's moduleResolution: "node" doesn't support subpath exports
export type {
  SemanticNode,
  CommandSemanticNode,
  EventHandlerSemanticNode,
  ConditionalSemanticNode,
  CompoundSemanticNode,
  LoopSemanticNode,
  SemanticValue,
  LiteralValue,
  SelectorValue,
  ReferenceValue,
  PropertyPathValue,
  ExpressionValue,
  FlagValue,
  SemanticMetadata,
  ActionType,
  SemanticRoleType,
  Annotation,
  ProtocolDiagnostic,
  LSEEnvelope,
} from '@lokascript/framework';

export type {
  SemanticJSON,
  SchemaLookup,
  ParseExplicitOptions,
  IRDiagnostic,
  ProtocolNodeJSON,
  ProtocolValueJSON,
  ProtocolDiagnosticJSON,
  AnnotationJSON,
  MatchArmJSON,
  LSEEnvelopeJSON,
} from '@lokascript/framework';

// Lazy-loaded framework module
type Framework = typeof import('@lokascript/framework');
let _fw: Framework | null = null;

async function getFramework(): Promise<Framework> {
  if (!_fw) {
    try {
      _fw = await import('@lokascript/framework');
    } catch {
      throw new Error(
        '@lokascript/framework is required for LSE support. ' +
          'Install it: npm install @lokascript/framework'
      );
    }
  }
  return _fw;
}

/**
 * Check if @lokascript/framework is available (synchronous).
 * Returns true in the monorepo or when framework is installed as a peer dep.
 */
export function isLSEAvailable(): boolean {
  if (_fw) return true;
  try {
    require.resolve('@lokascript/framework');
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse LSE bracket syntax into a SemanticNode.
 *
 * @example
 * ```typescript
 * const node = await parseExplicit('[toggle patient:.active destination:#button]');
 * // node.action === 'toggle'
 * // node.roles.get('patient') === { type: 'selector', value: '.active' }
 * ```
 */
export async function parseExplicit(
  input: string,
  options?: import('@lokascript/framework').ParseExplicitOptions
) {
  const fw = await getFramework();
  return fw.parseExplicit(input, options);
}

/**
 * Check if a string looks like LSE bracket syntax.
 */
export async function isExplicitSyntax(input: string): Promise<boolean> {
  const fw = await getFramework();
  return fw.isExplicitSyntax(input);
}

/**
 * Render a SemanticNode back to LSE bracket syntax.
 *
 * @example
 * ```typescript
 * const bracket = await renderExplicit(node);
 * // "[toggle patient:.active destination:#button]"
 * ```
 */
export async function renderExplicit(
  node: import('@lokascript/framework').SemanticNode
): Promise<string> {
  const fw = await getFramework();
  return fw.renderExplicit(node);
}

/**
 * Convert an InterchangeNode (core AST) to a SemanticNode (LSE IR).
 * Uses structural typing — any object with a `type` field works.
 */
export async function fromInterchangeNode(node: unknown) {
  const fw = await getFramework();
  return fw.fromInterchangeNode(node as any);
}

/**
 * Convert a SemanticNode to the protocol wire format (JSON).
 */
export async function toProtocolJSON(node: import('@lokascript/framework').SemanticNode) {
  const fw = await getFramework();
  return fw.toProtocolJSON(node);
}

/**
 * Parse protocol wire format JSON back to a SemanticNode.
 */
export async function fromProtocolJSON(json: import('@lokascript/framework').ProtocolNodeJSON) {
  const fw = await getFramework();
  return fw.fromProtocolJSON(json);
}

/**
 * Validate protocol wire format JSON without converting.
 */
export async function validateProtocolJSON(json: unknown) {
  const fw = await getFramework();
  return fw.validateProtocolJSON(json);
}

/**
 * Convert an LSEEnvelope to its JSON wire format.
 */
export async function toEnvelopeJSON(envelope: import('@lokascript/framework').LSEEnvelope) {
  const fw = await getFramework();
  return fw.toEnvelopeJSON(envelope);
}

/**
 * Parse an LSEEnvelopeJSON back to an LSEEnvelope.
 */
export async function fromEnvelopeJSON(json: import('@lokascript/framework').LSEEnvelopeJSON) {
  const fw = await getFramework();
  return fw.fromEnvelopeJSON(json);
}

/**
 * Check if a JSON object is an LSE envelope.
 */
export async function isEnvelope(json: unknown): Promise<boolean> {
  const fw = await getFramework();
  return fw.isEnvelope(json);
}
