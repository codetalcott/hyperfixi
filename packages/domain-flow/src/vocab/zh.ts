/**
 * Chinese FlowScript vocabulary. Grammar (SVO, CJK script) comes from
 * `@lokascript/semantic`'s Chinese profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const zhVocabulary: DomainVocabulary = {
  keywords: {
    fetch: { primary: '获取' },
    poll: { primary: '轮询' },
    stream: { primary: '流式' },
    submit: { primary: '提交' },
    transform: { primary: '转换' },
    enter: { primary: '进入' },
    follow: { primary: '跟随' },
    perform: { primary: '执行' },
    capture: { primary: '捕获' },
  },
  // Schema marker words (以/到/每/用/项/为) + connectives.
  tokenizerKeywords: ['以', '到', '每', '用', '从', '项', '为'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
