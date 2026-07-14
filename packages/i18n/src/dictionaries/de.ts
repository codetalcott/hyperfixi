// Generated/merged from semantic profiles — hand-written entries are preserved
// To add derived entries, update the semantic profile and run: npm run generate:language-assets

import { Dictionary } from '../types';

export const de: Dictionary = {
  commands: {
    on: 'bei',
    tell: 'sagen',
    trigger: 'auslösen',
    send: 'senden',
    take: 'nehmen',
    put: 'setzen',
    set: 'festlegen',
    get: 'erhalten',
    add: 'hinzufügen',
    remove: 'entfernen',
    toggle: 'umschalten',
    // command blur (the events section has the blur EVENT word; without this
    // entry the transformer fell back to it and no profile read it as the verb)
    blur: 'defokussieren',
    hide: 'verstecken',
    show: 'zeigen',
    // Align with the semantic German profile's `if` primary (`falls`). The previous
    // `wenn` collides with the profile's `when` keyword (German `wenn` = both
    // "if" and "when"), so a transformed `if` resolved to `when` and the conditional
    // wrapper never formed (`if`/`put` dropped). Same dict↔profile alignment as id
    // `toggle` / get-value. `when` is unaffected (separate dict entry).
    if: 'falls',
    unless: 'wennnicht',
    repeat: 'wiederholen',
    for: 'für',
    while: 'während',
    until: 'bis',
    continue: 'weiter',
    break: 'unterbrechen',
    halt: 'anhalten',
    wait: 'warten',
    fetch: 'abrufen',
    call: 'aufrufen',
    return: 'zurückgeben',
    make: 'erstellen',
    log: 'protokollieren',
    throw: 'werfen',
    catch: 'fangen',
    measure: 'messen',
    transition: 'übergang',
    increment: 'erhöhen',
    decrement: 'verringern',
    default: 'standard',
    go: 'gehen',
    pushUrl: 'urlHinzufügen',
    replaceUrl: 'urlErsetzen',
    copy: 'kopieren',
    pick: 'auswählen',
    beep: 'piepton',
    js: 'js',
    async: 'asynchron',
    render: 'rendern',
    swap: 'tauschen',
    morph: 'verwandeln',
    settle: 'stabilisieren',
    append: 'anhängen',
    exit: 'beenden',
    install: 'installieren',
    breakpoint: 'haltepunkt',
    clear: 'bereinigen', // löschen is a remove alternative in the profile
    close: 'schließen',
    open: 'öffnen',
    select: 'markieren', // Batch 3: auswählen is the pick keyword — bare select rendered with it parses null
    clone: 'klonen',
    prepend: 'voranstellen',
    focus: 'fokussieren',
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
    // mousedown/mouseup: English passthrough — no native form round-trips on the
    // parse side (V3c probe 2026-07-14: fused forms captured verbatim, split forms
    // shattered to their first word — live broken listeners in repeat-until-event).
    // The Batch-2 id-keyup precedent; revisit if S5b + tokenizer gain native entries.
    mousedown: 'mousedown',
    mouseup: 'mouseup',
    mouseenter: 'mauseintreten',
    mouseleave: 'mausverlassen',
    // V3 Batch 2: fused/dead event words realigned to the de tokenizer's
    // registered forms (S5b's `maus über`/`taste runter` are aspirational — they
    // do not tokenize; `mausüber` etc. captured event=expression:undefined).
    mouseover: 'maus drüber',
    mouseout: 'maus weg',
    mousemove: 'mausbewegen',
    keydown: 'taste unten',
    keyup: 'taste oben',
    keypress: 'tastedrücken',
    focus: 'fokus',
    // matches commands.blur (which shadows this at render time) and the live
    // corpus render; `unscharf` was dead vocab that captured no event
    blur: 'defokussieren',
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
    has: 'hat',
    have: 'habe',
    then: 'dann',
    else: 'sonst',
    otherwise: 'andernfalls',
    end: 'ende',
    live: 'live',
    changes: 'ändert',
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
    yourself: 'dich selbst',
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
    first: 'erste',
    last: 'letzte',
    next: 'nächste',
    previous: 'vorherige',
    prev: 'vorh',
    at: 'bei',
    random: 'zufällig',
    // `nächste` already serves `next` (line above). German `nächste` is
    // genuinely ambiguous (next/nearest), so emitting it for `closest` too
    // collided: the semantic tokenizer normalizes `nächste`→next (a deliberate
    // last-wins choice — see german.ts), and a closest reading is impossible to
    // recover. Use the unambiguous `nächstgelegene` ("nearest-located") for
    // closest so the two readings stay distinct end-to-end.
    closest: 'nächstgelegene',
    parent: 'elternteil',
    children: 'kinder',
    within: 'innerhalb',
    no: 'kein',
    empty: 'leer',
    some: 'einige',
    'starts with': 'beginnt mit',
    'ends with': 'endet mit',
    'ignoring case': 'ohne Groß-/Kleinschreibung',
    'sorted by': 'sortiert nach',
    'mapped to': 'zugeordnet zu',
    'split by': 'geteilt durch',
    'joined by': 'verbunden mit',
  },
};
