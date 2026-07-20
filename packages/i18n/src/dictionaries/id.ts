// Generated/merged from semantic profiles — hand-written entries are preserved
// To add derived entries, update the semantic profile and run: npm run generate:language-assets

import { Dictionary } from '../types';

export const id: Dictionary = {
  commands: {
    on: 'pada',
    tell: 'katakan',
    trigger: 'picu',
    send: 'kirim',
    take: 'ambil',
    put: 'taruh',
    set: 'atur',
    get: 'dapatkan',
    add: 'tambah',
    remove: 'hapus',
    toggle: 'alihkan',
    hide: 'sembunyikan',
    show: 'tampilkan',
    if: 'jika',
    unless: 'kecuali',
    repeat: 'ulangi',
    for: 'untuk',
    while: 'selama',
    until: 'sampai',
    continue: 'lanjutkan',
    break: 'hentikan',
    halt: 'berhenti',
    wait: 'tunggu',
    // profile primary; 'ambil' is take's word — emitting it for fetch made every
    // fetch parse as take once the fused take-event pattern came alive (the de
    // holen/abrufen bug class)
    fetch: 'muat',
    call: 'panggil',
    return: 'kembali',
    make: 'buat',
    log: 'catat',
    throw: 'lempar',
    catch: 'tangkap',
    measure: 'ukur',
    transition: 'transisi',
    // naikkan (raise), not tambahkan — tambahkan is the semantic profile's
    // `add` alternative, so emitting it made increment-counter parse as ADD
    // (the #373 collision family). naikkan is the profile's increment
    // alternative, pairing naturally with the decrement side.
    increment: 'naikkan',
    decrement: 'kurangi',
    default: 'bawaan',
    go: 'pergi',
    pushUrl: 'tambahUrl',
    replaceUrl: 'gantiUrl',
    copy: 'salin',
    pick: 'pilih',
    beep: 'bunyi',
    js: 'js',
    async: 'asinkron',
    render: 'olah', // auditor: dict emitted a word the profile reads differently
    swap: 'tukar',
    morph: 'ubah', // auditor: dict emitted a word the profile reads differently
    settle: 'stabilkan', // auditor: dict emitted a word the profile reads differently
    append: 'sisipkan', // profile primary; 'tambah_akhir' splits and is unrecognized
    exit: 'keluar',
    install: 'pasang',
    breakpoint: 'titik-henti',
    clear: 'bersihkan', // hapus is the remove PRIMARY in the profile
    close: 'tutupkan', // Batch 3: tutup is the hide keyword — rendered close parsed as action=hide
    open: 'buka',
    select: 'tandai', // Batch 3: pilih is the pick keyword — bare select rendered with it parses null
    clone: 'klon',
    prepend: 'awali',
  },

  modifiers: {
    to: 'ke',
    from: 'dari',
    into: 'ke_dalam',
    with: 'dengan',
    at: 'di',
    in: 'dalam',
    of: 'dari',
    as: 'sebagai',
    by: 'oleh',
    before: 'sebelum',
    after: 'setelah',
    over: 'di_atas',
    under: 'di_bawah',
    between: 'antara',
    through: 'melalui',
    without: 'tanpa',
  },

  events: {
    click: 'klik',
    dblclick: 'dblclick',
    // mousedown/mouseup: English passthrough — no native form round-trips on the
    // parse side (V3c probe 2026-07-14: fused forms captured verbatim, split forms
    // shattered to their first word — live broken listeners in repeat-until-event).
    // The Batch-2 id-keyup precedent; revisit if S5b + tokenizer gain native entries.
    mousedown: 'mousedown',
    mouseup: 'mouseup',
    mouseenter: 'mouseenter',
    mouseleave: 'mouseleave',
    // V3 Batch 2: mouse_atas/mouse_luar captured no event (the S5b forms
    // `mouse masuk`/`mouse keluar` are aspirational — they don't tokenize
    // either) — realigned to the tokenizer-registered natives. keydown keeps
    // tekan_tombol (captures keydown via the registered `tekan`; S5b-aliased).
    // keyup has NO parseable native (lepas is unregistered) → English
    // passthrough, matching the blur/reset precedent below.
    mouseover: 'arahkan',
    mouseout: 'tinggalkan',
    mousemove: 'mousemove',
    keydown: 'tekan_tombol',
    keyup: 'keyup',
    keypress: 'keypress',
    focus: 'fokus',
    blur: 'blur',
    change: 'ubah',
    input: 'masukan',
    submit: 'kirim',
    reset: 'reset',
    load: 'muat',
    unload: 'bongkar',
    resize: 'ubah_ukuran',
    scroll: 'gulir',
    touchstart: 'touchstart',
    touchend: 'touchend',
    touchmove: 'touchmove',
    // V3c burn-down (2026-07-14): English passthrough — no native form round-trips
    // on the parse side (probe: split forms shatter, fused forms capture verbatim).
    touchcancel: 'touchcancel',
  },

  logical: {
    when: 'ketika',
    where: 'di_mana',
    and: 'dan',
    or: 'atau',
    not: 'bukan',
    is: 'adalah',
    exists: 'ada',
    matches: 'cocok',
    contains: 'berisi',
    includes: 'termasuk',
    equals: 'sama',
    has: 'punya',
    have: 'punya',
    then: 'lalu',
    else: 'lainnya',
    otherwise: 'sebaliknya',
    end: 'akhir',
    live: 'langsung',
    changes: 'berubah',
  },

  temporal: {
    seconds: 'detik',
    second: 'detik',
    milliseconds: 'milidetik',
    millisecond: 'milidetik',
    minutes: 'menit',
    minute: 'menit',
    hours: 'jam',
    hour: 'jam',
    ms: 'ms',
    s: 'd',
    min: 'mnt',
    h: 'j',
  },

  values: {
    true: 'benar',
    false: 'salah',
    null: 'kosong',
    undefined: 'tidak_terdefinisi',
    it: 'itu',
    its: 'miliknya',
    me: 'saya',
    my: 'saya punya',
    myself: 'saya sendiri',
    you: 'kamu',
    your: 'kamu punya',
    yourself: 'kamu sendiri',
    element: 'elemen',
    target: 'target',
    detail: 'detail',
    event: 'peristiwa',
    window: 'jendela',
    document: 'dokumen',
    body: 'badan',
    result: 'hasil',
    value: 'nilai',
  },

  attributes: {
    class: 'kelas',
    classes: 'kelas_kelas',
    style: 'gaya',
    styles: 'gaya_gaya',
    attribute: 'atribut',
    attributes: 'atribut_atribut',
    property: 'properti',
    properties: 'properti_properti',
  },

  expressions: {
    characters: 'karakter',
    inclusive: 'inklusif',
    exclusive: 'eksklusif',
    first: 'pertama',
    last: 'terakhir',
    next: 'berikutnya',
    previous: 'sebelumnya',
    prev: 'sblm',
    at: 'di',
    random: 'acak',
    closest: 'terdekat',
    parent: 'induk',
    children: 'anak_anak',
    within: 'dalam',
    no: 'tidak_ada',
    empty: 'kosong',
    some: 'beberapa',
    'starts with': 'dimulai dengan',
    'ends with': 'diakhiri dengan',
    'ignoring case': 'abaikan kapital',
    'sorted by': 'diurutkan berdasarkan',
    'mapped to': 'dipetakan ke',
    'split by': 'dipisah oleh',
    'joined by': 'digabung oleh',
  },
};
