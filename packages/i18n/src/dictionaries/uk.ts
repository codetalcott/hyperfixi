/**
 * Ukrainian Dictionary
 *
 * Translations for Ukrainian language support.
 * Uses infinitive verbs (common in software UIs).
 */

import { Dictionary } from '../types';

export const ukrainianDictionary: Dictionary = {
  commands: {
    // Event handling
    on: 'при',
    tell: 'сказати',
    trigger: 'викликати',
    send: 'надіслати',

    // DOM manipulation
    take: 'взяти',
    put: 'покласти',
    set: 'встановити',
    get: 'отримати',
    add: 'додати',
    remove: 'видалити',
    toggle: 'перемкнути',
    hide: 'сховати',
    show: 'показати',

    // Control flow
    if: 'якщо',
    unless: 'якщо_не',
    repeat: 'повторити',
    for: 'для',
    while: 'поки',
    until: 'до',
    continue: 'продовжити',
    break: 'перервати',
    halt: 'зупинити',

    // Async
    wait: 'чекати',
    fetch: 'завантажити',
    call: 'викликати',
    return: 'повернути',

    // Other commands
    make: 'створити',
    log: 'записати',
    throw: 'кинути',
    catch: 'зловити',
    measure: 'виміряти',
    transition: 'анімувати',

    // Data Commands
    increment: 'збільшити',
    decrement: 'зменшити',
    bind: 'прив\'язати',
    default: 'за_замовчуванням',
    persist: 'зберегти',

    // Navigation Commands
    go: 'перейти',
    pushUrl: 'додати_url',
    replaceUrl: 'замінити_url',

    // Utility Commands
    copy: 'копіювати',
    pick: 'вибрати',
    beep: 'звук',

    // Advanced Commands
    js: 'js',
    async: 'асинхронно',
    render: 'відобразити',

    // Animation Commands
    swap: 'поміняти',
    morph: 'трансформувати',
    settle: 'стабілізувати',

    // Content Commands
    append: 'додати_в_кінець',

    // Control Flow
    exit: 'вийти',
    else: 'інакше',

    // Behaviors
    install: 'встановити',
    init: 'ініціалізувати',
    behavior: 'поведінка',

    // Focus
    focus: 'сфокусувати',
    blur: 'розфокусувати',

    // Clone
    clone: 'клонувати',
    prepend: 'додати_на_початок',
  },

  modifiers: {
    to: 'до',
    from: 'з',
    into: 'в',
    with: 'з',
    at: 'в',
    in: 'у',
    of: 'з',
    as: 'як',
    by: 'на',
    before: 'до',
    after: 'після',
    over: 'над',
    under: 'під',
    between: 'між',
    through: 'через',
    without: 'без',
    on: 'на',
  },

  events: {
    click: 'клік',
    dblclick: 'подвійний_клік',
    mousedown: 'миша_вниз',
    mouseup: 'миша_вгору',
    mouseenter: 'миша_вхід',
    mouseleave: 'миша_вихід',
    mouseover: 'наведення',
    mouseout: 'відведення',
    mousemove: 'рух_миші',

    keydown: 'клавіша_вниз',
    keyup: 'клавіша_вгору',
    keypress: 'натискання_клавіші',

    focus: 'фокус',
    blur: 'розфокус',
    change: 'зміна',
    input: 'введення',
    submit: 'надсилання',
    reset: 'скидання',

    load: 'завантаження',
    unload: 'вивантаження',
    resize: 'зміна_розміру',
    scroll: 'прокрутка',

    touchstart: 'дотик_початок',
    touchend: 'дотик_кінець',
    touchmove: 'дотик_рух',
    touchcancel: 'дотик_скасування',
  },

  logical: {
    when: 'коли',
    where: 'де',
    and: 'і',
    or: 'або',
    not: 'не',
    is: 'є',
    exists: 'існує',
    matches: 'відповідає',
    contains: 'містить',
    includes: 'включає',
    equals: 'дорівнює',
    then: 'тоді',
    else: 'інакше',
    otherwise: 'в_іншому_випадку',
    end: 'кінець',
    has: 'має',
    isNot: 'не_є',
    empty: 'порожній',
  },

  temporal: {
    seconds: 'секунд',
    second: 'секунда',
    milliseconds: 'мілісекунд',
    millisecond: 'мілісекунда',
    minutes: 'хвилин',
    minute: 'хвилина',
    hours: 'годин',
    hour: 'година',
    ms: 'мс',
    s: 'с',
    min: 'хв',
    h: 'год',
    forever: 'завжди',
    once: 'один_раз',
    every: 'кожний',
    until: 'до',
  },

  values: {
    true: 'істина',
    false: 'хибність',
    null: 'нічого',
    undefined: 'невизначено',
    it: 'це',
    its: 'його',
    me: 'я',
    my: 'мій',
    you: 'ти',
    your: 'твій',
    yourself: 'сам',
    myself: 'я_сам',
    element: 'елемент',
    target: 'ціль',
    detail: 'деталі',
    event: 'подія',
    window: 'вікно',
    document: 'документ',
    body: 'тіло',
    result: 'результат',
    value: 'значення',
    first: 'перший',
    last: 'останній',
    next: 'наступний',
    previous: 'попередній',
    closest: 'найближчий',
    parent: 'батьківський',
  },

  attributes: {
    class: 'клас',
    classes: 'класи',
    style: 'стиль',
    styles: 'стилі',
    attribute: 'атрибут',
    attributes: 'атрибути',
    property: 'властивість',
    properties: 'властивості',
    disabled: 'вимкнено',
    hidden: 'приховано',
    checked: 'позначено',
    selected: 'вибрано',
    readonly: 'лише_читання',
    required: 'обов\'язково',
    text: 'текст',
    html: 'html',
  },

  expressions: {
    // Positional
    first: 'перший',
    last: 'останній',
    next: 'наступний',
    previous: 'попередній',
    prev: 'попер',
    at: 'в',
    random: 'випадковий',

    // DOM Traversal
    closest: 'найближчий',
    parent: 'батьківський',
    children: 'діти',
    within: 'всередині',

    // Emptiness/Existence
    no: 'ні',
    empty: 'порожній',
    some: 'деякі',

    // String operations
    'starts with': 'починається_з',
    'ends with': 'закінчується_на',
  },
};
