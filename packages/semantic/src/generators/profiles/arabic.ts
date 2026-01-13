/**
 * Arabic Language Profile
 *
 * VSO word order, prepositions, RTL (right-to-left), space-separated.
 * Features root-based morphology and rich verb conjugation.
 */

import type { LanguageProfile } from './types';

export const arabicProfile: LanguageProfile = {
  code: 'ar',
  name: 'Arabic',
  nativeName: 'العربية',
  direction: 'rtl',
  wordOrder: 'VSO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  references: {
    me: 'أنا',       // "I/me" - first person
    it: 'هو',        // "it" (masculine)
    you: 'أنت',      // "you"
    result: 'النتيجة',
    event: 'الحدث',
    target: 'الهدف',
    body: 'الجسم',
  },
  possessive: {
    marker: '',      // No explicit marker - uses possessive pronouns
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
    specialForms: {
      // Arabic: "value لي" (value for-me) - possessive pronoun follows property
      me: 'لي',      // "for me" / "mine"
      it: 'له',      // "for it" / "its"
      you: 'لك',     // "for you" / "yours"
    },
  },
  roleMarkers: {
    destination: { primary: 'على', alternatives: ['في', 'إلى', 'ب'], position: 'before' },
    source: { primary: 'من', position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'بـ', alternatives: ['باستخدام'], position: 'before' },
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: 'بدل', alternatives: ['بدّل', 'غيّر', 'غير'], normalized: 'toggle' },
    add: { primary: 'أضف', alternatives: ['اضف', 'زِد'], normalized: 'add' },
    remove: { primary: 'احذف', alternatives: ['أزل', 'امسح'], normalized: 'remove' },
    // Content operations
    put: { primary: 'ضع', alternatives: ['اجعل'], normalized: 'put' },
    append: { primary: 'ألحق', normalized: 'append' },
    prepend: { primary: 'سبق', normalized: 'prepend' },
    take: { primary: 'خذ', normalized: 'take' },
    make: { primary: 'اصنع', alternatives: ['أنشئ'], normalized: 'make' },
    clone: { primary: 'استنسخ', alternatives: ['انسخ'], normalized: 'clone' },
    swap: { primary: 'بدّل', alternatives: ['استبدل'], normalized: 'swap' },
    morph: { primary: 'حوّل', alternatives: ['غيّر'], normalized: 'morph' },
    // Variable operations
    set: { primary: 'اضبط', alternatives: ['عيّن', 'حدد'], normalized: 'set' },
    get: { primary: 'احصل', alternatives: ['خذ'], normalized: 'get' },
    increment: { primary: 'زِد', alternatives: ['ارفع'], normalized: 'increment' },
    decrement: { primary: 'أنقص', alternatives: ['قلل'], normalized: 'decrement' },
    log: { primary: 'سجل', normalized: 'log' },
    // Visibility
    show: { primary: 'اظهر', alternatives: ['أظهر', 'اعرض'], normalized: 'show' },
    hide: { primary: 'اخف', alternatives: ['أخفِ', 'اخفي'], normalized: 'hide' },
    transition: { primary: 'انتقال', alternatives: ['انتقل'], normalized: 'transition' },
    // Events
    on: { primary: 'على', alternatives: ['عند', 'لدى', 'حين'], normalized: 'on' },
    trigger: { primary: 'تشغيل', alternatives: ['أطلق', 'فعّل'], normalized: 'trigger' },
    send: { primary: 'أرسل', normalized: 'send' },
    // DOM focus
    focus: { primary: 'تركيز', alternatives: ['ركز'], normalized: 'focus' },
    blur: { primary: 'ضبابية', alternatives: ['شوش'], normalized: 'blur' },
    // Navigation
    go: { primary: 'اذهب', alternatives: ['انتقل'], normalized: 'go' },
    // Async
    wait: { primary: 'انتظر', normalized: 'wait' },
    fetch: { primary: 'احضر', alternatives: ['جلب'], normalized: 'fetch' },
    settle: { primary: 'استقر', normalized: 'settle' },
    // Control flow
    if: { primary: 'إذا', normalized: 'if' },
    when: { primary: 'عندما', normalized: 'when' },
    where: { primary: 'أين', normalized: 'where' },
    else: { primary: 'وإلا', alternatives: ['خلاف ذلك'], normalized: 'else' },
    repeat: { primary: 'كرر', normalized: 'repeat' },
    for: { primary: 'لكل', normalized: 'for' },
    while: { primary: 'بينما', normalized: 'while' },
    continue: { primary: 'واصل', normalized: 'continue' },
    halt: { primary: 'أوقف', alternatives: ['توقف'], normalized: 'halt' },
    throw: { primary: 'ارم', alternatives: ['ارمِ'], normalized: 'throw' },
    call: { primary: 'استدع', alternatives: ['نادِ'], normalized: 'call' },
    return: { primary: 'ارجع', alternatives: ['عُد'], normalized: 'return' },
    then: { primary: 'ثم', alternatives: ['بعدها', 'ثمّ'], normalized: 'then' },
    and: { primary: 'و', alternatives: ['وأيضاً'], normalized: 'and' },
    end: { primary: 'نهاية', alternatives: ['انتهى', 'آخر'], normalized: 'end' },
    // Advanced
    js: { primary: 'جافاسكربت', alternatives: ['js'], normalized: 'js' },
    async: { primary: 'متزامن', normalized: 'async' },
    tell: { primary: 'أخبر', normalized: 'tell' },
    default: { primary: 'افتراضي', normalized: 'default' },
    init: { primary: 'تهيئة', alternatives: ['بدء'], normalized: 'init' },
    behavior: { primary: 'سلوك', normalized: 'behavior' },
    install: { primary: 'تثبيت', alternatives: ['ثبّت'], normalized: 'install' },
    measure: { primary: 'قياس', alternatives: ['قِس'], normalized: 'measure' },
    // Modifiers
    into: { primary: 'في', alternatives: ['إلى'], normalized: 'into' },
    before: { primary: 'قبل', normalized: 'before' },
    after: { primary: 'بعد', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'حتى', normalized: 'until' },
    event: { primary: 'حدث', normalized: 'event' },
    from: { primary: 'من', normalized: 'from' },
  },
  tokenization: {
    prefixes: ['ال', 'و', 'ف', 'ب', 'ك', 'ل'],
  },
};
