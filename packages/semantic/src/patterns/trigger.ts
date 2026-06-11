/**
 * Trigger Command Patterns (Consolidated)
 *
 * Hand-crafted patterns for "trigger" command across languages.
 * Languages without hand-crafted patterns rely on auto-generation from profiles.
 *
 * Phase 3.2: Consolidated from 5 files into single file.
 */

import type { LanguagePattern } from '../types';

function getTriggerPatternsEn(): LanguagePattern[] {
  return [
    {
      id: 'trigger-en-full',
      language: 'en',
      command: 'trigger',
      priority: 100,
      template: {
        format: 'trigger {event} on {destination}',
        tokens: [
          { type: 'literal', value: 'trigger' },
          { type: 'role', role: 'event', expectedTypes: ['literal', 'expression'] },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'on' },
              { type: 'role', role: 'destination', expectedTypes: ['selector', 'reference'] },
            ],
          },
        ],
      },
      extraction: {
        event: { position: 1 },
        destination: {
          marker: 'on',
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'trigger-en-simple',
      language: 'en',
      command: 'trigger',
      priority: 90,
      template: {
        format: 'trigger {event}',
        tokens: [
          { type: 'literal', value: 'trigger' },
          { type: 'role', role: 'event', expectedTypes: ['literal', 'expression'] },
        ],
      },
      extraction: {
        event: { position: 1 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}

function getTriggerPatternsZh(): LanguagePattern[] {
  return [
    {
      // Verb-first BA: 触发 把 {event}. The i18n transformer marks trigger's
      // leading argument with 把 (`当 加载 时 触发 把 init`); the generated
      // `触发 {event}` has no 把, so the trailing trigger dropped. Same
      // BA-tolerance family as wait-zh-ba / set-zh-vba.
      id: 'trigger-zh-ba',
      language: 'zh',
      command: 'trigger',
      priority: 105,
      template: {
        format: '触发 把 {event}',
        tokens: [
          { type: 'literal', value: '触发', alternatives: ['觸發'] },
          { type: 'literal', value: '把' },
          { type: 'role', role: 'event', expectedTypes: ['literal', 'expression'] },
        ],
      },
      extraction: {
        event: { position: 2 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}

/**
 * Get trigger patterns for a specific language.
 */
export function getTriggerPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'en':
      return getTriggerPatternsEn();
    case 'zh':
      return getTriggerPatternsZh();
    default:
      return [];
  }
}
