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
  direction: 'ltr',
  wordOrder: 'SVO',
  markingStrategy: 'preposition', // Uses prepositions but often implicit
  usesSpaces: false,
  verb: {
    position: 'second',
    subjectDrop: true,
  },
  references: {
    me: '我',        // "I/me"
    it: '它',        // "it"
    you: '你',       // "you"
    result: '结果',
    event: '事件',
    target: '目标',
    body: '主体',
  },
  possessive: {
    marker: '的',    // Possessive particle (de)
    markerPosition: 'between',
    // Chinese: 我的 value (wǒ de value) = "my value"
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
    take: { primary: '获取', normalized: 'take' },
    make: { primary: '制作', normalized: 'make' },
    clone: { primary: '复制', normalized: 'clone' },
    swap: { primary: '交换', normalized: 'swap' },
    morph: { primary: '变形', alternatives: ['转换'], normalized: 'morph' },
    // Variable operations
    set: { primary: '设置', alternatives: ['设定'], normalized: 'set' },
    get: { primary: '获得', alternatives: ['获取', '取得'], normalized: 'get' },
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
    focus: { primary: '聚焦', normalized: 'focus' },
    blur: { primary: '失焦', normalized: 'blur' },
    // Navigation
    go: { primary: '前往', normalized: 'go' },
    // Async
    wait: { primary: '等待', normalized: 'wait' },
    fetch: { primary: '获取', normalized: 'fetch' },
    settle: { primary: '稳定', normalized: 'settle' },
    // Control flow
    if: { primary: '如果', normalized: 'if' },
    when: { primary: 'TODO', normalized: 'when' },
    where: { primary: 'TODO', normalized: 'where' },
    else: { primary: '否则', normalized: 'else' },
    repeat: { primary: '重复', normalized: 'repeat' },
    for: { primary: '为', normalized: 'for' },
    while: { primary: '当', normalized: 'while' },
    continue: { primary: '继续', normalized: 'continue' },
    halt: { primary: '停止', normalized: 'halt' },
    throw: { primary: '抛出', normalized: 'throw' },
    call: { primary: '调用', normalized: 'call' },
    return: { primary: '返回', normalized: 'return' },
    then: { primary: '然后', alternatives: ['接着', '之后'], normalized: 'then' },
    and: { primary: '并且', alternatives: ['和', '而且'], normalized: 'and' },
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
    // Modifiers
    into: { primary: '进入', normalized: 'into' },
    before: { primary: '之前', normalized: 'before' },
    after: { primary: '之后', normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: '直到', normalized: 'until' },
    event: { primary: '事件', normalized: 'event' },
    from: { primary: '从', normalized: 'from' },
  },
  tokenization: {
    boundaryStrategy: 'character',
  },
};
