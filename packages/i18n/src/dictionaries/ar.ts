// packages/i18n/src/dictionaries/ar.ts

import { Dictionary } from '../types';

export const ar: Dictionary = {
  commands: {
    // Event handling
    on: 'على',
    tell: 'أخبر',
    trigger: 'تشغيل',
    send: 'أرسل',

    // DOM manipulation
    take: 'خذ',
    put: 'ضع',
    set: 'اضبط',
    get: 'احصل',
    add: 'أضف',
    remove: 'احذف',
    toggle: 'بدل',
    hide: 'اخف',
    show: 'اظهر',

    // Control flow
    if: 'إذا',
    unless: 'إلا إذا',
    repeat: 'كرر',
    for: 'لكل',
    while: 'بينما',
    until: 'حتى',
    continue: 'واصل',
    break: 'توقف',
    halt: 'أوقف',

    // Async
    wait: 'انتظر',
    fetch: 'احضر',
    call: 'استدع',
    return: 'ارجع',

    // Other commands
    make: 'اصنع',
    log: 'سجل',
    throw: 'ارم',
    catch: 'التقط',
    measure: 'قس',
    transition: 'انتقال',

    // Data Commands
    increment: 'زِد',
    decrement: 'أنقص',
    bind: 'اربط',
    default: 'افتراضي',
    persist: 'احفظ',

    // Navigation Commands
    go: 'اذهب',
    pushUrl: 'ادفع رابط',
    replaceUrl: 'استبدل رابط',

    // Utility Commands
    copy: 'انسخ',
    pick: 'اختر',
    beep: 'صفّر',

    // Advanced Commands
    js: 'جافاسكربت',
    async: 'متزامن',
    render: 'ارسم',

    // Animation Commands
    swap: 'بدّل',
    morph: 'حوّل',
    settle: 'استقر',

    // Content Commands
    append: 'ألحق',

    // Control Flow
    exit: 'اخرج',

    // Behaviors
    install: 'ثبّت',
  },

  modifiers: {
    to: 'إلى',
    from: 'من',
    into: 'في',
    with: 'مع',
    at: 'عند',
    in: 'في',
    of: 'من',
    as: 'كـ',
    by: 'بواسطة',
    before: 'قبل',
    after: 'بعد',
    over: 'فوق',
    under: 'تحت',
    between: 'بين',
    through: 'عبر',
    without: 'بدون',
  },

  events: {
    click: 'نقر',
    dblclick: 'نقر مزدوج',
    mousedown: 'فأرة أسفل',
    mouseup: 'فأرة أعلى',
    mouseenter: 'فأرة دخول',
    mouseleave: 'فأرة خروج',
    mouseover: 'فأرة فوق',
    mouseout: 'فأرة خارج',
    mousemove: 'فأرة تحرك',

    keydown: 'مفتاح أسفل',
    keyup: 'مفتاح أعلى',
    keypress: 'مفتاح ضغط',

    focus: 'تركيز',
    blur: 'ضبابية',
    change: 'تغيير',
    input: 'إدخال',
    submit: 'إرسال',
    reset: 'إعادة تعيين',

    load: 'تحميل',
    unload: 'إلغاء تحميل',
    resize: 'تغيير حجم',
    scroll: 'تمرير',

    touchstart: 'بداية لمس',
    touchend: 'نهاية لمس',
    touchmove: 'تحرك لمس',
    touchcancel: 'إلغاء لمس',
  },

  logical: {
    when: 'عندما',
    where: 'أين',
    and: 'و',
    or: 'أو',
    not: 'ليس',
    is: 'هو',
    exists: 'موجود',
    matches: 'يطابق',
    contains: 'يحتوي',
    includes: 'يشمل',
    equals: 'يساوي',
    then: 'ثم',
    else: 'وإلا',
    otherwise: 'خلاف ذلك',
    end: 'النهاية',
  },

  temporal: {
    seconds: 'ثوانِ',
    second: 'ثانية',
    milliseconds: 'ميلي ثانية',
    millisecond: 'ميلي ثانية',
    minutes: 'دقائق',
    minute: 'دقيقة',
    hours: 'ساعات',
    hour: 'ساعة',
    ms: 'م.ث',
    s: 'ث',
    min: 'د',
    h: 'س',
  },

  values: {
    true: 'صحيح',
    false: 'خطأ',
    null: 'فارغ',
    undefined: 'غير معرف',
    it: 'هو',
    its: 'له', // REVIEW: native speaker
    me: 'أنا',
    my: 'لي',
    myself: 'نفسي',
    you: 'أنت', // REVIEW: native speaker
    your: 'لك', // REVIEW: native speaker
    yourself: 'نفسك', // REVIEW: native speaker
    element: 'عنصر',
    target: 'هدف',
    detail: 'تفاصيل',
    event: 'حدث',
    window: 'نافذة',
    document: 'وثيقة',
    body: 'جسم',
    result: 'نتيجة',
    value: 'قيمة',
  },

  attributes: {
    class: 'فئة',
    classes: 'فئات',
    style: 'أسلوب',
    styles: 'أساليب',
    attribute: 'خاصية',
    attributes: 'خصائص',
    property: 'خاصية',
    properties: 'خصائص',
  },

  expressions: {
    // Positional
    first: 'أول',
    last: 'آخر',
    next: 'التالي',
    previous: 'السابق',
    prev: 'سابق',
    at: 'عند',
    random: 'عشوائي',

    // DOM Traversal
    closest: 'الأقرب',
    parent: 'والد',
    children: 'أطفال',
    within: 'داخل',

    // Emptiness/Existence
    no: 'لا يوجد',
    empty: 'فارغ',
    some: 'بعض',

    // String operations
    'starts with': 'يبدأ بـ',
    'ends with': 'ينتهي بـ',
  },
};
