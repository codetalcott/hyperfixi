// Japanese (ja) locale for dixi.
// Mixed loanwords (katakana) and kanji per modern web-dev convention.
// Modifier translations are best-effort and would benefit from native review.
window.dixi.register('ja', {
  attrs: {
    // fixi
    'fx-アクション': 'fx-action',
    'fx-メソッド': 'fx-method',
    'fx-トリガー': 'fx-trigger',
    'fx-ターゲット': 'fx-target',
    'fx-スワップ': 'fx-swap',
    // moxi
    ライブ: 'live',
    'mx-無視': 'mx-ignore',
  },
  values: {
    クリック: 'click',
    変更: 'change',
    送信: 'submit',
    入力: 'input',
    フォーカス: 'focus',
    ブラー: 'blur',
    初期化: 'init',
  },
  modifiers: {
    防止: 'prevent',
    停止: 'stop',
    阻止: 'halt',
    一度: 'once',
    自身: 'self',
    外側: 'outside',
    捕捉: 'capture',
    受動: 'passive',
    // .cc kept as-is
  },
});
