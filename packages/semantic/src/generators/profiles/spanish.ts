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
  direction: 'ltr',
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
    me: 'yo',        // "I/me"
    it: 'ello',      // "it"
    you: 'tú',       // "you"
    result: 'resultado',
    event: 'evento',
    target: 'objetivo',
    body: 'cuerpo',
  },
  possessive: {
    marker: 'de',    // Spanish uses "de" for general possession
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'mi',      // "my" (possessive adjective)
      it: 'su',      // "its"
      you: 'tu',     // "your"
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
    toggle: { primary: 'alternar', alternatives: ['cambiar', 'conmutar'], normalized: 'toggle' },
    add: { primary: 'agregar', alternatives: ['añadir'], normalized: 'add' },
    remove: { primary: 'quitar', alternatives: ['eliminar', 'remover', 'sacar'], normalized: 'remove' },
    // Content operations
    put: { primary: 'poner', alternatives: ['colocar'], normalized: 'put' },
    append: { primary: 'añadir', normalized: 'append' },
    prepend: { primary: 'anteponer', normalized: 'prepend' },
    take: { primary: 'tomar', normalized: 'take' },
    make: { primary: 'hacer', alternatives: ['crear'], normalized: 'make' },
    clone: { primary: 'clonar', alternatives: ['copiar'], normalized: 'clone' },
    swap: { primary: 'intercambiar', alternatives: ['cambiar'], normalized: 'swap' },
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
    on: { primary: 'en', alternatives: ['cuando', 'al'], normalized: 'on' },
    trigger: { primary: 'disparar', alternatives: ['activar'], normalized: 'trigger' },
    send: { primary: 'enviar', normalized: 'send' },
    // DOM focus
    focus: { primary: 'enfocar', normalized: 'focus' },
    blur: { primary: 'desenfocar', normalized: 'blur' },
    // Navigation
    go: { primary: 'ir', alternatives: ['navegar'], normalized: 'go' },
    // Async
    wait: { primary: 'esperar', normalized: 'wait' },
    fetch: { primary: 'buscar', alternatives: ['obtener'], normalized: 'fetch' },
    settle: { primary: 'estabilizar', normalized: 'settle' },
    // Control flow
    if: { primary: 'si', normalized: 'if' },
    when: { primary: 'TODO', normalized: 'when' },
    where: { primary: 'TODO', normalized: 'where' },
    else: { primary: 'sino', alternatives: ['de lo contrario'], normalized: 'else' },
    repeat: { primary: 'repetir', normalized: 'repeat' },
    for: { primary: 'para', normalized: 'for' },
    while: { primary: 'mientras', normalized: 'while' },
    continue: { primary: 'continuar', normalized: 'continue' },
    halt: { primary: 'detener', alternatives: ['parar'], normalized: 'halt' },
    throw: { primary: 'lanzar', alternatives: ['arrojar'], normalized: 'throw' },
    call: { primary: 'llamar', normalized: 'call' },
    return: { primary: 'retornar', alternatives: ['devolver'], normalized: 'return' },
    then: { primary: 'entonces', alternatives: ['luego', 'después'], normalized: 'then' },
    and: { primary: 'y', alternatives: ['además', 'también'], normalized: 'and' },
    end: { primary: 'fin', alternatives: ['final', 'terminar'], normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'asíncrono', normalized: 'async' },
    tell: { primary: 'decir', normalized: 'tell' },
    default: { primary: 'predeterminar', alternatives: ['por defecto'], normalized: 'default' },
    init: { primary: 'iniciar', alternatives: ['inicializar'], normalized: 'init' },
    behavior: { primary: 'comportamiento', normalized: 'behavior' },
    install: { primary: 'instalar', normalized: 'install' },
    measure: { primary: 'medir', normalized: 'measure' },
    // Modifiers
    into: { primary: 'en', alternatives: ['dentro de'], normalized: 'into' },
    before: { primary: 'antes', normalized: 'before' },
    after: { primary: 'después', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'hasta', normalized: 'until' },
    event: { primary: 'evento', normalized: 'event' },
    from: { primary: 'de', alternatives: ['desde'], normalized: 'from' },
  },
};
