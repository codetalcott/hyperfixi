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

export function getWaitPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'zh':
      return getWaitPatternsZh();
    case 'he':
      return getWaitPatternsHe();
    default:
      return [];
  }
}
