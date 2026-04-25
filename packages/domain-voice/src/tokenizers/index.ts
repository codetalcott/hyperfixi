/**
 * Voice/Accessibility Tokenizers
 *
 * Language-specific tokenizers for voice command input (8 languages).
 * All tokenizers include CSS selector support (#id, .class) since
 * voice commands may reference DOM elements by selector.
 */

import { createSimpleTokenizer } from '@lokascript/framework';
import type { LanguageTokenizer, ValueExtractor, ExtractionResult } from '@lokascript/framework';

// =============================================================================
// CSS Selector Extractor
// Handles #id and .class references in voice commands
// =============================================================================

class CSSSelectorExtractor implements ValueExtractor {
  readonly name = 'css-selector';

  canExtract(input: string, position: number): boolean {
    const ch = input[position];
    return ch === '#' || ch === '.';
  }

  extract(input: string, position: number): ExtractionResult | null {
    const prefix = input[position];
    if (prefix !== '#' && prefix !== '.') return null;

    let end = position + 1;
    // CSS identifiers: Unicode letters, digits, hyphens, underscores
    while (end < input.length && /[\p{L}\p{N}_-]/u.test(input[end])) {
      end++;
    }

    if (end === position + 1) return null; // just # or . alone
    return { value: input.slice(position, end), length: end - position };
  }
}

// =============================================================================
// Latin Extended Identifier Extractor
// Handles Latin-script languages with diacritics (French à, é; Turkish ş, ç, ü)
// =============================================================================

class LatinExtendedIdentifierExtractor implements ValueExtractor {
  readonly name = 'latin-extended-identifier';

  canExtract(input: string, position: number): boolean {
    return /\p{L}/u.test(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    let end = position;
    while (end < input.length && /[\p{L}\p{N}_-]/u.test(input[end])) {
      end++;
    }
    if (end === position) return null;
    return { value: input.slice(position, end), length: end - position };
  }
}

// Shared CSS selector extractor instance
const cssSelectorExtractor = new CSSSelectorExtractor();

// =============================================================================
// English
// =============================================================================

export const EnglishVoiceTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'en',
  direction: 'ltr',
  customExtractors: [cssSelectorExtractor],
  keywords: [
    // commands
    'navigate',
    'go',
    'click',
    'press',
    'tap',
    'type',
    'enter',
    'scroll',
    'read',
    'say',
    'zoom',
    'select',
    'back',
    'forward',
    'focus',
    'close',
    'open',
    'search',
    'find',
    'help',
    // markers
    'to',
    'into',
    'by',
    'in',
    'on',
    'the',
    'a',
    // direction words
    'up',
    'down',
    'left',
    'right',
    'top',
    'bottom',
    // zoom words
    'in',
    'out',
    'reset',
    // targets
    'tab',
    'dialog',
    'modal',
    'menu',
    'page',
    'all',
  ],
  caseInsensitive: true,
});

// =============================================================================
// Spanish
// =============================================================================

export const SpanishVoiceTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'es',
  direction: 'ltr',
  customExtractors: [cssSelectorExtractor, new LatinExtendedIdentifierExtractor()],
  keywords: [
    'navegar',
    'ir',
    'clic',
    'pulsar',
    'escribir',
    'desplazar',
    'leer',
    'zoom',
    'seleccionar',
    'atrás',
    'volver',
    'adelante',
    'enfocar',
    'cerrar',
    'abrir',
    'buscar',
    'ayuda',
    'a',
    'en',
    'por',
    'el',
    'la',
    'de',
    'sur',
    'arriba',
    'abajo',
    'izquierda',
    'derecha',
    'más',
    'menos',
    'todo',
    'página',
    'diálogo',
  ],
  caseInsensitive: true,
});

// =============================================================================
// Japanese
// =============================================================================

export const JapaneseVoiceTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ja',
  direction: 'ltr',
  customExtractors: [cssSelectorExtractor],
  keywords: [
    '移動',
    'クリック',
    '入力',
    'スクロール',
    '読む',
    'ズーム',
    '選択',
    '戻る',
    '進む',
    'フォーカス',
    '閉じる',
    '開く',
    '検索',
    'ヘルプ',
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
  keywordExtras: [
    { native: '移動', normalized: 'navigate' },
    { native: 'クリック', normalized: 'click' },
    { native: '入力', normalized: 'type' },
    { native: 'スクロール', normalized: 'scroll' },
    { native: '読む', normalized: 'read' },
    { native: 'ズーム', normalized: 'zoom' },
    { native: '選択', normalized: 'select' },
    { native: '戻る', normalized: 'back' },
    { native: '進む', normalized: 'forward' },
    { native: 'フォーカス', normalized: 'focus' },
    { native: '閉じる', normalized: 'close' },
    { native: '開く', normalized: 'open' },
    { native: '検索', normalized: 'search' },
    { native: 'ヘルプ', normalized: 'help' },
    { native: 'を', normalized: 'wo' },
    { native: 'に', normalized: 'ni' },
    { native: 'で', normalized: 'de' },
  ],
  keywordProfile: {
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
  },
  caseInsensitive: false,
});

// =============================================================================
// Arabic (VSO)
// =============================================================================

export const ArabicVoiceTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ar',
  direction: 'rtl',
  customExtractors: [cssSelectorExtractor],
  keywords: [
    'انتقل',
    'انقر',
    'اكتب',
    'تمرير',
    'اقرأ',
    'تكبير',
    'اختر',
    'رجوع',
    'تقدم',
    'ركز',
    'أغلق',
    'افتح',
    'ابحث',
    'مساعدة',
    'إلى',
    'على',
    'في',
    'عن',
    'ب',
    'أعلى',
    'أسفل',
    'يسار',
    'يمين',
    'الكل',
    'الصفحة',
    'الحوار',
  ],
  keywordExtras: [
    { native: 'انتقل', normalized: 'navigate' },
    { native: 'انقر', normalized: 'click' },
    { native: 'اكتب', normalized: 'type' },
    { native: 'تمرير', normalized: 'scroll' },
    { native: 'اقرأ', normalized: 'read' },
    { native: 'تكبير', normalized: 'zoom' },
    { native: 'اختر', normalized: 'select' },
    { native: 'رجوع', normalized: 'back' },
    { native: 'تقدم', normalized: 'forward' },
    { native: 'ركز', normalized: 'focus' },
    { native: 'أغلق', normalized: 'close' },
    { native: 'افتح', normalized: 'open' },
    { native: 'ابحث', normalized: 'search' },
    { native: 'مساعدة', normalized: 'help' },
    { native: 'إلى', normalized: 'to' },
    { native: 'على', normalized: 'on' },
    { native: 'في', normalized: 'in' },
    { native: 'عن', normalized: 'about' },
  ],
  keywordProfile: {
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
  },
  caseInsensitive: false,
});

// =============================================================================
// Korean (SOV)
// =============================================================================

export const KoreanVoiceTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ko',
  direction: 'ltr',
  customExtractors: [cssSelectorExtractor],
  keywords: [
    '이동',
    '클릭',
    '입력',
    '스크롤',
    '읽기',
    '확대',
    '선택',
    '뒤로',
    '앞으로',
    '포커스',
    '닫기',
    '열기',
    '검색',
    '도움말',
    '을',
    '를',
    '에',
    '에서',
    '로',
    '만큼',
    '위',
    '아래',
    '왼쪽',
    '오른쪽',
    '전체',
    '탭',
    '대화상자',
    '페이지',
  ],
  keywordExtras: [
    { native: '이동', normalized: 'navigate' },
    { native: '클릭', normalized: 'click' },
    { native: '입력', normalized: 'type' },
    { native: '스크롤', normalized: 'scroll' },
    { native: '읽기', normalized: 'read' },
    { native: '확대', normalized: 'zoom' },
    { native: '선택', normalized: 'select' },
    { native: '뒤로', normalized: 'back' },
    { native: '앞으로', normalized: 'forward' },
    { native: '포커스', normalized: 'focus' },
    { native: '닫기', normalized: 'close' },
    { native: '열기', normalized: 'open' },
    { native: '검색', normalized: 'search' },
    { native: '도움말', normalized: 'help' },
    { native: '을', normalized: 'eul' },
    { native: '를', normalized: 'reul' },
    { native: '에', normalized: 'e' },
    { native: '에서', normalized: 'eseo' },
    { native: '로', normalized: 'ro' },
  ],
  keywordProfile: {
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
  },
  caseInsensitive: false,
});

// =============================================================================
// Chinese (SVO)
// =============================================================================

export const ChineseVoiceTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'zh',
  direction: 'ltr',
  customExtractors: [cssSelectorExtractor],
  keywords: [
    '导航',
    '点击',
    '输入',
    '滚动',
    '朗读',
    '缩放',
    '选择',
    '返回',
    '前进',
    '聚焦',
    '关闭',
    '打开',
    '搜索',
    '帮助',
    '到',
    '在',
    '幅',
    '上',
    '下',
    '左',
    '右',
    '全部',
    '标签',
    '对话框',
    '页面',
    '放大',
    '缩小',
    '重置',
  ],
  keywordExtras: [
    { native: '导航', normalized: 'navigate' },
    { native: '点击', normalized: 'click' },
    { native: '输入', normalized: 'type' },
    { native: '滚动', normalized: 'scroll' },
    { native: '朗读', normalized: 'read' },
    { native: '缩放', normalized: 'zoom' },
    { native: '选择', normalized: 'select' },
    { native: '返回', normalized: 'back' },
    { native: '前进', normalized: 'forward' },
    { native: '聚焦', normalized: 'focus' },
    { native: '关闭', normalized: 'close' },
    { native: '打开', normalized: 'open' },
    { native: '搜索', normalized: 'search' },
    { native: '帮助', normalized: 'help' },
    { native: '到', normalized: 'to' },
    { native: '在', normalized: 'in' },
  ],
  keywordProfile: {
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
  },
  caseInsensitive: false,
});

// =============================================================================
// Turkish (SOV)
// =============================================================================

export const TurkishVoiceTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'tr',
  direction: 'ltr',
  customExtractors: [cssSelectorExtractor, new LatinExtendedIdentifierExtractor()],
  keywords: [
    'git',
    'tıkla',
    'yaz',
    'kaydır',
    'oku',
    'yakınlaş',
    'seç',
    'geri',
    'ileri',
    'odakla',
    'kapat',
    'aç',
    'ara',
    'yardım',
    'ya',
    'da',
    'kadar',
    'yukarı',
    'aşağı',
    'sol',
    'sağ',
    'sekme',
    'diyalog',
    'sayfa',
    'hepsi',
  ],
  keywordExtras: [
    { native: 'git', normalized: 'navigate' },
    { native: 'tıkla', normalized: 'click' },
    { native: 'yaz', normalized: 'type' },
    { native: 'kaydır', normalized: 'scroll' },
    { native: 'oku', normalized: 'read' },
    { native: 'yakınlaş', normalized: 'zoom' },
    { native: 'seç', normalized: 'select' },
    { native: 'geri', normalized: 'back' },
    { native: 'ileri', normalized: 'forward' },
    { native: 'odakla', normalized: 'focus' },
    { native: 'kapat', normalized: 'close' },
    { native: 'aç', normalized: 'open' },
    { native: 'ara', normalized: 'search' },
    { native: 'yardım', normalized: 'help' },
    { native: 'ya', normalized: 'to' },
    { native: 'da', normalized: 'in' },
  ],
  keywordProfile: {
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
  },
  caseInsensitive: true,
});

// =============================================================================
// French (SVO)
// =============================================================================

export const FrenchVoiceTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'fr',
  direction: 'ltr',
  customExtractors: [cssSelectorExtractor, new LatinExtendedIdentifierExtractor()],
  keywords: [
    'naviguer',
    'aller',
    'cliquer',
    'taper',
    'écrire',
    'défiler',
    'lire',
    'zoomer',
    'sélectionner',
    'retour',
    'avancer',
    'focaliser',
    'fermer',
    'ouvrir',
    'chercher',
    'rechercher',
    'aide',
    'vers',
    'dans',
    'de',
    'sur',
    'le',
    'la',
    'les',
    'un',
    'une',
    'haut',
    'bas',
    'gauche',
    'droite',
    'onglet',
    'dialogue',
    'page',
    'tout',
  ],
  keywordExtras: [
    { native: 'naviguer', normalized: 'navigate' },
    { native: 'aller', normalized: 'go' },
    { native: 'cliquer', normalized: 'click' },
    { native: 'taper', normalized: 'type' },
    { native: 'écrire', normalized: 'write' },
    { native: 'défiler', normalized: 'scroll' },
    { native: 'lire', normalized: 'read' },
    { native: 'zoomer', normalized: 'zoom' },
    { native: 'sélectionner', normalized: 'select' },
    { native: 'retour', normalized: 'back' },
    { native: 'avancer', normalized: 'forward' },
    { native: 'focaliser', normalized: 'focus' },
    { native: 'fermer', normalized: 'close' },
    { native: 'ouvrir', normalized: 'open' },
    { native: 'chercher', normalized: 'search' },
    { native: 'rechercher', normalized: 'search' },
    { native: 'aide', normalized: 'help' },
    { native: 'vers', normalized: 'to' },
    { native: 'dans', normalized: 'in' },
    { native: 'sur', normalized: 'on' },
  ],
  keywordProfile: {
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
  },
  caseInsensitive: true,
});
