/**
 * French Language Profile
 *
 * SVO word order, prepositions, space-separated.
 * Features rich verb conjugation and gendered articles.
 */

import type { LanguageProfile } from './types';

export const frenchProfile: LanguageProfile = {
  code: 'fr',
  name: 'French',
  nativeName: 'Français',
  direction: 'ltr',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  // Infinitive is standard for French software UI (Enregistrer, Ouvrir, Fermer)
  defaultVerbForm: 'infinitive',
  verb: {
    position: 'start',
    subjectDrop: false,
  },
  references: {
    me: 'moi', // "I/me"
    it: 'il', // "it"
    you: 'toi', // "you"
    result: 'résultat',
    event: 'événement',
    target: 'cible',
    body: 'corps',
  },
  possessive: {
    marker: 'de', // Uses "de" for general possession
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'ma', // "my" (feminine; "mon" for masculine)
      it: 'sa', // "its" (feminine; "son" for masculine)
      you: 'ta', // "your" (feminine; "ton" for masculine)
    },
    keywords: {
      mon: 'me',
      ma: 'me',
      mes: 'me',
      ton: 'you',
      ta: 'you',
      tes: 'you',
      son: 'it',
      sa: 'it',
      ses: 'it',
    },
  },
  roleMarkers: {
    destination: { primary: 'sur', alternatives: ['à', 'dans'], position: 'before' },
    source: { primary: 'de', alternatives: ['depuis'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'avec', position: 'before' },
  },
  keywords: {
    toggle: { primary: 'basculer', alternatives: ['alterner'], normalized: 'toggle' },
    add: { primary: 'ajouter', normalized: 'add' },
    remove: { primary: 'supprimer', alternatives: ['enlever', 'retirer'], normalized: 'remove' },
    put: { primary: 'mettre', alternatives: ['placer'], normalized: 'put' },
    append: { primary: 'annexer', normalized: 'append' },
    prepend: { primary: 'préfixer', normalized: 'prepend' },
    take: { primary: 'prendre', normalized: 'take' },
    make: { primary: 'faire', alternatives: ['créer'], normalized: 'make' },
    clone: { primary: 'cloner', alternatives: ['dupliquer'], normalized: 'clone' },
    swap: { primary: 'échanger', alternatives: ['permuter'], normalized: 'swap' },
    morph: { primary: 'transformer', alternatives: ['métamorphoser'], normalized: 'morph' },
    set: { primary: 'définir', alternatives: ['établir'], normalized: 'set' },
    get: { primary: 'obtenir', normalized: 'get' },
    increment: { primary: 'incrémenter', alternatives: ['augmenter'], normalized: 'increment' },
    decrement: { primary: 'décrémenter', alternatives: ['diminuer'], normalized: 'decrement' },
    log: { primary: 'enregistrer', alternatives: ['journaliser'], normalized: 'log' },
    show: { primary: 'montrer', alternatives: ['afficher'], normalized: 'show' },
    hide: { primary: 'cacher', alternatives: ['masquer'], normalized: 'hide' },
    transition: { primary: 'transition', alternatives: ['animer'], normalized: 'transition' },
    on: { primary: 'sur', alternatives: ['lors'], normalized: 'on' },
    trigger: { primary: 'déclencher', normalized: 'trigger' },
    send: { primary: 'envoyer', normalized: 'send' },
    focus: { primary: 'focaliser', alternatives: ['concentrer'], normalized: 'focus' },
    blur: { primary: 'défocaliser', normalized: 'blur' },
    go: { primary: 'aller', alternatives: ['naviguer'], normalized: 'go' },
    wait: { primary: 'attendre', normalized: 'wait' },
    fetch: { primary: 'chercher', alternatives: ['récupérer'], normalized: 'fetch' },
    settle: { primary: 'stabiliser', normalized: 'settle' },
    if: { primary: 'si', normalized: 'if' },
    when: { primary: 'quand', normalized: 'when' },
    where: { primary: 'où', normalized: 'where' },
    else: { primary: 'sinon', normalized: 'else' },
    repeat: { primary: 'répéter', normalized: 'repeat' },
    for: { primary: 'pour', normalized: 'for' },
    while: { primary: 'pendant', normalized: 'while' },
    continue: { primary: 'continuer', normalized: 'continue' },
    halt: { primary: 'arrêter', alternatives: ['stopper'], normalized: 'halt' },
    throw: { primary: 'lancer', normalized: 'throw' },
    call: { primary: 'appeler', normalized: 'call' },
    return: { primary: 'retourner', alternatives: ['renvoyer'], normalized: 'return' },
    then: { primary: 'puis', alternatives: ['ensuite', 'alors'], normalized: 'then' },
    and: { primary: 'et', alternatives: ['aussi', 'également'], normalized: 'and' },
    end: { primary: 'fin', alternatives: ['terminer', 'finir'], normalized: 'end' },
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'asynchrone', normalized: 'async' },
    tell: { primary: 'dire', normalized: 'tell' },
    default: { primary: 'défaut', normalized: 'default' },
    init: { primary: 'initialiser', normalized: 'init' },
    behavior: { primary: 'comportement', normalized: 'behavior' },
    install: { primary: 'installer', normalized: 'install' },
    measure: { primary: 'mesurer', normalized: 'measure' },
    beep: { primary: 'bip', normalized: 'beep' },
    break: { primary: 'interrompre', normalized: 'break' },
    copy: { primary: 'copier', normalized: 'copy' },
    exit: { primary: 'sortir', normalized: 'exit' },
    pick: { primary: 'choisir', normalized: 'pick' },
    render: { primary: 'rendu', normalized: 'render' },
    into: { primary: 'dans', normalized: 'into' },
    before: { primary: 'avant', normalized: 'before' },
    after: { primary: 'après', normalized: 'after' },
    // Common event names (for event handler patterns)
    click: { primary: 'clic', alternatives: ['clique'], normalized: 'click' },
    hover: { primary: 'survol', alternatives: ['survoler'], normalized: 'hover' },
    submit: { primary: 'soumission', alternatives: ['soumettre'], normalized: 'submit' },
    input: { primary: 'saisie', alternatives: ['entrée'], normalized: 'input' },
    change: { primary: 'changement', alternatives: ['modifier'], normalized: 'change' },
    // Event modifiers (for repeat until event)
    until: { primary: "jusqu'à", alternatives: ['jusque'], normalized: 'until' },
    event: { primary: 'événement', normalized: 'event' },
    from: { primary: 'de', alternatives: ['depuis'], normalized: 'from' },
  },
  eventHandler: {
    keyword: { primary: 'sur', alternatives: ['lors'], normalized: 'on' },
    sourceMarker: { primary: 'de', alternatives: ['depuis'], position: 'before' },
    conditionalKeyword: { primary: 'quand', alternatives: ['lorsque'] },
    // Event marker: au (at/upon), used in SVO pattern
    // Pattern: au [event] [verb] [patient] sur [destination?]
    // Example: au clic basculer .active sur #button
    eventMarker: { primary: 'au', alternatives: ['lors du', 'lors de'], position: 'before' },
    temporalMarkers: ['quand', 'lorsque'], // temporal conjunctions (when)
  },
};
