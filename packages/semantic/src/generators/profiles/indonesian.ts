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
  regions: ['priority'],
  direction: 'ltr',
  script: 'latin',
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
    body: 'badan', // matches the i18n dict's emitted body word (corpus-canonical; tubuh = anatomical body)
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
    keywords: {
      // "my" - formal and informal
      saya: 'me', // formal
      aku: 'me', // informal
      ku: 'me', // clitic
      // The id dict's `my` is the two-word 'saya punya', which the dot-notation
      // transformer can't prefix onto `my.X` — those corpus heads stay literal
      // English `my.textContent`. Recognize the passthrough so the possessive
      // matcher can assemble the property-path (set-text/set-style rows).
      my: 'me', // untranslated dot-notation passthrough
      // "your" - formal and informal
      anda: 'you', // formal
      kamu: 'you', // informal
      mu: 'you', // clitic
      // "its/his/her"
      nya: 'it', // third person clitic (suffix form: -nya)
      dia: 'it', // third person pronoun
      // The id dict renders the reference `it` (possessive `it.X`) as the
      // standalone possessive pronoun `miliknya` ("belonging to it") — e.g.
      // `it.error` → `miliknya.error` (fetch-error-handling/-with-headers/-json
      // rows). Recognize it so the possessive matcher assembles the
      // property-path, matching the en reference's `it.error:property-path`.
      miliknya: 'it', // "its" (milik + -nya, standalone possessive)
    },
    // `saya punya *background` = "I have *background" = "my *background". The
    // i18n dict's `my` is the two-word `saya punya`; `punya` ("have/own") is a
    // connector between the possessor (saya→me) and the property. Skipped by the
    // possessive matcher so the property is reached (set-style set-text rows).
    connectors: ['punya'],
  },
  roleMarkers: {
    destination: { primary: 'pada', alternatives: ['ke', 'di'], position: 'before' },
    source: { primary: 'dari', position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'dengan', position: 'before' },
  },
  keywords: {
    toggle: { primary: 'alihkan', normalized: 'toggle' },
    add: { primary: 'tambah', alternatives: ['tambahkan'], normalized: 'add' },
    remove: { primary: 'hapus', alternatives: ['buang', 'hilangkan'], normalized: 'remove' },
    put: { primary: 'taruh', alternatives: ['letakkan', 'masukkan'], normalized: 'put' },
    append: { primary: 'sisipkan', normalized: 'append' },
    prepend: { primary: 'awali', normalized: 'prepend' },
    take: { primary: 'ambil', normalized: 'take' },
    make: { primary: 'buat', alternatives: ['bikin', 'ciptakan'], normalized: 'make' },
    clone: { primary: 'klon', alternatives: ['tiru'], normalized: 'clone' },
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
    on: { primary: 'pada', alternatives: ['saat'], normalized: 'on' },
    trigger: { primary: 'picu', alternatives: ['jalankan'], normalized: 'trigger' },
    send: { primary: 'kirim', alternatives: ['kirimkan'], normalized: 'send' },
    focus: { primary: 'fokus', alternatives: ['fokuskan'], normalized: 'focus' },
    blur: { primary: 'blur', normalized: 'blur' },
    // Phase 1 (v0.9.90): DOM / form state / debug
    empty: { primary: 'kosongkan', alternatives: ['kosong'], normalized: 'empty' },
    open: { primary: 'buka', normalized: 'open' },
    close: { primary: 'tutupkan', normalized: 'close' },
    select: { primary: 'tandai', normalized: 'select' },
    clear: { primary: 'bersihkan', normalized: 'clear' },
    reset: { primary: 'setel-ulang', alternatives: ['reset'], normalized: 'reset' },
    breakpoint: { primary: 'titik-henti', normalized: 'breakpoint' },
    go: { primary: 'pergi', alternatives: ['pindah', 'navigasi'], normalized: 'go' },
    scroll: { primary: 'gulir', alternatives: ['gulung'], normalized: 'scroll' },
    push: { primary: 'dorong', alternatives: ['push'], normalized: 'push' },
    replace: { primary: 'ganti_url', alternatives: ['gantikan_url'], normalized: 'replace' },
    process: { primary: 'proses', normalized: 'process' },
    wait: { primary: 'tunggu', normalized: 'wait' },
    fetch: { primary: 'muat', normalized: 'fetch' },
    settle: { primary: 'stabilkan', normalized: 'settle' },
    if: { primary: 'jika', alternatives: ['kalau', 'bila'], normalized: 'if' },
    unless: { primary: 'kecuali', normalized: 'unless' },
    when: { primary: 'ketika', normalized: 'when' },
    where: { primary: 'di_mana', normalized: 'where' },
    else: { primary: 'selainnya', alternatives: ['lainnya'], normalized: 'else' }, // lainnya = the i18n dict's emitted else word (corpus-canonical)
    repeat: { primary: 'ulangi', normalized: 'repeat' },
    for: { primary: 'untuk', normalized: 'for' },
    while: { primary: 'selama', normalized: 'while' },
    // `repeat forever` loop keyword — corpus word recognized so loopType types
    // as `:literal` like EN (the repeat.loopType R1 residue; see spanish.ts).
    forever: { primary: 'forever', normalized: 'forever' },
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
    beep: { primary: 'bunyi', normalized: 'beep' },
    break: { primary: 'putuskan', normalized: 'break' },
    copy: { primary: 'salin', normalized: 'copy' },
    exit: { primary: 'keluar', normalized: 'exit' },
    pick: { primary: 'pilih', normalized: 'pick' },
    render: { primary: 'olah', normalized: 'render' },
    into: { primary: 'ke dalam', normalized: 'into' },
    before: { primary: 'sebelum', normalized: 'before' },
    after: { primary: 'sesudah', alternatives: ['setelah'], normalized: 'after' },
    // Common event names (for event handler patterns)
    click: { primary: 'klik', alternatives: ['tekan'], normalized: 'click' },
    hover: { primary: 'hover', alternatives: ['arahkan'], normalized: 'hover' },
    submit: { primary: 'ajukan', normalized: 'submit' },
    // i18n dict emits `masukan` for `input` (profile primary is `masuk`); recognize it.
    input: { primary: 'masuk', alternatives: ['input', 'masukan'], normalized: 'input' },
    change: { primary: 'berubah', normalized: 'change' },
    // Event modifiers (for repeat until event)
    until: { primary: 'sampai', normalized: 'until' },
    event: { primary: 'peristiwa', alternatives: ['event'], normalized: 'event' },
    from: { primary: 'dari', normalized: 'from' },
    // Phase 8 (htmx v4 localized attributes): attribute-suffix keywords
    // used by the vocab generator — `sse-sambungkan`, `hx-langsung`, etc.
    connect: {
      primary: 'sambungkan',
      alternatives: ['hubungkan', 'koneksi'],
      normalized: 'connect',
    },
    stream: { primary: 'alirkan', alternatives: ['streaming'], normalized: 'stream' },
    live: { primary: 'langsung', alternatives: ['live'], normalized: 'live' },
    socket: { primary: 'soket', alternatives: ['socket', 'websocket'], normalized: 'socket' },
    // Reactive / realtime commands
    bind: { primary: 'ikat', alternatives: ['kaitkan', 'bind'], normalized: 'bind' },
    intercept: {
      primary: 'cegat',
      alternatives: ['tangkap', 'intercept'],
      normalized: 'intercept',
    },
    worker: { primary: 'pekerja', alternatives: ['worker'], normalized: 'worker' },
    eventsource: {
      primary: 'eventsource',
      alternatives: ['sumber peristiwa'],
      normalized: 'eventsource',
    },
  },
  eventHandler: {
    keyword: { primary: 'pada', alternatives: ['ketika', 'saat'], normalized: 'on' },
    sourceMarker: { primary: 'dari', position: 'before' },
    conditionalKeyword: { primary: 'ketika', alternatives: ['saat', 'waktu'] },
    // Event marker: saat (when), used in SVO pattern
    // Pattern: saat [event] [verb] [patient] pada [destination?]
    // Example: saat klik alihkan .active pada #button
    // + the eventHandler.keyword word the i18n transformer actually emits —
    // without it every generated fused `<cmd>-event-*-vso` pattern was dead
    // (the swap/if recovery split, #346/#351)
    eventMarker: { primary: 'saat', alternatives: ['ketika', 'pada'], position: 'before' },
    temporalMarkers: ['ketika', 'saat'], // temporal conjunctions (when)
  },
};
