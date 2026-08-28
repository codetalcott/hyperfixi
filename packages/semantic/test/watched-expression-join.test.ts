/**
 * Foreign → English re-join of a watched expression with SELECTOR possessives.
 *
 * `when-value-changes` — `when (#price's value * #qty's value) changes …` — is
 * canonical hyperscript, but until this arc its 23 translations rendered back
 * to English the real engine rejected, for three independent reasons:
 *
 *  1. Prepositional languages (es/de/fr/id/pt/sw/ar): the i18n transformer
 *     split the group across the possessive (`valor de ( #price * valor ) de
 *     #qty`) — fixed on the i18n side (parens ride outside the rewrite).
 *  2. Suffix/particle genitives (ja `#priceの 値`, ko `의`, zh `的`, bn `র`,
 *     qu `pa`, tr `ın`): the join only read the prepositional order and leaked
 *     the particle ("Unknown token: の") — the owner-first branch.
 *  3. `'s`-retaining languages (hi/pl/ru/uk/th/vi): the tokenizer paired the
 *     two apostrophes into ONE string literal (`'s wartość * #qty'`), hiding
 *     the property noun from translation ("Unknown token: ś") — the framework
 *     string extractor no longer opens a string on a word-glued apostrophe, and
 *     the join glues `'s` back and translates the noun.
 *
 * The engine itself is the oracle for validity (foreign-canonical-validity, in
 * the testing framework, now covers this pattern since its English is valid);
 * this file pins the exact English each shape produces. Rows are VERBATIM from
 * patterns.db after the transformer fix.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src';

const STORED_VALUE: Record<string, string> = {
  ar: 'عندما (قيمة لـ #price * قيمة لـ #qty) يتغير ضع "$" + هو إلى أنا النهاية',
  bn: 'যখন (#priceর মান * #qtyর মান) পরিবর্তিত হলে "$" + এটি কে আমি তে রাখুন শেষ',
  de: 'wenn (wert von #price * wert von #qty) ändert setzen "$" + es zu ich ende',
  es: 'cuando (valor de #price * valor de #qty) cambia poner "$" + ello a yo fin',
  fr: 'quand (valeur de #price * valeur de #qty) change mettre "$" + ça à moi fin',
  he: 'כאשר (#price\'s value * #qty\'s value) משתנה שים את "$" + זה על אני סוף',
  hi: 'जब (#price\'s मान * #qty\'s मान) बदलने पर "$" + यह को मैं में रखें समाप्त',
  id: 'ketika (nilai dari #price * nilai dari #qty) berubah taruh "$" + itu ke saya akhir',
  it: 'quando (#price\'s valore * #qty\'s valore) cambia mettere "$" + esso in io fine',
  ja: '時 (#priceの 値 * #qtyの 値) 変わったら "$" + それ を 私 に 置く 終わり',
  ko: '때 (#price의 값 * #qty의 값) 변경되면 "$" + 그것 를 나 에 넣다 끝',
  ms: 'apabila (#price\'s nilai * #qty\'s nilai) berubah letak "$" + ia ke saya tamat',
  pl: 'kiedy (#price\'s wartość * #qty\'s wartość) zmienia umieść "$" + to do ja koniec',
  pt: 'quando (valor de #price * valor de #qty) muda colocar "$" + isso para eu fim',
  qu: 'maykama (#price pa chanin * #qty pa chanin) tukurikun "$" + chay ta noqa man churay tukuy',
  ru: 'когда (#price\'s значение * #qty\'s значение) изменяется положить "$" + это в я конец',
  sw: 'wakati (thamani ya #price * thamani ya #qty) inabadilika weka "$" + hiyo kwa mimi mwisho',
  th: 'เมื่อ (#price\'s ค่า * #qty\'s ค่า) เปลี่ยน ใส่ "$" + มัน ใน ฉัน จบ',
  tl: 'kapag (#price\'s halaga * #qty\'s halaga) nagbabago ilagay "$" + ito sa ako wakas',
  tr: 'iken (#price ın değer * #qty ın değer) değiştiğinde "$" + o i ben e koy son',
  uk: 'коли (#price\'s значення * #qty\'s значення) змінюється покласти "$" + це в я кінець',
  vi: 'khi (#price\'s giá trị * #qty\'s giá trị) thay đổi đặt "$" + nó vào tôi kết thúc',
  zh: '当 (#price的 值 * #qty的 值) 改变时 把 "$" + 它 放置 到 我 结束',
};
const head = (lang: string): string =>
  render(parse(STORED_VALUE[lang], lang), 'en').split('\n')[0].replace(/\s+/g, ' ').trim();

describe('watched-expression join: selector possessives come back as English', () => {
  // All 23 now produce the SAME English, and it is the canonical clitic form the
  // reference is written in. Before, the re-join emitted whichever shape the
  // source language's genitive suggested — `value of #price` for the
  // prepositional and owner-first genitives, `#price's value` only for the
  // languages that had kept the English clitic — so the same construct rendered
  // back three different ways. The renderer now folds `<property> of <selector>`
  // into `<selector>'s <property>` for English, gated to a curated DOM-property
  // word so an ordinary `of` phrase (`the first of .items`) is untouched. The
  // engine accepts both; `foreign-canonical-validity` is the oracle and stayed
  // green through the change.
  it.each([
    'es',
    'de',
    'fr',
    'id',
    'pt',
    'sw',
    'ar', // prepositional genitive
    'ja',
    'ko',
    'zh',
    'bn',
    'qu',
    'tr', // owner-first genitive
    'hi',
    'pl',
    'ru',
    'uk',
    'th',
    'vi',
    'it',
    'ms',
    'tl',
    'he', // `'s` fallback
  ])("%s → #price's value", lang => {
    expect(head(lang)).toBe("when ( #price's value * #qty's value ) changes");
  });
});
