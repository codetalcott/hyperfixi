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
  script: 'latin',
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
  possessive: {
    marker: '', // Malay often uses suffix or juxtaposition
    markerPosition: 'after-object',
    keywords: {
      // Full pronoun forms (also serve as possessives)
      saya: 'me', // my (formal)
      // The ms dict translates possessive-dot `my.X` as saya_punya.X (the
      // underscore keeps it one token for the dot-notation transformer) —
      // recognize that emitted form so the possessive matcher can assemble
      // the property-path (set-text/set-style corpus rows).
      saya_punya: 'me', // my (dict dot-notation emission)
      aku: 'me', // my (informal)
      awak: 'you', // your (informal, Malaysian)
      kamu: 'you', // your (informal)
      anda: 'you', // your (formal)
      dia: 'it', // his/her/its
      ia: 'it', // its
      // The ms dict renders the reference `it` (possessive `it.X`) as a
      // STANDALONE `nya` token — e.g. `it.error` → `nya.error`
      // (fetch-error-handling/-with-headers/-json rows). The suffix `-nya` key
      // below is a distinct lexeme (exact-match lookup), so it doesn't cover the
      // bare form. Recognize it so the possessive matcher assembles the
      // property-path, matching the en reference's `it.error:property-path`.
      nya: 'it', // "its" (standalone clitic, dot-notation possessor)
      // Suffix forms (attached to nouns)
      '-ku': 'me', // my (suffix)
      '-mu': 'you', // your (suffix)
      '-nya': 'it', // his/her/its (suffix)
    },
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
    clone: { primary: 'klon', alternatives: [], normalized: 'clone' },
    swap: { primary: 'tukar_tempat', normalized: 'swap' },
    morph: { primary: 'ubah_bentuk', normalized: 'morph' },
    // Variable operations
    set: { primary: 'tetapkan', alternatives: ['setkan'], normalized: 'set' },
    get: { primary: 'dapatkan', alternatives: [], normalized: 'get' },
    increment: { primary: 'tambah_satu', normalized: 'increment' },
    decrement: { primary: 'kurang_satu', normalized: 'decrement' },
    log: { primary: 'catat', alternatives: ['log'], normalized: 'log' },
    // Visibility
    show: { primary: 'tunjuk', alternatives: [], normalized: 'show' },
    hide: { primary: 'sembunyi', alternatives: ['sorok'], normalized: 'hide' },
    transition: { primary: 'peralihan', normalized: 'transition' },
    // Events
    on: { primary: 'apabila', alternatives: ['ketika'], normalized: 'on' },
    trigger: { primary: 'cetuskan', normalized: 'trigger' },
    send: { primary: 'hantar', normalized: 'send' },
    // DOM focus
    focus: { primary: 'fokus', normalized: 'focus' },
    blur: { primary: 'kabur', normalized: 'blur' },
    // Phase 1 (v0.9.90): DOM / form state / debug
    empty: { primary: 'kosongkan', alternatives: ['kosong'], normalized: 'empty' },
    open: { primary: 'buka', normalized: 'open' },
    close: { primary: 'tutup', normalized: 'close' },
    select: { primary: 'tandai', normalized: 'select' },
    clear: { primary: 'bersihkan', normalized: 'clear' },
    reset: { primary: 'set-semula', alternatives: ['reset'], normalized: 'reset' },
    breakpoint: { primary: 'titik-henti', normalized: 'breakpoint' },
    // Navigation
    go: { primary: 'pergi', alternatives: ['pindah'], normalized: 'go' },
    // The i18n ms dict keeps the `scroll` command in English (`scroll: 'scroll'`),
    // but the profile only knew `tatal`/`skrol`, so the generated scroll pattern
    // never matched the emitted `scroll ke …` and the command dropped
    // (last-in-collection ms, fid 0.5). List the English form too (cf. `push`).
    scroll: { primary: 'tatal', alternatives: ['skrol', 'scroll'], normalized: 'scroll' },
    push: { primary: 'tolak', alternatives: ['push'], normalized: 'push' },
    replace: { primary: 'ganti_url', alternatives: ['gantikan_url'], normalized: 'replace' },
    process: { primary: 'proses', normalized: 'process' },
    // Async
    wait: { primary: 'tunggu', normalized: 'wait' },
    fetch: { primary: 'ambil_dari', alternatives: ['muat'], normalized: 'fetch' },
    settle: { primary: 'selesai', normalized: 'settle' },
    // Control flow
    if: { primary: 'jika', alternatives: ['kalau'], normalized: 'if' },
    unless: { primary: 'kecuali', normalized: 'unless' },
    when: { primary: 'bila', normalized: 'when' },
    where: { primary: 'di_mana', normalized: 'where' },
    else: { primary: 'kalau_tidak', alternatives: ['jika_tidak'], normalized: 'else' },
    repeat: { primary: 'ulang', normalized: 'repeat' },
    for: { primary: 'untuk', normalized: 'for' },
    while: { primary: 'selagi', alternatives: ['semasa'], normalized: 'while' },
    // `repeat forever` loop keyword — corpus word recognized so loopType types
    // as `:literal` like EN (the repeat.loopType R1 residue; see spanish.ts).
    forever: { primary: 'selamanya', normalized: 'forever', alternatives: ['forever'] },
    continue: { primary: 'teruskan', normalized: 'continue' },
    halt: { primary: 'henti', alternatives: ['berhenti'], normalized: 'halt' },
    throw: { primary: 'lempar', normalized: 'throw' },
    call: { primary: 'panggil', normalized: 'call' },
    return: { primary: 'pulang', alternatives: ['kembali'], normalized: 'return' },
    then: { primary: 'kemudian', alternatives: ['lepas_itu'], normalized: 'then' },
    and: { primary: 'dan', normalized: 'and' },
    // Comparison operator (`target matches .x`). Without this keyword the surface
    // stays an identifier and leaks verbatim into the condition's raw expression,
    // which the core expression parser reads as English (modal-close-backdrop /
    // focus-trap drop their then-branch). Not an ActionType and has no command
    // schema, so no pattern is generated from it.
    matches: { primary: 'sepadan', normalized: 'matches' },
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
    beep: { primary: 'bunyi', normalized: 'beep' },
    break: { primary: 'pecah', normalized: 'break' },
    copy: { primary: 'salin', normalized: 'copy' },
    exit: { primary: 'keluar', normalized: 'exit' },
    pick: { primary: 'pilih', normalized: 'pick' },
    render: { primary: 'papar', normalized: 'render' },
    // Modifiers
    into: { primary: 'ke_dalam', normalized: 'into' },
    before: { primary: 'sebelum', normalized: 'before' },
    after: { primary: 'selepas', alternatives: ['lepas'], normalized: 'after' },
    // Event modifiers
    until: { primary: 'sehingga', alternatives: ['sampai'], normalized: 'until' },
    event: { primary: 'peristiwa', normalized: 'event' },
    from: { primary: 'dari', normalized: 'from' },
    // Phase 8 (htmx v4 localized attributes): attribute-suffix keywords
    // used by the vocab generator — `sse-sambung`, `hx-langsung`, etc.
    connect: { primary: 'sambung', alternatives: ['hubungkan'], normalized: 'connect' },
    stream: { primary: 'strim', alternatives: ['penstriman', 'aliran'], normalized: 'stream' },
    live: { primary: 'langsung', alternatives: ['siaran-langsung'], normalized: 'live' },
    socket: { primary: 'soket', alternatives: ['websocket'], normalized: 'socket' },
    // Reactive / realtime commands
    bind: { primary: 'ikat', alternatives: ['kaitkan', 'bind'], normalized: 'bind' },
    intercept: { primary: 'pintas', alternatives: ['cegat', 'intercept'], normalized: 'intercept' },
    worker: { primary: 'pekerja', alternatives: ['worker'], normalized: 'worker' },
    eventsource: {
      primary: 'eventsource',
      alternatives: ['sumber_peristiwa'],
      normalized: 'eventsource',
    },
  },
  eventHandler: {
    keyword: { primary: 'apabila', alternatives: ['ketika'], normalized: 'on' },
    sourceMarker: { primary: 'dari', position: 'before' },
    // Without an eventMarker ms generated NO fused event patterns at all —
    // the only language besides en in that state (the swap/if recovery split).
    eventMarker: { primary: 'apabila', alternatives: ['ketika'], position: 'before' },
  },
};
