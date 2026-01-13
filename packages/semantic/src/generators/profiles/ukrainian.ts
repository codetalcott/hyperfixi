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
    body: 'body',
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
  },
  roleMarkers: {
    destination: { primary: 'в', alternatives: ['на', 'до'], position: 'before' },
    source: { primary: 'з', alternatives: ['від', 'із'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'з', alternatives: ['із'], position: 'before' },
  },
  keywords: {
    // Class/Attribute operations (infinitive form)
    toggle: { primary: 'перемкнути', alternatives: ['перемкни'], normalized: 'toggle', form: 'infinitive' },
    add: { primary: 'додати', alternatives: ['додай'], normalized: 'add', form: 'infinitive' },
    remove: { primary: 'видалити', alternatives: ['видали', 'прибрати', 'прибери'], normalized: 'remove', form: 'infinitive' },
    // Content operations
    put: { primary: 'покласти', alternatives: ['поклади', 'помістити', 'помісти', 'вставити', 'встав'], normalized: 'put', form: 'infinitive' },
    append: { primary: 'додати_в_кінець', alternatives: ['дописати'], normalized: 'append', form: 'infinitive' },
    prepend: { primary: 'додати_на_початок', normalized: 'prepend', form: 'infinitive' },
    take: { primary: 'взяти', alternatives: ['візьми'], normalized: 'take', form: 'infinitive' },
    make: { primary: 'створити', alternatives: ['створи'], normalized: 'make', form: 'infinitive' },
    clone: { primary: 'клонувати', alternatives: ['клонуй'], normalized: 'clone', form: 'infinitive' },
    swap: { primary: 'поміняти', alternatives: ['поміняй'], normalized: 'swap', form: 'infinitive' },
    morph: { primary: 'трансформувати', alternatives: ['трансформуй'], normalized: 'morph', form: 'infinitive' },
    // Variable operations
    set: { primary: 'встановити', alternatives: ['встанови', 'задати', 'задай'], normalized: 'set', form: 'infinitive' },
    get: { primary: 'отримати', alternatives: ['отримай'], normalized: 'get', form: 'infinitive' },
    increment: { primary: 'збільшити', alternatives: ['збільш'], normalized: 'increment', form: 'infinitive' },
    decrement: { primary: 'зменшити', alternatives: ['зменш'], normalized: 'decrement', form: 'infinitive' },
    log: { primary: 'записати', alternatives: ['запиши'], normalized: 'log', form: 'infinitive' },
    // Visibility
    show: { primary: 'показати', alternatives: ['покажи'], normalized: 'show', form: 'infinitive' },
    hide: { primary: 'сховати', alternatives: ['сховай', 'приховати', 'приховай'], normalized: 'hide', form: 'infinitive' },
    transition: { primary: 'анімувати', alternatives: ['анімуй'], normalized: 'transition', form: 'infinitive' },
    // Events
    on: { primary: 'при', alternatives: ['коли'], normalized: 'on' },
    trigger: { primary: 'викликати', alternatives: ['виклич'], normalized: 'trigger', form: 'infinitive' },
    send: { primary: 'надіслати', alternatives: ['надішли'], normalized: 'send', form: 'infinitive' },
    // DOM focus
    focus: { primary: 'сфокусувати', alternatives: ['сфокусуй', 'фокус'], normalized: 'focus', form: 'infinitive' },
    blur: { primary: 'розфокусувати', alternatives: ['розфокусуй'], normalized: 'blur', form: 'infinitive' },
    // Navigation
    go: { primary: 'перейти', alternatives: ['перейди', 'йти', 'йди'], normalized: 'go', form: 'infinitive' },
    // Async
    wait: { primary: 'чекати', alternatives: ['чекай', 'зачекай'], normalized: 'wait', form: 'infinitive' },
    fetch: { primary: 'завантажити', alternatives: ['завантаж'], normalized: 'fetch', form: 'infinitive' },
    settle: { primary: 'стабілізувати', normalized: 'settle', form: 'infinitive' },
    // Control flow
    if: { primary: 'якщо', normalized: 'if' },
    when: { primary: 'коли', normalized: 'when' },
    where: { primary: 'де', normalized: 'where' },
    else: { primary: 'інакше', normalized: 'else' },
    repeat: { primary: 'повторити', alternatives: ['повтори'], normalized: 'repeat', form: 'infinitive' },
    for: { primary: 'для', alternatives: ['кожний'], normalized: 'for' },
    while: { primary: 'поки', normalized: 'while' },
    continue: { primary: 'продовжити', alternatives: ['продовжуй'], normalized: 'continue', form: 'infinitive' },
    halt: { primary: 'зупинити', alternatives: ['зупинись', 'стоп'], normalized: 'halt', form: 'infinitive' },
    throw: { primary: 'кинути', alternatives: ['кинь'], normalized: 'throw', form: 'infinitive' },
    call: { primary: 'викликати', alternatives: ['виклич'], normalized: 'call', form: 'infinitive' },
    return: { primary: 'повернути', alternatives: ['поверни'], normalized: 'return', form: 'infinitive' },
    then: { primary: 'потім', alternatives: ['далі', 'тоді'], normalized: 'then' },
    and: { primary: 'і', alternatives: ['та'], normalized: 'and' },
    end: { primary: 'кінець', normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'асинхронно', alternatives: ['async'], normalized: 'async' },
    tell: { primary: 'сказати', alternatives: ['скажи'], normalized: 'tell', form: 'infinitive' },
    default: { primary: 'за_замовчуванням', normalized: 'default' },
    init: { primary: 'ініціалізувати', alternatives: ['ініціалізуй'], normalized: 'init', form: 'infinitive' },
    behavior: { primary: 'поведінка', normalized: 'behavior' },
    install: { primary: 'встановити_пакет', normalized: 'install', form: 'infinitive' },
    measure: { primary: 'виміряти', alternatives: ['виміряй'], normalized: 'measure', form: 'infinitive' },
    // Modifiers
    into: { primary: 'в', alternatives: ['у'], normalized: 'into' },
    before: { primary: 'до', alternatives: ['перед'], normalized: 'before' },
    after: { primary: 'після', normalized: 'after' },
    // Event modifiers
    until: { primary: 'до', alternatives: ['поки_не'], normalized: 'until' },
    event: { primary: 'подія', normalized: 'event' },
    from: { primary: 'з', alternatives: ['від', 'із'], normalized: 'from' },
  },
  eventHandler: {
    keyword: { primary: 'при', alternatives: ['коли'], normalized: 'on' },
    sourceMarker: { primary: 'на', alternatives: ['в', 'при'], position: 'before' },
  },
};
