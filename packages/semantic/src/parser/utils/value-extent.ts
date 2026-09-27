/**
 * Where a value ends: the pure half of the pattern matcher's value-extent
 * repair (`PatternMatcher.absorbExpressionTail`).
 *
 * A role capture takes one known SHAPE of value. When the value is longer
 * than the shape it recognized (`obj's v`, `length of arr`, `String(n) + 2`,
 * `-n`), the capture stops short and the command drops or keeps a truncated
 * value. The repair lets the expression parser, which reads the English form
 * every expression value is stored in, say how far the value goes. These are
 * the parts of that decision that need no matcher state: which words an
 * expression may contain, and whether a joined run reads as ONE expression.
 */

import { parseExpression } from '../../ast-builder/expression-parser/parser';
import { tokenize } from '../../ast-builder/expression-parser/tokenizer';
import { isConversionTypeName } from './expression-lexicon';

/**
 * The English words an expression may contain, as `expressionWordOf` reads a
 * keyword or particle. A value runs through these and through operands; any
 * other keyword (a marker, a command verb, an event name like `pointerup`)
 * ends it.
 */
export const EXPRESSION_WORDS: ReadonlySet<string> = new Set([
  "'s",
  'a',
  'am',
  'an',
  'and',
  'as',
  'closest',
  'contain',
  'contains',
  'do',
  'does',
  'empty',
  'equal',
  'equals',
  'exist',
  'exists',
  'false',
  'first',
  'greater',
  'has',
  'have',
  'in',
  'include',
  'includes',
  'is',
  'it',
  'its',
  'last',
  'less',
  'match',
  'matches',
  'me',
  'mod',
  'my',
  'next',
  'no',
  'not',
  'null',
  'of',
  'or',
  'previous',
  'really',
  'some',
  'than',
  'the',
  'true',
  'undefined',
  'you',
  'your',
]);

/**
 * The expression words that join or qualify operands, as opposed to naming
 * one: a `.class` across a space continues a value only after one (`no .w`),
 * never after an operand (`null .error` is two values).
 */
export const OPERATOR_WORDS: ReadonlySet<string> = new Set([
  'am',
  'and',
  'as',
  'contain',
  'contains',
  'do',
  'does',
  'empty',
  'equal',
  'equals',
  'exist',
  'exists',
  'greater',
  'has',
  'have',
  'in',
  'include',
  'includes',
  'is',
  'less',
  'match',
  'matches',
  'mod',
  'no',
  'not',
  'of',
  'or',
  'really',
  'some',
  'than',
]);

const TRAILING_CONVERSION = /\s+as\s+([A-Za-z]\w*)!?\s*$/;

/**
 * Does the expression parser read ALL of `raw` as one expression?
 *
 * - A conversion (`… as Int`) is allowed when it names a known type:
 *   downstream reads it, as it reads the conversion fold's values. `fetch … as json` never gets here, since the matcher
 *   stops a value at the command's responseType marker.
 * - An unclosed quote is never whole: `'s v "Y"` is a split taken after an
 *   owner, not a string.
 * - Neither is a word outside ASCII, outside strings. This parser's tokenizer
 *   skips what it cannot read, so `আছে #modal` would parse as `#modal` alone.
 */
export function readsAsOneExpression(raw: string): boolean {
  let body = raw;
  for (let m = TRAILING_CONVERSION.exec(body); m; m = TRAILING_CONVERSION.exec(body)) {
    if (!isConversionTypeName(m[1] ?? '')) return false;
    body = body.slice(0, m.index);
  }
  const code = body.replace(/"[^"]*"|'[^']*'/g, '');
  if (/["']/.test(code.replace(/'s\b/g, ''))) return false;
  if (/[^\x00-\x7F]/.test(code)) return false;
  const result = parseExpression(body);
  if (!result.success || result.consumed === undefined) return false;
  // The tokenizer ends with an EOF token, which the parser never consumes.
  if (result.consumed !== tokenize(body).length - 1) return false;
  // A conversion inside the value must name a type too (`x as Int + 1`).
  return conversionTypes(result.node).every(isConversionTypeName);
}

/** The type names of every conversion in a parsed expression. */
function conversionTypes(node: unknown): string[] {
  const out: string[] = [];
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (!n || typeof n !== 'object') return;
    const record = n as { type?: unknown; targetType?: { name?: unknown } };
    if (record.type === 'asExpression') out.push(String(record.targetType?.name ?? ''));
    Object.values(n).forEach(walk);
  };
  walk(node);
  return out;
}
