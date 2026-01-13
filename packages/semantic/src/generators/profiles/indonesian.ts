/**
 * Indonesian Language Profile
 *
 * SVO word order, prepositions, space-separated, agglutinative.
 * Features affixation for verb derivation (me-, ber-, di-, -kan, -i).
 */

import type { LanguageProfile } from './types';

export const indonesianProfile: LanguageProfile = {
  code: 'id',
  name: 'Indonesian',
  nativeName: 'Bahasa Indonesia',
  direction: 'ltr',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  references: {
    me: 'saya', // "I/me"
    it: 'itu', // "it"
    you: 'anda', // "you"
    result: 'hasil',
    event: 'peristiwa',
    target: 'target',
    body: 'tubuh',
  },
  possessive: {
    marker: '', // Indonesian: "X saya" (X of mine), possessor follows noun
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'saya', // Possessor follows: "value saya" = "my value"
      it: 'nya', // Suffix: "valueny" = "its value"
      you: 'anda', // "value anda" = "your value"
    },
  },
  roleMarkers: {
    destination: { primary: 'pada', alternatives: ['ke', 'di'], position: 'before' },
    source: { primary: 'dari', position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'dengan', position: 'before' },
  },
  keywords: {
    toggle: { primary: 'alihkan', alternatives: ['ganti', 'tukar'], normalized: 'toggle' },
    add: { primary: 'tambah', alternatives: ['tambahkan'], normalized: 'add' },
    remove: { primary: 'hapus', alternatives: ['buang', 'hilangkan'], normalized: 'remove' },
    put: { primary: 'taruh', alternatives: ['letakkan', 'masukkan'], normalized: 'put' },
    append: { primary: 'sisipkan', normalized: 'append' },
    prepend: { primary: 'awali', normalized: 'prepend' },
    take: { primary: 'ambil', normalized: 'take' },
    make: { primary: 'buat', alternatives: ['bikin', 'ciptakan'], normalized: 'make' },
    clone: { primary: 'klon', alternatives: ['salin', 'tiru'], normalized: 'clone' },
    swap: { primary: 'tukar', alternatives: ['ganti'], normalized: 'swap' },
    morph: { primary: 'ubah', alternatives: ['transformasi'], normalized: 'morph' },
    set: { primary: 'atur', alternatives: ['tetapkan'], normalized: 'set' },
    get: { primary: 'dapatkan', alternatives: ['peroleh'], normalized: 'get' },
    increment: { primary: 'tingkatkan', alternatives: ['naikkan'], normalized: 'increment' },
    decrement: { primary: 'turunkan', alternatives: ['kurangi'], normalized: 'decrement' },
    log: { primary: 'catat', alternatives: ['rekam', 'cetak'], normalized: 'log' },
    show: { primary: 'tampilkan', alternatives: ['perlihatkan'], normalized: 'show' },
    hide: { primary: 'sembunyikan', alternatives: ['tutup'], normalized: 'hide' },
    transition: { primary: 'transisi', alternatives: ['animasikan'], normalized: 'transition' },
    on: { primary: 'pada', alternatives: ['saat', 'ketika'], normalized: 'on' },
    trigger: { primary: 'picu', alternatives: ['jalankan'], normalized: 'trigger' },
    send: { primary: 'kirim', alternatives: ['kirimkan'], normalized: 'send' },
    focus: { primary: 'fokus', alternatives: ['fokuskan'], normalized: 'focus' },
    blur: { primary: 'blur', normalized: 'blur' },
    go: { primary: 'pergi', alternatives: ['pindah', 'navigasi'], normalized: 'go' },
    wait: { primary: 'tunggu', normalized: 'wait' },
    fetch: { primary: 'ambil', alternatives: ['muat'], normalized: 'fetch' },
    settle: { primary: 'stabilkan', normalized: 'settle' },
    if: { primary: 'jika', alternatives: ['kalau', 'bila'], normalized: 'if' },
    when: { primary: 'ketika', normalized: 'when' },
    where: { primary: 'di_mana', normalized: 'where' },
    else: { primary: 'selainnya', normalized: 'else' },
    repeat: { primary: 'ulangi', normalized: 'repeat' },
    for: { primary: 'untuk', normalized: 'for' },
    while: { primary: 'selama', normalized: 'while' },
    continue: { primary: 'lanjutkan', alternatives: ['terus'], normalized: 'continue' },
    halt: { primary: 'hentikan', alternatives: ['berhenti'], normalized: 'halt' },
    throw: { primary: 'lempar', normalized: 'throw' },
    call: { primary: 'panggil', normalized: 'call' },
    return: { primary: 'kembalikan', alternatives: ['kembali'], normalized: 'return' },
    then: { primary: 'lalu', alternatives: ['kemudian', 'setelah itu'], normalized: 'then' },
    and: { primary: 'dan', alternatives: ['juga', 'serta'], normalized: 'and' },
    end: { primary: 'selesai', alternatives: ['akhir', 'tamat'], normalized: 'end' },
    js: { primary: 'js', alternatives: ['javascript'], normalized: 'js' },
    async: { primary: 'asinkron', normalized: 'async' },
    tell: { primary: 'katakan', alternatives: ['beritahu'], normalized: 'tell' },
    default: { primary: 'bawaan', normalized: 'default' },
    init: { primary: 'inisialisasi', alternatives: ['mulai'], normalized: 'init' },
    behavior: { primary: 'perilaku', normalized: 'behavior' },
    install: { primary: 'pasang', alternatives: ['instal'], normalized: 'install' },
    measure: { primary: 'ukur', normalized: 'measure' },
    into: { primary: 'ke dalam', normalized: 'into' },
    before: { primary: 'sebelum', normalized: 'before' },
    after: { primary: 'sesudah', alternatives: ['setelah'], normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'sampai', normalized: 'until' },
    event: { primary: 'peristiwa', alternatives: ['event'], normalized: 'event' },
    from: { primary: 'dari', normalized: 'from' },
  },
  eventHandler: {
    keyword: { primary: 'pada', alternatives: ['ketika', 'saat'] },
    sourceMarker: { primary: 'dari', position: 'before' },
    conditionalKeyword: { primary: 'ketika', alternatives: ['saat', 'waktu'] },
  },
};
