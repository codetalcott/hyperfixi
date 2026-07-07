/**
 * Turkish voice vocabulary. Grammar (SOV, Latin script) comes from
 * `@lokascript/semantic`'s Turkish profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const trVocabulary: DomainVocabulary = {
  keywords: {
    navigate: { primary: 'git' },
    click: { primary: 'tıkla' },
    type: { primary: 'yaz' },
    scroll: { primary: 'kaydır' },
    read: { primary: 'oku' },
    zoom: { primary: 'yakınlaş' },
    select: { primary: 'seç' },
    back: { primary: 'geri' },
    forward: { primary: 'ileri' },
    focus: { primary: 'odakla' },
    close: { primary: 'kapat' },
    open: { primary: 'aç' },
    search: { primary: 'ara' },
    help: { primary: 'yardım' },
  },
  tokenizerKeywords: [
    'ya',
    'da',
    'kadar',
    'yukarı',
    'aşağı',
    'sol',
    'sağ',
    'sekme',
    'diyalog',
    'sayfa',
    'hepsi',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
