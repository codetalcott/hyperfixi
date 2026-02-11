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
    body: 'body',
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
    append: {
      primary: 'добавить_в_конец',
      alternatives: ['дописать'],
      normalized: 'append',
      form: 'infinitive',
    },
    prepend: { primary: 'добавить_в_начало', normalized: 'prepend', form: 'infinitive' },
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
    // Common event names (for event handler patterns)
    click: { primary: 'клик', alternatives: ['клике', 'нажатии'], normalized: 'click' },
    hover: { primary: 'наведении', alternatives: ['наведение'], normalized: 'hover' },
    submit: { primary: 'отправке', alternatives: ['отправка'], normalized: 'submit' },
    input: { primary: 'вводе', alternatives: ['ввод'], normalized: 'input' },
    change: { primary: 'изменении', alternatives: ['изменение'], normalized: 'change' },
    // Navigation
    go: {
      primary: 'перейти',
      alternatives: ['перейди', 'идти', 'иди'],
      normalized: 'go',
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
    install: { primary: 'установить_пакет', normalized: 'install', form: 'infinitive' },
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
};
