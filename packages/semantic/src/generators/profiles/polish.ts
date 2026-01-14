/**
 * Polish Language Profile
 *
 * SVO word order, prepositions, space-separated.
 * Polish is a fusional language with rich verb conjugation.
 * Unlike most languages, Polish software UI uses IMPERATIVE form.
 */

import type { LanguageProfile } from './types';

export const polishProfile: LanguageProfile = {
  code: 'pl',
  name: 'Polish',
  nativeName: 'Polski',
  direction: 'ltr',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  // Polish uses imperative form for commands in software UI
  // (unlike most languages that use infinitive)
  defaultVerbForm: 'imperative',
  verb: {
    position: 'start',
    subjectDrop: true,
    suffixes: ['ać', 'eć', 'ić', 'yć', 'ąć', 'ować'],
  },
  references: {
    me: 'ja', // "I/me"
    it: 'to', // "it"
    you: 'ty', // "you"
    result: 'wynik',
    event: 'zdarzenie',
    target: 'cel',
    body: 'body',
  },
  possessive: {
    marker: '', // Polish uses genitive case, not a marker
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'mój', // "my" (masculine)
      it: 'jego', // "its"
      you: 'twój', // "your"
    },
    keywords: {
      // "my" variants (masculine/feminine/neuter)
      mój: 'me',
      moja: 'me',
      moje: 'me',
      // "your" variants
      twój: 'you',
      twoja: 'you',
      twoje: 'you',
      // "its/his/her" forms
      jego: 'it', // his/its
      jej: 'it', // her/its (feminine)
    },
  },
  roleMarkers: {
    destination: { primary: 'do', alternatives: ['w', 'na'], position: 'before' },
    source: { primary: 'z', alternatives: ['od', 'ze'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'z', alternatives: ['ze'], position: 'before' },
  },
  keywords: {
    // Class/Attribute operations (imperative form)
    toggle: {
      primary: 'przełącz',
      alternatives: ['przelacz'],
      normalized: 'toggle',
      form: 'imperative',
    },
    add: { primary: 'dodaj', normalized: 'add', form: 'imperative' },
    remove: {
      primary: 'usuń',
      alternatives: ['usun', 'wyczyść', 'wyczysc'],
      normalized: 'remove',
      form: 'imperative',
    },
    // Content operations
    put: {
      primary: 'umieść',
      alternatives: ['umiesc', 'wstaw'],
      normalized: 'put',
      form: 'imperative',
    },
    append: {
      primary: 'dołącz',
      alternatives: ['dolacz'],
      normalized: 'append',
      form: 'imperative',
    },
    prepend: {
      primary: 'poprzedź',
      alternatives: ['poprzedz'],
      normalized: 'prepend',
      form: 'imperative',
    },
    take: {
      primary: 'weź',
      alternatives: ['wez'], // removed 'pobierz' - it's the primary keyword for 'get'
      normalized: 'take',
      form: 'imperative',
    },
    make: {
      primary: 'utwórz',
      alternatives: ['utworz', 'stwórz', 'stworz'],
      normalized: 'make',
      form: 'imperative',
    },
    clone: {
      primary: 'sklonuj',
      alternatives: ['kopiuj'],
      normalized: 'clone',
      form: 'imperative',
    },
    swap: { primary: 'zamień', alternatives: ['zamien'], normalized: 'swap', form: 'imperative' },
    morph: {
      primary: 'przekształć',
      alternatives: ['przeksztalc'],
      normalized: 'morph',
      form: 'imperative',
    },
    // Variable operations
    set: {
      primary: 'ustaw',
      alternatives: ['określ', 'okresl'],
      normalized: 'set',
      form: 'imperative',
    },
    get: {
      primary: 'pobierz',
      alternatives: ['weź', 'wez'],
      normalized: 'get',
      form: 'imperative',
    },
    increment: {
      primary: 'zwiększ',
      alternatives: ['zwieksz'],
      normalized: 'increment',
      form: 'imperative',
    },
    decrement: { primary: 'zmniejsz', normalized: 'decrement', form: 'imperative' },
    log: { primary: 'loguj', alternatives: ['wypisz'], normalized: 'log', form: 'imperative' },
    // Visibility
    show: {
      primary: 'pokaż',
      alternatives: ['pokaz', 'wyświetl', 'wyswietl'],
      normalized: 'show',
      form: 'imperative',
    },
    hide: { primary: 'ukryj', alternatives: ['schowaj'], normalized: 'hide', form: 'imperative' },
    transition: {
      primary: 'animuj',
      alternatives: ['przejście', 'przejscie'],
      normalized: 'transition',
      form: 'imperative',
    },
    // Events
    on: { primary: 'gdy', alternatives: ['kiedy', 'przy', 'na'], normalized: 'on' },
    trigger: {
      primary: 'wywołaj',
      alternatives: ['wywolaj', 'wyzwól', 'wyzwol'],
      normalized: 'trigger',
      form: 'imperative',
    },
    send: { primary: 'wyślij', alternatives: ['wyslij'], normalized: 'send', form: 'imperative' },
    // DOM focus
    focus: {
      primary: 'skup',
      alternatives: ['skupienie'],
      normalized: 'focus',
      form: 'imperative',
    },
    blur: { primary: 'rozmyj', alternatives: ['odskup'], normalized: 'blur', form: 'imperative' },
    // Navigation
    go: {
      primary: 'idź',
      alternatives: ['idz', 'przejdź', 'przejdz', 'nawiguj'],
      normalized: 'go',
      form: 'imperative',
    },
    // Async
    wait: { primary: 'czekaj', alternatives: ['poczekaj'], normalized: 'wait', form: 'imperative' },
    fetch: {
      primary: 'pobierz',
      alternatives: ['załaduj', 'zaladuj'],
      normalized: 'fetch',
      form: 'imperative',
    },
    settle: { primary: 'ustabilizuj', normalized: 'settle', form: 'imperative' },
    // Control flow
    if: { primary: 'jeśli', alternatives: ['jesli', 'jeżeli', 'jezeli'], normalized: 'if' },
    when: { primary: 'kiedy', normalized: 'when' },
    where: { primary: 'gdzie', normalized: 'where' },
    else: { primary: 'inaczej', alternatives: ['wpp'], normalized: 'else' },
    repeat: {
      primary: 'powtórz',
      alternatives: ['powtorz'],
      normalized: 'repeat',
      form: 'imperative',
    },
    for: { primary: 'dla', alternatives: ['każdy', 'kazdy'], normalized: 'for' },
    while: { primary: 'dopóki', alternatives: ['dopoki', 'podczas'], normalized: 'while' },
    continue: {
      primary: 'kontynuuj',
      alternatives: ['dalej'],
      normalized: 'continue',
      form: 'imperative',
    },
    halt: {
      primary: 'zatrzymaj',
      alternatives: ['przerwij', 'stop'],
      normalized: 'halt',
      form: 'imperative',
    },
    throw: { primary: 'rzuć', alternatives: ['rzuc'], normalized: 'throw', form: 'imperative' },
    call: { primary: 'wywołaj', alternatives: ['wywolaj'], normalized: 'call', form: 'imperative' },
    return: { primary: 'zwróć', alternatives: ['zwroc'], normalized: 'return', form: 'imperative' },
    then: {
      primary: 'wtedy',
      alternatives: ['potem', 'następnie', 'nastepnie'],
      normalized: 'then',
    },
    and: { primary: 'i', alternatives: ['oraz'], normalized: 'and' },
    end: { primary: 'koniec', normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'async', alternatives: ['asynchronicznie'], normalized: 'async' },
    tell: { primary: 'powiedz', normalized: 'tell', form: 'imperative' },
    default: { primary: 'domyślnie', alternatives: ['domyslnie'], normalized: 'default' },
    init: { primary: 'inicjuj', normalized: 'init', form: 'imperative' },
    behavior: { primary: 'zachowanie', normalized: 'behavior' },
    install: { primary: 'zainstaluj', normalized: 'install', form: 'imperative' },
    measure: { primary: 'zmierz', normalized: 'measure', form: 'imperative' },
    // Modifiers
    into: { primary: 'do', alternatives: ['w'], normalized: 'into' },
    before: { primary: 'przed', normalized: 'before' },
    after: { primary: 'po', normalized: 'after' },
    // Event modifiers
    until: { primary: 'aż', alternatives: ['az', 'do'], normalized: 'until' },
    event: { primary: 'zdarzenie', normalized: 'event' },
    from: { primary: 'z', alternatives: ['od', 'ze'], normalized: 'from' },
  },
  eventHandler: {
    keyword: { primary: 'gdy', alternatives: ['kiedy', 'przy', 'na'], normalized: 'on' },
    sourceMarker: { primary: 'na', alternatives: ['w', 'przy'], position: 'before' },
  },
};
