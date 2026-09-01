/**
 * Semantic Value to AST Node Converters
 *
 * Converts SemanticValue types to AST expression nodes.
 * Used by the AST builder to construct expression trees from semantic parsing results.
 */

import type {
  SemanticValue,
  LiteralValue,
  SelectorValue,
  ReferenceValue,
  PropertyPathValue,
  ExpressionValue,
} from '../types';

import {
  parseExpression,
  type ExpressionNode,
  type LiteralNode,
  type SelectorNode,
  type ContextReferenceNode,
  type AttributeAccessNode,
  type PropertyAccessNode,
  type IdentifierNode,
  type ContextType,
  type SelectorKind,
} from './expression-parser';

// =============================================================================
// Value Converters
// =============================================================================

/**
 * Convert a SemanticValue to an AST ExpressionNode.
 *
 * @param value - The semantic value to convert
 * @param warnings - Optional array to collect warnings about potentially incorrect type choices
 * @returns The corresponding AST expression node
 */
export function convertValue(value: SemanticValue, warnings?: string[]): ExpressionNode {
  switch (value.type) {
    case 'literal':
      return convertLiteral(value);
    case 'selector':
      return convertSelector(value, warnings);
    case 'reference':
      return convertReference(value);
    case 'property-path':
      return convertPropertyPath(value, warnings);
    case 'expression':
      return convertExpression(value);
    case 'flag':
      // Flags are boolean attributes — convert to a boolean literal
      return { type: 'literal', value: value.enabled } as LiteralNode;
    default:
      // Exhaustive check
      const _exhaustive: never = value;
      throw new Error(`Unknown semantic value type: ${(_exhaustive as SemanticValue).type}`);
  }
}

/**
 * Is this role value a MATERIALIZED DEFAULT rather than something the author wrote?
 *
 * The pattern matcher tags every value it fills in from a schema `default` with
 * `implicit: true` (see `pattern-matcher.ts`'s default materialization) — a
 * bare `focus` gets `patient: {reference me, implicit: true}`, while an authored
 * `focus me` gets the same value WITHOUT the tag. The multilingual renderers
 * already read this to suppress an injected `me` when rendering to 24 languages.
 *
 * The AST builder reads it for the same reason: `args` and `modifiers` are the
 * SYNTAX surface — what the author actually wrote — so a materialized default
 * does not belong there. It stays on `semanticRoles`, the SEMANTICS surface,
 * where a consumer that wants the resolved target can read it.
 */
export function isImplicitValue(value: { implicit?: true } | undefined): boolean {
  return value?.implicit === true;
}

/**
 * Convert a LiteralValue to a LiteralNode.
 */
export function convertLiteral(value: LiteralValue): LiteralNode {
  const result: LiteralNode = {
    type: 'literal',
    value: value.value,
  };

  // Only add dataType if defined (exactOptionalPropertyTypes)
  if (value.dataType) {
    return { ...result, dataType: value.dataType };
  }

  return result;
}

/**
 * Recognize a query reference (`<button/>`, `<.card/>`, `<#id/>`) and return the
 * css inside the brackets.
 *
 * Deliberately narrower than "starts with `<`": the trailing `/>` is what makes
 * the surface a query reference, and core's `isQueryReference` +
 * `queryValue.slice(1, -2)` pair assume it. Returns undefined for anything else.
 */
function matchQueryReference(raw: string): { selector: string } | undefined {
  if (!raw.startsWith('<') || !raw.endsWith('/>') || raw.length <= 3) return undefined;
  const selector = raw.slice(1, -2).trim();
  return selector ? { selector } : undefined;
}

/**
 * Convert a SelectorValue to a SelectorNode.
 *
 * @param value - The selector value to convert
 * @param warnings - Optional array to collect warnings
 */
export function convertSelector(
  value: SelectorValue,
  warnings?: string[]
): SelectorNode | AttributeAccessNode {
  // An `@attr` value is an ATTRIBUTE reference, not a CSS selector — the
  // semantic tokenizer classifies `@disabled` / `@aria-selected` as a selector
  // role value, but feeding it to querySelector throws "Invalid selector".
  // Emit the canonical core-parser shape instead: the runtime reads it via
  // getAttribute, and the write commands (set/toggle) route it to setAttribute.
  if (value.value.startsWith('@') && /^[a-zA-Z_]/.test(value.value.slice(1))) {
    return {
      type: 'attributeAccess',
      attributeName: value.value.slice(1),
    };
  }

  // Warn if selector looks like a CSS property (starts with * followed by a letter/hyphen)
  // This catches cases like "*background-color" which should likely be a literal string
  if (warnings && value.value.startsWith('*') && /^[a-zA-Z-]/.test(value.value.slice(1))) {
    warnings.push(
      `Converted '${value.value}' to a CSS selector, but it looks like a CSS property name. ` +
        `CSS properties in commands like 'transition' should be literal strings, not selectors. ` +
        `Consider using expectedTypes: ['literal'] instead of ['literal', 'selector'] in the command schema.`
    );
  }

  // A QUERY REFERENCE (`<button/>`, `<div.card/>`) is one surface with two
  // meanings, and the core AST resolves the ambiguity with a single shape
  // rather than by knowing the command:
  //
  //   value/selector -> the STRIPPED css (`button`), what querySelectorAll gets
  //   fromQuery      -> true, so the evaluator returns the whole collection
  //                     even for `<#id/>` (upstream QueryRef -> ElementCollection)
  //   raw            -> the full `<…>` markup, which MakeCommand reads FIRST and
  //                     uses to CREATE an element instead of querying it
  //
  // Carrying the markup on `value` too — which this converter used to do — hands
  // `<button/>` straight to the DOM, and `hide <button/>` / `add .x to <button/>`
  // die with `SyntaxError: Invalid selector <button/>` in every language and on
  // every buildAST consumer (core's default English path, the multilingual
  // browser bundles, the R2 execution validator). `raw` is what keeps `make`
  // working, so no command-awareness is needed here. Mirrors
  // `parser.ts`'s `matchQueryReference()` branch exactly.
  const queryRef = matchQueryReference(value.value);
  if (queryRef) {
    return {
      type: 'selector',
      value: queryRef.selector,
      selector: queryRef.selector,
      selectorType: value.selectorKind as SelectorKind,
      fromQuery: true,
      raw: value.value,
    } as SelectorNode;
  }

  // A `<`-prefixed value that is NOT a query reference (a stray `<` or `<=` the
  // tokenizers classify as a selector before reaching their operator list)
  // keeps its verbatim shape — stripping it would corrupt it.
  if (value.value.startsWith('<')) {
    return {
      type: 'selector',
      value: value.value,
      selector: value.value,
      selectorType: value.selectorKind as SelectorKind,
      raw: value.value,
    } as SelectorNode;
  }

  return {
    type: 'selector',
    value: value.value,
    selector: value.value,
    selectorType: value.selectorKind as SelectorKind,
  };
}

/**
 * Convert a ReferenceValue to a context reference — or, for a SIGIL-scoped
 * variable, to the scoped identifier the traditional parser emits.
 *
 * `me` / `it` / `you` / `event` / … are context references. `:count` and
 * `$total` are **variables**, and calling them context references was a live
 * defect, not a spelling difference: `ContextType` is a closed union that never
 * contained them, so `value.value as ContextType` was a lying cast, and core's
 * `evaluateContextReference` has no case for `:count` — it returns `undefined`.
 *
 * The blast radius was larger than it looks, because of WHERE the semantic path
 * gets used. Core parses a command sequence traditionally and hands only the
 * final remainder to the semantic analyzer, so it is the LAST command of a
 * handler that gets this node. Measured on the default parse path:
 *
 *   set :v to 5 then log :v then log :v      →  ["5", "5", undefined]
 *   set $v to 5 then log $v then log $v      →  ["5", "5", undefined]
 *   set  v to 5 then log  v then log  v      →  ["5", "5", "5"]      (unscoped: fine)
 *
 * So any handler ENDING in a `:`/`$` variable read silently produced
 * `undefined` — `on click increment :count then log :count` being the ordinary
 * shape of it. The traditional path was correct throughout.
 *
 * The two spellings below are the traditional parser's, matched exactly so both
 * paths build the same node: `:name` strips the sigil and tags
 * `scope: 'element'`, while `$name` KEEPS its sigil in the name and carries no
 * scope (that is what `getVariableValue` expects of each — not an inconsistency
 * introduced here).
 */
export function convertReference(value: ReferenceValue): ContextReferenceNode | IdentifierNode {
  const raw = value.value;

  if (typeof raw === 'string') {
    if (raw.startsWith(':') && raw.length > 1) {
      return { type: 'identifier', name: raw.slice(1), scope: 'element' };
    }
    if (raw.startsWith('$') && raw.length > 1) {
      return { type: 'identifier', name: raw };
    }
  }

  return {
    type: 'contextReference',
    contextType: raw as ContextType,
    name: raw,
  };
}

/**
 * Convert a PropertyPathValue to a PropertyAccessNode.
 * Recursively converts the object part.
 *
 * @param value - The property path value to convert
 * @param warnings - Optional array to collect warnings
 */
export function convertPropertyPath(
  value: PropertyPathValue,
  warnings?: string[]
): PropertyAccessNode {
  return {
    type: 'propertyAccess',
    object: convertValue(value.object, warnings),
    property: value.property,
  };
}

/**
 * Convert an ExpressionValue (raw string) by parsing it with the expression parser.
 * This is the fallback for complex expressions that couldn't be fully parsed
 * at the semantic level.
 */
export function convertExpression(value: ExpressionValue): ExpressionNode {
  const result = parseExpression(value.raw);

  if (!result.success || !result.node) {
    // If parsing fails, return an identifier node with the raw value
    const identifier: IdentifierNode = {
      type: 'identifier',
      name: value.raw,
    };
    return identifier;
  }

  return result.node;
}

// =============================================================================
// Type Guards
// =============================================================================

export function isLiteralValue(value: SemanticValue): value is LiteralValue {
  return value.type === 'literal';
}

export function isSelectorValue(value: SemanticValue): value is SelectorValue {
  return value.type === 'selector';
}

export function isReferenceValue(value: SemanticValue): value is ReferenceValue {
  return value.type === 'reference';
}

export function isPropertyPathValue(value: SemanticValue): value is PropertyPathValue {
  return value.type === 'property-path';
}

export function isExpressionValue(value: SemanticValue): value is ExpressionValue {
  return value.type === 'expression';
}
