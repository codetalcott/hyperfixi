/**
 * Malay Language Profile
 *
 * SVO word order, prepositions, space-separated.
 */

import type { LanguageProfile } from './types';

export const malayProfile: LanguageProfile = {
  code: 'ms',
  name: 'Malay',
  nativeName: 'Melayu',
  direction: 'ltr',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  defaultVerbForm: 'base',
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  references: {
    me: 'saya',
    it: 'ia',
    you: 'kamu',
    result: 'hasil',
    event: 'peristiwa',
    target: 'sasaran',
    body: 'badan',
  },
  roleMarkers: {
    destination: { primary: 'ke', alternatives: ['pada'], position: 'before' },
    source: { primary: 'dari', position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'dengan', position: 'before' },
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: 'togol', alternatives: ['tukar'], normalized: 'toggle' },
    add: { primary: 'tambah', normalized: 'add' },
    remove: { primary: 'buang', alternatives: ['padam'], normalized: 'remove' },
    // Content operations
    put: { primary: 'letak', alternatives: ['letakkan'], normalized: 'put' },
    append: { primary: 'tambah_hujung', normalized: 'append' },
    prepend: { primary: 'tambah_mula', normalized: 'prepend' },
    take: { primary: 'ambil', normalized: 'take' },
    make: { primary: 'buat', alternatives: ['cipta'], normalized: 'make' },
    clone: { primary: 'klon', alternatives: ['salin'], normalized: 'clone' },
    swap: { primary: 'tukar_tempat', normalized: 'swap' },
    morph: { primary: 'ubah_bentuk', normalized: 'morph' },
    // Variable operations
    set: { primary: 'tetapkan', alternatives: ['setkan'], normalized: 'set' },
    get: { primary: 'dapatkan', alternatives: ['ambil'], normalized: 'get' },
    increment: { primary: 'tambah_satu', normalized: 'increment' },
    decrement: { primary: 'kurang_satu', normalized: 'decrement' },
    log: { primary: 'catat', alternatives: ['log'], normalized: 'log' },
    // Visibility
    show: { primary: 'tunjuk', alternatives: ['papar'], normalized: 'show' },
    hide: { primary: 'sembunyi', alternatives: ['sorok'], normalized: 'hide' },
    transition: { primary: 'peralihan', normalized: 'transition' },
    // Events
    on: { primary: 'apabila', alternatives: ['bila', 'ketika'], normalized: 'on' },
    trigger: { primary: 'cetuskan', normalized: 'trigger' },
    send: { primary: 'hantar', normalized: 'send' },
    // DOM focus
    focus: { primary: 'fokus', normalized: 'focus' },
    blur: { primary: 'kabur', normalized: 'blur' },
    // Navigation
    go: { primary: 'pergi', alternatives: ['pindah'], normalized: 'go' },
    // Async
    wait: { primary: 'tunggu', normalized: 'wait' },
    fetch: { primary: 'ambil_dari', alternatives: ['muat'], normalized: 'fetch' },
    settle: { primary: 'selesai', normalized: 'settle' },
    // Control flow
    if: { primary: 'jika', alternatives: ['kalau'], normalized: 'if' },
    when: { primary: 'apabila', normalized: 'when' },
    where: { primary: 'di_mana', normalized: 'where' },
    else: { primary: 'kalau_tidak', alternatives: ['jika_tidak'], normalized: 'else' },
    repeat: { primary: 'ulang', normalized: 'repeat' },
    for: { primary: 'untuk', normalized: 'for' },
    while: { primary: 'selagi', alternatives: ['semasa'], normalized: 'while' },
    continue: { primary: 'teruskan', normalized: 'continue' },
    halt: { primary: 'henti', alternatives: ['berhenti'], normalized: 'halt' },
    throw: { primary: 'lempar', normalized: 'throw' },
    call: { primary: 'panggil', normalized: 'call' },
    return: { primary: 'pulang', alternatives: ['kembali'], normalized: 'return' },
    then: { primary: 'kemudian', alternatives: ['lepas_itu'], normalized: 'then' },
    and: { primary: 'dan', normalized: 'and' },
    end: { primary: 'tamat', alternatives: ['habis'], normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'tak_segerak', normalized: 'async' },
    tell: { primary: 'beritahu', normalized: 'tell' },
    default: { primary: 'lalai', normalized: 'default' },
    init: { primary: 'mula', alternatives: ['mulakan'], normalized: 'init' },
    behavior: { primary: 'kelakuan', normalized: 'behavior' },
    install: { primary: 'pasang', normalized: 'install' },
    measure: { primary: 'ukur', normalized: 'measure' },
    // Modifiers
    into: { primary: 'ke_dalam', normalized: 'into' },
    before: { primary: 'sebelum', normalized: 'before' },
    after: { primary: 'selepas', alternatives: ['lepas'], normalized: 'after' },
    // Event modifiers
    until: { primary: 'sehingga', alternatives: ['sampai'], normalized: 'until' },
    event: { primary: 'peristiwa', normalized: 'event' },
    from: { primary: 'dari', normalized: 'from' },
  },
  eventHandler: {
    keyword: { primary: 'apabila', alternatives: ['bila', 'ketika'], normalized: 'on' },
    sourceMarker: { primary: 'dari', position: 'before' },
  },
};
