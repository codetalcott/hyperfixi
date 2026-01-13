// packages/i18n/src/dictionaries/zh.ts

import { Dictionary } from '../types';

export const zh: Dictionary = {
  commands: {
    // Event handling
    on: '当',
    tell: '告诉',
    trigger: '触发',
    send: '发送',
    
    // DOM manipulation
    take: '获取',
    put: '放置',
    set: '设置',
    get: '获得',
    add: '添加',
    remove: '移除',
    toggle: '切换',
    hide: '隐藏',
    show: '显示',
    
    // Control flow
    if: '如果',
    unless: '除非',
    repeat: '重复',
    for: '为',
    while: '当',
    until: '直到',
    continue: '继续',
    break: '中断',
    halt: '停止',
    
    // Async
    wait: '等待',
    fetch: '获取',
    call: '调用',
    return: '返回',
    
    // Other commands
    make: '制作',
    log: '日志',
    throw: '抛出',
    catch: '捕获',
    measure: '测量',
    transition: '过渡',

    // Data Commands
    increment: '增加',
    decrement: '减少',
    bind: '绑定',
    default: '默认',
    persist: '持久化',

    // Navigation Commands
    go: '前往',
    pushUrl: '推送网址',
    replaceUrl: '替换网址',

    // Utility Commands
    copy: '复制',
    pick: '选取',
    beep: '蜂鸣',

    // Advanced Commands
    js: 'JS执行',
    async: '异步',
    render: '渲染',

    // Animation Commands
    swap: '交换',
    morph: '变形',
    settle: '稳定',

    // Content Commands
    append: '追加',

    // Control Flow
    exit: '退出',

    // Behaviors
    install: '安装',
  },
  
  modifiers: {
    to: '到',
    from: '从',
    into: '进入',
    with: '与',
    at: '在',
    in: '在',
    of: '的',
    as: '作为',
    by: '通过',
    before: '之前',
    after: '之后',
    over: '在上',
    under: '在下',
    between: '之间',
    through: '通过',
    without: '没有',
  },
  
  events: {
    click: '点击',
    dblclick: '双击',
    mousedown: '鼠标按下',
    mouseup: '鼠标抬起',
    mouseenter: '鼠标进入',
    mouseleave: '鼠标离开',
    mouseover: '鼠标悬停',
    mouseout: '鼠标移出',
    mousemove: '鼠标移动',
    
    keydown: '按键按下',
    keyup: '按键抬起',
    keypress: '按键',
    
    focus: '聚焦',
    blur: '失焦',
    change: '改变',
    input: '输入',
    submit: '提交',
    reset: '重置',
    
    load: '加载',
    unload: '卸载',
    resize: '调整大小',
    scroll: '滚动',
    
    touchstart: '触摸开始',
    touchend: '触摸结束',
    touchmove: '触摸移动',
    touchcancel: '触摸取消',
  },
  
  logical: {
    when: '当',
    where: '哪里',
    and: '和',
    or: '或',
    not: '非',
    is: '是',
    exists: '存在',
    matches: '匹配',
    contains: '包含',
    includes: '包括',
    equals: '等于',
    then: '那么',
    else: '否则',
    otherwise: '要不然',
    end: '结束',
  },
  
  temporal: {
    seconds: '秒',
    second: '秒',
    milliseconds: '毫秒',
    millisecond: '毫秒',
    minutes: '分钟',
    minute: '分钟',
    hours: '小时',
    hour: '小时',
    ms: '毫秒',
    s: '秒',
    min: '分',
    h: '时',
  },
  
  values: {
    true: '真',
    false: '假',
    null: '空',
    undefined: '未定义',
    it: '它',
    its: '它的', // REVIEW: native speaker
    me: '我',
    my: '我的',
    myself: '我自己',
    you: '你', // REVIEW: native speaker
    your: '你的', // REVIEW: native speaker
    yourself: '你自己', // REVIEW: native speaker
    element: '元素',
    target: '目标',
    detail: '详情',
    event: '事件',
    window: '窗口',
    document: '文档',
    body: '主体',
    result: '结果',
    value: '值',
  },
  
  attributes: {
    class: '类',
    classes: '类别',
    style: '样式',
    styles: '样式集',
    attribute: '属性',
    attributes: '属性集',
    property: '特性',
    properties: '特性集',
  },

  expressions: {
    // Positional
    first: '第一个',
    last: '最后一个',
    next: '下一个',
    previous: '上一个',
    prev: '上个',
    at: '在',
    random: '随机',

    // DOM Traversal
    closest: '最近的',
    parent: '父级',
    children: '子级',
    within: '之内',

    // Emptiness/Existence
    no: '没有',
    empty: '空的',
    some: '一些',

    // String operations
    'starts with': '以开头',
    'ends with': '以结尾',
  },
};
