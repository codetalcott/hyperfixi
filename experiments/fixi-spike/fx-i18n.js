/*
 * fx-i18n: Pattern B spike — rewrite localized fx-* attribute names to canonical
 * English ones before any fixi-family processor reads them.
 *
 * Hardcodes Spanish / Japanese / Arabic to validate Latin / CJK / RTL scripts in
 * one demo. Production version sources from packages/semantic/src/generators/profiles/.
 *
 * Load order: this script must be included BEFORE the fixi processor (or hyperfixi-hx)
 * so its DOMContentLoaded handler runs first.
 */
(function () {
  const ATTR_ALIASES = {
    // Spanish
    'fx-acción': 'fx-action',
    'fx-método': 'fx-method',
    'fx-disparador': 'fx-trigger',
    'fx-objetivo': 'fx-target',
    'fx-intercambio': 'fx-swap',
    // Japanese
    'fx-アクション': 'fx-action',
    'fx-メソッド': 'fx-method',
    'fx-トリガー': 'fx-trigger',
    'fx-ターゲット': 'fx-target',
    'fx-スワップ': 'fx-swap',
    // Arabic
    'fx-إجراء': 'fx-action',
    'fx-طريقة': 'fx-method',
    'fx-محفز': 'fx-trigger',
    'fx-هدف': 'fx-target',
    'fx-تبديل': 'fx-swap',
  };

  const TRIGGER_VALUE_ALIASES = {
    clic: 'click', cambio: 'change', enviar: 'submit',
    クリック: 'click', 変更: 'change', 送信: 'submit',
    نقر: 'click', تغيير: 'change', إرسال: 'submit',
  };

  function normalize(el) {
    const renames = [];
    for (const attr of el.attributes) {
      const canonical = ATTR_ALIASES[attr.name];
      if (canonical) renames.push([attr.name, canonical, attr.value]);
    }
    for (const [oldName, canonical, value] of renames) {
      el.removeAttribute(oldName);
      const v = canonical === 'fx-trigger' && TRIGGER_VALUE_ALIASES[value]
        ? TRIGGER_VALUE_ALIASES[value]
        : value;
      el.setAttribute(canonical, v);
    }
  }

  function scan(root) {
    if (root.nodeType === 1) normalize(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node) { normalize(node); node = walker.nextNode(); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scan(document.body));
  } else {
    scan(document.body);
  }

  new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) scan(node);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
