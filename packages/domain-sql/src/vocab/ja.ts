/**
 * Japanese SQL vocabulary. Grammar (SOV, particles, CJK script) comes from
 * `@lokascript/semantic`'s Japanese profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const jaVocabulary: DomainVocabulary = {
  keywords: {
    select: { primary: '選択' },
    insert: { primary: '挿入', alternatives: ['追加'] },
    update: { primary: '更新', alternatives: ['変更'] },
    delete: { primary: '削除', alternatives: ['消去'] },
    get: { primary: '取得' },
  },
  tokenizerKeywords: [
    'から',
    'に',
    '条件',
    '設定',
    '値',
    '件数',
    'と',
    'または',
    'ない',
    'ヌル',
    '間',
    '似',
    '中',
  ],
  roleMarkerOverrides: {
    ...SCHEMA_OWNED_MARKERS,
    // '条件' (WHERE) and '件数' (LIMIT) act as prefixes, not postpositions —
    // profile-level entries are needed because the default SOV position is
    // 'after'. The marker strings themselves also live on the schemas.
    condition: { primary: '条件', position: 'before' },
    limit: { primary: '件数', position: 'before' },
  },
};
