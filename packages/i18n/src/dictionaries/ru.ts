/**
 * Russian Dictionary
 *
 * Translations for Russian language support.
 * Uses infinitive verbs (common in software UIs).
 */

import { Dictionary } from '../types';

export const russianDictionary: Dictionary = {
  commands: {
    // Event handling
    on: 'при',
    tell: 'сказать',
    trigger: 'вызвать',
    send: 'отправить',

    // DOM manipulation
    take: 'взять',
    put: 'положить',
    set: 'установить',
    get: 'получить',
    add: 'добавить',
    remove: 'удалить',
    toggle: 'переключить',
    hide: 'скрыть',
    show: 'показать',

    // Control flow
    if: 'если',
    unless: 'если_не',
    repeat: 'повторить',
    for: 'для',
    while: 'пока',
    until: 'до',
    continue: 'продолжить',
    break: 'прервать',
    halt: 'остановить',

    // Async
    wait: 'ждать',
    fetch: 'загрузить',
    call: 'вызвать',
    return: 'вернуть',

    // Other commands
    make: 'создать',
    log: 'записать',
    throw: 'бросить',
    catch: 'поймать',
    measure: 'измерить',
    transition: 'анимировать',

    // Data Commands
    increment: 'увеличить',
    decrement: 'уменьшить',
    bind: 'связать',
    default: 'по_умолчанию',
    persist: 'сохранить',

    // Navigation Commands
    go: 'перейти',
    pushUrl: 'добавить_url',
    replaceUrl: 'заменить_url',

    // Utility Commands
    copy: 'копировать',
    pick: 'выбрать',
    beep: 'звук',

    // Advanced Commands
    js: 'js',
    async: 'асинхронно',
    render: 'отобразить',

    // Animation Commands
    swap: 'поменять',
    morph: 'трансформировать',
    settle: 'стабилизировать',

    // Content Commands
    append: 'добавить_в_конец',

    // Control Flow
    exit: 'выйти',
    else: 'иначе',

    // Behaviors
    install: 'установить',
    init: 'инициализировать',
    behavior: 'поведение',

    // Focus
    focus: 'сфокусировать',
    blur: 'размыть',

    // Clone
    clone: 'клонировать',
    prepend: 'добавить_в_начало',
  },

  modifiers: {
    to: 'к',
    from: 'из',
    into: 'в',
    with: 'с',
    at: 'у',
    in: 'в',
    of: 'из',
    as: 'как',
    by: 'на',
    before: 'до',
    after: 'после',
    over: 'над',
    under: 'под',
    between: 'между',
    through: 'через',
    without: 'без',
    on: 'на',
  },

  events: {
    click: 'клик',
    dblclick: 'двойной_клик',
    mousedown: 'мышь_вниз',
    mouseup: 'мышь_вверх',
    mouseenter: 'мышь_вход',
    mouseleave: 'мышь_выход',
    mouseover: 'наведение',
    mouseout: 'уход',
    mousemove: 'движение_мыши',

    keydown: 'клавиша_вниз',
    keyup: 'клавиша_вверх',
    keypress: 'нажатие_клавиши',

    focus: 'фокус',
    blur: 'потеря_фокуса',
    change: 'изменение',
    input: 'ввод',
    submit: 'отправка',
    reset: 'сброс',

    load: 'загрузка',
    unload: 'выгрузка',
    resize: 'изменение_размера',
    scroll: 'прокрутка',

    touchstart: 'касание_начало',
    touchend: 'касание_конец',
    touchmove: 'касание_движение',
    touchcancel: 'касание_отмена',
  },

  logical: {
    when: 'TODO',
    where: 'TODO',
    and: 'и',
    or: 'или',
    not: 'не',
    is: 'есть',
    exists: 'существует',
    matches: 'соответствует',
    contains: 'содержит',
    includes: 'включает',
    equals: 'равно',
    then: 'затем',
    else: 'иначе',
    otherwise: 'в_противном_случае',
    end: 'конец',
    has: 'имеет',
    isNot: 'не_есть',
    empty: 'пустой',
  },

  temporal: {
    seconds: 'секунд',
    second: 'секунда',
    milliseconds: 'миллисекунд',
    millisecond: 'миллисекунда',
    minutes: 'минут',
    minute: 'минута',
    hours: 'часов',
    hour: 'час',
    ms: 'мс',
    s: 'с',
    min: 'мин',
    h: 'ч',
    forever: 'всегда',
    once: 'однажды',
    every: 'каждый',
    until: 'до',
  },

  values: {
    true: 'истина',
    false: 'ложь',
    null: 'ничего',
    undefined: 'неопределено',
    it: 'это',
    its: 'его',
    me: 'я',
    my: 'мой',
    you: 'ты',
    your: 'твой',
    yourself: 'сам',
    myself: 'я_сам',
    element: 'элемент',
    target: 'цель',
    detail: 'детали',
    event: 'событие',
    window: 'окно',
    document: 'документ',
    body: 'тело',
    result: 'результат',
    value: 'значение',
    first: 'первый',
    last: 'последний',
    next: 'следующий',
    previous: 'предыдущий',
    closest: 'ближайший',
    parent: 'родитель',
  },

  attributes: {
    class: 'класс',
    classes: 'классы',
    style: 'стиль',
    styles: 'стили',
    attribute: 'атрибут',
    attributes: 'атрибуты',
    property: 'свойство',
    properties: 'свойства',
    disabled: 'отключено',
    hidden: 'скрыто',
    checked: 'отмечено',
    selected: 'выбрано',
    readonly: 'только_чтение',
    required: 'обязательно',
    text: 'текст',
    html: 'html',
  },

  expressions: {
    // Positional
    first: 'первый',
    last: 'последний',
    next: 'следующий',
    previous: 'предыдущий',
    prev: 'пред',
    at: 'в',
    random: 'случайный',

    // DOM Traversal
    closest: 'ближайший',
    parent: 'родитель',
    children: 'дети',
    within: 'внутри',

    // Emptiness/Existence
    no: 'нет',
    empty: 'пустой',
    some: 'некоторые',

    // String operations
    'starts with': 'начинается_с',
    'ends with': 'заканчивается_на',
  },
};
