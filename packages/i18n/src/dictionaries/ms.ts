/**
 * Malay Dictionary
 *
 * Malay translations for hyperscript keywords.
 * Malay is an SVO (Subject-Verb-Object) language with prepositions.
 */

import { Dictionary } from '../types';

export const malayDictionary: Dictionary = {
  commands: {
    // Event handling
    on: 'apabila',
    tell: 'beritahu',
    trigger: 'cetuskan',
    send: 'hantar',

    // DOM manipulation
    take: 'ambil',
    put: 'letak',
    set: 'tetapkan',
    get: 'dapatkan',
    add: 'tambah',
    remove: 'buang',
    toggle: 'togol',
    hide: 'sembunyi',
    show: 'tunjuk',

    // Control flow
    if: 'jika',
    unless: 'kecuali',
    repeat: 'ulang',
    for: 'untuk',
    while: 'selagi',
    until: 'sehingga',
    continue: 'teruskan',
    break: 'henti',
    halt: 'henti',

    // Async
    wait: 'tunggu',
    fetch: 'ambil_dari',
    call: 'panggil',
    return: 'pulang',

    // Other commands
    make: 'buat',
    log: 'catat',
    throw: 'lempar',
    catch: 'tangkap',
    measure: 'ukur',
    transition: 'peralihan',

    // Data Commands
    increment: 'tambah_satu',
    decrement: 'kurang_satu',
    bind: 'ikat',
    default: 'lalai',
    persist: 'kekal',

    // Navigation Commands
    go: 'pergi',
    pushUrl: 'tolak_url',
    replaceUrl: 'ganti_url',

    // Utility Commands
    copy: 'salin',
    pick: 'pilih',
    beep: 'bunyi',

    // Advanced Commands
    js: 'js',
    async: 'tak_segerak',
    render: 'papar',

    // Animation Commands
    swap: 'tukar_tempat',
    morph: 'ubah_bentuk',
    settle: 'selesai',

    // Content Commands
    append: 'tambah_hujung',
    prepend: 'tambah_mula',

    // Control Flow
    exit: 'keluar',
    else: 'kalau_tidak',

    // Focus Commands
    focus: 'fokus',
    blur: 'kabur',

    // Behaviors
    install: 'pasang',
    behavior: 'kelakuan',
    init: 'mula',
    clone: 'klon',
  },

  modifiers: {
    to: 'ke',
    from: 'dari',
    into: 'ke_dalam',
    with: 'dengan',
    at: 'di',
    in: 'dalam',
    of: 'daripada',
    as: 'sebagai',
    by: 'oleh',
    before: 'sebelum',
    after: 'selepas',
    over: 'atas',
    under: 'bawah',
    between: 'antara',
    through: 'melalui',
    without: 'tanpa',
    on: 'pada',
    then: 'kemudian',
    and: 'dan',
    end: 'tamat',
    until: 'sehingga',
  },

  events: {
    click: 'click',
    dblclick: 'dblclick',
    mousedown: 'mousedown',
    mouseup: 'mouseup',
    mouseenter: 'mouseenter',
    mouseleave: 'mouseleave',
    mouseover: 'mouseover',
    mouseout: 'mouseout',
    mousemove: 'mousemove',

    keydown: 'keydown',
    keyup: 'keyup',
    keypress: 'keypress',

    focus: 'focus',
    blur: 'blur',
    change: 'change',
    input: 'input',
    submit: 'submit',
    reset: 'reset',

    load: 'load',
    unload: 'unload',
    resize: 'resize',
    scroll: 'scroll',

    touchstart: 'touchstart',
    touchend: 'touchend',
    touchmove: 'touchmove',
    touchcancel: 'touchcancel',

    every: 'setiap',
  },

  logical: {
    when: 'apabila',
    where: 'di_mana',
    and: 'dan',
    or: 'atau',
    not: 'bukan',
    is: 'adalah',
    exists: 'wujud',
    matches: 'sepadan',
    contains: 'mengandungi',
    includes: 'termasuk',
    equals: 'sama',
    then: 'kemudian',
    else: 'kalau_tidak',
    otherwise: 'jika_tidak',
    end: 'tamat',
    if: 'jika',
    empty: 'kosong',
    true: 'benar',
    false: 'salah',
    null: 'null',
    undefined: 'tidak_ditakrifkan',
  },

  temporal: {
    seconds: 'saat',
    second: 'saat',
    milliseconds: 'milisaat',
    millisecond: 'milisaat',
    minutes: 'minit',
    minute: 'minit',
    hours: 'jam',
    hour: 'jam',
    ms: 'ms',
    s: 's',
    min: 'min',
    h: 'j',
    now: 'sekarang',
    forever: 'selamanya',
    times: 'kali',
  },

  values: {
    true: 'benar',
    false: 'salah',
    null: 'null',
    undefined: 'tidak_ditakrifkan',
    it: 'ia',
    its: 'nya',
    me: 'saya',
    my: 'saya_punya',
    myself: 'diri_saya',
    you: 'kamu',
    your: 'kamu_punya',
    yourself: 'diri_kamu',
    element: 'elemen',
    target: 'sasaran',
    detail: 'perincian',
    event: 'peristiwa',
    window: 'tetingkap',
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
    property: 'sifat',
    properties: 'sifat_sifat',
    id: 'id',
    value: 'nilai',
    text: 'teks',
    html: 'html',
    disabled: 'dilumpuhkan',
    checked: 'ditanda',
  },

  expressions: {
    // Positional
    first: 'pertama',
    last: 'terakhir',
    next: 'seterusnya',
    previous: 'sebelumnya',
    prev: 'sebelum',
    at: 'di',
    random: 'rawak',

    // DOM Traversal
    closest: 'terdekat',
    parent: 'induk',
    children: 'anak_anak',
    within: 'dalam',

    // Emptiness/Existence
    no: 'tiada',
    empty: 'kosong',
    some: 'beberapa',

    // String operations
    'starts with': 'bermula_dengan',
    'ends with': 'berakhir_dengan',

    // Additional
    length: 'panjang',
    index: 'indeks',
  },
};

// Default export alias
export const ms = malayDictionary;
