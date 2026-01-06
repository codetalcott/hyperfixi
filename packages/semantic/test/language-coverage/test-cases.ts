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

// Priority languages (excludes sw, qu which are proof-of-concept)
export const PRIORITY_LANGUAGES = [
  'en', 'es', 'pt', 'fr', 'de', 'it', 'vi',  // Western + Vietnamese
  'ja', 'zh', 'ko',                           // East Asian
  'ar', 'tr', 'id',                           // Other priority
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
export const TEST_CASES: Record<CoreCommand, Record<PriorityLanguage, string>> = {
  toggle: {
    en: 'toggle .active',
    es: 'alternar .active',
    pt: 'alternar .active',
    fr: 'basculer .active',
    de: 'umschalten .active',
    it: 'commutare .active',
    vi: 'chuyển đổi .active',
    ja: '.active を 切り替え',
    zh: '切换 .active',
    ko: '.active 를 토글',
    ar: 'بدّل .active',
    tr: '.active değiştir',
    id: 'alihkan .active',
  },
  add: {
    en: 'add .highlight',
    es: 'agregar .highlight',
    pt: 'adicionar .highlight',
    fr: 'ajouter .highlight',
    de: 'hinzufügen .highlight',
    it: 'aggiungere .highlight',
    vi: 'thêm .highlight',
    ja: '.highlight を 追加',
    zh: '添加 .highlight',
    ko: '.highlight 를 추가',
    ar: 'أضف .highlight',
    tr: '.highlight ekle',
    id: 'tambah .highlight',
  },
  remove: {
    en: 'remove .highlight',
    es: 'eliminar .highlight',
    pt: 'remover .highlight',
    fr: 'supprimer .highlight',
    de: 'entfernen .highlight',
    it: 'rimuovere .highlight',
    vi: 'xóa .highlight',
    ja: '.highlight を 削除',
    zh: '移除 .highlight',
    ko: '.highlight 를 제거',
    ar: 'احذف .highlight',
    tr: '.highlight kaldır',
    id: 'hapus .highlight',
  },
  put: {
    en: 'put "hello" into #output',
    es: 'poner "hola" en #output',
    pt: 'colocar "olá" em #output',
    fr: 'mettre "bonjour" dans #output',
    de: 'setzen "hallo" in #output',
    it: 'mettere "ciao" in #output',
    vi: 'đặt "xin chào" vào #output',
    ja: '"こんにちは" を #output に 入れる',
    zh: '放置 "你好" 到 #output',
    ko: '"안녕하세요" 를 #output 에 넣기',
    ar: 'ضع "مرحبا" في #output',
    tr: '"merhaba" yi #output a koy',
    id: 'taruh "halo" ke dalam #output',
  },
  set: {
    en: 'set x to 10',
    es: 'establecer x a 10',
    pt: 'definir x para 10',
    fr: 'définir x à 10',
    de: 'setze x auf 10',
    it: 'impostare x a 10',
    vi: 'gán x thành 10',
    ja: 'x を 10 に 設定',
    zh: '设置 x 为 10',
    ko: 'x 를 10 으로 설정',
    ar: 'عيّن x إلى 10',
    tr: 'x yi 10 yap',
    id: 'atur x ke 10',
  },
  get: {
    en: 'get #element',
    es: 'obtener #element',
    pt: 'obter #element',
    fr: 'obtenir #element',
    de: 'hole #element',
    it: 'ottenere #element',
    vi: 'lấy giá trị #element',
    ja: '#element を 取得',
    zh: '获取 #element',
    ko: '#element 를 가져오기',
    ar: 'احصل على #element',
    tr: '#element al',
    id: 'dapatkan #element',
  },
  show: {
    en: 'show #modal',
    es: 'mostrar #modal',
    pt: 'mostrar #modal',
    fr: 'afficher #modal',
    de: 'zeige #modal',
    it: 'mostrare #modal',
    vi: 'hiển thị #modal',
    ja: '#modal を 表示',
    zh: '显示 #modal',
    ko: '#modal 를 보이기',
    ar: 'أظهر #modal',
    tr: '#modal göster',
    id: 'tampilkan #modal',
  },
  hide: {
    en: 'hide #modal',
    es: 'ocultar #modal',
    pt: 'esconder #modal',
    fr: 'cacher #modal',
    de: 'verstecke #modal',
    it: 'nascondere #modal',
    vi: 'ẩn #modal',
    ja: '#modal を 非表示',
    zh: '隐藏 #modal',
    ko: '#modal 를 숨기기',
    ar: 'أخف #modal',
    tr: '#modal gizle',
    id: 'sembunyikan #modal',
  },
  increment: {
    en: 'increment counter',
    es: 'incrementar contador',
    pt: 'incrementar contador',
    fr: 'incrémenter compteur',
    de: 'erhöhe zähler',
    it: 'incrementare contatore',
    vi: 'tăng counter',
    ja: 'counter を 増加',
    zh: '增加 counter',
    ko: 'counter 를 증가',
    ar: 'زِد counter',
    tr: 'counter artır',
    id: 'tingkatkan counter',
  },
  decrement: {
    en: 'decrement counter',
    es: 'decrementar contador',
    pt: 'decrementar contador',
    fr: 'décrémenter compteur',
    de: 'verringere zähler',
    it: 'decrementare contatore',
    vi: 'giảm counter',
    ja: 'counter を 減少',
    zh: '减少 counter',
    ko: 'counter 를 감소',
    ar: 'أنقص counter',
    tr: 'counter azalt',
    id: 'turunkan counter',
  },
};

/**
 * Get test case for a specific command and language.
 */
export function getTestCase(command: CoreCommand, language: PriorityLanguage): string {
  return TEST_CASES[command][language];
}

/**
 * Get all test cases for a specific language.
 */
export function getLanguageTestCases(language: PriorityLanguage): Record<CoreCommand, string> {
  const cases: Partial<Record<CoreCommand, string>> = {};
  for (const command of CORE_COMMANDS) {
    cases[command] = TEST_CASES[command][language];
  }
  return cases as Record<CoreCommand, string>;
}

/**
 * Get all test cases for a specific command.
 */
export function getCommandTestCases(command: CoreCommand): Record<PriorityLanguage, string> {
  return TEST_CASES[command];
}
