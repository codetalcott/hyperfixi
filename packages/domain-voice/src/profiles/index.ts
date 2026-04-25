/**
 * Voice/Accessibility Language Profiles
 *
 * Pattern generation profiles for each supported language (8 total).
 * These define keyword translations and word order for pattern generation.
 *
 * Role markers are specified via `markerOverride` on each schema role
 * (in schemas/index.ts). Profile-level roleMarkers are only needed
 * when the default position (SOV=after, else=before) is wrong.
 */

import type { PatternGenLanguageProfile } from '@lokascript/framework';

// =============================================================================
// English (SVO)
// =============================================================================

export const enProfile: PatternGenLanguageProfile = {
  code: 'en',
  wordOrder: 'SVO',
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
  roleMarkers: {},
};

// =============================================================================
// Spanish (SVO)
// =============================================================================

export const esProfile: PatternGenLanguageProfile = {
  code: 'es',
  wordOrder: 'SVO',
  keywords: {
    navigate: { primary: 'navegar', alternatives: ['ir'] },
    click: { primary: 'clic', alternatives: ['pulsar'] },
    type: { primary: 'escribir' },
    scroll: { primary: 'desplazar' },
    read: { primary: 'leer' },
    zoom: { primary: 'zoom' },
    select: { primary: 'seleccionar' },
    back: { primary: 'atrás', alternatives: ['volver'] },
    forward: { primary: 'adelante' },
    focus: { primary: 'enfocar' },
    close: { primary: 'cerrar' },
    open: { primary: 'abrir' },
    search: { primary: 'buscar' },
    help: { primary: 'ayuda' },
  },
  roleMarkers: {},
};

// =============================================================================
// Japanese (SOV)
// =============================================================================

export const jaProfile: PatternGenLanguageProfile = {
  code: 'ja',
  wordOrder: 'SOV',
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
  roleMarkers: {},
};

// =============================================================================
// Arabic (VSO)
// =============================================================================

export const arProfile: PatternGenLanguageProfile = {
  code: 'ar',
  wordOrder: 'VSO',
  keywords: {
    navigate: { primary: 'انتقل' },
    click: { primary: 'انقر' },
    type: { primary: 'اكتب' },
    scroll: { primary: 'تمرير' },
    read: { primary: 'اقرأ' },
    zoom: { primary: 'تكبير' },
    select: { primary: 'اختر' },
    back: { primary: 'رجوع' },
    forward: { primary: 'تقدم' },
    focus: { primary: 'ركز' },
    close: { primary: 'أغلق' },
    open: { primary: 'افتح' },
    search: { primary: 'ابحث' },
    help: { primary: 'مساعدة' },
  },
  roleMarkers: {},
};

// =============================================================================
// Korean (SOV)
// =============================================================================

export const koProfile: PatternGenLanguageProfile = {
  code: 'ko',
  wordOrder: 'SOV',
  keywords: {
    navigate: { primary: '이동' },
    click: { primary: '클릭' },
    type: { primary: '입력' },
    scroll: { primary: '스크롤' },
    read: { primary: '읽기' },
    zoom: { primary: '확대' },
    select: { primary: '선택' },
    back: { primary: '뒤로' },
    forward: { primary: '앞으로' },
    focus: { primary: '포커스' },
    close: { primary: '닫기' },
    open: { primary: '열기' },
    search: { primary: '검색' },
    help: { primary: '도움말' },
  },
  roleMarkers: {},
};

// =============================================================================
// Chinese (SVO)
// =============================================================================

export const zhProfile: PatternGenLanguageProfile = {
  code: 'zh',
  wordOrder: 'SVO',
  keywords: {
    navigate: { primary: '导航' },
    click: { primary: '点击' },
    type: { primary: '输入' },
    scroll: { primary: '滚动' },
    read: { primary: '朗读' },
    zoom: { primary: '缩放' },
    select: { primary: '选择' },
    back: { primary: '返回' },
    forward: { primary: '前进' },
    focus: { primary: '聚焦' },
    close: { primary: '关闭' },
    open: { primary: '打开' },
    search: { primary: '搜索' },
    help: { primary: '帮助' },
  },
  roleMarkers: {},
};

// =============================================================================
// Turkish (SOV)
// =============================================================================

export const trProfile: PatternGenLanguageProfile = {
  code: 'tr',
  wordOrder: 'SOV',
  keywords: {
    navigate: { primary: 'git' },
    click: { primary: 'tıkla' },
    type: { primary: 'yaz' },
    scroll: { primary: 'kaydır' },
    read: { primary: 'oku' },
    zoom: { primary: 'yakınlaş' },
    select: { primary: 'seç' },
    back: { primary: 'geri' },
    forward: { primary: 'ileri' },
    focus: { primary: 'odakla' },
    close: { primary: 'kapat' },
    open: { primary: 'aç' },
    search: { primary: 'ara' },
    help: { primary: 'yardım' },
  },
  roleMarkers: {},
};

// =============================================================================
// French (SVO)
// =============================================================================

export const frProfile: PatternGenLanguageProfile = {
  code: 'fr',
  wordOrder: 'SVO',
  keywords: {
    navigate: { primary: 'naviguer', alternatives: ['aller'] },
    click: { primary: 'cliquer' },
    type: { primary: 'taper', alternatives: ['écrire'] },
    scroll: { primary: 'défiler' },
    read: { primary: 'lire' },
    zoom: { primary: 'zoomer' },
    select: { primary: 'sélectionner' },
    back: { primary: 'retour' },
    forward: { primary: 'avancer' },
    focus: { primary: 'focaliser' },
    close: { primary: 'fermer' },
    open: { primary: 'ouvrir' },
    search: { primary: 'chercher', alternatives: ['rechercher'] },
    help: { primary: 'aide' },
  },
  roleMarkers: {},
};

// =============================================================================
// All Profiles
// =============================================================================

export const allProfiles = [
  enProfile,
  esProfile,
  jaProfile,
  arProfile,
  koProfile,
  zhProfile,
  trProfile,
  frProfile,
];
