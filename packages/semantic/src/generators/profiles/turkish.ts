/**
 * Turkish Language Profile
 *
 * SOV word order, case suffixes (agglutinative), space-separated.
 * Features vowel harmony and extensive suffixation.
 */

import type { LanguageProfile } from './types';

export const turkishProfile: LanguageProfile = {
  code: 'tr',
  name: 'Turkish',
  nativeName: 'Türkçe',
  regions: ['priority'],
  direction: 'ltr',
  script: 'latin',
  wordOrder: 'SOV',
  markingStrategy: 'case-suffix',
  usesSpaces: true,
  // Colloquial Turkish frequently drops the accusative/case suffix
  // (`.active değiştir` for `.active i değiştir`). Accept both — the marked form
  // stays the higher-confidence match.
  markersOptional: true,
  verb: {
    position: 'end',
    suffixes: ['mek', 'mak', 'yor', 'di', 'miş'],
    subjectDrop: true,
  },
  references: {
    me: 'ben', // "I/me"
    it: 'o', // "it"
    you: 'sen', // "you"
    result: 'sonuç',
    event: 'olay',
    target: 'hedef',
    body: 'gövde',
  },
  possessive: {
    // Genitive suffix, spaced for tokenization like Turkish's other case
    // markers (i/e/de). i18n renders `#picker ın değer`; the parser matches
    // `ın` as the possessive marker. Vowel-harmony variants (in/un/ün) are not
    // distinguished — the generator emits the `ın` form for all owners.
    marker: 'ın',
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'benim', // "my" (genitive of "ben")
      it: 'onun', // "its"
      you: 'senin', // "your"
    },
    keywords: {
      benim: 'me', // my
      senin: 'you', // your
      onun: 'it', // its
    },
  },
  roleMarkers: {
    patient: {
      primary: 'i',
      alternatives: ['ı', 'u', 'ü', 'yi', 'yı', 'yu', 'yü', 'ni', 'nı', 'nu', 'nü'],
      position: 'after',
    }, // Accusative (with buffer consonants y/n)
    destination: {
      primary: 'e',
      // Include both dative (e/a) and genitive (ın/in/un/ün) for possessive patterns
      // Genitive is used in "X's Y" patterns: #button ın .active = "#button's .active"
      alternatives: [
        'a',
        'ye',
        'ya',
        'ne',
        'na',
        'de',
        'da',
        'te',
        'ta',
        'ın',
        'in',
        'un',
        'ün',
        'nın',
        'nin',
        'nun',
        'nün',
      ],
      position: 'after',
    }, // Dative/Locative + Genitive (with buffer consonants)
    source: { primary: 'den', alternatives: ['dan', 'ten', 'tan'], position: 'after' }, // Ablative
    // `ile` is the free-standing instrumental the transformer actually emits
    // for with-phrases (`getir method:"POST" body:form ile`); the suffix
    // forms cover hand-written agglutinated variants.
    style: { primary: 'le', alternatives: ['la', 'yle', 'yla', 'ile'], position: 'after' }, // Instrumental
    event: { primary: 'i', alternatives: ['ı', 'u', 'ü'], position: 'after' }, // Event as accusative
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: 'değiştir', alternatives: ['aç/kapat'], normalized: 'toggle' },
    add: { primary: 'ekle', normalized: 'add' },
    remove: { primary: 'kaldır', alternatives: ['sil'], normalized: 'remove' },
    // Content operations
    put: { primary: 'koy', normalized: 'put' },
    append: { primary: 'iliştir', normalized: 'append' },
    prepend: { primary: 'başınaekle', normalized: 'prepend' },
    take: { primary: 'tut', normalized: 'take' }, // al removed to avoid collision with get
    make: { primary: 'yap', normalized: 'make' },
    clone: { primary: 'klonla', normalized: 'clone' },
    swap: { primary: 'takas', normalized: 'swap' }, // Removed değiştir alternative to avoid collision with toggle
    morph: { primary: 'dönüştür', alternatives: ['şekil değiştir'], normalized: 'morph' },
    // Variable operations
    set: { primary: 'ayarla', alternatives: ['belirle'], normalized: 'set' },
    get: { primary: 'al', normalized: 'get' },
    increment: { primary: 'artır', normalized: 'increment' },
    decrement: { primary: 'azalt', normalized: 'decrement' },
    log: { primary: 'kaydet', normalized: 'log' },
    // Visibility
    show: { primary: 'göster', normalized: 'show' },
    hide: { primary: 'gizle', normalized: 'hide' },
    transition: { primary: 'geçiş', normalized: 'transition' },
    // Events
    on: { primary: 'üzerinde', alternatives: ['zaman'], normalized: 'on' },
    trigger: { primary: 'tetikle', normalized: 'trigger' },
    send: { primary: 'gönder', normalized: 'send' },
    // DOM focus
    focus: { primary: 'odak', alternatives: ['odaklanma'], normalized: 'focus' },
    blur: { primary: 'bulanık', alternatives: ['bulanıklık', 'bulanik'], normalized: 'blur' },
    // Phase 1 (v0.9.90): DOM / form state / debug
    empty: { primary: 'boşalt', alternatives: ['bosalt', 'boş'], normalized: 'empty' },
    open: { primary: 'aç', alternatives: ['ac'], normalized: 'open' },
    close: { primary: 'kapat', normalized: 'close' },
    select: { primary: 'vurgula', normalized: 'select' },
    clear: { primary: 'temizle', normalized: 'clear' },
    reset: { primary: 'sıfırla', alternatives: ['sifirla'], normalized: 'reset' },
    breakpoint: {
      primary: 'kesme-noktası',
      alternatives: ['kesme-noktasi'],
      normalized: 'breakpoint',
    },
    // Common event names (for event handler patterns)
    click: {
      primary: 'tıklama',
      alternatives: ['tıkla', 'tiklama', 'tık', 'tik'],
      normalized: 'click',
    },
    hover: { primary: 'üzerine gelme', alternatives: ['üzerinde gezinme'], normalized: 'hover' },
    submit: { primary: 'gönderme', normalized: 'submit' },
    input: { primary: 'giriş', alternatives: ['girdi', 'giris'], normalized: 'input' },
    change: { primary: 'değişiklik', alternatives: ['değişim', 'degisim'], normalized: 'change' },
    // `load` event: the i18n dict emits yükle for `load`. Without this keyword the
    // SOV reorder's mid-stream `yükle de` (on load) tokenized as the `install`
    // command (install's primary was also yükle) and the `on load` handler dropped
    // — `default-value` was degenerate in tr. install now keys off kur (the form
    // the dict already emits for install), freeing yükle for the load event.
    load: { primary: 'yükle', normalized: 'load' },
    // Navigation
    go: { primary: 'git', normalized: 'go' },
    scroll: { primary: 'kaydır', alternatives: ['kaydir'], normalized: 'scroll' },
    push: { primary: 'itele', alternatives: ['push'], normalized: 'push' },
    replace: { primary: 'değiştir_url', alternatives: ['degistir_url'], normalized: 'replace' },
    process: { primary: 'işle', alternatives: ['isle'], normalized: 'process' },
    // Async
    wait: { primary: 'bekle', normalized: 'wait' },
    fetch: { primary: 'getir', normalized: 'fetch' },
    settle: { primary: 'sabitlen', normalized: 'settle' },
    // Control flow
    if: { primary: 'eğer', normalized: 'if' },
    unless: { primary: 'değilse', normalized: 'unless' },
    when: { primary: 'iken', alternatives: ['durumunda', 'olduğunda'], normalized: 'when' },
    where: { primary: 'nerede', normalized: 'where' },
    else: { primary: 'yoksa', normalized: 'else' },
    repeat: { primary: 'tekrarla', normalized: 'repeat' },
    for: { primary: 'için', normalized: 'for' },
    while: { primary: 'süresince', normalized: 'while' },
    // `repeat forever` loop keyword — corpus word recognized so loopType types
    // as `:literal` like EN (the repeat.loopType R1 residue; see spanish.ts).
    forever: { primary: 'forever', normalized: 'forever' },
    continue: { primary: 'devam', normalized: 'continue' },
    halt: { primary: 'durdur', normalized: 'halt' },
    throw: { primary: 'fırlat', normalized: 'throw' },
    call: { primary: 'çağır', normalized: 'call' },
    return: { primary: 'dön', normalized: 'return' },
    then: { primary: 'ardından', alternatives: ['daha sonra', 'ardindan'], normalized: 'then' },
    and: { primary: 've', alternatives: ['ayrıca', 'hem de'], normalized: 'and' },
    or: { primary: 'veya', normalized: 'or' },
    not: { primary: 'değil', alternatives: ['degil'], normalized: 'not' },
    // Comparison operator (`target matches .x`). Without this keyword the surface
    // stays an identifier and leaks verbatim into the condition's raw expression,
    // which the core expression parser reads as English (modal-close-backdrop /
    // focus-trap drop their then-branch). Not an ActionType and has no command
    // schema, so no pattern is generated from it.
    matches: { primary: 'eşleşir', normalized: 'matches' },
    // Copula (`if result is false`, `if my value is empty`). Without the keyword the
    // surface stays an identifier and leaks verbatim into the condition's raw
    // expression, which the core expression parser reads as English. Neither an
    // ActionType nor a command schema, so no pattern is generated from it.
    is: { primary: 'dir', normalized: 'is' },
    end: { primary: 'son', alternatives: ['bitiş', 'bitti'], normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'asenkron', normalized: 'async' },
    tell: { primary: 'söyle', normalized: 'tell' },
    default: { primary: 'varsayılan', normalized: 'default' },
    init: { primary: 'başlat', normalized: 'init' },
    behavior: { primary: 'davranış', normalized: 'behavior' },
    // primary is kur (the form the i18n dict emits for install); yükle is reserved
    // for the load event (see the `load` keyword above). yüklemek stays as the
    // infinitive surface form.
    install: { primary: 'kur', alternatives: ['yüklemek'], normalized: 'install' },
    measure: { primary: 'ölç', normalized: 'measure' },
    beep: { primary: 'bip', normalized: 'beep' },
    break: { primary: 'dur', normalized: 'break' },
    copy: { primary: 'kopyala', normalized: 'copy' },
    exit: { primary: 'çık', normalized: 'exit' },
    pick: { primary: 'seç', normalized: 'pick' },
    render: { primary: 'render', normalized: 'render' },
    // Modifiers
    into: { primary: 'içine', normalized: 'into' },
    before: { primary: 'önce', normalized: 'before' },
    after: { primary: 'sonra', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'kadar', normalized: 'until' },
    event: { primary: 'olay', normalized: 'event' },
    from: { primary: 'den', alternatives: ['dan'], normalized: 'from' },
    // Phase 8 (htmx v4 localized attributes): attribute-suffix keywords
    // used by the vocab generator — `sse-bağlan`, `hx-canlı`, etc.
    // Turkish convention: imperative verb forms (matches `değiştir`, `ayarla`).
    connect: { primary: 'bağlan', alternatives: ['bağla', 'bağlantı'], normalized: 'connect' },
    stream: { primary: 'yayınla', alternatives: ['akıt', 'akış'], normalized: 'stream' },
    live: { primary: 'canlı', alternatives: ['gerçek-zamanlı'], normalized: 'live' },
    socket: { primary: 'soket', alternatives: ['websocket'], normalized: 'socket' },
    // Reactive / realtime commands
    // Turkish `bağla` means both bind and connect (collision), and
    // `ilişkilendir` is mangled by the agglutinative normalizer; keep the
    // English verb so it parses unambiguously as bind.
    bind: { primary: 'bind', normalized: 'bind' },
    intercept: {
      primary: 'yakala',
      alternatives: ['araya-gir', 'intercept'],
      normalized: 'intercept',
    },
    worker: { primary: 'işçi', alternatives: ['worker'], normalized: 'worker' },
    eventsource: {
      primary: 'eventsource',
      alternatives: ['olay-kaynağı'],
      normalized: 'eventsource',
    },
  },
  eventHandler: {
    // Event marker: da/de/ta/te (locative case suffix with vowel harmony), used in SOV pattern
    // Pattern: [event] da [patient] i [action]
    // Example: tıklama da .active i değiştir
    // Note: Vowel harmony variants (da/de/ta/te) should be handled by vowel harmony expansion
    eventMarker: { primary: 'da', alternatives: ['de', 'ta', 'te'], position: 'after' },
    temporalMarkers: ['dığında', 'diğinde'], // temporal converb suffixes (when)
  },
};
