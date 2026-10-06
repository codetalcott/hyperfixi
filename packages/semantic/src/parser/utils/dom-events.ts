/**
 * DOM event names, as every language writes them: event names are untranslated
 * loanwords in the corpus, and a tokenizer that does translate one (ko `클릭`,
 * tr `tıklama`) normalizes it back, so a value-set gate on the token's
 * normalized form is language-invariant (the RESPONSE_TYPE_WORDS precedent).
 *
 * Two readers: a `wait` argument in this set is an event wait, not a time wait
 * (semantic-parser.ts); and in hi/bn, whose handler marker is also the
 * destination marker, a name in this set before it opens a handler
 * (block-parser.ts). Superset of the parser's handler-side KNOWN_EVENTS plus the
 * transition/animation/pointer/touch/drag families.
 */
export const DOM_EVENT_NAMES: ReadonlySet<string> = new Set([
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
