// Arabic (ar) locale for dixi.
// Bare nouns for attribute names (no definite article) for consistency
// with English fx-* convention. Modifier translations best-effort.
window.dixi.register('ar', {
  attrs: {
    // fixi
    'fx-إجراء': 'fx-action',
    'fx-طريقة': 'fx-method',
    'fx-محفز': 'fx-trigger',
    'fx-هدف': 'fx-target',
    'fx-تبديل': 'fx-swap',
    // moxi
    حي: 'live',
    'mx-تجاهل': 'mx-ignore',
  },
  values: {
    نقر: 'click',
    تغيير: 'change',
    إرسال: 'submit',
    إدخال: 'input',
    تركيز: 'focus',
    ضبابية: 'blur',
    تهيئة: 'init',
  },
  // Built-in modifiers limited to prevent/stop/once (industry convention is
  // English elsewhere; see EVALUATION.md). Extend via dixiCfg.extend if needed.
  modifiers: {
    منع: 'prevent',
    إيقاف: 'stop',
    مرة: 'once',
  },
});
