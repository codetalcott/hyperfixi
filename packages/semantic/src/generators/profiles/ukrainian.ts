/**
 * Ukrainian Language Profile
 *
 * SVO word order, prepositions, space-separated.
 * Ukrainian is a fusional language with rich verb conjugation.
 * Uses infinitive form in software UI (industry standard).
 */

import type { LanguageProfile } from './types';

export const ukrainianProfile: LanguageProfile = {
  code: 'uk',
  name: 'Ukrainian',
  nativeName: 'Українська',
  direction: 'ltr',
  script: 'cyrillic',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  defaultVerbForm: 'infinitive',
  verb: {
    position: 'start',
    subjectDrop: true,
    suffixes: ['ти', 'тися', 'ити', 'итися', 'ати', 'атися', 'іти', 'ітися'],
  },
  references: {
    me: 'я',
    it: 'це',
    you: 'ти',
    result: 'результат',
    event: 'подія',
    target: 'ціль',
    body: 'тіло', // was an English placeholder; the i18n dict emits the Ukrainian word
    document: 'документ',
    window: 'вікно',
    detail: 'деталі',
  },
  possessive: {
    marker: '',
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'мій',
      it: 'його',
      you: 'твій',
    },
    keywords: {
      // "my" variants (masculine/feminine/neuter/plural)
      мій: 'me',
      моя: 'me',
      моє: 'me',
      мої: 'me',
      // "your" variants
      твій: 'you',
      твоя: 'you',
      твоє: 'you',
      твої: 'you',
      // "its/his/her" forms
      його: 'it', // his/its
      її: 'it', // her/its (feminine)
    },
  },
  roleMarkers: {
    destination: { primary: 'в', alternatives: ['на', 'до'], position: 'before' },
    source: { primary: 'з', alternatives: ['від', 'із'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'з', alternatives: ['із'], position: 'before' },
  },
  keywords: {
    // Class/Attribute operations (infinitive form)
    toggle: {
      primary: 'перемкнути',
      alternatives: ['перемкни'],
      normalized: 'toggle',
      form: 'infinitive',
    },
    add: { primary: 'додати', alternatives: ['додай'], normalized: 'add', form: 'infinitive' },
    remove: {
      primary: 'видалити',
      alternatives: ['видали', 'прибрати', 'прибери'],
      normalized: 'remove',
      form: 'infinitive',
    },
    // Content operations
    put: {
      primary: 'покласти',
      alternatives: ['поклади', 'помістити', 'помісти', 'вставити', 'встав'],
      normalized: 'put',
      form: 'infinitive',
    },
    // See the russian.ts note: underscore compounds were an inert tokenizer
    // workaround (the extractor split on `_`, so uk append/prepend parsed as
    // `add`). All spellings parse now; the primary is the natural one.
    append: {
      primary: 'дописати',
      alternatives: ['додати в кінець', 'додати_в_кінець'],
      normalized: 'append',
      form: 'infinitive',
    },
    prepend: {
      primary: 'додати на початок',
      alternatives: ['додати_на_початок'],
      normalized: 'prepend',
      form: 'infinitive',
    },
    take: { primary: 'взяти', alternatives: ['візьми'], normalized: 'take', form: 'infinitive' },
    make: { primary: 'створити', alternatives: ['створи'], normalized: 'make', form: 'infinitive' },
    clone: {
      primary: 'клонувати',
      alternatives: ['клонуй'],
      normalized: 'clone',
      form: 'infinitive',
    },
    swap: {
      primary: 'поміняти',
      alternatives: ['поміняй'],
      normalized: 'swap',
      form: 'infinitive',
    },
    morph: {
      primary: 'трансформувати',
      alternatives: ['трансформуй'],
      normalized: 'morph',
      form: 'infinitive',
    },
    // Variable operations
    set: {
      primary: 'встановити',
      alternatives: ['встанови', 'задати', 'задай'],
      normalized: 'set',
      form: 'infinitive',
    },
    get: { primary: 'отримати', alternatives: ['отримай'], normalized: 'get', form: 'infinitive' },
    increment: {
      primary: 'збільшити',
      alternatives: ['збільш'],
      normalized: 'increment',
      form: 'infinitive',
    },
    decrement: {
      primary: 'зменшити',
      alternatives: ['зменш'],
      normalized: 'decrement',
      form: 'infinitive',
    },
    log: { primary: 'записати', alternatives: ['запиши'], normalized: 'log', form: 'infinitive' },
    // Visibility
    show: { primary: 'показати', alternatives: ['покажи'], normalized: 'show', form: 'infinitive' },
    hide: {
      primary: 'сховати',
      alternatives: ['сховай', 'приховати', 'приховай'],
      normalized: 'hide',
      form: 'infinitive',
    },
    transition: {
      primary: 'анімувати',
      alternatives: ['анімуй'],
      normalized: 'transition',
      form: 'infinitive',
    },
    // Events
    on: { primary: 'при', normalized: 'on' },
    trigger: {
      primary: 'ініціювати',
      alternatives: ['запустити', 'запусти'],
      normalized: 'trigger',
      form: 'infinitive',
    },
    send: {
      primary: 'надіслати',
      alternatives: ['надішли'],
      normalized: 'send',
      form: 'infinitive',
    },
    // DOM focus
    focus: {
      primary: 'сфокусувати',
      alternatives: ['сфокусуй', 'фокус'],
      normalized: 'focus',
      form: 'infinitive',
    },
    blur: {
      primary: 'розфокусувати',
      alternatives: ['розфокусуй'],
      normalized: 'blur',
      form: 'infinitive',
    },
    // Phase 1 (v0.9.90): DOM / form state / debug
    empty: { primary: 'спорожнити', alternatives: ['порожній'], normalized: 'empty' },
    open: { primary: 'відкрити', normalized: 'open' },
    close: { primary: 'закрити', normalized: 'close' },
    select: { primary: 'виділити', normalized: 'select' },
    clear: { primary: 'очистити', normalized: 'clear' },
    reset: { primary: 'скинути', normalized: 'reset' },
    breakpoint: { primary: 'точка-зупинки', normalized: 'breakpoint' },
    // Common event names (for event handler patterns)
    click: { primary: 'кліку', alternatives: ['клік', 'натисканні'], normalized: 'click' },
    hover: { primary: 'наведенні', alternatives: ['наведення'], normalized: 'hover' },
    // `надсилання` is the form the i18n dict emits for `submit` (the profile
    // primary `відправці` is a different word); without it `on submit` events
    // (fetch-with-method/-formdata, morph-form-update, form-submit-prevent) parse
    // the event as a bare `expression`, not a `literal` (the on.event R1 residue).
    submit: {
      primary: 'відправці',
      alternatives: ['відправка', 'надсилання'],
      normalized: 'submit',
    },
    input: { primary: 'введенні', alternatives: ['введення'], normalized: 'input' },
    change: { primary: 'зміні', alternatives: ['зміна'], normalized: 'change' },
    // i18n dict emits `завантаження` for `load` (stagger-animation `on load`).
    load: { primary: 'завантаження', normalized: 'load' },
    // Navigation
    go: {
      primary: 'перейти',
      alternatives: ['перейди', 'йти', 'йди'],
      normalized: 'go',
      form: 'infinitive',
    },
    scroll: {
      primary: 'прокрутити',
      alternatives: ['прокрути'],
      normalized: 'scroll',
      form: 'infinitive',
    },
    push: {
      primary: 'штовхнути',
      alternatives: ['заштовхнути'],
      normalized: 'push',
      form: 'infinitive',
    },
    replace: {
      primary: 'замінити',
      alternatives: ['заміни'],
      normalized: 'replace',
      form: 'infinitive',
    },
    process: {
      primary: 'обробити',
      alternatives: ['обробляти'],
      normalized: 'process',
      form: 'infinitive',
    },
    // Async
    wait: {
      primary: 'чекати',
      alternatives: ['чекай', 'зачекай'],
      normalized: 'wait',
      form: 'infinitive',
    },
    fetch: {
      primary: 'завантажити',
      alternatives: ['завантаж'],
      normalized: 'fetch',
      form: 'infinitive',
    },
    settle: { primary: 'стабілізувати', normalized: 'settle', form: 'infinitive' },
    // Control flow
    if: { primary: 'якщо', normalized: 'if' },
    unless: { primary: 'крім', normalized: 'unless' },
    when: { primary: 'коли', normalized: 'when' },
    where: { primary: 'де', normalized: 'where' },
    else: { primary: 'інакше', normalized: 'else' },
    repeat: {
      primary: 'повторити',
      alternatives: ['повтори'],
      normalized: 'repeat',
      form: 'infinitive',
    },
    for: { primary: 'для', alternatives: ['кожний'], normalized: 'for' },
    while: { primary: 'поки', normalized: 'while' },
    // `repeat forever` loop keyword — corpus word recognized so loopType types
    // as `:literal` like EN (the repeat.loopType R1 residue; see spanish.ts).
    forever: { primary: 'завжди', normalized: 'forever', alternatives: ['forever'] },
    continue: {
      primary: 'продовжити',
      alternatives: ['продовжуй'],
      normalized: 'continue',
      form: 'infinitive',
    },
    halt: {
      primary: 'зупинити',
      alternatives: ['зупинись', 'стоп'],
      normalized: 'halt',
      form: 'infinitive',
    },
    throw: { primary: 'кинути', alternatives: ['кинь'], normalized: 'throw', form: 'infinitive' },
    call: {
      primary: 'викликати',
      alternatives: ['виклич'],
      normalized: 'call',
      form: 'infinitive',
    },
    return: {
      primary: 'повернути',
      alternatives: ['поверни'],
      normalized: 'return',
      form: 'infinitive',
    },
    then: { primary: 'потім', alternatives: ['далі', 'тоді'], normalized: 'then' },
    and: { primary: 'і', alternatives: ['та'], normalized: 'and' },
    // Comparison operator — see korean.ts for the rationale. A folded conditional's
    // raw condition is read by the core expression parser (English operators only),
    // so `target відповідає .x` must normalize to `target matches .x`; otherwise
    // `відповідає` stays an identifier and modal-close-backdrop drops its then-branch.
    matches: { primary: 'відповідає', normalized: 'matches' },
    // Existence operator (`if #modal exists`). Same seam as `matches`: without the
    // keyword the surface stays an identifier and leaks verbatim into the
    // condition's raw expression (if-exists). Neither an ActionType nor a command
    // schema, so no pattern is generated from it.
    exists: { primary: 'існує', normalized: 'exists' },
    // Copula (`if result is false`, `if my value is empty`). Without the keyword the
    // surface stays an identifier and leaks verbatim into the condition's raw
    // expression, which the core expression parser reads as English. Neither an
    // ActionType nor a command schema, so no pattern is generated from it.
    is: { primary: 'є', normalized: 'is' },
    // Negative-existence operator (`if no dragHandle set dragHandle to me`). Same
    // seam as `exists`: without the keyword the surface stays an identifier and
    // leaks verbatim into the condition's raw expression (behavior-draggable).
    // Neither an ActionType nor a command schema, so no pattern is generated from it.
    no: { primary: 'ні', normalized: 'no' },
    end: { primary: 'кінець', normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'асинхронно', alternatives: ['async'], normalized: 'async' },
    tell: { primary: 'сказати', alternatives: ['скажи'], normalized: 'tell', form: 'infinitive' },
    default: { primary: 'за_замовчуванням', normalized: 'default' },
    init: {
      primary: 'ініціалізувати',
      alternatives: ['ініціалізуй'],
      normalized: 'init',
      form: 'infinitive',
    },
    behavior: { primary: 'поведінка', normalized: 'behavior' },
    // `install` is the loanword `інсталювати` — NOT `встановити`, which is the
    // `set` primary (uk "install" and "set" are homonyms). The previous
    // disambiguator `встановити_пакет` was inert: the uk tokenizer splits on `_`,
    // so it tokenized back to `встановити` → `set`, dropping the install action
    // (install-behavior degenerate). The loanword is a single Cyrillic token.
    install: { primary: 'інсталювати', normalized: 'install', form: 'infinitive' },
    measure: {
      primary: 'виміряти',
      alternatives: ['виміряй'],
      normalized: 'measure',
      form: 'infinitive',
    },
    beep: { primary: 'звук', normalized: 'beep' },
    break: { primary: 'перервати', normalized: 'break' },
    copy: { primary: 'копіювати', normalized: 'copy' },
    exit: { primary: 'вийти', normalized: 'exit' },
    pick: { primary: 'вибрати', normalized: 'pick' },
    render: { primary: 'відобразити', normalized: 'render' },
    // Modifiers
    into: { primary: 'в', alternatives: ['у'], normalized: 'into' },
    before: { primary: 'до', alternatives: ['перед'], normalized: 'before' },
    after: { primary: 'після', normalized: 'after' },
    // Event modifiers
    until: { primary: 'поки_не', normalized: 'until' },
    event: { primary: 'подія', normalized: 'event' },
    from: { primary: 'з', alternatives: ['від', 'із'], normalized: 'from' },
    // Phase 8 (htmx v4 localized attributes): attribute-suffix keywords
    // used by the vocab generator — `sse-підключити`, `hx-наживо`, etc.
    connect: {
      primary: 'підключити',
      alternatives: ['зʼєднати', 'підключитися'],
      normalized: 'connect',
    },
    stream: { primary: 'транслювати', alternatives: ['потік', 'стрім'], normalized: 'stream' },
    live: {
      primary: 'наживо',
      alternatives: ['у-прямому-ефірі', 'в-режимі-реального-часу', 'живий'],
      normalized: 'live',
    },
    socket: {
      primary: 'сокет',
      alternatives: ['гніздо', 'websocket', 'socket'],
      normalized: 'socket',
    },
    // Reactive / realtime commands
    // ASCII apostrophe (U+0027) — the Ukrainian tokenizer's letter class
    // whitelists U+0027, not the typographic ʼ (U+02BC); `приєднати` is an
    // apostrophe-free fallback.
    bind: {
      primary: "прив'язати",
      alternatives: ["зв'язати", 'приєднати', 'bind'],
      normalized: 'bind',
    },
    intercept: {
      primary: 'перехопити',
      alternatives: ['перехоплення', 'intercept'],
      normalized: 'intercept',
    },
    worker: { primary: 'робітник', alternatives: ['воркер', 'worker'], normalized: 'worker' },
    eventsource: {
      primary: 'eventsource',
      alternatives: ['джерело-подій'],
      normalized: 'eventsource',
    },
  },
  eventHandler: {
    keyword: { primary: 'при', normalized: 'on' },
    sourceMarker: { primary: 'на', alternatives: ['в', 'при'], position: 'before' },
    // Event marker: при (at/on/upon), used in SVO pattern
    // Pattern: при [event] [verb] [patient] на [destination?]
    // Example: при кліку перемкнути .active на #button
    eventMarker: { primary: 'при', position: 'before' },
    temporalMarkers: ['коли', 'якщо'], // temporal conjunctions (when, if)
  },
  lexicon: {
    events: {
      blur: { primary: 'розфокус' },
      change: { primary: 'зміна' },
      click: { primary: 'клік' },
      dblclick: { primary: 'подвійний_клік' },
      focus: { primary: 'фокус' },
      input: { primary: 'введення' },
      keydown: { primary: 'клавіша_вниз' },
      keypress: { primary: 'натискання_клавіші' },
      keyup: { primary: 'клавіша_вгору' },
      load: { primary: 'завантаження' },
      mousedown: { primary: 'мишавниз' },
      mouseenter: { primary: 'миша_вхід' },
      mouseleave: { primary: 'миша_вихід' },
      mousemove: { primary: 'рух_миші' },
      mouseout: { primary: 'відведення' },
      mouseover: { primary: 'наведення' },
      mouseup: { primary: 'мишавгору' },
      reset: { primary: 'скинути' },
      resize: { primary: 'змінарозміру' },
      scroll: { primary: 'прокрутка' },
      submit: { primary: 'надсилання' },
      touchcancel: { primary: 'дотик_скасування' },
      touchend: { primary: 'дотик_кінець' },
      touchmove: { primary: 'дотик_рух' },
      touchstart: { primary: 'дотик_початок' },
      unload: { primary: 'вивантаження' },
    },
    logical: {
      and: { primary: 'і' },
      changes: { primary: 'змінюється' },
      contains: { primary: 'містить' },
      else: { primary: 'інакше' },
      empty: { primary: 'порожній' },
      end: { primary: 'кінець' },
      equals: { primary: 'дорівнює' },
      exists: { primary: 'існує' },
      has: { primary: 'має' },
      have: { primary: 'маю' },
      includes: { primary: 'включає' },
      is: { primary: 'є' },
      isNot: { primary: 'не_є' },
      live: { primary: 'живий' },
      matches: { primary: 'відповідає' },
      not: { primary: 'не' },
      or: { primary: 'або' },
      otherwise: { primary: 'в_іншому_випадку' },
      then: { primary: 'тоді' },
      when: { primary: 'коли' },
      where: { primary: 'де' },
    },
    temporal: {
      every: { primary: 'кожний' },
      forever: { primary: 'завжди' },
      h: { primary: 'год' },
      hour: { primary: 'година' },
      hours: { primary: 'годин' },
      millisecond: { primary: 'мілісекунда' },
      milliseconds: { primary: 'мілісекунд' },
      min: { primary: 'хв' },
      minute: { primary: 'хвилина' },
      minutes: { primary: 'хвилин' },
      ms: { primary: 'мс' },
      once: { primary: 'один_раз' },
      s: { primary: 'с' },
      second: { primary: 'секунда' },
      seconds: { primary: 'секунд' },
      until: { primary: 'до' },
    },
    values: {
      body: { primary: 'тіло' },
      closest: { primary: 'найближчий' },
      detail: { primary: 'деталі' },
      document: { primary: 'документ' },
      element: { primary: 'елемент' },
      event: { primary: 'подія' },
      false: { primary: 'хибність' },
      first: { primary: 'перший' },
      it: { primary: 'це' },
      its: { primary: 'його' },
      last: { primary: 'останній' },
      me: { primary: 'я' },
      my: { primary: 'мій' },
      myself: { primary: 'я_сам' },
      next: { primary: 'наступний' },
      null: { primary: 'нічого' },
      parent: { primary: 'батьківський' },
      previous: { primary: 'попередній' },
      result: { primary: 'результат' },
      target: { primary: 'ціль' },
      true: { primary: 'істина' },
      undefined: { primary: 'невизначено' },
      value: { primary: 'значення' },
      window: { primary: 'вікно' },
      you: { primary: 'ти' },
      your: { primary: 'твій' },
      yourself: { primary: 'сам' },
    },
    attributes: {
      attribute: { primary: 'атрибут' },
      attributes: { primary: 'атрибути' },
      checked: { primary: 'позначено' },
      class: { primary: 'клас' },
      classes: { primary: 'класи' },
      disabled: { primary: 'вимкнено' },
      hidden: { primary: 'приховано' },
      html: { primary: 'html' },
      properties: { primary: 'властивості' },
      property: { primary: 'властивість' },
      readonly: { primary: 'лише_читання' },
      required: { primary: "обов'язково" },
      selected: { primary: 'вибрано' },
      style: { primary: 'стиль' },
      styles: { primary: 'стилі' },
      text: { primary: 'текст' },
    },
    expressions: {
      at: { primary: 'в' },
      characters: { primary: 'символи' },
      children: { primary: 'діти' },
      closest: { primary: 'найближчий' },
      empty: { primary: 'порожній' },
      'ends with': { primary: 'закінчується_на' },
      exclusive: { primary: 'виключно' },
      first: { primary: 'перший' },
      'ignoring case': { primary: 'без_урахування_регістру' },
      inclusive: { primary: 'включно' },
      'joined by': { primary: "об'єднано_через" },
      last: { primary: 'останній' },
      'mapped to': { primary: 'перетворено_на' },
      next: { primary: 'наступний' },
      no: { primary: 'ні' },
      parent: { primary: 'батьківський' },
      prev: { primary: 'попер' },
      previous: { primary: 'попередній' },
      random: { primary: 'випадковий' },
      some: { primary: 'деякі' },
      'sorted by': { primary: 'відсортовано_за' },
      'split by': { primary: 'розділено_за' },
      'starts with': { primary: 'починається_з' },
      within: { primary: 'всередині' },
    },
  },
};
