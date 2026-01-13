// packages/i18n/src/dictionaries/it.ts

import { Dictionary } from '../types';

export const it: Dictionary = {
  commands: {
    // Event handling
    on: 'su',
    tell: 'dire',
    trigger: 'scatenare',
    send: 'inviare',

    // DOM manipulation
    take: 'prendere',
    put: 'mettere',
    set: 'impostare',
    get: 'ottenere',
    add: 'aggiungere',
    remove: 'rimuovere',
    toggle: 'commutare',
    hide: 'nascondere',
    show: 'mostrare',

    // Control flow
    if: 'se',
    unless: 'a meno che',
    repeat: 'ripetere',
    for: 'per',
    while: 'mentre',
    until: 'fino',
    continue: 'continuare',
    break: 'interrompere',
    halt: 'fermare',

    // Async
    wait: 'aspettare',
    fetch: 'recuperare',
    call: 'chiamare',
    return: 'ritornare',

    // Other commands
    make: 'fare',
    log: 'registrare',
    throw: 'lanciare',
    catch: 'catturare',
    measure: 'misurare',
    transition: 'transizione',

    // Data Commands
    increment: 'incrementare',
    decrement: 'decrementare',
    bind: 'vincolare',
    default: 'predefinito',
    persist: 'persistere',

    // Navigation Commands
    go: 'andare',
    pushUrl: 'pushUrl',
    replaceUrl: 'sostituireUrl',

    // Utility Commands
    copy: 'copiare',
    pick: 'scegliere',
    beep: 'beep',

    // Advanced Commands
    js: 'js',
    async: 'asincrono',
    render: 'renderizzare',

    // Animation Commands
    swap: 'scambiare',
    morph: 'trasformare',
    settle: 'stabilizzare',

    // Content Commands
    append: 'aggiungere',

    // Control Flow
    exit: 'uscire',

    // Behaviors
    install: 'installare',
  },

  modifiers: {
    to: 'a',
    from: 'da',
    into: 'in',
    with: 'con',
    at: 'a',
    in: 'in',
    of: 'di',
    as: 'come',
    by: 'per',
    before: 'prima',
    after: 'dopo',
    over: 'sopra',
    under: 'sotto',
    between: 'tra',
    through: 'attraverso',
    without: 'senza',
  },

  events: {
    click: 'clic',
    dblclick: 'doppioclic',
    mousedown: 'mousegiù',
    mouseup: 'mousesu',
    mouseenter: 'mouseentra',
    mouseleave: 'mouseesce',
    mouseover: 'mousesopra',
    mouseout: 'mousefuori',
    mousemove: 'mousemuovi',

    keydown: 'tastogiù',
    keyup: 'tastosu',
    keypress: 'tastopremi',

    focus: 'fuoco',
    blur: 'sfuocatura',
    change: 'cambio',
    input: 'input',
    submit: 'invio',
    reset: 'reset',

    load: 'carica',
    unload: 'scarica',
    resize: 'ridimensiona',
    scroll: 'scorrimento',

    touchstart: 'toccoinizia',
    touchend: 'toccofine',
    touchmove: 'toccomuovi',
    touchcancel: 'toccoannulla',
  },

  logical: {
    when: 'quando',
    where: 'dove',
    and: 'e',
    or: 'o',
    not: 'non',
    is: 'è',
    exists: 'esiste',
    matches: 'corrisponde',
    contains: 'contiene',
    includes: 'include',
    equals: 'uguale',
    then: 'allora',
    else: 'altrimenti',
    otherwise: 'altrimenti',
    end: 'fine',
  },

  temporal: {
    seconds: 'secondi',
    second: 'secondo',
    milliseconds: 'millisecondi',
    millisecond: 'millisecondo',
    minutes: 'minuti',
    minute: 'minuto',
    hours: 'ore',
    hour: 'ora',
    ms: 'ms',
    s: 's',
    min: 'min',
    h: 'h',
  },

  values: {
    true: 'vero',
    false: 'falso',
    null: 'nullo',
    undefined: 'indefinito',
    it: 'esso',
    its: 'suo',
    me: 'io',
    my: 'mio',
    you: 'tu',
    your: 'tuo',
    yourself: 'te stesso',
    myself: 'me stesso',
    element: 'elemento',
    target: 'obiettivo',
    detail: 'dettaglio',
    event: 'evento',
    window: 'finestra',
    document: 'documento',
    body: 'corpo',
    result: 'risultato',
    value: 'valore',
  },

  attributes: {
    class: 'classe',
    classes: 'classi',
    style: 'stile',
    styles: 'stili',
    attribute: 'attributo',
    attributes: 'attributi',
    property: 'proprietà',
    properties: 'proprietà',
  },

  expressions: {
    // Positional
    first: 'primo',
    last: 'ultimo',
    next: 'prossimo',
    previous: 'precedente',
    prev: 'prec',
    at: 'a',
    random: 'casuale',

    // DOM Traversal
    closest: 'piùvicino',
    parent: 'genitore',
    children: 'figli',
    within: 'dentro',

    // Emptiness/Existence
    no: 'nessun',
    empty: 'vuoto',
    some: 'qualche',

    // String operations
    'starts with': 'inizia con',
    'ends with': 'finisce con',
  },
};
