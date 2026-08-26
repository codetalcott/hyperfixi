/**
 * Spanish Language Profile
 *
 * SVO word order, prepositions, space-separated.
 * Features rich verb conjugation with pro-drop (subject omission).
 */

import type { LanguageProfile } from './types';

export const spanishProfile: LanguageProfile = {
  code: 'es',
  name: 'Spanish',
  nativeName: 'Español',
  regions: ['western', 'priority'],
  direction: 'ltr',
  script: 'latin',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  // Infinitive is standard for Spanish software UI (Guardar, Cancelar, Abrir)
  // This matches macOS, Windows, and web app conventions
  defaultVerbForm: 'infinitive',
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  references: {
    me: 'yo', // "I/me" (mí, mi are alternatives handled in possessive)
    it: 'ello', // "it"
    you: 'tú', // "you"
    result: 'resultado',
    event: 'evento',
    target: 'objetivo', // destino is a synonym
    body: 'cuerpo',
    document: 'documento',
    window: 'ventana',
    detail: 'detalle',
  },
  possessive: {
    marker: 'de', // Spanish uses "de" for general possession
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'mi', // "my" (possessive adjective)
      it: 'su', // "its"
      you: 'tu', // "your"
    },
    keywords: {
      mi: 'me', // Also accepts mí (with accent)
      tu: 'you',
      su: 'it',
    },
  },
  roleMarkers: {
    // `hacia` is the i18n grammar's optional destination render form ("towards");
    // without it here a rendered/user `hacia` clause silently dropped the
    // destination (add → default `me`, put → null parse). Vocab Batch 1 (V2+V4).
    destination: { primary: 'en', alternatives: ['sobre', 'a', 'hacia'], position: 'before' },
    source: { primary: 'de', alternatives: ['desde'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'con', position: 'before' },
  },
  // Imperative command forms are accepted on INPUT only — `primary` stays the
  // dictionary form, so rendering is unchanged (see LanguageProfile.defaultVerbForm:
  // infinitive is the industry standard for UI localization). Hyperscript is a
  // command language, though, and a native speaker giving a command writes the
  // imperative, so the parser should read it.
  //
  // Only the IRREGULARS are listed. The regular ones reach their keyword through
  // the morphological normalizer's stem (see spanish-keyword.ts and siblings),
  // which also covers conjugations nobody enumerated here.
  keywords: {
    // Class/Attribute operations
    toggle: { primary: 'alternar', alternatives: ['conmutar', 'toggle'], normalized: 'toggle' },
    add: { primary: 'agregar', alternatives: ['añadir'], normalized: 'add' },
    remove: {
      primary: 'quitar',
      alternatives: ['eliminar', 'remover', 'sacar', 'borrar'],
      normalized: 'remove',
    },
    // Content operations
    put: { primary: 'poner', alternatives: ['colocar', 'pon'], normalized: 'put' },
    append: { primary: 'anexar', normalized: 'append' },
    prepend: { primary: 'anteponer', normalized: 'prepend' },
    take: { primary: 'tomar', normalized: 'take' },
    make: { primary: 'hacer', alternatives: ['crear'], normalized: 'make' },
    clone: { primary: 'clonar', alternatives: ['duplicar'], normalized: 'clone' },
    swap: { primary: 'intercambiar', alternatives: ['permutar'], normalized: 'swap' },
    morph: { primary: 'transformar', alternatives: ['convertir'], normalized: 'morph' },
    // Variable operations
    set: {
      primary: 'establecer',
      alternatives: ['fijar', 'definir', 'establece'],
      normalized: 'set',
    },
    get: { primary: 'obtener', alternatives: ['conseguir', 'obtén'], normalized: 'get' },
    increment: { primary: 'incrementar', alternatives: ['aumentar'], normalized: 'increment' },
    decrement: { primary: 'decrementar', alternatives: ['disminuir'], normalized: 'decrement' },
    log: { primary: 'registrar', alternatives: ['imprimir'], normalized: 'log' },
    // Visibility
    show: { primary: 'mostrar', alternatives: ['enseñar', 'muestra'], normalized: 'show' },
    hide: { primary: 'ocultar', alternatives: ['esconder'], normalized: 'hide' },
    transition: { primary: 'transición', alternatives: ['animar'], normalized: 'transition' },
    // Events
    on: { primary: 'en', alternatives: ['al'], normalized: 'on' },
    trigger: { primary: 'disparar', alternatives: ['activar'], normalized: 'trigger' },
    send: { primary: 'enviar', alternatives: ['envía'], normalized: 'send' },
    // DOM focus
    // Nominalized 2026-07-28: an infinitive reads as a command to the browser,
    // an event names an occurrence. Both spellings already shipped; this is an
    // ordering fix.
    focus: { primary: 'enfoque', alternatives: ['enfocar'], normalized: 'focus' },
    // 'pérdida de foco' rather than 'desenfoque', DEPARTING from the Spanish
    // review, which endorsed 'desenfoque'. The parallel Portuguese review
    // rejected the exact cognate 'desfoque' because in front-end usage it names
    // the CSS visual blur — and that is the same false friend already found in
    // ja 'ぼかし', ko '블러' and de 'defokussieren'. Spanish 'desenfoque' is
    // likewise the photographic sense (desenfoque gaussiano). The Spanish review
    // itself records 'pérdida de foco' as attested for the event. Both older
    // spellings stay as parse alternatives.
    blur: {
      primary: 'pérdida de foco',
      alternatives: ['perdida de foco', 'desenfoque', 'desenfocar'],
      normalized: 'blur',
    },
    // Phase 1 (v0.9.90): DOM / form state / debug
    open: { primary: 'abrir', normalized: 'open' },
    close: { primary: 'cerrar', normalized: 'close' },
    select: { primary: 'seleccionar', normalized: 'select' },
    clear: { primary: 'limpiar', normalized: 'clear' },
    reset: { primary: 'reiniciar', alternatives: ['restablecer'], normalized: 'reset' },
    breakpoint: {
      primary: 'punto-interrupción',
      alternatives: ['punto-interrupcion'],
      normalized: 'breakpoint',
    },
    // Common event names (for event handler patterns)
    click: { primary: 'clic', alternatives: ['hacer clic', 'click'], normalized: 'click' },
    // `resize` event (window-resize): dict emits redimensionar; register it so the
    // event types as literal="resize" (matching en) instead of expression.
    // Lookup folds case and separators but NOT accents (verified against the
    // runtime), so every accented form needs its plain-ASCII twin registered —
    // the same reason 'raton abajo' has always sat beside 'ratón abajo'. It
    // matters most here: these are legal in an `al-…` attribute name only if
    // the author can type ñ/é into one.
    resize: {
      primary: 'cambio de tamaño',
      alternatives: ['cambio de tamano', 'redimensionar'],
      normalized: 'resize',
    },
    hover: { primary: 'sobrevolar', alternatives: ['pasar por encima'], normalized: 'hover' },
    submit: { primary: 'envío', alternatives: ['envio', 'someter'], normalized: 'submit' },
    input: { primary: 'entrada', alternatives: ['introducir'], normalized: 'input' },
    change: { primary: 'cambio', alternatives: ['cambiar'], normalized: 'change' },
    // i18n dict emits the verb `cargar` for `load` (profile primary is the noun
    // `carga`); recognize it so `on load` events type as a literal, not expression.
    load: { primary: 'carga', alternatives: ['cargar'], normalized: 'load' },
    scroll: { primary: 'desplazamiento', alternatives: ['desplazar'], normalized: 'scroll' },
    // 'abajo'/'arriba' calqued the English spatial down/up — in Spanish they say
    // the key is physically below, which describes nothing about a switch being
    // actuated. Spanish teaching material says "cuando se presiona una tecla" /
    // "cuando una tecla pulsada se suelta". 'pulsar' is peninsular and
    // 'presionar' Latin American, so both ship; the spatial forms stay parseable.
    keydown: {
      primary: 'tecla pulsada',
      alternatives: ['tecla presionada', 'tecla abajo'],
      normalized: 'keydown',
    },
    keyup: {
      primary: 'tecla soltada',
      alternatives: ['tecla liberada', 'tecla arriba'],
      normalized: 'keyup',
    },
    // 'mouse' is the Latin American word for the device (RAE's Diccionario
    // panhispánico notes 'ratón' dominates in Spain, 'mouse' in the Americas),
    // so every ratón-* form gets a mouse-* alias.
    mouseover: {
      primary: 'ratón encima',
      alternatives: ['raton encima', 'mouse encima'],
      normalized: 'mouseover',
    },
    mouseout: {
      primary: 'ratón fuera',
      alternatives: ['raton fuera', 'mouse fuera'],
      normalized: 'mouseout',
    },
    // mousedown/mouseup (repeat-until-event): dict emits the spaced forms —
    // register so both the on.event and the repeat until-event type as literal.
    //
    // The 2026-05-23 split un-fused 'ratónabajo' but kept the spatial calque;
    // 2026-07-28 finished the job. 'ratón abajo' says the mouse is positioned
    // below, which is not what the event reports — the button is being pressed.
    // Now parallel to the keyboard pair above and to pt 'mouse pressionado'.
    // Every superseded spelling still parses.
    mousedown: {
      primary: 'ratón pulsado',
      alternatives: [
        'raton pulsado',
        'mouse presionado',
        'ratón abajo',
        'raton abajo',
        'ratónabajo',
      ],
      normalized: 'mousedown',
    },
    mouseup: {
      primary: 'ratón soltado',
      alternatives: [
        'raton soltado',
        'mouse soltado',
        'ratón arriba',
        'raton arriba',
        'ratónarriba',
      ],
      normalized: 'mouseup',
    },
    // Navigation
    go: { primary: 'ir', alternatives: ['navegar', 've'], normalized: 'go' },
    push: { primary: 'empujar', alternatives: ['push'], normalized: 'push' },
    replace: { primary: 'reemplazar', alternatives: ['sustituir'], normalized: 'replace' },
    process: { primary: 'procesar', normalized: 'process' },
    // Async
    wait: { primary: 'esperar', normalized: 'wait' },
    fetch: { primary: 'buscar', alternatives: ['recuperar'], normalized: 'fetch' },
    settle: { primary: 'estabilizar', normalized: 'settle' },
    // Control flow
    if: { primary: 'si', normalized: 'if' },
    unless: { primary: 'menos', alternatives: ['a menos que', 'salvo'], normalized: 'unless' },
    when: { primary: 'cuando', normalized: 'when' },
    where: { primary: 'donde', normalized: 'where' },
    else: { primary: 'sino', alternatives: ['de lo contrario'], normalized: 'else' },
    repeat: { primary: 'repetir', normalized: 'repeat' },
    for: { primary: 'para', normalized: 'for' },
    while: { primary: 'mientras', normalized: 'while' },
    // `repeat forever` loop keyword. The i18n dict never translated `forever`, so the
    // corpus leaves it English (`repetir forever`) — the bare word then typed
    // `loopType:expression` (SVO) / `loopType:reference` (SOV) instead of EN's
    // `:literal` (the repeat.loopType R1 residue). Recognizing the English form the
    // corpus carries lets the generated repeat pattern type it as a literal, matching
    // EN. (Native translation belongs to a separate i18n-dict pass; until then the
    // corpus word IS the English one, so that is the primary here.)
    forever: { primary: 'forever', normalized: 'forever' },
    continue: { primary: 'continuar', normalized: 'continue' },
    halt: { primary: 'detener', alternatives: ['parar'], normalized: 'halt' },
    throw: { primary: 'lanzar', alternatives: ['arrojar'], normalized: 'throw' },
    call: { primary: 'llamar', normalized: 'call' },
    return: { primary: 'retornar', alternatives: ['devolver'], normalized: 'return' },
    then: { primary: 'entonces', alternatives: ['luego'], normalized: 'then' },
    and: { primary: 'y', alternatives: ['además', 'también'], normalized: 'and' },
    or: { primary: 'o', normalized: 'or' },
    not: { primary: 'no', normalized: 'not' },
    is: { primary: 'es', normalized: 'is' },
    exists: { primary: 'existe', normalized: 'exists' },
    empty: { primary: 'vacío', alternatives: ['vacio'], normalized: 'empty' },
    // Comparison operator (`target matches .x`). Without this keyword the surface
    // stays an identifier and leaks verbatim into the condition's raw expression,
    // which the core expression parser reads as English (modal-close-backdrop /
    // focus-trap drop their then-branch). Not an ActionType and has no command
    // schema, so no pattern is generated from it.
    matches: { primary: 'coincide', normalized: 'matches' },
    // Negative-existence operator (`if no dragHandle set dragHandle to me`). Same
    // seam as `exists`: without the keyword the surface stays an identifier and
    // leaks verbatim into the condition's raw expression (behavior-draggable).
    // Neither an ActionType nor a command schema, so no pattern is generated from it.
    // Does NOT collide with `not: { primary: 'no' }`: the keyword map is keyed by
    // SURFACE, so this registers `ningún` and leaves the `no` surface untouched.
    no: { primary: 'ningún', normalized: 'no' },
    end: { primary: 'fin', alternatives: ['final', 'terminar'], normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'asíncrono', alternatives: ['asincrono'], normalized: 'async' },
    tell: { primary: 'decir', normalized: 'tell' },
    default: { primary: 'predeterminar', alternatives: ['por defecto'], normalized: 'default' },
    init: {
      primary: 'inicio',
      alternatives: ['inicialización', 'iniciar', 'inicializar'],
      normalized: 'init',
    },
    behavior: { primary: 'comportamiento', normalized: 'behavior' },
    install: { primary: 'instalar', normalized: 'install' },
    measure: { primary: 'medir', normalized: 'measure' },
    beep: { primary: 'pitido', normalized: 'beep' },
    break: { primary: 'romper', normalized: 'break' },
    copy: { primary: 'copiar', normalized: 'copy' },
    exit: { primary: 'salir', normalized: 'exit' },
    pick: { primary: 'escoger', normalized: 'pick' },
    render: { primary: 'renderizar', normalized: 'render' },
    // Positional expressions
    first: { primary: 'primero', alternatives: ['primera'], normalized: 'first' },
    last: { primary: 'último', alternatives: ['ultima'], normalized: 'last' },
    next: { primary: 'siguiente', normalized: 'next' },
    previous: { primary: 'anterior', normalized: 'previous' },
    closest: { primary: 'cercano', normalized: 'closest' },
    parent: { primary: 'padre', normalized: 'parent' },
    // Modifiers
    into: { primary: 'dentro', alternatives: ['adentro', 'dentro de'], normalized: 'into' },
    before: { primary: 'antes', alternatives: ['antes de'], normalized: 'before' },
    after: {
      primary: 'después',
      alternatives: ['despues', 'después de', 'despues de'],
      normalized: 'after',
    },
    out: { primary: 'fuera', alternatives: ['fuera de'], normalized: 'out' },
    // Event modifiers (for repeat until event)
    until: { primary: 'hasta', alternatives: ['hasta que'], normalized: 'until' },
    event: { primary: 'evento', normalized: 'event' },
    from: { primary: 'de', alternatives: ['desde'], normalized: 'from' },
    // Phase 8 (htmx v4 localized attributes): attribute-suffix keywords
    // used by the vocab generator — `sse-conectar`, `hx-en-vivo`, etc.
    connect: { primary: 'conectar', alternatives: ['conectarse'], normalized: 'connect' },
    stream: { primary: 'transmitir', alternatives: ['flujo'], normalized: 'stream' },
    live: { primary: 'en-vivo', alternatives: ['vivo', 'directo'], normalized: 'live' },
    socket: { primary: 'socket', alternatives: ['websocket'], normalized: 'socket' },
    // Reactive / realtime commands
    bind: { primary: 'vincular', alternatives: ['enlazar', 'bind'], normalized: 'bind' },
    intercept: { primary: 'interceptar', alternatives: ['intercept'], normalized: 'intercept' },
    worker: { primary: 'trabajador', alternatives: ['worker'], normalized: 'worker' },
    eventsource: {
      primary: 'eventsource',
      alternatives: ['fuente-de-eventos'],
      normalized: 'eventsource',
    },
  },
  eventHandler: {
    keyword: { primary: 'al', alternatives: ['cuando', 'en'], normalized: 'on' },
    sourceMarker: { primary: 'de', alternatives: ['desde'], position: 'before' },
    // Event marker: al (when), used in SVO pattern
    // Pattern: al [event] [verb] [patient] en [destination?]
    // Example: al clic alternar .active en #button
    // + the eventHandler.keyword word the i18n transformer actually emits —
    // without it every generated fused `<cmd>-event-*-vso` pattern was dead
    // (the swap/if recovery split, #346/#351)
    eventMarker: { primary: 'al', alternatives: ['cuando', 'en'], position: 'before' },
    temporalMarkers: ['cuando', 'al'], // temporal conjunctions (when)
  },
  lexicon: {
    events: {
      blur: { primary: 'desenfocar' },
      change: { primary: 'cambiar' },
      click: { primary: 'clic' },
      dblclick: { primary: 'dobleclic' },
      focus: { primary: 'enfocar' },
      input: { primary: 'entrada' },
      keydown: { primary: 'tecla abajo' },
      keypress: { primary: 'teclapresar' },
      keyup: { primary: 'tecla arriba' },
      load: { primary: 'cargar' },
      mousedown: { primary: 'ratón abajo' },
      mouseenter: { primary: 'ratónentrar' },
      mouseleave: { primary: 'ratónsalir' },
      mousemove: { primary: 'ratónmover' },
      mouseout: { primary: 'ratón fuera' },
      mouseover: { primary: 'ratón encima' },
      mouseup: { primary: 'ratón arriba' },
      reset: { primary: 'reiniciar' },
      resize: { primary: 'redimensionar' },
      scroll: { primary: 'desplazar' },
      submit: { primary: 'envío' },
      touchcancel: { primary: 'toquecancelar' },
      touchend: { primary: 'toqueterminar' },
      touchmove: { primary: 'toquemover' },
      touchstart: { primary: 'toqueempezar' },
      unload: { primary: 'descargar' },
    },
    logical: {
      and: { primary: 'y' },
      changes: { primary: 'cambia' },
      contains: { primary: 'contiene' },
      else: { primary: 'sino' },
      end: { primary: 'fin' },
      equals: { primary: 'iguala' },
      exists: { primary: 'existe' },
      has: { primary: 'tiene' },
      have: { primary: 'tengo' },
      includes: { primary: 'incluye' },
      is: { primary: 'es' },
      live: { primary: 'vivo' },
      matches: { primary: 'coincide' },
      not: { primary: 'no' },
      or: { primary: 'o' },
      otherwise: { primary: 'delocontrario' },
      then: { primary: 'entonces' },
      when: { primary: 'cuando' },
      where: { primary: 'donde' },
    },
    temporal: {
      h: { primary: 'h' },
      hour: { primary: 'hora' },
      hours: { primary: 'horas' },
      millisecond: { primary: 'milisegundo' },
      milliseconds: { primary: 'milisegundos' },
      min: { primary: 'min' },
      minute: { primary: 'minuto' },
      minutes: { primary: 'minutos' },
      ms: { primary: 'ms' },
      s: { primary: 's' },
      second: { primary: 'segundo' },
      seconds: { primary: 'segundos' },
    },
    values: {
      body: { primary: 'cuerpo' },
      detail: { primary: 'detalle' },
      document: { primary: 'documento' },
      element: { primary: 'elemento' },
      event: { primary: 'evento' },
      false: { primary: 'falso' },
      it: { primary: 'ello' },
      its: { primary: 'su' },
      me: { primary: 'yo' },
      my: { primary: 'mi' },
      myself: { primary: 'yo mismo' },
      null: { primary: 'nulo' },
      result: { primary: 'resultado' },
      target: { primary: 'objetivo' },
      true: { primary: 'verdadero' },
      undefined: { primary: 'indefinido' },
      value: { primary: 'valor' },
      window: { primary: 'ventana' },
      you: { primary: 'tu' },
      your: { primary: 'tu' },
      yourself: { primary: 'ti mismo' },
    },
    attributes: {
      attribute: { primary: 'atributo' },
      attributes: { primary: 'atributos' },
      class: { primary: 'clase' },
      classes: { primary: 'clases' },
      properties: { primary: 'propiedades' },
      property: { primary: 'propiedad' },
      style: { primary: 'estilo' },
      styles: { primary: 'estilos' },
    },
    expressions: {
      at: { primary: 'en' },
      characters: { primary: 'caracteres' },
      children: { primary: 'hijos' },
      closest: { primary: 'cercano' },
      empty: { primary: 'vacío' },
      'ends with': { primary: 'termina con' },
      exclusive: { primary: 'exclusivo' },
      first: { primary: 'primero' },
      'ignoring case': { primary: 'ignorando mayúsculas' },
      inclusive: { primary: 'inclusivo' },
      'joined by': { primary: 'unido por' },
      last: { primary: 'último' },
      'mapped to': { primary: 'transformado a' },
      next: { primary: 'siguiente' },
      no: { primary: 'ningún' },
      parent: { primary: 'padre' },
      prev: { primary: 'ant' },
      previous: { primary: 'anterior' },
      random: { primary: 'aleatorio' },
      some: { primary: 'algún' },
      'sorted by': { primary: 'ordenado por' },
      'split by': { primary: 'dividido por' },
      'starts with': { primary: 'empieza con' },
      within: { primary: 'dentro' },
    },
  },
};
