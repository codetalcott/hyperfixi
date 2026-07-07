/**
 * Japanese FlowScript vocabulary. Grammar (SOV, particles, CJK script) comes
 * from `@lokascript/semantic`'s Japanese profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const jaVocabulary: DomainVocabulary = {
  keywords: {
    fetch: { primary: '取得' },
    poll: { primary: 'ポーリング' },
    stream: { primary: 'ストリーム' },
    submit: { primary: '送信' },
    transform: { primary: '変換' },
    enter: { primary: '入る' },
    follow: { primary: '辿る' },
    perform: { primary: '実行' },
    capture: { primary: '取得変数' },
  },
  // Schema marker particles (で/に/ごとに/として/の) + general particles.
  tokenizerKeywords: ['で', 'に', 'ごとに', 'を', 'から', 'の', 'として'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
