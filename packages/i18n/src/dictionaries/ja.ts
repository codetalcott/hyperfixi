// packages/i18n/src/dictionaries/ja.ts

import { Dictionary } from '../types';

export const ja: Dictionary = {
  commands: {
    // Event handling
    on: 'で',
    tell: '伝える',
    trigger: '引き金',
    send: '送る',
    
    // DOM manipulation
    take: '取る',
    put: '置く',
    set: '設定',
    get: '取得',
    add: '追加',
    remove: '削除',
    toggle: '切り替え',
    hide: '隠す',
    show: '表示',
    
    // Control flow
    if: 'もし',
    unless: 'でなければ',
    repeat: '繰り返し',
    for: 'ために',
    while: 'の間',
    until: 'まで',
    continue: '続ける',
    break: '中断',
    halt: '停止',
    
    // Async
    wait: '待つ',
    fetch: '取得',
    call: '呼び出し',
    return: '戻る',
    
    // Other commands
    make: '作る',
    log: '記録',
    throw: '投げる',
    catch: '捕まえる',
    measure: '測定',
    transition: '遷移',

    // Data Commands
    increment: '増加',
    decrement: '減少',
    bind: '結合',
    default: '既定',
    persist: '永続化',

    // Navigation Commands
    go: '移動',
    pushUrl: 'URLプッシュ',
    replaceUrl: 'URL置換',

    // Utility Commands
    copy: 'コピー',
    pick: '選択',
    beep: 'ビープ',

    // Advanced Commands
    js: 'JS実行',
    async: '非同期',
    render: '描画',

    // Animation Commands
    swap: '交換',
    morph: '変形',
    settle: '安定',

    // Content Commands
    append: '末尾追加',

    // Control Flow
    exit: '終了',

    // Behaviors
    install: 'インストール',
  },
  
  modifiers: {
    to: 'に',
    from: 'から',
    into: 'へ',
    with: 'と',
    at: 'で',
    in: 'の中',
    of: 'の',
    as: 'として',
    by: 'によって',
    before: '前に',
    after: '後に',
    over: '上に',
    under: '下に',
    between: '間に',
    through: '通して',
    without: 'なしで',
  },
  
  events: {
    click: 'クリック',
    dblclick: 'ダブルクリック',
    mousedown: 'マウス押下',
    mouseup: 'マウス解放',
    mouseenter: 'マウス入る',
    mouseleave: 'マウス離れる',
    mouseover: 'マウス上',
    mouseout: 'マウス外',
    mousemove: 'マウス移動',
    
    keydown: 'キー押下',
    keyup: 'キー解放',
    keypress: 'キー押す',
    
    focus: 'フォーカス',
    blur: 'ぼかし',
    change: '変更',
    input: '入力',
    submit: '送信',
    reset: 'リセット',
    
    load: '読み込み',
    unload: '読み込み解除',
    resize: 'サイズ変更',
    scroll: 'スクロール',
    
    touchstart: 'タッチ開始',
    touchend: 'タッチ終了',
    touchmove: 'タッチ移動',
    touchcancel: 'タッチキャンセル',
  },
  
  logical: {
    when: 'とき',
    where: 'どこ',
    and: 'そして',
    or: 'または',
    not: 'ではない',
    is: 'である',
    exists: '存在する',
    matches: '一致する',
    contains: '含む',
    includes: '含める',
    equals: '等しい',
    then: 'それから',
    else: 'そうでなければ',
    otherwise: 'そうでなければ',
    end: '終わり',
  },
  
  temporal: {
    seconds: '秒',
    second: '秒',
    milliseconds: 'ミリ秒',
    millisecond: 'ミリ秒',
    minutes: '分',
    minute: '分',
    hours: '時間',
    hour: '時間',
    ms: 'ms',
    s: '秒',
    min: '分',
    h: '時',
  },
  
  values: {
    true: '真',
    false: '偽',
    null: 'null',
    undefined: '未定義',
    it: 'それ',
    its: 'その',
    me: '私',
    my: '私の',
    you: 'あなた',
    your: 'あなたの',
    yourself: 'あなた自身',
    myself: '私自身',
    element: '要素',
    target: '対象',
    detail: '詳細',
    event: 'イベント',
    window: 'ウィンドウ',
    document: 'ドキュメント',
    body: 'ボディ',
    result: '結果',
    value: '値',
  },
  
  attributes: {
    class: 'クラス',
    classes: 'クラス群',
    style: 'スタイル',
    styles: 'スタイル群',
    attribute: '属性',
    attributes: '属性群',
    property: 'プロパティ',
    properties: 'プロパティ群',
  },

  expressions: {
    // Positional
    first: '最初',
    last: '最後',
    next: '次',
    previous: '前',
    prev: '前',
    at: 'で',
    random: 'ランダム',

    // DOM Traversal
    closest: '最も近い',
    parent: '親',
    children: '子',
    within: '以内',

    // Emptiness/Existence
    no: 'ない',
    empty: '空',
    some: 'いくつか',

    // String operations
    'starts with': 'で始まる',
    'ends with': 'で終わる',
  },
};