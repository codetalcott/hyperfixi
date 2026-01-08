/**
 * Malay Language Profile
 *
 * SVO word order, prepositions, space-separated.
 */

import type { LanguageProfile } from './types';

export const malayProfile: LanguageProfile = {
  code: 'ms',
  name: 'Malay',
  nativeName: 'Melayu',
  direction: 'ltr',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  defaultVerbForm: 'base',
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  references: {
    me: 'TODO',      // "I/me"
    it: 'TODO',      // "it"
    you: 'TODO',     // "you"
    result: 'TODO',
    event: 'TODO',
    target: 'TODO',
    body: 'body',
  },
  roleMarkers: {
    destination: { primary: 'TODO', position: 'before' },
    source: { primary: 'TODO', position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'TODO', position: 'before' },
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: 'TODO', normalized: 'toggle' },
    add: { primary: 'TODO', normalized: 'add' },
    remove: { primary: 'TODO', normalized: 'remove' },
    // Content operations
    put: { primary: 'TODO', normalized: 'put' },
    append: { primary: 'TODO', normalized: 'append' },
    prepend: { primary: 'TODO', normalized: 'prepend' },
    take: { primary: 'TODO', normalized: 'take' },
    make: { primary: 'TODO', normalized: 'make' },
    clone: { primary: 'TODO', normalized: 'clone' },
    swap: { primary: 'TODO', normalized: 'swap' },
    morph: { primary: 'TODO', normalized: 'morph' },
    // Variable operations
    set: { primary: 'TODO', normalized: 'set' },
    get: { primary: 'TODO', normalized: 'get' },
    increment: { primary: 'TODO', normalized: 'increment' },
    decrement: { primary: 'TODO', normalized: 'decrement' },
    log: { primary: 'TODO', normalized: 'log' },
    // Visibility
    show: { primary: 'TODO', normalized: 'show' },
    hide: { primary: 'TODO', normalized: 'hide' },
    transition: { primary: 'TODO', normalized: 'transition' },
    // Events
    on: { primary: 'TODO', normalized: 'on' },
    trigger: { primary: 'TODO', normalized: 'trigger' },
    send: { primary: 'TODO', normalized: 'send' },
    // DOM focus
    focus: { primary: 'TODO', normalized: 'focus' },
    blur: { primary: 'TODO', normalized: 'blur' },
    // Navigation
    go: { primary: 'TODO', normalized: 'go' },
    // Async
    wait: { primary: 'TODO', normalized: 'wait' },
    fetch: { primary: 'TODO', normalized: 'fetch' },
    settle: { primary: 'TODO', normalized: 'settle' },
    // Control flow
    if: { primary: 'TODO', normalized: 'if' },
    when: { primary: 'TODO', normalized: 'when' },
    where: { primary: 'TODO', normalized: 'where' },
    else: { primary: 'TODO', normalized: 'else' },
    repeat: { primary: 'TODO', normalized: 'repeat' },
    for: { primary: 'TODO', normalized: 'for' },
    while: { primary: 'TODO', normalized: 'while' },
    continue: { primary: 'TODO', normalized: 'continue' },
    halt: { primary: 'TODO', normalized: 'halt' },
    throw: { primary: 'TODO', normalized: 'throw' },
    call: { primary: 'TODO', normalized: 'call' },
    return: { primary: 'TODO', normalized: 'return' },
    then: { primary: 'TODO', normalized: 'then' },
    and: { primary: 'TODO', normalized: 'and' },
    end: { primary: 'TODO', normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'TODO', normalized: 'async' },
    tell: { primary: 'TODO', normalized: 'tell' },
    default: { primary: 'TODO', normalized: 'default' },
    init: { primary: 'TODO', normalized: 'init' },
    behavior: { primary: 'TODO', normalized: 'behavior' },
    install: { primary: 'TODO', normalized: 'install' },
    measure: { primary: 'TODO', normalized: 'measure' },
    // Modifiers
    into: { primary: 'TODO', normalized: 'into' },
    before: { primary: 'TODO', normalized: 'before' },
    after: { primary: 'TODO', normalized: 'after' },
    // Event modifiers
    until: { primary: 'TODO', normalized: 'until' },
    event: { primary: 'TODO', normalized: 'event' },
    from: { primary: 'TODO', normalized: 'from' },
  },
  eventHandler: {
    keyword: { primary: 'TODO', normalized: 'on' },
    sourceMarker: { primary: 'TODO', position: 'before' },
  },
};
