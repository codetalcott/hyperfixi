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
  regions: ['western', 'priority'],
  direction: 'ltr',
  script: 'latin',
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
    // Phase 1 (v0.9.90): DOM / form state / debug
    // `vide` (adjective, "empty") is the i18n transformer's `is empty` predicate
    // form; `vider` is the verb ("to empty"). Accept both so the emptiness check
    // in conditions is recognized, not just the clear-element command.
    empty: { primary: 'vider', alternatives: ['vide'], normalized: 'empty' },
    open: { primary: 'ouvrir', normalized: 'open' },
    close: { primary: 'fermer', normalized: 'close' },
    select: { primary: 'sélectionner', alternatives: ['selectionner'], normalized: 'select' },
    clear: { primary: 'effacer', normalized: 'clear' },
    reset: { primary: 'réinitialiser', alternatives: ['reinitialiser'], normalized: 'reset' },
    breakpoint: { primary: 'point-arrêt', alternatives: ['point-arret'], normalized: 'breakpoint' },
    go: { primary: 'aller', alternatives: ['naviguer'], normalized: 'go' },
    scroll: { primary: 'défiler', alternatives: ['faire-défiler'], normalized: 'scroll' },
    push: { primary: 'pousser', normalized: 'push' },
    replace: { primary: 'remplacer', normalized: 'replace' },
    process: { primary: 'traiter', normalized: 'process' },
    wait: { primary: 'attendre', normalized: 'wait' },
    fetch: { primary: 'chercher', alternatives: ['récupérer'], normalized: 'fetch' },
    settle: { primary: 'stabiliser', normalized: 'settle' },
    if: { primary: 'si', normalized: 'if' },
    unless: { primary: 'saufsi', normalized: 'unless' },
    when: { primary: 'quand', normalized: 'when' },
    where: { primary: 'où', normalized: 'where' },
    else: { primary: 'sinon', normalized: 'else' },
    repeat: { primary: 'répéter', normalized: 'repeat' },
    for: { primary: 'pour', normalized: 'for' },
    while: { primary: 'pendant', normalized: 'while' },
    // `repeat forever` loop keyword — corpus word recognized so loopType types
    // as `:literal` like EN (the repeat.loopType R1 residue; see spanish.ts).
    forever: { primary: 'forever', normalized: 'forever' },
    continue: { primary: 'continuer', normalized: 'continue' },
    halt: { primary: 'arrêter', alternatives: ['stopper'], normalized: 'halt' },
    throw: { primary: 'lancer', normalized: 'throw' },
    call: { primary: 'appeler', normalized: 'call' },
    return: { primary: 'retourner', alternatives: ['renvoyer'], normalized: 'return' },
    then: { primary: 'puis', alternatives: ['ensuite', 'alors'], normalized: 'then' },
    and: { primary: 'et', alternatives: ['aussi', 'également'], normalized: 'and' },
    // Comparison operator (`target matches .x`). Without this keyword the surface
    // stays an identifier and leaks verbatim into the condition's raw expression,
    // which the core expression parser reads as English (modal-close-backdrop /
    // focus-trap drop their then-branch). Not an ActionType and has no command
    // schema, so no pattern is generated from it.
    matches: { primary: 'correspond', normalized: 'matches' },
    // Existence operator (`if #modal exists`). Same seam as `matches`: without the
    // keyword the surface stays an identifier and leaks verbatim into the
    // condition's raw expression (if-exists). Neither an ActionType nor a command
    // schema, so no pattern is generated from it.
    exists: { primary: 'existe', normalized: 'exists' },
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
    // `resize` event (window-resize): dict emits redimensionner; register it so the
    // event types as literal="resize" (matching en) instead of expression.
    resize: { primary: 'redimensionner', normalized: 'resize' },
    hover: { primary: 'survol', alternatives: ['survoler'], normalized: 'hover' },
    submit: { primary: 'soumission', alternatives: ['soumettre'], normalized: 'submit' },
    input: { primary: 'saisie', alternatives: ['entrée'], normalized: 'input' },
    // i18n dict emits the verb `changer` for `change` (profile primary is the noun
    // `changement`); recognize it so `on change` events type as a literal.
    change: { primary: 'changement', alternatives: ['modifier', 'changer'], normalized: 'change' },
    // i18n dict emits `charger` for `load`; without it `on load` events type as expression.
    load: { primary: 'charger', alternatives: ['chargement'], normalized: 'load' },
    // Event modifiers (for repeat until event)
    until: { primary: "jusqu'à", alternatives: ['jusque'], normalized: 'until' },
    event: { primary: 'événement', normalized: 'event' },
    from: { primary: 'de', alternatives: ['depuis'], normalized: 'from' },
    // Phase 8 (htmx v4 localized attributes): attribute-suffix keywords
    // used by the vocab generator — `sse-connecter`, `hx-en-direct`, etc.
    connect: { primary: 'connecter', alternatives: ['connexion'], normalized: 'connect' },
    stream: { primary: 'flux', alternatives: ['streaming'], normalized: 'stream' },
    live: { primary: 'en-direct', alternatives: ['direct', 'vif'], normalized: 'live' },
    socket: { primary: 'socket', alternatives: ['websocket'], normalized: 'socket' },
    // Reactive / realtime commands
    bind: { primary: 'lier', alternatives: ['relier', 'bind'], normalized: 'bind' },
    intercept: { primary: 'intercepter', alternatives: ['intercept'], normalized: 'intercept' },
    worker: { primary: 'travailleur', alternatives: ['worker'], normalized: 'worker' },
    eventsource: {
      primary: 'eventsource',
      alternatives: ['source-d-evenements'],
      normalized: 'eventsource',
    },
  },
  eventHandler: {
    keyword: { primary: 'sur', alternatives: ['lors'], normalized: 'on' },
    sourceMarker: { primary: 'de', alternatives: ['depuis'], position: 'before' },
    conditionalKeyword: { primary: 'quand', alternatives: ['lorsque'] },
    // Event marker: au (at/upon), used in SVO pattern
    // Pattern: au [event] [verb] [patient] sur [destination?]
    // Example: au clic basculer .active sur #button
    // + the eventHandler.keyword word the i18n transformer actually emits —
    // without it every generated fused `<cmd>-event-*-vso` pattern was dead
    // (the swap/if recovery split, #346/#351)
    eventMarker: { primary: 'au', alternatives: ['lors du', 'lors de', 'sur'], position: 'before' },
    temporalMarkers: ['quand', 'lorsque'], // temporal conjunctions (when)
  },
};
