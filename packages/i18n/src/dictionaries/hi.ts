/**
 * Hindi Dictionary
 *
 * Translations for Hindi language support.
 * Uses imperative verb forms (common in software UIs).
 */

import { Dictionary } from '../types';

export const hindiDictionary: Dictionary = {
  commands: {
    // Event handling
    on: 'पर',
    tell: 'बताएं',
    trigger: 'ट्रिगर',
    send: 'भेजें',

    // DOM manipulation
    take: 'लें',
    put: 'रखें',
    set: 'सेट',
    get: 'प्राप्त',
    add: 'जोड़ें',
    remove: 'हटाएं',
    toggle: 'टॉगल',
    hide: 'छिपाएं',
    show: 'दिखाएं',

    // Control flow
    if: 'अगर',
    unless: 'जब_तक_नहीं',
    repeat: 'दोहराएं',
    for: 'के_लिए',
    while: 'जब_तक',
    until: 'तक',
    continue: 'जारी',
    break: 'रोकें',
    halt: 'रोकें',

    // Async
    wait: 'प्रतीक्षा',
    fetch: 'लाएं',
    call: 'कॉल',
    return: 'लौटाएं',

    // Other commands
    make: 'बनाएं',
    log: 'लॉग',
    throw: 'फेंकें',
    catch: 'पकड़ें',
    measure: 'मापें',
    transition: 'संक्रमण',

    // Data Commands
    increment: 'बढ़ाएं',
    decrement: 'घटाएं',
    bind: 'बाँधें',
    default: 'डिफ़ॉल्ट',
    persist: 'सहेजें',

    // Navigation Commands
    go: 'जाएं',
    pushUrl: 'url_जोड़ें',
    replaceUrl: 'url_बदलें',

    // Utility Commands
    copy: 'कॉपी',
    pick: 'चुनें',
    beep: 'बीप',

    // Advanced Commands
    js: 'जेएस',
    async: 'असिंक',
    render: 'रेंडर',

    // Animation Commands
    swap: 'बदलें',
    morph: 'रूपांतर',
    settle: 'स्थिर',

    // Content Commands
    append: 'जोड़ें_अंत',

    // Control Flow
    exit: 'बाहर',
    else: 'वरना',

    // Behaviors
    install: 'इंस्टॉल',
    init: 'प्रारंभ',
    behavior: 'व्यवहार',

    // Focus
    focus: 'फोकस',
    blur: 'धुंधला',

    // Clone
    clone: 'कॉपी',
    prepend: 'जोड़ें_शुरू',
  },

  modifiers: {
    to: 'को',
    from: 'से',
    into: 'में',
    with: 'के_साथ',
    at: 'पर',
    in: 'में',
    of: 'का',
    as: 'के_रूप_में',
    by: 'द्वारा',
    before: 'से_पहले',
    after: 'के_बाद',
    over: 'के_ऊपर',
    under: 'के_नीचे',
    between: 'के_बीच',
    through: 'के_माध्यम_से',
    without: 'के_बिना',
    on: 'पर',
  },

  events: {
    click: 'क्लिक',
    dblclick: 'डबल_क्लिक',
    mousedown: 'माउस_नीचे',
    mouseup: 'माउस_ऊपर',
    mouseenter: 'माउस_प्रवेश',
    mouseleave: 'माउस_बाहर',
    mouseover: 'माउस_ओवर',
    mouseout: 'माउस_आउट',
    mousemove: 'माउस_मूव',

    keydown: 'की_नीचे',
    keyup: 'की_ऊपर',
    keypress: 'की_प्रेस',

    focus: 'फोकस',
    blur: 'धुंधला',
    change: 'परिवर्तन',
    input: 'इनपुट',
    submit: 'जमा',
    reset: 'रीसेट',

    load: 'लोड',
    unload: 'अनलोड',
    resize: 'आकार_बदलें',
    scroll: 'स्क्रॉल',

    touchstart: 'टच_शुरू',
    touchend: 'टच_समाप्त',
    touchmove: 'टच_मूव',
    touchcancel: 'टच_रद्द',
  },

  logical: {
    when: 'TODO',
    where: 'TODO',
    and: 'और',
    or: 'या',
    not: 'नहीं',
    is: 'है',
    exists: 'मौजूद',
    matches: 'मेल_खाता',
    contains: 'शामिल',
    includes: 'में_है',
    equals: 'बराबर',
    then: 'फिर',
    else: 'वरना',
    otherwise: 'अन्यथा',
    end: 'समाप्त',
    has: 'है',
    isNot: 'नहीं_है',
    empty: 'खाली',
  },

  temporal: {
    seconds: 'सेकंड',
    second: 'सेकंड',
    milliseconds: 'मिलीसेकंड',
    millisecond: 'मिलीसेकंड',
    minutes: 'मिनट',
    minute: 'मिनट',
    hours: 'घंटे',
    hour: 'घंटा',
    ms: 'मिसे',
    s: 'से',
    min: 'मि',
    h: 'घं',
    forever: 'हमेशा',
    once: 'एक_बार',
    every: 'हर',
    until: 'तक',
  },

  values: {
    true: 'सच',
    false: 'झूठ',
    null: 'खाली',
    undefined: 'अपरिभाषित',
    it: 'यह',
    its: 'इसका',
    me: 'मैं',
    my: 'मेरा',
    you: 'आप',
    your: 'आपका',
    yourself: 'स्वयं',
    myself: 'मैं_स्वयं',
    element: 'तत्व',
    target: 'लक्ष्य',
    detail: 'विवरण',
    event: 'घटना',
    window: 'विंडो',
    document: 'दस्तावेज़',
    body: 'बॉडी',
    result: 'परिणाम',
    value: 'मान',
    first: 'पहला',
    last: 'अंतिम',
    next: 'अगला',
    previous: 'पिछला',
    closest: 'निकटतम',
    parent: 'मूल',
  },

  attributes: {
    class: 'क्लास',
    classes: 'क्लासेस',
    style: 'स्टाइल',
    styles: 'स्टाइल्स',
    attribute: 'गुण',
    attributes: 'गुण',
    property: 'संपत्ति',
    properties: 'संपत्तियाँ',
    disabled: 'अक्षम',
    hidden: 'छिपा',
    checked: 'चेक',
    selected: 'चयनित',
    readonly: 'केवल_पढ़ने',
    required: 'आवश्यक',
    text: 'पाठ',
    html: 'html',
  },

  expressions: {
    // Positional
    first: 'पहला',
    last: 'अंतिम',
    next: 'अगला',
    previous: 'पिछला',
    prev: 'पिछ',
    at: 'पर',
    random: 'यादृच्छिक',

    // DOM Traversal
    closest: 'निकटतम',
    parent: 'मूल',
    children: 'बच्चे',
    within: 'के_अंदर',

    // Emptiness/Existence
    no: 'नहीं',
    empty: 'खाली',
    some: 'कुछ',

    // String operations
    'starts with': 'से_शुरू',
    'ends with': 'पर_समाप्त',
  },
};
