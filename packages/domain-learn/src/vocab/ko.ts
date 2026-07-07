/**
 * Korean learn vocabulary (the 15 core verbs). Grammar comes from
 * `@lokascript/semantic`'s Korean profile via the framework bridge;
 * morphology tables and sentence frames stay hand-authored in
 * `../profiles/ko.ts`.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const koVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: '추가' },
    remove: { primary: '제거' },
    toggle: { primary: '토글' },
    put: { primary: '넣' },
    set: { primary: '설정' },
    show: { primary: '보이' },
    hide: { primary: '숨기' },
    get: { primary: '얻' },
    wait: { primary: '대기' },
    fetch: { primary: '패치' },
    send: { primary: '보내' },
    go: { primary: '이동' },
    increment: { primary: '증가' },
    decrement: { primary: '감소' },
    take: { primary: '가져오' },
  },
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
