/**
 * Send Command Patterns
 *
 * Hand-crafted patterns for the "send" command. Languages without
 * hand-crafted patterns rely on auto-generation from profiles.
 *
 * zh: the i18n transformer fronts the verb and marks send's leading argument
 * with the BA particle (`当 点击 时 发送 把 refresh 到 #widget`); the generated
 * `发送 {event} 到 {destination}` has no 把, so the send body dropped across
 * send-event / send-with-detail / send-event-to-form / socket-send. Same
 * BA-tolerance family as wait-zh-ba / set-zh-vba / trigger-zh-ba.
 */

import type { LanguagePattern } from '../types';

function getSendPatternsZh(): LanguagePattern[] {
  return [
    {
      id: 'send-zh-ba',
      language: 'zh',
      command: 'send',
      priority: 105,
      template: {
        format: '发送 把 {event} 到 {destination}',
        tokens: [
          { type: 'literal', value: '发送', alternatives: ['發送', '传送', '傳送'] },
          { type: 'literal', value: '把' },
          { type: 'role', role: 'event', expectedTypes: ['literal', 'expression'] },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: '到', alternatives: ['给', '給', '向'] },
              {
                type: 'role',
                role: 'destination',
                expectedTypes: ['selector', 'reference', 'expression'],
              },
            ],
          },
        ],
      },
      extraction: {
        event: { position: 2 },
        destination: {
          marker: '到',
          markerAlternatives: ['给', '給', '向'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
  ];
}

/**
 * Get send patterns for a specific language.
 */
export function getSendPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'zh':
      return getSendPatternsZh();
    default:
      return [];
  }
}
