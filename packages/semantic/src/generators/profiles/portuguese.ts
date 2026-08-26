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
    document: 'documento',
    window: 'janela',
    detail: 'detalhe',
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
    toggle: { primary: 'alternar', alternatives: [], normalized: 'toggle' },
    add: { primary: 'adicionar', alternatives: ['acrescentar'], normalized: 'add' },
    remove: {
      primary: 'remover',
      alternatives: ['eliminar', 'apagar', 'remova'],
      normalized: 'remove',
    },
    put: { primary: 'colocar', alternatives: ['pôr', 'por', 'coloque'], normalized: 'put' },
    append: { primary: 'anexar', normalized: 'append' },
    prepend: { primary: 'preceder', normalized: 'prepend' },
    take: { primary: 'pegar', alternatives: ['pegue'], normalized: 'take' },
    make: { primary: 'fazer', alternatives: ['criar'], normalized: 'make' },
    clone: { primary: 'clonar', alternatives: [], normalized: 'clone' },
    swap: { primary: 'trocar', alternatives: ['substituir'], normalized: 'swap' },
    morph: { primary: 'transformar', alternatives: ['converter'], normalized: 'morph' },
    set: { primary: 'definir', alternatives: ['configurar', 'defina'], normalized: 'set' },
    get: { primary: 'obter', alternatives: ['obtenha'], normalized: 'get' },
    increment: { primary: 'incrementar', alternatives: ['aumentar'], normalized: 'increment' },
    decrement: { primary: 'decrementar', alternatives: ['diminuir'], normalized: 'decrement' },
    log: { primary: 'registrar', alternatives: ['imprimir'], normalized: 'log' },
    show: { primary: 'mostrar', alternatives: ['exibir'], normalized: 'show' },
    hide: { primary: 'ocultar', alternatives: ['esconder', 'esconda'], normalized: 'hide' },
    transition: { primary: 'transição', alternatives: ['animar'], normalized: 'transition' },
    on: { primary: 'em', alternatives: ['ao'], normalized: 'on' },
    trigger: { primary: 'disparar', alternatives: ['ativar'], normalized: 'trigger' },
    send: { primary: 'enviar', normalized: 'send' },
    // Nominalized 2026-07-28: an event names an occurrence, so it takes a noun;
    // the bare infinitive reads as a command ('focus this!'). Portuguese prose
    // says an element 'recebe o foco' / 'perde foco'.
    focus: { primary: 'foco', alternatives: ['focar'], normalized: 'focus' },
    // 'desfoque' was the obvious nominalization and is deliberately NOT used:
    // in front-end Portuguese it is the CSS visual blur (filter: blur(),
    // backdrop-filter), the same false-friend trap that put ぼかし in Japanese
    // and 블러 in Korean. 'perda de foco' is what MDN pt-BR and Alura use for
    // the event, and the multi-word form is fine — lookup collapses separators,
    // so `on-perda-de-foco` resolves too.
    blur: {
      primary: 'perda de foco',
      alternatives: ['desfocar'],
      normalized: 'blur',
    },
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
    go: { primary: 'ir', alternatives: ['navegar', 'vá'], normalized: 'go' },
    // 'evento de rolagem' is the attested phrasing; 'deslocamento' is the
    // European Portuguese form (barra de deslocamento).
    scroll: {
      primary: 'rolagem',
      alternatives: ['rolar', 'deslocamento', 'scroll'],
      normalized: 'scroll',
    },
    push: { primary: 'empurrar', alternatives: ['push'], normalized: 'push' },
    replace: { primary: 'repor', alternatives: ['recolocar'], normalized: 'replace' },
    process: { primary: 'processar', normalized: 'process' },
    wait: { primary: 'esperar', alternatives: ['aguardar'], normalized: 'wait' },
    fetch: { primary: 'buscar', alternatives: ['busque'], normalized: 'fetch' },
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
    // Copula (`if result is false`, `if my value is empty`). Without the keyword the
    // surface stays an identifier and leaks verbatim into the condition's raw
    // expression, which the core expression parser reads as English. Neither an
    // ActionType nor a command schema, so no pattern is generated from it.
    is: { primary: 'é', normalized: 'is' },
    // Negative-existence operator (`if no dragHandle set dragHandle to me`). Same
    // seam as `exists`: without the keyword the surface stays an identifier and
    // leaks verbatim into the condition's raw expression (behavior-draggable).
    // Neither an ActionType nor a command schema, so no pattern is generated from it.
    no: { primary: 'nenhum', normalized: 'no' },
    end: { primary: 'fim', alternatives: ['final', 'término'], normalized: 'end' },
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'assíncrono', normalized: 'async' },
    tell: { primary: 'dizer', normalized: 'tell' },
    default: { primary: 'padrão', normalized: 'default' },
    init: {
      primary: 'inicialização',
      alternatives: ['iniciar', 'inicializar'],
      normalized: 'init',
    },
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
    resize: {
      primary: 'redimensionamento',
      alternatives: ['redimensionar'],
      normalized: 'resize',
    },
    hover: { primary: 'sobrevoar', alternatives: ['passar'], normalized: 'hover' },
    // 'submissão' is the European Portuguese form; pt-BR says 'envio'.
    submit: {
      primary: 'envio',
      alternatives: ['submeter', 'submissão'],
      normalized: 'submit',
    },
    input: { primary: 'entrada', alternatives: ['inserção'], normalized: 'input' },
    change: { primary: 'alteração', alternatives: ['mudança'], normalized: 'change' },
    // mousedown/mouseup (repeat-until-event): dict emits the spaced forms —
    // register so both the on.event and the repeat until-event type as literal.
    // Completes the V3 Batch 2 fused-form split (see keydown/mouseover above);
    // the camelCase spellings stay as parse alternatives for back-compat.
    // baixo/cima was a spatial calque of down/up. pt-BR says "pressionado"/
    // "solto" — cf. MDN pt-BR and Scratch pt-BR ("mouse pressionado?").
    // Note this vocabulary is Brazilian: pt-PT would say "rato", not "mouse".
    // pt-PT 'rato …' forms added 2026-07-28 as parse aliases rather than a
    // separate locale: the split is lexical (rato/mouse, libertado/solto), not
    // orthographic, and normLang strips the subtag so pt-PT resolves as pt.
    mousedown: {
      primary: 'mouse pressionado',
      alternatives: ['rato pressionado', 'mouse baixo', 'mouseBaixo'],
      normalized: 'mousedown',
    },
    mouseup: {
      primary: 'mouse solto',
      alternatives: ['mouse liberado', 'rato libertado', 'mouse cima', 'mouseCima'],
      normalized: 'mouseup',
    },
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
  lexicon: {
    events: {
      blur: { primary: 'desfoque' },
      change: { primary: 'mudança' },
      click: { primary: 'clique' },
      dblclick: { primary: 'duploClique' },
      focus: { primary: 'foco' },
      input: { primary: 'entrada' },
      keydown: { primary: 'tecla baixo' },
      keypress: { primary: 'teclaPressionar' },
      keyup: { primary: 'tecla cima' },
      load: { primary: 'carregar' },
      mousedown: { primary: 'mouse pressionado' },
      mouseenter: { primary: 'mouseEntrar' },
      mouseleave: { primary: 'mouseSair' },
      mousemove: { primary: 'mouseMover' },
      mouseout: { primary: 'mouse fora' },
      mouseover: { primary: 'mouse sobre' },
      mouseup: { primary: 'mouse solto' },
      reset: { primary: 'redefinir' },
      resize: { primary: 'redimensionar' },
      scroll: { primary: 'rolar' },
      submit: { primary: 'envio' },
      touchcancel: { primary: 'toqueCancelar' },
      touchend: { primary: 'toqueFim' },
      touchmove: { primary: 'toqueMover' },
      touchstart: { primary: 'toqueInício' },
      unload: { primary: 'descarregar' },
    },
    logical: {
      and: { primary: 'e' },
      changes: { primary: 'muda' },
      contains: { primary: 'contém' },
      else: { primary: 'senão' },
      end: { primary: 'fim' },
      equals: { primary: 'igual' },
      exists: { primary: 'existe' },
      has: { primary: 'tem' },
      have: { primary: 'tenho' },
      includes: { primary: 'inclui' },
      is: { primary: 'é' },
      live: { primary: 'vivo' },
      matches: { primary: 'corresponde' },
      not: { primary: 'não' },
      or: { primary: 'ou' },
      otherwise: { primary: 'caso_contrário' },
      then: { primary: 'então' },
      when: { primary: 'quando' },
      where: { primary: 'onde' },
    },
    temporal: {
      h: { primary: 'h' },
      hour: { primary: 'hora' },
      hours: { primary: 'horas' },
      millisecond: { primary: 'milissegundo' },
      milliseconds: { primary: 'milissegundos' },
      min: { primary: 'min' },
      minute: { primary: 'minuto' },
      minutes: { primary: 'minutos' },
      ms: { primary: 'ms' },
      s: { primary: 's' },
      second: { primary: 'segundo' },
      seconds: { primary: 'segundos' },
    },
    values: {
      body: { primary: 'corpo' },
      detail: { primary: 'detalhe' },
      document: { primary: 'documento' },
      element: { primary: 'elemento' },
      event: { primary: 'evento' },
      false: { primary: 'falso' },
      it: { primary: 'isso' },
      its: { primary: 'seu' },
      me: { primary: 'eu' },
      my: { primary: 'meu' },
      myself: { primary: 'eu mesmo' },
      null: { primary: 'nulo' },
      result: { primary: 'resultado' },
      target: { primary: 'alvo' },
      true: { primary: 'verdadeiro' },
      undefined: { primary: 'indefinido' },
      value: { primary: 'valor' },
      window: { primary: 'janela' },
      you: { primary: 'você' },
      your: { primary: 'seu' },
      yourself: { primary: 'você mesmo' },
    },
    attributes: {
      attribute: { primary: 'atributo' },
      attributes: { primary: 'atributos' },
      class: { primary: 'classe' },
      classes: { primary: 'classes' },
      properties: { primary: 'propriedades' },
      property: { primary: 'propriedade' },
      style: { primary: 'estilo' },
      styles: { primary: 'estilos' },
    },
    expressions: {
      at: { primary: 'em' },
      characters: { primary: 'caracteres' },
      children: { primary: 'filhos' },
      closest: { primary: 'maispróximo' },
      empty: { primary: 'vazio' },
      'ends with': { primary: 'termina com' },
      exclusive: { primary: 'exclusivo' },
      first: { primary: 'primeiro' },
      'ignoring case': { primary: 'ignorando maiúsculas' },
      inclusive: { primary: 'inclusivo' },
      'joined by': { primary: 'unido por' },
      last: { primary: 'último' },
      'mapped to': { primary: 'mapeado para' },
      next: { primary: 'próximo' },
      no: { primary: 'nenhum' },
      parent: { primary: 'pai' },
      prev: { primary: 'ant' },
      previous: { primary: 'anterior' },
      random: { primary: 'aleatório' },
      some: { primary: 'algum' },
      'sorted by': { primary: 'ordenado por' },
      'split by': { primary: 'dividido por' },
      'starts with': { primary: 'começa com' },
      within: { primary: 'dentro' },
    },
  },
};
