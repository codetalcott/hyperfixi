/**
 * Japanese learn vocabulary (the 15 core verbs). Grammar comes from
 * `@lokascript/semantic`'s Japanese profile via the framework bridge;
 * morphology tables and sentence frames stay hand-authored in
 * `../profiles/ja.ts`.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const jaVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: '追加' },
    remove: { primary: '削除' },
    toggle: { primary: '切り替え' },
    put: { primary: '置' },
    set: { primary: '設定' },
    show: { primary: '表示' },
    hide: { primary: '隠' },
    get: { primary: '取得' },
    wait: { primary: '待' },
    fetch: { primary: '取得' },
    send: { primary: '送' },
    go: { primary: '行' },
    increment: { primary: '増加' },
    decrement: { primary: '減少' },
    take: { primary: '取' },
  },
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
