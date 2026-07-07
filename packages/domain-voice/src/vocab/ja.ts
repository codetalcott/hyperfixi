/**
 * Japanese voice vocabulary. Grammar (SOV, particles, CJK script) comes from
 * `@lokascript/semantic`'s Japanese profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const jaVocabulary: DomainVocabulary = {
  keywords: {
    navigate: { primary: '移動' },
    click: { primary: 'クリック' },
    type: { primary: '入力' },
    scroll: { primary: 'スクロール' },
    read: { primary: '読む' },
    zoom: { primary: 'ズーム' },
    select: { primary: '選択' },
    back: { primary: '戻る' },
    forward: { primary: '進む' },
    focus: { primary: 'フォーカス' },
    close: { primary: '閉じる' },
    open: { primary: '開く' },
    search: { primary: '検索' },
    help: { primary: 'ヘルプ' },
  },
  tokenizerKeywords: [
    'を',
    'に',
    'で',
    'の',
    'だけ',
    '上',
    '下',
    '左',
    '右',
    'イン',
    'アウト',
    'リセット',
    'タブ',
    'ダイアログ',
    'ページ',
    '全て',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
