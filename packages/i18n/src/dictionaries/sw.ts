// packages/i18n/src/dictionaries/sw.ts

import { Dictionary } from '../types';

export const sw: Dictionary = {
  commands: {
    // Event handling
    on: 'kwenye',
    tell: 'ambia',
    trigger: 'chochea',
    send: 'tuma',

    // DOM manipulation
    take: 'chukua',
    put: 'weka',
    set: 'weka',
    get: 'pata',
    add: 'ongeza',
    remove: 'ondoa',
    toggle: 'badilisha',
    hide: 'ficha',
    show: 'onyesha',

    // Control flow
    if: 'kama',
    unless: 'isipokuwa',
    repeat: 'rudia',
    for: 'kwa',
    while: 'wakati',
    until: 'hadi',
    continue: 'endelea',
    break: 'vunja',
    halt: 'simama',

    // Async
    wait: 'ngoja',
    fetch: 'leta',
    call: 'ita',
    return: 'rudi',

    // Other commands
    make: 'fanya',
    log: 'andika',
    throw: 'tupa',
    catch: 'shika',
    measure: 'pima',
    transition: 'mpito',

    // Data Commands
    increment: 'ongeza',
    decrement: 'punguza',
    bind: 'funga',
    default: 'msingi',
    persist: 'hifadhi',

    // Navigation Commands
    go: 'nenda',
    pushUrl: 'sukumaUrl',
    replaceUrl: 'badilishaUrl',

    // Utility Commands
    copy: 'nakili',
    pick: 'chagua',
    beep: 'lia',

    // Advanced Commands
    js: 'js',
    async: 'sainkroni',
    render: 'chora',

    // Animation Commands
    swap: 'badilishana',
    morph: 'badilishaUmbo',
    settle: 'tulia',

    // Content Commands
    append: 'ongezaMwisho',

    // Control Flow
    exit: 'toka',

    // Behaviors
    install: 'sakinisha',
  },

  modifiers: {
    to: 'kwa',
    from: 'kutoka',
    into: 'ndani',
    with: 'na',
    at: 'katika',
    in: 'ndani',
    of: 'ya',
    as: 'kama',
    by: 'na',
    before: 'kabla',
    after: 'baada',
    over: 'juu',
    under: 'chini',
    between: 'kati',
    through: 'kupitia',
    without: 'bila',
  },

  events: {
    click: 'bonyeza',
    dblclick: 'bonyeza_mara_mbili',
    mousedown: 'panya_shuka',
    mouseup: 'panya_juu',
    mouseenter: 'panya_ingia',
    mouseleave: 'panya_toka',
    mouseover: 'panya_juu',
    mouseout: 'panya_nje',
    mousemove: 'panya_sogea',

    keydown: 'kitufe_shuka',
    keyup: 'kitufe_juu',
    keypress: 'kitufe_bonyeza',

    focus: 'zingatia',
    blur: 'poteza_macho',
    change: 'badilisha',
    input: 'ingizo',
    submit: 'wasilisha',
    reset: 'weka_upya',

    load: 'pakia',
    unload: 'shuka',
    resize: 'badilisha_ukubwa',
    scroll: 'sogeza',

    touchstart: 'gusa_anza',
    touchend: 'gusa_mwisho',
    touchmove: 'gusa_sogea',
    touchcancel: 'gusa_ghairi',
  },

  logical: {
    when: 'wakati',
    where: 'wapi',
    and: 'na',
    or: 'au',
    not: 'si',
    is: 'ni',
    exists: 'ipo',
    matches: 'inafanana',
    contains: 'ina',
    includes: 'pamoja',
    equals: 'sawa',
    then: 'kisha',
    else: 'sivyo',
    otherwise: 'vinginevyo',
    end: 'mwisho',
  },

  temporal: {
    seconds: 'sekunde',
    second: 'sekunde',
    milliseconds: 'millisekunde',
    millisecond: 'millisekunde',
    minutes: 'dakika',
    minute: 'dakika',
    hours: 'masaa',
    hour: 'saa',
    ms: 'ms',
    s: 's',
    min: 'dk',
    h: 'sa',
  },

  values: {
    true: 'kweli',
    false: 'uongo',
    null: 'tupu',
    undefined: 'haijafafanuliwa',
    it: 'hiyo',
    its: 'yake', // REVIEW: native speaker
    me: 'mimi',
    my: 'yangu',
    myself: 'mimi mwenyewe',
    you: 'wewe', // REVIEW: native speaker
    your: 'yako', // REVIEW: native speaker
    yourself: 'wewe mwenyewe', // REVIEW: native speaker
    element: 'kipengele',
    target: 'lengo',
    detail: 'maelezo',
    event: 'tukio',
    window: 'dirisha',
    document: 'hati',
    body: 'mwili',
    result: 'matokeo',
    value: 'thamani',
  },

  attributes: {
    class: 'darasa',
    classes: 'madarasa',
    style: 'mtindo',
    styles: 'mitindo',
    attribute: 'sifa',
    attributes: 'sifa',
    property: 'mali',
    properties: 'mali',
  },

  expressions: {
    // Positional
    first: 'kwanza',
    last: 'mwisho',
    next: 'ijayo',
    previous: 'iliyopita',
    prev: 'awali',
    at: 'katika',
    random: 'nasibu',

    // DOM Traversal
    closest: 'karibu_zaidi',
    parent: 'mzazi',
    children: 'watoto',
    within: 'ndani_ya',

    // Emptiness/Existence
    no: 'hakuna',
    empty: 'tupu',
    some: 'baadhi',

    // String operations
    'starts with': 'huanza na',
    'ends with': 'huisha na',
  },
};
