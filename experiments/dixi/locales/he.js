// AUTO-GENERATED — do not edit by hand.
// Source: packages/semantic/src/generators/profiles/hebrew.ts (event vocab)
//         experiments/dixi/scripts/fx-vocab.mjs (fx-*/modifier vocab)
// Regenerate: cd experiments/dixi && npm run gen
//
// Attribution: event-name vocabulary derived from @lokascript/semantic profiles.
// ⚠ Unreviewed: fx-* attribute names and modifier translations for this locale
//   have not been native-speaker reviewed. To suggest corrections, edit
//   experiments/dixi/scripts/fx-vocab.mjs (LOCALES.he) and regenerate.
//   The event-name vocabulary (`values` below) IS reviewed — it derives from
//   the @lokascript/semantic profile.
window.dixi.register('he', {
  attrs: {
    'fx-פעולה': 'fx-action',
    'fx-שיטה': 'fx-method',
    'fx-מפעיל': 'fx-trigger',
    'fx-יעד': 'fx-target',
    'fx-החלפה': 'fx-swap',
    'חי': 'live',
    'mx-התעלם': 'mx-ignore',
  },
  values: {
    'לחיצה': 'click',
    'קליק': 'click',
    'שינוי': 'change',
    'עדכון': 'change',
    'שליחה': 'submit',
    'הגשה': 'submit',
    'קלט': 'input',
    'הזנה': 'input',
    'מקד': 'focus',
    'התמקד': 'focus',
    'טשטש': 'blur',
    'הסר מיקוד': 'blur',
    'אתחל': 'init',
    'התחל': 'init',
  },
  modifiers: {
    'מנע': 'prevent',
    'עצור': 'stop',
    'פעם': 'once',
  },
});
