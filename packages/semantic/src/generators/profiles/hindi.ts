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
  script: 'devanagari',
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
    keywords: {
      // "my" forms (masculine/feminine/oblique)
      मेरा: 'me', // mera (m)
      मेरी: 'me', // meri (f)
      मेरे: 'me', // mere (pl/obl)
      // "your" forms (informal)
      तेरा: 'you', // tera (m)
      तेरी: 'you', // teri (f)
      तेरे: 'you', // tere (pl/obl)
      // "your" forms (formal)
      आपका: 'you', // aapka (m)
      आपकी: 'you', // aapki (f)
      आपके: 'you', // aapke (pl/obl)
      // "its/his/her" forms
      उसका: 'it', // uska (m)
      उसकी: 'it', // uski (f)
      उसके: 'it', // uske (pl/obl)
      इसका: 'it', // iska (m) - proximal
      इसकी: 'it', // iski (f)
      इसके: 'it', // iske (pl/obl)
    },
  },
  roleMarkers: {
    patient: { primary: 'को', position: 'after' },
    // `को` is the accusative/patient marker only — NOT a destination alternative.
    // Listing it here made a `को`-marked patient mis-parse as a destination, the
    // dominant source of phantom `into` commands in hi (precision audit 2026-06-15).
    destination: { primary: 'में', alternatives: ['पर'], position: 'after' },
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
    // संलग्न (attach/append) — single token. The old underscore compound
    // 'जोड़ें_अंत' split in the tokenizer and its embedded जोड़ें (`add`) won,
    // so hi append always parsed as add.
    append: { primary: 'संलग्न', alternatives: [], normalized: 'append' },
    prepend: { primary: 'जोड़ें_शुरू', alternatives: [], normalized: 'prepend' },
    take: { primary: 'लें', alternatives: ['ले'], normalized: 'take' },
    make: { primary: 'बनाएं', alternatives: ['बना'], normalized: 'make' },
    clone: { primary: 'क्लोन', alternatives: ['प्रतिलिपि'], normalized: 'clone' },
    // विनिमय (exchange) — single token. The old underscore compound
    // 'बदलें_स्थान' split and its embedded बदलें is toggle's alternative, so
    // hi swap always parsed as toggle (same collision in the dict, which
    // emitted bare बदलें).
    swap: { primary: 'विनिमय', alternatives: [], normalized: 'swap' },
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
    on: { primary: 'पर', alternatives: [], normalized: 'on' },
    trigger: { primary: 'ट्रिगर', alternatives: [], normalized: 'trigger' },
    send: { primary: 'भेजें', alternatives: ['भेज'], normalized: 'send' },
    // DOM focus
    focus: { primary: 'फोकस', alternatives: ['केंद्रित'], normalized: 'focus' },
    blur: { primary: 'धुंधला', alternatives: ['फोकस_हटाएं'], normalized: 'blur' },
    // Phase 1 (v0.9.90): DOM / form state / debug
    empty: { primary: 'खाली-करें', alternatives: ['खाली'], normalized: 'empty' },
    open: { primary: 'खोलें', normalized: 'open' },
    close: { primary: 'बंद-करें', normalized: 'close' },
    select: { primary: 'चिह्नित-करें', normalized: 'select' },
    clear: { primary: 'साफ़-करें', alternatives: ['साफ-करें'], normalized: 'clear' },
    reset: { primary: 'रीसेट', normalized: 'reset' },
    breakpoint: { primary: 'ब्रेकप्वाइंट', normalized: 'breakpoint' },
    // Common event names (for event handler patterns)
    click: { primary: 'क्लिक', normalized: 'click' },
    hover: { primary: 'होवर', alternatives: ['ऊपर_रखें'], normalized: 'hover' },
    submit: { primary: 'सबमिट', alternatives: ['जमा'], normalized: 'submit' },
    input: { primary: 'इनपुट', alternatives: [], normalized: 'input' },
    change: { primary: 'बदलाव', alternatives: ['परिवर्तन'], normalized: 'change' },
    // Navigation
    go: { primary: 'जाएं', alternatives: ['जा'], normalized: 'go' },
    scroll: { primary: 'स्क्रॉल', normalized: 'scroll' },
    push: { primary: 'धकेलें', alternatives: ['पुश'], normalized: 'push' },
    replace: { primary: 'बदलें_यूआरएल', alternatives: ['प्रतिस्थापित'], normalized: 'replace' },
    process: { primary: 'संसाधित', alternatives: ['प्रसंस्कृत'], normalized: 'process' },
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
    // हेतु is what the i18n dict emits (के_लिए split at `_` in the word
    // extractor; के लिए is two tokens — neither could anchor the clause-final
    // SOV for-loop).
    for: { primary: 'के लिए', alternatives: ['हेतु'], normalized: 'for' },
    while: { primary: 'जब तक', alternatives: [], normalized: 'while' },
    continue: { primary: 'जारी', alternatives: [], normalized: 'continue' },
    halt: { primary: 'रोकें', alternatives: ['रोक'], normalized: 'halt' },
    throw: { primary: 'फेंकें', alternatives: ['फेंक'], normalized: 'throw' },
    call: { primary: 'कॉल', alternatives: ['बुलाएं'], normalized: 'call' },
    return: { primary: 'लौटाएं', alternatives: ['लौटा'], normalized: 'return' },
    then: { primary: 'फिर', alternatives: ['तब'], normalized: 'then' },
    and: { primary: 'और', alternatives: [], normalized: 'and' },
    // Comparison operator — see korean.ts (R2 wave 12) for the rationale. Uses the
    // NATURAL spaced phrase `मेल खाता` ("matches"), now that the base tokenizer
    // matches multi-word profile keywords (longest-phrase at a word boundary). The
    // folded conditional's raw normalizes it to `matches` for the core expression
    // parser. (History: `मेल_खाता` underscore-split to मेल/_/खाता; the concatenated
    // `मेलखाता` parsed but isn't how Hindi is written.)
    matches: { primary: 'मेल खाता', normalized: 'matches' },
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
    beep: { primary: 'बीप', alternatives: [], normalized: 'beep' },
    break: { primary: 'तोड़ें', alternatives: [], normalized: 'break' },
    copy: { primary: 'कॉपी', alternatives: [], normalized: 'copy' },
    exit: { primary: 'बाहर', alternatives: [], normalized: 'exit' },
    pick: { primary: 'चुनें', alternatives: [], normalized: 'pick' },
    render: { primary: 'रेंडर', alternatives: [], normalized: 'render' },
    // Modifiers
    // `में` (locative "into") only — `को` (accusative) is not an `into` keyword.
    // The overload made every `को`-marked patient emit a phantom `into` command.
    into: { primary: 'में', alternatives: [], normalized: 'into' },
    before: { primary: 'से पहले', alternatives: ['पहले'], normalized: 'before' },
    after: { primary: 'के बाद', alternatives: ['बाद'], normalized: 'after' },
    until: { primary: 'तक', alternatives: [], normalized: 'until' },
    event: { primary: 'घटना', alternatives: [], normalized: 'event' },
    from: { primary: 'से', normalized: 'from' },
    // Phase 8 (htmx v4 localized attributes): attribute-suffix keywords
    // used by the vocab generator — `sse-कनेक्ट`, `hx-लाइव`, etc.
    // `जोड़ें` is reserved as `add` — `connect` alternatives are limited to non-colliding forms.
    connect: { primary: 'कनेक्ट', alternatives: ['संयोजित'], normalized: 'connect' },
    stream: { primary: 'स्ट्रीम', alternatives: ['धारा', 'प्रवाह'], normalized: 'stream' },
    live: { primary: 'लाइव', alternatives: ['सजीव', 'प्रत्यक्ष'], normalized: 'live' },
    socket: { primary: 'सॉकेट', alternatives: ['वेबसॉकेट'], normalized: 'socket' },
    // Streaming/concurrency: transformer emits the English literal (no i18n dict
    // entry yet), so English primary; native transliterations as alternatives.
    worker: { primary: 'worker', alternatives: ['वर्कर'], normalized: 'worker' },
    eventsource: {
      primary: 'eventsource',
      alternatives: ['इवेंटसोर्स'],
      normalized: 'eventsource',
    },
    // Reactivity / service-worker commands: same English-literal emission as the
    // streaming commands above (no i18n hi dict entry), so English primary with
    // native transliteration alternatives. Previously absent — `bind`/`intercept`
    // dropped to a degenerate parse in hi.
    bind: { primary: 'bind', alternatives: ['बाइंड', 'बांधें'], normalized: 'bind' },
    intercept: { primary: 'intercept', alternatives: ['इंटरसेप्ट'], normalized: 'intercept' },
  },
  tokenization: {
    particles: ['को', 'में', 'पर', 'से', 'का', 'की', 'के', 'तक', 'ने'],
    boundaryStrategy: 'space',
  },
  eventHandler: {
    keyword: { primary: 'पर', alternatives: [], normalized: 'on' },
    sourceMarker: { primary: 'से', position: 'after' },
    // Event marker: पर (at/on), used in SOV pattern
    // Pattern: [event] पर [destination का?] [patient] को [action]
    // Example: क्लिक पर #button का .active को टॉगल
    // `में` is the locative/destination marker, NOT an event marker — listing it
    // here made a `में`-marked destination mis-parse as a phantom event handler (`on`).
    eventMarker: { primary: 'पर', alternatives: [], position: 'after' },
    temporalMarkers: ['जब', 'जब भी'], // temporal conjunctions (when, whenever)
  },
};
