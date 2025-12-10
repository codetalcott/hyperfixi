// packages/i18n/src/dictionaries/id.ts

import { Dictionary } from '../types';

export const id: Dictionary = {
  commands: {
    // Event handling
    on: 'pada',
    tell: 'katakan',
    trigger: 'picu',
    send: 'kirim',
    
    // DOM manipulation
    take: 'ambil',
    put: 'taruh',
    set: 'atur',
    get: 'dapatkan',
    add: 'tambah',
    remove: 'hapus',
    toggle: 'ganti',
    hide: 'sembunyikan',
    show: 'tampilkan',
    
    // Control flow
    if: 'jika',
    unless: 'kecuali',
    repeat: 'ulangi',
    for: 'untuk',
    while: 'selama',
    until: 'sampai',
    continue: 'lanjutkan',
    break: 'hentikan',
    halt: 'berhenti',
    
    // Async
    wait: 'tunggu',
    fetch: 'ambil',
    call: 'panggil',
    return: 'kembali',
    
    // Other commands
    make: 'buat',
    log: 'catat',
    throw: 'lempar',
    catch: 'tangkap',
    measure: 'ukur',
    transition: 'transisi',

    // Data Commands
    increment: 'tambahkan',
    decrement: 'kurangi',
    bind: 'ikat',
    default: 'bawaan',
    persist: 'simpan',

    // Navigation Commands
    go: 'pergi',
    pushUrl: 'tambahUrl',
    replaceUrl: 'gantiUrl',

    // Utility Commands
    copy: 'salin',
    pick: 'pilih',
    beep: 'bunyi',

    // Advanced Commands
    js: 'js',
    async: 'asinkron',
    render: 'tampilkan',

    // Animation Commands
    swap: 'tukar',
    morph: 'ubah_bentuk',
    settle: 'stabil',

    // Content Commands
    append: 'tambah_akhir',

    // Control Flow
    exit: 'keluar',

    // Behaviors
    install: 'pasang',
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
    dblclick: 'klik_ganda',
    mousedown: 'tekan_mouse',
    mouseup: 'lepas_mouse',
    mouseenter: 'mouse_masuk',
    mouseleave: 'mouse_keluar',
    mouseover: 'mouse_atas',
    mouseout: 'mouse_luar',
    mousemove: 'gerak_mouse',
    
    keydown: 'tekan_tombol',
    keyup: 'lepas_tombol',
    keypress: 'pencet_tombol',
    
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
    
    touchstart: 'mulai_sentuh',
    touchend: 'akhir_sentuh',
    touchmove: 'gerak_sentuh',
    touchcancel: 'batal_sentuh',
  },
  
  logical: {
    and: 'dan',
    or: 'atau',
    not: 'bukan',
    is: 'adalah',
    exists: 'ada',
    matches: 'cocok',
    contains: 'berisi',
    includes: 'termasuk',
    equals: 'sama',
    then: 'lalu',
    else: 'lainnya',
    otherwise: 'sebaliknya',
    end: 'akhir',
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
    me: 'saya',
    my: 'saya_punya',
    myself: 'saya_sendiri',
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
    // Positional
    first: 'pertama',
    last: 'terakhir',
    next: 'berikutnya',
    previous: 'sebelumnya',
    prev: 'sblm',
    at: 'di',
    random: 'acak',

    // DOM Traversal
    closest: 'terdekat',
    parent: 'induk',
    children: 'anak_anak',
    within: 'dalam',

    // Emptiness/Existence
    no: 'tidak_ada',
    empty: 'kosong',
    some: 'beberapa',

    // String operations
    'starts with': 'dimulai dengan',
    'ends with': 'diakhiri dengan',
  },
};