/**
 * Japanese LLM vocabulary. Grammar (SOV, particles, CJK script) comes from
 * `@lokascript/semantic`'s Japanese profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const jaVocabulary: DomainVocabulary = {
  keywords: {
    ask: { primary: '聞く' },
    summarize: { primary: '要約' },
    analyze: { primary: '分析' },
    translate: { primary: '翻訳' },
  },
  tokenizerKeywords: ['から', 'として', 'で', 'に'],
  roleMarkerOverrides: {
    ...SCHEMA_OWNED_MARKERS,
    // 'として' (as) marks manner and 'で' (in/by) marks quantity — both act as
    // prefixes, not postpositions, so they override the SOV default position
    // 'after'. The marker strings themselves live on the schemas; these entries
    // exist to carry the position (and survive the bridge merge).
    manner: { primary: 'として', position: 'before' },
    quantity: { primary: 'で', position: 'before' },
  },
};
