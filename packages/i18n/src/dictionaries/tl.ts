/**
 * Tagalog Dictionary
 *
 * Tagalog translations for hyperscript keywords.
 * Tagalog is a VSO (Verb-Subject-Object) language with rich verbal morphology.
 */

import { Dictionary } from '../types';

export const tagalogDictionary: Dictionary = {
  commands: {
    // Event handling
    on: 'kapag',
    tell: 'sabihin',
    trigger: 'palitawin',
    send: 'ipadala',

    // DOM manipulation
    take: 'kunin',
    put: 'ilagay',
    set: 'itakda',
    get: 'kuhanin',
    add: 'idagdag',
    remove: 'alisin',
    toggle: 'palitan',
    hide: 'itago',
    show: 'ipakita',

    // Control flow
    if: 'kung',
    unless: 'maliban_kung',
    repeat: 'ulitin',
    for: 'para_sa',
    while: 'habang',
    until: 'hanggang',
    continue: 'magpatuloy',
    break: 'itigil',
    halt: 'huminto',

    // Async
    wait: 'maghintay',
    fetch: 'kuhanin_mula',
    call: 'tawagin',
    return: 'ibalik',

    // Other commands
    make: 'gumawa',
    log: 'itala',
    throw: 'ihagis',
    catch: 'hulihin',
    measure: 'sukatin',
    transition: 'baguhin',

    // Data Commands
    increment: 'dagdagan',
    decrement: 'bawasan',
    bind: 'itali',
    default: 'pamantayan',
    persist: 'panatilihin',

    // Navigation Commands
    go: 'pumunta',
    pushUrl: 'itulak_url',
    replaceUrl: 'palitan_url',

    // Utility Commands
    copy: 'kopyahin',
    pick: 'pumili',
    beep: 'tunog',

    // Advanced Commands
    js: 'js',
    async: 'sabay',
    render: 'ipakita',

    // Animation Commands
    swap: 'palitan_pwesto',
    morph: 'baguhin_hugis',
    settle: 'ayusin',

    // Content Commands
    append: 'idagdag_sa_dulo',
    prepend: 'idagdag_sa_simula',

    // Control Flow
    exit: 'lumabas',
    else: 'kung_hindi',

    // Focus Commands
    focus: 'ituon',
    blur: 'alisin_tuon',

    // Behaviors
    install: 'ikabit',
    behavior: 'ugali',
    init: 'simulan',
    clone: 'kopyahin',
  },

  modifiers: {
    to: 'sa',
    from: 'mula_sa',
    into: 'papasok_sa',
    with: 'kasama',
    at: 'sa',
    in: 'sa_loob',
    of: 'ng',
    as: 'bilang',
    by: 'sa_pamamagitan_ng',
    before: 'bago',
    after: 'pagkatapos',
    over: 'sa_ibabaw',
    under: 'sa_ilalim',
    between: 'sa_pagitan',
    through: 'sa_pamamagitan',
    without: 'walang',
    on: 'sa',
    then: 'pagkatapos',
    and: 'at',
    end: 'wakas',
    until: 'hanggang',
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

    every: 'bawat',
  },

  logical: {
    when: 'kapag',
    where: 'kung_saan',
    and: 'at',
    or: 'o',
    not: 'hindi',
    is: 'ay',
    exists: 'may',
    matches: 'tumutugma',
    contains: 'naglalaman',
    includes: 'kasama',
    equals: 'katumbas',
    then: 'pagkatapos',
    else: 'kung_hindi',
    otherwise: 'kung_hindi_man',
    end: 'wakas',
    if: 'kung',
    empty: 'walang_laman',
    true: 'totoo',
    false: 'mali',
    null: 'wala',
    undefined: 'hindi_tinukoy',
  },

  temporal: {
    seconds: 'segundo',
    second: 'segundo',
    milliseconds: 'milisegundo',
    millisecond: 'milisegundo',
    minutes: 'minuto',
    minute: 'minuto',
    hours: 'oras',
    hour: 'oras',
    ms: 'ms',
    s: 's',
    min: 'min',
    h: 'h',
    now: 'ngayon',
    forever: 'magpakailanman',
    times: 'beses',
  },

  values: {
    true: 'totoo',
    false: 'mali',
    null: 'wala',
    undefined: 'hindi_tinukoy',
    it: 'ito',
    its: 'nito',
    me: 'ako',
    my: 'aking',
    myself: 'sarili_ko',
    you: 'ikaw',
    your: 'iyong',
    yourself: 'sarili_mo',
    element: 'elemento',
    target: 'target',
    detail: 'detalye',
    event: 'pangyayari',
    window: 'bintana',
    document: 'dokumento',
    body: 'katawan',
    result: 'resulta',
    value: 'halaga',
  },

  attributes: {
    class: 'klase',
    classes: 'mga_klase',
    style: 'estilo',
    styles: 'mga_estilo',
    attribute: 'katangian',
    attributes: 'mga_katangian',
    property: 'ari_arian',
    properties: 'mga_ari_arian',
    id: 'id',
    value: 'halaga',
    text: 'teksto',
    html: 'html',
    disabled: 'hindi_pinagana',
    checked: 'naka_tsek',
  },

  expressions: {
    // Positional
    first: 'una',
    last: 'huli',
    next: 'susunod',
    previous: 'nakaraan',
    prev: 'nakaraan',
    at: 'sa',
    random: 'random',

    // DOM Traversal
    closest: 'pinakamalapit',
    parent: 'magulang',
    children: 'mga_anak',
    within: 'sa_loob_ng',

    // Emptiness/Existence
    no: 'walang',
    empty: 'walang_laman',
    some: 'ilan',

    // String operations
    'starts with': 'nagsisimula_sa',
    'ends with': 'nagtatapos_sa',

    // Additional
    length: 'haba',
    index: 'indeks',
  },
};

// Default export alias
export const tl = tagalogDictionary;
