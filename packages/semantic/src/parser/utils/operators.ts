/**
 * Operator vocabulary
 * ===================
 * The operators a value's readers recognize, defined once. Where two rules mean
 * different sets, each set is named here, beside what it leaves out and why,
 * rather than written out again where the rule is: the operator run, the article
 * rule (C1), the conjunction-operand rule (J5), and the loop condition each read
 * one of these.
 */

/** The binary operators, one token each: arithmetic, comparison and equality. */
export const BINARY_OPERATORS: ReadonlySet<string> = new Set([
  '+',
  '-',
  '*',
  '/',
  '%',
  '<',
  '>',
  '<=',
  '>=',
  '==',
  '!=',
  '===',
  '!==',
]);

/** The comparison and equality operators: what a loop condition continues through. */
export const COMPARISON_OPERATORS: ReadonlySet<string> = new Set([
  '<',
  '>',
  '<=',
  '>=',
  '==',
  '!=',
  '===',
  '!==',
]);

/**
 * What an operator run joins operands with: the binary operators and `mod`.
 * `*` and `<` tokenize as selectors, and are read as operators only between two
 * operands, so a bare `*opacity` or a `<p/>` query (each one token) is never
 * one. `%` is core's alone (upstream rejects it) and renders as written.
 *
 * The comparisons and `mod` join a run as well: without them `set x to n > 2`
 * captured only `n`, and every translation lost the comparison (the English
 * reference truncated the same way, so no fidelity signal saw it). The logical
 * words join through the matcher's `logicalConnectiveOf` (`and`, `or`, and a
 * leading `not`), and core's comparison phrases (`is`, `is not`, `matches`,
 * `exists`) through its `tryConsumeRunPhrase`.
 */
export const RUN_OPERATORS: ReadonlySet<string> = new Set([...BINARY_OPERATORS, 'mod']);

/**
 * A token of operator characters only (`<`, `+`, `+=`, `!`): wider than
 * BINARY_OPERATORS, for the rules that ask whether a token could be an operator
 * at all rather than which one.
 */
export const OPERATOR_CHARACTERS = /^[<>=!+\-*/%]+$/;
