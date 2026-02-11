/**
 * Hebrew Language Profile
 *
 * SVO word order, prepositions, RTL (right-to-left), space-separated.
 * Hebrew uses prefix prepositions (ב, ל, מ, כ) that attach to the following word.
 * Features optional vowel points (nikkud) which are typically omitted in modern text.
 */

import type { LanguageProfile } from './types';

export const hebrewProfile: LanguageProfile = {
  code: 'he',
  name: 'Hebrew',
  nativeName: 'עברית',
  direction: 'rtl',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  verb: {
    position: 'second', // SVO - verb comes after subject
    subjectDrop: true,
  },
  references: {
    me: 'אני', // "I/me"
    it: 'זה', // "it" (masculine) / "this"
    you: 'אתה', // "you" (masculine singular)
    result: 'תוצאה',
    event: 'אירוע',
    target: 'יעד',
    body: 'גוף',
  },
  possessive: {
    marker: 'של', // "of" - used for general possession
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
    specialForms: {
      // Hebrew: "property שלי" (property of-me) - possessive follows property
      me: 'שלי', // "of me" / "mine"
      it: 'שלו', // "of it" / "its" (masculine)
      you: 'שלך', // "of you" / "yours"
    },
    keywords: {
      // "my" / "mine"
      שלי: 'me',
      // "your" / "yours"
      שלך: 'you',
      // "its/his/her"
      שלו: 'it', // his/its (masculine)
      שלה: 'it', // her/its (feminine)
    },
  },
  roleMarkers: {
    destination: { primary: 'על', alternatives: ['ב', 'אל', 'ל'], position: 'before' },
    source: { primary: 'מ', alternatives: ['מן', 'מאת'], position: 'before' },
    patient: { primary: 'את', position: 'before' }, // Direct object marker
    style: { primary: 'עם', alternatives: ['ב'], position: 'before' },
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: 'מתג', alternatives: ['הדלק כבה'], normalized: 'toggle' },
    add: { primary: 'הוסף', normalized: 'add' },
    remove: { primary: 'הסר', alternatives: ['מחק', 'הורד'], normalized: 'remove' },
    // Content operations
    put: { primary: 'שים', alternatives: ['הנח', 'הכנס'], normalized: 'put' },
    append: { primary: 'צרף', alternatives: ['הוסף בסוף'], normalized: 'append' },
    prepend: { primary: 'הקדם', alternatives: ['הוסף בהתחלה'], normalized: 'prepend' },
    take: { primary: 'קח', normalized: 'take' },
    make: { primary: 'צור', alternatives: ['הכן'], normalized: 'make' },
    clone: { primary: 'שכפל', normalized: 'clone' },
    swap: { primary: 'החלף', alternatives: ['המר'], normalized: 'swap' },
    morph: { primary: 'הפוך', alternatives: ['עצב מחדש'], normalized: 'morph' },
    // Variable operations
    set: { primary: 'קבע', alternatives: ['הגדר'], normalized: 'set' },
    get: { primary: 'קבל', alternatives: ['השג'], normalized: 'get' },
    increment: { primary: 'הגדל', alternatives: ['הוסף אחד'], normalized: 'increment' },
    decrement: { primary: 'הקטן', alternatives: ['הפחת'], normalized: 'decrement' },
    log: { primary: 'רשום', normalized: 'log' },
    // Visibility
    show: { primary: 'הראה', alternatives: ['הצג'], normalized: 'show' },
    hide: { primary: 'הסתר', alternatives: ['החבא'], normalized: 'hide' },
    transition: { primary: 'מעבר', alternatives: ['הנפש'], normalized: 'transition' },
    // Events
    on: { primary: 'ב', alternatives: ['עם'], normalized: 'on' },
    trigger: { primary: 'הפעל', alternatives: ['שגר'], normalized: 'trigger' },
    send: { primary: 'שלח', normalized: 'send' },
    // DOM focus
    focus: { primary: 'מקד', alternatives: ['התמקד'], normalized: 'focus' },
    blur: { primary: 'טשטש', alternatives: ['הסר מיקוד'], normalized: 'blur' },
    // Navigation
    go: { primary: 'לך', alternatives: ['נווט'], normalized: 'go' },
    // Async
    wait: { primary: 'חכה', alternatives: ['המתן'], normalized: 'wait' },
    fetch: { primary: 'הבא', alternatives: ['טען'], normalized: 'fetch' },
    settle: { primary: 'התייצב', normalized: 'settle' },
    // Control flow
    if: { primary: 'אם', normalized: 'if' },
    when: { primary: 'כאשר', alternatives: ['כש'], normalized: 'when' },
    where: { primary: 'איפה', alternatives: ['היכן'], normalized: 'where' },
    else: { primary: 'אחרת', alternatives: ['אם לא'], normalized: 'else' },
    repeat: { primary: 'חזור', normalized: 'repeat' },
    for: { primary: 'עבור', alternatives: ['לכל'], normalized: 'for' },
    while: { primary: 'כל עוד', alternatives: ['בזמן'], normalized: 'while' },
    continue: { primary: 'המשך', normalized: 'continue' },
    halt: { primary: 'עצור', alternatives: ['הפסק'], normalized: 'halt' },
    throw: { primary: 'זרוק', normalized: 'throw' },
    call: { primary: 'קרא', alternatives: ['זמן'], normalized: 'call' },
    return: { primary: 'החזר', normalized: 'return' },
    then: { primary: 'אז', alternatives: ['ואז'], normalized: 'then' },
    and: { primary: 'וגם', alternatives: ['גם'], normalized: 'and' },
    end: { primary: 'סוף', alternatives: ['סיום'], normalized: 'end' },
    // Advanced
    js: { primary: 'js', alternatives: ['ג׳אווהסקריפט'], normalized: 'js' },
    async: { primary: 'אסינכרוני', normalized: 'async' },
    tell: { primary: 'אמור', normalized: 'tell' },
    default: { primary: 'ברירת מחדל', normalized: 'default' },
    init: { primary: 'אתחל', alternatives: ['התחל'], normalized: 'init' },
    behavior: { primary: 'התנהגות', normalized: 'behavior' },
    install: { primary: 'התקן', normalized: 'install' },
    measure: { primary: 'מדוד', normalized: 'measure' },
    beep: { primary: 'ביפ', normalized: 'beep' },
    break: { primary: 'שבור', normalized: 'break' },
    copy: { primary: 'העתק', normalized: 'copy' },
    exit: { primary: 'צא', normalized: 'exit' },
    pick: { primary: 'בחר', normalized: 'pick' },
    render: { primary: 'רנדר', normalized: 'render' },
    // Modifiers
    into: { primary: 'לתוך', alternatives: ['אל'], normalized: 'into' },
    before: { primary: 'לפני', normalized: 'before' },
    after: { primary: 'אחרי', normalized: 'after' },
    // Common event names (for event handler patterns)
    click: { primary: 'לחיצה', alternatives: ['קליק'], normalized: 'click' },
    hover: { primary: 'ריחוף', normalized: 'hover' },
    submit: { primary: 'שליחה', alternatives: ['הגשה'], normalized: 'submit' },
    input: { primary: 'קלט', alternatives: ['הזנה'], normalized: 'input' },
    change: { primary: 'שינוי', alternatives: ['עדכון'], normalized: 'change' },
    // Event modifiers (for repeat until event)
    until: { primary: 'עד', normalized: 'until' },
    event: { primary: 'אירוע', normalized: 'event' },
    from: { primary: 'מ', alternatives: ['מאת'], normalized: 'from' },
  },
  tokenization: {
    prefixes: ['ה', 'ו', 'ב', 'כ', 'ל', 'מ', 'ש'], // Common Hebrew prefixes
  },
  eventHandler: {
    keyword: { primary: 'ב', alternatives: ['עם'], normalized: 'on' },
    sourceMarker: { primary: 'מ', alternatives: ['מאת'], position: 'before' },
    conditionalKeyword: { primary: 'כאשר', alternatives: ['כש', 'אם'] },
    // Event marker: ב (at/upon), used in SVO pattern
    // Pattern: ב [event] [verb] [patient] על [destination?]
    // Example: בלחיצה החלף .active על #button
    eventMarker: { primary: 'ב', alternatives: ['כש', 'עם'], position: 'before' },
    temporalMarkers: ['כאשר', 'כש', 'עם'], // temporal conjunctions (when)
  },
};
