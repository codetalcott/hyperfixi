/**
 * `me` after a marker, in the case the marker takes (M2 N3).
 *
 * The reader half: de `zu mir`, pt `a mim`, pl `do mnie`, ru `ко мне`, uk
 * `до мене`, hi `मुझ में`. An author writes these; the readers took each for a
 * variable (`zu mir` ran as `to mir`) or refused it. Each reads as the
 * nominative does; es `mí`, it `me` and tl `akin` already read.
 *
 * The render half: translations write them (the profiles' `obliqueReferences`),
 * in es, pt, it, tl, pl, ru, uk, de and hi, where the reader brings the form
 * back as the nominative would be; elsewhere the nominative, as before.
 */
import { describe, it, expect } from 'vitest';
import { parse, semanticRenderer, translate, tryGetProfile } from '../src/index';

const FORMS: Record<string, string[]> = {
  de: ['mir', 'mich'],
  pt: ['mim'],
  pl: ['mnie', 'mną'],
  ru: ['меня', 'мне', 'мной'],
  uk: ['мене', 'мені', 'мною'],
  // `मुझे` is `मुझ` + `को` (fused, read apart): it stands where `को` does, below.
  hi: ['मुझ'],
};

const SHAPES = [
  'on click put 1 into me',
  'on click add .x to me',
  'on click remove .x from me',
  'on click send foo to me',
  'on click toggle .x on me',
  'on click put me into #out',
];

/** A `me` fused with its marker or its verb, which the substitution leaves alone. */
const FUSED_ME: Record<string, (w: string) => boolean> = {
  hi: w => w === 'मुझे',
  pt: w => w.endsWith('-me'),
};

describe.each(Object.entries(FORMS))('%s reads', (language, forms) => {
  const me = tryGetProfile(language)!.references.me!;
  const isMe = (w: string): boolean => w === me || forms.includes(w);
  const fused = FUSED_ME[language] ?? (() => false);
  it.each(SHAPES)('%s', source => {
    const rendered = translate(source, 'en', language);
    expect(
      rendered.split(/\s+/).some(w => isMe(w) || fused(w)),
      rendered
    ).toBe(true);
    for (const form of [me, ...forms]) {
      const written = rendered
        .split(/\s+/)
        .map(w => (isMe(w) ? form : w))
        .join(' ');
      expect(translate(written, language, 'en'), written).toBe(source);
    }
  });
});

describe('renders write me in the case its marker takes', () => {
  const RENDERS: Array<[string, string, string]> = [
    ['es', 'on click put 1 into me', 'al clic poner 1 en mí'],
    ['pt', 'on click put 1 into me', 'ao clique colocar 1 em mim'],
    ['it', 'on click put 1 into me', 'su clic mettere 1 in me'],
    ['tl', 'on click put 1 into me', 'kapag click ilagay 1 sa akin'],
    ['pl', 'on click put 1 into me', 'gdy kliknięcie umieść 1 do mnie'],
    ['ru', 'on click put 1 into me', 'при клик положить 1 в меня'],
    ['uk', 'on click put 1 into me', 'при клік покласти 1 в мене'],
    ['de', 'on click put 1 into me', 'wenn klick setzen 1 in mich'],
    ['hi', 'on click put 1 into me', 'क्लिक पर 1 को रखें मुझ में'],
    // A location's case: toggle's `on`, a query's `in`.
    ['de', 'on click toggle .x on me', 'wenn klick umschalten .x auf mir'],
    ['de', 'on click trigger foo on me', 'wenn klick auslösen foo auf mir'],
    ['ru', 'on click toggle .x on me', 'при клик переключить .x на мне'],
    ['uk', 'on click toggle .x on me', 'при клік перемкнути .x на мені'],
    ['de', 'on click hide <p/> in me', 'wenn klick verstecke <p/> in mir'],
    ['de', 'on click get first <p/> in me', 'wenn klick hole erste <p/> in mir'],
    // A marker vocalized before the pronoun, which the reader takes there too.
    ['ru', 'on click add .x to me', 'при клик добавить .x ко мне'],
    ['ru', 'on click hide <p/> in me', 'при клик скрыть <p/> во мне'],
    ['pl', 'on click remove .x from me', 'gdy kliknięcie usuń .x ze mnie'],
    ['pl', 'on click hide <p/> in me', 'gdy kliknięcie ukryj <p/> we mnie'],
    ['pl', 'on click put 1 at end of me', 'gdy kliknięcie umieść 1 przy koniec ze mnie'],
    ['pl', 'on click put 1 before me', 'gdy kliknięcie umieść 1 przede mną'],
    ['ru', 'on click put 1 before me', 'при клик положить 1 передо мной'],
    ['uk', 'on click put 1 before me', 'при клік покласти 1 переді мною'],
    // A marker after the pronoun; a patient that has a marker; a marker put
    // writes as one word.
    ['hi', 'on click remove .x from me', 'क्लिक पर .x को मुझ से हटाएं'],
    ['es', 'on click set $x to me', 'al clic establecer $x a mí'],
    ['de', 'on click send foo to me', 'wenn klick senden foo an mich'],
    ['tl', 'on click remove .x from me', 'kapag click alisin .x mula_sa akin'],
    // The rest of the render reads back otherwise (`I match` as `me matches`):
    // the case form changes nothing the reader reads, so it stays.
    [
      'es',
      'on click if I match .x remove .x from me end',
      'al clic si yo coincide .x quitar .x de mí fin',
    ],
    // A scroll position keeps its own phrase (`top of me`), and the nominative.
    ['es', 'on click scroll to the top of me', 'al clic desplazamiento en the top of yo'],
    // tl `akin` before a word reads as `my` (`sa akin for 2s`): the nominative.
    ['tl', 'on click toggle .x on me for 2s', 'kapag click palitan .x sa ako for 2s'],
  ];
  it.each(RENDERS)('%s: %s', (language, source, expected) => {
    expect(translate(source, 'en', language)).toBe(expected);
    expect(translate(expected, language, 'en')).toBe(source);
  });
});

const IT_FORMS: Record<string, string[]> = {
  de: ['ihm'],
  pl: ['tego', 'tym'],
  ru: ['этому', 'этого', 'этом', 'этим'],
  uk: ['цього', 'цьому', 'цим'],
  fr: ['lui'],
  hi: ['इस'],
};

const IT_SHAPES = [
  'on click put 1 into it',
  'on click add .x to it',
  'on click remove .x from it',
  'on click send foo to it',
  'on click toggle .x on it',
  'on click put it into #out',
];

describe.each(Object.entries(IT_FORMS))('%s reads it', (language, forms) => {
  const nominative = tryGetProfile(language)!.references.it!;
  const isIt = (w: string): boolean => w === nominative || forms.includes(w);
  it.each(IT_SHAPES)('%s', source => {
    const rendered = translate(source, 'en', language);
    for (const form of [nominative, ...forms]) {
      const written = rendered
        .split(/\s+/)
        .map(w => (isIt(w) ? form : w))
        .join(' ');
      expect(translate(written, language, 'en'), written).toBe(source);
    }
  });
});

describe('renders write it in the case its marker takes, and me as an object', () => {
  const RENDERS: Array<[string, string, string]> = [
    ['ru', 'on click add .x to it', 'при клик добавить .x к этому'],
    ['ru', 'on click toggle .x on it', 'при клик переключить .x на этом'],
    ['pl', 'on click add .x to it', 'gdy kliknięcie dodaj .x do tego'],
    ['pl', 'on click hide <p/> in it', 'gdy kliknięcie ukryj <p/> w tym'],
    ['pl', 'on click put 1 before it', 'gdy kliknięcie umieść 1 przed tym'],
    ['uk', 'on click remove .x from it', 'при клік видалити .x з цього'],
    // de writes a da-compound (FUSED_FORMS.md Q4), split back by its reader.
    ['de', 'on click add .x to it', 'wenn klick hinzufügen .x dazu'],
    ['de', 'on click toggle .x on it', 'wenn klick umschalten .x darauf'],
    ['de', 'on click take .x from it', 'wenn klick nehmen .x davon'],
    ['de', 'on click put 1 into it', 'wenn klick setzen 1 darein'],
    ['de', 'on click hide <p/> in it', 'wenn klick verstecke <p/> darin'],
    ['de', 'on click put 1 before it', 'wenn klick setzen 1 davor'],
    // `danach` is de's `then`: `nach` keeps the dative.
    ['de', 'on click put 1 after it', 'wenn klick setzen 1 nach ihm'],
    ['fr', 'on click add .x to it', 'quand clic ajouter .x à lui'],
    ['fr', 'on click put 1 into it', 'quand clic mettre 1 dans lui'],
    ['fr', 'on click put 1 before it', 'quand clic mettre 1 avant lui'],
    ['fr', 'on click hide <p/> in it', 'quand clic cacher <p/> en lui'],
    ['hi', 'on click put 1 into it', 'क्लिक पर 1 को रखें इस में'],
    // A direction's accusative is the nominative (ru `это`): unchanged.
    ['ru', 'on click put 1 into it', 'при клик положить 1 в это'],
    // `me` as a verb's object: a patient, or a destination right after the verb.
    ['de', 'on click show me', 'wenn klick zeige mich'],
    ['ru', 'on click show me', 'при клик показать меня'],
    ['pl', 'on click put me into #out', 'gdy kliknięcie umieść mnie do #out'],
    ['uk', 'on click hide me with *opacity', 'при клік сховати мене з *opacity'],
    ['de', 'bind me to $name', 'binden mich zu $name'],
    // es attaches its object pronoun to the verb (`mostrarme`).
    ['es', 'on click show me', 'al clic mostrarme'],
  ];
  it.each(RENDERS)('%s: %s', (language, source, expected) => {
    expect(translate(source, 'en', language)).toBe(expected);
    expect(translate(expected, language, 'en')).toBe(source);
  });
});

describe('tr writes a pronoun fused with its marker', () => {
  const RENDERS: Array<[string, string]> = [
    ['on click show me', 'tıklama i üzerinde beni göster'],
    ['on click add .x to me', 'tıklama i üzerinde bana .x i ekle'],
    ['on click remove .x from me', 'tıklama i üzerinde benden .x i kaldır'],
    ['on click put it into #out', 'tıklama i üzerinde onu #out e koy'],
    ['on click add .x to it', 'tıklama i üzerinde ona .x i ekle'],
    ['on click take .x from it', 'tıklama i üzerinde ondan .x i tut'],
  ];
  it.each(RENDERS)('%s', (source, expected) => {
    expect(translate(source, 'en', 'tr')).toBe(expected);
    expect(translate(expected, 'tr', 'en')).toBe(source);
  });
});

describe('ar and he write a pronoun fused with its marker', () => {
  const RENDERS: Array<[string, string, string]> = [
    ['ar', 'on click put 1 into me', 'على النقر ضع 1 فيّ'],
    ['ar', 'on click add .x to me', 'على النقر أضف .x إليّ'],
    ['ar', 'on click remove .x from me', 'على النقر احذف .x منّي'],
    ['ar', 'on click add .x to it', 'على النقر أضف .x إليه'],
    ['ar', 'on click take .x from it', 'على النقر خذ .x منه'],
    ['ar', 'on click get it', 'على النقر احصل عليه'],
    ['he', 'on click put 1 into me', 'ב לחיצה שים את 1 בי'],
    ['he', 'on click add .x to me', 'ב לחיצה הוסף את .x אליי'],
    ['he', 'on click remove .x from me', 'ב לחיצה הסר את .x ממני'],
    ['he', 'on click show me', 'ב לחיצה הראה אותי'],
    ['he', 'on click put 1 before me', 'ב לחיצה שים את 1 לפניי'],
  ];
  it.each(RENDERS)('%s: %s', (language, source, expected) => {
    expect(translate(source, 'en', language)).toBe(expected);
    expect(translate(expected, language, 'en')).toBe(source);
  });
});

describe('bn, hi, tl and pt write a pronoun fused with its marker', () => {
  const RENDERS: Array<[string, string, string]> = [
    ['bn', 'on click show me', 'ক্লিক তে আমাকে দেখান'],
    ['bn', 'on click add .x to me', 'ক্লিক তে আমাতে .x কে যোগ'],
    ['bn', 'on click remove .x from me', 'ক্লিক তে আমার থেকে .x কে সরান'],
    ['bn', 'on click put it into #out', 'ক্লিক তে এটিকে #out এ রাখুন'],
    // `আমাতে` is `তে` and `এ`, one locative; bind's source takes both.
    ['bn', 'bind $x to me', '$x কে আমাতে বাইন্ড'],
    ['bn', 'bind $x to it', '$x কে এটিতে বাইন্ড'],
    ['hi', 'on click show me', 'क्लिक पर मुझे दिखाएं'],
    ['hi', 'on click put it into #out', 'क्लिक पर इसे रखें #out में'],
    ['tl', 'on click add .x to it', 'kapag click idagdag .x dito'],
    ['pt', 'on click put 1 into it', 'ao clique colocar 1 nele'],
    ['pt', 'on click take .x from it', 'ao clique pegar .x dele'],
    // `a ele` stays: only `em` and `de` contract.
    ['pt', 'on click add .x to it', 'ao clique adicionar .x a ele'],
  ];
  it.each(RENDERS)('%s: %s', (language, source, expected) => {
    expect(translate(source, 'en', language)).toBe(expected);
    expect(translate(expected, language, 'en')).toBe(source);
  });
});

describe('es, it, pt and ar attach the object pronoun to the verb', () => {
  const RENDERS: Array<[string, string, string]> = [
    ['es', 'on click show me', 'al clic mostrarme'],
    ['es', 'on click hide it', 'al clic ocultarlo'],
    ['es', 'on click put it into #out', 'al clic ponerlo en #out'],
    ['es', 'bind me to $x', 'vincularme a $x'],
    ['it', 'on click show me', 'su clic mostrarmi'],
    ['it', 'on click put it into #out', 'su clic metterlo in #out'],
    ['pt', 'on click show me', 'ao clique mostrar-me'],
    ['pt', 'on click put it into #out', 'ao clique colocá-lo em #out'],
    ['pt', 'on click remove me', 'ao clique remover-me'],
    ['ar', 'on click show me', 'على النقر اظهرني'],
    ['ar', 'on click put it into #out', 'على النقر ضعه في #out'],
    // A bare command keeps its bare verb, with the `me` the parser supplied left
    // unwritten (`settle` is not `settle me`); a verbal noun takes no suffix (ar `قياس`).
    ['es', 'on click show', 'al clic mostrar'],
    ['es', 'on click settle then add .x', 'al clic estabilizar entonces agregar .x'],
    ['ar', 'on click measure me', 'على النقر قياس أنا'],
  ];
  it.each(RENDERS)('%s: %s', (language, source, expected) => {
    expect(translate(source, 'en', language)).toBe(expected);
    expect(translate(expected, language, 'en')).toBe(source);
  });

  // The `me` the parser supplied, where the plain render writes it (another
  // role follows the verb): attached, as a written one is. English writes it too.
  it.each([
    [
      'es',
      'on click hide with display then add .foo',
      'al clic ocultarme con display entonces agregar .foo',
    ],
    ['it', 'on click show with *opacity', 'su clic mostrarmi con *opacity'],
    ['pt', 'on click show with *opacity', 'ao clique mostrar-me com *opacity'],
    ['ar', 'on click hide with display then add .foo', 'على النقر اخفني بـ display ثم أضف .foo'],
  ])('%s: %s', (language, source, expected) => {
    expect(translate(source, 'en', language)).toBe(expected);
    expect(translate(expected, language, 'en')).toBe(translate(source, 'en', 'en'));
  });
});

// es and pt's focus and blur commands write the verb, which takes the pronoun;
// the events keep their nouns, and code written with the nouns still reads.
describe('es and pt write focus and blur as verbs', () => {
  it.each([
    ['es', 'on click focus me', 'al clic enfocarme'],
    ['es', 'on click blur #name', 'al clic desenfocar #name'],
    ['es', 'on focus add .x', 'al enfoque agregar .x'],
    ['pt', 'on click focus me', 'ao clique focar-me'],
    ['pt', 'on click blur me', 'ao clique desfocar-me'],
    ['pt', 'on blur remove .x', 'ao desfoque remover .x'],
  ])('%s: %s', (language, source, expected) => {
    expect(translate(source, 'en', language)).toBe(expected);
    expect(translate(expected, language, 'en')).toBe(source);
  });

  it.each([
    ['es', 'al clic enfoque yo', 'on click focus me'],
    ['es', 'al clic pérdida de foco #name', 'on click blur #name'],
    ['pt', 'ao clique foco eu', 'on click focus me'],
    ['pt', 'ao clique perda de foco #name', 'on click blur #name'],
  ])('%s reads the noun: %s', (language, source, expected) => {
    expect(translate(source, language, 'en')).toBe(expected);
  });
});

// The plain render, before the verified render's fallback: a scroll position's
// phrase is never replaced by a case form (the fallback would hide it).
it('a scroll position keeps its phrase in the plain render', () => {
  const node = parse('on click scroll to the top of me', 'en')!;
  expect(semanticRenderer.render(node, 'es')).toBe('al clic desplazamiento en the top of yo');
  // de has an object form too: the position is no object either.
  expect(semanticRenderer.render(node, 'de')).toBe('wenn klick scrollen auf the top of ich');
});
