// packages/i18n/src/dictionaries/pl.ts

import { Dictionary } from '../types';

/**
 * Polish Dictionary
 *
 * Polish uses IMPERATIVE verb forms for software commands
 * (unlike most languages which use infinitive).
 */
export const pl: Dictionary = {
  commands: {
    // Event handling
    on: 'gdy',
    tell: 'powiedz',
    trigger: 'wywołaj',
    send: 'wyślij',

    // DOM manipulation
    take: 'weź',
    put: 'umieść',
    set: 'ustaw',
    get: 'pobierz',
    add: 'dodaj',
    remove: 'usuń',
    toggle: 'przełącz',
    hide: 'ukryj',
    show: 'pokaż',

    // Control flow
    if: 'jeśli',
    unless: 'chyba',
    repeat: 'powtórz',
    for: 'dla',
    while: 'dopóki',
    until: 'aż',
    continue: 'kontynuuj',
    break: 'przerwij',
    halt: 'zatrzymaj',

    // Async
    wait: 'czekaj',
    fetch: 'pobierz',
    call: 'wywołaj',
    return: 'zwróć',

    // Other commands
    make: 'utwórz',
    log: 'loguj',
    throw: 'rzuć',
    catch: 'złap',
    measure: 'zmierz',
    transition: 'animuj',

    // Data Commands
    increment: 'zwiększ',
    decrement: 'zmniejsz',
    bind: 'powiąż',
    default: 'domyślnie',
    persist: 'zachowaj',

    // Navigation Commands
    go: 'idź',
    pushUrl: 'dodajUrl',
    replaceUrl: 'zamieńUrl',

    // Utility Commands
    copy: 'kopiuj',
    pick: 'wybierz',
    beep: 'sygnał',

    // Advanced Commands
    js: 'js',
    async: 'async',
    render: 'renderuj',

    // Animation Commands
    swap: 'zamień',
    morph: 'przekształć',
    settle: 'ustabilizuj',

    // Content Commands
    append: 'dołącz',

    // Control Flow
    exit: 'wyjdź',

    // Behaviors
    install: 'zainstaluj',
  },

  modifiers: {
    to: 'do',
    from: 'z',
    into: 'do',
    with: 'z',
    at: 'przy',
    in: 'w',
    of: 'z',
    as: 'jako',
    by: 'przez',
    before: 'przed',
    after: 'po',
    over: 'nad',
    under: 'pod',
    between: 'między',
    through: 'przez',
    without: 'bez',
  },

  events: {
    click: 'kliknięcie',
    dblclick: 'podwójnekliknięcie',
    mousedown: 'myszdół',
    mouseup: 'myszgóra',
    mouseenter: 'myszwejście',
    mouseleave: 'myszwyjście',
    mouseover: 'mysznad',
    mouseout: 'myszpoza',
    mousemove: 'myszruch',

    keydown: 'klawiszdół',
    keyup: 'klawiszgóra',
    keypress: 'klawisznaciśnięcie',

    focus: 'fokus',
    blur: 'rozmycie',
    change: 'zmiana',
    input: 'wejście',
    submit: 'wyślij',
    reset: 'resetuj',

    load: 'załaduj',
    unload: 'wyładuj',
    resize: 'zmieńrozmiar',
    scroll: 'przewiń',

    touchstart: 'dotykstart',
    touchend: 'dotykkoniec',
    touchmove: 'dotykruch',
    touchcancel: 'dotykanuluj',
  },

  logical: {
    when: 'kiedy',
    where: 'gdzie',
    and: 'i',
    or: 'lub',
    not: 'nie',
    is: 'jest',
    exists: 'istnieje',
    matches: 'pasuje',
    contains: 'zawiera',
    includes: 'obejmuje',
    equals: 'równa się',
    then: 'wtedy',
    else: 'inaczej',
    otherwise: 'wpp',
    end: 'koniec',
  },

  temporal: {
    seconds: 'sekundy',
    second: 'sekunda',
    milliseconds: 'milisekundy',
    millisecond: 'milisekunda',
    minutes: 'minuty',
    minute: 'minuta',
    hours: 'godziny',
    hour: 'godzina',
    ms: 'ms',
    s: 's',
    min: 'min',
    h: 'godz',
  },

  values: {
    true: 'prawda',
    false: 'fałsz',
    null: 'null',
    undefined: 'niezdefiniowane',
    it: 'to',
    its: 'jego',
    me: 'ja',
    my: 'mój',
    you: 'ty',
    your: 'twój',
    yourself: 'ty sam',
    myself: 'ja sam',
    element: 'element',
    target: 'cel',
    detail: 'szczegół',
    event: 'zdarzenie',
    window: 'okno',
    document: 'dokument',
    body: 'body',
    result: 'wynik',
    value: 'wartość',
  },

  attributes: {
    class: 'klasa',
    classes: 'klasy',
    style: 'styl',
    styles: 'style',
    attribute: 'atrybut',
    attributes: 'atrybuty',
    property: 'właściwość',
    properties: 'właściwości',
  },

  expressions: {
    // Positional
    first: 'pierwszy',
    last: 'ostatni',
    next: 'następny',
    previous: 'poprzedni',
    prev: 'poprz',
    at: 'przy',
    random: 'losowy',

    // DOM Traversal
    closest: 'najbliższy',
    parent: 'rodzic',
    children: 'dzieci',
    within: 'wewnątrz',

    // Emptiness/Existence
    no: 'brak',
    empty: 'pusty',
    some: 'jakiś',

    // String operations
    'starts with': 'zaczyna się od',
    'ends with': 'kończy się na',
  },
};
