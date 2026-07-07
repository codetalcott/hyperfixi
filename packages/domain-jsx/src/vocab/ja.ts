/**
 * Japanese JSX vocabulary. Grammar (SOV, particles, CJK script) comes from
 * `@lokascript/semantic`'s Japanese profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const jaVocabulary: DomainVocabulary = {
  keywords: {
    element: { primary: '要素' },
    component: { primary: 'コンポーネント' },
    render: { primary: '描画' },
    state: { primary: '状態' },
    effect: { primary: 'エフェクト' },
    fragment: { primary: 'フラグメント' },
  },
  tokenizerKeywords: ['で', 'に', '初期値', '内容', '返す', 'プロパティ'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
