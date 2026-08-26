/**
 * Chinese (Simplified) Language Profile
 *
 * SVO word order, no markers (relies on word order), no spaces between words.
 * Isolating language with topic-comment structure and optional BA construction.
 */

import type { LanguageProfile } from './types';

export const chineseProfile: LanguageProfile = {
  code: 'zh',
  name: 'Chinese',
  nativeName: '中文',
  regions: ['east-asian', 'priority'],
  direction: 'ltr',
  script: 'cjk',
  wordOrder: 'SVO',
  markingStrategy: 'preposition', // Uses prepositions but often implicit
  usesSpaces: false,
  verb: {
    position: 'second',
    subjectDrop: true,
  },
  references: {
    me: '我', // "I/me"
    it: '它', // "it"
    you: '你', // "you"
    result: '结果',
    event: '事件',
    target: '目标',
    body: '主体',
    document: '文档',
    window: '窗口',
    detail: '详情',
  },
  possessive: {
    marker: '的', // Possessive particle (de)
    markerPosition: 'between',
    // Chinese: 我的 value (wǒ de value) = "my value"
    keywords: {
      // Compound possessive forms (pronoun + 的)
      我的: 'me', // wǒ de (my)
      你的: 'you', // nǐ de (your)
      它的: 'it', // tā de (its)
      他的: 'it', // tā de (his)
      她的: 'it', // tā de (her)
    },
  },
  roleMarkers: {
    destination: { primary: '在', alternatives: ['到', '于'], position: 'before' },
    source: { primary: '从', alternatives: ['由'], position: 'before' },
    patient: { primary: '把', position: 'before' }, // BA construction
    style: { primary: '用', alternatives: ['以'], position: 'before' },
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: '切换', normalized: 'toggle' },
    add: { primary: '添加', alternatives: ['加'], normalized: 'add' },
    remove: { primary: '移除', alternatives: ['删除', '去掉'], normalized: 'remove' },
    // Content operations
    put: { primary: '放置', alternatives: ['放', '放入'], normalized: 'put' },
    append: { primary: '追加', alternatives: ['附加'], normalized: 'append' },
    prepend: { primary: '前置', alternatives: ['预置'], normalized: 'prepend' },
    take: { primary: '拿取', normalized: 'take' },
    make: { primary: '制作', normalized: 'make' },
    clone: { primary: '克隆', normalized: 'clone' },
    swap: { primary: '交换', normalized: 'swap' },
    morph: { primary: '变形', alternatives: ['转换'], normalized: 'morph' },
    // Variable operations
    set: { primary: '设置', alternatives: ['设定'], normalized: 'set' },
    get: { primary: '获取', alternatives: ['获得', '取得'], normalized: 'get' },
    increment: { primary: '增加', normalized: 'increment' },
    decrement: { primary: '减少', normalized: 'decrement' },
    log: { primary: '日志', normalized: 'log' },
    // Visibility
    show: { primary: '显示', alternatives: ['展示'], normalized: 'show' },
    hide: { primary: '隐藏', normalized: 'hide' },
    transition: { primary: '过渡', normalized: 'transition' },
    // Events
    on: { primary: '当', alternatives: ['在...时'], normalized: 'on' },
    trigger: { primary: '触发', normalized: 'trigger' },
    send: { primary: '发送', normalized: 'send' },
    // DOM focus
    // 取得焦點 / 失去焦點 added 2026-07-28: Taiwanese tutorials use the explicit
    // verb-object pairs where Mainland writing uses the two-character shorthand.
    // Aliases rather than a zh-Hant fork — the divergence is lexical, and
    // normLang strips the subtag so zh-TW resolves as zh.
    focus: { primary: '聚焦', alternatives: ['取得焦點'], normalized: 'focus' },
    blur: { primary: '失焦', alternatives: ['失去焦點'], normalized: 'blur' },
    // Phase 1 (v0.9.90): DOM / form state / debug
    empty: { primary: '清空', alternatives: ['空的'], normalized: 'empty' },
    open: { primary: '打开', normalized: 'open' },
    close: { primary: '关闭', normalized: 'close' },
    select: { primary: '选择', normalized: 'select' },
    clear: { primary: '清除', normalized: 'clear' },
    reset: { primary: '重置', normalized: 'reset' },
    breakpoint: { primary: '断点', normalized: 'breakpoint' },
    // Common event names (for event handler patterns)
    click: { primary: '点击', normalized: 'click' },
    hover: { primary: '悬停', alternatives: ['悬浮'], normalized: 'hover' },
    // 送出 is the Taiwan/HK form for sending form data; 提交 is understood there
    // but is the Mainland default.
    submit: { primary: '提交', alternatives: ['送出'], normalized: 'submit' },
    input: { primary: '输入', normalized: 'input' },
    // 变化 leads: Chinese tutorials describe the event intransitively as
    // 「值发生变化」, whereas 改变 is transitive and reads as an instruction to
    // change something. Ordering fix only — both spellings still parse.
    change: { primary: '变化', alternatives: ['改变'], normalized: 'change' },
    // Navigation
    go: { primary: '前往', normalized: 'go' },
    scroll: { primary: '滚动', alternatives: ['捲動'], normalized: 'scroll' },
    push: { primary: '推送', normalized: 'push' },
    replace: { primary: '替换', normalized: 'replace' },
    process: { primary: '处理', normalized: 'process' },
    // Async
    wait: { primary: '等待', normalized: 'wait' },
    fetch: { primary: '抓取', normalized: 'fetch' },
    settle: { primary: '稳定', normalized: 'settle' },
    // Control flow
    if: { primary: '如果', normalized: 'if' },
    unless: { primary: '除非', normalized: 'unless' },
    when: { primary: '何时', normalized: 'when' },
    where: { primary: '哪里', normalized: 'where' },
    else: { primary: '否则', normalized: 'else' },
    // `matches` is a comparison operator (core territory), so it had always
    // tokenized as a bare identifier. The folded condition raw is read by the
    // core expression parser (English operators only), so `target 匹配 .x` must
    // normalize to `target matches .x`; otherwise `匹配` stays an identifier and
    // modal-close-backdrop drops its then-branch at runtime. `匹配` appears in
    // exactly two corpus patterns (modal-close-backdrop, focus-trap), both as
    // the comparison operator — no non-operator collision (cf. §7r ko/ru/uk).
    matches: { primary: '匹配', normalized: 'matches' },
    repeat: { primary: '重复', normalized: 'repeat' },
    for: { primary: '为', normalized: 'for' },
    while: { primary: '持续', normalized: 'while' },
    continue: { primary: '继续', normalized: 'continue' },
    halt: { primary: '停止', normalized: 'halt' },
    throw: { primary: '抛出', normalized: 'throw' },
    call: { primary: '调用', normalized: 'call' },
    return: { primary: '返回', normalized: 'return' },
    then: { primary: '然后', alternatives: ['接着', '那么'], normalized: 'then' },
    and: { primary: '并且', alternatives: ['和', '而且'], normalized: 'and' },
    // Existence operator (`if #modal exists`). Same seam as `matches`: without the
    // keyword the surface stays an identifier and leaks verbatim into the
    // condition's raw expression (if-exists). Neither an ActionType nor a command
    // schema, so no pattern is generated from it.
    exists: { primary: '存在', normalized: 'exists' },
    end: { primary: '结束', alternatives: ['终止', '完'], normalized: 'end' },
    // Advanced
    js: { primary: 'JS执行', alternatives: ['js'], normalized: 'js' },
    async: { primary: '异步', normalized: 'async' },
    tell: { primary: '告诉', normalized: 'tell' },
    default: { primary: '默认', normalized: 'default' },
    init: { primary: '初始化', normalized: 'init' },
    behavior: { primary: '行为', normalized: 'behavior' },
    install: { primary: '安装', normalized: 'install' },
    measure: { primary: '测量', normalized: 'measure' },
    beep: { primary: '蜂鸣', normalized: 'beep' },
    break: { primary: '中断', normalized: 'break' },
    copy: { primary: '复制', normalized: 'copy' },
    exit: { primary: '退出', normalized: 'exit' },
    pick: { primary: '选取', normalized: 'pick' },
    render: { primary: '渲染', normalized: 'render' },
    // Modifiers
    into: { primary: '进入', normalized: 'into' },
    before: { primary: '之前', normalized: 'before' },
    after: { primary: '之后', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: '直到', normalized: 'until' },
    event: { primary: '事件', normalized: 'event' },
    from: { primary: '从', normalized: 'from' },
    // Phase 8 (htmx v4 localized attributes): attribute-suffix keywords
    // used by the vocab generator — `sse-连接`, `hx-实时`, etc.
    connect: { primary: '连接', alternatives: ['连接器'], normalized: 'connect' },
    stream: { primary: '流', alternatives: ['流式传输'], normalized: 'stream' },
    live: { primary: '实时', alternatives: ['直播'], normalized: 'live' },
    socket: { primary: '套接字', alternatives: ['websocket', 'socket'], normalized: 'socket' },
    // Reactive / realtime commands
    bind: { primary: '绑定', alternatives: ['bind'], normalized: 'bind' },
    intercept: { primary: '拦截', alternatives: ['intercept'], normalized: 'intercept' },
    worker: { primary: '工作线程', alternatives: ['工作者', 'worker'], normalized: 'worker' },
    eventsource: { primary: 'eventsource', alternatives: ['事件源'], normalized: 'eventsource' },
  },
  tokenization: {
    boundaryStrategy: 'character',
  },
  eventHandler: {
    keyword: { primary: '当', alternatives: ['在...时'], normalized: 'on' },
    sourceMarker: { primary: '从', position: 'before' },
    // Event marker: 当 (when), used in SVO pattern
    // Pattern: 当 [event] [verb] [patient] 在 [destination?]
    // Example: 当 点击 切换 .active 在 #button
    eventMarker: { primary: '当', alternatives: ['在'], position: 'before' },
    temporalMarkers: ['当', '在...时'], // temporal conjunctions (when)
  },
  lexicon: {
    events: {
      blur: { primary: '失焦' },
      change: { primary: '改变' },
      click: { primary: '点击' },
      dblclick: { primary: '双击' },
      focus: { primary: '聚焦' },
      input: { primary: '输入' },
      keydown: { primary: '按键按下' },
      keypress: { primary: 'keypress' },
      keyup: { primary: '松键' },
      load: { primary: '加载' },
      mousedown: { primary: 'mousedown' },
      mouseenter: { primary: 'mouseenter' },
      mouseleave: { primary: 'mouseleave' },
      mousemove: { primary: '鼠标移动' },
      mouseout: { primary: '鼠标移出' },
      mouseover: { primary: '鼠标移入' },
      mouseup: { primary: 'mouseup' },
      reset: { primary: '重置' },
      resize: { primary: '调整大小' },
      scroll: { primary: '滚动' },
      submit: { primary: '提交' },
      touchcancel: { primary: 'touchcancel' },
      touchend: { primary: 'touchend' },
      touchmove: { primary: '触摸移动' },
      touchstart: { primary: '触摸开始' },
      unload: { primary: '卸载' },
    },
    logical: {
      and: { primary: '和' },
      bind: { primary: '绑定' },
      changes: { primary: '改变时' },
      contains: { primary: '包含' },
      else: { primary: '否则' },
      end: { primary: '结束' },
      equals: { primary: '等于' },
      exists: { primary: '存在' },
      has: { primary: '有' },
      have: { primary: '有' },
      includes: { primary: '包括' },
      is: { primary: '是' },
      live: { primary: '实时' },
      matches: { primary: '匹配' },
      not: { primary: '非' },
      or: { primary: '或' },
      otherwise: { primary: '要不然' },
      then: { primary: '那么' },
      when: { primary: '当' },
      where: { primary: '哪里' },
    },
    temporal: {
      h: { primary: '时' },
      hour: { primary: '小时' },
      hours: { primary: '小时' },
      millisecond: { primary: '毫秒' },
      milliseconds: { primary: '毫秒' },
      min: { primary: '分' },
      minute: { primary: '分钟' },
      minutes: { primary: '分钟' },
      ms: { primary: '毫秒' },
      s: { primary: '秒' },
      second: { primary: '秒' },
      seconds: { primary: '秒' },
    },
    values: {
      body: { primary: '主体' },
      detail: { primary: '详情' },
      document: { primary: '文档' },
      element: { primary: '元素' },
      event: { primary: '事件' },
      false: { primary: '假' },
      it: { primary: '它' },
      its: { primary: '它的' },
      me: { primary: '我' },
      my: { primary: '我的' },
      myself: { primary: '我自己' },
      null: { primary: '空' },
      result: { primary: '结果' },
      target: { primary: '目标' },
      true: { primary: '真' },
      undefined: { primary: '未定义' },
      value: { primary: '值' },
      window: { primary: '窗口' },
      you: { primary: '你' },
      your: { primary: '你的' },
      yourself: { primary: '你自己' },
    },
    attributes: {
      attribute: { primary: '属性' },
      attributes: { primary: '属性集' },
      class: { primary: '类' },
      classes: { primary: '类别' },
      properties: { primary: '特性集' },
      property: { primary: '特性' },
      style: { primary: '样式' },
      styles: { primary: '样式集' },
    },
    expressions: {
      at: { primary: '在' },
      characters: { primary: '字符' },
      children: { primary: '子级' },
      closest: { primary: '最近的' },
      empty: { primary: '空的' },
      'ends with': { primary: '以结尾' },
      exclusive: { primary: '排除' },
      first: { primary: '第一个' },
      'ignoring case': { primary: '忽略大小写' },
      inclusive: { primary: '包含' },
      'joined by': { primary: '用_连接' },
      last: { primary: '最后一个' },
      'mapped to': { primary: '映射为' },
      next: { primary: '下一个' },
      no: { primary: '没有' },
      parent: { primary: '父级' },
      prev: { primary: '上个' },
      previous: { primary: '上一个' },
      random: { primary: '随机' },
      some: { primary: '一些' },
      'sorted by': { primary: '按_排序' },
      'split by': { primary: '按_分割' },
      'starts with': { primary: '以开头' },
      within: { primary: '之内' },
    },
  },
};
