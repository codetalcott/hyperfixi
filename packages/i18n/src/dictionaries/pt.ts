// packages/i18n/src/dictionaries/pt.ts

import { Dictionary } from '../types';

/**
 * Portuguese (Português) dictionary for hyperscript keywords.
 *
 * Portuguese is a Romance language with high mutual intelligibility
 * with Spanish. This enables direct translation between the two languages
 * without going through English as a pivot.
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
    unless: 'a menos',
    repeat: 'repetir',
    for: 'para',
    while: 'enquanto',
    until: 'até',
    continue: 'continuar',
    break: 'parar',
    halt: 'parar',

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
  },

  modifiers: {
    to: 'para',
    from: 'de',
    into: 'em',
    with: 'com',
    as: 'como',
    by: 'por',
    at: 'em',
    in: 'em',
    over: 'sobre',
    within: 'dentro',
    then: 'então',
    else: 'senão',
    end: 'fim',
  },

  events: {
    click: 'clique',
    change: 'mudança',
    input: 'entrada',
    submit: 'envio',
    load: 'carregar',
    focus: 'foco',
    blur: 'desfoque',
    keydown: 'teclaAbaixo',
    keyup: 'teclaAcima',
    keypress: 'teclaPressionada',
    mouseenter: 'mouseEntrar',
    mouseleave: 'mouseSair',
    mouseover: 'mouseSobre',
    mouseout: 'mouseFora',
    scroll: 'rolar',
    resize: 'redimensionar',
    dblclick: 'duploClique',
    contextmenu: 'menuContexto',
    touchstart: 'toqueInício',
    touchend: 'toqueFim',
    touchmove: 'toqueMover',
  },

  logical: {
    true: 'verdadeiro',
    false: 'falso',
    and: 'e',
    or: 'ou',
    not: 'não',
    is: 'é',
    exists: 'existe',
    matches: 'corresponde',
    contains: 'contém',
    includes: 'inclui',
    equals: 'igual',
    greater: 'maior',
    less: 'menor',
    than: 'que',
  },

  temporal: {
    seconds: 'segundos',
    second: 'segundo',
    milliseconds: 'milissegundos',
    millisecond: 'milissegundo',
    ms: 'ms',
    s: 's',
    minutes: 'minutos',
    minute: 'minuto',
    hours: 'horas',
    hour: 'hora',
    days: 'dias',
    day: 'dia',
    after: 'depois',
    before: 'antes',
    every: 'cada',
  },

  values: {
    null: 'nulo',
    undefined: 'indefinido',
    empty: 'vazio',
    nothing: 'nada',
    none: 'nenhum',
    first: 'primeiro',
    last: 'último',
    next: 'próximo',
    previous: 'anterior',
    random: 'aleatório',
    result: 'resultado',
    it: 'isso',
    its: 'seu',
    me: 'eu',
    my: 'meu',
    you: 'você',
    your: 'seu',
  },

  attributes: {
    class: 'classe',
    style: 'estilo',
    id: 'id',
    value: 'valor',
    text: 'texto',
    html: 'html',
    innerHTML: 'htmlInterno',
    outerHTML: 'htmlExterno',
    textContent: 'conteúdoTexto',
    disabled: 'desabilitado',
    hidden: 'oculto',
    checked: 'marcado',
    selected: 'selecionado',
    readonly: 'somenteleitura',
    required: 'obrigatório',
    placeholder: 'marcador',
    href: 'href',
    src: 'src',
    alt: 'alt',
    title: 'título',
    name: 'nome',
    type: 'tipo',
    width: 'largura',
    height: 'altura',
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
    closest: 'mais próximo',
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
