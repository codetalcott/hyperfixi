/**
 * Bengali render vocabulary.
 *
 * Self-registering: importing this module makes the words available to
 * `render(node, 'bn')`. Kept separate from the profile so a parse-only
 * bundle can drop it — see lexicon-registry.ts for why that separation exists.
 */
import type { LanguageLexicon } from '../generators/profiles/types';
import { registerLexicon } from '../lexicon-registry';

export const bengaliLexicon: LanguageLexicon = {
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
    // The EXPRESSION `empty` is the state predicate (`if my value is empty`),
    // not the command — `খালি-করুন` is the imperative "empty it!" the profile
    // keywords already carry for the `empty` COMMAND. Rendering the imperative
    // in a condition emitted `… হয় খালি-করুন`, whose re-parse split the suffix
    // off and leaked it into the English (`is empty - করুন add .error …`) —
    // bn if-empty and input-validation.
    empty: { primary: 'খালি' },
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
};

registerLexicon('bn', bengaliLexicon);
