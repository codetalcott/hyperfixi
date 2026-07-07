/**
 * Korean JSX vocabulary. Grammar (SOV, particles, Hangul script) comes from
 * `@lokascript/semantic`'s Korean profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const koVocabulary: DomainVocabulary = {
  keywords: {
    element: { primary: '요소' },
    component: { primary: '컴포넌트' },
    render: { primary: '렌더링' },
    state: { primary: '상태' },
    effect: { primary: '효과' },
    fragment: { primary: '프래그먼트' },
  },
  tokenizerKeywords: ['로', '에', '초기값', '에서', '포함', '반환', '속성'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
