/**
 * The CSS units upstream reads after a number as one string (`100px`, `50%`):
 * its `stringPostfixExpression`, with the same list as the engine's (`in` is
 * left out there, as a hyperscript keyword). The tokenizers split the number
 * from its unit; `registry.tokenize` fuses them again, and the reader writes
 * the length as written in every language (`parser/token-value.ts`).
 */
export const CSS_UNITS: ReadonlySet<string> = new Set(
  'em ex cap ch ic rem lh rlh vw vh vi vb vmin vmax cm mm Q pc pt px %'.split(' ')
);

/** A number with a CSS unit, as one token: `100px`, `1.5rem`, `50%`. */
export function isCssLength(text: string): boolean {
  const match = /^\d+(?:\.\d+)?([A-Za-z]+|%)$/.exec(text);
  return !!match && CSS_UNITS.has(match[1]!);
}
