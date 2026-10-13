/**
 * A role value from tokens: one token's value, a run's value, and a run's
 * text joined as the language writes it.
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged.
 */
import type { SemanticValue, LanguageToken } from '../types';
import { createSelector, createLiteral, createReference } from '../types';
import { tryGetProfile } from '../registry';
import { joinExpressionTokens } from './utils/expression-lexicon';
import { tokenValue } from './token-value';
import { readsAsOneExpression } from './utils/value-extent';

/**
 * Strip a symmetric pair of surrounding quote characters from a string
 * literal token's raw value. Unbalanced values are returned unchanged.
 */
function stripQuotes(val: string): string {
  if (val.length >= 2) {
    const first = val[0];
    if ((first === '"' || first === "'") && val.endsWith(first)) {
      return val.slice(1, -1);
    }
  }
  return val;
}

/**
 * Convert a sequence of tokens into a single SemanticValue.
 */
export function tokensToSemanticValue(
  tokens: LanguageToken[],
  language: string
): SemanticValue | null {
  if (tokens.length === 0) return null;

  // Filter out noise tokens (whitespace, etc.)
  let meaningful = tokens.filter(t => (t.kind as string) !== 'whitespace');
  if (meaningful.length === 0) return null;

  // en-alignment: add/put declare NO scope role (only `set` does), so the
  // en reference silently DROPS an `in me`/`in <x>` scope qualifier and
  // captures the bare selector (`add @disabled to <button/> in me` →
  // destination="<button/>"). The SOV corpus keeps the qualifier inline
  // untranslated (`<button/> in me に`), and the whitespace-eliding join
  // below would glue it into "<button/>inme" — same type, so only R3 sees
  // it. A selector-led group truncates at a later `in`: en byte-alignment.
  // Selector head required, so positional phrases (`first <li/> in me`)
  // and non-selector runs are untouched.
  if (
    meaningful.length >= 2 &&
    (meaningful[0].kind === 'selector' || /^[#.@*<]/.test(meaningful[0].value))
  ) {
    const inIdx = meaningful.findIndex(
      (t, i) => i > 0 && (t.normalized ?? t.value).toLowerCase() === 'in'
    );
    if (inIdx > 0) meaningful = meaningful.slice(0, inIdx);
  }

  // Single token — use its type directly
  if (meaningful.length === 1) {
    return tokenToSemanticValue(meaningful[0]);
  }

  // A run the expression parser reads whole is an expression, as the role
  // capture reads a value (C13, longestWholeRun). Joined as text it was a
  // string, which the direct path took as written: bn `d + 1 কে অপেক্ষা`
  // (wait d + 1) waited for the text "d + 1" (PR 115).
  const joined = joinTokenText(meaningful, language);
  if (readsAsOneExpression(joined)) return { type: 'expression', raw: joined };

  // Multiple tokens — concatenate values and infer type from the first token
  const combined = meaningful.map(t => t.value).join('');
  const first = meaningful[0];

  if (
    first.kind === 'selector' ||
    first.value.startsWith('#') ||
    first.value.startsWith('.') ||
    first.value.startsWith('@') ||
    first.value.startsWith('*')
  ) {
    return createSelector(combined);
  }
  if (first.kind === 'literal' || first.value.startsWith('"') || first.value.startsWith("'")) {
    return createLiteral(stripQuotes(combined), 'string');
  }
  if ((first.kind as string) === 'reference') {
    return createReference(combined as 'me' | 'it' | 'you' | 'result');
  }

  // Non-selector/literal/reference multi-token run: this is where a leaked
  // foreign EXPRESSION lands (`beep! 私の 値` → the debug-expression patient).
  // The empty-string `combined` above both glued the tokens (`beep!私の値`) and
  // skipped translation, because it never reached the shared expression seam.
  // Route it through joinExpressionTokens (via joinTokenText): the possessive
  // anchor fires (`私の 値` → `my value`) and spaces are preserved, yielding
  // `beep! my value`. The selector/literal/reference branches keep the raw glue
  // on purpose (`#foo.bar`, quoted strings), so only this fall-through changes.
  return createLiteral(joined);
}

/**
 * A single token's value, as the role capture reads it (`token-value.ts`); a
 * token that is no value (a particle) keeps its text as a literal.
 */
export function tokenToSemanticValue(token: LanguageToken): SemanticValue {
  return tokenValue(token) ?? createLiteral(token.value);
}

/**
 * Reconstruct source-ish text from a token slice for an expression value.
 * Keyword tokens contribute their NORMALIZED (English) form: the condition
 * raw string is evaluated by the core expression parser, which only reads
 * English operator words — a translated condition (`#modal 存在する`,
 * `#modal existe`) is unevaluable as-is, while its normalized join
 * (`#modal exists`) runs. Non-keyword tokens (identifiers, selectors,
 * literals) keep their surface value; for en the two are identical.
 *
 * Delegates to the shared `joinExpressionTokens`, which additionally resolves
 * possessives (`mi valor` → `my value`; normalizing a possessive to its
 * reference concept gave the invalid `me value`). Shared with the operator-run
 * join in `PatternMatcher` so the two expression seams cannot drift.
 */
export function joinTokenText(toks: readonly LanguageToken[], language: string): string {
  return joinExpressionTokens(toks, tryGetProfile(language));
}
