/**
 * A handler event in non-English input that is a word of the author's, which nothing fires.
 *
 * A word a language's vocabulary has no event for passes through translation as a custom event
 * of that name: es `al pulsar agregar .a` is `on pulsar add .a`, and the handler never runs
 * (7.3.0 live test). `@lokascript/hyperscript-adapter` warns about it on the page from the same
 * rule (its `host-validate.ts`, which asks the DOM which events have handlers); here there is no
 * DOM, so the events the HTML, DOM and UI Events specifications define are listed instead.
 */

import type { Diagnostic } from '../types.js';

/**
 * Events the specifications define (HTML's GlobalEventHandlers, WindowEventHandlers and
 * DocumentAndElementEventHandlers, UI, pointer, touch, CSS transition and animation events), and
 * the two upstream's `on` reads as observers (`mutation`, `intersection`).
 */
const FIRED_EVENTS: ReadonlySet<string> = new Set([
  'abort',
  'afterprint',
  'animationcancel',
  'animationend',
  'animationiteration',
  'animationstart',
  'auxclick',
  'beforeinput',
  'beforematch',
  'beforeprint',
  'beforetoggle',
  'beforeunload',
  'blur',
  'cancel',
  'canplay',
  'canplaythrough',
  'change',
  'click',
  'close',
  'compositionend',
  'compositionstart',
  'compositionupdate',
  'contextlost',
  'contextmenu',
  'contextrestored',
  'copy',
  'cuechange',
  'cut',
  'dblclick',
  'drag',
  'dragend',
  'dragenter',
  'dragleave',
  'dragover',
  'dragstart',
  'drop',
  'durationchange',
  'emptied',
  'ended',
  'error',
  'focus',
  'focusin',
  'focusout',
  'formdata',
  'fullscreenchange',
  'fullscreenerror',
  'gotpointercapture',
  'hashchange',
  'input',
  'intersection',
  'invalid',
  'keydown',
  'keypress',
  'keyup',
  'languagechange',
  'load',
  'loadeddata',
  'loadedmetadata',
  'loadstart',
  'lostpointercapture',
  'message',
  'messageerror',
  'mousedown',
  'mouseenter',
  'mouseleave',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseup',
  'mutation',
  'offline',
  'online',
  'pagehide',
  'pagereveal',
  'pageshow',
  'pageswap',
  'paste',
  'pause',
  'play',
  'playing',
  'pointercancel',
  'pointerdown',
  'pointerenter',
  'pointerleave',
  'pointermove',
  'pointerout',
  'pointerover',
  'pointerrawupdate',
  'pointerup',
  'popstate',
  'progress',
  'ratechange',
  'readystatechange',
  'rejectionhandled',
  'reset',
  'resize',
  'scroll',
  'scrollend',
  'search',
  'securitypolicyviolation',
  'seeked',
  'seeking',
  'select',
  'selectionchange',
  'selectstart',
  'slotchange',
  'stalled',
  'storage',
  'submit',
  'suspend',
  'timeupdate',
  'toggle',
  'touchcancel',
  'touchend',
  'touchmove',
  'touchstart',
  'transitioncancel',
  'transitionend',
  'transitionrun',
  'transitionstart',
  'unhandledrejection',
  'unload',
  'visibilitychange',
  'volumechange',
  'waiting',
  'wheel',
]);

/**
 * The events, of those a translation's handlers listen for, that are a plain word the author
 * wrote and that nothing fires. A name written as code (`miEvento`, `draggable:start`) is a
 * custom event on purpose; a name the language translated is not in the source.
 */
export function unknownEventWords(source: string, events: readonly string[]): string[] {
  const words = events.filter(
    name =>
      /^[\p{L}\p{M}]+$/u.test(name) &&
      !/\p{Lu}/u.test(name.slice(1)) &&
      source.includes(name) &&
      !FIRED_EVENTS.has(name)
  );
  return [...new Set(words)];
}

/** One warning per word: the handler runs as a custom event nothing fires. */
export function unknownEventDiagnostics(
  source: string,
  events: readonly string[],
  language: string
): Diagnostic[] {
  return unknownEventWords(source, events).map(word => ({
    severity: 'warning' as const,
    code: 'UNKNOWN_EVENT_WORD',
    message:
      `"${word}" is not an event ${language} knows: the handler listens for a custom event ` +
      `named "${word}", which nothing fires unless a script sends it.`,
    suggestion:
      "Use the language's word for the DOM event (get_keyword_translations), or its English " +
      'name; a custom event fired on purpose is clearer written as code (`miEvento`).',
  }));
}
