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
  direction: 'ltr',
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
    me: 'ich',       // "I"
    it: 'es',        // "it"
    you: 'du',       // "you"
    result: 'Ergebnis',
    event: 'Ereignis',
    target: 'Ziel',
    body: 'Körper',
  },
  possessive: {
    marker: '',      // German uses possessive pronouns directly
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'mein',    // "my"
      it: 'sein',    // "its"
      you: 'dein',   // "your"
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
    clone: { primary: 'klonen', alternatives: ['kopieren'], normalized: 'clone' },
    swap: { primary: 'austauschen', alternatives: ['tauschen', 'wechseln'], normalized: 'swap' },
    morph: { primary: 'verwandeln', alternatives: ['transformieren'], normalized: 'morph' },
    set: { primary: 'festlegen', alternatives: ['definieren'], normalized: 'set' },
    get: { primary: 'holen', alternatives: ['bekommen'], normalized: 'get' },
    increment: { primary: 'erhöhen', normalized: 'increment' },
    decrement: { primary: 'verringern', alternatives: ['vermindern'], normalized: 'decrement' },
    log: { primary: 'protokollieren', alternatives: ['ausgeben'], normalized: 'log' },
    show: { primary: 'zeigen', alternatives: ['anzeigen'], normalized: 'show' },
    hide: { primary: 'verbergen', alternatives: ['verstecken'], normalized: 'hide' },
    transition: { primary: 'übergang', alternatives: ['animieren'], normalized: 'transition' },
    on: { primary: 'bei', alternatives: ['wenn', 'auf'], normalized: 'on' },
    trigger: { primary: 'auslösen', normalized: 'trigger' },
    send: { primary: 'senden', alternatives: ['schicken'], normalized: 'send' },
    focus: { primary: 'fokussieren', normalized: 'focus' },
    blur: { primary: 'defokussieren', alternatives: ['entfokussieren'], normalized: 'blur' },
    go: { primary: 'gehen', alternatives: ['navigieren'], normalized: 'go' },
    wait: { primary: 'warten', normalized: 'wait' },
    fetch: { primary: 'abrufen', alternatives: ['laden'], normalized: 'fetch' },
    settle: { primary: 'stabilisieren', normalized: 'settle' },
    if: { primary: 'wenn', alternatives: ['falls'], normalized: 'if' },
    when: { primary: 'TODO', normalized: 'when' },
    where: { primary: 'TODO', normalized: 'where' },
    else: { primary: 'sonst', alternatives: ['ansonsten'], normalized: 'else' },
    repeat: { primary: 'wiederholen', normalized: 'repeat' },
    for: { primary: 'für', normalized: 'for' },
    while: { primary: 'solange', alternatives: ['während'], normalized: 'while' },
    continue: { primary: 'fortfahren', alternatives: ['weiter'], normalized: 'continue' },
    halt: { primary: 'anhalten', alternatives: ['stoppen'], normalized: 'halt' },
    throw: { primary: 'werfen', normalized: 'throw' },
    call: { primary: 'aufrufen', normalized: 'call' },
    return: { primary: 'zurückgeben', normalized: 'return' },
    then: { primary: 'dann', alternatives: ['danach', 'anschließend'], normalized: 'then' },
    and: { primary: 'und', alternatives: ['sowie', 'auch'], normalized: 'and' },
    end: { primary: 'ende', alternatives: ['beenden', 'fertig'], normalized: 'end' },
    js: { primary: 'js', alternatives: ['javascript'], normalized: 'js' },
    async: { primary: 'asynchron', normalized: 'async' },
    tell: { primary: 'sagen', normalized: 'tell' },
    default: { primary: 'standard', normalized: 'default' },
    init: { primary: 'initialisieren', normalized: 'init' },
    behavior: { primary: 'verhalten', normalized: 'behavior' },
    install: { primary: 'installieren', normalized: 'install' },
    measure: { primary: 'messen', normalized: 'measure' },
    into: { primary: 'hinein', normalized: 'into' },
    before: { primary: 'vor', normalized: 'before' },
    after: { primary: 'nach', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'bis', normalized: 'until' },
    event: { primary: 'Ereignis', alternatives: ['Event'], normalized: 'event' },
    from: { primary: 'von', alternatives: ['aus'], normalized: 'from' },
  },
  eventHandler: {
    keyword: { primary: 'bei', alternatives: ['auf'] },
    sourceMarker: { primary: 'von', alternatives: ['aus'], position: 'before' },
    conditionalKeyword: { primary: 'wenn', alternatives: ['falls'] },
  },
};
