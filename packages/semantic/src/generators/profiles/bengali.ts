/**
 * Bengali Language Profile
 *
 * SOV word order, postpositions (কে, তে, থেকে, etc.), Bengali script.
 * Agglutinative language similar to Hindi.
 */

import type { LanguageProfile } from './types';

export const bengaliProfile: LanguageProfile = {
  code: 'bn',
  name: 'Bengali',
  nativeName: 'বাংলা',
  direction: 'ltr',
  wordOrder: 'SOV',
  markingStrategy: 'postposition',
  usesSpaces: true,
  defaultVerbForm: 'imperative',
  verb: {
    position: 'end',
    suffixes: ['ুন', 'ো', 'া', 'ে', 'ি'],
    subjectDrop: true,
  },
  references: {
    me: 'আমি',
    it: 'এটি',
    you: 'আপনি',
    result: 'ফলাফল',
    event: 'ঘটনা',
    target: 'লক্ষ্য',
    body: 'বডি',
  },
  possessive: {
    marker: 'র',
    markerPosition: 'between',
    keywords: {
      // "my" - আমার (amar)
      আমার: 'me',
      // "your" - তোমার (tomar, informal), আপনার (apnar, formal)
      তোমার: 'you',
      আপনার: 'you',
      // "its/his/her" - তার (tar), এর (er)
      তার: 'it',
      এর: 'it',
    },
  },
  roleMarkers: {
    patient: { primary: 'কে', position: 'after' },
    destination: { primary: 'তে', alternatives: ['এ'], position: 'after' },
    source: { primary: 'থেকে', position: 'after' },
    style: { primary: 'দিয়ে', position: 'after' },
    event: { primary: 'তে', position: 'after' },
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: 'টগল', normalized: 'toggle' },
    add: { primary: 'যোগ', alternatives: ['যোগ করুন'], normalized: 'add' },
    remove: { primary: 'সরান', alternatives: ['সরিয়ে ফেলুন', 'মুছুন'], normalized: 'remove' },
    // Content operations
    put: { primary: 'রাখুন', alternatives: ['রাখ'], normalized: 'put' },
    append: { primary: 'শেষে যোগ', alternatives: [], normalized: 'append' },
    prepend: { primary: 'শুরুতে যোগ', alternatives: [], normalized: 'prepend' },
    take: { primary: 'নিন', alternatives: ['নে'], normalized: 'take' },
    make: { primary: 'তৈরি করুন', alternatives: ['বানান'], normalized: 'make' },
    clone: { primary: 'ক্লোন', alternatives: ['প্রতিলিপি'], normalized: 'clone' },
    swap: { primary: 'বদল', alternatives: [], normalized: 'swap' },
    morph: { primary: 'রূপান্তর', alternatives: [], normalized: 'morph' },
    // Variable operations
    set: { primary: 'সেট', alternatives: ['নির্ধারণ'], normalized: 'set' },
    get: { primary: 'পান', normalized: 'get' },
    increment: { primary: 'বৃদ্ধি', alternatives: ['বাড়ান'], normalized: 'increment' },
    decrement: { primary: 'হ্রাস', alternatives: ['কমান'], normalized: 'decrement' },
    log: { primary: 'লগ', alternatives: ['রেকর্ড'], normalized: 'log' },
    // Visibility
    show: { primary: 'দেখান', alternatives: ['দেখাও'], normalized: 'show' },
    hide: { primary: 'লুকান', alternatives: ['লুকাও'], normalized: 'hide' },
    transition: { primary: 'সংক্রমণ', alternatives: [], normalized: 'transition' },
    // Events
    on: { primary: 'তে', alternatives: ['এ'], normalized: 'on' },
    trigger: { primary: 'ট্রিগার', alternatives: [], normalized: 'trigger' },
    send: { primary: 'পাঠান', alternatives: ['পাঠাও'], normalized: 'send' },
    // DOM focus
    focus: { primary: 'ফোকাস', alternatives: ['মনোযোগ'], normalized: 'focus' },
    blur: { primary: 'ঝাপসা', alternatives: ['ফোকাস_সরান'], normalized: 'blur' },
    // Common event names (for event handler patterns)
    click: { primary: 'ক্লিক', normalized: 'click' },
    hover: { primary: 'হোভার', alternatives: ['উপরে_রাখুন'], normalized: 'hover' },
    submit: { primary: 'সাবমিট', alternatives: ['জমা'], normalized: 'submit' },
    input: { primary: 'ইনপুট', alternatives: ['প্রবেশ'], normalized: 'input' },
    change: { primary: 'পরিবর্তন', normalized: 'change' },
    // Navigation
    go: { primary: 'যান', alternatives: ['যাও'], normalized: 'go' },
    // Async
    wait: { primary: 'অপেক্ষা', normalized: 'wait' },
    fetch: { primary: 'আনুন', alternatives: [], normalized: 'fetch' },
    settle: { primary: 'স্থির', alternatives: [], normalized: 'settle' },
    // Control flow
    if: { primary: 'যদি', alternatives: [], normalized: 'if' },
    when: { primary: 'যখন', normalized: 'when' },
    where: { primary: 'কোথায়', normalized: 'where' },
    else: { primary: 'নতুবা', alternatives: ['না হলে'], normalized: 'else' },
    repeat: { primary: 'পুনরাবৃত্তি', alternatives: ['বার বার'], normalized: 'repeat' },
    for: { primary: 'জন্য', alternatives: [], normalized: 'for' },
    while: { primary: 'যতক্ষণ', alternatives: [], normalized: 'while' },
    continue: { primary: 'চালিয়ে যান', alternatives: [], normalized: 'continue' },
    halt: { primary: 'থামুন', alternatives: ['থামাও'], normalized: 'halt' },
    throw: { primary: 'নিক্ষেপ', alternatives: ['ছুঁড়ে দিন'], normalized: 'throw' },
    call: { primary: 'কল', alternatives: ['ডাকুন'], normalized: 'call' },
    return: { primary: 'ফিরুন', alternatives: ['ফেরত দিন'], normalized: 'return' },
    then: { primary: 'তারপর', alternatives: ['তখন'], normalized: 'then' },
    and: { primary: 'এবং', alternatives: [], normalized: 'and' },
    end: { primary: 'শেষ', alternatives: ['সমাপ্ত'], normalized: 'end' },
    // Advanced
    js: { primary: 'জেএস', alternatives: ['js'], normalized: 'js' },
    async: { primary: 'অ্যাসিঙ্ক', alternatives: [], normalized: 'async' },
    tell: { primary: 'বলুন', alternatives: ['বল'], normalized: 'tell' },
    default: { primary: 'ডিফল্ট', alternatives: [], normalized: 'default' },
    init: { primary: 'শুরু', alternatives: [], normalized: 'init' },
    behavior: { primary: 'আচরণ', alternatives: [], normalized: 'behavior' },
    install: { primary: 'ইনস্টল', alternatives: [], normalized: 'install' },
    measure: { primary: 'মাপুন', alternatives: [], normalized: 'measure' },
    beep: { primary: 'বীপ', alternatives: [], normalized: 'beep' },
    break: { primary: 'ভাঙুন', alternatives: [], normalized: 'break' },
    copy: { primary: 'কপি', alternatives: [], normalized: 'copy' },
    exit: { primary: 'বের', alternatives: [], normalized: 'exit' },
    pick: { primary: 'বাছুন', alternatives: [], normalized: 'pick' },
    render: { primary: 'রেন্ডার', alternatives: [], normalized: 'render' },
    // Modifiers
    into: { primary: 'ভিতরে', normalized: 'into' },
    before: { primary: 'আগে', alternatives: [], normalized: 'before' },
    after: { primary: 'পরে', alternatives: [], normalized: 'after' },
    until: { primary: 'পর্যন্ত', alternatives: [], normalized: 'until' },
    event: { primary: 'ঘটনা', alternatives: [], normalized: 'event' },
    from: { primary: 'থেকে', normalized: 'from' },
  },
  tokenization: {
    particles: ['কে', 'তে', 'থেকে', 'র', 'এর', 'দিয়ে', 'জন্য', 'পর্যন্ত'],
    boundaryStrategy: 'space',
  },
  eventHandler: {
    keyword: { primary: 'তে', alternatives: ['এ', 'যখন'], normalized: 'on' },
    sourceMarker: { primary: 'থেকে', position: 'after' },
    // Event marker: তে (at/on), used in SOV pattern
    // Pattern: [event] তে [destination র?] [patient] কে [action]
    // Example: ক্লিক তে #button র .active কে টগল
    eventMarker: { primary: 'তে', alternatives: ['এ'], position: 'after' },
    temporalMarkers: ['যখন', 'যখনই'], // temporal conjunctions (when, whenever)
  },
};
