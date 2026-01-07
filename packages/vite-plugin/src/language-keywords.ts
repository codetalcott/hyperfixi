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
  'en', 'es', 'pt', 'fr', 'de', 'it', 'vi',  // Western (Latin script)
  'pl', 'ru', 'uk',                          // Slavic (Latin/Cyrillic)
  'ja', 'zh', 'ko',                          // East Asian
  'ar',                                      // RTL (Arabic script)
  'hi', 'bn',                                // South Asian (Indic scripts)
  'th',                                      // Southeast Asian (Thai script)
  'tr',                                      // Agglutinative Latin
  'id', 'sw', 'qu',// Other
  'tl',  // Tagalog (auto-added)
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/**
 * Regional bundle mappings.
 */
export const REGIONS = {
  western: ['en', 'es', 'pt', 'fr', 'de', 'it'] as SupportedLanguage[],
  'east-asian': ['ja', 'zh', 'ko'] as SupportedLanguage[],
  slavic: ['pl', 'ru', 'uk'] as SupportedLanguage[],
  'south-asian': ['hi', 'bn'] as SupportedLanguage[],
  priority: ['en', 'es', 'pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ar', 'tr', 'ru', 'hi'] as SupportedLanguage[],
  all: SUPPORTED_LANGUAGES as unknown as SupportedLanguage[],
};

/**
 * Japanese keywords (hiragana, katakana, kanji).
 * Unique script makes detection straightforward.
 */
export const JAPANESE_KEYWORDS = new Set([
  // Commands
  'トグル', '切り替え', '追加', '削除', '表示', '隠す', '非表示',
  '設定', 'セット', '増加', '減少', 'ログ', '出力',
  // Events
  'クリック', '入力', '変更', 'フォーカス',
  // Control flow
  'もし', '繰り返し', '待つ', '待機',
  // References
  '私', 'それ', '結果',
  // Positional
  '最初', '最後', '次', '前',
]);

/**
 * Korean keywords (Hangul).
 * Unique script makes detection straightforward.
 */
export const KOREAN_KEYWORDS = new Set([
  // Commands
  '토글', '전환', '추가', '제거', '삭제', '표시', '숨기다',
  '설정', '증가', '감소', '로그',
  // Events
  '클릭', '입력', '변경', '포커스',
  // Control flow
  '만약', '반복', '대기',
  // References
  '나', '내', '그것', '결과',
  // Positional
  '첫번째', '마지막', '다음', '이전',
]);

/**
 * Chinese keywords (CJK characters).
 * Note: Some overlap with Japanese kanji, but context usually distinguishes.
 */
export const CHINESE_KEYWORDS = new Set([
  // Commands
  '切换', '添加', '移除', '删除', '显示', '隐藏',
  '设置', '设定', '增加', '减少', '日志', '记录',
  // Events
  '点击', '输入', '改变', '聚焦',
  // Control flow
  '如果', '重复', '等待',
  // References
  '我', '它', '结果',
  // Positional
  '第一', '最后', '下一个', '上一个',
]);

/**
 * Arabic keywords (Arabic script).
 * RTL script makes detection straightforward.
 */
export const ARABIC_KEYWORDS = new Set([
  // Commands
  'بدّل', 'بدل', 'أضف', 'اضف', 'أزل', 'ازل', 'احذف',
  'أظهر', 'اظهر', 'أخفِ', 'اخف',
  'ضع', 'اضع', 'زِد', 'أنقص',
  // Events
  'عند', 'نقر', 'إدخال', 'تغيير',
  // Control flow
  'إذا', 'كرر', 'انتظر',
  // References
  'أنا', 'هو', 'النتيجة',
]);

/**
 * Spanish keywords (Latin script with accents).
 * Distinguished by specific Spanish words.
 */
export const SPANISH_KEYWORDS = new Set([
  // Commands
  'alternar', 'añadir', 'agregar', 'quitar', 'eliminar',
  'mostrar', 'ocultar', 'esconder',
  'establecer', 'fijar', 'incrementar', 'decrementar',
  // Events
  'clic', 'entrada', 'cambio',
  // Control flow
  'si', 'sino', 'repetir', 'esperar', 'mientras',
  // References
  'yo', 'ello', 'resultado',
  // Positional
  'primero', 'último', 'siguiente', 'anterior',
]);

/**
 * Portuguese keywords (Latin script with accents).
 * Distinguished by specific Portuguese words.
 */
export const PORTUGUESE_KEYWORDS = new Set([
  // Commands
  'alternar', 'adicionar', 'remover', 'mostrar', 'esconder', 'ocultar',
  'definir', 'incrementar', 'decrementar',
  // Events
  'clique', 'entrada', 'mudança',
  // Control flow
  'se', 'senão', 'repetir', 'aguardar', 'enquanto',
  // References
  'eu', 'isso', 'resultado',
  // Positional
  'primeiro', 'último', 'próximo', 'anterior',
]);

/**
 * French keywords (Latin script with accents).
 * Distinguished by specific French words.
 */
export const FRENCH_KEYWORDS = new Set([
  // Commands
  'basculer', 'ajouter', 'supprimer', 'retirer',
  'afficher', 'montrer', 'cacher', 'masquer',
  'définir', 'incrémenter', 'décrémenter',
  // Events
  'cliquer', 'saisie', 'changement',
  // Control flow
  'si', 'sinon', 'répéter', 'attendre', 'pendant',
  // References
  'moi', 'cela', 'résultat',
  // Positional
  'premier', 'dernier', 'suivant', 'précédent',
]);

/**
 * German keywords (Latin script with umlauts).
 * Distinguished by specific German words.
 */
export const GERMAN_KEYWORDS = new Set([
  // Commands
  'umschalten', 'hinzufügen', 'entfernen', 'löschen',
  'anzeigen', 'zeigen', 'verbergen', 'verstecken',
  'setzen', 'festlegen', 'erhöhen', 'verringern',
  // Events
  'klick', 'eingabe', 'änderung',
  // Control flow
  'wenn', 'sonst', 'wiederholen', 'warten', 'während',
  // References
  'ich', 'es', 'ergebnis',
  // Positional
  'erste', 'letzte', 'nächste', 'vorherige',
]);

/**
 * Turkish keywords (Latin script with special chars).
 * Distinguished by Turkish-specific characters and words.
 */
export const TURKISH_KEYWORDS = new Set([
  // Commands
  'değiştir', 'değistir', 'ekle', 'kaldır', 'kaldir', 'sil',
  'göster', 'gizle', 'sakla',
  'ayarla', 'belirle', 'arttır', 'azalt',
  // Events
  'tıklama', 'tiklama', 'giriş', 'giris', 'değişim', 'degisim',
  // Control flow
  'eğer', 'eger', 'yoksa', 'tekrarla', 'bekle', 'süresince',
  // References
  'ben', 'o', 'sonuç', 'sonuc',
  // Positional
  'ilk', 'son', 'sonraki', 'önceki', 'onceki',
]);

/**
 * Indonesian keywords (Latin script).
 * Distinguished by specific Indonesian words.
 */
export const INDONESIAN_KEYWORDS = new Set([
  // Commands
  'alih', 'beralih', 'tambah', 'hapus', 'buang',
  'tampilkan', 'sembunyikan',
  'atur', 'tetapkan', 'tambahkan', 'kurangi',
  // Events
  'klik', 'masukan', 'perubahan',
  // Control flow
  'jika', 'kalau', 'ulangi', 'tunggu', 'selama',
  // References
  'saya', 'itu', 'hasil',
  // Positional
  'pertama', 'terakhir', 'berikutnya', 'sebelumnya',
]);

/**
 * Swahili keywords (Latin script).
 * Distinguished by specific Swahili words.
 */
export const SWAHILI_KEYWORDS = new Set([
  // Commands
  'badilisha', 'ongeza', 'ondoa', 'futa',
  'onyesha', 'ficha',
  'weka', 'sanidi', 'ongezea', 'punguza',
  // Events
  'bofya', 'ingizo', 'badiliko',
  // Control flow
  'ikiwa', 'kama', 'rudia', 'subiri', 'wakati',
  // References
  'mimi', 'hiyo', 'matokeo',
  // Positional
  'kwanza', 'mwisho', 'inayofuata', 'iliyotangulia',
]);

/**
 * Quechua keywords (Latin script).
 * Distinguished by specific Quechua words.
 */
export const QUECHUA_KEYWORDS = new Set([
  // Commands
  'tikray', 'yapay', 'qichuy', 'pichay',
  'rikuchiy', 'pakay',
  'churay', 'yapay', 'pisiyachiy',
  // Events
  'ñit\'iy', 'yaykuchiy', 'tikray',
  // Control flow
  'sichus', 'mana', 'kutipay', 'suyay', 'chaykama',
  // References
  'ñuqa', 'chay', 'lluqsisqa',
  // Positional
  'ñawpaq', 'qhipa', 'hamuq', 'ñawpaqnin',
]);

/**
 * Italian keywords (Latin script).
 * Distinguished by specific Italian words.
 */
export const ITALIAN_KEYWORDS = new Set([
  // Commands
  'commutare', 'alternare', 'aggiungere', 'rimuovere', 'eliminare',
  'mostrare', 'nascondere', 'impostare', 'incrementare', 'decrementare',
  // Events
  'clic', 'ingresso', 'cambiamento',
  // Control flow
  'altrimenti', 'ripetere', 'aspettare', 'attendere', 'mentre',
  // References
  'risultato',
  // Positional
  'primo', 'ultimo', 'successivo', 'precedente',
]);

/**
 * Vietnamese keywords (Latin script with diacritics).
 * Distinguished by Vietnamese-specific diacritics and words.
 */
export const VIETNAMESE_KEYWORDS = new Set([
  // Commands
  'chuyển đổi', 'bật tắt', 'thêm', 'xóa', 'gỡ bỏ',
  'hiển thị', 'ẩn', 'gán', 'thiết lập', 'tăng', 'giảm',
  // Events
  'kích hoạt', 'gửi',
  // Control flow
  'nếu', 'không thì', 'lặp lại', 'chờ', 'đợi', 'trong khi',
  // References
  'kết quả',
  // Positional
  'đầu tiên', 'cuối cùng', 'tiếp theo', 'trước',
]);

/**
 * Polish keywords (Latin script).
 * Distinguished by Polish-specific characters and words.
 */
export const POLISH_KEYWORDS = new Set([
  // Commands (imperative form)
  'przełącz', 'przelacz', 'dodaj', 'usuń', 'usun',
  'pokaż', 'pokaz', 'ukryj', 'ustaw', 'zwiększ', 'zwieksz', 'zmniejsz',
  // Events
  'kliknięcie', 'klikniecie', 'wywołaj', 'wywolaj', 'wyślij', 'wyslij',
  // Control flow
  'jeśli', 'jesli', 'jeżeli', 'jezeli', 'inaczej', 'powtórz', 'powtorz',
  'czekaj', 'poczekaj', 'dopóki', 'dopoki',
  // References
  'wynik',
  // Positional
  'pierwszy', 'ostatni', 'następny', 'nastepny', 'poprzedni',
]);

/**
 * Russian keywords (Cyrillic script).
 * Unique script makes detection straightforward.
 */
export const RUSSIAN_KEYWORDS = new Set([
  // Commands
  'переключить', 'добавить', 'удалить', 'убрать',
  'показать', 'скрыть', 'установить', 'увеличить', 'уменьшить',
  // Events
  'вызвать', 'отправить',
  // Control flow
  'если', 'иначе', 'повторить', 'ждать', 'пока',
  // References
  'результат',
  // Positional
  'первый', 'последний', 'следующий', 'предыдущий',
]);

/**
 * Ukrainian keywords (Cyrillic script).
 * Unique script makes detection straightforward.
 */
export const UKRAINIAN_KEYWORDS = new Set([
  // Commands
  'перемкнути', 'додати', 'видалити', 'прибрати',
  'показати', 'сховати', 'приховати', 'встановити', 'збільшити', 'зменшити',
  // Events
  'викликати', 'надіслати',
  // Control flow
  'якщо', 'інакше', 'повторити', 'чекати', 'поки',
  // References
  'результат',
  // Positional
  'перший', 'останній', 'наступний', 'попередній',
]);

/**
 * Hindi keywords (Devanagari script).
 * Unique script makes detection straightforward.
 */
export const HINDI_KEYWORDS = new Set([
  // Commands
  'टॉगल', 'बदलें', 'जोड़ें', 'हटाएं', 'मिटाएं',
  'दिखाएं', 'छिपाएं', 'सेट', 'बढ़ाएं', 'घटाएं',
  // Events
  'ट्रिगर', 'भेजें',
  // Control flow
  'अगर', 'यदि', 'वरना', 'दोहराएं', 'प्रतीक्षा', 'जब तक',
  // References
  'परिणाम',
  // Positional
  'पहला', 'आखिरी', 'अगला', 'पिछला',
]);

/**
 * Bengali keywords (Bengali script).
 * Unique script makes detection straightforward.
 */
export const BENGALI_KEYWORDS = new Set([
  // Commands
  'টগল', 'পরিবর্তন', 'যোগ', 'সরান', 'মুছুন',
  'দেখান', 'লুকান', 'সেট', 'বৃদ্ধি', 'হ্রাস',
  // Events
  'ট্রিগার', 'পাঠান',
  // Control flow
  'যদি', 'নতুবা', 'পুনরাবৃত্তি', 'অপেক্ষা', 'যতক্ষণ',
  // References
  'ফলাফল',
  // Positional
  'প্রথম', 'শেষ', 'পরবর্তী', 'আগের',
]);

/**
 * Thai keywords (Thai script).
 * Unique script makes detection straightforward.
 */
export const THAI_KEYWORDS = new Set([
  // Commands
  'สลับ', 'เพิ่ม', 'ลบ', 'ลบออก',
  'แสดง', 'ซ่อน', 'ตั้ง', 'กำหนด', 'เพิ่มค่า', 'ลดค่า',
  // Events
  'ทริกเกอร์', 'ส่ง',
  // Control flow
  'ถ้า', 'หาก', 'ไม่งั้น', 'ทำซ้ำ', 'รอ', 'ในขณะที่',
  // References
  'ผลลัพธ์',
  // Positional
  'แรก', 'สุดท้าย', 'ถัดไป', 'ก่อนหน้า',
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
  'habang'
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
const customKeywordRegistry: Map<string, { keywords: Set<string>; isNonLatin: boolean }> = new Map();

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
  if (langArray.every((l) => REGIONS.western.includes(l))) {
    return 'western';
  }

  // Check if all languages fit in east-asian bundle
  if (langArray.every((l) => REGIONS['east-asian'].includes(l))) {
    return 'east-asian';
  }

  // Check if all languages fit in slavic bundle
  if (langArray.every((l) => REGIONS.slavic.includes(l))) {
    return 'slavic';
  }

  // Check if all languages fit in south-asian bundle
  if (langArray.every((l) => REGIONS['south-asian'].includes(l))) {
    return 'south-asian';
  }

  // Check if all languages fit in priority bundle
  if (langArray.every((l) => REGIONS.priority.includes(l))) {
    return 'priority';
  }

  // Need full bundle
  return 'all';
}
