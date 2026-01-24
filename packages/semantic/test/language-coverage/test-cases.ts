/**
 * Language Coverage Test Cases
 *
 * Test cases for core commands across all priority languages.
 * Each command includes the native language syntax for parsing validation.
 *
 * Structure: TEST_CASES[command][language] = native hyperscript code
 *
 * Note: These are the primary/idiomatic forms for each language.
 * The parser should accept these as valid input.
 */

// All supported languages (23 total)
export const ALL_LANGUAGES = [
  'ar', 'bn', 'de', 'en', 'es', 'fr', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

export type SupportedLanguage = typeof ALL_LANGUAGES[number];

// Keep PRIORITY_LANGUAGES for backward compatibility (14 high-priority languages)
export const PRIORITY_LANGUAGES = [
  'en', 'es', 'pt', 'fr', 'de', 'it', 'vi', 'pl',  // Western + Vietnamese + Polish
  'ja', 'zh', 'ko',                                 // East Asian
  'ar', 'tr', 'id',                                 // Other priority
] as const;

export type PriorityLanguage = typeof PRIORITY_LANGUAGES[number];

// Core commands to test across all languages
export const CORE_COMMANDS = [
  'toggle', 'add', 'remove', 'put', 'set', 'get',
  'show', 'hide', 'increment', 'decrement',
] as const;

export type CoreCommand = typeof CORE_COMMANDS[number];

/**
 * Test cases for each command in each language.
 *
 * Format: Native hyperscript code that should parse to the given command.
 * Uses CSS class .active as the patient for consistency.
 */
export const TEST_CASES: Record<CoreCommand, Record<SupportedLanguage, string>> = {
  toggle: {
    en: 'toggle .active',
    es: 'alternar .active',
    pt: 'alternar .active',
    fr: 'basculer .active',
    de: 'umschalten .active',
    it: 'commutare .active',
    vi: 'chuyển đổi .active',
    pl: 'przełącz .active',
    ja: '.active を 切り替え',
    zh: '切换 .active',
    ko: '.active 를 토글',
    ar: 'بدّل .active',
    tr: '.active i değiştir',  // Accusative marker required
    id: 'alihkan .active',
    bn: 'toggle .active',  // Bengali - placeholder
    hi: 'toggle .active',  // Hindi - placeholder
    ms: 'toggle .active',  // Malay - placeholder
    qu: 'toggle .active',  // Quechua - placeholder
    ru: 'переключить .active',  // Russian
    sw: 'toggle .active',  // Swahili - placeholder
    th: 'toggle .active',  // Thai - placeholder
    tl: 'toggle .active',  // Tagalog - placeholder
    uk: 'перемикнути .active',  // Ukrainian
  },
  add: {
    en: 'add .highlight',
    es: 'agregar .highlight',
    pt: 'adicionar .highlight',
    fr: 'ajouter .highlight',
    de: 'hinzufügen .highlight',
    it: 'aggiungere .highlight',
    vi: 'thêm .highlight',
    pl: 'dodaj .highlight',
    ja: '.highlight を 追加',
    zh: '添加 .highlight',
    ko: '.highlight 를 추가',
    ar: 'أضف .highlight',
    tr: '.highlight i ekle',  // Accusative marker required
    id: 'tambah .highlight',
    bn: 'add .highlight',
    hi: 'add .highlight',
    ms: 'tambah .highlight',
    qu: 'add .highlight',
    ru: 'добавить .highlight',
    sw: 'add .highlight',
    th: 'add .highlight',
    tl: 'add .highlight',
    uk: 'додати .highlight',
  },
  remove: {
    en: 'remove .highlight',
    es: 'eliminar .highlight',
    pt: 'remover .highlight',
    fr: 'supprimer .highlight',
    de: 'entfernen .highlight',
    it: 'rimuovere .highlight',
    vi: 'xóa .highlight',
    pl: 'usuń .highlight',
    ja: '.highlight を 削除',
    zh: '移除 .highlight',
    ko: '.highlight 를 제거',
    ar: 'احذف .highlight',
    tr: '.highlight i kaldır',  // Accusative marker required
    id: 'hapus .highlight',
    bn: 'remove .highlight',
    hi: 'remove .highlight',
    ms: 'buang .highlight',
    qu: 'remove .highlight',
    ru: 'удалить .highlight',
    sw: 'remove .highlight',
    th: 'remove .highlight',
    tl: 'remove .highlight',
    uk: 'видалити .highlight',
  },
  put: {
    en: 'put "hello" into #output',
    es: 'poner "hola" en #output',
    pt: 'colocar "olá" em #output',
    fr: 'mettre "bonjour" dans #output',
    de: 'setzen "hallo" in #output',
    it: 'mettere "ciao" in #output',
    vi: 'đặt "xin chào" vào #output',
    pl: 'umieść "cześć" w #output',
    ja: '"こんにちは" を #output に 入れる',
    zh: '放置 "你好" 到 #output',
    ko: '"안녕하세요" 를 #output 에 넣기',
    ar: 'ضع "مرحبا" في #output',
    tr: '"merhaba" yi #output a koy',
    id: 'taruh "halo" ke dalam #output',
    bn: 'put "hello" into #output',
    hi: 'put "hello" into #output',
    ms: 'letak "hello" ke #output',
    qu: 'put "hello" into #output',
    ru: 'поместить "привет" в #output',
    sw: 'put "hello" into #output',
    th: 'put "hello" into #output',
    tl: 'put "hello" into #output',
    uk: 'помістити "привіт" в #output',
  },
  set: {
    en: 'set x to 10',
    es: 'establecer x a 10',
    pt: 'definir x para 10',
    fr: 'définir x à 10',
    de: 'setze x auf 10',
    it: 'impostare x a 10',
    vi: 'gán x thành 10',
    pl: 'ustaw x na 10',
    ja: 'x を 10 に 設定',
    zh: '设置 x 为 10',
    ko: 'x 를 10 으로 설정',
    ar: 'عيّن x إلى 10',
    tr: 'x i 10 e ayarla',  // Use primary keyword + proper markers
    id: 'atur x ke 10',
    bn: 'set x to 10',
    hi: 'set x to 10',
    ms: 'set x ke 10',
    qu: 'set x to 10',
    ru: 'установить x в 10',
    sw: 'set x to 10',
    th: 'set x to 10',
    tl: 'set x to 10',
    uk: 'встановити x в 10',
  },
  get: {
    en: 'get #element',
    es: 'obtener #element',
    pt: 'obter #element',
    fr: 'obtenir #element',
    de: 'hole #element',
    it: 'ottenere #element',
    vi: 'lấy giá trị #element',
    pl: 'pobierz #element',
    ja: '#element を 取得',
    zh: '获取 #element',
    ko: '#element 를 가져오기',
    ar: 'احصل على #element',
    tr: '#element i al',  // Accusative marker required
    id: 'dapatkan #element',
    bn: 'get #element',
    hi: 'get #element',
    ms: 'dapatkan #element',
    qu: 'get #element',
    ru: 'получить #element',
    sw: 'get #element',
    th: 'get #element',
    tl: 'get #element',
    uk: 'отримати #element',
  },
  show: {
    en: 'show #modal',
    es: 'mostrar #modal',
    pt: 'mostrar #modal',
    fr: 'afficher #modal',
    de: 'zeige #modal',
    it: 'mostrare #modal',
    vi: 'hiển thị #modal',
    pl: 'pokaż #modal',
    ja: '#modal を 表示',
    zh: '显示 #modal',
    ko: '#modal 를 보이기',
    ar: 'أظهر #modal',
    tr: '#modal i göster',  // Accusative marker required
    id: 'tampilkan #modal',
    bn: 'show #modal',
    hi: 'show #modal',
    ms: 'tunjuk #modal',
    qu: 'show #modal',
    ru: 'показать #modal',
    sw: 'show #modal',
    th: 'show #modal',
    tl: 'show #modal',
    uk: 'показати #modal',
  },
  hide: {
    en: 'hide #modal',
    es: 'ocultar #modal',
    pt: 'esconder #modal',
    fr: 'cacher #modal',
    de: 'verstecke #modal',
    it: 'nascondere #modal',
    vi: 'ẩn #modal',
    pl: 'ukryj #modal',
    ja: '#modal を 非表示',
    zh: '隐藏 #modal',
    ko: '#modal 를 숨기기',
    ar: 'أخف #modal',
    tr: '#modal i gizle',  // Accusative marker required
    id: 'sembunyikan #modal',
    bn: 'hide #modal',
    hi: 'hide #modal',
    ms: 'sembunyi #modal',
    qu: 'hide #modal',
    ru: 'скрыть #modal',
    sw: 'hide #modal',
    th: 'hide #modal',
    tl: 'hide #modal',
    uk: 'сховати #modal',
  },
  increment: {
    en: 'increment counter',
    es: 'incrementar contador',
    pt: 'incrementar contador',
    fr: 'incrémenter compteur',
    de: 'erhöhe zähler',
    it: 'incrementare contatore',
    vi: 'tăng counter',
    pl: 'zwiększ counter',
    ja: 'counter を 増加',
    zh: '增加 counter',
    ko: 'counter 를 증가',
    ar: 'زِد counter',
    tr: 'counter i artır',  // Accusative marker required
    id: 'tingkatkan counter',
    bn: 'increment counter',
    hi: 'increment counter',
    ms: 'tambah counter',
    qu: 'increment counter',
    ru: 'увеличить counter',
    sw: 'increment counter',
    th: 'increment counter',
    tl: 'increment counter',
    uk: 'збільшити counter',
  },
  decrement: {
    en: 'decrement counter',
    es: 'decrementar contador',
    pt: 'decrementar contador',
    fr: 'décrémenter compteur',
    de: 'verringere zähler',
    it: 'decrementare contatore',
    vi: 'giảm counter',
    pl: 'zmniejsz counter',
    ja: 'counter を 減少',
    zh: '减少 counter',
    ko: 'counter 를 감소',
    ar: 'أنقص counter',
    tr: 'counter i azalt',  // Accusative marker required
    id: 'turunkan counter',
    bn: 'decrement counter',
    hi: 'decrement counter',
    ms: 'kurang counter',
    qu: 'decrement counter',
    ru: 'уменьшить counter',
    sw: 'decrement counter',
    th: 'decrement counter',
    tl: 'decrement counter',
    uk: 'зменшити counter',
  },
};

/**
 * Full-form test cases with event handlers.
 *
 * These test complete patterns including event triggers, which better reflect
 * real-world usage. Focus on the 5 languages with SOV/VSO word order:
 * - Japanese (ja): SOV, particles, no spaces
 * - Korean (ko): SOV, agglutinative, vowel harmony
 * - Turkish (tr): SOV, vowel harmony, case suffixes
 * - Arabic (ar): VSO, RTL, proclitics
 * - Hindi (hi): SOV, postpositions, Devanagari script
 * - Bengali (bn): SOV, postpositions, Bengali script
 * - Russian (ru): SVO, prepositions, Cyrillic script
 * - Ukrainian (uk): SVO, prepositions, Cyrillic script
 * - Thai (th): SVO, prepositions, Thai script, no spaces
 * - Chinese (zh): SVO, prepositions, Chinese script, no spaces
 * - Spanish (es): SVO, prepositions, Latin script
 */
export const EVENT_HANDLER_TEST_CASES = {
  // Toggle with event handlers
  'toggle-on-click': {
    ja: 'クリック で #button の .active を 切り替え',
    ko: '클릭 할 때 #button 의 .active 를 토글',
    tr: 'tıklama da #button ın .active i değiştir',
    ar: 'عند النقر على #button بدّل .active',
    hi: 'क्लिक पर #button का .active को टॉगल',
    bn: 'ক্লিক তে #button র .active কে টগল',
    ru: 'при клике переключить .active на #button',
    uk: 'при кліку перемкнути .active на #button',
    th: 'เมื่อ คลิก สลับ .active ใน #button',
    zh: '当 点击 切换 .active 在 #button',
    es: 'al clic alternar .active en #button',
    en: 'on click toggle .active on #button',
  },

  'toggle-on-submit': {
    ja: '送信 で .loading を 切り替え',
    ko: '제출 할 때 .loading 을 토글',
    tr: 'gönderme de .loading i değiştir',
    ar: 'عند الإرسال بدّل .loading',
    hi: 'सबमिट पर .loading को टॉगल',
    bn: 'সাবমিট তে .loading কে টগল',
    ru: 'при отправке переключить .loading',
    uk: 'при відправці перемкнути .loading',
    th: 'เมื่อ ส่ง สลับ .loading',
    zh: '当 提交 切换 .loading',
    es: 'al envío alternar .loading',
    en: 'on submit toggle .loading',
  },

  // Add/Remove with event handlers
  'add-on-hover': {
    ja: 'ホバー で .highlight を 追加',
    ko: '호버 할 때 .highlight 를 추가',
    tr: 'üzerine gelme de .highlight i ekle',
    ar: 'عند التحويم أضف .highlight',
    hi: 'होवर पर .highlight को जोड़ें',
    bn: 'হোভার তে .highlight কে যোগ',
    ru: 'при наведении добавить .highlight',
    uk: 'при наведенні додати .highlight',
    th: 'เมื่อ โฮเวอร์ เพิ่ม .highlight',
    zh: '当 悬停 添加 .highlight',
    es: 'al sobrevolar agregar .highlight',
    en: 'on hover add .highlight',
  },

  'remove-on-click': {
    ja: 'クリック で .error を 削除',
    ko: '클릭 할 때 .error 를 제거',
    tr: 'tıklama da .error i kaldır',
    ar: 'عند النقر احذف .error',
    hi: 'क्लिक पर .error को हटाएं',
    bn: 'ক্লিক তে .error কে সরান',
    ru: 'при клике удалить .error',
    uk: 'при кліку видалити .error',
    th: 'เมื่อ คลิก ลบ .error',
    zh: '当 点击 移除 .error',
    es: 'al clic quitar .error',
    en: 'on click remove .error',
  },

  // Show/Hide with event handlers
  'show-on-focus': {
    ja: 'フォーカス で #tooltip を 表示',
    ko: '포커스 할 때 #tooltip 를 보이기',
    tr: 'odaklanma da #tooltip i göster',
    ar: 'عند التركيز أظهر #tooltip',
    hi: 'फोकस पर #tooltip को दिखाएं',
    bn: 'ফোকাস তে #tooltip কে দেখান',
    ru: 'при фокусе показать #tooltip',
    uk: 'при фокусі показати #tooltip',
    th: 'เมื่อ โฟกัส แสดง #tooltip',
    zh: '当 聚焦 显示 #tooltip',
    es: 'al enfocar mostrar #tooltip',
    en: 'on focus show #tooltip',
  },

  'hide-on-blur': {
    ja: 'ブラー で #tooltip を 非表示',
    ko: '블러 할 때 #tooltip 를 숨기기',
    tr: 'bulanıklık da #tooltip i gizle',
    ar: 'عند عدم التركيز أخف #tooltip',
    hi: 'धुंधला पर #tooltip को छिपाएं',
    bn: 'ঝাপসা তে #tooltip কে লুকান',
    ru: 'при размытии скрыть #tooltip',
    uk: 'при розфокусуванні сховати #tooltip',
    th: 'เมื่อ เบลอ ซ่อน #tooltip',
    zh: '当 失焦 隐藏 #tooltip',
    es: 'al desenfocar ocultar #tooltip',
    en: 'on blur hide #tooltip',
  },

  // Increment/Decrement with event handlers
  'increment-on-click': {
    ja: 'クリック で #counter を 増加',
    ko: '클릭 할 때 #counter 를 증가',
    tr: 'tıklama da #counter i artır',
    ar: 'عند النقر زِد #counter',
    hi: 'क्लिक पर #counter को बढ़ाएं',
    bn: 'ক্লিক তে #counter কে বৃদ্ধি',
    ru: 'при клике увеличить #counter',
    uk: 'при кліку збільшити #counter',
    th: 'เมื่อ คลิก เพิ่มค่า #counter',
    zh: '当 点击 增加 #counter',
    es: 'al clic incrementar #counter',
    en: 'on click increment #counter',
  },

  'decrement-on-click': {
    ja: 'クリック で #counter を 減少',
    ko: '클릭 할 때 #counter 를 감소',
    tr: 'tıklama da #counter i azalt',
    ar: 'عند النقر أنقص #counter',
    hi: 'क्लिक पर #counter को घटाएं',
    bn: 'ক্লিক তে #counter কে হ্রাস',
    ru: 'при клике уменьшить #counter',
    uk: 'при кліку зменшити #counter',
    th: 'เมื่อ คลิก ลดค่า #counter',
    zh: '当 点击 减少 #counter',
    es: 'al clic decrementar #counter',
    en: 'on click decrement #counter',
  },

  // Put/Set with event handlers
  'put-on-input': {
    ja: '入力 で "test" を #output に 入れる',
    ko: '입력 할 때 "test" 를 #output 에 넣기',
    tr: 'giriş de "test" i #output a koy',
    ar: 'عند الإدخال ضع "test" في #output',
    hi: 'इनपुट पर "test" को #output में रखें',
    bn: 'ইনপুট তে "test" কে #output তে রাখুন',
    ru: 'при вводе положить "test" в #output',
    uk: 'при введенні покласти "test" в #output',
    th: 'เมื่อ ป้อน ใส่ "test" ใน #output',
    zh: '当 输入 放置 "test" 在 #output',
    es: 'al entrada poner "test" en #output',
    en: 'on input put "test" into #output',
  },

  'set-on-change': {
    ja: '変更 で x を 10 に 設定',
    ko: '변경 할 때 x 를 10 으로 설정',
    tr: 'değişiklik de x i 10 e ayarla',
    ar: 'عند التغيير عيّن x إلى 10',
    hi: 'बदलाव पर x को 10 में सेट',
    bn: 'পরিবর্তন তে x কে 10 তে সেট',
    ru: 'при изменении установить x в 10',
    uk: 'при зміні встановити x в 10',
    th: 'เมื่อ เปลี่ยน ตั้ง x เป็น 10',
    zh: '当 改变 设置 x 为 10',
    es: 'al cambio establecer x a 10',
    en: 'on change set x to 10',
  },

  // Complex patterns with multiple roles
  'toggle-with-destination': {
    ja: 'クリック で #button に .active を 切り替え',
    ko: '클릭 할 때 #button 에 .active 를 토글',
    tr: 'tıklama da #button e .active i değiştir',
    ar: 'عند النقر بدّل .active على #button',
    hi: 'क्लिक पर #button में .active को टॉगल',
    bn: 'ক্লিক তে #button তে .active কে টগল',
    ru: 'при клике переключить .active на #button',
    uk: 'при кліку перемкнути .active на #button',
    th: 'เมื่อ คลิก สลับ .active ใน #button',
    zh: '当 点击 切换 .active 在 #button',
    es: 'al clic alternar .active en #button',
    en: 'on click toggle .active on #button',
  },

  'add-with-destination': {
    ja: 'ホバー で #element に .hover を 追加',
    ko: '호버 할 때 #element 에 .hover 를 추가',
    tr: 'üzerine gelme de #element e .hover i ekle',
    ar: 'عند التحويم أضف .hover إلى #element',
    hi: 'होवर पर #element में .hover को जोड़ें',
    bn: 'হোভার তে #element তে .hover কে যোগ',
    ru: 'при наведении добавить .hover на #element',
    uk: 'при наведенні додати .hover на #element',
    th: 'เมื่อ โฮเวอร์ เพิ่ม .hover ใน #element',
    zh: '当 悬停 添加 .hover 在 #element',
    es: 'al sobrevolar agregar .hover en #element',
    en: 'on hover add .hover to #element',
  },

  // Compact forms (no spaces) - particularly challenging for Korean/Japanese
  'toggle-compact-ko': {
    ko: '클릭할때 .active를토글',
    en: 'on click toggle .active',
  },

  'add-compact-ja': {
    ja: 'クリックで.highlightを追加',
    en: 'on click add .highlight',
  },

  // Vowel harmony variants for Turkish
  'toggle-with-back-vowel': {
    tr: 'tıklama da buton u değiştir', // back vowel: u
    en: 'on click toggle button',
  },

  'toggle-with-front-vowel': {
    tr: 'tıklama da düğme yi değiştir', // front vowel: ü
    en: 'on click toggle button',
  },

  // Arabic with proclitics (و, ف attached)
  'toggle-with-proclitic-wa': {
    ar: 'والنقر بدّل .active', // و (and) attached to النقر (click)
    en: 'and click toggle .active',
  },

  'add-with-proclitic-fa': {
    ar: 'فالتحويم أضف .highlight', // ف (then) attached to التحويم (hover)
    en: 'then hover add .highlight',
  },
} as const;

export type EventHandlerTestCase = keyof typeof EVENT_HANDLER_TEST_CASES;

/**
 * Get event handler test case by name and language.
 */
export function getEventHandlerTestCase(
  testCase: EventHandlerTestCase,
  language: 'ja' | 'ko' | 'tr' | 'ar' | 'hi' | 'bn' | 'ru' | 'uk' | 'th' | 'zh' | 'es' | 'en'
): string | undefined {
  return EVENT_HANDLER_TEST_CASES[testCase][language];
}

/**
 * Get all event handler test cases for a language.
 */
export function getEventHandlerTestCasesForLanguage(
  language: 'ja' | 'ko' | 'tr' | 'ar' | 'hi' | 'bn' | 'ru' | 'uk' | 'th' | 'zh' | 'es' | 'en'
): Record<string, string> {
  const cases: Record<string, string> = {};
  for (const [testName, testValues] of Object.entries(EVENT_HANDLER_TEST_CASES)) {
    if (language in testValues) {
      cases[testName] = testValues[language as keyof typeof testValues] as string;
    }
  }
  return cases;
}

/**
 * Get test case for a specific command and language.
 */
export function getTestCase(command: CoreCommand, language: SupportedLanguage): string {
  return TEST_CASES[command][language];
}

/**
 * Get all test cases for a specific language.
 */
export function getLanguageTestCases(language: SupportedLanguage): Record<CoreCommand, string> {
  const cases: Partial<Record<CoreCommand, string>> = {};
  for (const command of CORE_COMMANDS) {
    cases[command] = TEST_CASES[command][language];
  }
  return cases as Record<CoreCommand, string>;
}

/**
 * Get all test cases for a specific command.
 */
export function getCommandTestCases(command: CoreCommand): Record<SupportedLanguage, string> {
  return TEST_CASES[command];
}
