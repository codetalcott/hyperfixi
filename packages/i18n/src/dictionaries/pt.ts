// packages/i18n/src/dictionaries/pt.ts

import { Dictionary } from '../types';

/**
 * Portuguese (Português) dictionary for hyperscript keywords.
 * Brazilian Portuguese variant.
 */
export const pt: Dictionary = {
  commands: {
    // Event handling
    on: 'em',
    tell: 'dizer',
    trigger: 'disparar',
    send: 'enviar',

    // DOM manipulation
    take: 'pegar',
    put: 'colocar',
    set: 'definir',
    get: 'obter',
    add: 'adicionar',
    remove: 'remover',
    toggle: 'alternar',
    hide: 'esconder',
    show: 'mostrar',

    // Control flow
    if: 'se',
    unless: 'a_menos', // REVIEW: native speaker - multi-word
    repeat: 'repetir',
    for: 'para',
    while: 'enquanto',
    until: 'até',
    continue: 'continuar',
    break: 'parar',
    halt: 'interromper',

    // Async
    wait: 'esperar',
    fetch: 'buscar',
    call: 'chamar',
    return: 'retornar',

    // Other commands
    make: 'fazer',
    log: 'registrar',
    throw: 'lançar',
    catch: 'capturar',
    measure: 'medir',
    transition: 'transição',

    // Data Commands
    increment: 'incrementar',
    decrement: 'decrementar',
    bind: 'vincular',
    default: 'padrão',
    persist: 'persistir',

    // Navigation Commands
    go: 'ir',
    pushUrl: 'pushUrl',
    replaceUrl: 'substituirUrl',

    // Utility Commands
    copy: 'copiar',
    pick: 'escolher',
    beep: 'apitar',

    // Advanced Commands
    js: 'js',
    async: 'assíncrono',
    render: 'renderizar',

    // Animation Commands
    swap: 'trocar',
    morph: 'transformar',
    settle: 'estabilizar',

    // Content Commands
    append: 'anexar',

    // Control Flow
    exit: 'sair',

    // Behaviors
    install: 'instalar',
  },

  modifiers: {
    to: 'para',
    from: 'de',
    into: 'em',
    with: 'com',
    at: 'em',
    in: 'dentro',
    of: 'de',
    as: 'como',
    by: 'por',
    before: 'antes',
    after: 'depois',
    over: 'sobre',
    under: 'sob',
    between: 'entre',
    through: 'através',
    without: 'sem',
  },

  events: {
    click: 'clique',
    dblclick: 'duploClique',
    mousedown: 'mouseBaixo',
    mouseup: 'mouseCima',
    mouseenter: 'mouseEntrar',
    mouseleave: 'mouseSair',
    mouseover: 'mouseSobre',
    mouseout: 'mouseFora',
    mousemove: 'mouseMover',

    keydown: 'teclaBaixo',
    keyup: 'teclaCima',
    keypress: 'teclaPressionar',

    focus: 'foco',
    blur: 'desfoque',
    change: 'mudança',
    input: 'entrada',
    submit: 'envio',
    reset: 'reiniciar',

    load: 'carregar',
    unload: 'descarregar',
    resize: 'redimensionar',
    scroll: 'rolar',

    touchstart: 'toqueInício',
    touchend: 'toqueFim',
    touchmove: 'toqueMover',
    touchcancel: 'toqueCancelar',
  },

  logical: {
    when: 'quando',
    where: 'onde',
    and: 'e',
    or: 'ou',
    not: 'não',
    is: 'é',
    exists: 'existe',
    matches: 'corresponde',
    contains: 'contém',
    includes: 'inclui',
    equals: 'igual',
    then: 'então',
    else: 'senão',
    otherwise: 'caso_contrário', // REVIEW: native speaker
    end: 'fim',
  },

  temporal: {
    seconds: 'segundos',
    second: 'segundo',
    milliseconds: 'milissegundos',
    millisecond: 'milissegundo',
    minutes: 'minutos',
    minute: 'minuto',
    hours: 'horas',
    hour: 'hora',
    ms: 'ms',
    s: 's',
    min: 'min',
    h: 'h',
  },

  values: {
    true: 'verdadeiro',
    false: 'falso',
    null: 'nulo',
    undefined: 'indefinido',
    it: 'isso',
    its: 'seu',
    me: 'eu',
    my: 'meu',
    myself: 'eu mesmo', // REVIEW: native speaker
    you: 'você',
    your: 'seu',
    yourself: 'você mesmo', // REVIEW: native speaker
    element: 'elemento',
    target: 'alvo',
    detail: 'detalhe',
    event: 'evento',
    window: 'janela',
    document: 'documento',
    body: 'corpo',
    result: 'resultado',
    value: 'valor',
  },

  attributes: {
    class: 'classe',
    classes: 'classes',
    style: 'estilo',
    styles: 'estilos',
    attribute: 'atributo',
    attributes: 'atributos',
    property: 'propriedade',
    properties: 'propriedades',
  },

  expressions: {
    // Positional
    first: 'primeiro',
    last: 'último',
    next: 'próximo',
    previous: 'anterior',
    prev: 'ant',
    at: 'em',
    random: 'aleatório',

    // DOM Traversal
    closest: 'mais_próximo', // REVIEW: native speaker - multi-word
    parent: 'pai',
    children: 'filhos',
    within: 'dentro',

    // Emptiness/Existence
    no: 'nenhum',
    empty: 'vazio',
    some: 'algum',

    // String operations
    'starts with': 'começa com',
    'ends with': 'termina com',
  },
};
