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
    document: '문서',
    window: '창',
    detail: '세부',
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
  // Imperative command forms are accepted on INPUT only — `primary` stays the
  // dictionary form, so rendering is unchanged (see LanguageProfile.defaultVerbForm:
  // infinitive is the industry standard for UI localization). Hyperscript is a
  // command language, though, and a native speaker giving a command writes the
  // imperative, so the parser should read it.
  //
  // Only the IRREGULARS are listed. The regular ones reach their keyword through
  // the morphological normalizer's stem (see spanish-keyword.ts and siblings),
  // which also covers conjugations nobody enumerated here.
  keywords: {
    // Class/Attribute operations
    toggle: { primary: '토글', normalized: 'toggle' },
    add: { primary: '추가', normalized: 'add' },
    remove: { primary: '제거', alternatives: ['삭제'], normalized: 'remove' },
    // Content operations
    put: { primary: '넣다', alternatives: ['넣기', '놓기', '넣으세요'], normalized: 'put' },
    append: { primary: '덧붙이다', alternatives: ['끝에추가'], normalized: 'append' },
    prepend: { primary: '앞에추가', alternatives: ['선두추가'], normalized: 'prepend' },
    take: { primary: '가져오다', alternatives: ['가져오세요'], normalized: 'take' },
    make: { primary: '만들다', normalized: 'make' },
    clone: { primary: '복제', normalized: 'clone' }, // 복제=duplicate/clone, 복사=copy
    swap: { primary: '교환', alternatives: ['바꾸다'], normalized: 'swap' },
    morph: { primary: '변형', alternatives: ['변환'], normalized: 'morph' },
    // Variable operations
    set: { primary: '설정', normalized: 'set' },
    get: { primary: '얻다', alternatives: ['얻으세요'], normalized: 'get' },
    increment: { primary: '증가', normalized: 'increment' },
    decrement: { primary: '감소', normalized: 'decrement' },
    log: { primary: '로그', normalized: 'log' },
    // Visibility
    show: { primary: '보이다', alternatives: ['표시', '보이기', '보이세요'], normalized: 'show' },
    hide: { primary: '숨기다', alternatives: ['숨기기', '숨기세요'], normalized: 'hide' },
    // primary is the loanword 트랜지션; 전환 ("switch/transition") is the form the
    // i18n transformer emits — registered as an alternative (passthrough-alignment).
    // toggle uses 토글, so 전환 carries no collision.
    transition: { primary: '트랜지션', alternatives: ['전환'], normalized: 'transition' },
    // Events
    on: { primary: '에', alternatives: ['시', '할 때'], normalized: 'on' },
    trigger: { primary: '트리거', normalized: 'trigger' },
    send: { primary: '보내다', alternatives: ['보내세요'], normalized: 'send' },
    // DOM focus
    focus: { primary: '포커스', normalized: 'focus' },
    // '블러' means the visual blur effect almost exclusively in Korean (블러 처리,
    // 블러 효과, filter: blur()), so it reads as image blurring rather than focus
    // loss. Korean writers say 포커스아웃 / 포커스 해제; 포커스아웃 is a single
    // hangul token and pairs with the shipped 포커스 for focus.
    blur: { primary: '포커스아웃', alternatives: ['블러'], normalized: 'blur' },
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
  lexicon: {
    events: {
      blur: { primary: '블러' },
      change: { primary: '변경' },
      click: { primary: '클릭' },
      dblclick: { primary: '더블클릭' },
      focus: { primary: '포커스' },
      input: { primary: '입력' },
      keydown: { primary: '키다운' },
      keypress: { primary: '키프레스' },
      keyup: { primary: '키업' },
      load: { primary: '로드' },
      mousedown: { primary: '마우스다운' },
      mouseenter: { primary: '마우스엔터' },
      mouseleave: { primary: '마우스리브' },
      mousemove: { primary: '마우스무브' },
      mouseout: { primary: '마우스아웃' },
      mouseover: { primary: '마우스오버' },
      mouseup: { primary: '마우스업' },
      reset: { primary: '재설정' },
      resize: { primary: '리사이즈' },
      scroll: { primary: '스크롤' },
      submit: { primary: '제출' },
      touchcancel: { primary: '터치취소' },
      touchend: { primary: '터치종료' },
      touchmove: { primary: 'touchmove' },
      touchstart: { primary: 'touchstart' },
      unload: { primary: 'unload' },
    },
    logical: {
      and: { primary: '그리고' },
      bind: { primary: '바인드' },
      changes: { primary: '변경되면' },
      contains: { primary: '포함' },
      else: { primary: '아니면' },
      end: { primary: '끝' },
      equals: { primary: '같다' },
      exists: { primary: '존재' },
      has: { primary: '있다' },
      have: { primary: '있다' },
      includes: { primary: '포함하다' },
      is: { primary: '이다' },
      live: { primary: '라이브' },
      matches: { primary: '일치' },
      not: { primary: '아니' },
      or: { primary: '또는' },
      otherwise: { primary: '그렇지않으면' },
      then: { primary: '그러면' },
      when: { primary: '때' },
      where: { primary: '어디' },
    },
    temporal: {
      h: { primary: '시' },
      hour: { primary: '시간' },
      hours: { primary: '시간' },
      millisecond: { primary: '밀리초' },
      milliseconds: { primary: '밀리초' },
      min: { primary: '분' },
      minute: { primary: '분' },
      minutes: { primary: '분' },
      ms: { primary: 'ms' },
      s: { primary: '초' },
      second: { primary: '초' },
      seconds: { primary: '초' },
    },
    values: {
      body: { primary: '바디' },
      detail: { primary: '세부' },
      document: { primary: '문서' },
      element: { primary: '요소' },
      event: { primary: '이벤트' },
      false: { primary: '거짓' },
      it: { primary: '그것' },
      its: { primary: '그것의' },
      me: { primary: '나' },
      my: { primary: '내' },
      myself: { primary: '나자신' },
      null: { primary: '널' },
      result: { primary: '결과' },
      target: { primary: '대상' },
      true: { primary: '참' },
      undefined: { primary: '정의안됨' },
      value: { primary: '값' },
      window: { primary: '창' },
      you: { primary: '너' },
      your: { primary: '네' },
      yourself: { primary: '너자신' },
    },
    attributes: {
      attribute: { primary: '속성' },
      attributes: { primary: '속성들' },
      class: { primary: '클래스' },
      classes: { primary: '클래스들' },
      properties: { primary: '프로퍼티들' },
      property: { primary: '프로퍼티' },
      style: { primary: '스타일' },
      styles: { primary: '스타일들' },
    },
    expressions: {
      at: { primary: '에서' },
      characters: { primary: '문자' },
      children: { primary: '자식' },
      closest: { primary: '가장가까운' },
      empty: { primary: '비어있는' },
      'ends with': { primary: '로끝나는' },
      exclusive: { primary: '제외' },
      first: { primary: '첫번째' },
      'ignoring case': { primary: '대소문자_무시' },
      inclusive: { primary: '포함' },
      'joined by': { primary: '로_결합' },
      last: { primary: '마지막' },
      'mapped to': { primary: '로_변환' },
      next: { primary: '다음' },
      no: { primary: '없음' },
      parent: { primary: '부모' },
      prev: { primary: '이전' },
      previous: { primary: '이전' },
      random: { primary: '무작위' },
      some: { primary: '일부' },
      'sorted by': { primary: '로_정렬' },
      'split by': { primary: '로_분할' },
      'starts with': { primary: '로시작' },
      within: { primary: '이내' },
    },
  },
};
