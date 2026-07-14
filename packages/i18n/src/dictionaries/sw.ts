// Generated/merged from semantic profiles — hand-written entries are preserved
// To add derived entries, update the semantic profile and run: npm run generate:language-assets

import { Dictionary } from '../types';

export const sw: Dictionary = {
  commands: {
    on: 'kwenye',
    tell: 'ambia',
    trigger: 'chochea',
    send: 'tuma',
    take: 'chukua',
    put: 'weka',
    // weka is the semantic sw profile's `put` primary; `set` is seti. Emitting weka
    // for set made the semantic parser read a transformed `set` as `put`.
    // See ZH_BLOCK_BODY_SCOPE.md (#2 sweep — keyword realignment, cf. zh fetch).
    set: 'seti',
    get: 'pata',
    add: 'ongeza',
    remove: 'ondoa',
    toggle: 'badilisha',
    // command blur (the events section has the blur EVENT word; without this
    // entry the transformer fell back to it and no profile read it as the verb)
    blur: 'blur',
    hide: 'ficha',
    show: 'onyesha',
    if: 'kama',
    unless: 'isipokuwa',
    repeat: 'rudia',
    for: 'kwa',
    while: 'wakati',
    until: 'hadi',
    continue: 'endelea',
    break: 'vunja',
    halt: 'simama',
    wait: 'ngoja',
    fetch: 'leta',
    call: 'ita',
    // `rudisha` (transitive, "give back a value"), not `rudi` ("go back"): the
    // semantic profile reads `rudisha`/`rejea`, so emitting `rudi` produced sw code
    // the parser could not read back. Kept clear of `rudia` (= `repeat`).
    return: 'rudisha',
    make: 'tengeneza', // auditor: dict emitted a word the profile reads differently
    log: 'andika',
    throw: 'tupa',
    catch: 'shika',
    measure: 'pima',
    transition: 'mpito',
    increment: 'ongezeko',
    decrement: 'punguza',
    default: 'msingi',
    go: 'nenda',
    pushUrl: 'sukumaUrl',
    replaceUrl: 'badilishaUrl',
    copy: 'nakala', // Batch 3: nakili is the clone keyword — rendered copy parsed as action=clone
    pick: 'chagua',
    beep: 'lia',
    js: 'js',
    async: 'sainkroni',
    render: 'chora',
    swap: 'badilishana',
    morph: 'geuza', // auditor: dict emitted a word the profile reads differently
    settle: 'tulia',
    append: 'ambatanisha', // profile primary; 'ongezaMwisho' is unrecognized
    exit: 'toka',
    install: 'sakinisha',
    breakpoint: 'nukta-simama',
    clear: 'safisha', // futa is a remove alternative in the profile
    close: 'funga',
    open: 'fungua',
    select: 'alama', // Batch 3: chagua is the pick keyword — bare select rendered with it parses null
    clone: 'nakili',
    prepend: 'tanguliza',
    focus: 'lenga',
    socket: 'soketi',
  },

  modifiers: {
    to: 'kwa',
    from: 'kutoka',
    into: 'ndani',
    with: 'na',
    at: 'katika',
    in: 'ndani',
    of: 'ya',
    // `kuwa` ("to be/become" — the conversion sense, cf. `badilisha kuwa`), not
    // `kama`: sw `kama` is the IF keyword (commands.if above and the semantic sw
    // profile's if primary), so emitting it for `as` grew a phantom `if` command
    // out of every transformed `as <Type>` tail (`kama JSON`, `kama Number`) when
    // the semantic parser split event-body statements. Same dict↔profile homonym
    // disambiguation as pl get/pobierz. The semantic fetch-sw pattern still
    // tolerates hand-written `kama` in as-marker position.
    as: 'kuwa',
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
    // V3c burn-down (2026-07-14): English passthrough — no native form round-trips
    // on the parse side (probe: split forms shatter, fused forms capture verbatim).
    dblclick: 'dblclick',
    mousedown: 'panya_shuka',
    mouseup: 'panya_juu',
    mouseenter: 'panya_ingia',
    mouseleave: 'panya_toka',
    // V3 Batch 2: panya_juu is mouseup's form (shared here by mistake — the
    // tokenizer deliberately maps it to mouseup for the corpus row, so a
    // mouseover handler captured `mouseup`) — realigned to the
    // tokenizer-registered `sogeza juu`.
    mouseover: 'sogeza juu',
    mouseout: 'panya_nje',
    mousemove: 'panya_sogea',
    keydown: 'kitufe_shuka',
    keyup: 'kitufe_juu',
    keypress: 'keypress',
    // V3 Batch 2: zingatia captured no event → lenga (S5b/tokenizer form);
    // poteza_macho was a null parse → `blur` (the S5b identity form — matches
    // the live corpus render `kwenye blur`); badilisha is the toggle VERB
    // homonym (a change handler captured event=`toggle` — a listener for a DOM
    // event named "toggle") → kubadilisha (S5b/tokenizer form).
    focus: 'lenga',
    blur: 'blur',
    change: 'kubadilisha',
    input: 'ingizo',
    submit: 'wasilisha',
    reset: 'reset',
    load: 'pakia',
    unload: 'shuka',
    resize: 'badilisha_ukubwa',
    scroll: 'sogeza',
    touchstart: 'touchstart',
    touchend: 'touchend',
    touchmove: 'touchmove',
    touchcancel: 'touchcancel',
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
    has: 'ana',
    have: 'nina',
    then: 'kisha',
    else: 'sivyo',
    otherwise: 'vinginevyo',
    end: 'mwisho',
    live: 'mubashara',
    changes: 'inabadilika',
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
    its: 'yake',
    me: 'mimi',
    my: 'yangu',
    myself: 'mimi mwenyewe',
    you: 'wewe',
    your: 'yako',
    yourself: 'wewe mwenyewe',
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
    first: 'kwanza',
    // 'mwisho' is the END keyword (block terminator) — the tokenizer's keyword
    // map is last-wins, so a positional `last` emission of 'mwisho' reads as
    // `end` and terminates the enclosing block mid-condition (focus-trap's
    // `… inafanana mwisho <button/>` dropped the whole branch body). Emit the
    // concatenated adjective form instead (wa mwisho — the saufsi/wennnicht/
    // enyakın single-token class); the tokenizer reads it as `last`.
    last: 'wamwisho',
    next: 'ijayo',
    previous: 'iliyopita',
    prev: 'awali',
    at: 'katika',
    random: 'nasibu',
    // Natural Swahili: `karibu` ("near/close") is the ordinary word and already
    // maps to closest. The earlier `karibu_zaidi` ("nearer") underscore-split to
    // karibu/_/zaidi (the stray `_ zaidi` broke positional capture); the fused
    // `karibuzaidi` parsed but isn't real Swahili. `karibu` alone is both natural
    // and correct (the sw tokenizer is single-word-only, so a spaced `karibu
    // zaidi` would strand `zaidi` regardless).
    closest: 'karibu',
    parent: 'mzazi',
    children: 'watoto',
    within: 'ndani_ya',
    no: 'hakuna',
    empty: 'tupu',
    some: 'baadhi',
    'starts with': 'huanza na',
    'ends with': 'huisha na',
    'ignoring case': 'puuza herufi kubwa ndogo',
    'sorted by': 'kupangwa kwa',
    'mapped to': 'kubadilishwa kuwa',
    'split by': 'kugawanywa kwa',
    'joined by': 'kuunganishwa kwa',
  },
};
