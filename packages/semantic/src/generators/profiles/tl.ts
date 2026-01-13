/**
 * Tagalog Language Profile
 *
 * VSO word order, prepositions, space-separated.
 */

import type { LanguageProfile } from './types';

export const tagalogProfile: LanguageProfile = {
  code: 'tl',
  name: 'Tagalog',
  nativeName: 'Tagalog',
  direction: 'ltr',
  wordOrder: 'VSO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  defaultVerbForm: 'base',
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  references: {
    me: 'ako', // "I/me"
    it: 'ito', // "it"
    you: 'ikaw', // "you"
    result: 'resulta', // "result"
    event: 'pangyayari', // "event"
    target: 'target', // "target"
    body: 'body',
  },
  roleMarkers: {
    destination: { primary: 'sa', position: 'before' }, // "to/into"
    source: { primary: 'mula_sa', position: 'before' }, // "from"
    patient: { primary: '', position: 'before' },
    style: { primary: 'nang', position: 'before' }, // manner marker
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: 'palitan', alternatives: ['itoggle'], normalized: 'toggle' },
    add: { primary: 'idagdag', alternatives: ['magdagdag'], normalized: 'add' },
    remove: { primary: 'alisin', alternatives: ['tanggalin'], normalized: 'remove' },
    // Content operations
    put: { primary: 'ilagay', alternatives: ['maglagay'], normalized: 'put' },
    append: { primary: 'idagdag_sa_dulo', normalized: 'append' },
    prepend: { primary: 'idagdag_sa_simula', normalized: 'prepend' },
    take: { primary: 'kumuha', normalized: 'take' },
    make: { primary: 'gumawa', alternatives: ['lumikha'], normalized: 'make' },
    clone: { primary: 'kopyahin', normalized: 'clone' },
    swap: { primary: 'magpalit', normalized: 'swap' },
    morph: { primary: 'baguhin', normalized: 'morph' },
    // Variable operations
    set: { primary: 'itakda', alternatives: ['magtakda'], normalized: 'set' },
    get: { primary: 'kumuha', alternatives: ['kunin'], normalized: 'get' },
    increment: { primary: 'dagdagan', alternatives: ['taasan'], normalized: 'increment' },
    decrement: { primary: 'bawasan', alternatives: ['ibaba'], normalized: 'decrement' },
    log: { primary: 'itala', normalized: 'log' },
    // Visibility
    show: { primary: 'ipakita', alternatives: ['magpakita'], normalized: 'show' },
    hide: { primary: 'itago', alternatives: ['magtago'], normalized: 'hide' },
    transition: { primary: 'lumipat', normalized: 'transition' },
    // Events
    on: { primary: 'kapag', alternatives: ['kung', 'sa'], normalized: 'on' },
    trigger: { primary: 'magpatugtog', normalized: 'trigger' },
    send: { primary: 'ipadala', alternatives: ['magpadala'], normalized: 'send' },
    // DOM focus
    focus: { primary: 'ituon', normalized: 'focus' },
    blur: { primary: 'alisin_tuon', normalized: 'blur' },
    // Navigation
    go: { primary: 'pumunta', alternatives: ['punta'], normalized: 'go' },
    // Async
    wait: { primary: 'maghintay', alternatives: ['hintay'], normalized: 'wait' },
    fetch: { primary: 'kunin', normalized: 'fetch' },
    settle: { primary: 'magpatahimik', normalized: 'settle' },
    // Control flow
    if: { primary: 'kung', alternatives: ['kapag'], normalized: 'if' },
    when: { primary: 'kapag', normalized: 'when' },
    where: { primary: 'kung_saan', normalized: 'where' },
    else: { primary: 'kung_hindi', alternatives: ['kundi'], normalized: 'else' },
    repeat: { primary: 'ulitin', alternatives: ['paulit-ulit'], normalized: 'repeat' },
    for: { primary: 'para_sa', normalized: 'for' },
    while: { primary: 'habang', normalized: 'while' },
    continue: { primary: 'magpatuloy', normalized: 'continue' },
    halt: { primary: 'itigil', alternatives: ['huminto'], normalized: 'halt' },
    throw: { primary: 'ihagis', alternatives: ['itapon'], normalized: 'throw' },
    call: { primary: 'tawagan', alternatives: ['tumawag'], normalized: 'call' },
    return: { primary: 'ibalik', alternatives: ['bumalik'], normalized: 'return' },
    then: { primary: 'pagkatapos', alternatives: ['saka'], normalized: 'then' },
    and: { primary: 'at', normalized: 'and' },
    end: { primary: 'wakas', alternatives: ['tapos'], normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'async', normalized: 'async' },
    tell: { primary: 'sabihin', alternatives: ['magsabi'], normalized: 'tell' },
    default: { primary: 'default', alternatives: ['unang_halaga'], normalized: 'default' },
    init: { primary: 'simulan', alternatives: ['magsimula'], normalized: 'init' },
    behavior: { primary: 'ugali', alternatives: ['kilos'], normalized: 'behavior' },
    install: { primary: 'ikabit', alternatives: ['mag-install'], normalized: 'install' },
    measure: { primary: 'sukatin', normalized: 'measure' },
    // Modifiers
    into: { primary: 'sa', normalized: 'into' },
    before: { primary: 'bago', normalized: 'before' },
    after: { primary: 'matapos', alternatives: ['pagkatapos'], normalized: 'after' },
    // Event modifiers
    until: { primary: 'hanggang', normalized: 'until' },
    event: { primary: 'pangyayari', normalized: 'event' },
    from: { primary: 'mula', alternatives: ['galing'], normalized: 'from' },
  },
  eventHandler: {
    keyword: { primary: 'kapag', normalized: 'on' },
    sourceMarker: { primary: 'mula_sa', alternatives: ['galing_sa'], position: 'before' },
  },
};
