// Generated/merged from semantic profiles — hand-written entries are preserved
// To add derived entries, update the semantic profile and run: npm run generate:language-assets

import { Dictionary } from '../types';

export const qu: Dictionary = {
  commands: {
    on: 'kaqpi',
    tell: 'niy',
    trigger: 'kichay',
    send: 'kachay',
    take: 'hapiy', // auditor: dict emitted a word the profile reads differently
    put: 'churay',
    // churay is the semantic qu profile's `put` primary; `set` is churanay. Emitting
    // churay for set made the semantic parser read a transformed `set` as `put`.
    // See ZH_BLOCK_BODY_SCOPE.md (#2 sweep — keyword realignment, cf. zh fetch).
    set: 'churanay',
    // Align with the semantic quechua profile's `get` primary (`taripay`); the
    // previous `chaskiy` had no profile entry, so the transformed `get` dropped
    // (get-value parsed degenerate). Same dict↔profile alignment as id `toggle`.
    get: 'taripay',
    add: 'yapay',
    remove: 'qichuy',
    toggle: 'tikray',
    hide: 'pakay',
    show: 'rikuchiy',
    if: 'sichus',
    unless: 'mana sichus', // spaced phrase ("if not"); `_` form split to `mana`+`sichus`(=if) at parse time
    repeat: 'kutipay',
    for: 'sapankaq', // profile's for word — rayku doubles as `by`
    // `kaykamaqa` (the semantic qu profile's while primary), not `kay_kaq`: the
    // `_` form is unknown to the profile (and `_` words split at parse time, cf.
    // qhipaman_yapay), so the fronted repeat-while head never formed a `while`
    // node — the condition dropped wholesale. Same dict↔profile alignment as
    // vi render / de abrufen.
    while: 'kaykamaqa',
    until: 'hayk_akama',
    continue: 'purichiy',
    break: 'p_akiy',
    halt: 'sayay',
    wait: 'suyay',
    fetch: 'apamuy',
    call: 'qayay',
    return: 'kutimuy',
    make: 'ruray',
    // qillqay is the semantic qu profile's `copy` primary; `log` is qillqakuy.
    // Emitting qillqay for log made the parser read every transformed log as
    // copy (log-value/log-element/get-value lossy) — same realign as set above.
    log: 'qillqakuy',
    throw: 'wikchuy',
    catch: 'hapsiy',
    measure: 'tupuy',
    // pasay, not tikray: the semantic qu profile's toggle keyword is
    // t'ikray/tikray, so a tikray render collided with toggle and the
    // transition command never anchored (sw kama precedent, #569).
    transition: 'pasay',
    increment: 'yapachiy',
    decrement: 'pisiyachiy',
    default: 'ñawpaq_kaq',
    go: 'riy',
    pushUrl: 'url_tanqay',
    replaceUrl: 'url_tikray',
    copy: 'qillqay',
    pick: 'akllay',
    beep: 'waqay',
    js: 'js',
    async: 'mana_suyaspa',
    render: 'rikurichiy', // auditor: dict emitted a word the profile reads differently
    swap: "t'inkuy", // profile primary; 'rantin_tikray' splits, 'tikray' is toggle's word
    morph: 'tukunay', // auditor: dict emitted a word the profile reads differently
    settle: 'tiyakuy', // auditor: dict emitted a word the profile reads differently
    append: 'qatichiy', // profile's append primary (single token); `qhipaman_yapay` `_`-split to qhipaman+yapay(=add) at parse time
    exit: 'lluqsiy',
    install: 'tarpuy',
    breakpoint: 'sayachinay',
    clear: 'pichay',
    close: 'wichqay',
    open: 'paskay', // Batch 3: kichay is the trigger keyword — rendered open parsed null
    select: 'marcay', // Batch 3: akllay is the pick keyword — bare select rendered with it parses null
    clone: 'kikinchay',
    prepend: 'ñawpachiy',
    socket: 'tinkina',
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
    dblclick: 'dblclick',
    // Fused (no `_`): the semantic tokenizer splits on `_` — and `rat_ñitiy` then
    // mis-captured as the `click` event (ñitiy→click). Mirrors the #535 ru/uk fuse.
    mousedown: 'ratñitiy',
    mouseup: 'rathuqariy',
    mouseenter: 'mouseenter',
    mouseleave: 'mouseleave',
    mouseover: 'mouseover',
    mouseout: 'mouseout',
    mousemove: 'mousemove',
    // V3 Batch 2: `yupana_ñitiy` split at `_` and mis-captured as the `click`
    // event (ñitiy→click, the same mechanism as the mousedown fuse above);
    // `yupana_huqariy` captured verbatim `huqariy`. Realigned to the
    // S5b/tokenizer forms.
    keydown: 'llave uray',
    keyup: 'llave hawa',
    keypress: 'keypress',
    focus: 'qhaway',
    blur: 'paqariy',
    change: 'kambiay', // Batch 3: tikray is the toggle verb — on-change listener captured event "toggle"
    input: 'yaykuchiy',
    submit: 'apaykachay', // Batch 3: kachay is the send verb — on-submit captured "send" in one corpus slot
    reset: 'musuqchay', // Batch 3: qallariy is the init/start word — on-reset listener captured event "default"
    load: 'apakuy',
    unload: 'unload',
    resize: 'hatun_kay',
    scroll: 'kunray',
    // V3c burn-down (2026-07-14): English passthrough — no native form round-trips
    // on the parse side (probe: split forms shatter, fused forms capture verbatim).
    touchstart: 'touchstart',
    touchend: 'touchend',
    touchmove: 'touchmove',
    touchcancel: 'touchcancel',
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
    has: 'kachkan',
    have: 'kachkani',
    then: 'chayqa',
    // Align to the semantic profile's else word `manachus`. The old `mana_chayqa`
    // tokenized as `mana`(false) + `_` + `chayqa`(then) — no else keyword formed,
    // so qu conditionals never split their else branch. `manachus` is a single
    // token the profile-derived keyword map reads as `else` (dict↔profile align).
    else: 'manachus',
    otherwise: 'huk_kaqpi',
    end: 'tukuy',
    live: 'kawsay',
    changes: 'tukurikun',
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
    null: 'chusaq',
    undefined: 'mana_riqsisqa',
    it: 'chay',
    its: 'chaypaq',
    me: 'noqa',
    my: 'noqaq',
    myself: 'noqa killa',
    you: 'qam',
    your: 'qampaq',
    yourself: 'qam killa',
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
    first: 'ñawpaq',
    last: 'qhipa',
    next: 'qhipantin',
    previous: 'ñawpaqnin',
    prev: 'ñawpaq',
    at: 'pi',
    random: 'imaymanata',
    closest: 'kaylla',
    parent: 'mama_tayta',
    children: 'wawakuna',
    within: 'ukupi',
    no: 'mana_kanchu',
    empty: 'chusaq',
    some: 'wakin',
    'starts with': 'qallarisqa wan',
    'ends with': 'tukusqa wan',
    'ignoring case': 'hatun-huchuy qillqata-saqiy',
    'sorted by': 'niqpi ruwasqa',
    'mapped to': 'kay kaqman',
    'split by': 'rakisqa',
    'joined by': 'huñusqa',
  },
};
