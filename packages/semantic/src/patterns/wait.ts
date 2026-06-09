/**
 * Wait Command Patterns (hand-crafted)
 *
 * Most languages parse `wait <duration>` via the auto-generated
 * `wait-{lang}-generated` pattern (`<verb> {duration}`). Chinese is the
 * exception: the i18n grammar transformer runs `wait 1s` through its generic
 * argument parser, which defaults the first argument to the `patient` role and
 * therefore marks it with the BA-construction particle `把` — emitting
 * `等待 把 1s`. The generated pattern is `等待 {duration}` (no `把`), so the
 * marked form doesn't match and the trailing `wait` is dropped (e.g. the zh
 * `repeat-forever` body `… 那么 等待 把 1s 结束`).
 *
 * This adds a zh pattern that tolerates the optional `把` before the duration,
 * mirroring the existing `toggle-zh-ba` convention. (The cleaner root-cause fix
 * — teaching the i18n transformer that `wait` takes a `duration`, not a fronted
 * patient, so it never emits `把 1s` — is a broader change to the transformer's
 * role model; see docs-internal/ZH_BLOCK_BODY_SCOPE.md.)
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
export function getWaitPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'zh':
      return getWaitPatternsZh();
    default:
      return [];
  }
}
