// packages/i18n/src/dictionaries/es.ts

import { Dictionary } from '../types';

export const es: Dictionary = {
  commands: {
    // Event handling
    on: 'en',
    tell: 'decir',
    trigger: 'disparar',
    send: 'enviar',
    
    // DOM manipulation
    take: 'tomar',
    put: 'poner',
    set: 'establecer',
    get: 'obtener',
    add: 'agregar',
    remove: 'quitar',
    toggle: 'alternar',
    hide: 'ocultar',
    show: 'mostrar',
    
    // Control flow
    if: 'si',
    unless: 'menos',
    repeat: 'repetir',
    for: 'para',
    while: 'mientras',
    until: 'hasta',
    continue: 'continuar',
    break: 'romper',
    halt: 'detener',
    
    // Async
    wait: 'esperar',
    fetch: 'buscar',
    call: 'llamar',
    return: 'retornar',
    
    // Other commands
    make: 'hacer',
    log: 'registrar',
    throw: 'lanzar',
    catch: 'atrapar',
    measure: 'medir',
    transition: 'transición',

    // Data Commands
    increment: 'incrementar',
    decrement: 'decrementar',
    bind: 'vincular',
    default: 'predeterminar',
    persist: 'persistir',

    // Navigation Commands
    go: 'ir',
    pushUrl: 'pushUrl',
    replaceUrl: 'reemplazarUrl',

    // Utility Commands
    copy: 'copiar',
    pick: 'escoger',
    beep: 'pitido',

    // Advanced Commands
    js: 'js',
    async: 'asíncrono',
    render: 'renderizar',

    // Animation Commands
    swap: 'intercambiar',
    morph: 'transformar',
    settle: 'estabilizar',

    // Content Commands
    append: 'añadir',

    // Control Flow
    exit: 'salir',

    // Behaviors
    install: 'instalar',
  },
  
  modifiers: {
    to: 'a',
    from: 'de',
    into: 'en',
    with: 'con',
    at: 'en',
    in: 'en',
    of: 'de',
    as: 'como',
    by: 'por',
    before: 'antes',
    after: 'después',
    over: 'sobre',
    under: 'bajo',
    between: 'entre',
    through: 'través',
    without: 'sin',
  },
  
  events: {
    click: 'clic',
    dblclick: 'dobleclic',
    mousedown: 'ratónabajo',
    mouseup: 'ratónarriba',
    mouseenter: 'ratónentrar',
    mouseleave: 'ratónsalir',
    mouseover: 'ratónencima',
    mouseout: 'ratónfuera',
    mousemove: 'ratónmover',
    
    keydown: 'teclaabajo',
    keyup: 'teclaarriba',
    keypress: 'teclapresar',
    
    focus: 'enfocar',
    blur: 'desenfocar',
    change: 'cambiar',
    input: 'entrada',
    submit: 'enviar',
    reset: 'reiniciar',
    
    load: 'cargar',
    unload: 'descargar',
    resize: 'redimensionar',
    scroll: 'desplazar',
    
    touchstart: 'toqueempezar',
    touchend: 'toqueterminar',
    touchmove: 'toquemover',
    touchcancel: 'toquecancelar',
  },
  
  logical: {
    when: 'TODO',
    where: 'TODO',
    and: 'y',
    or: 'o',
    not: 'no',
    is: 'es',
    exists: 'existe',
    matches: 'coincide',
    contains: 'contiene',
    includes: 'incluye',
    equals: 'iguala',
    then: 'entonces',
    else: 'sino',
    otherwise: 'delocontrario',
    end: 'fin',
  },
  
  temporal: {
    seconds: 'segundos',
    second: 'segundo',
    milliseconds: 'milisegundos',
    millisecond: 'milisegundo',
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
    true: 'verdadero',
    false: 'falso',
    null: 'nulo',
    undefined: 'indefinido',
    it: 'ello',
    its: 'su',
    me: 'yo',
    my: 'mi',
    you: 'tu',
    your: 'tu',
    yourself: 'ti mismo', // REVIEW: native speaker
    myself: 'yo mismo',
    element: 'elemento',
    target: 'objetivo',
    detail: 'detalle',
    event: 'evento',
    window: 'ventana',
    document: 'documento',
    body: 'cuerpo',
    result: 'resultado',
    value: 'valor',
  },
  
  attributes: {
    class: 'clase',
    classes: 'clases',
    style: 'estilo',
    styles: 'estilos',
    attribute: 'atributo',
    attributes: 'atributos',
    property: 'propiedad',
    properties: 'propiedades',
  },

  expressions: {
    // Positional
    first: 'primero',
    last: 'último',
    next: 'siguiente',
    previous: 'anterior',
    prev: 'ant',
    at: 'en',
    random: 'aleatorio',

    // DOM Traversal
    closest: 'máscercano',
    parent: 'padre',
    children: 'hijos',
    within: 'dentro',

    // Emptiness/Existence
    no: 'ningún',
    empty: 'vacío',
    some: 'algún',

    // String operations
    'starts with': 'empieza con',
    'ends with': 'termina con',
  },
};
