/**
 * German Language Profile
 *
 * SVO word order (V2 in main clauses), prepositions, space-separated.
 * Features case system, compound words, and verb-second word order in main clauses.
 */

import type { LanguageProfile } from './types';

export const germanProfile: LanguageProfile = {
  code: 'de',
  name: 'German',
  nativeName: 'Deutsch',
  regions: ['western', 'priority'],
  direction: 'ltr',
  script: 'latin',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  // Infinitive is standard for German software UI (Speichern, Öffnen, Schließen)
  // Also used in written instructions ("Bitte nicht stören")
  defaultVerbForm: 'infinitive',
  verb: {
    position: 'start',
    subjectDrop: false,
  },
  references: {
    me: 'ich', // "I"
    it: 'es', // "it"
    you: 'du', // "you"
    result: 'Ergebnis',
    event: 'Ereignis',
    target: 'Ziel',
    body: 'Körper',
    document: 'dokument',
    window: 'fenster',
    detail: 'detail',
  },
  possessive: {
    marker: '', // German uses possessive pronouns directly
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'mein', // "my"
      it: 'sein', // "its"
      you: 'dein', // "your"
    },
    keywords: {
      mein: 'me',
      meine: 'me',
      meinen: 'me',
      dein: 'you',
      deine: 'you',
      deinen: 'you',
      sein: 'it',
      seine: 'it',
      seinen: 'it',
    },
  },
  roleMarkers: {
    destination: { primary: 'auf', alternatives: ['zu', 'in'], position: 'before' },
    source: { primary: 'von', alternatives: ['aus'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'mit', position: 'before' },
  },
  keywords: {
    toggle: { primary: 'umschalten', alternatives: ['wechseln'], normalized: 'toggle' },
    add: { primary: 'hinzufügen', normalized: 'add' },
    remove: { primary: 'entfernen', alternatives: ['löschen'], normalized: 'remove' },
    put: { primary: 'setzen', alternatives: ['stellen', 'platzieren'], normalized: 'put' },
    append: { primary: 'anhängen', normalized: 'append' },
    prepend: { primary: 'voranstellen', normalized: 'prepend' },
    take: { primary: 'nehmen', normalized: 'take' },
    make: { primary: 'machen', alternatives: ['erstellen', 'erzeugen'], normalized: 'make' },
    clone: { primary: 'klonen', alternatives: ['duplizieren'], normalized: 'clone' },
    swap: { primary: 'austauschen', alternatives: ['tauschen', 'vertauschen'], normalized: 'swap' },
    morph: { primary: 'verwandeln', alternatives: ['transformieren'], normalized: 'morph' },
    set: { primary: 'festlegen', alternatives: ['definieren'], normalized: 'set' },
    get: { primary: 'holen', alternatives: ['bekommen', 'erhalten'], normalized: 'get' },
    increment: { primary: 'erhöhen', normalized: 'increment' },
    decrement: { primary: 'verringern', alternatives: ['vermindern'], normalized: 'decrement' },
    log: { primary: 'protokollieren', alternatives: ['ausgeben'], normalized: 'log' },
    show: { primary: 'zeigen', alternatives: ['anzeigen'], normalized: 'show' },
    hide: { primary: 'verbergen', alternatives: ['verstecken'], normalized: 'hide' },
    transition: { primary: 'übergang', alternatives: ['animieren'], normalized: 'transition' },
    on: { primary: 'bei', alternatives: ['auf'], normalized: 'on' },
    trigger: { primary: 'auslösen', normalized: 'trigger' },
    send: { primary: 'senden', alternatives: ['schicken'], normalized: 'send' },
    // Nominalized 2026-07-28: a bare infinitive reads as a command to the browser
    // ('focus this!'), not as the occurrence an event names. Every other German
    // event identifier here is a noun (Klick, Eingabe, Änderung, Absenden), so
    // 'fokussieren' was the odd one out. 'Fokuserhalt' is the term German HTML
    // references pair with 'Fokusverlust' below; 'Fokus' leads because it is the
    // shortest form a beginner recognises.
    focus: {
      primary: 'Fokus',
      alternatives: ['Fokuserhalt', 'fokussieren'],
      normalized: 'focus',
    },
    // 'defokussieren'/'entfokussieren' have no attested use in German web writing —
    // defokussieren belongs to optics/photography. German HTML references gloss
    // onblur as 'bei Fokusverlust', paired with 'bei Fokuserhalt' for onfocus.
    // Well-formed compound, single token, reads as an event rather than a command.
    // Old spellings kept as parse alternatives.
    //
    // 'verlassen' added as an alternative 2026-07-28: SelfHTML and MediaEvent
    // both gloss the event with the leaving metaphor ('beim Verlassen ausgelöst'),
    // so authors reach for it. It stays an alternative rather than the primary
    // because it is a bare infinitive — the same word-class defect corrected on
    // `focus` directly above — and because alone it does not say what was left.
    blur: {
      primary: 'Fokusverlust',
      alternatives: ['verlassen', 'defokussieren', 'entfokussieren'],
      normalized: 'blur',
    },
    // Phase 1 (v0.9.90): DOM / form state / debug
    empty: { primary: 'leeren', alternatives: ['leer'], normalized: 'empty' },
    open: { primary: 'öffnen', alternatives: ['oeffnen'], normalized: 'open' },
    close: { primary: 'schließen', alternatives: ['schliessen'], normalized: 'close' },
    select: { primary: 'markieren', normalized: 'select' },
    clear: { primary: 'bereinigen', normalized: 'clear' },
    reset: { primary: 'zurücksetzen', alternatives: ['zuruecksetzen'], normalized: 'reset' },
    breakpoint: { primary: 'haltepunkt', normalized: 'breakpoint' },
    go: { primary: 'gehen', alternatives: ['navigieren'], normalized: 'go' },
    scroll: { primary: 'scrollen', normalized: 'scroll' },
    push: { primary: 'drücken', alternatives: ['push'], normalized: 'push' },
    replace: { primary: 'ersetzen', normalized: 'replace' },
    process: { primary: 'verarbeiten', normalized: 'process' },
    wait: { primary: 'warten', normalized: 'wait' },
    fetch: { primary: 'abrufen', alternatives: ['laden'], normalized: 'fetch' },
    settle: { primary: 'stabilisieren', normalized: 'settle' },
    if: { primary: 'falls', alternatives: ['sofern'], normalized: 'if' },
    unless: { primary: 'wennnicht', normalized: 'unless' },
    when: { primary: 'wenn', normalized: 'when' },
    where: { primary: 'wo', normalized: 'where' },
    else: { primary: 'sonst', alternatives: ['ansonsten'], normalized: 'else' },
    repeat: { primary: 'wiederholen', normalized: 'repeat' },
    for: { primary: 'für', normalized: 'for' },
    while: { primary: 'solange', alternatives: ['während'], normalized: 'while' },
    // `repeat forever` loop keyword — corpus word recognized so loopType types
    // as `:literal` like EN (the repeat.loopType R1 residue; see spanish.ts).
    forever: { primary: 'forever', normalized: 'forever' },
    continue: { primary: 'fortfahren', alternatives: ['weiter'], normalized: 'continue' },
    halt: { primary: 'anhalten', alternatives: ['stoppen'], normalized: 'halt' },
    throw: { primary: 'werfen', normalized: 'throw' },
    call: { primary: 'aufrufen', normalized: 'call' },
    return: { primary: 'zurückgeben', normalized: 'return' },
    then: { primary: 'dann', alternatives: ['danach', 'anschließend'], normalized: 'then' },
    and: { primary: 'und', alternatives: ['sowie', 'auch'], normalized: 'and' },
    // Predicate keywords (conditionals) — mirrors the Spanish profile, the only
    // language that previously parsed `is empty`-style predicates.
    is: { primary: 'ist', normalized: 'is' },
    // Comparison operator (`target matches .x`). Without this keyword the surface
    // stays an identifier and leaks verbatim into the condition's raw expression,
    // which the core expression parser reads as English (modal-close-backdrop /
    // focus-trap drop their then-branch). Not an ActionType and has no command
    // schema, so no pattern is generated from it.
    matches: { primary: 'passt', normalized: 'matches' },
    // Existence operator (`if #modal exists`). Same seam as `matches`: without the
    // keyword the surface stays an identifier and leaks verbatim into the
    // condition's raw expression (if-exists). Neither an ActionType nor a command
    // schema, so no pattern is generated from it.
    exists: { primary: 'existiert', normalized: 'exists' },
    // Negative-existence operator (`if no dragHandle set dragHandle to me`). Same
    // seam as `exists`: without the keyword the surface stays an identifier and
    // leaks verbatim into the condition's raw expression (behavior-draggable).
    // Neither an ActionType nor a command schema, so no pattern is generated from it.
    no: { primary: 'kein', normalized: 'no' },
    end: { primary: 'ende', alternatives: ['fertig'], normalized: 'end' },
    js: { primary: 'js', alternatives: ['javascript'], normalized: 'js' },
    async: { primary: 'asynchron', normalized: 'async' },
    tell: { primary: 'sagen', normalized: 'tell' },
    default: { primary: 'standard', normalized: 'default' },
    // Nominalized 2026-07-28, same reasoning as `focus` above: 'bei
    // Initialisierung' patterns with 'bei Änderung' / 'bei Eingabe', whereas the
    // infinitive reads as an instruction to initialize something.
    init: {
      primary: 'Initialisierung',
      alternatives: ['initialisieren'],
      normalized: 'init',
    },
    behavior: { primary: 'verhalten', normalized: 'behavior' },
    install: { primary: 'installieren', normalized: 'install' },
    measure: { primary: 'messen', normalized: 'measure' },
    beep: { primary: 'piepton', normalized: 'beep' },
    break: { primary: 'unterbrechen', normalized: 'break' },
    copy: { primary: 'kopieren', normalized: 'copy' },
    exit: { primary: 'beenden', normalized: 'exit' },
    pick: { primary: 'auswählen', normalized: 'pick' },
    render: { primary: 'rendern', normalized: 'render' },
    into: { primary: 'hinein', normalized: 'into' },
    before: { primary: 'vor', normalized: 'before' },
    after: { primary: 'nach', normalized: 'after' },
    // Common event names (for event handler patterns)
    click: { primary: 'Klick', alternatives: ['Klicken'], normalized: 'click' },
    hover: { primary: 'Hover', alternatives: ['Schweben'], normalized: 'hover' },
    submit: { primary: 'Absenden', alternatives: ['Senden'], normalized: 'submit' },
    input: { primary: 'Eingabe', normalized: 'input' },
    change: { primary: 'Änderung', alternatives: ['Ändern'], normalized: 'change' },
    // `resize` event (window-resize): the i18n dict emits größeändern; without it
    // the word tokenized as an identifier → event:expression (the on.event R1
    // residue). Registering it as the resize event yields event:literal="resize".
    // 'größeändern' was a malformed compound — German either separates the verb
    // phrase or compounds with the linking -n-. Noun form chosen as primary: it
    // stays a single token, so it also works as an `on-`/`al-` attribute name,
    // which a spaced phrase cannot.
    // 'grössenänderung' is not a typo: Swiss Standard German has no ß — it is not
    // taught in Swiss schools and is absent from the Swiss keyboard layout, so the
    // ß spelling is untypeable there. Lookup folds case and separators but NOT
    // ß↔ss (verified against the runtime), so the ss form needs registering
    // explicitly. This is the only German term containing ß.
    resize: {
      primary: 'Größenänderung',
      alternatives: ['größenänderung', 'grössenänderung', 'Größe ändern', 'größeändern'],
      normalized: 'resize',
    },
    // Event modifiers (for repeat until event)
    until: { primary: 'bis', normalized: 'until' },
    event: { primary: 'Ereignis', alternatives: ['Event'], normalized: 'event' },
    from: { primary: 'von', alternatives: ['aus'], normalized: 'from' },
    // Phase 8 (htmx v4 localized attributes): attribute-suffix keywords
    // used by the vocab generator — `sse-verbinden`, `hx-live`, etc.
    connect: { primary: 'verbinden', alternatives: ['Verbindung'], normalized: 'connect' },
    stream: { primary: 'stream', alternatives: ['Strom'], normalized: 'stream' },
    live: { primary: 'direkt', alternatives: ['live', 'echtzeit'], normalized: 'live' },
    socket: { primary: 'socket', alternatives: ['websocket'], normalized: 'socket' },
    // Reactive / realtime commands
    bind: { primary: 'binden', alternatives: ['verknuepfen', 'bind'], normalized: 'bind' },
    intercept: { primary: 'abfangen', alternatives: ['intercept'], normalized: 'intercept' },
    worker: { primary: 'arbeiter', alternatives: ['worker'], normalized: 'worker' },
    eventsource: {
      primary: 'eventsource',
      alternatives: ['ereignisquelle'],
      normalized: 'eventsource',
    },
  },
  eventHandler: {
    keyword: { primary: 'bei', alternatives: ['auf'], normalized: 'on' },
    sourceMarker: { primary: 'von', alternatives: ['aus'], position: 'before' },
    conditionalKeyword: { primary: 'wenn', alternatives: ['falls'] },
    // Event marker: bei (at/on), used in SVO pattern
    // Pattern: bei [event] [verb] [patient] auf [destination?]
    // Example: bei Klick umschalten .active auf #button
    eventMarker: { primary: 'bei', alternatives: ['beim'], position: 'before' },
    temporalMarkers: ['wenn', 'bei'], // temporal conjunctions (when, at)
  },
  lexicon: {
    events: {
      blur: { primary: 'defokussieren' },
      change: { primary: 'ändern' },
      click: { primary: 'klick' },
      dblclick: { primary: 'doppelklick' },
      focus: { primary: 'fokus' },
      input: { primary: 'eingabe' },
      keydown: { primary: 'taste unten' },
      keypress: { primary: 'tastedrücken' },
      keyup: { primary: 'taste oben' },
      load: { primary: 'laden' },
      mousedown: { primary: 'mousedown' },
      mouseenter: { primary: 'mauseintreten' },
      mouseleave: { primary: 'mausverlassen' },
      mousemove: { primary: 'mausbewegen' },
      mouseout: { primary: 'maus weg' },
      mouseover: { primary: 'maus drüber' },
      mouseup: { primary: 'mouseup' },
      reset: { primary: 'zurücksetzen' },
      resize: { primary: 'größenänderung' },
      scroll: { primary: 'scrollen' },
      submit: { primary: 'absenden' },
      touchcancel: { primary: 'berührungabbrechen' },
      touchend: { primary: 'berührungend' },
      touchmove: { primary: 'berührungbewegen' },
      touchstart: { primary: 'berührungstart' },
      unload: { primary: 'entladen' },
    },
    logical: {
      and: { primary: 'und' },
      changes: { primary: 'ändert' },
      contains: { primary: 'enthält' },
      else: { primary: 'sonst' },
      end: { primary: 'ende' },
      equals: { primary: 'gleicht' },
      exists: { primary: 'existiert' },
      has: { primary: 'hat' },
      have: { primary: 'habe' },
      includes: { primary: 'beinhaltet' },
      is: { primary: 'ist' },
      live: { primary: 'live' },
      matches: { primary: 'passt' },
      not: { primary: 'nicht' },
      or: { primary: 'oder' },
      otherwise: { primary: 'andernfalls' },
      then: { primary: 'dann' },
      when: { primary: 'wenn' },
      where: { primary: 'wo' },
    },
    temporal: {
      h: { primary: 'std' },
      hour: { primary: 'stunde' },
      hours: { primary: 'stunden' },
      millisecond: { primary: 'millisekunde' },
      milliseconds: { primary: 'millisekunden' },
      min: { primary: 'min' },
      minute: { primary: 'minute' },
      minutes: { primary: 'minuten' },
      ms: { primary: 'ms' },
      s: { primary: 's' },
      second: { primary: 'sekunde' },
      seconds: { primary: 'sekunden' },
    },
    values: {
      body: { primary: 'körper' },
      detail: { primary: 'detail' },
      document: { primary: 'dokument' },
      element: { primary: 'element' },
      event: { primary: 'ereignis' },
      false: { primary: 'falsch' },
      it: { primary: 'es' },
      its: { primary: 'sein' },
      me: { primary: 'ich' },
      my: { primary: 'mein' },
      myself: { primary: 'ich selbst' },
      null: { primary: 'null' },
      result: { primary: 'ergebnis' },
      target: { primary: 'ziel' },
      true: { primary: 'wahr' },
      undefined: { primary: 'undefiniert' },
      value: { primary: 'wert' },
      window: { primary: 'fenster' },
      you: { primary: 'du' },
      your: { primary: 'dein' },
      yourself: { primary: 'dich selbst' },
    },
    attributes: {
      attribute: { primary: 'attribut' },
      attributes: { primary: 'attribute' },
      class: { primary: 'klasse' },
      classes: { primary: 'klassen' },
      properties: { primary: 'eigenschaften' },
      property: { primary: 'eigenschaft' },
      style: { primary: 'stil' },
      styles: { primary: 'stile' },
    },
    expressions: {
      at: { primary: 'bei' },
      characters: { primary: 'Zeichen' },
      children: { primary: 'kinder' },
      closest: { primary: 'nächstgelegene' },
      empty: { primary: 'leer' },
      'ends with': { primary: 'endet mit' },
      exclusive: { primary: 'exklusiv' },
      first: { primary: 'erste' },
      'ignoring case': { primary: 'ohne Groß-/Kleinschreibung' },
      inclusive: { primary: 'inklusiv' },
      'joined by': { primary: 'verbunden mit' },
      last: { primary: 'letzte' },
      'mapped to': { primary: 'zugeordnet zu' },
      next: { primary: 'nächste' },
      no: { primary: 'kein' },
      parent: { primary: 'elternteil' },
      prev: { primary: 'vorh' },
      previous: { primary: 'vorherige' },
      random: { primary: 'zufällig' },
      some: { primary: 'einige' },
      'sorted by': { primary: 'sortiert nach' },
      'split by': { primary: 'geteilt durch' },
      'starts with': { primary: 'beginnt mit' },
      within: { primary: 'innerhalb' },
    },
  },
};
