/**
 * Russian Language Profile
 *
 * SVO word order, prepositions, space-separated.
 * Russian is a fusional language with rich verb conjugation.
 * Uses infinitive form in software UI (industry standard).
 */

import type { LanguageProfile } from './types';

export const russianProfile: LanguageProfile = {
  code: 'ru',
  name: 'Russian',
  nativeName: 'Русский',
  direction: 'ltr',
  script: 'cyrillic',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  defaultVerbForm: 'infinitive',
  verb: {
    position: 'start',
    subjectDrop: true,
    suffixes: ['ть', 'ться', 'ить', 'иться', 'ать', 'аться', 'еть', 'еться'],
  },
  references: {
    me: 'я',
    it: 'это',
    you: 'ты',
    result: 'результат',
    event: 'событие',
    target: 'цель',
    body: 'тело', // was an English placeholder; the i18n dict emits the Russian word
    document: 'документ',
    window: 'окно',
    detail: 'детали',
  },
  possessive: {
    marker: '',
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'мой',
      it: 'его',
      you: 'твой',
    },
    keywords: {
      // "my" variants (masculine/feminine/neuter/plural)
      мой: 'me',
      моя: 'me',
      моё: 'me',
      мои: 'me',
      // "your" variants
      твой: 'you',
      твоя: 'you',
      твоё: 'you',
      твои: 'you',
      // "its/his/her" forms
      его: 'it', // his/its
      её: 'it', // her/its (feminine)
    },
  },
  roleMarkers: {
    destination: { primary: 'в', alternatives: ['на', 'к'], position: 'before' },
    source: { primary: 'из', alternatives: ['от', 'с'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'с', alternatives: ['со'], position: 'before' },
  },
  keywords: {
    // Class/Attribute operations (infinitive form)
    toggle: {
      primary: 'переключить',
      alternatives: ['переключи'],
      normalized: 'toggle',
      form: 'infinitive',
    },
    add: { primary: 'добавить', alternatives: ['добавь'], normalized: 'add', form: 'infinitive' },
    remove: {
      primary: 'удалить',
      alternatives: ['удали', 'убрать', 'убери'],
      normalized: 'remove',
      form: 'infinitive',
    },
    // Content operations
    put: {
      primary: 'положить',
      alternatives: ['положи', 'поместить', 'помести', 'вставить', 'вставь'],
      normalized: 'put',
      form: 'infinitive',
    },
    // Underscore compounds are not natural Russian — they were a tokenizer
    // workaround, and a broken one: the Cyrillic extractor split on `_`, so
    // `добавить_в_конец` parsed as `добавить` (= `add`) and ru append/prepend
    // silently became `add`. The extractor now keeps `_` mid-word, so all three
    // spellings below parse; the PRIMARY is what `translate()` renders, so it is
    // the natural form a Russian speaker would actually write.
    append: {
      primary: 'дописать',
      alternatives: ['добавить в конец', 'добавить_в_конец'],
      normalized: 'append',
      form: 'infinitive',
    },
    prepend: {
      primary: 'добавить в начало',
      alternatives: ['добавить_в_начало'],
      normalized: 'prepend',
      form: 'infinitive',
    },
    take: { primary: 'взять', alternatives: ['возьми'], normalized: 'take', form: 'infinitive' },
    make: { primary: 'создать', alternatives: ['создай'], normalized: 'make', form: 'infinitive' },
    clone: {
      primary: 'клонировать',
      alternatives: ['клонируй'],
      normalized: 'clone',
      form: 'infinitive',
    },
    swap: {
      primary: 'поменять',
      alternatives: ['поменяй'],
      normalized: 'swap',
      form: 'infinitive',
    },
    morph: {
      primary: 'трансформировать',
      alternatives: ['трансформируй'],
      normalized: 'morph',
      form: 'infinitive',
    },
    // Variable operations
    set: {
      primary: 'установить',
      alternatives: ['установи', 'задать', 'задай'],
      normalized: 'set',
      form: 'infinitive',
    },
    get: { primary: 'получить', alternatives: ['получи'], normalized: 'get', form: 'infinitive' },
    increment: {
      primary: 'увеличить',
      alternatives: ['увеличь'],
      normalized: 'increment',
      form: 'infinitive',
    },
    decrement: {
      primary: 'уменьшить',
      alternatives: ['уменьши'],
      normalized: 'decrement',
      form: 'infinitive',
    },
    log: { primary: 'записать', alternatives: ['запиши'], normalized: 'log', form: 'infinitive' },
    // Visibility
    show: { primary: 'показать', alternatives: ['покажи'], normalized: 'show', form: 'infinitive' },
    hide: {
      primary: 'скрыть',
      alternatives: ['скрой', 'спрятать', 'спрячь'],
      normalized: 'hide',
      form: 'infinitive',
    },
    transition: {
      primary: 'анимировать',
      alternatives: ['анимируй'],
      normalized: 'transition',
      form: 'infinitive',
    },
    // Events
    on: { primary: 'при', normalized: 'on' },
    trigger: {
      primary: 'инициировать',
      alternatives: ['запустить', 'запусти'],
      normalized: 'trigger',
      form: 'infinitive',
    },
    send: {
      primary: 'отправить',
      alternatives: ['отправь'],
      normalized: 'send',
      form: 'infinitive',
    },
    // DOM focus
    focus: {
      primary: 'сфокусировать',
      alternatives: ['сфокусируй', 'фокус'],
      normalized: 'focus',
      form: 'infinitive',
    },
    blur: { primary: 'размыть', alternatives: ['размой'], normalized: 'blur', form: 'infinitive' },
    // Phase 1 (v0.9.90): DOM / form state / debug
    empty: { primary: 'опустошить', alternatives: ['пустой'], normalized: 'empty' },
    open: { primary: 'открыть', normalized: 'open' },
    close: { primary: 'закрыть', normalized: 'close' },
    select: { primary: 'выделить', normalized: 'select' },
    clear: { primary: 'очистить', normalized: 'clear' },
    reset: { primary: 'сбросить', normalized: 'reset' },
    breakpoint: { primary: 'точка-останова', normalized: 'breakpoint' },
    // Common event names (for event handler patterns)
    click: { primary: 'клик', alternatives: ['клике', 'нажатии'], normalized: 'click' },
    hover: { primary: 'наведении', alternatives: ['наведение'], normalized: 'hover' },
    submit: { primary: 'отправке', alternatives: ['отправка'], normalized: 'submit' },
    input: { primary: 'вводе', alternatives: ['ввод'], normalized: 'input' },
    change: { primary: 'изменении', alternatives: ['изменение'], normalized: 'change' },
    // i18n dict emits `загрузка` for `load`; without it `on load` events type as expression.
    load: { primary: 'загрузка', alternatives: ['загрузке'], normalized: 'load' },
    // Navigation
    go: {
      primary: 'перейти',
      alternatives: ['перейди', 'идти', 'иди'],
      normalized: 'go',
      form: 'infinitive',
    },
    scroll: {
      primary: 'прокрутить',
      alternatives: ['прокрути'],
      normalized: 'scroll',
      form: 'infinitive',
    },
    push: {
      primary: 'втолкнуть',
      alternatives: ['толкнуть'],
      normalized: 'push',
      form: 'infinitive',
    },
    replace: {
      primary: 'заменить',
      alternatives: ['замени'],
      normalized: 'replace',
      form: 'infinitive',
    },
    process: {
      primary: 'обработать',
      alternatives: ['обработай'],
      normalized: 'process',
      form: 'infinitive',
    },
    // Async
    wait: {
      primary: 'ждать',
      alternatives: ['жди', 'подожди'],
      normalized: 'wait',
      form: 'infinitive',
    },
    fetch: {
      primary: 'загрузить',
      alternatives: ['загрузи'],
      normalized: 'fetch',
      form: 'infinitive',
    },
    settle: { primary: 'стабилизировать', normalized: 'settle', form: 'infinitive' },
    // Control flow
    if: { primary: 'если', normalized: 'if' },
    unless: { primary: 'кроме', normalized: 'unless' },
    when: { primary: 'когда', normalized: 'when' },
    where: { primary: 'где', normalized: 'where' },
    else: { primary: 'иначе', normalized: 'else' },
    repeat: {
      primary: 'повторить',
      alternatives: ['повтори'],
      normalized: 'repeat',
      form: 'infinitive',
    },
    for: { primary: 'для', alternatives: ['каждый'], normalized: 'for' },
    while: { primary: 'пока', normalized: 'while' },
    // `repeat forever` loop keyword — corpus word recognized so loopType types
    // as `:literal` like EN (the repeat.loopType R1 residue; see spanish.ts).
    forever: { primary: 'всегда', normalized: 'forever', alternatives: ['forever'] },
    continue: {
      primary: 'продолжить',
      alternatives: ['продолжи'],
      normalized: 'continue',
      form: 'infinitive',
    },
    halt: {
      primary: 'остановить',
      alternatives: ['остановись', 'стоп'],
      normalized: 'halt',
      form: 'infinitive',
    },
    throw: { primary: 'бросить', alternatives: ['брось'], normalized: 'throw', form: 'infinitive' },
    call: { primary: 'вызвать', alternatives: ['вызови'], normalized: 'call', form: 'infinitive' },
    return: {
      primary: 'вернуть',
      alternatives: ['верни'],
      normalized: 'return',
      form: 'infinitive',
    },
    then: { primary: 'затем', alternatives: ['потом', 'тогда'], normalized: 'then' },
    and: { primary: 'и', normalized: 'and' },
    // Comparison operator — see korean.ts for the rationale. A folded conditional's
    // raw condition is read by the core expression parser (English operators only),
    // so `target соответствует .x` must normalize to `target matches .x`; otherwise
    // `соответствует` stays an identifier and modal-close-backdrop drops its then-branch.
    matches: { primary: 'соответствует', normalized: 'matches' },
    // Existence operator (`if #modal exists`). Same seam as `matches`: without the
    // keyword the surface stays an identifier and leaks verbatim into the
    // condition's raw expression (if-exists). Neither an ActionType nor a command
    // schema, so no pattern is generated from it.
    exists: { primary: 'существует', normalized: 'exists' },
    // Copula (`if result is false`, `if my value is empty`). Without the keyword the
    // surface stays an identifier and leaks verbatim into the condition's raw
    // expression, which the core expression parser reads as English. Neither an
    // ActionType nor a command schema, so no pattern is generated from it.
    is: { primary: 'есть', normalized: 'is' },
    // Negative-existence operator (`if no dragHandle set dragHandle to me`). Same
    // seam as `exists`: without the keyword the surface stays an identifier and
    // leaks verbatim into the condition's raw expression (behavior-draggable).
    // Neither an ActionType nor a command schema, so no pattern is generated from it.
    no: { primary: 'нет', normalized: 'no' },
    end: { primary: 'конец', normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'асинхронно', alternatives: ['async'], normalized: 'async' },
    tell: { primary: 'сказать', alternatives: ['скажи'], normalized: 'tell', form: 'infinitive' },
    default: { primary: 'по_умолчанию', normalized: 'default' },
    init: {
      primary: 'инициализировать',
      alternatives: ['инициализируй'],
      normalized: 'init',
      form: 'infinitive',
    },
    behavior: { primary: 'поведение', normalized: 'behavior' },
    // `install` is the loanword `инсталлировать` — NOT `установить`, which is the
    // `set` primary (ru "install" and "set" are homonyms). The previous
    // disambiguator `установить_пакет` was inert: the ru tokenizer splits on `_`,
    // so it tokenized back to `установить` → `set`, dropping the install action
    // (install-behavior degenerate). The loanword is a single Cyrillic token.
    install: { primary: 'инсталлировать', normalized: 'install', form: 'infinitive' },
    measure: {
      primary: 'измерить',
      alternatives: ['измерь'],
      normalized: 'measure',
      form: 'infinitive',
    },
    beep: { primary: 'звук', normalized: 'beep' },
    break: { primary: 'прервать', normalized: 'break' },
    copy: { primary: 'копировать', normalized: 'copy' },
    exit: { primary: 'выйти', normalized: 'exit' },
    pick: { primary: 'выбрать', normalized: 'pick' },
    render: { primary: 'отобразить', normalized: 'render' },
    // Modifiers
    into: { primary: 'в', alternatives: ['во'], normalized: 'into' },
    before: { primary: 'до', alternatives: ['перед'], normalized: 'before' },
    after: { primary: 'после', normalized: 'after' },
    // Event modifiers
    until: { primary: 'пока_не', normalized: 'until' },
    event: { primary: 'событие', normalized: 'event' },
    from: { primary: 'из', alternatives: ['от', 'с'], normalized: 'from' },
    // Phase 8 (htmx v4 localized attributes): attribute-suffix keywords
    // used by the vocab generator — `sse-подключить`, `hx-в-прямом-эфире`, etc.
    connect: {
      primary: 'подключить',
      alternatives: ['соединить', 'подключиться'],
      normalized: 'connect',
    },
    stream: { primary: 'транслировать', alternatives: ['поток', 'стрим'], normalized: 'stream' },
    live: {
      primary: 'в-прямом-эфире',
      alternatives: ['прямой-эфир', 'вживую', 'живой'],
      normalized: 'live',
    },
    socket: {
      primary: 'сокет',
      alternatives: ['гнездо', 'websocket', 'socket'],
      normalized: 'socket',
    },
    // Reactive / realtime commands
    bind: { primary: 'привязать', alternatives: ['связать', 'bind'], normalized: 'bind' },
    intercept: {
      primary: 'перехватить',
      alternatives: ['перехвати', 'intercept'],
      normalized: 'intercept',
    },
    worker: { primary: 'рабочий', alternatives: ['воркер', 'worker'], normalized: 'worker' },
    eventsource: {
      primary: 'eventsource',
      alternatives: ['источник-событий'],
      normalized: 'eventsource',
    },
  },
  eventHandler: {
    keyword: { primary: 'при', normalized: 'on' },
    sourceMarker: { primary: 'на', alternatives: ['в', 'при'], position: 'before' },
    // Event marker: при (at/on/upon), used in SVO pattern
    // Pattern: при [event] [verb] [patient] на [destination?]
    // Example: при клике переключить .active на #button
    eventMarker: { primary: 'при', position: 'before' },
    temporalMarkers: ['когда', 'если'], // temporal conjunctions (when, if)
  },
  lexicon: {
    events: {
      blur: { primary: 'потеря_фокуса' },
      change: { primary: 'изменение' },
      click: { primary: 'клик' },
      dblclick: { primary: 'двойной_клик' },
      focus: { primary: 'фокус' },
      input: { primary: 'ввод' },
      keydown: { primary: 'клавиша_вниз' },
      keypress: { primary: 'нажатие_клавиши' },
      keyup: { primary: 'клавиша_вверх' },
      load: { primary: 'загрузка' },
      mousedown: { primary: 'мышьвниз' },
      mouseenter: { primary: 'мышь_вход' },
      mouseleave: { primary: 'мышь_выход' },
      mousemove: { primary: 'движение_мыши' },
      mouseout: { primary: 'уход' },
      mouseover: { primary: 'наведение' },
      mouseup: { primary: 'мышьвверх' },
      reset: { primary: 'сбросить' },
      resize: { primary: 'изменениеразмера' },
      scroll: { primary: 'прокрутка' },
      submit: { primary: 'отправка' },
      touchcancel: { primary: 'касание_отмена' },
      touchend: { primary: 'касание_конец' },
      touchmove: { primary: 'касание_движение' },
      touchstart: { primary: 'касание_начало' },
      unload: { primary: 'выгрузка' },
    },
    logical: {
      and: { primary: 'и' },
      changes: { primary: 'изменяется' },
      contains: { primary: 'содержит' },
      else: { primary: 'иначе' },
      empty: { primary: 'пустой' },
      end: { primary: 'конец' },
      equals: { primary: 'равно' },
      exists: { primary: 'существует' },
      has: { primary: 'имеет' },
      have: { primary: 'имею' },
      includes: { primary: 'включает' },
      is: { primary: 'есть' },
      isNot: { primary: 'не_есть' },
      live: { primary: 'живой' },
      matches: { primary: 'соответствует' },
      not: { primary: 'не' },
      or: { primary: 'или' },
      otherwise: { primary: 'в_противном_случае' },
      then: { primary: 'затем' },
      when: { primary: 'когда' },
      where: { primary: 'где' },
    },
    temporal: {
      every: { primary: 'каждый' },
      forever: { primary: 'всегда' },
      h: { primary: 'ч' },
      hour: { primary: 'час' },
      hours: { primary: 'часов' },
      millisecond: { primary: 'миллисекунда' },
      milliseconds: { primary: 'миллисекунд' },
      min: { primary: 'мин' },
      minute: { primary: 'минута' },
      minutes: { primary: 'минут' },
      ms: { primary: 'мс' },
      once: { primary: 'однажды' },
      s: { primary: 'с' },
      second: { primary: 'секунда' },
      seconds: { primary: 'секунд' },
      until: { primary: 'до' },
    },
    values: {
      body: { primary: 'тело' },
      closest: { primary: 'ближайший' },
      detail: { primary: 'детали' },
      document: { primary: 'документ' },
      element: { primary: 'элемент' },
      event: { primary: 'событие' },
      false: { primary: 'ложь' },
      first: { primary: 'первый' },
      it: { primary: 'это' },
      its: { primary: 'его' },
      last: { primary: 'последний' },
      me: { primary: 'я' },
      my: { primary: 'мой' },
      myself: { primary: 'я_сам' },
      next: { primary: 'следующий' },
      null: { primary: 'ничего' },
      parent: { primary: 'родитель' },
      previous: { primary: 'предыдущий' },
      result: { primary: 'результат' },
      target: { primary: 'цель' },
      true: { primary: 'истина' },
      undefined: { primary: 'неопределено' },
      value: { primary: 'значение' },
      window: { primary: 'окно' },
      you: { primary: 'ты' },
      your: { primary: 'твой' },
      yourself: { primary: 'сам' },
    },
    attributes: {
      attribute: { primary: 'атрибут' },
      attributes: { primary: 'атрибуты' },
      checked: { primary: 'отмечено' },
      class: { primary: 'класс' },
      classes: { primary: 'классы' },
      disabled: { primary: 'отключено' },
      hidden: { primary: 'скрыто' },
      html: { primary: 'html' },
      properties: { primary: 'свойства' },
      property: { primary: 'свойство' },
      readonly: { primary: 'только_чтение' },
      required: { primary: 'обязательно' },
      selected: { primary: 'выбрано' },
      style: { primary: 'стиль' },
      styles: { primary: 'стили' },
      text: { primary: 'текст' },
    },
    expressions: {
      at: { primary: 'в' },
      characters: { primary: 'символы' },
      children: { primary: 'дети' },
      closest: { primary: 'ближайший' },
      empty: { primary: 'пустой' },
      'ends with': { primary: 'заканчивается_на' },
      exclusive: { primary: 'исключительно' },
      first: { primary: 'первый' },
      'ignoring case': { primary: 'без_учёта_регистра' },
      inclusive: { primary: 'включительно' },
      'joined by': { primary: 'объединено_через' },
      last: { primary: 'последний' },
      'mapped to': { primary: 'преобразовано_в' },
      next: { primary: 'следующий' },
      no: { primary: 'нет' },
      parent: { primary: 'родитель' },
      prev: { primary: 'пред' },
      previous: { primary: 'предыдущий' },
      random: { primary: 'случайный' },
      some: { primary: 'некоторые' },
      'sorted by': { primary: 'сортировано_по' },
      'split by': { primary: 'разделено_по' },
      'starts with': { primary: 'начинается_с' },
      within: { primary: 'внутри' },
    },
  },
};
