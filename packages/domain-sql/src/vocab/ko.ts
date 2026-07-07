/**
 * Korean SQL vocabulary. Grammar (SOV, particles, Hangul script) comes from
 * `@lokascript/semantic`'s Korean profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const koVocabulary: DomainVocabulary = {
  keywords: {
    select: { primary: '선택' },
    insert: { primary: '삽입', alternatives: ['추가'] },
    update: { primary: '갱신', alternatives: ['변경'] },
    delete: { primary: '삭제', alternatives: ['제거'] },
    get: { primary: '가져오기' },
  },
  tokenizerKeywords: [
    '에서',
    '에',
    '조건',
    '설정',
    '값',
    '제한',
    '그리고',
    '또는',
    '아닌',
    '널',
    '사이',
    '같은',
    '안',
  ],
  roleMarkerOverrides: {
    ...SCHEMA_OWNED_MARKERS,
    // WHERE/LIMIT markers act as prefixes (default SOV position is 'after').
    condition: { primary: '조건', position: 'before' },
    limit: { primary: '제한', position: 'before' },
  },
};
