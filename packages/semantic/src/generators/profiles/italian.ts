/**
 * Italian Language Profile
 *
 * SVO word order, prepositions, space-separated.
 * Features rich verb conjugation with pro-drop (subject omission).
 * Very similar to Spanish but with Italian-specific vocabulary.
 */

import type { LanguageProfile } from './types';

export const italianProfile: LanguageProfile = {
  code: 'it',
  name: 'Italian',
  nativeName: 'Italiano',
  direction: 'ltr',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  // Infinitive is standard for Italian software UI (Salvare, Annullare, Aprire)
  // This matches macOS, Windows, and web app conventions
  defaultVerbForm: 'infinitive',
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  references: {
    me: 'io',        // "I/me"
    it: 'esso',      // "it"
    you: 'tu',       // "you"
    result: 'risultato',
    event: 'evento',
    target: 'obiettivo',
    body: 'corpo',
  },
  possessive: {
    marker: 'di',    // Italian uses "di" for general possession
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'mio',     // "my" (possessive adjective)
      it: 'suo',     // "its"
      you: 'tuo',    // "your"
    },
  },
  roleMarkers: {
    destination: { primary: 'in', alternatives: ['su', 'a'], position: 'before' },
    source: { primary: 'da', alternatives: ['di'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'con', position: 'before' },
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: 'commutare', alternatives: ['alternare', 'cambiare'], normalized: 'toggle' },
    add: { primary: 'aggiungere', alternatives: ['aggiungi'], normalized: 'add' },
    remove: { primary: 'rimuovere', alternatives: ['eliminare', 'togliere'], normalized: 'remove' },
    // Content operations
    put: { primary: 'mettere', alternatives: ['inserire'], normalized: 'put' },
    append: { primary: 'aggiungere', normalized: 'append' },
    prepend: { primary: 'anteporre', normalized: 'prepend' },
    take: { primary: 'prendere', normalized: 'take' },
    make: { primary: 'fare', alternatives: ['creare'], normalized: 'make' },
    clone: { primary: 'clonare', alternatives: ['copiare'], normalized: 'clone' },
    swap: { primary: 'scambiare', alternatives: ['cambiare'], normalized: 'swap' },
    morph: { primary: 'trasformare', alternatives: ['convertire'], normalized: 'morph' },
    // Variable operations
    set: { primary: 'impostare', alternatives: ['definire'], normalized: 'set' },
    get: { primary: 'ottenere', alternatives: ['prendere'], normalized: 'get' },
    increment: { primary: 'incrementare', alternatives: ['aumentare'], normalized: 'increment' },
    decrement: { primary: 'decrementare', alternatives: ['diminuire'], normalized: 'decrement' },
    log: { primary: 'registrare', normalized: 'log' },
    // Visibility
    show: { primary: 'mostrare', alternatives: ['visualizzare'], normalized: 'show' },
    hide: { primary: 'nascondere', normalized: 'hide' },
    transition: { primary: 'transizione', alternatives: ['animare'], normalized: 'transition' },
    // Events
    on: { primary: 'su', alternatives: ['quando', 'al'], normalized: 'on' },
    trigger: { primary: 'scatenare', alternatives: ['attivare'], normalized: 'trigger' },
    send: { primary: 'inviare', normalized: 'send' },
    // DOM focus
    focus: { primary: 'focalizzare', normalized: 'focus' },
    blur: { primary: 'sfuocare', normalized: 'blur' },
    // Navigation
    go: { primary: 'andare', alternatives: ['navigare', 'vai'], normalized: 'go' },
    // Async
    wait: { primary: 'aspettare', alternatives: ['attendere'], normalized: 'wait' },
    fetch: { primary: 'recuperare', normalized: 'fetch' },
    settle: { primary: 'stabilizzare', normalized: 'settle' },
    // Control flow
    if: { primary: 'se', normalized: 'if' },
    when: { primary: 'TODO', normalized: 'when' },
    where: { primary: 'TODO', normalized: 'where' },
    else: { primary: 'altrimenti', normalized: 'else' },
    repeat: { primary: 'ripetere', normalized: 'repeat' },
    for: { primary: 'per', normalized: 'for' },
    while: { primary: 'mentre', normalized: 'while' },
    continue: { primary: 'continuare', normalized: 'continue' },
    halt: { primary: 'fermare', normalized: 'halt' },
    throw: { primary: 'lanciare', normalized: 'throw' },
    call: { primary: 'chiamare', normalized: 'call' },
    return: { primary: 'ritornare', normalized: 'return' },
    then: { primary: 'allora', alternatives: ['poi', 'quindi'], normalized: 'then' },
    and: { primary: 'e', alternatives: ['anche'], normalized: 'and' },
    end: { primary: 'fine', normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'asincrono', normalized: 'async' },
    tell: { primary: 'dire', normalized: 'tell' },
    default: { primary: 'predefinito', normalized: 'default' },
    init: { primary: 'inizializzare', alternatives: ['inizia'], normalized: 'init' },
    behavior: { primary: 'comportamento', normalized: 'behavior' },
    install: { primary: 'installare', normalized: 'install' },
    measure: { primary: 'misurare', normalized: 'measure' },
    // Modifiers
    into: { primary: 'in', alternatives: ['dentro'], normalized: 'into' },
    before: { primary: 'prima', normalized: 'before' },
    after: { primary: 'dopo', normalized: 'after' },
    // Event modifiers
    until: { primary: 'fino', normalized: 'until' },
    event: { primary: 'evento', normalized: 'event' },
    from: { primary: 'da', alternatives: ['di'], normalized: 'from' },
  },
};
