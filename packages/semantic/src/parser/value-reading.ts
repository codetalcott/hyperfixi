/**
 * Value reading: where a word spelled like structure is a value
 * ==============================================================
 * A translation writes a variable verbatim, so a variable spelled like one of
 * the target language's structure words reaches the parser as that word: a
 * particle (tr `i`, its accusative), a role marker (ms `ke`), a control word
 * (es `si`), a conjunction (pl `i`), the copula (es `es`), a command verb (es
 * `ir`), an article (es `a`). Where it stands is all that tells the two apart.
 *
 * This module holds the role capture's readings of such a word. A capture
 * builds one SlotContext: the slot's first token, its neighbours, and where
 * the slot stands in its pattern. Every rule reads the same few facts about
 * that place — the clause ends after the token, an operator follows it, it
 * stands right before the pattern's next marker, the slot follows a literal
 * the pattern matched — so each fact has one definition here.
 *
 * The rules, in the order they apply. The IDs are the inventory's
 * (docs-internal/MULTILINGUAL_NEXT_STEPS.md, "Value reading"), which lists
 * every rule, here or in the join and the condition scan, with the PR that
 * added it and the test that pins it:
 *
 * | ID  | Reads                                             | Applied by                               |
 * | --- | ------------------------------------------------- | ---------------------------------------- |
 * | C7  | a particle is the value where no marker can stand | the role capture, after its expressions  |
 * | C10 | a particle beside an operator is its operand      | an operator run, for each operand        |
 * | C15 | a particle after `of` is the owner                | a value's extent, for each token         |
 */

import type { LanguageToken, PatternToken, TokenStream } from '../types';

/**
 * Binary operators that can join operands in an operator-run expression.
 * `*` tokenizes as a SELECTOR (the style-prefix char) but is only read as an
 * operator here when it sits BETWEEN two operands, so a bare `*opacity` style
 * selector (one fused token) is never affected. A bare `<` is a selector token
 * too; a query is one fused token (`<p/>`).
 *
 * The comparisons and `mod` join a run as well: without them `set x to n > 2`
 * captured only `n`, and every translation lost the comparison (the English
 * reference truncated the same way, so no fidelity signal saw it). `%` is
 * core's alone (upstream rejects it) and renders as written. The logical
 * words join through the matcher's `logicalConnectiveOf` (`and`, `or`, and a
 * leading `not`), and core's comparison phrases (`is`, `is not`, `matches`,
 * `exists`) through its `tryConsumeRunPhrase`.
 */
export const RUN_OPERATORS: ReadonlySet<string> = new Set([
  '+',
  '-',
  '*',
  '/',
  '%',
  'mod',
  '>',
  '<',
  '>=',
  '<=',
  '==',
  '!=',
  '===',
  '!==',
]);

/** Nothing follows, or `then`, `end` or `else`: the clause ends before `next`. */
export function clauseEndsAt(next: LanguageToken | undefined): boolean {
  if (!next) return true;
  if (next.kind !== 'keyword') return false;
  const norm = (next.normalized ?? next.value).toLowerCase();
  return norm === 'then' || norm === 'end' || norm === 'else';
}

/** `next` is a run operator. */
export function isRunOperator(next: LanguageToken | undefined): boolean {
  return !!next && RUN_OPERATORS.has(next.value);
}

/**
 * Where a role slot stands: its first token and the tokens either side of it,
 * and the pattern tokens either side of the slot. Built once per capture, at
 * the token the slot's value starts at.
 */
export class SlotContext {
  readonly token: LanguageToken;
  readonly prev: LanguageToken | undefined;
  readonly next: LanguageToken | undefined;
  private nextIsMarkerMemo: boolean | undefined;

  constructor(
    tokens: TokenStream,
    /** The slot directly follows a literal the pattern matched: its marker, or the verb. */
    readonly afterLiteral: boolean,
    private readonly nextPatternToken: PatternToken | undefined,
    private readonly wouldMatch: (pt: PatternToken | undefined, token: LanguageToken) => boolean
  ) {
    const at = tokens.position();
    this.token = tokens.tokens[at]!;
    this.prev = tokens.tokens[at - 1];
    this.next = tokens.tokens[at + 1];
  }

  /** The pattern's next token is a role: no marker bounds the slot. */
  get beforeRole(): boolean {
    return this.nextPatternToken?.type === 'role';
  }

  /** The token after this one is the pattern's next marker. */
  get nextIsMarker(): boolean {
    this.nextIsMarkerMemo ??=
      this.next !== undefined && this.wouldMatch(this.nextPatternToken, this.next);
    return this.nextIsMarkerMemo;
  }

  /** The clause ends after the token. */
  get clauseEndsAfter(): boolean {
    return clauseEndsAt(this.next);
  }

  /** A run operator follows the token. */
  get operatorFollows(): boolean {
    return isRunOperator(this.next);
  }
}

/**
 * C7: a particle is the value where it cannot be a marker. tr's accusative
 * marker is `i`, the usual loop variable, so `i i 2 artır` (increment i by 2)
 * put the marker's spelling in the value slot. A particle is the value:
 *
 * - directly before the pattern's next marker, with a particle on either side
 *   of it (`i i 2 artır`; `k i i artır`, increment k by i) — PR 64;
 * - directly before an operator (`i < - 2`: the operator run cannot take a
 *   unary minus, and the value's tail reads it from here) — PR 67;
 * - right after its slot's own marker, before an unmarked role, whose value
 *   the next token is (pl `ustaw do o 5`, set o to 5) — PR 84. Before a value
 *   of its own it is part of the marker (id `ke dalam #out`);
 * - at its clause's end (es `incrementar a entonces`, increment a) — PR 81.
 *
 * Directly after a value and before the verb it is that value's marker (`1s i
 * bekle`, pinned in wait-alternatives.test.ts).
 */
export function particleIsValue(slot: SlotContext): boolean {
  if (slot.token.kind !== 'particle') return false;
  const next = slot.next;
  return (
    (next !== undefined &&
      ((slot.nextIsMarker && (next.kind === 'particle' || slot.prev?.kind === 'particle')) ||
        slot.operatorFollows)) ||
    (slot.afterLiteral && slot.beforeRole) ||
    slot.clauseEndsAfter
  );
}

/**
 * C10: in an operator run, a particle is an operand where no marker can
 * stand: directly after an operator, or directly before one (`a + b`). es/it/
 * pt `a`, the preposition "to", is also a common variable name, so `retornar a
 * + b` lost its whole value (worker-basic); a marker is followed by its value,
 * never by an operator.
 */
export function particleIsOperand(
  token: LanguageToken,
  afterOperator: boolean,
  next: LanguageToken | undefined
): boolean {
  return token.kind === 'particle' && (afterOperator || isRunOperator(next));
}

/**
 * C15: is the token at `i` a particle-shaped variable after English `of`?
 * `of` (which stays English where the renderer keeps a chain's links) is
 * followed by its owner, never by a marker, and pl's `w` (its `in`) is also a
 * common variable name: `v of w of obj` stopped at `w`.
 */
export function isParticleAfterOf(tokens: readonly LanguageToken[], i: number): boolean {
  const token = tokens[i];
  return (
    token?.kind === 'particle' &&
    tokens[i - 1]?.value.toLowerCase() === 'of' &&
    /^[\p{L}_$][\p{L}\p{M}\p{N}_$]*$/u.test(token.value)
  );
}
