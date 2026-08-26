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
  script: 'bengali',
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
    // জুড়ুন (attach/join, imperative — matches the রাখুন/নিন verb style).
    // The old multi-word 'শেষে যোগ' could never tokenize as one keyword
    // (শেষে reads as `end`, যোগ as `add`), so bn append always parsed as add.
    append: { primary: 'জুড়ুন', alternatives: [], normalized: 'append' },
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
    // Phase 1 (v0.9.90): DOM / form state / debug
    empty: { primary: 'খালি-করুন', alternatives: ['খালি'], normalized: 'empty' },
    open: { primary: 'খুলুন', normalized: 'open' },
    close: { primary: 'বন্ধ', normalized: 'close' },
    select: { primary: 'নির্বাচন', normalized: 'select' },
    clear: { primary: 'পরিষ্কার', normalized: 'clear' },
    reset: { primary: 'রিসেট', normalized: 'reset' },
    breakpoint: { primary: 'ব্রেকপয়েন্ট', normalized: 'breakpoint' },
    // Common event names (for event handler patterns)
    click: { primary: 'ক্লিক', normalized: 'click' },
    hover: { primary: 'হোভার', alternatives: ['উপরে_রাখুন'], normalized: 'hover' },
    submit: { primary: 'সাবমিট', alternatives: ['জমা'], normalized: 'submit' },
    input: { primary: 'ইনপুট', alternatives: ['প্রবেশ'], normalized: 'input' },
    change: { primary: 'পরিবর্তন', normalized: 'change' },
    // Navigation
    go: { primary: 'যান', alternatives: ['যাও'], normalized: 'go' },
    scroll: { primary: 'স্ক্রোল', normalized: 'scroll' },
    push: { primary: 'পুশ', alternatives: ['ঠেলুন'], normalized: 'push' },
    replace: { primary: 'প্রতিস্থাপন', normalized: 'replace' },
    process: { primary: 'প্রসেস', alternatives: ['প্রক্রিয়া'], normalized: 'process' },
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
    // `repeat forever` loop keyword — corpus word recognized so loopType types
    // as `:literal` like EN (the repeat.loopType R1 residue; see spanish.ts).
    forever: { primary: 'চিরকাল', normalized: 'forever', alternatives: ['forever'] },
    continue: { primary: 'চালিয়ে যান', alternatives: [], normalized: 'continue' },
    halt: { primary: 'থামুন', alternatives: ['থামাও'], normalized: 'halt' },
    throw: { primary: 'নিক্ষেপ', alternatives: ['ছুঁড়ে দিন'], normalized: 'throw' },
    call: { primary: 'কল', alternatives: ['ডাকুন'], normalized: 'call' },
    return: { primary: 'ফিরুন', alternatives: ['ফেরত দিন'], normalized: 'return' },
    then: { primary: 'তারপর', alternatives: ['তখন'], normalized: 'then' },
    and: { primary: 'এবং', alternatives: [], normalized: 'and' },
    // Copula (`if result is false`, `if my value is empty`). Without the keyword the
    // surface stays an identifier and leaks verbatim into the condition's raw
    // expression, which the core expression parser reads as English. Neither an
    // ActionType nor a command schema, so no pattern is generated from it.
    is: { primary: 'হয়', normalized: 'is' },
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
    // Phase 8 (htmx v4 localized attributes): attribute-suffix keywords
    // used by the vocab generator — `sse-কানেক্ট`, `hx-লাইভ`, etc.
    connect: { primary: 'কানেক্ট', alternatives: ['সংযোগ', 'যুক্ত'], normalized: 'connect' },
    stream: { primary: 'স্ট্রিম', alternatives: ['স্রোত', 'প্রবাহ'], normalized: 'stream' },
    live: { primary: 'লাইভ', alternatives: ['সরাসরি', 'প্রত্যক্ষ'], normalized: 'live' },
    socket: { primary: 'সকেট', alternatives: ['ওয়েবসকেট'], normalized: 'socket' },
    // Reactive / realtime commands
    // `যুক্ত` collides with connect; keep the loan `বাইন্ড` + English form.
    bind: { primary: 'বাইন্ড', alternatives: ['bind'], normalized: 'bind' },
    intercept: {
      primary: 'আটকাও',
      alternatives: ['ইন্টারসেপ্ট', 'intercept'],
      normalized: 'intercept',
    },
    worker: { primary: 'কর্মী', alternatives: ['ওয়ার্কার', 'worker'], normalized: 'worker' },
    eventsource: {
      primary: 'eventsource',
      alternatives: ['ইভেন্টসোর্স'],
      normalized: 'eventsource',
    },
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
  lexicon: {
    events: {
      blur: { primary: 'ঝাপসা' },
      change: { primary: 'পরিবর্তন' },
      click: { primary: 'ক্লিক' },
      every: { primary: 'প্রতি' },
      focus: { primary: 'ফোকাস' },
      input: { primary: 'ইনপুট' },
      keydown: { primary: 'keydown' },
      keyup: { primary: 'keyup' },
      load: { primary: 'লোড' },
      mouseout: { primary: 'mouseout' },
      mouseover: { primary: 'mouseover' },
      reset: { primary: 'রিসেট' },
      resize: { primary: 'রিসাইজ' },
      scroll: { primary: 'স্ক্রোল' },
      submit: { primary: 'জমা' },
    },
    logical: {
      and: { primary: 'এবং' },
      bind: { primary: 'বাইন্ড' },
      changes: { primary: 'পরিবর্তিত হলে' },
      else: { primary: 'নতুবা' },
      empty: { primary: 'খালি' },
      end: { primary: 'শেষ' },
      exists: { primary: 'আছে' },
      false: { primary: 'মিথ্যা' },
      has: { primary: 'আছে' },
      have: { primary: 'আছি' },
      if: { primary: 'যদি' },
      is: { primary: 'হয়' },
      live: { primary: 'লাইভ' },
      not: { primary: 'না' },
      null: { primary: 'শূন্য' },
      or: { primary: 'অথবা' },
      then: { primary: 'তারপর' },
      true: { primary: 'সত্য' },
      undefined: { primary: 'অনির্ধারিত' },
      when: { primary: 'যখন' },
      where: { primary: 'কোথায়' },
    },
    temporal: {
      forever: { primary: 'চিরকাল' },
      hours: { primary: 'ঘণ্টা' },
      milliseconds: { primary: 'মিলিসেকেন্ড' },
      minutes: { primary: 'মিনিট' },
      ms: { primary: 'মিসে' },
      now: { primary: 'এখন' },
      s: { primary: 'সে' },
      seconds: { primary: 'সেকেন্ড' },
      times: { primary: 'বার' },
    },
    values: {
      body: { primary: 'বডি' },
      event: { primary: 'ঘটনা' },
      it: { primary: 'এটি' },
      its: { primary: 'এর' },
      me: { primary: 'আমি' },
      my: { primary: 'আমার' },
      result: { primary: 'ফলাফল' },
      target: { primary: 'লক্ষ্য' },
      you: { primary: 'আপনি' },
      your: { primary: 'তোমার' },
    },
    attributes: {
      checked: { primary: 'চেক করা' },
      class: { primary: 'শ্রেণি' },
      disabled: { primary: 'অক্ষম' },
      html: { primary: 'এইচটিএমএল' },
      id: { primary: 'আইডি' },
      style: { primary: 'শৈলী' },
      text: { primary: 'পাঠ্য' },
      value: { primary: 'মান' },
    },
    expressions: {
      characters: { primary: 'অক্ষর' },
      children: { primary: 'সন্তান' },
      closest: { primary: 'নিকটতম' },
      empty: { primary: 'খালি-করুন' },
      'ends with': { primary: 'দিয়ে_শেষ' },
      exclusive: { primary: 'বাদ' },
      first: { primary: 'প্রথম' },
      'ignoring case': { primary: 'কেস_উপেক্ষা' },
      inclusive: { primary: 'অন্তর্ভুক্ত' },
      index: { primary: 'সূচক' },
      'joined by': { primary: 'দ্বারা_যুক্ত' },
      last: { primary: 'শেষ' },
      length: { primary: 'দৈর্ঘ্য' },
      'mapped to': { primary: 'তে_রূপান্তরিত' },
      next: { primary: 'পরবর্তী' },
      parent: { primary: 'মূল' },
      previous: { primary: 'আগের' },
      random: { primary: 'এলোমেলো' },
      'sorted by': { primary: 'দ্বারা_সাজানো' },
      'split by': { primary: 'দ্বারা_বিভক্ত' },
      'starts with': { primary: 'দিয়ে_শুরু' },
    },
  },
};
