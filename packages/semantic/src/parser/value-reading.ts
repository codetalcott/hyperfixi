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
 * | ID     | Reads                                                   | Applied by                                   |
 * | ------ | ------------------------------------------------------- | -------------------------------------------- |
 * | C1, C2 | `a`/`an` before an operator or a marker is a variable   | the role capture, before it reads the slot   |
 * | C7     | a particle is the value where no marker can stand       | the role capture, after its expressions      |
 * | C8     | a structure keyword or verb alone is a variable         | the role capture, after C7                   |
 * | C9     | a lone article is a variable, `empty` is `null`         | the role capture's last reading of a token   |
 * | C10    | a particle beside an operator is its operand            | an operator run, for each operand            |
 * | C15    | a particle after `of` is the owner                      | a value's extent, for each token             |
 *
 * The join reads a keyword alone through the same classifier as C8
 * (`loneKeywordKind`, in the expression lexicon: J1).
 */

import type { LanguageToken, PatternToken, SemanticValue, TokenStream } from '../types';
import { createConstant } from '../types';
import type { CommandSchema } from '../generators/command-schemas';
import { loneKeywordKind } from './utils/expression-lexicon';

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
    /** The slot's pattern token: its role, value shape and expected types. */
    readonly patternToken: PatternToken & { type: 'role' },
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

/** Arithmetic, comparison and equality operators, whole: C1's own set (no `mod`). */
const BINARY_OPERATOR_TEXT = /^(?:[-+*/%]|[<>]=?|===?|!==?)$/;

/**
 * C1, C2: `a`/`an` is a variable, not an article, before an operator (`put a
 * + b`: the en tokenizer classes `+`/`-`/`*` as identifiers, so the article
 * rule took `return a + b` for "article, noun" and kept `return +` — #1175)
 * and before the pattern's next marker (de `erhöhe a um 1`, increment a by 1,
 * whose `um` the tokenizer leaves an identifier — PR 84). Its operator set is
 * its own: `mod` is no operator here, where it is one for C7 and C10.
 */
export function articleIsVariable(slot: SlotContext): boolean {
  const word = slot.token.value.toLowerCase();
  if (word !== 'a' && word !== 'an') return false;
  const next = slot.next;
  return next !== undefined && (BINARY_OPERATOR_TEXT.test(next.value) || slot.nextIsMarker);
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
 * C8: a structure keyword alone in a value slot is a variable the language
 * spells like it: a role marker (tr `na`, ms `ke`, de `zu`), a control word
 * (es `si` "if", pl `az` "until", de `wo` "where") or the copula (es `es`, sw
 * `ni`); captured whole it was the English word, `put if` — PR 81. So is a
 * command verb (es `ir` "go", fr `va`, tr `al` "get") — PR 84 — except in a
 * command that takes a body (`tell #modal to show`, ja and qu), where a verb in
 * a slot is the body command the pattern dropped, which the role normalization
 * discards; in one that names an event, whose name may be a verb's (`trigger
 * init`); and `empty`, which alone is `null` (C9). Never the event's or the
 * action's slot, one that holds a keyword (`using view transition`, a loop's
 * type), or one that takes no expression. The matchers before it have taken
 * the keyword-led values (`not flag`, `no .w`).
 */
export function keywordIsVariable(slot: SlotContext, schema: CommandSchema | undefined): boolean {
  const pt = slot.patternToken;
  if (pt.role === 'event' || pt.role === 'action' || pt.valueShape === 'keyword') return false;
  const types = pt.expectedTypes;
  if (types?.length && !types.some(t => t === 'expression' || t === 'reference')) return false;
  const kind = loneKeywordKind(slot.token);
  if (kind === 'structure') return true;
  if (kind !== 'verb') return false;
  if ((slot.token.normalized ?? slot.token.value).toLowerCase() === 'empty') return false;
  return !schema?.hasBody && !schema?.roles.some(r => r.role === 'event');
}

/**
 * C9: what a keyword captured alone stands for, where that is not what it
 * spells. `empty` is `null`: the word some languages also spell `null` with
 * (sw `tupu`), or a variable named `empty`, which upstream reads as null — PR
 * 61; an article is the variable (`set a to 0` read `a` as the text "a",
 * which a `set` cannot write, and the whole `set` dropped — PR 75). Undefined
 * for any other keyword. (A conjunction alone, PR 59's `ustaw do i 0`, is
 * C8's: `and` and `or` are structure words.)
 */
export function loneKeywordValue(token: LanguageToken): SemanticValue | undefined {
  const lower = (token.normalized || token.value).toLowerCase();
  if (lower === 'empty') return createConstant('null')!;
  if (lower === 'a' || lower === 'an') return { type: 'expression', raw: token.value } as const;
  return undefined;
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
