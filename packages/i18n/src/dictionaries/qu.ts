// packages/i18n/src/dictionaries/qu.ts

import { Dictionary } from '../types';

export const qu: Dictionary = {
  commands: {
    // Event handling
    on: 'kaqpi',
    tell: 'niy',
    trigger: 'kichay',
    send: 'kachay',
    
    // DOM manipulation
    take: 'hurquy',
    put: 'churay',
    set: 'churay',
    get: 'chaskiy',
    add: 'yapay',
    remove: 'qichuy',
    toggle: 'tikray',
    hide: 'pakay',
    show: 'rikuchiy',
    
    // Control flow
    if: 'sichus',
    unless: 'mana_sichus',
    repeat: 'kutichiy',
    for: 'rayku',
    while: 'kay_kaq',
    until: 'hayk_akama',
    continue: 'purichiy',
    break: 'p_akiy',
    halt: 'sayay',
    
    // Async
    wait: 'suyay',
    fetch: 'apamuy',
    call: 'qayay',
    return: 'kutimuy',
    
    // Other commands
    make: 'ruray',
    log: 'qillqay',
    throw: 'wikchuy',
    catch: 'hapsiy',
    measure: 'tupuy',
    transition: 'tikray',

    // Data Commands
    increment: 'yapay',
    decrement: 'pisiyachiy',
    bind: 'watay',
    default: 'ñawpaq_kaq',
    persist: 'waqaychay',

    // Navigation Commands
    go: 'riy',
    pushUrl: 'url_tanqay',
    replaceUrl: 'url_tikray',

    // Utility Commands
    copy: 'qillqay',
    pick: 'akllay',
    beep: 'waqay',

    // Advanced Commands
    js: 'js',
    async: 'mana_suyaspa',
    render: 'rikuchiy',

    // Animation Commands
    swap: 'rantin_tikray',
    morph: 'tikrachiy',
    settle: 'tiyay',

    // Content Commands
    append: 'qhipaman_yapay',

    // Control Flow
    exit: 'lluqsiy',

    // Behaviors
    install: 'churay',
  },
  
  modifiers: {
    to: 'man',
    from: 'manta',
    into: 'ukupi',
    with: 'wan',
    at: 'pi',
    in: 'ukupi',
    of: 'pa',
    as: 'hina',
    by: 'rayku',
    before: 'ñawpaqpi',
    after: 'qhepapi',
    over: 'hawapi',
    under: 'urapi',
    between: 'chawpipi',
    through: 'pasaspa',
    without: 'mana',
  },
  
  events: {
    click: 'ñitiy',
    dblclick: 'iskay_ñitiy',
    mousedown: 'rat_ñitiy',
    mouseup: 'rat_huqariy',
    mouseenter: 'rat_yaykuy',
    mouseleave: 'rat_lluqsiy',
    mouseover: 'rat_hawapi',
    mouseout: 'rat_hawamanta',
    mousemove: 'rat_kuyuy',
    
    keydown: 'yupana_ñitiy',
    keyup: 'yupana_huqariy',
    keypress: 'yupana_ñitana',
    
    focus: 'qhaway',
    blur: 'paqariy',
    change: 'tikray',
    input: 'yaykuchiy',
    submit: 'kachay',
    reset: 'qallariy',
    
    load: 'apakuy',
    unload: 'urmay',
    resize: 'hatun_kay',
    scroll: 'kunray',
    
    touchstart: 'llamiy_qallay',
    touchend: 'llamiy_tukuy',
    touchmove: 'llamiy_kuyuy',
    touchcancel: 'llamiy_hark_ay',
  },
  
  logical: {
    when: 'maykama',
    where: 'maypi',
    and: 'chaymanta',
    or: 'utaq',
    not: 'mana',
    is: 'kanqa',
    exists: 'tiyan',
    matches: 'tupan',
    contains: 'ukupi_kan',
    includes: 'churasqa',
    equals: 'kikin',
    then: 'chayqa',
    else: 'mana_chayqa',
    otherwise: 'huk_kaqpi',
    end: 'tukuy',
  },
  
  temporal: {
    seconds: 'sikundukuna',
    second: 'sikundu',
    milliseconds: 'iskay_paqta_sikundukuna',
    millisecond: 'iskay_paqta_sikundu',
    minutes: 'minutukuna',
    minute: 'minutu',
    hours: 'horakuna',
    hour: 'hora',
    ms: 'ms',
    s: 's',
    min: 'm',
    h: 'h',
  },
  
  values: {
    true: 'cheqaq',
    false: 'llulla',
    null: 'ch_usaq',
    undefined: 'mana_riqsisqa',
    it: 'chay',
    its: 'chaypaq', // REVIEW: native speaker
    me: 'noqa',
    my: 'noqaq',
    myself: 'noqa killa',
    you: 'qam', // REVIEW: native speaker
    your: 'qampaq', // REVIEW: native speaker
    yourself: 'qam killa', // REVIEW: native speaker
    element: 'raku',
    target: 'punta',
    detail: 'sut_iy',
    event: 'ruway',
    window: 'k_iri',
    document: 'qillqa',
    body: 'kurku',
    result: 'lluqsiy',
    value: 'chanin',
  },
  
  attributes: {
    class: 'ayllu',
    classes: 'ayllukuna',
    style: 'sami',
    styles: 'samikuna',
    attribute: 'kaq',
    attributes: 'kaqkuna',
    property: 'kanay',
    properties: 'kanaykuna',
  },

  expressions: {
    // Positional
    first: 'ñawpaq',
    last: 'qhipa',
    next: 'qhipantin',
    previous: 'ñawpaqnin',
    prev: 'ñawpaq',
    at: 'pi',
    random: 'imaymanata',

    // DOM Traversal
    closest: 'aswan_kaylla',
    parent: 'mama_tayta',
    children: 'wawakuna',
    within: 'ukupi',

    // Emptiness/Existence
    no: 'mana_kanchu',
    empty: 'ch_usaq',
    some: 'wakin',

    // String operations
    'starts with': 'qallarisqa wan',
    'ends with': 'tukusqa wan',
  },
};