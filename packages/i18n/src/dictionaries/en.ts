// packages/i18n/src/dictionaries/en.ts

import { Dictionary } from '../types';

/**
 * English dictionary - identity mapping since English is the canonical hyperscript language.
 * This exists primarily for symmetry in translation operations (e.g., en -> es).
 */
export const en: Dictionary = {
  commands: {
    // Event handling
    on: 'on',
    tell: 'tell',
    trigger: 'trigger',
    send: 'send',

    // DOM manipulation
    take: 'take',
    put: 'put',
    set: 'set',
    get: 'get',
    add: 'add',
    remove: 'remove',
    toggle: 'toggle',
    hide: 'hide',
    show: 'show',

    // Control flow
    if: 'if',
    unless: 'unless',
    repeat: 'repeat',
    for: 'for',
    while: 'while',
    until: 'until',
    continue: 'continue',
    break: 'break',
    halt: 'halt',

    // Async
    wait: 'wait',
    fetch: 'fetch',
    call: 'call',
    return: 'return',

    // Other commands
    make: 'make',
    log: 'log',
    throw: 'throw',
    catch: 'catch',
    measure: 'measure',
    transition: 'transition',

    // Data Commands
    increment: 'increment',
    decrement: 'decrement',
    bind: 'bind',
    default: 'default',
    persist: 'persist',

    // Navigation Commands
    go: 'go',
    pushUrl: 'pushUrl',
    replaceUrl: 'replaceUrl',

    // Utility Commands
    copy: 'copy',
    pick: 'pick',
    beep: 'beep',

    // Advanced Commands
    js: 'js',
    async: 'async',
    render: 'render',

    // Animation Commands
    swap: 'swap',
    morph: 'morph',
    settle: 'settle',

    // Content Commands
    append: 'append',

    // Control Flow
    exit: 'exit',

    // Behaviors
    install: 'install',
  },

  modifiers: {
    to: 'to',
    from: 'from',
    into: 'into',
    with: 'with',
    at: 'at',
    in: 'in',
    of: 'of',
    as: 'as',
    by: 'by',
    before: 'before',
    after: 'after',
    over: 'over',
    under: 'under',
    between: 'between',
    through: 'through',
    without: 'without',
  },

  events: {
    click: 'click',
    dblclick: 'dblclick',
    mousedown: 'mousedown',
    mouseup: 'mouseup',
    mouseenter: 'mouseenter',
    mouseleave: 'mouseleave',
    mouseover: 'mouseover',
    mouseout: 'mouseout',
    mousemove: 'mousemove',

    keydown: 'keydown',
    keyup: 'keyup',
    keypress: 'keypress',

    focus: 'focus',
    blur: 'blur',
    change: 'change',
    input: 'input',
    submit: 'submit',
    reset: 'reset',

    load: 'load',
    unload: 'unload',
    resize: 'resize',
    scroll: 'scroll',

    touchstart: 'touchstart',
    touchend: 'touchend',
    touchmove: 'touchmove',
    touchcancel: 'touchcancel',
  },

  logical: {
    and: 'and',
    or: 'or',
    not: 'not',
    is: 'is',
    exists: 'exists',
    matches: 'matches',
    contains: 'contains',
    includes: 'includes',
    equals: 'equals',
    then: 'then',
    else: 'else',
    otherwise: 'otherwise',
    end: 'end',
  },

  temporal: {
    seconds: 'seconds',
    second: 'second',
    milliseconds: 'milliseconds',
    millisecond: 'millisecond',
    minutes: 'minutes',
    minute: 'minute',
    hours: 'hours',
    hour: 'hour',
    ms: 'ms',
    s: 's',
    min: 'min',
    h: 'h',
  },

  values: {
    true: 'true',
    false: 'false',
    null: 'null',
    undefined: 'undefined',
    it: 'it',
    its: 'its',
    me: 'me',
    my: 'my',
    myself: 'myself',
    you: 'you',
    your: 'your',
    element: 'element',
    target: 'target',
    detail: 'detail',
    event: 'event',
    window: 'window',
    document: 'document',
    body: 'body',
    result: 'result',
    value: 'value',
  },

  attributes: {
    class: 'class',
    classes: 'classes',
    style: 'style',
    styles: 'styles',
    attribute: 'attribute',
    attributes: 'attributes',
    property: 'property',
    properties: 'properties',
  },

  expressions: {
    // Positional
    first: 'first',
    last: 'last',
    next: 'next',
    previous: 'previous',
    prev: 'prev',
    at: 'at',
    random: 'random',

    // DOM Traversal
    closest: 'closest',
    parent: 'parent',
    children: 'children',
    within: 'within',

    // Emptiness/Existence
    no: 'no',
    empty: 'empty',
    some: 'some',

    // String operations
    'starts with': 'starts with',
    'ends with': 'ends with',
  },
};
