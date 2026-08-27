/**
 * Hebrew render vocabulary.
 *
 * Self-registering: importing this module makes the words available to
 * `render(node, 'he')`. Kept separate from the profile so a parse-only
 * bundle can drop it — see lexicon-registry.ts for why that separation exists.
 */
import type { LanguageLexicon } from '../generators/profiles/types';
import { registerLexicon } from '../lexicon-registry';

export const hebrewLexicon: LanguageLexicon = {
  events: {
    blur: { primary: 'טשטש' },
    change: { primary: 'שינוי' },
    click: { primary: 'לחיצה' },
    focus: { primary: 'מקד' },
    input: { primary: 'קלט' },
    submit: { primary: 'שליחה' },
  },
  logical: {
    and: { primary: 'וגם' },
    bind: { primary: 'קשור' },
    changes: { primary: 'משתנה' },
    else: { primary: 'אחרת' },
    end: { primary: 'סוף' },
    live: { primary: 'חי' },
    then: { primary: 'אז' },
    when: { primary: 'כאשר' },
    where: { primary: 'איפה' },
  },
  values: {
    body: { primary: 'גוף' },
    event: { primary: 'אירוע' },
    // The tokenizer has carried אמת/שקר → true/false for years (HEBREW_EXTRAS);
    // without the render-side twin, `set @disabled to true` emitted the English
    // word, which lexes as a bare identifier and came back patient:expression
    // instead of the reference's patient:literal (set-attribute he, both
    // render allowlists).
    false: { primary: 'שקר' },
    true: { primary: 'אמת' },
    it: { primary: 'זה' },
    its: { primary: 'שלו' },
    me: { primary: 'אני' },
    my: { primary: 'שלי' },
    result: { primary: 'תוצאה' },
    target: { primary: 'יעד' },
    you: { primary: 'אתה' },
    your: { primary: 'שלך' },
  },
  expressions: {
    characters: { primary: 'תווים' },
    exclusive: { primary: 'בלעדי' },
    inclusive: { primary: 'כולל' },
    last: { primary: 'אחרון' },
    random: { primary: 'אקראי' },
  },
};

registerLexicon('he', hebrewLexicon);
