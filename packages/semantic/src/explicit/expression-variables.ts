/**
 * The variables an English expression reads. The renderer writes one as
 * spelled where its localized word would read back as another variable
 * (`value + 1`, es `valor + 1`; was OPEN_ITEMS P49).
 */
import { parseExpression } from '../ast-builder/expression-parser/parser';
import { tokenize } from '../tokenizers';
import { loneKeywordKind } from '../parser/utils/expression-lexicon';

const variableNameMemo = new Map<string, boolean>();

/**
 * Is `name`, alone where a value stands, a variable in English? An identifier
 * is (`value`, `index`), and so is a keyword the reader takes for one there: a
 * structure word, a verb or an event name (`when`, `input`). Other keywords
 * are vocabulary: a reference (`it`), a positional word (`closest`).
 */
export function isVariableName(name: string): boolean {
  let known = variableNameMemo.get(name);
  if (known === undefined) {
    const tokens = tokenize(name, 'en').tokens;
    const only = tokens.length === 1 ? tokens[0] : undefined;
    known = !!only && (only.kind === 'identifier' || !!loneKeywordKind(only));
    variableNameMemo.set(name, known);
  }
  return known;
}

/**
 * The variables an English expression reads: each identifier of its parse
 * that is not a property, a method or a conversion's type, and that is a
 * variable name (above).
 */
export function expressionVariables(raw: string): Set<string> {
  const names = new Set<string>();
  const parsed = parseExpression(raw);
  if (!parsed.success || !parsed.node) return names;
  const walk = (expr: unknown, key: string | undefined): void => {
    if (Array.isArray(expr)) {
      for (const item of expr) walk(item, key);
      return;
    }
    if (!expr || typeof expr !== 'object') return;
    const n = expr as { type?: string; name?: string };
    if (
      n.type === 'identifier' &&
      key !== 'property' &&
      key !== 'targetType' &&
      typeof n.name === 'string' &&
      isVariableName(n.name)
    ) {
      names.add(n.name);
    }
    for (const [k, v] of Object.entries(expr)) if (v && typeof v === 'object') walk(v, k);
  };
  walk(parsed.node, undefined);
  return names;
}
