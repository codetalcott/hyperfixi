/**
 * Swahili Language Profile
 *
 * SVO word order, prepositions, space-separated, agglutinative.
 * Features noun class system (18 classes) and verb agreement prefixes.
 */

import type { LanguageProfile } from './types';

export const swahiliProfile: LanguageProfile = {
  code: 'sw',
  name: 'Swahili',
  nativeName: 'Kiswahili',
  direction: 'ltr',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  references: {
    me: 'mimi', // "I/me"
    it: 'hiyo', // "it"
    you: 'wewe', // "you"
    result: 'matokeo',
    event: 'tukio',
    target: 'lengo',
    body: 'mwili',
  },
  possessive: {
    marker: '', // Swahili uses possessive pronouns
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
    specialForms: {
      me: 'yangu', // "my" (class-dependent: wangu/yangu/langu...)
      it: 'yake', // "its"
      you: 'yako', // "your"
    },
    keywords: {
      // "my" variants (noun class dependent)
      wangu: 'me', // M-Wa class (people)
      yangu: 'me', // N class (general)
      langu: 'me', // Ji-Ma class
      changu: 'me', // Ki-Vi class
      // "your" variants
      wako: 'you',
      yako: 'you',
      lako: 'you',
      chako: 'you',
      // "its/his/her" variants
      wake: 'it',
      yake: 'it',
      lake: 'it',
      chake: 'it',
    },
  },
  roleMarkers: {
    destination: { primary: 'kwenye', alternatives: ['kwa'], position: 'before' },
    source: { primary: 'kutoka', position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'na', position: 'before' },
  },
  keywords: {
    toggle: { primary: 'badilisha', normalized: 'toggle' },
    add: { primary: 'ongeza', normalized: 'add' },
    remove: { primary: 'ondoa', alternatives: ['futa', 'toa'], normalized: 'remove' },
    put: { primary: 'weka', alternatives: ['tia'], normalized: 'put' },
    append: { primary: 'ambatanisha', normalized: 'append' },
    prepend: { primary: 'tanguliza', normalized: 'prepend' },
    take: { primary: 'chukua', normalized: 'take' },
    make: { primary: 'tengeneza', alternatives: ['unda'], normalized: 'make' },
    clone: { primary: 'nakili', alternatives: ['rudufu'], normalized: 'clone' },
    swap: { primary: 'badilishana', alternatives: ['badalisha'], normalized: 'swap' },
    morph: { primary: 'geuza', alternatives: ['badilisha umbo'], normalized: 'morph' },
    set: { primary: 'seti', normalized: 'set' },
    get: { primary: 'pata', alternatives: ['pokea'], normalized: 'get' },
    increment: { primary: 'ongezeko', normalized: 'increment' },
    decrement: { primary: 'punguza', normalized: 'decrement' },
    log: { primary: 'andika', alternatives: ['rekodi'], normalized: 'log' },
    show: { primary: 'onyesha', normalized: 'show' },
    hide: { primary: 'ficha', alternatives: ['mficho'], normalized: 'hide' },
    transition: { primary: 'hamisha', alternatives: ['animisha'], normalized: 'transition' },
    on: { primary: 'unapo', alternatives: ['kwenye'], normalized: 'on' },
    trigger: { primary: 'chochea', normalized: 'trigger' },
    send: { primary: 'tuma', alternatives: ['peleka'], normalized: 'send' },
    focus: { primary: 'lenga', alternatives: ['angazia'], normalized: 'focus' },
    blur: { primary: 'blur', normalized: 'blur' },
    go: { primary: 'nenda', alternatives: ['enda', 'elekea'], normalized: 'go' },
    wait: { primary: 'subiri', alternatives: ['ngoja'], normalized: 'wait' },
    fetch: { primary: 'leta', alternatives: ['pakia'], normalized: 'fetch' },
    settle: { primary: 'tulia', alternatives: ['imarika'], normalized: 'settle' },
    if: { primary: 'kama', alternatives: ['ikiwa'], normalized: 'if' },
    when: { primary: 'wakati', normalized: 'when' },
    where: { primary: 'wapi', normalized: 'where' },
    else: { primary: 'vinginevyo', alternatives: ['sivyo'], normalized: 'else' },
    repeat: { primary: 'rudia', normalized: 'repeat' },
    for: { primary: 'kwa', normalized: 'for' },
    while: { primary: 'kadri', normalized: 'while' },
    continue: { primary: 'endelea', normalized: 'continue' },
    halt: { primary: 'simama', alternatives: ['acha'], normalized: 'halt' },
    throw: { primary: 'tupa', normalized: 'throw' },
    call: { primary: 'ita', normalized: 'call' },
    return: { primary: 'rudisha', alternatives: ['rejea'], normalized: 'return' },
    then: { primary: 'kisha', alternatives: ['halafu', 'baadaye'], normalized: 'then' },
    and: { primary: 'na', alternatives: ['pia', 'vilevile'], normalized: 'and' },
    end: { primary: 'mwisho', alternatives: ['maliza', 'tamati'], normalized: 'end' },
    js: { primary: 'js', alternatives: ['javascript'], normalized: 'js' },
    async: { primary: 'isiyo sawia', normalized: 'async' },
    tell: { primary: 'sema', alternatives: ['ambia'], normalized: 'tell' },
    default: { primary: 'chaguo-msingi', normalized: 'default' },
    init: { primary: 'anzisha', alternatives: ['anza'], normalized: 'init' },
    behavior: { primary: 'tabia', normalized: 'behavior' },
    install: { primary: 'sakinisha', normalized: 'install' },
    measure: { primary: 'pima', normalized: 'measure' },
    beep: { primary: 'lia', normalized: 'beep' },
    break: { primary: 'vunja', normalized: 'break' },
    copy: { primary: 'nakala', normalized: 'copy' },
    exit: { primary: 'toka', normalized: 'exit' },
    pick: { primary: 'chagua', normalized: 'pick' },
    render: { primary: 'chora', normalized: 'render' },
    into: { primary: 'ndani', normalized: 'into' },
    before: { primary: 'kabla', normalized: 'before' },
    after: { primary: 'baada', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'hadi', normalized: 'until' },
    event: { primary: 'tukio', normalized: 'event' },
    from: { primary: 'kutoka', normalized: 'from' },
  },
  eventHandler: {
    keyword: { primary: 'unapo', alternatives: ['kwenye', 'kwa', 'wakati'] },
    sourceMarker: { primary: 'kutoka', position: 'before' },
    conditionalKeyword: { primary: 'unapo', alternatives: ['anapo', 'tunapo', 'mnapo', 'wanapo'] },
    eventMarker: {
      primary: 'unapo',
      alternatives: ['kwenye', 'kwa', 'wakati'],
      position: 'before',
    },
  },
};
