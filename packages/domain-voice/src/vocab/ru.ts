/**
 * Russian voice vocabulary (bridge-era language, arc Phase 2). Grammar (SVO,
 * Cyrillic script) comes from `@lokascript/semantic`'s Russian profile via the
 * framework bridge — one vocab file, no hand-authored profile/tokenizer.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const ruVocabulary: DomainVocabulary = {
  keywords: {
    navigate: { primary: 'перейти' },
    click: { primary: 'нажать' },
    type: { primary: 'ввести' },
    scroll: { primary: 'прокрутить' },
    read: { primary: 'читать' },
    zoom: { primary: 'масштаб' },
    select: { primary: 'выбрать' },
    back: { primary: 'назад' },
    forward: { primary: 'вперёд' },
    focus: { primary: 'фокус' },
    close: { primary: 'закрыть' },
    open: { primary: 'открыть' },
    search: { primary: 'искать' },
    help: { primary: 'помощь' },
  },
  // Schema markers (destination→на/в, quantity→на) + direction/target words.
  tokenizerKeywords: [
    'на',
    'в',
    'вверх',
    'вниз',
    'влево',
    'вправо',
    'внутрь',
    'наружу',
    'сброс',
    'вкладка',
    'диалог',
    'страница',
    'всё',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
