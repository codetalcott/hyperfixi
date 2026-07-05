/**
 * Wait Command Patterns (hand-crafted)
 *
 * Most languages parse `wait <duration>` via the auto-generated
 * `wait-{lang}-generated` pattern (`<verb> {duration}`). Chinese historically
 * needed a hand-crafted variant: the i18n grammar transformer ran `wait 1s`
 * through its generic argument parser, which defaulted the first argument to the
 * `patient` role and therefore marked it with the BA-construction particle `把` —
 * emitting `等待 把 1s`. The generated pattern is `等待 {duration}` (no `把`), so the
 * marked form didn't match and the trailing `wait` was dropped (e.g. the zh
 * `repeat-forever` body `… 那么 等待 把 1s 结束`).
 *
 * The root-cause fix has since landed in the transformer: it honours a command's
 * true primary role (`wait` → `duration`, which carries no zh marker), so it now
 * emits the grammatical `等待 1s` directly — matched by the generated pattern.
 * See docs-internal/ZH_BLOCK_BODY_SCOPE.md (#1 — transformer role model).
 *
 * This pattern is retained as a **defensive fallback**: it tolerates the optional
 * `把` before the duration (mirroring the `toggle-zh-ba` convention) so any
 * legacy / hand-written `等待 把 1s` still parses. It no longer fires on the
 * transformer's own output.
 */

import type { LanguagePattern } from '../types';

function getWaitPatternsZh(): LanguagePattern[] {
  return [
    // BA-marked duration: 等待 把 1s (transformer output). The generated
    // `等待 {duration}` already covers the unmarked `等待 1s` form.
    {
      id: 'wait-zh-ba',
      language: 'zh',
      command: 'wait',
      priority: 105,
      template: {
        format: '等待 把 {duration}',
        tokens: [
          { type: 'literal', value: '等待', alternatives: ['等', '稍候'] },
          { type: 'literal', value: '把' },
          { type: 'role', role: 'duration', expectedTypes: ['literal', 'expression'] },
        ],
      },
      extraction: {
        duration: { position: 2 },
      },
    },
  ];
}

/**
 * Get wait patterns for a specific language.
 */
function getWaitPatternsHe(): LanguagePattern[] {
  return [
    {
      // Accusative-marked wait (`חכה את 2s`) — see send-he-et / wait-zh-ba.
      id: 'wait-he-et',
      language: 'he',
      command: 'wait',
      priority: 105,
      template: {
        format: 'חכה את {duration}',
        tokens: [
          { type: 'literal', value: 'חכה', alternatives: ['המתן'] },
          { type: 'literal', value: 'את' },
          { type: 'role', role: 'duration', expectedTypes: ['literal', 'expression'] },
        ],
      },
      extraction: {
        duration: { position: 2 },
      },
    },
  ];
}

/**
 * Arabic (VSO) wait patterns.
 *
 * The grammar transformer fronts a `wait for <events> from <source>` clause's
 * source ahead of the events for ar — `wait for pointermove or pointerup from
 * document` → `انتظر من وثيقة pointermove أو pointerup` (`wait from document
 * pointermove or pointerup`). The auto-generated `<verb> {duration}` pattern then
 * can't anchor: the token right after the verb is the source particle `من`, not a
 * duration/event. So the trailing `wait` was dropped (behavior-sortable's loop
 * body, ar lossy). This recovers it by matching the fronted `from <source>` and
 * capturing the first following event as the duration; the remaining `or <event>`
 * tail is harmless trailing tokens (no command anchors on it). The natural
 * source-last order (`انتظر … من وثيقة`) is already covered by the generated
 * pattern, so this only adds the fronted form.
 */
function getWaitPatternsAr(): LanguagePattern[] {
  return [
    {
      id: 'wait-ar-from-first',
      language: 'ar',
      command: 'wait',
      priority: 105,
      template: {
        format: 'انتظر من {source} {duration}',
        tokens: [
          { type: 'literal', value: 'انتظر', alternatives: ['انتظري'] },
          { type: 'literal', value: 'من' },
          { type: 'role', role: 'source', expectedTypes: ['expression', 'reference'] },
          { type: 'role', role: 'duration', expectedTypes: ['expression', 'literal'] },
        ],
      },
      extraction: {
        source: { position: 2 },
        duration: { position: 3 },
      },
    },
  ];
}

/**
 * English `wait for {event}` head.
 *
 * The auto-generated `wait {duration}` pattern captured the KEYWORD as the
 * duration (`wait for transitionend` → duration:literal="for") and dropped the
 * event name — and everything after it, including a then-chain (`wait for X
 * then remove me` lost the `remove`). This head captures the event by name;
 * the waitMapper turns it into the runtime's `modifiers.for` event wait.
 * Marker-less translations (`esperar transitionend`) reach the same shape via
 * the known-event duration→event relabel in normalizeCommandRoles; SOV
 * verb-final translations (ja `待つ transitionend`) via the trailing
 * event-name reclaim in buildEventHandler.
 */
function getWaitPatternsEn(): LanguagePattern[] {
  return [
    {
      id: 'wait-en-for-event',
      language: 'en',
      command: 'wait',
      priority: 110,
      template: {
        format: 'wait for {event}',
        tokens: [
          { type: 'literal', value: 'wait' },
          { type: 'literal', value: 'for' },
          { type: 'role', role: 'event', expectedTypes: ['literal', 'expression'] },
        ],
      },
      extraction: {
        event: { position: 2 },
      },
    },
  ];
}

/**
 * Tagalog fronted-source wait — the tl mirror of `wait-ar-from-first`.
 *
 * The transformer fronts the from-phrase directly after the verb (`maghintay
 * mula_sa dokumento pointermove(clientY) o pointerup(clientY)` for the
 * behaviors' `wait for pointermove or pointerup from document` line), so the
 * generated `maghintay {duration}` pattern can't anchor: the token after the
 * verb is the source marker, not an event/duration. Captures the fronted
 * source + the first following event word (the known-event duration→event
 * relabel in normalizeCommandRoles then types it event:literal, matching the
 * en reference); the `o <event>` tail stays harmless trailing tokens.
 */
function getWaitPatternsTl(): LanguagePattern[] {
  return [
    {
      id: 'wait-tl-from-first',
      language: 'tl',
      command: 'wait',
      priority: 105,
      template: {
        format: 'maghintay mula_sa {source} {duration}',
        tokens: [
          { type: 'literal', value: 'maghintay', alternatives: ['hintay'] },
          { type: 'literal', value: 'mula_sa', alternatives: ['galing_sa'] },
          { type: 'role', role: 'source', expectedTypes: ['expression', 'reference'] },
          { type: 'role', role: 'duration', expectedTypes: ['expression', 'literal'] },
        ],
      },
      extraction: {
        source: { position: 2 },
        duration: { position: 3 },
      },
    },
  ];
}

export function getWaitPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'en':
      return getWaitPatternsEn();
    case 'zh':
      return getWaitPatternsZh();
    case 'he':
      return getWaitPatternsHe();
    case 'ar':
      return getWaitPatternsAr();
    case 'tl':
      return getWaitPatternsTl();
    default:
      return [];
  }
}
