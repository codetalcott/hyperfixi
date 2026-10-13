/**
 * Event words the parser tests against: the handler-side event names, the
 * names a `wait` can wait for, and the parameter phrase after an event
 * (`keydown[key is "Enter"]`, `click(x, y)`).
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged.
 */
import type { LanguageToken } from '../types';

/**
 * Known WAITABLE event names — the gate for treating a `wait` argument as an
 * event wait rather than a time wait. `wait for transitionend` (en head) and
 * the marker-less translations (`esperar transitionend`) both put the event
 * name where a duration would sit; a bare identifier is otherwise ambiguous
 * with a time-variable wait (`wait delay`), so the relabel/reclaim fires ONLY
 * on names in this set. Event names are untranslated loanwords in every corpus
 * language (the RESPONSE_TYPE_WORDS precedent), so a value-set gate is
 * language-invariant. Superset of the handler-side KNOWN_EVENTS plus the
 * transition/animation/pointer/touch/drag families that waits actually target.
 */
export const WAITABLE_EVENT_WORDS = new Set([
  // handler-side KNOWN_EVENTS
  'click',
  'dblclick',
  'input',
  'change',
  'submit',
  'keydown',
  'keyup',
  'keypress',
  'mouseover',
  'mouseout',
  'mousedown',
  'mouseup',
  'focus',
  'blur',
  'load',
  'scroll',
  'resize',
  'contextmenu',
  // transition / animation
  'transitionend',
  'transitionstart',
  'transitionrun',
  'transitioncancel',
  'animationend',
  'animationstart',
  'animationiteration',
  'animationcancel',
  // pointer / touch / mouse movement
  'pointerdown',
  'pointerup',
  'pointermove',
  'pointerenter',
  'pointerleave',
  'pointercancel',
  'pointerover',
  'pointerout',
  'touchstart',
  'touchend',
  'touchmove',
  'touchcancel',
  'mousemove',
  'mouseenter',
  'mouseleave',
  'wheel',
  // drag & drop
  'dragstart',
  'dragend',
  'dragover',
  'dragenter',
  'dragleave',
  'drop',
  'drag',
  // lifecycle / misc
  'loadend',
  'loadstart',
  'error',
  'abort',
  'close',
  'open',
  'message',
  'popstate',
  'hashchange',
  'storage',
  'online',
  'offline',
  'visibilitychange',
]);

export const KNOWN_EVENTS = new Set([
  'click',
  'dblclick',
  'input',
  'change',
  'submit',
  'keydown',
  'keyup',
  'keypress',
  'mouseover',
  'mouseout',
  'mousedown',
  'mouseup',
  'focus',
  'blur',
  'load',
  'scroll',
  'resize',
  'contextmenu',
]);

/** Reference words: never an event parameter's name. */
const REFERENCE_WORDS = new Set(['me', 'my', 'i', 'it', 'its', 'you', 'your', 'result']);

/**
 * Length (in tokens) and declared names of an event PARAM PHRASE starting at
 * startIdx: `( ident [, ident]* )`. The tokenizers split
 * `pointerdown(clientY)` into 4+ tokens (`pointerdown ( clientY )`), so the
 * SOV event-marker check — which expects the marker DIRECTLY after the event
 * keyword — never fired on a parameterized event: the custom-event second
 * pass then anchored the `)` as the event (event:literal=")") and the leaked
 * keyword-led head run was discarded by flushSkipped, killing the first body
 * command (behavior-sortable `set item to …`, the session-5 sharpened
 * diagnosis). Returns len 0 when startIdx isn't an opening paren or the
 * phrase is malformed (no close-paren, or a non-identifier between).
 */
export function matchEventParamPhrase(
  allTokens: readonly LanguageToken[],
  startIdx: number
): { len: number; names: string[] } {
  if (allTokens[startIdx]?.value !== '(') return { len: 0, names: [] };
  const names: string[] = [];
  for (let j = startIdx + 1; j < allTokens.length; j++) {
    const v = allTokens[j].value;
    // Parameters touch their event (`click(evt)`, as every rendering writes
    // them). A group apart from it, before a case marker, is that marker's
    // value: qu writes the patient right after the event, so `click (o) ta
    // #out man churay` (put (o) into #out) took `(o)` for the parameters and
    // put nothing. (SOV event markers follow parameters too: bn `ক্লিক(evt)
    // তে`, tr `tıklama(evt) i üzerinde`.)
    if (v === ')') {
      const event = allTokens[startIdx - 1];
      const apart = event?.position?.end !== allTokens[startIdx]?.position?.start;
      return apart && allTokens[j + 1]?.kind === 'particle'
        ? { len: 0, names: [] }
        : { len: j - startIdx + 1, names };
    }
    if (v === ',') continue;
    // Any identifier-shaped word: a name like `detail` or `target` is also a
    // keyword, and tokenizes as one. Never a reference (`me`, `it`): that is a
    // call's argument (a verb-final `js` block's `(me)` right after the event).
    const kind = allTokens[j].kind;
    if ((kind !== 'identifier' && kind !== 'keyword') || !/^[A-Za-z_$][\w$]*$/.test(v)) break;
    const norm = (allTokens[j].normalized ?? v).toLowerCase();
    if (kind === 'keyword' && REFERENCE_WORDS.has(norm)) break;
    names.push(v);
  }
  return { len: 0, names: [] };
}
