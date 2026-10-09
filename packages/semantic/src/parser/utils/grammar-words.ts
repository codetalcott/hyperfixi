/**
 * Words upstream's grammar fixes in one place, in each language's own words
 * (M2, vocabulary sheet B3–B6): `go back`, `from elsewhere`, `index i` after
 * a loop head, and the `start` of `start view transition`; and a handler's or
 * a function's error clauses, `catch e` and `finally` (A9, B2).
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
export type GrammarWordKey = 'back' | 'elsewhere' | 'index' | 'start' | 'catch' | 'finally';

export const GRAMMAR_WORDS: Readonly<Record<string, Readonly<Record<GrammarWordKey, string>>>> = {
  ar: { back: 'خلفا', elsewhere: 'الخارج', index: 'مؤشر', start: 'ابدأ',
    catch: 'التقط', finally: 'أخيرا' },
  bn: { back: 'পিছনে', elsewhere: 'বাইরে', index: 'সূচক', start: 'আরম্ভ',
    catch: 'ধরুন', finally: 'অবশেষে' },
  de: { back: 'zurück', elsewhere: 'außerhalb', index: 'index', start: 'starte',
    catch: 'fangen', finally: 'schließlich' },
  es: { back: 'atrás', elsewhere: 'afuera', index: 'índice', start: 'comenzar',
    catch: 'atrapar', finally: 'finalmente' },
  fr: { back: 'arrière', elsewhere: 'ailleurs', index: 'indice', start: 'démarrer',
    catch: 'attraper', finally: 'finalement' },
  he: { back: 'אחורה', elsewhere: 'חוץ', index: 'אינדקס', start: 'יזום',
    catch: 'תפוס', finally: 'סופית' },
  hi: { back: 'पीछे', elsewhere: 'अन्यत्र', index: 'सूचकांक', start: 'शुरू',
    catch: 'पकड़ें', finally: 'अंततः' },
  id: { back: 'mundur', elsewhere: 'luaran', index: 'indeks', start: 'memulai',
    catch: 'menangkap', finally: 'akhirnya' },
  it: { back: 'indietro', elsewhere: 'altrove', index: 'indice', start: 'avvia',
    catch: 'catturare', finally: 'infine' },
  ja: { back: 'バック', elsewhere: '外側', index: 'インデックス', start: '開始',
    catch: '捕まえる', finally: '最終的に' },
  ko: { back: '뒤로', elsewhere: '바깥', index: '인덱스', start: '시작',
    catch: '잡다', finally: '결국' },
  ms: { back: 'undur', elsewhere: 'luar', index: 'indeks', start: 'memulakan',
    catch: 'tangkap', finally: 'akhirnya' },
  pl: { back: 'wstecz', elsewhere: 'zewnątrz', index: 'indeks', start: 'rozpocznij',
    catch: 'złap', finally: 'ostatecznie' },
  pt: { back: 'atrás', elsewhere: 'exterior', index: 'índice', start: 'começar',
    catch: 'capturar', finally: 'finalmente' },
  qu: { back: 'kutiy', elsewhere: 'hawa', index: 'yupay', start: 'qallay',
    catch: 'hapsiy', finally: 'qhipamanqa' },
  ru: { back: 'назад', elsewhere: 'снаружи', index: 'индекс', start: 'начать',
    catch: 'поймать', finally: 'наконец' },
  sw: { back: 'kurudi', elsewhere: 'kwingineko', index: 'faharasa', start: 'zindua',
    catch: 'shika', finally: 'mwishowe' },
  th: { back: 'ย้อน', elsewhere: 'ภายนอก', index: 'ดัชนี', start: 'เริ่ม',
    catch: 'จับ', finally: 'ท้ายที่สุด' },
  tl: { back: 'pabalik', elsewhere: 'labas', index: 'indeks', start: 'umpisahan',
    catch: 'saluhin', finally: 'panghuli' },
  tr: { back: 'geri', elsewhere: 'dışarı', index: 'indeks', start: 'başla',
    catch: 'yakalarsa', finally: 'sonunda' },
  uk: { back: 'назад', elsewhere: 'ззовні', index: 'індекс', start: 'почати',
    catch: 'зловити', finally: 'нарешті' },
  vi: { back: 'lùi', elsewhere: 'ngoài', index: 'chỉ số', start: 'bắt đầu',
    catch: 'bắt', finally: 'rốt cuộc' },
  zh: { back: '后退', elsewhere: '外部', index: '索引', start: '开始',
    catch: '捕获', finally: '最终' },
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

/**
 * The `in` that scopes a query, in each language's own word (M2, vocabulary
 * sheet A5): `<button/> in me`, `first <input/> in closest <form/>`, `last
 * <.message/> in #chat`. It was English in every translation. The word is the
 * dictionary's `modifiers.in` (a test holds the table to it), the one a loop's
 * `for x in` already writes; every reader takes it after a query, as it takes
 * English's (`LOCATIVE_SURFACES`). he has no word yet (sheet B7). The
 * comparison `x is in y` keeps English's.
 */
export const QUERY_IN: Readonly<Record<string, string>> = {
  ar: 'في',
  bn: 'এ',
  de: 'in',
  es: 'en',
  fr: 'en',
  hi: 'में',
  id: 'dalam',
  it: 'in',
  ja: 'の中',
  ko: '안에',
  ms: 'dalam',
  pl: 'w',
  pt: 'dentro',
  qu: 'ukupi',
  ru: 'в',
  sw: 'ndani',
  th: 'ใน',
  tl: 'sa_loob',
  tr: 'içinde',
  uk: 'у',
  vi: 'trong',
  zh: '在',
};

/** The `in` a translation writes after a query: the language's own, or English's. */
export function queryInWord(language: string): string {
  return QUERY_IN[language] ?? 'in';
}

/**
 * The `as` of a conversion, in each language's own word (M2, vocabulary sheet
 * A4): `put it as String into me`, `get result as JSONString`, `(my value as
 * Number)`. It was English in every translation; the type name still is, as
 * both engines read it (value-lexicon.ts TYPE_NAME). The word is the
 * dictionary's `modifiers.as` (a test holds the table to it), the one most
 * languages' `fetch … as json` already writes. It stands where English's
 * does, before the type, in every language: that is where the reader takes it
 * (`CONNECTIVE_LEXICON`, and th's `เป็น`, also `is`, by its sense rule). he
 * has no word yet (sheet B7).
 */
export const CONVERSION_AS: Readonly<Record<string, string>> = {
  ar: 'كـ',
  bn: 'হিসাবে',
  de: 'als',
  es: 'como',
  fr: 'comme',
  hi: 'के_रूप_में',
  id: 'sebagai',
  it: 'come',
  ja: 'として',
  ko: '로',
  ms: 'sebagai',
  pl: 'jako',
  pt: 'como',
  qu: 'hina',
  ru: 'как',
  sw: 'kuwa',
  th: 'เป็น',
  tl: 'bilang',
  tr: 'olarak',
  uk: 'як',
  vi: 'như',
  zh: '作为',
};

/** The `as` a translation writes before a type name: the language's own, or English's. */
export function conversionAsWord(language: string): string {
  return CONVERSION_AS[language] ?? 'as';
}
