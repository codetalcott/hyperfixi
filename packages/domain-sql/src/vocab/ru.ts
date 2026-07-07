/**
 * Russian SQL vocabulary — added via the framework↔semantic bridge: this
 * file is the ONLY Russian-specific authoring in the domain (grammar comes
 * from `@lokascript/semantic`'s Russian profile).
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const ruVocabulary: DomainVocabulary = {
  keywords: {
    select: { primary: 'выбрать', alternatives: ['выбери'] },
    // 'добавить' mirrors semantic's `add` — the natural-verb alias.
    insert: { primary: 'вставить', alternatives: ['добавить'] },
    update: { primary: 'обновить', alternatives: ['изменить'] },
    delete: { primary: 'удалить', alternatives: ['убрать'] },
    get: { primary: 'получить' },
  },
  tokenizerKeywords: [
    'из',
    'в',
    'где',
    'установить',
    'значения',
    'лимит',
    'и',
    'или',
    'не',
    'нуль',
    'истина',
    'ложь',
    'между',
    'как',
    'есть',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
