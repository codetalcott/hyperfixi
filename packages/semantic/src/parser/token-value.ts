/**
 * A lone token's value
 * ====================
 * The one reading of a single token as a semantic value, shared by the role
 * capture (`PatternMatcher`) and the semantic parser's fallbacks: the SOV
 * verb-anchoring paths, and fetch's and go's url forms. Those had a classifier
 * of their own until PR 113, where a bare identifier was a string literal (a
 * role capture reads a variable) and C9's readings (`empty`, an article) did
 * not apply.
 */
import type { LanguageToken, ReferenceValue, SemanticValue } from '../types';
import {
  createConstant,
  createLiteral,
  createReference,
  createSelector,
  isValidReference,
} from '../types';
import { loneKeywordValue } from './value-reading';

/** A variable with its scope, as the tokenizer fuses it (`global x`, `the element's x`). */
const SCOPED_NAME = /^(?:the )?(?:global|element|local|dom)(?:'s)? [A-Za-z_]\w*$/i;

/** A lone token's value, or null for a token that is none (a particle, an operator). */
export function tokenValue(token: LanguageToken): SemanticValue | null {
  switch (token.kind) {
    case 'selector':
      return createSelector(token.value);

    case 'literal':
      return literalValue(token.value);

    case 'keyword': {
      // `empty` or an article alone (C9: loneKeywordValue).
      const alone = loneKeywordValue(token);
      if (alone) return alone;
      // Keywords might be references or values
      const lower = (token.normalized || token.value).toLowerCase();
      if (isValidReference(lower)) {
        return createReference(lower);
      }
      return createConstant(lower) ?? createLiteral(token.normalized || token.value);
    }

    case 'identifier':
      // Canonical `@attr` typing: an attribute reference is a selector no
      // matter which slot captures it (mirrors semantic-parser's own
      // tokenToSemanticValue and the css-selector extractor). The former
      // slot-dependent reading typed the SAME token differently between
      // en's patterns and the lax generated event-role slots.
      if (token.value.startsWith('@')) {
        return createSelector(token.value);
      }
      // Check if it's a variable reference (:local or $global)
      // Note: these don't match the ReferenceValue union but are used as a
      // reference token downstream — this cast preserves existing behavior
      if (token.value.startsWith(':') || token.value.startsWith('$')) {
        return createReference(token.value as ReferenceValue['value']);
      }
      // So is a name with its scope (`global x`, `the element's x`: one token,
      // registry.ts fuseScopedNames), and every language writes it as written.
      if (SCOPED_NAME.test(token.value)) {
        return createReference(token.value as ReferenceValue['value']);
      }
      // Check if it's a built-in reference
      const identLower = token.value.toLowerCase();
      if (isValidReference(identLower)) {
        return createReference(identLower);
      }
      // Regular identifiers are variable references - use 'expression' type
      // which gets converted to 'identifier' AST nodes by semantic-integration.ts
      return { type: 'expression', raw: token.value } as const;

    case 'url': {
      // URLs are treated as string literals (paths/URLs for navigation/fetch)
      const url = createLiteral(token.value, 'string');
      return token.value.includes('${') ? { ...url, interpolates: true } : url;
    }

    default:
      return null;
  }
}

/** A literal token's value: a string, a boolean, a duration or a number. */
export function literalValue(value: string): SemanticValue {
  // String literal
  if (
    value.startsWith('"') ||
    value.startsWith("'") ||
    value.startsWith('`') ||
    value.startsWith('「')
  ) {
    const inner = value.slice(1, -1);
    return { ...createLiteral(inner, 'string'), quoted: true };
  }

  // Boolean
  if (value === 'true') return createLiteral(true, 'boolean');
  if (value === 'false') return createLiteral(false, 'boolean');

  // Duration (number with suffix)
  const durationMatch = value.match(/^(\d+(?:\.\d+)?)(ms|s|m|h)?$/);
  if (durationMatch) {
    const num = parseFloat(durationMatch[1]);
    const unit = durationMatch[2];
    if (unit) {
      return createLiteral(value, 'duration');
    }
    return createLiteral(num, 'number');
  }

  // Plain number
  const num = parseFloat(value);
  if (!isNaN(num)) {
    return createLiteral(num, 'number');
  }

  // Default to string
  return createLiteral(value, 'string');
}
