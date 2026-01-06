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
    me: 'tôi',        // "I/me"
    it: 'nó',         // "it"
    you: 'bạn',       // "you"
    result: 'kết quả',
    event: 'sự kiện',
    target: 'mục tiêu',
    body: 'body',
  },
  possessive: {
    marker: 'của',    // Vietnamese uses "của" for possession (của tôi = my)
    markerPosition: 'between',
    specialForms: {
      me: 'của tôi',   // "my"
      it: 'của nó',    // "its"
      you: 'của bạn',  // "your"
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
    clone: { primary: 'sao chép', normalized: 'clone' },
    swap: { primary: 'hoán đổi', normalized: 'swap' },
    morph: { primary: 'biến đổi', normalized: 'morph' },
    // Variable operations
    set: { primary: 'gán', alternatives: ['thiết lập', 'đặt'], normalized: 'set' },
    get: { primary: 'lấy giá trị', alternatives: ['nhận', 'lấy'], normalized: 'get' },
    increment: { primary: 'tăng', alternatives: ['tăng lên'], normalized: 'increment' },
    decrement: { primary: 'giảm', alternatives: ['giảm đi'], normalized: 'decrement' },
    log: { primary: 'in ra', normalized: 'log' },
    // Visibility
    show: { primary: 'hiển thị', alternatives: ['hiện'], normalized: 'show' },
    hide: { primary: 'ẩn', alternatives: ['che', 'giấu'], normalized: 'hide' },
    transition: { primary: 'chuyển tiếp', normalized: 'transition' },
    // Events
    on: { primary: 'khi', alternatives: ['lúc', 'trên'], normalized: 'on' },
    trigger: { primary: 'kích hoạt', normalized: 'trigger' },
    send: { primary: 'gửi', normalized: 'send' },
    // DOM focus
    focus: { primary: 'tập trung', normalized: 'focus' },
    blur: { primary: 'mất tập trung', normalized: 'blur' },
    // Navigation
    go: { primary: 'đi đến', alternatives: ['đi'], normalized: 'go' },
    // Async
    wait: { primary: 'chờ', alternatives: ['đợi'], normalized: 'wait' },
    fetch: { primary: 'tải', normalized: 'fetch' },
    settle: { primary: 'ổn định', normalized: 'settle' },
    // Control flow
    if: { primary: 'nếu', normalized: 'if' },
    else: { primary: 'không thì', alternatives: ['nếu không'], normalized: 'else' },
    repeat: { primary: 'lặp lại', normalized: 'repeat' },
    for: { primary: 'với mỗi', normalized: 'for' },
    while: { primary: 'trong khi', normalized: 'while' },
    continue: { primary: 'tiếp tục', normalized: 'continue' },
    halt: { primary: 'dừng', alternatives: ['dừng lại'], normalized: 'halt' },
    throw: { primary: 'ném', normalized: 'throw' },
    call: { primary: 'gọi', normalized: 'call' },
    return: { primary: 'trả về', normalized: 'return' },
    then: { primary: 'rồi', alternatives: ['sau đó', 'thì'], normalized: 'then' },
    and: { primary: 'và', normalized: 'and' },
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
    // Modifiers
    into: { primary: 'vào', alternatives: ['vào trong'], normalized: 'into' },
    before: { primary: 'trước', alternatives: ['trước khi'], normalized: 'before' },
    after: { primary: 'sau', alternatives: ['sau khi'], normalized: 'after' },
    // Event modifiers
    until: { primary: 'cho đến khi', normalized: 'until' },
    event: { primary: 'sự kiện', normalized: 'event' },
    from: { primary: 'từ', alternatives: ['khỏi'], normalized: 'from' },
  },
  eventHandler: {
    keyword: { primary: 'khi', alternatives: ['lúc', 'trên'], normalized: 'on' },
    sourceMarker: { primary: 'trên', alternatives: ['tại'], position: 'before' },
  },
};
