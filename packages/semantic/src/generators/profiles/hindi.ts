/**
 * Hindi Language Profile
 *
 * SOV word order, postpositions (को, में, पर, से, etc.), Devanagari script.
 * Fusional language with verb conjugation patterns.
 */

import type { LanguageProfile } from './types';

export const hindiProfile: LanguageProfile = {
  code: 'hi',
  name: 'Hindi',
  nativeName: 'हिन्दी',
  direction: 'ltr',
  wordOrder: 'SOV',
  markingStrategy: 'postposition',
  usesSpaces: true,
  // Hindi uses imperative forms for commands in software UI
  defaultVerbForm: 'imperative',
  verb: {
    position: 'end',
    suffixes: ['ें', 'ा', 'ी', 'े', 'ो'],
    subjectDrop: true,
  },
  references: {
    me: 'मैं',
    it: 'यह',
    you: 'आप',
    result: 'परिणाम',
    event: 'घटना',
    target: 'लक्ष्य',
    body: 'बॉडी',
  },
  possessive: {
    marker: 'का',
    markerPosition: 'between',
    // In Hindi: मेरा value (mera value) = "my value"
    // Or with का: X का Y = "X's Y"
  },
  roleMarkers: {
    patient: { primary: 'को', position: 'after' },
    destination: { primary: 'में', alternatives: ['को', 'पर'], position: 'after' },
    source: { primary: 'से', position: 'after' },
    style: { primary: 'से', position: 'after' },
    event: { primary: 'पर', position: 'after' },
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: 'टॉगल', alternatives: ['बदलें', 'बदल'], normalized: 'toggle' },
    add: { primary: 'जोड़ें', alternatives: ['जोड़'], normalized: 'add' },
    remove: { primary: 'हटाएं', alternatives: ['हटा', 'मिटाएं'], normalized: 'remove' },
    // Content operations
    put: { primary: 'रखें', alternatives: ['रख', 'डालें', 'डाल'], normalized: 'put' },
    append: { primary: 'जोड़ें_अंत', alternatives: [], normalized: 'append' },
    prepend: { primary: 'जोड़ें_शुरू', alternatives: [], normalized: 'prepend' },
    take: { primary: 'लें', alternatives: ['ले'], normalized: 'take' },
    make: { primary: 'बनाएं', alternatives: ['बना'], normalized: 'make' },
    clone: { primary: 'कॉपी', alternatives: ['प्रतिलिपि'], normalized: 'clone' },
    swap: { primary: 'बदलें_स्थान', alternatives: [], normalized: 'swap' },
    morph: { primary: 'रूपांतर', alternatives: [], normalized: 'morph' },
    // Variable operations
    set: { primary: 'सेट', alternatives: ['निर्धारित'], normalized: 'set' },
    get: { primary: 'प्राप्त', alternatives: ['पाएं'], normalized: 'get' },
    increment: { primary: 'बढ़ाएं', alternatives: ['बढ़ा'], normalized: 'increment' },
    decrement: { primary: 'घटाएं', alternatives: ['घटा'], normalized: 'decrement' },
    log: { primary: 'लॉग', alternatives: ['दर्ज'], normalized: 'log' },
    // Visibility
    show: { primary: 'दिखाएं', alternatives: ['दिखा'], normalized: 'show' },
    hide: { primary: 'छिपाएं', alternatives: ['छिपा'], normalized: 'hide' },
    transition: { primary: 'संक्रमण', alternatives: [], normalized: 'transition' },
    // Events
    on: { primary: 'पर', alternatives: ['में', 'जब'], normalized: 'on' },
    trigger: { primary: 'ट्रिगर', alternatives: [], normalized: 'trigger' },
    send: { primary: 'भेजें', alternatives: ['भेज'], normalized: 'send' },
    // DOM focus
    focus: { primary: 'फोकस', alternatives: ['केंद्रित'], normalized: 'focus' },
    blur: { primary: 'धुंधला', alternatives: [], normalized: 'blur' },
    // Navigation
    go: { primary: 'जाएं', alternatives: ['जा'], normalized: 'go' },
    // Async
    wait: { primary: 'प्रतीक्षा', alternatives: ['रुकें'], normalized: 'wait' },
    fetch: { primary: 'लाएं', alternatives: [], normalized: 'fetch' },
    settle: { primary: 'स्थिर', alternatives: [], normalized: 'settle' },
    // Control flow
    if: { primary: 'अगर', alternatives: ['यदि'], normalized: 'if' },
    when: { primary: 'जब', normalized: 'when' },
    where: { primary: 'कहाँ', normalized: 'where' },
    else: { primary: 'वरना', alternatives: ['नहीं तो'], normalized: 'else' },
    repeat: { primary: 'दोहराएं', alternatives: ['दोहरा'], normalized: 'repeat' },
    for: { primary: 'के लिए', alternatives: [], normalized: 'for' },
    while: { primary: 'जब तक', alternatives: [], normalized: 'while' },
    continue: { primary: 'जारी', alternatives: [], normalized: 'continue' },
    halt: { primary: 'रोकें', alternatives: ['रोक'], normalized: 'halt' },
    throw: { primary: 'फेंकें', alternatives: ['फेंक'], normalized: 'throw' },
    call: { primary: 'कॉल', alternatives: ['बुलाएं'], normalized: 'call' },
    return: { primary: 'लौटाएं', alternatives: ['लौटा'], normalized: 'return' },
    then: { primary: 'फिर', alternatives: ['तब'], normalized: 'then' },
    and: { primary: 'और', alternatives: [], normalized: 'and' },
    end: { primary: 'समाप्त', alternatives: ['अंत'], normalized: 'end' },
    // Advanced
    js: { primary: 'जेएस', alternatives: ['js'], normalized: 'js' },
    async: { primary: 'असिंक', alternatives: [], normalized: 'async' },
    tell: { primary: 'बताएं', alternatives: ['बता'], normalized: 'tell' },
    default: { primary: 'डिफ़ॉल्ट', alternatives: [], normalized: 'default' },
    init: { primary: 'प्रारंभ', alternatives: [], normalized: 'init' },
    behavior: { primary: 'व्यवहार', alternatives: [], normalized: 'behavior' },
    install: { primary: 'इंस्टॉल', alternatives: [], normalized: 'install' },
    measure: { primary: 'मापें', alternatives: [], normalized: 'measure' },
    // Modifiers
    into: { primary: 'में', alternatives: ['को'], normalized: 'into' },
    before: { primary: 'से पहले', alternatives: ['पहले'], normalized: 'before' },
    after: { primary: 'के बाद', alternatives: ['बाद'], normalized: 'after' },
    until: { primary: 'तक', alternatives: [], normalized: 'until' },
    event: { primary: 'घटना', alternatives: [], normalized: 'event' },
    from: { primary: 'से', normalized: 'from' },
  },
  tokenization: {
    particles: ['को', 'में', 'पर', 'से', 'का', 'की', 'के', 'तक', 'ने'],
    boundaryStrategy: 'space',
  },
  eventHandler: {
    keyword: { primary: 'पर', alternatives: ['में', 'जब'], normalized: 'on' },
    sourceMarker: { primary: 'से', position: 'after' },
  },
};
