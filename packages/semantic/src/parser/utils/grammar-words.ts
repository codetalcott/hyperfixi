/**
 * Words upstream's grammar fixes in one place, in each language's own words
 * (M2, vocabulary sheet B3–B6): `go back`, `from elsewhere`, `index i` after
 * a loop head, and the `start` of `start view transition`.
 *
 * Each stayed English in every translation: no profile had a word for it. The
 * words are the dictionaries' (`expressions`, which `lexicon-parity.test.ts`
 * holds the render lexicon to), and a test holds this table to them. It sits
 * here, beside the readers, rather than being read from the lexicon: a slim
 * bundle parses without one.
 *
 * Where the sheet's proposed word was already another word of the language (a
 * keyword or a role marker), the table has another: es `iniciar` is es `init`,
 * ja `戻る` is ja `return`, es `fuera` is a marker. `docs-internal/multilingual/
 * VOCABULARY_SHEET.md` lists each change. A word is read as the tokens its
 * language writes it in (vi `chỉ số`, ko `뒤로`). Every reader still takes the
 * English word.
 */
export type GrammarWordKey = 'back' | 'elsewhere' | 'index' | 'start';

export const GRAMMAR_WORDS: Readonly<Record<string, Readonly<Record<GrammarWordKey, string>>>> = {
  ar: { back: 'خلفا', elsewhere: 'الخارج', index: 'مؤشر', start: 'ابدأ' },
  bn: { back: 'পিছনে', elsewhere: 'বাইরে', index: 'সূচক', start: 'আরম্ভ' },
  de: { back: 'zurück', elsewhere: 'außerhalb', index: 'index', start: 'starte' },
  es: { back: 'atrás', elsewhere: 'afuera', index: 'índice', start: 'comenzar' },
  fr: { back: 'arrière', elsewhere: 'ailleurs', index: 'indice', start: 'démarrer' },
  he: { back: 'אחורה', elsewhere: 'חוץ', index: 'אינדקס', start: 'יזום' },
  hi: { back: 'पीछे', elsewhere: 'अन्यत्र', index: 'सूचकांक', start: 'शुरू' },
  id: { back: 'mundur', elsewhere: 'luaran', index: 'indeks', start: 'memulai' },
  it: { back: 'indietro', elsewhere: 'altrove', index: 'indice', start: 'avvia' },
  ja: { back: 'バック', elsewhere: '外側', index: 'インデックス', start: '開始' },
  ko: { back: '뒤로', elsewhere: '바깥', index: '인덱스', start: '시작' },
  ms: { back: 'undur', elsewhere: 'luar', index: 'indeks', start: 'memulakan' },
  pl: { back: 'wstecz', elsewhere: 'zewnątrz', index: 'indeks', start: 'rozpocznij' },
  pt: { back: 'atrás', elsewhere: 'exterior', index: 'índice', start: 'começar' },
  qu: { back: 'kutiy', elsewhere: 'hawa', index: 'yupay', start: 'qallay' },
  ru: { back: 'назад', elsewhere: 'снаружи', index: 'индекс', start: 'начать' },
  sw: { back: 'kurudi', elsewhere: 'kwingineko', index: 'faharasa', start: 'zindua' },
  th: { back: 'ย้อน', elsewhere: 'ภายนอก', index: 'ดัชนี', start: 'เริ่ม' },
  tl: { back: 'pabalik', elsewhere: 'labas', index: 'indeks', start: 'umpisahan' },
  tr: { back: 'geri', elsewhere: 'dışarı', index: 'indeks', start: 'başla' },
  uk: { back: 'назад', elsewhere: 'ззовні', index: 'індекс', start: 'почати' },
  vi: { back: 'lùi', elsewhere: 'ngoài', index: 'chỉ số', start: 'bắt đầu' },
  zh: { back: '后退', elsewhere: '外部', index: '索引', start: '开始' },
};

/** The word a translation writes: the language's own, or English's. */
export function grammarWord(language: string, key: GrammarWordKey): string {
  return GRAMMAR_WORDS[language]?.[key] ?? key;
}

/**
 * The surfaces a reader takes for the word, each as the tokens it is written
 * in (`split` is the language's tokenizer: ko `뒤로` is `뒤` + `로`): English's,
 * and the language's own.
 */
export function grammarWordForms(
  language: string,
  key: GrammarWordKey,
  split: (word: string) => string[]
): string[][] {
  const native = GRAMMAR_WORDS[language]?.[key];
  const forms: string[][] = [[key]];
  if (native && native !== key) forms.push(split(native).map(w => w.toLowerCase()));
  return forms;
}
