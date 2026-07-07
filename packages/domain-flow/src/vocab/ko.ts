/**
 * Korean FlowScript vocabulary. Grammar (SOV, particles, Hangul script) comes
 * from `@lokascript/semantic`'s Korean profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const koVocabulary: DomainVocabulary = {
  keywords: {
    fetch: { primary: '가져오기' },
    poll: { primary: '폴링' },
    stream: { primary: '스트리밍' },
    submit: { primary: '제출' },
    transform: { primary: '변환' },
    enter: { primary: '진입' },
    follow: { primary: '따라가기' },
    perform: { primary: '실행' },
    capture: { primary: '캡처' },
  },
  // Schema marker particles (로/에/마다/항목) + general particles.
  tokenizerKeywords: ['로', '에', '마다', '를', '에서', '항목'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
