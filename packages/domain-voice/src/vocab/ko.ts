/**
 * Korean voice vocabulary. Grammar (SOV, particles, Hangul script) comes from
 * `@lokascript/semantic`'s Korean profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const koVocabulary: DomainVocabulary = {
  keywords: {
    navigate: { primary: '이동' },
    click: { primary: '클릭' },
    type: { primary: '입력' },
    scroll: { primary: '스크롤' },
    read: { primary: '읽기' },
    zoom: { primary: '확대' },
    select: { primary: '선택' },
    back: { primary: '뒤로' },
    forward: { primary: '앞으로' },
    focus: { primary: '포커스' },
    close: { primary: '닫기' },
    open: { primary: '열기' },
    search: { primary: '검색' },
    help: { primary: '도움말' },
  },
  tokenizerKeywords: [
    '을',
    '를',
    '에',
    '에서',
    '로',
    '만큼',
    '위',
    '아래',
    '왼쪽',
    '오른쪽',
    '전체',
    '탭',
    '대화상자',
    '페이지',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
