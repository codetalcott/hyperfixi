/**
 * Core's keyword comparison phrases, shared by the expression tokenizer (a
 * selector may follow one) and the parser (which reads them).
 */

/**
 * Core's keyword comparison operators (its parser's comparison fragment), in
 * the shapes core's runtime evaluates. A binary phrase is the operator of a
 * binaryExpression, a postfix one tests its left operand alone, and a type
 * check reads the next word as a type name. Only `is`, `is empty` and `is not
 * empty` were read, one word at a time, so `p is not q` became `p is (not q)`
 * and `p is less than q` compared p with a variable named `less` — in every
 * translation, since buildAST parses a translated condition here.
 */
export const BINARY_PHRASES = [
  'is not really equal to',
  'is really equal to',
  'is greater than or equal to',
  'is less than or equal to',
  'is not equal to',
  'is equal to',
  'is greater than',
  'is less than',
  'is not really',
  'is really',
  'is not equal',
  'is equal',
  'is not in',
  'is in',
  'is not',
  'is',
  'am not in',
  'am in',
  'am',
  'does not match',
  'do not match',
  'does not contain',
  'does not contains',
  'do not contain',
  'does not include',
  'does not precede',
  'does not follow',
  'precedes',
  'follows',
  'really equals',
  'equals',
  'matches',
  'match',
  'contains',
  'contain',
  'includes',
  'include',
  'has',
  'have',
  'in',
];
export const POSTFIX_PHRASES = ['is not empty', 'is empty', 'does not exist'];
export const TYPE_CHECK_PHRASES = ['is not an', 'is not a', 'is an', 'is a'];
