// Japanese (ja) locale for dixi.
// Uses katakana loanwords for attribute names (modern web-dev convention)
// and a mix of kanji + katakana for event values.
window.dixi.register('ja', {
  attrs: {
    'fx-アクション': 'fx-action',
    'fx-メソッド': 'fx-method',
    'fx-トリガー': 'fx-trigger',
    'fx-ターゲット': 'fx-target',
    'fx-スワップ': 'fx-swap',
  },
  values: {
    クリック: 'click',
    変更: 'change',
    送信: 'submit',
    入力: 'input',
    フォーカス: 'focus',
    ブラー: 'blur',
  },
});
