/**
 * Korean Language Profile
 *
 * SOV word order, particles (을/를, 에, 에서, etc.), space-separated between words.
 * Agglutinative language with particles attaching to words.
 */

import type { LanguageProfile } from './types';

export const koreanProfile: LanguageProfile = {
  code: 'ko',
  name: 'Korean',
  nativeName: '한국어',
  regions: ['east-asian', 'priority'],
  direction: 'ltr',
  script: 'hangul',
  wordOrder: 'SOV',
  markingStrategy: 'particle',
  usesSpaces: true, // Korean uses spaces between words, but particles attach
  verb: {
    position: 'end',
    suffixes: ['다', '요', '니다', '세요'],
    subjectDrop: true,
  },
  references: {
    me: '나', // "I/me" (informal)
    it: '그것', // "it"
    you: '너', // "you" (informal)
    result: '결과',
    event: '이벤트',
    target: '대상',
    body: '바디', // matches the i18n dict's emitted body word (본문 = "main text", wrong for the DOM body element)
  },
  possessive: {
    marker: '의', // Possessive particle
    markerPosition: 'between',
    specialForms: {
      me: '내', // Contracted form of 나의 (my)
      it: '그것의', // "its"
      you: '네', // Contracted form of 너의 (your)
    },
    keywords: {
      내: 'me', // nae (my)
      네: 'you', // ne (your)
      그의: 'it', // geu-ui (its/his)
    },
  },
  roleMarkers: {
    patient: { primary: '을', alternatives: ['를'], position: 'after' },
    // 에서 is deliberately NOT a destination alternative: it is the SOURCE
    // primary ("at/from"), and listing it here let an unconsumed wait-line
    // tail (`문서 에서` — from document) satisfy the next SOV clause's
    // optional destination group (behavior-draggable's add captured
    // destination=문서 instead of the schema `me` default). A real Korean
    // destination renders 에/으로/로/의.
    destination: { primary: '에', alternatives: ['으로', '로', '의'], position: 'after' },
    source: { primary: '에서', alternatives: ['부터'], position: 'after' },
    style: { primary: '로', alternatives: ['으로'], position: 'after' },
    event: { primary: '을', alternatives: ['를'], position: 'after' }, // Event as object marker
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: '토글', normalized: 'toggle' },
    add: { primary: '추가', normalized: 'add' },
    remove: { primary: '제거', alternatives: ['삭제'], normalized: 'remove' },
    // Content operations
    put: { primary: '넣다', alternatives: ['넣기', '놓기'], normalized: 'put' },
    append: { primary: '덧붙이다', alternatives: ['끝에추가'], normalized: 'append' },
    prepend: { primary: '앞에추가', alternatives: ['선두추가'], normalized: 'prepend' },
    take: { primary: '가져오다', normalized: 'take' },
    make: { primary: '만들다', normalized: 'make' },
    clone: { primary: '복제', normalized: 'clone' }, // 복제=duplicate/clone, 복사=copy
    swap: { primary: '교환', alternatives: ['바꾸다'], normalized: 'swap' },
    morph: { primary: '변형', alternatives: ['변환'], normalized: 'morph' },
    // Variable operations
    set: { primary: '설정', normalized: 'set' },
    get: { primary: '얻다', normalized: 'get' },
    increment: { primary: '증가', normalized: 'increment' },
    decrement: { primary: '감소', normalized: 'decrement' },
    log: { primary: '로그', normalized: 'log' },
    // Visibility
    show: { primary: '보이다', alternatives: ['표시', '보이기'], normalized: 'show' },
    hide: { primary: '숨기다', alternatives: ['숨기기'], normalized: 'hide' },
    // primary is the loanword 트랜지션; 전환 ("switch/transition") is the form the
    // i18n transformer emits — registered as an alternative (passthrough-alignment).
    // toggle uses 토글, so 전환 carries no collision.
    transition: { primary: '트랜지션', alternatives: ['전환'], normalized: 'transition' },
    // Events
    on: { primary: '에', alternatives: ['시', '할 때'], normalized: 'on' },
    trigger: { primary: '트리거', normalized: 'trigger' },
    send: { primary: '보내다', normalized: 'send' },
    // DOM focus
    focus: { primary: '포커스', normalized: 'focus' },
    blur: { primary: '블러', normalized: 'blur' },
    // Phase 1 (v0.9.90): DOM / form state / debug
    // Batch 3: 비어있는 added — the i18n dict renders the empty COMMAND with its
    // `is empty` adjective (category-shadowed), which parsed null.
    empty: { primary: '비우기', alternatives: ['비어있는'], normalized: 'empty' },
    open: { primary: '열기', normalized: 'open' },
    close: { primary: '닫기', normalized: 'close' },
    select: { primary: '고르기', normalized: 'select' },
    clear: { primary: '지우기', normalized: 'clear' },
    reset: { primary: '재설정', normalized: 'reset' },
    breakpoint: { primary: '중단점', normalized: 'breakpoint' },
    // Common event names (for event handler patterns)
    click: { primary: '클릭', normalized: 'click' },
    hover: { primary: '호버', normalized: 'hover' },
    submit: { primary: '제출', normalized: 'submit' },
    input: { primary: '입력', normalized: 'input' },
    change: { primary: '변경', normalized: 'change' },
    // Navigation
    go: { primary: '이동', normalized: 'go' },
    scroll: { primary: '스크롤', normalized: 'scroll' },
    push: { primary: '푸시', normalized: 'push' },
    replace: { primary: '교체', alternatives: ['바꾸기'], normalized: 'replace' },
    process: { primary: '처리', normalized: 'process' },
    // Async
    wait: { primary: '대기', normalized: 'wait' },
    // primary is the loanword 패치 (avoids collision with get 얻다); 가져오기
    // ("bring/fetch") is the form the i18n transformer emits, registered here so
    // transformed fetch patterns parse (passthrough-alignment).
    fetch: { primary: '패치', alternatives: ['가져오기'], normalized: 'fetch' },
    settle: { primary: '안정', normalized: 'settle' },
    // Control flow
    if: { primary: '만약', normalized: 'if' },
    when: { primary: '때', normalized: 'when' },
    where: { primary: '어디', normalized: 'where' },
    else: { primary: '아니면', normalized: 'else' },
    // `아니라면` ("if it isn't"), deliberately distinct from else `아니면`. The
    // i18n dict previously rendered unless as `아니면` too, so the marker
    // tokenized as `else` (homonym collision) and the `unless` action dropped.
    // Longest-match beats the `아니` (not) prefix, so this tokenizes clean.
    unless: { primary: '아니라면', normalized: 'unless' },
    repeat: { primary: '반복', normalized: 'repeat' },
    for: { primary: '각각', normalized: 'for' }, // "each" — avoids collision with while 동안
    while: { primary: '동안', normalized: 'while' },
    // `repeat forever` loop keyword — corpus word recognized so loopType types
    // as `:literal` like EN (the repeat.loopType R1 residue; see spanish.ts).
    forever: { primary: 'forever', normalized: 'forever' },
    continue: { primary: '계속', normalized: 'continue' },
    halt: { primary: '정지', normalized: 'halt' },
    throw: { primary: '던지다', normalized: 'throw' },
    call: { primary: '호출', normalized: 'call' },
    return: { primary: '반환', normalized: 'return' },
    then: { primary: '그다음', alternatives: ['그런후'], normalized: 'then' },
    and: { primary: '그리고', alternatives: ['또한', '및'], normalized: 'and' },
    // Comparison operator. The semantic package doesn't evaluate operators (core
    // does), but a folded conditional's raw condition is reconstructed from the
    // token stream and read by the core expression parser, which only understands
    // English operator words — so `target 일치 .x` must normalize to `target
    // matches .x`. Without this keyword `일치` stays an identifier and the
    // condition is unevaluable (modal-close-backdrop drops its then-branch).
    matches: { primary: '일치', normalized: 'matches' },
    // Existence operator (`if #modal exists`). Same seam as `matches`: without the
    // keyword the surface stays an identifier and leaks verbatim into the
    // condition's raw expression (if-exists). Neither an ActionType nor a command
    // schema, so no pattern is generated from it.
    exists: { primary: '존재', normalized: 'exists' },
    // Negative-existence operator (`if no dragHandle set dragHandle to me`). Same
    // seam as `exists`: without the keyword the surface stays an identifier and
    // leaks verbatim into the condition's raw expression (behavior-draggable).
    // Neither an ActionType nor a command schema, so no pattern is generated from it.
    no: { primary: '없음', normalized: 'no' },
    end: { primary: '끝', alternatives: ['마침'], normalized: 'end' },
    // Advanced
    js: { primary: 'JS실행', alternatives: ['js'], normalized: 'js' },
    async: { primary: '비동기', normalized: 'async' },
    tell: { primary: '말하다', normalized: 'tell' },
    default: { primary: '기본값', normalized: 'default' },
    init: { primary: '초기화', normalized: 'init' },
    behavior: { primary: '동작', normalized: 'behavior' },
    install: { primary: '설치', normalized: 'install' },
    measure: { primary: '측정', normalized: 'measure' },
    beep: { primary: '비프', normalized: 'beep' },
    break: { primary: '중단', normalized: 'break' },
    copy: { primary: '복사', normalized: 'copy' },
    exit: { primary: '나가기', normalized: 'exit' }, // avoids collision with end alt 종료
    pick: { primary: '선택', normalized: 'pick' },
    render: { primary: '렌더링', normalized: 'render' },
    // Modifiers
    into: { primary: '으로', normalized: 'into' },
    before: { primary: '전에', normalized: 'before' },
    after: { primary: '후에', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: '까지', normalized: 'until' },
    event: { primary: '이벤트', normalized: 'event' },
    from: { primary: '에서', normalized: 'from' },
    // Phase 8 (htmx v4 localized attributes): attribute-suffix keywords
    // used by the vocab generator — `sse-연결`, `hx-실시간`, etc.
    connect: { primary: '연결', alternatives: ['접속'], normalized: 'connect' },
    stream: { primary: '스트림', alternatives: ['스트리밍'], normalized: 'stream' },
    live: { primary: '실시간', alternatives: ['라이브'], normalized: 'live' },
    socket: { primary: '소켓', alternatives: ['websocket'], normalized: 'socket' },
    // Reactive / realtime commands
    bind: { primary: '바인드', alternatives: ['bind'], normalized: 'bind' },
    intercept: {
      primary: '가로채기',
      alternatives: ['인터셉트', 'intercept'],
      normalized: 'intercept',
    },
    worker: { primary: '워커', alternatives: ['worker'], normalized: 'worker' },
    eventsource: {
      primary: 'eventsource',
      alternatives: ['이벤트소스'],
      normalized: 'eventsource',
    },
  },
  tokenization: {
    particles: ['을', '를', '이', '가', '은', '는', '에', '에서', '으로', '로', '와', '과', '도'],
    boundaryStrategy: 'space',
  },
  eventHandler: {
    // Event marker: 할 때 (when/at the time of), used in SOV pattern
    // Pattern: [event] 할 때 [destination] 의 [patient] 를 [action]
    // Example: 클릭 할 때 #button 의 .active 를 토글
    // Compact forms (no space): 클릭할때 .active를토글
    eventMarker: { primary: '할 때', alternatives: ['할때', '때', '에'], position: 'after' },
    temporalMarkers: ['할 때', '할때', '때'], // temporal markers (with and without space)
  },
};
