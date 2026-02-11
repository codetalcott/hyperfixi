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
  direction: 'ltr',
  wordOrder: 'SOV',
  markingStrategy: 'case-suffix',
  usesSpaces: true,
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
    marker: '', // Turkish uses genitive suffix -in/-ın + possessive suffix
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
    style: { primary: 'le', alternatives: ['la', 'yle', 'yla'], position: 'after' }, // Instrumental
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
    blur: { primary: 'bulanık', alternatives: ['bulanıklık'], normalized: 'blur' },
    // Common event names (for event handler patterns)
    click: { primary: 'tıklama', alternatives: ['tıkla'], normalized: 'click' },
    hover: { primary: 'üzerine gelme', alternatives: ['üzerinde gezinme'], normalized: 'hover' },
    submit: { primary: 'gönderme', normalized: 'submit' },
    input: { primary: 'giriş', alternatives: ['girdi'], normalized: 'input' },
    change: { primary: 'değişiklik', alternatives: ['değişim'], normalized: 'change' },
    // Navigation
    go: { primary: 'git', normalized: 'go' },
    // Async
    wait: { primary: 'bekle', normalized: 'wait' },
    fetch: { primary: 'getir', normalized: 'fetch' },
    settle: { primary: 'sabitlen', normalized: 'settle' },
    // Control flow
    if: { primary: 'eğer', normalized: 'if' },
    when: { primary: 'iken', alternatives: ['durumunda', 'olduğunda'], normalized: 'when' },
    where: { primary: 'nerede', normalized: 'where' },
    else: { primary: 'yoksa', normalized: 'else' },
    repeat: { primary: 'tekrarla', normalized: 'repeat' },
    for: { primary: 'için', normalized: 'for' },
    while: { primary: 'süresince', normalized: 'while' },
    continue: { primary: 'devam', normalized: 'continue' },
    halt: { primary: 'durdur', normalized: 'halt' },
    throw: { primary: 'fırlat', normalized: 'throw' },
    call: { primary: 'çağır', normalized: 'call' },
    return: { primary: 'dön', normalized: 'return' },
    then: { primary: 'ardından', alternatives: ['daha sonra'], normalized: 'then' },
    and: { primary: 've', alternatives: ['ayrıca', 'hem de'], normalized: 'and' },
    end: { primary: 'son', alternatives: ['bitiş', 'bitti'], normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'asenkron', normalized: 'async' },
    tell: { primary: 'söyle', normalized: 'tell' },
    default: { primary: 'varsayılan', normalized: 'default' },
    init: { primary: 'başlat', normalized: 'init' },
    behavior: { primary: 'davranış', normalized: 'behavior' },
    install: { primary: 'yükle', alternatives: ['kur', 'yüklemek'], normalized: 'install' },
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
