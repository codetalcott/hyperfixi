/**
 * Mexican Spanish Language Profile
 *
 * Regional variant of Spanish with Mexican vocabulary and expressions.
 * Inherits from base Spanish profile, overriding specific keywords.
 *
 * Key differences from base Spanish:
 * - Uses "ahorita" (Mexican diminutive of "ahora" for "wait/soon")
 * - Uses "jalar" (to pull) as alternative for "fetch"
 * - Uses "aventar" (to throw) instead of "lanzar"
 * - Uses "computadora" instead of "ordenador" (vocabulary difference)
 * - More informal alternatives common in Mexican software/web contexts
 */

import type { LanguageProfile } from './types';

export const spanishMexicoProfile: LanguageProfile = {
  code: 'es-MX',
  name: 'Spanish (Mexico)',
  nativeName: 'Español (México)',
  direction: 'ltr',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  defaultVerbForm: 'infinitive',
  extends: 'es', // Inherit from base Spanish

  verb: {
    position: 'start',
    subjectDrop: true,
  },
  references: {
    me: 'yo',
    it: 'ello',
    you: 'tú', // Mexico uses tú (not vos like Argentina)
    result: 'resultado',
    event: 'evento',
    target: 'objetivo',
    body: 'cuerpo',
  },
  possessive: {
    marker: 'de',
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'mi',
      it: 'su',
      you: 'tu',
    },
    keywords: {
      mi: 'me',
      tu: 'you',
      su: 'it',
    },
  },
  roleMarkers: {
    destination: { primary: 'en', alternatives: ['sobre', 'a'], position: 'before' },
    source: { primary: 'de', alternatives: ['desde'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'con', position: 'before' },
  },
  keywords: {
    // Class/Attribute operations - Mexican alternatives
    toggle: {
      primary: 'alternar',
      alternatives: ['cambiar', 'conmutar', 'switchear'], // "switchear" is Spanglish common in MX tech
      normalized: 'toggle',
    },
    add: { primary: 'agregar', alternatives: ['añadir', 'meter'], normalized: 'add' },
    remove: {
      primary: 'quitar',
      alternatives: ['eliminar', 'borrar', 'sacar'], // "borrar" more common in MX
      normalized: 'remove',
    },
    // Content operations
    put: { primary: 'poner', alternatives: ['colocar', 'meter'], normalized: 'put' },
    append: { primary: 'añadir', normalized: 'append' },
    prepend: { primary: 'anteponer', normalized: 'prepend' },
    take: { primary: 'tomar', alternatives: ['agarrar'], normalized: 'take' }, // "agarrar" more MX
    make: { primary: 'hacer', alternatives: ['crear'], normalized: 'make' },
    clone: { primary: 'clonar', alternatives: ['copiar'], normalized: 'clone' },
    swap: { primary: 'intercambiar', alternatives: ['cambiar'], normalized: 'swap' },
    morph: { primary: 'transformar', alternatives: ['convertir'], normalized: 'morph' },
    // Variable operations
    set: { primary: 'establecer', alternatives: ['fijar', 'definir', 'setear'], normalized: 'set' },
    get: { primary: 'obtener', alternatives: ['conseguir', 'jalar'], normalized: 'get' },
    increment: {
      primary: 'incrementar',
      alternatives: ['aumentar', 'subir'],
      normalized: 'increment',
    },
    decrement: {
      primary: 'decrementar',
      alternatives: ['disminuir', 'bajar'],
      normalized: 'decrement',
    },
    log: { primary: 'registrar', alternatives: ['imprimir', 'loguear'], normalized: 'log' },
    // Visibility
    show: { primary: 'mostrar', alternatives: ['enseñar'], normalized: 'show' },
    hide: { primary: 'ocultar', alternatives: ['esconder'], normalized: 'hide' },
    transition: { primary: 'transición', alternatives: ['animar'], normalized: 'transition' },
    // Events
    on: { primary: 'en', alternatives: ['cuando', 'al'], normalized: 'on' },
    trigger: { primary: 'disparar', alternatives: ['activar'], normalized: 'trigger' },
    send: { primary: 'enviar', alternatives: ['mandar'], normalized: 'send' }, // "mandar" more MX
    // DOM focus
    focus: { primary: 'enfocar', normalized: 'focus' },
    blur: { primary: 'desenfocar', normalized: 'blur' },
    // Common event names
    click: { primary: 'clic', alternatives: ['hacer clic', 'dar clic'], normalized: 'click' },
    hover: { primary: 'sobrevolar', alternatives: ['pasar encima'], normalized: 'hover' },
    submit: { primary: 'envío', alternatives: ['enviar'], normalized: 'submit' },
    input: { primary: 'entrada', alternatives: ['introducir'], normalized: 'input' },
    change: { primary: 'cambio', alternatives: ['cambiar'], normalized: 'change' },
    // Navigation
    go: { primary: 'ir', alternatives: ['navegar'], normalized: 'go' },
    // Async - Mexican variants
    wait: {
      primary: 'esperar',
      alternatives: ['ahorita', 'aguantar'], // "ahorita" is distinctly Mexican
      normalized: 'wait',
    },
    fetch: {
      primary: 'buscar',
      alternatives: ['obtener', 'jalar', 'traer'], // "jalar" (pull) common in MX tech
      normalized: 'fetch',
    },
    settle: { primary: 'estabilizar', normalized: 'settle' },
    // Control flow
    if: { primary: 'si', normalized: 'if' },
    when: { primary: 'cuando', normalized: 'when' },
    where: { primary: 'donde', normalized: 'where' },
    else: { primary: 'sino', alternatives: ['de lo contrario', 'si no'], normalized: 'else' },
    repeat: { primary: 'repetir', normalized: 'repeat' },
    for: { primary: 'para', normalized: 'for' },
    while: { primary: 'mientras', normalized: 'while' },
    continue: { primary: 'continuar', alternatives: ['seguir'], normalized: 'continue' },
    halt: { primary: 'detener', alternatives: ['parar'], normalized: 'halt' },
    throw: {
      primary: 'lanzar',
      alternatives: ['aventar', 'arrojar'], // "aventar" is Mexican
      normalized: 'throw',
    },
    call: { primary: 'llamar', normalized: 'call' },
    return: { primary: 'retornar', alternatives: ['devolver', 'regresar'], normalized: 'return' },
    then: { primary: 'entonces', alternatives: ['luego', 'después'], normalized: 'then' },
    and: { primary: 'y', alternatives: ['además', 'también'], normalized: 'and' },
    end: { primary: 'fin', alternatives: ['final', 'terminar'], normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'asíncrono', normalized: 'async' },
    tell: { primary: 'decir', normalized: 'tell' },
    default: { primary: 'predeterminar', alternatives: ['por defecto'], normalized: 'default' },
    init: { primary: 'iniciar', alternatives: ['inicializar', 'arrancar'], normalized: 'init' },
    behavior: { primary: 'comportamiento', normalized: 'behavior' },
    install: { primary: 'instalar', normalized: 'install' },
    measure: { primary: 'medir', normalized: 'measure' },
    // Modifiers
    into: { primary: 'en', alternatives: ['dentro de'], normalized: 'into' },
    before: { primary: 'antes', normalized: 'before' },
    after: { primary: 'después', normalized: 'after' },
    // Event modifiers
    until: { primary: 'hasta', normalized: 'until' },
    event: { primary: 'evento', normalized: 'event' },
    from: { primary: 'de', alternatives: ['desde'], normalized: 'from' },
  },
  eventHandler: {
    keyword: { primary: 'al', alternatives: ['cuando', 'en'], normalized: 'on' },
    sourceMarker: { primary: 'de', alternatives: ['desde'], position: 'before' },
    eventMarker: { primary: 'al', alternatives: ['cuando'], position: 'before' },
    temporalMarkers: ['cuando', 'al'],
  },
};
