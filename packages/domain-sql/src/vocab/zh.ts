/**
 * Chinese SQL vocabulary. Grammar (SVO, CJK script) comes from
 * `@lokascript/semantic`'s Chinese profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const zhVocabulary: DomainVocabulary = {
  keywords: {
    select: { primary: '查询' },
    insert: { primary: '插入', alternatives: ['添加'] },
    update: { primary: '更新', alternatives: ['修改'] },
    delete: { primary: '删除', alternatives: ['移除'] },
    get: { primary: '获取' },
  },
  tokenizerKeywords: [
    '从',
    '到',
    '条件',
    '设置',
    '值',
    '限制',
    '和',
    '或',
    '非',
    '空',
    '之间',
    '像',
    '在',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
