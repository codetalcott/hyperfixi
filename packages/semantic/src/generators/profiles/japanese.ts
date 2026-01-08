/**
 * Japanese Language Profile
 *
 * SOV word order, particles (を, に, で, etc.), no spaces between words.
 * Agglutinative language with rich verb conjugation.
 */

import type { LanguageProfile } from './types';

export const japaneseProfile: LanguageProfile = {
  code: 'ja',
  name: 'Japanese',
  nativeName: '日本語',
  direction: 'ltr',
  wordOrder: 'SOV',
  markingStrategy: 'particle',
  usesSpaces: false,
  // Japanese uses verb stem/masu-stem form, no clear infinitive/imperative distinction
  // for UI commands. Uses katakana loanwords (トグル) or native stems (切り替え)
  defaultVerbForm: 'base',
  verb: {
    position: 'end',
    suffixes: ['る', 'て', 'た', 'ます', 'ない'],
    subjectDrop: true,
  },
  references: {
    me: '自分',      // "self" - in hyperscript context, refers to current element
    it: 'それ',      // "it"
    you: 'あなた',   // "you"
    result: '結果',
    event: 'イベント',
    target: 'ターゲット',
    body: 'ボディ',
  },
  possessive: {
    marker: 'の',
    markerPosition: 'between',
    // In Japanese: 自分の value (jibun no value) = "my value"
  },
  roleMarkers: {
    patient: { primary: 'を', position: 'after' },
    destination: { primary: 'に', alternatives: ['へ', 'で'], position: 'after' },
    source: { primary: 'から', position: 'after' },
    style: { primary: 'で', position: 'after' },
    event: { primary: 'を', position: 'after' }, // Event as object marker
    // Possession marker for "X's Y" patterns
    // Note: の is used between target and patient: #button の .active
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: '切り替え', alternatives: ['切り替える', 'トグル', 'トグルする'], normalized: 'toggle' },
    add: { primary: '追加', alternatives: ['追加する', '加える'], normalized: 'add' },
    remove: { primary: '削除', alternatives: ['削除する', '取り除く'], normalized: 'remove' },
    // Content operations
    put: { primary: '置く', alternatives: ['入れる', 'セット'], normalized: 'put' },
    append: { primary: '末尾追加', alternatives: ['末尾に追加', 'アペンド'], normalized: 'append' },
    prepend: { primary: '先頭追加', alternatives: ['先頭に追加', 'プリペンド'], normalized: 'prepend' },
    take: { primary: '取る', alternatives: ['取得'], normalized: 'take' },
    make: { primary: '作る', alternatives: ['作成'], normalized: 'make' },
    clone: { primary: '複製', alternatives: ['クローン'], normalized: 'clone' },
    swap: { primary: '交換', alternatives: ['スワップ', '入れ替え'], normalized: 'swap' },
    morph: { primary: '変形', alternatives: ['モーフ', '変換'], normalized: 'morph' },
    // Variable operations
    set: { primary: '設定', alternatives: ['設定する', 'セット'], normalized: 'set' },
    get: { primary: '取得', alternatives: ['取得する', 'ゲット'], normalized: 'get' },
    increment: { primary: '増加', alternatives: ['増やす', 'インクリメント'], normalized: 'increment' },
    decrement: { primary: '減少', alternatives: ['減らす', 'デクリメント'], normalized: 'decrement' },
    log: { primary: '記録', alternatives: ['ログ', '出力'], normalized: 'log' },
    // Visibility
    show: { primary: '表示', alternatives: ['表示する', '見せる'], normalized: 'show' },
    hide: { primary: '隠す', alternatives: ['非表示', '非表示にする'], normalized: 'hide' },
    transition: { primary: '遷移', alternatives: ['トランジション', 'アニメーション'], normalized: 'transition' },
    // Events
    on: { primary: 'で', alternatives: ['時', 'とき'], normalized: 'on' },
    trigger: { primary: '引き金', alternatives: ['発火', 'トリガー'], normalized: 'trigger' },
    send: { primary: '送る', alternatives: ['送信'], normalized: 'send' },
    // DOM focus
    focus: { primary: 'フォーカス', alternatives: ['集中'], normalized: 'focus' },
    blur: { primary: 'ぼかし', alternatives: ['フォーカス解除'], normalized: 'blur' },
    // Navigation
    go: { primary: '移動', alternatives: ['行く', 'ナビゲート'], normalized: 'go' },
    // Async
    wait: { primary: '待つ', alternatives: ['待機'], normalized: 'wait' },
    fetch: { primary: '取得', alternatives: ['フェッチ'], normalized: 'fetch' },
    settle: { primary: '安定', alternatives: ['落ち着く'], normalized: 'settle' },
    // Control flow
    if: { primary: 'もし', alternatives: ['条件'], normalized: 'if' },
    when: { primary: 'TODO', normalized: 'when' },
    where: { primary: 'TODO', normalized: 'where' },
    else: { primary: 'そうでなければ', alternatives: ['それ以外'], normalized: 'else' },
    repeat: { primary: '繰り返し', alternatives: ['繰り返す', 'リピート'], normalized: 'repeat' },
    for: { primary: 'ために', alternatives: ['各'], normalized: 'for' },
    while: { primary: 'の間', alternatives: ['間'], normalized: 'while' },
    continue: { primary: '続ける', alternatives: ['継続'], normalized: 'continue' },
    halt: { primary: '停止', alternatives: ['止める', 'ハルト'], normalized: 'halt' },
    throw: { primary: '投げる', alternatives: ['スロー'], normalized: 'throw' },
    call: { primary: '呼び出し', alternatives: ['コール', '呼ぶ'], normalized: 'call' },
    return: { primary: '戻る', alternatives: ['返す', 'リターン'], normalized: 'return' },
    then: { primary: 'それから', alternatives: ['次に', 'そして'], normalized: 'then' },
    and: { primary: 'そして', alternatives: ['と', 'また'], normalized: 'and' },
    end: { primary: '終わり', alternatives: ['終了', 'おわり'], normalized: 'end' },
    // Advanced
    js: { primary: 'JS実行', alternatives: ['js'], normalized: 'js' },
    async: { primary: '非同期', alternatives: ['アシンク'], normalized: 'async' },
    tell: { primary: '伝える', alternatives: ['テル'], normalized: 'tell' },
    default: { primary: '既定', alternatives: ['デフォルト'], normalized: 'default' },
    init: { primary: '初期化', alternatives: ['イニット'], normalized: 'init' },
    behavior: { primary: '振る舞い', alternatives: ['ビヘイビア'], normalized: 'behavior' },
    install: { primary: 'インストール', alternatives: ['導入'], normalized: 'install' },
    measure: { primary: '測定', alternatives: ['計測', 'メジャー'], normalized: 'measure' },
    // Modifiers
    into: { primary: 'へ', alternatives: ['に'], normalized: 'into' },
    before: { primary: '前に', alternatives: ['前'], normalized: 'before' },
    after: { primary: '後に', alternatives: ['後'], normalized: 'after' },
    // Event modifiers (for repeat until event)
    until: { primary: 'まで', alternatives: ['迄'], normalized: 'until' },
    event: { primary: 'イベント', alternatives: ['事象'], normalized: 'event' },
    from: { primary: 'から', normalized: 'from' },
  },
  tokenization: {
    particles: ['を', 'に', 'で', 'から', 'の', 'が', 'は', 'も', 'へ', 'と'],
    boundaryStrategy: 'particle',
  },
};
