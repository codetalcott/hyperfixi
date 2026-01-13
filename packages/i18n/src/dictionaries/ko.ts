// packages/i18n/src/dictionaries/ko.ts

import { Dictionary } from '../types';

export const ko: Dictionary = {
  commands: {
    // Event handling
    on: '에',
    tell: '말하다',
    trigger: '트리거',
    send: '보내다',

    // DOM manipulation
    take: '가져오다',
    put: '넣다',
    set: '설정',
    get: '얻다',
    add: '추가',
    remove: '제거',
    toggle: '토글',
    hide: '숨기다',
    show: '보이다',

    // Control flow
    if: '만약',
    unless: '아니면',
    repeat: '반복',
    for: '동안',
    while: '동안',
    until: '까지',
    continue: '계속',
    break: '중단',
    halt: '정지',

    // Async
    wait: '대기',
    fetch: '가져오기',
    call: '호출',
    return: '반환',

    // Other commands
    make: '만들다',
    log: '로그',
    throw: '던지다',
    catch: '잡다',
    measure: '측정',
    transition: '전환',

    // Data Commands
    increment: '증가',
    decrement: '감소',
    bind: '바인드',
    default: '기본값',
    persist: '유지',

    // Navigation Commands
    go: '이동',
    pushUrl: 'URL푸시',
    replaceUrl: 'URL교체',

    // Utility Commands
    copy: '복사',
    pick: '선택',
    beep: '비프',

    // Advanced Commands
    js: 'JS실행',
    async: '비동기',
    render: '렌더링',

    // Animation Commands
    swap: '교환',
    morph: '변형',
    settle: '안정',

    // Content Commands
    append: '추가',

    // Control Flow
    exit: '종료',

    // Behaviors
    install: '설치',
  },

  modifiers: {
    to: '에',
    from: '에서',
    into: '으로',
    with: '와',
    at: '에',
    in: '안에',
    of: '의',
    as: '로',
    by: '에의해',
    before: '전에',
    after: '후에',
    over: '위에',
    under: '아래',
    between: '사이',
    through: '통해',
    without: '없이',
  },

  events: {
    click: '클릭',
    dblclick: '더블클릭',
    mousedown: '마우스다운',
    mouseup: '마우스업',
    mouseenter: '마우스엔터',
    mouseleave: '마우스리브',
    mouseover: '마우스오버',
    mouseout: '마우스아웃',
    mousemove: '마우스무브',

    keydown: '키다운',
    keyup: '키업',
    keypress: '키프레스',

    focus: '포커스',
    blur: '블러',
    change: '변경',
    input: '입력',
    submit: '제출',
    reset: '리셋',

    load: '로드',
    unload: '언로드',
    resize: '리사이즈',
    scroll: '스크롤',

    touchstart: '터치시작',
    touchend: '터치종료',
    touchmove: '터치이동',
    touchcancel: '터치취소',
  },

  logical: {
    when: '때',
    where: '어디',
    and: '그리고',
    or: '또는',
    not: '아니',
    is: '이다',
    exists: '존재',
    matches: '일치',
    contains: '포함',
    includes: '포함하다',
    equals: '같다',
    then: '그러면',
    else: '아니면',
    otherwise: '그렇지않으면',
    end: '끝',
  },

  temporal: {
    seconds: '초',
    second: '초',
    milliseconds: '밀리초',
    millisecond: '밀리초',
    minutes: '분',
    minute: '분',
    hours: '시간',
    hour: '시간',
    ms: 'ms',
    s: '초',
    min: '분',
    h: '시',
  },

  values: {
    true: '참',
    false: '거짓',
    null: '널',
    undefined: '정의안됨',
    it: '그것',
    its: '그것의', // REVIEW: native speaker
    me: '나',
    my: '내',
    myself: '나자신',
    you: '너', // REVIEW: native speaker - formal/informal
    your: '네', // REVIEW: native speaker - formal/informal
    yourself: '너자신', // REVIEW: native speaker
    element: '요소',
    target: '대상',
    detail: '세부',
    event: '이벤트',
    window: '창',
    document: '문서',
    body: '바디',
    result: '결과',
    value: '값',
  },

  attributes: {
    class: '클래스',
    classes: '클래스들',
    style: '스타일',
    styles: '스타일들',
    attribute: '속성',
    attributes: '속성들',
    property: '프로퍼티',
    properties: '프로퍼티들',
  },

  expressions: {
    // Positional
    first: '첫번째',
    last: '마지막',
    next: '다음',
    previous: '이전',
    prev: '이전',
    at: '에서',
    random: '무작위',

    // DOM Traversal
    closest: '가장가까운',
    parent: '부모',
    children: '자식',
    within: '이내',

    // Emptiness/Existence
    no: '없음',
    empty: '비어있는',
    some: '일부',

    // String operations
    'starts with': '로시작',
    'ends with': '로끝나는',
  },
};
