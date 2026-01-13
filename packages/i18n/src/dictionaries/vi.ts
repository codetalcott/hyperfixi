// packages/i18n/src/dictionaries/vi.ts

import { Dictionary } from '../types';

export const vi: Dictionary = {
  commands: {
    // Event handling
    on: 'khi',
    tell: 'nói với',
    trigger: 'kích hoạt',
    send: 'gửi',

    // DOM manipulation
    take: 'lấy',
    put: 'đặt',
    set: 'gán',
    get: 'lấy giá trị',
    add: 'thêm',
    remove: 'xóa',
    toggle: 'chuyển đổi',
    hide: 'ẩn',
    show: 'hiển thị',

    // Control flow
    if: 'nếu',
    unless: 'trừ khi',
    repeat: 'lặp lại',
    for: 'với mỗi',
    while: 'trong khi',
    until: 'cho đến khi',
    continue: 'tiếp tục',
    break: 'dừng',
    halt: 'dừng lại',

    // Async
    wait: 'chờ',
    fetch: 'tải',
    call: 'gọi',
    return: 'trả về',

    // Other commands
    make: 'tạo',
    log: 'in ra',
    throw: 'ném',
    catch: 'bắt',
    measure: 'đo lường',
    transition: 'chuyển tiếp',

    // Data Commands
    increment: 'tăng',
    decrement: 'giảm',
    bind: 'ràng buộc',
    default: 'mặc định',
    persist: 'duy trì',

    // Navigation Commands
    go: 'đi đến',
    pushUrl: 'pushUrl',
    replaceUrl: 'thayThếUrl',

    // Utility Commands
    copy: 'sao chép',
    pick: 'chọn',
    beep: 'beep',

    // Advanced Commands
    js: 'js',
    async: 'bất đồng bộ',
    render: 'hiển thị',

    // Animation Commands
    swap: 'hoán đổi',
    morph: 'biến đổi',
    settle: 'ổn định',

    // Content Commands
    append: 'nối',

    // Control Flow
    exit: 'thoát',

    // Focus
    focus: 'tập trung',
    blur: 'mất tập trung',

    // Additional
    init: 'khởi tạo',
    behavior: 'hành vi',
    install: 'cài đặt',
    clone: 'sao chép',
    prepend: 'thêm đầu',
    else: 'không thì',
  },

  modifiers: {
    into: 'vào',
    before: 'trước',
    after: 'sau',
    then: 'rồi',
    end: 'kết thúc',
    from: 'từ',
    to: 'đến',
    with: 'với',
    as: 'như',
    by: 'bởi',
    on: 'trên',
    in: 'trong',
    at: 'tại',
    of: 'của',
    the: '',
    times: 'lần',
  },

  events: {
    click: 'nhấp',
    dblclick: 'nhấp đúp',
    input: 'nhập',
    change: 'thay đổi',
    submit: 'gửi',
    keydown: 'phím xuống',
    keyup: 'phím lên',
    keypress: 'nhấn phím',
    mouseover: 'chuột vào',
    mouseout: 'chuột ra',
    mouseenter: 'chuột vào',
    mouseleave: 'chuột rời',
    focus: 'tập trung',
    blur: 'mất tập trung',
    load: 'tải',
    scroll: 'cuộn',
    resize: 'đổi kích thước',
  },

  logical: {
    when: 'khi',
    where: 'ở_đâu',
    and: 'và',
    or: 'hoặc',
    not: 'không',
    is: 'là',
    equals: 'bằng',
    contains: 'chứa',
    matches: 'khớp',
    exists: 'tồn tại',
    empty: 'trống',
    true: 'đúng',
    false: 'sai',
    null: 'rỗng',
  },

  temporal: {
    now: 'bây giờ',
    today: 'hôm nay',
    tomorrow: 'ngày mai',
    yesterday: 'hôm qua',
    always: 'luôn luôn',
    never: 'không bao giờ',
    sometimes: 'đôi khi',
    once: 'một lần',
    twice: 'hai lần',
    forever: 'mãi mãi',
  },

  values: {
    true: 'đúng',
    false: 'sai',
    null: 'rỗng',
    undefined: 'không xác định',
    none: 'không có',
    all: 'tất cả',
    any: 'bất kỳ',
    some: 'một số',
    each: 'mỗi',
    every: 'tất cả',
  },

  attributes: {
    id: 'id',
    class: 'lớp',
    style: 'kiểu',
    value: 'giá trị',
    text: 'văn bản',
    html: 'html',
    src: 'nguồn',
    href: 'liên kết',
    disabled: 'vô hiệu',
    hidden: 'ẩn',
    checked: 'được chọn',
    selected: 'được chọn',
  },

  expressions: {
    me: 'tôi',
    my: 'của tôi',
    it: 'nó',
    its: 'của nó',
    result: 'kết quả',
    event: 'sự kiện',
    target: 'mục tiêu',
    first: 'đầu tiên',
    last: 'cuối cùng',
    next: 'tiếp theo',
    previous: 'trước đó',
    parent: 'cha',
    children: 'con',
    closest: 'gần nhất',
  },
};
