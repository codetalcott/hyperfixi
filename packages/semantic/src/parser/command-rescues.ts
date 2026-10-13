/**
 * Per-command rescues `parseInternal` tries on a whole statement before the
 * general stages: a `do not throw` flag, `tell X to …`, `scroll` with a
 * position or an amount, a loop's `with index`, `wait for a or b`, and the
 * language's own `elsewhere` and scroll directions read before parsing.
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged, except that those that re-parse take the parser's
 * `parse` as their last parameter.
 */
import type {
  SemanticNode,
  SemanticValue,
  SemanticRole,
  LanguageToken,
  WaitAlternative,
} from '../types';
import { createSelector, createLiteral, createReference } from '../types';
import { tokenize as tokenizeInternal } from '../tokenizers';
import { getPatternsForLanguage, tryGetProfile } from '../registry';
import { getSchema } from '../generators/command-schemas';
import { loneKeywordKind } from './utils/expression-lexicon';
import { isOrWordToken } from './utils/or-words';
import { NOT_THROW_BY_LANG } from './utils/not-throw';
import { GRAMMAR_WORDS, grammarWordForms } from './utils/grammar-words';
import { NODE_CHILD_FIELDS, type NodeChildren } from './parse-diagnostics';
import { eventNameTranslations, normalizeEventName } from '../patterns/event-handler';
import { KNOWN_EVENTS, WAITABLE_EVENT_WORDS, matchEventParamPhrase } from './event-words';
import type { ParseFn } from './parse-fn';

/**
 * The position words of `go`/`scroll` (`go to the top of #d1`), as core's
 * parser reads them. `nearest` is core's own; upstream has no such word.
 */
export const SCROLL_POSITIONS = new Set([
  'top',
  'middle',
  'bottom',
  'left',
  'center',
  'right',
  'nearest',
]);

/** The adverbs a `go`/`scroll` takes, and core's `modifiers.behavior` for each. */
export const SCROLL_ADVERBS = new Set(['smoothly', 'instantly']);

/** The directions of `scroll [<el>] up|down|left|right by <n>` (the engine's `direction`). */
export const SCROLL_DIRECTIONS = new Set(['up', 'down', 'left', 'right']);

/** The words that may follow a scroll's direction: the amount's marker (`by`, es `por`). */
export function scrollByMarkers(language: string): ReadonlySet<string> {
  const quantity = getSchema('scroll')?.roles.find(r => r.role === 'quantity');
  const own = quantity?.markerOverride?.[language];
  const marker = tryGetProfile(language)?.roleMarkers?.quantity;
  const words = ['by', own, marker?.primary, ...(marker?.alternatives ?? [])];
  return new Set(words.filter((w): w is string => !!w).map(w => w.toLowerCase()));
}

/** Does the token read as a scroll amount: a number, a length (`200px`), a sigil name? */
export function isScrollAmount(tok: LanguageToken | undefined): boolean {
  if (!tok) return false;
  return tok.kind === 'literal' || /^[-\d.$:]/.test(tok.value);
}

/**
 * Does `value` read as `tok`? A selector compares its text, a reference its
 * normalized word (es `yo` is `me`), an expression its first word.
 */
export function sameSurface(value: SemanticValue, tok: LanguageToken | undefined): boolean {
  if (!tok) return false;
  const text = tok.value.toLowerCase();
  switch (value.type) {
    case 'selector':
      return value.value.toLowerCase() === text;
    case 'reference':
      return value.value === (tok.normalized ?? tok.value).toLowerCase() || value.value === text;
    case 'expression':
      return value.raw.toLowerCase().split(/\s+/)[0] === text;
    default:
      return String('value' in value ? value.value : '').toLowerCase() === text;
  }
}

/** A `wait for`'s `from` value: a reference word, a selector, or an expression. */
export function waitSourceValue(tok: LanguageToken): SemanticValue {
  const norm = (tok.normalized ?? tok.value).toLowerCase();
  if (norm === 'document' || norm === 'window' || norm === 'me' || norm === 'body') {
    return createReference(norm);
  }
  if (tok.kind === 'selector') return createSelector(tok.value);
  return { type: 'expression', raw: tok.value };
}

/**
 * A `wait for` run with more than its first event: `wait for pointermove(
 * clientX, clientY) or pointerup(clientX, clientY) from document`, `wait for
 * keyup or 1s`. No wait pattern captures past the first event, so the params,
 * the alternatives and the `from` source were dropped in every language: a
 * translated drag behavior waited on the element instead of the document,
 * with its coordinates unbound. Excise the run's extras, re-parse, and hang
 * them on the wait node the re-parse built (`waitAlternatives`, `waitSource`).
 * One run per call: the re-parse is a `parse`, so it takes the next.
 *
 * The run: an event word, its param phrase, then `<or> <event|duration>`
 * legs, and a source phrase after them (`from X`, or `X から` where the marker
 * follows its noun). It must be a wait's
 * argument: the wait verb just before it (verb-first) or just after it
 * (verb-final). A run with nothing past its first event is left alone.
 */
/**
 * A `go`/`scroll` position (`go to the top of #d1`, `scroll to bottom of me`)
 * and a trailing `smoothly`/`instantly`. No go or scroll pattern reads
 * either: the position word took the destination's slot and the element was
 * dropped (`go top`, and `scroll to top`, which throws), and the adverb was
 * dropped, in English and so in every translation. So the phrase is excised
 * BEFORE any pattern sees it and the rest re-parsed, as tryDoNotThrow does.
 * A position attaches to the go/scroll whose destination starts last at or
 * before where the phrase stood (the text before it keeps its offsets, or
 * moves left when the re-parse strips a modifier), and only when that
 * destination is the word that followed `of`: `go to #a then put the top of
 * #d1 into x` keeps its `put`. An adverb attaches to the go/scroll whose
 * destination starts last before it. Both are English in every language, as
 * the renderer writes them. One phrase per call: the re-parse takes the next.
 */
export function tryScrollModifiers(
  arr: readonly LanguageToken[],
  input: string,
  language: string,
  parse: ParseFn
): SemanticNode | null {
  const word = (t: LanguageToken | undefined): string => t?.value.toLowerCase() ?? '';
  let first = -1;
  let last = -1;
  for (let k = 0; k < arr.length && first < 0; k++) {
    let j = word(arr[k]) === 'the' ? k + 1 : k;
    if (!SCROLL_POSITIONS.has(word(arr[j]))) continue;
    if (SCROLL_POSITIONS.has(word(arr[j + 1]))) j++;
    if (word(arr[j + 1]) !== 'of' || !arr[j + 2]) continue;
    first = k;
    last = j + 1;
  }
  const adverb = first < 0 ? arr.findIndex(t => SCROLL_ADVERBS.has(word(t))) : -1;
  // `scroll [#box] down by 200px`: a direction before the amount's marker, or
  // before the amount where the language writes it bare (ja `下 200px`). A
  // position reads `left of #x`; a direction never takes `of`.
  const byWords = scrollByMarkers(language);
  const direction =
    first < 0 && adverb < 0
      ? arr.findIndex(
          (t, k) =>
            SCROLL_DIRECTIONS.has(word(t)) &&
            (byWords.has(word(arr[k + 1])) || isScrollAmount(arr[k + 1]))
        )
      : -1;
  if (first < 0 && adverb < 0 && direction < 0) return null;
  const start = first >= 0 ? first : adverb >= 0 ? adverb : direction;
  const end = first >= 0 ? last : start;
  const head = input.slice(0, arr[start].position.start).trimEnd();
  const tail = input.slice(arr[end].position.end).trimStart();
  const at = head ? head.length + 1 : 0;
  try {
    const reparsed = parse(head ? `${head} ${tail}` : tail, language);
    const commands: SemanticNode[] = [];
    const collect = (n: SemanticNode | undefined): void => {
      if (!n) return;
      if (n.kind === 'command' && (n.action === 'go' || n.action === 'scroll')) commands.push(n);
      const children = n as NodeChildren;
      for (const field of NODE_CHILD_FIELDS) {
        const child = children[field];
        if (Array.isArray(child)) child.forEach(c => collect(c as SemanticNode));
      }
    };
    collect(reparsed ?? undefined);
    // A scroll-by has no destination: its amount anchors it.
    const destinationStart = (n: SemanticNode): number =>
      n.roles.get('destination' as SemanticRole)?.position?.start ??
      n.roles.get('quantity' as SemanticRole)?.position?.start ??
      -1;
    const lastBefore = (limit: number): SemanticNode | undefined =>
      commands
        .filter(n => destinationStart(n) >= 0 && destinationStart(n) <= limit)
        .reduce<SemanticNode | undefined>(
          (best, n) => (!best || destinationStart(n) > destinationStart(best) ? n : best),
          undefined
        );
    if (!reparsed) return null;
    if (first >= 0) {
      const target = lastBefore(at);
      const destination = target?.roles.get('destination' as SemanticRole);
      const after = arr[last + 1];
      if (!target || !destination || !sameSurface(destination, after)) return null;
      const phrase = arr.slice(first, last).map(t => t.value.toLowerCase());
      (target as { scrollPosition?: string }).scrollPosition = phrase.join(' ');
    } else if (adverb >= 0) {
      const target = lastBefore(arr[adverb].position.start - 1);
      if (!target) return null;
      (target as { scrollBehavior?: string }).scrollBehavior = word(arr[adverb]);
    } else {
      // The scroll whose amount is the next thing read after the direction's
      // place (the text before it keeps its offsets in the re-parse).
      // (A fused handler's command carries no positions: then the last
      // scroll with an amount, the one the direction stood in.)
      const quantityStart = (n: SemanticNode): number =>
        n.roles.get('quantity' as SemanticRole)?.position?.start ?? -1;
      const scrolls = commands.filter(n => n.action === 'scroll');
      const withAmount = scrolls.some(n => n.roles.has('quantity' as SemanticRole))
        ? scrolls.filter(n => n.roles.has('quantity' as SemanticRole))
        : scrolls.filter(n => n.roles.has('destination' as SemanticRole));
      const target = withAmount.some(n => quantityStart(n) >= 0)
        ? withAmount
            .filter(n => quantityStart(n) >= at - 1)
            .reduce<SemanticNode | undefined>(
              (best, n) => (!best || quantityStart(n) < quantityStart(best) ? n : best),
              undefined
            )
        : withAmount[withAmount.length - 1];
      if (!target) return null;
      const targetRoles = target.roles as Map<SemanticRole, SemanticValue>;
      const dest = targetRoles.get('destination');
      // A handler's fused pattern has no bare amount slot (a bare trailing
      // slot would take what follows): `прокрутити #box 200px` read the
      // element as the destination and left the amount. Then the amount is
      // the token after the direction (and its marker), read here, out of a
      // re-parse without it, and the element is the patient.
      const amountAt = byWords.has(word(arr[direction + 1])) ? direction + 2 : direction + 1;
      const amount = arr[amountAt];
      if (
        dest &&
        !targetRoles.has('quantity') &&
        (dest.type === 'selector' || dest.type === 'reference') &&
        isScrollAmount(amount)
      ) {
        const without = `${head} ${input.slice(amount.position.end).trimStart()}`.trim();
        const again = parse(without, language);
        const scrolls: SemanticNode[] = [];
        const walk = (n: SemanticNode | undefined): void => {
          if (!n) return;
          if (n.kind === 'command' && n.action === 'scroll') scrolls.push(n);
          for (const field of NODE_CHILD_FIELDS) {
            const child = (n as NodeChildren)[field];
            if (Array.isArray(child)) child.forEach(c => walk(c as SemanticNode));
          }
        };
        walk(again ?? undefined);
        const element = scrolls.filter(n => n.roles.has('destination' as SemanticRole)).pop();
        if (!again || !element) return null;
        const roles = element.roles as Map<SemanticRole, SemanticValue>;
        const el = roles.get('destination')!;
        roles.delete('destination');
        roles.set('patient', el);
        // As the English pattern types it: a number, a sigil name, else an expression.
        roles.set(
          'quantity',
          /^-?\d+(\.\d+)?$/.test(amount.value)
            ? createLiteral(Number(amount.value), 'number')
            : /^[$:]/.test(amount.value)
              ? ({ type: 'reference', value: amount.value } as SemanticValue)
              : { type: 'expression', raw: amount.value }
        );
        (element as { scrollDirection?: string }).scrollDirection = word(arr[direction]);
        return again;
      }
      (target as { scrollDirection?: string }).scrollDirection = word(arr[direction]);
      // The by-form has no destination: one read (a variable amount a fused
      // handler head took for the element, `scroll down by x`) is the amount.
      if (dest && !targetRoles.has('quantity')) {
        targetRoles.delete('destination');
        targetRoles.set('quantity', dest);
      }
    }
    return reparsed;
  } catch {
    return null;
  }
}

/**
 * `from elsewhere` in the language's own word (M2 sheet B4, grammar-words.ts:
 * es `de afuera`, ja `外側 から`), read as English's: the word is written as
 * `elsewhere` before any stage sees it, where it sits against the language's
 * `from` marker, on the side the marker takes (before it, or after it in a
 * postpositional language). Every stage already reads English's word in every
 * language: the handler's `from`, the SOV event strip, a floated phrase's
 * reclaim.
 */
export function readNativeElsewhere(input: string, language: string): string {
  const native = GRAMMAR_WORDS[language]?.elsewhere;
  const marker = tryGetProfile(language)?.roleMarkers?.source;
  if (!native || !marker) return input;
  const form = tokenizeInternal(native, language).tokens.map(t => t.value.toLowerCase());
  // By the word's first token, as a render spaces the tokens.
  if (!form[0] || !input.toLowerCase().includes(form[0])) return input;
  const markers = new Set(
    [marker.primary, ...(marker.alternatives ?? [])].map(m => m.toLowerCase())
  );
  const tokens = tokenizeInternal(input, language).tokens as LanguageToken[];
  const isMarker = (t: LanguageToken | undefined) => !!t && markers.has(t.value.toLowerCase());
  let out = input;
  // From the end, so each replacement leaves the offsets before it.
  for (let i = tokens.length - form.length; i >= 0; i--) {
    if (!form.every((w, j) => tokens[i + j]!.value.toLowerCase() === w)) continue;
    const placed =
      marker.position === 'after' ? isMarker(tokens[i + form.length]) : isMarker(tokens[i - 1]);
    if (!placed) continue;
    const start = tokens[i]!.position.start;
    const end = tokens[i + form.length - 1]!.position.end;
    out = out.slice(0, start) + 'elsewhere' + out.slice(end);
  }
  return out;
}

/**
 * A scroll's direction in the language's own word (M2 sheet B9, grammar-words.ts:
 * es `abajo por 200px`, ja `下 200px`), read as English's: the word is written as
 * `down` before any stage sees it, where it stands before the amount's marker or
 * the amount itself (tryScrollModifiers reads it there). Nowhere else: es
 * `tecla arriba` is keyup, and a variable spelled like a direction keeps its name.
 */
export function readNativeDirection(input: string, language: string): string {
  const words = GRAMMAR_WORDS[language];
  if (!words) return input;
  const byWords = scrollByMarkers(language);
  const lower = input.toLowerCase();
  let tokens: LanguageToken[] | undefined;
  let out = input;
  const edits: Array<[number, number, string]> = [];
  for (const key of ['up', 'down', 'left', 'right'] as const) {
    const native = words[key];
    if (!native || native === key) continue;
    const form = tokenizeInternal(native, language).tokens.map(t => t.value.toLowerCase());
    if (!form[0] || !lower.includes(form[0])) continue;
    tokens ??= tokenizeInternal(input, language).tokens as LanguageToken[];
    for (let i = 0; i + form.length <= tokens.length; i++) {
      if (!form.every((w, j) => tokens![i + j]!.value.toLowerCase() === w)) continue;
      const next = tokens[i + form.length];
      if (!next || !(byWords.has(next.value.toLowerCase()) || isScrollAmount(next))) continue;
      edits.push([tokens[i]!.position.start, tokens[i + form.length - 1]!.position.end, key]);
    }
  }
  // From the end, so each replacement leaves the offsets before it.
  for (const [start, end, key] of edits.sort((a, b) => b[0] - a[0])) {
    out = out.slice(0, start) + key + out.slice(end);
  }
  return out;
}

/**
 * `fetch … do not throw` (or `don't throw`). No fetch pattern reads the phrase, so it dropped,
 * in English and so in every translation: a translated fetch then threw on a
 * 404 its author told it to tolerate. Worse, other languages' patterns read
 * its words: pl's `do` is its own "to" (a destination `not`), and ja took
 * `do` for a response type. So the phrase is excised BEFORE any pattern sees
 * it, the rest re-parsed, and the flag set on the fetch it followed: the one
 * whose source starts last before the phrase (the text before the phrase keeps
 * its offsets in the re-parse). By position, not by counting fetch verbs: he
 * `הבא` and id `muat` do not normalize to `fetch`, though their patterns read
 * them as it. Each language writes its own words for it (not-throw.ts),
 * after the whole command, and English's phrase is read in every language.
 * One phrase per call: the re-parse takes the next.
 */
export function tryDoNotThrow(
  arr: readonly LanguageToken[],
  input: string,
  language: string,
  parse: ParseFn
): SemanticNode | null {
  const word = (t: LanguageToken | undefined) => t?.value.toLowerCase();
  const native = language === 'en' ? [] : (NOT_THROW_BY_LANG[language] ?? []);
  // `do not throw`, or upstream's contraction `don't throw` (`don`, `'`, `t`),
  // or the language's own words (not-throw.ts).
  const phraseEnd = (k: number): number => {
    if (word(arr[k]) === 'do' && word(arr[k + 1]) === 'not' && word(arr[k + 2]) === 'throw') {
      return k + 2;
    }
    if (native.length && native.every((w, j) => word(arr[k + j]) === w.toLowerCase())) {
      return k + native.length - 1;
    }
    const contracted =
      word(arr[k]) === 'don' &&
      word(arr[k + 1]) === "'" &&
      word(arr[k + 2]) === 't' &&
      arr[k]!.position.end === arr[k + 1]!.position.start &&
      arr[k + 1]!.position.end === arr[k + 2]!.position.start;
    return contracted && word(arr[k + 3]) === 'throw' ? k + 3 : -1;
  };
  const at = arr.findIndex((_t, k) => phraseEnd(k) >= 0);
  if (at < 0) return null;
  const end = phraseEnd(at);
  const phraseStart = arr[at].position.start;
  const reduced = (
    input.slice(0, arr[at].position.start).trimEnd() +
    ' ' +
    input.slice(arr[end].position.end).trimStart()
  ).trim();
  try {
    const reparsed = parse(reduced, language);
    const fetches: SemanticNode[] = [];
    const collect = (n: SemanticNode | undefined): void => {
      if (!n) return;
      if (n.kind === 'command' && n.action === 'fetch') fetches.push(n);
      const children = n as NodeChildren;
      for (const field of NODE_CHILD_FIELDS) {
        const child = children[field];
        if (Array.isArray(child)) child.forEach(c => collect(c as SemanticNode));
      }
    };
    collect(reparsed ?? undefined);
    const sourceStart = (n: SemanticNode) =>
      n.roles.get('source' as SemanticRole)?.position?.start ?? -1;
    const target = fetches
      .filter(n => sourceStart(n) >= 0 && sourceStart(n) < phraseStart)
      .reduce<SemanticNode | undefined>(
        (best, n) => (!best || sourceStart(n) > sourceStart(best) ? n : best),
        undefined
      );
    if (!reparsed || !target) return null;
    (target as { doNotThrow?: boolean }).doNotThrow = true;
    return reparsed;
  } catch {
    return null;
  }
}

/**
 * `tell <target> to <command>`, core's form (upstream rejects the `to`). No
 * tell pattern reads the `to`, so it dropped in silence, in English and so in
 * every translation. And pl reads `to` as its own word ("it"). So, as with
 * tryDoNotThrow, the word is excised BEFORE any pattern sees it and the rest
 * re-parsed, when it follows a tell: the one whose target starts last before
 * it, with only that tell's own words in between. The `to` is READ and not
 * written: the node is the one `tell <target> <command>` gives, and the
 * renderer writes that form, the one upstream and @hyperfixi/engine accept
 * (2026-10-01; it rendered as written before). One `to` per call: the
 * re-parse takes the next.
 */
export function tryTellTo(
  arr: readonly LanguageToken[],
  input: string,
  language: string,
  parse: ParseFn
): SemanticNode | null {
  // English keywords carry no normalized form; the surface is the word.
  const isTell = (t: LanguageToken): boolean => (t.normalized ?? t.value).toLowerCase() === 'tell';
  const firstTell = arr.findIndex(isTell);
  if (firstTell < 0) return null;
  // The marker between the target and a clause-final verb (ja `に`, tr `e`).
  const marker = tryGetProfile(language)?.roleMarkers?.destination;
  const markerForms = new Set(
    [marker?.primary, ...(marker?.alternatives ?? [])].filter((w): w is string => !!w)
  );
  for (let at = firstTell + 1; at < arr.length; at++) {
    if (arr[at].value.toLowerCase() !== 'to') continue;
    const wordStart = arr[at].position.start;
    const reduced = (
      input.slice(0, wordStart).trimEnd() +
      ' ' +
      input.slice(arr[at].position.end).trimStart()
    ).trim();
    try {
      const reparsed = parse(reduced, language);
      if (!reparsed) continue;
      const commands: SemanticNode[] = [];
      const collect = (n: SemanticNode | undefined): void => {
        if (!n) return;
        if (n.kind === 'command') commands.push(n);
        const children = n as NodeChildren;
        for (const field of NODE_CHILD_FIELDS) {
          const child = children[field];
          if (Array.isArray(child)) child.forEach(c => collect(c as SemanticNode));
        }
      };
      collect(reparsed);
      const targetStart = (n: SemanticNode) =>
        n.roles.get('destination' as SemanticRole)?.position?.start ?? -1;
      const told = commands
        .filter(n => n.action === 'tell' && targetStart(n) >= 0 && targetStart(n) < wordStart)
        .reduce<SemanticNode | undefined>(
          (best, n) => (!best || targetStart(n) > targetStart(best) ? n : best),
          undefined
        );
      if (!told) continue;
      // Only the tell's own words between its target and the `to`: its verb
      // and marker where the verb ends the clause (`#modal に 伝える to`),
      // nothing where it leads (`tell #modal to`). A `to` further on is some
      // other command's, and excising it can drop that command from the
      // re-parse (`tell #modal set my.x to 1`), so the words are read from
      // the input, not from the re-parse. The text before the `to` keeps its
      // offsets there.
      const targetEnd = told.roles.get('destination' as SemanticRole)?.position?.end ?? -1;
      if (targetEnd < 0) continue;
      const gap = arr.filter(t => t.position.start >= targetEnd && t.position.start < wordStart);
      if (!gap.every(t => isTell(t) || markerForms.has(t.value))) continue;
      return reparsed;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * A loop's index variable: upstream's `index i` after the loop head (`repeat
 * for x in xs index i`, `repeat 3 times index i`; both engines), or core's
 * `with index`, which binds `index` (upstream rejects it). Nothing read
 * either, so both dropped, in English and so in every translation, and the
 * body's `i` was unbound. As with tryTellTo, the phrase is excised before any
 * pattern sees it, the rest re-parsed, and the variable set on the loop it
 * follows: the one whose head's last value ends last before it, when only
 * that loop's own words sit in between (`3 times を repeat index i`). Each
 * language writes its own word for `index` (grammar-words.ts, M2 sheet B5)
 * after the loop head, and English's is read in every language; `with index`
 * is read and written back as `index index`, the same binding in the form
 * both engines accept (2026-10-01). One phrase per call: the re-parse takes
 * the next.
 */
export function tryLoopIndex(
  arr: readonly LanguageToken[],
  input: string,
  language: string,
  parse: ParseFn
): SemanticNode | null {
  const word = (t: LanguageToken | undefined) => t?.value.toLowerCase();
  // The loop's own words: the literals its patterns write, where a
  // localized `times` lives too (ms `kali`, th `ครั้ง`: plain identifiers,
  // not keywords), and their alternatives (ja `繰り返す`). The literals in
  // optional groups are `from` markers no render writes in that gap.
  const loopWords = new Set<string>();
  for (const pattern of getPatternsForLanguage(language)) {
    if (pattern.command !== 'repeat' && pattern.command !== 'for') continue;
    for (const t of pattern.template.tokens) {
      if (t.type !== 'literal') continue;
      for (const w of [t.value, ...(t.alternatives ?? [])]) loopWords.add(w.toLowerCase());
    }
  }
  // By surface: the pattern writes the word, and a particle's normalized
  // form is a role, not the word (qu `3 times ta repeat`).
  const isLoopWord = (t: LanguageToken): boolean => loopWords.has(t.value.toLowerCase());
  // `with` in English or in the language's own word (its `with` marker, sw
  // `na`, es `con`): a hand-written translation writes it, and sw's `na` is
  // also its `and`, which read `na index` into the loop's source.
  const withWord = tryGetProfile(language)?.roleMarkers?.style?.primary?.toLowerCase();
  const isWith = (t: LanguageToken | undefined): boolean =>
    word(t) === 'with' || (!!withWord && word(t) === withWord);
  // `index` in English or in the language's own word (grammar-words.ts),
  // as the tokens it is written in: how many it takes at `at`, or 0.
  const indexForms = grammarWordForms(language, 'index', w =>
    tokenizeInternal(w, language).tokens.map(t => t.value)
  );
  const indexWordAt = (at: number): number =>
    indexForms.find(form => form.every((w, j) => word(arr[at + j]) === w))?.length ?? 0;
  for (let at = 0; at + 1 < arr.length; at++) {
    const withIndex = isWith(arr[at]) && word(arr[at + 1]) === 'index';
    // Upstream's other spelling, `indexed by i`: the same binding.
    const indexedBy = word(arr[at]) === 'indexed' && word(arr[at + 1]) === 'by' && !!arr[at + 2];
    const indexWord = indexWordAt(at);
    const named = (indexWord > 0 && !!arr[at + indexWord]) || indexedBy;
    if (!withIndex && !named) continue;
    const nameTok = arr[indexedBy ? at + 2 : withIndex ? at + 1 : at + indexWord]!;
    // English's `index` before a marker, in a language with its own word, is
    // a variable named `index`: a verb-final body that opens on one writes
    // its marker next (ja `index を x に 置く`), which read as the loop's
    // `index を` and lost the put. After the language's own word a marker's
    // spelling can be the name (tr `indeks i`).
    const english = indexWord > 0 && word(arr[at]) === 'index';
    if (english && nameTok.kind === 'particle' && indexForms.length > 1) continue;
    const phraseStart = arr[at].position.start;
    const reduced = (
      input.slice(0, phraseStart).trimEnd() +
      ' ' +
      input.slice(nameTok.position.end).trimStart()
    ).trim();
    try {
      const reparsed = parse(reduced, language);
      if (!reparsed) continue;
      const loops: SemanticNode[] = [];
      const collect = (n: SemanticNode | undefined): void => {
        if (!n) return;
        if (n.kind === 'loop') loops.push(n);
        const children = n as NodeChildren;
        for (const field of NODE_CHILD_FIELDS) {
          const child = children[field];
          if (Array.isArray(child)) child.forEach(c => collect(c as SemanticNode));
        }
      };
      collect(reparsed);
      // Where a loop's head ends: its last value before the phrase.
      const headEnd = (n: SemanticNode): number =>
        Math.max(
          -1,
          ...[...n.roles.values()].map(v => v.position?.end ?? -1).filter(end => end <= phraseStart)
        );
      const loop = loops
        .filter(n => headEnd(n) >= 0)
        .reduce<SemanticNode | undefined>(
          (best, n) => (!best || headEnd(n) > headEnd(best) ? n : best),
          undefined
        );
      if (!loop) continue;
      // Only the loop's own words between its head's last value and the
      // phrase, read from the input (the text before the phrase keeps its
      // offsets in the re-parse): a body's `index i` is a variable.
      const gap = arr.filter(
        t => t.position.start >= headEnd(loop) && t.position.start < phraseStart
      );
      // The word right after a number count is the loop's own `times`,
      // written in the language's own spelling no pattern knows (es `3
      // veces`, ja `3 回`): buildLoopNode reads the number as the count
      // whatever follows it (PR 118).
      const count = loop.roles.get('quantity');
      const countEnd =
        count?.type === 'literal' && typeof count.value === 'number'
          ? count.position?.end
          : undefined;
      const timesWord =
        countEnd === undefined ? undefined : arr.find(t => t.position.start >= countEnd);
      if (!gap.every(t => t === timesWord || isLoopWord(t))) continue;
      (loop as { indexVariable?: string }).indexVariable = withIndex ? 'index' : nameTok.value;
      return reparsed;
    } catch {
      continue;
    }
  }
  return null;
}

export function tryWaitAlternatives(
  arr: readonly LanguageToken[],
  input: string,
  language: string,
  parse: ParseFn
): SemanticNode | null {
  // English keywords carry no normalized form; the surface is the word.
  const isWait = (t: LanguageToken | undefined): boolean =>
    !!t && (t.normalized ?? t.value).toLowerCase() === 'wait';
  if (!arr.some(t => isWait(t))) return null;
  const norm = (t: LanguageToken): string => (t.normalized ?? t.value).toLowerCase();
  /** The English event a token names: its keyword, or a native the head reads (es `ratónmover`). */
  const eventOf = (t: LanguageToken | undefined): string | undefined => {
    if (!t) return undefined;
    const known = (e: string) => KNOWN_EVENTS.has(e) || WAITABLE_EVENT_WORDS.has(e);
    // An identifier's normalized form is a stem, not an English word: tr and
    // tl strip `-in` from `focusin`, which is not `focus`.
    const word = t.kind === 'identifier' ? t.value.toLowerCase() : norm(t);
    if (known(word)) return word;
    const english = eventNameTranslations[language]?.[t.value];
    if (english) return english;
    const native = normalizeEventName(t.value, language);
    return known(native) ? native : undefined;
  };
  const isDuration = (t: LanguageToken | undefined): boolean =>
    !!t && /^\d+(?:\.\d+)?(?:ms|s)$/.test(t.value);
  const marker = tryGetProfile(language)?.roleMarkers?.source;
  const markerForms = new Set(
    [marker?.primary, ...(marker?.alternatives ?? [])].filter(Boolean).map(w => w!.toLowerCase())
  );
  const isSourceMarker = (t: LanguageToken | undefined): boolean =>
    !!t && ((t.normalized ?? '') === 'source' || markerForms.has(t.value.toLowerCase()));
  const prepositional = marker?.position !== 'after';
  // The wait verb next to the run, on the side the language puts it. Verb
  // first, within two tokens before it (`wait keyup`, `wait for keyup`): only
  // the wait's own words sit there. Verb-final, directly after it or across
  // one particle (`keyup 待つ`, tr `keyup i bekle`): the words after a HEAD
  // run are the next command's, and qu `maykama llave uray(key) llave uray
  // suyay` (`on keydown(key) wait for keydown`) has the body's event there.
  // Looking on both sides let a head's run take the body's verb.
  const verbFinal = tryGetProfile(language)?.wordOrder === 'SOV';
  /** The wait verb next to the run `[start, end)`. */
  /** The language's `event` word before a wait's event (`esperar evento foo`, P52). */
  const eventWordAt = (k: number): boolean => !!arr[k] && norm(arr[k]) === 'event';
  const nearWait = (start: number, end: number): boolean =>
    verbFinal
      ? isWait(arr[end]) || (arr[end]?.kind === 'particle' && isWait(arr[end + 1]))
      : isWait(arr[start - 1]) ||
        isWait(arr[start - 2]) ||
        // `等待 把 事件 foo`: the event word, and zh/he's object marker, between.
        (eventWordAt(start - 1) && arr[start - 2]?.kind === 'particle' && isWait(arr[start - 3]));

  /** A source phrase starts at `k`: `from X`, or `X から` where the marker follows. */
  const sourceAt = (k: number): boolean =>
    prepositional ? isSourceMarker(arr[k]) && !!arr[k + 1] : !!arr[k] && isSourceMarker(arr[k + 1]);
  /**
   * A token spelled as a name: an identifier, or a keyword that is no
   * structure word or verb (an event name is one: `unload`).
   */
  const isPlainName = (t: LanguageToken | undefined): boolean =>
    !!t &&
    (t.kind === 'identifier' ||
      (t.kind === 'keyword' && (loneKeywordKind(t) ?? 'event') === 'event')) &&
    /^[\p{L}_$][\p{L}\p{M}\p{N}_$:-]*$/u.test(t.value);
  /** A source phrase starts at `k`, or after an `or` run that starts there. */
  const sourceAfterLegs = (k: number): boolean => {
    while (isOrWordToken(arr[k] ?? { value: '' }, language) && arr[k + 1]) k += 2;
    return sourceAt(k);
  };
  /**
   * The event the token at `i` names. Upstream reads every leg of `wait for`
   * that is not a number as an event's name, so a name directly after
   * English's `wait for` is one, and so is any name with a source after its
   * legs, since a time wait has none. English dropped what followed every
   * other name (`wait for myEvent from #b`, `wait for unload from #b`), so
   * every translation did (P50).
   */
  const eventAt = (i: number): string | undefined => {
    const known = eventOf(arr[i]);
    if (known) return known;
    if (!isPlainName(arr[i])) return undefined;
    const afterFor = arr[i - 1]?.value.toLowerCase() === 'for' && isWait(arr[i - 2]);
    // A name after the language's `event` word is one (`esperar evento foo`,
    // `イベント foo 待つ`: the renderer writes it before a name no table
    // knows, P52); verb-first the wait verb stands before the word.
    const afterEventWord =
      eventWordAt(i - 1) &&
      (verbFinal || isWait(arr[i - 2]) || (arr[i - 2]?.kind === 'particle' && isWait(arr[i - 3])));
    return afterFor || afterEventWord || sourceAfterLegs(i + 1) ? arr[i].value : undefined;
  };

  for (let i = 0; i < arr.length; i++) {
    const eventName = eventAt(i);
    if (!eventName) continue;
    const alternatives: WaitAlternative[] = [];
    const eventEnd = i + 1; // exclusive
    const first = matchEventParamPhrase(arr, eventEnd);
    alternatives.push(
      first.names.length > 0 ? { event: eventName, params: first.names } : { event: eventName }
    );
    let k = eventEnd + first.len;
    while (isOrWordToken(arr[k] ?? { value: '' }, language)) {
      const next = arr[k + 1];
      // A leg of an event wait that is a name is an event, as upstream reads it.
      const legEvent = eventOf(next) ?? (isPlainName(next) ? next!.value : undefined);
      if (legEvent) {
        const legEnd = k + 2;
        const phrase = matchEventParamPhrase(arr, legEnd);
        alternatives.push(
          phrase.names.length > 0 ? { event: legEvent, params: phrase.names } : { event: legEvent }
        );
        k = legEnd + phrase.len;
      } else if (isDuration(next)) {
        alternatives.push({ duration: next!.value });
        k += 2;
      } else break;
    }
    const runEnd = k; // exclusive: the legs end here
    // The source phrase follows the run in every language: `from X` where the
    // marker is a preposition, `X から` where it follows its noun. Never
    // before the event: an SOV loop head renders ITS source there (ja
    // `… 繰り返し document から pointermove 待つ`), and the wait must not take it.
    let sourceSpan: [number, number] | undefined;
    let sourceToken: LanguageToken | undefined;
    if (prepositional && isSourceMarker(arr[k]) && arr[k + 1]) {
      sourceSpan = [k, k + 1];
      sourceToken = arr[k + 1];
    } else if (!prepositional && arr[k] && isSourceMarker(arr[k + 1])) {
      sourceSpan = [k, k + 1];
      sourceToken = arr[k];
    }
    const hasExtras = alternatives.length > 1 || first.names.length > 0 || !!sourceSpan;
    if (!hasExtras) continue;
    const argEnd = sourceSpan ? sourceSpan[1] + 1 : runEnd;
    if (!nearWait(i, argEnd)) continue;

    // Keep the first event's name; cut its params, the legs, and the source.
    const cuts: Array<[number, number]> = [];
    if (runEnd > eventEnd)
      cuts.push([arr[eventEnd - 1].position.end, arr[runEnd - 1].position.end]);
    if (sourceSpan) cuts.push([arr[sourceSpan[0]].position.start, arr[sourceSpan[1]].position.end]);
    cuts.sort((a, b) => a[0] - b[0]);
    let reduced = '';
    let at = 0;
    for (const [from, to] of cuts) {
      reduced += input.slice(at, from) + ' ';
      at = to;
    }
    reduced = (reduced + input.slice(at)).replace(/\s+/g, ' ').trim();

    // Which wait with this event is ours: count the ones before it.
    const event = alternatives[0] as { event: string };
    const wanted = event.event.toLowerCase();
    let before = 0;
    for (let j = 0; j < i; j++) {
      if (eventAt(j)?.toLowerCase() === wanted && nearWait(j, j + 1)) before++;
    }
    try {
      const reparsed = parse(reduced, language);
      const waits: SemanticNode[] = [];
      const collect = (n: SemanticNode | undefined): void => {
        if (!n) return;
        // A name no event list knows reads as a time wait once its source is
        // cut (`esperar myEvent`): its duration is the event.
        const eventValue =
          n.roles?.get('event' as SemanticRole) ?? n.roles?.get('duration' as SemanticRole);
        const name =
          eventValue?.type === 'expression'
            ? eventValue.raw
            : eventValue && 'value' in eventValue
              ? String(eventValue.value)
              : undefined;
        if (n.kind === 'command' && n.action === 'wait' && name?.toLowerCase() === wanted) {
          waits.push(n);
        }
        const children = n as NodeChildren;
        for (const field of NODE_CHILD_FIELDS) {
          const child = children[field];
          if (Array.isArray(child)) child.forEach(c => collect(c as SemanticNode));
        }
      };
      collect(reparsed ?? undefined);
      const target = waits[before];
      if (!reparsed || !target) continue;
      const targetRoles = target.roles as Map<SemanticRole, SemanticValue>;
      if (!targetRoles.has('event')) {
        targetRoles.delete('duration');
        targetRoles.set('event', { type: 'literal', value: event.event, dataType: 'string' });
      }
      (target as { waitAlternatives?: WaitAlternative[] }).waitAlternatives = alternatives;
      if (sourceToken) {
        (target as { waitSource?: SemanticValue }).waitSource = waitSourceValue(sourceToken);
      }
      return reparsed;
    } catch {
      // not this run: keep looking
    }
  }
  return null;
}

/**
 * Strip the `do [not] throw` fetch-error modifier (see the call site for why).
 * Anchored on the leaked English `do` literal — present in every SOV translation
 * of the phrase — followed within two tokens by a `throw`-normalized verb (a
 * negation may sit between: ja `ではない`, ko `아니`, hi `नहीं`, tr `değil`, bn
 * `না`, en `not`). Removes the `do … throw` span from the source string. Returns
 * `{ remainingInput: null }` when no such span exists, so the caller leaves the
 * input untouched.
 */
export function stripDoNotThrowModifier(
  input: string,
  language: string
): {
  remainingInput: string | null;
} {
  const allTokens = tokenizeInternal(input, language).tokens;
  for (let i = 0; i < allTokens.length - 1; i++) {
    if (allTokens[i].value.toLowerCase() !== 'do') continue;
    // Scan a small window for the throw verb. The negation between `do` and
    // `throw` may be one token (en `not`, tr `değil`) or several (ja `ではない`
    // shatters into `で`/`は`/`ない` particles), so a 2-token window misses ja.
    // Stop at a value / conjunction — only negation filler may separate them.
    let throwIdx = -1;
    for (let j = i + 1; j <= i + 5 && j < allTokens.length; j++) {
      const tj = allTokens[j];
      if (tj.normalized?.toLowerCase() === 'throw') {
        throwIdx = j;
        break;
      }
      const k = tj.kind as string;
      if (k === 'selector' || k === 'literal' || k === 'reference' || k === 'conjunction') {
        break;
      }
    }
    if (throwIdx === -1) continue;
    const start = allTokens[i].position.start;
    const end = allTokens[throwIdx].position.end;
    const stripped = (input.slice(0, start) + input.slice(end)).replace(/\s{2,}/g, ' ').trim();
    if (stripped.length === 0) return { remainingInput: null };
    return { remainingInput: stripped };
  }
  return { remainingInput: null };
}
