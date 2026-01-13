// packages/i18n/src/dictionaries/de.ts

import { Dictionary } from '../types';

export const de: Dictionary = {
  commands: {
    // Event handling
    on: 'bei',
    tell: 'sagen',
    trigger: 'auslösen',
    send: 'senden',

    // DOM manipulation
    take: 'nehmen',
    put: 'setzen',
    set: 'festlegen',
    get: 'erhalten',
    add: 'hinzufügen',
    remove: 'entfernen',
    toggle: 'umschalten',
    hide: 'verstecken',
    show: 'zeigen',

    // Control flow
    if: 'wenn',
    unless: 'wennnicht',
    repeat: 'wiederholen',
    for: 'für',
    while: 'während',
    until: 'bis',
    continue: 'weiter',
    break: 'unterbrechen',
    halt: 'anhalten',

    // Async
    wait: 'warten',
    fetch: 'holen',
    call: 'aufrufen',
    return: 'zurückgeben',

    // Other commands
    make: 'erstellen',
    log: 'protokollieren',
    throw: 'werfen',
    catch: 'fangen',
    measure: 'messen',
    transition: 'übergang',

    // Data Commands
    increment: 'erhöhen',
    decrement: 'verringern',
    bind: 'binden',
    default: 'standard',
    persist: 'speichern',

    // Navigation Commands
    go: 'gehen',
    pushUrl: 'urlHinzufügen',
    replaceUrl: 'urlErsetzen',

    // Utility Commands
    copy: 'kopieren',
    pick: 'auswählen',
    beep: 'piepton',

    // Advanced Commands
    js: 'js',
    async: 'asynchron',
    render: 'rendern',

    // Animation Commands
    swap: 'tauschen',
    morph: 'verwandeln',
    settle: 'stabilisieren',

    // Content Commands
    append: 'anhängen',

    // Control Flow
    exit: 'beenden',

    // Behaviors
    install: 'installieren',
  },

  modifiers: {
    to: 'zu',
    from: 'von',
    into: 'in',
    with: 'mit',
    at: 'bei',
    in: 'in',
    of: 'von',
    as: 'als',
    by: 'durch',
    before: 'vor',
    after: 'nach',
    over: 'über',
    under: 'unter',
    between: 'zwischen',
    through: 'durch',
    without: 'ohne',
  },

  events: {
    click: 'klick',
    dblclick: 'doppelklick',
    mousedown: 'mausunten',
    mouseup: 'mausoben',
    mouseenter: 'mauseintreten',
    mouseleave: 'mausverlassen',
    mouseover: 'mausüber',
    mouseout: 'maushinaus',
    mousemove: 'mausbewegen',

    keydown: 'tasteunten',
    keyup: 'tasteoben',
    keypress: 'tastedrücken',

    focus: 'fokus',
    blur: 'unscharf',
    change: 'ändern',
    input: 'eingabe',
    submit: 'absenden',
    reset: 'zurücksetzen',

    load: 'laden',
    unload: 'entladen',
    resize: 'größeändern',
    scroll: 'scrollen',

    touchstart: 'berührungstart',
    touchend: 'berührungend',
    touchmove: 'berührungbewegen',
    touchcancel: 'berührungabbrechen',
  },

  logical: {
    when: 'wenn',
    where: 'wo',
    and: 'und',
    or: 'oder',
    not: 'nicht',
    is: 'ist',
    exists: 'existiert',
    matches: 'passt',
    contains: 'enthält',
    includes: 'beinhaltet',
    equals: 'gleicht',
    then: 'dann',
    else: 'sonst',
    otherwise: 'andernfalls',
    end: 'ende',
  },

  temporal: {
    seconds: 'sekunden',
    second: 'sekunde',
    milliseconds: 'millisekunden',
    millisecond: 'millisekunde',
    minutes: 'minuten',
    minute: 'minute',
    hours: 'stunden',
    hour: 'stunde',
    ms: 'ms',
    s: 's',
    min: 'min',
    h: 'std',
  },

  values: {
    true: 'wahr',
    false: 'falsch',
    null: 'null',
    undefined: 'undefiniert',
    it: 'es',
    its: 'sein',
    me: 'ich',
    my: 'mein',
    you: 'du',
    your: 'dein',
    yourself: 'dich selbst', // REVIEW: native speaker
    myself: 'ich selbst',
    element: 'element',
    target: 'ziel',
    detail: 'detail',
    event: 'ereignis',
    window: 'fenster',
    document: 'dokument',
    body: 'körper',
    result: 'ergebnis',
    value: 'wert',
  },

  attributes: {
    class: 'klasse',
    classes: 'klassen',
    style: 'stil',
    styles: 'stile',
    attribute: 'attribut',
    attributes: 'attribute',
    property: 'eigenschaft',
    properties: 'eigenschaften',
  },

  expressions: {
    // Positional
    first: 'erste',
    last: 'letzte',
    next: 'nächste',
    previous: 'vorherige',
    prev: 'vorh',
    at: 'bei',
    random: 'zufällig',

    // DOM Traversal
    closest: 'nächste',
    parent: 'elternteil',
    children: 'kinder',
    within: 'innerhalb',

    // Emptiness/Existence
    no: 'kein',
    empty: 'leer',
    some: 'einige',

    // String operations
    'starts with': 'beginnt mit',
    'ends with': 'endet mit',
  },
};
