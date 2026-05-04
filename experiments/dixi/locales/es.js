// Spanish (es) locale for dixi.
// Vocabulary cross-checked against packages/semantic/src/generators/profiles/spanish.ts.
// Best-effort; modifier translations especially would benefit from native review.
window.dixi.register('es', {
  attrs: {
    // fixi
    'fx-acción': 'fx-action',
    'fx-método': 'fx-method',
    'fx-disparador': 'fx-trigger',
    'fx-objetivo': 'fx-target',
    'fx-intercambio': 'fx-swap',
    // moxi
    vivo: 'live',
    'mx-ignorar': 'mx-ignore',
  },
  values: {
    clic: 'click',
    cambio: 'change',
    envío: 'submit',
    entrada: 'input',
    enfoque: 'focus',
    desenfoque: 'blur',
    iniciar: 'init',
  },
  // Built-in modifiers limited to prevent/stop/once (industry convention is
  // English elsewhere; see EVALUATION.md). Extend via dixiCfg.extend if needed.
  modifiers: {
    prevenir: 'prevent',
    detener: 'stop',
    'una-vez': 'once',
  },
});
