/**
 * Chinese JSX vocabulary. Grammar (SVO, CJK script) comes from
 * `@lokascript/semantic`'s Chinese profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const zhVocabulary: DomainVocabulary = {
  keywords: {
    element: { primary: '元素' },
    component: { primary: '组件' },
    render: { primary: '渲染' },
    state: { primary: '状态' },
    effect: { primary: '效果' },
    fragment: { primary: '片段' },
  },
  tokenizerKeywords: ['用', '到', '初始', '在', '包含', '返回', '属性'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
