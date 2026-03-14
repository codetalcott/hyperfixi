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
    destination: { primary: 'en', alternatives: ['sobre', 'a'], position: 'before' },
    source: { primary: 'de', alternatives: ['desde'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'con', position: 'before' },
  },
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
    set: { primary: 'establecer', alternatives: ['fijar', 'definir'], normalized: 'set' },
    get: { primary: 'obtener', alternatives: ['conseguir'], normalized: 'get' },
    increment: { primary: 'incrementar', alternatives: ['aumentar'], normalized: 'increment' },
    decrement: { primary: 'decrementar', alternatives: ['disminuir'], normalized: 'decrement' },
    log: { primary: 'registrar', alternatives: ['imprimir'], normalized: 'log' },
    // Visibility
    show: { primary: 'mostrar', alternatives: ['enseñar'], normalized: 'show' },
    hide: { primary: 'ocultar', alternatives: ['esconder'], normalized: 'hide' },
    transition: { primary: 'transición', alternatives: ['animar'], normalized: 'transition' },
    // Events
    on: { primary: 'en', alternatives: ['al'], normalized: 'on' },
    trigger: { primary: 'disparar', alternatives: ['activar'], normalized: 'trigger' },
    send: { primary: 'enviar', normalized: 'send' },
    // DOM focus
    focus: { primary: 'enfocar', alternatives: ['enfoque'], normalized: 'focus' },
    blur: { primary: 'desenfocar', alternatives: ['desenfoque'], normalized: 'blur' },
    // Common event names (for event handler patterns)
    click: { primary: 'clic', alternatives: ['hacer clic', 'click'], normalized: 'click' },
    hover: { primary: 'sobrevolar', alternatives: ['pasar por encima'], normalized: 'hover' },
    submit: { primary: 'envío', alternatives: ['envio', 'someter'], normalized: 'submit' },
    input: { primary: 'entrada', alternatives: ['introducir'], normalized: 'input' },
    change: { primary: 'cambio', alternatives: ['cambiar'], normalized: 'change' },
    load: { primary: 'carga', normalized: 'load' },
    scroll: { primary: 'desplazamiento', normalized: 'scroll' },
    keydown: { primary: 'tecla abajo', normalized: 'keydown' },
    keyup: { primary: 'tecla arriba', normalized: 'keyup' },
    mouseover: { primary: 'ratón encima', alternatives: ['raton encima'], normalized: 'mouseover' },
    mouseout: { primary: 'ratón fuera', alternatives: ['raton fuera'], normalized: 'mouseout' },
    // Navigation
    go: { primary: 'ir', alternatives: ['navegar'], normalized: 'go' },
    // Async
    wait: { primary: 'esperar', normalized: 'wait' },
    fetch: { primary: 'buscar', alternatives: ['recuperar'], normalized: 'fetch' },
    settle: { primary: 'estabilizar', normalized: 'settle' },
    // Control flow
    if: { primary: 'si', normalized: 'if' },
    when: { primary: 'cuando', normalized: 'when' },
    where: { primary: 'donde', normalized: 'where' },
    else: { primary: 'sino', alternatives: ['de lo contrario'], normalized: 'else' },
    repeat: { primary: 'repetir', normalized: 'repeat' },
    for: { primary: 'para', normalized: 'for' },
    while: { primary: 'mientras', normalized: 'while' },
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
    end: { primary: 'fin', alternatives: ['final', 'terminar'], normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'asíncrono', alternatives: ['asincrono'], normalized: 'async' },
    tell: { primary: 'decir', normalized: 'tell' },
    default: { primary: 'predeterminar', alternatives: ['por defecto'], normalized: 'default' },
    init: { primary: 'iniciar', alternatives: ['inicializar'], normalized: 'init' },
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
  },
  eventHandler: {
    keyword: { primary: 'al', alternatives: ['cuando', 'en'], normalized: 'on' },
    sourceMarker: { primary: 'de', alternatives: ['desde'], position: 'before' },
    // Event marker: al (when), used in SVO pattern
    // Pattern: al [event] [verb] [patient] en [destination?]
    // Example: al clic alternar .active en #button
    eventMarker: { primary: 'al', alternatives: ['cuando'], position: 'before' },
    temporalMarkers: ['cuando', 'al'], // temporal conjunctions (when)
  },
};
