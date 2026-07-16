/**
 * Portuguese Language Profile
 *
 * SVO word order, prepositions, space-separated.
 * Features rich verb conjugation with pro-drop (subject omission).
 */

import type { LanguageProfile } from './types';

export const portugueseProfile: LanguageProfile = {
  code: 'pt',
  name: 'Portuguese',
  nativeName: 'Português',
  regions: ['western', 'priority'],
  direction: 'ltr',
  script: 'latin',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  references: {
    me: 'eu', // "I/me"
    it: 'ele', // "it"
    you: 'você', // "you"
    result: 'resultado',
    event: 'evento',
    target: 'alvo',
    body: 'corpo',
  },
  possessive: {
    marker: 'de', // Uses "de" for general possession
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'meu', // "my"
      it: 'seu', // "its"
      you: 'teu', // "your" (or "seu" in formal)
    },
    keywords: {
      meu: 'me',
      minha: 'me',
      teu: 'you',
      tua: 'you',
      seu: 'it',
      sua: 'it',
    },
  },
  roleMarkers: {
    destination: { primary: 'em', alternatives: ['para', 'a'], position: 'before' },
    source: { primary: 'de', alternatives: ['desde'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'com', position: 'before' },
  },
  keywords: {
    toggle: { primary: 'alternar', alternatives: [], normalized: 'toggle' },
    add: { primary: 'adicionar', alternatives: ['acrescentar'], normalized: 'add' },
    remove: { primary: 'remover', alternatives: ['eliminar', 'apagar'], normalized: 'remove' },
    put: { primary: 'colocar', alternatives: ['pôr', 'por'], normalized: 'put' },
    append: { primary: 'anexar', normalized: 'append' },
    prepend: { primary: 'preceder', normalized: 'prepend' },
    take: { primary: 'pegar', normalized: 'take' },
    make: { primary: 'fazer', alternatives: ['criar'], normalized: 'make' },
    clone: { primary: 'clonar', alternatives: [], normalized: 'clone' },
    swap: { primary: 'trocar', alternatives: ['substituir'], normalized: 'swap' },
    morph: { primary: 'transformar', alternatives: ['converter'], normalized: 'morph' },
    set: { primary: 'definir', alternatives: ['configurar'], normalized: 'set' },
    get: { primary: 'obter', normalized: 'get' },
    increment: { primary: 'incrementar', alternatives: ['aumentar'], normalized: 'increment' },
    decrement: { primary: 'decrementar', alternatives: ['diminuir'], normalized: 'decrement' },
    log: { primary: 'registrar', alternatives: ['imprimir'], normalized: 'log' },
    show: { primary: 'mostrar', alternatives: ['exibir'], normalized: 'show' },
    hide: { primary: 'ocultar', alternatives: ['esconder'], normalized: 'hide' },
    transition: { primary: 'transição', alternatives: ['animar'], normalized: 'transition' },
    on: { primary: 'em', alternatives: ['ao'], normalized: 'on' },
    trigger: { primary: 'disparar', alternatives: ['ativar'], normalized: 'trigger' },
    send: { primary: 'enviar', normalized: 'send' },
    focus: { primary: 'focar', normalized: 'focus' },
    blur: { primary: 'desfocar', normalized: 'blur' },
    // Phase 1 (v0.9.90): DOM / form state / debug
    empty: { primary: 'esvaziar', alternatives: ['vazio'], normalized: 'empty' },
    open: { primary: 'abrir', normalized: 'open' },
    close: { primary: 'fechar', normalized: 'close' },
    select: { primary: 'selecionar', normalized: 'select' },
    clear: { primary: 'limpar', normalized: 'clear' },
    reset: { primary: 'redefinir', alternatives: ['resetar'], normalized: 'reset' },
    breakpoint: {
      primary: 'ponto-interrupção',
      alternatives: ['ponto-interrupcao'],
      normalized: 'breakpoint',
    },
    go: { primary: 'ir', alternatives: ['navegar'], normalized: 'go' },
    scroll: { primary: 'rolar', alternatives: ['scroll'], normalized: 'scroll' },
    push: { primary: 'empurrar', alternatives: ['push'], normalized: 'push' },
    replace: { primary: 'repor', alternatives: ['recolocar'], normalized: 'replace' },
    process: { primary: 'processar', normalized: 'process' },
    wait: { primary: 'esperar', alternatives: ['aguardar'], normalized: 'wait' },
    fetch: { primary: 'buscar', normalized: 'fetch' },
    settle: { primary: 'estabilizar', normalized: 'settle' },
    if: { primary: 'se', normalized: 'if' },
    // salvo — single token ('salvo se' = unless). a_menos kept as an
    // alternative documenting intent: the pt word extractor splits at `_`
    // (a + _ + menos), so the compound could never tokenize as one keyword.
    unless: { primary: 'salvo', alternatives: ['a_menos'], normalized: 'unless' },
    when: { primary: 'quando', normalized: 'when' },
    where: { primary: 'onde', normalized: 'where' },
    else: { primary: 'senão', normalized: 'else' },
    repeat: { primary: 'repetir', normalized: 'repeat' },
    for: { primary: 'para', normalized: 'for' },
    while: { primary: 'enquanto', normalized: 'while' },
    // `repeat forever` loop keyword — corpus word recognized so loopType types
    // as `:literal` like EN (the repeat.loopType R1 residue; see spanish.ts).
    forever: { primary: 'forever', normalized: 'forever' },
    continue: { primary: 'continuar', normalized: 'continue' },
    halt: { primary: 'parar', normalized: 'halt' },
    throw: { primary: 'lançar', normalized: 'throw' },
    call: { primary: 'chamar', normalized: 'call' },
    return: { primary: 'retornar', alternatives: ['devolver'], normalized: 'return' },
    then: { primary: 'então', alternatives: ['logo'], normalized: 'then' },
    and: { primary: 'e', alternatives: ['também', 'além disso'], normalized: 'and' },
    // Comparison operator (`target matches .x`). Without this keyword the surface
    // stays an identifier and leaks verbatim into the condition's raw expression,
    // which the core expression parser reads as English (modal-close-backdrop /
    // focus-trap drop their then-branch). Not an ActionType and has no command
    // schema, so no pattern is generated from it.
    matches: { primary: 'corresponde', normalized: 'matches' },
    // Existence operator (`if #modal exists`). Same seam as `matches`: without the
    // keyword the surface stays an identifier and leaks verbatim into the
    // condition's raw expression (if-exists). Neither an ActionType nor a command
    // schema, so no pattern is generated from it.
    exists: { primary: 'existe', normalized: 'exists' },
    end: { primary: 'fim', alternatives: ['final', 'término'], normalized: 'end' },
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'assíncrono', normalized: 'async' },
    tell: { primary: 'dizer', normalized: 'tell' },
    default: { primary: 'padrão', normalized: 'default' },
    init: { primary: 'iniciar', alternatives: ['inicializar'], normalized: 'init' },
    behavior: { primary: 'comportamento', normalized: 'behavior' },
    install: { primary: 'instalar', normalized: 'install' },
    measure: { primary: 'medir', normalized: 'measure' },
    beep: { primary: 'apitar', normalized: 'beep' },
    break: { primary: 'interromper', normalized: 'break' },
    copy: { primary: 'copiar', normalized: 'copy' },
    exit: { primary: 'sair', normalized: 'exit' },
    pick: { primary: 'escolher', normalized: 'pick' },
    render: { primary: 'renderizar', normalized: 'render' },
    into: { primary: 'dentro', alternatives: ['dentro de'], normalized: 'into' },
    before: { primary: 'antes', normalized: 'before' },
    after: { primary: 'depois', normalized: 'after' },
    // Common event names (for event handler patterns)
    click: { primary: 'clique', alternatives: ['clicar'], normalized: 'click' },
    // `resize` event (window-resize): dict emits redimensionar; register it so the
    // event types as literal="resize" (matching en) instead of expression.
    resize: { primary: 'redimensionar', normalized: 'resize' },
    hover: { primary: 'sobrevoar', alternatives: ['passar'], normalized: 'hover' },
    submit: { primary: 'envio', alternatives: ['submeter'], normalized: 'submit' },
    input: { primary: 'entrada', alternatives: ['inserção'], normalized: 'input' },
    change: { primary: 'alteração', alternatives: ['mudança'], normalized: 'change' },
    // mousedown/mouseup (repeat-until-event): dict emits mouseBaixo/mouseCima —
    // register so both the on.event and the repeat until-event type as literal.
    mousedown: { primary: 'mouseBaixo', normalized: 'mousedown' },
    mouseup: { primary: 'mouseCima', normalized: 'mouseup' },
    // Event modifiers (for repeat until event)
    until: { primary: 'até', normalized: 'until' },
    event: { primary: 'evento', normalized: 'event' },
    from: { primary: 'de', alternatives: ['desde'], normalized: 'from' },
    // Phase 8 (htmx v4 localized attributes): attribute-suffix keywords
    // used by the vocab generator — `sse-conectar`, `hx-ao-vivo`, etc.
    connect: { primary: 'conectar', alternatives: ['conexão'], normalized: 'connect' },
    stream: { primary: 'transmitir', alternatives: ['fluxo'], normalized: 'stream' },
    live: { primary: 'ao-vivo', alternatives: ['vivo', 'direto'], normalized: 'live' },
    socket: { primary: 'soquete', alternatives: ['websocket'], normalized: 'socket' },
    // Reactive / realtime commands
    bind: { primary: 'vincular', alternatives: ['ligar', 'bind'], normalized: 'bind' },
    intercept: { primary: 'interceptar', alternatives: ['intercept'], normalized: 'intercept' },
    worker: { primary: 'trabalhador', alternatives: ['worker'], normalized: 'worker' },
    eventsource: {
      primary: 'eventsource',
      alternatives: ['fonte-de-eventos'],
      normalized: 'eventsource',
    },
  },
  eventHandler: {
    keyword: { primary: 'em', alternatives: ['ao'], normalized: 'on' },
    sourceMarker: { primary: 'de', alternatives: ['desde'], position: 'before' },
    conditionalKeyword: { primary: 'quando', alternatives: ['se'] },
    // Event marker: ao (at/upon), used in SVO pattern
    // Pattern: ao [event] [verb] [patient] em [destination?]
    // Example: ao clique alternar .active em #button
    // + the eventHandler.keyword word the i18n transformer actually emits —
    // without it every generated fused `<cmd>-event-*-vso` pattern was dead
    // (the swap/if recovery split, #346/#351)
    eventMarker: { primary: 'ao', alternatives: ['no', 'em'], position: 'before' },
    temporalMarkers: ['quando', 'ao'], // temporal conjunctions (when)
  },
};
