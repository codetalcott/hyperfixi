// packages/i18n/src/dictionaries/tr.ts

import { Dictionary } from '../types';

export const tr: Dictionary = {
  commands: {
    // Event handling
    on: 'üzerinde',
    tell: 'söyle',
    trigger: 'tetikle',
    send: 'gönder',
    
    // DOM manipulation
    take: 'al',
    put: 'koy',
    set: 'ayarla',
    get: 'al',
    add: 'ekle',
    remove: 'kaldır',
    toggle: 'değiştir',
    hide: 'gizle',
    show: 'göster',
    
    // Control flow
    if: 'eğer',
    unless: 'değilse',
    repeat: 'tekrarla',
    for: 'için',
    while: 'iken',
    until: 'kadar',
    continue: 'devam',
    break: 'dur',
    halt: 'durdur',
    
    // Async
    wait: 'bekle',
    fetch: 'getir',
    call: 'çağır',
    return: 'dön',
    
    // Other commands
    make: 'yap',
    log: 'kaydet',
    throw: 'fırlat',
    catch: 'yakala',
    measure: 'ölç',
    transition: 'geçiş',

    // Data Commands
    increment: 'artır',
    decrement: 'azalt',
    bind: 'bağla',
    default: 'varsayılan',
    persist: 'kalıcı',

    // Navigation Commands
    go: 'git',
    pushUrl: 'urlEkle',
    replaceUrl: 'urlDeğiştir',

    // Utility Commands
    copy: 'kopyala',
    pick: 'seç',
    beep: 'bip',

    // Advanced Commands
    js: 'js',
    async: 'asenkron',
    render: 'render',

    // Animation Commands
    swap: 'takas',
    morph: 'dönüştür',
    settle: 'sabitlen',

    // Content Commands
    append: 'ekle',

    // Control Flow
    exit: 'çık',

    // Behaviors
    install: 'kur',
  },
  
  modifiers: {
    to: 'e',
    from: 'den',
    into: 'içine',
    with: 'ile',
    at: 'de',
    in: 'içinde',
    of: 'nin',
    as: 'olarak',
    by: 'tarafından',
    before: 'önce',
    after: 'sonra',
    over: 'üzerinde',
    under: 'altında',
    between: 'arasında',
    through: 'boyunca',
    without: 'olmadan',
  },
  
  events: {
    click: 'tıklama',
    dblclick: 'çift_tıklama',
    mousedown: 'fare_bas',
    mouseup: 'fare_bırak',
    mouseenter: 'fare_gir',
    mouseleave: 'fare_çık',
    mouseover: 'fare_üstü',
    mouseout: 'fare_dışı',
    mousemove: 'fare_hareket',
    
    keydown: 'tuş_bas',
    keyup: 'tuş_bırak',
    keypress: 'tuş_basım',
    
    focus: 'odak',
    blur: 'bulanık',
    change: 'değişim',
    input: 'giriş',
    submit: 'gönder',
    reset: 'sıfırla',
    
    load: 'yükle',
    unload: 'yükle_kaldır',
    resize: 'boyut_değiştir',
    scroll: 'kaydır',
    
    touchstart: 'dokunma_başla',
    touchend: 'dokunma_bitir',
    touchmove: 'dokunma_hareket',
    touchcancel: 'dokunma_iptal',
  },
  
  logical: {
    when: 'TODO',
    where: 'TODO',
    and: 've',
    or: 'veya',
    not: 'değil',
    is: 'dir',
    exists: 'var',
    matches: 'eşleşir',
    contains: 'içerir',
    includes: 'dahil',
    equals: 'eşittir',
    then: 'sonra',
    else: 'yoksa',
    otherwise: 'aksi_halde',
    end: 'son',
  },
  
  temporal: {
    seconds: 'saniye',
    second: 'saniye',
    milliseconds: 'milisaniye',
    millisecond: 'milisaniye',
    minutes: 'dakika',
    minute: 'dakika',
    hours: 'saat',
    hour: 'saat',
    ms: 'ms',
    s: 's',
    min: 'dk',
    h: 'sa',
  },
  
  values: {
    true: 'doğru',
    false: 'yanlış',
    null: 'boş',
    undefined: 'tanımsız',
    it: 'o',
    its: 'onun', // REVIEW: native speaker
    me: 'ben',
    my: 'benim',
    myself: 'kendim',
    you: 'sen', // REVIEW: native speaker - formal/informal
    your: 'senin', // REVIEW: native speaker - formal/informal
    yourself: 'kendin', // REVIEW: native speaker
    element: 'öğe',
    target: 'hedef',
    detail: 'detay',
    event: 'olay',
    window: 'pencere',
    document: 'belge',
    body: 'gövde',
    result: 'sonuç',
    value: 'değer',
  },
  
  attributes: {
    class: 'sınıf',
    classes: 'sınıflar',
    style: 'stil',
    styles: 'stiller',
    attribute: 'özellik',
    attributes: 'özellikler',
    property: 'özellik',
    properties: 'özellikler',
  },

  expressions: {
    // Positional
    first: 'ilk',
    last: 'son',
    next: 'sonraki',
    previous: 'önceki',
    prev: 'önc',
    at: 'de',
    random: 'rastgele',

    // DOM Traversal
    closest: 'en_yakın',
    parent: 'ebeveyn',
    children: 'çocuklar',
    within: 'içinde',

    // Emptiness/Existence
    no: 'yok',
    empty: 'boş',
    some: 'bazı',

    // String operations
    'starts with': 'ile başlar',
    'ends with': 'ile biter',
  },
};