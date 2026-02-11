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
  direction: 'ltr',
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
    body: '본문',
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
    destination: { primary: '에', alternatives: ['으로', '로', '에서', '의'], position: 'after' },
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
    transition: { primary: '트랜지션', normalized: 'transition' }, // loanword to avoid collision with toggle alt 전환
    // Events
    on: { primary: '에', alternatives: ['시', '할 때'], normalized: 'on' },
    trigger: { primary: '트리거', normalized: 'trigger' },
    send: { primary: '보내다', normalized: 'send' },
    // DOM focus
    focus: { primary: '포커스', normalized: 'focus' },
    blur: { primary: '블러', normalized: 'blur' },
    // Common event names (for event handler patterns)
    click: { primary: '클릭', normalized: 'click' },
    hover: { primary: '호버', normalized: 'hover' },
    submit: { primary: '제출', normalized: 'submit' },
    input: { primary: '입력', normalized: 'input' },
    change: { primary: '변경', normalized: 'change' },
    // Navigation
    go: { primary: '이동', normalized: 'go' },
    // Async
    wait: { primary: '대기', normalized: 'wait' },
    fetch: { primary: '패치', normalized: 'fetch' }, // loanword to avoid collision with get
    settle: { primary: '안정', normalized: 'settle' },
    // Control flow
    if: { primary: '만약', normalized: 'if' },
    when: { primary: '때', normalized: 'when' },
    where: { primary: '어디', normalized: 'where' },
    else: { primary: '아니면', normalized: 'else' },
    repeat: { primary: '반복', normalized: 'repeat' },
    for: { primary: '각각', normalized: 'for' }, // "each" — avoids collision with while 동안
    while: { primary: '동안', normalized: 'while' },
    continue: { primary: '계속', normalized: 'continue' },
    halt: { primary: '정지', normalized: 'halt' },
    throw: { primary: '던지다', normalized: 'throw' },
    call: { primary: '호출', normalized: 'call' },
    return: { primary: '반환', normalized: 'return' },
    then: { primary: '그다음', alternatives: ['그런후'], normalized: 'then' },
    and: { primary: '그리고', alternatives: ['또한', '및'], normalized: 'and' },
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
