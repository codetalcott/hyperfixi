/**
 * Loops, read without parser state: a loop node from its head's roles, a
 * counted loop's count before or after its verb, a fronted `while` folded into
 * its `repeat`, and a bottom `until` test.
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged.
 */
import type {
  SemanticNode,
  CommandSemanticNode,
  LoopVariant,
  SemanticValue,
  SemanticRole,
  ActionType,
  LanguageToken,
  PatternMatchResult,
  BlockCommandSemanticNode,
} from '../types';
import {
  createCommandNode,
  createLoopNode,
  createLiteral,
  BLOCK_COMMAND_ACTIONS,
  withPosition,
} from '../types';
import { TokenStreamImpl } from '../tokenizers';
import { tryGetProfile } from '../registry';
import { tokenValue } from './token-value';
import { NATIVE_COUNT_WORDS } from '../patterns/count-words';

/**
 * Heads whose body the clause walker nests under them: the loop heads, folded
 * into a {@link LoopSemanticNode}, and `tell`'s and `start view transition`'s,
 * which keep theirs as a {@link BlockCommandSemanticNode}. `while` is not one: a standalone
 * `while` node is the SOV fronted while-phrase that
 * {@link foldFrontedWhileIntoRepeat} merges into its `repeat`,
 * never a loop of its own.
 */
export const BLOCK_HEAD_ACTIONS = new Set(['repeat', 'for', ...BLOCK_COMMAND_ACTIONS]);

/**
 * Where the clause walker consumed a loop's closing `end`. It lives only in the
 * walker's own list: {@link foldLoopBlocks} turns each head … marker span into a
 * loop node before anything else sees the list.
 */
export interface LoopCloseMarker {
  readonly kind: 'loop-close';
}
export const LOOP_CLOSE: LoopCloseMarker = { kind: 'loop-close' };

export type WalkEntry = SemanticNode | LoopCloseMarker;

export function isLoopClose(entry: WalkEntry): entry is LoopCloseMarker {
  return entry === LOOP_CLOSE;
}

/** The name a for-loop binds, from its `patient` role (`for item in …` → `item`). */
export function loopVariableName(value: SemanticValue): string | undefined {
  switch (value.type) {
    case 'expression':
      return value.raw;
    case 'literal':
      return String(value.value);
    case 'reference':
      return value.value;
    default:
      return undefined;
  }
}

/** The forms a loop's `loopType` names: each a variant `buildLoopNode` reads. */
export const LOOP_FORMS: ReadonlySet<string> = new Set([
  'forever',
  'times',
  'for',
  'while',
  'until',
  'until-event',
]);

/**
 * A loop node from a flat head and its body. The head's roles carry over
 * unchanged, so every role and value walker scores the loop exactly as it
 * scored the flat head.
 *
 * A head with no body stays flat, and a flat head's body is every command
 * after it. A loop its own `end` closed (`closed`) is empty, and a command
 * after that `end` is not its body: `repeat 3 times end then increment n`
 * put the increment in the loop, three times over, in English and every
 * language, and dropped it from a bare sequence (PR 126).
 */
export function buildLoopNode(
  head: CommandSemanticNode,
  body: SemanticNode[],
  closed = false,
  bottom?: CommandSemanticNode
): SemanticNode {
  if (bottom) {
    // `repeat <body> until|while <condition> end`: the test follows the body.
    const variant = (bottom.action as string) === 'until' ? 'until' : 'while';
    const condition = bottom.roles.get('condition');
    return createLoopNode(
      'repeat',
      variant,
      {
        loopType: { type: 'literal', value: variant },
        ...(condition ? { condition } : {}),
      },
      body,
      { ...(head.metadata ? { metadata: head.metadata } : {}), bottomTested: true }
    );
  }
  if (body.length === 0 && !closed) return head;
  if (BLOCK_COMMAND_ACTIONS.has(head.action)) {
    const block = { ...head, body } as BlockCommandSemanticNode;
    return block;
  }
  const loopType = head.roles.get('loopType');
  // A number where the loop's form goes is its count: a pattern whose count
  // slot comes second took the count for the form, and the word after it —
  // the language's own `times`, which the render never writes (es `repetir
  // 3 veces`, fr `répéter 3 fois`) — for the count or nothing. The loop read
  // `forever`, a silent infinite loop, or counted to a variable named `fois`
  // (PR 118).
  if (loopType?.type === 'literal' && typeof loopType.value === 'number') {
    const roles = new Map(head.roles);
    roles.set('quantity', loopType);
    roles.set('loopType', { type: 'literal', value: 'times' });
    return buildLoopNode({ ...head, roles }, body, closed);
  }
  const form = loopType?.type === 'literal' ? String(loopType.value) : undefined;
  // `until event X` is an `until` loop; its `loopType` role keeps the exact form.
  const variant: LoopVariant =
    head.action === 'for' || form === 'for'
      ? 'for'
      : form === 'times' || form === 'while' || form === 'forever'
        ? form
        : form === 'until' || form === 'until-event'
          ? 'until'
          : head.roles.has('quantity')
            ? 'times'
            : 'forever';
  let binding = variant === 'for' ? head.roles.get('patient') : undefined;
  // `repeat in <collection>` binds `it` (repeat-en-in): a binding the loop
  // writes (`repeat for it in …`), not an implicit role a render leaves out.
  if (binding && (binding as { implicit?: boolean }).implicit) {
    binding = { type: 'reference', value: 'it' };
    const roles = new Map(head.roles);
    roles.set('patient', binding);
    return buildLoopNode({ ...head, roles }, body, closed);
  }
  const loopVariable = binding ? loopVariableName(binding) : undefined;
  // A while or until loop's one operand is its condition. The generated SOV
  // repeat pattern names its operand slot `quantity`, and a fronted
  // while-phrase (ko `동안 #counter.innerText < 10 를 … 반복`) fills it whole
  // now that a value run can start with a property path. buildLoop reads the
  // condition alone, so a loop left with a `quantity` would have none.
  const roles = new Map(head.roles);
  const operand = roles.get('quantity');
  if ((variant === 'while' || variant === 'until') && operand && !roles.has('condition')) {
    roles.set('condition', operand);
    roles.delete('quantity');
  }
  return createLoopNode(
    head.action === 'for' ? 'for' : 'repeat',
    variant,
    Object.fromEntries(roles),
    body,
    {
      ...(loopVariable ? { loopVariable } : {}),
      ...(head.metadata ? { metadata: head.metadata } : {}),
    }
  );
}

/**
 * Merge a fronted `while {condition}` clause into the adjacent `repeat` head.
 *
 * The SOV reorder fronts a repeat-while's while-phrase BEFORE the event phrase
 * (hi `जब तक #counter.innerText < 10 को क्लिक पर दोहराएं …`, ko `동안 … 반복 …`),
 * so the body splits into a standalone `while{condition}` node followed by a
 * bare `repeat` — while the en reference (cluster D, #567) canonicalizes the
 * same head as ONE `repeat{loopType:"while", condition}` node. The split costs
 * both recall (repeat.condition/loopType missing) and precision (the standalone
 * `while` is spurious vs the en reference). Re-associate them, mirroring the
 * trailing-`unless` guard recovery in parseClause.
 *
 * Conservative: fires only when a flat `while` COMMAND node carrying a
 * condition is immediately followed by a flat `repeat` command that has no
 * condition of its own and no attached body. A ko/ja/tr `repeat` that grabbed a
 * junk numeric loopType from the fronted condition's comparison tail
 * (`loopType:10` from `< 10 를`) is overwritten — the fronted while-phrase IS
 * the loop head, so `loopType` is `"while"` by construction. Loop nodes with
 * bodies (`kind: 'loop'`) and conditionals never enter the fold.
 */
export function foldFrontedWhileIntoRepeat(clauses: WalkEntry[], language: string): void {
  for (let i = 0; i + 1 < clauses.length; i++) {
    const whileNode = clauses[i] as CommandSemanticNode & { body?: unknown };
    const repeatNode = clauses[i + 1] as CommandSemanticNode & { body?: unknown };
    if (whileNode.kind !== 'command' || whileNode.action !== 'while') continue;
    if (repeatNode.kind !== 'command' || repeatNode.action !== 'repeat') continue;
    const condition = whileNode.roles.get('condition');
    if (!condition) continue;
    if (repeatNode.roles.has('condition')) continue;
    if (Array.isArray(whileNode.body) || Array.isArray(repeatNode.body)) continue;

    const roles = new Map(repeatNode.roles);
    roles.set('condition', condition);
    roles.set('loopType', { type: 'literal', value: 'while', dataType: 'string' });
    clauses.splice(i, 2, {
      ...repeatNode,
      roles,
      metadata: {
        ...repeatNode.metadata,
        sourceLanguage: language,
        patternId: `repeat-${language}-fronted-while-fold`,
        confidence: Math.max(
          repeatNode.metadata?.confidence ?? 0,
          whileNode.metadata?.confidence ?? 0
        ),
      },
    });
  }
}

/**
 * The count beside a repeat verb no loop pattern matched: a number after the
 * verb (consumed with the marker before it and one word after it), or before
 * it (taken off the end of `skipped` with the same). The stream stands just
 * past the verb.
 *
 * The counted patterns of he, hi, qu and zh write a marker by the count and
 * the English `times` after it (he `חזור את {quantity} times`, hi
 * `{quantity} times को repeat`). A writer's own word (he `פעמים`, zh `次`, hi
 * `बार`, qu `kuti`) matches no pattern, so the walk emitted a bare `repeat`
 * and dropped the count: a silent infinite loop (PR 119). A number beside
 * the verb, past at most the marker and one word, is the count, as a number
 * where the loop's form goes is (PR 118).
 */
export function takeRepeatCount(
  stream: TokenStreamImpl,
  skipped: LanguageToken[],
  language: string
): LanguageToken | undefined {
  if (tryGetProfile(language)?.wordOrder === 'SOV') {
    const at = countBeforeVerb(skipped, language);
    if (at < 0) return undefined;
    const count = skipped[at];
    skipped.length = at;
    return count;
  }
  // After it: [marker] <number> [word] (he `חזור את 3 פעמים`), or any count
  // before the language's own word (zh `重复 n 次`).
  const mark = stream.mark();
  if (stream.peek()?.kind === 'particle') stream.advance();
  const count = stream.peek();
  if (count && countsBefore(count, stream.peek(1), language)) {
    stream.advance();
    stream.advance();
    return count;
  }
  if (!isCountToken(count)) {
    stream.reset(mark);
    return undefined;
  }
  stream.advance();
  if (stream.peek()?.kind === 'identifier') stream.advance();
  return count;
}

/** A number, as PR 118 reads one where the loop's form goes. */
export function isCountToken(t: LanguageToken | null | undefined): t is LanguageToken {
  const value = t?.kind === 'literal' ? tokenValue(t) : null;
  return value?.type === 'literal' && typeof value.value === 'number';
}

/**
 * Is `count` a loop's count because the language's own word for `times`
 * follows it (ja `n 回`, zh `n 次`)? Then it need be no number: a variable
 * counts too, where the counted heads need a marker the writer may leave out
 * (PR 127).
 */
export function countsBefore(
  count: LanguageToken | null | undefined,
  word: LanguageToken | null | undefined,
  language: string
): boolean {
  if (!count || !word || !NATIVE_COUNT_WORDS[language]?.includes(word.value)) return false;
  return count.kind === 'identifier' || isCountToken(count);
}

/**
 * Where a count stands at the end of a run an SOV loop verb follows:
 * `<number> [word] [marker]` (hi `3 बार को दोहराएं`), or any count before the
 * language's own word (ja `n 回 繰り返す`). Its index, or -1.
 */
export function countBeforeVerb(run: readonly LanguageToken[], language: string): number {
  const isCount = isCountToken;
  let end = run.length;
  if (run[end - 1]?.kind === 'particle') end--;
  if (countsBefore(run[end - 2], run[end - 1], language)) return end - 2;
  if (run[end - 1]?.kind === 'identifier' && isCount(run[end - 2])) end--;
  return isCount(run[end - 1]) ? end - 1 : -1;
}

/**
 * Whether a repeat match anchored at the verb read the loop's body as its
 * head. An SOV loop head ends with its verb, so a match that starts there
 * reads on into the body. With a count before the verb, the verb ended the
 * head, whatever matched after it: hi `3 बार को दोहराएं 1 को रखें #out में`
 * (put 1 into #out) counted to 1, and `3 बार को दोहराएं मैं में hello पर
 * भेजें` (send hello to me) read `repeat for me in hello`. Without one, the
 * verb-first fallback (qu `kutipay {loopType}`) took the body's first value
 * for the form unless it is one: qu `kutipay 1s suyay` read `repeat 1s`,
 * and the wait was gone; a code-switched `kutipay forever` or a number is the
 * head's. Such a match gives the verb back as a bare head (PR 120).
 */
export function loopHeadReadsBody(
  match: PatternMatchResult,
  skipped: readonly LanguageToken[],
  language: string
): boolean {
  if (tryGetProfile(language)?.wordOrder !== 'SOV') return false;
  if (countBeforeVerb(skipped, language) >= 0) return true;
  const form = match.captured.get('loopType' as SemanticRole);
  return (
    form?.type === 'literal' &&
    typeof form.value !== 'number' &&
    !LOOP_FORMS.has(String(form.value))
  );
}

/**
 * Is `entry` the bottom test of the loop open in `frame`: a `while`/`until`
 * after the body of a `repeat` with no test of its own, right before that
 * loop's `end` (or the end of the input)? An SOV while-phrase comes before
 * its `repeat` (foldFrontedWhileIntoRepeat), never before an `end`.
 */
export function isBottomTest(
  entry: WalkEntry,
  frame: { head: CommandSemanticNode; body: SemanticNode[]; bottom?: SemanticNode } | undefined,
  next: WalkEntry | undefined
): entry is CommandSemanticNode {
  if (isLoopClose(entry) || entry.kind !== 'command') return false;
  if ((entry.action as string) !== 'until' && entry.action !== 'while') return false;
  if (!frame || frame.bottom || frame.body.length === 0 || frame.head.action !== 'repeat') {
    return false;
  }
  const form = frame.head.roles.get('loopType');
  if (form && !(form.type === 'literal' && form.value === 'forever')) return false;
  if (frame.head.roles.has('quantity')) return false;
  return next === undefined || isLoopClose(next);
}

/** A loop head for a repeat verb no loop pattern matched: counted, or bare (`forever`). */
export function bareRepeatHead(count: LanguageToken | undefined, language: string): SemanticNode {
  const quantity = count ? tokenValue(count) : null;
  return createCommandNode(
    'repeat' as ActionType,
    count && quantity
      ? {
          loopType: createLiteral('times'),
          quantity: withPosition(quantity, {
            start: count.position.start,
            end: count.position.end,
          }),
        }
      : {},
    { sourceLanguage: language, confidence: 0.6 }
  );
}
