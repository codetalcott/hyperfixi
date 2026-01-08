// packages/i18n/src/dictionaries/fr.ts

import { Dictionary } from '../types';

export const fr: Dictionary = {
  commands: {
    // Event handling
    on: 'sur',
    tell: 'dire',
    trigger: 'déclencher',
    send: 'envoyer',
    
    // DOM manipulation
    take: 'prendre',
    put: 'mettre',
    set: 'définir',
    get: 'obtenir',
    add: 'ajouter',
    remove: 'supprimer',
    toggle: 'basculer',
    hide: 'cacher',
    show: 'montrer',
    
    // Control flow
    if: 'si',
    unless: 'saufsi',
    repeat: 'répéter',
    for: 'pour',
    while: 'tantque',
    until: 'jusquà',
    continue: 'continuer',
    break: 'arrêter',
    halt: 'stopper',
    
    // Async
    wait: 'attendre',
    fetch: 'récupérer',
    call: 'appeler',
    return: 'retourner',
    
    // Other commands
    make: 'créer',
    log: 'enregistrer',
    throw: 'lancer',
    catch: 'attraper',
    measure: 'mesurer',
    transition: 'transition',

    // Data Commands
    increment: 'incrémenter',
    decrement: 'décrémenter',
    bind: 'lier',
    default: 'défaut',
    persist: 'persister',

    // Navigation Commands
    go: 'aller',
    pushUrl: 'pousserUrl',
    replaceUrl: 'remplacerUrl',

    // Utility Commands
    copy: 'copier',
    pick: 'choisir',
    beep: 'bip',

    // Advanced Commands
    js: 'js',
    async: 'asynchrone',
    render: 'rendu',

    // Animation Commands
    swap: 'échanger',
    morph: 'transformer',
    settle: 'stabiliser',

    // Content Commands
    append: 'ajouter',

    // Control Flow
    exit: 'sortir',

    // Behaviors
    install: 'installer',
  },
  
  modifiers: {
    to: 'à',
    from: 'de',
    into: 'dans',
    with: 'avec',
    at: 'à',
    in: 'en',
    of: 'de',
    as: 'comme',
    by: 'par',
    before: 'avant',
    after: 'après',
    over: 'sur',
    under: 'sous',
    between: 'entre',
    through: 'à travers',
    without: 'sans',
  },
  
  events: {
    click: 'clic',
    dblclick: 'doubleclic',
    mousedown: 'sourisappuyée',
    mouseup: 'sourisrelâchée',
    mouseenter: 'sourisentrer',
    mouseleave: 'sourissortir',
    mouseover: 'sourissur',
    mouseout: 'sourisdehors',
    mousemove: 'sourisbouger',
    
    keydown: 'toucheappuyée',
    keyup: 'toucherelâchée',
    keypress: 'touchepressée',
    
    focus: 'focus',
    blur: 'flou',
    change: 'changer',
    input: 'saisie',
    submit: 'soumettre',
    reset: 'réinitialiser',
    
    load: 'charger',
    unload: 'décharger',
    resize: 'redimensionner',
    scroll: 'défiler',
    
    touchstart: 'touchercommencer',
    touchend: 'toucherfin',
    touchmove: 'toucherbouger',
    touchcancel: 'toucherannuler',
  },
  
  logical: {
    when: 'TODO',
    where: 'TODO',
    and: 'et',
    or: 'ou',
    not: 'non',
    is: 'est',
    exists: 'existe',
    matches: 'correspond',
    contains: 'contient',
    includes: 'inclut',
    equals: 'égale',
    then: 'alors',
    else: 'sinon',
    otherwise: 'autrement',
    end: 'fin',
  },
  
  temporal: {
    seconds: 'secondes',
    second: 'seconde',
    milliseconds: 'millisecondes',
    millisecond: 'milliseconde',
    minutes: 'minutes',
    minute: 'minute',
    hours: 'heures',
    hour: 'heure',
    ms: 'ms',
    s: 's',
    min: 'min',
    h: 'h',
  },
  
  values: {
    true: 'vrai',
    false: 'faux',
    null: 'nul',
    undefined: 'indéfini',
    it: 'ça',
    its: 'son',
    me: 'moi',
    my: 'mon',
    you: 'tu',
    your: 'ton',
    yourself: 'toi-même', // REVIEW: native speaker
    myself: 'moi-même',
    element: 'élément',
    target: 'cible',
    detail: 'détail',
    event: 'événement',
    window: 'fenêtre',
    document: 'document',
    body: 'corps',
    result: 'résultat',
    value: 'valeur',
  },
  
  attributes: {
    class: 'classe',
    classes: 'classes',
    style: 'style',
    styles: 'styles',
    attribute: 'attribut',
    attributes: 'attributs',
    property: 'propriété',
    properties: 'propriétés',
  },

  expressions: {
    // Positional
    first: 'premier',
    last: 'dernier',
    next: 'suivant',
    previous: 'précédent',
    prev: 'préc',
    at: 'à',
    random: 'aléatoire',

    // DOM Traversal
    closest: 'plusproche',
    parent: 'parent',
    children: 'enfants',
    within: 'dans',

    // Emptiness/Existence
    no: 'aucun',
    empty: 'vide',
    some: 'quelques',

    // String operations
    'starts with': 'commence par',
    'ends with': 'finit par',
  },
};