/**
 * Vietnamese Language Profile
 *
 * SVO word order, prepositions, space-separated.
 * Vietnamese is an isolating (analytic) language with no inflection.
 * Uses Latin script with extensive diacritics for tone marking.
 */

import type { LanguageProfile } from './types';

export const vietnameseProfile: LanguageProfile = {
  code: 'vi',
  name: 'Vietnamese',
  nativeName: 'Tiếng Việt',
  direction: 'ltr',
  script: 'latin',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  // Vietnamese uses base/dictionary form for commands
  defaultVerbForm: 'base',
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  references: {
    me: 'tôi', // "I/me"
    it: 'nó', // "it"
    you: 'bạn', // "you"
    result: 'kết quả',
    event: 'sự kiện',
    target: 'mục tiêu',
    body: 'body',
  },
  possessive: {
    marker: 'của', // Vietnamese uses "của" for possession (của tôi = my)
    markerPosition: 'between',
    specialForms: {
      me: 'của tôi', // "my"
      it: 'của nó', // "its"
      you: 'của bạn', // "your"
    },
    keywords: {
      // Multi-word possessive phrases
      // Note: These may require tokenizer support for multi-word recognition
      'của tôi': 'me', // my
      // The vi dict's `my` is the two-word 'của tôi', which the dot-notation
      // transformer can't prefix onto `my.X` — those corpus heads stay literal
      // English `my.textContent`. Recognize the passthrough so the possessive
      // matcher can assemble the property-path (set-text/set-inner-html rows).
      my: 'me', // untranslated dot-notation passthrough
      'của bạn': 'you', // your (informal)
      'của anh': 'you', // your (male speaker, formal)
      'của chị': 'you', // your (female speaker, formal)
      'của nó': 'it', // its
    },
  },
  roleMarkers: {
    destination: { primary: 'vào', alternatives: ['cho', 'đến'], position: 'before' },
    source: { primary: 'từ', alternatives: ['khỏi'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'với', position: 'before' },
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: 'chuyển đổi', alternatives: ['bật tắt', 'chuyển'], normalized: 'toggle' },
    add: { primary: 'thêm', alternatives: ['bổ sung'], normalized: 'add' },
    remove: { primary: 'xóa', alternatives: ['gỡ bỏ', 'loại bỏ', 'bỏ'], normalized: 'remove' },
    // Content operations
    put: { primary: 'đặt', alternatives: ['để', 'đưa'], normalized: 'put' },
    append: { primary: 'nối', normalized: 'append' },
    prepend: { primary: 'thêm vào đầu', normalized: 'prepend' },
    take: { primary: 'lấy', normalized: 'take' },
    make: { primary: 'tạo', normalized: 'make' },
    clone: { primary: 'nhân bản', normalized: 'clone' },
    swap: { primary: 'hoán đổi', normalized: 'swap' },
    morph: { primary: 'biến đổi', normalized: 'morph' },
    // Variable operations
    set: { primary: 'gán', alternatives: ['thiết lập'], normalized: 'set' },
    get: { primary: 'lấy giá trị', alternatives: ['nhận'], normalized: 'get' },
    increment: { primary: 'tăng', alternatives: ['tăng lên'], normalized: 'increment' },
    decrement: { primary: 'giảm', alternatives: ['giảm đi'], normalized: 'decrement' },
    log: { primary: 'in ra', normalized: 'log' },
    // Visibility
    show: { primary: 'hiển thị', alternatives: ['hiện'], normalized: 'show' },
    hide: { primary: 'ẩn', alternatives: ['che', 'giấu'], normalized: 'hide' },
    transition: { primary: 'chuyển tiếp', normalized: 'transition' },
    // Events
    on: { primary: 'khi', alternatives: ['trên'], normalized: 'on' },
    trigger: { primary: 'kích hoạt', normalized: 'trigger' },
    send: { primary: 'gửi', normalized: 'send' },
    // DOM focus
    focus: { primary: 'tập trung', normalized: 'focus' },
    blur: { primary: 'mất tập trung', normalized: 'blur' },
    // Phase 1 (v0.9.90): DOM / form state / debug
    empty: { primary: 'làm-rỗng', alternatives: ['trống'], normalized: 'empty' },
    open: { primary: 'mở', normalized: 'open' },
    close: { primary: 'đóng', normalized: 'close' },
    select: { primary: 'đánh-dấu', normalized: 'select' },
    clear: { primary: 'tẩy', normalized: 'clear' },
    reset: { primary: 'đặt-lại', normalized: 'reset' },
    breakpoint: { primary: 'điểm-dừng', normalized: 'breakpoint' },
    // Common event names (for event handler patterns)
    click: { primary: 'nhấp', alternatives: ['bấm'], normalized: 'click' },
    hover: { primary: 'di chuột', alternatives: ['rê chuột'], normalized: 'hover' },
    submit: { primary: 'nộp', alternatives: [], normalized: 'submit' },
    input: { primary: 'nhập', alternatives: ['nhập liệu'], normalized: 'input' },
    change: { primary: 'thay đổi', alternatives: ['đổi'], normalized: 'change' },
    // Navigation
    go: { primary: 'đi đến', alternatives: ['đi'], normalized: 'go' },
    scroll: { primary: 'cuộn', normalized: 'scroll' },
    push: { primary: 'đẩy', alternatives: ['push'], normalized: 'push' },
    replace: { primary: 'thay_thế', alternatives: ['thay_the'], normalized: 'replace' },
    process: { primary: 'xử_lý', alternatives: ['xu_ly'], normalized: 'process' },
    // Async
    wait: { primary: 'chờ', alternatives: ['đợi', 'chờ đợi'], normalized: 'wait' },
    fetch: { primary: 'tải', normalized: 'fetch' },
    settle: { primary: 'ổn định', normalized: 'settle' },
    // Control flow
    if: { primary: 'nếu', normalized: 'if' },
    // Spaced phrase (`trừ khi`) — what the i18n dict + transformer emit; the
    // BaseTokenizer's multi-word matcher catches it longest-first so the trailing
    // `khi` (=on/when) is not mistaken for a second event handler. The underscore
    // form is kept as an alternative for any caller that pre-joins the phrase.
    unless: { primary: 'trừ khi', alternatives: ['trừ_khi'], normalized: 'unless' },
    when: { primary: 'lúc', normalized: 'when' },
    where: { primary: 'ở_đâu', normalized: 'where' },
    else: { primary: 'không thì', alternatives: ['nếu không'], normalized: 'else' },
    repeat: { primary: 'lặp lại', normalized: 'repeat' },
    for: { primary: 'với mỗi', normalized: 'for' },
    while: { primary: 'trong khi', normalized: 'while' },
    // `repeat forever` loop keyword — corpus word recognized so loopType types
    // as `:literal` like EN (the repeat.loopType R1 residue; see spanish.ts).
    forever: { primary: 'mãi mãi', normalized: 'forever', alternatives: ['forever'] },
    continue: { primary: 'tiếp tục', normalized: 'continue' },
    halt: { primary: 'dừng', alternatives: ['dừng lại'], normalized: 'halt' },
    throw: { primary: 'ném', normalized: 'throw' },
    call: { primary: 'gọi', normalized: 'call' },
    return: { primary: 'trả về', normalized: 'return' },
    then: { primary: 'rồi', alternatives: ['sau đó', 'thì'], normalized: 'then' },
    and: { primary: 'và', normalized: 'and' },
    // Comparison operator (`target matches .x`). Without this keyword the surface
    // stays an identifier and leaks verbatim into the condition's raw expression,
    // which the core expression parser reads as English (modal-close-backdrop /
    // focus-trap drop their then-branch). Not an ActionType and has no command
    // schema, so no pattern is generated from it.
    matches: { primary: 'khớp', normalized: 'matches' },
    end: { primary: 'kết thúc', normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'bất đồng bộ', normalized: 'async' },
    tell: { primary: 'nói với', normalized: 'tell' },
    default: { primary: 'mặc định', normalized: 'default' },
    init: { primary: 'khởi tạo', normalized: 'init' },
    behavior: { primary: 'hành vi', normalized: 'behavior' },
    install: { primary: 'cài đặt', normalized: 'install' },
    measure: { primary: 'đo lường', normalized: 'measure' },
    beep: { primary: 'beep', normalized: 'beep' },
    break: { primary: 'ngắt', normalized: 'break' },
    copy: { primary: 'sao chép', normalized: 'copy' },
    exit: { primary: 'thoát', alternatives: ['thoát ra'], normalized: 'exit' },
    pick: { primary: 'chọn', normalized: 'pick' },
    render: { primary: 'kết xuất', normalized: 'render' },
    // Modifiers
    into: { primary: 'vào', alternatives: ['vào trong'], normalized: 'into' },
    before: { primary: 'trước', alternatives: ['trước khi'], normalized: 'before' },
    after: { primary: 'sau', alternatives: ['sau khi'], normalized: 'after' },
    // Event modifiers
    until: { primary: 'cho đến khi', normalized: 'until' },
    event: { primary: 'sự kiện', normalized: 'event' },
    from: { primary: 'từ', alternatives: ['khỏi'], normalized: 'from' },
    // Phase 8 (htmx v4 localized attributes): attribute-suffix keywords
    // used by the vocab generator — `sse-kết-nối`, `hx-trực-tiếp`, etc.
    // Vietnamese multi-word forms are hyphenated for single-token HTML
    // attribute suffixes (diacritics preserved).
    // `nối` is reserved as `append` primary — connect uses the compound form only.
    connect: { primary: 'kết-nối', alternatives: ['kết-nối-tới'], normalized: 'connect' },
    stream: { primary: 'truyền-phát', alternatives: ['phát', 'luồng'], normalized: 'stream' },
    live: { primary: 'trực-tiếp', alternatives: ['phát-trực-tiếp', 'live'], normalized: 'live' },
    socket: { primary: 'socket', alternatives: ['ổ-cắm', 'websocket'], normalized: 'socket' },
    // Reactive / realtime commands
    bind: { primary: 'ràng buộc', alternatives: ['liên kết', 'bind'], normalized: 'bind' },
    intercept: {
      primary: 'chặn',
      alternatives: ['chặn bắt', 'intercept'],
      normalized: 'intercept',
    },
    worker: { primary: 'worker', alternatives: ['công nhân'], normalized: 'worker' },
    eventsource: {
      primary: 'eventsource',
      alternatives: ['nguồn sự kiện'],
      normalized: 'eventsource',
    },
  },
  eventHandler: {
    keyword: { primary: 'khi', alternatives: ['trên'], normalized: 'on' },
    sourceMarker: { primary: 'trên', alternatives: ['tại'], position: 'before' },
    // Event marker: khi (when), used in SVO pattern
    // Pattern: khi [event] [verb] [patient] vào [destination?]
    // Example: khi nhấp chuyển đổi .active vào #button
    eventMarker: { primary: 'khi', alternatives: ['lúc'], position: 'before' },
    temporalMarkers: ['khi', 'lúc'], // temporal conjunctions (when)
  },
  lexicon: {
    events: {
      blur: { primary: 'blur' },
      change: { primary: 'change' },
      click: { primary: 'nhấp' },
      dblclick: { primary: 'dblclick' },
      focus: { primary: 'focus' },
      input: { primary: 'nhập' },
      keydown: { primary: 'keydown' },
      keypress: { primary: 'keypress' },
      keyup: { primary: 'keyup' },
      load: { primary: 'load' },
      mouseenter: { primary: 'mouseenter' },
      mouseleave: { primary: 'mouseleave' },
      mouseout: { primary: 'mouseout' },
      mouseover: { primary: 'mouseover' },
      reset: { primary: 'reset' },
      resize: { primary: 'đổi kích thước' },
      scroll: { primary: 'cuộn' },
      submit: { primary: 'nộp' },
    },
    logical: {
      and: { primary: 'và' },
      changes: { primary: 'thay đổi' },
      contains: { primary: 'chứa' },
      else: { primary: 'không thì' },
      empty: { primary: 'trống' },
      end: { primary: 'kết thúc' },
      equals: { primary: 'bằng' },
      exists: { primary: 'tồn tại' },
      false: { primary: 'sai' },
      has: { primary: 'có' },
      have: { primary: 'có' },
      is: { primary: 'là' },
      live: { primary: 'live' },
      matches: { primary: 'khớp' },
      not: { primary: 'không' },
      null: { primary: 'rỗng' },
      or: { primary: 'hoặc' },
      then: { primary: 'rồi' },
      true: { primary: 'đúng' },
      when: { primary: 'khi' },
      where: { primary: 'ở_đâu' },
    },
    temporal: {
      always: { primary: 'luôn luôn' },
      forever: { primary: 'mãi mãi' },
      never: { primary: 'không bao giờ' },
      now: { primary: 'bây giờ' },
      once: { primary: 'một lần' },
      sometimes: { primary: 'đôi khi' },
      today: { primary: 'hôm nay' },
      tomorrow: { primary: 'ngày mai' },
      twice: { primary: 'hai lần' },
      yesterday: { primary: 'hôm qua' },
    },
    values: {
      all: { primary: 'tất cả' },
      any: { primary: 'bất kỳ' },
      body: { primary: 'body' },
      each: { primary: 'mỗi' },
      event: { primary: 'sự kiện' },
      every: { primary: 'tất cả' },
      false: { primary: 'sai' },
      it: { primary: 'nó' },
      its: { primary: 'của nó' },
      me: { primary: 'tôi' },
      my: { primary: 'của tôi' },
      none: { primary: 'không có' },
      null: { primary: 'rỗng' },
      result: { primary: 'kết quả' },
      some: { primary: 'một số' },
      target: { primary: 'mục tiêu' },
      true: { primary: 'đúng' },
      undefined: { primary: 'không xác định' },
      you: { primary: 'bạn' },
      your: { primary: 'của bạn' },
    },
    attributes: {
      checked: { primary: 'được chọn' },
      class: { primary: 'lớp' },
      disabled: { primary: 'vô hiệu' },
      hidden: { primary: 'ẩn' },
      href: { primary: 'liên kết' },
      html: { primary: 'html' },
      id: { primary: 'id' },
      selected: { primary: 'được chọn' },
      src: { primary: 'nguồn' },
      style: { primary: 'kiểu' },
      text: { primary: 'văn bản' },
      value: { primary: 'giá trị' },
    },
    expressions: {
      characters: { primary: 'ký tự' },
      children: { primary: 'con' },
      closest: { primary: 'gần nhất' },
      empty: { primary: 'làm-rỗng' },
      'ends with': { primary: 'kết thúc bằng' },
      event: { primary: 'sự kiện' },
      exclusive: { primary: 'loại trừ' },
      first: { primary: 'đầu tiên' },
      'ignoring case': { primary: 'không phân biệt hoa thường' },
      inclusive: { primary: 'bao gồm' },
      it: { primary: 'nó' },
      its: { primary: 'của nó' },
      'joined by': { primary: 'nối bởi' },
      last: { primary: 'cuối cùng' },
      'mapped to': { primary: 'ánh xạ thành' },
      me: { primary: 'tôi' },
      my: { primary: 'của tôi' },
      next: { primary: 'tiếp theo' },
      parent: { primary: 'cha' },
      previous: { primary: 'trước đó' },
      random: { primary: 'ngẫu nhiên' },
      result: { primary: 'kết quả' },
      'sorted by': { primary: 'sắp xếp theo' },
      'split by': { primary: 'tách bởi' },
      'starts with': { primary: 'bắt đầu bằng' },
      target: { primary: 'mục tiêu' },
    },
  },
};
