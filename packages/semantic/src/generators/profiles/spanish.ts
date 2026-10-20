/**
 * Spanish Language Profile
 *
 * SVO word order, prepositions, space-separated.
 * Features rich verb conjugation with pro-drop (subject omission).
 */

import { spanishGrammar } from '@lokascript/framework/languages/es';
import type { LanguageProfile } from './types';
import { withGrammar } from '../with-grammar';

// Word order, role markers, script: @lokascript/framework/languages/es.
export const spanishProfile: LanguageProfile = /* @__PURE__ */ withGrammar(spanishGrammar, {
  regions: ['western', 'priority'],
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
  // The object pronoun attached to the infinitive (M2 N3, wave 3): `mostrarme`,
  // `ponerlo`. Listed in NATIVE_REVIEW_NEEDED.md.
  objectClitics: { forms: { me: 'me', it: 'lo' }, attach: 'infinitive' },
  // `me` next to a marker, in the case the marker takes (M2 N3; listed in
  // NATIVE_REVIEW_NEEDED.md).
  obliqueReferences: {
    me: {
      en: 'en mí',
      a: 'a mí',
      de: 'de mí',
      desde: 'desde mí',
    },
  },
  possessive: {
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
    // These entries are the COMMANDS, so they write the verb (`enfocarme`, the
    // object pronoun attached: M2 N3); the event names render from
    // eventNameTranslations (`al enfoque`, `al desenfoque`). The nouns were made
    // primary on 2026-07-28 for the event ("an event names an occurrence"), which
    // this table never rendered, and the command then wrote `enfoque yo`. They
    // stay alternatives, so code written with them reads.
    // 'pérdida de foco' is the Spanish review's word for the EVENT (it rejected
    // 'desenfoque', the photographic and CSS-filter sense, as the Portuguese
    // review rejected 'desfoque'); a noun phrase takes no object, so the command
    // writes the verb, which has English `blur`'s own ambiguity.
    focus: { primary: 'enfocar', alternatives: ['enfoque'], normalized: 'focus' },
    blur: {
      primary: 'desenfocar',
      alternatives: ['pérdida de foco', 'perdida de foco', 'desenfoque'],
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
    // Reactive `when <expr> changes` trigger word — synced VERBATIM from the i18n
    // dictionary (`changes`), which is what wrote every stored corpus row; the V1
    // vocab gate requires the two surfaces to agree. Native review pending — see
    // NATIVE_REVIEW_NEEDED.md § "Reactive `when … changes`".
    changes: { primary: 'cambia', normalized: 'changes' },
    where: { primary: 'donde', normalized: 'where' },
    else: { primary: 'sino', alternatives: ['de lo contrario'], normalized: 'else' },
    repeat: { primary: 'repetir', normalized: 'repeat' },
    for: { primary: 'para', normalized: 'for' },
    while: { primary: 'mientras', normalized: 'while' },
    // `repeat forever` loop keyword. As a keyword the word types as
    // `loopType:literal`, matching EN (an unknown word typed `:expression` in SVO,
    // `:reference` in SOV: the repeat.loopType R1 residue). The language's own word
    // since M2 (V1, 2026-10-10); the reader still takes English's.
    forever: { primary: 'siempre', normalized: 'forever', alternatives: ['forever'] },
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
    ask: { primary: 'preguntar', normalized: 'ask' },
    answer: { primary: 'responder', normalized: 'answer' },
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
});
