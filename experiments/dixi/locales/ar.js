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
  modifiers: {
    منع: 'prevent',
    إيقاف: 'stop',
    حجب: 'halt',
    مرة: 'once',
    ذاتي: 'self',
    خارج: 'outside',
    التقاط: 'capture',
    سلبي: 'passive',
    // .cc kept as-is
  },
});
