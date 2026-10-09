/**
 * `the X of Y` inside an expression (M2, vocabulary sheet A3): what the
 * renderer writes in each language's own construction (es `valor de #price`,
 * ja `#priceの値`), and how the verified render compares a reading that came
 * back in the other English spelling (`#price's value`).
 */

/**
 * `the X of Y` with a selector owner: a property, style or attribute (`value`,
 * `*display`, `@role`), each further link the next one's owner (`innerHTML of
 * the parentNode of #d1`). Not a member access on the owner (`#a.b`), which
 * reads as the phrase's owner.
 */
export const OF_PHRASE =
  /(^|[^\w$.#@*:'-])(?:the\s+)?((?:[@*]?[A-Za-z][\w-]*\s+of\s+(?:the\s+)?)+)([#.][A-Za-z_-][\w-]*)(?![\w-]|[.[(][\w$])/g;

/**
 * Words an `of` phrase can start with that name no property: positions
 * (`the first of .items`), quantities, and the places `scroll` and `put`
 * name (`the top of #t`, `at the end of #list`).
 */
export const NOT_A_PROPERTY: ReadonlySet<string> = new Set([
  'first',
  'last',
  'next',
  'previous',
  'random',
  'closest',
  'some',
  'no',
  'any',
  'all',
  'each',
  'every',
  'one',
  'none',
  'start',
  'end',
  'top',
  'bottom',
  'left',
  'right',
  'middle',
  'center',
]);

/** The links of an `of` phrase's chain, outermost first (`innerHTML`, `parentNode`). */
export function ofPhraseProperties(chain: string): string[] | undefined {
  const properties = chain.split(/\s+of\s+(?:the\s+)?/).filter(Boolean);
  return properties.some(p => NOT_A_PROPERTY.has(p.toLowerCase())) ? undefined : properties;
}

/** Does a conversion follow `end`? It converts an `of` phrase's owner, a `'s` chain's property. */
export function convertedAt(text: string, end: number): boolean {
  return /^\s+as\b/.test(text.slice(end));
}

/**
 * An English reading with each `the X of Y` written `Y's X`, which both
 * engines read alike (the command-shape gate's `of-possessive` equivalence):
 * a translation reads es `valor de #price` back as `value of #price`, and ja
 * `#priceの値` as `#price's value`. Before `as` the two bind differently, so
 * there only the `the` goes.
 */
export function ofPhrasesAsPossessives(text: string): string {
  if (!/\bof\b/.test(text)) return text;
  return text.replace(
    OF_PHRASE,
    (whole, lead: string, chain: string, owner: string, offset: number, all: string) => {
      const properties = ofPhraseProperties(chain);
      if (!properties) return whole;
      if (convertedAt(all, offset + whole.length)) {
        return `${lead}${properties.join(' of ')} of ${owner}`;
      }
      return `${lead}${owner}${properties
        .reverse()
        .map(p => `'s ${p}`)
        .join('')}`;
    }
  );
}
