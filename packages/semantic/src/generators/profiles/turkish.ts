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
    me: 'ben',       // "I/me"
    it: 'o',         // "it"
    you: 'sen',      // "you"
    result: 'sonuç',
    event: 'olay',
    target: 'hedef',
    body: 'gövde',
  },
  possessive: {
    marker: '',      // Turkish uses genitive suffix -in/-ın + possessive suffix
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'benim',   // "my" (genitive of "ben")
      it: 'onun',    // "its"
      you: 'senin',  // "your"
    },
  },
  roleMarkers: {
    patient: { primary: 'i', alternatives: ['ı', 'u', 'ü'], position: 'after' }, // Accusative
    destination: { primary: 'e', alternatives: ['a', 'de', 'da', 'te', 'ta'], position: 'after' }, // Dative/Locative
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
    append: { primary: 'ekle', normalized: 'append' },
    take: { primary: 'al', normalized: 'take' },
    make: { primary: 'yap', normalized: 'make' },
    clone: { primary: 'kopyala', normalized: 'clone' },
    swap: { primary: 'değiştir', alternatives: ['takas'], normalized: 'swap' },
    morph: { primary: 'dönüştür', alternatives: ['şekil değiştir'], normalized: 'morph' },
    // Variable operations
    set: { primary: 'ayarla', alternatives: ['yap', 'belirle'], normalized: 'set' },
    get: { primary: 'al', normalized: 'get' },
    increment: { primary: 'artır', normalized: 'increment' },
    decrement: { primary: 'azalt', normalized: 'decrement' },
    log: { primary: 'kaydet', normalized: 'log' },
    // Visibility
    show: { primary: 'göster', normalized: 'show' },
    hide: { primary: 'gizle', normalized: 'hide' },
    transition: { primary: 'geçiş', normalized: 'transition' },
    // Events
    on: { primary: 'üzerinde', alternatives: ['olduğunda', 'zaman'], normalized: 'on' },
    trigger: { primary: 'tetikle', normalized: 'trigger' },
    send: { primary: 'gönder', normalized: 'send' },
    // DOM focus
    focus: { primary: 'odak', normalized: 'focus' },
    blur: { primary: 'bulanık', normalized: 'blur' },
    // Navigation
    go: { primary: 'git', normalized: 'go' },
    // Async
    wait: { primary: 'bekle', normalized: 'wait' },
    fetch: { primary: 'getir', normalized: 'fetch' },
    settle: { primary: 'sabitlen', normalized: 'settle' },
    // Control flow
    if: { primary: 'eğer', normalized: 'if' },
    else: { primary: 'yoksa', normalized: 'else' },
    repeat: { primary: 'tekrarla', normalized: 'repeat' },
    for: { primary: 'için', normalized: 'for' },
    while: { primary: 'iken', normalized: 'while' },
    continue: { primary: 'devam', normalized: 'continue' },
    halt: { primary: 'durdur', normalized: 'halt' },
    throw: { primary: 'fırlat', normalized: 'throw' },
    call: { primary: 'çağır', normalized: 'call' },
    return: { primary: 'dön', normalized: 'return' },
    then: { primary: 'sonra', alternatives: ['ardından', 'daha sonra'], normalized: 'then' },
    and: { primary: 've', alternatives: ['ayrıca', 'hem de'], normalized: 'and' },
    end: { primary: 'son', alternatives: ['bitiş', 'bitti'], normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'asenkron', normalized: 'async' },
    tell: { primary: 'söyle', normalized: 'tell' },
    default: { primary: 'varsayılan', normalized: 'default' },
    init: { primary: 'başlat', normalized: 'init' },
    behavior: { primary: 'davranış', normalized: 'behavior' },
    install: { primary: 'yükle', normalized: 'install' },
    measure: { primary: 'ölç', normalized: 'measure' },
    // Modifiers
    into: { primary: 'içine', normalized: 'into' },
    before: { primary: 'önce', normalized: 'before' },
    after: { primary: 'sonra', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'kadar', normalized: 'until' },
    event: { primary: 'olay', normalized: 'event' },
    from: { primary: '-den', alternatives: ['-dan'], normalized: 'from' },
  },
};
