/**
 * Turkish SQL vocabulary. Grammar (SOV, case suffixes, Latin script) comes
 * from `@lokascript/semantic`'s Turkish profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const trVocabulary: DomainVocabulary = {
  keywords: {
    select: { primary: 'seç' },
    // `ekle` is already Turkish for "add" — no natural alias needed for INSERT.
    insert: { primary: 'ekle' },
    update: { primary: 'güncelle', alternatives: ['değiştir'] },
    delete: { primary: 'sil', alternatives: ['kaldır'] },
    get: { primary: 'al' },
  },
  tokenizerKeywords: [
    'den',
    'e',
    'koşul',
    'ayarla',
    'değer',
    'limit',
    've',
    'veya',
    'değil',
    'boş',
    'arasında',
    'gibi',
    'içinde',
  ],
  roleMarkerOverrides: {
    ...SCHEMA_OWNED_MARKERS,
    // WHERE/LIMIT markers act as prefixes (default SOV position is 'after').
    condition: { primary: 'koşul', position: 'before' },
    limit: { primary: 'limit', position: 'before' },
  },
};
