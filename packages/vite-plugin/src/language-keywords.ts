/**
 * Language Keywords for Detection
 *
 * Maps of keywords for each of the 21 supported languages.
 * Used by the scanner to detect which languages are used in hyperscript templates.
 *
 * Note: These are a representative subset of keywords - enough to reliably
 * detect language usage without including every possible keyword variant.
 */

import type { CustomLanguageKeywords } from './types';

/**
 * All supported language codes.
 */
export const SUPPORTED_LANGUAGES = [
  'en',
  'es',
  'pt',
  'fr',
  'de',
  'it',
  'vi', // Western (Latin script)
  'pl',
  'ru',
  'uk', // Slavic (Latin/Cyrillic)
  'ja',
  'zh',
  'ko', // East Asian
  'ar', // RTL (Arabic script)
  'hi',
  'bn', // South Asian (Indic scripts)
  'th', // Southeast Asian (Thai script)
  'tr', // Agglutinative Latin
  'id',
  'sw',
  'qu', // Other
  'tl', // Tagalog (auto-added)
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Regional bundle mappings.
 */
export const REGIONS = {
  western: ['en', 'es', 'pt', 'fr', 'de', 'it'] as SupportedLanguage[],
  'east-asian': ['ja', 'zh', 'ko'] as SupportedLanguage[],
  slavic: ['pl', 'ru', 'uk'] as SupportedLanguage[],
  'south-asian': ['hi', 'bn'] as SupportedLanguage[],
  priority: [
    'en',
    'es',
    'pt',
    'fr',
    'de',
    'it',
    'ja',
    'zh',
    'ko',
    'ar',
    'tr',
    'ru',
    'hi',
  ] as SupportedLanguage[],
  all: SUPPORTED_LANGUAGES as unknown as SupportedLanguage[],
};

/**
 * Japanese keywords (hiragana, katakana, kanji).
 * Unique script makes detection straightforward.
 */
export const JAPANESE_KEYWORDS = new Set([
  '切り替え',
  '切り替える',
  'トグル',
  'トグルする',
  '追加',
  '追加する',
  '加える',
  '削除',
  '削除する',
  '取り除く',
  '表示',
  '表示する',
  '見せる',
  '隠す',
  '非表示',
  '非表示にする',
  '設定',
  '設定する',
  'セット',
  '増加',
  '増やす',
  'インクリメント',
  '減少',
  '減らす',
  'デクリメント',
  '引き金',
  '発火',
  'トリガー',
  '送る',
  '送信',
  'もし',
  '条件',
  'そうでなければ',
  'それ以外',
  '繰り返し',
  '繰り返す',
  'リピート',
  '待つ',
  '待機',
  'の間',
  '間',
]);

/**
 * Korean keywords (Hangul).
 * Unique script makes detection straightforward.
 */
export const KOREAN_KEYWORDS = new Set([
  '토글',
  '전환',
  '추가',
  '제거',
  '삭제',
  '보이다',
  '표시',
  '보이기',
  '숨기다',
  '숨기기',
  '설정',
  '증가',
  '감소',
  '트리거',
  '보내다',
  '만약',
  '아니면',
  '반복',
  '대기',
  '동안',
]);

/**
 * Chinese keywords (CJK characters).
 * Note: Some overlap with Japanese kanji, but context usually distinguishes.
 */
export const CHINESE_KEYWORDS = new Set([
  '切换',
  '添加',
  '加',
  '移除',
  '删除',
  '去掉',
  '显示',
  '展示',
  '隐藏',
  '设置',
  '设定',
  '增加',
  '减少',
  '触发',
  '发送',
  '如果',
  '否则',
  '重复',
  '等待',
  '当',
]);

/**
 * Arabic keywords (Arabic script).
 * RTL script makes detection straightforward.
 */
export const ARABIC_KEYWORDS = new Set([
  'بدل',
  'بدّل',
  'غيّر',
  'غير',
  'أضف',
  'اضف',
  'زِد',
  'احذف',
  'أزل',
  'امسح',
  'اظهر',
  'أظهر',
  'اعرض',
  'اخف',
  'أخفِ',
  'اخفي',
  'اضبط',
  'عيّن',
  'حدد',
  'ارفع',
  'أنقص',
  'قلل',
  'تشغيل',
  'أطلق',
  'فعّل',
  'أرسل',
  'إذا',
  'وإلا',
  'خلاف ذلك',
  'كرر',
  'انتظر',
  'بينما',
]);

/**
 * Spanish keywords (Latin script with accents).
 * Distinguished by specific Spanish words.
 */
export const SPANISH_KEYWORDS = new Set([
  'alternar',
  'cambiar',
  'conmutar',
  'agregar',
  'añadir',
  'quitar',
  'eliminar',
  'remover',
  'sacar',
  'mostrar',
  'enseñar',
  'ocultar',
  'esconder',
  'establecer',
  'fijar',
  'definir',
  'incrementar',
  'aumentar',
  'decrementar',
  'disminuir',
  'disparar',
  'activar',
  'enviar',
  'si',
  'sino',
  'de lo contrario',
  'repetir',
  'esperar',
  'mientras',
]);

/**
 * Portuguese keywords (Latin script with accents).
 * Distinguished by specific Portuguese words.
 */
export const PORTUGUESE_KEYWORDS = new Set([
  'alternar',
  'trocar',
  'adicionar',
  'acrescentar',
  'remover',
  'eliminar',
  'apagar',
  'mostrar',
  'exibir',
  'ocultar',
  'esconder',
  'definir',
  'configurar',
  'incrementar',
  'aumentar',
  'decrementar',
  'diminuir',
  'disparar',
  'ativar',
  'enviar',
  'se',
  'senão',
  'repetir',
  'esperar',
  'aguardar',
  'enquanto',
]);

/**
 * French keywords (Latin script with accents).
 * Distinguished by specific French words.
 */
export const FRENCH_KEYWORDS = new Set([
  'basculer',
  'permuter',
  'alterner',
  'ajouter',
  'supprimer',
  'enlever',
  'retirer',
  'montrer',
  'afficher',
  'cacher',
  'masquer',
  'définir',
  'établir',
  'incrémenter',
  'augmenter',
  'décrémenter',
  'diminuer',
  'déclencher',
  'envoyer',
  'si',
  'sinon',
  'répéter',
  'attendre',
  'pendant',
]);

/**
 * German keywords (Latin script with umlauts).
 * Distinguished by specific German words.
 */
export const GERMAN_KEYWORDS = new Set([
  'umschalten',
  'wechseln',
  'hinzufügen',
  'entfernen',
  'löschen',
  'zeigen',
  'anzeigen',
  'verbergen',
  'verstecken',
  'festlegen',
  'definieren',
  'erhöhen',
  'verringern',
  'vermindern',
  'auslösen',
  'senden',
  'schicken',
  'wenn',
  'falls',
  'sonst',
  'ansonsten',
  'wiederholen',
  'warten',
  'solange',
  'während',
]);

/**
 * Turkish keywords (Latin script with special chars).
 * Distinguished by Turkish-specific characters and words.
 */
export const TURKISH_KEYWORDS = new Set([
  'değiştir',
  'aç/kapat',
  'ekle',
  'kaldır',
  'sil',
  'göster',
  'gizle',
  'ayarla',
  'yap',
  'belirle',
  'artır',
  'azalt',
  'tetikle',
  'gönder',
  'eğer',
  'yoksa',
  'tekrarla',
  'bekle',
  'iken',
]);

/**
 * Indonesian keywords (Latin script).
 * Distinguished by specific Indonesian words.
 */
export const INDONESIAN_KEYWORDS = new Set([
  'alihkan',
  'ganti',
  'tukar',
  'tambah',
  'tambahkan',
  'hapus',
  'buang',
  'hilangkan',
  'tampilkan',
  'perlihatkan',
  'sembunyikan',
  'tutup',
  'atur',
  'tetapkan',
  'tingkatkan',
  'naikkan',
  'turunkan',
  'kurangi',
  'picu',
  'jalankan',
  'kirim',
  'kirimkan',
  'jika',
  'kalau',
  'bila',
  'selainnya',
  'ulangi',
  'tunggu',
  'selama',
]);

/**
 * Swahili keywords (Latin script).
 * Distinguished by specific Swahili words.
 */
export const SWAHILI_KEYWORDS = new Set([
  'badilisha',
  'geuza',
  'ongeza',
  'weka',
  'ondoa',
  'futa',
  'toa',
  'onyesha',
  'ficha',
  'mficho',
  'seti',
  'punguza',
  'chochea',
  'anzisha',
  'tuma',
  'peleka',
  'kama',
  'ikiwa',
  'vinginevyo',
  'sivyo',
  'rudia',
  'subiri',
  'ngoja',
  'wakati',
]);

/**
 * Quechua keywords (Latin script).
 * Distinguished by specific Quechua words.
 */
export const QUECHUA_KEYWORDS = new Set([
  't',
  'tikray',
  'kutichiy',
  'yapay',
  'yapaykuy',
  'qichuy',
  'hurquy',
  'anchuchiy',
  'rikuchiy',
  'qawachiy',
  'pakay',
  'pakakuy',
  'churay',
  'kamaykuy',
  'yapachiy',
  'pisiyachiy',
  'qallarichiy',
  'kachay',
  'apachiy',
  'sichus',
  'manachus',
  'hukniraq',
  'kutipay',
  'muyu',
  'suyay',
  'kaykamaqa',
]);

/**
 * Italian keywords (Latin script).
 * Distinguished by specific Italian words.
 */
export const ITALIAN_KEYWORDS = new Set([
  'commutare',
  'alternare',
  'cambiare',
  'aggiungere',
  'aggiungi',
  'rimuovere',
  'eliminare',
  'togliere',
  'mostrare',
  'visualizzare',
  'nascondere',
  'impostare',
  'definire',
  'incrementare',
  'aumentare',
  'decrementare',
  'diminuire',
  'scatenare',
  'attivare',
  'inviare',
  'se',
  'altrimenti',
  'ripetere',
  'aspettare',
  'attendere',
  'mentre',
]);

/**
 * Vietnamese keywords (Latin script with diacritics).
 * Distinguished by Vietnamese-specific diacritics and words.
 */
export const VIETNAMESE_KEYWORDS = new Set([
  'chuyển đổi',
  'bật tắt',
  'chuyển',
  'thêm',
  'bổ sung',
  'xóa',
  'gỡ bỏ',
  'loại bỏ',
  'bỏ',
  'hiển thị',
  'hiện',
  'ẩn',
  'che',
  'giấu',
  'gán',
  'thiết lập',
  'đặt',
  'tăng',
  'tăng lên',
  'giảm',
  'giảm đi',
  'kích hoạt',
  'gửi',
  'nếu',
  'không thì',
  'nếu không',
  'lặp lại',
  'chờ',
  'đợi',
  'trong khi',
]);

/**
 * Polish keywords (Latin script).
 * Distinguished by Polish-specific characters and words.
 */
export const POLISH_KEYWORDS = new Set([
  'przełącz',
  'przelacz',
  'dodaj',
  'usuń',
  'usun',
  'wyczyść',
  'wyczysc',
  'pokaż',
  'pokaz',
  'wyświetl',
  'wyswietl',
  'ukryj',
  'schowaj',
  'ustaw',
  'określ',
  'okresl',
  'zwiększ',
  'zwieksz',
  'zmniejsz',
  'wywołaj',
  'wywolaj',
  'wyzwól',
  'wyzwol',
  'wyślij',
  'wyslij',
  'jeśli',
  'jesli',
  'jeżeli',
  'jezeli',
  'inaczej',
  'wpp',
  'powtórz',
  'powtorz',
  'czekaj',
  'poczekaj',
  'dopóki',
  'dopoki',
  'podczas',
]);

/**
 * Russian keywords (Cyrillic script).
 * Unique script makes detection straightforward.
 */
export const RUSSIAN_KEYWORDS = new Set([
  'переключить',
  'переключи',
  'добавить',
  'добавь',
  'удалить',
  'удали',
  'убрать',
  'убери',
  'показать',
  'покажи',
  'скрыть',
  'скрой',
  'спрятать',
  'спрячь',
  'установить',
  'установи',
  'задать',
  'задай',
  'увеличить',
  'увеличь',
  'уменьшить',
  'уменьши',
  'вызвать',
  'вызови',
  'отправить',
  'отправь',
  'если',
  'иначе',
  'повторить',
  'повтори',
  'ждать',
  'жди',
  'подожди',
  'пока',
]);

/**
 * Ukrainian keywords (Cyrillic script).
 * Unique script makes detection straightforward.
 */
export const UKRAINIAN_KEYWORDS = new Set([
  'перемкнути',
  'перемкни',
  'додати',
  'додай',
  'видалити',
  'видали',
  'прибрати',
  'прибери',
  'показати',
  'покажи',
  'сховати',
  'сховай',
  'приховати',
  'приховай',
  'встановити',
  'встанови',
  'задати',
  'задай',
  'збільшити',
  'збільш',
  'зменшити',
  'зменш',
  'викликати',
  'виклич',
  'надіслати',
  'надішли',
  'якщо',
  'інакше',
  'повторити',
  'повтори',
  'чекати',
  'чекай',
  'зачекай',
  'поки',
]);

/**
 * Hindi keywords (Devanagari script).
 * Unique script makes detection straightforward.
 */
export const HINDI_KEYWORDS = new Set([
  'टॉगल',
  'बदलें',
  'बदल',
  'जोड़ें',
  'जोड़',
  'हटाएं',
  'हटा',
  'मिटाएं',
  'दिखाएं',
  'दिखा',
  'छिपाएं',
  'छिपा',
  'सेट',
  'निर्धारित',
  'बढ़ाएं',
  'बढ़ा',
  'घटाएं',
  'घटा',
  'ट्रिगर',
  'भेजें',
  'भेज',
  'अगर',
  'यदि',
  'वरना',
  'नहीं तो',
  'दोहराएं',
  'दोहरा',
  'प्रतीक्षा',
  'रुकें',
  'जब तक',
]);

/**
 * Bengali keywords (Bengali script).
 * Unique script makes detection straightforward.
 */
export const BENGALI_KEYWORDS = new Set([
  'টগল',
  'পরিবর্তন',
  'যোগ',
  'যোগ করুন',
  'সরান',
  'সরিয়ে ফেলুন',
  'মুছুন',
  'দেখান',
  'দেখাও',
  'লুকান',
  'লুকাও',
  'সেট',
  'নির্ধারণ',
  'বৃদ্ধি',
  'বাড়ান',
  'হ্রাস',
  'কমান',
  'ট্রিগার',
  'পাঠান',
  'পাঠাও',
  'যদি',
  'নতুবা',
  'না হলে',
  'পুনরাবৃত্তি',
  'বার বার',
  'অপেক্ষা',
  'থামুন',
  'যতক্ষণ',
]);

/**
 * Thai keywords (Thai script).
 * Unique script makes detection straightforward.
 */
export const THAI_KEYWORDS = new Set([
  'สลับ',
  'เพิ่ม',
  'ลบ',
  'ลบออก',
  'แสดง',
  'ซ่อน',
  'ตั้ง',
  'กำหนด',
  'เพิ่มค่า',
  'ลดค่า',
  'ทริกเกอร์',
  'ส่ง',
  'ถ้า',
  'หาก',
  'ไม่งั้น',
  'ไม่เช่นนั้น',
  'ทำซ้ำ',
  'รอ',
  'ในขณะที่',
]);

/**
 * Tagalog keywords (Latin script).
 * TODO: Fill in keywords after completing the semantic profile.
 * Run 'npm run sync-keywords' to auto-populate from profile.
 */
export const TL_KEYWORDS = new Set([
  'palitan',
  'itoggle',
  'idagdag',
  'magdagdag',
  'alisin',
  'tanggalin',
  'ipakita',
  'magpakita',
  'itago',
  'magtago',
  'itakda',
  'magtakda',
  'dagdagan',
  'taasan',
  'bawasan',
  'ibaba',
  'magpatugtog',
  'ipadala',
  'magpadala',
  'kung',
  'kapag',
  'kung_hindi',
  'kundi',
  'ulitin',
  'paulit-ulit',
  'maghintay',
  'hintay',
  'habang',
]);

/**
 * Map of language code to keyword set.
 */
export const LANGUAGE_KEYWORDS: Record<SupportedLanguage, Set<string>> = {
  en: new Set(), // English is the default, no detection needed
  ja: JAPANESE_KEYWORDS,
  ko: KOREAN_KEYWORDS,
  zh: CHINESE_KEYWORDS,
  ar: ARABIC_KEYWORDS,
  es: SPANISH_KEYWORDS,
  pt: PORTUGUESE_KEYWORDS,
  fr: FRENCH_KEYWORDS,
  de: GERMAN_KEYWORDS,
  it: ITALIAN_KEYWORDS,
  vi: VIETNAMESE_KEYWORDS,
  pl: POLISH_KEYWORDS,
  ru: RUSSIAN_KEYWORDS,
  uk: UKRAINIAN_KEYWORDS,
  hi: HINDI_KEYWORDS,
  bn: BENGALI_KEYWORDS,
  th: THAI_KEYWORDS,
  tr: TURKISH_KEYWORDS,
  id: INDONESIAN_KEYWORDS,
  sw: SWAHILI_KEYWORDS,
  qu: QUECHUA_KEYWORDS,
  tl: TL_KEYWORDS,
};

/**
 * Check if a script contains keywords from a specific language.
 * Returns true if any keyword from the language is found.
 *
 * Uses word boundary matching to avoid false positives from short keywords.
 * For non-Latin scripts (CJK, Arabic, etc.), simple includes is sufficient
 * since these characters don't appear in English/ASCII.
 */
export function containsLanguageKeywords(script: string, language: SupportedLanguage): boolean {
  const keywords = LANGUAGE_KEYWORDS[language];
  if (!keywords || keywords.size === 0) return false;

  // Non-Latin scripts can use simple includes (no risk of false positives)
  // Includes: CJK (ja, ko, zh), Arabic (ar), Cyrillic (ru, uk), Indic (hi, bn), Thai (th)
  const nonLatinLangs: SupportedLanguage[] = ['ja', 'ko', 'zh', 'ar', 'ru', 'uk', 'hi', 'bn', 'th'];
  if (nonLatinLangs.includes(language)) {
    for (const keyword of keywords) {
      if (script.includes(keyword)) {
        return true;
      }
    }
    return false;
  }

  // Latin-script languages need word boundary matching to avoid false positives
  // from short keywords like 'es', 'o', 'si', etc.
  const lowerScript = script.toLowerCase();
  for (const keyword of keywords) {
    // Skip very short keywords (2 chars or less) - too many false positives
    if (keyword.length <= 2) continue;

    // Use word boundary matching
    const pattern = new RegExp(`\\b${escapeRegExp(keyword.toLowerCase())}\\b`);
    if (pattern.test(lowerScript)) {
      return true;
    }
  }
  return false;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect all languages used in a hyperscript string.
 * Returns a Set of language codes found.
 *
 * Note: English is never detected (it's the default).
 * Only non-English languages are detected.
 */
export function detectLanguages(script: string): Set<SupportedLanguage> {
  const detected = new Set<SupportedLanguage>();

  for (const lang of SUPPORTED_LANGUAGES) {
    if (lang === 'en') continue; // Skip English

    if (containsLanguageKeywords(script, lang)) {
      detected.add(lang);
    }
  }

  return detected;
}

// =============================================================================
// Custom Keywords Support
// =============================================================================

/**
 * Runtime keyword registry for custom/extended languages.
 * Use registerCustomKeywords() to add or extend language keywords.
 */
const customKeywordRegistry: Map<string, { keywords: Set<string>; isNonLatin: boolean }> =
  new Map();

/**
 * Register custom keywords for a language.
 * Call this before scanning to add or extend language detection.
 *
 * @param code - Language code (e.g., 'es', 'my-lang')
 * @param config - Keyword configuration
 */
export function registerCustomKeywords(code: string, config: CustomLanguageKeywords): void {
  const existing = LANGUAGE_KEYWORDS[code as SupportedLanguage];
  const nonLatinLangs = ['ja', 'ko', 'zh', 'ar', 'ru', 'uk', 'hi', 'bn', 'th'];
  const isNonLatin = config.isNonLatin ?? nonLatinLangs.includes(code);

  if (config.extend && existing) {
    // Merge with existing keywords
    const merged = new Set([...existing, ...config.keywords]);
    customKeywordRegistry.set(code, { keywords: merged, isNonLatin });
  } else {
    // Replace or add new
    customKeywordRegistry.set(code, { keywords: config.keywords, isNonLatin });
  }
}

/**
 * Get keywords for a language, including custom registrations.
 */
export function getKeywordsForLanguage(code: string): Set<string> | undefined {
  const custom = customKeywordRegistry.get(code);
  if (custom) return custom.keywords;
  return LANGUAGE_KEYWORDS[code as SupportedLanguage];
}

/**
 * Check if a language uses non-Latin script.
 */
export function isNonLatinLanguage(code: string): boolean {
  const custom = customKeywordRegistry.get(code);
  if (custom) return custom.isNonLatin;
  const nonLatinLangs = ['ja', 'ko', 'zh', 'ar', 'ru', 'uk', 'hi', 'bn', 'th'];
  return nonLatinLangs.includes(code);
}

/**
 * Get all registered language codes (built-in + custom).
 */
export function getAllLanguageCodes(): string[] {
  const builtin = [...SUPPORTED_LANGUAGES];
  const custom = [...customKeywordRegistry.keys()];
  return [...new Set([...builtin, ...custom])];
}

/**
 * Clear all custom keyword registrations.
 */
export function clearCustomKeywords(): void {
  customKeywordRegistry.clear();
}

// =============================================================================
// Region Detection
// =============================================================================

/**
 * Get the optimal regional bundle for a set of detected languages.
 * Returns the smallest bundle that covers all detected languages.
 */
export function getOptimalRegion(
  languages: Set<SupportedLanguage>
): 'western' | 'east-asian' | 'slavic' | 'south-asian' | 'priority' | 'all' | null {
  if (languages.size === 0) return null;

  const langArray = [...languages];

  // Check if all languages fit in western bundle
  if (langArray.every(l => REGIONS.western.includes(l))) {
    return 'western';
  }

  // Check if all languages fit in east-asian bundle
  if (langArray.every(l => REGIONS['east-asian'].includes(l))) {
    return 'east-asian';
  }

  // Check if all languages fit in slavic bundle
  if (langArray.every(l => REGIONS.slavic.includes(l))) {
    return 'slavic';
  }

  // Check if all languages fit in south-asian bundle
  if (langArray.every(l => REGIONS['south-asian'].includes(l))) {
    return 'south-asian';
  }

  // Check if all languages fit in priority bundle
  if (langArray.every(l => REGIONS.priority.includes(l))) {
    return 'priority';
  }

  // Need full bundle
  return 'all';
}
