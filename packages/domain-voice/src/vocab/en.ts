/**
 * English voice vocabulary — the only thing authored per language.
 * Grammar (word order, script) comes from `@lokascript/semantic`'s English
 * profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const enVocabulary: DomainVocabulary = {
  keywords: {
    navigate: { primary: 'navigate', alternatives: ['go'] },
    click: { primary: 'click', alternatives: ['press', 'tap'] },
    type: { primary: 'type', alternatives: ['enter'] },
    scroll: { primary: 'scroll' },
    read: { primary: 'read', alternatives: ['say'] },
    zoom: { primary: 'zoom' },
    select: { primary: 'select' },
    back: { primary: 'back' },
    forward: { primary: 'forward' },
    focus: { primary: 'focus' },
    close: { primary: 'close' },
    open: { primary: 'open' },
    search: { primary: 'search', alternatives: ['find'] },
    help: { primary: 'help' },
  },
  // Schema markers + direction/target words (values recognized as keywords).
  tokenizerKeywords: [
    'to',
    'into',
    'by',
    'in',
    'on',
    'the',
    'a',
    'up',
    'down',
    'left',
    'right',
    'top',
    'bottom',
    'out',
    'reset',
    'tab',
    'dialog',
    'modal',
    'menu',
    'page',
    'all',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
