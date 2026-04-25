/**
 * Learn Domain Tokenizers
 *
 * Language-specific tokenizers for learning domain input (10 languages).
 * Created via the framework's createSimpleTokenizer factory.
 *
 * These tokenizers handle:
 * - Command verb keyword classification
 * - Role marker particle/preposition classification
 * - CSS selector recognition (#id, .class)
 * - Non-Latin script handling (Japanese, Arabic, Korean, Chinese)
 */

import { createSimpleTokenizer, LatinExtendedIdentifierExtractor } from '@lokascript/framework';
import type { LanguageTokenizer } from '@lokascript/framework';

// ─── English ────────────────────────────────────────────────────

export const EnglishLearnTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'en',
  keywords: [
    // Verbs
    'add',
    'remove',
    'toggle',
    'put',
    'set',
    'show',
    'hide',
    'get',
    'wait',
    'fetch',
    'send',
    'go',
    'increment',
    'decrement',
    'take',
    // Markers
    'to',
    'from',
    'into',
    'on',
    'by',
    'for',
  ],
  includeOperators: true,
  caseInsensitive: true,
});

// ─── Japanese ───────────────────────────────────────────────────

export const JapaneseLearnTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ja',
  keywords: [
    // Verbs (te-form used for commanding)
    '追加',
    '削除',
    '切り替え',
    '置',
    '設定',
    '表示',
    '隠',
    '取得',
    '待',
    '送',
    '行',
    '増加',
    '減少',
    '取',
    // Particles
    'を',
    'に',
    'から',
    'で',
    'は',
  ],
  keywordExtras: [
    { native: '追加', normalized: 'add' },
    { native: '削除', normalized: 'remove' },
    { native: '切り替え', normalized: 'toggle' },
    { native: '置', normalized: 'put' },
    { native: '設定', normalized: 'set' },
    { native: '表示', normalized: 'show' },
    { native: '隠', normalized: 'hide' },
    { native: '取得', normalized: 'get' },
    { native: '待', normalized: 'wait' },
    { native: '送', normalized: 'send' },
    { native: '行', normalized: 'go' },
    { native: '増加', normalized: 'increment' },
    { native: '減少', normalized: 'decrement' },
    { native: '取', normalized: 'take' },
  ],
  includeOperators: true,
  caseInsensitive: false,
});

// ─── Spanish ────────────────────────────────────────────────────

export const SpanishLearnTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'es',
  keywords: [
    'agregar',
    'eliminar',
    'alternar',
    'poner',
    'establecer',
    'mostrar',
    'ocultar',
    'obtener',
    'esperar',
    'buscar',
    'enviar',
    'ir',
    'incrementar',
    'decrementar',
    'tomar',
    'a',
    'de',
    'en',
    'por',
    'para',
  ],
  customExtractors: [new LatinExtendedIdentifierExtractor()],
  includeOperators: true,
  caseInsensitive: true,
});

// ─── Arabic ─────────────────────────────────────────────────────

export const ArabicLearnTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ar',
  keywords: [
    'أضف',
    'أزل',
    'بدّل',
    'ضع',
    'عيّن',
    'أظهر',
    'أخفِ',
    'احصل',
    'انتظر',
    'اجلب',
    'أرسل',
    'اذهب',
    'زد',
    'أنقص',
    'خذ',
    'إلى',
    'من',
    'في',
    'على',
    'ب',
  ],
  keywordExtras: [
    { native: 'أضف', normalized: 'add' },
    { native: 'أزل', normalized: 'remove' },
    { native: 'بدّل', normalized: 'toggle' },
    { native: 'ضع', normalized: 'put' },
    { native: 'عيّن', normalized: 'set' },
    { native: 'أظهر', normalized: 'show' },
    { native: 'أخفِ', normalized: 'hide' },
    { native: 'احصل', normalized: 'get' },
    { native: 'انتظر', normalized: 'wait' },
    { native: 'اجلب', normalized: 'fetch' },
    { native: 'أرسل', normalized: 'send' },
    { native: 'اذهب', normalized: 'go' },
    { native: 'زد', normalized: 'increment' },
    { native: 'أنقص', normalized: 'decrement' },
    { native: 'خذ', normalized: 'take' },
  ],
  includeOperators: true,
  caseInsensitive: false,
});

// ─── Chinese ────────────────────────────────────────────────────

export const ChineseLearnTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'zh',
  keywords: [
    '添加',
    '移除',
    '切换',
    '放置',
    '设置',
    '显示',
    '隐藏',
    '获取',
    '等待',
    '获取',
    '发送',
    '前往',
    '增加',
    '减少',
    '取走',
    '到',
    '从',
    '在',
    '把',
    '用',
  ],
  keywordExtras: [
    { native: '添加', normalized: 'add' },
    { native: '移除', normalized: 'remove' },
    { native: '切换', normalized: 'toggle' },
    { native: '放置', normalized: 'put' },
    { native: '设置', normalized: 'set' },
    { native: '显示', normalized: 'show' },
    { native: '隐藏', normalized: 'hide' },
    { native: '获取', normalized: 'get' },
    { native: '等待', normalized: 'wait' },
    { native: '发送', normalized: 'send' },
    { native: '前往', normalized: 'go' },
    { native: '增加', normalized: 'increment' },
    { native: '减少', normalized: 'decrement' },
    { native: '取走', normalized: 'take' },
  ],
  includeOperators: true,
  caseInsensitive: false,
});

// ─── Korean ─────────────────────────────────────────────────────

export const KoreanLearnTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ko',
  keywords: [
    '추가',
    '제거',
    '전환',
    '넣기',
    '설정',
    '표시',
    '숨기기',
    '가져오기',
    '대기',
    '가져오기',
    '보내기',
    '이동',
    '증가',
    '감소',
    '가져가기',
    '를',
    '에',
    '에서',
    '에게',
    '로',
  ],
  keywordExtras: [
    { native: '추가', normalized: 'add' },
    { native: '제거', normalized: 'remove' },
    { native: '전환', normalized: 'toggle' },
    { native: '넣기', normalized: 'put' },
    { native: '설정', normalized: 'set' },
    { native: '표시', normalized: 'show' },
    { native: '숨기기', normalized: 'hide' },
    { native: '가져오기', normalized: 'get' },
    { native: '대기', normalized: 'wait' },
    { native: '보내기', normalized: 'send' },
    { native: '이동', normalized: 'go' },
    { native: '증가', normalized: 'increment' },
    { native: '감소', normalized: 'decrement' },
    { native: '가져가기', normalized: 'take' },
  ],
  includeOperators: true,
  caseInsensitive: false,
});

// ─── French ─────────────────────────────────────────────────────

export const FrenchLearnTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'fr',
  keywords: [
    'ajouter',
    'supprimer',
    'basculer',
    'mettre',
    'définir',
    'afficher',
    'masquer',
    'obtenir',
    'attendre',
    'récupérer',
    'envoyer',
    'aller',
    'incrémenter',
    'décrémenter',
    'prendre',
    'à',
    'de',
    'dans',
    'sur',
    'par',
  ],
  customExtractors: [new LatinExtendedIdentifierExtractor()],
  includeOperators: true,
  caseInsensitive: true,
});

// ─── Turkish ────────────────────────────────────────────────────

export const TurkishLearnTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'tr',
  keywords: [
    'ekle',
    'kaldır',
    'değiştir',
    'koy',
    'ayarla',
    'göster',
    'gizle',
    'al',
    'bekle',
    'getir',
    'gönder',
    'git',
    'artır',
    'azalt',
    'çıkar',
    'a',
    'dan',
    'da',
    'e',
    'ile',
  ],
  customExtractors: [new LatinExtendedIdentifierExtractor()],
  includeOperators: true,
  caseInsensitive: true,
});

// ─── German ─────────────────────────────────────────────────────

export const GermanLearnTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'de',
  keywords: [
    'hinzufügen',
    'entfernen',
    'umschalten',
    'setzen',
    'einstellen',
    'anzeigen',
    'verbergen',
    'abrufen',
    'warten',
    'abrufen',
    'senden',
    'gehen',
    'erhöhen',
    'verringern',
    'nehmen',
    'zu',
    'von',
    'in',
    'auf',
    'an',
  ],
  customExtractors: [new LatinExtendedIdentifierExtractor()],
  includeOperators: true,
  caseInsensitive: true,
});

// ─── Portuguese ─────────────────────────────────────────────────

export const PortugueseLearnTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'pt',
  keywords: [
    'adicionar',
    'remover',
    'alternar',
    'colocar',
    'definir',
    'mostrar',
    'esconder',
    'obter',
    'esperar',
    'buscar',
    'enviar',
    'ir',
    'incrementar',
    'decrementar',
    'pegar',
    'a',
    'de',
    'em',
    'para',
    'por',
  ],
  customExtractors: [new LatinExtendedIdentifierExtractor()],
  includeOperators: true,
  caseInsensitive: true,
});
