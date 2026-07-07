/**
 * Arabic learn vocabulary (the 15 core verbs). Grammar comes from
 * `@lokascript/semantic`'s Arabic profile via the framework bridge;
 * morphology tables and sentence frames stay hand-authored in
 * `../profiles/ar.ts`.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const arVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: 'أضف' },
    remove: { primary: 'احذف' },
    toggle: { primary: 'بدّل' },
    put: { primary: 'ضع' },
    set: { primary: 'عيّن' },
    show: { primary: 'أظهر' },
    hide: { primary: 'أخفِ' },
    get: { primary: 'احصل' },
    wait: { primary: 'انتظر' },
    fetch: { primary: 'أحضر' },
    send: { primary: 'أرسل' },
    go: { primary: 'اذهب' },
    increment: { primary: 'زد' },
    decrement: { primary: 'أنقص' },
    take: { primary: 'خذ' },
  },
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
