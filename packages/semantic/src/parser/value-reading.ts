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
import {
  COMMAND_ACTION_KEYWORDS,
  loneKeywordKind,
  translateConnective,
} from './utils/expression-lexicon';
import { isCuratedEndKeyword } from './end-keywords';
import { BINARY_OPERATORS, RUN_OPERATORS } from './utils/operators';

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
  private tokenIsMarkerMemo: boolean | undefined;

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

  /** The pattern ends with this slot. */
  get lastSlot(): boolean {
    return this.nextPatternToken === undefined;
  }

  /** The pattern's next token wants this token itself. */
  get tokenIsMarker(): boolean {
    this.tokenIsMarkerMemo ??= this.wouldMatch(this.nextPatternToken, this.token);
    return this.tokenIsMarkerMemo;
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
 * C1, C2: `a`/`an` is a variable, not an article, before an operator (`put a
 * + b`: the en tokenizer classes `+`/`-`/`*` as identifiers, so the article
 * rule took `return a + b` for "article, noun" and kept `return +` — #1175)
 * and before the pattern's next marker (de `erhöhe a um 1`, increment a by 1,
 * whose `um` the tokenizer leaves an identifier — PR 84). Its operators are
 * the binary ones: `mod` is none here, where it is one for C7 and C10.
 */
export function articleIsVariable(slot: SlotContext): boolean {
  const word = slot.token.value.toLowerCase();
  if (word !== 'a' && word !== 'an') return false;
  const next = slot.next;
  return next !== undefined && (BINARY_OPERATORS.has(next.value) || slot.nextIsMarker);
}

/** A keyword naming a command: a verb. */
export function isCommandVerb(token: LanguageToken): boolean {
  return (
    token.kind === 'keyword' &&
    COMMAND_ACTION_KEYWORDS.has((token.normalized ?? token.value).toLowerCase())
  );
}

/**
 * C3: `then`, `end` and a curated end word are never a value (#635). A
 * sequence connective or a block terminator by normalized form — the generated
 * increment's trailing `{quantity}` swallowed the `then` that opens the next
 * statement (it `allora`, pl `wtedy`: increment by NaN), and a verb-first
 * wait's duration a following bn তারপর/শেষ — except `end` before a selector,
 * which keeps its positional `last` reading (bn `শেষ <li/>`). A curated end
 * word by value (tr `son`, qu `tukuy`), whatever the tokenizer normalized it
 * to (tr `son` → `last`): a loop's own `son` before the next command's selector
 * prefixed that command's value. Only a keyword: a string "then" is a value.
 * Not `and`: pl's `i` is also the pronoun `I` (the unless-condition rows).
 */
export function neverAValue(slot: SlotContext, language: string): boolean {
  const token = slot.token;
  if (token.kind !== 'keyword') return false;
  const norm = (token.normalized ?? token.value).toLowerCase();
  if (norm === 'then' || (norm === 'end' && slot.next?.kind !== 'selector')) return true;
  return isCuratedEndKeyword(token.value, language);
}

/**
 * C4, C5: a verb that stands alone right after the slot's marker — before the
 * pattern's next marker or its clause's end — is the slot's value, a variable
 * the language spells like it (es `incrementar i por ir`, by ir; it `di se`):
 * the marker has matched, so no command can begin there. A verb with more
 * after it is still the next command (a stored zh row's `停止 把 调用
 * saveDocument()`, halt then call). PR 84.
 */
export function verbStandsAlone(slot: SlotContext): boolean {
  return slot.afterLiteral && (slot.clauseEndsAfter || slot.nextIsMarker);
}

/**
 * C4: a command verb in a `quantity` slot, or in `repeat`'s own event slot,
 * begins the next command (#961: the generated repeat's trailing slots took
 * the verb of `wiederholen forever umschalten .pulse`, and the toggle never
 * formed) — unless it stands alone after the slot's marker (verbStandsAlone),
 * or stands right before the pattern's own next marker (tr `i i al artır`,
 * increment i by al, where the verb follows the amount; PR 84). The event half
 * is `repeat`'s: on trigger/send a keyword event name is a custom event.
 */
export function verbEndsCountSlot(slot: SlotContext, command: string | undefined): boolean {
  const role = slot.patternToken.role;
  if (role !== 'quantity' && !(role === 'event' && command === 'repeat')) return false;
  return isCommandVerb(slot.token) && !verbStandsAlone(slot) && !slot.nextIsMarker;
}

/**
 * C5: a command verb in an optional slot is not its value, and the slot is
 * skipped, where the slot ends its pattern (halt's patient took the `call` of
 * `halt call saveDocument()`, and the call dropped in English and 16 languages
 * — a9e4fcf5a) or where the pattern's next token wants the verb itself (tr
 * `.card e .expanded i değiştir`: a bare duration slot took the verb its own
 * literal was waiting for — #950). Unless it stands alone after the slot's
 * marker (verbStandsAlone, PR 84). A mid-pattern slot before another token
 * keeps capturing the verb and failing: that failure is load-bearing (ja
 * `opacity を 遷移 0 に 300ms`: the verb-anchoring fallback reclaims the tail).
 * Never the event's or the action's slot, which have their own guards, nor one
 * that holds a keyword (`using view transition`: `using view` has matched, so
 * no command can begin there).
 */
export function verbSkipsOptionalSlot(slot: SlotContext): boolean {
  const pt = slot.patternToken;
  if (!pt.optional || pt.role === 'event' || pt.role === 'action') return false;
  if (pt.valueShape === 'keyword' || !isCommandVerb(slot.token)) return false;
  return (slot.lastSlot || slot.tokenIsMarker) && !verbStandsAlone(slot);
}

/**
 * C6: may the matcher try skipping an optional, marker-less slot (a bare role,
 * or a group of roles only) that faces a keyword? Where it faces a command verb
 * the pattern's next token does not want, or any keyword that token does want
 * (#968: tl's verb-first swap `palitan_pwesto [{method}] sa {destination}` lost
 * the `sa` its own pattern owes to the bare `[{method}]`). The matcher adopts
 * the skip only when the rest of the pattern then takes the whole clause: the
 * shape is identical to ja's no-goal transition variant, whose capture must
 * fail so the verb-anchoring fallback can reclaim goal and duration, and only
 * the outcome tells them apart. Where C5 already skips (the pattern's last
 * slot), this does not.
 */
export function maySkipVerbSlot(
  patternToken: PatternToken,
  token: LanguageToken | null,
  nextPatternToken: PatternToken | undefined,
  wouldMatch: (pt: PatternToken | undefined, token: LanguageToken) => boolean
): boolean {
  const slot =
    patternToken.type === 'group' && patternToken.optional
      ? patternToken.tokens.every(t => t.type === 'role')
        ? patternToken.tokens[0]
        : undefined
      : patternToken;
  if (!slot || slot.type !== 'role' || !slot.optional) return false;
  if (slot.role === 'event' || slot.role === 'action' || slot.valueShape === 'keyword')
    return false;
  if (!token || token.kind !== 'keyword' || nextPatternToken === undefined) return false;
  const wanted = wouldMatch(nextPatternToken, token);
  return isCommandVerb(token) ? !wanted : wanted;
}

/**
 * C11: in an operator run, after `and`/`or`, a word naming a command begins
 * the next command (`set x to true and put 2 into #c` is two commands; PR 44).
 * Any token kind: a tokenizer may leave a command word an identifier.
 */
export function namesCommand(token: LanguageToken): boolean {
  return COMMAND_ACTION_KEYWORDS.has((token.normalized ?? token.value).toLowerCase());
}

/**
 * C12: in an operator run, a `not` word followed by a particle and its value
 * is a variable spelled like `not`, and the particle is the next role's
 * marker (sw `weka si kwa #out`, put si into #out; PR 84) — unless an operator
 * follows the particle, which is then `not`'s operand (`set x to not a < 3`).
 */
export function notWordIsVariable(
  afterNot: LanguageToken | undefined,
  following: LanguageToken | undefined
): boolean {
  return (
    afterNot?.kind === 'particle' &&
    !!following &&
    ['selector', 'literal', 'identifier'].includes(following.kind) &&
    !isRunOperator(following)
  );
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

/**
 * Copula and negation words, by normalized form, that keep the next word in an
 * `if` condition even where it doubles as a command verb: `empty` is both the
 * command and the predicate of `is empty`, so `if my value is empty add …` cut
 * the condition at `empty` and opened the branch with it (#396).
 */
export const CONDITION_COPULAS: ReadonlySet<string> = new Set([
  'is',
  'am',
  'are',
  'be',
  'was',
  'were',
  'not',
  'no',
]);

/**
 * Rendered copulas that do not normalize to `is`, because each has another
 * sense: ar هو is also the pronoun `it` (`إذا هو اضبط …` is `if it set …`), hi
 * है also `has`, th เป็น also `as`; hi नहीं is `not` after the copula (`है नहीं
 * खाली`, is not empty; PR 41), and qu mana is too (`kanqa mana chusaq`, and
 * also `false`; PR 78). They hold the condition only before a predicate. (The
 * surfaces registered as `is` keywords — fr est, ru есть, uk є, pt é, tl ay, ms
 * adalah, bn হয়, tr dir, qu kanqa — are CONDITION_COPULAS.)
 */
export const CONDITION_COPULAS_SURFACE: ReadonlySet<string> = new Set([
  'هو',
  'เป็น',
  'है',
  'नहीं',
  'mana',
]);

/** Predicate adjectives (normalized) that follow a copula inside a condition. */
export const CONDITION_PREDICATES: ReadonlySet<string> = new Set(['empty', 'null', 'undefined']);

/**
 * S2, S3: does the word before `token` keep `token` in an `if` condition?
 *
 * - S2: after a copula the next word is its predicate, not the branch's first
 *   command: a copula by normalized form or connective, always; one of the
 *   ambiguous rendered surfaces only before a predicate adjective.
 * - S3: except where the copula is the condition's first word. No operand
 *   stands before it, so it is a variable the language spells like `is` (es
 *   `si es poner …`, sw `kama ni weka …`), and the branch begins after it. A
 *   negation there takes its operand after it, so it keeps its next word unless
 *   that is a command verb, never a predicate (sw `kama si weka …`). PR 84.
 */
export function copulaHoldsCondition(
  before: LanguageToken,
  token: LanguageToken,
  copulaIsFirst: boolean,
  language: string
): boolean {
  const prev = (before.normalized ?? before.value).toLowerCase();
  const prevValue = before.value.toLowerCase();
  const cur = (token.normalized ?? token.value).toLowerCase();
  const copula =
    CONDITION_COPULAS.has(prev) ||
    CONDITION_COPULAS.has(translateConnective(language, prevValue)) ||
    (CONDITION_COPULAS_SURFACE.has(prevValue) && CONDITION_PREDICATES.has(cur));
  if (!copula || !copulaIsFirst) return copula;
  const negation =
    prev === 'not' || prev === 'no' || translateConnective(language, prevValue) === 'not';
  const verb =
    token.kind === 'keyword' && COMMAND_ACTION_KEYWORDS.has(cur) && !CONDITION_PREDICATES.has(cur);
  return negation && !verb;
}
